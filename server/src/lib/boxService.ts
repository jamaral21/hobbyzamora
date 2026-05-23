import { prisma } from '../index.js';
import { Decimal } from '@prisma/client/runtime/library';
import type { ShipmentsResponse } from '../types/shipments.js';
import type { ShipmentsBox, ShipmentsBoxProduct, ShipmentsPurchase } from '@prisma/client';

type BoxWithProducts = ShipmentsBox & {
  productos: ShipmentsBoxProduct[];
};

interface BoxProductInput {
  compraId: string;
  cant: number;
  pesoUnit?: number;
}

interface CreateBoxPayload {
  boxId: string;
  fecha?: string;
  fleJpy?: number;
  moHoras?: number;
  moTarifa?: number;
  matJpy?: number;
  tcEnvio?: number;
  pesoTotal?: number;
  productos: BoxProductInput[];
}

interface UpdateBoxPayload {
  estado?: 'transito' | 'llegada';
  fecha?: string;
  fleJpy?: number;
  moHoras?: number;
  moTarifa?: number;
  matJpy?: number;
  tcEnvio?: number;
  pesoTotal?: number;
  productos?: BoxProductInput[];
}

interface StockBreakdown {
  disponible: number;
  enCajasActivas: number;
  enChile: number;
}

async function getStockBreakdownByPurchaseTx(
  tx: any,
  purchase: Pick<ShipmentsPurchase, 'id' | 'sku' | 'cant'>,
  excludeBoxId?: string
): Promise<StockBreakdown> {
  const boxWhere: any = {
    compraId: purchase.id,
    box: {
      estado: {
        in: ['transito', 'llegada'],
      },
    },
  };

  if (excludeBoxId) {
    boxWhere.boxId = { not: excludeBoxId };
  }

  const inBoxes = await tx.shipmentsBoxProduct.aggregate({
    where: boxWhere,
    _sum: { cant: true },
  });

  const inChile = await tx.shipmentsChileStock.aggregate({
    where: { sku: purchase.sku },
    _sum: { cant: true },
  });

  const enCajasActivas = Number(inBoxes._sum.cant) || 0;
  const enChile = Number(inChile._sum.cant) || 0;
  const disponible = Number(purchase.cant) - enCajasActivas - enChile;

  return {
    disponible,
    enCajasActivas,
    enChile,
  };
}

function validateProductosInput(productos: BoxProductInput[]): ShipmentsResponse<never> | null {
  if (!Array.isArray(productos) || productos.length === 0) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Debe incluir al menos un producto en la caja',
        details: [{ field: 'productos', message: 'Array vacío' }],
      },
    };
  }

  const seen = new Set<string>();
  for (let i = 0; i < productos.length; i += 1) {
    const item = productos[i];
    if (!item.compraId || item.compraId.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'compraId es requerido para cada producto',
          details: [{ field: `productos[${i}].compraId`, message: 'Campo requerido' }],
        },
      };
    }

    if (!Number.isInteger(item.cant) || item.cant <= 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La cantidad debe ser un entero mayor a 0',
          details: [{ field: `productos[${i}].cant`, message: 'Debe ser entero > 0' }],
        },
      };
    }

    if (seen.has(item.compraId)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No se puede repetir el mismo compraId en una caja',
          details: [{ field: `productos[${i}].compraId`, message: 'Compra duplicada' }],
        },
      };
    }

    seen.add(item.compraId);
  }

  return null;
}

async function recalculatePurchasesBodegaTx(tx: any, purchaseIds: string[]) {
  for (const purchaseId of purchaseIds) {
    const purchase = await tx.shipmentsPurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) continue;

    const breakdown = await getStockBreakdownByPurchaseTx(tx, purchase);

    let nextBodega: 'japon' | 'transito' | 'chile' = 'japon';
    if (breakdown.disponible > 0) {
      nextBodega = 'japon';
    } else if (breakdown.enChile > 0) {
      nextBodega = 'chile';
    } else if (breakdown.enCajasActivas > 0) {
      nextBodega = 'transito';
    }

    await tx.shipmentsPurchase.update({
      where: { id: purchase.id },
      data: { bodega: nextBodega },
    });
  }
}

export async function listBoxes(): Promise<ShipmentsResponse<BoxWithProducts[]>> {
  try {
    const boxes = await prisma.shipmentsBox.findMany({
      include: {
        productos: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return {
      data: boxes,
      meta: {
        total: boxes.length,
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al listar cajas',
      },
    };
  }
}

export async function createBox(payload: CreateBoxPayload): Promise<ShipmentsResponse<BoxWithProducts>> {
  try {
    if (!payload.boxId || payload.boxId.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El nombre de caja (boxId) es requerido',
          details: [{ field: 'boxId', message: 'Campo requerido' }],
        },
      };
    }

    const productosValidation = validateProductosInput(payload.productos);
    if (productosValidation) return productosValidation;

    const box = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.shipmentsBox.findUnique({
        where: { boxId: payload.boxId.trim() },
      });

      if (existing) {
        throw new Error('BOX_ID_CONFLICT');
      }

      const purchases = (await tx.shipmentsPurchase.findMany({
        where: {
          id: {
            in: payload.productos.map((p) => p.compraId),
          },
        },
      })) as ShipmentsPurchase[];

      if (purchases.length !== payload.productos.length) {
        throw new Error('PURCHASE_NOT_FOUND');
      }

      const purchasesMap = new Map<string, ShipmentsPurchase>(
        purchases.map((p: ShipmentsPurchase) => [p.id, p])
      );

      for (const item of payload.productos) {
        const purchase = purchasesMap.get(item.compraId)!;
        const breakdown = await getStockBreakdownByPurchaseTx(tx, purchase);

        if (item.cant > breakdown.disponible) {
          throw new Error(`INSUFFICIENT_STOCK:${purchase.sku}:${breakdown.disponible}`);
        }
      }

      const createdBox = await tx.shipmentsBox.create({
        data: {
          boxId: payload.boxId.trim(),
          fecha: payload.fecha ? new Date(payload.fecha) : new Date(),
          estado: 'transito',
          fleJpy: payload.fleJpy !== undefined ? new Decimal(payload.fleJpy) : null,
          moHoras: payload.moHoras !== undefined ? new Decimal(payload.moHoras) : null,
          moTarifa: payload.moTarifa !== undefined ? new Decimal(payload.moTarifa) : null,
          matJpy: payload.matJpy !== undefined ? new Decimal(payload.matJpy) : null,
          tcEnvio: payload.tcEnvio !== undefined ? new Decimal(payload.tcEnvio) : null,
          pesoTotal: payload.pesoTotal !== undefined ? new Decimal(payload.pesoTotal) : null,
        },
      });

      await tx.shipmentsBoxProduct.createMany({
        data: payload.productos.map((item) => {
          const purchase = purchasesMap.get(item.compraId)!;
          return {
            boxId: createdBox.id,
            compraId: purchase.id,
            sku: purchase.sku,
            nombre: purchase.nombre,
            ean: purchase.ean,
            cant: item.cant,
            precioU: purchase.precioU,
            tc: purchase.tc,
            pesoUnit: item.pesoUnit !== undefined ? new Decimal(item.pesoUnit) : null,
            fromManual: false,
          };
        }),
      });

      // Regla: si disponible queda en 0, pasa a transito.
      for (const item of payload.productos) {
        const purchase = purchasesMap.get(item.compraId)!;
        const breakdownAfter = await getStockBreakdownByPurchaseTx(tx, purchase);
        if (breakdownAfter.disponible <= 0 && breakdownAfter.enCajasActivas > 0) {
          await tx.shipmentsPurchase.update({
            where: { id: purchase.id },
            data: { bodega: 'transito' },
          });
        }
      }

      return tx.shipmentsBox.findUnique({
        where: { id: createdBox.id },
        include: {
          productos: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return { data: box as BoxWithProducts };
  } catch (error: any) {
    if (error.message === 'BOX_ID_CONFLICT') {
      return {
        error: {
          code: 'CONFLICT',
          message: `Ya existe una caja con nombre "${payload.boxId}"`,
        },
      };
    }

    if (error.message === 'PURCHASE_NOT_FOUND') {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Uno o más productos no existen en compras',
        },
      };
    }

    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      const [, sku, disponible] = error.message.split(':');
      return {
        error: {
          code: 'CONFLICT',
          message: `Stock insuficiente para SKU ${sku}. Disponible: ${disponible}`,
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al crear caja',
      },
    };
  }
}

export async function updateBox(
  boxId: string,
  payload: UpdateBoxPayload
): Promise<ShipmentsResponse<BoxWithProducts>> {
  try {
    if (payload.productos) {
      const productosValidation = validateProductosInput(payload.productos);
      if (productosValidation) return productosValidation;
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.shipmentsBox.findUnique({
        where: { boxId },
        include: {
          productos: true,
        },
      });

      if (!existing) throw new Error('BOX_NOT_FOUND');
      if (existing.estado !== 'transito') throw new Error('BOX_NOT_TRANSITO');

      if (payload.estado && payload.estado !== 'transito' && payload.estado !== 'llegada') {
        throw new Error('INVALID_BOX_STATE');
      }

      // Solo permitimos transición explícita de transito -> llegada en esta ruta.
      if (payload.estado && payload.estado !== existing.estado && payload.estado !== 'llegada') {
        throw new Error('BOX_INVALID_TRANSITION');
      }

      const newProductIds = payload.productos?.map((p) => p.compraId) || [];
      const oldProductIds = existing.productos.map((p: ShipmentsBoxProduct) => p.compraId);
      const affectedProductIds = Array.from(new Set([...oldProductIds, ...newProductIds]));

      let purchasesMap = new Map<string, ShipmentsPurchase>();
      if (payload.productos && payload.productos.length > 0) {
        const purchases = (await tx.shipmentsPurchase.findMany({
          where: { id: { in: newProductIds } },
        })) as ShipmentsPurchase[];

        if (purchases.length !== payload.productos.length) {
          throw new Error('PURCHASE_NOT_FOUND');
        }

        purchasesMap = new Map(purchases.map((p: ShipmentsPurchase) => [p.id, p]));

        for (const item of payload.productos) {
          const purchase = purchasesMap.get(item.compraId)!;
          const breakdown = await getStockBreakdownByPurchaseTx(tx, purchase, existing.id);
          if (item.cant > breakdown.disponible) {
            throw new Error(`INSUFFICIENT_STOCK:${purchase.sku}:${breakdown.disponible}`);
          }
        }
      }

      await tx.shipmentsBox.update({
        where: { id: existing.id },
        data: {
          ...(payload.estado && { estado: payload.estado }),
          ...(payload.fecha && { fecha: new Date(payload.fecha) }),
          ...(payload.fleJpy !== undefined && { fleJpy: new Decimal(payload.fleJpy) }),
          ...(payload.moHoras !== undefined && { moHoras: new Decimal(payload.moHoras) }),
          ...(payload.moTarifa !== undefined && { moTarifa: new Decimal(payload.moTarifa) }),
          ...(payload.matJpy !== undefined && { matJpy: new Decimal(payload.matJpy) }),
          ...(payload.tcEnvio !== undefined && { tcEnvio: new Decimal(payload.tcEnvio) }),
          ...(payload.pesoTotal !== undefined && { pesoTotal: new Decimal(payload.pesoTotal) }),
        },
      });

      if (payload.productos) {
        await tx.shipmentsBoxProduct.deleteMany({
          where: { boxId: existing.id },
        });

        await tx.shipmentsBoxProduct.createMany({
          data: payload.productos.map((item) => {
            const purchase = purchasesMap.get(item.compraId)!;
            return {
              boxId: existing.id,
              compraId: purchase.id,
              sku: purchase.sku,
              nombre: purchase.nombre,
              ean: purchase.ean,
              cant: item.cant,
              precioU: purchase.precioU,
              tc: purchase.tc,
              pesoUnit: item.pesoUnit !== undefined ? new Decimal(item.pesoUnit) : null,
              fromManual: false,
            };
          }),
        });
      }

      if (affectedProductIds.length > 0) {
        await recalculatePurchasesBodegaTx(tx, affectedProductIds);
      }

      return tx.shipmentsBox.findUnique({
        where: { id: existing.id },
        include: {
          productos: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return { data: updated as BoxWithProducts };
  } catch (error: any) {
    if (error.message === 'BOX_NOT_FOUND') {
      return {
        error: {
          code: 'NOT_FOUND',
          message: `Caja ${boxId} no encontrada`,
        },
      };
    }

    if (error.message === 'BOX_NOT_TRANSITO') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'Solo se puede editar una caja en estado "transito"',
        },
      };
    }

    if (error.message === 'INVALID_BOX_STATE') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Estado de caja inválido. Use "transito" o "llegada"',
        },
      };
    }

    if (error.message === 'BOX_INVALID_TRANSITION') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'Transición de estado inválida para la caja',
        },
      };
    }

    if (error.message === 'PURCHASE_NOT_FOUND') {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Uno o más productos no existen en compras',
        },
      };
    }

    if (error.message?.startsWith('INSUFFICIENT_STOCK:')) {
      const [, sku, disponible] = error.message.split(':');
      return {
        error: {
          code: 'CONFLICT',
          message: `Stock insuficiente para SKU ${sku}. Disponible: ${disponible}`,
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al editar caja',
      },
    };
  }
}

export async function deleteBox(boxId: string): Promise<ShipmentsResponse<{ success: boolean }>> {
  try {
    await prisma.$transaction(async (tx: any) => {
      const existing = await tx.shipmentsBox.findUnique({
        where: { boxId },
        include: {
          productos: true,
        },
      });

      if (!existing) throw new Error('BOX_NOT_FOUND');
      if (existing.estado !== 'transito' && existing.estado !== 'llegada') {
        throw new Error('BOX_NOT_DELETABLE');
      }

      const affectedProductIds: string[] = Array.from(
        new Set(existing.productos.map((p: ShipmentsBoxProduct) => p.compraId))
      );

      await tx.shipmentsBoxProduct.deleteMany({ where: { boxId: existing.id } });
      await tx.shipmentsBox.delete({ where: { id: existing.id } });

      if (affectedProductIds.length > 0) {
        await recalculatePurchasesBodegaTx(tx, affectedProductIds);
      }
    });

    return {
      data: { success: true },
    };
  } catch (error: any) {
    if (error.message === 'BOX_NOT_FOUND') {
      return {
        error: {
          code: 'NOT_FOUND',
          message: `Caja ${boxId} no encontrada`,
        },
      };
    }

    if (error.message === 'BOX_NOT_DELETABLE') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'Solo se puede eliminar una caja en estado "transito" o "llegada"',
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al eliminar caja',
      },
    };
  }
}

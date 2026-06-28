import { prisma } from '../index.js';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  ShipmentsBox,
  ShipmentsBoxProduct,
  ShipmentsChileStock,
  ShipmentsPurchase,
} from '@prisma/client';
import type { ShipmentsResponse } from '../types/shipments.js';

interface CosteoItemInput {
  compraId?: string;
  _compraId?: string;
  sku: string;
  nombre: string;
  ean?: string | null;
  cant: number;
  pct: number;
  costoUnit?: number;
}

interface ConfirmCosteoPayload {
  productos: CosteoItemInput[];
}

interface CosteoBoxItem {
  boxId: string;
  fecha: Date;
  estado: string;
  productos: Array<{
    compraId: string;
    sku: string;
    nombre: string;
    ean: string | null;
    cant: number;
    precioU: number;
    tc: number | null;
  }>;
}

interface ConfirmCosteoResponse {
  box: ShipmentsBox;
  stockEntries: ShipmentsChileStock[];
}

const EPSILON = 0.0001;

function safeNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function normalizeCompraId(item: CosteoItemInput): string {
  if (item.compraId && item.compraId.trim() !== '') return item.compraId.trim();
  if (item._compraId && item._compraId.trim() !== '') return item._compraId.trim();
  return '';
}

function calculateCostoUnit(
  totals: {
    subtotalCLP: number;
    fleteCLP: number;
    moCLP: number;
    matCLP: number;
    internCLP: number;
  },
  pct: number,
  cant: number
): number {
  const pctFraction = pct / 100;
  // internCLP (internación) NO se incluye en el prorrateo entre productos
  const totalCost =
    totals.subtotalCLP * pctFraction +
    totals.fleteCLP * pctFraction +
    totals.moCLP * pctFraction +
    totals.matCLP * pctFraction;

  return Math.round(totalCost / cant);
}

async function getStockBreakdownByPurchaseTx(
  tx: any,
  purchase: Pick<ShipmentsPurchase, 'id' | 'sku' | 'cant'>
): Promise<{ disponible: number; enCajasActivas: number; enChile: number }> {
  const inBoxes = await tx.shipmentsBoxProduct.aggregate({
    where: {
      compraId: purchase.id,
      box: {
        estado: {
          in: ['transito', 'llegada'],
        },
      },
    },
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

export async function listCajasDisponiblesCosteo(): Promise<ShipmentsResponse<CosteoBoxItem[]>> {
  try {
    const boxes = await prisma.shipmentsBox.findMany({
      where: { estado: 'llegada' },
      include: {
        productos: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    const data: CosteoBoxItem[] = boxes.map((box) => ({
      boxId: box.boxId,
      fecha: box.fecha,
      estado: box.estado,
      productos: box.productos.map((p) => ({
        compraId: p.compraId,
        sku: p.sku,
        nombre: p.nombre,
        ean: p.ean,
        cant: p.cant,
        precioU: safeNumber(p.precioU),
        tc: p.tc !== null ? safeNumber(p.tc) : null,
      })),
    }));

    return {
      data,
      meta: { total: data.length },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al listar cajas disponibles para costeo',
      },
    };
  }
}

export async function confirmCosteoCaja(
  cajaId: string,
  payload: ConfirmCosteoPayload
): Promise<ShipmentsResponse<ConfirmCosteoResponse>> {
  try {
    if (!cajaId || cajaId.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'cajaId es requerido',
          details: [{ field: 'cajaId', message: 'Campo requerido' }],
        },
      };
    }

    if (!payload || !Array.isArray(payload.productos) || payload.productos.length === 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debe incluir productos para confirmar costeo',
          details: [{ field: 'productos', message: 'Array requerido y no vacío' }],
        },
      };
    }

    const normalizedItems = payload.productos.map((item) => ({
      ...item,
      compraId: normalizeCompraId(item),
    }));

    const pctSum = normalizedItems.reduce((sum, item) => sum + Number(item.pct || 0), 0);
    if (Math.abs(pctSum - 100) > EPSILON) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La suma de porcentajes debe ser exactamente 100%',
          details: [{ field: 'productos[].pct', message: `Suma actual: ${pctSum}` }],
        },
      };
    }

    const validationErrors: Array<{ field: string; message: string }> = [];
    const seenCompraIds = new Set<string>();

    normalizedItems.forEach((item, index) => {
      if (!item.compraId || item.compraId.trim() === '') {
        validationErrors.push({ field: `productos[${index}].compraId`, message: 'Campo requerido' });
      }

      if (!Number.isFinite(item.pct) || item.pct < 0) {
        validationErrors.push({ field: `productos[${index}].pct`, message: 'Debe ser un número >= 0' });
      }

      if (!Number.isInteger(item.cant) || item.cant <= 0) {
        validationErrors.push({ field: `productos[${index}].cant`, message: 'Debe ser entero > 0' });
      }

      if (item.compraId && seenCompraIds.has(item.compraId)) {
        validationErrors.push({ field: `productos[${index}].compraId`, message: 'Compra duplicada' });
      }
      if (item.compraId) {
        seenCompraIds.add(item.compraId);
      }
    });

    if (validationErrors.length > 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload de costeo inválido',
          details: validationErrors,
        },
      };
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const box = (await tx.shipmentsBox.findUnique({
        where: { boxId: cajaId.trim() },
        include: {
          productos: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })) as (ShipmentsBox & { productos: ShipmentsBoxProduct[] }) | null;

      if (!box) throw new Error('BOX_NOT_FOUND');
      if (box.estado !== 'llegada') throw new Error('BOX_NOT_LLEGADA');
      if (!box.tcEnvio || Number(box.tcEnvio) <= 0) throw new Error('INVALID_TC_ENVIO');
      if (box.productos.length === 0) throw new Error('BOX_WITHOUT_PRODUCTS');

      if (box.productos.length !== normalizedItems.length) {
        throw new Error('PRODUCTS_MISMATCH');
      }

      const boxProductsByCompraId = new Map<string, ShipmentsBoxProduct>(
        box.productos.map((p) => [p.compraId, p])
      );

      for (const item of normalizedItems) {
        const boxProduct = boxProductsByCompraId.get(item.compraId);
        if (!boxProduct) throw new Error('PRODUCT_NOT_IN_BOX');
        if (boxProduct.cant !== item.cant) throw new Error('CANT_MISMATCH');
      }

      const tcEnvio = Number(box.tcEnvio);
      const totals = {
        // subtotal en CLP: precioU * cant * tc (multiplicar, no dividir)
        subtotalCLP: box.productos.reduce(
          (sum, p) => sum + Number(p.precioU) * p.cant * tcEnvio,
          0
        ),
        // flete y materiales vienen en JPY, convertir multiplicando por tc
        fleteCLP: safeNumber(box.fleJpy) * tcEnvio,
        moCLP: safeNumber(box.moHoras) * safeNumber(box.moTarifa),
        matCLP: safeNumber(box.matJpy) * tcEnvio,
        // internación ya está en CLP (arancel + IVA), NO se prorratea
        internCLP: safeNumber(box.internacionArancel) + safeNumber(box.internacionIva),
      };

      const stockEntriesData = normalizedItems.map((item) => {
        const boxProduct = boxProductsByCompraId.get(item.compraId)!;
        const costoUnit = calculateCostoUnit(totals, item.pct, boxProduct.cant);

        return {
          sku: boxProduct.sku,
          nombre: boxProduct.nombre,
          ean: boxProduct.ean,
          cajaId: box.boxId,
          cant: boxProduct.cant,
          costoUnit: new Decimal(costoUnit),
        };
      });

      await tx.shipmentsChileStock.createMany({
        data: stockEntriesData,
      });

      const stockEntries = (await tx.shipmentsChileStock.findMany({
        where: { cajaId: box.boxId },
        orderBy: { createdAt: 'desc' },
        take: stockEntriesData.length,
      })) as ShipmentsChileStock[];

      const updatedBox = (await tx.shipmentsBox.update({
        where: { id: box.id },
        data: { estado: 'costeada' },
      })) as ShipmentsBox;

      const affectedPurchaseIds = Array.from(new Set(box.productos.map((p) => p.compraId)));
      if (affectedPurchaseIds.length > 0) {
        const purchases = (await tx.shipmentsPurchase.findMany({
          where: { id: { in: affectedPurchaseIds } },
        })) as ShipmentsPurchase[];

        for (const purchase of purchases) {
          // Recompute breakdown and also check total units in Chile stock for this SKU.
          const breakdown = await getStockBreakdownByPurchaseTx(tx, purchase);

          const chileAgg = await tx.shipmentsChileStock.aggregate({
            where: { sku: purchase.sku },
            _sum: { cant: true },
          });
          const totalInChile = Number(chileAgg._sum.cant) || 0;

          // Mark as 'chile' if no disponible left or total units in Chile cover the purchase.
          if (breakdown.disponible <= 0 || totalInChile >= Number(purchase.cant)) {
            await tx.shipmentsPurchase.update({
              where: { id: purchase.id },
              data: { bodega: 'chile' },
            });
          }
        }
      }

      return {
        box: updatedBox,
        stockEntries,
      };
    });

    return {
      data: result,
    };
  } catch (error: any) {
    if (error.message === 'BOX_NOT_FOUND') {
      return {
        error: {
          code: 'NOT_FOUND',
          message: `Caja ${cajaId} no encontrada`,
        },
      };
    }

    if (error.message === 'BOX_NOT_LLEGADA') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'Solo se puede confirmar costeo para cajas en estado "llegada"',
        },
      };
    }

    if (error.message === 'INVALID_TC_ENVIO') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La caja debe tener tcEnvio mayor a 0 para calcular costos en CLP',
          details: [{ field: 'tcEnvio', message: 'Debe ser > 0' }],
        },
      };
    }

    if (error.message === 'BOX_WITHOUT_PRODUCTS') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'No se puede costear una caja sin productos',
        },
      };
    }

    if (error.message === 'PRODUCTS_MISMATCH') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El detalle de productos no coincide con los productos de la caja',
        },
      };
    }

    if (error.message === 'PRODUCT_NOT_IN_BOX') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Uno o más productos enviados no pertenecen a la caja',
        },
      };
    }

    if (error.message === 'CANT_MISMATCH') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La cantidad de uno o más productos no coincide con la caja',
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al confirmar costeo',
      },
    };
  }
}

import { prisma } from '../index.js';
import { Decimal } from '@prisma/client/runtime/library';
import type { ShipmentsResponse } from '../types/shipments.js';
import type { ShipmentsWebOrder, ShipmentsWebOrderProduct } from '@prisma/client';

type WebOrderWithProducts = ShipmentsWebOrder & {
  productos: ShipmentsWebOrderProduct[];
};

interface WebOrderProductInput {
  nombre: string;
  ean?: string;
  cant: number;
  precioUSD: number;
  precioCLP: number;
  pctCosteo: number;
  costoUnit: number;
}

interface CreateWebOrderPayload {
  portal: string;
  orden: string;
  fecha: string;
  tc: number;
  costoEnvioIntern: number;
  productos: WebOrderProductInput[];
}

export async function generateNextWebOrderId(): Promise<string> {
  const last = await prisma.shipmentsWebOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { orderId: true },
  });

  if (!last.length) return 'WEB-001';

  const match = last[0].orderId.match(/WEB-(\d+)/);
  if (!match) return 'WEB-001';

  const next = parseInt(match[1], 10) + 1;
  return `WEB-${String(next).padStart(3, '0')}`;
}

export async function listWebOrders(): Promise<ShipmentsResponse<WebOrderWithProducts[]>> {
  try {
    const orders = await prisma.shipmentsWebOrder.findMany({
      include: {
        productos: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { fecha: 'desc' },
    });

    return {
      data: orders,
      meta: {
        total: orders.length,
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al listar compras web',
      },
    };
  }
}

export async function createWebOrder(
  payload: CreateWebOrderPayload
): Promise<ShipmentsResponse<WebOrderWithProducts>> {
  try {
    if (!payload.portal || payload.portal.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'portal es requerido',
          details: [{ field: 'portal', message: 'Campo requerido' }],
        },
      };
    }

    if (!payload.orden || payload.orden.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'orden es requerido',
          details: [{ field: 'orden', message: 'Campo requerido' }],
        },
      };
    }

    const fechaObj = new Date(payload.fecha);
    if (!payload.fecha || Number.isNaN(fechaObj.getTime())) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'fecha inválida (formato esperado: YYYY-MM-DD)',
          details: [{ field: 'fecha', message: 'Formato inválido' }],
        },
      };
    }

    if (payload.tc <= 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tc debe ser mayor a 0',
          details: [{ field: 'tc', message: 'Debe ser > 0' }],
        },
      };
    }

    if (payload.costoEnvioIntern < 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'costoEnvioIntern no puede ser negativo',
          details: [{ field: 'costoEnvioIntern', message: 'Debe ser >= 0' }],
        },
      };
    }

    if (!Array.isArray(payload.productos) || payload.productos.length === 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debe incluir al menos un producto',
          details: [{ field: 'productos', message: 'Array vacío' }],
        },
      };
    }

    for (let i = 0; i < payload.productos.length; i += 1) {
      const p = payload.productos[i];
      if (!p.nombre || p.nombre.trim() === '') {
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'nombre es requerido para cada producto',
            details: [{ field: `productos[${i}].nombre`, message: 'Campo requerido' }],
          },
        };
      }
      if (!Number.isInteger(p.cant) || p.cant <= 0) {
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'cant debe ser entero > 0',
            details: [{ field: `productos[${i}].cant`, message: 'Debe ser entero > 0' }],
          },
        };
      }
      if (p.precioUSD < 0 || p.precioCLP < 0 || p.pctCosteo < 0 || p.costoUnit < 0) {
        return {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valores monetarios no pueden ser negativos',
            details: [{ field: `productos[${i}]`, message: 'precioUSD/precioCLP/pctCosteo/costoUnit >= 0' }],
          },
        };
      }
    }

    const created = await prisma.$transaction(async (tx: any) => {
      const orderId = await generateNextWebOrderId();

      const order = await tx.shipmentsWebOrder.create({
        data: {
          orderId,
          fecha: fechaObj,
          portal: payload.portal.trim(),
          orden: payload.orden.trim(),
          tc: new Decimal(payload.tc),
          costoEnvioIntern: new Decimal(payload.costoEnvioIntern),
          estado: 'pendiente',
        },
      });

      await tx.shipmentsWebOrderProduct.createMany({
        data: payload.productos.map((p) => ({
          webOrderId: order.id,
          nombre: p.nombre.trim(),
          ean: p.ean?.trim() || null,
          cant: p.cant,
          precioUSD: new Decimal(p.precioUSD),
          precioCLP: new Decimal(p.precioCLP),
          pctCosteo: new Decimal(p.pctCosteo),
          costoUnit: new Decimal(p.costoUnit),
        })),
      });

      return tx.shipmentsWebOrder.findUnique({
        where: { id: order.id },
        include: {
          productos: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return {
      data: created as WebOrderWithProducts,
    };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'El ID de compra web ya existe',
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al registrar compra web',
      },
    };
  }
}

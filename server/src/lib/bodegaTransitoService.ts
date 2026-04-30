import { prisma } from '../index.js';
import type { ShipmentsResponse } from '../types/shipments.js';
import type { ShipmentsBox, ShipmentsBoxProduct } from '@prisma/client';

type BoxWithProducts = ShipmentsBox & {
  productos: ShipmentsBoxProduct[];
};

interface BodegaTransitoResponse {
  data: BoxWithProducts[];
  kpis: {
    enTransito: number;
    llegadas: number;
    costeadas: number;
  };
}

/**
 * Bodega Tránsito (solo lectura)
 * Lista cajas con sus productos y KPIs por estado.
 */
export async function getBodegaTransito(): Promise<ShipmentsResponse<BodegaTransitoResponse>> {
  try {
    const boxes = await prisma.shipmentsBox.findMany({
      include: {
        productos: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ fecha: 'desc' }, { boxId: 'asc' }],
    });

    const kpis = {
      enTransito: boxes.filter((b) => b.estado === 'transito').length,
      llegadas: boxes.filter((b) => b.estado === 'llegada').length,
      costeadas: boxes.filter((b) => b.estado === 'costeada').length,
    };

    return {
      data: {
        data: boxes,
        kpis,
      },
      meta: {
        total: boxes.length,
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al obtener bodega tránsito',
      },
    };
  }
}

import { prisma } from '../index.js';
import { Decimal } from '@prisma/client/runtime/library';
import type { ShipmentsResponse } from '../types/shipments.js';
import type { ShipmentsBox } from '@prisma/client';

interface InternacionListItem {
  cajaId: string;
  estado: string;
  internacion: {
    arancel: number;
    iva: number;
    total: number;
  } | null;
  registrada: boolean;
}

interface InternacionListResponse {
  data: InternacionListItem[];
}

export async function listInternacionStatus(): Promise<ShipmentsResponse<InternacionListResponse>> {
  try {
    const boxes = await prisma.shipmentsBox.findMany({
      orderBy: { fecha: 'desc' },
      select: {
        boxId: true,
        estado: true,
        internacionArancel: true,
        internacionIva: true,
      },
    });

    const data: InternacionListItem[] = boxes.map((b) => {
      const arancel = b.internacionArancel !== null ? Number(b.internacionArancel) : null;
      const iva = b.internacionIva !== null ? Number(b.internacionIva) : null;
      const registrada = arancel !== null && iva !== null;

      return {
        cajaId: b.boxId,
        estado: b.estado,
        internacion: registrada
          ? {
              arancel: arancel as number,
              iva: iva as number,
              total: (arancel as number) + (iva as number),
            }
          : null,
        registrada,
      };
    });

    return {
      data: { data },
      meta: { total: data.length },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al listar internación',
      },
    };
  }
}

export async function saveInternacion(
  cajaId: string,
  payload: { arancel: number; iva: number }
): Promise<ShipmentsResponse<ShipmentsBox>> {
  try {
    if (payload.arancel < 0 || Number.isNaN(payload.arancel)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'arancel debe ser un número mayor o igual a 0',
          details: [{ field: 'arancel', message: 'Debe ser >= 0' }],
        },
      };
    }

    if (payload.iva < 0 || Number.isNaN(payload.iva)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'iva debe ser un número mayor o igual a 0',
          details: [{ field: 'iva', message: 'Debe ser >= 0' }],
        },
      };
    }

    const box = await prisma.shipmentsBox.findUnique({
      where: { boxId: cajaId },
    });

    if (!box) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: `Caja ${cajaId} no encontrada`,
        },
      };
    }

    if (box.estado !== 'llegada' && box.estado !== 'costeada') {
      return {
        error: {
          code: 'CONFLICT',
          message: `No se puede registrar internación para una caja en estado "${box.estado}"`,
        },
      };
    }

    const updated = await prisma.shipmentsBox.update({
      where: { id: box.id },
      data: {
        internacionArancel: new Decimal(payload.arancel),
        internacionIva: new Decimal(payload.iva),
      },
    });

    return {
      data: updated,
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al guardar internación',
      },
    };
  }
}

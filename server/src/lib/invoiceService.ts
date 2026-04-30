import { prisma } from '../index.js';
import { ShipmentsResponse } from '../types/shipments.js';
import { ShipmentsInvoice, ShipmentsInvoiceItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Servicio de Boletas - Generación y gestión de invoices
 */

interface BoleteLineItem {
  compraId: string;
  precioU: number;
  cant: number;
  nombre: string;
  ean?: string;
  tipo: string;
}

interface InvoiceWithItems extends ShipmentsInvoice {
  items: ShipmentsInvoiceItem[];
}

/**
 * Genera el siguiente ID de boleta correlativo
 * Formato: BOL-YYYY-NNN (ej: BOL-2026-001, BOL-2026-002)
 */
export async function generateNextBoleteId(): Promise<string> {
  const year = new Date().getFullYear();
  
  // Buscar todas las boletas del año actual
  const lastInvoice = await prisma.shipmentsInvoice.findMany({
    where: {
      invoiceId: {
        startsWith: `BOL-${year}-`,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { invoiceId: true },
  });

  if (!lastInvoice.length) {
    return `BOL-${year}-001`;
  }

  const lastId = lastInvoice[0].invoiceId;
  const match = lastId.match(/BOL-\d+-(\d+)/);
  
  if (!match) {
    return `BOL-${year}-001`;
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;
  
  return `BOL-${year}-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Listar todas las boletas
 */
export async function listInvoices(): Promise<ShipmentsResponse<ShipmentsInvoice[]>> {
  try {
    const invoices = await prisma.shipmentsInvoice.findMany({
      orderBy: { fecha: 'desc' },
    });

    return {
      data: invoices,
      meta: {
        total: invoices.length,
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al listar boletas',
      },
    };
  }
}

/**
 * Obtener boleta con sus líneas de detalle
 */
export async function getInvoice(invoiceId: string): Promise<ShipmentsResponse<InvoiceWithItems>> {
  try {
    const invoice = await prisma.shipmentsInvoice.findUnique({
      where: { invoiceId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!invoice) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Boleta no encontrada',
        },
      };
    }

    return { data: invoice };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * Crear nueva boleta a partir de productos seleccionados
 */
export async function createInvoice(payload: {
  items: BoleteLineItem[];
  comisionPct: number;
  tc: number;
}): Promise<ShipmentsResponse<InvoiceWithItems>> {
  try {
    // Validaciones
    if (!payload.items || payload.items.length === 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debe incluir al menos un producto',
          details: [{ field: 'items', message: 'Array vacío' }],
        },
      };
    }

    if (payload.comisionPct < 0 || payload.comisionPct > 100) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La comisión debe estar entre 0 y 100',
          details: [{ field: 'comisionPct', message: 'Rango: 0-100' }],
        },
      };
    }

    if (payload.tc <= 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El tipo de cambio debe ser mayor a 0',
          details: [{ field: 'tc', message: 'Debe ser > 0' }],
        },
      };
    }

    // Calcular totales
    const subtotalJPY = payload.items.reduce(
      (sum, item) => sum + item.precioU * item.cant,
      0
    );

    const totalJPY = subtotalJPY * (1 + payload.comisionPct / 100);
    const totalCLP = Math.round(totalJPY / payload.tc);

    // Generar ID de boleta
    const invoiceId = await generateNextBoleteId();

    // Crear boleta
    const invoice = await prisma.shipmentsInvoice.create({
      data: {
        invoiceId,
        fecha: new Date(),
        subtotalJPY: new Decimal(subtotalJPY),
        comision: new Decimal(payload.comisionPct),
        totalJPY: new Decimal(totalJPY),
        tc: new Decimal(payload.tc),
        totalCLP: new Decimal(totalCLP),
        estado: 'sin_pagar',
      },
      include: {
        items: true,
      },
    });

    // Crear líneas de la boleta (sin compraId en schema actual - se guardará info del producto)
    const itemsData = payload.items.map((item) => ({
      invoiceId: invoice.id,
      fecha: new Date(),
      tipo: item.tipo,
      nombre: item.nombre,
      ean: item.ean || null,
      precioU: new Decimal(item.precioU),
      cant: item.cant,
      comPct: new Decimal(payload.comisionPct),
      tc: new Decimal(payload.tc),
      // NOTA: El schema no tiene compraId en invoice_items
      // Los items se identifican por nombre + ean + precioU
    }));

    await prisma.shipmentsInvoiceItem.createMany({
      data: itemsData,
    });

    // Obtener boleta con items actualizados
    const invoiceWithItems = await prisma.shipmentsInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return { data: invoiceWithItems as InvoiceWithItems };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'El ID de boleta ya existe',
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al crear boleta',
      },
    };
  }
}

/**
 * Eliminar boleta
 * Solo se puede eliminar si el estado es 'sin_pagar'
 */
export async function deleteInvoice(invoiceId: string): Promise<ShipmentsResponse<{ success: boolean }>> {
  try {
    // Verificar que existe
    const invoice = await prisma.shipmentsInvoice.findUnique({
      where: { invoiceId },
    });

    if (!invoice) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Boleta no encontrada',
        },
      };
    }

    // Verificar que está sin_pagar
    if (invoice.estado !== 'sin_pagar') {
      return {
        error: {
          code: 'CONFLICT',
          message: `No se puede eliminar boleta en estado "${invoice.estado}". Solo se pueden eliminar boletas sin pagar.`,
        },
      };
    }

    // Eliminar líneas primero
    await prisma.shipmentsInvoiceItem.deleteMany({
      where: { invoiceId: invoice.id },
    });

    // Eliminar boleta
    await prisma.shipmentsInvoice.delete({
      where: { id: invoice.id },
    });

    return {
      data: { success: true },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al eliminar boleta',
      },
    };
  }
}

/**
 * Actualizar estado de boleta a 'pagado'
 * Se usa desde el endpoint de "Confirmar Pago"
 */
export async function markInvoiceAsPaid(invoiceId: string): Promise<ShipmentsResponse<ShipmentsInvoice>> {
  try {
    const invoice = await prisma.shipmentsInvoice.findUnique({
      where: { invoiceId },
    });

    if (!invoice) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Boleta no encontrada',
        },
      };
    }

    const updated = await prisma.shipmentsInvoice.update({
      where: { id: invoice.id },
      data: { estado: 'pagado' },
    });

    return { data: updated };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }
}

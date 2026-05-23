import { prisma } from '../index.js';
import { ShipmentsResponse } from '../types/shipments.js';
import { ShipmentsInvoice } from '@prisma/client';

/**
 * Servicio de Pagos - Confirmar pagos de boletas
 */

interface PaymentConfirmationPayload {
  cuenta?: string;           // nombre de cuenta bancaria (para audit)
  fecha?: string;            // fecha de pago YYYY-MM-DD
  montoCLP?: number;         // monto transferido (para validar)
}

interface PaymentConfirmationResult {
  invoice: ShipmentsInvoice;
  purchasesUpdated: number;
}

/**
 * Confirmar pago de una boleta
 *
 * Lógica (transacción atómica):
 * 1. Verificar que la boleta existe y está 'sin_pagar'
 * 2. Obtener todas las compras por los datos del producto en los items
 * 3. Actualizar boleta a 'pagado'
 * 4. Actualizar todas las compras a 'pagado'
 *
 * NOTA: Busca compras coincidiendo nombre + ean + precioU de los items
 */
export async function confirmPayment(
  invoiceId: string,
  payload?: PaymentConfirmationPayload
): Promise<ShipmentsResponse<PaymentConfirmationResult>> {
  try {
    // 1. Buscar la boleta
    const invoice = await prisma.shipmentsInvoice.findUnique({
      where: { invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: `Boleta ${invoiceId} no encontrada`,
        },
      };
    }

    // 2. Verificar que esté sin_pagar
    if (invoice.estado !== 'sin_pagar') {
      return {
        error: {
          code: 'CONFLICT',
          message: `La boleta ${invoiceId} ya está en estado "${invoice.estado}". Solo se pueden confirmar boletas sin pagar.`,
        },
      };
    }

    // 3. Encontrar todas las compras que coincidan con los items de la boleta
    // Usamos el nombre del producto + ean + precioU como criterio de búsqueda
    const purchasesToUpdate: { id: string }[] = [];

    for (const item of invoice.items) {
      const matchingPurchases = await prisma.shipmentsPurchase.findMany({
        where: {
          nombre: item.nombre,
          ean: item.ean || undefined,
          precioU: item.precioU,
        },
        select: { id: true },
      });

      purchasesToUpdate.push(...matchingPurchases);
    }

    // Deduplicar IDs
    const uniquePurchaseIds = Array.from(new Set(purchasesToUpdate.map((p) => p.id)));

    // 4. Ejecutar transacción: actualizar boleta y compras
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar boleta a pagado
      const updatedInvoice = await tx.shipmentsInvoice.update({
        where: { id: invoice.id },
        data: { estado: 'pagado' },
      });

      // Actualizar todas las compras a pagado
      const updateResult = await tx.shipmentsPurchase.updateMany({
        where: { id: { in: uniquePurchaseIds } },
        data: { estado: 'pagado' },
      });

      return {
        invoice: updatedInvoice,
        purchasesUpdated: updateResult.count,
      };
    });

    return {
      data: result,
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al confirmar pago',
      },
    };
  }
}

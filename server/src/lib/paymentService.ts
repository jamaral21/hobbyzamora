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

    // 3. Encontrar y actualizar compras respetando cantidades de las líneas
    const purchasesToMarkPaid: string[] = [];
    const purchasesToMarkEspPago: string[] = [];

    for (const item of invoice.items) {
      // Remaining units to allocate from this invoice line
      let remaining = item.cant;

      // Find matching purchases ordered by createdAt (oldest first)
      const matchingPurchases = await prisma.shipmentsPurchase.findMany({
        where: {
          nombre: item.nombre,
          ean: item.ean || undefined,
          precioU: item.precioU,
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, cant: true },
      });

      for (const p of matchingPurchases) {
        if (remaining <= 0) break;
        const purchaseQty = Number(p.cant);
        if (remaining >= purchaseQty) {
          purchasesToMarkPaid.push(p.id);
          remaining -= purchaseQty;
        } else if (remaining > 0) {
          // Partial payment for this purchase
          purchasesToMarkEspPago.push(p.id);
          remaining = 0;
        }
      }
    }

    // Deduplicate ids
    const uniquePaid = Array.from(new Set(purchasesToMarkPaid));
    const uniqueEspPago = Array.from(new Set(purchasesToMarkEspPago)).filter(id => !uniquePaid.includes(id));

    // 4. Ejecutar transacción: actualizar boleta y compras (pagado y esp_pago)
    const result = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.shipmentsInvoice.update({
        where: { id: invoice.id },
        data: { estado: 'pagado' },
      });

      let purchasesUpdated = 0;

      if (uniquePaid.length > 0) {
        const r = await tx.shipmentsPurchase.updateMany({
          where: { id: { in: uniquePaid } },
          data: { estado: 'pagado' },
        });
        purchasesUpdated += r.count;
      }

      if (uniqueEspPago.length > 0) {
        const r2 = await tx.shipmentsPurchase.updateMany({
          where: { id: { in: uniqueEspPago } },
          data: { estado: 'esp_pago' },
        });
        purchasesUpdated += r2.count;
      }

      return {
        invoice: updatedInvoice,
        purchasesUpdated,
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

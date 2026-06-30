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

    // 3. Calcular estado de compras usando pago ACUMULADO por producto
    // (suma de todas las boletas ya pagadas + la boleta que estamos confirmando).
    type GroupedItem = {
      nombre: string;
      ean: string | null;
      precioU: typeof invoice.items[number]['precioU'];
      cantActual: number;
    };

    const groupedByProduct = new Map<string, GroupedItem>();
    for (const item of invoice.items) {
      const ean = item.ean ?? null;
      const key = `${item.nombre}__${ean ?? 'NULL'}__${item.precioU.toString()}`;
      const current = groupedByProduct.get(key);

      if (!current) {
        groupedByProduct.set(key, {
          nombre: item.nombre,
          ean,
          precioU: item.precioU,
          cantActual: item.cant,
        });
      } else {
        current.cantActual += item.cant;
      }
    }

    const purchasesToMarkPaid: string[] = [];
    const purchasesToMarkEspPago: string[] = [];
    const purchasesToMarkPorPagar: string[] = [];

    for (const grouped of groupedByProduct.values()) {
      const paidBefore = await prisma.shipmentsInvoiceItem.aggregate({
        where: {
          nombre: grouped.nombre,
          ean: grouped.ean,
          precioU: grouped.precioU,
          invoice: {
            estado: 'pagado',
          },
        },
        _sum: {
          cant: true,
        },
      });

      const paidQtyBefore = Number(paidBefore._sum.cant ?? 0);
      let paidQtyAfter = paidQtyBefore + grouped.cantActual;

      const matchingPurchases = await prisma.shipmentsPurchase.findMany({
        where: {
          nombre: grouped.nombre,
          ean: grouped.ean,
          precioU: grouped.precioU,
        },
        orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, cant: true },
      });

      for (const purchase of matchingPurchases) {
        const purchaseQty = Number(purchase.cant);

        if (paidQtyAfter >= purchaseQty) {
          purchasesToMarkPaid.push(purchase.id);
          paidQtyAfter -= purchaseQty;
          continue;
        }

        if (paidQtyAfter > 0) {
          purchasesToMarkEspPago.push(purchase.id);
          paidQtyAfter = 0;
          continue;
        }

        purchasesToMarkPorPagar.push(purchase.id);
      }
    }

    const uniquePaid = Array.from(new Set(purchasesToMarkPaid));
    const uniqueEspPago = Array.from(new Set(purchasesToMarkEspPago)).filter((id) => !uniquePaid.includes(id));
    const uniquePorPagar = Array.from(new Set(purchasesToMarkPorPagar)).filter(
      (id) => !uniquePaid.includes(id) && !uniqueEspPago.includes(id),
    );

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

      if (uniquePorPagar.length > 0) {
        const r3 = await tx.shipmentsPurchase.updateMany({
          where: { id: { in: uniquePorPagar } },
          data: { estado: 'por_pagar' },
        });
        purchasesUpdated += r3.count;
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

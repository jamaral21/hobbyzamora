import type { Order } from './api';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getDeliveryMethodLabel(deliveryMethod?: string | null): string {
  switch (deliveryMethod) {
    case 'starken-domicilio': return 'Envío a domicilio';
    case 'starken-sucursal': return 'Envío a sucursal Starken';
    case 'pickup-santiago': return 'Entrega presencial en Santiago';
    case 'pickup-valparaiso': return 'Entrega presencial en Valparaíso';
    default: return deliveryMethod || 'No informado';
  }
}

function getShippingAddress(order: Pick<Order, 'shippingStreet' | 'shippingCity' | 'shippingState' | 'shippingZip' | 'shippingCountry'>): string {
  return [
    order.shippingStreet,
    order.shippingCity,
    order.shippingState,
    order.shippingZip,
    order.shippingCountry,
  ].filter((part): part is string => Boolean(part?.trim())).join(', ') || 'No informada';
}

export function buildShippingLabelHtml(order: Order): string {
  const products = order.items
    .map((item) => `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`)
    .join('; ') || 'Sin productos';

  const fields = [
    ['Nombre', order.customerName],
    ['Rut', order.customerRut || 'No informado'],
    ['Email', order.customerEmail],
    ['Teléfono', order.customerPhone || 'No informado'],
    ['Tipo de entrega', getDeliveryMethodLabel(order.deliveryMethod)],
    ['Dirección', getShippingAddress(order)],
  ].map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('');

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Etiqueta ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef4fb; color: #111; font-family: Arial, Helvetica, sans-serif; padding: 20px; }
    .actions { max-width: 104mm; margin: 0 auto 12px; display: flex; justify-content: flex-end; gap: 8px; }
    button { border: 1px solid #9ca3af; border-radius: 6px; background: #fff; padding: 7px 10px; font-size: 13px; cursor: pointer; }
    button.primary { background: #111827; color: #fff; border-color: #111827; }
    .label { width: 104mm; height: 80mm; margin: 0 auto; padding: 6mm 7mm; background: #fff; border: 1px solid #d1d5db; border-radius: 4mm; box-shadow: 0 4mm 8mm rgba(15, 23, 42, .24); display: flex; flex-direction: column; overflow: hidden; }
    .order-number { margin: 0 0 7mm; color: #6b7280; font-size: 8.25pt; }
    .recipient p { margin: 0 0 2.5mm; font-size: 11.25pt; line-height: 1.18; overflow-wrap: anywhere; }
    .recipient strong { font-size: 11.25pt; }
    .items { margin-top: auto; padding-top: 4mm; font-size: 7.875pt; line-height: 1.35; overflow-wrap: anywhere; }
    @media print {
      @page { size: 104mm 80mm; margin: 0; }
      body { padding: 0; background: #fff; }
      .actions { display: none; }
      .label { width: 104mm; height: 80mm; border: 0; border-radius: 0; box-shadow: none; page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.close()">Cerrar</button><button class="primary" onclick="window.print()">Imprimir</button></div>
  <article class="label">
    <p class="order-number">Pedido ${escapeHtml(order.orderNumber)}</p>
    <section class="recipient">${fields}</section>
    <footer class="items">${escapeHtml(products)}</footer>
  </article>
</body>
</html>`;
}

export function openShippingLabelPrintPreview(order: Order): void {
  const printWindow = window.open('about:blank', '_blank');
  if (!printWindow) {
    window.alert('No se pudo abrir la etiqueta. Revisa el bloqueador de ventanas emergentes.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildShippingLabelHtml(order));
  printWindow.document.close();
}
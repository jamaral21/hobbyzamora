import { describe, expect, it } from 'vitest';
import { buildShippingLabelHtml } from './shippingLabelPrint.js';

describe('buildShippingLabelHtml', () => {
  it('includes the complete recipient and order product data safely', () => {
    const html = buildShippingLabelHtml({
      id: 'order-1', orderNumber: 'ORD-001', customerName: 'Mauricio <Espinoza>', customerEmail: 'maurestos@gmail.com', customerPhone: '+56987553859', customerRut: '16.917.933-6', deliveryMethod: 'starken-domicilio', shippingStreet: 'Alen 2034', shippingCity: 'Llaillay', shippingState: 'Valparaiso', shippingZip: '2220077', shippingCountry: 'Chile', createdAt: '2026-08-21T00:00:00.000Z', subtotal: 0, tax: 0, shipping: 0, discount: 0, total: 0, status: 'PROCESSING', source: 'ONLINE', items: [{ id: 'item-1', productId: 'product-1', name: 'Producto 1', sku: 'SKU-1', price: 0, cost: 0, quantity: 2 }],
    });

    expect(html).toContain('Mauricio &lt;Espinoza&gt;');
    expect(html).toContain('16.917.933-6');
    expect(html).toContain('Alen 2034, Llaillay, Valparaiso, 2220077, Chile');
    expect(html).toContain('Producto 1 ×2');
    expect(html).toContain('@page { size: 100mm 150mm;');
  });
});
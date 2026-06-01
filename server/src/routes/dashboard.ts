import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { calcDisponibleBySku } from '../lib/purchaseService.js';

const router = Router();

const ALLOWED_CHANNELS = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'] as const;

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [purchases, transitoCount, unitsChile, boletasPendientes, monthOrders, monthGavInvoiceCount] = await Promise.all([
      prisma.shipmentsPurchase.findMany({
        select: { sku: true },
      }),
      prisma.shipmentsBox.count({
        where: { estado: 'transito' },
      }),
      prisma.product.aggregate({
        _sum: { stock: true },
      }),
      prisma.shipmentsInvoice.count({
        where: { estado: 'sin_pagar' },
      }),
      prisma.order.findMany({
        where: {
          source: { in: [...ALLOWED_CHANNELS] },
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        select: {
          items: {
            select: {
              price: true,
              cost: true,
              quantity: true,
            },
          },
        },
      }),
      prisma.shipmentsInvoice.count({
        where: {
          invoiceId: { contains: 'GAV' },
          fecha: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      }),
    ]);

    const uniqueSkus = Array.from(new Set(purchases.map((p) => p.sku)));
    const disponibles = await Promise.all(uniqueSkus.map((sku) => calcDisponibleBySku(sku)));
    const productosJapon = disponibles.filter((qty) => qty > 0).length;

    const ventasDelMes = monthOrders.reduce((sum, order) => {
      return sum + order.items.reduce((orderSum, item) => orderSum + Number(item.price) * item.quantity, 0);
    }, 0);

    const margins: number[] = [];
    for (const order of monthOrders) {
      for (const item of order.items) {
        const price = Number(item.price);
        if (price <= 0) continue;
        const cost = Number(item.cost);
        margins.push(((price - cost) / price) * 100);
      }
    }

    const margenPromedio = margins.length > 0
      ? Math.round(margins.reduce((sum, value) => sum + value, 0) / margins.length)
      : 0;

    const gavPendiente = now.getDate() >= 3 && monthGavInvoiceCount === 0;

    return res.json({
      data: {
        productosJapon,
        cajasTransito: transitoCount,
        unidadesChile: Number(unitsChile._sum.stock ?? 0),
        boletasPendientes,
        ventasDelMes,
        margenPromedio,
        alertaGavPendiente: gavPendiente,
      },
    });
  } catch (error) {
    console.error('GET /shipments/dashboard error:', error);
    return res.status(500).json({ error: 'No se pudo calcular el dashboard' });
  }
});

export default router;

import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_CHANNELS = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'] as const;
type SalesChannel = (typeof ALLOWED_CHANNELS)[number];

function isSalesChannel(value: unknown): value is SalesChannel {
  return typeof value === 'string' && (ALLOWED_CHANNELS as readonly string[]).includes(value);
}

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        source: { in: [...ALLOWED_CHANNELS] },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = orders.flatMap((order) =>
      order.items.map((item) => ({
        id: `${order.id}:${item.id}`,
        orderId: order.id,
        fecha: order.createdAt.toISOString(),
        producto: item.name,
        productId: item.productId,
        sku: item.sku,
        ean: null,
        cant: item.quantity,
        precioVenta: Number(item.price),
        costo: Number(item.cost),
        total: Number(item.price) * item.quantity,
        canal: order.source,
      }))
    );

    return res.json({ data });
  } catch (error) {
    console.error('GET /shipments/ventas error:', error);
    return res.status(500).json({ error: 'No se pudieron obtener las ventas' });
  }
});

router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { productId, cant, precioVenta, canal } = req.body ?? {};

    const quantity = Number(cant);
    const salePrice = Number(precioVenta);

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'productId es requerido' });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'cant debe ser un entero mayor a 0' });
    }

    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      return res.status(400).json({ error: 'precioVenta debe ser mayor a 0' });
    }

    if (!isSalesChannel(canal)) {
      return res.status(400).json({ error: 'Canal de venta inválido' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        cost: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ error: `Stock insuficiente. Disponible: ${product.stock}` });
    }

    const total = salePrice * quantity;
    const now = new Date();

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: `SHIP-${Date.now()}`,
          customerName: `Venta ${canal}`,
          customerEmail: 'shipments@hobbyzamora.local',
          subtotal: total,
          tax: 0,
          shipping: 0,
          discount: 0,
          total,
          status: 'DELIVERED',
          source: canal,
          items: {
            create: [
              {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: salePrice,
                cost: product.cost,
                quantity,
              },
            ],
          },
          payments: {
            create: [
              {
                method: 'CASH',
                status: 'APPROVED',
                amount: total,
                paidAt: now,
              },
            ],
          },
        },
        include: {
          items: true,
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { decrement: quantity },
        },
      });

      return order;
    });

    const item = created.items[0];

    return res.status(201).json({
      data: {
        id: `${created.id}:${item.id}`,
        orderId: created.id,
        fecha: created.createdAt.toISOString(),
        producto: item.name,
        productId: item.productId,
        sku: item.sku,
        ean: null,
        cant: item.quantity,
        precioVenta: Number(item.price),
        costo: Number(item.cost),
        total: Number(item.price) * item.quantity,
        canal: created.source,
      },
    });
  } catch (error) {
    console.error('POST /shipments/ventas error:', error);
    return res.status(500).json({ error: 'No se pudo registrar la venta' });
  }
});

export default router;

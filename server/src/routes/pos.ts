import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { getPresaleUnavailableReason } from '../lib/presaleUtils.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const parseImages = (images: string): string[] => {
  try { return JSON.parse(images); } catch { return images ? [images] : []; }
};

const formatPOSProduct = (product: any) => {
  const batchStock = product.inventoryBatches.reduce((sum: number, batch: { remaining: number }) => sum + batch.remaining, 0);

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    ean: product.ean ?? null,
    price: parseFloat(product.price.toString()),
    cost: parseFloat(product.cost.toString()),
    images: parseImages(product.images),
    isPresale: product.isPresale,
    stock: product.inventoryBatches.length > 0 ? batchStock : product.stock,
    variants: product.variants.map((variant: any) => ({
      id: variant.id,
      name: variant.name,
      options: variant.options,
      price: variant.price ? parseFloat(variant.price.toString()) : null,
      stock: variant.stock,
    })),
  };
};

// Getnet Chile (PlacetoPay) configuration
const GETNET_ENDPOINT = process.env.GETNET_ENDPOINT || 'https://checkout.test.getnet.cl';
const GETNET_LOGIN = process.env.GETNET_LOGIN || '';
const GETNET_TRANKEY = process.env.GETNET_TRANKEY || '';

function generatePlacetoPayAuth() {
  const rawNonce = crypto.randomBytes(16).toString('hex');
  const seed = new Date().toISOString();
  const digest = crypto
    .createHash('sha256')
    .update(rawNonce + seed + GETNET_TRANKEY)
    .digest('base64');
  return {
    login: GETNET_LOGIN,
    tranKey: digest,
    nonce: Buffer.from(rawNonce).toString('base64'),
    seed,
  };
}

const router = Router();

// Generate POS order number
function generatePOSOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `POS-${year}${month}${day}-${random}`;
}

// Get products for POS (optimized for quick search)
router.get('/products', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { search, category, ean, barcode } = req.query;
    const searchValue = String(search || '').trim();
    const rawCode = String((ean as string) || (barcode as string) || '').trim();
    const effectiveQuery = rawCode || searchValue;

    const where: any = {
      status: 'ACTIVE',
    };

    if (searchValue) {
      where.OR = [
        { name: { contains: searchValue } },
        { sku: { contains: searchValue } },
        { ean: { contains: searchValue } },
      ];
    }

    if (category) {
      where.category = category as string;
    }

    if (rawCode) {
      where.OR = [
        { sku: rawCode },
        { ean: rawCode },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: true,
        inventoryBatches: {
          where: { remaining: { gt: 0 } },
          select: { remaining: true },
        },
      },
      take: 100,
      orderBy: { name: 'asc' },
    });

    const normalizedQuery = effectiveQuery.toLowerCase();
    const rankedProducts = products
      .map(formatPOSProduct)
      .sort((a, b) => {
        const score = (product: ReturnType<typeof formatPOSProduct>) => {
          if (!normalizedQuery) return 0;
          let total = 0;
          if (String(product.ean || '').toLowerCase() === normalizedQuery) total += 6;
          if (product.sku.toLowerCase() === normalizedQuery) total += 5;
          if (product.sku.toLowerCase().includes(normalizedQuery)) total += 2;
          if (product.name.toLowerCase().includes(normalizedQuery)) total += 1;
          return total;
        };

        return score(b) - score(a) || a.name.localeCompare(b.name, 'es');
      });

    res.json(rankedProducts);
  } catch (error) {
    console.error('Get POS products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get products by EAN/SKU scan
router.get('/scan/:code', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const code = (req.params.code as string).trim();
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { sku: code },
          { sku: { contains: code } },
          { ean: code },
        ],
        status: 'ACTIVE',
      },
      include: {
        variants: true,
        inventoryBatches: {
          where: { remaining: { gt: 0 } },
          select: { remaining: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const rankedProducts = products
      .map(formatPOSProduct)
      .sort((a, b) => {
        const exactA = Number(String(a.ean || '') === code) + Number(a.sku === code);
        const exactB = Number(String(b.ean || '') === code) + Number(b.sku === code);
        return exactB - exactA || a.name.localeCompare(b.name, 'es');
      });

    res.json(rankedProducts);
  } catch (error) {
    console.error('Scan product error:', error);
    res.status(500).json({ error: 'Failed to scan product' });
  }
});

// Create POS sale
router.post('/sale', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const {
      items,
      customerName = 'Walk-in Customer',
      customerEmail = '',
      customerPhone = '',
      customerId,
      paymentMethod,
      amountPaid,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in sale' });
    }

    const presaleCustomer = customerId
      ? await prisma.user.findUnique({
          where: { id: customerId },
          select: { id: true, presaleBanned: true },
        })
      : null;

    // Validate items and prepare order items
    const orderItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity && !product.isPresale) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      if (product.isPresale) {
        if (!customerId) {
          return res.status(400).json({ error: 'Las preventas en POS requieren un cliente asociado' });
        }

        if (!presaleCustomer) {
          return res.status(404).json({ error: 'Cliente no encontrado para la preventa' });
        }

        if (presaleCustomer.presaleBanned) {
          return res.status(403).json({ error: 'Este cliente está bloqueado para futuras preventas' });
        }

        const existingReservation = await prisma.presaleReservation.findUnique({
          where: { userId_productId: { userId: customerId, productId: product.id } },
          select: { status: true },
        });

        const hasActiveReservation = Boolean(
          existingReservation && ['PENDING', 'NOTIFIED', 'PAID'].includes(existingReservation.status)
        );

        const activeReservedCount = await prisma.presaleReservation.count({
          where: {
            productId: product.id,
            status: { in: ['PENDING', 'NOTIFIED', 'PAID'] },
          },
        });

        const unavailableReason = getPresaleUnavailableReason(product, new Date(), activeReservedCount);
        if (unavailableReason && !(hasActiveReservation && unavailableReason === 'No hay cupos disponibles para esta preventa')) {
          return res.status(400).json({ error: `${product.name}: ${unavailableReason}` });
        }

        if (product.presaleMaxQty && item.quantity > product.presaleMaxQty) {
          return res.status(400).json({ error: `Max quantity for presale is ${product.presaleMaxQty}` });
        }
      }

      const itemPrice = item.price || parseFloat(product.price.toString());
      subtotal += itemPrice * item.quantity;

      orderItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: itemPrice,
        cost: parseFloat(product.cost.toString()),
        quantity: item.quantity,
        variantName: item.variantName || null,
      });
    }

    // Calculate totals (POS typically includes tax in price)
    const tax = 0; // Tax already included in displayed prices
    const total = subtotal;

    // --- Getnet card payment: create a pending order and initiate checkout session ---
    if (paymentMethod === 'CARD' && GETNET_LOGIN) {
      const orderNumber = generatePOSOrderNumber();

      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerName,
          customerEmail,
          customerPhone,
          subtotal,
          tax,
          shipping: 0,
          discount: 0,
          total,
          status: 'PENDING',
          source: 'POS',
          notes,
          items: { create: orderItems },
          payments: {
            create: {
              method: 'GETNET',
              status: 'PENDING',
              amount: total,
            },
          },
        },
        include: { items: true, payments: true },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const apiUrl = `http://localhost:${process.env.PORT || 3001}`;
      const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const sessionData = {
        auth: generatePlacetoPayAuth(),
        payment: {
          reference: orderNumber,
          description: `Venta POS ${orderNumber} - HobbyZamora`,
          amount: { currency: 'CLP', total: Math.round(total) },
          allowPartial: false,
        },
        expiration,
        returnUrl: `${frontendUrl}/admin/pos`,
        notificationUrl: `${apiUrl}/api/payments/getnet/callback`,
        ipAddress: (req.ip === '::1' ? '127.0.0.1' : req.ip) || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'HobbyZamora-POS/1.0',
        buyer: {
          name: customerName.split(' ')[0],
          surname: customerName.split(' ').slice(1).join(' ') || 'N/A',
          email: customerEmail || 'pos@hobbyzamora.cl',
        },
      };

      const sessionResp = await fetch(`${GETNET_ENDPOINT}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      const sessionJson = await sessionResp.json();

      if (sessionJson.status?.status === 'ERROR' || !sessionJson.processUrl) {
        console.error('Getnet POS session error:', JSON.stringify(sessionJson));
        return res.status(500).json({
          error: 'No se pudo iniciar sesión de pago con Getnet',
          detail: sessionJson.status?.message || 'Error desconocido',
        });
      }

      await prisma.payment.update({
        where: { id: order.payments[0].id },
        data: {
          getnetPaymentId: String(sessionJson.requestId),
          getnetCheckoutUrl: sessionJson.processUrl,
        },
      });

      // Deduct stock / handle presale reservations (Getnet)
      for (const item of orderItems) {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { isPresale: true } });
        if (product?.isPresale) {
          if (customerId) {
            await prisma.presaleReservation.upsert({
              where: { userId_productId: { userId: customerId, productId: item.productId } },
              update: {
                status: 'PAID',
                paidAt: new Date(),
                cancelledAt: null,
                cancellationReason: null,
                cancelledBy: null,
              },
              create: { userId: customerId, productId: item.productId, status: 'PAID', paidAt: new Date() },
            });
          }
        } else {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return res.status(201).json({
        ...order,
        orderNumber,
        subtotal: parseFloat(order.subtotal.toString()),
        total: parseFloat(order.total.toString()),
        change: 0,
        checkoutUrl: sessionJson.processUrl,
        requestId: sessionJson.requestId,
        paymentId: order.payments[0].id,
        items: order.items.map(i => ({
          ...i,
          price: parseFloat(i.price.toString()),
          cost: parseFloat(i.cost.toString()),
        })),
      });
    }

    // --- Standard payment (CASH / TRANSFER) ---
    const order = await prisma.order.create({
      data: {
        orderNumber: generatePOSOrderNumber(),
        customerName,
        customerEmail,
        customerPhone,
        subtotal,
        tax,
        shipping: 0,
        discount: 0,
        total,
        status: 'DELIVERED',
        source: 'POS',
        notes,
        items: {
          create: orderItems,
        },
        payments: {
          create: {
            method: paymentMethod || 'CASH',
            status: 'APPROVED',
            amount: total,
            paidAt: new Date(),
          },
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // Deduct stock / handle presale reservations (CASH/TRANSFER)
    for (const item of orderItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { isPresale: true } });
      if (product?.isPresale) {
        if (customerId) {
          await prisma.presaleReservation.upsert({
            where: { userId_productId: { userId: customerId, productId: item.productId } },
            update: {
              status: 'PAID',
              paidAt: new Date(),
              cancelledAt: null,
              cancellationReason: null,
              cancelledBy: null,
            },
            create: { userId: customerId, productId: item.productId, status: 'PAID', paidAt: new Date() },
          });
        }
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Calculate change if cash payment
    const change = paymentMethod === 'CASH' && amountPaid ? amountPaid - total : 0;

    res.status(201).json({
      ...order,
      subtotal: parseFloat(order.subtotal.toString()),
      total: parseFloat(order.total.toString()),
      change: change > 0 ? Math.round(change * 100) / 100 : 0,
      items: order.items.map(i => ({
        ...i,
        price: parseFloat(i.price.toString()),
        cost: parseFloat(i.cost.toString()),
      })),
    });
  } catch (error) {
    console.error('Create POS sale error:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// Get today's POS sales
router.get('/today', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await prisma.order.findMany({
      where: {
        source: 'POS',
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total.toString()), 0);
    const totalItems = sales.reduce((sum, s) => 
      sum + s.items.reduce((is, i) => is + i.quantity, 0), 0
    );

    res.json({
      sales: sales.map(s => ({
        ...s,
        subtotal: parseFloat(s.subtotal.toString()),
        total: parseFloat(s.total.toString()),
        items: s.items.map(i => ({
          ...i,
          price: parseFloat(i.price.toString()),
        })),
      })),
      summary: {
        count: sales.length,
        totalSales: Math.round(totalSales * 100) / 100,
        totalItems,
      },
    });
  } catch (error) {
    console.error('Get today sales error:', error);
    res.status(500).json({ error: 'Failed to get today sales' });
  }
});

// Get cash register summary
router.get('/register', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: today },
        order: { source: 'POS' },
        status: 'APPROVED',
      },
    });

    const byMethod = payments.reduce((acc, p) => {
      const method = p.method;
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count++;
      acc[method].total += parseFloat(p.amount.toString());
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const total = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    res.json({
      total: Math.round(total * 100) / 100,
      byMethod,
      transactionCount: payments.length,
    });
  } catch (error) {
    console.error('Get register error:', error);
    res.status(500).json({ error: 'Failed to get register' });
  }
});

export default router;

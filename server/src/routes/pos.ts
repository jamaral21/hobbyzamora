import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

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
    const { search, category, barcode } = req.query;

    const where: any = {
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (barcode) {
      where.sku = barcode;
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

    res.json(products.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      price: parseFloat(p.price.toString()),
      cost: parseFloat(p.cost.toString()),
      images: p.images,
      stock: p.inventoryBatches.reduce((sum, b) => sum + b.remaining, 0),
      variants: p.variants.map(v => ({
        id: v.id,
        name: v.name,
        options: v.options,
        price: v.price ? parseFloat(v.price.toString()) : null,
        stock: v.stock,
      })),
    })));
  } catch (error) {
    console.error('Get POS products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get product by barcode/SKU
router.get('/scan/:code', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: req.params.code },
          { sku: { contains: req.params.code, mode: 'insensitive' } },
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
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: parseFloat(product.price.toString()),
      cost: parseFloat(product.cost.toString()),
      images: product.images,
      stock: product.inventoryBatches.reduce((sum, b) => sum + b.remaining, 0),
      variants: product.variants.map(v => ({
        id: v.id,
        name: v.name,
        options: v.options,
        price: v.price ? parseFloat(v.price.toString()) : null,
      })),
    });
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
      paymentMethod,
      amountPaid,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in sale' });
    }

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

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
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

    // Create order
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
        status: 'DELIVERED', // POS sales are completed immediately
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

    // Deduct stock directly from product
    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
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

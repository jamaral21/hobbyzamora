import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}${month}-${random}`;
}

// Get all orders (admin)
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { 
      status, 
      source, 
      startDate, 
      endDate, 
      search,
      page = '1', 
      limit = '50' 
    } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } },
        { customerEmail: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { images: true } },
            },
          },
          payments: true,
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map(o => ({
        ...o,
        subtotal: parseFloat(o.subtotal.toString()),
        tax: parseFloat(o.tax.toString()),
        shipping: parseFloat(o.shipping.toString()),
        discount: parseFloat(o.discount.toString()),
        total: parseFloat(o.total.toString()),
        items: o.items.map(i => ({
          ...i,
          price: parseFloat(i.price.toString()),
          cost: parseFloat(i.cost.toString()),
        })),
        payments: o.payments.map(p => ({
          ...p,
          amount: parseFloat(p.amount.toString()),
        })),
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get single order
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: { select: { images: true } },
          },
        },
        payments: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        address: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access: authenticated customers can only see their own orders
    if (req.user && req.user.role === 'CUSTOMER' && order.userId && order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      ...order,
      subtotal: parseFloat(order.subtotal.toString()),
      tax: parseFloat(order.tax.toString()),
      shipping: parseFloat(order.shipping.toString()),
      discount: parseFloat(order.discount.toString()),
      total: parseFloat(order.total.toString()),
      items: order.items.map(i => ({
        ...i,
        price: parseFloat(i.price.toString()),
        cost: parseFloat(i.cost.toString()),
      })),
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Create order (online checkout)
router.post('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shipping,
      shippingAddress,
      paymentMethod,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }

    // Validate and get product details
    const orderItems: any[] = [];
    let subtotal = 0;
    let totalCost = 0;

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          variants: true,
        },
      });

      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }

      // Check presale limits
      if (product.isPresale && product.presaleMaxQty) {
        if (item.quantity > product.presaleMaxQty) {
          return res.status(400).json({ 
            error: `Max quantity for presale is ${product.presaleMaxQty}` 
          });
        }
      }

      let itemPrice = parseFloat(product.price.toString());
      let variantName = null;

      // Handle variant
      if (item.variantId) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (variant) {
          itemPrice = variant.price ? parseFloat(variant.price.toString()) : itemPrice;
          variantName = `${variant.name}: ${variant.options.join(', ')}`;
        }
      }

      subtotal += itemPrice * item.quantity;

      orderItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        name: product.name,
        sku: product.sku,
        price: itemPrice,
        cost: parseFloat(product.cost.toString()),
        quantity: item.quantity,
        variantName,
      });
    }

    // Calculate totals
    const tax = subtotal * 0.16; // 16% IVA
    const shippingCost = shipping?.cost || 0;
    const discount = 0;
    const total = subtotal + tax + shippingCost - discount;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user?.id || null,
        customerName,
        customerEmail,
        customerPhone,
        shippingStreet: shippingAddress?.street,
        shippingCity: shippingAddress?.city,
        shippingState: shippingAddress?.state,
        shippingZip: shippingAddress?.zipCode,
        shippingCountry: shippingAddress?.country,
        subtotal,
        tax,
        shipping: shippingCost,
        discount,
        total,
        status: 'PENDING',
        source: 'ONLINE',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });

    // Deduct stock directly from product
    for (const item of orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    res.status(201).json({
      ...order,
      subtotal: parseFloat(order.subtotal.toString()),
      tax: parseFloat(order.tax.toString()),
      shipping: parseFloat(order.shipping.toString()),
      discount: parseFloat(order.discount.toString()),
      total: parseFloat(order.total.toString()),
      items: order.items.map(i => ({
        ...i,
        price: parseFloat(i.price.toString()),
        cost: parseFloat(i.cost.toString()),
      })),
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.patch('/:id/status', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Handle cancellation - return stock
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, payments: true },
    });

    res.json({
      ...updated,
      subtotal: parseFloat(updated.subtotal.toString()),
      tax: parseFloat(updated.tax.toString()),
      shipping: parseFloat(updated.shipping.toString()),
      discount: parseFloat(updated.discount.toString()),
      total: parseFloat(updated.total.toString()),
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get user's orders
router.get('/my/orders', authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: {
        items: {
          include: {
            product: { select: { images: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders.map(o => ({
      ...o,
      subtotal: parseFloat(o.subtotal.toString()),
      tax: parseFloat(o.tax.toString()),
      shipping: parseFloat(o.shipping.toString()),
      discount: parseFloat(o.discount.toString()),
      total: parseFloat(o.total.toString()),
      items: o.items.map(i => ({
        ...i,
        price: parseFloat(i.price.toString()),
        cost: parseFloat(i.cost.toString()),
      })),
    })));
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

export default router;

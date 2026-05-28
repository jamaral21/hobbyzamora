import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, optionalAuth, AuthRequest } from '../middleware/auth.js';
import {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendNewOrderAdminEmail,
} from '../lib/emailService.js';
import { getPresaleUnavailableReason } from '../lib/presaleUtils.js';

const router = Router();

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}${month}-${random}`;
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === 'string');
  }

  if (typeof images !== 'string' || !images.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) {
      return parsed.filter((img): img is string => typeof img === 'string');
    }
  } catch {
    // Fallback for legacy rows where images might be stored as plain text.
  }

  return [images];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseProductIdsParam(value: unknown): string[] {
  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => UUID_REGEX.test(item));
}

// Get all orders (admin)
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { 
      status, 
      source, 
      startDate, 
      endDate,
      productIds,
      search,
      page = '1', 
      limit = '50' 
    } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const pageNumber = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const noLimit = limit === 'all';
    const parsedLimit = parseInt(limit as string, 10);
    const limitNumber = !noLimit && Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;

    const baseWhere: any = {};

    if (source) {
      baseWhere.source = source;
    }

    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const endDateExclusive = new Date(endDate as string);
        endDateExclusive.setDate(endDateExclusive.getDate() + 1);
        baseWhere.createdAt.lt = endDateExclusive;
      }
    }

    const filteredProductIds = parseProductIdsParam(productIds);
    if (filteredProductIds.length > 0) {
      baseWhere.items = {
        some: {
          productId: { in: filteredProductIds },
        },
      };
    }

    if (search) {
      baseWhere.OR = [
        { orderNumber: { contains: search as string } },
        { customerName: { contains: search as string } },
        { customerEmail: { contains: search as string } },
      ];
    }

    const where: any = {
      ...baseWhere,
      ...(status ? { status } : {}),
    };

    const skip = noLimit ? undefined : (pageNumber - 1) * limitNumber;

    const [orders, total, groupedStatusCounts] = await Promise.all([
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
        ...(skip !== undefined ? { skip } : {}),
        ...(!noLimit ? { take: limitNumber } : {}),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true },
      }),
    ]);

    const statusCounts = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };

    for (const row of groupedStatusCounts) {
      statusCounts[row.status as keyof typeof statusCounts] = row._count.status;
    }

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
          product: i.product
            ? {
                ...i.product,
                images: parseImages(i.product.images),
              }
            : i.product,
        })),
        payments: o.payments.map(p => ({
          ...p,
          amount: parseFloat(p.amount.toString()),
        })),
      })),
      pagination: {
        page: pageNumber,
        limit: noLimit ? total : limitNumber,
        total,
        totalPages: noLimit ? 1 : Math.ceil(total / limitNumber),
      },
      statusCounts,
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
      where: { id: req.params.id as string },
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
        product: i.product
          ? {
              ...i.product,
              images: parseImages(i.product.images),
            }
          : i.product,
      })),
      payments: order.payments.map(p => ({
        ...p,
        amount: parseFloat(p.amount.toString()),
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
      addressId,
      customerRut,
      deliveryMethod,
      shipping,
      shippingAddress,
      paymentMethod,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in order' });
    }

    const presaleUser = req.user?.id
      ? await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { id: true, presaleBanned: true },
        })
      : null;

    const savedAddress = addressId
      ? await prisma.address.findFirst({
          where: { id: addressId, userId: req.user?.id || '' },
        })
      : null;

    if (addressId && !savedAddress) {
      return res.status(404).json({ error: 'Saved address not found' });
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

      if (product.stock < item.quantity && !product.isPresale) {
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      if (product.isPresale) {
        if (!req.user?.id) {
          return res.status(401).json({ error: 'Debes iniciar sesión para comprar una preventa' });
        }

        if (presaleUser?.presaleBanned) {
          return res.status(403).json({ error: 'Tu cuenta está bloqueada para futuras preventas' });
        }

        const existingReservation = await prisma.presaleReservation.findUnique({
          where: { userId_productId: { userId: req.user.id, productId: product.id } },
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
          variantName = `${variant.name}: ${variant.options}`;
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
    // Los precios ya incluyen IVA (19%). Se extrae el IVA del subtotal.
    const tax = Math.round(subtotal * 19 / 119 * 100) / 100; // IVA débito (incluido en precio)
    const shippingCost = shipping?.cost || 0;
    const discount = 0;
    const total = subtotal + shippingCost - discount; // IVA ya incluido, no se suma

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user?.id || null,
        customerName,
        customerEmail,
        customerPhone,
        addressId: savedAddress?.id || null,
        customerRut: customerRut || null,
        deliveryMethod: deliveryMethod || null,
        shippingStreet: savedAddress?.street || shippingAddress?.street,
        shippingCity: savedAddress?.city || shippingAddress?.city,
        shippingState: savedAddress?.state || shippingAddress?.state,
        shippingZip: savedAddress?.zipCode || shippingAddress?.zipCode,
        shippingCountry: savedAddress?.country || shippingAddress?.country,
        subtotal,
        tax,
        shipping: shippingCost,
        discount,
        total,
        status: 'PENDING',
        source: 'ONLINE',
        notes: notes || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });

    const normalizedPaymentMethod =
      typeof paymentMethod === 'string' ? paymentMethod.toUpperCase() : '';

    if (normalizedPaymentMethod === 'TRANSFER' || normalizedPaymentMethod === 'CASH') {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: normalizedPaymentMethod,
          status: 'PENDING',
          amount: total,
        },
      });
    }

    // Deduct stock / handle presale reservations
    for (const item of orderItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { isPresale: true } });
      if (product?.isPresale) {
        const userId = req.user?.id;

        if (userId) {
          await prisma.presaleReservation.upsert({
            where: { userId_productId: { userId, productId: item.productId } },
            update: {
              status: 'PAID',
              paidAt: new Date(),
              cancelledAt: null,
              cancellationReason: null,
              cancelledBy: null,
            },
            create: { userId, productId: item.productId, status: 'PAID', paidAt: new Date() },
          });
        }
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    const orderResponse = {
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
    };

    // Emails (non-blocking)
    sendOrderConfirmationEmail(orderResponse).catch(() => {});
    sendNewOrderAdminEmail(orderResponse).catch(() => {});

    res.status(201).json(orderResponse);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
// Delete single order (admin only)
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await prisma.order.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_ORDER',
        entity: 'Order',
        entityIds: order.orderNumber,
        performedBy: req.user?.email ?? 'unknown',
        metadata: JSON.stringify({ total: order.total, status: order.status, deletedAt: new Date().toISOString() }),
      },
    });

    res.json({ message: 'Order deleted' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Update order status
router.patch('/:id/status', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id as string;

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

    const updatedResponse = {
      ...updated,
      subtotal: parseFloat(updated.subtotal.toString()),
      tax: parseFloat(updated.tax.toString()),
      shipping: parseFloat(updated.shipping.toString()),
      discount: parseFloat(updated.discount.toString()),
      total: parseFloat(updated.total.toString()),
      items: updated.items.map(i => ({
        ...i,
        price: parseFloat(i.price.toString()),
        cost: parseFloat(i.cost.toString()),
      })),
    };

    // Notificar al cliente del cambio de estado (si tiene email)
    if (updated.customerEmail && ['CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].includes(status)) {
      sendOrderStatusEmail(updatedResponse).catch(() => {});
    }

    res.json(updatedResponse);
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

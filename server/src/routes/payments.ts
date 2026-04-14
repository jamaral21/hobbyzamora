import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, requireRole, AuthRequest } from '../middleware/auth.js';
import { sendOrderStatusEmail } from '../lib/emailService.js';

const router = Router();

// Getnet Chile (PlacetoPay) API configuration
const GETNET_ENDPOINT = process.env.GETNET_ENDPOINT || 'https://checkout.test.getnet.cl';
const GETNET_LOGIN = process.env.GETNET_LOGIN || '';
const GETNET_TRANKEY = process.env.GETNET_TRANKEY || '';

type PaymentOrderResolution = {
  paymentStatus: 'APPROVED' | 'DECLINED' | 'PENDING';
  orderStatus: 'PROCESSING' | 'CANCELLED' | 'PENDING';
};

function resolveGetnetStatuses(rawStatus?: string): PaymentOrderResolution {
  const status = (rawStatus || '').toUpperCase();

  if (status === 'APPROVED') {
    return { paymentStatus: 'APPROVED', orderStatus: 'PROCESSING' };
  }

  if (status === 'PENDING' || status === 'PENDING_VALIDATION') {
    return { paymentStatus: 'PENDING', orderStatus: 'PENDING' };
  }

  // Any non-approved/non-pending terminal status should be treated as declined.
  return { paymentStatus: 'DECLINED', orderStatus: 'CANCELLED' };
}

async function updateOrderStatusWithStock(orderId: string, nextStatus: 'PROCESSING' | 'CANCELLED' | 'PENDING') {
  if (nextStatus === 'PENDING') return;

  if (nextStatus !== 'CANCELLED') {
    const previousOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });

    if (nextStatus === 'PROCESSING' && previousOrder?.status !== 'PROCESSING') {
      await notifyOrderProcessing(orderId);
    }

    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.status === 'CANCELLED') {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  });
}
// Generate PlacetoPay auth object
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

function isCardMethod(method: string): boolean {
  return method === 'CARD' || method === 'GETNET';
}

async function notifyOrderProcessing(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || !order.customerEmail) {
    return;
  }

  sendOrderStatusEmail({
    ...order,
    subtotal: parseFloat(order.subtotal.toString()),
    tax: parseFloat(order.tax.toString()),
    shipping: parseFloat(order.shipping.toString()),
    discount: parseFloat(order.discount.toString()),
    total: parseFloat(order.total.toString()),
    items: order.items.map((i) => ({
      ...i,
      price: parseFloat(i.price.toString()),
      cost: parseFloat(i.cost.toString()),
    })),
  }).catch(() => {});

  // Marcar reservas de preventa como PAID si el usuario tenía reservas NOTIFIED
  // para los productos incluidos en esta orden
  if (order.userId) {
    const presaleProductIds = order.items.map((i) => i.productId);
    try {
      await prisma.presaleReservation.updateMany({
        where: {
          userId: order.userId,
          productId: { in: presaleProductIds },
          status: 'NOTIFIED',
        },
        data: { status: 'PAID', paidAt: new Date() },
      });
    } catch (err) {
      console.error('[presale] Error al marcar reservas como pagadas:', err);
    }
  }
}

// Unified checkout endpoint - routes to dev auto-approve or Getnet Chile
router.post('/checkout', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const normalizedPaymentMethod =
      typeof paymentMethod === 'string' ? paymentMethod.toUpperCase() : 'CREDIT';

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (normalizedPaymentMethod === 'CASH' || normalizedPaymentMethod === 'TRANSFER') {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          orderId: order.id,
          method: normalizedPaymentMethod,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      const payment = existingPayment || await prisma.payment.create({
        data: {
          orderId: order.id,
          method: normalizedPaymentMethod,
          status: 'PENDING',
          amount: parseFloat(order.total.toString()),
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PENDING' },
      });

      return res.json({
        paymentId: payment.id,
        status: 'PENDING',
        mode: 'manual',
      });
    }

    // Determine card method label for Getnet
    const cardMethodLabel = normalizedPaymentMethod === 'DEBIT' ? 'DEBIT' : 'CREDIT';

    // Auto-approve only when NO Getnet credentials are configured
    if (!GETNET_LOGIN) {
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          method: 'CARD',
          status: 'APPROVED',
          amount: parseFloat(order.total.toString()),
          cardLast4: '0000',
          cardBrand: cardMethodLabel === 'DEBIT' ? 'VISA_DEBIT' : 'VISA',
          paidAt: new Date(),
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PROCESSING' },
      });

      await notifyOrderProcessing(order.id);

      return res.json({
        paymentId: payment.id,
        status: 'APPROVED',
        mode: 'development',
      });
    }

    // Getnet Chile (PlacetoPay) Web Checkout
    const total = Math.round(parseFloat(order.total.toString()));
    const expiration = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const apiUrl = process.env.API_URL || 'http://localhost:3001';

    const sessionData = {
      auth: generatePlacetoPayAuth(),
      payment: {
        reference: order.orderNumber,
        description: `Orden ${order.orderNumber} - HobbyZamora`,
        amount: {
          currency: 'CLP',
          total,
        },
        allowPartial: false,
      },
      expiration,
      returnUrl: `${frontendUrl}/store/order-confirmation?orderId=${order.id}`,
      notificationUrl: `${apiUrl}/api/payments/getnet/callback`,
      ipAddress: (req.ip === '::1' ? '127.0.0.1' : req.ip) || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'HobbyZamora/1.0',
      buyer: {
        name: order.customerName.split(' ')[0],
        surname: order.customerName.split(' ').slice(1).join(' ') || 'N/A',
        email: order.customerEmail,
        mobile: order.customerPhone || undefined,
        address: order.shippingStreet ? {
          street: order.shippingStreet,
          city: order.shippingCity || '',
          state: order.shippingState || '',
          postalCode: order.shippingZip || '',
          country: order.shippingCountry || 'CL',
        } : undefined,
      },
    };

    const response = await fetch(`${GETNET_ENDPOINT}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    const sessionResponse = await response.json();

    if (sessionResponse.status?.status === 'ERROR' || !sessionResponse.processUrl) {
      console.error('Getnet session error:', JSON.stringify(sessionResponse));
      return res.status(500).json({
        error: 'Failed to create payment session',
        detail: sessionResponse.status?.message || 'Unknown error',
      });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'GETNET',
        status: 'PENDING',
        amount: total,
        getnetPaymentId: String(sessionResponse.requestId),
        getnetCheckoutUrl: sessionResponse.processUrl,
      },
    });

    res.json({
      paymentId: payment.id,
      checkoutUrl: sessionResponse.processUrl,
      requestId: sessionResponse.requestId,
      status: 'PENDING',
      mode: 'getnet',
    });
  } catch (error) {
    console.error('Checkout payment error:', error);
    res.status(500).json({ error: 'Failed to process checkout' });
  }
});

// Query Getnet session status (used after user returns from payment page)
router.post('/getnet/query', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { requestId, paymentId } = req.body;

    // Find payment record
    const payment = await prisma.payment.findFirst({
      where: paymentId
        ? { id: paymentId }
        : { getnetPaymentId: String(requestId) },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Find associated order
    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
    });

    if (!isCardMethod((payment.method || '').toUpperCase()) || !payment.getnetPaymentId) {
      return res.json({
        id: payment.id,
        status: payment.status,
        orderId: payment.orderId,
        orderStatus: order?.status,
      });
    }

    // If already resolved, return current status.
    // Auto-heal old rows where payment was declined but order remained pending.

    if (payment.status !== 'PENDING') {
      if (payment.status === 'DECLINED' && order?.status === 'PENDING') {
        await updateOrderStatusWithStock(payment.orderId, 'CANCELLED');
        const refreshedOrder = await prisma.order.findUnique({ where: { id: payment.orderId } });
        return res.json({
          id: payment.id,
          status: payment.status,
          orderId: payment.orderId,
          orderStatus: refreshedOrder?.status,
        });
      }

      return res.json({
        id: payment.id,
        status: payment.status,
        orderId: payment.orderId,
        orderStatus: order?.status,
      });
    }

    // Query Getnet Chile for session status
    const queryResponse = await fetch(
      `${GETNET_ENDPOINT}/api/session/${payment.getnetPaymentId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: generatePlacetoPayAuth() }),
      }
    );

    const sessionStatus = await queryResponse.json();
    console.log('Getnet session status:', JSON.stringify(sessionStatus));

    const placetoPayStatus = sessionStatus.status?.status;
    const { paymentStatus, orderStatus } = resolveGetnetStatuses(placetoPayStatus);

    // Extract card info from Getnet response if available
    const txn = sessionStatus.payment?.[0] ?? null;
    const cardBrand = txn?.franchise || null;
    const cardLast4 = txn?.issuerName || null;

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        cardBrand,
        cardLast4,
        paidAt: paymentStatus === 'APPROVED' ? new Date() : null,
      },
    });

    // Update order status and return stock when payment gets cancelled/declined
    await updateOrderStatusWithStock(payment.orderId, orderStatus);

    res.json({
      id: payment.id,
      status: paymentStatus,
      orderId: payment.orderId,
      orderStatus,
      getnetStatus: placetoPayStatus,
    });
  } catch (error) {
    console.error('Getnet query error:', error);
    res.status(500).json({ error: 'Failed to query payment status' });
  }
});

// Getnet notification callback (webhook - PlacetoPay sends POST)
router.post('/getnet/callback', async (req, res) => {
  try {
    const { requestId, status } = req.body;
    console.log('Getnet callback received:', JSON.stringify(req.body));

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    // Find payment by Getnet request ID
    const payment = await prisma.payment.findFirst({
      where: { getnetPaymentId: String(requestId) },
    });

    if (!payment) {
      console.error('Payment not found for Getnet callback:', requestId);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Query Getnet to get authoritative status
    const queryResponse = await fetch(
      `${GETNET_ENDPOINT}/api/session/${requestId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth: generatePlacetoPayAuth() }),
      }
    );

    const sessionStatus = await queryResponse.json();

    const placetoPayStatus = sessionStatus.status?.status || status?.status;
    const { paymentStatus, orderStatus } = resolveGetnetStatuses(placetoPayStatus);

    const txn = sessionStatus.payment?.[0] ?? null;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        cardBrand: txn?.franchise || null,
        cardLast4: txn?.issuerName || null,
        paidAt: paymentStatus === 'APPROVED' ? new Date() : null,
      },
    });

    await updateOrderStatusWithStock(payment.orderId, orderStatus);

    res.json({ received: true });
  } catch (error) {
    console.error('Getnet callback error:', error);
    res.status(500).json({ error: 'Failed to process callback' });
  }
});

// Check payment status
router.get('/:paymentId/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId as string },
      include: {
        order: {
          select: { orderNumber: true, status: true },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: parseFloat(payment.amount.toString()),
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      paidAt: payment.paidAt,
      order: payment.order,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// Process manual payment (for POS cash/card)
router.post('/manual', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { orderId, method, amount, cardLast4, cardBrand } = req.body;
    const normalizedMethod = typeof method === 'string' ? method.toUpperCase() : '';
    const approvedImmediately = isCardMethod(normalizedMethod);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        method: normalizedMethod || method,
        status: approvedImmediately ? 'APPROVED' : 'PENDING',
        amount,
        cardLast4,
        cardBrand,
        paidAt: approvedImmediately ? new Date() : null,
      },
    });

    // Card-like methods keep instant processing. Manual methods remain pending.
    await prisma.order.update({
      where: { id: orderId },
      data: { status: approvedImmediately ? 'PROCESSING' : 'PENDING' },
    });

    if (approvedImmediately) {
      await notifyOrderProcessing(orderId);
    }

    res.status(201).json({
      ...payment,
      amount: parseFloat(payment.amount.toString()),
    });
  } catch (error) {
    console.error('Process manual payment error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Confirm manual payment (admin/staff)
router.patch('/:id/confirm', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const paymentId = req.params.id as string;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: { id: true, status: true },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (isCardMethod((payment.method || '').toUpperCase())) {
      return res.status(400).json({ error: 'Card payments do not require manual confirmation' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          paidAt: payment.paidAt || new Date(),
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PROCESSING' },
        select: { id: true, status: true },
      });

      return { updatedPayment, updatedOrder };
    });

    res.json({
      ...result.updatedPayment,
      amount: parseFloat(result.updatedPayment.amount.toString()),
      order: result.updatedOrder,
    });

    if (result.updatedOrder.status === 'PROCESSING') {
      await notifyOrderProcessing(payment.orderId);
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Refund payment
router.post('/:paymentId/refund', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const paymentId = req.params.paymentId as string;
    const { amount, reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Payment cannot be refunded' });
    }

    // Find associated order
    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
    });

    // For Getnet payments, call PlacetoPay reverse API
    if (payment.method === 'GETNET' && payment.getnetPaymentId) {
      const reverseData = {
        auth: generatePlacetoPayAuth(),
        internalReference: payment.getnetPaymentId,
      };

      const response = await fetch(`${GETNET_ENDPOINT}/api/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reverseData),
      });

      const reverseResponse = await response.json();

      if (reverseResponse.status?.status !== 'APPROVED') {
        console.error('Getnet reverse error:', JSON.stringify(reverseResponse));
        return res.status(500).json({
          error: 'Failed to process refund with Getnet',
          detail: reverseResponse.status?.message,
        });
      }
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { 
        status: 'REFUNDED',
        notes: order?.notes 
          ? `${order.notes}\n\nRefunded: ${reason || 'No reason provided'}`
          : `Refunded: ${reason || 'No reason provided'}`,
      },
    });

    res.json({ message: 'Payment refunded successfully' });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
});

export default router;

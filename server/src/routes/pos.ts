import { Router } from 'express';
import { prisma } from '../index.js';
import { getPresaleUnavailableReason, getRequestedPresaleQuantity } from '../lib/presaleUtils.js';
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

// Getnet POS Integrado (C2C) configuration
const GETNET_C2C_BASE_URL = process.env.GETNET_C2C_BASE_URL || 'https://api-uat-getnet-posintegrado.ione.cl';
const GETNET_C2C_CLIENT_ID = process.env.GETNET_C2C_CLIENT_ID || '';
const GETNET_C2C_CLIENT_SECRET = process.env.GETNET_C2C_CLIENT_SECRET || '';
const GETNET_C2C_TERMINAL_ID = process.env.GETNET_C2C_TERMINAL_ID || '';
const GETNET_C2C_BRANCH_ID = Number(process.env.GETNET_C2C_BRANCH_ID || '0');
const GETNET_C2C_SERIAL_NUMBER = process.env.GETNET_C2C_SERIAL_NUMBER || '';
const GETNET_C2C_WEBHOOK = process.env.GETNET_C2C_WEBHOOK || '';
const GETNET_C2C_EMPLOYEE_ID = Number(process.env.GETNET_C2C_EMPLOYEE_ID || '1');

type GetnetPosCommandResult = {
  raw: any;
  posTxId: string;
};

let getnetC2CTokenCache: { token: string; expiresAt: number } | null = null;

function isGetnetC2CConfigured(): boolean {
  return Boolean(
    GETNET_C2C_CLIENT_ID
    && GETNET_C2C_CLIENT_SECRET
    && GETNET_C2C_TERMINAL_ID
    && GETNET_C2C_BRANCH_ID > 0
    && GETNET_C2C_SERIAL_NUMBER
  );
}

function extractGetnetToken(payload: any): string {
  const candidates = [
    payload?.token,
    payload?.access_token,
    payload?.accessToken,
    payload?.data?.token,
    payload?.data?.access_token,
    payload?.data?.accessToken,
    payload?.result?.token,
  ];

  const token = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  if (!token) {
    throw new Error('No fue posible obtener token de autenticacion de Getnet C2C.');
  }

  return token;
}

async function readResponseBody(response: Response): Promise<{ parsed: any; rawText: string }> {
  const rawText = await response.text();
  let parsed: any = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  return { parsed, rawText };
}

function extractGetnetPosTxId(payload: any): string | null {
  const candidates = [
    payload?.idPosTxs,
    payload?.idpostxs,
    payload?.idPostxs,
    payload?.id,
    payload?.data?.idPosTxs,
    payload?.data?.idPostxs,
    payload?.data?.idpostxs,
    payload?.data?.id,
    payload?.data?.response?.idPosTxs,
    payload?.data?.response?.id,
    payload?.response?.idPosTxs,
    payload?.response?.id,
    payload?.response?.operationId,
    payload?.data?.response?.operationId,
    payload?.data?.operationId,
    payload?.operationId,
    payload?.transactionId,
    payload?.data?.transactionId,
  ];

  const match = candidates.find((value) => value !== undefined && value !== null && String(value).trim().length > 0);
  return match !== undefined ? String(match) : null;
}

async function getGetnetC2CToken(): Promise<string> {
  const now = Date.now();
  if (getnetC2CTokenCache && now < getnetC2CTokenCache.expiresAt) {
    return getnetC2CTokenCache.token;
  }

  const body = new URLSearchParams({
    clientId: GETNET_C2C_CLIENT_ID,
    clientSecret: GETNET_C2C_CLIENT_SECRET,
  });

  const response = await fetch(`${GETNET_C2C_BASE_URL}/api/postxs/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const { parsed: authJson, rawText } = await readResponseBody(response);

  if (!response.ok) {
    console.error('Getnet C2C auth error:', { status: response.status, body: rawText, payload: authJson });
    throw new Error(`Getnet C2C rechazo la autenticacion. Detalle: ${rawText || 'sin cuerpo'}`);
  }

  const token = extractGetnetToken(authJson);
  getnetC2CTokenCache = {
    token,
    expiresAt: now + (50 * 60 * 1000),
  };

  return token;
}

async function sendGetnetC2CCommand(path: string, payload: Record<string, unknown>): Promise<GetnetPosCommandResult> {
  const token = await getGetnetC2CToken();
  const response = await fetch(`${GETNET_C2C_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const { parsed: json, rawText } = await readResponseBody(response);

  if (!response.ok) {
    console.error('Getnet C2C command error:', { path, status: response.status, body: rawText, payload: json });
    throw new Error(`Getnet C2C rechazo el comando enviado al POS. Detalle: ${rawText || 'sin cuerpo'}`);
  }

  const posTxId = extractGetnetPosTxId(json);
  if (!posTxId) {
    console.error('Getnet C2C command without idPosTxs:', { path, body: rawText, payload: json });
    throw new Error(`Getnet C2C no devolvio id de operacion. Respuesta: ${rawText || 'sin cuerpo'}`);
  }

  return { raw: json, posTxId };
}

function parseGetnetC2CStatus(payload: any): 'APPROVED' | 'DECLINED' | 'PENDING' {
  const candidateValues = [
    payload?.status,
    payload?.txStatus,
    payload?.transactionStatus,
    payload?.result,
    payload?.message,
    payload?.description,
    payload?.response?.status,
    payload?.response?.description,
    payload?.data?.status,
    payload?.data?.message,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toUpperCase());

  const responseCodeValues = [
    payload?.responseCode,
    payload?.code,
    payload?.statusCode,
    payload?.data?.responseCode,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value));

  if (responseCodeValues.some((code) => code === '0' || code === '00')) {
    return 'APPROVED';
  }

  if (candidateValues.some((value) => value.includes('APPROV') || value.includes('APROB') || value.includes('AUTORIZ') || value.includes('SUCCESS') || value.includes('EXITOS'))) {
    return 'APPROVED';
  }

  if (candidateValues.some((value) => value.includes('DECLIN') || value.includes('RECHAZ') || value.includes('ERROR') || value.includes('CANCEL') || value.includes('DENEG'))) {
    return 'DECLINED';
  }

  return 'PENDING';
}

async function queryGetnetC2COperation(posTxId: string): Promise<any> {
  const token = await getGetnetC2CToken();
  const response = await fetch(`${GETNET_C2C_BASE_URL}/api/PosTxs/${posTxId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { parsed: json, rawText } = await readResponseBody(response);

  if (!response.ok) {
    console.error('Getnet C2C query error:', { posTxId, status: response.status, body: rawText, payload: json });
    throw new Error(`No fue posible consultar la operacion en Getnet C2C. Detalle: ${rawText || 'sin cuerpo'}`);
  }

  return json;
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

        const hasNotifiedReservation = existingReservation?.status === 'NOTIFIED';

        if (!hasNotifiedReservation) {
          return res.status(400).json({ error: `${product.name}: Solo clientes notificados pueden pagar esta preventa` });
        }

        const activeReservedTotal = await prisma.presaleReservation.aggregate({
          where: {
            productId: product.id,
            status: { in: ['PENDING', 'NOTIFIED', 'PAID'] },
          },
          _sum: { quantity: true },
        });

        const unavailableReason = getPresaleUnavailableReason(product, new Date(), activeReservedTotal._sum.quantity ?? 0);
        if (unavailableReason && !(hasNotifiedReservation && unavailableReason === 'No hay cupos disponibles para esta preventa')) {
          return res.status(400).json({ error: `${product.name}: ${unavailableReason}` });
        }

        const requestedPresaleQuantity = getRequestedPresaleQuantity(items, product.id);
        if (product.presaleMaxQty && requestedPresaleQuantity > product.presaleMaxQty) {
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

    // --- Getnet C2C card payment: create pending order and send command to POS terminal ---
    if (paymentMethod === 'CARD' && isGetnetC2CConfigured()) {
      const orderNumber = generatePOSOrderNumber();

      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: customerId || null,
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
              method: 'GETNET_POS',
              status: 'PENDING',
              amount: total,
            },
          },
        },
        include: { items: true, payments: true },
      });

      const salePayload: Record<string, unknown> = {
        idTerminal: GETNET_C2C_TERMINAL_ID,
        idSucursal: GETNET_C2C_BRANCH_ID,
        serialNumber: GETNET_C2C_SERIAL_NUMBER,
        command: 100,
        amount: Math.round(total),
        ticketNumber: orderNumber,
        printOnPos: false,
        saleType: 0,
        employeeId: GETNET_C2C_EMPLOYEE_ID,
        customId: order.id,
      };

      if (GETNET_C2C_WEBHOOK) {
        salePayload.webhook = GETNET_C2C_WEBHOOK;
      }

      const saleCommand = await sendGetnetC2CCommand('/api/postxs/sale', salePayload);

      await prisma.payment.update({
        where: { id: order.payments[0].id },
        data: {
          getnetPaymentId: saleCommand.posTxId,
          getnetCheckoutUrl: null,
        },
      });

      // Deduct stock for non-presale items. Las reservas de preventa se marcan como
      // PAID recien cuando el terminal confirme la aprobacion (ver /pos/getnet/status),
      // para no dejarlas bloqueadas si el pago con tarjeta termina siendo rechazado.
      for (const item of orderItems) {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { isPresale: true } });
        if (!product?.isPresale) {
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
        getnetOperationId: saleCommand.posTxId,
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
    const message = error instanceof Error ? error.message : 'Failed to create sale';
    const statusCode = message.includes('Getnet C2C') ? 502 : 500;
    res.status(statusCode).json({ error: message });
  }
});

router.post('/getnet/status', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { paymentId } = req.body as { paymentId?: string };

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });

    if (!payment || payment.order.source !== 'POS') {
      return res.status(404).json({ error: 'POS payment not found' });
    }

    if (payment.method !== 'GETNET_POS' || !payment.getnetPaymentId) {
      return res.status(400).json({ error: 'Payment is not a Getnet POS operation' });
    }

    if (payment.status === 'APPROVED') {
      return res.json({
        id: payment.id,
        status: payment.status,
        orderId: payment.orderId,
        orderStatus: payment.order.status,
      });
    }

    const operation = await queryGetnetC2COperation(payment.getnetPaymentId);
    const normalizedStatus = parseGetnetC2CStatus(operation);

    if (normalizedStatus === 'APPROVED') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'APPROVED',
            paidAt: payment.paidAt || new Date(),
          },
        });

        if (payment.order.status !== 'DELIVERED') {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'DELIVERED' },
          });
        }

        if (payment.order.userId) {
          const productIds = payment.order.items.map((i) => i.productId);
          await tx.presaleReservation.updateMany({
            where: { userId: payment.order.userId, productId: { in: productIds }, status: 'NOTIFIED' },
            data: { status: 'PAID', paidAt: new Date() },
          });
        }
      });

      return res.json({
        id: payment.id,
        status: 'APPROVED',
        orderId: payment.orderId,
        orderStatus: 'DELIVERED',
        getnet: operation,
      });
    }

    if (normalizedStatus === 'DECLINED') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'DECLINED' },
        });

        if (payment.order.status !== 'CANCELLED') {
          for (const item of payment.order.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
              select: { isPresale: true },
            });

            if (!product?.isPresale) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }

          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'CANCELLED' },
          });
        }
      });

      return res.json({
        id: payment.id,
        status: 'DECLINED',
        orderId: payment.orderId,
        orderStatus: 'CANCELLED',
        getnet: operation,
      });
    }

    return res.json({
      id: payment.id,
      status: 'PENDING',
      orderId: payment.orderId,
      orderStatus: payment.order.status,
      getnet: operation,
    });
  } catch (error) {
    console.error('Getnet POS status error:', error);
    res.status(500).json({ error: 'No se pudo verificar estado de pago en terminal Getnet' });
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

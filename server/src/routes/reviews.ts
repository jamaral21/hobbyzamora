import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function firstImage(images: unknown): string | null {
  if (Array.isArray(images)) {
    return images.find((image): image is string => typeof image === 'string') || null;
  }

  if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.find((image): image is string => typeof image === 'string') || null;
      }
    } catch {
      return images;
    }

    return images;
  }

  return null;
}

function serializeReview(review: any) {
  return {
    ...review,
    productName: review.product?.name,
    productImage: firstImage(review.product?.images),
    orderNumber: review.order?.orderNumber,
  };
}

router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const requestedStatus = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
    const parsedLimit = parseInt(String(req.query.limit || '6'), 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 6;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'STAFF';
    const status = isAdmin
      ? (requestedStatus && requestedStatus !== 'ALL' ? requestedStatus : undefined)
      : 'APPROVED';

    const reviews = await prisma.review.findMany({
      where: status ? { status } : undefined,
      include: {
        product: { select: { name: true, images: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(reviews.map(serializeReview));
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

router.get('/admin/list', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const requestedStatus = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
    const searchWhere = search ? {
      OR: [
        { customerName: { contains: search } },
        { product: { name: { contains: search } } },
        { order: { orderNumber: { contains: search } } },
      ],
    } : {};
    const where: any = {
      ...searchWhere,
      ...(requestedStatus && requestedStatus !== 'ALL' ? { status: requestedStatus } : {}),
    };

    const [reviews, total, statusCounts] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { product: { select: { name: true, images: true } }, order: { select: { orderNumber: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({ by: ['status'], where: searchWhere, _count: { status: true } }),
    ]);
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const row of statusCounts) counts[row.status as keyof typeof counts] = row._count.status;

    return res.json({
      reviews: reviews.map(serializeReview),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      statusCounts: counts,
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    return res.status(500).json({ error: 'Failed to get admin reviews' });
  }
});

router.get('/token/:token', async (req, res) => {
  try {
    const token = req.params.token as string;
    const order = await prisma.order.findFirst({
      where: { reviewToken: token },
      include: {
        items: true,
        reviews: { select: { productId: true } },
      },
    });

    if (!order || order.status !== 'DELIVERED') {
      return res.status(404).json({ error: 'Review token not found' });
    }

    const reviewedProductIds = new Set(order.reviews.map((review) => review.productId));
    const uniqueItems = order.items.filter((item, index, items) =>
      items.findIndex((candidate) => candidate.productId === item.productId) === index
    );

    res.json({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      items: uniqueItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        variantName: item.variantName,
        alreadyReviewed: reviewedProductIds.has(item.productId),
      })),
    });
  } catch (error) {
    console.error('Get review token error:', error);
    res.status(500).json({ error: 'Failed to get review token' });
  }
});

router.post('/', async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    const photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : '';

    if (!token || !productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid review payload' });
    }

    const order = await prisma.order.findFirst({
      where: { reviewToken: token },
      include: { items: true },
    });

    if (!order || order.status !== 'DELIVERED') {
      return res.status(404).json({ error: 'Review token not found' });
    }

    const orderedProduct = order.items.find((item) => item.productId === productId);
    if (!orderedProduct) {
      return res.status(400).json({ error: 'Product does not belong to this order' });
    }

    const existingReview = await prisma.review.findUnique({
      where: {
        orderId_productId: {
          orderId: order.id,
          productId,
        },
      },
    });

    if (existingReview) {
      return res.status(409).json({ error: 'Review already submitted for this product' });
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        productId,
        customerName: order.customerName,
        rating,
        comment: comment || null,
        photoUrl: photoUrl || null,
      },
      include: {
        product: { select: { name: true, images: true } },
        order: { select: { orderNumber: true } },
      },
    });

    res.status(201).json(serializeReview(review));
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.patch('/:id/status', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : '';
    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await prisma.review.update({
      where: { id: req.params.id as string },
      data: { status },
      include: {
        product: { select: { name: true, images: true } },
        order: { select: { orderNumber: true } },
      },
    });

    res.json(serializeReview(review));
  } catch (error: any) {
    console.error('Update review status error:', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

export default router;
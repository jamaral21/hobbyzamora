import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const parseImages = (images: string): string[] => {
  try {
    return JSON.parse(images);
  } catch {
    return images ? [images] : [];
  }
};

// GET /api/wishlist — get current user's wishlist
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.wishlist.findMany({
      where: { userId: req.user!.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            images: true,
            category: true,
            stock: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          images: parseImages(item.product.images),
          price: parseFloat(item.product.price.toString()),
        },
      }))
    );
  } catch (error) {
    console.error('Wishlist get error:', error);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
});

// POST /api/wishlist/:productId — add product to wishlist
router.post('/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    const productId = req.params.productId as string;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const item = await prisma.wishlist.upsert({
      where: { userId_productId: { userId: req.user!.id, productId } },
      create: { userId: req.user!.id, productId },
      update: {},
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Wishlist add error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /api/wishlist/:productId — remove product from wishlist
router.delete('/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    const productId = req.params.productId as string;

    await prisma.wishlist.deleteMany({
      where: { userId: req.user!.id, productId },
    });

    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Wishlist remove error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// GET /api/wishlist/check/:productId — check if product is in wishlist
router.get('/check/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    const productId = req.params.productId as string;

    const item = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: req.user!.id, productId } },
    });

    res.json({ isFavorite: !!item });
  } catch (error) {
    console.error('Wishlist check error:', error);
    res.status(500).json({ error: 'Failed to check wishlist' });
  }
});

export default router;

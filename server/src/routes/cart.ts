import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get cart
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user!.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventoryBatches: {
                  where: { remaining: { gt: 0 } },
                  select: { remaining: true },
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user!.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  inventoryBatches: {
                    where: { remaining: { gt: 0 } },
                    select: { remaining: true },
                  },
                },
              },
              variant: true,
            },
          },
        },
      });
    }

    const items = cart.items.map(item => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        price: parseFloat(item.product.price.toString()),
        images: item.product.images,
        stock: item.product.inventoryBatches.reduce((sum, b) => sum + b.remaining, 0),
      },
      variant: item.variant ? {
        id: item.variant.id,
        name: item.variant.name,
        options: item.variant.options,
        price: item.variant.price ? parseFloat(item.variant.price.toString()) : null,
      } : null,
    }));

    const subtotal = items.reduce((sum, item) => {
      const price = item.variant?.price || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    res.json({
      id: cart.id,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

// Add item to cart
router.post('/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: req.user!.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user!.id },
      });
    }

    // Check if product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventoryBatches: {
          where: { remaining: { gt: 0 } },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const stock = product.inventoryBatches.reduce((sum, b) => sum + b.remaining, 0);
    if (stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    let cartItem;
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > stock) {
        return res.status(400).json({ error: 'Insufficient stock for requested quantity' });
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: { product: true, variant: true },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        },
        include: { product: true, variant: true },
      });
    }

    res.status(201).json({
      id: cartItem.id,
      productId: cartItem.productId,
      variantId: cartItem.variantId,
      quantity: cartItem.quantity,
      product: {
        id: cartItem.product.id,
        name: cartItem.product.name,
        price: parseFloat(cartItem.product.price.toString()),
        images: cartItem.product.images,
      },
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Update cart item quantity
router.patch('/items/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const itemId = req.params.itemId as string;
    const { quantity } = req.body;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: {
          include: {
            inventoryBatches: {
              where: { remaining: { gt: 0 } },
            },
          },
        },
      },
    });

    if (!item || item.cart.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return res.json({ message: 'Item removed from cart' });
    }

    const stock = item.product.inventoryBatches.reduce((sum, b) => sum + b.remaining, 0);
    if (quantity > stock) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true, variant: true },
    });

    res.json({
      id: updated.id,
      productId: updated.productId,
      variantId: updated.variantId,
      quantity: updated.quantity,
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// Remove item from cart
router.delete('/items/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const itemId = req.params.itemId as string;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

// Clear cart
router.delete('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user!.id },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;

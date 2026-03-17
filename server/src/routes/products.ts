import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper to parse JSON fields stored as strings (for SQLite compatibility)
const parseImages = (images: string): string[] => {
  try {
    return JSON.parse(images);
  } catch {
    return images ? [images] : [];
  }
};

const parseOptions = (options: string): string[] => {
  try {
    return JSON.parse(options);
  } catch {
    return options ? [options] : [];
  }
};

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      status, 
      search, 
      presale,
      minPrice,
      maxPrice,
      page = '1',
      limit = '50',
    } = req.query;

    const where: any = {};

    if (category) {
      where.category = category as string;
    }

    if (status) {
      where.status = status as string;
    } else {
      // By default, only show active products for public
      where.status = 'ACTIVE';
    }

    if (presale === 'true') {
      where.isPresale = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { sku: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: true,
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    // Parse JSON fields
    const productsWithStock = products.map(product => ({
      ...product,
      images: parseImages(product.images),
      price: parseFloat(product.price.toString()),
      cost: parseFloat(product.cost.toString()),
      stock: product.stock,
      variants: product.variants.map(v => ({
        ...v,
        options: parseOptions(v.options),
        price: v.price ? parseFloat(v.price.toString()) : null,
      })),
    }));

    res.json({
      products: productsWithStock,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      ...product,
      images: parseImages(product.images),
      price: parseFloat(product.price.toString()),
      cost: parseFloat(product.cost.toString()),
      stock: product.stock,
      variants: product.variants.map(v => ({
        ...v,
        options: parseOptions(v.options),
        price: v.price ? parseFloat(v.price.toString()) : null,
      })),
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create product (admin only)
router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { 
      sku, 
      name, 
      description, 
      category, 
      price, 
      cost, 
      images, 
      status,
      isPresale,
      presaleMaxQty,
      presaleAvailQty,
      presaleEndDate,
      variants,
      initialStock,
    } = req.body;

    // Check SKU uniqueness
    const existingBySku = await prisma.product.findUnique({ where: { sku } });
    if (existingBySku) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        category,
        price,
        cost,
        stock: initialStock || 0,
        images: JSON.stringify(images || []),
        status: status || 'ACTIVE',
        isPresale: isPresale || false,
        presaleMaxQty,
        presaleAvailQty,
        presaleEndDate: presaleEndDate ? new Date(presaleEndDate) : null,
        variants: variants ? {
          create: variants.map((v: any) => ({
            name: v.name,
            options: JSON.stringify(v.options || []),
            sku: v.sku,
            price: v.price,
            stock: v.stock || 0,
          })),
        } : undefined,
      },
      include: { variants: true },
    });

    res.status(201).json({
      ...product,
      price: parseFloat(product.price.toString()),
      cost: parseFloat(product.cost.toString()),
      stock: product.stock,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.patch('/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { 
      name, 
      description, 
      category, 
      price, 
      cost, 
      stock,
      images, 
      status,
      isPresale,
      presaleMaxQty,
      presaleAvailQty,
      presaleEndDate,
    } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        category,
        price,
        cost,
        stock,
        images: images !== undefined ? JSON.stringify(images) : undefined,
        status,
        isPresale,
        presaleMaxQty,
        presaleAvailQty,
        presaleEndDate: presaleEndDate ? new Date(presaleEndDate) : null,
      },
      include: {
        variants: true,
      },
    });

    res.json({
      ...product,
      images: parseImages(product.images),
      price: parseFloat(product.price.toString()),
      cost: parseFloat(product.cost.toString()),
      stock: product.stock,
      variants: product.variants.map((v: any) => ({
        ...v,
        options: parseOptions(v.options),
        price: v.price ? parseFloat(v.price.toString()) : null,
      })),
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id as string },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Bulk import products from CSV
router.post('/import', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { products: rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    if (rows.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 products per import' });
    }

    const results: { created: number; skipped: number; errors: string[] } = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // +2 for header row + 0-index

      // Validate required fields
      if (!row.sku || !row.name || !row.category || row.price == null || row.cost == null) {
        results.errors.push(`Línea ${lineNum}: faltan campos requeridos (sku, name, category, price, cost)`);
        results.skipped++;
        continue;
      }

      const price = parseFloat(row.price);
      const cost = parseFloat(row.cost);
      const initialStock = parseInt(row.stock) || 0;

      if (isNaN(price) || isNaN(cost) || price < 0 || cost < 0) {
        results.errors.push(`Línea ${lineNum} (${row.sku}): precio o costo inválido`);
        results.skipped++;
        continue;
      }

      // Check SKU uniqueness
      const existing = await prisma.product.findUnique({ where: { sku: row.sku } });
      if (existing) {
        results.errors.push(`Línea ${lineNum}: SKU "${row.sku}" ya existe`);
        results.skipped++;
        continue;
      }

      try {
        const product = await prisma.product.create({
          data: {
            sku: row.sku,
            name: row.name,
            description: row.description || null,
            category: row.category,
            price,
            cost,
            stock: initialStock,
            images: JSON.stringify(row.images ? row.images.split('|').map((s: string) => s.trim()) : []),
            status: (row.status || 'ACTIVE').toUpperCase(),
          },
        });

        results.created++;
      } catch (err) {
        results.errors.push(`Línea ${lineNum} (${row.sku}): error al crear producto`);
        results.skipped++;
      }
    }

    res.status(201).json(results);
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category'],
    });

    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

export default router;

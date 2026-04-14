import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resolveUploadsBaseDir = () => {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  const sharedUploads = '/var/www/hobbyzamora/shared/uploads';
  if (fs.existsSync(sharedUploads)) {
    return sharedUploads;
  }

  return path.resolve(process.cwd(), 'uploads');
};

const uploadsBaseDir = resolveUploadsBaseDir();
const productUploadsDir = path.join(uploadsBaseDir, 'products');
const HIDDEN_PRODUCTS_ALLOWED_EMAIL = 'admin@hobbyzamora.com';

// Configure multer for ZIP uploads — disk storage, no size limit
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, cb) => {
      cb(null, `hz-upload-${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .zip'));
    }
  },
});

const singleImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(productUploadsDir, { recursive: true });
      cb(null, productUploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF'));
    }
  },
});

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
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
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
    const canSeeHiddenProducts = req.user?.email?.toLowerCase() === HIDDEN_PRODUCTS_ALLOWED_EMAIL;

    if (category) {
      where.category = category as string;
    }

    if (status && status !== 'ALL') {
      const requestedStatus = status as string;

      if (requestedStatus === 'HIDDEN' && !canSeeHiddenProducts) {
        where.status = 'ACTIVE';
      } else {
        where.status = requestedStatus;
      }
    } else {
      // Por defecto, solo productos activos.
      // El usuario permitido puede ver además los HIDDEN en storefront.
      where.status = canSeeHiddenProducts
        ? { in: ['ACTIVE', 'HIDDEN'] }
        : 'ACTIVE';
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

// Get single product (public — excluye HIDDEN/ARCHIVED, salvo email autorizado)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
      include: { variants: true },
    });

    const canSeeHiddenProducts = req.user?.email?.toLowerCase() === HIDDEN_PRODUCTS_ALLOWED_EMAIL;

    if (
      !product ||
      product.status === 'ARCHIVED' ||
      (product.status === 'HIDDEN' && !canSeeHiddenProducts)
    ) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const p = product as typeof product & { variants: any[] };

    res.json({
      ...p,
      images: parseImages(p.images),
      price: parseFloat(p.price.toString()),
      cost: parseFloat(p.cost.toString()),
      stock: p.stock,
      variants: p.variants.map((v: any) => ({
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

// Get single product for admin (incluye cualquier estado)
router.get('/admin-detail/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
      include: { variants: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const p = product as typeof product & { variants: any[] };
    res.json({
      ...p,
      images: parseImages(p.images),
      price: parseFloat(p.price.toString()),
      cost: parseFloat(p.cost.toString()),
      stock: p.stock,
      variants: p.variants.map((v: any) => ({
        ...v,
        options: parseOptions(v.options),
        price: v.price ? parseFloat(v.price.toString()) : null,
      })),
    });
  } catch (error) {
    console.error('Get product (admin) error:', error);
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
      ean,
      barcode,
      isPresale,
      presaleMaxQty,
      presaleAvailQty,
      presaleEndDate,
      variants,
      initialStock,
    } = req.body;

    const parsedEan: string | null = ean !== undefined
      ? String(ean)
      : (barcode !== undefined ? String(barcode) : null);

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
        ean: parsedEan,
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
      ean,
      barcode,
      isPresale,
      presaleMaxQty,
      presaleAvailQty,
      presaleEndDate,
    } = req.body;

    const parsedEan: string | undefined = ean !== undefined
      ? String(ean)
      : (barcode !== undefined ? String(barcode) : undefined);

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
        ean: parsedEan,
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
    const productId = req.params.id as string;

    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const orderItemsCount = await prisma.orderItem.count({
      where: { productId },
    });

    if (orderItemsCount > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          status: 'ARCHIVED',
          stock: 0,
        },
      });

      return res.json({
        message: 'Product is referenced by orders and was archived instead of deleted',
        archived: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId } });
      await tx.product.delete({ where: { id: productId } });
    });

    res.json({ message: 'Product deleted successfully', archived: false });
  } catch (error) {
    console.error('Delete product error:', error);

    if ((error as any)?.code === 'P2003') {
      return res.status(409).json({
        error: 'Cannot delete product because it is still referenced by related records',
      });
    }

    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Bulk import products from CSV
router.post('/import', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { products: rows } = req.body;
    const forcePresale = req.query.presale === 'true';

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No products provided' });
    }

    if (rows.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 products per import' });
    }

    const results: { created: number; updated: number; skipped: number; errors: string[] } = {
      created: 0,
      updated: 0,
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
      const stock = parseInt(row.stock) || 0;

      if (isNaN(price) || isNaN(cost) || price < 0 || cost < 0) {
        results.errors.push(`Línea ${lineNum} (${row.sku}): precio o costo inválido`);
        results.skipped++;
        continue;
      }

      const isPresale = forcePresale;
      const presaleMaxQty = row.presaleMaxQty ? parseInt(row.presaleMaxQty) : null;
      const presaleAvailQty = row.presaleAvailQty ? parseInt(row.presaleAvailQty) : null;
      const presaleEndDate = row.presaleEndDate ? new Date(row.presaleEndDate) : null;

      const productData = {
        name: row.name,
        description: row.description || null,
        category: row.category,
        price,
        cost,
        stock,
        ean: (row.EAN || row.ean || row.barcode) ? String(row.EAN || row.ean || row.barcode) : null,
        images: JSON.stringify(row.images ? row.images.split('|').map((s: string) => s.trim()) : []),
        status: ['ACTIVE', 'ARCHIVED'].includes((row.status || 'ACTIVE').toUpperCase())
          ? (row.status || 'ACTIVE').toUpperCase()
          : 'ACTIVE', // HIDDEN no se puede importar desde CSV, solo se asigna manualmente
        isPresale,
        presaleMaxQty,
        presaleAvailQty,
        presaleEndDate,
      };

      try {
        const existing = await prisma.product.findUnique({ where: { sku: row.sku } });
        if (existing) {
          await prisma.product.update({
            where: { sku: row.sku },
            data: productData,
          });
          results.updated++;
        } else {
          await prisma.product.create({
            data: { sku: row.sku, ...productData },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Línea ${lineNum} (${row.sku}): error al procesar producto`);
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

router.post('/upload-image', authenticate, requireRole('ADMIN', 'STAFF'), singleImageUpload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió imagen' });
    }

    return res.json({
      url: `/uploads/products/${req.file.filename}`,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// Upload ZIP with product images — chunked upload support
// 1. POST /upload-images/init   → start session
// 2. POST /upload-images/chunk  → send each 20MB chunk
// 3. POST /upload-images/complete → process assembled ZIP
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const activeUploads = new Map<string, { filePath: string; totalChunks: number; received: Set<number> }>();

// Small multer for chunks (2MB max per chunk)
const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.post('/upload-images/init', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { totalChunks, filename } = req.body;
    if (!totalChunks || totalChunks < 1) {
      return res.status(400).json({ error: 'totalChunks requerido' });
    }
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filePath = path.join(os.tmpdir(), `hz-upload-${uploadId}.zip`);
    // Create empty file
    fs.writeFileSync(filePath, Buffer.alloc(0));
    activeUploads.set(uploadId, { filePath, totalChunks, received: new Set() });
    // Auto-cleanup after 30 minutes
    setTimeout(() => {
      const session = activeUploads.get(uploadId);
      if (session) {
        fs.unlink(session.filePath, () => {});
        activeUploads.delete(uploadId);
      }
    }, 30 * 60 * 1000);
    res.json({ uploadId });
  } catch (error) {
    console.error('Upload init error:', error);
    res.status(500).json({ error: 'Error al iniciar upload' });
  }
});

router.post('/upload-images/chunk', authenticate, requireRole('ADMIN', 'STAFF'), chunkUpload.single('chunk'), async (req: AuthRequest, res) => {
  try {
    const uploadId = req.headers['x-upload-id'] as string;
    const chunkIndex = parseInt(req.headers['x-chunk-index'] as string);
    const session = activeUploads.get(uploadId);
    if (!session) {
      return res.status(404).json({ error: 'Sesión de upload no encontrada' });
    }
    if (isNaN(chunkIndex) || chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      return res.status(400).json({ error: 'Índice de chunk inválido' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió chunk' });
    }
    // Append chunk at correct position — for simplicity, write sequentially
    const fd = fs.openSync(session.filePath, 'a');
    fs.writeSync(fd, req.file.buffer);
    fs.closeSync(fd);
    session.received.add(chunkIndex);
    res.json({ received: session.received.size, total: session.totalChunks });
  } catch (error) {
    console.error('Upload chunk error:', error);
    res.status(500).json({ error: 'Error al recibir chunk' });
  }
});

router.post('/upload-images/complete', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  const { uploadId } = req.body;
  const session = activeUploads.get(uploadId);
  if (!session) {
    return res.status(404).json({ error: 'Sesión de upload no encontrada' });
  }
  if (session.received.size !== session.totalChunks) {
    return res.status(400).json({ error: `Faltan chunks: ${session.received.size}/${session.totalChunks}` });
  }
  try {
    fs.mkdirSync(productUploadsDir, { recursive: true });

    const zip = new AdmZip(session.filePath);
    const entries = zip.getEntries();

    const extracted: string[] = [];
    const skipped: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const filename = path.basename(entry.entryName);
      if (filename.startsWith('.') || entry.entryName.includes('__MACOSX/')) continue;

      const ext = path.extname(filename).toLowerCase();
      if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        skipped.push(filename);
        continue;
      }

      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      fs.writeFileSync(path.join(productUploadsDir, safeName), entry.getData());
      extracted.push(safeName);
    }

    // Update products
    let updated = 0;
    if (extracted.length > 0) {
      const allProducts = await prisma.product.findMany({ select: { id: true, images: true } });
      for (const product of allProducts) {
        let images: string[];
        try { images = JSON.parse(product.images); } catch { images = product.images ? [product.images] : []; }

        let changed = false;
        const updatedImages = images.map((img: string) => {
          const basename = img.split('/').pop() || img;
          const safeBasename = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
          if (extracted.includes(safeBasename) && !img.startsWith('/uploads/')) {
            changed = true;
            return `/uploads/products/${safeBasename}`;
          }
          return img;
        });

        if (changed) {
          await prisma.product.update({
            where: { id: product.id },
            data: { images: JSON.stringify(updatedImages) },
          });
          updated++;
        }
      }
    }

    res.json({ extracted: extracted.length, skipped: skipped.length, productsUpdated: updated, files: extracted });
  } catch (error) {
    console.error('Upload complete error:', error);
    res.status(500).json({ error: 'Error al procesar el archivo ZIP' });
  } finally {
    fs.unlink(session.filePath, () => {});
    activeUploads.delete(uploadId);
  }
});

// Keep legacy single-request endpoint for small files
router.post('/upload-images', authenticate, requireRole('ADMIN', 'STAFF'), upload.single('zip'), async (req: AuthRequest, res) => {
  let tmpPath: string | null = null;
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó archivo ZIP' });
    }
    tmpPath = file.path;

    fs.mkdirSync(productUploadsDir, { recursive: true });

    const zip = new AdmZip(tmpPath);
    const entries = zip.getEntries();

    const extracted: string[] = [];
    const skipped: string[] = [];
    const debugEntries: string[] = [];

    for (const entry of entries) {
      debugEntries.push(entry.entryName);

      // Skip directories
      if (entry.isDirectory) continue;

      // Skip macOS metadata and hidden files (check basename, not full path)
      const filename = path.basename(entry.entryName);
      if (filename.startsWith('.') || filename.startsWith('__MACOSX') || entry.entryName.includes('__MACOSX/')) {
        continue;
      }

      const ext = path.extname(filename).toLowerCase();

      if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
        skipped.push(filename);
        continue;
      }

      // Sanitize filename — only allow alphanumeric, dash, underscore, dot
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const destPath = path.join(productUploadsDir, safeName);

      fs.writeFileSync(destPath, entry.getData());
      extracted.push(safeName);
    }

    // Update products: replace bare filenames with served URLs
    let updated = 0;
    if (extracted.length > 0) {
      const allProducts = await prisma.product.findMany({ select: { id: true, images: true } });

      for (const product of allProducts) {
        let images: string[];
        try {
          images = JSON.parse(product.images);
        } catch {
          images = product.images ? [product.images] : [];
        }

        let changed = false;
        const updatedImages = images.map((img: string) => {
          const basename = img.split('/').pop() || img;
          // Sanitize the same way as extracted files
          const safeBasename = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
          if (extracted.includes(safeBasename) && !img.startsWith('/uploads/')) {
            changed = true;
            return `/uploads/products/${safeBasename}`;
          }
          return img;
        });

        if (changed) {
          await prisma.product.update({
            where: { id: product.id },
            data: { images: JSON.stringify(updatedImages) },
          });
          updated++;
        }
      }
    }

    res.json({
      extracted: extracted.length,
      skipped: skipped.length,
      productsUpdated: updated,
      files: extracted,
      debug: { zipEntries: debugEntries, skippedFiles: skipped },
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ error: 'Error al procesar el archivo ZIP' });
  } finally {
    // Clean up temp file
    if (tmpPath) {
      fs.unlink(tmpPath, () => {});
    }
  }
});

export default router;

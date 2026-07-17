import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { JWT } from 'google-auth-library';
import sharp from 'sharp';
import { prisma } from '../index.js';
import { syncHistoricalCostForProduct } from '../lib/costSync.js';
import { generateUniqueSku, getSkuPrefix, isOfficialStoreCategory, normalizeStoreCategory } from '../lib/sku.js';
import { normalizeProductImportRow } from '../lib/productImport.js';
import { matchesProductImageName, sanitizeProductImageName } from '../lib/productImageMatching.js';
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
const productVariantsDir = path.join(productUploadsDir, 'variants');
const HIDDEN_PRODUCTS_ALLOWED_EMAIL = 'admin@hobbyzamora.com';

const PRODUCT_IMAGE_VARIANTS = [
  { key: 'thumb', width: 400, quality: 74 },
  { key: 'card', width: 800, quality: 78 },
  { key: 'detail', width: 1200, quality: 82 },
] as const;

type ProductImageVariantKey = typeof PRODUCT_IMAGE_VARIANTS[number]['key'];

function getVariantFilename(filename: string, variant: ProductImageVariantKey) {
  const parsed = path.parse(filename);
  return `${parsed.name}__${variant}.webp`;
}

async function generateProductImageVariants(filename: string) {
  const sourcePath = path.join(productUploadsDir, filename);
  if (!fs.existsSync(sourcePath)) return;

  const ext = path.extname(filename).toLowerCase();
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  if (!allowed.has(ext)) return;

  fs.mkdirSync(productVariantsDir, { recursive: true });

  for (const variant of PRODUCT_IMAGE_VARIANTS) {
    const outPath = path.join(productVariantsDir, getVariantFilename(filename, variant.key));
    await sharp(sourcePath)
      .rotate()
      .resize({
        width: variant.width,
        height: variant.width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: variant.quality })
      .toFile(outPath);
  }
}

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

const DRIVE_IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const GOOGLE_DRIVE_ERROR_DETAIL_LIMIT = 300;

class GoogleDriveDownloadError extends Error {
  status: number;
  fileId: string;
  detail: string;

  constructor(fileId: string, status: number, detail: string) {
    super(`Descarga fallida (${status})`);
    this.name = 'GoogleDriveDownloadError';
    this.status = status;
    this.fileId = fileId;
    this.detail = detail;
  }
}

function compactGoogleDriveErrorDetail(detail: string) {
  const compact = String(detail || '').replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.slice(0, GOOGLE_DRIVE_ERROR_DETAIL_LIMIT);
}

// ─── Drive auth helpers ────────────────────────────────────────────────────────

type DriveCredentials =
  | { type: 'serviceAccount'; accessToken: string }
  | { type: 'apiKey'; apiKey: string };

async function getDriveCredentials(): Promise<DriveCredentials> {
  const saJson = String(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || '').trim();
  if (saJson) {
    let keyFile: { client_email?: string; private_key?: string };
    try {
      keyFile = JSON.parse(saJson);
    } catch {
      throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON tiene formato JSON inválido');
    }
    if (!keyFile.client_email || !keyFile.private_key) {
      throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON no tiene client_email o private_key');
    }
    const jwtClient = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const tokenResponse = await jwtClient.getAccessToken();
    const accessToken = tokenResponse.token;
    if (!accessToken) throw new Error('No se pudo obtener access token del service account');
    return { type: 'serviceAccount', accessToken };
  }

  const apiKey = String(process.env.GOOGLE_DRIVE_API_KEY || '').trim();
  if (apiKey) {
    return { type: 'apiKey', apiKey };
  }

  throw new Error('Configura GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON (recomendado) o GOOGLE_DRIVE_API_KEY en el servidor');
}

function buildDriveRequestHeaders(
  creds: DriveCredentials,
  resourceKeys?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (creds.type === 'serviceAccount') {
    headers['Authorization'] = `Bearer ${creds.accessToken}`;
  }
  if (resourceKeys) {
    headers['X-Goog-Drive-Resource-Keys'] = resourceKeys;
  }
  return headers;
}

function buildDriveQueryParams(
  creds: DriveCredentials,
  extra: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams(extra);
  if (creds.type === 'apiKey') {
    params.set('key', creds.apiKey);
  }
  return params;
}

function extractGoogleDriveFolderReference(input: string) {
  const value = String(input || '').trim();
  if (!value) return null;

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return { folderId: value, resourceKey: '' };
  }

  try {
    const url = new URL(value);
    const resourceKey = String(url.searchParams.get('resourcekey') || url.searchParams.get('resourceKey') || '').trim();
    const folderMatch = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch?.[1]) return { folderId: folderMatch[1], resourceKey };

    const id = url.searchParams.get('id');
    if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return { folderId: id, resourceKey };
  } catch {
    return null;
  }

  return null;
}

function normalizeImportedImageReferences(images: string[]) {
  return images
    .map((img) => String(img || '').trim())
    .filter(Boolean)
    .map((img) => {
      if (/^https?:\/\//i.test(img) || img.startsWith('/')) {
        return img;
      }

      const normalized = sanitizeProductImageName(img);
      const localPath = path.join(productUploadsDir, normalized);
      if (fs.existsSync(localPath)) {
        return `/uploads/products/${normalized}`;
      }

      return img;
    });
}

async function attachExtractedImagesToProducts(extracted: string[]) {
  if (extracted.length === 0) return 0;

  const allProducts = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, images: true },
  });

  const matchedFiles = new Set<string>();
  let updated = 0;

  for (const product of allProducts) {
    const productImages = [] as string[];
    let images: string[];
    try {
      images = JSON.parse(product.images);
    } catch {
      images = product.images ? [product.images] : [];
    }
    images = Array.isArray(images)
      ? images.map((img) => String(img || '').trim()).filter(Boolean)
      : [];

    for (const extractedFile of extracted) {
      const shouldMatch = matchesProductImageName(extractedFile, product);
      if (!shouldMatch) continue;

      if (!matchedFiles.has(extractedFile)) {
        matchedFiles.add(extractedFile);
        productImages.push(`/uploads/products/${extractedFile}`);
      }
    }

    if (productImages.length === 0) continue;

    const updatedImages = [...images];
    for (const newImage of productImages) {
      if (!updatedImages.includes(newImage)) {
        updatedImages.push(newImage);
      }
    }

    if (updatedImages.length !== images.length) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: JSON.stringify(updatedImages) },
      });
      updated++;
    }
  }

  return updated;
}

async function listGoogleDriveFolderImages(
  folderId: string,
  creds: DriveCredentials,
  folderResourceKey?: string,
) {
  const files: Array<{ id: string; name: string; mimeType: string; resourceKey?: string }> = [];
  const stack: string[] = [folderId];
  const visited = new Set<string>();
  const folderResourceKeysHeader = folderResourceKey
    ? `${folderId}/${folderResourceKey}`
    : undefined;

  // Validate folder access first to return a clear error early.
  {
    const params = buildDriveQueryParams(creds, {
      fields: 'id,name,mimeType',
      supportsAllDrives: 'true',
    });
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?${params.toString()}`,
      { headers: buildDriveRequestHeaders(creds, folderResourceKeysHeader) },
    );
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`No se pudo acceder a la carpeta de Google Drive (${response.status}) ${compactGoogleDriveErrorDetail(details)}`);
    }
  }

  while (stack.length > 0) {
    const currentFolderId = String(stack.pop());
    if (!currentFolderId || visited.has(currentFolderId)) continue;
    visited.add(currentFolderId);

    let pageToken = '';
    do {
      const params = buildDriveQueryParams(creds, {
        q: `'${currentFolderId}' in parents and trashed = false`,
        fields: 'nextPageToken,files(id,name,mimeType,resourceKey)',
        pageSize: '1000',
        includeItemsFromAllDrives: 'true',
        supportsAllDrives: 'true',
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
        { headers: buildDriveRequestHeaders(creds, folderResourceKeysHeader) },
      );
      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(`No se pudo listar la carpeta de Google Drive (${response.status}) ${compactGoogleDriveErrorDetail(details)}`);
      }

      const data = await response.json() as {
        nextPageToken?: string;
        files?: Array<{ id?: string; name?: string; mimeType?: string; resourceKey?: string }>;
      };

      for (const file of data.files || []) {
        if (!file.id || !file.name || !file.mimeType) continue;

        if (file.mimeType === 'application/vnd.google-apps.folder') {
          stack.push(file.id);
          continue;
        }

        if (!file.mimeType.startsWith('image/')) continue;
        files.push({ id: file.id, name: file.name, mimeType: file.mimeType, resourceKey: file.resourceKey });
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);
  }

  return files;
}

async function downloadGoogleDriveImage(
  fileId: string,
  creds: DriveCredentials,
  resourceKey?: string,
) {
  const params = buildDriveQueryParams(creds, { alt: 'media' });
  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`;
  const resourceKeysHeader = resourceKey ? `${fileId}/${resourceKey}` : undefined;
  const response = await fetch(mediaUrl, {
    headers: buildDriveRequestHeaders(creds, resourceKeysHeader),
  });
  if (!response.ok) {
    const rawDetail = await response.text().catch(() => '');
    const detail = compactGoogleDriveErrorDetail(rawDetail);
    throw new GoogleDriveDownloadError(fileId, response.status, detail);
  }

  const data = await response.arrayBuffer();
  return Buffer.from(data);
}

function resolveDriveImageFilename(name: string, mimeType: string) {
  const sanitized = sanitizeProductImageName(name || '');
  const ext = path.extname(sanitized).toLowerCase();
  if (ext && ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return sanitized;
  }

  const fallbackExt = DRIVE_IMAGE_MIME_EXTENSIONS[mimeType] || '.jpg';
  const stem = path.basename(sanitized || `drive_${Date.now()}`, path.extname(sanitized));
  return `${stem}${fallbackExt}`;
}

const slugifyText = (value: string) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function getSectionTree() {
  const sections = await prisma.productSection.findMany({
    where: { isActive: true },
    orderBy: [{ parentCategory: 'asc' }, { name: 'asc' }],
  });

  const grouped = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const section of sections) {
    const current = grouped.get(section.parentCategory) || [];
    current.push({ id: section.id, name: section.name, slug: section.slug });
    grouped.set(section.parentCategory, current);
  }

  return grouped;
}

async function resolveAllowedCategoriesForFilter(category: string) {
  const requested = String(category || '').trim();
  if (!requested) return [] as string[];

  const normalizedParent = normalizeStoreCategory(requested);
  if (isOfficialStoreCategory(normalizedParent)) {
    const children = await prisma.productSection.findMany({
      where: { parentCategory: normalizedParent, isActive: true },
      select: { name: true },
    });
    return [normalizedParent, ...children.map((child) => child.name)];
  }

  const exactChild = await prisma.productSection.findFirst({
    where: { name: requested, isActive: true },
    select: { name: true },
  });
  if (exactChild) return [exactChild.name];

  const slug = slugifyText(requested);
  const childBySlug = await prisma.productSection.findFirst({
    where: { slug, isActive: true },
    select: { name: true },
  });
  if (childBySlug) return [childBySlug.name];

  return [normalizedParent];
}

async function resolveValidCategoryInput(category: string) {
  const requested = String(category || '').trim();
  const normalizedParent = normalizeStoreCategory(requested);

  if (isOfficialStoreCategory(normalizedParent)) {
    return { category: normalizedParent, valid: true };
  }

  const child = await prisma.productSection.findFirst({
    where: {
      OR: [
        { name: requested },
        { slug: slugifyText(requested) },
      ],
      isActive: true,
    },
    select: { name: true },
  });

  if (child) {
    return { category: child.name, valid: true };
  }

  return { category: requested, valid: false };
}

// Get all products (public)
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      category,
      status,
      search,
      presale,
      featured,
      minPrice,
      maxPrice,
      page = '1',
      limit = '50',
    } = req.query;

    const where: any = {};
    const canSeeHiddenProducts = req.user?.email?.toLowerCase() === HIDDEN_PRODUCTS_ALLOWED_EMAIL;
    const isAdminOrStaff = req.user?.role === 'ADMIN' || req.user?.role === 'STAFF';

    if (category) {
      const allowedCategories = await resolveAllowedCategoriesForFilter(String(category));
      if (allowedCategories.length > 1) {
        where.category = { in: allowedCategories };
      } else if (allowedCategories.length === 1) {
        where.category = allowedCategories[0];
      }
    }

    if (status && status !== 'ALL') {
      const requestedStatus = status as string;

      if (requestedStatus === 'HIDDEN' && !canSeeHiddenProducts && req.user?.role !== 'ADMIN' && req.user?.role !== 'STAFF') {
        where.status = 'ACTIVE';
      } else {
        where.status = requestedStatus;
      }
    } else if (req.user?.role !== 'ADMIN' && req.user?.role !== 'STAFF') {
      // Por defecto, solo productos activos.
      // El usuario permitido puede ver además los HIDDEN en storefront.
      where.status = canSeeHiddenProducts
        ? { in: ['ACTIVE', 'HIDDEN'] }
        : 'ACTIVE';
    }

    if (presale === 'true') {
      where.isPresale = true;
    } else if (presale === 'false') {
      where.isPresale = false;
    }

    if (featured === 'true') {
      where.featured = true;
    } else if (featured === 'false') {
      where.featured = false;
    }

    // Usuarios no autenticados no pueden ver productos de preventa
    if (!req.user) {
      where.isPresale = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { sku: { contains: search as string } },
        { ean: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (!isAdminOrStaff) {
      const now = new Date();
      where.AND = where.AND ?? [];
      where.AND.push({
        OR: [
          { isPresale: false },
          {
            isPresale: true,
            AND: [
              {
                OR: [
                  { presaleEndDate: null },
                  { presaleEndDate: { gt: now } },
                ],
              },
              {
                OR: [
                  { presaleAvailQty: null },
                  { presaleAvailQty: { gt: 0 } },
                ],
              },
            ],
          },
        ],
      });
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

    const presaleIds = products.filter((product) => product.isPresale).map((product) => product.id);
    const reservationGroups = presaleIds.length > 0
      ? await prisma.presaleReservation.groupBy({
          by: ['productId'],
          where: {
            productId: { in: presaleIds },
            status: { in: ['PENDING', 'NOTIFIED', 'PAID'] },
          },
          _count: { _all: true },
        })
      : [];

    const activeReservedByProduct = Object.fromEntries(
      reservationGroups.map((row) => [row.productId, row._count._all])
    ) as Record<string, number>;

    // Parse JSON fields
    const productsWithStock = products
      .map(product => {
        const activeReservedCount = activeReservedByProduct[product.id] ?? 0;
        const remainingPresaleQty = product.presaleAvailQty == null
          ? null
          : Math.max(product.presaleAvailQty - activeReservedCount, 0);

        return {
          ...product,
          images: parseImages(product.images),
          price: parseFloat(product.price.toString()),
          cost: parseFloat(product.cost.toString()),
          stock: product.stock,
          presaleAvailQty: isAdminOrStaff ? product.presaleAvailQty : remainingPresaleQty,
          variants: product.variants.map(v => ({
            ...v,
            options: parseOptions(v.options),
            price: v.price ? parseFloat(v.price.toString()) : null,
          })),
        };
      })
      .filter((product) => {
        if (isAdminOrStaff || !product.isPresale) return true;
        return product.presaleAvailQty == null || product.presaleAvailQty > 0;
      });

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
      stock,
      images, 
      status,
      featured,
      ean,
      barcode,
      isPresale,
      presaleMaxQty,
      presaleAvailQty,
      presaleEndDate,
      variants,
      initialStock,
    } = req.body;

    const { category: normalizedCategory, valid: isValidCategory } = await resolveValidCategoryInput(String(category || ''));

    if (!String(name || '').trim() || !String(normalizedCategory || '').trim()) {
      return res.status(400).json({ error: 'Nombre y categoría son requeridos' });
    }

    if (!isValidCategory) {
      return res.status(400).json({ error: 'La categoría debe ser una sección principal o una subsección válida' });
    }

    const parsedEan: string | null = ean !== undefined
      ? String(ean)
      : (barcode !== undefined ? String(barcode) : null);

    const parsedStock = Number.isFinite(Number(stock)) ? Number(stock) : 0;
    const parsedInitialStock = Number.isFinite(Number(initialStock))
      ? Number(initialStock)
      : parsedStock;

    const resolvedSku = String(sku || '').trim() || await generateUniqueSku(prisma, normalizedCategory);

    // Check SKU uniqueness
    const existingBySku = await prisma.product.findUnique({ where: { sku: resolvedSku } });
    if (existingBySku) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    const product = await prisma.product.create({
      data: {
        sku: resolvedSku,
        name,
        description,
        category: normalizedCategory,
        price,
        cost,
        stock: parsedStock,
        initialStock: parsedInitialStock,
        images: JSON.stringify(images || []),
        status: status || 'ACTIVE',
        featured: Boolean(featured),
        ean: parsedEan,
        isPresale: isPresale || false,
        presaleMaxQty,
        presaleAvailQty,
        presaleEndDate: isPresale ? null : (presaleEndDate ? new Date(presaleEndDate) : null),
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
      sku,
      name,
      description,
      category,
      price,
      cost,
      stock,
      initialStock,
      images,
      status,
      featured,
      ean,
      barcode,
      isPresale,
      presaleMaxQty,
      presaleAvailQty,
      presaleEndDate,
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const parsedEan: string | undefined = ean !== undefined
      ? String(ean)
      : (barcode !== undefined ? String(barcode) : undefined);

    const { category: nextCategory, valid: isValidCategory } = await resolveValidCategoryInput(String(category ?? existing.category));
    if (!String(nextCategory).trim() || !isValidCategory) {
      return res.status(400).json({ error: 'La categoría debe ser una sección principal o una subsección válida' });
    }

    const nextSku = sku ?? existing.sku;
    if (nextSku !== existing.sku) {
      const duplicateSku = await prisma.product.findUnique({ where: { sku: nextSku } });
      if (duplicateSku && duplicateSku.id !== id) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    const isConvertingFromPresale = existing.isPresale && isPresale === false;
    if (isConvertingFromPresale) {
      const now = new Date();
      const alreadyClosed =
        existing.status === 'HIDDEN' ||
        (existing.presaleEndDate ? existing.presaleEndDate <= now : false) ||
        ((existing.presaleAvailQty ?? 1) <= 0);

      if (!alreadyClosed) {
        return res.status(400).json({ error: 'Solo puedes convertir a producto una preventa que ya terminó su tiempo activo o agotó sus cupos' });
      }

      const validation = {
        sku: nextSku,
        ean: parsedEan ?? existing.ean,
        name: name ?? existing.name,
        category: nextCategory,
        price: price ?? Number(existing.price),
        cost: cost ?? Number(existing.cost),
        stock: stock ?? existing.stock,
        initialStock: initialStock ?? existing.initialStock,
      };

      const missingFields = [
        !validation.sku && 'SKU',
        !validation.ean && 'EAN',
        !validation.name && 'nombre',
        !validation.category && 'categoría',
        (!Number.isFinite(Number(validation.price)) || Number(validation.price) <= 0) && 'precio',
        (!Number.isFinite(Number(validation.cost)) || Number(validation.cost) < 0) && 'costo',
        (!Number.isFinite(Number(validation.stock)) || Number(validation.stock) < 0) && 'stock',
        (!Number.isFinite(Number(validation.initialStock)) || Number(validation.initialStock) < 0) && 'stock inicial',
      ].filter(Boolean);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Verifica los datos antes de convertir la preventa. Faltan o son inválidos: ${missingFields.join(', ')}`,
        });
      }
    }

    const nextIsPresale = isPresale ?? existing.isPresale;
    const nextCost = cost ?? Number(existing.cost);
    const shouldSyncHistoricalCost = cost !== undefined && Number(nextCost) !== Number(existing.cost);

    const product = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          sku,
          name,
          description,
          category: nextCategory,
          price,
          cost,
          stock,
          initialStock,
          images: images !== undefined ? JSON.stringify(images) : undefined,
          status: isConvertingFromPresale ? 'ACTIVE' : status,
          featured: featured !== undefined ? Boolean(featured) : undefined,
          ean: parsedEan,
          isPresale,
          presaleMaxQty: isConvertingFromPresale ? null : presaleMaxQty,
          presaleAvailQty: isConvertingFromPresale ? null : presaleAvailQty,
          presaleEndDate: isConvertingFromPresale
            ? null
            : (nextIsPresale ? existing.presaleEndDate : (presaleEndDate ? new Date(presaleEndDate) : null)),
          presaleArrivedAt: isConvertingFromPresale ? null : undefined,
        },
        include: {
          variants: true,
        },
      });

      if (shouldSyncHistoricalCost) {
        await syncHistoricalCostForProduct(tx, {
          productId: updatedProduct.id,
          sku: updatedProduct.sku,
          cost: Number(nextCost),
        });
      }

      return updatedProduct;
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

// Import presale products from CSV using a dedicated endpoint
router.post('/import-presales', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { products: rows } = req.body;

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
      const lineNum = i + 2;

      if (!row.name || !row.category || row.price == null || row.cost == null) {
        results.errors.push(`Línea ${lineNum}: faltan campos requeridos (name, category, price, cost)`);
        results.skipped++;
        continue;
      }

      const { category: normalizedCategory, valid: isValidCategory } = await resolveValidCategoryInput(String(row.category || ''));
      if (!isValidCategory) {
        results.errors.push(`Línea ${lineNum}: la categoría debe existir como sección principal o subsección activa`);
        results.skipped++;
        continue;
      }

      const normalizedRow = normalizeProductImportRow(row as Record<string, string | undefined>);
      const requestedSku = String(normalizedRow.sku || '').trim();
      const resolvedSku = requestedSku || await generateUniqueSku(prisma, normalizedCategory);
      const price = normalizedRow.price;
      const cost = normalizedRow.cost;
      const stock = 0;
      const initialStock = 0;

      if (price == null || cost == null || price < 0 || cost < 0) {
        results.errors.push(`Línea ${lineNum} (${resolvedSku}): precio o costo inválido`);
        results.skipped++;
        continue;
      }

      const presaleMaxQty = normalizedRow.presaleMaxQty ?? (row.presaleMaxQty ? parseInt(row.presaleMaxQty) : null);
      const presaleAvailQty = normalizedRow.presaleAvailQty ?? (row.presaleAvailQty ? parseInt(row.presaleAvailQty) : null);
      const presaleEndDate = row.presaleEndDate ? new Date(row.presaleEndDate) : null;

      const productData = {
        name: normalizedRow.name || row.name,
        description: normalizedRow.description || row.description || null,
        category: normalizedCategory,
        price,
        cost,
        stock,
        initialStock,
        ean: normalizedRow.ean ? String(normalizedRow.ean) : ((row.EAN || row.ean || row.barcode) ? String(row.EAN || row.ean || row.barcode) : null),
        images: JSON.stringify(normalizeImportedImageReferences(
          normalizedRow.images.length > 0
            ? normalizedRow.images
            : (row.images ? String(row.images).split('|').map((s: string) => s.trim()) : [])
        )),
        status: ['ACTIVE', 'ARCHIVED'].includes((normalizedRow.status || row.status || 'ACTIVE').toUpperCase())
          ? (normalizedRow.status || row.status || 'ACTIVE').toUpperCase()
          : 'ACTIVE',
        isPresale: true,
        presaleMaxQty,
        presaleAvailQty,
        presaleEndDate,
      };

      try {
        const existing = requestedSku
          ? await prisma.product.findUnique({ where: { sku: requestedSku } })
          : null;

        if (existing) {
          await prisma.$transaction(async (tx) => {
            const updatedProduct = await tx.product.update({
              where: { sku: requestedSku },
              data: { ...productData, isPresale: true },
            });

            if (Number(existing.cost) !== Number(cost)) {
              await syncHistoricalCostForProduct(tx, {
                productId: updatedProduct.id,
                sku: updatedProduct.sku,
                cost,
              });
            }
          });
          results.updated++;
        } else {
          await prisma.product.create({
            data: { sku: resolvedSku, ...productData },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Línea ${lineNum} (${resolvedSku}): error al procesar preventa`);
        results.skipped++;
      }
    }

    res.status(201).json(results);
  } catch (error) {
    console.error('Import presales error:', error);
    res.status(500).json({ error: 'Failed to import presales' });
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
      if (!row.name || !row.category || row.price == null || row.cost == null) {
        results.errors.push(`Línea ${lineNum}: faltan campos requeridos (name, category, price, cost)`);
        results.skipped++;
        continue;
      }

      const { category: normalizedCategory, valid: isValidCategory } = await resolveValidCategoryInput(String(row.category || ''));
      if (!isValidCategory) {
        results.errors.push(`Línea ${lineNum}: la categoría debe existir como sección principal o subsección activa`);
        results.skipped++;
        continue;
      }

      const normalizedRow = normalizeProductImportRow(row as Record<string, string | undefined>);
      const requestedSku = String(normalizedRow.sku || '').trim();
      const resolvedSku = requestedSku || await generateUniqueSku(prisma, normalizedCategory);
      const price = normalizedRow.price;
      const cost = normalizedRow.cost;
      const stock = normalizedRow.stock ?? 0;
      const initialStock = normalizedRow.initialStock ?? stock;

      if (price == null || cost == null || price < 0 || cost < 0) {
        results.errors.push(`Línea ${lineNum} (${resolvedSku}): precio o costo inválido`);
        results.skipped++;
        continue;
      }

      const isPresale = forcePresale;
      const presaleMaxQty = normalizedRow.presaleMaxQty ?? (row.presaleMaxQty ? parseInt(row.presaleMaxQty) : null);
      const presaleAvailQty = normalizedRow.presaleAvailQty ?? (row.presaleAvailQty ? parseInt(row.presaleAvailQty) : null);

      const productData = {
        name: normalizedRow.name || row.name,
        description: normalizedRow.description || row.description || null,
        category: normalizedCategory,
        price,
        cost,
        stock,
        initialStock,
        ean: normalizedRow.ean ? String(normalizedRow.ean) : ((row.EAN || row.ean || row.barcode) ? String(row.EAN || row.ean || row.barcode) : null),
        images: JSON.stringify(normalizeImportedImageReferences(
          normalizedRow.images.length > 0
            ? normalizedRow.images
            : (row.images ? String(row.images).split('|').map((s: string) => s.trim()) : [])
        )),
        status: ['ACTIVE', 'ARCHIVED'].includes((normalizedRow.status || row.status || 'ACTIVE').toUpperCase())
          ? (normalizedRow.status || row.status || 'ACTIVE').toUpperCase()
          : 'ACTIVE', // HIDDEN no se puede importar desde CSV, solo se asigna manualmente
        isPresale,
        presaleMaxQty,
        presaleAvailQty,
        presaleEndDate: null,
      };

      try {
        const existing = requestedSku
          ? await prisma.product.findUnique({ where: { sku: requestedSku } })
          : null;

        if (existing) {
          await prisma.$transaction(async (tx) => {
            const updatedProduct = await tx.product.update({
              where: { sku: requestedSku },
              data: productData,
            });

            if (Number(existing.cost) !== Number(cost)) {
              await syncHistoricalCostForProduct(tx, {
                productId: updatedProduct.id,
                sku: updatedProduct.sku,
                cost,
              });
            }
          });
          results.updated++;
        } else {
          await prisma.product.create({
            data: { sku: resolvedSku, ...productData },
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Línea ${lineNum} (${resolvedSku}): error al procesar producto`);
        results.skipped++;
      }
    }

    res.status(201).json(results);
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

router.get('/meta/sku-preview', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const category = String(req.query.category || '').trim();

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const sku = await generateUniqueSku(prisma, category);
    res.json({ sku, prefix: getSkuPrefix(category) });
  } catch (error) {
    console.error('Get SKU preview error:', error);
    res.status(500).json({ error: 'Failed to get SKU preview' });
  }
});

router.get('/meta/sections', async (_req, res) => {
  try {
    const tree = await getSectionTree();
    const sections = Array.from(tree.entries())
      .filter(([parentCategory]) => isOfficialStoreCategory(parentCategory))
      .map(([parentCategory, children]) => ({
        parentCategory,
        slug: slugifyText(parentCategory),
        children,
      }))
      .sort((a, b) => a.parentCategory.localeCompare(b.parentCategory, 'es', { sensitivity: 'base' }));

    res.json(sections);
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ error: 'Failed to get sections' });
  }
});

router.post('/meta/sections', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const parentCategory = normalizeStoreCategory(String(req.body?.parentCategory || ''));
    const name = String(req.body?.name || '').trim();

    if (!isOfficialStoreCategory(parentCategory)) {
      return res.status(400).json({ error: 'La sección principal no es válida' });
    }

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'El nombre de la subsección es requerido' });
    }

    const slug = slugifyText(name);
    if (!slug) {
      return res.status(400).json({ error: 'El nombre de la subsección es inválido' });
    }

    const section = await prisma.productSection.create({
      data: {
        parentCategory,
        name,
        slug,
      },
    });

    return res.status(201).json(section);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe una subsección con ese nombre en la sección principal seleccionada' });
    }
    console.error('Create subsection error:', error);
    return res.status(500).json({ error: 'Failed to create subsection' });
  }
});

router.delete('/meta/sections/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id || '');
    const section = await prisma.productSection.findUnique({ where: { id } });

    if (!section) {
      return res.status(404).json({ error: 'Subsección no encontrada' });
    }

    await prisma.productSection.delete({ where: { id } });
    return res.json({ message: 'Subsección eliminada' });
  } catch (error) {
    console.error('Delete subsection error:', error);
    return res.status(500).json({ error: 'Failed to delete subsection' });
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

    try {
      await generateProductImageVariants(req.file.filename);
    } catch (variantError) {
      console.error('Upload image variants generation error:', variantError);
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

router.post('/upload-images-drive', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  const importStartedAt = Date.now();
  const importId = `drive-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let folderIdForLog = '';

  try {
    const folderUrl = String(req.body?.folderUrl || '').trim();
    if (!folderUrl) {
      return res.status(400).json({ error: 'Debes enviar la URL de la carpeta de Google Drive' });
    }

    const folderRef = extractGoogleDriveFolderReference(folderUrl);
    if (!folderRef) {
      return res.status(400).json({ error: 'No se pudo leer el ID de la carpeta de Google Drive' });
    }
    folderIdForLog = folderRef.folderId;

    let creds: DriveCredentials;
    try {
      creds = await getDriveCredentials();
    } catch (credError) {
      return res.status(503).json({
        error: credError instanceof Error ? credError.message : 'Error al obtener credenciales de Google Drive',
      });
    }

    console.log('[drive-import] started', {
      importId,
      folderId: folderRef.folderId,
      hasResourceKey: Boolean(folderRef.resourceKey),
      requestedBy: req.user?.email || 'unknown',
      authMethod: creds.type,
    });

    const driveFiles = await listGoogleDriveFolderImages(folderRef.folderId, creds, folderRef.resourceKey);
    console.log('[drive-import] discovered files', {
      importId,
      folderId: folderRef.folderId,
      totalDriveFiles: driveFiles.length,
    });

    if (driveFiles.length === 0) {
      console.log('[drive-import] finished without files', {
        importId,
        folderId: folderRef.folderId,
        elapsedMs: Date.now() - importStartedAt,
      });
      return res.json({
        extracted: 0,
        skipped: 0,
        productsUpdated: 0,
        files: [],
        message: 'No se encontraron imágenes en la carpeta (ni en subcarpetas) o no hay permisos de lectura públicos.',
      });
    }

    fs.mkdirSync(productUploadsDir, { recursive: true });

    const extracted: string[] = [];
    let skipped = 0;

    for (const driveFile of driveFiles) {
      const downloadStartedAt = Date.now();
      try {
        const filename = resolveDriveImageFilename(driveFile.name, driveFile.mimeType);
        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
          skipped++;
          continue;
        }

        const data = await downloadGoogleDriveImage(driveFile.id, creds, driveFile.resourceKey);
        fs.writeFileSync(path.join(productUploadsDir, filename), data);
        await generateProductImageVariants(filename);
        extracted.push(filename);
      } catch (downloadError) {
        if (downloadError instanceof GoogleDriveDownloadError) {
          console.error('[drive-import] image skipped', {
            importId,
            fileId: driveFile.id,
            fileName: driveFile.name,
            mimeType: driveFile.mimeType,
            status: downloadError.status,
            detail: downloadError.detail || 'sin detalle',
            elapsedMs: Date.now() - downloadStartedAt,
          });
        } else {
          console.error('[drive-import] image skipped (unexpected error)', {
            importId,
            fileId: driveFile.id,
            fileName: driveFile.name,
            mimeType: driveFile.mimeType,
            error: downloadError instanceof Error ? downloadError.message : String(downloadError),
            elapsedMs: Date.now() - downloadStartedAt,
          });
        }
        skipped++;
      }
    }

    const productsUpdated = await attachExtractedImagesToProducts(extracted);
    console.log('[drive-import] completed', {
      importId,
      folderId: folderRef.folderId,
      extracted: extracted.length,
      skipped,
      productsUpdated,
      elapsedMs: Date.now() - importStartedAt,
    });
    return res.json({ extracted: extracted.length, skipped, productsUpdated, files: extracted });
  } catch (error) {
    console.error('[drive-import] failed', {
      importId,
      folderId: folderIdForLog || 'unknown',
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - importStartedAt,
    });
    return res.status(500).json({ error: 'Error al importar imágenes desde Google Drive' });
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
      await generateProductImageVariants(safeName);
      extracted.push(safeName);
    }

    // Update products
    const updated = await attachExtractedImagesToProducts(extracted);

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
      await generateProductImageVariants(safeName);
      extracted.push(safeName);
    }

    // Update products: replace bare filenames with served URLs
    const updated = await attachExtractedImagesToProducts(extracted);

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

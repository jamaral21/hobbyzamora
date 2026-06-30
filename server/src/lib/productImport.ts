type ProductImportRow = Record<string, string | undefined>;

export interface NormalizedProductImportRow {
  sku?: string;
  ean?: string;
  name?: string;
  category?: string;
  description?: string;
  price?: number;
  cost?: number;
  stock?: number;
  initialStock?: number;
  status?: string;
  images: string[];
  presaleMaxQty?: number | null;
  presaleAvailQty?: number | null;
  inventory?: number;
  unitCost?: number;
}

const HEADER_ALIASES: Record<string, string[]> = {
  sku: ['sku', 'SKU', 'sku_id', 'id_sku'],
  ean: ['ean', 'EAN', 'barcode', 'barcode_text', 'codigo_barras'],
  name: ['name', 'name_product', 'product_name', 'producto', 'producto_name', 'nombre', 'title'],
  category: ['category', 'categoria', 'categoría', 'section', 'seccion'],
  description: ['description', 'descripcion', 'descripción', 'details'],
  price: ['price', 'precio', 'unit_price'],
  cost: ['cost', 'costo', 'unit_cost', 'costo_unitario'],
  stock: ['stock', 'inventory', 'inventario', 'inventory_qty', 'quantity', 'qty', 'cantidad', 'stock_available'],
  initialStock: ['initialStock', 'initial_stock', 'stock_inicial', 'initial_stock_value', 'stock_inicial_inicial'],
  status: ['status', 'estado', 'state'],
  images: ['images', 'image', 'imagenes', 'image_urls', 'img'],
  presaleMaxQty: ['presaleMaxQty', 'presale_max_qty', 'max_qty', 'cupo_maximo'],
  presaleAvailQty: ['presaleAvailQty', 'presale_available_qty', 'available_qty', 'cupo_disponible'],
  unitCost: ['unitCost', 'unit_cost', 'costo_unitario', 'unit_price_cost'],
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getFirstValue(row: ProductImportRow, aliases: string[]) {
  const normalized = new Map<string, string | undefined>();
  Object.entries(row).forEach(([key, value]) => {
    normalized.set(normalizeHeader(key), value);
  });

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const value = normalized.get(normalizedAlias);
    if (value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return undefined;
}

function parseNumber(value: string | undefined) {
  if (value == null) return undefined;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseImages(value: string | undefined) {
  if (!value) return [];
  return String(value)
    .split(/[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeProductImportRow(row: ProductImportRow): NormalizedProductImportRow {
  const stockValue = getFirstValue(row, HEADER_ALIASES.stock);
  const initialStockValue = getFirstValue(row, HEADER_ALIASES.initialStock);
  const stock = parseNumber(stockValue);
  const initialStock = parseNumber(initialStockValue);
  const inventory = stock ?? undefined;

  return {
    sku: getFirstValue(row, HEADER_ALIASES.sku),
    ean: getFirstValue(row, HEADER_ALIASES.ean),
    name: getFirstValue(row, HEADER_ALIASES.name),
    category: getFirstValue(row, HEADER_ALIASES.category),
    description: getFirstValue(row, HEADER_ALIASES.description),
    price: parseNumber(getFirstValue(row, HEADER_ALIASES.price)),
    cost: parseNumber(getFirstValue(row, HEADER_ALIASES.cost)),
    stock: stock != null ? Math.max(0, Math.round(stock)) : undefined,
    initialStock: initialStock != null ? Math.max(0, Math.round(initialStock)) : (stock != null ? Math.max(0, Math.round(stock)) : undefined),
    status: getFirstValue(row, HEADER_ALIASES.status) || 'ACTIVE',
    images: parseImages(getFirstValue(row, HEADER_ALIASES.images)),
    presaleMaxQty: parseNumber(getFirstValue(row, HEADER_ALIASES.presaleMaxQty)) != null ? Math.max(0, Math.round(parseNumber(getFirstValue(row, HEADER_ALIASES.presaleMaxQty))!)) : null,
    presaleAvailQty: parseNumber(getFirstValue(row, HEADER_ALIASES.presaleAvailQty)) != null ? Math.max(0, Math.round(parseNumber(getFirstValue(row, HEADER_ALIASES.presaleAvailQty))!)) : null,
    inventory,
    unitCost: parseNumber(getFirstValue(row, HEADER_ALIASES.unitCost)),
  };
}

import type { PrismaClient } from '@prisma/client';

export const PRODUCT_CATEGORY_OPTIONS = [
  'Pokémon TCG',
  'TCG Varios',
  'Beyblade X',
  'Pokémon Merch',
  'Autos Tomy Tomica',
  'Figuras',
  'Nintendo',
  'Coleccionables Varios',
] as const;

const LEGACY_CATEGORY_TO_MENU: Record<string, (typeof PRODUCT_CATEGORY_OPTIONS)[number]> = {
  'booster boxes': 'Pokémon TCG',
  'elite trainer boxes': 'Pokémon TCG',
  'colecciones premium': 'Pokémon TCG',
  'sobres sueltos': 'Pokémon TCG',
  'tins y latas': 'Pokémon TCG',
  blisters: 'Pokémon TCG',
  figuarts: 'Figuras',
  tomica: 'Autos Tomy Tomica',
};

const CATEGORY_PREFIXES: Record<string, string> = {
  'pokemon tcg': 'PKM',
  'tcg varios': 'TVR',
  'beyblade x': 'BBX',
  'pokemon merch': 'PMR',
  'autos tomy tomica': 'TMC',
  'figuras': 'FGT',
  'figuarts': 'FGT',
  'nintendo': 'NTD',
  'coleccionables varios': 'COL',
  'booster boxes': 'BST',
  'elite trainer boxes': 'ETB',
  'colecciones premium': 'PRM',
  'sobres sueltos': 'SBS',
  'tins y latas': 'TIN',
  blisters: 'BLS',
};

function normalizeCategory(category: string) {
  return category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildFallbackPrefix(category: string) {
  const letters = normalizeCategory(category)
    .split(' ')
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (letters || 'GEN').padEnd(3, 'X').slice(0, 3);
}

export function isOfficialStoreCategory(category: string) {
  return PRODUCT_CATEGORY_OPTIONS.includes(category as (typeof PRODUCT_CATEGORY_OPTIONS)[number]);
}

export function normalizeStoreCategory(category: string) {
  const trimmed = String(category || '').trim();
  if (isOfficialStoreCategory(trimmed)) return trimmed;

  const normalized = normalizeCategory(trimmed);
  return LEGACY_CATEGORY_TO_MENU[normalized] || trimmed;
}

export function getSkuPrefix(category: string) {
  const normalized = normalizeCategory(category);
  return CATEGORY_PREFIXES[normalized] || buildFallbackPrefix(category);
}

export function buildSkuFromCategory(category: string, sequence: number) {
  const safeSequence = Math.max(1, Math.floor(sequence));
  return `HBZ-${getSkuPrefix(category)}-${String(safeSequence).padStart(3, '0')}`;
}

export async function generateUniqueSku(prisma: PrismaClient, category: string) {
  const prefix = getSkuPrefix(category);
  const base = `HBZ-${prefix}-`;

  const existing = await prisma.product.findMany({
    where: {
      sku: {
        startsWith: base,
      },
    },
    select: { sku: true },
  });

  const nextSequence = existing.reduce((max, product) => {
    const match = product.sku.match(new RegExp(`^${base}(\\d+)$`));
    const numericPart = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(numericPart) ? Math.max(max, numericPart) : max;
  }, 0) + 1;

  return buildSkuFromCategory(category, nextSequence);
}

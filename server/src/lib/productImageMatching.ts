import path from 'path';

export function sanitizeProductImageName(filename: string) {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function normalizeMatchingText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

export function matchesProductImageName(filename: string, product: { sku?: string | null; name?: string | null }) {
  const cleaned = sanitizeProductImageName(filename);
  const fileStem = path.basename(cleaned, path.extname(cleaned));
  const normalizedFile = normalizeMatchingText(fileStem);
  const normalizedSku = normalizeMatchingText(product.sku || '');
  const normalizedName = normalizeMatchingText(product.name || '');

  if (!normalizedFile) return false;
  if (normalizedFile === normalizedSku || normalizedFile === normalizedName) return true;
  if (normalizedSku && normalizedFile.startsWith(normalizedSku)) return true;
  if (normalizedName && normalizedFile.startsWith(normalizedName)) return true;
  return false;
}

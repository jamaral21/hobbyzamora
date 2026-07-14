export type ProductImageVariant = 'thumb' | 'card' | 'detail';

export function buildProductImageVariantUrl(src: string, variant: ProductImageVariant): string {
  const original = String(src || '').trim();
  if (!original.startsWith('/uploads/products/')) return original;

  const [pathOnly] = original.split('?');
  const filename = pathOnly.replace('/uploads/products/', '');
  if (!filename || filename.startsWith('variants/')) return original;

  const dotIndex = filename.lastIndexOf('.');
  const basename = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  if (!basename) return original;

  return `/uploads/products/variants/${basename}__${variant}.webp`;
}

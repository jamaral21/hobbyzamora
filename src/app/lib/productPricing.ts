import type { Product } from './api';

export function getProductDiscountPercent(product: Pick<Product, 'discountPercent' | 'isPresale'>): number {
  if (product.isPresale) return 0;
  return Math.min(100, Math.max(0, Number(product.discountPercent) || 0));
}

export function getDiscountedPrice(price: number, discountPercent: number): number {
  return discountPercent > 0 ? Math.round(price * (100 - discountPercent) / 100) : price;
}

export function getProductBasePrice(product: Product, variantId?: string | null): number {
  const variantPrice = variantId
    ? product.variants?.find((variant) => variant.id === variantId)?.price
    : null;
  return variantPrice ?? product.price;
}
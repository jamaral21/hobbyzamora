export function calculateProductPricing(price: number, discountPercent: number, isPresale: boolean) {
  const appliedPercent = isPresale ? 0 : Math.min(100, Math.max(0, discountPercent));
  const discountedPrice = appliedPercent > 0
    ? Math.round(price * (100 - appliedPercent) / 100)
    : price;

  return {
    originalPrice: price,
    discountedPrice,
    discountAmount: price - discountedPrice,
  };
}
import { describe, expect, it } from 'vitest';
import { getDiscountedPrice, getProductDiscountPercent } from './productPricing';

describe('product discount pricing', () => {
  it('rounds discounted CLP prices to a whole peso', () => {
    expect(getDiscountedPrice(11990, 15)).toBe(10192);
  });

  it('does not apply product discounts to presales', () => {
    expect(getProductDiscountPercent({ discountPercent: 20, isPresale: true })).toBe(0);
    expect(getDiscountedPrice(10000, getProductDiscountPercent({ discountPercent: 20, isPresale: true }))).toBe(10000);
  });
});
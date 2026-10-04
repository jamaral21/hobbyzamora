import { describe, expect, it } from 'vitest';
import { calculateProductPricing } from './productPricing.js';

describe('calculateProductPricing', () => {
  it('returns the discounted whole-peso unit price and savings', () => {
    expect(calculateProductPricing(11990, 15, false)).toEqual({
      originalPrice: 11990,
      discountedPrice: 10192,
      discountAmount: 1798,
    });
  });

  it('does not discount presale products', () => {
    expect(calculateProductPricing(10000, 20, true)).toEqual({
      originalPrice: 10000,
      discountedPrice: 10000,
      discountAmount: 0,
    });
  });
});
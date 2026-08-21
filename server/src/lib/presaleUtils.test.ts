import { describe, expect, it } from 'vitest';
import { getRequestedPresaleQuantity, sumPresaleReservationQuantities } from './presaleUtils.js';

describe('getRequestedPresaleQuantity', () => {
  it('sums all lines for the same product', () => {
    expect(getRequestedPresaleQuantity([
      { productId: 'product-1', quantity: 1 },
      { productId: 'product-1', quantity: 2 },
      { productId: 'product-2', quantity: 5 },
    ], 'product-1')).toBe(3);
  });

  it('returns zero when the product is absent', () => {
    expect(getRequestedPresaleQuantity([
      { productId: 'product-1', quantity: 2 },
    ], 'product-2')).toBe(0);
  });

  it('sums reserved units per product instead of reservation rows', () => {
    expect(sumPresaleReservationQuantities([
      { productId: 'product-1', quantity: 1 },
      { productId: 'product-1', quantity: 3 },
      { productId: 'product-1', quantity: 2 },
      { productId: 'product-2', quantity: 1 },
    ])).toEqual({ 'product-1': 6, 'product-2': 1 });
  });
});
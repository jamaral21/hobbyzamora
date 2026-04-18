import { describe, expect, it } from 'vitest';
import { getSkuPrefix, buildSkuFromCategory } from './sku';

describe('SKU helpers', () => {
  it('returns expected prefixes for known categories', () => {
    expect(getSkuPrefix('Pokémon TCG')).toBe('PKM');
    expect(getSkuPrefix('Beyblade X')).toBe('BBX');
    expect(getSkuPrefix('Nintendo')).toBe('NTD');
    expect(getSkuPrefix('Booster Boxes')).toBe('BST');
  });

  it('builds zero-padded SKUs using category prefixes', () => {
    expect(buildSkuFromCategory('Pokémon TCG', 1)).toBe('HBZ-PKM-001');
    expect(buildSkuFromCategory('Booster Boxes', 12)).toBe('HBZ-BST-012');
  });

  it('falls back to a generic prefix for unknown categories', () => {
    expect(buildSkuFromCategory('Accesorios Varios', 5)).toBe('HBZ-ACC-005');
  });
});

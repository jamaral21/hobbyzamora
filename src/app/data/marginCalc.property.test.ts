/**
 * Property-Based Tests for calcMargin and marginColor (Property 9)
 * Feature: shipments-erp
 *
 * Property 9: Margin calculation and color assignment
 * - Margin = (precioVenta - costoUnit) / precioVenta × 100
 * - Green if >30%, orange if >15%, red if ≤15%
 *
 * Validates: Requirements 14.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcMargin, marginColor } from './shipmentsMockData';

// ============================================================
// Property 9: Margin calculation and color assignment
// ============================================================

describe('Feature: shipments-erp, Property 9: Margin calculation and color assignment', () => {
  it('margin formula is correct for any precioVenta > 0 and costoUnit >= 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (precioVenta, costoUnit) => {
          const result = calcMargin(precioVenta, costoUnit);
          const expected = ((precioVenta - costoUnit) / precioVenta) * 100;
          expect(result).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns 0 when precioVenta is 0 or negative', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1_000_000, max: 0, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (precioVenta, costoUnit) => {
          const result = calcMargin(precioVenta, costoUnit);
          expect(result).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('margin is 100% when costoUnit is 0 and precioVenta > 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (precioVenta) => {
          const result = calcMargin(precioVenta, 0);
          expect(result).toBeCloseTo(100, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('margin is 0% when precioVenta equals costoUnit', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (price) => {
          const result = calcMargin(price, price);
          expect(result).toBeCloseTo(0, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('assigns green when margin > 30', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 30.001, max: 200, noNaN: true, noDefaultInfinity: true }),
        (margin) => {
          expect(marginColor(margin)).toBe('green');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('assigns orange when margin > 15 and <= 30', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 15.001, max: 30, noNaN: true, noDefaultInfinity: true }),
        (margin) => {
          expect(marginColor(margin)).toBe('orange');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('assigns red when margin <= 15', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 15, noNaN: true, noDefaultInfinity: true }),
        (margin) => {
          expect(marginColor(margin)).toBe('red');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('color boundaries are exact: 30 is orange, 15 is red', () => {
    // Exactly 30 is NOT > 30, so it should be orange
    expect(marginColor(30)).toBe('orange');
    // Exactly 15 is NOT > 15, so it should be red
    expect(marginColor(15)).toBe('red');
  });

  it('end-to-end: calcMargin + marginColor produce correct color for any valid stock entry', () => {
    fc.assert(
      fc.property(
        // precioVenta > 0
        fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        // costoUnit >= 0
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (precioVenta, costoUnit) => {
          const margin = calcMargin(precioVenta, costoUnit);
          const color = marginColor(margin);

          if (margin > 30) {
            expect(color).toBe('green');
          } else if (margin > 15) {
            expect(color).toBe('orange');
          } else {
            expect(color).toBe('red');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

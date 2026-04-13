/**
 * Property-Based Tests for Invoice Total Calculation (Property 4)
 * Feature: shipments-erp
 *
 * Property 4: Invoice total calculation follows the commission formula
 * - subtotalJPY = Σ(precioU × cant)
 * - totalJPY = subtotalJPY × (1 + comision/100)
 * - totalCLP = totalJPY / tc
 *
 * Validates: Requirements 6.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcInvoiceTotals } from './shipmentsMockData';

// ============================================================
// Generators
// ============================================================

const arbItem = fc.record({
  precioU: fc.integer({ min: 1, max: 100_000 }),
  cant: fc.integer({ min: 1, max: 500 }),
});

const arbItems = fc.array(arbItem, { minLength: 1, maxLength: 20 });

const arbComision = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });

/** Positive exchange rate (¥ per CLP) */
const arbTc = fc.double({ min: 0.01, max: 20, noNaN: true, noDefaultInfinity: true });

// ============================================================
// Property 4: Invoice total calculation follows the commission formula
// ============================================================

describe('Feature: shipments-erp, Property 4: Invoice total calculation follows the commission formula', () => {
  it('subtotalJPY equals the sum of precioU × cant for all items', () => {
    fc.assert(
      fc.property(arbItems, arbComision, arbTc, (items, comision, tc) => {
        const result = calcInvoiceTotals(items, comision, tc);
        const expectedSubtotal = items.reduce((sum, i) => sum + i.precioU * i.cant, 0);
        expect(result.subtotalJPY).toBe(expectedSubtotal);
      }),
      { numRuns: 200 },
    );
  });

  it('totalJPY equals subtotalJPY × (1 + comision/100)', () => {
    fc.assert(
      fc.property(arbItems, arbComision, arbTc, (items, comision, tc) => {
        const result = calcInvoiceTotals(items, comision, tc);
        const expectedTotal = result.subtotalJPY * (1 + comision / 100);
        expect(result.totalJPY).toBeCloseTo(expectedTotal, 6);
      }),
      { numRuns: 200 },
    );
  });

  it('totalCLP equals totalJPY / tc for positive tc', () => {
    fc.assert(
      fc.property(arbItems, arbComision, arbTc, (items, comision, tc) => {
        const result = calcInvoiceTotals(items, comision, tc);
        const expectedCLP = result.totalJPY / tc;
        expect(result.totalCLP).toBeCloseTo(expectedCLP, 6);
      }),
      { numRuns: 200 },
    );
  });

  it('totalCLP is 0 when tc is 0', () => {
    fc.assert(
      fc.property(arbItems, arbComision, (items, comision) => {
        const result = calcInvoiceTotals(items, comision, 0);
        expect(result.totalCLP).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('subtotalJPY is 0 for an empty items list', () => {
    fc.assert(
      fc.property(arbComision, arbTc, (comision, tc) => {
        const result = calcInvoiceTotals([], comision, tc);
        expect(result.subtotalJPY).toBe(0);
        expect(result.totalJPY).toBe(0);
        expect(result.totalCLP).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('with 0% commission, totalJPY equals subtotalJPY', () => {
    fc.assert(
      fc.property(arbItems, arbTc, (items, tc) => {
        const result = calcInvoiceTotals(items, 0, tc);
        expect(result.totalJPY).toBe(result.subtotalJPY);
      }),
      { numRuns: 200 },
    );
  });

  it('all returned values are non-negative for valid inputs', () => {
    fc.assert(
      fc.property(arbItems, arbComision, arbTc, (items, comision, tc) => {
        const result = calcInvoiceTotals(items, comision, tc);
        expect(result.subtotalJPY).toBeGreaterThanOrEqual(0);
        expect(result.totalJPY).toBeGreaterThanOrEqual(0);
        expect(result.totalCLP).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });

  it('single item: subtotalJPY = precioU × cant exactly', () => {
    fc.assert(
      fc.property(arbItem, arbComision, arbTc, (item, comision, tc) => {
        const result = calcInvoiceTotals([item], comision, tc);
        expect(result.subtotalJPY).toBe(item.precioU * item.cant);
      }),
      { numRuns: 200 },
    );
  });
});

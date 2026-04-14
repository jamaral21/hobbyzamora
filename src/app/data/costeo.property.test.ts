/**
 * Property-Based Tests for Costeo Calculations (Properties 6 & 7)
 * Feature: shipments-erp
 *
 * Property 6: Costo unitario calculation follows the distribution formula
 * - costoUnit = (subtotalCLP × pct/100 + fleteCLP × pct/100 + moCLP × pct/100
 *               + matCLP × pct/100 + internCLP × pct/100) / cant
 *
 * Property 7: Costeo percentages must sum to 100
 * - validateCosteoPercentages accepts iff sum ≈ 100
 *
 * Validates: Requirements 13.3, 13.4
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calcCostoUnitario, validateCosteoPercentages } from './shipmentsMockData';
import type { Box, BoxProduct, InternacionData } from './shipmentsMockData';

// ============================================================
// Generators
// ============================================================

const arbBoxProduct: fc.Arbitrary<BoxProduct> = fc.record({
  _compraId: fc.integer({ min: 1, max: 1000 }),
  _sku: fc.stringMatching(/^JP-\d{4}$/),
  nombre: fc.string({ minLength: 1, maxLength: 30 }),
  ean: fc.string({ minLength: 0, maxLength: 13 }),
  cant: fc.integer({ min: 1, max: 200 }),
  precioU: fc.integer({ min: 1, max: 100_000 }),
  tc: fc.double({ min: 0.01, max: 20, noNaN: true, noDefaultInfinity: true }),
});

const arbInternacion: fc.Arbitrary<InternacionData> = fc.record({
  arancel: fc.integer({ min: 0, max: 5_000_000 }),
  iva: fc.integer({ min: 0, max: 2_000_000 }),
  total: fc.integer({ min: 0, max: 7_000_000 }),
});

const arbBox: fc.Arbitrary<Box> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  fecha: fc.constantFrom('2024-06-15', '2025-01-10', '2025-07-20', '2026-03-05'),
  estado: fc.constantFrom('transito' as const, 'llegada' as const, 'costeada' as const),
  flete_jpy: fc.integer({ min: 0, max: 500_000 }),
  mo_horas: fc.integer({ min: 0, max: 100 }),
  mo_tarifa: fc.integer({ min: 0, max: 50_000 }),
  mat_jpy: fc.integer({ min: 0, max: 200_000 }),
  tc_envio: fc.double({ min: 0.01, max: 20, noNaN: true, noDefaultInfinity: true }),
  internacion: fc.option(arbInternacion, { nil: null }),
  productos: fc.array(arbBoxProduct, { minLength: 1, maxLength: 10 }),
});

/** Positive percentage (0, 100] */
const arbPct = fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true });

/** Positive quantity */
const arbCant = fc.integer({ min: 1, max: 500 });

// ============================================================
// Property 6: Costo unitario calculation follows the distribution formula
// ============================================================

describe('Feature: shipments-erp, Property 6: Costo unitario calculation follows the distribution formula', () => {
  it('costoUnit matches the manual distribution formula', () => {
    fc.assert(
      fc.property(arbBox, arbPct, arbCant, (box, pct, cant) => {
        const result = calcCostoUnitario(box, pct, cant);

        // Replicate the formula from the design doc
        const subtotalCLP = box.productos.reduce(
          (sum, p) => sum + p.precioU * p.cant * (1 / box.tc_envio),
          0,
        );
        const fleteCLP = box.flete_jpy / box.tc_envio;
        const moCLP = box.mo_horas * box.mo_tarifa;
        const matCLP = box.mat_jpy / box.tc_envio;
        const internCLP = box.internacion
          ? box.internacion.arancel + box.internacion.iva
          : 0;

        const pctFraction = pct / 100;
        const totalCost =
          subtotalCLP * pctFraction +
          fleteCLP * pctFraction +
          moCLP * pctFraction +
          matCLP * pctFraction +
          internCLP * pctFraction;

        const expected = Math.round(totalCost / cant);
        expect(result).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it('returns 0 when productCant is 0 or negative', () => {
    fc.assert(
      fc.property(
        arbBox,
        arbPct,
        fc.integer({ min: -100, max: 0 }),
        (box, pct, cant) => {
          expect(calcCostoUnitario(box, pct, cant)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns 0 when percentage is 0', () => {
    fc.assert(
      fc.property(arbBox, arbCant, (box, cant) => {
        expect(calcCostoUnitario(box, 0, cant)).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('result is non-negative for valid inputs', () => {
    fc.assert(
      fc.property(arbBox, arbPct, arbCant, (box, pct, cant) => {
        const result = calcCostoUnitario(box, pct, cant);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });

  it('cost scales linearly with percentage', () => {
    fc.assert(
      fc.property(arbBox, arbCant, (box, cant) => {
        const cost50 = calcCostoUnitario(box, 50, cant);
        const cost100 = calcCostoUnitario(box, 100, cant);
        // Due to rounding, allow ±1 difference
        expect(Math.abs(cost100 - 2 * cost50)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });

  it('without internacion, internCLP component is 0', () => {
    fc.assert(
      fc.property(arbBox, arbPct, arbCant, (box, pct, cant) => {
        const boxNoIntern = { ...box, internacion: null };
        const boxWithZeroIntern = {
          ...box,
          internacion: { arancel: 0, iva: 0, total: 0 },
        };
        expect(calcCostoUnitario(boxNoIntern, pct, cant)).toBe(
          calcCostoUnitario(boxWithZeroIntern, pct, cant),
        );
      }),
      { numRuns: 200 },
    );
  });
});

// ============================================================
// Property 7: Costeo percentages must sum to 100
// ============================================================

describe('Feature: shipments-erp, Property 7: Costeo percentages must sum to 100', () => {
  it('accepts when percentages sum to exactly 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.01, max: 99, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 10,
        }),
        (parts) => {
          const sum = parts.reduce((a, b) => a + b, 0);
          // Normalize so they sum to exactly 100
          const normalized = parts.map((p) => (p / sum) * 100);
          expect(validateCosteoPercentages(normalized)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects when percentages sum to less than 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.01, max: 50, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 5,
        }),
        (parts) => {
          const sum = parts.reduce((a, b) => a + b, 0);
          // Scale to sum to 99 (always < 100)
          const scaled = parts.map((p) => (p / sum) * 99);
          expect(validateCosteoPercentages(scaled)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects when percentages sum to more than 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.01, max: 50, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 5,
        }),
        (parts) => {
          const sum = parts.reduce((a, b) => a + b, 0);
          // Scale to sum to 101 (always > 100)
          const scaled = parts.map((p) => (p / sum) * 101);
          expect(validateCosteoPercentages(scaled)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('accepts a single element of 100', () => {
    expect(validateCosteoPercentages([100])).toBe(true);
  });

  it('rejects an empty array (sum is 0)', () => {
    expect(validateCosteoPercentages([])).toBe(false);
  });

  it('accepts two elements summing to 100', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 99.99, noNaN: true, noDefaultInfinity: true }),
        (a) => {
          const b = 100 - a;
          expect(validateCosteoPercentages([a, b])).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

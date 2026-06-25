/**
 * Property-Based Tests for SKU Generation (Property 3)
 * Feature: shipments-erp
 *
 * Property 3: SKU generation is sequential and well-formatted
 * - nextSku returns JP-XXXX pattern with numeric portion = max existing + 1
 * - Empty list returns JP-0001
 *
 * Validates: Requirements 3.6, 4.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  nextSku,
  type PurchaseRecord,
  type PaymentState,
  type LocationState,
} from './shipmentsDomain';

// ============================================================
// Generators
// ============================================================

const arbPaymentState: fc.Arbitrary<PaymentState> = fc.constantFrom(
  'por_pagar', 'esp_pago', 'pagado',
);

const arbLocationState: fc.Arbitrary<LocationState> = fc.constantFrom(
  'japon', 'transito', 'chile',
);

/**
 * Generates a PurchaseRecord with a specific SKU number.
 * The SKU follows the JP-XXXX format where XXXX is zero-padded.
 */
function arbPurchaseWithSkuNum(skuNum: fc.Arbitrary<number>): fc.Arbitrary<PurchaseRecord> {
  return fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    sku: skuNum.map((n) => `JP-${String(n).padStart(4, '0')}`),
    fecha: fc.constant('2026-03-15'),
    tipo: fc.constant('Producto'),
    nombre: fc.string({ minLength: 1, maxLength: 20 }),
    ean: fc.constant(''),
    tarjeta: fc.constant('Visa'),
    precioU: fc.integer({ min: 100, max: 50000 }),
    cant: fc.integer({ min: 1, max: 100 }),
    total: fc.integer({ min: 100, max: 5000000 }),
    estado: arbPaymentState,
    bodega: arbLocationState,
    tc: fc.oneof(fc.constant(null), fc.double({ min: 4, max: 10, noNaN: true })),
  });
}

// ============================================================
// Property 3: SKU generation is sequential and well-formatted
// ============================================================

describe('Feature: shipments-erp, Property 3: SKU generation is sequential and well-formatted', () => {
  it('returns JP-0001 for an empty purchase list', () => {
    expect(nextSku([])).toBe('JP-0001');
  });

  it('returns JP-XXXX pattern for any non-empty list of purchases', () => {
    fc.assert(
      fc.property(
        fc.array(
          arbPurchaseWithSkuNum(fc.integer({ min: 1, max: 9998 })),
          { minLength: 1, maxLength: 20 },
        ),
        (compras) => {
          const result = nextSku(compras);
          expect(result).toMatch(/^JP-\d{4,}$/);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('numeric portion equals max existing SKU number + 1', () => {
    fc.assert(
      fc.property(
        fc.array(
          arbPurchaseWithSkuNum(fc.integer({ min: 1, max: 9998 })),
          { minLength: 1, maxLength: 20 },
        ),
        (compras) => {
          const maxExisting = Math.max(
            ...compras.map((c) => parseInt(c.sku.replace(/\D/g, ''), 10)),
          );
          const result = nextSku(compras);
          const resultNum = parseInt(result.replace(/\D/g, ''), 10);
          expect(resultNum).toBe(maxExisting + 1);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('result is always strictly greater than any existing SKU number', () => {
    fc.assert(
      fc.property(
        fc.array(
          arbPurchaseWithSkuNum(fc.integer({ min: 1, max: 9998 })),
          { minLength: 1, maxLength: 30 },
        ),
        (compras) => {
          const result = nextSku(compras);
          const resultNum = parseInt(result.replace(/\D/g, ''), 10);
          for (const c of compras) {
            const existingNum = parseInt(c.sku.replace(/\D/g, ''), 10);
            expect(resultNum).toBeGreaterThan(existingNum);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('result is zero-padded to at least 4 digits', () => {
    fc.assert(
      fc.property(
        fc.array(
          arbPurchaseWithSkuNum(fc.integer({ min: 1, max: 999 })),
          { minLength: 0, maxLength: 15 },
        ),
        (compras) => {
          const result = nextSku(compras);
          // Extract the part after "JP-"
          const numPart = result.slice(3);
          expect(numPart.length).toBeGreaterThanOrEqual(4);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('single purchase with SKU JP-NNNN yields JP-(NNNN+1)', () => {
    fc.assert(
      fc.property(
        arbPurchaseWithSkuNum(fc.integer({ min: 1, max: 9998 })),
        (compra) => {
          const result = nextSku([compra]);
          const inputNum = parseInt(compra.sku.replace(/\D/g, ''), 10);
          const resultNum = parseInt(result.replace(/\D/g, ''), 10);
          expect(resultNum).toBe(inputNum + 1);
        },
      ),
      { numRuns: 200 },
    );
  });
});

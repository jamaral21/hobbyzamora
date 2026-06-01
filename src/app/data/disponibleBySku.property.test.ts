/**
 * Property-Based Tests for calcDisponibleBySku (Property 2)
 * Feature: shipments-erp
 *
 * Property 2: calcDisponibleBySku returns correct available units
 * - For any valid state and SKU, result equals compra.cant - unitsInActiveBoxes - unitsInChileStock
 * - Result is never negative
 *
 * Validates: Requirements 3.7, 5.1
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calcDisponibleBySku,
  type PurchaseRecord,
  type PaymentState,
  type LocationState,
  type Box,
  type BoxState,
  type BoxProduct,
  type ChileStockEntry,
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

const arbBoxState: fc.Arbitrary<BoxState> = fc.constantFrom(
  'transito', 'llegada', 'costeada',
);

/**
 * Generates a PurchaseRecord with a given SKU and a minimum quantity.
 */
function arbPurchaseForSku(sku: string, minCant: number): fc.Arbitrary<PurchaseRecord> {
  return fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    sku: fc.constant(sku),
    fecha: fc.constant('2026-03-15'),
    tipo: fc.constant('Producto'),
    nombre: fc.string({ minLength: 1, maxLength: 20 }),
    ean: fc.constant(''),
    tarjeta: fc.constant('Visa'),
    precioU: fc.integer({ min: 100, max: 50000 }),
    cant: fc.integer({ min: Math.max(1, minCant), max: Math.max(100, minCant + 50) }),
    total: fc.integer({ min: 100, max: 5000000 }),
    estado: arbPaymentState,
    bodega: arbLocationState,
    tc: fc.oneof(fc.constant(null), fc.double({ min: 4, max: 10, noNaN: true })),
  });
}

/**
 * Generates a BoxProduct referencing a specific SKU with a bounded quantity.
 */
function arbBoxProductForSku(sku: string, maxCant: number): fc.Arbitrary<BoxProduct> {
  return fc.record({
    _compraId: fc.integer({ min: 1, max: 10000 }),
    _sku: fc.constant(sku),
    nombre: fc.string({ minLength: 1, maxLength: 20 }),
    ean: fc.constant(''),
    cant: fc.integer({ min: 0, max: Math.max(0, maxCant) }),
    precioU: fc.integer({ min: 100, max: 50000 }),
    tc: fc.double({ min: 4, max: 10, noNaN: true }),
  });
}

/**
 * Generates a Box with a specific state and products for a given SKU.
 */
function arbBoxWithProducts(
  estado: BoxState,
  skuProducts: BoxProduct[],
): fc.Arbitrary<Box> {
  return fc.record({
    id: fc.string({ minLength: 3, maxLength: 10 }).map((s) => `BOX-${s}`),
    fecha: fc.constant('2026-03-15'),
    estado: fc.constant(estado),
    flete_jpy: fc.integer({ min: 0, max: 50000 }),
    mo_horas: fc.integer({ min: 0, max: 20 }),
    mo_tarifa: fc.integer({ min: 0, max: 10000 }),
    mat_jpy: fc.integer({ min: 0, max: 10000 }),
    tc_envio: fc.double({ min: 4, max: 10, noNaN: true }),
    internacion: fc.constant(null),
    productos: fc.constant(skuProducts),
  });
}

/**
 * Generates a ChileStockEntry for a specific SKU with a bounded quantity.
 */
function arbChileStockForSku(sku: string, maxCant: number): fc.Arbitrary<ChileStockEntry> {
  return fc.record({
    id: fc.string({ minLength: 3, maxLength: 10 }).map((s) => `STK-${s}`),
    _sku: fc.constant(sku),
    nombre: fc.string({ minLength: 1, maxLength: 20 }),
    ean: fc.constant(''),
    caja: fc.constant('BOX-1'),
    cant: fc.integer({ min: 0, max: Math.max(0, maxCant) }),
    costoUnit: fc.integer({ min: 100, max: 50000 }),
    precioVenta: fc.oneof(fc.constant(null), fc.integer({ min: 100, max: 100000 })),
  });
}

// ============================================================
// Property 2: calcDisponibleBySku returns correct available units
// ============================================================

describe('Feature: shipments-erp, Property 2: calcDisponibleBySku returns correct available units', () => {
  const TARGET_SKU = 'JP-0050';

  it('returns 0 when SKU is not found in compras', () => {
    fc.assert(
      fc.property(
        fc.array(arbBoxWithProducts('transito', []), { minLength: 0, maxLength: 5 }),
        fc.array(arbChileStockForSku('JP-9999', 10), { minLength: 0, maxLength: 5 }),
        (cajas, stockChile) => {
          const result = calcDisponibleBySku('JP-MISSING', [], cajas, stockChile);
          expect(result).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('result is never negative for any valid state', () => {
    fc.assert(
      fc.property(
        // Generate a purchase with some quantity
        fc.integer({ min: 1, max: 50 }).chain((purchaseCant) => {
          return fc.tuple(
            arbPurchaseForSku(TARGET_SKU, purchaseCant).map((p) => ({ ...p, cant: purchaseCant })),
            // Active boxes can have up to purchaseCant units total
            fc.array(
              arbBoxProductForSku(TARGET_SKU, purchaseCant),
              { minLength: 0, maxLength: 3 },
            ).chain((products) =>
              fc.tuple(
                fc.constant(products),
                arbBoxState,
              ),
            ),
            // Chile stock can have up to purchaseCant units total
            fc.array(
              arbChileStockForSku(TARGET_SKU, purchaseCant),
              { minLength: 0, maxLength: 3 },
            ),
          );
        }),
        (tuple) => {
          const [compra, [boxProducts, boxEstado], stockChile] = tuple;
          const box: Box = {
            id: 'BOX-TEST',
            fecha: '2026-03-15',
            estado: boxEstado,
            flete_jpy: 5000,
            mo_horas: 2,
            mo_tarifa: 5000,
            mat_jpy: 1000,
            tc_envio: 6.5,
            internacion: null,
            productos: boxProducts,
          };
          const result = calcDisponibleBySku(TARGET_SKU, [compra], [box], stockChile);
          expect(result).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('equals compra.cant - unitsInActiveBoxes - unitsInChileStock (clamped to 0)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }).chain((purchaseCant) => {
          // Generate deterministic quantities that we can verify
          return fc.tuple(
            fc.constant(purchaseCant),
            // Units in active (transito/llegada) boxes
            fc.array(fc.integer({ min: 0, max: purchaseCant }), { minLength: 0, maxLength: 3 }),
            // Units in costeada boxes (should NOT count)
            fc.array(fc.integer({ min: 0, max: purchaseCant }), { minLength: 0, maxLength: 2 }),
            // Units in Chile stock
            fc.array(fc.integer({ min: 0, max: purchaseCant }), { minLength: 0, maxLength: 3 }),
          );
        }),
        ([purchaseCant, activeBoxUnits, costeadaBoxUnits, chileStockUnits]) => {
          const compra: PurchaseRecord = {
            id: 1,
            sku: TARGET_SKU,
            fecha: '2026-03-15',
            tipo: 'Producto',
            nombre: 'Test Product',
            ean: '',
            tarjeta: 'Visa',
            precioU: 1000,
            cant: purchaseCant,
            total: purchaseCant * 1000,
            estado: 'pagado',
            bodega: 'japon',
            tc: 6.5,
          };

          // Build active boxes (transito/llegada) — these count
          const activeBoxes: Box[] = activeBoxUnits.map((cant, i) => ({
            id: `BOX-ACTIVE-${i}`,
            fecha: '2026-03-15',
            estado: (i % 2 === 0 ? 'transito' : 'llegada') as BoxState,
            flete_jpy: 5000,
            mo_horas: 2,
            mo_tarifa: 5000,
            mat_jpy: 1000,
            tc_envio: 6.5,
            internacion: null,
            productos: [{
              _compraId: 1,
              _sku: TARGET_SKU,
              nombre: 'Test Product',
              ean: '',
              cant,
              precioU: 1000,
              tc: 6.5,
            }],
          }));

          // Build costeada boxes — these should NOT count
          const costeadaBoxes: Box[] = costeadaBoxUnits.map((cant, i) => ({
            id: `BOX-COSTEADA-${i}`,
            fecha: '2026-03-15',
            estado: 'costeada' as BoxState,
            flete_jpy: 5000,
            mo_horas: 2,
            mo_tarifa: 5000,
            mat_jpy: 1000,
            tc_envio: 6.5,
            internacion: null,
            productos: [{
              _compraId: 1,
              _sku: TARGET_SKU,
              nombre: 'Test Product',
              ean: '',
              cant,
              precioU: 1000,
              tc: 6.5,
            }],
          }));

          const allBoxes = [...activeBoxes, ...costeadaBoxes];

          // Build Chile stock entries
          const stockChile: ChileStockEntry[] = chileStockUnits.map((cant, i) => ({
            id: `STK-${i}`,
            _sku: TARGET_SKU,
            nombre: 'Test Product',
            ean: '',
            caja: 'BOX-1',
            cant,
            costoUnit: 5000,
            precioVenta: null,
          }));

          const result = calcDisponibleBySku(TARGET_SKU, [compra], allBoxes, stockChile);

          // Expected: compra.cant - activeBoxUnits - chileStockUnits, clamped to 0
          const totalActiveBoxUnits = activeBoxUnits.reduce((s, n) => s + n, 0);
          const totalChileStockUnits = chileStockUnits.reduce((s, n) => s + n, 0);
          const expected = Math.max(0, purchaseCant - totalActiveBoxUnits - totalChileStockUnits);

          expect(result).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('costeada boxes do not reduce available units', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (purchaseCant, costeadaUnits) => {
          const compra: PurchaseRecord = {
            id: 1,
            sku: TARGET_SKU,
            fecha: '2026-03-15',
            tipo: 'Producto',
            nombre: 'Test Product',
            ean: '',
            tarjeta: 'Visa',
            precioU: 1000,
            cant: purchaseCant,
            total: purchaseCant * 1000,
            estado: 'pagado',
            bodega: 'japon',
            tc: 6.5,
          };

          const costeadaBox: Box = {
            id: 'BOX-COSTEADA',
            fecha: '2026-03-15',
            estado: 'costeada',
            flete_jpy: 5000,
            mo_horas: 2,
            mo_tarifa: 5000,
            mat_jpy: 1000,
            tc_envio: 6.5,
            internacion: null,
            productos: [{
              _compraId: 1,
              _sku: TARGET_SKU,
              nombre: 'Test Product',
              ean: '',
              cant: costeadaUnits,
              precioU: 1000,
              tc: 6.5,
            }],
          };

          const withCosteada = calcDisponibleBySku(TARGET_SKU, [compra], [costeadaBox], []);
          const withoutBoxes = calcDisponibleBySku(TARGET_SKU, [compra], [], []);

          // Costeada box should not affect the result
          expect(withCosteada).toBe(withoutBoxes);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns full purchase quantity when no boxes and no Chile stock exist', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (purchaseCant) => {
          const compra: PurchaseRecord = {
            id: 1,
            sku: TARGET_SKU,
            fecha: '2026-03-15',
            tipo: 'Producto',
            nombre: 'Test Product',
            ean: '',
            tarjeta: 'Visa',
            precioU: 1000,
            cant: purchaseCant,
            total: purchaseCant * 1000,
            estado: 'pagado',
            bodega: 'japon',
            tc: 6.5,
          };

          const result = calcDisponibleBySku(TARGET_SKU, [compra], [], []);
          expect(result).toBe(purchaseCant);
        },
      ),
      { numRuns: 100 },
    );
  });
});

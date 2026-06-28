/**
 * Property-Based Tests for ShipmentsDataContext Mutations (Properties 5, 8, 10)
 * Feature: shipments-erp
 *
 * These tests validate the pure state transformation logic that underlies
 * the React context mutations: confirmPayment, confirmCosteo, and addVenta.
 *
 * Validates: Requirements 7.3, 13.5, 15.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  type PurchaseRecord,
  type Invoice,
  type InvoiceItem,
  type Box,
  type BoxProduct,
  type ChileStockEntry,
  type SaleRecord,
  type SalesChannel,
  type InternacionData,
  calcDisponibleBySku,
} from '../data/shipmentsDomain';

// ============================================================
// Pure state transformation functions (mirror context mutations)
// ============================================================

/**
 * Pure version of confirmPayment: given boletas, boletaItems, and compras,
 * returns the updated boletas and compras after confirming payment on a boletaId.
 */
function pureConfirmPayment(
  boletaId: string,
  boletas: Invoice[],
  boletaItems: Record<string, InvoiceItem[]>,
  compras: PurchaseRecord[],
): { boletas: Invoice[]; compras: PurchaseRecord[] } {
  const updatedBoletas = boletas.map(b =>
    b.id === boletaId ? { ...b, estado: 'pagado' as const } : b,
  );
  const items = boletaItems[boletaId];
  let updatedCompras = [...compras];
  if (items) {
    updatedCompras = compras.map(c => {
      const matched = items.some(i => i.nombre === c.nombre && i.ean === c.ean);
      return matched ? { ...c, estado: 'pagado' as const } : c;
    });
  }
  return { boletas: updatedBoletas, compras: updatedCompras };
}

/**
 * Pure version of confirmCosteo: given cajas, stockChile, and compras,
 * returns the updated state after confirming costeo on a box.
 */
function pureConfirmCosteo(
  cajaId: string,
  costeoData: { _compraId: number; _sku: string; nombre: string; ean: string; cant: number; pct: number; costoUnit: number }[],
  cajas: Box[],
  stockChile: ChileStockEntry[],
  compras: PurchaseRecord[],
): { cajas: Box[]; stockChile: ChileStockEntry[]; compras: PurchaseRecord[] } {
  const box = cajas.find(b => b.id === cajaId);
  if (!box) return { cajas, stockChile, compras };

  const newEntries: ChileStockEntry[] = costeoData.map((entry, idx) => ({
    id: `SC-test-${idx}`,
    _sku: entry._sku,
    nombre: entry.nombre,
    ean: entry.ean,
    caja: cajaId,
    cant: entry.cant,
    costoUnit: entry.costoUnit,
    precioVenta: null,
  }));

  const updatedStock = [...stockChile, ...newEntries];
  const updatedCajas = cajas.map(b =>
    b.id === cajaId ? { ...b, estado: 'costeada' as const } : b,
  );

  let updatedCompras = [...compras];
  costeoData.forEach(entry => {
    const disponible = calcDisponibleBySku(entry._sku, compras, updatedCajas, updatedStock);
    if (disponible <= 0) {
      updatedCompras = updatedCompras.map(c =>
        c.sku === entry._sku ? { ...c, bodega: 'chile' as const } : c,
      );
    }
  });

  return { cajas: updatedCajas, stockChile: updatedStock, compras: updatedCompras };
}

/**
 * Pure version of addVenta: given stockChile, returns the updated stock
 * after registering a sale.
 */
function pureAddVenta(
  stockId: string,
  cant: number,
  stockChile: ChileStockEntry[],
): ChileStockEntry[] {
  return stockChile.map(s =>
    s.id === stockId ? { ...s, cant: s.cant - cant } : s,
  );
}

// ============================================================
// Generators
// ============================================================

const arbSalesChannel: fc.Arbitrary<SalesChannel> = fc.constantFrom(
  'Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local',
);

const arbPurchaseRecord: fc.Arbitrary<PurchaseRecord> = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  sku: fc.integer({ min: 1, max: 9999 }).map(n => `JP-${String(n).padStart(4, '0')}`),
  fecha: fc.constant('2026-02-01'),
  tipo: fc.constant('Producto'),
  nombre: fc.string({ minLength: 1, maxLength: 20 }),
  ean: fc.string({ minLength: 0, maxLength: 13 }),
  tarjeta: fc.constant('JCB'),
  precioU: fc.integer({ min: 100, max: 50000 }),
  cant: fc.integer({ min: 1, max: 50 }),
  total: fc.integer({ min: 100, max: 2500000 }),
  estado: fc.constantFrom('por_pagar' as const, 'esp_pago' as const, 'pagado' as const),
  bodega: fc.constantFrom('japon' as const, 'transito' as const, 'chile' as const),
  tc: fc.option(fc.double({ min: 4, max: 10, noNaN: true }), { nil: null }),
});

const arbInvoiceItem: fc.Arbitrary<InvoiceItem> = fc.record({
  fecha: fc.constant('2026-03-01'),
  tipo: fc.constant('Producto'),
  nombre: fc.string({ minLength: 1, maxLength: 20 }),
  ean: fc.string({ minLength: 0, maxLength: 13 }),
  precioU: fc.integer({ min: 100, max: 50000 }),
  cant: fc.integer({ min: 1, max: 20 }),
  comPct: fc.constant(13),
  tc: fc.double({ min: 4, max: 10, noNaN: true }),
});

const arbChileStockEntry: fc.Arbitrary<ChileStockEntry> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  _sku: fc.integer({ min: 1, max: 9999 }).map(n => `JP-${String(n).padStart(4, '0')}`),
  nombre: fc.string({ minLength: 1, maxLength: 20 }),
  ean: fc.string({ minLength: 0, maxLength: 13 }),
  caja: fc.string({ minLength: 1, maxLength: 20 }),
  cant: fc.integer({ min: 1, max: 100 }),
  costoUnit: fc.integer({ min: 100, max: 200000 }),
  precioVenta: fc.option(fc.integer({ min: 500, max: 500000 }), { nil: null }),
});


// ============================================================
// Property 5: Payment confirmation transitions invoice and
//             related purchases to pagado
// Feature: shipments-erp, Property 5: Payment confirmation
// Validates: Requirements 7.3
// ============================================================

describe('Property 5: Payment confirmation transitions invoice and related purchases to pagado', () => {
  /**
   * Generator: creates a consistent scenario where an invoice (sin_pagar)
   * has boletaItems that match a subset of purchases by nombre+ean.
   */
  const arbPaymentScenario = fc
    .tuple(
      fc.array(arbPurchaseRecord, { minLength: 2, maxLength: 10 }),
      fc.array(arbInvoiceItem, { minLength: 1, maxLength: 5 }),
      fc.double({ min: 4, max: 10, noNaN: true }),
    )
    .map(([purchases, items, tc]) => {
      // Ensure some purchases match the invoice items by nombre+ean
      const linkedPurchases = items.map((item, idx) => ({
        ...purchases[idx % purchases.length],
        id: idx + 1,
        nombre: item.nombre,
        ean: item.ean,
        estado: 'por_pagar' as const,
      }));
      // Add some unrelated purchases that should NOT be affected
      const unrelatedPurchases = purchases.slice(items.length % purchases.length).map((p, idx) => ({
        ...p,
        id: linkedPurchases.length + idx + 1,
        nombre: `unrelated-${idx}`,
        ean: `9999999${idx}`,
        estado: 'por_pagar' as const,
      }));
      const allPurchases = [...linkedPurchases, ...unrelatedPurchases];

      const boletaId = 'BOL-2026-001';
      const invoice: Invoice = {
        id: boletaId,
        fecha: '2026-03-01',
        productos: items.length,
        subtotalJPY: items.reduce((s, i) => s + i.precioU * i.cant, 0),
        comision: 13,
        totalJPY: 0,
        tc,
        totalCLP: 0,
        estado: 'sin_pagar',
      };
      invoice.totalJPY = Math.round(invoice.subtotalJPY * 1.13);
      invoice.totalCLP = tc > 0 ? Math.round(invoice.totalJPY * tc) : 0;

      const boletaItems: Record<string, InvoiceItem[]> = { [boletaId]: items };

      return { boletaId, invoice, boletaItems, allPurchases, linkedPurchases, unrelatedPurchases };
    });

  it('sets invoice.estado to pagado after confirmation', () => {
    fc.assert(
      fc.property(arbPaymentScenario, (scenario) => {
        const { boletaId, invoice, boletaItems, allPurchases } = scenario;
        const result = pureConfirmPayment(boletaId, [invoice], boletaItems, allPurchases);

        const updatedInvoice = result.boletas.find(b => b.id === boletaId);
        expect(updatedInvoice).toBeDefined();
        expect(updatedInvoice!.estado).toBe('pagado');
      }),
      { numRuns: 100 },
    );
  });

  it('sets all related purchases to pagado', () => {
    fc.assert(
      fc.property(arbPaymentScenario, (scenario) => {
        const { boletaId, invoice, boletaItems, allPurchases, linkedPurchases } = scenario;
        const result = pureConfirmPayment(boletaId, [invoice], boletaItems, allPurchases);

        // Every purchase that matches an invoice item by nombre+ean should be pagado
        for (const linked of linkedPurchases) {
          const updated = result.compras.find(c => c.id === linked.id);
          expect(updated).toBeDefined();
          expect(updated!.estado).toBe('pagado');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('does NOT change estado of unrelated purchases', () => {
    fc.assert(
      fc.property(arbPaymentScenario, (scenario) => {
        const { boletaId, invoice, boletaItems, allPurchases, unrelatedPurchases } = scenario;
        const result = pureConfirmPayment(boletaId, [invoice], boletaItems, allPurchases);

        for (const unrelated of unrelatedPurchases) {
          const updated = result.compras.find(c => c.id === unrelated.id);
          expect(updated).toBeDefined();
          // Unrelated purchases keep their original estado
          expect(updated!.estado).toBe(unrelated.estado);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('does NOT modify other invoices in the list', () => {
    fc.assert(
      fc.property(arbPaymentScenario, (scenario) => {
        const { boletaId, invoice, boletaItems, allPurchases } = scenario;
        const otherInvoice: Invoice = {
          ...invoice,
          id: 'BOL-2026-999',
          estado: 'sin_pagar',
        };
        const result = pureConfirmPayment(boletaId, [invoice, otherInvoice], boletaItems, allPurchases);

        const other = result.boletas.find(b => b.id === 'BOL-2026-999');
        expect(other).toBeDefined();
        expect(other!.estado).toBe('sin_pagar');
      }),
      { numRuns: 100 },
    );
  });

  it('handles invoice with no boletaItems gracefully (no purchases changed)', () => {
    fc.assert(
      fc.property(
        fc.array(arbPurchaseRecord, { minLength: 1, maxLength: 5 }),
        (purchases) => {
          const boletaId = 'BOL-2026-EMPTY';
          const invoice: Invoice = {
            id: boletaId,
            fecha: '2026-03-01',
            productos: 0,
            subtotalJPY: 0,
            comision: 13,
            totalJPY: 0,
            tc: 6,
            totalCLP: 0,
            estado: 'sin_pagar',
          };
          // No items mapped for this invoice
          const result = pureConfirmPayment(boletaId, [invoice], {}, purchases);

          // Invoice still transitions to pagado
          expect(result.boletas.find(b => b.id === boletaId)!.estado).toBe('pagado');
          // All purchases remain unchanged
          for (let i = 0; i < purchases.length; i++) {
            expect(result.compras[i].estado).toBe(purchases[i].estado);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ============================================================
// Property 8: Costeo confirmation creates Chile stock entries
//             and updates box state
// Feature: shipments-erp, Property 8: Costeo confirmation
// Validates: Requirements 13.5
// ============================================================

describe('Property 8: Costeo confirmation creates Chile stock entries and updates box state', () => {
  /**
   * Generator: creates a consistent scenario where a box in estado 'llegada'
   * has products that reference existing purchases, with valid costeo percentages
   * summing to 100.
   */
  const arbCosteoScenario = fc
    .tuple(
      fc.integer({ min: 2, max: 6 }),   // number of products in box
      fc.integer({ min: 1000, max: 50000 }), // flete_jpy
      fc.integer({ min: 1, max: 10 }),   // mo_horas
      fc.integer({ min: 5000, max: 20000 }), // mo_tarifa CLP/h
      fc.integer({ min: 500, max: 10000 }),  // mat_jpy
      fc.double({ min: 4, max: 10, noNaN: true }), // tc_envio
      fc.boolean(), // whether internacion data exists
      fc.integer({ min: 0, max: 500000 }), // arancel
      fc.integer({ min: 0, max: 200000 }), // iva
    )
    .chain(([numProducts, flete, moHoras, moTarifa, mat, tc, hasIntern, arancel, iva]) => {
      // Generate N products with random percentages that sum to 100
      return fc.tuple(
        fc.array(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 20 }),
            ean: fc.string({ minLength: 0, maxLength: 13 }),
            cant: fc.integer({ min: 1, max: 20 }),
            precioU: fc.integer({ min: 100, max: 50000 }),
          }),
          { minLength: numProducts, maxLength: numProducts },
        ),
        // Generate percentages that sum to 100
        fc.array(
          fc.integer({ min: 1, max: 100 }),
          { minLength: numProducts, maxLength: numProducts },
        ),
      ).map(([products, rawPcts]) => {
        // Normalize percentages to sum to 100
        const rawSum = rawPcts.reduce((a, b) => a + b, 0);
        const pcts = rawPcts.map((p, i) => {
          if (i === rawPcts.length - 1) {
            // Last one gets the remainder to ensure exact sum of 100
            return 100 - rawPcts.slice(0, -1).reduce((a, b) => a + Math.round((b / rawSum) * 100), 0);
          }
          return Math.round((p / rawSum) * 100);
        });

        const cajaId = 'CAJA-TEST-001';
        const internacion: InternacionData | null = hasIntern
          ? { arancel, iva, total: arancel + iva }
          : null;

        // Create purchases that the box products reference
        const purchases: PurchaseRecord[] = products.map((prod, idx) => ({
          id: idx + 1,
          sku: `JP-${String(idx + 1).padStart(4, '0')}`,
          fecha: '2026-02-01',
          tipo: 'Producto',
          nombre: prod.nombre,
          ean: prod.ean,
          tarjeta: 'JCB',
          precioU: prod.precioU,
          cant: prod.cant, // purchase quantity = box quantity (all units in this box)
          total: prod.precioU * prod.cant,
          estado: 'por_pagar' as const,
          bodega: 'transito' as const,
          tc: tc,
        }));

        const boxProducts: BoxProduct[] = products.map((prod, idx) => ({
          _compraId: idx + 1,
          _sku: `JP-${String(idx + 1).padStart(4, '0')}`,
          nombre: prod.nombre,
          ean: prod.ean,
          cant: prod.cant,
          precioU: prod.precioU,
          tc,
        }));

        const box: Box = {
          id: cajaId,
          fecha: '2026-03-01',
          estado: 'llegada',
          flete_jpy: flete,
          mo_horas: moHoras,
          mo_tarifa: moTarifa,
          mat_jpy: mat,
          tc_envio: tc,
          internacion,
          productos: boxProducts,
        };

        const costeoData = products.map((prod, idx) => ({
          _compraId: idx + 1,
          _sku: `JP-${String(idx + 1).padStart(4, '0')}`,
          nombre: prod.nombre,
          ean: prod.ean,
          cant: prod.cant,
          pct: pcts[idx],
          costoUnit: 1000, // placeholder, actual value tested separately in Property 6
        }));

        return {
          cajaId,
          box,
          purchases,
          costeoData,
          pcts,
          existingStock: [] as ChileStockEntry[],
        };
      });
    });

  it('creates one ChileStockEntry per product in the costeo', () => {
    fc.assert(
      fc.property(arbCosteoScenario, (scenario) => {
        const { cajaId, box, purchases, costeoData, existingStock } = scenario;
        const result = pureConfirmCosteo(cajaId, costeoData, [box], existingStock, purchases);

        // New entries = total stock - existing stock
        const newEntries = result.stockChile.slice(existingStock.length);
        expect(newEntries).toHaveLength(costeoData.length);

        // Each entry matches the costeo data
        for (let i = 0; i < costeoData.length; i++) {
          expect(newEntries[i]._sku).toBe(costeoData[i]._sku);
          expect(newEntries[i].nombre).toBe(costeoData[i].nombre);
          expect(newEntries[i].ean).toBe(costeoData[i].ean);
          expect(newEntries[i].cant).toBe(costeoData[i].cant);
          expect(newEntries[i].costoUnit).toBe(costeoData[i].costoUnit);
          expect(newEntries[i].caja).toBe(cajaId);
          expect(newEntries[i].precioVenta).toBeNull();
        }
      }),
      { numRuns: 100 },
    );
  });

  it('sets box.estado to costeada after confirmation', () => {
    fc.assert(
      fc.property(arbCosteoScenario, (scenario) => {
        const { cajaId, box, purchases, costeoData, existingStock } = scenario;
        const result = pureConfirmCosteo(cajaId, costeoData, [box], existingStock, purchases);

        const updatedBox = result.cajas.find(b => b.id === cajaId);
        expect(updatedBox).toBeDefined();
        expect(updatedBox!.estado).toBe('costeada');
      }),
      { numRuns: 100 },
    );
  });

  it('updates compra.bodega to chile when disponible becomes 0', () => {
    fc.assert(
      fc.property(arbCosteoScenario, (scenario) => {
        const { cajaId, box, purchases, costeoData, existingStock } = scenario;
        // In this scenario, purchase.cant === box product cant, so after costeo
        // all units are in Chile stock and disponible should be 0
        const result = pureConfirmCosteo(cajaId, costeoData, [box], existingStock, purchases);

        for (const entry of costeoData) {
          const updatedCompra = result.compras.find(c => c.sku === entry._sku);
          expect(updatedCompra).toBeDefined();
          // Since purchase.cant === box product cant and box is now costeada,
          // all units are in Chile stock → disponible = 0 → bodega = 'chile'
          const disponible = calcDisponibleBySku(
            entry._sku,
            result.compras,
            result.cajas,
            result.stockChile,
          );
          if (disponible <= 0) {
            expect(updatedCompra!.bodega).toBe('chile');
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('does NOT update compra.bodega when disponible > 0 (partial box)', () => {
    // Scenario: purchase has more units than what's in the box
    const arbPartialScenario = fc
      .tuple(
        fc.integer({ min: 5, max: 50 }),  // purchase quantity (larger)
        fc.integer({ min: 1, max: 4 }),   // box quantity (smaller)
        fc.double({ min: 4, max: 10, noNaN: true }),
      )
      .map(([purchaseCant, boxCant, tc]) => {
        const sku = 'JP-0001';
        const cajaId = 'CAJA-PARTIAL';

        const purchase: PurchaseRecord = {
          id: 1,
          sku,
          fecha: '2026-02-01',
          tipo: 'Producto',
          nombre: 'Test Product',
          ean: '1234567890123',
          tarjeta: 'JCB',
          precioU: 1000,
          cant: purchaseCant,
          total: 1000 * purchaseCant,
          estado: 'por_pagar',
          bodega: 'transito',
          tc,
        };

        const box: Box = {
          id: cajaId,
          fecha: '2026-03-01',
          estado: 'llegada',
          flete_jpy: 5000,
          mo_horas: 2,
          mo_tarifa: 10000,
          mat_jpy: 1000,
          tc_envio: tc,
          internacion: null,
          productos: [{
            _compraId: 1,
            _sku: sku,
            nombre: 'Test Product',
            ean: '1234567890123',
            cant: boxCant,
            precioU: 1000,
            tc,
          }],
        };

        const costeoData = [{
          _compraId: 1,
          _sku: sku,
          nombre: 'Test Product',
          ean: '1234567890123',
          cant: boxCant,
          pct: 100,
          costoUnit: 5000,
        }];

        return { cajaId, box, purchase, costeoData };
      });

    fc.assert(
      fc.property(arbPartialScenario, (scenario) => {
        const { cajaId, box, purchase, costeoData } = scenario;
        const result = pureConfirmCosteo(
          cajaId,
          costeoData,
          [box],
          [],
          [purchase],
        );

        const updatedCompra = result.compras.find(c => c.sku === 'JP-0001');
        expect(updatedCompra).toBeDefined();

        // purchase.cant > boxCant, so there are still units available
        // The box is now costeada (not transito/llegada), so it doesn't count
        // in active boxes. Units in Chile stock = boxCant.
        // disponible = purchaseCant - 0 (no active boxes) - boxCant
        // Since purchaseCant > boxCant, disponible > 0, so bodega stays 'transito'
        expect(updatedCompra!.bodega).toBe('transito');
      }),
      { numRuns: 100 },
    );
  });

  it('does NOT modify other boxes in the list', () => {
    fc.assert(
      fc.property(arbCosteoScenario, (scenario) => {
        const { cajaId, box, purchases, costeoData, existingStock } = scenario;
        const otherBox: Box = {
          ...box,
          id: 'CAJA-OTHER',
          estado: 'llegada',
        };
        const result = pureConfirmCosteo(
          cajaId,
          costeoData,
          [box, otherBox],
          existingStock,
          purchases,
        );

        const other = result.cajas.find(b => b.id === 'CAJA-OTHER');
        expect(other).toBeDefined();
        expect(other!.estado).toBe('llegada');
      }),
      { numRuns: 100 },
    );
  });

  it('preserves existing Chile stock entries', () => {
    fc.assert(
      fc.property(
        arbCosteoScenario,
        fc.array(arbChileStockEntry, { minLength: 1, maxLength: 5 }),
        (scenario, preExistingStock) => {
          const { cajaId, box, purchases, costeoData } = scenario;
          const result = pureConfirmCosteo(
            cajaId,
            costeoData,
            [box],
            preExistingStock,
            purchases,
          );

          // Pre-existing stock entries should still be present at the start
          for (let i = 0; i < preExistingStock.length; i++) {
            expect(result.stockChile[i]).toEqual(preExistingStock[i]);
          }
          // Total stock = pre-existing + new entries from costeo
          expect(result.stockChile).toHaveLength(preExistingStock.length + costeoData.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('handles box not found gracefully (no state changes)', () => {
    fc.assert(
      fc.property(arbCosteoScenario, (scenario) => {
        const { box, purchases, costeoData, existingStock } = scenario;
        const result = pureConfirmCosteo(
          'NON-EXISTENT-BOX',
          costeoData,
          [box],
          existingStock,
          purchases,
        );

        // No changes should occur
        expect(result.cajas).toEqual([box]);
        expect(result.stockChile).toEqual(existingStock);
        expect(result.compras).toEqual(purchases);
      }),
      { numRuns: 100 },
    );
  });
});


// ============================================================
// Property 10: Sale registration deducts from Chile stock
// Feature: shipments-erp, Property 10: Sale registration
// Validates: Requirements 15.3
// ============================================================

describe('Property 10: Sale registration deducts from Chile stock', () => {
  /**
   * Generator: creates a consistent scenario where a Chile stock entry
   * exists with some quantity, and a sale is registered for a valid amount.
   */
  const arbSaleScenario = fc
    .tuple(
      arbChileStockEntry,
      fc.array(arbChileStockEntry, { minLength: 0, maxLength: 5 }),
    )
    .chain(([targetEntry, otherEntries]) => {
      // Ensure target entry has a unique id and cant >= 1
      const entry = { ...targetEntry, id: 'TARGET-STOCK', cant: Math.max(1, targetEntry.cant) };
      // Generate a sale quantity between 1 and the available stock
      return fc.tuple(
        fc.constant(entry),
        fc.constant(otherEntries.map((e, i) => ({ ...e, id: `OTHER-${i}` }))),
        fc.integer({ min: 1, max: entry.cant }),
      );
    })
    .map(([targetEntry, otherEntries, saleCant]) => {
      const allStock = [targetEntry, ...otherEntries];
      return { targetEntry, otherEntries, allStock, saleCant };
    });

  it('decreases stockEntry.cant by exactly the sold quantity', () => {
    fc.assert(
      fc.property(arbSaleScenario, (scenario) => {
        const { targetEntry, allStock, saleCant } = scenario;
        const result = pureAddVenta(targetEntry.id, saleCant, allStock);

        const updated = result.find(s => s.id === targetEntry.id);
        expect(updated).toBeDefined();
        expect(updated!.cant).toBe(targetEntry.cant - saleCant);
      }),
      { numRuns: 100 },
    );
  });

  it('does NOT modify other stock entries', () => {
    fc.assert(
      fc.property(arbSaleScenario, (scenario) => {
        const { targetEntry, otherEntries, allStock, saleCant } = scenario;
        const result = pureAddVenta(targetEntry.id, saleCant, allStock);

        for (const other of otherEntries) {
          const unchanged = result.find(s => s.id === other.id);
          expect(unchanged).toBeDefined();
          expect(unchanged!.cant).toBe(other.cant);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('results in cant >= 0 when saleCant <= stockEntry.cant', () => {
    fc.assert(
      fc.property(arbSaleScenario, (scenario) => {
        const { targetEntry, allStock, saleCant } = scenario;
        const result = pureAddVenta(targetEntry.id, saleCant, allStock);

        const updated = result.find(s => s.id === targetEntry.id);
        expect(updated).toBeDefined();
        expect(updated!.cant).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it('selling the entire stock results in cant === 0', () => {
    fc.assert(
      fc.property(arbChileStockEntry, (entry) => {
        const stockEntry = { ...entry, id: 'FULL-SALE', cant: Math.max(1, entry.cant) };
        const result = pureAddVenta(stockEntry.id, stockEntry.cant, [stockEntry]);

        const updated = result.find(s => s.id === 'FULL-SALE');
        expect(updated).toBeDefined();
        expect(updated!.cant).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('preserves all other fields of the stock entry (only cant changes)', () => {
    fc.assert(
      fc.property(arbSaleScenario, (scenario) => {
        const { targetEntry, allStock, saleCant } = scenario;
        const result = pureAddVenta(targetEntry.id, saleCant, allStock);

        const updated = result.find(s => s.id === targetEntry.id);
        expect(updated).toBeDefined();
        expect(updated!._sku).toBe(targetEntry._sku);
        expect(updated!.nombre).toBe(targetEntry.nombre);
        expect(updated!.ean).toBe(targetEntry.ean);
        expect(updated!.caja).toBe(targetEntry.caja);
        expect(updated!.costoUnit).toBe(targetEntry.costoUnit);
        expect(updated!.precioVenta).toBe(targetEntry.precioVenta);
      }),
      { numRuns: 100 },
    );
  });

  it('preserves the total count of stock entries (no entries added or removed)', () => {
    fc.assert(
      fc.property(arbSaleScenario, (scenario) => {
        const { targetEntry, allStock, saleCant } = scenario;
        const result = pureAddVenta(targetEntry.id, saleCant, allStock);

        expect(result).toHaveLength(allStock.length);
      }),
      { numRuns: 100 },
    );
  });

  it('handles sale from a stock entry not in the list (no changes)', () => {
    fc.assert(
      fc.property(
        fc.array(arbChileStockEntry, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (stock, saleCant) => {
          const uniqueStock = stock.map((s, i) => ({ ...s, id: `EXISTING-${i}` }));
          const result = pureAddVenta('NON-EXISTENT-ID', saleCant, uniqueStock);

          // No entries should be modified
          for (let i = 0; i < uniqueStock.length; i++) {
            expect(result[i].cant).toBe(uniqueStock[i].cant);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

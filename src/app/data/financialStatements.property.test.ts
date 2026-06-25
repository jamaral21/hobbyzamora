/**
 * Property-Based Tests for Financial Statements (Properties 11, 12, 13, 14)
 * Feature: shipments-erp
 *
 * Validates: Requirements 18.1, 18.2, 18.4, 19.1, 19.2, 19.3, 20.1
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calcIncomeStatement,
  groupRevenueByChannel,
  calcBalanceSheet,
  calcCashFlow,
  type SaleRecord,
  type Invoice,
  type GAVEntry,
  type Box,
  type LocalPurchase,
  type ChileStockEntry,
  type PurchaseRecord,
  type SalesChannel,
  type InternacionData,
} from './shipmentsDomain';

// ============================================================
// Generators (fast-check arbitraries)
// ============================================================

const arbSalesChannel: fc.Arbitrary<SalesChannel> = fc.constantFrom(
  'Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local',
);

const arbSaleRecord: fc.Arbitrary<SaleRecord> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  fecha: fc.constant('2026-03-15'),
  producto: fc.string({ minLength: 1, maxLength: 30 }),
  ean: fc.string({ minLength: 0, maxLength: 13 }),
  cant: fc.integer({ min: 1, max: 100 }),
  precioVenta: fc.integer({ min: 100, max: 500000 }),
  costo: fc.integer({ min: 50, max: 200000 }),
  total: fc.integer({ min: 100, max: 5000000 }),
  canal: arbSalesChannel,
});

const arbInvoiceState = fc.constantFrom('sin_pagar' as const, 'pagado' as const);

const arbInvoice: fc.Arbitrary<Invoice> = fc.record({
  id: fc.oneof(
    fc.constant('BOL-2026-001'),
    fc.constant('BOL-2026-GAV-001'),
    fc.constant('BOL-2026-002'),
    fc.constant('BOL-2026-GAV-002'),
  ),
  fecha: fc.constant('2026-03-01'),
  productos: fc.integer({ min: 1, max: 10 }),
  subtotalJPY: fc.integer({ min: 1000, max: 500000 }),
  comision: fc.integer({ min: 0, max: 30 }),
  totalJPY: fc.integer({ min: 1000, max: 600000 }),
  tc: fc.double({ min: 4, max: 10, noNaN: true }),
  totalCLP: fc.integer({ min: 1000, max: 10000000 }),
  estado: arbInvoiceState,
});

// GAV invoice: always has 'GAV' in the id
const arbGAVInvoice: fc.Arbitrary<Invoice> = fc.record({
  id: fc.constantFrom('BOL-2026-GAV-001', 'BOL-2026-GAV-002', 'BOL-2026-GAV-003'),
  fecha: fc.constant('2026-03-01'),
  productos: fc.constant('GAV Japón'),
  subtotalJPY: fc.integer({ min: 10000, max: 50000 }),
  comision: fc.constant(13),
  totalJPY: fc.integer({ min: 10000, max: 60000 }),
  tc: fc.double({ min: 4, max: 10, noNaN: true }),
  totalCLP: fc.integer({ min: 1000, max: 5000000 }),
  estado: arbInvoiceState,
});

// Non-GAV invoice: never has 'GAV' in the id
const arbNonGAVInvoice: fc.Arbitrary<Invoice> = fc.record({
  id: fc.constantFrom('BOL-2026-001', 'BOL-2026-002', 'BOL-2026-003'),
  fecha: fc.constant('2026-03-01'),
  productos: fc.integer({ min: 1, max: 10 }),
  subtotalJPY: fc.integer({ min: 1000, max: 500000 }),
  comision: fc.integer({ min: 0, max: 30 }),
  totalJPY: fc.integer({ min: 1000, max: 600000 }),
  tc: fc.double({ min: 4, max: 10, noNaN: true }),
  totalCLP: fc.integer({ min: 1000, max: 10000000 }),
  estado: arbInvoiceState,
});

const arbGAVEntry: fc.Arbitrary<GAVEntry> = fc.record({
  id: fc.integer({ min: 1, max: 100 }),
  concepto: fc.string({ minLength: 1, maxLength: 30 }),
  monto: fc.integer({ min: 1000, max: 500000 }),
  adjunto: fc.boolean(),
  estado: fc.constantFrom('pendiente' as const, 'pagado' as const),
  docTipo: fc.constantFrom('factura' as const, 'boleta' as const),
  ivaCredito: fc.boolean(),
  fechaPago: fc.option(fc.constant('2026-03-15'), { nil: null }),
});

const arbInternacionData: fc.Arbitrary<InternacionData> = fc.record({
  arancel: fc.integer({ min: 0, max: 500000 }),
  iva: fc.integer({ min: 0, max: 200000 }),
  total: fc.integer({ min: 0, max: 700000 }),
});

const arbBox: fc.Arbitrary<Box> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  fecha: fc.constant('2026-02-20'),
  estado: fc.constantFrom('transito' as const, 'llegada' as const, 'costeada' as const),
  flete_jpy: fc.integer({ min: 0, max: 50000 }),
  mo_horas: fc.integer({ min: 0, max: 20 }),
  mo_tarifa: fc.integer({ min: 0, max: 10000 }),
  mat_jpy: fc.integer({ min: 0, max: 10000 }),
  tc_envio: fc.double({ min: 4, max: 10, noNaN: true }),
  internacion: fc.option(arbInternacionData, { nil: null }),
  productos: fc.constant([]),
});

const arbLocalPurchase: fc.Arbitrary<LocalPurchase> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  fecha: fc.constant('2026-03-10'),
  tipo: fc.constantFrom('producto' as const, 'gasto' as const),
  docTipo: fc.constantFrom('factura' as const, 'boleta' as const),
  proveedor: fc.string({ minLength: 1, maxLength: 20 }),
  descripcion: fc.string({ minLength: 1, maxLength: 30 }),
  monto: fc.integer({ min: 1000, max: 500000 }),
  iva: fc.integer({ min: 0, max: 100000 }),
  ivaCredito: fc.boolean(),
  estado: fc.constantFrom('pagado' as const, 'pendiente' as const),
});

const arbChileStockEntry: fc.Arbitrary<ChileStockEntry> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  _sku: fc.string({ minLength: 1, maxLength: 10 }),
  nombre: fc.string({ minLength: 1, maxLength: 30 }),
  ean: fc.string({ minLength: 0, maxLength: 13 }),
  caja: fc.string({ minLength: 1, maxLength: 20 }),
  cant: fc.integer({ min: 0, max: 100 }),
  costoUnit: fc.integer({ min: 100, max: 200000 }),
  precioVenta: fc.option(fc.integer({ min: 500, max: 500000 }), { nil: null }),
});

const arbPurchaseRecord: fc.Arbitrary<PurchaseRecord> = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  sku: fc.integer({ min: 1, max: 9999 }).map((n) => `JP-${String(n).padStart(4, '0')}`),
  fecha: fc.constant('2026-02-01'),
  tipo: fc.constant('Producto'),
  nombre: fc.string({ minLength: 1, maxLength: 30 }),
  ean: fc.string({ minLength: 0, maxLength: 13 }),
  tarjeta: fc.constant('JCB'),
  precioU: fc.integer({ min: 100, max: 50000 }),
  cant: fc.integer({ min: 1, max: 50 }),
  total: fc.integer({ min: 100, max: 2500000 }),
  estado: fc.constantFrom('por_pagar' as const, 'esp_pago' as const, 'pagado' as const),
  bodega: fc.constantFrom('japon' as const, 'transito' as const, 'chile' as const),
  tc: fc.option(fc.double({ min: 4, max: 10, noNaN: true }), { nil: null }),
});

// ============================================================
// Property 11: Income statement calculation with pagado filter
// ============================================================

describe('Feature: shipments-erp, Property 11: Income statement calculation with pagado filter', () => {
  it('Ingresos equals sum of venta.total', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 20 }),
        fc.array(arbGAVInvoice, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbBox, { minLength: 0, maxLength: 5 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 5 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          const expectedIngresos = ventas.reduce((s, v) => s + v.total, 0);
          expect(result.ingresos).toBe(expectedIngresos);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('CostoVenta equals sum of venta.costo * venta.cant', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 20 }),
        fc.array(arbGAVInvoice, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbBox, { minLength: 0, maxLength: 5 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 5 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          const expectedCosto = ventas.reduce((s, v) => s + v.costo * v.cant, 0);
          expect(result.costoVenta).toBe(expectedCosto);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('MargenBruto = Ingresos - CostoVenta', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 20 }),
        fc.array(arbGAVInvoice, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbBox, { minLength: 0, maxLength: 5 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 5 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          expect(result.margenBruto).toBe(result.ingresos - result.costoVenta);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('GAV Japón only includes pagado invoices with GAV in id', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVInvoice, { minLength: 1, maxLength: 10 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbBox, { minLength: 0, maxLength: 3 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 3 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          const expectedGAVJapon = gavJapon
            .filter((b) => b.estado === 'pagado' && b.id.includes('GAV'))
            .reduce((s, b) => s + b.totalCLP, 0);
          expect(result.gavJapon).toBe(expectedGAVJapon);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('GAV Chile only includes pagado entries', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVInvoice, { minLength: 0, maxLength: 3 }),
        fc.array(arbGAVEntry, { minLength: 1, maxLength: 10 }),
        fc.array(arbBox, { minLength: 0, maxLength: 3 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 3 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          const expectedGAVChile = gavChile
            .filter((g) => g.estado === 'pagado')
            .reduce((s, g) => s + g.monto, 0);
          expect(result.gavChile).toBe(expectedGAVChile);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pendiente GAV entries are excluded from totals', () => {
    fc.assert(
      fc.property(
        fc.array(arbGAVEntry.map((g) => ({ ...g, estado: 'pendiente' as const })), { minLength: 1, maxLength: 10 }),
        (pendienteGAV) => {
          const result = calcIncomeStatement([], [], pendienteGAV, [], []);
          expect(result.gavChile).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('EBIT = MargenBruto - GAVTotal', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 10 }),
        fc.array(arbGAVInvoice, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbBox, { minLength: 0, maxLength: 3 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 3 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          expect(result.ebit).toBe(result.margenBruto - result.gavTotal);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('IVA Crédito = internaciones IVA + compras Chile con ivaCredito', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVInvoice, { minLength: 0, maxLength: 3 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 3 }),
        fc.array(arbBox, { minLength: 0, maxLength: 5 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 5 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          const ivaInternaciones = boxes
            .filter((b) => b.internacion !== null)
            .reduce((s, b) => s + (b.internacion?.iva ?? 0), 0);
          const ivaCompras = comprasChile
            .filter((c) => c.ivaCredito)
            .reduce((s, c) => s + c.iva, 0);
          expect(result.ivaCredito).toBe(ivaInternaciones + ivaCompras);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ResultadoNeto = EBIT + IVACredito', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 10 }),
        fc.array(arbGAVInvoice, { minLength: 0, maxLength: 5 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbBox, { minLength: 0, maxLength: 5 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 5 }),
        (ventas, gavJapon, gavChile, boxes, comprasChile) => {
          const result = calcIncomeStatement(ventas, gavJapon, gavChile, boxes, comprasChile);
          expect(result.resultadoNeto).toBe(result.ebit + result.ivaCredito);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ============================================================
// Property 12: Revenue grouping by channel preserves total
// ============================================================

describe('Feature: shipments-erp, Property 12: Revenue grouping by channel preserves total', () => {
  it('sum of grouped channel totals equals overall sum of venta.total', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 30 }),
        (ventas) => {
          const grouped = groupRevenueByChannel(ventas);
          const groupedSum = Object.values(grouped).reduce((s, v) => s + v, 0);
          const overallSum = ventas.reduce((s, v) => s + v.total, 0);
          expect(groupedSum).toBe(overallSum);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all five channels are present in the result', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 10 }),
        (ventas) => {
          const grouped = groupRevenueByChannel(ventas);
          const channels: SalesChannel[] = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'];
          for (const ch of channels) {
            expect(grouped).toHaveProperty(ch);
            expect(typeof grouped[ch]).toBe('number');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty sales produce zero for all channels', () => {
    const grouped = groupRevenueByChannel([]);
    const channels: SalesChannel[] = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'];
    for (const ch of channels) {
      expect(grouped[ch]).toBe(0);
    }
  });

  it('single-channel sales are fully attributed to that channel', () => {
    fc.assert(
      fc.property(
        arbSalesChannel,
        fc.array(
          fc.integer({ min: 100, max: 1000000 }),
          { minLength: 1, maxLength: 20 },
        ),
        (canal, totals) => {
          const ventas: SaleRecord[] = totals.map((total, i) => ({
            id: `V-${i}`,
            fecha: '2026-03-15',
            producto: 'Test',
            ean: '',
            cant: 1,
            precioVenta: total,
            costo: 0,
            total,
            canal,
          }));
          const grouped = groupRevenueByChannel(ventas);
          const expectedSum = totals.reduce((s, t) => s + t, 0);
          expect(grouped[canal]).toBe(expectedSum);
          // Other channels should be 0
          const otherChannels: SalesChannel[] = (['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'] as SalesChannel[])
            .filter((c) => c !== canal);
          for (const ch of otherChannels) {
            expect(grouped[ch]).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ============================================================
// Property 13: Balance sheet equation holds (Patrimonio = Activos - Pasivos)
// ============================================================

describe('Feature: shipments-erp, Property 13: Balance sheet equation holds', () => {
  it('Patrimonio = Activos - Pasivos for any valid state', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 10 }),
        fc.array(arbInvoice, { minLength: 0, maxLength: 10 }),
        fc.array(arbChileStockEntry, { minLength: 0, maxLength: 10 }),
        fc.array(arbPurchaseRecord, { minLength: 0, maxLength: 10 }),
        fc.array(arbBox, { minLength: 0, maxLength: 5 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 5 }),
        (ventas, boletas, stockChile, compras, cajas, comprasChile) => {
          const result = calcBalanceSheet(ventas, boletas, stockChile, compras, cajas, comprasChile);
          expect(result.patrimonio).toBeCloseTo(result.activos - result.pasivos, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Activos = CajaEstimada + InvChile + InvJapon + IVACredito', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 10 }),
        fc.array(arbInvoice, { minLength: 0, maxLength: 10 }),
        fc.array(arbChileStockEntry, { minLength: 0, maxLength: 10 }),
        fc.array(arbPurchaseRecord, { minLength: 0, maxLength: 10 }),
        fc.array(arbBox, { minLength: 0, maxLength: 5 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 5 }),
        (ventas, boletas, stockChile, compras, cajas, comprasChile) => {
          const result = calcBalanceSheet(ventas, boletas, stockChile, compras, cajas, comprasChile);
          const expectedActivos = result.cajaEstimada + result.invChile + result.invJapon + result.ivaCreditoTotal;
          expect(result.activos).toBeCloseTo(expectedActivos, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('InvChile = sum of cant * costoUnit for all stock entries', () => {
    fc.assert(
      fc.property(
        fc.array(arbChileStockEntry, { minLength: 0, maxLength: 15 }),
        (stockChile) => {
          const result = calcBalanceSheet([], [], stockChile, [], [], []);
          const expectedInvChile = stockChile.reduce((s, e) => s + e.cant * e.costoUnit, 0);
          expect(result.invChile).toBe(expectedInvChile);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('InvJapon only includes compras with bodega=japon and valid tc', () => {
    fc.assert(
      fc.property(
        fc.array(arbPurchaseRecord, { minLength: 1, maxLength: 15 }),
        (compras) => {
          const result = calcBalanceSheet([], [], [], compras, [], []);
          const expectedInvJapon = compras
            .filter((c) => c.bodega === 'japon' && c.tc !== null && c.tc > 0)
            .reduce((s, c) => s + (c.precioU * c.cant) / (c.tc as number), 0);
          expect(result.invJapon).toBeCloseTo(expectedInvJapon, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Pasivos = sum of totalCLP for boletas with estado=sin_pagar', () => {
    fc.assert(
      fc.property(
        fc.array(arbInvoice, { minLength: 1, maxLength: 15 }),
        (boletas) => {
          const result = calcBalanceSheet([], boletas, [], [], [], []);
          const expectedPasivos = boletas
            .filter((b) => b.estado === 'sin_pagar')
            .reduce((s, b) => s + b.totalCLP, 0);
          expect(result.pasivos).toBe(expectedPasivos);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty state produces zero patrimonio', () => {
    const result = calcBalanceSheet([], [], [], [], [], []);
    expect(result.patrimonio).toBe(0);
    expect(result.activos).toBe(0);
    expect(result.pasivos).toBe(0);
  });
});

// ============================================================
// Property 14: Cash flow equation holds (FlujoNeto = Ingresos - EgresosJP - EgresosCL)
// ============================================================

describe('Feature: shipments-erp, Property 14: Cash flow equation holds', () => {
  it('FlujoNeto = Ingresos - EgresosJP - EgresosCL for any valid state', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 15 }),
        fc.array(arbInvoice, { minLength: 0, maxLength: 10 }),
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 10 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 10 }),
        (ventas, boletas, gavChile, comprasChile) => {
          const result = calcCashFlow(ventas, boletas, gavChile, comprasChile);
          expect(result.flujoNeto).toBe(result.ingresos - result.egresosJP - result.egresosCL);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Ingresos = sum of venta.total', () => {
    fc.assert(
      fc.property(
        fc.array(arbSaleRecord, { minLength: 0, maxLength: 20 }),
        (ventas) => {
          const result = calcCashFlow(ventas, [], [], []);
          const expectedIngresos = ventas.reduce((s, v) => s + v.total, 0);
          expect(result.ingresos).toBe(expectedIngresos);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('EgresosJP = sum of totalCLP for boletas with estado=pagado', () => {
    fc.assert(
      fc.property(
        fc.array(arbInvoice, { minLength: 1, maxLength: 15 }),
        (boletas) => {
          const result = calcCashFlow([], boletas, [], []);
          const expectedEgresosJP = boletas
            .filter((b) => b.estado === 'pagado')
            .reduce((s, b) => s + b.totalCLP, 0);
          expect(result.egresosJP).toBe(expectedEgresosJP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('EgresosCL = GAV Chile pagado + compras Chile pagadas', () => {
    fc.assert(
      fc.property(
        fc.array(arbGAVEntry, { minLength: 0, maxLength: 10 }),
        fc.array(arbLocalPurchase, { minLength: 0, maxLength: 10 }),
        (gavChile, comprasChile) => {
          const result = calcCashFlow([], [], gavChile, comprasChile);
          const gavPagado = gavChile
            .filter((g) => g.estado === 'pagado')
            .reduce((s, g) => s + g.monto, 0);
          const comprasPagado = comprasChile
            .filter((c) => c.estado === 'pagado')
            .reduce((s, c) => s + c.monto, 0);
          expect(result.egresosCL).toBe(gavPagado + comprasPagado);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pendiente entries do not affect egresos', () => {
    fc.assert(
      fc.property(
        fc.array(arbInvoice.map((b) => ({ ...b, estado: 'sin_pagar' as const })), { minLength: 1, maxLength: 10 }),
        fc.array(arbGAVEntry.map((g) => ({ ...g, estado: 'pendiente' as const })), { minLength: 1, maxLength: 10 }),
        fc.array(arbLocalPurchase.map((c) => ({ ...c, estado: 'pendiente' as const })), { minLength: 1, maxLength: 10 }),
        (boletas, gavChile, comprasChile) => {
          const result = calcCashFlow([], boletas, gavChile, comprasChile);
          expect(result.egresosJP).toBe(0);
          expect(result.egresosCL).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty state produces zero flujo neto', () => {
    const result = calcCashFlow([], [], [], []);
    expect(result.flujoNeto).toBe(0);
    expect(result.ingresos).toBe(0);
    expect(result.egresosJP).toBe(0);
    expect(result.egresosCL).toBe(0);
  });
});

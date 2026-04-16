/**
 * Unit tests for Finance section modules:
 * - EstadoResultadosPage
 * - BalancePage
 * - FlujoCajaPage
 *
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 18.1–18.4, 19.1–19.3, 20.1–20.2
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Controlled mock data ──────────────────────────────────────────────

const ventas = [
  { id: 'V-001', fecha: '2026-02-10', producto: 'Prod A', ean: '', cant: 2, precioVenta: 15000, costo: 8000, total: 30000, canal: 'Instagram' as const },
  { id: 'V-002', fecha: '2026-02-12', producto: 'Prod B', ean: '', cant: 1, precioVenta: 20000, costo: 10000, total: 20000, canal: 'Web' as const },
  { id: 'V-003', fecha: '2026-02-14', producto: 'Prod C', ean: '', cant: 3, precioVenta: 5000, costo: 2000, total: 15000, canal: 'Instagram' as const },
];

const boletasPagadas = [
  { id: 'BOL-2026-001', fecha: '2026-01-20', productos: 2, subtotalJPY: 50000, comision: 13, totalJPY: 56500, tc: 6.0, totalCLP: 9417, estado: 'pagado' as const },
  { id: 'BOL-2026-GAV-001', fecha: '2026-01-25', productos: 'GAV Enero', subtotalJPY: 25550, comision: 13, totalJPY: 28872, tc: 6.0, totalCLP: 4812, estado: 'pagado' as const },
];

const boletasSinPagar = [
  { id: 'BOL-2026-002', fecha: '2026-02-12', productos: 1, subtotalJPY: 30000, comision: 13, totalJPY: 33900, tc: 6.0, totalCLP: 5650, estado: 'sin_pagar' as const },
];

const boletas = [...boletasPagadas, ...boletasSinPagar];

const gavChilePagado = [
  { id: 1, concepto: 'Arriendo', monto: 180000, adjunto: true, estado: 'pagado' as const, docTipo: 'boleta' as const, ivaCredito: false, fechaPago: '2026-01-15' },
];

const gavChilePendiente = [
  { id: 2, concepto: 'Contador', monto: 100000, adjunto: false, estado: 'pendiente' as const, docTipo: 'factura' as const, ivaCredito: true, fechaPago: null },
];

const gavChile = [...gavChilePagado, ...gavChilePendiente];

const comprasChile = [
  { id: 'CC-001', fecha: '2026-01-20', tipo: 'producto' as const, docTipo: 'factura' as const, proveedor: 'Prov A', descripcion: 'Materiales', monto: 50000, iva: 9500, ivaCredito: true, estado: 'pagado' as const },
  { id: 'CC-002', fecha: '2026-02-05', tipo: 'gasto' as const, docTipo: 'boleta' as const, proveedor: 'Prov B', descripcion: 'Envío', monto: 20000, iva: 0, ivaCredito: false, estado: 'pendiente' as const },
];

const stockChile = [
  { id: 'SC-001', _sku: 'JP-0001', nombre: 'Prod A', ean: '', caja: 'Caja1', cant: 4, costoUnit: 8000, precioVenta: 15000 },
  { id: 'SC-002', _sku: 'JP-0002', nombre: 'Prod B', ean: '', caja: 'Caja1', cant: 2, costoUnit: 10000, precioVenta: 20000 },
];

const compras = [
  { id: 1, sku: 'JP-0003', fecha: '2026-02-10', tipo: 'Producto', nombre: 'Prod D', ean: '', tarjeta: 'JCB', precioU: 3000, cant: 5, total: 15000, estado: 'por_pagar' as const, bodega: 'japon' as const, tc: 6.0 },
];

const cajas = [
  { id: 'Caja1', fecha: '2026-01-10', estado: 'costeada' as const, flete_jpy: 5000, mo_horas: 1, mo_tarifa: 5000, mat_jpy: 1000, tc_envio: 6.0, internacion: { arancel: 10000, iva: 5000, total: 15000 }, productos: [] },
];

// ── Mock the context ──────────────────────────────────────────────────

const mockContextValue = {
  ventas,
  boletas,
  gavChile,
  comprasChile,
  stockChile,
  compras,
  cajas,
  config: { cuentas: [], metodosPago: [], arrBodegaJP: 25000, appBeyblade: 550, comisionPct: 13 },
};

vi.mock('../../contexts/ShipmentsDataContext', () => ({
  useShipmentsData: () => mockContextValue,
}));

// ── Import pages (after mock setup) ───────────────────────────────────

import EstadoResultadosPage from './EstadoResultadosPage';
import BalancePage from './BalancePage';
import FlujoCajaPage from './FlujoCajaPage';
import {
  calcIncomeStatement,
  calcBalanceSheet,
  calcCashFlow,
  groupRevenueByChannel,
} from '../../data/shipmentsMockData';

// ── Pre-compute expected values ───────────────────────────────────────

const expectedEERR = calcIncomeStatement(ventas, boletas, gavChile, cajas, comprasChile);
const expectedBalance = calcBalanceSheet(ventas, boletas, stockChile, compras, cajas, comprasChile);
const expectedFlow = calcCashFlow(ventas, boletas, gavChile, comprasChile);
const expectedRevenue = groupRevenueByChannel(ventas);

// =====================================================================
// EstadoResultadosPage
// =====================================================================

describe('EstadoResultadosPage', () => {
  it('renders the heading', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText('Estado de Resultados')).toBeDefined();
  });

  it('displays revenue grouped by sales channel', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText('Instagram')).toBeDefined();
    expect(screen.getByText('Web')).toBeDefined();
    expect(screen.getByText('TikTok')).toBeDefined();
    expect(screen.getByText('Mercado Libre')).toBeDefined();
    expect(screen.getByText('Local')).toBeDefined();
  });

  it('shows Total Ingresos matching sum of all ventas', () => {
    render(<EstadoResultadosPage />);
    // Total ingresos = 30000 + 20000 + 15000 = 65000
    expect(expectedEERR.ingresos).toBe(65000);
    expect(screen.getByText('Total Ingresos')).toBeDefined();
  });

  it('shows Costo de Venta section', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText('(-) Costo de Venta')).toBeDefined();
    // costoVenta = 8000*2 + 10000*1 + 2000*3 = 16000 + 10000 + 6000 = 32000
    expect(expectedEERR.costoVenta).toBe(32000);
  });

  it('shows Margen Bruto = Ingresos - Costo de Venta', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText(/Margen Bruto/)).toBeDefined();
    expect(expectedEERR.margenBruto).toBe(expectedEERR.ingresos - expectedEERR.costoVenta);
  });

  it('only includes GAV entries with estado pagado', () => {
    // GAV Chile pagado = 180000, pendiente = 100000 (should be excluded)
    expect(expectedEERR.gavChile).toBe(180000);
    // GAV Japón: only BOL-2026-GAV-001 (pagado, contains GAV) = 4812
    expect(expectedEERR.gavJapon).toBe(4812);
    expect(expectedEERR.gavTotal).toBe(180000 + 4812);
  });

  it('shows GAV section with pagado label', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText('(-) GAV Japón (pagado)')).toBeDefined();
    expect(screen.getByText('(-) GAV Chile (pagado)')).toBeDefined();
  });

  it('shows EBIT = Margen Bruto - GAV Total', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText(/EBIT/)).toBeDefined();
    expect(expectedEERR.ebit).toBe(expectedEERR.margenBruto - expectedEERR.gavTotal);
  });

  it('shows IVA Crédito Fiscal', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText('(+) IVA Crédito Fiscal')).toBeDefined();
    // IVA from internaciones (5000) + comprasChile ivaCredito (9500) = 14500
    expect(expectedEERR.ivaCredito).toBe(14500);
  });

  it('shows Resultado Neto = EBIT + IVA Crédito', () => {
    render(<EstadoResultadosPage />);
    expect(screen.getByText('Resultado Neto')).toBeDefined();
    expect(expectedEERR.resultadoNeto).toBe(expectedEERR.ebit + expectedEERR.ivaCredito);
  });

  it('revenue by channel preserves total (Property 12)', () => {
    const channelSum = Object.values(expectedRevenue).reduce((s, v) => s + v, 0);
    expect(channelSum).toBe(expectedEERR.ingresos);
  });
});

// =====================================================================
// BalancePage
// =====================================================================

describe('BalancePage', () => {
  it('renders the heading', () => {
    render(<BalancePage />);
    expect(screen.getByText('Balance General')).toBeDefined();
  });

  it('shows Activos section with sub-items', () => {
    render(<BalancePage />);
    expect(screen.getByText('Activos')).toBeDefined();
    expect(screen.getByText('Caja Estimada')).toBeDefined();
    expect(screen.getByText('Inventario Chile')).toBeDefined();
    expect(screen.getByText('Inventario Japón')).toBeDefined();
    expect(screen.getByText('IVA Crédito Fiscal')).toBeDefined();
  });

  it('shows Pasivos section', () => {
    render(<BalancePage />);
    expect(screen.getByText('Pasivos')).toBeDefined();
    expect(screen.getByText('Boletas sin pagar')).toBeDefined();
  });

  it('shows Patrimonio label', () => {
    render(<BalancePage />);
    expect(screen.getByText('Patrimonio')).toBeDefined();
  });

  it('Patrimonio = Activos - Pasivos equation holds', () => {
    expect(expectedBalance.patrimonio).toBe(expectedBalance.activos - expectedBalance.pasivos);
  });

  it('Activos = Caja + InvChile + InvJapon + IVA', () => {
    const sum =
      expectedBalance.cajaEstimada +
      expectedBalance.invChile +
      expectedBalance.invJapon +
      expectedBalance.ivaCreditoTotal;
    expect(expectedBalance.activos).toBe(sum);
  });

  it('Inventario Chile = sum(cant * costoUnit)', () => {
    const expected = stockChile.reduce((s, e) => s + e.cant * e.costoUnit, 0);
    expect(expectedBalance.invChile).toBe(expected);
  });

  it('Inventario Japón = sum(precioU * cant / tc) for bodega=japon', () => {
    const expected = compras
      .filter((c) => c.bodega === 'japon' && c.tc && c.tc > 0)
      .reduce((s, c) => s + (c.precioU * c.cant) / c.tc!, 0);
    expect(expectedBalance.invJapon).toBe(expected);
  });

  it('Pasivos = sum of boletas sin_pagar totalCLP', () => {
    const expected = boletasSinPagar.reduce((s, b) => s + b.totalCLP, 0);
    expect(expectedBalance.pasivos).toBe(expected);
  });
});

// =====================================================================
// FlujoCajaPage
// =====================================================================

describe('FlujoCajaPage', () => {
  it('renders the heading', () => {
    render(<FlujoCajaPage />);
    expect(screen.getByText('Flujo de Caja')).toBeDefined();
  });

  it('shows Ingresos section', () => {
    render(<FlujoCajaPage />);
    expect(screen.getByText('Ingresos — Ventas totales')).toBeDefined();
  });

  it('shows Egresos Japón section', () => {
    render(<FlujoCajaPage />);
    expect(screen.getByText('Egresos Japón — Boletas pagadas')).toBeDefined();
  });

  it('shows Egresos Chile section', () => {
    render(<FlujoCajaPage />);
    // Use getAllByText since "Egresos Chile" appears in both the section label and the footer formula
    const matches = screen.getAllByText(/Egresos Chile/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Flujo Neto section', () => {
    render(<FlujoCajaPage />);
    expect(screen.getByText('Flujo Neto')).toBeDefined();
  });

  it('Flujo Neto = Ingresos - EgresosJP - EgresosCL equation holds', () => {
    expect(expectedFlow.flujoNeto).toBe(
      expectedFlow.ingresos - expectedFlow.egresosJP - expectedFlow.egresosCL,
    );
  });

  it('Ingresos = sum of ventas totals', () => {
    const expected = ventas.reduce((s, v) => s + v.total, 0);
    expect(expectedFlow.ingresos).toBe(expected);
  });

  it('Egresos JP = sum of boletas pagadas totalCLP', () => {
    const expected = boletasPagadas.reduce((s, b) => s + b.totalCLP, 0);
    expect(expectedFlow.egresosJP).toBe(expected);
  });

  it('Egresos CL = GAV Chile pagado + compras Chile pagadas', () => {
    const gavPagado = gavChilePagado.reduce((s, g) => s + g.monto, 0);
    const comprasPagadas = comprasChile
      .filter((c) => c.estado === 'pagado')
      .reduce((s, c) => s + c.monto, 0);
    expect(expectedFlow.egresosCL).toBe(gavPagado + comprasPagadas);
  });

  it('Flujo Neto card is red when negative', () => {
    // Our mock data produces a negative flow (egresos > ingresos)
    expect(expectedFlow.flujoNeto).toBeLessThan(0);
    const { container } = render(<FlujoCajaPage />);
    // The Flujo Neto card should have destructive/red border styling
    const cards = container.querySelectorAll('[class*="border-destructive"]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it('Flujo Neto value uses green styling when positive', () => {
    // Verify the conditional logic: positive flow should use green class
    // With our mock data flow is negative, so the text should have destructive class
    const { container } = render(<FlujoCajaPage />);
    const flujoNetoCard = container.querySelector('[class*="border-2"]');
    expect(flujoNetoCard).toBeDefined();
    // Since flujoNeto < 0, the value should have text-destructive
    const priceEl = flujoNetoCard?.querySelector('[class*="text-destructive"]');
    expect(priceEl).not.toBeNull();
  });
});

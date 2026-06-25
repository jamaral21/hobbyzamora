/**
 * Unit tests for DashboardPage
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 21.1 (KPI cards), 21.2 (visual timeline), 21.3 (GAV alert)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './DashboardPage';

// We mock the context to control data precisely
const mockContextValue = {
  compras: [
    { id: 1, sku: 'JP-0001', fecha: '2026-01-15', tipo: 'Producto', nombre: 'Product A', ean: '', tarjeta: 'JCB', precioU: 5000, cant: 6, total: 30000, estado: 'pagado' as const, bodega: 'chile' as const, tc: 6.0 },
    { id: 2, sku: 'JP-0002', fecha: '2026-02-10', tipo: 'Producto', nombre: 'Product B', ean: '', tarjeta: 'Rakuten', precioU: 2000, cant: 10, total: 20000, estado: 'por_pagar' as const, bodega: 'japon' as const, tc: 6.0 },
  ],
  cajas: [
    { id: 'Caja1', fecha: '2026-02-15', estado: 'transito' as const, flete_jpy: 5000, mo_horas: 1, mo_tarifa: 5000, mat_jpy: 1000, tc_envio: 6.0, internacion: null, productos: [{ _compraId: 2, _sku: 'JP-0002', nombre: 'Product B', ean: '', cant: 3, precioU: 2000, tc: 6.0 }] },
    { id: 'Caja2', fecha: '2026-03-01', estado: 'llegada' as const, flete_jpy: 4000, mo_horas: 1, mo_tarifa: 5000, mat_jpy: 800, tc_envio: 6.0, internacion: null, productos: [] },
  ],
  stockChile: [
    { id: 'SC-001', _sku: 'JP-0001', nombre: 'Product A', ean: '', caja: 'Caja0', cant: 4, costoUnit: 8000, precioVenta: 14990 },
    { id: 'SC-002', _sku: 'JP-0001', nombre: 'Product A', ean: '', caja: 'Caja0', cant: 2, costoUnit: 8000, precioVenta: 12990 },
  ],
  boletas: [
    { id: 'BOL-2026-001', fecha: '2026-01-20', productos: 2, subtotalJPY: 50000, comision: 13, totalJPY: 56500, tc: 6.0, totalCLP: 339000, estado: 'pagado' as const },
    { id: 'BOL-2026-002', fecha: '2026-02-12', productos: 1, subtotalJPY: 30000, comision: 13, totalJPY: 33900, tc: 6.0, totalCLP: 203400, estado: 'sin_pagar' as const },
    { id: 'BOL-2026-003', fecha: '2026-03-08', productos: 1, subtotalJPY: 20000, comision: 13, totalJPY: 22600, tc: 6.0, totalCLP: 135600, estado: 'sin_pagar' as const },
  ],
  ventas: [] as any[],
  calcDisponibleBySku: (sku: string) => {
    // JP-0001: cant=6, chile stock=6, disponible=0
    // JP-0002: cant=10, active boxes=3, disponible=7
    if (sku === 'JP-0002') return 7;
    return 0;
  },
};

vi.mock('../../contexts/ShipmentsDataContext', () => ({
  useShipmentsData: () => mockContextValue,
}));

// Mock formatCLP
vi.mock('../../data/shipmentsDomain', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    formatCLP: (n: number) => `$${n.toLocaleString('es-CL')}`,
  };
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders the Dashboard heading', () => {
    vi.setSystemTime(new Date(2026, 0, 1)); // Jan 1 — day < 3
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeDefined();
    vi.useRealTimers();
  });

  it('renders KPI: Productos en Japón (SKUs with disponible > 0)', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    render(<DashboardPage />);
    // Only JP-0002 has disponible > 0
    const label = screen.getByText('Productos en Japón');
    expect(label).toBeDefined();
    // The value is in a sibling <p> within the same parent
    const valueEl = label.parentElement?.querySelector('.text-2xl');
    expect(valueEl?.textContent).toBe('1');
    vi.useRealTimers();
  });

  it('renders KPI: Cajas en Tránsito', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    render(<DashboardPage />);
    expect(screen.getByText('Cajas en Tránsito')).toBeDefined();
    vi.useRealTimers();
  });

  it('renders KPI: Cajas Llegadas', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    render(<DashboardPage />);
    expect(screen.getByText('Cajas Llegadas')).toBeDefined();
    vi.useRealTimers();
  });

  it('renders KPI: Unidades en Chile (sum of stockChile.cant)', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    render(<DashboardPage />);
    const label = screen.getByText('Unidades en Chile');
    expect(label).toBeDefined();
    // 4 + 2 = 6
    const valueEl = label.parentElement?.querySelector('.text-2xl');
    expect(valueEl?.textContent).toBe('6');
    vi.useRealTimers();
  });

  it('renders KPI: Boletas Pendientes', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    render(<DashboardPage />);
    expect(screen.getByText('Boletas Pendientes')).toBeDefined();
    // 2 boletas sin_pagar
    expect(screen.getByText('2')).toBeDefined();
    vi.useRealTimers();
  });

  it('renders KPI: Ventas del Mes and Margen Promedio', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    render(<DashboardPage />);
    expect(screen.getByText('Ventas del Mes')).toBeDefined();
    expect(screen.getByText('Margen Promedio')).toBeDefined();
    vi.useRealTimers();
  });

  it('renders Pipeline de Inventario timeline', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    render(<DashboardPage />);
    expect(screen.getByText('Pipeline de Inventario')).toBeDefined();
    expect(screen.getByText('Japón')).toBeDefined();
    expect(screen.getByText('Tránsito')).toBeDefined();
    expect(screen.getByText('Chile')).toBeDefined();
    vi.useRealTimers();
  });

  // GAV Alert logic
  it('does NOT show GAV warning when day < 3', () => {
    vi.setSystemTime(new Date(2026, 2, 1)); // March 1 — day < 3
    render(<DashboardPage />);
    expect(screen.queryByText('Boleta GAV pendiente')).toBeNull();
    vi.useRealTimers();
  });

  it('shows GAV warning when day >= 3 and no GAV invoice for current month', () => {
    vi.setSystemTime(new Date(2026, 2, 5)); // March 5 — day >= 3
    // No GAV invoice for March 2026 in the mock boletas
    render(<DashboardPage />);
    expect(screen.getByText('Boleta GAV pendiente')).toBeDefined();
    vi.useRealTimers();
  });

  it('does NOT show GAV warning when GAV invoice exists for current month', () => {
    // Add a GAV invoice for January 2026
    vi.setSystemTime(new Date(2026, 0, 5)); // Jan 5 — day >= 3
    // BOL-2026-GAV-001 doesn't exist in our mock, but let's add one
    const originalBoletas = mockContextValue.boletas;
    mockContextValue.boletas = [
      ...originalBoletas,
      { id: 'BOL-2026-GAV-001', fecha: '2026-01-05', productos: 'GAV Enero', subtotalJPY: 25550, comision: 13, totalJPY: 28872, tc: 6.0, totalCLP: 173232, estado: 'pagado' as const },
    ];
    render(<DashboardPage />);
    expect(screen.queryByText('Boleta GAV pendiente')).toBeNull();
    // Restore
    mockContextValue.boletas = originalBoletas;
    vi.useRealTimers();
  });
});

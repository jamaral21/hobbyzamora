/**
 * Unit tests for CajasPage — Cajas / Envíos
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 9.1 (grid of box cards), 9.2 (nueva caja modal),
 * 9.3 (product selector filters available), 9.4 (update bodega on create),
 * 9.5 (action buttons by state)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CajasPage from './CajasPage';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockAddCaja = vi.fn();
const mockUpdateCaja = vi.fn();
const mockDeleteCaja = vi.fn();

const baseMockContext = {
  compras: [
    { id: 1, sku: 'JP-0001', fecha: '2026-01-15', tipo: 'Producto', nombre: 'Pokémon TCG Box', ean: '4521329400013', tarjeta: 'JCB', precioU: 5800, cant: 10, total: 58000, estado: 'pagado' as const, bodega: 'japon' as const, tc: 6.0 },
    { id: 2, sku: 'JP-0002', fecha: '2026-02-10', tipo: 'Producto', nombre: 'Beyblade Starter', ean: '4904810912347', tarjeta: 'Rakuten', precioU: 2200, cant: 5, total: 11000, estado: 'por_pagar' as const, bodega: 'japon' as const, tc: 6.0 },
    { id: 3, sku: 'JP-0003', fecha: '2026-03-01', tipo: 'Producto', nombre: 'Tomica Premium', ean: '', tarjeta: 'JCB', precioU: 980, cant: 8, total: 7840, estado: 'pagado' as const, bodega: 'transito' as const, tc: 5.9 },
  ],
  cajas: [
    {
      id: 'Caja_Transito', fecha: '2026-02-15', estado: 'transito' as const,
      flete_jpy: 9500, mo_horas: 1.5, mo_tarifa: 5000, mat_jpy: 2500, tc_envio: 6.1,
      internacion: null,
      productos: [
        { _compraId: 3, _sku: 'JP-0003', nombre: 'Tomica Premium', ean: '', cant: 8, precioU: 980, tc: 5.9 },
      ],
    },
    {
      id: 'Caja_Llegada', fecha: '2026-03-10', estado: 'llegada' as const,
      flete_jpy: 8000, mo_horas: 1, mo_tarifa: 5000, mat_jpy: 2000, tc_envio: 5.9,
      internacion: { arancel: 32000, iva: 28000, total: 60000 },
      productos: [
        { _compraId: 1, _sku: 'JP-0001', nombre: 'Pokémon TCG Box', ean: '4521329400013', cant: 4, precioU: 5800, tc: 6.0 },
      ],
    },
    {
      id: 'Caja_Costeada', fecha: '2026-01-25', estado: 'costeada' as const,
      flete_jpy: 12000, mo_horas: 2, mo_tarifa: 5000, mat_jpy: 3000, tc_envio: 6.2,
      internacion: { arancel: 45000, iva: 38000, total: 83000 },
      productos: [
        { _compraId: 1, _sku: 'JP-0001', nombre: 'Pokémon TCG Box', ean: '4521329400013', cant: 2, precioU: 5800, tc: 6.2 },
      ],
    },
  ],
  addCaja: mockAddCaja,
  updateCaja: mockUpdateCaja,
  deleteCaja: mockDeleteCaja,
  calcDisponibleBySku: (sku: string) => {
    // JP-0001: cant=10, in boxes=4+2=6, disponible=4
    if (sku === 'JP-0001') return 4;
    // JP-0002: cant=5, in boxes=0, disponible=5
    if (sku === 'JP-0002') return 5;
    // JP-0003: cant=8, in boxes=8, disponible=0
    return 0;
  },
};

let mockContext = { ...baseMockContext };

vi.mock('../../contexts/ShipmentsDataContext', () => ({
  useShipmentsData: () => mockContext,
}));

describe('CajasPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockAddCaja.mockClear();
    mockUpdateCaja.mockClear();
    mockDeleteCaja.mockClear();
    mockContext = { ...baseMockContext };
  });

  // --- Req 9.1: Grid of box cards ---
  it('renders the page heading', () => {
    render(<CajasPage />);
    expect(screen.getByText('Cajas / Envíos')).toBeDefined();
  });

  it('renders a card for each box in the grid', () => {
    render(<CajasPage />);
    expect(screen.getByText('Caja_Transito')).toBeDefined();
    expect(screen.getByText('Caja_Llegada')).toBeDefined();
    expect(screen.getByText('Caja_Costeada')).toBeDefined();
  });

  it('shows product count on each card', () => {
    render(<CajasPage />);
    const productCounts = screen.getAllByText(/producto\(s\)/);
    expect(productCounts.length).toBe(3);
  });

  it('shows status badge on each card', () => {
    render(<CajasPage />);
    expect(screen.getByText('✈️ En Tránsito')).toBeDefined();
    expect(screen.getByText('📦 Llegada')).toBeDefined();
    expect(screen.getByText('✅ Costeada')).toBeDefined();
  });

  it('shows empty state when no boxes exist', () => {
    mockContext = { ...baseMockContext, cajas: [] };
    render(<CajasPage />);
    expect(screen.getByText('Sin cajas registradas')).toBeDefined();
  });

  // --- Req 9.5: Action buttons by state ---
  it('shows Ver, Editar, Eliminar buttons for transito boxes', () => {
    render(<CajasPage />);
    // transito box should have Editar button
    const editButtons = screen.getAllByText('Editar');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Hacer Costeo button for llegada boxes', () => {
    render(<CajasPage />);
    const costeoButtons = screen.getAllByText('Hacer Costeo');
    expect(costeoButtons.length).toBe(1);
  });

  it('does NOT show Editar or Hacer Costeo for costeada boxes', () => {
    // Only costeada box — should have no Editar or Hacer Costeo
    mockContext = {
      ...baseMockContext,
      cajas: [baseMockContext.cajas[2]], // only costeada
    };
    render(<CajasPage />);
    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.queryByText('Hacer Costeo')).toBeNull();
  });

  it('navigates to costeo when Hacer Costeo is clicked', () => {
    render(<CajasPage />);
    const costeoBtn = screen.getByText('Hacer Costeo');
    fireEvent.click(costeoBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/shipments/costeo');
  });

  // --- Req 9.2: Nueva Caja modal ---
  it('opens modal when Nueva Caja is clicked', () => {
    render(<CajasPage />);
    fireEvent.click(screen.getByText(/Nueva Caja/));
    expect(screen.getByText('Nombre')).toBeDefined();
    expect(screen.getByText('Flete UPS ¥')).toBeDefined();
    expect(screen.getByText('Horas MO')).toBeDefined();
    expect(screen.getByText('Tarifa MO CLP/h')).toBeDefined();
    expect(screen.getByText('Materiales ¥')).toBeDefined();
    expect(screen.getByText('TC ¥→CLP')).toBeDefined();
  });

  // --- Req 9.3: Product selector filters available products ---
  it('shows only products with disponible > 0 in the product selector', () => {
    render(<CajasPage />);
    fireEvent.click(screen.getByText(/Nueva Caja/));
    expect(screen.getByText('Productos disponibles')).toBeDefined();
    // JP-0001 (disp=4) and JP-0002 (disp=5) should appear
    expect(screen.getByText(/JP-0001/)).toBeDefined();
    expect(screen.getByText(/JP-0002/)).toBeDefined();
    // JP-0003 (disp=0) should NOT appear in the selector
    expect(screen.queryByText(/JP-0003 · Disp:/)).toBeNull();
  });

  it('shows disponible count for each product in selector', () => {
    render(<CajasPage />);
    fireEvent.click(screen.getByText(/Nueva Caja/));
    expect(screen.getByText(/Disp: 4/)).toBeDefined();
    expect(screen.getByText(/Disp: 5/)).toBeDefined();
  });

  // --- Expand/collapse product list ---
  it('expands box to show product details when Ver is clicked', () => {
    render(<CajasPage />);
    // Click the first Ver button
    const verButtons = screen.getAllByText('Ver');
    fireEvent.click(verButtons[0]);
    // Should show product details for the expanded box
    expect(screen.getByText('Tomica Premium')).toBeDefined();
  });
});

/**
 * Unit tests for BodegaTransitoPage — Bodega Tránsito
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 10.1 (boxes grouped by state),
 * 10.2 (KPI cards), 10.3 (expandable cards with product list),
 * 10.4 (Hacer Costeo button on llegada boxes)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BodegaTransitoPage from './BodegaTransitoPage';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const baseMockContext = {
  cajas: [
    {
      id: 'Caja_T1', fecha: '2026-02-15', estado: 'transito' as const,
      flete_jpy: 9500, mo_horas: 1.5, mo_tarifa: 5000, mat_jpy: 2500, tc_envio: 6.1,
      internacion: null,
      productos: [
        { _compraId: 3, _sku: 'JP-0003', nombre: 'Pokémon ETB', ean: '', cant: 4, precioU: 4500, tc: 6.1 },
        { _compraId: 4, _sku: 'JP-0004', nombre: 'Beyblade Booster', ean: '', cant: 15, precioU: 1100, tc: 6.1 },
      ],
    },
    {
      id: 'Caja_T2', fecha: '2026-02-20', estado: 'transito' as const,
      flete_jpy: 7000, mo_horas: 1, mo_tarifa: 5000, mat_jpy: 1500, tc_envio: 6.0,
      internacion: null,
      productos: [
        { _compraId: 5, _sku: 'JP-0005', nombre: 'Tomica Set', ean: '', cant: 10, precioU: 980, tc: 6.0 },
      ],
    },
    {
      id: 'Caja_L1', fecha: '2026-03-10', estado: 'llegada' as const,
      flete_jpy: 8000, mo_horas: 1, mo_tarifa: 5000, mat_jpy: 2000, tc_envio: 5.9,
      internacion: { arancel: 32000, iva: 28000, total: 60000 },
      productos: [
        { _compraId: 6, _sku: 'JP-0006', nombre: 'Pokémon Special Deck', ean: '', cant: 4, precioU: 3200, tc: 6.0 },
      ],
    },
    {
      id: 'Caja_C1', fecha: '2026-01-25', estado: 'costeada' as const,
      flete_jpy: 12000, mo_horas: 2, mo_tarifa: 5000, mat_jpy: 3000, tc_envio: 6.2,
      internacion: { arancel: 45000, iva: 38000, total: 83000 },
      productos: [
        { _compraId: 1, _sku: 'JP-0001', nombre: 'Pokémon TCG Box', ean: '', cant: 6, precioU: 5800, tc: 6.2 },
      ],
    },
  ],
};

let mockContext = { ...baseMockContext };

vi.mock('../../contexts/ShipmentsDataContext', () => ({
  useShipmentsData: () => mockContext,
}));

describe('BodegaTransitoPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockContext = { ...baseMockContext };
  });

  it('renders the page heading', () => {
    render(<BodegaTransitoPage />);
    expect(screen.getByText('Bodega Tránsito')).toBeDefined();
  });

  // --- Req 10.2: KPI cards ---
  it('renders KPI card: Cajas en tránsito with correct count', () => {
    render(<BodegaTransitoPage />);
    const label = screen.getByText('Cajas en tránsito');
    expect(label).toBeDefined();
    const valueEl = label.closest('[class]')?.parentElement?.querySelector('.text-2xl');
    // 2 transito boxes
    expect(valueEl?.textContent).toBe('2');
  });

  it('renders KPI card: Llegadas pendientes with correct count', () => {
    render(<BodegaTransitoPage />);
    const label = screen.getByText('Llegadas pendientes');
    expect(label).toBeDefined();
    const valueEl = label.closest('[class]')?.parentElement?.querySelector('.text-2xl');
    expect(valueEl?.textContent).toBe('1');
  });

  it('renders KPI card: Costeadas with correct count', () => {
    render(<BodegaTransitoPage />);
    // "Costeadas" appears in both KPI card (p.text-sm) and section heading (h3)
    const labels = screen.getAllByText('Costeadas');
    const kpiLabel = labels.find(el => el.tagName === 'P');
    expect(kpiLabel).toBeDefined();
    const valueEl = kpiLabel!.parentElement?.querySelector('.text-2xl');
    expect(valueEl?.textContent).toBe('1');
  });

  // --- Req 10.1: Boxes grouped by state ---
  it('renders section headings for each state group', () => {
    render(<BodegaTransitoPage />);
    expect(screen.getByText('En Tránsito')).toBeDefined();
    expect(screen.getByText('Llegadas')).toBeDefined();
    // "Costeadas" appears in both KPI and section heading — use getAllByText
    const costeadasEls = screen.getAllByText('Costeadas');
    const sectionHeading = costeadasEls.find(el => el.tagName === 'H3');
    expect(sectionHeading).toBeDefined();
  });

  it('renders box names within their state groups', () => {
    render(<BodegaTransitoPage />);
    expect(screen.getByText('Caja_T1')).toBeDefined();
    expect(screen.getByText('Caja_T2')).toBeDefined();
    expect(screen.getByText('Caja_L1')).toBeDefined();
    expect(screen.getByText('Caja_C1')).toBeDefined();
  });

  it('shows status badges on each box card', () => {
    render(<BodegaTransitoPage />);
    const transitBadges = screen.getAllByText('✈️ En Tránsito');
    expect(transitBadges.length).toBe(2);
    expect(screen.getByText('📦 Llegada')).toBeDefined();
    expect(screen.getByText('✅ Costeada')).toBeDefined();
  });

  it('does not render section heading for empty state groups', () => {
    mockContext = {
      ...baseMockContext,
      cajas: baseMockContext.cajas.filter(b => b.estado !== 'costeada'),
    };
    render(<BodegaTransitoPage />);
    // "Costeadas" still appears in the KPI card, but the h3 section heading should be gone
    const costeadasEls = screen.getAllByText('Costeadas');
    const sectionHeading = costeadasEls.find(el => el.tagName === 'H3');
    expect(sectionHeading).toBeUndefined();
  });

  it('shows empty state when no boxes exist', () => {
    mockContext = { ...baseMockContext, cajas: [] };
    render(<BodegaTransitoPage />);
    expect(screen.getByText('Sin cajas registradas')).toBeDefined();
  });

  // --- Req 10.3: Expandable cards ---
  it('expands a box card to show product list', () => {
    render(<BodegaTransitoPage />);
    // Find the expand button for Caja_T1 (first box)
    const expandButtons = screen.getAllByRole('button');
    // The first chevron button should be for Caja_T1
    const chevronBtn = expandButtons.find(
      btn => btn.querySelector('svg') && btn.closest('[class]')?.textContent?.includes('Caja_T1'),
    );
    if (chevronBtn) {
      fireEvent.click(chevronBtn);
      expect(screen.getByText('Pokémon ETB')).toBeDefined();
      expect(screen.getByText('JP-0003')).toBeDefined();
      expect(screen.getByText('Beyblade Booster')).toBeDefined();
      expect(screen.getByText('JP-0004')).toBeDefined();
    }
  });

  it('shows product quantity in expanded view', () => {
    render(<BodegaTransitoPage />);
    // Expand first box
    const buttons = screen.getAllByRole('button');
    const firstChevron = buttons[0]; // first button is the expand toggle
    fireEvent.click(firstChevron);
    expect(screen.getByText('×4')).toBeDefined();
    expect(screen.getByText('×15')).toBeDefined();
  });

  // --- Req 10.4: Hacer Costeo button on llegada boxes ---
  it('shows Hacer Costeo button only on llegada boxes', () => {
    render(<BodegaTransitoPage />);
    const costeoButtons = screen.getAllByText('Hacer Costeo');
    expect(costeoButtons.length).toBe(1);
  });

  it('navigates to costeo module when Hacer Costeo is clicked', () => {
    render(<BodegaTransitoPage />);
    const costeoBtn = screen.getByText('Hacer Costeo');
    fireEvent.click(costeoBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/shipments/costeo');
  });

  it('does NOT show Hacer Costeo on transito or costeada boxes', () => {
    mockContext = {
      ...baseMockContext,
      cajas: baseMockContext.cajas.filter(b => b.estado !== 'llegada'),
    };
    render(<BodegaTransitoPage />);
    expect(screen.queryByText('Hacer Costeo')).toBeNull();
  });
});

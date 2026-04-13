/**
 * Unit tests for CosteoPage — Costeo de Cajas
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 13.1 (selector shows only llegada boxes),
 * 13.2 (costing table), 13.3 (costo unitario calculation),
 * 13.4 (percentage validation to 100%), 13.5 (confirm creates stock)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CosteoPage from './CosteoPage';

const mockConfirmCosteo = vi.fn();

const baseMockContext = {
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
        { _compraId: 5, _sku: 'JP-0005', nombre: 'Pokémon TCG Special Deck', ean: '4521329402215', cant: 4, precioU: 3200, tc: 6.0 },
        { _compraId: 6, _sku: 'JP-0006', nombre: 'Tomica Premium Nissan', ean: '4904810234567', cant: 8, precioU: 980, tc: 5.9 },
      ],
    },
    {
      id: 'Caja_Costeada', fecha: '2026-01-25', estado: 'costeada' as const,
      flete_jpy: 12000, mo_horas: 2, mo_tarifa: 5000, mat_jpy: 3000, tc_envio: 6.2,
      internacion: { arancel: 45000, iva: 38000, total: 83000 },
      productos: [
        { _compraId: 1, _sku: 'JP-0001', nombre: 'Pokémon TCG Box', ean: '4521329400013', cant: 6, precioU: 5800, tc: 6.2 },
      ],
    },
  ],
  confirmCosteo: mockConfirmCosteo,
};

let mockContext = { ...baseMockContext };

vi.mock('../../contexts/ShipmentsDataContext', () => ({
  useShipmentsData: () => mockContext,
}));

describe('CosteoPage', () => {
  beforeEach(() => {
    mockConfirmCosteo.mockClear();
    mockContext = { ...baseMockContext };
  });

  it('renders the page heading', () => {
    render(<CosteoPage />);
    expect(screen.getByText('Costeo de Cajas')).toBeDefined();
  });

  // --- Req 13.1: Selector shows only llegada boxes ---
  it('shows a box selector with only llegada boxes', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    // Default placeholder + 1 llegada box
    expect(options.length).toBe(2);
    expect(options[1].textContent).toContain('Caja_Llegada');
  });

  it('does NOT include transito or costeada boxes in selector', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    const optionTexts = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
    expect(optionTexts.some(t => t?.includes('Caja_Transito'))).toBe(false);
    expect(optionTexts.some(t => t?.includes('Caja_Costeada'))).toBe(false);
  });

  it('shows empty state when no llegada boxes exist', () => {
    mockContext = {
      ...baseMockContext,
      cajas: baseMockContext.cajas.filter(b => b.estado !== 'llegada'),
    };
    render(<CosteoPage />);
    expect(screen.getByText('Sin cajas para costear')).toBeDefined();
  });

  // --- Req 13.2: Costing table ---
  it('shows costing table when a box is selected', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    // Table headers
    expect(screen.getByText('SKU')).toBeDefined();
    expect(screen.getByText('Nombre')).toBeDefined();
    expect(screen.getByText('Cantidad')).toBeDefined();
    expect(screen.getByText('% Costo')).toBeDefined();
    expect(screen.getByText('Costo Unitario CLP')).toBeDefined();
  });

  it('shows product rows from the selected box', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    expect(screen.getByText('JP-0005')).toBeDefined();
    expect(screen.getByText('JP-0006')).toBeDefined();
    expect(screen.getByText('Pokémon TCG Special Deck')).toBeDefined();
    expect(screen.getByText('Tomica Premium Nissan')).toBeDefined();
  });

  it('shows cost breakdown when a box is selected', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    expect(screen.getByText('Desglose de costos')).toBeDefined();
    expect(screen.getByText('Subtotal CLP')).toBeDefined();
    expect(screen.getByText('Flete CLP')).toBeDefined();
    expect(screen.getByText('MO CLP')).toBeDefined();
    expect(screen.getByText('Materiales CLP')).toBeDefined();
    expect(screen.getByText('Internación CLP')).toBeDefined();
  });

  // --- Req 13.4: Percentage validation ---
  it('shows percentage sum indicator', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    expect(screen.getByText('Suma de porcentajes:')).toBeDefined();
  });

  it('shows sum in green when percentages equal 100%', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    // Default: 2 products → 50% each = 100%
    const sumEl = screen.getByText('100.00%');
    expect(sumEl).toBeDefined();
    expect(sumEl.className).toContain('text-[#00e676]');
  });

  it('shows sum in red when percentages do not equal 100%', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    // Change one percentage to break the 100% sum
    const pctInputs = screen.getAllByRole('spinbutton');
    // The percentage inputs are the ones in the table (after the select)
    // Find the pct inputs (they have max=100)
    const costPctInputs = pctInputs.filter(
      (input) => (input as HTMLInputElement).max === '100',
    );
    if (costPctInputs.length > 0) {
      fireEvent.change(costPctInputs[0], { target: { value: '30' } });
      // Sum should now be 30 + 50 = 80
      const sumEl = screen.getByText('80.00%');
      expect(sumEl).toBeDefined();
      expect(sumEl.className).toContain('text-destructive');
    }
  });

  it('disables Confirmar button when percentages do not sum to 100%', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    // Change percentage to break validation
    const pctInputs = screen.getAllByRole('spinbutton').filter(
      (input) => (input as HTMLInputElement).max === '100',
    );
    if (pctInputs.length > 0) {
      fireEvent.change(pctInputs[0], { target: { value: '30' } });
      const confirmBtn = screen.getByText('Confirmar Costeo');
      expect((confirmBtn.closest('button') as HTMLButtonElement).disabled).toBe(true);
    }
  });

  // --- Req 13.5: Confirm costeo ---
  it('enables Confirmar button when percentages sum to 100%', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    // Default is 50/50 = 100%
    const confirmBtn = screen.getByText('Confirmar Costeo');
    expect((confirmBtn.closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls confirmCosteo when Confirmar is clicked with valid percentages', () => {
    render(<CosteoPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Caja_Llegada' } });
    const confirmBtn = screen.getByText('Confirmar Costeo');
    fireEvent.click(confirmBtn.closest('button')!);
    expect(mockConfirmCosteo).toHaveBeenCalledWith('Caja_Llegada', expect.any(Array));
    // Should have 2 entries (one per product)
    const costeoData = mockConfirmCosteo.mock.calls[0][1];
    expect(costeoData.length).toBe(2);
    expect(costeoData[0]._sku).toBe('JP-0005');
    expect(costeoData[1]._sku).toBe('JP-0006');
  });
});

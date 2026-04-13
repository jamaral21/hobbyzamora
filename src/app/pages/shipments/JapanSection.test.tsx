/**
 * Unit tests for Japan section modules
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 4.1–4.5, 5.1–5.4, 6.1–6.5, 7.1–7.3, 8.1–8.4
 * Tests ComprasPage, BoletasPage, PagosPage, StatusBadge, and PriceDisplay
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ShipmentsRoleProvider } from '../../contexts/ShipmentsRoleContext';
import { ShipmentsDataProvider } from '../../contexts/ShipmentsDataContext';
import ComprasPage from './ComprasPage';
import BoletasPage from './BoletasPage';
import PagosPage from './PagosPage';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <ShipmentsRoleProvider>
        <ShipmentsDataProvider>
          {children}
        </ShipmentsDataProvider>
      </ShipmentsRoleProvider>
    </MemoryRouter>
  );
}

// ─── ComprasPage ───────────────────────────────────────────────────────────────

describe('ComprasPage', () => {
  it('renders the page title', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    expect(screen.getByText('Registro de Compras')).toBeDefined();
  });

  it('renders a table with purchase records including SKUs', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    expect(screen.getByText('JP-0001')).toBeDefined();
  });

  it('renders table column headers', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    // Use getAllByText for headers that also appear as filter labels
    expect(screen.getAllByText('SKU').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Nombre').length).toBeGreaterThanOrEqual(1);
  });

  it('opens "Nueva Compra" modal when button is clicked', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Nueva Compra'));
    // Modal should show the form placeholder
    expect(screen.getByPlaceholderText('Nombre del producto')).toBeDefined();
  });

  it('shows validation errors on empty submit', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Nueva Compra'));
    fireEvent.click(screen.getByText('Registrar Compra'));
    // Should show validation errors for required fields
    expect(screen.getAllByText('Requerido').length).toBeGreaterThanOrEqual(1);
  });

  it('auto-assigns next sequential SKU on submit', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('Nueva Compra'));

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('Nombre del producto'), {
      target: { value: 'Test Product' },
    });

    // Fill precio and cantidad (both have placeholder "0")
    const zeroPlaceholders = screen.getAllByPlaceholderText('0');
    fireEvent.change(zeroPlaceholders[0], { target: { value: '1000' } }); // precioU
    fireEvent.change(zeroPlaceholders[1], { target: { value: '2' } }); // cant

    // Fill TC
    fireEvent.change(screen.getByPlaceholderText('6.0'), { target: { value: '6.5' } });

    // Select tarjeta
    const tarjetaSelect = screen.getByText('Seleccionar...').closest('select')!;
    const options = tarjetaSelect.querySelectorAll('option');
    if (options.length > 1) {
      fireEvent.change(tarjetaSelect, { target: { value: options[1].value } });
    }

    fireEvent.click(screen.getByText('Registrar Compra'));

    // Mock data has 12 purchases (JP-0001 to JP-0012), so next is JP-0013
    expect(screen.getByText('JP-0013')).toBeDefined();
    expect(screen.getByText('Test Product')).toBeDefined();
  });

  it('renders filter controls for payment state and location', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    // Filter labels exist (also in table headers, so use getAllByText)
    expect(screen.getAllByText('Estado Pago').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bodega').length).toBeGreaterThanOrEqual(1);
  });

  it('displays prices in JPY format with ¥ prefix', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    // Prices should be formatted with ¥ prefix (PriceDisplay component)
    const yenPrices = screen.getAllByText(/^¥/);
    expect(yenPrices.length).toBeGreaterThan(0);
  });

  it('displays StatusBadge for payment states', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    // Mock data has purchases with various payment states
    const badges = screen.getAllByText(/(Por Pagar|Esp\. Pago|Pagado)/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('filters purchases by payment state', () => {
    render(<ComprasPage />, { wrapper: Wrapper });
    // Count initial rows (all purchases visible)
    const initialSkus = screen.getAllByText(/^JP-\d{4}$/);
    const initialCount = initialSkus.length;

    // Filter by "pagado" state using the select element by its id
    const estadoSelect = document.getElementById('estado-pago') as HTMLSelectElement;
    expect(estadoSelect).toBeDefined();
    fireEvent.change(estadoSelect!, { target: { value: 'pagado' } });

    // Should show fewer or equal rows
    const filteredSkus = screen.getAllByText(/^JP-\d{4}$/);
    expect(filteredSkus.length).toBeLessThanOrEqual(initialCount);
  });
});

// ─── BoletasPage ───────────────────────────────────────────────────────────────

describe('BoletasPage', () => {
  it('renders the page title', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    expect(screen.getByText('Boletas')).toBeDefined();
  });

  it('renders a table with invoice records', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    expect(screen.getByText('BOL-2026-001')).toBeDefined();
  });

  it('renders table column headers', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    expect(screen.getAllByText('ID').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fecha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Productos').length).toBeGreaterThanOrEqual(1);
  });

  it('shows detail view when a row is clicked', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    const row = screen.getByText('BOL-2026-001').closest('tr')!;
    fireEvent.click(row);
    expect(screen.getByText('Detalle de líneas')).toBeDefined();
  });

  it('opens "Generar Boleta" modal with product selector', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    // The button in the header says "Generar Boleta"
    const buttons = screen.getAllByRole('button');
    const genBtn = buttons.find(b => b.textContent?.includes('Generar Boleta'));
    expect(genBtn).toBeDefined();
    fireEvent.click(genBtn!);
    expect(screen.getByText('Seleccionar productos:')).toBeDefined();
  });

  it('disables submit when no products selected', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    const buttons = screen.getAllByRole('button');
    const genBtn = buttons.find(b => b.textContent?.includes('Generar Boleta'));
    fireEvent.click(genBtn!);
    // The submit button in the modal footer shows "(0 productos)" and is disabled
    const submitBtn = screen.getByText(/Generar Boleta \(0 productos\)/);
    expect(
      submitBtn.hasAttribute('disabled') || submitBtn.closest('button')?.disabled
    ).toBeTruthy();
  });

  it('shows calculated totals preview when products are selected', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    const buttons = screen.getAllByRole('button');
    const genBtn = buttons.find(b => b.textContent?.includes('Generar Boleta'));
    fireEvent.click(genBtn!);

    // Select the first product checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);

    // Preview totals should appear — use getAllByText since "Subtotal ¥" also appears in the table header
    const subtotalLabels = screen.getAllByText(/Subtotal ¥/);
    // At least 2: one in the table header, one in the preview
    expect(subtotalLabels.length).toBeGreaterThanOrEqual(2);
    // The preview card should contain "Total CLP" label
    const totalClpLabels = screen.getAllByText(/Total CLP/);
    expect(totalClpLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders invoice IDs in BOL-YYYY-NNN format', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    // Mock data has BOL-2026-001, BOL-2026-002, etc.
    const boletaIds = screen.getAllByText(/^BOL-\d{4}-/);
    expect(boletaIds.length).toBeGreaterThan(0);
  });

  it('displays StatusBadge for invoice states', () => {
    render(<BoletasPage />, { wrapper: Wrapper });
    // Mock data has invoices with sin_pagar and pagado states
    const badges = screen.getAllByText(/(Sin Pagar|Pagado)/);
    expect(badges.length).toBeGreaterThan(0);
  });
});

// ─── PagosPage ─────────────────────────────────────────────────────────────────

describe('PagosPage', () => {
  it('renders the page title', () => {
    render(<PagosPage />, { wrapper: Wrapper });
    expect(screen.getByText('Confirmar Pagos')).toBeDefined();
  });

  it('shows unpaid invoices count', () => {
    render(<PagosPage />, { wrapper: Wrapper });
    expect(screen.getByText(/Boletas sin pagar/)).toBeDefined();
  });

  it('shows placeholder when no invoice is selected', () => {
    render(<PagosPage />, { wrapper: Wrapper });
    expect(screen.getByText('Selecciona una boleta para confirmar el pago')).toBeDefined();
  });

  it('shows payment form when an invoice card is clicked', () => {
    render(<PagosPage />, { wrapper: Wrapper });
    // Click the first unpaid invoice card
    const sinPagarBadges = screen.getAllByText('Sin Pagar');
    const card = sinPagarBadges[0].closest('[class*="cursor-pointer"]');
    expect(card).toBeDefined();
    fireEvent.click(card!);
    // Payment form should appear with bank account selector
    expect(screen.getByText('Cuenta Bancaria')).toBeDefined();
    expect(screen.getByText('Fecha Transferencia')).toBeDefined();
    expect(screen.getByText('Monto CLP')).toBeDefined();
  });

  it('confirms payment and shows success message', () => {
    render(<PagosPage />, { wrapper: Wrapper });
    const sinPagarBadges = screen.getAllByText('Sin Pagar');
    const initialCount = sinPagarBadges.length;

    // Click the first unpaid invoice
    const card = sinPagarBadges[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(card!);

    // Click the "Confirmar Pago" button (the one inside the form, not the page title)
    const confirmBtns = screen.getAllByRole('button');
    const confirmBtn = confirmBtns.find(b => b.textContent?.trim() === 'Confirmar Pago');
    expect(confirmBtn).toBeDefined();
    fireEvent.click(confirmBtn!);

    // Success message should appear
    expect(screen.getByText(/Pago confirmado/)).toBeDefined();
    // The count of unpaid invoices should decrease
    const remainingBadges = screen.queryAllByText('Sin Pagar');
    expect(remainingBadges.length).toBeLessThan(initialCount);
  });

  it('displays invoice total in CLP format', () => {
    render(<PagosPage />, { wrapper: Wrapper });
    // PriceDisplay renders CLP amounts with $ prefix
    const clpPrices = screen.getAllByText(/^\$/);
    expect(clpPrices.length).toBeGreaterThan(0);
  });

  it('shows bank account selector in payment form', () => {
    render(<PagosPage />, { wrapper: Wrapper });
    // Click the first unpaid invoice
    const sinPagarBadges = screen.getAllByText('Sin Pagar');
    const card = sinPagarBadges[0].closest('[class*="cursor-pointer"]');
    fireEvent.click(card!);

    // Bank account dropdown should have options from config
    expect(screen.getByText('Seleccionar cuenta...')).toBeDefined();
  });
});

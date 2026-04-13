/**
 * Unit tests for ConfiguracionPage
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 22.1 (editable fields), 22.2 (changes persist in context)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfiguracionPage from './ConfiguracionPage';

const mockUpdateConfig = vi.fn();

const mockConfig = {
  metodosPago: ['Efectivo', 'JCB Bandai', 'Rakuten', 'PayPay', 'View Card', '', '', '', '', ''],
  cuentas: [
    { titular: 'Sebastian Canales', rut: '16.232.924-3', banco: 'Banco Falabella', tipo: 'Cta. Corriente', numero: '019831141187' },
    { titular: 'Enedina Silva', rut: '8.307.035-8', banco: 'Banco Falabella', tipo: 'Cta. Corriente', numero: '011810026573' },
    { titular: 'Diego Zamora', rut: '17.472.094-0', banco: 'Banco Falabella', tipo: 'Cta. Corriente', numero: '014000123337' },
  ],
  arrBodegaJP: 25000,
  appBeyblade: 550,
  comisionPct: 13,
};

vi.mock('../../contexts/ShipmentsDataContext', () => ({
  useShipmentsData: () => ({
    config: mockConfig,
    updateConfig: mockUpdateConfig,
  }),
}));

describe('ConfiguracionPage', () => {
  it('renders the Configuración heading', () => {
    render(<ConfiguracionPage />);
    expect(screen.getByText('Configuración')).toBeDefined();
  });

  it('renders Métodos de Pago section with slots', () => {
    render(<ConfiguracionPage />);
    expect(screen.getByText('Métodos de Pago')).toBeDefined();
    // First slot (Efectivo) should be present as input value
    const efectivoInput = screen.getByDisplayValue('Efectivo');
    expect(efectivoInput).toBeDefined();
    // First slot is disabled
    expect((efectivoInput as HTMLInputElement).disabled).toBe(true);
  });

  it('renders Cuentas Bancarias section with 3 accounts', () => {
    render(<ConfiguracionPage />);
    expect(screen.getByText('Cuentas Bancarias')).toBeDefined();
    expect(screen.getByText('Cuenta 1')).toBeDefined();
    expect(screen.getByText('Cuenta 2')).toBeDefined();
    expect(screen.getByText('Cuenta 3')).toBeDefined();
  });

  it('renders Parámetros section with correct initial values', () => {
    render(<ConfiguracionPage />);
    expect(screen.getByText('Parámetros')).toBeDefined();
    expect(screen.getByDisplayValue('25000')).toBeDefined();
    expect(screen.getByDisplayValue('550')).toBeDefined();
    expect(screen.getByDisplayValue('13')).toBeDefined();
  });

  it('renders bank account data in inputs', () => {
    render(<ConfiguracionPage />);
    expect(screen.getByDisplayValue('Sebastian Canales')).toBeDefined();
    expect(screen.getByDisplayValue('16.232.924-3')).toBeDefined();
    expect(screen.getByDisplayValue('Enedina Silva')).toBeDefined();
    expect(screen.getByDisplayValue('Diego Zamora')).toBeDefined();
  });

  it('calls updateConfig with edited values when Guardar is clicked', () => {
    mockUpdateConfig.mockClear();
    render(<ConfiguracionPage />);

    // Edit the arriendo bodega JP value
    const arrInput = screen.getByDisplayValue('25000');
    fireEvent.change(arrInput, { target: { value: '30000' } });

    // Click Guardar
    const saveButton = screen.getByText('Guardar');
    fireEvent.click(saveButton);

    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
    const callArg = mockUpdateConfig.mock.calls[0][0];
    expect(callArg.arrBodegaJP).toBe(30000);
    // Other values should remain unchanged
    expect(callArg.appBeyblade).toBe(550);
    expect(callArg.comisionPct).toBe(13);
  });

  it('persists edited comisión value on save', () => {
    mockUpdateConfig.mockClear();
    render(<ConfiguracionPage />);

    const comisionInput = screen.getByDisplayValue('13');
    fireEvent.change(comisionInput, { target: { value: '15' } });

    fireEvent.click(screen.getByText('Guardar'));

    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
    expect(mockUpdateConfig.mock.calls[0][0].comisionPct).toBe(15);
  });

  it('persists edited bank account data on save', () => {
    mockUpdateConfig.mockClear();
    render(<ConfiguracionPage />);

    // Edit the first account titular
    const titularInput = screen.getByDisplayValue('Sebastian Canales');
    fireEvent.change(titularInput, { target: { value: 'Juan Pérez' } });

    fireEvent.click(screen.getByText('Guardar'));

    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
    const cuentas = mockUpdateConfig.mock.calls[0][0].cuentas;
    expect(cuentas[0].titular).toBe('Juan Pérez');
    // Other accounts unchanged
    expect(cuentas[1].titular).toBe('Enedina Silva');
    expect(cuentas[2].titular).toBe('Diego Zamora');
  });

  it('persists edited payment method on save', () => {
    mockUpdateConfig.mockClear();
    render(<ConfiguracionPage />);

    // Edit the second payment method (JCB Bandai)
    const jcbInput = screen.getByDisplayValue('JCB Bandai');
    fireEvent.change(jcbInput, { target: { value: 'Visa' } });

    fireEvent.click(screen.getByText('Guardar'));

    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
    const metodos = mockUpdateConfig.mock.calls[0][0].metodosPago;
    expect(metodos[0]).toBe('Efectivo');
    expect(metodos[1]).toBe('Visa');
  });

  it('shows success toast after saving', async () => {
    vi.useFakeTimers();
    render(<ConfiguracionPage />);

    fireEvent.click(screen.getByText('Guardar'));

    expect(screen.getByText('Configuración guardada')).toBeDefined();
    vi.useRealTimers();
  });
});

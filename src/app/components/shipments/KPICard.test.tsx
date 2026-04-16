/**
 * Unit tests for KPICard component
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 21.1 (Dashboard KPI cards)
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Package, Plane, Warehouse } from 'lucide-react';
import { KPICard } from './KPICard';

describe('KPICard', () => {
  it('renders title and numeric value', () => {
    render(<KPICard title="Productos en Japón" value={7} icon={Package} />);
    expect(screen.getByText('Productos en Japón')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
  });

  it('renders string value (formatted currency)', () => {
    render(<KPICard title="Ventas del Mes" value="$14.990" icon={Package} />);
    expect(screen.getByText('Ventas del Mes')).toBeDefined();
    expect(screen.getByText('$14.990')).toBeDefined();
  });

  it('renders the icon element', () => {
    const { container } = render(<KPICard title="Cajas en Tránsito" value={3} icon={Plane} />);
    // Lucide icons render as SVG elements
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('applies variant styling for warning', () => {
    const { container } = render(
      <KPICard title="Cajas en Tránsito" value={2} icon={Plane} variant="warning" />,
    );
    const valueEl = screen.getByText('2');
    expect(valueEl.className).toContain('text-[#ffab00]');
  });

  it('applies variant styling for success', () => {
    render(<KPICard title="Cajas Llegadas" value={1} icon={Warehouse} variant="success" />);
    const valueEl = screen.getByText('1');
    expect(valueEl.className).toContain('text-[#00e676]');
  });

  it('applies variant styling for danger', () => {
    render(<KPICard title="Boletas Pendientes" value={5} icon={Package} variant="danger" />);
    const valueEl = screen.getByText('5');
    expect(valueEl.className).toContain('text-destructive');
  });

  it('applies default variant styling when no variant specified', () => {
    render(<KPICard title="Unidades en Chile" value={10} icon={Warehouse} />);
    const valueEl = screen.getByText('10');
    expect(valueEl.className).toContain('text-primary');
  });

  it('renders trend when provided', () => {
    render(
      <KPICard title="Ventas" value={100} icon={Package} trend={{ value: 15, label: 'vs mes anterior' }} />,
    );
    expect(screen.getByText(/15%/)).toBeDefined();
    expect(screen.getByText(/vs mes anterior/)).toBeDefined();
  });

  it('renders negative trend with down arrow', () => {
    render(
      <KPICard title="Ventas" value={80} icon={Package} trend={{ value: -10, label: 'vs mes anterior' }} />,
    );
    expect(screen.getByText(/↓/)).toBeDefined();
    expect(screen.getByText(/10%/)).toBeDefined();
  });
});

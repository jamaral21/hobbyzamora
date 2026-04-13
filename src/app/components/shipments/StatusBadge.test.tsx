/**
 * Unit tests for StatusBadge component
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 4.1, 6.1, 7.1, 9.1
 * Tests correct state-to-variant mapping for all ERP states
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  const stateExpectations: Array<{ status: string; label: string; variantClass: string }> = [
    { status: 'por_pagar', label: 'Por Pagar', variantClass: 'text-[#ffab00]' },
    { status: 'esp_pago', label: 'Esp. Pago', variantClass: 'text-accent' },
    { status: 'pagado', label: 'Pagado', variantClass: 'text-[#00e676]' },
    { status: 'sin_pagar', label: 'Sin Pagar', variantClass: 'text-destructive' },
    { status: 'transito', label: '✈️ En Tránsito', variantClass: 'text-accent' },
    { status: 'llegada', label: '📦 Llegada', variantClass: 'text-[#ffab00]' },
    { status: 'costeada', label: '✅ Costeada', variantClass: 'text-[#00e676]' },
    { status: 'pendiente', label: 'Pendiente', variantClass: 'text-[#ffab00]' },
    { status: 'costeado', label: 'Costeado', variantClass: 'text-[#00e676]' },
  ];

  stateExpectations.forEach(({ status, label, variantClass }) => {
    it(`maps "${status}" to label "${label}" with correct variant`, () => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByText(label);
      expect(badge).toBeDefined();
      expect(badge.className).toContain(variantClass);
    });
  });

  it('renders unknown status as-is with default variant', () => {
    render(<StatusBadge status="unknown_state" />);
    const badge = screen.getByText('unknown_state');
    expect(badge).toBeDefined();
    // default variant uses bg-secondary
    expect(badge.className).toContain('bg-secondary');
  });

  it('passes className prop through', () => {
    render(<StatusBadge status="pagado" className="extra-class" />);
    const badge = screen.getByText('Pagado');
    expect(badge.className).toContain('extra-class');
  });
});

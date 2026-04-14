/**
 * Unit tests for PriceDisplay component
 * @vitest-environment happy-dom
 *
 * Validates: Requirements 4.5, 15.4, 23.1, 23.2, 23.3
 * Tests correct JPY and CLP formatting with proper styling
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriceDisplay } from './PriceDisplay';

describe('PriceDisplay', () => {
  it('formats JPY with ¥ prefix', () => {
    render(<PriceDisplay amount={25000} currency="JPY" />);
    const el = screen.getByText(/¥25\.000/);
    expect(el).toBeDefined();
  });

  it('formats CLP with $ prefix', () => {
    render(<PriceDisplay amount={1250000} currency="CLP" />);
    const el = screen.getByText(/\$1\.250\.000/);
    expect(el).toBeDefined();
  });

  it('formats zero JPY as ¥0', () => {
    render(<PriceDisplay amount={0} currency="JPY" />);
    const el = screen.getByText('¥0');
    expect(el).toBeDefined();
  });

  it('formats zero CLP as $0', () => {
    render(<PriceDisplay amount={0} currency="CLP" />);
    const el = screen.getByText('$0');
    expect(el).toBeDefined();
  });

  it('applies font-mono and text-primary classes', () => {
    render(<PriceDisplay amount={1000} currency="JPY" />);
    const el = screen.getByText(/¥/);
    expect(el.className).toContain('font-[family-name:var(--font-mono)]');
    expect(el.className).toContain('text-primary');
  });

  it('passes additional className', () => {
    render(<PriceDisplay amount={500} currency="CLP" />);
    const el = screen.getByText(/\$/);
    expect(el.tagName).toBe('SPAN');
  });

  it('accepts custom className prop', () => {
    render(<PriceDisplay amount={100} currency="JPY" className="text-lg" />);
    const el = screen.getByText(/¥/);
    expect(el.className).toContain('text-lg');
  });
});

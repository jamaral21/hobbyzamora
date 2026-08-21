import { describe, expect, it } from 'vitest';
import { addChileDays, getChileDateKey, getChileDayRange, getChileDateRange } from './chileDate.js';

describe('Chile date ranges', () => {
  it('uses Chile midnight rather than UTC midnight during daylight saving time', () => {
    const range = getChileDayRange('2026-01-31');

    expect(range.start.toISOString()).toBe('2026-01-31T03:00:00.000Z');
    expect(range.endExclusive.toISOString()).toBe('2026-02-01T03:00:00.000Z');
  });

  it('uses the correct standard-time offset and includes the full selected range', () => {
    const range = getChileDateRange('2026-06-30', '2026-07-01');

    expect(range.start.toISOString()).toBe('2026-06-30T04:00:00.000Z');
    expect(range.endExclusive.toISOString()).toBe('2026-07-02T04:00:00.000Z');
  });

  it('handles calendar arithmetic independently of the server timezone', () => {
    expect(addChileDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(getChileDateKey(new Date('2026-01-01T02:30:00.000Z'))).toBe('2025-12-31');
  });
});
import { describe, expect, it } from 'vitest';
import { planFifoConsumption } from './inventoryService.js';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('planFifoConsumption', () => {
  it('consumes the oldest batch first and preserves each batch cost', () => {
    const result = planFifoConsumption(
      [
        { id: 'new', remaining: 10, unitCost: 15000, receivedAt: date('2026-01-01') },
        { id: 'old', remaining: 3, unitCost: 10000, receivedAt: date('2024-01-01') },
      ],
      5,
    );

    expect(result.allocations).toEqual([
      { batchId: 'old', quantity: 3, unitCost: 10000, totalCost: 30000 },
      { batchId: 'new', quantity: 2, unitCost: 15000, totalCost: 30000 },
    ]);
    expect(result.totalCost).toBe(60000);
  });

  it('ignores exhausted batches and rejects insufficient stock', () => {
    expect(() => planFifoConsumption([
      { id: 'empty', remaining: 0, unitCost: 10000, receivedAt: date('2024-01-01') },
      { id: 'available', remaining: 2, unitCost: 12000, receivedAt: date('2025-01-01') },
    ], 3)).toThrow('INSUFFICIENT_STOCK:2');
  });

  it('rejects zero, negative, and fractional quantities', () => {
    const batches = [{ id: 'batch', remaining: 2, unitCost: 10000, receivedAt: date('2024-01-01') }];

    expect(() => planFifoConsumption(batches, 0)).toThrow('INVALID_QUANTITY');
    expect(() => planFifoConsumption(batches, -1)).toThrow('INVALID_QUANTITY');
    expect(() => planFifoConsumption(batches, 1.5)).toThrow('INVALID_QUANTITY');
  });
});
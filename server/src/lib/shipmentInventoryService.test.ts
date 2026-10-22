import { describe, expect, it } from 'vitest';
import { planCosteoDestinations } from './shipmentInventoryService.js';

describe('planCosteoDestinations', () => {
  it('preserves each declared destination and defaults unassigned units to historical', () => {
    expect(planCosteoDestinations({
      received: 10,
      sellable: 4,
      collection: 2,
      personal: 1,
      holdUnassigned: false,
    })).toEqual([
      { disposition: 'SELLABLE', quantity: 4 },
      { disposition: 'COLLECTION', quantity: 2 },
      { disposition: 'PERSONAL', quantity: 1 },
      { disposition: 'HISTORICAL', quantity: 3 },
    ]);
  });

  it('leaves unassigned units pending only when explicitly requested', () => {
    expect(planCosteoDestinations({
      received: 5,
      sellable: 2,
      collection: 0,
      personal: 0,
      holdUnassigned: true,
    })).toEqual([
      { disposition: 'SELLABLE', quantity: 2 },
      { disposition: 'PENDING', quantity: 3 },
    ]);
  });

  it('rejects invalid or over-assigned quantities', () => {
    expect(() => planCosteoDestinations({
      received: 2,
      sellable: 3,
      collection: 0,
      personal: 0,
      holdUnassigned: false,
    })).toThrow('DESTINATION_EXCEEDS_RECEIVED');

    expect(() => planCosteoDestinations({
      received: 2,
      sellable: 1.5,
      collection: 0,
      personal: 0,
      holdUnassigned: false,
    })).toThrow('INVALID_DESTINATION_QUANTITY');
  });
});
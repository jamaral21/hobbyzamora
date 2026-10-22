export type InventoryDisposition = 'SELLABLE' | 'COLLECTION' | 'PERSONAL' | 'HISTORICAL' | 'PENDING';

export interface CosteoDestinationInput {
  received: number;
  sellable: number;
  collection: number;
  personal: number;
  holdUnassigned: boolean;
}

export interface CosteoDestination {
  disposition: InventoryDisposition;
  quantity: number;
}

export function planCosteoDestinations(input: CosteoDestinationInput): CosteoDestination[] {
  const values = [input.received, input.sellable, input.collection, input.personal];
  if (!values.every((value) => Number.isInteger(value) && value >= 0)) {
    throw new Error('INVALID_DESTINATION_QUANTITY');
  }

  const assigned = input.sellable + input.collection + input.personal;
  if (assigned > input.received) {
    throw new Error('DESTINATION_EXCEEDS_RECEIVED');
  }

  const unassigned = input.received - assigned;
  const destinations: CosteoDestination[] = [
    { disposition: 'SELLABLE', quantity: input.sellable },
    { disposition: 'COLLECTION', quantity: input.collection },
    { disposition: 'PERSONAL', quantity: input.personal },
    {
      disposition: input.holdUnassigned ? 'PENDING' : 'HISTORICAL',
      quantity: unassigned,
    },
  ];

  return destinations.filter((destination) => destination.quantity > 0);
}
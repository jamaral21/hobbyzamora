import { prisma } from '../index.js';

export interface FifoBatch {
  id: string;
  remaining: number;
  unitCost: number;
  receivedAt: Date;
}

export interface FifoAllocation {
  batchId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface FifoConsumption {
  allocations: FifoAllocation[];
  totalCost: number;
}

export function planFifoConsumption(
  batches: FifoBatch[],
  quantity: number,
): FifoConsumption {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('INVALID_QUANTITY');
  }

  const orderedBatches = [...batches]
    .filter((batch) => batch.remaining > 0)
    .sort((left, right) => left.receivedAt.getTime() - right.receivedAt.getTime());

  const available = orderedBatches.reduce((sum, batch) => sum + batch.remaining, 0);
  if (available < quantity) {
    throw new Error(`INSUFFICIENT_STOCK:${available}`);
  }

  let remainingToConsume = quantity;
  const allocations: FifoAllocation[] = [];

  for (const batch of orderedBatches) {
    if (remainingToConsume === 0) break;

    const consumed = Math.min(batch.remaining, remainingToConsume);
    allocations.push({
      batchId: batch.id,
      quantity: consumed,
      unitCost: batch.unitCost,
      totalCost: consumed * batch.unitCost,
    });
    remainingToConsume -= consumed;
  }

  return {
    allocations,
    totalCost: allocations.reduce((sum, allocation) => sum + allocation.totalCost, 0),
  };
}

export async function deductStockFIFO(
  productId: string,
  quantity: number,
  reference: string,
  transaction = prisma,
): Promise<FifoConsumption> {
  const batches = await transaction.inventoryBatch.findMany({
    where: {
      productId,
      remaining: { gt: 0 },
    },
    select: {
      id: true,
      remaining: true,
      unitCost: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: 'asc' },
  });

  const plan = planFifoConsumption(
    batches.map((batch) => ({
      ...batch,
      unitCost: Number(batch.unitCost),
    })),
    quantity,
  );

  for (const allocation of plan.allocations) {
    const batch = batches.find((candidate) => candidate.id === allocation.batchId);
    if (!batch) throw new Error('BATCH_NOT_FOUND');

    await transaction.inventoryBatch.update({
      where: { id: batch.id },
      data: { remaining: batch.remaining - allocation.quantity },
    });

    await transaction.inventoryMovement.create({
      data: {
        batchId: batch.id,
        type: 'OUT',
        quantity: -allocation.quantity,
        reference,
      },
    });
  }

  return plan;
}

export async function returnStockFIFO(
  productId: string,
  quantity: number,
  unitCost: number,
  reference: string,
  transaction = prisma,
): Promise<{ batchId: string }> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('INVALID_QUANTITY');
  }

  const batch = await transaction.inventoryBatch.create({
    data: {
      productId,
      batchCode: `RETURN-${Date.now()}`,
      quantity,
      remaining: quantity,
      unitCost,
    },
  });

  await transaction.inventoryMovement.create({
    data: {
      batchId: batch.id,
      type: 'RETURN',
      quantity,
      reference,
    },
  });

  return { batchId: batch.id };
}

export async function consumeOrderItemFIFO(
  transaction: any,
  params: { orderItemId: string; productId: string; quantity: number; reference: string },
): Promise<FifoConsumption> {
  const existingBatches = await transaction.inventoryBatch.count({
    where: { productId: params.productId, disposition: 'SELLABLE' },
  });

  if (existingBatches === 0) {
    const product = await transaction.product.findUnique({
      where: { id: params.productId },
      select: { id: true, sku: true, stock: true, cost: true, ean: true, createdAt: true },
    });
    if (!product || product.stock < params.quantity) throw new Error('INSUFFICIENT_STOCK:0');

    await transaction.inventoryBatch.create({
      data: {
        productId: product.id,
        batchCode: `OPENING-${product.sku}`,
        ean: product.ean,
        disposition: 'SELLABLE',
        quantity: product.stock,
        remaining: product.stock,
        unitCost: product.cost,
        receivedAt: product.createdAt,
      },
    });
  }

  const plan = await deductStockFIFO(params.productId, params.quantity, params.reference, transaction);
  await transaction.inventoryConsumption.createMany({
    data: plan.allocations.map((allocation) => ({
      orderItemId: params.orderItemId,
      batchId: allocation.batchId,
      quantity: allocation.quantity,
      unitCost: allocation.unitCost,
    })),
  });
  return plan;
}

export async function restoreOrderItemFIFO(transaction: any, orderItemId: string, reference: string): Promise<void> {
  const consumptions = await transaction.inventoryConsumption.findMany({
    where: { orderItemId },
  });

  for (const consumption of consumptions) {
    await transaction.inventoryBatch.update({
      where: { id: consumption.batchId },
      data: { remaining: { increment: consumption.quantity } },
    });
    await transaction.inventoryMovement.create({
      data: { batchId: consumption.batchId, type: 'RETURN', quantity: consumption.quantity, reference },
    });
  }
}
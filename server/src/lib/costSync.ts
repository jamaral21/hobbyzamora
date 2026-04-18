import type { Prisma, PrismaClient } from '@prisma/client';

type CostSyncClient = PrismaClient | Prisma.TransactionClient;

export async function syncHistoricalCostForProduct(
  db: CostSyncClient,
  params: { productId: string; sku: string; cost: number },
) {
  const nextCost = Number(params.cost);

  const [orderItems, inventoryBatches] = await Promise.all([
    db.orderItem.updateMany({
      where: {
        OR: [
          { productId: params.productId },
          { sku: params.sku },
        ],
      },
      data: {
        cost: nextCost,
      },
    }),
    db.inventoryBatch.updateMany({
      where: {
        productId: params.productId,
      },
      data: {
        unitCost: nextCost,
      },
    }),
  ]);

  return {
    orderItemsUpdated: orderItems.count,
    inventoryBatchesUpdated: inventoryBatches.count,
  };
}

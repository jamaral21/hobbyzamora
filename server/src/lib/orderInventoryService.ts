import { consumeOrderItemFIFO, restoreOrderItemFIFO } from './inventoryService.js';

export async function consumeOrderInventory(transaction: any, orderId: string): Promise<void> {
  const order = await transaction.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error('ORDER_NOT_FOUND');

  for (const item of order.items) {
    const product = await transaction.product.findUnique({
      where: { id: item.productId },
      select: { isPresale: true },
    });
    if (product?.isPresale) continue;

    const previous = await transaction.inventoryConsumption.count({ where: { orderItemId: item.id } });
    if (previous > 0) continue;

    const plan = await consumeOrderItemFIFO(transaction, {
      orderItemId: item.id,
      productId: item.productId,
      quantity: item.quantity,
      reference: `ORDER:${order.orderNumber}`,
    });
    await transaction.orderItem.update({
      where: { id: item.id },
      data: { cost: plan.totalCost / item.quantity },
    });
    await transaction.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }
}

export async function restoreOrderInventory(transaction: any, orderId: string): Promise<void> {
  const order = await transaction.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  for (const item of order.items) {
    const consumed = await transaction.inventoryConsumption.count({ where: { orderItemId: item.id } });
    if (consumed === 0) continue;
    await restoreOrderItemFIFO(transaction, item.id, `CANCELLED_ORDER:${order.orderNumber}`);
    await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
}
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow running from repo root or from server/ while still resolving DATABASE_URL.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      stock: true,
      initialStock: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (products.length === 0) {
    console.log('No hay productos para procesar.');
    return;
  }

  const soldItems = await prisma.orderItem.findMany({
    where: {
      order: {
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
    },
    select: {
      productId: true,
      quantity: true,
    },
  });

  const soldByProduct = new Map<string, number>();
  for (const item of soldItems) {
    soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const updates = products.map((product) => {
    const sold = soldByProduct.get(product.id) ?? 0;
    const computedInitialStock = product.stock + sold;

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      currentStock: product.stock,
      sold,
      previousInitialStock: product.initialStock,
      computedInitialStock,
      changed: product.initialStock !== computedInitialStock,
    };
  });

  const changedRows = updates.filter((row) => row.changed);

  console.log(`Productos totales: ${updates.length}`);
  console.log(`Productos con cambio en initialStock: ${changedRows.length}`);

  if (changedRows.length > 0) {
    console.log('Muestra (hasta 20 cambios):');
    changedRows.slice(0, 20).forEach((row) => {
      console.log(
        `${row.sku} | stock=${row.currentStock} + vendidos=${row.sold} => initialStock=${row.computedInitialStock} (antes=${row.previousInitialStock})`
      );
    });
  }

  if (isDryRun) {
    console.log('Dry run activo: no se realizaron cambios.');
    return;
  }

  if (changedRows.length === 0) {
    console.log('No hay cambios por aplicar.');
    return;
  }

  const result = await prisma.$transaction(
    changedRows.map((row) =>
      prisma.product.update({
        where: { id: row.id },
        data: { initialStock: row.computedInitialStock },
      })
    )
  );

  console.log(`Backfill completado. Productos actualizados: ${result.length}`);
}

main()
  .catch((error) => {
    console.error('Error ejecutando backfill de initialStock:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

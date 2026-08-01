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

// Entidades de AuditLog generadas por el módulo Shipments (no son tablas shipments_*).
const SHIPMENTS_AUDIT_ENTITIES = ['ShipmentsCompraChile', 'ShipmentsGavChile'];

async function countRows() {
  const [
    purchases,
    invoices,
    invoiceItems,
    boxes,
    boxProducts,
    chileStock,
    webOrders,
    webOrderProducts,
    localPurchases,
    sales,
    gavChile,
    gavMonthControl,
    config,
    auditLogs,
  ] = await Promise.all([
    prisma.shipmentsPurchase.count(),
    prisma.shipmentsInvoice.count(),
    prisma.shipmentsInvoiceItem.count(),
    prisma.shipmentsBox.count(),
    prisma.shipmentsBoxProduct.count(),
    prisma.shipmentsChileStock.count(),
    prisma.shipmentsWebOrder.count(),
    prisma.shipmentsWebOrderProduct.count(),
    prisma.shipmentsLocalPurchase.count(),
    prisma.shipmentsSale.count(),
    prisma.shipmentsGavChile.count(),
    prisma.shipmentsGavMonthControl.count(),
    prisma.shipmentsConfig.count(),
    prisma.auditLog.count({ where: { entity: { in: SHIPMENTS_AUDIT_ENTITIES } } }),
  ]);

  return {
    purchases,
    invoices,
    invoiceItems,
    boxes,
    boxProducts,
    chileStock,
    webOrders,
    webOrderProducts,
    localPurchases,
    sales,
    gavChile,
    gavMonthControl,
    config,
    auditLogs,
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes('--yes');

  const before = await countRows();
  const totalToDelete =
    before.purchases +
    before.invoices +
    before.invoiceItems +
    before.boxes +
    before.boxProducts +
    before.chileStock +
    before.webOrders +
    before.webOrderProducts +
    before.localPurchases +
    before.sales +
    before.gavChile +
    before.gavMonthControl +
    before.auditLogs;

  console.log('Registros actuales de Shipments:');
  console.table(before);
  console.log(`Se conservará la configuración (shipments_config: ${before.config} registro(s)).`);
  console.log(`Total de filas a eliminar: ${totalToDelete}`);

  if (totalToDelete === 0) {
    console.log('No hay datos para borrar. Nada que hacer.');
    return;
  }

  if (isDryRun) {
    console.log('\n--dry-run activo: no se realizó ningún cambio.');
    return;
  }

  if (!confirmed) {
    console.log(
      '\nEjecuta de nuevo con --yes para confirmar el borrado, o --dry-run para solo previsualizar.'
    );
    console.log('Recomendado: corre "npm run shipments:backup" antes de continuar.');
    process.exitCode = 1;
    return;
  }

  // Orden de borrado respetando dependencias de FK; shipments_config se preserva.
  await prisma.$transaction([
    prisma.shipmentsGavMonthControl.deleteMany(),
    prisma.shipmentsInvoiceItem.deleteMany(),
    prisma.shipmentsInvoice.deleteMany(),
    prisma.shipmentsBoxProduct.deleteMany(),
    prisma.shipmentsBox.deleteMany(),
    prisma.shipmentsChileStock.deleteMany(),
    prisma.shipmentsWebOrderProduct.deleteMany(),
    prisma.shipmentsWebOrder.deleteMany(),
    prisma.shipmentsLocalPurchase.deleteMany(),
    prisma.shipmentsSale.deleteMany(),
    prisma.shipmentsGavChile.deleteMany(),
    prisma.shipmentsPurchase.deleteMany(),
    prisma.auditLog.deleteMany({ where: { entity: { in: SHIPMENTS_AUDIT_ENTITIES } } }),
  ]);

  const after = await countRows();
  console.log('\nBorrado completo. Estado final:');
  console.table(after);
}

main()
  .catch((error) => {
    console.error('Error al reiniciar datos de Shipments:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

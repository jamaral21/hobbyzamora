import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '/var/www/hobbyzamora/shared/.env' });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const SOURCE_BARCODE = '4904810085546';
const TARGET_BARCODE = '123456789';
const TARGET_CAPACITY = 92;

type Buyer = {
  email: string;
  userId: string;
  name: string;
};

async function loadPlan(): Promise<{
  sourceProduct: { id: string; name: string };
  targetProduct: {
    id: string;
    name: string;
    presaleAvailQty: number | null;
  };
  buyers: Buyer[];
  existingUserIds: Set<string>;
  missingBuyers: Buyer[];
  activeReservedUnits: number;
}> {
  const sourceProducts = await prisma.product.findMany({
    where: { ean: SOURCE_BARCODE },
    select: { id: true, name: true },
  });
  if (sourceProducts.length !== 1) {
    throw new Error(`Se esperaba un producto origen para ${SOURCE_BARCODE}, encontrados: ${sourceProducts.length}`);
  }

  const targetProducts = await prisma.product.findMany({
    where: { ean: TARGET_BARCODE, status: 'ACTIVE' },
    select: { id: true, name: true, presaleAvailQty: true, isPresale: true },
  });
  if (targetProducts.length !== 1) {
    throw new Error(`Se esperaba un producto activo para ${TARGET_BARCODE}, encontrados: ${targetProducts.length}`);
  }

  const targetProduct = targetProducts[0];
  if (!targetProduct.isPresale) {
    throw new Error(`El producto objetivo ${targetProduct.name} no está marcado como preventa`);
  }

  const sourceItems = await prisma.orderItem.findMany({
    where: {
      productId: sourceProducts[0].id,
      order: { status: { not: 'CANCELLED' } },
    },
    select: { order: { select: { customerEmail: true } } },
  });
  const emails = [...new Set(sourceItems.map(({ order }) => order.customerEmail.trim().toLowerCase()))];
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true },
  });
  const usersByEmail = new Map(users.map((user) => [user.email.trim().toLowerCase(), user]));
  const missingUsers = emails.filter((email) => !usersByEmail.has(email));
  if (missingUsers.length > 0) {
    throw new Error(`No se encontraron usuarios para: ${missingUsers.join(', ')}`);
  }

  const buyers = emails.map((email) => {
    const user = usersByEmail.get(email)!;
    return { email, userId: user.id, name: user.name };
  });
  const existingReservations = await prisma.presaleReservation.findMany({
    where: { productId: targetProduct.id, userId: { in: buyers.map((buyer) => buyer.userId) } },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingReservations.map((reservation) => reservation.userId));
  const missingBuyers = buyers.filter((buyer) => !existingUserIds.has(buyer.userId));
  const activeReservations = await prisma.presaleReservation.aggregate({
    where: {
      productId: targetProduct.id,
      status: { in: ['PENDING', 'NOTIFIED', 'PAID'] },
    },
    _sum: { quantity: true },
  });

  return {
    sourceProduct: sourceProducts[0],
    targetProduct,
    buyers,
    existingUserIds,
    missingBuyers,
    activeReservedUnits: activeReservations._sum.quantity ?? 0,
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const plan = await loadPlan();
  const expectedFinalReservedUnits = plan.activeReservedUnits + plan.missingBuyers.length;

  if (expectedFinalReservedUnits !== TARGET_CAPACITY) {
    throw new Error(
      `La capacidad esperada no coincide: reservas activas actuales ${plan.activeReservedUnits} + ` +
      `faltantes ${plan.missingBuyers.length} = ${expectedFinalReservedUnits}, capacidad objetivo ${TARGET_CAPACITY}`,
    );
  }

  if (plan.targetProduct.presaleAvailQty !== null &&
      plan.targetProduct.presaleAvailQty !== 59 &&
      plan.targetProduct.presaleAvailQty !== TARGET_CAPACITY) {
    throw new Error(
      `presaleAvailQty inesperado (${plan.targetProduct.presaleAvailQty}); se esperaba 59 o ${TARGET_CAPACITY}`,
    );
  }

  console.log(`Producto origen: ${plan.sourceProduct.name} (${SOURCE_BARCODE})`);
  console.log(`Producto objetivo: ${plan.targetProduct.name} (${TARGET_BARCODE})`);
  console.log(`Clientes beneficiarios: ${plan.buyers.length}`);
  console.log(`Reservas existentes conservadas: ${plan.existingUserIds.size}`);
  console.log(`Reservas nuevas: ${plan.missingBuyers.length}`);
  console.log(`Capacidad: ${plan.targetProduct.presaleAvailQty} -> ${TARGET_CAPACITY}`);

  if (plan.missingBuyers.length > 0) {
    for (const buyer of plan.missingBuyers) {
      console.log(`- ${buyer.email} | ${buyer.name}`);
    }
  }

  if (isDryRun) {
    console.log('Dry run activo: no se realizaron cambios.');
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentTarget = await tx.product.findUnique({
      where: { id: plan.targetProduct.id },
      select: { presaleAvailQty: true, status: true, isPresale: true },
    });
    if (!currentTarget || currentTarget.status !== 'ACTIVE' || !currentTarget.isPresale) {
      throw new Error('El producto objetivo cambió de estado antes de aplicar el seed');
    }

    const currentReservations = await tx.presaleReservation.findMany({
      where: { productId: plan.targetProduct.id },
      select: { userId: true, status: true, quantity: true },
    });
    const currentUserIds = new Set(currentReservations.map((reservation) => reservation.userId));
    const currentActiveUnits = currentReservations
      .filter((reservation) => ['PENDING', 'NOTIFIED', 'PAID'].includes(reservation.status))
      .reduce((total, reservation) => total + reservation.quantity, 0);
    const buyersToCreate = plan.buyers.filter((buyer) => !currentUserIds.has(buyer.userId));

    if (currentActiveUnits + buyersToCreate.length !== TARGET_CAPACITY) {
      throw new Error('La cantidad de reservas cambió durante la preparación; no se aplicaron cambios');
    }

    const updatedProduct = await tx.product.update({
      where: { id: plan.targetProduct.id },
      data: { presaleAvailQty: TARGET_CAPACITY },
      select: { presaleAvailQty: true },
    });

    for (const buyer of buyersToCreate) {
      await tx.presaleReservation.create({
        data: { userId: buyer.userId, productId: plan.targetProduct.id, quantity: 1, status: 'PENDING' },
      });
    }

    return { created: buyersToCreate.length, capacity: updatedProduct.presaleAvailQty };
  });

  console.log(`Reservas creadas: ${result.created}`);
  console.log(`Capacidad actualizada a: ${result.capacity}`);
}

main()
  .catch((error) => {
    console.error('Error ejecutando seed de beneficiarios de preventa:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

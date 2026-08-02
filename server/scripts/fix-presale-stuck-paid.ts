// Corrige reservas de preventa marcadas como PAID sin que el pago realmente se haya
// aprobado. Bug: al crear una orden con pago con tarjeta, la reserva se marcaba PAID
// antes de que Getnet confirmara la aprobacion; si el pago era rechazado, la orden
// quedaba CANCELLED pero la reserva se quedaba "atascada" en PAID y el cliente ya no
// podia reintentar el pago. Este script revierte esas reservas a NOTIFIED (con un
// nuevo plazo de pago) solo cuando no existe ninguna orden realmente aprobada para
// ese usuario/producto.
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getPresalePaymentExpiry } from '../src/lib/presaleUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const SUCCESSFUL_ORDER_STATUSES = ['PROCESSING', 'SHIPPED', 'DELIVERED'];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const paidReservations = await prisma.presaleReservation.findMany({
    where: { status: 'PAID' },
    include: {
      user: { select: { email: true, name: true } },
      product: { select: { name: true, isPresale: true, status: true, presaleEndDate: true } },
    },
  });

  if (paidReservations.length === 0) {
    console.log('No hay reservas en estado PAID.');
    return;
  }

  const now = new Date();
  const toRevert: typeof paidReservations = [];

  for (const reservation of paidReservations) {
    const relatedOrders = await prisma.order.findMany({
      where: {
        userId: reservation.userId,
        items: { some: { productId: reservation.productId } },
      },
      select: { status: true },
    });

    const hasSuccessfulOrder = relatedOrders.some((o) => SUCCESSFUL_ORDER_STATUSES.includes(o.status));
    if (hasSuccessfulOrder) continue;

    const product = reservation.product;
    const stillEligible =
      product.isPresale &&
      product.status === 'ACTIVE' &&
      (!product.presaleEndDate || new Date(product.presaleEndDate) > now);

    if (!stillEligible) continue;

    toRevert.push(reservation);
  }

  console.log(`Reservas en PAID: ${paidReservations.length}`);
  console.log(`Reservas sin pago aprobado real y elegibles para reintento: ${toRevert.length}`);

  if (toRevert.length > 0) {
    console.log('Detalle:');
    for (const r of toRevert) {
      console.log(`- ${r.user.email} | ${r.product.name} (reservationId=${r.id})`);
    }
  }

  if (isDryRun) {
    console.log('Dry run activo: no se realizaron cambios.');
    return;
  }

  if (toRevert.length === 0) {
    console.log('No hay cambios por aplicar.');
    return;
  }

  const expiresAt = getPresalePaymentExpiry(now);
  const result = await prisma.presaleReservation.updateMany({
    where: { id: { in: toRevert.map((r) => r.id) } },
    data: { status: 'NOTIFIED', notifiedAt: now, expiresAt, paidAt: null },
  });

  console.log(`Reservas revertidas a NOTIFIED (pueden reintentar el pago): ${result.count}`);
}

main()
  .catch((error) => {
    console.error('Error ejecutando fix de reservas de preventa atascadas en PAID:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

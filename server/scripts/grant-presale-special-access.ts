import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sendPresaleArrivalEmail } from '../src/lib/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const isDryRun = process.argv.includes('--dry-run');
  const qtyArg = process.argv.find((a) => a.startsWith('--qty='));
  const targetQty = qtyArg ? parseInt(qtyArg.split('=')[1], 10) : null;

  const positionalArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  const sku = positionalArgs[0] || 'HBZ-LUX-009';
  const targetEmails = positionalArgs.slice(1).length > 0 ? positionalArgs.slice(1) : [
    'sebastiancanales1986@gmail.com',
    'diego.ibacache@alumnos.ucn.cl',
  ];

  console.log(`Buscando producto con SKU: ${sku}`);
  const product = await prisma.product.findUnique({
    where: { sku },
    select: { id: true, name: true, sku: true, isPresale: true, presaleEndDate: true },
  });

  if (!product) {
    console.error(`Producto con SKU ${sku} no encontrado.`);
    process.exit(1);
  }

  console.log(`Producto encontrado: ${product.name} (ID: ${product.id}, Preventa: ${product.isPresale})`);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días de plazo para pagar

  for (const email of targetEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`Usuario no encontrado con email: ${email}`);
      continue;
    }

    console.log(`Procesando usuario: ${user.name} (${user.email})`);

    const existingReservation = await prisma.presaleReservation.findUnique({
      where: { userId_productId: { userId: user.id, productId: product.id } },
    });

    let reservationId = existingReservation?.id;

    const requestedQty = targetQty ?? (existingReservation?.quantity || 1);

    if (existingReservation) {
      console.log(`  Reserva existente ID: ${existingReservation.id}, Estado actual: ${existingReservation.status}, Cantidad anterior: ${existingReservation.quantity}`);
      if (isDryRun) {
        console.log(`  [DRY RUN] Se actualizaría la reserva a NOTIFIED con ${requestedQty} unidad(es) y vencimiento ${expiresAt.toISOString()}`);
      } else {
        const updated = await prisma.presaleReservation.update({
          where: { id: existingReservation.id },
          data: {
            status: 'NOTIFIED',
            notifiedAt: now,
            expiresAt,
            quantity: requestedQty,
            cancelledAt: null,
            cancellationReason: null,
            cancelledBy: null,
          },
        });
        reservationId = updated.id;
        console.log(`  Reserva actualizada exitosamente a NOTIFIED con ${requestedQty} unidad(es).`);
      }
    } else {
      console.log(`  No tenía reserva previa.`);
      if (isDryRun) {
        console.log(`  [DRY RUN] Se crearía una reserva NOTIFIED con ${requestedQty} unidad(es) y vencimiento ${expiresAt.toISOString()}`);
      } else {
        const created = await prisma.presaleReservation.create({
          data: {
            userId: user.id,
            productId: product.id,
            quantity: requestedQty,
            status: 'NOTIFIED',
            notifiedAt: now,
            expiresAt,
          },
        });
        reservationId = created.id;
        console.log(`  Nueva reserva NOTIFIED creada exitosamente con ${requestedQty} unidad(es).`);
      }
    }

    if (!isDryRun && reservationId) {
      try {
        await sendPresaleArrivalEmail(user.email, user.name, product.name, reservationId);
        console.log(`  Email de notificación enviado correctamente a ${user.email}`);
      } catch (err: any) {
        console.error(`  Error enviando email a ${user.email}:`, err?.message || err);
      }
    }
  }

  console.log('Proceso finalizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

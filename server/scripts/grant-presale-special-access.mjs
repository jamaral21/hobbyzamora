import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function sendPresaleArrivalEmail(email, name, productName) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY no configurado, omitiendo envío de email.');
    return;
  }
  const BASE_URL = process.env.FRONTEND_URL || 'https://hobbyzamora.cl';
  const link = `${BASE_URL}/store/presales`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>¡Tu preventa llegó! – ${productName}</title></head>
<body style="background:#0a0a0f;color:#e8e6f0;font-family:sans-serif;padding:32px;">
  <div style="max-width:580px;margin:0 auto;background:#12121a;padding:24px;border-radius:16px;border:1px solid rgba(255,214,10,0.15)">
    <h2>¡Hola, ${name}! 🎉</h2>
    <p>Tu producto reservado ha llegado a nuestra tienda:</p>
    <div style="text-align:center;padding:20px;background:#1a1a26;border-radius:12px;margin:16px 0">
      <span style="font-size:18px;font-weight:700;color:#ffd60a">${productName}</span>
    </div>
    <p>Tienes <strong style="color:#ffd60a">7 días</strong> para ir a pagar tu preventa.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${link}" style="background:#ffd60a;color:#000;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;display:inline-block">Ver mis preventas y pagar</a>
    </div>
  </div>
</body>
</html>`;

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { email: 'no-reply@hobbyzamora.cl', name: 'HobbyZamora' },
      to: [{ email, name }],
      subject: `¡Tu preventa llegó! Tienes plazo para pagar – HobbyZamora`,
      htmlContent: html,
    },
    {
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
    }
  );
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const qtyArg = process.argv.find((a) => a.startsWith('--qty='));
  const targetQty = qtyArg ? parseInt(qtyArg.split('=')[1], 10) : null;

  const positionalArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  const sku = positionalArgs[0] || 'HBZ-BBX-001';
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
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días de plazo

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
        await sendPresaleArrivalEmail(user.email, user.name, product.name);
        console.log(`  Email de notificación enviado correctamente a ${user.email}`);
      } catch (err) {
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

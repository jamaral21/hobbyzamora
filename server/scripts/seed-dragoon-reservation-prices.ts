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

const TARGET_BARCODE = '123456789';
const BENEFICIARY_PRICE = 50_000;
const STANDARD_PRICE = 45_000;
const PUBLIC_PRICE = 50_000;
const ORIGINAL_BENEFICIARY_EMAILS = [
  'ddego.fz@gmail.com',
  'poke.basti123@gmail.com',
  'jorge500100@gmail.com',
  'diegonv94@gmail.com',
  'darkthaliajoel38@gmail.com',
  'hxxxx07@icloud.com',
  'doyleeeeegg@gmail.com',
  'jordanmunozcelis@gmail.com',
  'lucianomatias.312006@gmail.com',
  'anibal.ac.cortez@gmail.com',
  'josh.neira.v@gmail.com',
  'jsilva.edf14@gmail.com',
  'ignacio-lopez@live.cl',
  'coachmafialor@gmail.com',
  'felipao2001@gmail.com',
  'norman.alarcon.music@gmail.com',
  'cristhofermoncada26@gmail.com',
  'camilocornejoc@hotmail.com',
  'sebastiancanales1986@gmail.com',
  'agustinemch@gmail.com',
  'manuel.s.araneda@gmail.com',
  'erick.castro.dsw@gmail.com',
  'kine.montenegro@gmail.com',
  'veraluciano7@gmail.com',
  'axeldaniel1011@gmail.com',
  'wipa.herlla95@gmail.com',
  'mauricioecc08@gmail.com',
  'alexmauricioandradeslagos@gmail.com',
  'nicku.gonzalez@gmail.com',
  'jordanmauricio01@gmail.com',
  'publi.elemetal@gmail.com',
  'diegowolleter33@gmail.com',
  'jotarg92@gmail.com',
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  const targetProducts = await prisma.product.findMany({
      where: { ean: TARGET_BARCODE, status: 'ACTIVE' },
      select: { id: true, name: true, price: true, isPresale: true },
    });
  if (targetProducts.length !== 1 || !targetProducts[0].isPresale) {
    throw new Error(`Se esperaba una preventa activa para ${TARGET_BARCODE}, encontradas: ${targetProducts.length}`);
  }

  const targetProduct = targetProducts[0];
  const beneficiaryUsers = await prisma.user.findMany({
    where: { email: { in: ORIGINAL_BENEFICIARY_EMAILS } },
    select: { id: true, email: true },
  });
  if (beneficiaryUsers.length !== ORIGINAL_BENEFICIARY_EMAILS.length) {
    throw new Error('No se encontraron todos los usuarios beneficiarios');
  }

  const beneficiaryUserIds = beneficiaryUsers.map((user) => user.id);
  const existingBeneficiaryReservations = await prisma.presaleReservation.findMany({
    where: { productId: targetProduct.id, userId: { in: beneficiaryUserIds } },
    select: { userId: true },
  });
  if (existingBeneficiaryReservations.length !== beneficiaryUserIds.length) {
    throw new Error('Falta al menos una reserva de los 33 beneficiarios originales');
  }

  const existingReservations = await prisma.presaleReservation.count({
    where: { productId: targetProduct.id },
  });

  console.log(`Producto: ${targetProduct.name} (${TARGET_BARCODE})`);
  console.log(`Precio público: $${targetProduct.price.toString()} -> $${PUBLIC_PRICE}`);
  console.log(`Reservas a $${BENEFICIARY_PRICE}: ${beneficiaryUserIds.length}`);
  console.log(`Resto de reservas a $${STANDARD_PRICE}: ${existingReservations - beneficiaryUserIds.length}`);

  if (isDryRun) {
    console.log('Dry run activo: no se realizaron cambios.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: targetProduct.id },
      data: { price: PUBLIC_PRICE },
    });
    await tx.presaleReservation.updateMany({
      where: { productId: targetProduct.id },
      data: { reservedPrice: STANDARD_PRICE },
    });
    await tx.presaleReservation.updateMany({
      where: {
        productId: targetProduct.id,
        userId: { in: beneficiaryUserIds },
      },
      data: { reservedPrice: BENEFICIARY_PRICE },
    });
  });

  console.log('Precios de preventa actualizados correctamente.');
}

main()
  .catch((error) => {
    console.error('Error asignando precios de preventa Dragoon:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

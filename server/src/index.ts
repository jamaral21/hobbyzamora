import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing routes
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { sendPresaleArrivalEmail } from './lib/emailService.js';
import { getPresalePaymentExpiry } from './lib/presaleUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import inventoryRoutes from './routes/inventory.js';
import cartRoutes from './routes/cart.js';
import customerRoutes from './routes/customers.js';
import analyticsRoutes from './routes/analytics.js';
import instagramRoutes from './routes/instagram.js';
import reviewsRoutes from './routes/reviews.js';
import posRoutes from './routes/pos.js';
import paymentRoutes from './routes/payments.js';
import chatRoutes from './routes/chat.js';
import wishlistRoutes from './routes/wishlist.js';
import presaleRoutes from './routes/presale.js';
import shipmentsRoutes from './routes/shipments.js';
import uploadsRoutes from './routes/uploads.js';
import siteMaintenanceRoutes from './routes/siteMaintenance.js';

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '100mb' }));

// Serve uploaded files
const resolveUploadsDir = () => {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  const sharedUploads = '/var/www/hobbyzamora/shared/uploads';
  if (fs.existsSync(sharedUploads)) {
    return sharedUploads;
  }

  return path.resolve(process.cwd(), 'uploads');
};

const uploadsDir = resolveUploadsDir();
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/presale', presaleRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/upload', uploadsRoutes);
app.use('/api/site-maintenance', siteMaintenanceRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 API available at http://localhost:${PORT}/api`);
  console.log(`🗂️ Uploads served from ${uploadsDir}`);
});

// ─── Presale expiration job ──────────────────────────────────────────────────
// Runs every 15 minutes. Marks NOTIFIED reservations past their expiresAt as
// EXPIRED, then reassigns released slots FIFO to PENDING reservations when possible.
// Any unreassigned slots are restored to sellable stock.
async function expirePresaleReservations() {
  try {
    const now = new Date();
    const reassignNow = new Date();
    const reassignExpiresAt = getPresalePaymentExpiry(reassignNow);
    const expired = await prisma.presaleReservation.findMany({
      where: {
        status: 'NOTIFIED',
        expiresAt: { lte: now },
      },
      select: { id: true, productId: true },
    });

    if (expired.length === 0) return;

    type PromotedReservation = {
      id: string;
      user: { name: string; email: string };
      product: { name: string };
    };

    let promotedForEmail: PromotedReservation[] = [];
    const promotedByProduct: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      // Mark all as EXPIRED
      await tx.presaleReservation.updateMany({
        where: { id: { in: expired.map((r) => r.id) } },
        data: { status: 'EXPIRED' },
      });

      // Restore sellable stock per product (group by productId)
      const countByProduct = expired.reduce<Record<string, number>>((acc, r) => {
        acc[r.productId] = (acc[r.productId] ?? 0) + 1;
        return acc;
      }, {});

      for (const [productId, count] of Object.entries(countByProduct)) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, isPresale: true, status: true },
        });

        let promotedCount = 0;
        if (product?.isPresale && product.status === 'ACTIVE') {
          const pendingToNotify = await tx.presaleReservation.findMany({
            where: { productId, status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: count,
            include: {
              user: { select: { name: true, email: true } },
              product: { select: { name: true } },
            },
          });

          if (pendingToNotify.length > 0) {
            await tx.presaleReservation.updateMany({
              where: {
                id: { in: pendingToNotify.map((r) => r.id) },
                status: 'PENDING',
              },
              data: { status: 'NOTIFIED', notifiedAt: reassignNow, expiresAt: reassignExpiresAt },
            });

            promotedCount = pendingToNotify.length;
            promotedForEmail = [...promotedForEmail, ...pendingToNotify];
          }
        }

        promotedByProduct[productId] = promotedCount;
        const remainingForStock = Math.max(0, count - promotedCount);

        if (remainingForStock > 0) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: remainingForStock } },
          });
        }
      }
    });

    if (promotedForEmail.length > 0) {
      await Promise.all(
        promotedForEmail.map((r) =>
          sendPresaleArrivalEmail(r.user.email, r.user.name, r.product.name, r.id).catch((err) => {
            console.error(`[presale] Error al enviar email de reasignación a ${r.user.email}:`, err);
          })
        )
      );
    }

    const promotedTotal = Object.values(promotedByProduct).reduce((acc, v) => acc + v, 0);
    console.log(`[presale] Expiradas ${expired.length} reserva(s). Reasignadas FIFO: ${promotedTotal}.`);
  } catch (err) {
    console.error('[presale] Error en job de expiración:', err);
  }
}

async function closeExpiredPresaleProducts() {
  try {
    const now = new Date();
    const result = await prisma.product.updateMany({
      where: {
        isPresale: true,
        status: 'ACTIVE',
        presaleEndDate: { lte: now },
      },
      data: { status: 'HIDDEN' },
    });

    if (result.count > 0) {
      console.log(`[presale] Cerradas ${result.count} preventa(s) vencidas por fecha.`);
    }
  } catch (err) {
    console.error('[presale] Error al cerrar preventas vencidas:', err);
  }
}

async function runPresaleMaintenance() {
  await expirePresaleReservations();
  await closeExpiredPresaleProducts();
}

// Run once at startup, then every 15 minutes
runPresaleMaintenance();
setInterval(runPresaleMaintenance, 15 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

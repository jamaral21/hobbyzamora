import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing routes
dotenv.config();

import { PrismaClient } from '@prisma/client';

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
import posRoutes from './routes/pos.js';
import paymentRoutes from './routes/payments.js';
import chatRoutes from './routes/chat.js';
import wishlistRoutes from './routes/wishlist.js';
import presaleRoutes from './routes/presale.js';
import shipmentsRoutes from './routes/shipments.js';

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
app.use('/api/pos', posRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/presale', presaleRoutes);
app.use('/api/shipments', shipmentsRoutes);

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
// EXPIRED and restores the sellable stock on the product.
async function expirePresaleReservations() {
  try {
    const now = new Date();
    const expired = await prisma.presaleReservation.findMany({
      where: {
        status: 'NOTIFIED',
        expiresAt: { lte: now },
      },
      select: { id: true, productId: true },
    });

    if (expired.length === 0) return;

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
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: count } },
        });
      }
    });

    console.log(`[presale] Expiradas ${expired.length} reserva(s). Stock restaurado.`);
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

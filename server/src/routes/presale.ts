import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import {
  sendPresaleReservationEmail,
  sendPresaleArrivalEmail,
  sendPresaleExpiredEmail,
} from '../lib/emailService.js';
import {
  getPresalePaymentExpiry,
  getPresaleUnavailableReason,
  PRESALE_EXPIRATION_SECONDS,
} from '../lib/presaleUtils.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((i): i is string => typeof i === 'string');
  if (typeof images !== 'string' || !images.trim()) return [];
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) return parsed.filter((i): i is string => typeof i === 'string');
  } catch { /* noop */ }
  return [images];
}

// ─── Customer routes ──────────────────────────────────────────────────────────

/**
 * POST /api/presale/reserve/:productId
 * Authenticated: reserve a presale product (1 per user per product).
 */
router.post('/reserve/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    const productId = req.params.productId as string;
    const userId = req.user!.id;

    const [product, user] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, presaleBanned: true },
      }),
    ]);

    if (!product || product.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.presaleBanned) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada para futuras preventas. Contacta al administrador.' });
    }

    const unavailableReason = getPresaleUnavailableReason(product);
    if (unavailableReason) {
      return res.status(400).json({ error: unavailableReason });
    }

    // Check if user already has a reservation for this product
    const existing = await prisma.presaleReservation.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing && existing.status !== 'CANCELLED' && existing.status !== 'EXPIRED') {
      return res.status(400).json({ error: 'Ya tienes una reserva para este producto' });
    }

    // Create reservation & decrement available qty atomically
    const reservation = await prisma.$transaction(async (tx) => {
      const r = existing
        ? await tx.presaleReservation.update({
            where: { id: existing.id },
            data: {
              status: 'PENDING',
              notifiedAt: null,
              expiresAt: null,
              paidAt: null,
              cancelledAt: null,
              cancellationReason: null,
              cancelledBy: null,
            },
            include: { product: { select: { id: true, name: true, price: true, images: true } } },
          })
        : await tx.presaleReservation.create({
            data: { userId, productId, status: 'PENDING' },
            include: { product: { select: { id: true, name: true, price: true, images: true } } },
          });

      if (product.presaleAvailQty !== null) {
        await tx.product.update({
          where: { id: productId },
          data: { presaleAvailQty: { decrement: 1 } },
        });
      }
      return r;
    });

    // Send confirmation email (non-blocking)
    sendPresaleReservationEmail(
      user.email,
      user.name,
      reservation.product.name,
      parseFloat((reservation.product.price as any).toString()),
    ).catch((err) => console.error('[presale] Error al enviar email de reserva:', err));

    return res.status(201).json({
      reservation: {
        ...reservation,
        product: {
          ...reservation.product,
          images: parseImages(reservation.product.images),
          price: parseFloat((reservation.product.price as any).toString()),
        },
      },
    });
  } catch (error) {
    console.error('Presale reserve error:', error);
    return res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

/**
 * DELETE /api/presale/reserve/:productId
 * Authenticated: cancel own pending reservation.
 */
router.delete('/reserve/:productId', authenticate, async (_req: AuthRequest, res) => {
  return res.status(403).json({ error: 'Solo un administrador puede cancelar reservas de preventa' });
});

/**
 * GET /api/presale/my
 * Authenticated: list the logged-in user's reservations.
 */
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const reservations = await prisma.presaleReservation.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            images: true,
            status: true,
            isPresale: true,
            presaleEndDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = reservations.map((r) => ({
      ...r,
      product: {
        ...r.product,
        images: parseImages(r.product.images),
        price: parseFloat((r.product.price as any).toString()),
      },
    }));

    return res.json({ reservations: formatted });
  } catch (error) {
    console.error('Presale my error:', error);
    return res.status(500).json({ error: 'Error al obtener tus reservas' });
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/presale/admin/list
 * Admin: list all reservations (optionally filter by productId or status).
 */
router.get('/admin/list', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const productId = req.query.productId as string | undefined;
    const status = req.query.status as string | undefined;
    const page = (req.query.page as string) ?? '1';
    const limit = (req.query.limit as string) ?? '50';

    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [reservations, total] = await Promise.all([
      prisma.presaleReservation.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, presaleBanned: true } },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              images: true,
              presaleAvailQty: true,
              presaleMaxQty: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.presaleReservation.count({ where }),
    ]);

    const formatted = reservations.map((r) => ({
      ...r,
      product: {
        ...r.product,
        images: parseImages(r.product.images),
        price: parseFloat((r.product.price as any).toString()),
      },
    }));

    return res.json({
      reservations: formatted,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Presale admin list error:', error);
    return res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

/**
 * POST /api/presale/admin/confirm-arrival/:productId
 * Admin: mark a presale product as arrived, notify all PENDING reservers by email.
 * This transitions their status to NOTIFIED and sets expiresAt = now + 24h.
 */
router.post(
  '/admin/confirm-arrival/:productId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req, res) => {
    try {
      const productId = req.params.productId as string;

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product || !product.isPresale) {
        return res.status(404).json({ error: 'Producto preventa no encontrado' });
      }

      if (product.presaleArrivedAt) {
        return res.json({ message: 'La llegada de esta preventa ya fue confirmada', notified: 0, confirmed: true });
      }

      const pendingReservations = await prisma.presaleReservation.findMany({
        where: { productId, status: 'PENDING' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }) as Array<{ id: string; userId: string; productId: string; status: string; notifiedAt: Date | null; expiresAt: Date | null; paidAt: Date | null; createdAt: Date; updatedAt: Date; user: { id: string; name: string; email: string } }>;

      const now = new Date();
      const expiresAt = getPresalePaymentExpiry(now);
      const expiryLabel = PRESALE_EXPIRATION_SECONDS % 3600 === 0
        ? `${PRESALE_EXPIRATION_SECONDS / 3600}h`
        : `${PRESALE_EXPIRATION_SECONDS} segundos`;

      // Update all PENDING → NOTIFIED in one batch + mark product as arrived
      await Promise.all([
        prisma.presaleReservation.updateMany({
          where: { productId, status: 'PENDING' },
          data: { status: 'NOTIFIED', notifiedAt: now, expiresAt },
        }),
        prisma.product.update({
          where: { id: productId },
          data: { presaleArrivedAt: now, presaleEndDate: expiresAt },
        }),
      ]);

      // Send emails concurrently
      if (pendingReservations.length > 0) {
        const emailPromises = pendingReservations.map((r) =>
          sendPresaleArrivalEmail(
            r.user.email,
            r.user.name,
            product.name,
            r.id,
          ).catch((err) => {
            console.error(`[presale] Error al enviar email a ${r.user.email}:`, err);
          })
        );
        await Promise.all(emailPromises);
      }

      return res.json({
        message: pendingReservations.length > 0
          ? `Se notificó a ${pendingReservations.length} cliente(s). Tienen ${expiryLabel} para pagar.`
          : `Llegada confirmada. Esta preventa expirará en ${expiryLabel}.`,
        notified: pendingReservations.length,
      });
    } catch (error) {
      console.error('Presale confirm arrival error:', error);
      return res.status(500).json({ error: 'Error al confirmar llegada' });
    }
  }
);

/**
 * PATCH /api/presale/admin/release-for-sale/:productId
 * Admin: convert a presale into a regular product so it can be sold immediately,
 * even if it has no reservations or is already expired.
 */
router.patch(
  '/admin/release-for-sale/:productId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req, res) => {
    try {
      const productId = req.params.productId as string;

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (!product.isPresale) {
        return res.status(400).json({ error: 'Este producto no está en preventa' });
      }

      const sellableStock = Math.max(
        Number(product.stock ?? 0),
        Number(product.presaleAvailQty ?? 0),
        0,
      );

      const result = await prisma.$transaction(async (tx) => {
        const convertedProduct = await tx.product.update({
          where: { id: productId },
          data: {
            isPresale: false,
            status: 'ACTIVE',
            stock: sellableStock,
            presaleMaxQty: null,
            presaleAvailQty: null,
            presaleEndDate: null,
            presaleArrivedAt: null,
          },
        });

        const releasedReservations = await tx.presaleReservation.updateMany({
          where: {
            productId,
            status: { in: ['PENDING', 'NOTIFIED'] },
          },
          data: {
            status: 'EXPIRED',
            expiresAt: new Date(),
          },
        });

        return { convertedProduct, releasedCount: releasedReservations.count };
      });

      return res.json({
        message: 'Preventa liberada y convertida a producto normal para venta inmediata.',
        product: result.convertedProduct,
        releasedReservations: result.releasedCount,
      });
    } catch (error) {
      console.error('Presale release-for-sale error:', error);
      return res.status(500).json({ error: 'Error al liberar la preventa para venta' });
    }
  }
);

/**
 * POST /api/presale/admin/release-expired
 * Admin (or scheduled job): find NOTIFIED reservations past their expiresAt,
 * mark them EXPIRED, and restore stock on the (now regular) product.
 */
router.post(
  '/admin/release-expired',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req, res) => {
    try {
      const now = new Date();

      const expired = await prisma.presaleReservation.findMany({
        where: {
          status: 'NOTIFIED',
          expiresAt: { lt: now },
        },
        include: { product: true, user: { select: { name: true, email: true } } },
      }) as Array<{ id: string; productId: string; product: any; user: { name: string; email: string } }>;

      if (expired.length === 0) {
        return res.json({ message: 'No hay reservas expiradas', released: 0 });
      }

      // Group by product to do stock increments efficiently
      const byProduct: Record<string, number> = {};
      for (const r of expired) {
        byProduct[r.productId] = (byProduct[r.productId] || 0) + 1;
      }

      const expiredIds = expired.map((r) => r.id);

      await prisma.$transaction(async (tx) => {
        await tx.presaleReservation.updateMany({
          where: { id: { in: expiredIds } },
          data: { status: 'EXPIRED' },
        });
        for (const [pid, count] of Object.entries(byProduct)) {
          await tx.product.update({
            where: { id: pid },
            data: {
              presaleAvailQty: { increment: count },
              stock: { increment: count },
            },
          });
        }
      });

      // Optionally notify users that their reservation expired
      const emailPromises = expired.map((r) =>
        sendPresaleExpiredEmail(r.user.email, r.user.name, r.product.name).catch((err) => {
          console.error(`[presale] Error al enviar email expirado a ${r.user.email}:`, err);
        })
      );
      await Promise.all(emailPromises);

      return res.json({
        message: `Se liberaron ${expired.length} reserva(s) expirada(s). Stock restaurado.`,
        released: expired.length,
        byProduct,
      });
    } catch (error) {
      console.error('Presale release-expired error:', error);
      return res.status(500).json({ error: 'Error al liberar reservas expiradas' });
    }
  }
);

/**
 * PATCH /api/presale/admin/mark-paid/:reservationId
 * Admin: manually mark a reservation as paid (e.g. after manual payment confirmation).
 */
router.patch(
  '/admin/mark-paid/:reservationId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req, res) => {
    try {
      const reservationId = req.params.reservationId as string;

      const reservation = await prisma.presaleReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      if (reservation.status === 'PAID') {
        return res.status(400).json({ error: 'La reserva ya está pagada' });
      }

      if (reservation.status === 'CANCELLED') {
        return res.status(400).json({ error: 'La reserva ya fue cancelada por administración' });
      }

      const updated = await prisma.presaleReservation.update({
        where: { id: reservationId },
        data: { status: 'PAID', paidAt: new Date() },
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { name: true } },
        },
      });

      return res.json({ reservation: updated });
    } catch (error) {
      console.error('Presale mark-paid error:', error);
      return res.status(500).json({ error: 'Error al marcar la reserva como pagada' });
    }
  }
);

/**
 * PATCH /api/presale/admin/cancel/:reservationId
 * Admin: cancel a reservation, store the reason, and optionally ban the user.
 */
router.patch(
  '/admin/cancel/:reservationId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req: AuthRequest, res) => {
    try {
      const reservationId = req.params.reservationId as string;
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      const banUser = Boolean(req.body?.banUser);

      if (!reason) {
        return res.status(400).json({ error: 'Debes indicar un motivo de cancelación' });
      }

      const reservation = await prisma.presaleReservation.findUnique({
        where: { id: reservationId },
        include: {
          user: { select: { id: true, name: true, email: true, presaleBanned: true } },
          product: {
            select: { id: true, name: true, sku: true, price: true, images: true, presaleAvailQty: true, presaleMaxQty: true },
          },
        },
      });

      if (!reservation) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      if (reservation.status === 'PAID') {
        return res.status(400).json({ error: 'No se puede cancelar una reserva ya pagada' });
      }

      if (reservation.status === 'CANCELLED') {
        return res.status(400).json({ error: 'La reserva ya fue cancelada anteriormente' });
      }

      const shouldRestoreQuota = reservation.status === 'PENDING' || reservation.status === 'NOTIFIED';
      const cancelledAt = new Date();

      const updated = await prisma.$transaction(async (tx) => {
        const reservationUpdated = await tx.presaleReservation.update({
          where: { id: reservationId },
          data: {
            status: 'CANCELLED',
            cancelledAt,
            cancellationReason: reason,
            cancelledBy: req.user?.email ?? req.user?.id ?? 'admin',
            expiresAt: null,
          },
          include: {
            user: { select: { id: true, name: true, email: true, presaleBanned: true } },
            product: {
              select: { id: true, name: true, sku: true, price: true, images: true, presaleAvailQty: true, presaleMaxQty: true },
            },
          },
        });

        if (shouldRestoreQuota && reservation.product.presaleAvailQty !== null) {
          await tx.product.update({
            where: { id: reservation.productId },
            data: { presaleAvailQty: { increment: 1 } },
          });
        }

        if (banUser) {
          await tx.user.update({
            where: { id: reservation.userId },
            data: { presaleBanned: true },
          });
        }

        return reservationUpdated;
      });

      return res.json({
        message: banUser
          ? 'Reserva cancelada y usuario bloqueado para futuras preventas'
          : 'Reserva cancelada por administración',
        reservation: {
          ...updated,
          user: {
            ...updated.user,
            presaleBanned: banUser ? true : updated.user.presaleBanned,
          },
          product: {
            ...updated.product,
            images: parseImages(updated.product.images),
            price: parseFloat((updated.product.price as any).toString()),
          },
        },
      });
    } catch (error) {
      console.error('Presale admin cancel error:', error);
      return res.status(500).json({ error: 'Error al cancelar la reserva' });
    }
  }
);

/**
 * PATCH /api/presale/admin/block-access/:userId
 * Admin: block a user from future presales.
 */
router.patch(
  '/admin/block-access/:userId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.params.userId as string;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, presaleBanned: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (user.presaleBanned) {
        return res.json({
          message: 'El usuario ya está bloqueado para preventas',
          user,
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { presaleBanned: true },
        select: { id: true, name: true, email: true, presaleBanned: true },
      });

      return res.json({
        message: 'Usuario bloqueado para futuras preventas',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Presale block access error:', error);
      return res.status(500).json({ error: 'Error al bloquear el acceso a preventas' });
    }
  }
);

/**
 * PATCH /api/presale/admin/restore-access/:userId
 * Admin: restore presale access for a previously blocked user.
 */
router.patch(
  '/admin/restore-access/:userId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.params.userId as string;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, presaleBanned: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (!user.presaleBanned) {
        return res.json({
          message: 'El usuario ya tiene acceso a preventas',
          user,
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { presaleBanned: false },
        select: { id: true, name: true, email: true, presaleBanned: true },
      });

      return res.json({
        message: 'Acceso a preventas restaurado correctamente',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Presale restore access error:', error);
      return res.status(500).json({ error: 'Error al restaurar el acceso a preventas' });
    }
  }
);

/**
 * DELETE /api/presale/admin/reservation/:reservationId
 * Admin: delete any reservation and restore the product quota.
 */
router.delete(
  '/admin/reservation/:reservationId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  async (req, res) => {
    try {
      const reservationId = req.params.reservationId as string;

      const reservation = await prisma.presaleReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.presaleReservation.delete({ where: { id: reservationId } });
        // Restore quota only if it was an active reservation
        if (reservation.status === 'PENDING' || reservation.status === 'NOTIFIED') {
          await tx.product.update({
            where: { id: reservation.productId },
            data: { presaleAvailQty: { increment: 1 } },
          });
        }
      });

      return res.json({ message: 'Reserva eliminada' });
    } catch (error) {
      console.error('Presale admin delete error:', error);
      return res.status(500).json({ error: 'Error al eliminar la reserva' });
    }
  }
);

export default router;

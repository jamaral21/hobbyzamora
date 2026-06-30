import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const MAINTENANCE_KEY = 'store_maintenance';

async function ensureSettingsTable() {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

async function getMaintenanceValue(): Promise<boolean> {
  await ensureSettingsTable();

  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    'SELECT value FROM site_settings WHERE key = ? LIMIT 1',
    MAINTENANCE_KEY,
  );

  if (!rows.length) {
    // Preserve current behavior for existing deployments where store is in maintenance by default.
    return true;
  }

  return rows[0].value === 'true';
}

router.get('/', async (_req, res) => {
  try {
    const maintenance = await getMaintenanceValue();
    return res.json({ maintenance });
  } catch (error) {
    console.error('GET /api/site-maintenance error:', error);
    return res.status(500).json({ error: 'No se pudo obtener el estado de mantenimiento' });
  }
});

router.put('/', authenticate, requireRole('ADMIN', 'STAFF', 'admin', 'staff'), async (req: AuthRequest, res) => {
  try {
    const maintenance = Boolean(req.body?.maintenance);

    await ensureSettingsTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updatedAt)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP`,
      MAINTENANCE_KEY,
      maintenance ? 'true' : 'false',
    );

    return res.json({ maintenance });
  } catch (error) {
    console.error('PUT /api/site-maintenance error:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el estado de mantenimiento' });
  }
});

export default router;

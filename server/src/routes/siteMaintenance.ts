import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const MAINTENANCE_KEY = 'store_maintenance';
const JAPAN_TRAVEL_SECTION_KEY = 'japan_travel_2026_section';
const JAPAN_TRAVEL_CATEGORY = 'Productos Viaje Japón 2026';
const OFFERS_SECTION_TITLE_KEY = 'offers_section_title';
const OFFERS_SECTION_BANNER_KEY = 'offers_section_banner';
const OFFERS_SECTION_START_DATE_KEY = 'offers_section_start_date';
const OFFERS_SECTION_END_DATE_KEY = 'offers_section_end_date';
const DEFAULT_OFFERS_SECTION_TITLE = 'Cyber Week';

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

async function getJapanTravelSectionStatus() {
  await ensureSettingsTable();
  const [rows, productsCount] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ value: string }>>(
      'SELECT value FROM site_settings WHERE key = ? LIMIT 1',
      JAPAN_TRAVEL_SECTION_KEY,
    ),
    prisma.product.count({
      where: {
        category: JAPAN_TRAVEL_CATEGORY,
        status: 'ACTIVE',
        isPresale: false,
      },
    }),
  ]);
  return {
    enabled: rows[0]?.value === 'true',
    hasProducts: productsCount > 0,
  };
}

async function getOffersSectionTitle(): Promise<string> {
  await ensureSettingsTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
    'SELECT value FROM site_settings WHERE key = ? LIMIT 1',
    OFFERS_SECTION_TITLE_KEY,
  );
  return rows[0]?.value || DEFAULT_OFFERS_SECTION_TITLE;
}

async function getOffersSectionConfig() {
  await ensureSettingsTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ key: string; value: string }>>(
    'SELECT key, value FROM site_settings WHERE key IN (?, ?, ?, ?)',
    OFFERS_SECTION_TITLE_KEY,
    OFFERS_SECTION_BANNER_KEY,
    OFFERS_SECTION_START_DATE_KEY,
    OFFERS_SECTION_END_DATE_KEY,
  );
  const settings = new Map(rows.map(({ key, value }) => [key, value]));
  return {
    title: settings.get(OFFERS_SECTION_TITLE_KEY) || DEFAULT_OFFERS_SECTION_TITLE,
    bannerUrl: settings.get(OFFERS_SECTION_BANNER_KEY) || '',
    startDate: settings.get(OFFERS_SECTION_START_DATE_KEY) || '',
    endDate: settings.get(OFFERS_SECTION_END_DATE_KEY) || '',
  };
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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

router.get('/offers-config', async (_req, res) => {
  try {
    return res.json(await getOffersSectionConfig());
  } catch (error) {
    console.error('GET /api/site-maintenance/offers-config error:', error);
    return res.status(500).json({ error: 'No se pudo obtener la configuración de ofertas' });
  }
});

router.get('/offers-title', async (_req, res) => {
  try {
    return res.json({ title: await getOffersSectionTitle() });
  } catch (error) {
    console.error('GET /api/site-maintenance/offers-title error:', error);
    return res.status(500).json({ error: 'No se pudo obtener el nombre de la sección de ofertas' });
  }
});

router.get('/japan-travel-2026', async (_req, res) => {
  try {
    return res.json(await getJapanTravelSectionStatus());
  } catch (error) {
    console.error('GET /api/site-maintenance/japan-travel-2026 error:', error);
    return res.status(500).json({ error: 'No se pudo obtener el estado de la sección de viaje a Japón' });
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

router.put('/offers-config', authenticate, requireRole('ADMIN', 'STAFF', 'admin', 'staff'), async (req: AuthRequest, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const bannerUrl = typeof req.body?.bannerUrl === 'string' ? req.body.bannerUrl.trim() : '';
    const startDate = typeof req.body?.startDate === 'string' ? req.body.startDate : '';
    const endDate = typeof req.body?.endDate === 'string' ? req.body.endDate : '';

    if (!title || title.length > 40) {
      return res.status(400).json({ error: 'El nombre debe tener entre 1 y 40 caracteres' });
    }
    if (bannerUrl.length > 2048) {
      return res.status(400).json({ error: 'La URL del banner no es válida' });
    }
    if ((startDate && !isValidDateOnly(startDate)) || (endDate && !isValidDateOnly(endDate))) {
      return res.status(400).json({ error: 'Las fechas deben tener un formato válido' });
    }
    if (bannerUrl && (!startDate || !endDate)) {
      return res.status(400).json({ error: 'El banner requiere una fecha de inicio y una fecha de término' });
    }
    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({ error: 'La fecha de término debe ser igual o posterior a la fecha de inicio' });
    }

    await ensureSettingsTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updatedAt) VALUES
        (?, ?, CURRENT_TIMESTAMP),
        (?, ?, CURRENT_TIMESTAMP),
        (?, ?, CURRENT_TIMESTAMP),
        (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP`,
      OFFERS_SECTION_TITLE_KEY, title,
      OFFERS_SECTION_BANNER_KEY, bannerUrl,
      OFFERS_SECTION_START_DATE_KEY, startDate,
      OFFERS_SECTION_END_DATE_KEY, endDate,
    );

    return res.json({ title, bannerUrl, startDate, endDate });
  } catch (error) {
    console.error('PUT /api/site-maintenance/offers-config error:', error);
    return res.status(500).json({ error: 'No se pudo guardar la configuración de ofertas' });
  }
});

router.put('/offers-title', authenticate, requireRole('ADMIN', 'STAFF', 'admin', 'staff'), async (req: AuthRequest, res) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    if (!title || title.length > 40) {
      return res.status(400).json({ error: 'El nombre debe tener entre 1 y 40 caracteres' });
    }

    await ensureSettingsTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updatedAt)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP`,
      OFFERS_SECTION_TITLE_KEY,
      title,
    );

    return res.json({ title });
  } catch (error) {
    console.error('PUT /api/site-maintenance/offers-title error:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el nombre de la sección de ofertas' });
  }
});

router.put('/japan-travel-2026', authenticate, requireRole('ADMIN', 'STAFF', 'admin', 'staff'), async (req: AuthRequest, res) => {
  try {
    if (typeof req.body?.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled debe ser booleano' });
    }

    await ensureSettingsTable();
    await prisma.$executeRawUnsafe(
      `INSERT INTO site_settings (key, value, updatedAt)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP`,
      JAPAN_TRAVEL_SECTION_KEY,
      req.body.enabled ? 'true' : 'false',
    );

    return res.json(await getJapanTravelSectionStatus());
  } catch (error) {
    console.error('PUT /api/site-maintenance/japan-travel-2026 error:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la sección de viaje a Japón' });
  }
});

export default router;

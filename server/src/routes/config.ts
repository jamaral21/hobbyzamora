import { Router } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

type BankAccount = {
  titular: string;
  rut: string;
  banco: string;
  tipo: string;
  numero: string;
};

type SystemConfig = {
  cuentas: BankAccount[];
  metodosPago: string[];
  arrBodegaJP: number;
  appBeyblade: number;
  comisionPct: number;
};

const DEFAULT_CONFIG: SystemConfig = {
  cuentas: [
    {
      titular: 'Sebastian Canales',
      rut: '16.232.924-3',
      banco: 'Banco Falabella',
      tipo: 'Cta. Corriente',
      numero: '019831141187',
    },
    {
      titular: 'Enedina Silva',
      rut: '8.307.035-8',
      banco: 'Banco Falabella',
      tipo: 'Cta. Corriente',
      numero: '011810026573',
    },
    {
      titular: 'Diego Zamora',
      rut: '17.472.094-0',
      banco: 'Banco Falabella',
      tipo: 'Cta. Corriente',
      numero: '014000123337',
    },
  ],
  metodosPago: ['Efectivo', 'JCB Bandai', 'Rakuten', 'PayPay', 'View Card', '', '', '', '', ''],
  arrBodegaJP: 25000,
  appBeyblade: 550,
  comisionPct: 13,
};

function normalizeMetodosPago(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_CONFIG.metodosPago];
  }

  const normalized = raw.map((value) => String(value ?? '').trim());
  const hasAnyValue = normalized.some((value) => value.length > 0);

  if (!hasAnyValue) {
    return [...DEFAULT_CONFIG.metodosPago];
  }

  if (!normalized[0]) {
    normalized[0] = DEFAULT_CONFIG.metodosPago[0];
  }

  return normalized;
}

function sanitizeCuenta(raw: unknown): BankAccount {
  const input = typeof raw === 'object' && raw !== null ? (raw as Partial<BankAccount>) : {};
  return {
    titular: String(input.titular ?? '').trim(),
    rut: String(input.rut ?? '').trim(),
    banco: String(input.banco ?? '').trim(),
    tipo: String(input.tipo ?? '').trim(),
    numero: String(input.numero ?? '').trim(),
  };
}

function parseConfigRow(row: { cuentas: string; metodosPago: string; arrBodegaJP: any; appBeyblade: any; comisionPct: any }): SystemConfig {
  let cuentas: BankAccount[] = DEFAULT_CONFIG.cuentas;
  let metodosPago: string[] = [...DEFAULT_CONFIG.metodosPago];

  try {
    const parsed = JSON.parse(row.cuentas);
    if (Array.isArray(parsed)) {
      cuentas = parsed.map(sanitizeCuenta);
    }
  } catch {
    // Keep defaults if JSON is malformed.
  }

  try {
    const parsed = JSON.parse(row.metodosPago);
    metodosPago = normalizeMetodosPago(parsed);
  } catch {
    // Keep defaults if JSON is malformed.
  }

  return {
    cuentas,
    metodosPago,
    arrBodegaJP: Number(row.arrBodegaJP),
    appBeyblade: Number(row.appBeyblade),
    comisionPct: Number(row.comisionPct),
  };
}

type ConfigRow = {
  id: string;
  cuentas: string;
  metodosPago: string;
  arrBodegaJP: any;
  appBeyblade: any;
  comisionPct: any;
};

function getConfigDelegate() {
  return (prisma as any).shipmentsConfig;
}

function resolveSqliteDatabasePath() {
  const raw = String(process.env.DATABASE_URL || '').trim();
  if (!raw.startsWith('file:')) return null;

  const withoutProtocol = raw.slice('file:'.length);
  const [rawPath] = withoutProtocol.split('?');
  if (!rawPath) return null;

  const decoded = decodeURIComponent(rawPath);

  if (decoded.startsWith('/')) {
    return path.resolve(decoded);
  }

  return path.resolve(process.cwd(), decoded);
}

async function findFirstConfigRow(): Promise<ConfigRow | null> {
  const delegate = getConfigDelegate();

  if (delegate) {
    return delegate.findFirst({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        cuentas: true,
        metodosPago: true,
        arrBodegaJP: true,
        appBeyblade: true,
        comisionPct: true,
      },
    });
  }

  const rows = await prisma.$queryRawUnsafe<ConfigRow[]>(
    'SELECT id, cuentas, metodosPago, arrBodegaJP, appBeyblade, comisionPct FROM shipments_config ORDER BY createdAt ASC LIMIT 1'
  );

  return rows[0] || null;
}

async function insertDefaultConfig(): Promise<ConfigRow> {
  const delegate = getConfigDelegate();

  if (delegate) {
    return delegate.create({
      data: {
        cuentas: JSON.stringify(DEFAULT_CONFIG.cuentas),
        metodosPago: JSON.stringify(DEFAULT_CONFIG.metodosPago),
        arrBodegaJP: DEFAULT_CONFIG.arrBodegaJP,
        appBeyblade: DEFAULT_CONFIG.appBeyblade,
        comisionPct: DEFAULT_CONFIG.comisionPct,
      },
      select: {
        id: true,
        cuentas: true,
        metodosPago: true,
        arrBodegaJP: true,
        appBeyblade: true,
        comisionPct: true,
      },
    });
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    'INSERT INTO shipments_config (id, cuentas, metodosPago, arrBodegaJP, appBeyblade, comisionPct, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    JSON.stringify(DEFAULT_CONFIG.cuentas),
    JSON.stringify(DEFAULT_CONFIG.metodosPago),
    DEFAULT_CONFIG.arrBodegaJP,
    DEFAULT_CONFIG.appBeyblade,
    DEFAULT_CONFIG.comisionPct,
    now,
  );

  const created = await findFirstConfigRow();
  if (!created) {
    throw new Error('No se pudo crear la configuracion por defecto');
  }
  return created;
}

async function updateConfigRow(id: string, data: SystemConfig): Promise<ConfigRow> {
  const delegate = getConfigDelegate();

  if (delegate) {
    return delegate.update({
      where: { id },
      data: {
        cuentas: JSON.stringify(data.cuentas),
        metodosPago: JSON.stringify(data.metodosPago),
        arrBodegaJP: data.arrBodegaJP,
        appBeyblade: data.appBeyblade,
        comisionPct: data.comisionPct,
      },
      select: {
        id: true,
        cuentas: true,
        metodosPago: true,
        arrBodegaJP: true,
        appBeyblade: true,
        comisionPct: true,
      },
    });
  }

  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    'UPDATE shipments_config SET cuentas = ?, metodosPago = ?, arrBodegaJP = ?, appBeyblade = ?, comisionPct = ?, updatedAt = ? WHERE id = ?',
    JSON.stringify(data.cuentas),
    JSON.stringify(data.metodosPago),
    data.arrBodegaJP,
    data.appBeyblade,
    data.comisionPct,
    now,
    id,
  );

  const updated = await findFirstConfigRow();
  if (!updated) {
    throw new Error('No se pudo actualizar la configuracion');
  }
  return updated;
}

async function getOrCreateConfig(): Promise<SystemConfig> {
  const existing = await findFirstConfigRow();

  if (!existing) {
    const created = await insertDefaultConfig();

    return parseConfigRow(created);
  }

  return parseConfigRow(existing);
}

router.get('/', authenticate, requireRole('ADMIN', 'STAFF', 'admin', 'staff'), async (_req: AuthRequest, res) => {
  try {
    const data = await getOrCreateConfig();
    return res.json({ data });
  } catch (error) {
    console.error('GET /shipments/config error:', error);
    return res.status(500).json({ error: 'No se pudo obtener la configuracion' });
  }
});

router.put('/', authenticate, requireRole('ADMIN', 'STAFF', 'admin', 'staff'), async (req: AuthRequest, res) => {
  try {
    const current = await getOrCreateConfig();
    const payload = req.body ?? {};

    const cuentas = Array.isArray(payload.cuentas)
      ? payload.cuentas.map(sanitizeCuenta)
      : current.cuentas;

    const metodosPago = Array.isArray(payload.metodosPago)
      ? normalizeMetodosPago(payload.metodosPago)
      : current.metodosPago;

    const arrBodegaJP = payload.arrBodegaJP !== undefined ? Number(payload.arrBodegaJP) : current.arrBodegaJP;
    const appBeyblade = payload.appBeyblade !== undefined ? Number(payload.appBeyblade) : current.appBeyblade;
    const comisionPct = payload.comisionPct !== undefined ? Number(payload.comisionPct) : current.comisionPct;

    if (!Number.isFinite(arrBodegaJP) || arrBodegaJP < 0) {
      return res.status(400).json({ error: 'arrBodegaJP debe ser un numero mayor o igual a 0' });
    }

    if (!Number.isFinite(appBeyblade) || appBeyblade < 0) {
      return res.status(400).json({ error: 'appBeyblade debe ser un numero mayor o igual a 0' });
    }

    if (!Number.isFinite(comisionPct) || comisionPct < 0) {
      return res.status(400).json({ error: 'comisionPct debe ser un numero mayor o igual a 0' });
    }

    const target = await findFirstConfigRow();

    if (!target) {
      return res.status(500).json({ error: 'No existe registro de configuracion para actualizar' });
    }

    const updated = await updateConfigRow(target.id, {
      cuentas,
      metodosPago,
      arrBodegaJP,
      appBeyblade,
      comisionPct,
    });

    return res.json({ data: parseConfigRow(updated) });
  } catch (error) {
    console.error('PUT /shipments/config error:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la configuracion' });
  }
});

router.post('/backup', authenticate, requireRole('ADMIN', 'STAFF', 'admin', 'staff'), async (_req: AuthRequest, res) => {
  try {
    const dbPath = resolveSqliteDatabasePath();
    if (!dbPath) {
      return res.status(400).json({ error: 'Solo se soportan backups manuales para SQLite (DATABASE_URL=file:...)' });
    }

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: `No se encontró la base de datos en ${dbPath}` });
    }

    const backupDir = process.env.SHIPMENTS_BACKUP_DIR
      ? path.resolve(process.env.SHIPMENTS_BACKUP_DIR)
      : path.join(path.dirname(dbPath), 'backups', 'manual');

    fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(dbPath) || '.db';
    const base = path.basename(dbPath, ext);
    const fileName = `${base}.manual-${timestamp}${ext}`;
    const outputPath = path.join(backupDir, fileName);

    fs.copyFileSync(dbPath, outputPath);

    const stat = fs.statSync(outputPath);
    return res.json({
      data: {
        fileName,
        path: outputPath,
        sizeBytes: stat.size,
        createdAt: new Date(stat.mtimeMs).toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /shipments/config/backup error:', error);
    return res.status(500).json({ error: 'No se pudo crear el backup de la base de datos' });
  }
});

export default router;

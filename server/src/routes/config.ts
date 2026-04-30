import { Router } from 'express';
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
  let metodosPago: string[] = DEFAULT_CONFIG.metodosPago;

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
    if (Array.isArray(parsed)) {
      metodosPago = parsed.map((value) => String(value ?? '').trim());
    }
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

async function getOrCreateConfig(): Promise<SystemConfig> {
  const existing = await prisma.shipmentsConfig.findFirst({
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

  if (!existing) {
    const created = await prisma.shipmentsConfig.create({
      data: {
        cuentas: JSON.stringify(DEFAULT_CONFIG.cuentas),
        metodosPago: JSON.stringify(DEFAULT_CONFIG.metodosPago),
        arrBodegaJP: DEFAULT_CONFIG.arrBodegaJP,
        appBeyblade: DEFAULT_CONFIG.appBeyblade,
        comisionPct: DEFAULT_CONFIG.comisionPct,
      },
      select: {
        cuentas: true,
        metodosPago: true,
        arrBodegaJP: true,
        appBeyblade: true,
        comisionPct: true,
      },
    });

    return parseConfigRow(created);
  }

  return parseConfigRow(existing);
}

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const data = await getOrCreateConfig();
    return res.json({ data });
  } catch (error) {
    console.error('GET /shipments/config error:', error);
    return res.status(500).json({ error: 'No se pudo obtener la configuracion' });
  }
});

router.put('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const current = await getOrCreateConfig();
    const payload = req.body ?? {};

    const cuentas = Array.isArray(payload.cuentas)
      ? payload.cuentas.map(sanitizeCuenta)
      : current.cuentas;

    const metodosPago = Array.isArray(payload.metodosPago)
      ? payload.metodosPago.map((value: unknown) => String(value ?? '').trim())
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

    const target = await prisma.shipmentsConfig.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });

    if (!target) {
      return res.status(500).json({ error: 'No existe registro de configuracion para actualizar' });
    }

    const updated = await prisma.shipmentsConfig.update({
      where: { id: target.id },
      data: {
        cuentas: JSON.stringify(cuentas),
        metodosPago: JSON.stringify(metodosPago),
        arrBodegaJP,
        appBeyblade,
        comisionPct,
      },
      select: {
        cuentas: true,
        metodosPago: true,
        arrBodegaJP: true,
        appBeyblade: true,
        comisionPct: true,
      },
    });

    return res.json({ data: parseConfigRow(updated) });
  } catch (error) {
    console.error('PUT /shipments/config error:', error);
    return res.status(500).json({ error: 'No se pudo actualizar la configuracion' });
  }
});

export default router;

import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const GAV_ENTITY = 'ShipmentsGavChile';
const GAV_ACTION = 'UPSERT_GAV_CHILE';

type DocTipo = 'factura' | 'boleta';
type GavEstado = 'pendiente' | 'pagado';

type GavChileRecord = {
  id: number;
  concepto: string;
  monto: number;
  adjunto: boolean;
  estado: GavEstado;
  docTipo: DocTipo;
  ivaCredito: boolean;
  fechaPago: string | null;
  updatedAt: string;
};

const DEFAULT_GAV_CHILE: GavChileRecord[] = [
  {
    id: 1,
    concepto: 'Arriendo bodega Chile',
    monto: 180000,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'boleta',
    ivaCredito: false,
    fechaPago: '2026-01-05',
    updatedAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 2,
    concepto: 'Contador',
    monto: 120000,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'factura',
    ivaCredito: true,
    fechaPago: '2026-01-10',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 3,
    concepto: 'Cuenta corriente',
    monto: 5990,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'boleta',
    ivaCredito: false,
    fechaPago: '2026-02-01',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 4,
    concepto: 'POS',
    monto: 15000,
    adjunto: false,
    estado: 'pendiente',
    docTipo: 'factura',
    ivaCredito: true,
    fechaPago: null,
    updatedAt: '2026-03-10T00:00:00.000Z',
  },
  {
    id: 5,
    concepto: 'Comision web',
    monto: 25000,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'factura',
    ivaCredito: true,
    fechaPago: '2026-03-01',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 6,
    concepto: 'Arriendo bodega Chile',
    monto: 180000,
    adjunto: false,
    estado: 'pendiente',
    docTipo: 'boleta',
    ivaCredito: false,
    fechaPago: null,
    updatedAt: '2026-03-20T00:00:00.000Z',
  },
];

function parseRecord(metadata: string | null | undefined): GavChileRecord | null {
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata) as Partial<GavChileRecord>;
    if (typeof parsed.id !== 'number' || !Number.isInteger(parsed.id) || parsed.id <= 0) return null;
    if (typeof parsed.concepto !== 'string' || !parsed.concepto.trim()) return null;
    if (!Number.isFinite(Number(parsed.monto)) || Number(parsed.monto) <= 0) return null;
    if (typeof parsed.adjunto !== 'boolean') return null;
    if (parsed.estado !== 'pendiente' && parsed.estado !== 'pagado') return null;
    if (parsed.docTipo !== 'factura' && parsed.docTipo !== 'boleta') return null;
    if (typeof parsed.ivaCredito !== 'boolean') return null;

    return {
      id: parsed.id,
      concepto: parsed.concepto,
      monto: Number(parsed.monto),
      adjunto: parsed.adjunto,
      estado: parsed.estado,
      docTipo: parsed.docTipo,
      ivaCredito: parsed.ivaCredito,
      fechaPago: typeof parsed.fechaPago === 'string' || parsed.fechaPago === null ? parsed.fechaPago : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function listGavChileRecords(): Promise<GavChileRecord[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      entity: GAV_ENTITY,
      action: GAV_ACTION,
    },
    orderBy: { createdAt: 'asc' },
    select: { metadata: true },
  });

  const byId = new Map<number, GavChileRecord>(DEFAULT_GAV_CHILE.map((row) => [row.id, row]));

  for (const log of logs) {
    const parsed = parseRecord(log.metadata);
    if (!parsed) continue;
    byId.set(parsed.id, parsed);
  }

  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const data = await listGavChileRecords();
    return res.json({ data });
  } catch (error) {
    console.error('GET /shipments/gav-chile error:', error);
    return res.status(500).json({ error: 'No se pudo obtener GAV Chile' });
  }
});

router.put('/:id/confirmar', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = Number.parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const records = await listGavChileRecords();
    const current = records.find((row) => row.id === id);

    if (!current) {
      return res.status(404).json({ error: 'Gasto fijo no encontrado' });
    }

    if (current.estado === 'pagado') {
      return res.json({ data: current });
    }

    const bodyAdjunto = req.body?.adjunto;
    const hasAdjunto = typeof bodyAdjunto === 'boolean' ? bodyAdjunto : current.adjunto;

    if (!hasAdjunto) {
      return res.status(400).json({ error: 'Debe adjuntar comprobante antes de confirmar' });
    }

    const updated: GavChileRecord = {
      ...current,
      adjunto: true,
      estado: 'pagado',
      fechaPago: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    };

    await prisma.auditLog.create({
      data: {
        action: GAV_ACTION,
        entity: GAV_ENTITY,
        entityIds: String(updated.id),
        performedBy: req.user?.email ?? 'unknown',
        metadata: JSON.stringify(updated),
      },
    });

    return res.json({ data: updated });
  } catch (error) {
    console.error('PUT /shipments/gav-chile/:id/confirmar error:', error);
    return res.status(500).json({ error: 'No se pudo confirmar el gasto fijo' });
  }
});

export default router;

import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const GAV_ENTITY = 'ShipmentsGavChile';
const GAV_ACTION = 'UPSERT_GAV_CHILE';

type DocTipo = 'factura' | 'boleta';
type GavEstado = 'pendiente' | 'pagado';

type GavDocumento = {
  nombre: string;
  tipo: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

type GavChileRecord = {
  id: number;
  periodo: string; // YYYY-MM
  concepto: string;
  monto: number;
  adjunto: boolean;
  estado: GavEstado;
  docTipo: DocTipo;
  ivaCredito: boolean;
  documentos: GavDocumento[];
  fechaPago: string | null;
  updatedAt: string;
};

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const DEFAULT_GAV_CHILE: GavChileRecord[] = [
  {
    id: 1,
    periodo: '2026-01',
    concepto: 'Arriendo bodega Chile',
    monto: 180000,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'boleta',
    ivaCredito: false,
    documentos: [],
    fechaPago: '2026-01-05',
    updatedAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 2,
    periodo: '2026-01',
    concepto: 'Contador',
    monto: 120000,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'factura',
    ivaCredito: true,
    documentos: [],
    fechaPago: '2026-01-10',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 3,
    periodo: '2026-02',
    concepto: 'Cuenta corriente',
    monto: 5990,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'boleta',
    ivaCredito: false,
    documentos: [],
    fechaPago: '2026-02-01',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 4,
    periodo: '2026-03',
    concepto: 'POS',
    monto: 15000,
    adjunto: false,
    estado: 'pendiente',
    docTipo: 'factura',
    ivaCredito: true,
    documentos: [],
    fechaPago: null,
    updatedAt: '2026-03-10T00:00:00.000Z',
  },
  {
    id: 5,
    periodo: '2026-03',
    concepto: 'Comision web',
    monto: 25000,
    adjunto: true,
    estado: 'pagado',
    docTipo: 'factura',
    ivaCredito: true,
    documentos: [],
    fechaPago: '2026-03-01',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 6,
    periodo: '2026-03',
    concepto: 'Arriendo bodega Chile',
    monto: 180000,
    adjunto: false,
    estado: 'pendiente',
    docTipo: 'boleta',
    ivaCredito: false,
    documentos: [],
    fechaPago: null,
    updatedAt: '2026-03-20T00:00:00.000Z',
  },
];

function toPeriod(value: string): string {
  if (PERIOD_REGEX.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseRecord(metadata: string | null | undefined): GavChileRecord | null {
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata) as Partial<GavChileRecord>;
    if (typeof parsed.id !== 'number' || !Number.isInteger(parsed.id) || parsed.id <= 0) return null;
    if (typeof parsed.concepto !== 'string' || !parsed.concepto.trim()) return null;
    if (!Number.isFinite(Number(parsed.monto)) || Number(parsed.monto) <= 0) return null;
    if (typeof parsed.adjunto !== 'boolean' && !Array.isArray(parsed.documentos)) return null;
    if (parsed.estado !== 'pendiente' && parsed.estado !== 'pagado') return null;
    if (parsed.docTipo !== 'factura' && parsed.docTipo !== 'boleta') return null;
    if (typeof parsed.ivaCredito !== 'boolean') return null;

    const documentos = Array.isArray(parsed.documentos)
      ? parsed.documentos
          .filter((doc) => doc && typeof doc === 'object')
          .map((doc) => {
            const d = doc as Record<string, unknown>;
            return {
              nombre: String(d.nombre || ''),
              tipo: String(d.tipo || ''),
              fileName: String(d.fileName || ''),
              fileUrl: String(d.fileUrl || ''),
              uploadedAt: typeof d.uploadedAt === 'string' ? d.uploadedAt : new Date().toISOString(),
            };
          })
          .filter((doc) => doc.nombre && doc.fileName && doc.fileUrl)
      : [];

    const fallbackPeriod = toPeriod(
      typeof parsed.fechaPago === 'string' && parsed.fechaPago
        ? parsed.fechaPago
        : typeof parsed.updatedAt === 'string' && parsed.updatedAt
          ? parsed.updatedAt
          : new Date().toISOString(),
    );

    return {
      id: parsed.id,
      periodo: typeof parsed.periodo === 'string' ? toPeriod(parsed.periodo) : fallbackPeriod,
      concepto: parsed.concepto,
      monto: Number(parsed.monto),
      adjunto: documentos.length > 0 || Boolean(parsed.adjunto),
      estado: parsed.estado,
      docTipo: parsed.docTipo,
      ivaCredito: parsed.ivaCredito,
      documentos,
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

async function saveRecord(req: AuthRequest, record: GavChileRecord): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: GAV_ACTION,
      entity: GAV_ENTITY,
      entityIds: String(record.id),
      performedBy: req.user?.email ?? 'unknown',
      metadata: JSON.stringify(record),
    },
  });
}

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const period = typeof req.query.period === 'string' ? req.query.period : undefined;
    const data = await listGavChileRecords();
    const filtered = period && PERIOD_REGEX.test(period) ? data.filter((row) => row.periodo === period) : data;
    const sorted = filtered.sort((a, b) => (a.periodo === b.periodo ? a.id - b.id : a.periodo.localeCompare(b.periodo)));
    return res.json({ data: sorted });
  } catch (error) {
    console.error('GET /shipments/gav-chile error:', error);
    return res.status(500).json({ error: 'No se pudo obtener GAV Chile' });
  }
});

router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const concepto = String(req.body?.concepto ?? '').trim();
    const monto = Number(req.body?.monto);
    const docTipo = req.body?.docTipo;
    const ivaCredito = Boolean(req.body?.ivaCredito);
    const periodo = String(req.body?.periodo ?? '').trim();

    if (!concepto) {
      return res.status(400).json({ error: 'Concepto es requerido' });
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      return res.status(400).json({ error: 'Monto debe ser mayor a 0' });
    }
    if (docTipo !== 'factura' && docTipo !== 'boleta') {
      return res.status(400).json({ error: 'docTipo inválido' });
    }
    if (!PERIOD_REGEX.test(periodo)) {
      return res.status(400).json({ error: 'periodo inválido (usa YYYY-MM)' });
    }

    const records = await listGavChileRecords();
    const nextId = records.length > 0 ? Math.max(...records.map((row) => row.id)) + 1 : 1;
    const created: GavChileRecord = {
      id: nextId,
      periodo,
      concepto,
      monto,
      adjunto: false,
      estado: 'pendiente',
      docTipo,
      ivaCredito,
      documentos: [],
      fechaPago: null,
      updatedAt: new Date().toISOString(),
    };

    await saveRecord(req, created);
    return res.status(201).json({ data: created });
  } catch (error) {
    console.error('POST /shipments/gav-chile error:', error);
    return res.status(500).json({ error: 'No se pudo crear el gasto mensual' });
  }
});

router.put('/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = Number.parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const records = await listGavChileRecords();
    const current = records.find((row) => row.id === id);
    if (!current) {
      return res.status(404).json({ error: 'Gasto mensual no encontrado' });
    }

    const next: GavChileRecord = {
      ...current,
      concepto: typeof req.body?.concepto === 'string' ? req.body.concepto.trim() || current.concepto : current.concepto,
      monto: Number.isFinite(Number(req.body?.monto)) && Number(req.body?.monto) > 0 ? Number(req.body.monto) : current.monto,
      docTipo: req.body?.docTipo === 'factura' || req.body?.docTipo === 'boleta' ? req.body.docTipo : current.docTipo,
      ivaCredito: typeof req.body?.ivaCredito === 'boolean' ? req.body.ivaCredito : current.ivaCredito,
      periodo: typeof req.body?.periodo === 'string' && PERIOD_REGEX.test(req.body.periodo) ? req.body.periodo : current.periodo,
      updatedAt: new Date().toISOString(),
    };

    await saveRecord(req, next);
    return res.json({ data: next });
  } catch (error) {
    console.error('PUT /shipments/gav-chile/:id error:', error);
    return res.status(500).json({ error: 'No se pudo actualizar el gasto mensual' });
  }
});

router.put('/:id/documentos', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = Number.parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id invalido' });
    }

    const nombre = String(req.body?.nombre ?? '').trim();
    const tipo = String(req.body?.tipo ?? '').trim();
    const fileName = String(req.body?.fileName ?? '').trim();
    const fileUrl = String(req.body?.fileUrl ?? '').trim();

    if (!nombre || !fileName || !fileUrl) {
      return res.status(400).json({ error: 'nombre, fileName y fileUrl son requeridos' });
    }

    const records = await listGavChileRecords();
    const current = records.find((row) => row.id === id);
    if (!current) {
      return res.status(404).json({ error: 'Gasto mensual no encontrado' });
    }

    const docsWithoutFile = current.documentos.filter((doc) => doc.fileName !== fileName);
    const nextDoc: GavDocumento = {
      nombre,
      tipo: tipo || 'Otro',
      fileName,
      fileUrl,
      uploadedAt: new Date().toISOString(),
    };

    const updated: GavChileRecord = {
      ...current,
      adjunto: true,
      documentos: [...docsWithoutFile, nextDoc],
      updatedAt: new Date().toISOString(),
    };

    await saveRecord(req, updated);
    return res.json({ data: updated });
  } catch (error) {
    console.error('PUT /shipments/gav-chile/:id/documentos error:', error);
    return res.status(500).json({ error: 'No se pudo adjuntar el documento' });
  }
});

router.delete('/:id/documentos/:fileName', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = Number.parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const fileName = decodeURIComponent(Array.isArray(req.params.fileName) ? req.params.fileName[0] : req.params.fileName || '');

    if (!Number.isInteger(id) || id <= 0 || !fileName) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const records = await listGavChileRecords();
    const current = records.find((row) => row.id === id);
    if (!current) {
      return res.status(404).json({ error: 'Gasto mensual no encontrado' });
    }

    const nextDocs = current.documentos.filter((doc) => doc.fileName !== fileName);
    const updated: GavChileRecord = {
      ...current,
      documentos: nextDocs,
      adjunto: nextDocs.length > 0,
      updatedAt: new Date().toISOString(),
    };

    await saveRecord(req, updated);
    return res.json({ data: updated });
  } catch (error) {
    console.error('DELETE /shipments/gav-chile/:id/documentos/:fileName error:', error);
    return res.status(500).json({ error: 'No se pudo eliminar el documento' });
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
    const hasAdjunto = current.documentos.length > 0 || current.adjunto || Boolean(bodyAdjunto);

    if (!hasAdjunto) {
      return res.status(400).json({ error: 'Debe adjuntar comprobante antes de confirmar' });
    }

    const updated: GavChileRecord = {
      ...current,
      adjunto: hasAdjunto,
      estado: 'pagado',
      fechaPago: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    };

    await saveRecord(req, updated);

    return res.json({ data: updated });
  } catch (error) {
    console.error('PUT /shipments/gav-chile/:id/confirmar error:', error);
    return res.status(500).json({ error: 'No se pudo confirmar el gasto fijo' });
  }
});

export default router;

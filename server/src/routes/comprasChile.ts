import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const COMPRA_ENTITY = 'ShipmentsCompraChile';
const COMPRA_ACTION = 'UPSERT_COMPRA_CHILE';

type CompraTipo = 'producto' | 'gasto';
type DocTipo = 'factura' | 'boleta';
type CompraEstado = 'pagado' | 'pendiente';

type CompraChileRecord = {
  id: string;
  fecha: string;
  tipo: CompraTipo;
  docTipo: DocTipo;
  proveedor: string;
  descripcion: string;
  monto: number;
  iva: number;
  ivaCredito: boolean;
  estado: CompraEstado;
  createdAt: string;
};

function toCompraRecord(metadata: string | null | undefined): CompraChileRecord | null {
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata) as Partial<CompraChileRecord>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.id || typeof parsed.id !== 'string') return null;
    if (!parsed.fecha || typeof parsed.fecha !== 'string') return null;
    if (!parsed.tipo || (parsed.tipo !== 'producto' && parsed.tipo !== 'gasto')) return null;
    if (!parsed.docTipo || (parsed.docTipo !== 'factura' && parsed.docTipo !== 'boleta')) return null;
    if (!parsed.proveedor || typeof parsed.proveedor !== 'string') return null;
    if (!parsed.descripcion || typeof parsed.descripcion !== 'string') return null;
    if (!Number.isFinite(Number(parsed.monto))) return null;
    if (!Number.isFinite(Number(parsed.iva))) return null;
    if (typeof parsed.ivaCredito !== 'boolean') return null;
    if (!parsed.estado || (parsed.estado !== 'pagado' && parsed.estado !== 'pendiente')) return null;

    return {
      id: parsed.id,
      fecha: parsed.fecha,
      tipo: parsed.tipo,
      docTipo: parsed.docTipo,
      proveedor: parsed.proveedor,
      descripcion: parsed.descripcion,
      monto: Number(parsed.monto),
      iva: Number(parsed.iva),
      ivaCredito: parsed.ivaCredito,
      estado: parsed.estado,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function buildNextCompraId(items: CompraChileRecord[]): string {
  let max = 0;
  for (const item of items) {
    const match = /^CC-(\d{3})$/.exec(item.id);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value)) {
      max = Math.max(max, value);
    }
  }
  return `CC-${String(max + 1).padStart(3, '0')}`;
}

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity: COMPRA_ENTITY,
        action: COMPRA_ACTION,
      },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true },
    });

    const data = logs
      .map((log) => toCompraRecord(log.metadata))
      .filter((item): item is CompraChileRecord => item !== null)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    return res.json({ data });
  } catch (error) {
    console.error('GET /shipments/compras-chile error:', error);
    return res.status(500).json({ error: 'No se pudieron obtener las compras locales' });
  }
});

router.post('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { fecha, tipo, docTipo, proveedor, descripcion, monto, iva, estado } = req.body ?? {};

    if (!fecha || typeof fecha !== 'string' || Number.isNaN(Date.parse(fecha))) {
      return res.status(400).json({ error: 'fecha es requerida y debe ser valida' });
    }

    if (tipo !== 'producto' && tipo !== 'gasto') {
      return res.status(400).json({ error: "tipo debe ser 'producto' o 'gasto'" });
    }

    if (docTipo !== 'factura' && docTipo !== 'boleta') {
      return res.status(400).json({ error: "docTipo debe ser 'factura' o 'boleta'" });
    }

    if (typeof proveedor !== 'string' || !proveedor.trim()) {
      return res.status(400).json({ error: 'proveedor es requerido' });
    }

    if (typeof descripcion !== 'string' || !descripcion.trim()) {
      return res.status(400).json({ error: 'descripcion es requerida' });
    }

    const amount = Number(monto);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'monto debe ser mayor a 0' });
    }

    const vat = docTipo === 'factura' ? Number(iva) : 0;
    if (!Number.isFinite(vat) || vat < 0) {
      return res.status(400).json({ error: 'iva debe ser 0 o mayor' });
    }

    if (estado !== 'pagado' && estado !== 'pendiente') {
      return res.status(400).json({ error: "estado debe ser 'pagado' o 'pendiente'" });
    }

    const existingLogs = await prisma.auditLog.findMany({
      where: {
        entity: COMPRA_ENTITY,
        action: COMPRA_ACTION,
      },
      select: { metadata: true },
    });

    const existing = existingLogs
      .map((log) => toCompraRecord(log.metadata))
      .filter((item): item is CompraChileRecord => item !== null);

    const id = buildNextCompraId(existing);
    const nowIso = new Date().toISOString();
    const compra: CompraChileRecord = {
      id,
      fecha,
      tipo,
      docTipo,
      proveedor: proveedor.trim(),
      descripcion: descripcion.trim(),
      monto: amount,
      iva: vat,
      ivaCredito: docTipo === 'factura',
      estado,
      createdAt: nowIso,
    };

    await prisma.auditLog.create({
      data: {
        action: COMPRA_ACTION,
        entity: COMPRA_ENTITY,
        entityIds: compra.id,
        performedBy: req.user?.email ?? 'unknown',
        metadata: JSON.stringify(compra),
      },
    });

    return res.status(201).json({ data: compra });
  } catch (error) {
    console.error('POST /shipments/compras-chile error:', error);
    return res.status(500).json({ error: 'No se pudo registrar la compra local' });
  }
});

export default router;

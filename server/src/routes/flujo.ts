import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_CHANNELS = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'] as const;

const COMPRA_ENTITY = 'ShipmentsCompraChile';
const COMPRA_ACTION = 'UPSERT_COMPRA_CHILE';

const GAV_ENTITY = 'ShipmentsGavChile';
const GAV_ACTION = 'UPSERT_GAV_CHILE';

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

function parseGavRecord(metadata: string | null | undefined): GavChileRecord | null {
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
    const parsed = parseGavRecord(log.metadata);
    if (!parsed) continue;
    byId.set(parsed.id, parsed);
  }

  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const [orders, invoices, gavChile, comprasChileLogs] = await Promise.all([
      prisma.order.findMany({
        where: {
          source: { in: [...ALLOWED_CHANNELS] },
        },
        include: {
          items: {
            select: {
              price: true,
              quantity: true,
            },
          },
        },
      }),
      prisma.shipmentsInvoice.findMany({
        where: {
          estado: 'pagado',
        },
        select: {
          totalCLP: true,
        },
      }),
      listGavChileRecords(),
      prisma.auditLog.findMany({
        where: {
          entity: COMPRA_ENTITY,
          action: COMPRA_ACTION,
        },
        select: { metadata: true },
      }),
    ]);

    const comprasChile = comprasChileLogs
      .map((log) => toCompraRecord(log.metadata))
      .filter((item): item is CompraChileRecord => item !== null);

    const ingresos = orders.reduce((sum, order) => {
      return sum + order.items.reduce((sub, item) => sub + Number(item.price) * item.quantity, 0);
    }, 0);

    const egresosJP = invoices.reduce((sum, invoice) => sum + Number(invoice.totalCLP), 0);

    const gavChilePagado = gavChile
      .filter((g) => g.estado === 'pagado')
      .reduce((sum, g) => sum + g.monto, 0);

    const comprasChilePagadas = comprasChile
      .filter((c) => c.estado === 'pagado')
      .reduce((sum, c) => sum + c.monto, 0);

    const egresosCL = gavChilePagado + comprasChilePagadas;

    const flujoNeto = ingresos - egresosJP - egresosCL;

    return res.json({
      data: {
        ingresos,
        egresosJP,
        egresosCL,
        flujoNeto,
      },
    });
  } catch (error) {
    console.error('GET /shipments/flujo error:', error);
    return res.status(500).json({ error: 'No se pudo calcular el flujo de caja' });
  }
});

export default router;

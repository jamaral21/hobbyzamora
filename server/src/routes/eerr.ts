import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_CHANNELS = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'] as const;
type SalesChannel = (typeof ALLOWED_CHANNELS)[number];

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

const GAV_ENTITY = 'ShipmentsGavChile';
const GAV_ACTION = 'UPSERT_GAV_CHILE';

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
    const [orders, gavChile, comprasChile, shipmentsInvoices, boxes] = await Promise.all([
      prisma.order.findMany({
        where: {
          source: { in: [...ALLOWED_CHANNELS] },
        },
        include: {
          items: {
            select: {
              price: true,
              cost: true,
              quantity: true,
            },
          },
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
      prisma.shipmentsInvoice.findMany({
        where: {
          estado: 'pagado',
          invoiceId: {
            contains: 'GAV',
          },
        },
        select: {
          totalCLP: true,
        },
      }),
      prisma.shipmentsBox.findMany({
        select: {
          internacionIva: true,
        },
      }),
    ]);

    const ingresosPorCanal = ALLOWED_CHANNELS.reduce<Record<SalesChannel, number>>((acc, channel) => {
      acc[channel] = 0;
      return acc;
    }, {} as Record<SalesChannel, number>);

    let ingresos = 0;
    let costoVenta = 0;

    for (const order of orders) {
      const channel = order.source as SalesChannel;
      const revenue = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const cost = order.items.reduce((sum, item) => sum + Number(item.cost) * item.quantity, 0);

      if (ingresosPorCanal[channel] !== undefined) {
        ingresosPorCanal[channel] += revenue;
      }

      ingresos += revenue;
      costoVenta += cost;
    }

    const margenBruto = ingresos - costoVenta;

    const gavJapon = shipmentsInvoices.reduce((sum, invoice) => sum + Number(invoice.totalCLP), 0);
    const gavChileTotal = gavChile
      .filter((g) => g.estado === 'pagado')
      .reduce((sum, g) => sum + g.monto, 0);

    const gavTotal = gavJapon + gavChileTotal;
    const ebit = margenBruto - gavTotal;

    const ivaInternacion = boxes.reduce((sum, box) => sum + Number(box.internacionIva ?? 0), 0);

    const comprasLocales = comprasChile
      .map((log) => toCompraRecord(log.metadata))
      .filter((item): item is CompraChileRecord => item !== null);

    const ivaFacturasLocales = comprasLocales
      .filter((c) => c.ivaCredito || c.docTipo === 'factura')
      .reduce((sum, c) => sum + c.iva, 0);

    const ivaCredito = ivaInternacion + ivaFacturasLocales;
    const resultadoNeto = ebit + ivaCredito;

    return res.json({
      data: {
        ingresosPorCanal,
        ingresos,
        costoVenta,
        margenBruto,
        gavJapon,
        gavChile: gavChileTotal,
        gavTotal,
        ebit,
        ivaCredito,
        resultadoNeto,
      },
    });
  } catch (error) {
    console.error('GET /shipments/eerr error:', error);
    return res.status(500).json({ error: 'No se pudo calcular el estado de resultados' });
  }
});

export default router;

import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_CHANNELS = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'] as const;

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

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const [orders, invoices, products, purchases, boxes, comprasChileLogs] = await Promise.all([
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
        select: {
          estado: true,
          totalCLP: true,
        },
      }),
      prisma.product.findMany({
        where: { stock: { gt: 0 } },
        select: {
          stock: true,
          cost: true,
        },
      }),
      prisma.shipmentsPurchase.findMany({
        where: {
          bodega: 'japon',
        },
        select: {
          precioU: true,
          cant: true,
          tc: true,
        },
      }),
      prisma.shipmentsBox.findMany({
        select: {
          internacionIva: true,
        },
      }),
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

    const ingresosVentas = orders.reduce((sum, order) => {
      return sum + order.items.reduce((sub, item) => sub + Number(item.price) * item.quantity, 0);
    }, 0);

    const egresosBoletasPagadas = invoices
      .filter((b) => b.estado === 'pagado')
      .reduce((sum, b) => sum + Number(b.totalCLP), 0);

    const egresosChilePagados = comprasChile
      .filter((c) => c.estado === 'pagado')
      .reduce((sum, c) => sum + c.monto, 0);

    const cajaEstimada = ingresosVentas - egresosBoletasPagadas - egresosChilePagados;

    const invChile = products.reduce((sum, p) => sum + p.stock * Number(p.cost), 0);

    const invJapon = purchases.reduce((sum, p) => {
      const tc = Number(p.tc ?? 0);
      if (!tc || tc <= 0) return sum;
      return sum + (Number(p.precioU) * p.cant) / tc;
    }, 0);

    const ivaInternaciones = boxes.reduce((sum, b) => sum + Number(b.internacionIva ?? 0), 0);

    const ivaComprasChile = comprasChile
      .filter((c) => c.ivaCredito || c.docTipo === 'factura')
      .reduce((sum, c) => sum + c.iva, 0);

    const ivaCreditoTotal = ivaInternaciones + ivaComprasChile;

    const activos = cajaEstimada + invChile + invJapon + ivaCreditoTotal;

    const pasivos = invoices
      .filter((b) => b.estado === 'sin_pagar')
      .reduce((sum, b) => sum + Number(b.totalCLP), 0);

    const patrimonio = activos - pasivos;

    return res.json({
      data: {
        cajaEstimada,
        invChile,
        invJapon,
        ivaCreditoTotal,
        activos,
        pasivos,
        patrimonio,
      },
    });
  } catch (error) {
    console.error('GET /shipments/balance error:', error);
    return res.status(500).json({ error: 'No se pudo calcular el balance general' });
  }
});

export default router;

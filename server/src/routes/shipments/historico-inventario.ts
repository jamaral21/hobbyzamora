import { Router } from 'express';
import { prisma } from '../../index.js';
import { requireRole } from '../../middleware/auth.js';

const router = Router();

router.get('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const ean = typeof req.query.ean === 'string' ? req.query.ean.trim() : undefined;
    const batches = await prisma.inventoryBatch.findMany({
      where: ean ? { ean } : undefined,
      include: { product: { select: { id: true, sku: true, name: true } }, shipmentBox: { select: { boxId: true, fecha: true, isHistorical: true } } },
      orderBy: [{ ean: 'asc' }, { receivedAt: 'asc' }],
    });

    const grouped = new Map<string, typeof batches>();
    for (const batch of batches) {
      const key = batch.ean || `SIN-EAN:${batch.id}`;
      grouped.set(key, [...(grouped.get(key) || []), batch]);
    }

    const data = [...grouped.entries()].map(([barcode, rows]) => ({
      ean: barcode.startsWith('SIN-EAN:') ? null : barcode,
      product: rows.find((row) => row.product)?.product || null,
      received: rows.reduce((sum, row) => sum + row.quantity, 0),
      sellableStock: rows.filter((row) => row.disposition === 'SELLABLE').reduce((sum, row) => sum + row.remaining, 0),
      lots: rows.map((row) => ({
        id: row.id,
        boxId: row.shipmentBox?.boxId || null,
        receivedAt: row.receivedAt,
        disposition: row.disposition,
        quantity: row.quantity,
        remaining: row.remaining,
        unitCost: Number(row.unitCost),
        isHistoricalBox: row.shipmentBox?.isHistorical || false,
        productId: row.productId,
      })),
    }));

    return res.json({ data });
  } catch (error) {
    console.error('GET /shipments/historico-inventario error:', error);
    return res.status(500).json({ error: 'No se pudo cargar el histórico de inventario' });
  }
});

router.post('/sincronizar', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { ean, productId } = req.body ?? {};
    if (typeof ean !== 'string' || !ean.trim() || typeof productId !== 'string' || !productId) {
      return res.status(400).json({ error: 'ean y productId son requeridos' });
    }
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, ean: true } });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.ean && product.ean !== ean.trim()) return res.status(409).json({ error: 'El EAN/JAN no coincide con el producto' });

    const result = await prisma.$transaction(async (tx) => {
      if (!product.ean) await tx.product.update({ where: { id: product.id }, data: { ean: ean.trim() } });
      const updated = await tx.inventoryBatch.updateMany({
        where: { ean: ean.trim(), productId: null },
        data: { productId: product.id },
      });
      return updated.count;
    });
    return res.json({ data: { associatedLots: result } });
  } catch (error) {
    console.error('POST /shipments/historico-inventario/sincronizar error:', error);
    return res.status(500).json({ error: 'No se pudo sincronizar el histórico' });
  }
});

router.post('/conciliaciones', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { productId, ean, nombre, quantity, type, reason, occurredAt, importedVia = 'manual' } = req.body ?? {};
    if (!nombre || !type || !Number.isInteger(quantity) || quantity === 0 || !occurredAt) {
      return res.status(400).json({ error: 'nombre, type, quantity no cero y occurredAt son requeridos' });
    }
    const reconciliation = await prisma.inventoryReconciliation.create({
      data: { productId: productId || null, ean: ean || null, nombre, quantity, type, reason: reason || null, occurredAt: new Date(occurredAt), importedVia },
    });
    return res.status(201).json({ data: reconciliation });
  } catch (error) {
    console.error('POST /shipments/historico-inventario/conciliaciones error:', error);
    return res.status(500).json({ error: 'No se pudo registrar la conciliación' });
  }
});

router.post('/conciliaciones/importar', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) {
    return res.status(400).json({ error: 'rows debe contener entre 1 y 1000 registros' });
  }
  try {
    const prepared = rows.map((row: any, index: number) => {
      if (!row.nombre || !row.type || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) === 0 || !row.occurredAt) {
        throw new Error(`Fila ${index + 1} inválida`);
      }
      return { productId: row.productId || null, ean: row.ean || null, nombre: row.nombre, quantity: Number(row.quantity), type: row.type, reason: row.reason || null, occurredAt: new Date(row.occurredAt), importedVia: 'csv' };
    });
    const created = await prisma.inventoryReconciliation.createMany({ data: prepared });
    return res.status(201).json({ data: { created: created.count } });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'CSV inválido' });
  }
});

export default router;
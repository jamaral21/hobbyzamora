import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (_req: AuthRequest, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: {
        id: true,
        sku: true,
        name: true,
        ean: true,
        stock: true,
        cost: true,
        price: true,
      },
      orderBy: [{ stock: 'desc' }, { name: 'asc' }],
    });

    const items = products.map((p) => {
      const costUnit = Number(p.cost);
      const salePrice = Number(p.price);
      const marginPct = salePrice > 0 ? ((salePrice - costUnit) / salePrice) * 100 : null;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        ean: p.ean,
        stock: p.stock,
        costUnit,
        salePrice,
        marginPct,
      };
    });

    const kpis = {
      totalUnits: items.reduce((sum, item) => sum + item.stock, 0),
      inventoryValue: items.reduce((sum, item) => sum + item.stock * item.costUnit, 0),
      noSalePrice: items.filter((item) => !item.salePrice || item.salePrice <= 0).length,
    };

    return res.json({ data: { items, kpis } });
  } catch (error) {
    console.error('GET /shipments/bodega-chile error:', error);
    return res.status(500).json({ error: 'No se pudo obtener bodega chile' });
  }
});

router.put('/:id/precio', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const value = Number(req.body?.precioVenta);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ error: 'precioVenta debe ser un numero mayor a 0' });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, stock: true, cost: true, price: true, sku: true, name: true, ean: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { price: value },
      select: {
        id: true,
        sku: true,
        name: true,
        ean: true,
        stock: true,
        cost: true,
        price: true,
      },
    });

    const costUnit = Number(updated.cost);
    const salePrice = Number(updated.price);
    const marginPct = salePrice > 0 ? ((salePrice - costUnit) / salePrice) * 100 : null;

    return res.json({
      data: {
        id: updated.id,
        sku: updated.sku,
        name: updated.name,
        ean: updated.ean,
        stock: updated.stock,
        costUnit,
        salePrice,
        marginPct,
      },
    });
  } catch (error) {
    console.error('PUT /shipments/bodega-chile/:id/precio error:', error);
    return res.status(500).json({ error: 'No se pudo actualizar precio de venta' });
  }
});

export default router;

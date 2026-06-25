import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import {
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  deletePurchase,
  calcDisponibleBySku,
} from '../../lib/purchaseService.js';

const router = express.Router();

/**
 * GET /api/shipments/compras
 * Listar compras con filtros opcionales
 * Query params:
 *   - estado?: 'por_pagar' | 'esp_pago' | 'pagado'
 *   - bodega?: 'japon' | 'transito' | 'chile'
 */
router.get('/', async (req: ShipmentsRequest, res) => {
  try {
    const { estado, bodega } = req.query;

    const result = await listPurchases(
      (Array.isArray(estado) ? estado[0] : estado) as any,
      (Array.isArray(bodega) ? bodega[0] : bodega) as any
    );

    if (result.error) {
      return res.status(500).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/shipments/compras/:id
 * Obtener una compra específica
 */
router.get('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await getPurchase(id);

    if (result.error) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * POST /api/shipments/compras
 * Crear nueva compra (auto-asigna SKU)
 * Body:
 *   {
 *     fecha: string (YYYY-MM-DD)
 *     tipo: string
 *     nombre: string (requerido)
 *     ean?: string
 *     tarjeta: string (método de pago, requerido)
 *     precioU: number (> 0)
 *     cant: number (> 0, entero)
 *     tc?: number (tipo de cambio)
 *   }
 */
router.post('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await createPurchase(req.body);

    if (result.error) {
      const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
      return res.status(status).json(result);
    }

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * PUT /api/shipments/compras/:id
 * Editar compra existente
 * Body: Partial<Purchase> (campos editables)
 */
router.put('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updatePurchase(id, req.body);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'NOT_FOUND') status = 404;
      if (result.error.code === 'VALIDATION_ERROR') status = 400;
      return res.status(status).json(result);
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * DELETE /api/shipments/compras/:id
 * Eliminar compra
 * Regla: No se puede eliminar si el SKU está en cajas activas (transito, llegada)
 */
router.delete('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deletePurchase(id);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'NOT_FOUND') status = 404;
      if (result.error.code === 'CONFLICT') status = 409;
      return res.status(status).json(result);
    }

    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/shipments/compras/disponible/:sku
 * Calcular cuántas unidades están disponibles de un SKU
 */
router.get('/disponible/:sku', async (req: ShipmentsRequest, res) => {
  try {
    const sku = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;
    const disponible = await calcDisponibleBySku(sku);
    return res.json({ sku, disponible });
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    });
  }
});

export default router;

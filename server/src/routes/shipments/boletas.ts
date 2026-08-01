import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from '../../lib/invoiceService.js';

const router = express.Router();

/**
 * GET /api/shipments/boletas
 * Listar todas las boletas
 *
 * Response 200:
 *   { data: Invoice[] }
 */
router.get('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await listInvoices();

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
 * GET /api/shipments/boletas/:id
 * Obtener boleta con líneas de detalle
 *
 * Response 200:
 *   { data: { invoiceId, fecha, items[], totalJPY, totalCLP, ... } }
 */
router.get('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    const result = await getInvoice(invoiceId);

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
 * POST /api/shipments/boletas
 * Crear nueva boleta a partir de productos seleccionados
 *
 * Body:
 *   {
 *     items: Array<{
 *       compraId: string,
 *       precioU: number,
 *       cant: number,
 *       nombre: string,
 *       ean?: string,
 *       tipo: string
 *     }>,
 *     comisionPct: number,    // 0-100
 *     tc: number              // > 0
 *   }
 *
 * Fórmulas:
 *   subtotalJPY = Σ(precioU × cant)
 *   totalJPY = subtotalJPY × (1 + comisionPct/100)
 *   totalCLP = totalJPY / tc
 *
 * Response 201:
 *   { data: { invoiceId: 'BOL-2026-001', ..., items: [...] } }
 */
router.post('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await createInvoice(req.body);

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
 * PUT /api/shipments/boletas/:id
 * Editar líneas/comisión/tc de una boleta existente
 *
 * Regla: Solo se puede editar si estado = 'sin_pagar'
 *
 * Body:
 *   {
 *     items: Array<{ nombre, ean?, tipo, precioU, cant }>,
 *     comisionPct: number,
 *     tc: number
 *   }
 *
 * Response 200:
 *   { data: { invoiceId, ..., items: [...] } }
 */
router.put('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const result = await updateInvoice(invoiceId, req.body);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'VALIDATION_ERROR') status = 400;
      if (result.error.code === 'NOT_FOUND') status = 404;
      if (result.error.code === 'CONFLICT') status = 409;
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
 * DELETE /api/shipments/boletas/:id
 * Eliminar boleta
 *
 * Regla: Solo se puede eliminar si estado = 'sin_pagar'
 *
 * Response 204: Sin contenido
 */
router.delete('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const invoiceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    const result = await deleteInvoice(invoiceId);

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

export default router;

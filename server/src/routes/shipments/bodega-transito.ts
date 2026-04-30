import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import { getBodegaTransito } from '../../lib/bodegaTransitoService.js';

const router = express.Router();

/**
 * GET /api/shipments/bodega-transito
 * Listar cajas agrupadas por estado con KPIs
 */
router.get('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await getBodegaTransito();

    if (result.error) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al obtener bodega tránsito',
      },
    });
  }
});

export default router;

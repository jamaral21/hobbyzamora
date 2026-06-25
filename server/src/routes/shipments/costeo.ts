import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import { confirmCosteoCaja, listCajasDisponiblesCosteo } from '../../lib/costeoService.js';

const router = express.Router();

/**
 * GET /api/shipments/costeo/cajas-disponibles
 * Listar cajas en estado llegada listas para costeo
 */
router.get('/cajas-disponibles', async (req: ShipmentsRequest, res) => {
  try {
    const result = await listCajasDisponiblesCosteo();

    if (result.error) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
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
 * POST /api/shipments/costeo/:cajaId/confirmar
 * Confirmar costeo de caja y crear stock en Chile
 */
router.post('/:cajaId/confirmar', async (req: ShipmentsRequest, res) => {
  try {
    const cajaId = Array.isArray(req.params.cajaId) ? req.params.cajaId[0] : req.params.cajaId;
    const result = await confirmCosteoCaja(cajaId, req.body);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'VALIDATION_ERROR') status = 400;
      if (result.error.code === 'CONFLICT') status = 409;
      if (result.error.code === 'NOT_FOUND') status = 404;
      return res.status(status).json(result);
    }

    return res.status(200).json(result);
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

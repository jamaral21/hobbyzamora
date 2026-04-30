import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import { listInternacionStatus, saveInternacion } from '../../lib/internacionService.js';

const router = express.Router();

/**
 * GET /api/shipments/internacion
 * Listar cajas con estado de internación
 */
router.get('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await listInternacionStatus();

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
 * PUT /api/shipments/internacion/:cajaId
 * Guardar arancel + IVA de internación
 */
router.put('/:cajaId', async (req: ShipmentsRequest, res) => {
  try {
    const cajaId = Array.isArray(req.params.cajaId) ? req.params.cajaId[0] : req.params.cajaId;
    const result = await saveInternacion(cajaId, req.body);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'VALIDATION_ERROR') status = 400;
      if (result.error.code === 'NOT_FOUND') status = 404;
      if (result.error.code === 'CONFLICT') status = 409;
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

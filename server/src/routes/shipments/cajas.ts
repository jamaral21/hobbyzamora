import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import {
  createBox,
  deleteBox,
  listBoxes,
  updateBox,
} from '../../lib/boxService.js';

const router = express.Router();

/**
 * GET /api/shipments/cajas
 * Listar todas las cajas con sus productos
 */
router.get('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await listBoxes();

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
 * POST /api/shipments/cajas
 * Crear caja con productos de bodega Japón
 */
router.post('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await createBox(req.body);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'VALIDATION_ERROR') status = 400;
      if (result.error.code === 'CONFLICT') status = 409;
      if (result.error.code === 'NOT_FOUND') status = 404;
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
 * PUT /api/shipments/cajas/:id
 * Editar caja (solo estado transito)
 * :id corresponde al boxId (nombre único de la caja)
 */
router.put('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const boxId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await updateBox(boxId, req.body);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'VALIDATION_ERROR') status = 400;
      if (result.error.code === 'CONFLICT') status = 409;
      if (result.error.code === 'NOT_FOUND') status = 404;
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
 * DELETE /api/shipments/cajas/:id
 * Eliminar caja (solo transito o llegada)
 * :id corresponde al boxId (nombre único de la caja)
 */
router.delete('/:id', async (req: ShipmentsRequest, res) => {
  try {
    const boxId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteBox(boxId);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'CONFLICT') status = 409;
      if (result.error.code === 'NOT_FOUND') status = 404;
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

import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import { createWebOrder, listWebOrders } from '../../lib/webOrderService.js';

const router = express.Router();

/**
 * GET /api/shipments/compras-web
 * Listar pedidos web
 */
router.get('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await listWebOrders();

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
 * POST /api/shipments/compras-web
 * Registrar nuevo pedido web (ID auto: WEB-NNN)
 */
router.post('/', async (req: ShipmentsRequest, res) => {
  try {
    const result = await createWebOrder(req.body);

    if (result.error) {
      let status = 500;
      if (result.error.code === 'VALIDATION_ERROR') status = 400;
      if (result.error.code === 'CONFLICT') status = 409;
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

export default router;

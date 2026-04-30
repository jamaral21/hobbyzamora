import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import { confirmPayment } from '../../lib/paymentService.js';

const router = express.Router({ mergeParams: true });

/**
 * POST /api/shipments/pagos/:boletaId/confirmar
 * Confirmar pago de una boleta
 *
 * Path params:
 *   - boletaId: ID de la boleta (ej: BOL-2026-001)
 *
 * Body (opcional):
 *   {
 *     cuenta: string,       // nombre de cuenta bancaria
 *     fecha: string,        // fecha de pago YYYY-MM-DD
 *     montoCLP: number      // monto transferido
 *   }
 *
 * Lógica (transacción atómica):
 * 1. Verificar que boleta existe y está 'sin_pagar'
 * 2. boleta.estado → 'pagado'
 * 3. Todas las compras de esa boleta: compra.estado → 'pagado'
 *
 * Response 200:
 *   { 
 *     data: { 
 *       invoice: { invoiceId, estado: 'pagado', ... },
 *       purchasesUpdated: number
 *     }
 *   }
 */
router.post('/:boletaId/confirmar', async (req: ShipmentsRequest, res) => {
  try {
    const boletaId = Array.isArray(req.params.boletaId)
      ? req.params.boletaId[0]
      : req.params.boletaId;

    const result = await confirmPayment(boletaId, req.body);

    if (result.error) {
      let status = 500;
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

export default router;

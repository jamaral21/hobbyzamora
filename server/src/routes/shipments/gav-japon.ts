import { Router } from 'express';
import type { ShipmentsRequest } from '../../types/shipments.js';
import {
  getGavJaponHistorial,
  generateGavJaponBoleta,
  type GavJaponGenerateResponse,
  type GavJaponHistoryResponse,
} from '../../lib/gavJaponService.js';
import { Decimal } from '@prisma/client/runtime/library.js';

const router = Router();

/**
 * GET /api/shipments/gav-japon/historial
 * Obtener historial de GAV Japón (últimos 6 meses + alertas)
 */
router.get('/historial', async (req: ShipmentsRequest, res) => {
  try {
    const result = await getGavJaponHistorial();

    if (result.error) {
      return res.status(result.error.code === 'NOT_FOUND' ? 404 : 500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[gavJaponRoutes] GET /historial error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener historial de GAV Japón',
        details: error instanceof Error ? [{ field: 'general', message: error.message }] : [],
      },
    });
  }
});

/**
 * POST /api/shipments/gav-japon/generar
 * Generar boleta GAV del mes actual
 *
 * Body:
 * {
 *   "tc": 8.5  // tipo de cambio ¥ a CLP
 * }
 */
router.post('/generar', async (req: ShipmentsRequest, res) => {
  try {
    const { tc } = req.body;

    // Validar entrada
    if (!tc || typeof tc !== 'number' || tc <= 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El tipo de cambio (tc) es requerido y debe ser > 0',
          details: [{ field: 'tc', message: 'tc debe ser un número positivo (ej: 8.5)' }],
        },
      });
    }

    const result = await generateGavJaponBoleta(new Decimal(tc));

    if (result.error) {
      const statusCode =
        result.error.code === 'CONFLICT'
          ? 409
          : result.error.code === 'NOT_FOUND'
            ? 404
            : 500;
      return res.status(statusCode).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('[gavJaponRoutes] POST /generar error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al generar boleta GAV Japón',
        details: error instanceof Error ? [{ field: 'general', message: error.message }] : [],
      },
    });
  }
});

export default router;

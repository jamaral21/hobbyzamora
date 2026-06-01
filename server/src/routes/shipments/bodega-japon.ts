import express from 'express';
import { ShipmentsRequest } from '../../types/shipments.js';
import { getBodegaJapon, getBodegaJaponProductBySku } from '../../lib/bodegaJaponService.js';

const router = express.Router();

/**
 * GET /api/shipments/bodega-japon
 * Listar productos disponibles en Japón (solo lectura)
 * Solo muestra productos con disponible > 0
 *
 * Query params:
 *   - estado?: 'por_pagar' | 'esp_pago' | 'pagado'
 *
 * Response:
 *   {
 *     data: {
 *       data: Array<{
 *         sku: string,
 *         nombre: string,
 *         ean?: string,
 *         disponible: number,
 *         cantTotal: number,
 *         precioU: number,
 *         estado: PaymentState
 *       }>,
 *       kpis: {
 *         skusDisponibles: number,
 *         unidadesDisponibles: number,
 *         totalJPY: number,
 *         totalCLPEstimado: number
 *       }
 *     }
 *   }
 */
router.get('/', async (req: ShipmentsRequest, res) => {
  try {
    const { estado } = req.query;

    const result = await getBodegaJapon(
      (Array.isArray(estado) ? estado[0] : estado) as any
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
 * GET /api/shipments/bodega-japon/:sku
 * Obtener un producto específico de bodega Japón por SKU
 *
 * Response:
 *   {
 *     data: {
 *       sku: string,
 *       nombre: string,
 *       ean?: string,
 *       disponible: number,
 *       cantTotal: number,
 *       precioU: number,
 *       estado: PaymentState
 *     }
 *   }
 */
router.get('/:sku', async (req: ShipmentsRequest, res) => {
  try {
    const sku = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;

    const result = await getBodegaJaponProductBySku(sku);

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

export default router;

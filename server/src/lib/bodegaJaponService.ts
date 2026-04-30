import { prisma } from '../index.js';
import { ShipmentsResponse } from '../types/shipments.js';
import { calcDisponibleBySku } from './purchaseService.js';

/**
 * Servicio de Bodega Japón - Lógica para mostrar inventario disponible
 */

interface BodegaJaponProduct {
  sku: string;
  nombre: string;
  ean?: string;
  disponible: number;
  cantTotal: number;
  precioU: number;
  estado: 'por_pagar' | 'esp_pago' | 'pagado';
}

interface BodegaJaponResponse {
  data: BodegaJaponProduct[];
  kpis: {
    skusDisponibles: number;
    unidadesDisponibles: number;
    totalJPY: number;
    totalCLPEstimado: number;
  };
}

/**
 * Obtener bodega Japón con filtros opcionales
 * Solo muestra productos con disponible > 0
 */
export async function getBodegaJapon(
  estado?: 'por_pagar' | 'esp_pago' | 'pagado'
): Promise<ShipmentsResponse<BodegaJaponResponse>> {
  try {
    // Obtener todas las compras (filtradas por estado si se proporciona)
    const where: any = {};
    if (estado) where.estado = estado;

    const purchases = await prisma.shipmentsPurchase.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });

    // Calcular disponible para cada SKU y filtrar solo los que tienen disponible > 0
    const productsPromises = purchases.map(async (p) => {
      const disponible = await calcDisponibleBySku(p.sku);
      
      return {
        sku: p.sku,
        nombre: p.nombre,
        ean: p.ean || undefined,
        disponible,
        cantTotal: p.cant,
        precioU: Number(p.precioU),
        estado: p.estado as 'por_pagar' | 'esp_pago' | 'pagado',
      };
    });

    const productsWithDisponible = await Promise.all(productsPromises);

    // Filtrar solo los que tienen disponible > 0
    const disponibles = productsWithDisponible.filter((p) => p.disponible > 0);

    // Calcular KPIs
    const skusDisponibles = disponibles.length;
    const unidadesDisponibles = disponibles.reduce((sum, p) => sum + p.disponible, 0);
    const totalJPY = disponibles.reduce((sum, p) => sum + p.precioU * p.disponible, 0);

    // Estimar CLP usando el tipo de cambio más reciente disponible
    let totalCLPEstimado = 0;
    for (const product of disponibles) {
      const purchase = purchases.find((p) => p.sku === product.sku);
      if (purchase?.tc) {
        totalCLPEstimado += (Number(purchase.precioU) * product.disponible) / Number(purchase.tc);
      }
    }

    return {
      data: {
        data: disponibles,
        kpis: {
          skusDisponibles,
          unidadesDisponibles,
          totalJPY,
          totalCLPEstimado: Math.round(totalCLPEstimado),
        },
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al obtener bodega Japón',
      },
    };
  }
}

/**
 * Obtener producto específico de bodega Japón
 */
export async function getBodegaJaponProductBySku(
  sku: string
): Promise<ShipmentsResponse<BodegaJaponProduct>> {
  try {
    const purchase = await prisma.shipmentsPurchase.findUnique({
      where: { sku },
    });

    if (!purchase) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: `Producto con SKU ${sku} no encontrado`,
        },
      };
    }

    const disponible = await calcDisponibleBySku(sku);

    return {
      data: {
        sku: purchase.sku,
        nombre: purchase.nombre,
        ean: purchase.ean || undefined,
        disponible,
        cantTotal: purchase.cant,
        precioU: Number(purchase.precioU),
        estado: purchase.estado as 'por_pagar' | 'esp_pago' | 'pagado',
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }
}

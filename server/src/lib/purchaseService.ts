import { prisma } from '../index.js';
import { ShipmentsResponse } from '../types/shipments.js';
import { ShipmentsPurchase, ShipmentsBoxProduct } from '@prisma/client';

/**
 * Servicio de Compras - Lógica de negocio para registro de compras en Japón
 */

/**
 * Genera el próximo SKU correlativo
 * Ejemplo: JP-0001, JP-0002, etc.
 */
export async function generateNextSku(): Promise<string> {
  const lastPurchase = await prisma.shipmentsPurchase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { sku: true },
  });

  if (!lastPurchase.length) {
    return 'JP-0001';
  }

  const lastSku = lastPurchase[0].sku;
  const match = lastSku.match(/JP-(\d+)/);

  if (!match) {
    return 'JP-0001';
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;

  return `JP-${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Listar compras con filtros opcionales
 */
export async function listPurchases(
  estado?: 'por_pagar' | 'esp_pago' | 'pagado',
  bodega?: 'japon' | 'transito' | 'chile'
): Promise<ShipmentsResponse<ShipmentsPurchase[]>> {
  try {
    const where: any = {};

    if (estado) where.estado = estado;
    if (bodega) where.bodega = bodega;

    const purchases = await prisma.shipmentsPurchase.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });

    return {
      data: purchases,
      meta: {
        total: purchases.length,
      },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al listar compras',
      },
    };
  }
}

/**
 * Obtener una compra por ID
 */
export async function getPurchase(id: string): Promise<ShipmentsResponse<ShipmentsPurchase>> {
  try {
    const purchase = await prisma.shipmentsPurchase.findUnique({
      where: { id },
    });

    if (!purchase) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Compra no encontrada',
        },
      };
    }

    return { data: purchase };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }
}

/**
 * Crear nueva compra (auto-asigna SKU)
 */
export async function createPurchase(payload: {
  fecha: string; // YYYY-MM-DD
  tipo: string;
  nombre: string;
  ean?: string;
  tarjeta: string;
  precioU: number;
  cant: number;
  tc?: number;
}): Promise<ShipmentsResponse<ShipmentsPurchase>> {
  try {
    // Validaciones
    if (!payload.nombre || payload.nombre.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El nombre es requerido',
          details: [{ field: 'nombre', message: 'Campo requerido' }],
        },
      };
    }

    if (payload.precioU <= 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El precio unitario debe ser mayor a 0',
          details: [{ field: 'precioU', message: 'Debe ser > 0' }],
        },
      };
    }

    if (payload.cant <= 0 || !Number.isInteger(payload.cant)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La cantidad debe ser un número entero mayor a 0',
          details: [{ field: 'cant', message: 'Debe ser entero > 0' }],
        },
      };
    }

    if (!payload.tarjeta || payload.tarjeta.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El método de pago es requerido',
          details: [{ field: 'tarjeta', message: 'Campo requerido' }],
        },
      };
    }

    // Validar fecha
    const fechaObj = new Date(payload.fecha);
    if (isNaN(fechaObj.getTime())) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Fecha inválida (formato esperado: YYYY-MM-DD)',
          details: [{ field: 'fecha', message: 'Formato inválido' }],
        },
      };
    }

    // Generar SKU siguiente
    const sku = await generateNextSku();

    // Calcular total
    const total = payload.precioU * payload.cant;

    // Crear compra
    const purchase = await prisma.shipmentsPurchase.create({
      data: {
        sku,
        fecha: fechaObj,
        tipo: payload.tipo || 'Producto',
        nombre: payload.nombre.trim(),
        ean: payload.ean?.trim() || null,
        tarjeta: payload.tarjeta.trim(),
        precioU: payload.precioU,
        cant: payload.cant,
        total,
        estado: 'por_pagar',
        bodega: 'japon',
        tc: payload.tc || null,
      },
    });

    return {
      data: purchase,
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return {
        error: {
          code: 'CONFLICT',
          message: 'El SKU ya existe',
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al crear compra',
      },
    };
  }
}

/**
 * Editar compra existente
 */
export async function updatePurchase(
  id: string,
  payload: Partial<{
    fecha: string;
    tipo: string;
    nombre: string;
    ean: string;
    tarjeta: string;
    precioU: number;
    cant: number;
    estado: 'por_pagar' | 'esp_pago' | 'pagado';
    bodega: 'japon' | 'transito' | 'chile';
    tc: number;
  }>
): Promise<ShipmentsResponse<ShipmentsPurchase>> {
  try {
    // Verificar que la compra existe
    const existing = await prisma.shipmentsPurchase.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Compra no encontrada',
        },
      };
    }

    // Validaciones
    if (payload.nombre !== undefined && payload.nombre.trim() === '') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El nombre no puede estar vacío',
          details: [{ field: 'nombre', message: 'No puede estar vacío' }],
        },
      };
    }

    if (payload.precioU !== undefined && payload.precioU <= 0) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El precio unitario debe ser mayor a 0',
          details: [{ field: 'precioU', message: 'Debe ser > 0' }],
        },
      };
    }

    if (payload.cant !== undefined && (payload.cant <= 0 || !Number.isInteger(payload.cant))) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La cantidad debe ser un número entero mayor a 0',
          details: [{ field: 'cant', message: 'Debe ser entero > 0' }],
        },
      };
    }

    // Calcular nuevo total si cambió precioU o cant
    const precioU = payload.precioU ?? Number(existing.precioU);
    const cant = payload.cant ?? existing.cant;
    const newTotal = precioU * cant;

    // Actualizar
    const updated = await prisma.shipmentsPurchase.update({
      where: { id },
      data: {
        ...(payload.fecha && { fecha: new Date(payload.fecha) }),
        ...(payload.tipo && { tipo: payload.tipo }),
        ...(payload.nombre && { nombre: payload.nombre.trim() }),
        ...(payload.ean !== undefined && { ean: payload.ean?.trim() || null }),
        ...(payload.tarjeta && { tarjeta: payload.tarjeta.trim() }),
        ...(payload.precioU !== undefined && { precioU: payload.precioU }),
        ...(payload.cant !== undefined && { cant: payload.cant }),
        ...(payload.estado && { estado: payload.estado }),
        ...(payload.bodega && { bodega: payload.bodega }),
        ...(payload.tc !== undefined && { tc: payload.tc }),
        total: newTotal,
      },
    });

    return { data: updated };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al actualizar compra',
      },
    };
  }
}

/**
 * Eliminar compra
 * Verificar que no esté en cajas activas (transito, llegada)
 */
export async function deletePurchase(id: string): Promise<ShipmentsResponse<{ success: boolean }>> {
  try {
    // Verificar que existe
    const purchase = await prisma.shipmentsPurchase.findUnique({
      where: { id },
    });

    if (!purchase) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Compra no encontrada',
        },
      };
    }

    // Verificar que no esté en cajas activas
    const boxesWithProduct = await prisma.shipmentsBoxProduct.findMany({
      where: { compraId: id },
      include: {
        box: {
          select: { estado: true, boxId: true },
        },
      },
    });

    // Filtrar solo cajas en tránsito o llegada
    const activeBoxes = boxesWithProduct.filter(
      (bp) => bp.box.estado === 'transito' || bp.box.estado === 'llegada'
    );

    if (activeBoxes.length > 0) {
      const boxIds = activeBoxes.map((bp) => bp.box.boxId).join(', ');
      return {
        error: {
          code: 'CONFLICT',
          message: `No se puede eliminar. El SKU ${purchase.sku} está en las cajas activas: ${boxIds}`,
        },
      };
    }

    // Eliminar la compra
    await prisma.shipmentsPurchase.delete({
      where: { id },
    });

    return {
      data: { success: true },
    };
  } catch (error: any) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error al eliminar compra',
      },
    };
  }
}

/**
 * Calcular disponible de un SKU
 * disponible = cant_total - en_cajas - en_chile
 */
export async function calcDisponibleBySku(sku: string): Promise<number> {
  const purchase = await prisma.shipmentsPurchase.findUnique({
    where: { sku },
  });

  if (!purchase) {
    return 0;
  }

  // Sumar cantidad en cajas activas (transito, llegada)
  const inBoxes = await prisma.shipmentsBoxProduct.aggregate({
    where: {
      sku,
      box: {
        estado: {
          in: ['transito', 'llegada'],
        },
      },
    },
    _sum: {
      cant: true,
    },
  });

  // Sumar cantidad en stock Chile
  const inChile = await prisma.shipmentsChileStock.aggregate({
    where: { sku },
    _sum: {
      cant: true,
    },
  });

  const enCajas = Number(inBoxes._sum.cant) || 0;
  const enChile = Number(inChile._sum.cant) || 0;

  return Number(purchase.cant) - enCajas - enChile;
}

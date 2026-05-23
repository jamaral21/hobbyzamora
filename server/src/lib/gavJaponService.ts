import { prisma } from '../index.js';
import { Decimal } from '@prisma/client/runtime/library';
import type { ShipmentsResponse } from '../types/shipments.js';

export interface GavJaponHistoryItem {
  mes: string;
  boletaId: string | null;
  estado: 'confirmada' | 'pendiente' | 'alertada';
  arriendo: number;
  app: number;
  total: number;
  totalCLP: number;
  tc: Decimal | null;
  diasParaAlerta: number; // -1 si ya pasó, null si no aplica
}

export interface GavJaponHistoryResponse {
  historial: GavJaponHistoryItem[];
  alertaActual: string | null;
}

export interface GavJaponGenerateResponse {
  invoiceId: string;
  mes: string;
  arriendo: number;
  app: number;
  totalJPY: number;
  totalCLP: number;
  tc: Decimal;
  estado: string;
}

/**
 * Obtener historial de GAV Japón de los últimos 6 meses
 * Incluye alertas si no se generó boleta antes del día 3
 */
export async function getGavJaponHistorial(): Promise<ShipmentsResponse<GavJaponHistoryResponse>> {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    // Generar últimos 6 meses
    const meses: Array<{ mes: string; year: number; month: number }> = [];
    for (let i = 5; i >= 0; i--) {
      let año = currentYear;
      let mes = currentMonth - i;
      if (mes < 0) {
        año--;
        mes += 12;
      }
      const mesStr = new Date(año, mes, 1).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      });
      const mesNormalizado = mesStr.charAt(0).toUpperCase() + mesStr.slice(1).replace('de ', '');
      meses.push({ mes: mesNormalizado, year: año, month: mes + 1 });
    }

    // Buscar GAV months
    const gavMonths = await prisma.shipmentsGavMonthControl.findMany();
    const config = await prisma.shipmentsConfig.findFirst();

    if (!config) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Configuración del sistema no encontrada',
        },
      };
    }

    const arriendo = Number(config.arrBodegaJP);
    const app = Number(config.appBeyblade);

    const historial: GavJaponHistoryItem[] = [];
    let alertaActual: string | null = null;

    for (const { mes, year, month } of meses) {
      const gavMonth = gavMonths.find((g: any) => {
        const [mesName, yearStr] = g.mes.split(' ');
        return (
          g.mes.toLowerCase().includes(mesName.toLowerCase()) &&
          parseInt(yearStr) === year
        );
      });

      let estado: 'confirmada' | 'pendiente' | 'alertada' = 'pendiente';
      let boletaId: string | null = null;
      let diasParaAlerta: number | null = null;
      let tc: Decimal | null = null;

      if (gavMonth && gavMonth.boletaId) {
        estado = 'confirmada';
        boletaId = gavMonth.boletaId;

        // Obtener TC de la boleta
        const boleta = await prisma.shipmentsInvoice.findUnique({
          where: { invoiceId: boletaId },
        });
        if (boleta) {
          tc = boleta.tc;
        }
      }

      // Verificar alerta (si es mes actual y está pendiente)
      if (year === currentYear && month === currentMonth + 1) {
        diasParaAlerta = 3 - today.getDate();
        if (estado === 'pendiente' && diasParaAlerta < 0) {
          estado = 'alertada';
          alertaActual = `GAV de ${mes} no generada (vencida desde hace ${Math.abs(diasParaAlerta)} días)`;
        } else if (estado === 'pendiente' && diasParaAlerta >= 0) {
          alertaActual =
            diasParaAlerta === 0
              ? `Último día para generar GAV de ${mes}`
              : `Generar GAV de ${mes} antes del día 3`;
        }
      }

      const totalJPY = arriendo + app;
      const totalCLP = tc ? Number(new Decimal(totalJPY).mul(tc)) : 0;

      historial.push({
        mes,
        boletaId,
        estado,
        arriendo,
        app,
        total: totalJPY,
        totalCLP,
        tc: tc || null,
        diasParaAlerta:
          year === currentYear && month === currentMonth + 1 ? (diasParaAlerta ?? -1) : -1,
      });
    }

    return {
      data: {
        historial,
        alertaActual,
      },
    };
  } catch (error) {
    console.error('[gavJaponService] getGavJaponHistorial error:', error);
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener historial de GAV Japón',
        details: error instanceof Error ? [{ field: 'general', message: error.message }] : [],
      },
    };
  }
}

/**
 * Generar boleta GAV del mes actual
 * Reglas:
 * - Solo una boleta por mes
 * - Crea compras especiales con tipo 'Gasto Fijo'
 * - Genera boleta con ID formato: BOL-YYYY-GAV-NNN
 */
export async function generateGavJaponBoleta(
  tcArriendoJpy: Decimal,
  targetYear?: number,
  targetMonth?: number
): Promise<ShipmentsResponse<GavJaponGenerateResponse>> {
  try {
    const now = new Date();
    const year = targetYear && Number.isInteger(targetYear) ? targetYear : now.getFullYear();
    const month = targetMonth && Number.isInteger(targetMonth) ? targetMonth : now.getMonth() + 1;

    if (month < 1 || month > 12) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mes inválido. Debe estar entre 1 y 12',
          details: [{ field: 'month', message: 'month debe ser entre 1 y 12' }],
        },
      };
    }

    const targetDate = new Date(year, month - 1, 1);
    const mesNombre = targetDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    const mesNormalizado = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1).replace('de ', '');

    // Verificar que no exista boleta para este mes
    const existingGavMonth = await prisma.shipmentsGavMonthControl.findUnique({
      where: { mes: mesNormalizado },
    });

    if (existingGavMonth && existingGavMonth.boletaId) {
      return {
        error: {
          code: 'CONFLICT',
          message: `Ya existe boleta GAV para ${mesNormalizado}: ${existingGavMonth.boletaId}`,
        },
      };
    }

    const config = await prisma.shipmentsConfig.findFirst();
    if (!config) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Configuración del sistema no encontrada',
        },
      };
    }

    const arriendo = Number(config.arrBodegaJP);
    const app = Number(config.appBeyblade);
    const comisionPct = Number(config.comisionPct);

    // Generar siguiente ID de boleta GAV
    const lastBoleta = await prisma.shipmentsInvoice.findMany({
      where: {
        invoiceId: {
          contains: `BOL-${year}-GAV`,
        },
      },
      orderBy: {
        invoiceId: 'desc',
      },
      take: 1,
    });

    let nextNumber = 1;
    if (lastBoleta.length > 0) {
      const lastId = lastBoleta[0].invoiceId;
      const match = lastId.match(/BOL-\d+-GAV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const boletaId = `BOL-${year}-GAV-${String(nextNumber).padStart(3, '0')}`;

    // Crear transacción: compras + boleta + control
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Crear compra para arriendo
      const arrSku = `GAV-${year}-${String(month).padStart(2, '0')}-ARR`;
      const appSku = `GAV-${year}-${String(month).padStart(2, '0')}-APP`;

      const arrendoCompra = await tx.shipmentsPurchase.upsert({
        where: { sku: arrSku },
        create: {
          sku: arrSku,
          fecha: targetDate,
          tipo: 'Gasto Fijo',
          nombre: 'Arriendo Bodega Japón',
          tarjeta: 'N/A',
          precioU: new Decimal(arriendo),
          cant: 1,
          total: new Decimal(arriendo),
          estado: 'por_pagar',
          bodega: 'japon',
          tc: tcArriendoJpy,
        },
        update: {
          fecha: targetDate,
          tipo: 'Gasto Fijo',
          nombre: 'Arriendo Bodega Japón',
          tarjeta: 'N/A',
          precioU: new Decimal(arriendo),
          cant: 1,
          total: new Decimal(arriendo),
          estado: 'por_pagar',
          bodega: 'japon',
          tc: tcArriendoJpy,
        },
      });

      // 2. Crear compra para app
      const appCompra = await tx.shipmentsPurchase.upsert({
        where: { sku: appSku },
        create: {
          sku: appSku,
          fecha: targetDate,
          tipo: 'Gasto Fijo',
          nombre: 'App Beyblade',
          tarjeta: 'N/A',
          precioU: new Decimal(app),
          cant: 1,
          total: new Decimal(app),
          estado: 'por_pagar',
          bodega: 'japon',
          tc: tcArriendoJpy,
        },
        update: {
          fecha: targetDate,
          tipo: 'Gasto Fijo',
          nombre: 'App Beyblade',
          tarjeta: 'N/A',
          precioU: new Decimal(app),
          cant: 1,
          total: new Decimal(app),
          estado: 'por_pagar',
          bodega: 'japon',
          tc: tcArriendoJpy,
        },
      });

      // 3. Calcular totales
      const subtotalJPY = new Decimal(arriendo + app);
      const totalJPY = subtotalJPY.mul(new Decimal(1 + comisionPct / 100));
      const totalCLP = totalJPY.mul(tcArriendoJpy);

      // 4. Crear boleta
      const boleta = await tx.shipmentsInvoice.create({
        data: {
          invoiceId: boletaId,
          fecha: targetDate,
          subtotalJPY,
          comision: new Decimal(comisionPct),
          totalJPY,
          tc: tcArriendoJpy,
          totalCLP,
          estado: 'sin_pagar',
        },
      });

      // 5. Crear items de boleta
      await tx.shipmentsInvoiceItem.createMany({
        data: [
          {
            invoiceId: boleta.id,
            fecha: targetDate,
            tipo: 'Gasto Fijo',
            nombre: 'Arriendo Bodega Japón',
            precioU: new Decimal(arriendo),
            cant: 1,
            comPct: new Decimal(comisionPct),
            tc: tcArriendoJpy,
          },
          {
            invoiceId: boleta.id,
            fecha: targetDate,
            tipo: 'Gasto Fijo',
            nombre: 'App Beyblade',
            precioU: new Decimal(app),
            cant: 1,
            comPct: new Decimal(comisionPct),
            tc: tcArriendoJpy,
          },
        ],
      });

      // 6. Crear control de mes (link a compra de arriendo)
      await tx.shipmentsGavMonthControl.upsert({
        where: { mes: mesNormalizado },
        create: {
          mes: mesNormalizado,
          boletaId: boletaId,
          compraId: arrendoCompra.id,
        },
        update: {
          boletaId: boletaId,
          compraId: arrendoCompra.id,
        },
      });

      return {
        invoiceId: boletaId,
        mes: mesNormalizado,
        arriendo,
        app,
        totalJPY: Number(totalJPY),
        totalCLP: Number(totalCLP),
        tc: tcArriendoJpy,
        estado: 'sin_pagar',
      };
    });

    return { data: result };
  } catch (error) {
    console.error('[gavJaponService] generateGavJaponBoleta error:', error);
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al generar boleta GAV Japón',
        details: error instanceof Error ? [{ field: 'general', message: error.message }] : [],
      },
    };
  }
}

import { Request } from 'express';

/**
 * Extensión de Request para rutas de Shipments
 * Incluye el usuario autenticado y su rol validado
 */
export interface ShipmentsRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'japon' | 'chile' | 'contador';
  };
}

/**
 * Tipos de roles disponibles en el ERP
 */
export type ShipmentsRole = 'admin' | 'japon' | 'chile' | 'contador';

/**
 * Estados de compra
 */
export type PaymentState = 'por_pagar' | 'esp_pago' | 'pagado';

/**
 * Ubicaciones de bodega
 */
export type BodegaLocation = 'japon' | 'transito' | 'chile';

/**
 * Estados de caja
 */
export type BoxState = 'transito' | 'llegada' | 'costeada';

/**
 * Errores estándar del API Shipments
 */
export interface ShipmentsErrorResponse {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

/**
 * Respuesta estándar de Shipments
 */
export interface ShipmentsResponse<T = any> {
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  error?: ShipmentsErrorResponse['error'];
}

/**
 * Modelos de datos (Prisma models mapeados a tipos)
 */
export interface Purchase {
  id: string;
  sku: string;
  fecha: Date;
  tipo: string;
  nombre: string;
  ean?: string;
  tarjeta: string;
  precioU: number;
  cant: number;
  total: number;
  estado: PaymentState;
  bodega: BodegaLocation;
  tc?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  fecha: Date;
  subtotalJPY: number;
  comision: number;
  totalJPY: number;
  tc: number;
  totalCLP: number;
  estado: 'sin_pagar' | 'pagado';
  createdAt: Date;
  updatedAt: Date;
}

export interface Box {
  id: string;
  boxId: string;
  fecha: Date;
  estado: BoxState;
  fleJpy?: number;
  moHoras?: number;
  moTarifa?: number;
  matJpy?: number;
  tcEnvio?: number;
  pesoTotal?: number;
  internacionArancel?: number;
  internacionIva?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChileStock {
  id: string;
  sku: string;
  nombre: string;
  ean?: string;
  cajaId?: string;
  cant: number;
  costoUnit: number;
  precioVenta?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  saleId: string;
  fecha: Date;
  producto: string;
  ean?: string;
  cant: number;
  precioVenta: number;
  costo: number;
  total: number;
  canal: 'Instagram' | 'TikTok' | 'Mercado Libre' | 'Web' | 'Local';
  createdAt: Date;
}

export interface GavChile {
  id: string;
  concepto: string;
  monto: number;
  adjunto: boolean;
  estado: 'pendiente' | 'pagado';
  docTipo?: 'factura' | 'boleta';
  ivaCredito: boolean;
  fechaPago?: Date;
  createdAt: Date;
  updatedAt: Date;
}

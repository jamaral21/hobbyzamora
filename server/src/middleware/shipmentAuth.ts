import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

/**
 * Matriz de permisos: Define qué rol puede acceder a qué módulo/ruta
 * Formato: { 'metodo:ruta': ['roles permitidos'] }
 */
const SHIPMENTS_PERMISSIONS: Record<string, string[]> = {
  // ==================== MÓDULOS JAPÓN ====================
  'GET:/api/shipments/compras': ['admin', 'japon'],
  'POST:/api/shipments/compras': ['admin', 'japon'],
  'PUT:/api/shipments/compras/:id': ['admin', 'japon'],
  'DELETE:/api/shipments/compras/:id': ['admin', 'japon'],

  'GET:/api/shipments/bodega-japon': ['admin', 'japon', 'chile'],
  
  'GET:/api/shipments/boletas': ['admin', 'japon'],
  'POST:/api/shipments/boletas': ['admin', 'japon'],
  'GET:/api/shipments/boletas/:id': ['admin', 'japon'],
  'DELETE:/api/shipments/boletas/:id': ['admin', 'japon'],

  'POST:/api/shipments/pagos/:boletaId/confirmar': ['admin', 'japon'],

  'GET:/api/shipments/gav-japon/historial': ['admin', 'japon', 'contador'],
  'POST:/api/shipments/gav-japon/generar': ['admin', 'japon'],

  // ==================== MÓDULOS ENVÍOS ====================
  'GET:/api/shipments/cajas': ['admin', 'japon', 'chile'],
  'POST:/api/shipments/cajas': ['admin', 'japon', 'chile'],
  'PUT:/api/shipments/cajas/:id': ['admin', 'japon', 'chile'],
  'DELETE:/api/shipments/cajas/:id': ['admin', 'japon', 'chile'],

  'GET:/api/shipments/bodega-transito': ['admin', 'chile'],

  'GET:/api/shipments/compras-web': ['admin', 'japon', 'chile'],
  'POST:/api/shipments/compras-web': ['admin', 'japon', 'chile'],
  'PUT:/api/shipments/compras-web/:id': ['admin', 'japon', 'chile'],
  'DELETE:/api/shipments/compras-web/:id': ['admin', 'japon', 'chile'],

  'GET:/api/shipments/internacion': ['admin', 'chile'],
  'PUT:/api/shipments/internacion/:cajaId': ['admin', 'chile'],

  'GET:/api/shipments/costeo/cajas-disponibles': ['admin', 'chile'],
  'POST:/api/shipments/costeo/:cajaId/confirmar': ['admin', 'chile'],

  // ==================== MÓDULOS CHILE ====================
  'GET:/api/shipments/bodega-chile': ['admin', 'chile'],
  'PUT:/api/shipments/bodega-chile/:id': ['admin', 'chile'],

  'GET:/api/shipments/ventas': ['admin', 'chile'],
  'POST:/api/shipments/ventas': ['admin', 'chile'],
  'DELETE:/api/shipments/ventas/:id': ['admin', 'chile'],

  'GET:/api/shipments/compras-locales': ['admin', 'chile'],
  'POST:/api/shipments/compras-locales': ['admin', 'chile'],
  'GET:/api/shipments/compras-chile': ['admin', 'chile'],
  'POST:/api/shipments/compras-chile': ['admin', 'chile'],
  'PUT:/api/shipments/compras-chile/:id/estado': ['admin', 'chile'],

  'GET:/api/shipments/gav-chile': ['admin', 'chile', 'contador'],
  'POST:/api/shipments/gav-chile': ['admin', 'chile'],
  'PUT:/api/shipments/gav-chile/:id': ['admin', 'chile'],
  'PUT:/api/shipments/gav-chile/:id/documentos': ['admin', 'chile'],
  'DELETE:/api/shipments/gav-chile/:id/documentos/:id': ['admin', 'chile'],
  'PUT:/api/shipments/gav-chile/:id/confirmar': ['admin', 'chile'],

  // ==================== MÓDULOS FINANZAS ====================
  'GET:/api/shipments/dashboard': ['admin', 'chile', 'contador'],
  'GET:/api/shipments/eerr': ['admin', 'contador'],
  'GET:/api/shipments/balance': ['admin', 'contador'],
  'GET:/api/shipments/flujo': ['admin', 'contador'],
  'GET:/api/shipments/config': ['admin'],
  'PUT:/api/shipments/config': ['admin'],
};

/**
 * Convierte una ruta con parámetros a un patrón
 * Ejemplo: /api/shipments/cajas/123 → /api/shipments/cajas/:id
 */
function routeToPattern(method: string, path: string): string {
  // Reemplazar IDs UUID (8-4-4-4-12 hex) y números con :id
  const pattern = path.replace(/\/[a-f0-9\-]{36}(?=\/|$)/gi, '/:id')
                        .replace(/\/[a-f0-9\-]{36}(?=\/|$)/gi, '/:id')
                        .replace(/\/\d+(?=\/|$)/g, '/:id');
  
  return `${method}:${pattern}`;
}

/**
 * Middleware de autorización por rol para rutas del ERP
 * Verifica si el usuario tiene acceso a la ruta basado en su rol
 */
export const requireShipmentsAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Validar que el usuario esté autenticado
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token ausente o expirado',
      },
    });
  }

  const method = req.method;
  const path = req.path;

  // Buscar en la matriz de permisos
  let allowedRoles = SHIPMENTS_PERMISSIONS[`${method}:${path}`];

  // Si no hay coincidencia exacta, intentar con patrones
  if (!allowedRoles) {
    const pattern = routeToPattern(method, path);
    allowedRoles = SHIPMENTS_PERMISSIONS[pattern];
  }

  // Si no se encuentra la ruta, denegar acceso por default
  if (!allowedRoles) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Acceso denegado a este módulo',
      },
    });
  }

  // Verificar si el rol del usuario está en la lista de roles permitidos
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `El rol "${req.user.role}" no tiene acceso a este módulo`,
      },
    });
  }

  // Permitir acceso
  next();
};

/**
 * Helper para verificar múltiples roles
 * Uso: requireShipmentsRole('admin', 'japon')
 */
export const requireShipmentsRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token ausente o expirado',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Se requiere uno de estos roles: ${roles.join(', ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Resumen de permisos por rol (para documentación/debugging)
 */
export const SHIPMENTS_ROLES_SUMMARY: Record<string, { description: string; modules: string[] }> = {
  admin: {
    description: 'Acceso completo a todos los módulos',
    modules: [
      'Compras Japón',
      'Bodega Japón',
      'Boletas',
      'Pagos',
      'GAV Japón',
      'Cajas/Envíos',
      'Bodega Tránsito',
      'Compras Web',
      'Internación',
      'Costeo de Cajas',
      'Bodega Chile',
      'Ventas',
      'Compras Locales',
      'GAV Chile',
      'Dashboard',
      'Estado de Resultados',
      'Balance',
      'Flujo de Caja',
    ],
  },
  japon: {
    description: 'Gestión de compras y logística desde Japón',
    modules: [
      'Compras Japón',
      'Bodega Japón',
      'Boletas',
      'Pagos',
      'GAV Japón',
      'Cajas/Envíos',
      'Compras Web',
    ],
  },
  chile: {
    description: 'Gestión de recepción, costeo y venta en Chile',
    modules: [
      'Dashboard',
      'Bodega Japón (lectura)',
      'Bodega Tránsito',
      'Bodega Chile',
      'Cajas/Envíos',
      'Compras Web',
      'Internación',
      'Costeo de Cajas',
      'Ventas',
      'Compras Locales',
      'GAV Chile',
    ],
  },
  contador: {
    description: 'Consulta de estados financieros',
    modules: [
      'Dashboard',
      'Estado de Resultados',
      'Balance',
      'Flujo de Caja',
      'GAV Chile (lectura)',
      'GAV Japón (lectura)',
    ],
  },
};

/**
 * Helper para obtener módulos accesibles por un rol
 */
export function getAccessibleModules(role: string): string[] {
  const summary = SHIPMENTS_ROLES_SUMMARY as any;
  return summary[role]?.modules || [];
}

/**
 * Helper para verificar si un rol tiene acceso a una ruta específica
 */
export function canAccess(role: string, method: string, path: string): boolean {
  const pattern = routeToPattern(method, path);
  const allowedRoles = SHIPMENTS_PERMISSIONS[`${method}:${path}`] || 
                       SHIPMENTS_PERMISSIONS[pattern];
  
  return allowedRoles ? allowedRoles.includes(role) : false;
}

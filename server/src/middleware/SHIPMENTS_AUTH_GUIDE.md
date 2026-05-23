# Middleware de Autorización por Rol - Shipments ERP

## Overview

El middleware `shipmentAuth.ts` verifica automáticamente si un usuario tiene permiso para acceder a cada ruta basado en su rol. Todos los permisos están centralizados en una sola matriz.

## Roles y Acceso

### Admin
- **Acceso**: Todos los 19 módulos
- **Uso**: Superusuario, puede hacer cualquier cosa

### Japón
- **Acceso**: Compras, Boletas, Pagos, GAV Japón, Cajas
- **Limitación**: No puede ver módulos de Chile ni finanzas

**Rutas accesibles:**
```
GET    /api/shipments/compras
POST   /api/shipments/compras
PUT    /api/shipments/compras/:id
DELETE /api/shipments/compras/:id

GET    /api/shipments/bodega-japon
GET    /api/shipments/boletas
POST   /api/shipments/boletas
GET    /api/shipments/boletas/:id
DELETE /api/shipments/boletas/:id

POST   /api/shipments/pagos/:boletaId/confirmar
GET    /api/shipments/gav-japon/historial
POST   /api/shipments/gav-japon/generar

GET    /api/shipments/cajas
POST   /api/shipments/cajas
PUT    /api/shipments/cajas/:id
DELETE /api/shipments/cajas/:id
```

### Chile
- **Acceso**: Dashboard, Bodegas, Ventas, Cajas, Compras Web, Internación, Costeo, Compras Locales
- **Limitación**: No puede registrar compras de Japón ni ver EE.RR.

**Rutas accesibles:**
```
GET /api/shipments/dashboard
GET /api/shipments/bodega-japon          (lectura solamente)
GET /api/shipments/bodega-transito
GET /api/shipments/bodega-chile
POST /api/shipments/bodega-chile/:id     (editar precio venta)

GET    /api/shipments/cajas
POST   /api/shipments/cajas
PUT    /api/shipments/cajas/:id
DELETE /api/shipments/cajas/:id

GET    /api/shipments/compras-web
POST   /api/shipments/compras-web
PUT    /api/shipments/compras-web/:id
DELETE /api/shipments/compras-web/:id

GET    /api/shipments/internacion
PUT    /api/shipments/internacion/:cajaId

GET    /api/shipments/costeo/cajas-disponibles
POST   /api/shipments/costeo/:cajaId/confirmar

GET    /api/shipments/ventas
POST   /api/shipments/ventas
DELETE /api/shipments/ventas/:id

GET    /api/shipments/compras-locales
POST   /api/shipments/compras-locales

GET    /api/shipments/gav-chile
POST   /api/shipments/gav-chile
PUT    /api/shipments/gav-chile/:id
```

### Contador
- **Acceso**: Dashboard, EE.RR., Balance, Flujo de Caja, GAV Chile/Japón (lectura)
- **Limitación**: Solo lectura de finanzas, sin poder modificar nada

**Rutas accesibles:**
```
GET /api/shipments/dashboard
GET /api/shipments/eerr
GET /api/shipments/balance
GET /api/shipments/flujo
GET /api/shipments/gav-chile
GET /api/shipments/gav-japon/historial
```

## Cómo Funciona

### 1. Usuario realiza request
```typescript
// Request headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Middleware `authenticate`
- Verifica que exista un token válido
- Decodifica el JWT
- Busca el usuario en BD
- Asigna `req.user` con id, email, role

### 3. Middleware `requireShipmentsAccess`
```typescript
const pattern = routeToPattern(method, path); // GET:/api/shipments/cajas/:id
const allowedRoles = SHIPMENTS_PERMISSIONS[pattern]; // ['admin', 'japon', 'chile']

if (!allowedRoles.includes(req.user.role)) {
  return res.status(403).json({
    error: { code: 'FORBIDDEN', message: '...' }
  });
}
```

### 4. Permitir o denegar
- Si el rol está en `allowedRoles` → `next()`
- Si no → Respuesta 403

## Formato de Respuesta de Error

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "El rol \"japon\" no tiene acceso a este módulo"
  }
}
```

| Código | HTTP | Significado |
|--------|------|-------------|
| `UNAUTHORIZED` | 401 | Token ausente, expirado o inválido |
| `FORBIDDEN` | 403 | Rol sin acceso a la ruta |
| `VALIDATION_ERROR` | 400 | Datos de entrada inválidos |
| `NOT_FOUND` | 404 | Recurso no existe |
| `CONFLICT` | 409 | Duplicado (ej: SKU) |
| `INTERNAL_ERROR` | 500 | Error del servidor |

## Ejemplos de Uso

### Caso 1: Usuario Japón intenta acceder a Bodega Chile

```
GET /api/shipments/bodega-chile
Authorization: Bearer <token_japon>
```

**Respuesta 403:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "El rol \"japon\" no tiene acceso a este módulo"
  }
}
```

### Caso 2: Usuario Chile registra una venta

```
POST /api/shipments/ventas
Authorization: Bearer <token_chile>
Content-Type: application/json

{
  "fecha": "2026-04-24",
  "producto": "Pokémon TCG Booster",
  "cant": 1,
  "precioVenta": 15000,
  "costo": 8500,
  "canal": "Instagram"
}
```

**Respuesta 200:**
```json
{
  "data": {
    "id": "uuid...",
    "saleId": "VENTA-001",
    "fecha": "2026-04-24",
    ...
  }
}
```

### Caso 3: Contador intenta crear compra

```
POST /api/shipments/compras
Authorization: Bearer <token_contador>
```

**Respuesta 403:**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "El rol \"contador\" no tiene acceso a este módulo"
  }
}
```

## Registro de Permisos (Debug)

Para ver qué módulos puede acceder cada rol:

```typescript
import { SHIPMENTS_ROLES_SUMMARY, getAccessibleModules } from '../middleware/shipmentAuth.js';

console.log(SHIPMENTS_ROLES_SUMMARY.japon.modules);
// Output: ['Compras Japón', 'Bodega Japón', 'Boletas', ...]

console.log(getAccessibleModules('chile'));
// Output: ['Dashboard', 'Bodega Japón (lectura)', ...]
```

## Verificar Acceso Programáticamente

```typescript
import { canAccess } from '../middleware/shipmentAuth.js';

// ¿Puede Chile registrar ventas?
canAccess('chile', 'POST', '/api/shipments/ventas'); // true

// ¿Puede Japón ver Estado de Resultados?
canAccess('japon', 'GET', '/api/shipments/eerr'); // false

// ¿Puede Admin crear compras?
canAccess('admin', 'POST', '/api/shipments/compras'); // true
```

## Integración en Rutas

```typescript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireShipmentsAccess } from '../middleware/shipmentAuth.js';
import { ShipmentsRequest } from '../types/shipments.js';

const router = express.Router();

// Aplicar middlewares globales
router.use(authenticate);
router.use(requireShipmentsAccess);

// Ahora todas las rutas tienen autorización automática
router.post('/compras', (req: ShipmentsRequest, res) => {
  // req.user.role ya fue verificado
  // Si el usuario no tiene acceso, nunca llega aquí

  const { nombre, precioU, cant } = req.body;

  // Registrar compra...
  res.json({ data: { sku: 'JP-0001', nombre, precioU, cant } });
});

export default router;
```

## Agregar Nueva Ruta

1. Agregar entrada a `SHIPMENTS_PERMISSIONS` en `shipmentAuth.ts`:

```typescript
'POST:/api/shipments/nueva-ruta': ['admin', 'japon'],
```

2. Crear el handler en la ruta:

```typescript
router.post('/nueva-ruta', (req: ShipmentsRequest, res) => {
  // Ya está autorizado por el middleware
  res.json({ message: 'OK' });
});
```

3. Agregar a `SHIPMENTS_ROLES_SUMMARY` si es un módulo nuevo:

```typescript
japon: {
  modules: [
    // ... otros módulos
    'Nueva Ruta',
  ],
}
```

## Flujo Completo de una Solicitud

```
Usuario hace request con token
    ↓
[authenticate] ← Valida token y carga req.user
    ↓
[requireShipmentsAccess] ← Verifica matriz de permisos
    ↓
¿Tiene rol autorizado?
    ├─ SÍ → Handler de ruta
    │        ↓
    │      Procesar lógica
    │        ↓
    │      Respuesta 200/201
    │
    └─ NO → Respuesta 403 FORBIDDEN
```

## Testing

Para testear el middleware:

```bash
# Test sin token
curl -X GET http://localhost:3001/api/shipments/compras

# Test con token pero sin acceso
curl -X GET http://localhost:3001/api/shipments/bodega-chile \
  -H "Authorization: Bearer <token_japon>"

# Test OK
curl -X GET http://localhost:3001/api/shipments/bodega-japon \
  -H "Authorization: Bearer <token_japon>"
```

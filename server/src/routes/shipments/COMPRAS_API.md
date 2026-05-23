# CRUD de Registro de Compras - Endpoints

## Overview

El módulo de Registro de Compras permite gestionar todas las compras realizadas en Japón. Cada compra recibe automáticamente un SKU único correlativo (`JP-0001`, `JP-0002`, etc.) que la identifica a lo largo de todo el ciclo.

## Endpoints

### 1. Listar Compras

**Request:**
```http
GET /api/shipments/compras?estado=por_pagar&bodega=japon
Authorization: Bearer <token>
```

**Query Parameters:**
- `estado` (opcional): `'por_pagar' | 'esp_pago' | 'pagado'`
- `bodega` (opcional): `'japon' | 'transito' | 'chile'`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid-123",
      "sku": "JP-0001",
      "fecha": "2026-04-24T00:00:00.000Z",
      "tipo": "Producto",
      "nombre": "Pokémon TCG Booster Box SV10",
      "ean": "4521329123456",
      "tarjeta": "PayPay",
      "precioU": 5000,
      "cant": 10,
      "total": 50000,
      "estado": "por_pagar",
      "bodega": "japon",
      "tc": 8.5,
      "createdAt": "2026-04-24T01:30:00.000Z",
      "updatedAt": "2026-04-24T01:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

---

### 2. Obtener Compra por ID

**Request:**
```http
GET /api/shipments/compras/uuid-123
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid-123",
    "sku": "JP-0001",
    "fecha": "2026-04-24T00:00:00.000Z",
    "tipo": "Producto",
    "nombre": "Pokémon TCG Booster Box SV10",
    "ean": "4521329123456",
    "tarjeta": "PayPay",
    "precioU": 5000,
    "cant": 10,
    "total": 50000,
    "estado": "por_pagar",
    "bodega": "japon",
    "tc": 8.5,
    "createdAt": "2026-04-24T01:30:00.000Z",
    "updatedAt": "2026-04-24T01:30:00.000Z"
  }
}
```

**Response 404:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Compra no encontrada"
  }
}
```

---

### 3. Crear Compra (Auto-asigna SKU)

**Request:**
```http
POST /api/shipments/compras
Authorization: Bearer <token>
Content-Type: application/json

{
  "fecha": "2026-04-24",
  "tipo": "Producto",
  "nombre": "Pokémon TCG Booster Box SV10",
  "ean": "4521329123456",
  "tarjeta": "PayPay",
  "precioU": 5000,
  "cant": 10,
  "tc": 8.5
}
```

**Body Parameters:**
- `fecha` (requerido): Formato `YYYY-MM-DD`
- `tipo` (requerido): Tipo de compra (ej: `'Producto'`, `'Arriendo/App'`)
- `nombre` (requerido): Nombre del producto (no puede estar vacío)
- `ean` (opcional): Código EAN del producto
- `tarjeta` (requerido): Método de pago usado
- `precioU` (requerido): Precio unitario en ¥ (debe ser > 0)
- `cant` (requerido): Cantidad (entero > 0)
- `tc` (opcional): Tipo de cambio ¥→CLP

**Validaciones:**
- ✅ `nombre` no puede estar vacío
- ✅ `precioU` > 0
- ✅ `cant` debe ser entero > 0
- ✅ `tarjeta` es requerido
- ✅ `fecha` debe ser válida

**Response 201:**
```json
{
  "data": {
    "id": "uuid-123",
    "sku": "JP-0001",
    "fecha": "2026-04-24T00:00:00.000Z",
    "tipo": "Producto",
    "nombre": "Pokémon TCG Booster Box SV10",
    "ean": "4521329123456",
    "tarjeta": "PayPay",
    "precioU": 5000,
    "cant": 10,
    "total": 50000,
    "estado": "por_pagar",
    "bodega": "japon",
    "tc": 8.5,
    "createdAt": "2026-04-24T01:30:00.000Z",
    "updatedAt": "2026-04-24T01:30:00.000Z"
  }
}
```

**Response 400 (Validación fallida):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El nombre es requerido",
    "details": [
      {
        "field": "nombre",
        "message": "Campo requerido"
      }
    ]
  }
}
```

---

### 4. Editar Compra

**Request:**
```http
PUT /api/shipments/compras/uuid-123
Authorization: Bearer <token>
Content-Type: application/json

{
  "precioU": 5500,
  "estado": "esp_pago"
}
```

**Body Parameters:** Todos son opcionales
- `fecha`: Cambiar fecha
- `tipo`: Cambiar tipo
- `nombre`: Cambiar nombre
- `ean`: Cambiar EAN
- `tarjeta`: Cambiar método de pago
- `precioU`: Cambiar precio (debe ser > 0)
- `cant`: Cambiar cantidad (entero > 0)
- `estado`: Cambiar estado de pago
- `bodega`: Cambiar ubicación
- `tc`: Cambiar tipo de cambio

**Response 200:**
```json
{
  "data": {
    "id": "uuid-123",
    "sku": "JP-0001",
    "precioU": 5500,
    "total": 55000,
    "estado": "esp_pago",
    ...
  }
}
```

**Response 400 (Validación fallida):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El precio unitario debe ser mayor a 0",
    "details": [
      {
        "field": "precioU",
        "message": "Debe ser > 0"
      }
    ]
  }
}
```

**Response 404:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Compra no encontrada"
  }
}
```

---

### 5. Eliminar Compra

**Request:**
```http
DELETE /api/shipments/compras/uuid-123
Authorization: Bearer <token>
```

**Reglas:**
- ❌ No se puede eliminar si el SKU está en cajas activas (`transito` o `llegada`)
- ✅ Se puede eliminar si:
  - El SKU no está en ninguna caja
  - Las cajas que contienen el SKU están en estado `costeada`

**Response 204:** Sin contenido (eliminado exitosamente)

**Response 409 (Conflicto - SKU en cajas activas):**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "No se puede eliminar. El SKU JP-0001 está en las cajas activas: Caja_1_Abr26, Caja_2_Abr26"
  }
}
```

**Response 404:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Compra no encontrada"
  }
}
```

---

### 6. Calcular Disponibilidad de SKU

**Request:**
```http
GET /api/shipments/compras/disponible/JP-0001
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "sku": "JP-0001",
  "disponible": 5
}
```

**Cálculo:**
```
disponible = cant_total - en_cajas - en_chile

Ejemplo:
- Total comprado: 10 unidades
- En cajas activas (transito + llegada): 3 unidades
- En bodega Chile: 2 unidades
- Disponible: 10 - 3 - 2 = 5 unidades
```

---

## Autorización

**Roles con acceso a Compras:**
- ✅ `admin` - acceso completo
- ✅ `japon` - acceso completo
- ❌ `chile` - lectura de bodega-japon solamente
- ❌ `contador` - sin acceso

---

## Ejemplos de flujo real

### 1. Comprar 10 Pokémon boxes en Japón

```javascript
const response = await fetch('http://localhost:3001/api/shipments/compras', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGc...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fecha: '2026-04-24',
    tipo: 'Producto',
    nombre: 'Pokémon TCG Booster Box SV10',
    ean: '4521329123456',
    tarjeta: 'PayPay',
    precioU: 5000,
    cant: 10,
    tc: 8.5
  })
});

const result = await response.json();
console.log(result.data.sku); // JP-0001
```

### 2. Verficar disponibilidad antes de crear caja

```javascript
const response = await fetch(
  'http://localhost:3001/api/shipments/compras/disponible/JP-0001',
  {
    headers: { 'Authorization': 'Bearer eyJhbGc...' }
  }
);

const { disponible } = await response.json();
console.log(`Disponible: ${disponible}`); // Disponible: 10
```

### 3. Registrar pago de la compra

```javascript
const response = await fetch(
  'http://localhost:3001/api/shipments/compras/uuid-123',
  {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer eyJhbGc...',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      estado: 'pagado'
    })
  }
);

const result = await response.json();
console.log(result.data.estado); // pagado
```

### 4. Intentar eliminar compra en uso (error)

```javascript
// Supongamos que JP-0001 está en Caja_1 (transito)
const response = await fetch(
  'http://localhost:3001/api/shipments/compras/uuid-123',
  {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer eyJhbGc...' }
  }
);

// Response 409
const error = await response.json();
console.log(error.error.code); // CONFLICT
console.log(error.error.message);
// "No se puede eliminar. El SKU JP-0001 está en las cajas activas: Caja_1_Abr26"
```

---

## Testing con cURL

```bash
# Crear compra
curl -X POST http://localhost:3001/api/shipments/compras \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2026-04-24",
    "tipo": "Producto",
    "nombre": "Pokémon TCG Booster",
    "tarjeta": "PayPay",
    "precioU": 5000,
    "cant": 10
  }'

# Listar compras
curl -X GET "http://localhost:3001/api/shipments/compras?estado=por_pagar" \
  -H "Authorization: Bearer <token>"

# Obtener compra
curl -X GET http://localhost:3001/api/shipments/compras/uuid-123 \
  -H "Authorization: Bearer <token>"

# Editar compra
curl -X PUT http://localhost:3001/api/shipments/compras/uuid-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"estado": "pagado"}'

# Eliminar compra
curl -X DELETE http://localhost:3001/api/shipments/compras/uuid-123 \
  -H "Authorization: Bearer <token>"

# Ver disponibilidad
curl -X GET http://localhost:3001/api/shipments/compras/disponible/JP-0001 \
  -H "Authorization: Bearer <token>"
```

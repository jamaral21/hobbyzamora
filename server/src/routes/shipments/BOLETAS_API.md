# Boletas (CRUD) - Endpoints

## Overview

**Boletas** son documentos que registran la obligación de pago con proveedores en Japón. Cada boleta agrupa varios productos con una comisión aplicada.

Cada boleta recibe un ID único correlativo: `BOL-2026-001`, `BOL-2026-002`, etc.

### Fórmulas de Cálculo

```
subtotalJPY = Σ(precioU × cant) para cada producto

totalJPY = subtotalJPY × (1 + comisionPct/100)

totalCLP = totalJPY / tc
```

**Ejemplo:**
```
Productos seleccionados:
  - Producto A: 5000 ¥ × 2 = 10000 ¥
  - Producto B: 3000 ¥ × 3 = 9000 ¥
  
subtotalJPY = 10000 + 9000 = 19000 ¥
comisión = 13%
totalJPY = 19000 × (1 + 13/100) = 19000 × 1.13 = 21470 ¥
tc = 8.5
totalCLP = 21470 / 8.5 = 2526.47 CLP → 2526 CLP
```

---

## Endpoint 1: Listar Boletas

**Request:**
```http
GET /api/shipments/boletas
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid-123",
      "invoiceId": "BOL-2026-001",
      "fecha": "2026-04-24T01:30:00.000Z",
      "subtotalJPY": 19000,
      "comision": 13,
      "totalJPY": 21470,
      "tc": 8.5,
      "totalCLP": 2526,
      "estado": "sin_pagar",
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

## Endpoint 2: Obtener Boleta con Líneas

**Request:**
```http
GET /api/shipments/boletas/BOL-2026-001
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid-123",
    "invoiceId": "BOL-2026-001",
    "fecha": "2026-04-24T01:30:00.000Z",
    "subtotalJPY": 19000,
    "comision": 13,
    "totalJPY": 21470,
    "tc": 8.5,
    "totalCLP": 2526,
    "estado": "sin_pagar",
    "items": [
      {
        "id": "item-uuid-1",
        "invoiceId": "uuid-123",
        "fecha": "2026-04-24T01:30:00.000Z",
        "tipo": "Producto",
        "nombre": "Pokémon TCG Booster Box SV10",
        "ean": "4521329123456",
        "precioU": 5000,
        "cant": 2,
        "comPct": 13,
        "tc": 8.5,
        "createdAt": "2026-04-24T01:30:00.000Z"
      },
      {
        "id": "item-uuid-2",
        "invoiceId": "uuid-123",
        "fecha": "2026-04-24T01:30:00.000Z",
        "tipo": "Producto",
        "nombre": "Beyblade X Starter Set",
        "ean": "4549660558372",
        "precioU": 3000,
        "cant": 3,
        "comPct": 13,
        "tc": 8.5,
        "createdAt": "2026-04-24T01:30:00.000Z"
      }
    ],
    "createdAt": "2026-04-24T01:30:00.000Z",
    "updatedAt": "2026-04-24T01:30:00.000Z"
  }
}
```

---

## Endpoint 3: Crear Boleta

**Request:**
```http
POST /api/shipments/boletas
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "compraId": "uuid-compra-0001",
      "precioU": 5000,
      "cant": 2,
      "nombre": "Pokémon TCG Booster Box SV10",
      "ean": "4521329123456",
      "tipo": "Producto"
    },
    {
      "compraId": "uuid-compra-0002",
      "precioU": 3000,
      "cant": 3,
      "nombre": "Beyblade X Starter Set",
      "ean": "4549660558372",
      "tipo": "Producto"
    }
  ],
  "comisionPct": 13,
  "tc": 8.5
}
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `items` | Array | ✅ | Productos a incluir en la boleta |
| `items[].compraId` | string | ✅ | ID de la compra original |
| `items[].precioU` | number | ✅ | Precio unitario ¥ |
| `items[].cant` | number | ✅ | Cantidad |
| `items[].nombre` | string | ✅ | Nombre del producto |
| `items[].ean` | string | ❌ | Código EAN (opcional) |
| `items[].tipo` | string | ✅ | Tipo ('Producto', 'Arriendo/App', etc.) |
| `comisionPct` | number | ✅ | Comisión 0-100 |
| `tc` | number | ✅ | Tipo de cambio ¥→CLP (> 0) |

**Validaciones:**
- ✅ `items` no puede estar vacío
- ✅ `comisionPct` debe estar entre 0 y 100
- ✅ `tc` debe ser > 0

**Response 201:**
```json
{
  "data": {
    "id": "uuid-123",
    "invoiceId": "BOL-2026-001",
    "fecha": "2026-04-24T01:30:00.000Z",
    "subtotalJPY": 19000,
    "comision": 13,
    "totalJPY": 21470,
    "tc": 8.5,
    "totalCLP": 2526,
    "estado": "sin_pagar",
    "items": [
      {
        "id": "item-uuid-1",
        "invoiceId": "uuid-123",
        "precioU": 5000,
        "cant": 2,
        "nombre": "Pokémon TCG Booster Box SV10",
        ...
      }
    ],
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
    "message": "Debe incluir al menos un producto",
    "details": [
      {
        "field": "items",
        "message": "Array vacío"
      }
    ]
  }
}
```

---

## Endpoint 4: Eliminar Boleta

**Request:**
```http
DELETE /api/shipments/boletas/BOL-2026-001
Authorization: Bearer <token>
```

**Reglas:**
- ❌ No se puede eliminar si estado ≠ `sin_pagar`
- ✅ Se puede eliminar si estado = `sin_pagar` (no pagada)

**Response 204:** Sin contenido (eliminada exitosamente)

**Response 404 (No encontrada):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Boleta no encontrada"
  }
}
```

**Response 409 (Conflicto - ya pagada):**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "No se puede eliminar boleta en estado \"pagado\". Solo se pueden eliminar boletas sin pagar."
  }
}
```

---

## Autorización

**Roles con acceso:**
- ✅ `admin` — acceso completo
- ✅ `japon` — acceso completo
- ❌ `chile` — sin acceso
- ❌ `contador` — sin acceso

---

## Estados de Boleta

| Estado | Descripción |
|--------|-------------|
| `sin_pagar` | Boleta creada, pendiente de pago |
| `pagado` | Pago confirmado (se actualiza desde endpoint "Confirmar Pago") |

---

## Flujo Operacional

### 1. Operador selecciona productos y crea boleta

```bash
curl -X POST http://localhost:3001/api/shipments/boletas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "compraId": "uuid-0001",
        "precioU": 5000,
        "cant": 2,
        "nombre": "Pokémon TCG Booster Box SV10",
        "ean": "4521329123456",
        "tipo": "Producto"
      }
    ],
    "comisionPct": 13,
    "tc": 8.5
  }'
```

Respuesta: Se genera boleta `BOL-2026-001` con estado `sin_pagar`

### 2. Listar boletas pendientes

```bash
curl -X GET http://localhost:3001/api/shipments/boletas \
  -H "Authorization: Bearer <token>"
```

### 3. Ver detalle de boleta

```bash
curl -X GET http://localhost:3001/api/shipments/boletas/BOL-2026-001 \
  -H "Authorization: Bearer <token>"
```

Muestra todos los ítems incluidos.

### 4. Confirmar pago (en endpoint separado `/pagos/:boletaId/confirmar`)

Actualiza estado de boleta a `pagado` y también el estado de pago de las compras.

### 5. Intentar eliminar boleta pagada (error)

```bash
curl -X DELETE http://localhost:3001/api/shipments/boletas/BOL-2026-001 \
  -H "Authorization: Bearer <token>"
```

Si estado = `pagado`:
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "No se puede eliminar boleta en estado \"pagado\"..."
  }
}
```

---

## Cálculo Paso a Paso

### Ejemplo Completo

**Entrada:**
```json
{
  "items": [
    { "precioU": 5000, "cant": 2 },
    { "precioU": 3000, "cant": 3 }
  ],
  "comisionPct": 13,
  "tc": 8.5
}
```

**Proceso:**
```
1. subtotalJPY = (5000 × 2) + (3000 × 3)
   subtotalJPY = 10000 + 9000 = 19000 ¥

2. totalJPY = 19000 × (1 + 13/100)
   totalJPY = 19000 × 1.13 = 21470 ¥

3. totalCLP = 21470 / 8.5
   totalCLP = 2526.47 ≈ 2526 CLP
```

**Salida:**
```json
{
  "invoiceId": "BOL-2026-001",
  "subtotalJPY": 19000,
  "comision": 13,
  "totalJPY": 21470,
  "tc": 8.5,
  "totalCLP": 2526,
  "estado": "sin_pagar"
}
```

---

## Testing con cURL

```bash
# Crear boleta
curl -X POST http://localhost:3001/api/shipments/boletas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "compraId": "uuid-1", "precioU": 5000, "cant": 2, "nombre": "Pokémon TCG", "tipo": "Producto" }
    ],
    "comisionPct": 13,
    "tc": 8.5
  }'

# Listar boletas
curl -X GET http://localhost:3001/api/shipments/boletas \
  -H "Authorization: Bearer <token>"

# Ver boleta con líneas
curl -X GET http://localhost:3001/api/shipments/boletas/BOL-2026-001 \
  -H "Authorization: Bearer <token>"

# Eliminar boleta (solo si sin_pagar)
curl -X DELETE http://localhost:3001/api/shipments/boletas/BOL-2026-001 \
  -H "Authorization: Bearer <token>"
```

---

## Notas Importantes

- **ID Auto-Generado**: No se proporciona `invoiceId`, se genera automáticamente con formato `BOL-YYYY-NNN`
- **Año**: El ID de boleta incluye el año actual (ej: `BOL-2026-001` en 2026)
- **Correlativo**: Se incrementa independientemente por año
- **Comisión Aplicada**: Se aplica sobre el subtotal antes de convertir a CLP
- **Tipo de Cambio**: Se guarda con la boleta para auditoría
- **Líneas Inmutables**: Las líneas de la boleta no se editan después de crear. Para cambios, eliminar y recrear.

---

## Endpoint Futuro: Confirmar Pago

(Se implementará después)

```http
POST /api/shipments/pagos/:boletaId/confirmar
Content-Type: application/json

{
  "cuenta": "nombre de cuenta",
  "fecha": "2026-04-24",
  "montoCLP": 2526
}
```

Actualizará:
- `boleta.estado` → `pagado`
- `compra.estado` → `pagado` (para todas las compras de la boleta)

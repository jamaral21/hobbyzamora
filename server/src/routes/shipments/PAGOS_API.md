# Confirmar Pagos - Endpoint

## Overview

**Confirmar Pagos** es el endpoint que registra cuando se ha pagado una boleta. 

Al confirmar el pago:
1. La boleta cambia de estado `sin_pagar` → `pagado`
2. Todas las compras relacionadas también cambian a estado `pagado`
3. Esto es una **transacción atómica** — si algo falla, nada se actualiza

Esta información es crítica para:
- Estados financieros (saber qué deudas están pagadas)
- Dashboards operacionales (qué falta por pagar)
- Auditoría de transacciones

---

## Endpoint

**Request:**
```http
POST /api/shipments/pagos/:boletaId/confirmar
Authorization: Bearer <token>
Content-Type: application/json

{
  "cuenta": "Cuenta Corriente de Japón",
  "fecha": "2026-04-24",
  "montoCLP": 2526
}
```

**Path Parameters:**
- `boletaId` — ID de la boleta (ej: `BOL-2026-001`)

**Body Parameters (todas opcionales, solo para auditoría):**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cuenta` | string | Nombre de la cuenta bancaria usada |
| `fecha` | string | Fecha de la transferencia (YYYY-MM-DD) |
| `montoCLP` | number | Monto transferido en CLP |

---

## Respuesta Exitosa (200)

```json
{
  "data": {
    "invoice": {
      "id": "uuid-123",
      "invoiceId": "BOL-2026-001",
      "fecha": "2026-04-24T01:30:00.000Z",
      "subtotalJPY": 19000,
      "comision": 13,
      "totalJPY": 21470,
      "tc": 8.5,
      "totalCLP": 2526,
      "estado": "pagado",
      "createdAt": "2026-04-24T01:30:00.000Z",
      "updatedAt": "2026-04-24T01:35:00.000Z"
    },
    "purchasesUpdated": 2
  }
}
```

**Explicación:**
- `invoice`: Boleta actualizada con `estado: 'pagado'`
- `purchasesUpdated`: 2 compras fueron actualizadas a `pagado`

---

## Errores

### 404 - Boleta No Encontrada

**Request:**
```http
POST /api/shipments/pagos/BOL-9999-999/confirmar
```

**Response:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Boleta BOL-9999-999 no encontrada"
  }
}
```

---

### 409 - Boleta Ya Pagada

**Request:**
```http
POST /api/shipments/pagos/BOL-2026-001/confirmar
```

Si BOL-2026-001 ya tiene `estado: 'pagado'`:

**Response:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "La boleta BOL-2026-001 ya está en estado \"pagado\". Solo se pueden confirmar boletas sin pagar."
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

## Lógica Transaccional

```
INICIO TRANSACCIÓN
  ├─ 1. Buscar boleta por invoiceId
  ├─ 2. Verificar que estado = 'sin_pagar'
  ├─ 3. Actualizar boleta → estado = 'pagado'
  ├─ 4. Obtener todas las compras de la boleta
  │     (busca por coincidencia nombre + ean + precioU)
  ├─ 5. Actualizar todas las compras → estado = 'pagado'
  └─ Si algún paso falla: ROLLBACK (nada se actualiza)
FIN TRANSACCIÓN
```

---

## Impacto de la Confirmación

### Antes de Confirmar Pago

**Boleta:**
```json
{
  "invoiceId": "BOL-2026-001",
  "estado": "sin_pagar",
  "totalCLP": 2526
}
```

**Compras (2 compras relacionadas):**
```json
[
  { "sku": "JP-0001", "estado": "por_pagar" },
  { "sku": "JP-0002", "estado": "por_pagar" }
]
```

### Después de Confirmar Pago

**Boleta:**
```json
{
  "invoiceId": "BOL-2026-001",
  "estado": "pagado",
  "totalCLP": 2526
}
```

**Compras (2 compras relacionadas):**
```json
[
  { "sku": "JP-0001", "estado": "pagado" },
  { "sku": "JP-0002", "estado": "pagado" }
]
```

---

## Flujo Operacional Completo

```
1. Operador crea boleta
   POST /api/shipments/boletas
   → BOL-2026-001 creada, estado: sin_pagar

2. Boleta aparece en lista de pendientes
   GET /api/shipments/boletas
   → Filtrar estado: sin_pagar

3. Operador recibe confirmación de pago del proveedor
   
4. Operador confirma pago en el sistema
   POST /api/shipments/pagos/BOL-2026-001/confirmar
   → Boleta actualizada a pagado
   → Compras relacionadas actualizadas a pagado

5. Boleta desaparece de pendientes, aparece en pagadas
   GET /api/shipments/boletas
   → Ya no filtra con estado: sin_pagar

6. Estados financieros se actualizan
   GET /api/shipments/eerr
   → Deuda con proveedor se marca como pagada
```

---

## Ejemplos cURL

### Confirmar Pago Simple

```bash
curl -X POST http://localhost:3001/api/shipments/pagos/BOL-2026-001/confirmar \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Sin body** (ID de boleta en URL es suficiente)

### Confirmar con Datos de Auditoría

```bash
curl -X POST http://localhost:3001/api/shipments/pagos/BOL-2026-001/confirmar \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cuenta": "Cuenta Corriente BBVA",
    "fecha": "2026-04-24",
    "montoCLP": 2526
  }'
```

---

## Consideraciones

### Transacción Atómica

La confirmación es **atómica**:
- ✅ O se actualiza todo (boleta + compras)
- ❌ O no se actualiza nada

No hay estado intermedio donde boleta está pagada pero compras no.

### Búsqueda de Compras

Las compras se identifican por:
- Nombre del producto
- EAN (si existe)
- Precio unitario

Esto permite encontrar las compras incluso sin guardar un ID explícito de compra en la boleta.

### Reversión de Pago

**No hay endpoint para "desconfirmar" pago.** Si se confirma algo por error:
1. Un admin debe editar manualmente en BD
2. O se puede crear un endpoint "revertir pago" en el futuro

### Auditoría

Los datos opcionales (`cuenta`, `fecha`, `montoCLP`) son solo para referencia. El sistema actual no los guarda, pero se pueden extender el schema para hacerlo.

---

## Testing

### Caso 1: Confirmar Pago Normal

```bash
# 1. Crear boleta
BOL_ID=$(curl -s -X POST http://localhost:3001/api/shipments/boletas \
  -H "Authorization: Bearer <token>" \
  -d '{...}' | jq -r '.data.invoiceId')

# 2. Confirmar pago
curl -X POST http://localhost:3001/api/shipments/pagos/$BOL_ID/confirmar \
  -H "Authorization: Bearer <token>"

# 3. Verificar estado
curl -X GET http://localhost:3001/api/shipments/boletas/$BOL_ID \
  -H "Authorization: Bearer <token>" | jq '.data.estado'
# Output: "pagado"
```

### Caso 2: Intentar Confirmar Dos Veces

```bash
# Primera confirmación: SUCCESS
curl -X POST http://localhost:3001/api/shipments/pagos/BOL-2026-001/confirmar \
  -H "Authorization: Bearer <token>"
# Response 200

# Segunda confirmación: ERROR 409
curl -X POST http://localhost:3001/api/shipments/pagos/BOL-2026-001/confirmar \
  -H "Authorization: Bearer <token>"
# Response 409 CONFLICT
# Data: "La boleta BOL-2026-001 ya está en estado \"pagado\""
```

### Caso 3: Confirmar Boleta Inexistente

```bash
curl -X POST http://localhost:3001/api/shipments/pagos/BOL-9999-999/confirmar \
  -H "Authorization: Bearer <token>"
# Response 404 NOT_FOUND
```

---

## Futuras Mejoras

1. **Guardar datos de pago**: Extender schema para guardar `cuenta`, `fecha`, `montoCLP`
2. **Validar monto**: Verificar que `montoCLP` coincida con `totalCLP` de la boleta
3. **Revertir pago**: Crear endpoint para desconfirmar pagos si se cometió error
4. **Historial**: Mantener log de quién confirmó y cuándo
5. **Reconciliación**: Endpoint para cerrar múltiples boletas de una vez

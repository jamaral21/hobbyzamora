# Gastos Fijos Japón (GAV) - API

## Overview

**Gastos Fijos Japón (GAV)** registra y factura los gastos mensuales recurrentes de la bodega en Japón:
- Arriendo: ¥25.000/mes
- App Beyblade: ¥550/mes
- **Total**: ¥25.550/mes

La boleta GAV se genera una sola vez por mes y aparece en el estado de resultados. Si no se genera antes del día 3, el sistema muestra una alerta.

---

## Endpoints

### 1. GET /api/shipments/gav-japon/historial

**Descripción:** Obtener historial de GAV Japón de los últimos 6 meses con alertas de vencimiento

**Request:**
```http
GET /api/shipments/gav-japon/historial
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": {
    "historial": [
      {
        "mes": "Noviembre 2025",
        "boletaId": "BOL-2025-GAV-001",
        "estado": "confirmada",
        "arriendo": 25000,
        "app": 550,
        "total": 25550,
        "totalCLP": 217175,
        "tc": 8.5,
        "diasParaAlerta": -1
      },
      {
        "mes": "Diciembre 2025",
        "boletaId": "BOL-2025-GAV-002",
        "estado": "confirmada",
        "arriendo": 25000,
        "app": 550,
        "total": 25550,
        "totalCLP": 217675,
        "tc": 8.55,
        "diasParaAlerta": -1
      },
      {
        "mes": "Enero 2026",
        "boletaId": "BOL-2026-GAV-001",
        "estado": "confirmada",
        "arriendo": 25000,
        "app": 550,
        "total": 25550,
        "totalCLP": 216675,
        "tc": 8.48,
        "diasParaAlerta": -1
      },
      {
        "mes": "Febrero 2026",
        "boletaId": "BOL-2026-GAV-002",
        "estado": "confirmada",
        "arriendo": 25000,
        "app": 550,
        "total": 25550,
        "totalCLP": 217175,
        "tc": 8.5,
        "diasParaAlerta": -1
      },
      {
        "mes": "Marzo 2026",
        "boletaId": "BOL-2026-GAV-003",
        "estado": "confirmada",
        "arriendo": 25000,
        "app": 550,
        "total": 25550,
        "totalCLP": 217175,
        "tc": 8.5,
        "diasParaAlerta": -1
      },
      {
        "mes": "Abril 2026",
        "boletaId": null,
        "estado": "alertada",
        "arriendo": 25000,
        "app": 550,
        "total": 25550,
        "totalCLP": 0,
        "tc": null,
        "diasParaAlerta": -2
      }
    ],
    "alertaActual": "GAV de Abril 2026 no generada (vencida desde hace 2 días)"
  }
}
```

**Campos de Respuesta:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `mes` | string | Mes en formato "Enero 2026" |
| `boletaId` | string \| null | ID de la boleta generada (BOL-2026-GAV-001) o null si no existe |
| `estado` | string | "confirmada" \| "pendiente" \| "alertada" |
| `arriendo` | number | Arriendo en ¥ (siempre 25000) |
| `app` | number | App Beyblade en ¥ (siempre 550) |
| `total` | number | Total en ¥ (siempre 25550) |
| `totalCLP` | number | Total en CLP (calculado con TC del mes) |
| `tc` | Decimal \| null | Tipo de cambio usado para generar la boleta |
| `diasParaAlerta` | number | Días restantes hasta la alerta (solo mes actual), -1 si ya pasó |
| `alertaActual` | string \| null | Mensaje de alerta si hay (ej: "Generar GAV antes del día 3") |

---

### 2. POST /api/shipments/gav-japon/generar

**Descripción:** Generar boleta GAV del mes actual

Crea:
1. Compra de "Arriendo Bodega Japón" (¥25.000)
2. Compra de "App Beyblade" (¥550)
3. Boleta con ambos items (BOL-YYYY-GAV-NNN)
4. Registro de control mensual (ShipmentsGavMonthControl)

**Request:**
```http
POST /api/shipments/gav-japon/generar
Authorization: Bearer <token>
Content-Type: application/json

{
  "tc": 8.5
}
```

**Body Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `tc` | number | ✅ | Tipo de cambio ¥ a CLP (ej: 8.5) |

**Response (201 Created):**
```json
{
  "data": {
    "invoiceId": "BOL-2026-GAV-001",
    "mes": "Abril 2026",
    "arriendo": 25000,
    "app": 550,
    "totalJPY": 28869,
    "totalCLP": 2453.87,
    "tc": 8.5,
    "estado": "sin_pagar"
  }
}
```

**Campos de Respuesta:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `invoiceId` | string | ID de la boleta generada (BOL-2026-GAV-001) |
| `mes` | string | Mes actual (ej: "Abril 2026") |
| `arriendo` | number | Arriendo en ¥ |
| `app` | number | App en ¥ |
| `totalJPY` | number | Total en ¥ con comisión (subtotalJPY × 1 + comisionPct%) |
| `totalCLP` | number | Total en CLP |
| `tc` | Decimal | Tipo de cambio usado |
| `estado` | string | "sin_pagar" (espera confirmación de pago) |

---

## Errores

### 400 - Validación Fallida

**Request sin TC:**
```bash
curl -X POST http://localhost:3001/api/shipments/gav-japon/generar \
  -H "Authorization: Bearer <token>" \
  -d '{}'
```

**Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El tipo de cambio (tc) es requerido y debe ser > 0",
    "details": [
      {
        "field": "tc",
        "message": "tc debe ser un número positivo (ej: 8.5)"
      }
    ]
  }
}
```

---

### 404 - Configuración No Encontrada

**Response:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Configuración del sistema no encontrada"
  }
}
```

Causa: La tabla `ShipmentsConfig` no tiene una fila. Solución: Crear una fila con valores por defecto.

---

### 409 - Ya Existe Boleta para este Mes

**Request (cuando ya hay boleta para abril):**
```bash
curl -X POST http://localhost:3001/api/shipments/gav-japon/generar \
  -H "Authorization: Bearer <token>" \
  -d '{"tc": 8.5}'
```

**Response:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Ya existe boleta GAV para Abril 2026: BOL-2026-GAV-001"
  }
}
```

---

## Autorización

**Roles con acceso:**
- ✅ `admin` — acceso completo
- ✅ `japon` — acceso completo
- ❌ `chile` — sin acceso
- ❌ `contador` — sin acceso (solo lectura en reportes)

---

## Flujo Operacional

```
1. Inicio de mes (Abril 1-31)

2. Operador consulta historial
   GET /api/shipments/gav-japon/historial
   → Muestra estado de todos los meses
   → Si abril no tiene boleta: estado = "pendiente"
   → Si día > 3 y no hay boleta: estado = "alertada"
   → Mensaje: "Generar GAV antes del día 3"

3. Operador recibe TC ¥→CLP para el mes
   Ej: ¥1 = CLP $8.50

4. Operador genera boleta GAV
   POST /api/shipments/gav-japon/generar
   Body: { "tc": 8.5 }
   → Boleta generada: BOL-2026-GAV-001
   → estado: "sin_pagar"
   → Aparece en listado de boletas pendientes

5. Operador confirma pago (cuando recibe transferencia)
   POST /api/shipments/pagos/BOL-2026-GAV-001/confirmar
   → Boleta ahora: estado = "pagado"
   → Compras de arriendo + app marcadas como pagadas

6. Boleta aparece en Estado de Resultados
   GET /api/shipments/eerr?mes=Abril&ano=2026
   → Línea: "Arriendo Japón: ¥25.000"
   → Línea: "App Beyblade: ¥550"
   → Total gastos fijos: ¥25.550
   → CLP: 25550 × 8.5 = $217,175
```

---

## Cálculos Internos

### Generación de ID

```
Formato: BOL-{año}-GAV-{número}

Ejemplos:
- BOL-2025-GAV-001  (primera boleta de 2025)
- BOL-2025-GAV-002  (segunda boleta de 2025)
- BOL-2026-GAV-001  (primer GAV de 2026)
```

### Cálculo de Totales

```
Subtotal JPY = Arriendo + App
             = 25,000 + 550
             = 25,550 ¥

Comisión % = Valor de ShipmentsConfig.comisionPct
           = Por defecto: 13%

Total JPY = Subtotal × (1 + Comisión / 100)
          = 25,550 × (1 + 13/100)
          = 25,550 × 1.13
          = 28,871.50 ¥

Total CLP = Total JPY × TC
          = 28,871.50 × 8.5
          = 245,407.75 CLP
```

---

## Control de Alertas

La alerta se activa automáticamente cuando:

1. **Es el mes actual** (hoy está en ese mes)
2. **No existe boleta** (boletaId es null)
3. **Ya pasó el día 3**

**Lógica de fechas:**
```
Hoy: 24 de Abril de 2026
Límite: 3 de Abril

diasParaAlerta = 3 - 24 = -21

Resultado: estado = "alertada"
          alertaActual = "GAV de Abril 2026 no generada (vencida desde hace 21 días)"
```

---

## Integración con Base de Datos

### Tablas Afectadas

**ShipmentsPurchase** (2 registros por GAV):
```sql
INSERT INTO shipments_purchases (sku, tipo, nombre, precioU, cant, estado, bodega)
VALUES
  ('GAV-2026-04-ARR', 'Gasto Fijo', 'Arriendo Bodega Japón', 25000, 1, 'por_pagar', 'japon'),
  ('GAV-2026-04-APP', 'Gasto Fijo', 'App Beyblade', 550, 1, 'por_pagar', 'japon');
```

**ShipmentsInvoice** (1 registro):
```sql
INSERT INTO shipments_invoices (invoiceId, subtotalJPY, comision, totalJPY, tc, totalCLP, estado)
VALUES ('BOL-2026-GAV-001', 25550, 13, 28871.50, 8.5, 245407.75, 'sin_pagar');
```

**ShipmentsInvoiceItem** (2 registros):
```sql
INSERT INTO shipments_invoice_items (invoiceId, tipo, nombre, precioU, cant, comPct, tc)
VALUES
  ('BOL-2026-GAV-001-ID', 'Gasto Fijo', 'Arriendo Bodega Japón', 25000, 1, 13, 8.5),
  ('BOL-2026-GAV-001-ID', 'Gasto Fijo', 'App Beyblade', 550, 1, 13, 8.5);
```

**ShipmentsGavMonthControl** (1 registro):
```sql
INSERT INTO shipments_gav_month_control (mes, boletaId, compraId)
VALUES ('Abril 2026', 'BOL-2026-GAV-001', 'compra-uuid-001');
```

---

## Ejemplos cURL

### Obtener Historial
```bash
curl -X GET http://localhost:3001/api/shipments/gav-japon/historial \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Generar Boleta GAV
```bash
curl -X POST http://localhost:3001/api/shipments/gav-japon/generar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "tc": 8.5
  }'
```

### Generar con TC Diferente (TC más bajo = CLP menos)
```bash
curl -X POST http://localhost:3001/api/shipments/gav-japon/generar \
  -H "Authorization: Bearer ..." \
  -d '{
    "tc": 8.25
  }'

# Resultado: totalCLP será más bajo (25550 × 8.25 = 210,787.50)
```

---

## Consideraciones Operacionales

### 1. Un GAV por Mes

- No es posible generar dos boletas GAV en el mismo mes
- Si se intenta: Error 409 CONFLICT
- Si necesita corregir: Debe eliminar manual la boleta anterior en BD

### 2. La Boleta es Transaccional

```
Si al generar falla algo:
- Se crean TODAS las compras
- Se crea la BOLETA
- Se crea el CONTROL

O NADA se crea (rollback automático)

Nunca hay estado intermedio
```

### 3. Comisión Aplicada

Los gastos fijos tienen comisión aplicada (13% por defecto)

```
¿Por qué? Porque la gestión de la bodega y el app tiene un costo
que se refleja en la comisión de importación.

¿Se puede cambiar? Sí, editando ShipmentsConfig.comisionPct
```

### 4. Confirmación de Pago

La boleta GAV se genera con estado `sin_pagar`. Luego se confirma con:

```bash
POST /api/shipments/pagos/BOL-2026-GAV-001/confirmar
```

Esto marca:
- Boleta → pagado
- Compra de arriendo → pagado
- Compra de app → pagado

---

## Futuras Mejoras

1. **Gastos variables**: Permitir agregar gastos mensuales adicionales (ej: seguros extra)
2. **Automatización**: Generar automáticamente el día 1 si se configura TC de referencia
3. **Cambio de valores**: Permitir cambiar arriendo/app sin tocar código
4. **Auditoría**: Log de quién generó y cuándo cada boleta
5. **Revert**: Endpoint para deshacer boleta si fue generada con error

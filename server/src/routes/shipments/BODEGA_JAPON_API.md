# Bodega Japón (Solo Lectura) - Endpoint

## Overview

**Bodega Japón** muestra el inventario disponible en Japón — es decir, productos que aún no se han enviado en cajas ni están en Chile.

El cálculo de **disponibilidad** es la pieza clave:

```
disponible = cant_total_comprada - en_cajas_activas - en_chile_stock
```

Donde:
- **cant_total_comprada**: cantidad total en la compra original
- **en_cajas_activas**: suma de unidades en cajas con estado `transito` o `llegada`
- **en_chile_stock**: suma de unidades en el stock de Chile después del costeo

**Solo se muestran productos con disponible > 0.**

---

## Endpoint 1: Listar Bodega Japón

**Request:**
```http
GET /api/shipments/bodega-japon?estado=por_pagar
Authorization: Bearer <token>
```

**Query Parameters:**
- `estado` (opcional): Filtrar por estado de pago
  - `'por_pagar'` — No pagado
  - `'esp_pago'` — Esperando pago
  - `'pagado'` — Pagado

**Response 200:**
```json
{
  "data": {
    "data": [
      {
        "sku": "JP-0001",
        "nombre": "Pokémon TCG Booster Box SV10",
        "ean": "4521329123456",
        "disponible": 5,
        "cantTotal": 10,
        "precioU": 5000,
        "estado": "por_pagar"
      },
      {
        "sku": "JP-0002",
        "nombre": "Beyblade X Starter Set",
        "ean": "4549660558372",
        "disponible": 8,
        "cantTotal": 8,
        "precioU": 3500,
        "estado": "pagado"
      }
    ],
    "kpis": {
      "skusDisponibles": 2,
      "unidadesDisponibles": 13,
      "totalJPY": 53000,
      "totalCLPEstimado": 621176
    }
  }
}
```

**Respuesta explicada:**

| Campo | Valor | Significado |
|-------|-------|-------------|
| `sku` | JP-0001 | SKU único |
| `nombre` | Pokémon TCG Booster Box SV10 | Nombre del producto |
| `ean` | 4521329123456 | Código de barras (opcional) |
| `disponible` | 5 | **Unidades listas para empacar** |
| `cantTotal` | 10 | Cantidad total comprada |
| `precioU` | 5000 | Precio unitario en ¥ |
| `estado` | por_pagar | Estado de pago |

**KPIs:**
- `skusDisponibles`: 2 SKUs diferentes con stock
- `unidadesDisponibles`: 13 unidades totales disponibles
- `totalJPY`: 53.000 ¥ (valor total de inventario)
- `totalCLPEstimado`: 621.176 CLP (estimado con TC promedio)

---

## Endpoint 2: Obtener Producto Específico

**Request:**
```http
GET /api/shipments/bodega-japon/JP-0001
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "data": {
    "sku": "JP-0001",
    "nombre": "Pokémon TCG Booster Box SV10",
    "ean": "4521329123456",
    "disponible": 5,
    "cantTotal": 10,
    "precioU": 5000,
    "estado": "por_pagar"
  }
}
```

**Response 404:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Producto con SKU JP-9999 no encontrado"
  }
}
```

---

## Cálculo de Disponibilidad (Detalle)

### Ejemplo Real

Compré 10 unidades de JP-0001:

```
Compra original:
  - SKU: JP-0001
  - Nombre: Pokémon TCG Booster Box SV10
  - cant: 10
  - estado: por_pagar

Estado actual:
  - En caja "Caja_1_Abr26" (transito): 3 unidades
  - En caja "Caja_2_Abr26" (costeada): 2 unidades
  - En stock Chile (costeada): 0 unidades

Cálculo de disponible:
  - En cajas activas (transito + llegada): 3 unidades
  - En Chile (estará en cajas costeadas): 0 unidades
  - disponible = 10 - 3 - 0 = 7
```

✅ **Resultado: 7 unidades disponibles para nuevo envío**

### Casos de Exclusión

**No aparece en lista de disponibles:**
- Si `disponible = 0` (todo enviado o en Chile)
- Si la compra no tiene estado pagado (depende del filtro)

---

## Autorización

**Roles con acceso:**
- ✅ `admin` — acceso completo
- ✅ `japon` — acceso completo
- ✅ `chile` — acceso de lectura
- ❌ `contador` — sin acceso

---

## Casos de Uso

### 1. Operador de Japón prepara nuevas cajas

```bash
# Ver qué hay disponible para empacar
curl -X GET "http://localhost:3001/api/shipments/bodega-japon?estado=pagado" \
  -H "Authorization: Bearer <token>"
```

Respuesta: Lista de productos pagados disponibles para enviar.

### 2. Operador de Chile verifica stock antes de crear Bodega Chile

```bash
# Ver inventario disponible sin filtros
curl -X GET http://localhost:3001/api/shipments/bodega-japon \
  -H "Authorization: Bearer <token>"
```

Respuesta: Todos los productos con stock disponible.

### 3. Verificar si un SKU específico está disponible

```bash
# Buscar producto específico
curl -X GET http://localhost:3001/api/shipments/bodega-japon/JP-0001 \
  -H "Authorization: Bearer <token>"
```

Si disponible > 0: Se puede usar en nueva caja
Si disponible = 0: Todo ya fue enviado o está en Chile

---

## Lógica de Cálculo Detallada

```typescript
// Función interna que se ejecuta para cada SKU:

async function calcDisponibleBySku(sku: string): Promise<number> {
  // 1. Obtener la compra original
  const purchase = await db.shipmentsPurchase.findUnique({ where: { sku } });
  
  // 2. Sumar cantidad en cajas activas
  const inBoxes = await db.shipmentsBoxProduct.aggregate({
    where: {
      sku,
      box: { estado: { in: ['transito', 'llegada'] } }
    },
    _sum: { cant: true }
  });
  
  // 3. Sumar cantidad en stock Chile
  const inChile = await db.shipmentsChileStock.aggregate({
    where: { sku },
    _sum: { cant: true }
  });
  
  // 4. Calcular disponible
  const enCajas = inBoxes._sum.cant || 0;
  const enChile = inChile._sum.cant || 0;
  
  return purchase.cant - enCajas - enChile;
}
```

---

## Monitoreo de Inventario

**KPI: Reorden Point**

Cuando `unidadesDisponibles < umbral`, el sistema podría alertar:
```json
{
  "alert": "Stock bajo",
  "unidadesDisponibles": 2,
  "threshold": 10,
  "action": "Considerar nueva compra"
}
```

---

## Filtros Disponibles

### Por Estado de Pago

```bash
# Solo productos pagados
curl -X GET "http://localhost:3001/api/shipments/bodega-japon?estado=pagado"

# Solo en espera de pago
curl -X GET "http://localhost:3001/api/shipments/bodega-japon?estado=esp_pago"

# Por pagar
curl -X GET "http://localhost:3001/api/shipments/bodega-japon?estado=por_pagar"
```

---

## Ejemplo Completo: Flujo Operacional

**Escenario:** Operador de Japón revisa disponibilidad y prepara nueva caja

```bash
# 1. Ver qué hay disponible
curl -X GET "http://localhost:3001/api/shipments/bodega-japon?estado=pagado" \
  -H "Authorization: Bearer token_japon"

# Respuesta:
# {
#   "data": {
#     "data": [
#       { "sku": "JP-0001", "disponible": 5, "nombre": "Pokémon...", "precioU": 5000 },
#       { "sku": "JP-0002", "disponible": 8, "nombre": "Beyblade...", "precioU": 3500 }
#     ],
#     "kpis": { "skusDisponibles": 2, "unidadesDisponibles": 13, "totalJPY": 53000 }
#   }
# }

# 2. Verificar producto específico
curl -X GET "http://localhost:3001/api/shipments/bodega-japon/JP-0001" \
  -H "Authorization: Bearer token_japon"

# Respuesta:
# { "data": { "sku": "JP-0001", "disponible": 5, ... } }

# 3. Proceder a crear caja (usa disponibilidad verificada)
curl -X POST "http://localhost:3001/api/shipments/cajas" \
  -H "Authorization: Bearer token_japon" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "Caja_3_Abr26",
    "fecha": "2026-04-24",
    "productos": [
      { "_compraId": "uuid-0001", "_sku": "JP-0001", "cant": 3 },
      { "_compraId": "uuid-0002", "_sku": "JP-0002", "cant": 5 }
    ]
  }'
```

---

## Columna "Disp / Total"

En la UI, se muestra como:

```
SKU      | Disponible | Formato
---------|------------|--------
JP-0001  | 5 / 10    | 5 (disponible) de 10 (total comprado)
JP-0002  | 8 / 8     | 8 (disponible) de 8 (total comprado)
JP-0003  | 0 / 5     | No aparece (no entra en lista)
```

Solo aparecen productos con disponible > 0.

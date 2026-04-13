# Especificación API REST — Shipments ERP

**Base path:** `/api/shipments/`  
**Autenticación:** Bearer token JWT en header `Authorization`  
**Content-Type:** `application/json`

---

## Formato de error estándar

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descripción legible del error",
    "details": [{ "field": "nombre", "message": "Campo requerido" }]
  }
}
```

| HTTP Status | Código | Uso |
|-------------|--------|-----|
| 400 | `VALIDATION_ERROR` | Datos de entrada inválidos |
| 401 | `UNAUTHORIZED` | Token ausente o expirado |
| 403 | `FORBIDDEN` | Rol sin acceso al recurso |
| 404 | `NOT_FOUND` | Recurso no existe |
| 409 | `CONFLICT` | Duplicado (ej: nombre de caja) |
| 500 | `INTERNAL_ERROR` | Error interno del servidor |

## Autorización por rol

Cada endpoint requiere uno o más roles. El middleware valida `req.user.role` contra la matriz:

| Rol | Módulos accesibles |
|-----|-------------------|
| `admin` | Todos |
| `japon` | compras, boletas, pagos, gav-japon, cajas |
| `chile` | dashboard, bodega-japon, bodega-transito, bodega-chile, ventas, cajas, compras-web, internacion, costeo, compras-chile |
| `contador` | dashboard, eerr, balance, flujo, gav-chile, gav-japon |

---

## Sección Japón

### Compras (Registro de Compras)

#### `GET /api/shipments/compras`
Listar compras con filtros opcionales.

**Query params:**
- `estado?: 'por_pagar' | 'esp_pago' | 'pagado'`
- `bodega?: 'japon' | 'transito' | 'chile'`

**Roles:** admin, japon

**Response 200:**
```typescript
{ data: PurchaseRecord[] }
```

#### `POST /api/shipments/compras`
Registrar nueva compra. El servidor asigna SKU auto-correlativo.

**Roles:** admin, japon

**Request body:**
```typescript
{
  fecha: string;        // YYYY-MM-DD
  tipo: string;         // 'Producto' | 'Arriendo/App'
  nombre: string;       // requerido
  ean?: string;
  tarjeta: string;      // método de pago
  precioU: number;      // > 0, precio unitario ¥
  cant: number;         // > 0, entero
  tc: number | null;    // tipo de cambio ¥→CLP
}
```

**Reglas de negocio:**
- `precioU` y `cant` deben ser > 0
- `total` se calcula como `precioU * cant`
- `estado` inicial: `por_pagar`
- `bodega` inicial: `japon`
- SKU se genera como `JP-XXXX` (siguiente correlativo)

**Response 201:**
```typescript
{ data: PurchaseRecord }
```

#### `PUT /api/shipments/compras/:id`
Editar compra existente.

**Roles:** admin, japon

**Request body:** `Partial<PurchaseRecord>` (campos editables)

**Response 200:**
```typescript
{ data: PurchaseRecord }
```

#### `DELETE /api/shipments/compras/:id`
Eliminar compra.

**Roles:** admin, japon  
**Reglas:** No se puede eliminar si el SKU está referenciado en cajas activas.

**Response 204:** Sin contenido

---

### Bodega Japón

#### `GET /api/shipments/bodega-japon`
Listar productos disponibles en Japón (disponible > 0).

**Query params:**
- `estado?: 'por_pagar' | 'esp_pago' | 'pagado'`

**Roles:** admin, japon, chile

**Response 200:**
```typescript
{
  data: Array<{
    sku: string;
    nombre: string;
    ean: string;
    disponible: number;
    cantTotal: number;
    precioU: number;
    estado: PaymentState;
  }>;
  kpis: {
    skusDisponibles: number;
    unidadesDisponibles: number;
    totalJPY: number;
    totalCLPEstimado: number;
  };
}
```

---

### Boletas

#### `GET /api/shipments/boletas`
Listar todas las boletas.

**Roles:** admin, japon

**Response 200:**
```typescript
{ data: Invoice[] }
```

#### `GET /api/shipments/boletas/:id`
Detalle de boleta con line items.

**Roles:** admin, japon

**Response 200:**
```typescript
{ data: Invoice; items: InvoiceItem[] }
```

#### `POST /api/shipments/boletas`
Generar nueva boleta desde productos seleccionados.

**Roles:** admin, japon

**Request body:**
```typescript
{
  items: Array<{
    compraId: number;
    precioU: number;
    cant: number;
    nombre: string;
    ean: string;
    tipo: string;
  }>;
  comisionPct: number;  // 0-100
  tc: number;           // > 0
}
```

**Reglas de negocio:**
- `subtotalJPY = Σ(precioU × cant)`
- `totalJPY = subtotalJPY × (1 + comisionPct/100)`
- `totalCLP = totalJPY / tc`
- ID formato: `BOL-YYYY-NNN`
- Estado inicial: `sin_pagar`

**Response 201:**
```typescript
{ data: Invoice }
```

#### `DELETE /api/shipments/boletas/:id`
Eliminar boleta.

**Roles:** admin, japon  
**Reglas:** Solo si estado = `sin_pagar`.

**Response 204:** Sin contenido

---

### Confirmar Pagos

#### `POST /api/shipments/pagos/:boletaId/confirmar`
Confirmar pago de una boleta.

**Roles:** admin, japon

**Request body:**
```typescript
{
  cuenta: string;       // nombre cuenta bancaria
  fecha: string;        // YYYY-MM-DD
  montoCLP: number;     // monto transferido
}
```

**Reglas de negocio:**
- Solo boletas con estado `sin_pagar`
- Al confirmar: `boleta.estado → 'pagado'`
- Compras relacionadas: `compra.estado → 'pagado'`

**Response 200:**
```typescript
{ data: Invoice }
```

---

### GAV Japón

#### `GET /api/shipments/gav-japon/historial`
Historial de boletas GAV de los últimos 6 meses.

**Roles:** admin, japon, contador

**Response 200:**
```typescript
{
  data: Array<{
    mes: string;
    boletaId: string | null;
    totalJPY: number;
    totalCLP: number;
    estado: string;
  }>;
  alerta: boolean;  // true si día ≥ 3 y no hay boleta del mes
}
```

#### `POST /api/shipments/gav-japon/generar`
Generar boleta GAV del mes actual.

**Roles:** admin, japon

**Reglas de negocio:**
- Solo una boleta GAV por mes
- Incluye arriendo bodega + app Beyblade
- ID formato: `BOL-YYYY-GAV-NNN`
- Comisión desde config

**Response 201:**
```typescript
{ data: Invoice }
```

---

## Sección Envíos

### Cajas / Envíos

#### `GET /api/shipments/cajas`
Listar todas las cajas.

**Roles:** admin, japon, chile

**Response 200:**
```typescript
{ data: Box[] }
```

#### `POST /api/shipments/cajas`
Crear nueva caja.

**Roles:** admin, japon, chile

**Request body:**
```typescript
{
  id: string;           // nombre único
  fecha: string;
  flete_jpy: number;
  mo_horas: number;
  mo_tarifa: number;    // CLP/hora
  mat_jpy: number;
  tc_envio: number;
  productos: Array<{
    _compraId: number;
    _sku: string;
    nombre: string;
    ean: string;
    cant: number;       // ≤ disponible
    precioU: number;
    tc: number;
  }>;
}
```

**Reglas de negocio:**
- Nombre debe ser único (409 si duplicado)
- `cant` por producto ≤ `calcDisponibleBySku(sku)`
- Estado inicial: `transito`
- Actualizar `compra.bodega → 'transito'` si disponible = 0

**Response 201:**
```typescript
{ data: Box }
```

#### `PUT /api/shipments/cajas/:id`
Editar caja (solo en estado `transito`).

**Roles:** admin, japon, chile

**Request body:** `Partial<Box>` (campos editables: flete, MO, materiales, TC, nombre)

**Response 200:**
```typescript
{ data: Box }
```

#### `DELETE /api/shipments/cajas/:id`
Eliminar caja (solo en estado `transito` o `llegada`).

**Roles:** admin, japon, chile  
**Reglas:** Restaurar `compra.bodega` si corresponde.

**Response 204:** Sin contenido

---

### Bodega Tránsito

#### `GET /api/shipments/bodega-transito`
Listar cajas agrupadas por estado con KPIs.

**Roles:** admin, chile

**Response 200:**
```typescript
{
  data: Box[];
  kpis: {
    enTransito: number;
    llegadas: number;
    costeadas: number;
  };
}
```

---

### Compras Web

#### `GET /api/shipments/compras-web`
Listar pedidos web.

**Roles:** admin, japon, chile

**Response 200:**
```typescript
{ data: WebOrder[] }
```

#### `POST /api/shipments/compras-web`
Registrar nuevo pedido web.

**Roles:** admin, japon, chile

**Request body:**
```typescript
{
  portal: string;
  orden: string;
  fecha: string;
  tc: number;
  costoEnvioIntern: number;
  productos: Array<{
    nombre: string;
    ean: string;
    cant: number;
    precioUSD: number;
    precioCLP: number;
    pctCosteo: number;
    costoUnit: number;
  }>;
}
```

**Response 201:**
```typescript
{ data: WebOrder }
```

---

### Internación

#### `GET /api/shipments/internacion`
Listar cajas con estado de internación.

**Roles:** admin, chile

**Response 200:**
```typescript
{
  data: Array<{
    cajaId: string;
    estado: BoxState;
    internacion: InternacionData | null;
    registrada: boolean;
  }>;
}
```

#### `PUT /api/shipments/internacion/:cajaId`
Guardar datos de internación.

**Roles:** admin, chile

**Request body:**
```typescript
{
  arancel: number;  // CLP, ≥ 0
  iva: number;      // CLP, ≥ 0 — IVA Crédito Fiscal
}
```

**Reglas:** `total = arancel + iva` (calculado por servidor).

**Response 200:**
```typescript
{ data: Box }
```

---

### Costeo de Cajas

#### `GET /api/shipments/costeo/cajas-disponibles`
Listar cajas en estado `llegada` disponibles para costeo.

**Roles:** admin, chile

**Response 200:**
```typescript
{ data: Box[] }
```

#### `POST /api/shipments/costeo/:cajaId/confirmar`
Confirmar costeo de una caja.

**Roles:** admin, chile

**Request body:**
```typescript
{
  productos: Array<{
    _compraId: number;
    _sku: string;
    nombre: string;
    ean: string;
    cant: number;
    pct: number;        // % de costos asignado
    costoUnit: number;  // CLP calculado
  }>;
}
```

**Reglas de negocio:**
- Suma de `pct` debe ser exactamente 100
- Crea entradas en `stock_chile` con `costoUnit` calculado
- `caja.estado → 'costeada'`
- `compra.bodega → 'chile'` si disponible = 0

**Response 200:**
```typescript
{ data: { box: Box; stockEntries: ChileStockEntry[] } }
```

---

## Sección Chile

### Bodega Chile

#### `GET /api/shipments/bodega-chile`
Listar stock Chile con KPIs.

**Roles:** admin, chile

**Response 200:**
```typescript
{
  data: ChileStockEntry[];
  kpis: {
    unidadesTotales: number;
    valorInventario: number;
    sinPrecio: number;
  };
}
```

#### `PUT /api/shipments/bodega-chile/:id/precio`
Actualizar precio de venta.

**Roles:** admin, chile

**Request body:**
```typescript
{ precioVenta: number }  // ≥ 0
```

**Response 200:**
```typescript
{ data: ChileStockEntry }
```

---

### Ventas

#### `GET /api/shipments/ventas`
Listar ventas.

**Roles:** admin, chile

**Response 200:**
```typescript
{ data: SaleRecord[] }
```

#### `POST /api/shipments/ventas`
Registrar nueva venta.

**Roles:** admin, chile

**Request body:**
```typescript
{
  stockId: string;
  cant: number;           // > 0, ≤ stock disponible
  precioVenta: number;    // > 0
  canal: 'Instagram' | 'TikTok' | 'Mercado Libre' | 'Web' | 'Local';
}
```

**Reglas de negocio:**
- `cant ≤ stockEntry.cant`
- Descuenta `cant` del stock
- `total = precioVenta × cant`
- `costo` se toma de `stockEntry.costoUnit`

**Response 201:**
```typescript
{ data: SaleRecord }
```

---

### Compras Locales

#### `GET /api/shipments/compras-chile`
Listar compras locales.

**Roles:** admin, chile

**Response 200:**
```typescript
{ data: LocalPurchase[] }
```

#### `POST /api/shipments/compras-chile`
Registrar compra local.

**Roles:** admin, chile

**Request body:**
```typescript
{
  fecha: string;
  tipo: 'producto' | 'gasto';
  docTipo: 'factura' | 'boleta';
  proveedor: string;
  descripcion: string;
  monto: number;          // CLP, > 0
  iva: number;            // CLP, ≥ 0 (solo facturas)
  ivaCredito: boolean;    // true si factura
  estado: 'pagado' | 'pendiente';
}
```

**Response 201:**
```typescript
{ data: LocalPurchase }
```

---

### GAV Chile

#### `GET /api/shipments/gav-chile`
Listar gastos fijos Chile.

**Roles:** admin, contador

**Response 200:**
```typescript
{ data: GAVEntry[] }
```

#### `PUT /api/shipments/gav-chile/:id/confirmar`
Confirmar gasto con comprobante.

**Roles:** admin, contador

**Reglas de negocio:**
- `adjunto` debe ser `true` antes de confirmar
- `estado → 'pagado'`, `fechaPago → fecha actual`

**Response 200:**
```typescript
{ data: GAVEntry }
```

---

## Sección Finanzas

### Estado de Resultados

#### `GET /api/shipments/eerr`
Obtener estado de resultados calculado.

**Roles:** admin, contador

**Response 200:**
```typescript
{
  data: {
    ingresos: number;
    ingresosPorCanal: Record<SalesChannel, number>;
    costoVenta: number;
    margenBruto: number;
    gavJapon: number;
    gavChile: number;
    gavTotal: number;
    ebit: number;
    ivaCredito: number;
    resultadoNeto: number;
  };
}
```

---

### Balance General

#### `GET /api/shipments/balance`
Obtener balance general calculado.

**Roles:** admin, contador

**Response 200:**
```typescript
{
  data: {
    cajaEstimada: number;
    invChile: number;
    invJapon: number;
    ivaCreditoTotal: number;
    activos: number;
    pasivos: number;
    patrimonio: number;
  };
}
```

---

### Flujo de Caja

#### `GET /api/shipments/flujo`
Obtener flujo de caja calculado.

**Roles:** admin, contador

**Response 200:**
```typescript
{
  data: {
    ingresos: number;
    egresosJP: number;
    egresosCL: number;
    flujoNeto: number;
  };
}
```

---

## Sección Principal

### Dashboard

#### `GET /api/shipments/dashboard`
Obtener KPIs y alertas del dashboard.

**Roles:** admin, chile, contador

**Response 200:**
```typescript
{
  data: {
    kpis: {
      productosJapon: number;
      cajasTransito: number;
      cajasLlegadas: number;
      unidadesChile: number;
      boletasPendientes: number;
      ventasDelMes: number;
      margenPromedio: number;
    };
    timeline: {
      japon: number;
      transito: number;
      chile: number;
    };
    alertaGAV: boolean;
  };
}
```

---

### Configuración

#### `GET /api/shipments/config`
Obtener configuración actual.

**Roles:** admin

**Response 200:**
```typescript
{ data: ERPConfig }
```

#### `PUT /api/shipments/config`
Actualizar configuración.

**Roles:** admin

**Request body:**
```typescript
{
  metodosPago?: string[];
  cuentas?: BankAccount[];
  arrBodegaJP?: number;
  appBeyblade?: number;
  comisionPct?: number;
}
```

**Response 200:**
```typescript
{ data: ERPConfig }
```

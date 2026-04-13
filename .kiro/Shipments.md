# HobbyZamora — Sistema de Gestión ERP

**Versión:** v46  
**Persistencia:** localStorage (navegador local)  
**Hoja de ruta:** Migración futura a PHP + MySQL

---

## Tabla de contenidos

1. [Resumen general](#1-resumen-general)
2. [Flujo operacional](#2-flujo-operacional)
3. [Estructura de datos (STATE)](#3-estructura-de-datos-state)
4. [Sistema de SKU](#4-sistema-de-sku)
5. [Módulos — Sección Japón](#5-módulos--sección-japón)
6. [Módulos — Sección Envíos](#6-módulos--sección-envíos)
7. [Módulos — Sección Chile](#7-módulos--sección-chile)
8. [Módulos — Finanzas](#8-módulos--finanzas)
9. [Roles y permisos](#9-roles-y-permisos)
10. [Configuración del sistema](#10-configuración-del-sistema)
11. [Persistencia localStorage](#11-persistencia-localstorage)
12. [Funciones clave](#12-funciones-clave)

---

## 1. Resumen general

HobbyZamora es un sistema ERP single-file para gestionar la importación de **Pokémon TCG y Beyblade X** desde Japón a Chile. Cubre el ciclo completo desde la compra en Japón hasta la venta en Chile, incluyendo logística, internación aduanera, costeo y estados financieros.

### Módulos disponibles (19 total)

| Módulo | Sección | Descripción |
|--------|---------|-------------|
| Registro de Compras | Japón | Libro de compras con SKU único auto-asignado |
| Bodega Japón | Japón | Inventario físico disponible en Japón |
| Boletas | Japón | Generación de boletas con exportación PDF |
| Confirmar Pagos | Japón | Registro de transferencias por boleta |
| Gastos Fijos Japón | Japón | Arriendo bodega + App Beyblade (¥/mes) |
| Cajas / Envíos | Envíos | Creación y seguimiento de cajas hacia Chile |
| Bodega Tránsito | Envíos | Productos entre Japón y Chile |
| Compras Web | Envíos | Amazon JP, Rakuten y otros portales |
| Internación | Envíos | Arancel + IVA Crédito Fiscal en aduana |
| Costeo de Cajas | Chile | Distribución de costos por producto |
| Bodega Chile | Chile | Inventario disponible para venta |
| Compras Locales | Chile | Gastos operacionales en Chile |
| Ventas | Chile | Registro de ventas con descuento de stock |
| Gastos Fijos Chile | Chile | GAV Chile con comprobante obligatorio |
| Estado de Resultados | Finanzas | EE.RR. dinámico solo con gastos confirmados |
| Balance | Finanzas | Activos, pasivos y patrimonio estimado |
| Flujo de Caja | Finanzas | Ingresos y egresos operacionales |
| Dashboard | Principal | KPIs y alertas en tiempo real |
| Configuración | Principal | Métodos de pago, cuentas, parámetros |

---

## 2. Flujo operacional

```
[Compra Japón] → [Boleta + Pago] → [Crear Caja] → [Tránsito ✈️]
    → [Internación 🛃] → [Costeo ⚖️] → [Bodega Chile 🏪] → [Venta 💰]
```

### Reglas fundamentales

- **El pago es independiente del envío.** Un producto puede enviarse antes de ser pagado. El estado de pago (`por_pagar`, `esp_pago`, `pagado`) y el estado de ubicación (`bodega`) son campos separados.
- **`cant` en `STATE.compras` nunca se modifica** por movimientos de caja. Siempre refleja la cantidad total comprada.
- **La ubicación** se trackea via `bodega` (`japon` / `transito` / `chile`) y se actualiza solo al crear cajas y confirmar costeos.
- El **SKU propio** (no el EAN) es el identificador único de cada producto a lo largo de todo el ciclo.

---

## 3. Estructura de datos (STATE)

Todo el estado de la aplicación vive en un objeto global `STATE` y dos objetos auxiliares `BOLETA_ITEMS` y `BOLETAS_DETALLE`.

### `STATE`

```javascript
const STATE = {
  currentRole: 'admin',           // 'admin' | 'japon' | 'chile' | 'contador'
  gavBoletaGenerada: {},          // { 'Abril 2026': true } — control alerta mensual

  compras: [
    {
      id: Number,                 // ID incremental
      sku: 'JP-0001',            // SKU único auto-asignado
      fecha: 'DD/MM/YYYY',
      tipo: 'Producto',           // 'Producto' | 'Arriendo/App' | etc.
      nombre: String,
      ean: String,                // opcional, puede ser ''
      tarjeta: String,            // método de pago usado
      precioU: Number,            // precio unitario en ¥
      cant: Number,               // cantidad TOTAL comprada (no se modifica)
      total: Number,              // precioU * cant
      estado: String,             // 'por_pagar' | 'esp_pago' | 'pagado'
      bodega: String,             // 'japon' | 'transito' | 'chile'
      tc: Number | null,          // tipo de cambio ¥→CLP al momento de compra
    }
  ],

  boletas: [
    {
      id: String,                 // 'BOL-2026-001', 'BOL-2026-GAV-001', 'BOL-ENVIO-CajaX'
      fecha: 'DD/MM/YYYY',
      productos: Number | String, // cantidad de items o descripción (GAV)
      subtotalJPY: Number,
      comision: Number,           // % comisión aplicada
      totalJPY: Number,
      tc: Number,                 // TC al momento de la boleta
      totalCLP: Number,
      estado: String,             // 'sin_pagar' | 'pagado'
    }
  ],

  gavChile: [
    {
      id: Number,
      concepto: String,           // 'Arriendo bodega Chile', 'Contador', etc.
      monto: Number,              // monto en CLP
      adjunto: Boolean,           // true si se subió comprobante
      estado: String,             // 'pendiente' | 'pagado'
      docTipo: String,            // 'factura' | 'boleta'
      ivaCredito: Boolean,        // true si genera IVA crédito fiscal
      fechaPago: String,          // fecha al confirmar
    }
  ],

  cajas: [
    {
      id: String,                 // nombre único, ej: 'Caja_1_Abr26'
      fecha: 'DD/MM/YYYY',
      estado: String,             // 'transito' | 'llegada' | 'costeada'
      flete_jpy: Number,
      mo_horas: Number,
      mo_tarifa: Number,          // CLP por hora
      mat_jpy: Number,
      tc_envio: Number,
      pesoTotal: Number,
      internacion: null | {
        arancel: Number,          // CLP
        iva: Number,              // CLP — IVA Crédito Fiscal
        total: Number
      },
      productos: [
        {
          _compraId: Number,      // id en STATE.compras
          _sku: String,           // 'JP-0001'
          nombre: String,
          ean: String,
          cant: Number,           // cantidad enviada en esta caja
          precioU: Number,        // ¥
          tc: Number,
          pesoUnit: Number,
          _fromManual: Boolean,   // true si fue ingresado manualmente
        }
      ]
    }
  ],

  stockChile: [
    {
      id: String,                 // 'SKU-timestamp-idx'
      _sku: String,               // SKU del producto origen
      nombre: String,
      ean: String,
      caja: String,               // id de la caja que lo trajo
      cant: Number,
      costoUnit: Number,          // CLP — calculado en costeo
      precioVenta: Number | null,
    }
  ],

  pedidosWeb: [
    {
      id: String,                 // 'WEB-001'
      fecha: 'DD/MM/YYYY',
      portal: String,             // 'Amazon Japan' | 'Amazon USA' | 'Rakuten' | etc.
      orden: String,
      estado: String,             // 'pendiente' | 'costeado'
      costoEnvioIntern: Number,   // CLP
      tc: Number,                 // tipo de cambio usado
      productos: [
        {
          nombre: String,
          ean: String,
          cant: Number,
          precioUSD: Number,
          precioCLP: Number,
          pctCosteo: Number,      // % de costos fijos asignado a este producto
          costoUnit: Number,
        }
      ]
    }
  ],

  comprasChile: [
    {
      id: String,                 // 'CC-001'
      fecha: 'DD/MM/YYYY',
      tipo: String,               // 'producto' | 'gasto'
      docTipo: String,            // 'factura' | 'boleta'
      proveedor: String,
      descripcion: String,
      monto: Number,              // CLP total
      iva: Number,                // CLP — IVA separado (solo facturas)
      ivaCredito: Boolean,
      estado: String,             // 'pagado' | 'pendiente'
    }
  ],

  ventas: [
    {
      id: String,
      fecha: 'DD/MM/YYYY',
      producto: String,
      ean: String,
      cant: Number,
      precioVenta: Number,
      costo: Number,
      total: Number,
      canal: String,              // 'Instagram' | 'TikTok' | 'Mercado Libre' | 'Web' | 'Local'
    }
  ],

  config: {
    cuentas: ['Sebastian Canales', 'Enedina Silva', 'Diego Zamora'],
    metodosPago: ['Efectivo', 'JCB Bandai', 'Rakuten', 'PayPay', 'View Card', '', '', '', '', ''],
    arrBodegaJP: 25000,           // ¥/mes
    appBeyblade: 550,             // ¥/mes
    comisionPct: 13,              // % comisión habitual en boletas
  },

  catalogoEAN: {                  // diccionario de autocompletado EAN → nombre
    '4521329': 'Pokémon TCG Booster Box SV10',
    // ...
  }
}
```

### `BOLETA_ITEMS`

```javascript
const BOLETA_ITEMS = {
  'BOL-2026-001': [
    {
      fecha: 'DD/MM/YYYY',
      tipo: String,
      nombre: String,
      ean: String,
      precioU: Number,            // ¥
      cant: Number,
      comPct: Number,             // % comisión de esta línea
      tc: Number,
    }
  ]
}
```

### `BOLETAS_DETALLE`

```javascript
const BOLETAS_DETALLE = {
  'BOL-2026-001': {
    fecha: 'DD/MM/YYYY',
    tc: Number,
    estado: String,
    items: [ /* igual que BOLETA_ITEMS */ ]
  }
}
```

---

## 4. Sistema de SKU

Cada producto recibe un SKU único al ser registrado: `JP-0001`, `JP-0002`, etc. Este SKU viaja por todo el ciclo y permite tracking exacto sin depender del nombre ni del EAN.

### Ciclo del SKU

| Etapa | Dónde se guarda | Valor |
|-------|-----------------|-------|
| Registro de compra | `STATE.compras[].sku` | `'JP-0001'` |
| Crear caja | `caja.productos[]._sku` | `'JP-0001'` |
| Agregar al costeo | `_costeoData.productos[]._sku` | `'JP-0001'` |
| Confirmar costeo | `STATE.stockChile[]._sku` | `'JP-0001'` |

### Función `calcDisponibleBySku(sku)`

Calcula cuántas unidades están realmente disponibles en Japón:

```
disponible = compra.cant - enCajas - enChile
```

- `enCajas`: suma de unidades del SKU en cajas con estado `transito` o `llegada`
- `enChile`: suma de unidades del SKU en `STATE.stockChile`

### Reglas de `STATE.compras`

- `cant` **nunca cambia** — siempre es el total comprado
- `bodega` cambia solo en dos momentos:
  - `'japon'` → `'transito'` al crear caja (si van todas las unidades)
  - `'transito'` → `'chile'` al confirmar costeo (si `disponible <= 0`)
- `estado` (pago) es **completamente independiente** de `bodega` (ubicación)

---

## 5. Módulos — Sección Japón

### 5.1 Registro de Compras

**Función principal:** `registrarNuevaCompra()`

- Genera SKU auto-correlativo (`JP-XXXX`)
- Campos: fecha, tipo, nombre, EAN (opcional), tarjeta/método de pago, precio ¥, cantidad, TC ¥→CLP
- Estados de pago: `por_pagar` | `esp_pago` | `pagado`
- Filtros: por estado de pago y por bodega
- Edición con `abrirEdicion(id)` y eliminación individual

### 5.2 Bodega Japón

**Función principal:** `renderBodegaJapon()`

- Muestra solo productos con `calcDisponibleBySku() > 0`
- Columna cantidad: `disp / cant_total` (ej: `2 / 5`)
- KPIs: SKUs disponibles, unidades, total ¥, total CLP estimado
- Filtro por estado de pago

### 5.3 Boletas

**Funciones:** `generarBoleta()`, `renderBoletaTabla()`, `verBoleta(id)`, `imprimirBoleta(id)`

- Selector de productos con checkbox y cantidad editable
- Comisión % configurable (default 13%)
- Vista previa con precios ¥ y equivalencia CLP
- Exportar a PDF con logo
- Editar boleta existente sin recrearla
- Eliminar boleta individual

### 5.4 Confirmar Pagos

**Función:** `confirmarPago(boletaId)`

- Seleccionar boleta con estado `sin_pagar`
- Registrar transferencias con cuenta, fecha y monto CLP
- Validación: monto transferido debe coincidir con total boleta
- Al confirmar: actualiza `estado → 'pagado'` en boleta y productos relacionados
- Refresca EE.RR. y Dashboard automáticamente

### 5.5 Gastos Fijos Japón

**Funciones:** `confirmarGAVBoleta()`, `renderGAVHistorial()`

- Gastos recurrentes: arriendo ¥25.000/mes + App Beyblade ¥550/mes
- Botón "Generar boleta" para el mes actual
- Alerta bloqueante desde el día 3 del mes si no se generó la boleta
- Historial dinámico de últimos 6 meses con estado
- IDs de boleta GAV: `BOL-YYYY-GAV-NNN`

---

## 6. Módulos — Sección Envíos

### 6.1 Cajas / Envíos

**Funciones:** `crearNuevaCaja()`, `renderCajasGrid()`, `editarCaja(id)`, `eliminarCajaDirecto(id)`

#### Crear caja

1. Nombre único (valida duplicados, sugiere alternativa)
2. Parámetros: flete UPS (¥), horas MO, tarifa MO (CLP/h), materiales (¥), TC
3. Selector dinámico desde Bodega Japón:
   - Solo muestra productos con `calcDisponibleBySku() > 0`
   - Input de cantidad editable con límite `max = disponible`
   - Cantidad parcial permitida (ej: 3 de 5)
4. O agregar manualmente (crea producto en Registro de Compras con `bodega: 'transito'`)
5. Genera boleta de envío automáticamente (`BOL-ENVIO-NombreCaja`)

#### Estados de caja

| Estado | Badge | Acciones disponibles |
|--------|-------|----------------------|
| `transito` | ✈️ En tránsito | Ver, Editar parámetros, Boleta envío, Eliminar |
| `llegada` | 📦 Llegada | Ver, Hacer costeo, Eliminar |
| `costeada` | ✅ Costeada | Ver, Boleta envío |

#### Editar caja (`editarCaja(id)`)

- Disponible solo en estado `transito`
- Edita: nombre/ID, TC, flete, MO, materiales
- Si cambia el nombre: renombra también `BOL-ENVIO-*` asociada

### 6.2 Bodega Tránsito

**Función:** `renderBodegaTransito()`

- Muestra cajas en `transito`, `llegada` y `costeada`
- KPIs: cajas en tránsito, llegadas pendientes, costeadas
- Panel de productos por caja con cantidad y valor ¥
- Botón "Hacer costeo" desde cajas en estado `llegada`

### 6.3 Compras Web

**Funciones:** `registrarPedidoWeb()`, `editarCosteoWeb(id)`, `eliminarPedidoWeb(id)`

- Portales: Amazon Japan, Amazon USA, Rakuten, etc.
- Monedas: USD, JPY, CLP con TC configurable
- N° de orden, fecha, productos, costo envío internacional
- % de costeo por producto
- Al editar: si pedido está `costeado`, sincroniza `STATE.stockChile`
- Al eliminar: limpia entradas en Bodega Chile

### 6.4 Internación

**Funciones:** `guardarInternTbl(cajaId)`, `editarIntern(cajaId)`

- Registro de arancel CIF (CLP) e IVA pagado en aduana (CLP)
- El IVA de internación es IVA Crédito Fiscal (aparece en EE.RR.)
- Adjunto de documentos: DIN y DTE/Comprobante
- `editarIntern()`: pone en modo edición **preservando** los valores de arancel e IVA anteriores

### 6.5 Costeo de Cajas

**Funciones:** `confirmarCosteo()`, `eliminarFilaCosteo(idx)`, `agregarProductoCosteo()`

#### Flujo de costeo

1. Seleccionar caja con estado `llegada`
2. Asignar % de costos a cada producto (debe sumar 100%)
3. El sistema calcula: `costoUnit = (subtotalCLP × pct/100 + fleClp×pct/100 + moClp×pct/100 + matClp×pct/100 + internClp×pct/100) / cant`
4. Agregar productos adicionales desde Registro de Compras
5. Eliminar filas (restaura unidades a Japón)
6. Confirmar costeo

#### Al confirmar costeo

```
1. Limpiar entradas previas de esta caja en STATE.stockChile
2. Agrupar productos por SKU y sumar cantidades
3. Insertar en STATE.stockChile con _sku, cant total, costoUnit
4. Marcar caja como 'costeada'
5. Actualizar STATE.compras:
   - Si disponible <= 0 → bodega = 'chile'
   - Si disponible > 0  → bodega = 'japon' (quedan unidades)
6. Refrescar: BodegaChile, BodegaJapon, BodegaTransito, CajasGrid, EE.RR., Dashboard
```

---

## 7. Módulos — Sección Chile

### 7.1 Bodega Chile

**Función:** `renderBodegaChile()`

- Fuente: `STATE.stockChile`
- Precio de venta editable en tabla (`actualizarPrecioVenta(id, valor)`)
- Margen % calculado: `(precioVenta - costoUnit) / precioVenta * 100`
  - Verde: > 30% | Naranja: > 15% | Rojo: < 15%
- Estado web por producto: Pendiente / Publicado / Sin stock / Pausado
- KPIs: unidades totales, valor inventario, sin precio de venta

### 7.2 Ventas

**Función:** `registrarVenta()`

- Producto desde `STATE.stockChile`
- Descuenta `cant` del stock automáticamente
- Canales: Instagram, TikTok, Mercado Libre, Web, Local
- Exportar listado a CSV
- El `costoUnit` de la venta alimenta el EE.RR.

### 7.3 Compras Locales

**Función:** `registrarCompraChile()`

- Tipo: Producto para venta o Gasto GAV
- Documento: Factura (con IVA separado) o Boleta
- Si es factura: IVA se registra como IVA Crédito Fiscal
- Costo unitario auto-calculado (funciona con cantidad = 1)
- Los botones Producto/Gasto mantienen tamaño fijo al cambiar tipo

### 7.4 Gastos Fijos Chile

**Función:** `confirmarGAV(id)`, `adjuntarComprobante(input, id)`

- 5 conceptos configurables: Arriendo, Contador, Cuenta corriente, POS, Comisión web
- **Comprobante obligatorio** antes de confirmar (imagen o PDF)
  - Si no hay comprobante: toast error + borde rojo en zona de upload
  - `adjuntarComprobante()` setea `g.adjunto = true`
- Al confirmar: `estado → 'pagado'` + refresca EE.RR. y Dashboard inmediatamente
- Solo gastos `pagado` aparecen en el EE.RR.

---

## 8. Módulos — Finanzas

### 8.1 Estado de Resultados

**Función:** `renderEERR()` → llama `calcFinanzas()`

```
Ingresos (ventas por canal)
- Costo de venta (costoUnit × cant vendida)
= Margen bruto

- GAV Japón (boletas GAV con estado 'pagado')
- GAV Chile (gastos con estado 'pagado')
= EBIT (Resultado operacional)

+ IVA Crédito (internaciones + facturas locales)
= Resultado neto
```

> **Importante:** Solo se contabilizan gastos **confirmados** (estado `pagado`). Los pendientes no afectan el EE.RR.

Se refresca automáticamente al confirmar: `confirmarGAV()`, `confirmarGAVBoleta()`, `confirmarPago()`, `confirmarCosteo()`.

### 8.2 Balance General

**Función:** `renderBalance()`

```
Activo = Caja estimada + Inventario Chile + Inventario Japón + IVA Crédito
Pasivo = Boletas sin pagar
Patrimonio = Activo - Pasivo
```

### 8.3 Flujo de Caja

**Función:** `renderFlujo()`

```
Ingresos = ventas confirmadas
Egresos JP = boletas pagadas (compras + GAV)
Egresos CL = GAV Chile pagado + compras locales
Flujo neto = Ingresos - Egresos totales
```

### 8.4 Dashboard

**Función:** `renderDashboard()`

- KPIs: productos en Japón, cajas en tránsito/llegadas, unidades en Chile, boletas pendientes, ventas y margen
- Alerta de GAV sin cobrar (desde el día 3 del mes)
- Timeline visual: Japón → Tránsito → Chile
- Se refresca al navegar a cualquier módulo

---

## 9. Roles y permisos

```javascript
const ROLE_PAGES = {
  admin:    ['dashboard','compras','boletas','pagos','gav-japon','cajas',
             'compras-web','internacion','costeo','bodega-japon','bodega-transito',
             'bodega-chile','compras-chile','ventas','gav-chile',
             'eerr','balance','flujo','config'],
  japon:    ['compras','boletas','gav-japon','cajas'],
  chile:    ['dashboard','bodega-japon','bodega-transito','bodega-chile','ventas',
             'cajas','compras-web','internacion','costeo','compras-chile'],
  contador: ['dashboard','eerr','balance','flujo','gav-chile','gav-japon'],
}
```

### Matriz de acceso por módulo

| Módulo | Admin | Japón | Chile | Contador |
|--------|:-----:|:-----:|:-----:|:--------:|
| Registro de compras | ✅ | ✅ | — | — |
| Bodega Japón | ✅ | ✅ | ✅ | — |
| Boletas / Pagos | ✅ | ✅ | — | — |
| GAV Japón | ✅ | ✅ | — | ✅ |
| Cajas / Envíos | ✅ | ✅ | ✅ | — |
| Bodega Tránsito | ✅ | — | ✅ | — |
| Internación / Costeo | ✅ | — | ✅ | — |
| Compras Web | ✅ | ✅ | ✅ | — |
| Bodega Chile / Ventas | ✅ | — | ✅ | — |
| Compras Locales | ✅ | — | ✅ | — |
| GAV Chile | ✅ | — | — | ✅ |
| EE.RR. / Balance / Flujo | ✅ | — | — | ✅ |
| Dashboard | ✅ | — | ✅ | ✅ |
| Configuración | ✅ | — | — | — |

---

## 10. Configuración del sistema

### Métodos de pago (10 slots)

| Slot | Valor por defecto |
|------|-------------------|
| 0 | Efectivo (fijo) |
| 1 | JCB Bandai |
| 2 | Rakuten |
| 3 | PayPay |
| 4 | View Card |
| 5–9 | Libres |

### Cuentas bancarias

| Cuenta | Titular | RUT | Banco | Tipo | N° |
|--------|---------|-----|-------|------|----|
| 1 | Sebastian Canales | 16.232.924-3 | Banco Falabella | Cta. Corriente | 019831141187 |
| 2 | Enedina Silva | 8.307.035-8 | Banco Falabella | Cta. Corriente | 011810026573 |
| 3 | Diego Zamora | 17.472.094-0 | Banco Falabella | Cta. Corriente | 014000123337 |

### Gastos fijos Japón

| Parámetro | Valor |
|-----------|-------|
| `arrBodegaJP` | ¥25.000/mes |
| `appBeyblade` | ¥550/mes |
| `comisionPct` | 13% |

---

## 11. Persistencia localStorage

### Keys utilizadas (v2)

| Key | Contenido |
|-----|-----------|
| `hz_state_v2` | `JSON.stringify(STATE)` |
| `hz_boleta_items_v2` | `JSON.stringify(BOLETA_ITEMS)` |
| `hz_boletas_detalle_v2` | `JSON.stringify(BOLETAS_DETALLE)` |

> Las keys `v1` (demo) se eliminan automáticamente al arrancar.

### Cuándo se guarda (`saveState()`)

- Registrar compra
- Generar boleta
- Confirmar pago
- Crear caja
- Confirmar costeo
- Registrar venta
- Confirmar GAV Chile
- Guardar manualmente (botón en Configuración)

### Restablecer

```javascript
function resetState() {
  localStorage.removeItem('hz_state_v2');
  localStorage.removeItem('hz_boleta_items_v2');
  localStorage.removeItem('hz_boletas_detalle_v2');
  location.reload();
}
```

---

## 12. Funciones clave

### Tracking de inventario

```javascript
// Disponible en Japón usando SKU
function calcDisponibleBySku(sku)
// → compra.cant - unidades_en_cajas_activas - unidades_en_stockChile

// Alias legacy (sin SKU)
function calcDisponibleEnJapon(prodId, prodNombre)
// → delega a calcDisponibleBySku si el producto tiene sku
```

### Navegación

```javascript
function nav(page)
// Activa la página, oculta las demás, actualiza sidebar y topbar
// Llama el render correspondiente según la página
```

### Modales

```javascript
function showModal(id)   // classList.add('open')
function closeModal(id)  // classList.remove('open')
```

### Rendering principal por módulo

```javascript
renderTablaCompras()      // Registro de Compras
renderBodegaJapon()       // Bodega Japón
renderBoletasTable()      // Boletas
renderPagosBoletas()      // Confirmar Pagos
renderGAVHistorial()      // Gastos Fijos Japón — historial
renderCajasGrid()         // Cajas / Envíos
renderBodegaTransito()    // Bodega Tránsito
renderPedidosWeb()        // Compras Web
renderInternacionTable()  // Internación
initCosteoSelector()      // Costeo — selector de cajas
renderBodegaChile()       // Bodega Chile
renderComprasChile()      // Compras Locales
renderVentas()            // Ventas
renderGAVChile()          // Gastos Fijos Chile
renderEERR()              // Estado de Resultados
renderBalance()           // Balance
renderFlujo()             // Flujo de Caja
renderDashboard()         // Dashboard
renderPanelSelCaja()      // Panel selector productos en modal-caja
```

### SKU

```javascript
// Auto-asignar SKU al registrar
const maxSku = Math.max(...STATE.compras.map(c => parseInt(c.sku?.replace(/\D/g,'')) || 0));
const newSku = 'JP-' + String(maxSku + 1).padStart(4, '0');

// Migrar productos sin SKU (ensureSkus)
function ensureSkus()
```

---

## Notas para la migración (Fase 2 — PHP + MySQL)

### Tablas recomendadas

```sql
compras          -- STATE.compras
boletas          -- STATE.boletas
boleta_items     -- BOLETA_ITEMS
boletas_detalle  -- BOLETAS_DETALLE
cajas            -- STATE.cajas
caja_productos   -- caja.productos[] (relación N:1 con cajas)
stock_chile      -- STATE.stockChile
pedidos_web      -- STATE.pedidosWeb
pedido_productos -- pedidosWeb[].productos[]
compras_chile    -- STATE.comprasChile
ventas           -- STATE.ventas
gav_chile        -- STATE.gavChile
config           -- STATE.config
```

### Consideraciones

- El campo `sku` en `compras` debe tener índice único
- Las relaciones entre `caja_productos._sku` y `compras.sku` reemplazan las referencias por `_compraId`
- `stockChile._sku` es la foreign key hacia `compras.sku`
- La función `calcDisponibleBySku()` se traduce a una query SQL con `LEFT JOIN` sobre `caja_productos` y `stock_chile`
- El campo `cant` en `compras` **nunca se actualiza** por operaciones de envío — solo por correcciones manuales

---

*Documentación generada para HobbyZamora Sistema ERP v46 · [www.hobbyzamora.cl](https://www.hobbyzamora.cl)*
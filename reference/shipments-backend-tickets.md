# Tickets Backend — Shipments ERP

**Proyecto:** HobbyZamora Shipments ERP  
**Stack:** Express + TypeScript + Prisma + SQLite/PostgreSQL  
**Base path API:** `/api/shipments/`  
**Referencia frontend:** `src/app/data/shipmentsMockData.ts` (tipos), `src/app/contexts/ShipmentsDataContext.tsx` (mutaciones)  
**Referencia API:** `reference/shipments-api-spec.md`

---

## Fase 1 — Base de datos y modelos

### TICKET-001: Crear schema Prisma para Shipments ERP

**Prioridad:** Alta  
**Dependencias:** Ninguna

Crear las tablas en `server/prisma/schema.prisma`:

| Tabla | Campos clave |
|-------|-------------|
| `shipments_purchases` | id (autoincrement), sku (unique, JP-XXXX), fecha, tipo, nombre, ean?, tarjeta, precioU, cant, total, estado (por_pagar/esp_pago/pagado), bodega (japon/transito/chile), tc? |
| `shipments_invoices` | id (string, BOL-YYYY-NNN), fecha, productos, subtotalJPY, comision, totalJPY, tc, totalCLP, estado (sin_pagar/pagado) |
| `shipments_invoice_items` | id, invoiceId (FK), fecha, tipo, nombre, ean, precioU, cant, comPct, tc |
| `shipments_boxes` | id (string, nombre único), fecha, estado (transito/llegada/costeada), flete_jpy, mo_horas, mo_tarifa, mat_jpy, tc_envio, arancel?, iva?, internTotal? |
| `shipments_box_products` | id, boxId (FK), compraId (FK), sku, nombre, ean, cant, precioU, tc |
| `shipments_chile_stock` | id, sku, nombre, ean, cajaId (FK), cant, costoUnit, precioVenta? |
| `shipments_web_orders` | id (WEB-NNN), fecha, portal, orden, estado, costoEnvioIntern, tc |
| `shipments_web_order_products` | id, webOrderId (FK), nombre, ean, cant, precioUSD, precioCLP, pctCosteo, costoUnit |
| `shipments_local_purchases` | id (CC-NNN), fecha, tipo, docTipo, proveedor, descripcion, monto, iva, ivaCredito, estado |
| `shipments_sales` | id, fecha, producto, ean, cant, precioVenta, costo, total, canal |
| `shipments_gav_chile` | id, concepto, monto, adjunto, estado, docTipo, ivaCredito, fechaPago? |
| `shipments_config` | id (singleton), metodosPago (JSON), cuentas (JSON), arrBodegaJP, appBeyblade, comisionPct |

**Criterios de aceptación:**
- Migration generada y aplicable sin errores
- Relaciones FK correctas entre tablas
- Índices en: `sku` (purchases), `id` (invoices, boxes), `sku` (chile_stock)
- Seed con datos iniciales de config (arriendo ¥25.000, app ¥550, comisión 13%, 3 cuentas bancarias, 10 métodos de pago)

---

### TICKET-002: Crear middleware de autorización por rol Shipments

**Prioridad:** Alta  
**Dependencias:** TICKET-001

Crear `server/src/middleware/shipmentsAuth.ts`:

- Middleware `requireShipmentsRole(...roles: string[])` que valida `req.user.role` contra la matriz ROLE_PAGES
- Mapeo de rutas a módulos para determinar acceso
- Retorna 403 si el rol no tiene acceso

**Matriz de roles:**
```
admin:    todos los módulos
japon:    compras, boletas, pagos, gav-japon, cajas
chile:    dashboard, bodega-japon, bodega-transito, bodega-chile, ventas, cajas, compras-web, internacion, costeo, compras-chile
contador: dashboard, eerr, balance, flujo, gav-chile, gav-japon
```

---

## Fase 2 — Sección Japón (5 endpoints)

### TICKET-003: CRUD Compras (Registro de Compras)

**Prioridad:** Alta  
**Dependencias:** TICKET-001, TICKET-002

Crear `server/src/routes/shipmentsCompras.ts`:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/compras` | GET | Listar con filtros `?estado=X&bodega=Y` |
| `/api/shipments/compras` | POST | Crear compra, auto-asignar SKU `JP-XXXX` |
| `/api/shipments/compras/:id` | PUT | Editar compra |
| `/api/shipments/compras/:id` | DELETE | Eliminar (solo si SKU no está en cajas activas) |

**Lógica de SKU:**
- Consultar max SKU existente: `SELECT MAX(CAST(REPLACE(sku, 'JP-', '') AS INTEGER)) FROM shipments_purchases`
- Nuevo SKU = `JP-` + `(max + 1).padStart(4, '0')`

**Validaciones:**
- `precioU > 0`, `cant > 0`, `nombre` requerido
- DELETE: verificar que no existan `shipments_box_products` con ese SKU en cajas con estado `transito` o `llegada`

---

### TICKET-004: Bodega Japón (lectura)

**Prioridad:** Alta  
**Dependencias:** TICKET-003

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/bodega-japon` | GET | Productos con disponible > 0, KPIs |

**Lógica `calcDisponibleBySku(sku)`:**
```sql
disponible = compra.cant 
  - SUM(box_products.cant WHERE box.estado IN ('transito', 'llegada'))
  - SUM(chile_stock.cant WHERE chile_stock.sku = compra.sku)
```

**KPIs:** SKUs disponibles, unidades disponibles, total ¥, total CLP estimado

---

### TICKET-005: CRUD Boletas

**Prioridad:** Alta  
**Dependencias:** TICKET-003

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/boletas` | GET | Listar todas |
| `/api/shipments/boletas/:id` | GET | Detalle con line items |
| `/api/shipments/boletas` | POST | Generar boleta desde productos seleccionados |
| `/api/shipments/boletas/:id` | DELETE | Eliminar (solo si `sin_pagar`) |

**Fórmulas:**
- `subtotalJPY = Σ(precioU × cant)`
- `totalJPY = subtotalJPY × (1 + comision/100)`
- `totalCLP = totalJPY / tc`
- ID: `BOL-YYYY-NNN` (correlativo por año)

---

### TICKET-006: Confirmar Pagos

**Prioridad:** Alta  
**Dependencias:** TICKET-005

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/pagos/:boletaId/confirmar` | POST | Confirmar pago |

**Lógica:**
- Validar boleta con estado `sin_pagar`
- Actualizar `boleta.estado → 'pagado'`
- Actualizar todas las compras relacionadas (via invoice_items): `compra.estado → 'pagado'`
- Transacción atómica

---

### TICKET-007: GAV Japón

**Prioridad:** Media  
**Dependencias:** TICKET-005

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/gav-japon/historial` | GET | Últimos 6 meses + alerta |
| `/api/shipments/gav-japon/generar` | POST | Generar boleta GAV del mes |

**Lógica:**
- Solo una boleta GAV por mes (verificar duplicado)
- Gastos: arriendo bodega + app Beyblade (desde config)
- ID: `BOL-YYYY-GAV-NNN`
- Alerta: `true` si día ≥ 3 y no existe boleta GAV del mes actual

---

## Fase 3 — Sección Envíos (5 endpoints)

### TICKET-008: CRUD Cajas / Envíos

**Prioridad:** Alta  
**Dependencias:** TICKET-004

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/cajas` | GET | Listar todas |
| `/api/shipments/cajas` | POST | Crear caja con productos |
| `/api/shipments/cajas/:id` | PUT | Editar (solo `transito`) |
| `/api/shipments/cajas/:id` | DELETE | Eliminar (solo `transito`/`llegada`) |

**Lógica POST:**
- Validar nombre único (409 si duplicado)
- Validar `cant ≤ disponible` por producto
- Estado inicial: `transito`
- Si un producto queda con disponible = 0 → `compra.bodega = 'transito'`
- Transacción atómica

**Lógica DELETE:**
- Restaurar `compra.bodega` si corresponde
- Eliminar `box_products` asociados

---

### TICKET-009: Bodega Tránsito (lectura)

**Prioridad:** Media  
**Dependencias:** TICKET-008

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/bodega-transito` | GET | Cajas agrupadas por estado + KPIs |

---

### TICKET-010: CRUD Compras Web

**Prioridad:** Media  
**Dependencias:** TICKET-001

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/compras-web` | GET | Listar pedidos web |
| `/api/shipments/compras-web` | POST | Registrar pedido web |

**ID:** `WEB-NNN` (correlativo)

---

### TICKET-011: Internación

**Prioridad:** Alta  
**Dependencias:** TICKET-008

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/internacion` | GET | Cajas con estado de internación |
| `/api/shipments/internacion/:cajaId` | PUT | Guardar arancel + IVA |

**Lógica:**
- `total = arancel + iva`
- IVA se marca como crédito fiscal (usado en EE.RR.)

---

### TICKET-012: Costeo de Cajas

**Prioridad:** Alta  
**Dependencias:** TICKET-008, TICKET-011

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/costeo/cajas-disponibles` | GET | Cajas en estado `llegada` |
| `/api/shipments/costeo/:cajaId/confirmar` | POST | Confirmar costeo |

**Lógica de confirmación (transacción atómica):**
1. Validar `Σ(pct) = 100`
2. Calcular `costoUnit` por producto: `(subtotalCLP × pct/100 + fleteCLP × pct/100 + moCLP × pct/100 + matCLP × pct/100 + internCLP × pct/100) / cant`
3. Crear entradas en `shipments_chile_stock`
4. `caja.estado → 'costeada'`
5. Para cada compra: si `calcDisponibleBySku(sku) = 0` → `compra.bodega = 'chile'`

---

## Fase 4 — Sección Chile (4 endpoints)

### TICKET-013: Bodega Chile + actualizar precio

**Prioridad:** Alta  
**Dependencias:** TICKET-012

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/bodega-chile` | GET | Stock Chile + KPIs |
| `/api/shipments/bodega-chile/:id/precio` | PUT | Actualizar precio de venta |

**KPIs:** Unidades totales, valor inventario (Σ cant × costoUnit), productos sin precio

---

### TICKET-014: Ventas

**Prioridad:** Alta  
**Dependencias:** TICKET-013

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/ventas` | GET | Listar ventas |
| `/api/shipments/ventas` | POST | Registrar venta |

**Lógica POST:**
- Validar `cant ≤ stockEntry.cant`
- Descontar `cant` del stock
- `total = precioVenta × cant`
- `costo = stockEntry.costoUnit`
- Canales: Instagram, TikTok, Mercado Libre, Web, Local

---

### TICKET-015: Compras Locales

**Prioridad:** Media  
**Dependencias:** TICKET-001

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/compras-chile` | GET | Listar |
| `/api/shipments/compras-chile` | POST | Registrar compra local |

**ID:** `CC-NNN` (correlativo)  
**Lógica:** Si `docTipo = 'factura'` → `ivaCredito = true`

---

### TICKET-016: GAV Chile

**Prioridad:** Media  
**Dependencias:** TICKET-001

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/gav-chile` | GET | Listar gastos fijos |
| `/api/shipments/gav-chile/:id/confirmar` | PUT | Confirmar con comprobante |

**Lógica:**
- Validar `adjunto = true` antes de confirmar
- `estado → 'pagado'`, `fechaPago → now()`

---

## Fase 5 — Finanzas (3 endpoints, solo lectura)

### TICKET-017: Estado de Resultados

**Prioridad:** Media  
**Dependencias:** TICKET-014, TICKET-016

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/eerr` | GET | Estado de resultados calculado |

**Fórmulas:**
```
Ingresos = Σ(venta.total)
CostoVenta = Σ(venta.costo × venta.cant)
MargenBruto = Ingresos - CostoVenta
GAVJapon = Σ(boletas GAV con estado 'pagado').totalCLP
GAVChile = Σ(gav_chile con estado 'pagado').monto
EBIT = MargenBruto - GAVJapon - GAVChile
IVACredito = Σ(internacion.iva) + Σ(compras_chile WHERE ivaCredito=true).iva
ResultadoNeto = EBIT + IVACredito
```

**Importante:** Solo GAV con estado `pagado` se incluye.

---

### TICKET-018: Balance General

**Prioridad:** Media  
**Dependencias:** TICKET-017

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/balance` | GET | Balance general calculado |

**Fórmulas:**
```
InvChile = Σ(chile_stock.cant × chile_stock.costoUnit)
InvJapon = Σ(compra.precioU × compra.cant / compra.tc) WHERE bodega='japon'
IVACredito = Σ(internacion.iva) + Σ(compras_chile WHERE ivaCredito).iva
Activos = CajaEstimada + InvChile + InvJapon + IVACredito
Pasivos = Σ(boletas WHERE estado='sin_pagar').totalCLP
Patrimonio = Activos - Pasivos
```

---

### TICKET-019: Flujo de Caja

**Prioridad:** Media  
**Dependencias:** TICKET-017

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/flujo` | GET | Flujo de caja calculado |

**Fórmulas:**
```
Ingresos = Σ(ventas.total)
EgresosJP = Σ(boletas WHERE estado='pagado').totalCLP
EgresosCL = Σ(gav_chile WHERE estado='pagado').monto + Σ(compras_chile WHERE estado='pagado').monto
FlujoNeto = Ingresos - EgresosJP - EgresosCL
```

---

## Fase 6 — Principal (2 endpoints)

### TICKET-020: Dashboard

**Prioridad:** Media  
**Dependencias:** TICKET-014

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/dashboard` | GET | KPIs + timeline + alerta GAV |

**KPIs:**
- Productos en Japón (disponible > 0)
- Cajas en tránsito / llegadas
- Unidades en Chile
- Boletas pendientes (sin_pagar)
- Ventas del mes actual
- Margen promedio

**Alerta GAV:** `true` si día ≥ 3 y no existe boleta GAV del mes actual

---

### TICKET-021: Configuración

**Prioridad:** Baja  
**Dependencias:** TICKET-001

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/shipments/config` | GET | Obtener config |
| `/api/shipments/config` | PUT | Actualizar config |

**Campos:** métodos de pago (10 slots), cuentas bancarias (3), arriendo bodega JP, app Beyblade, comisión %

---

## Fase 7 — Integración y migración

### TICKET-022: Registrar rutas en Express

**Prioridad:** Alta  
**Dependencias:** Todos los tickets de rutas

Crear `server/src/routes/shipments.ts` como router principal que monta todos los sub-routers:

```typescript
router.use('/compras', comprasRouter);
router.use('/boletas', boletasRouter);
router.use('/pagos', pagosRouter);
router.use('/gav-japon', gavJaponRouter);
router.use('/cajas', cajasRouter);
router.use('/bodega-japon', bodegaJaponRouter);
router.use('/bodega-transito', bodegaTransitoRouter);
router.use('/compras-web', comprasWebRouter);
router.use('/internacion', internacionRouter);
router.use('/costeo', costeoRouter);
router.use('/bodega-chile', bodegaChileRouter);
router.use('/ventas', ventasRouter);
router.use('/compras-chile', comprasChileRouter);
router.use('/gav-chile', gavChileRouter);
router.use('/eerr', eerrRouter);
router.use('/balance', balanceRouter);
router.use('/flujo', flujoRouter);
router.use('/dashboard', dashboardRouter);
router.use('/config', configRouter);
```

Montar en `server/src/index.ts`: `app.use('/api/shipments', shipmentsRouter);`

---

### TICKET-023: Conectar frontend a API real

**Prioridad:** Alta  
**Dependencias:** TICKET-022

Reemplazar `ShipmentsDataContext.tsx` para que use fetch al backend en vez de mock data:
- Crear `src/app/lib/shipmentsApi.ts` con funciones para cada endpoint
- Crear hooks `useShipmentsData()` que llamen a la API
- Mantener mock data como fallback si el backend no responde
- Migrar mutaciones de estado local a llamadas API + refetch

---

### TICKET-024: Seed de datos iniciales

**Prioridad:** Baja  
**Dependencias:** TICKET-001

Agregar seed en `server/prisma/seed.ts`:
- Config por defecto (arriendo ¥25.000, app ¥550, comisión 13%)
- 3 cuentas bancarias
- 10 métodos de pago
- 5 conceptos GAV Chile (Arriendo, Contador, Cuenta corriente, POS, Comisión web)

---

## Resumen de prioridades

| Prioridad | Tickets |
|-----------|---------|
| **Alta** | 001, 002, 003, 004, 005, 006, 008, 011, 012, 013, 014, 022, 023 |
| **Media** | 007, 009, 010, 015, 016, 017, 018, 019, 020 |
| **Baja** | 021, 024 |

## Orden de implementación sugerido

```
Fase 1: TICKET-001 → TICKET-002
Fase 2: TICKET-003 → TICKET-004 → TICKET-005 → TICKET-006 → TICKET-007
Fase 3: TICKET-008 → TICKET-009 → TICKET-010 → TICKET-011 → TICKET-012
Fase 4: TICKET-013 → TICKET-014 → TICKET-015 → TICKET-016
Fase 5: TICKET-017 → TICKET-018 → TICKET-019
Fase 6: TICKET-020 → TICKET-021
Fase 7: TICKET-022 → TICKET-023 → TICKET-024
```

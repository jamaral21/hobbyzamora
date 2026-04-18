# Tickets Backend — Shipments ERP (HobbyZamora)

**Stack:** Express + TypeScript + Prisma + SQLite/PostgreSQL  
**Base path:** `/api/shipments/`  
**Estado:** Frontend implementado con mock data, esperando backend real  
**Referencia API completa:** `reference/shipments-api-spec.md`  
**Referencia tipos:** `src/app/data/shipmentsMockData.ts`

---

## ¿Qué es el Shipments ERP?

Sistema de gestión de importaciones de Japón a Chile. Cubre el ciclo completo: compra en Japón → boleta → envío en caja → internación aduanera → costeo → bodega Chile → venta. Tiene 19 módulos organizados en 5 secciones, con 4 roles de acceso (admin, japón, chile, contador).

El frontend ya está construido en React con datos mock. Estos tickets implementan el backend real para reemplazar los mocks.

---

## Fase 1 — Base de datos (hacer primero)

### TICKET-001: Crear las tablas del ERP en la base de datos

**¿Qué hace?** Crea 12 tablas nuevas en Prisma para almacenar todos los datos del ERP de importaciones.

**¿Por qué?** Sin estas tablas no se puede guardar nada — compras, boletas, cajas, stock, ventas, etc. Todo el backend depende de esto.

**Tablas a crear:**

| Tabla | Para qué sirve |
|-------|----------------|
| `shipments_purchases` | Registro de compras en Japón (SKU, precio ¥, cantidad, estado pago, ubicación) |
| `shipments_invoices` | Boletas generadas (ID BOL-YYYY-NNN, totales ¥/CLP, estado pago) |
| `shipments_invoice_items` | Líneas de cada boleta (producto, precio, cantidad, comisión) |
| `shipments_boxes` | Cajas de envío (nombre, costos flete/MO/materiales, estado transito/llegada/costeada) |
| `shipments_box_products` | Productos dentro de cada caja (SKU, cantidad, precio) |
| `shipments_chile_stock` | Inventario en Chile después del costeo (SKU, costo unitario, precio venta) |
| `shipments_web_orders` | Pedidos de portales web (Amazon, Rakuten, etc.) |
| `shipments_web_order_products` | Productos de cada pedido web |
| `shipments_local_purchases` | Compras y gastos locales en Chile |
| `shipments_sales` | Ventas realizadas (producto, cantidad, precio, canal) |
| `shipments_gav_chile` | Gastos fijos mensuales de Chile (arriendo, contador, POS, etc.) |
| `shipments_config` | Configuración del sistema (métodos pago, cuentas bancarias, parámetros) |

**Prioridad:** Alta — bloquea todo lo demás

---

### TICKET-002: Middleware de autorización por rol

**¿Qué hace?** Crea un middleware que verifica si el usuario tiene permiso para acceder a cada módulo del ERP según su rol.

**¿Por qué?** El operador de Japón no debería ver los módulos de Chile, y el contador no debería poder registrar compras. Cada rol ve solo lo que le corresponde.

**Roles y acceso:**
- **admin** — ve todo (19 módulos)
- **japon** — compras, boletas, pagos, GAV Japón, cajas
- **chile** — dashboard, bodegas, ventas, cajas, compras web, internación, costeo, compras locales
- **contador** — dashboard, estado resultados, balance, flujo de caja, GAV Chile, GAV Japón

**Prioridad:** Alta

---

## Fase 2 — Sección Japón

### TICKET-003: Registro de Compras (CRUD)

**¿Qué hace?** Permite registrar, editar, listar y eliminar compras realizadas en Japón. Al crear una compra, el sistema asigna automáticamente un SKU correlativo (JP-0001, JP-0002, etc.).

**¿Por qué?** Es el punto de entrada de todo el flujo — cada producto que se importa empieza como una compra registrada aquí.

**Endpoints:**
- `GET /compras` — listar con filtros por estado de pago y ubicación
- `POST /compras` — crear compra (auto-asigna SKU)
- `PUT /compras/:id` — editar
- `DELETE /compras/:id` — eliminar (solo si el SKU no está en cajas activas)

**Reglas importantes:**
- SKU formato `JP-XXXX`, siempre correlativo
- `precioU > 0`, `cant > 0`, `nombre` requerido
- No se puede eliminar si el producto ya está en una caja en tránsito o llegada

**Prioridad:** Alta

---

### TICKET-004: Bodega Japón (solo lectura)

**¿Qué hace?** Muestra los productos disponibles en Japón — es decir, los que aún no se han enviado en cajas ni están en Chile.

**¿Por qué?** El operador necesita saber qué productos puede empacar en la siguiente caja de envío.

**Endpoint:** `GET /bodega-japon`

**Lógica clave — calcular disponible por SKU:**
```
disponible = compra.cant - unidades_en_cajas_activas - unidades_en_chile_stock
```
Solo muestra productos con disponible > 0. Incluye KPIs: SKUs disponibles, unidades, total ¥, total CLP estimado.

**Prioridad:** Alta

---

### TICKET-005: Boletas (CRUD)

**¿Qué hace?** Permite generar boletas a partir de productos seleccionados, con comisión configurable. También listar, ver detalle y eliminar boletas.

**¿Por qué?** Las boletas son el documento que registra la obligación de pago con el proveedor en Japón.

**Endpoints:**
- `GET /boletas` — listar todas
- `GET /boletas/:id` — detalle con líneas
- `POST /boletas` — generar desde productos seleccionados
- `DELETE /boletas/:id` — eliminar (solo si `sin_pagar`)

**Fórmulas:**
- `subtotalJPY = Σ(precioU × cant)`
- `totalJPY = subtotalJPY × (1 + comision/100)`
- `totalCLP = totalJPY / tc`
- ID formato: `BOL-YYYY-NNN`

**Prioridad:** Alta

---

### TICKET-006: Confirmar Pagos

**¿Qué hace?** Permite confirmar el pago de una boleta, lo que actualiza el estado de la boleta y de todas las compras relacionadas a "pagado".

**¿Por qué?** Necesitamos saber qué boletas ya se pagaron para los estados financieros y para que el operador sepa qué falta por pagar.

**Endpoint:** `POST /pagos/:boletaId/confirmar`

**Lógica (transacción atómica):**
1. Validar que la boleta está `sin_pagar`
2. `boleta.estado → 'pagado'`
3. Todas las compras de esa boleta: `compra.estado → 'pagado'`

**Prioridad:** Alta

---

### TICKET-007: Gastos Fijos Japón (GAV)

**¿Qué hace?** Muestra los gastos fijos mensuales de Japón (arriendo bodega ¥25.000 + app Beyblade ¥550) y permite generar la boleta GAV del mes.

**¿Por qué?** Estos gastos recurrentes deben registrarse cada mes para que aparezcan en el estado de resultados. Si no se genera la boleta antes del día 3, aparece una alerta.

**Endpoints:**
- `GET /gav-japon/historial` — últimos 6 meses + alerta
- `POST /gav-japon/generar` — generar boleta GAV del mes actual

**Reglas:** Solo una boleta GAV por mes. ID formato: `BOL-YYYY-GAV-NNN`.

**Prioridad:** Media

---

## Fase 3 — Sección Envíos

### TICKET-008: Cajas / Envíos (CRUD)

**¿Qué hace?** Permite crear cajas de envío seleccionando productos de la bodega Japón, con costos de flete, mano de obra y materiales. También editar y eliminar cajas.

**¿Por qué?** Las cajas son el vehículo que mueve productos de Japón a Chile. Cada caja tiene costos asociados que luego se distribuyen en el costeo.

**Endpoints:**
- `GET /cajas` — listar todas
- `POST /cajas` — crear caja con productos
- `PUT /cajas/:id` — editar (solo en estado `transito`)
- `DELETE /cajas/:id` — eliminar (solo `transito` o `llegada`)

**Reglas importantes:**
- Nombre de caja debe ser único
- Cantidad por producto ≤ disponible en bodega Japón
- Al crear: productos con disponible = 0 pasan a `bodega = 'transito'`
- Al eliminar: restaurar `compra.bodega` si corresponde
- Transacción atómica

**Prioridad:** Alta

---

### TICKET-009: Bodega Tránsito (solo lectura)

**¿Qué hace?** Muestra las cajas agrupadas por estado (tránsito, llegada, costeada) con KPIs.

**¿Por qué?** El operador de Chile necesita ver qué cajas vienen en camino y cuáles ya llegaron para hacer el costeo.

**Endpoint:** `GET /bodega-transito`

**Prioridad:** Media

---

### TICKET-010: Compras Web (CRUD)

**¿Qué hace?** Permite registrar pedidos de portales web (Amazon Japan, Amazon USA, Rakuten, etc.) con soporte multi-moneda.

**¿Por qué?** No todas las compras se hacen en tienda física — algunas vienen de portales online y necesitan tracking separado.

**Endpoints:**
- `GET /compras-web` — listar
- `POST /compras-web` — registrar pedido

**ID formato:** `WEB-NNN`

**Prioridad:** Media

---

### TICKET-011: Internación (aduanas)

**¿Qué hace?** Permite registrar el arancel CIF y el IVA pagado en aduana para cada caja que llega a Chile.

**¿Por qué?** Los costos de internación se necesitan para el costeo de productos y el IVA es crédito fiscal que aparece en el estado de resultados.

**Endpoints:**
- `GET /internacion` — cajas con estado de internación
- `PUT /internacion/:cajaId` — guardar arancel + IVA

**Prioridad:** Alta

---

### TICKET-012: Costeo de Cajas

**¿Qué hace?** Distribuye todos los costos de una caja (flete, MO, materiales, internación) entre sus productos para calcular el costo unitario en CLP de cada uno. Al confirmar, crea el stock en Chile.

**¿Por qué?** Sin costeo no sabemos cuánto nos costó cada producto en CLP, y no podemos calcular márgenes ni precios de venta.

**Endpoints:**
- `GET /costeo/cajas-disponibles` — cajas en estado `llegada`
- `POST /costeo/:cajaId/confirmar` — confirmar costeo

**Lógica de confirmación (transacción atómica):**
1. Validar que los porcentajes suman exactamente 100%
2. Calcular costo unitario por producto
3. Crear entradas en `chile_stock` con el costo calculado
4. Marcar caja como `costeada`
5. Actualizar `compra.bodega → 'chile'` si disponible = 0

**Fórmula costo unitario:**
```
costoUnit = (subtotalCLP × pct/100 + fleteCLP × pct/100 + moCLP × pct/100 + matCLP × pct/100 + internCLP × pct/100) / cant
```

**Prioridad:** Alta

---

## Fase 4 — Sección Chile

### TICKET-013: Bodega Chile + precio de venta

**¿Qué hace?** Muestra el inventario disponible para venta en Chile con costo unitario, precio de venta editable, y margen calculado.

**¿Por qué?** El operador de Chile necesita ver qué tiene para vender, a qué costo, y poder fijar precios con visibilidad del margen.

**Endpoints:**
- `GET /bodega-chile` — stock + KPIs (unidades, valor inventario, sin precio)
- `PUT /bodega-chile/:id/precio` — actualizar precio de venta

**Prioridad:** Alta

---

### TICKET-014: Ventas

**¿Qué hace?** Permite registrar ventas desde múltiples canales (Instagram, TikTok, Mercado Libre, Web, Local) y descuenta automáticamente del stock.

**¿Por qué?** Cada venta reduce el inventario y alimenta los estados financieros.

**Endpoints:**
- `GET /ventas` — listar
- `POST /ventas` — registrar venta

**Reglas:** `cant ≤ stock disponible`, `total = precioVenta × cant`, `costo` se toma del stock.

**Prioridad:** Alta

---

### TICKET-015: Compras Locales

**¿Qué hace?** Registra compras y gastos operacionales en Chile (productos locales, gastos varios). Si es factura, el IVA se marca como crédito fiscal.

**¿Por qué?** Los gastos locales afectan el flujo de caja y el estado de resultados.

**Endpoints:**
- `GET /compras-chile` — listar
- `POST /compras-chile` — registrar

**ID formato:** `CC-NNN`. Si `docTipo = 'factura'` → `ivaCredito = true`.

**Prioridad:** Media

---

### TICKET-016: Gastos Fijos Chile (GAV)

**¿Qué hace?** Gestiona los gastos fijos mensuales de Chile (arriendo, contador, POS, etc.) con comprobante obligatorio antes de confirmar.

**¿Por qué?** Solo los gastos confirmados (con comprobante) aparecen en el estado de resultados.

**Endpoints:**
- `GET /gav-chile` — listar
- `PUT /gav-chile/:id/confirmar` — confirmar (requiere `adjunto = true`)

**Prioridad:** Media

---

## Fase 5 — Finanzas (solo lectura, cálculos)

### TICKET-017: Estado de Resultados

**¿Qué hace?** Calcula y retorna el estado de resultados: ingresos por canal, costo de venta, margen bruto, GAV, EBIT, IVA crédito, resultado neto.

**¿Por qué?** El contador necesita ver la rentabilidad del negocio de importación.

**Endpoint:** `GET /eerr`

**Fórmula:**
```
Ingresos = Σ ventas
- Costo de Venta = Σ (costo × cant vendida)
= Margen Bruto
- GAV Japón (solo pagado) - GAV Chile (solo pagado)
= EBIT
+ IVA Crédito (internación + facturas locales)
= Resultado Neto
```

**Prioridad:** Media

---

### TICKET-018: Balance General

**¿Qué hace?** Calcula activos (caja + inventarios + IVA crédito), pasivos (boletas sin pagar), y patrimonio.

**Endpoint:** `GET /balance`

**Prioridad:** Media

---

### TICKET-019: Flujo de Caja

**¿Qué hace?** Calcula ingresos (ventas), egresos Japón (boletas pagadas), egresos Chile (GAV + compras locales pagadas), y flujo neto.

**Endpoint:** `GET /flujo`

**Prioridad:** Media

---

## Fase 6 — Principal

### TICKET-020: Dashboard

**¿Qué hace?** Retorna KPIs del negocio (productos en Japón, cajas en tránsito, unidades en Chile, boletas pendientes, ventas del mes, margen promedio) + alerta de GAV pendiente.

**Endpoint:** `GET /dashboard`

**Prioridad:** Media

---

### TICKET-021: Configuración

**¿Qué hace?** Permite leer y actualizar la configuración del sistema: métodos de pago, cuentas bancarias, y parámetros (arriendo, app, comisión).

**Endpoints:**
- `GET /config` — obtener
- `PUT /config` — actualizar

**Prioridad:** Baja

---

## Fase 7 — Integración

### TICKET-022: Montar todas las rutas en Express

**¿Qué hace?** Crea el router principal que monta los 19 sub-routers bajo `/api/shipments/`.

**Prioridad:** Alta (hacer cuando los endpoints estén listos)

---

### TICKET-023: Conectar frontend a API real

**¿Qué hace?** Reemplaza el mock data del frontend por llamadas reales al backend.

**¿Por qué?** Hoy el frontend funciona con datos ficticios en memoria. Este ticket lo conecta al backend real.

**Prioridad:** Alta (hacer al final)

---

### TICKET-024: Seed de datos iniciales

**¿Qué hace?** Carga datos iniciales en la base de datos: configuración por defecto, cuentas bancarias, métodos de pago, conceptos GAV Chile.

**Prioridad:** Baja

---

## Resumen

| # | Título | Fase | Prioridad |
|---|--------|------|-----------|
| 1 | Crear tablas Prisma | BD | Alta |
| 2 | Middleware de roles | BD | Alta |
| 3 | CRUD Compras (auto-SKU) | Japón | Alta |
| 4 | Bodega Japón (disponible) | Japón | Alta |
| 5 | CRUD Boletas (comisión) | Japón | Alta |
| 6 | Confirmar Pagos | Japón | Alta |
| 7 | GAV Japón (mensual) | Japón | Media |
| 8 | CRUD Cajas/Envíos | Envíos | Alta |
| 9 | Bodega Tránsito | Envíos | Media |
| 10 | Compras Web | Envíos | Media |
| 11 | Internación (aduanas) | Envíos | Alta |
| 12 | Costeo de Cajas | Envíos | Alta |
| 13 | Bodega Chile + precio | Chile | Alta |
| 14 | Ventas (multi-canal) | Chile | Alta |
| 15 | Compras Locales | Chile | Media |
| 16 | GAV Chile (comprobante) | Chile | Media |
| 17 | Estado de Resultados | Finanzas | Media |
| 18 | Balance General | Finanzas | Media |
| 19 | Flujo de Caja | Finanzas | Media |
| 20 | Dashboard (KPIs) | Principal | Media |
| 21 | Configuración | Principal | Baja |
| 22 | Montar rutas Express | Integración | Alta |
| 23 | Conectar frontend | Integración | Alta |
| 24 | Seed datos iniciales | Integración | Baja |

**Total: 24 tickets (13 alta + 9 media + 2 baja)**

---

## Orden sugerido

```
1. Tablas + Roles (TICKET 1-2)
2. Japón: Compras → Bodega → Boletas → Pagos → GAV (TICKET 3-7)
3. Envíos: Cajas → Tránsito → Web → Internación → Costeo (TICKET 8-12)
4. Chile: Bodega → Ventas → Compras Locales → GAV (TICKET 13-16)
5. Finanzas: EERR → Balance → Flujo (TICKET 17-19)
6. Principal: Dashboard → Config (TICKET 20-21)
7. Integración: Rutas → Frontend → Seed (TICKET 22-24)
```

---

## Para el dev backend

El frontend ya está implementado y usa mock data. Para ver exactamente qué datos espera cada módulo:
- **Tipos TypeScript:** `src/app/data/shipmentsMockData.ts`
- **Mutaciones/funciones:** `src/app/contexts/ShipmentsDataContext.tsx`
- **Spec API completa:** `reference/shipments-api-spec.md` (endpoints, request/response schemas, reglas de negocio)

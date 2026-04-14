# HobbyZamora — Panel de Administración

**Stack:** React + Vite + TypeScript  
**Backend:** Express + Prisma + SQLite  
**Ruta base:** `/admin/*`  
**Autenticación:** JWT con roles ADMIN/STAFF  
**POS:** `/pos` (módulo independiente)

---

## Tabla de contenidos

1. [Resumen general](#1-resumen-general)
2. [Arquitectura frontend](#2-arquitectura-frontend)
3. [Autenticación admin](#3-autenticación-admin)
4. [Páginas y rutas](#4-páginas-y-rutas)
5. [Dashboard — Panel de Ventas](#5-dashboard--panel-de-ventas)
6. [Productos](#6-productos)
7. [Pedidos](#7-pedidos)
8. [Clientes](#8-clientes)
9. [Inventario](#9-inventario)
10. [Agente de Instagram](#10-agente-de-instagram)
11. [Punto de Venta (POS)](#11-punto-de-venta-pos)
12. [Modelos de datos (Prisma)](#12-modelos-de-datos-prisma)
13. [API endpoints consumidos](#13-api-endpoints-consumidos)
14. [Design system y estilo](#14-design-system-y-estilo)

---

## 1. Resumen general

El panel de administración de HobbyZamora permite gestionar el catálogo de productos, pedidos, clientes, inventario y un agente de Instagram con IA. Incluye un módulo POS (Punto de Venta) independiente para ventas presenciales con soporte de pagos en efectivo, tarjeta (Getnet) y transferencia.

### Módulos disponibles

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Panel de Ventas | `/admin` | Dashboard con KPIs, gráfico de ventas, resumen por SKU |
| Productos | `/admin/products` | CRUD de productos, importación CSV, subida de imágenes ZIP |
| Preventas | `/admin/presales` | Gestión de productos en preventa (misma vista filtrada) |
| Pedidos | `/admin/orders` | Lista y detalle de pedidos, cambio de estado |
| Clientes | `/admin/customers` | Lista de clientes con búsqueda y estadísticas |
| Agente Instagram | `/admin/instagram` | Chat con clientes, takeover humano, inserción de productos |
| POS | `/pos` | Punto de venta presencial con búsqueda, carrito y pagos |

---

## 2. Arquitectura frontend

```
src/app/
├── components/
│   ├── layout/
│   │   ├── AdminLayout.tsx        # Layout: login gate + sidebar + content
│   │   └── AdminSidebar.tsx       # Sidebar colapsable con navegación
│   ├── admin/
│   │   ├── DashboardWidget.tsx    # Widget KPI reutilizable
│   │   ├── InventoryTable.tsx     # Tabla de lotes de inventario
│   │   ├── ProductEditor.tsx      # Editor de producto (crear/editar)
│   │   └── SalesChart.tsx         # Gráfico de ventas (línea temporal)
│   ├── instagram/
│   │   ├── ChatInterface.tsx      # Interfaz de chat con mensajes
│   │   ├── ConversationList.tsx   # Lista de conversaciones
│   │   └── ProductQuickInsert.tsx # Inserción rápida de productos en chat
│   └── pos/
│       ├── POSCart.tsx            # Carrito del POS
│       ├── POSProductGrid.tsx    # Grid de productos para POS
│       └── PaymentSelector.tsx   # Selector de método de pago
├── contexts/
│   └── AdminAuthContext.tsx       # Autenticación admin (JWT separado)
├── pages/
│   ├── admin/
│   │   ├── DashboardPage.tsx      # Panel de ventas con KPIs y gráfico
│   │   ├── ProductsPage.tsx       # Gestión de productos
│   │   ├── AdminProductDetailPage.tsx # Detalle de producto (vista admin)
│   │   ├── OrdersPage.tsx         # Lista de pedidos
│   │   ├── OrderDetailPage.tsx    # Detalle de pedido con cambio de estado
│   │   ├── CustomersPage.tsx      # Lista de clientes
│   │   ├── InventoryPage.tsx      # Gestión de inventario por lotes
│   │   ├── InstagramAgentPage.tsx # Agente de Instagram
│   │   ├── InstagramHealthPage.tsx # Health check del agente
│   │   └── PresalesPage.tsx       # Preventas (reutiliza ProductsPage)
│   └── pos/
│       └── POSPage.tsx            # Punto de venta completo
└── hooks/
    └── useData.ts                 # Hooks: useDashboardStats, useOrders, useProducts, etc.
```

---

## 3. Autenticación admin

**Contexto:** `AdminAuthContext.tsx`  
**Token:** JWT almacenado en `localStorage` key `adminToken` (separado del token de cliente)  
**Roles permitidos:** `ADMIN`, `STAFF`

### Flujo

1. Al acceder a `/admin/*`, `AdminLayout` verifica si hay token válido
2. Si no hay token o el rol no es ADMIN/STAFF, muestra formulario de login
3. Login via `POST /api/auth/login`, valida rol antes de guardar token
4. Logout limpia `adminToken` de localStorage

### AdminLayout

```tsx
<div className="flex h-screen bg-background overflow-hidden">
  <AdminSidebar />
  <main className="flex-1 overflow-y-auto">
    <div className="max-w-7xl mx-auto p-6">
      {children}
    </div>
  </main>
</div>
```

### AdminSidebar

Sidebar colapsable con 6 items de navegación:
- Panel (LayoutDashboard)
- Productos (Package)
- Pedidos (ShoppingBag)
- Preventas (Clock)
- Clientes (Users)
- Agente Instagram (Instagram)

Footer: Ver Tienda, Configuración, Cerrar Sesión.

---

## 4. Páginas y rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/admin` | DashboardPage | Panel de ventas con KPIs |
| `/admin/products` | ProductsPage | Gestión de productos |
| `/admin/presales` | ProductsPage (filtrada) | Productos en preventa |
| `/admin/store/product/:id` | AdminProductDetailPage | Detalle de producto |
| `/admin/orders` | OrdersPage | Lista de pedidos |
| `/admin/orders/:id` | OrderDetailPage | Detalle de pedido |
| `/admin/customers` | CustomersPage | Lista de clientes |
| `/admin/instagram` | InstagramAgentPage | Chat del agente IA |
| `/admin/instagram-chat/health` | InstagramHealthPage | Health check |
| `/pos` | POSPage | Punto de venta |

---

## 5. Dashboard — Panel de Ventas

### KPIs principales

| KPI | Cálculo |
|-----|---------|
| Ventas | Suma de `order.total` (excluye cancelados/reembolsados) |
| Costos | Suma de `item.cost × item.quantity` por orden |
| Margen | Ventas − Costos |
| Margen % | `(Margen / Ventas) × 100` |
| N° de órdenes | Conteo de órdenes válidas |

### Filtros de fecha

- Presets: Hoy, 7 días, 30 días
- Rango personalizado con date pickers
- Los KPIs y tablas se recalculan según el rango seleccionado

### Resumen por SKU

Tabla con: SKU, Producto, Unidades vendidas, Venta total, Costo total, Margen. Ordenado por revenue descendente.

### Detalle de ventas

Lista expandible de órdenes con:
- Número de orden, estado (badge), fuente (ONLINE/POS/INSTAGRAM)
- Cliente, fecha
- Total y margen por orden
- Al expandir: tabla de items con SKU, producto, cantidad, precio, costo, subtotal

### Gráfico de ventas

Componente `SalesChart` que muestra ventas en el tiempo (línea).

---

## 6. Productos

### Funcionalidades

- **Tabla** con columnas: Producto (imagen + nombre), SKU, Categoría, Precio, Stock, Estado, Acciones
- **Filtros:** Búsqueda por texto, estado (Activos/Desactivados/Ocultos/Todos)
- **Acciones por producto:** Ver, Editar, Ocultar/Mostrar, Desactivar
- **Crear producto:** Modal con `ProductEditor` (nombre, SKU, categoría, precio, costo, stock, imágenes, descripción, variantes)
- **Importar CSV:** Parseo client-side con soporte de comillas y BOM, envío al backend
- **Plantilla CSV:** Descarga de template con headers correctos
- **Subir imágenes ZIP:** Upload de archivo ZIP con imágenes que se asocian a productos por SKU
- **Vista de preventas:** Misma página filtrada por `isPresale: true`

### Estados de producto

| Estado | Badge | Visible en tienda |
|--------|-------|:-----------------:|
| ACTIVE | Verde (Activo) | Sí |
| HIDDEN | Azul (Oculto) | No |
| ARCHIVED | Gris (Desactivado) | No |
| DRAFT | Naranja (Borrador) | No |

### AdminProductDetailPage

Vista de detalle desde el admin con:
- Galería de imágenes
- Info de preventa si aplica
- Selector de variantes
- Botón "Crear Orden" (crea orden directamente desde admin)
- Banner de advertencia si el producto no está activo

---

## 7. Pedidos

### OrdersPage

- **Tabla:** Pedido, Cliente, Fecha, Artículos, Total, Estado, Acciones
- **Filtros:** Búsqueda (número, nombre, email), estado (todos/pendiente/procesando/enviado/entregado/cancelado)
- **Stats:** 4 cards con conteo por estado (Pendiente, Procesando, Enviado, Entregado)
- **Exportar CSV:** Descarga de pedidos filtrados

### OrderDetailPage

- **Items:** Tabla con imagen, nombre, SKU, variante, precio × cantidad, subtotal
- **Totales:** Neto, IVA débito (19%), envío, descuento, total
- **Pagos:** Lista de pagos con método, estado (badge), monto, fecha
- **Cliente:** Nombre, email, teléfono
- **Actualizar estado:** Botones para cambiar entre PENDING → PROCESSING → SHIPPED → DELIVERED → CANCELLED

### Estados de pedido

| Estado | Badge | Descripción |
|--------|-------|-------------|
| PENDING | Default | Recién creado, pago pendiente |
| PROCESSING | Warning | Pago confirmado, preparando |
| SHIPPED | Info | Enviado al cliente |
| DELIVERED | Success | Entregado |
| CANCELLED | Danger | Cancelado |
| REFUNDED | Danger | Reembolsado |

### Fuentes de pedido

| Fuente | Descripción |
|--------|-------------|
| ONLINE | Tienda web |
| POS | Punto de venta presencial |
| INSTAGRAM | Agente de Instagram |

---

## 8. Clientes

- **Tabla:** Cliente (avatar + nombre + email), Pedidos, Total Gastado, Miembro Desde
- **Búsqueda:** Por nombre o email (debounce 300ms)
- **Stats:** Total clientes, Gasto total, Gasto promedio
- **Paginación:** Server-side, 50 por página

---

## 9. Inventario

### Gestión por lotes (FIFO)

- **Tabla de lotes:** Producto, SKU, Código de lote, Cantidad, Restante, Costo unitario, Fecha
- **Agregar lote:** Modal con selector de producto, cantidad, costo unitario
- **Importar CSV:** Formato `sku,quantity,unitCost`
- **Exportar CSV:** Descarga de todos los lotes
- **Stats:** Valor total del inventario, Total de artículos, Alertas de stock bajo

### Modelo de inventario

Cada producto puede tener múltiples `InventoryBatch` (lotes). Cada lote tiene:
- `batchCode` — Código identificador
- `quantity` — Cantidad original
- `remaining` — Cantidad restante
- `unitCost` — Costo unitario de ese lote

Los movimientos se registran en `InventoryMovement` con tipo (RECEIVE, SALE, ADJUSTMENT) y referencia.

---

## 10. Agente de Instagram

### Funcionalidades

- **Lista de conversaciones:** Sidebar con nombre del cliente, último mensaje, estado (bot/humano)
- **Chat:** Interfaz de mensajes con sender (customer/bot/human), contenido, timestamp
- **Enviar mensaje:** Input de texto para responder como humano
- **Takeover:** Botón para tomar control de la conversación (desactiva el bot)
- **Inserción de productos:** Panel lateral con búsqueda de productos, al hacer clic genera mensaje con nombre, precio y stock
- **Estado del agente:** Card con indicadores: activo, tiempo de respuesta, conversaciones del día, tasa de conversión

### Modelo de datos

- `InstagramConversation`: id, instagramUserId, customerName, profilePicUrl, status, isBot, lastMessageAt
- `InstagramMessage`: id, conversationId, sender (CUSTOMER/BOT/HUMAN), content, productId?, createdAt

---

## 11. Punto de Venta (POS)

**Ruta:** `/pos`  
**Layout:** Independiente (no usa AdminLayout)

### Estructura

```
┌─────────────────────────────────────────────┐
│ Header: Logo + "HobbyZamora POS" + [Volver] │
│ [Asociar Cliente]                            │
├──────────────────────┬──────────────────────┤
│ Búsqueda + Escanear  │                      │
│                      │     POSCart           │
│   POSProductGrid     │  (items, total,      │
│   (grid de productos)│   checkout, limpiar) │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

### Flujo de venta

1. Buscar producto por nombre o escanear código de barras
2. Click en producto para agregar al carrito (cantidad editable)
3. Opcionalmente asociar un cliente (búsqueda o crear nuevo)
4. Click "Cobrar" → Modal de método de pago
5. Seleccionar: Efectivo (con cálculo de vuelto), Tarjeta (Getnet), Transferencia
6. Confirmar → Se crea la orden via `POST /api/pos/sale`

### Métodos de pago

| Método | Flujo |
|--------|-------|
| Efectivo | Input de monto recibido → cálculo de vuelto → confirmación |
| Tarjeta | Crea orden → obtiene `checkoutUrl` de Getnet → abre en nueva pestaña → verificar estado |
| Transferencia | Confirmación directa |

### Preventas en POS

- Si un producto es preventa y no hay cliente asociado, se abre el modal de cliente automáticamente
- El producto se agrega al carrito solo después de asociar un cliente

### Asociación de cliente

- Búsqueda por nombre, email o teléfono
- Crear nuevo cliente inline (nombre requerido, email y teléfono opcionales)
- El cliente se puede desasociar con el botón X

---

## 12. Modelos de datos (Prisma)

### Principales

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| User | `users` | Usuarios (clientes y admins) |
| Product | `products` | Catálogo de productos |
| ProductVariant | `product_variants` | Variantes de producto |
| Order | `orders` | Pedidos |
| OrderItem | `order_items` | Items de pedido |
| Payment | `payments` | Pagos (Getnet) |
| InventoryBatch | `inventory_batches` | Lotes de inventario |
| InventoryMovement | `inventory_movements` | Movimientos de inventario |
| Cart / CartItem | `carts` / `cart_items` | Carrito server-side |
| InstagramConversation | `instagram_conversations` | Conversaciones IG |
| InstagramMessage | `instagram_messages` | Mensajes IG |
| Wishlist | `wishlists` | Favoritos |
| AuditLog | `audit_logs` | Log de auditoría |
| DailyStat | `daily_stats` | Estadísticas diarias |
| Address | `addresses` | Direcciones de envío |

### Relaciones clave

- `User` → `Order[]`, `Cart`, `Address[]`, `Wishlist[]`
- `Product` → `ProductVariant[]`, `InventoryBatch[]`, `OrderItem[]`, `Wishlist[]`
- `Order` → `OrderItem[]`, `Payment[]`
- `InventoryBatch` → `InventoryMovement[]`

---

## 13. API endpoints consumidos

### Productos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar (con filtros status, search) |
| GET | `/api/products/:id` | Detalle público |
| GET | `/api/products/:id/admin` | Detalle admin (incluye cost) |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/:id` | Actualizar producto |
| POST | `/api/products/import` | Importar CSV |
| POST | `/api/products/upload-image` | Subir imagen individual |
| POST | `/api/products/upload-images` | Subir ZIP de imágenes |

### Pedidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/orders` | Listar (con filtros) |
| GET | `/api/orders/:id` | Detalle |
| POST | `/api/orders` | Crear orden |
| PUT | `/api/orders/:id/status` | Actualizar estado |

### Inventario

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inventory` | Listar lotes |
| POST | `/api/inventory/receive` | Recibir lote |
| POST | `/api/inventory/import` | Importar CSV |

### POS

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/pos/products` | Productos para POS (con búsqueda) |
| POST | `/api/pos/sale` | Crear venta POS |

### Pagos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/payments/checkout` | Iniciar pago Getnet |
| POST | `/api/payments/query` | Consultar estado |

### Dashboard

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | KPIs con rango de fechas |
| GET | `/api/dashboard/chart` | Datos para gráfico de ventas |

### Instagram

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/instagram/conversations` | Listar conversaciones |
| GET | `/api/instagram/conversations/:id/messages` | Mensajes de conversación |
| POST | `/api/instagram/conversations/:id/messages` | Enviar mensaje |
| POST | `/api/instagram/conversations/:id/takeover` | Tomar control |

### Clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/customers` | Listar (con búsqueda y paginación) |

---

## 14. Design system y estilo

- **Tema:** Dark mode, mismos tokens CSS que la tienda
- **Layout:** Sidebar colapsable (64px/256px) + área de contenido con max-width 7xl
- **Componentes:** Button, Card, Badge, Modal, Table, Input, Select, Dropdown, DashboardWidget, EmptyState
- **Fuentes:** `font-body` (Outfit) para texto, `font-mono` (JetBrains Mono) para precios/SKUs/números
- **Colores de estado:** Success (#00E676), Warning (#FFAB00), Danger (destructive), Info (accent/cyan), Primary (dorado)
- **Sin glow en admin:** El admin no usa efectos glow como la tienda
- **Responsive:** Desktop-first para admin, mobile-friendly para POS

---

*Documentación de contexto para HobbyZamora Panel de Administración · [www.hobbyzamora.cl](https://www.hobbyzamora.cl)*

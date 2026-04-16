# HobbyZamora — Tienda Online (Storefront)

**Stack:** React + Vite + TypeScript  
**Backend:** Express + Prisma + SQLite  
**Pagos:** Getnet (tarjeta crédito/débito)  
**Ruta base:** `/` y `/store/*`

---

## Tabla de contenidos

1. [Resumen general](#1-resumen-general)
2. [Arquitectura frontend](#2-arquitectura-frontend)
3. [Páginas y rutas](#3-páginas-y-rutas)
4. [Componentes clave](#4-componentes-clave)
5. [Autenticación de clientes](#5-autenticación-de-clientes)
6. [Carrito de compras](#6-carrito-de-compras)
7. [Flujo de checkout](#7-flujo-de-checkout)
8. [Catálogo de productos](#8-catálogo-de-productos)
9. [Preventas](#9-preventas)
10. [Favoritos (Wishlist)](#10-favoritos-wishlist)
11. [Modelos de datos (Prisma)](#11-modelos-de-datos-prisma)
12. [API endpoints consumidos](#12-api-endpoints-consumidos)
13. [Design system y estilo](#13-design-system-y-estilo)

---

## 1. Resumen general

La tienda online de HobbyZamora es un e-commerce de coleccionables japoneses (Pokémon TCG, Beyblade X, Figuarts, Nintendo, Tomica) orientado al mercado chileno. Los clientes pueden navegar el catálogo, filtrar por categoría, agregar productos al carrito, hacer checkout con tarjeta vía Getnet, gestionar su cuenta (perfil, pedidos, favoritos) y acceder a preventas exclusivas.

### Categorías de productos

| Categoría | Slug URL |
|-----------|----------|
| Pokémon TCG | `pokemon-tcg` |
| Beyblade X | `beyblade-x` |
| Pokémon Merch | `pokemon-merch` |
| Autos Tomy Tomica | `tomica` |
| Figuarts | `figuarts` |
| Nintendo | `nintendo` |
| Coleccionables Varios | `coleccionables` |

---

## 2. Arquitectura frontend

```
src/app/
├── components/
│   ├── layout/
│   │   ├── StoreLayout.tsx        # Layout: Navbar + main + footer + ChatWidget
│   │   └── StoreNavbar.tsx        # Navbar sticky con búsqueda, logo, carrito, cuenta
│   ├── store/
│   │   ├── ProductCard.tsx        # Card de producto para grids y carruseles
│   │   ├── CartPanel.tsx          # Panel de items del carrito
│   │   ├── CheckoutSummary.tsx    # Resumen lateral en checkout
│   │   └── VariantSelector.tsx    # Selector de variantes de producto
│   ├── auth/
│   │   ├── AuthModal.tsx          # Modal login/registro
│   │   └── RequireAuth.tsx        # HOC que exige autenticación
│   ├── chat/
│   │   └── ChatWidget.tsx         # Widget de chat flotante
│   └── design-system/            # Componentes reutilizables (Button, Card, Modal, etc.)
├── contexts/
│   ├── AuthContext.tsx            # Autenticación de clientes (JWT)
│   └── AdminAuthContext.tsx       # Autenticación admin (separada)
├── pages/store/
│   ├── HomePage.tsx               # Landing con hero slider, destacados, preventas, novedades
│   ├── ProductListingPage.tsx     # Catálogo con filtros y búsqueda
│   ├── ProductDetailPage.tsx      # Detalle de producto con galería, variantes, favoritos
│   ├── CartPage.tsx               # Página del carrito
│   ├── CheckoutPage.tsx           # Checkout multi-paso (envío → pago → revisión)
│   ├── OrderConfirmationPage.tsx  # Confirmación post-pago con polling de estado
│   ├── AccountPage.tsx            # Mi Cuenta: perfil, pedidos, favoritos
│   ├── PresalesPage.tsx           # Preventas (requiere login)
│   └── ResetPasswordPage.tsx      # Restablecer contraseña con token
├── hooks/
│   └── useData.ts                 # Hooks de data fetching (useProducts, useOrders, etc.)
├── lib/
│   ├── api.ts                     # Cliente API REST
│   └── store.ts                   # Zustand store (carrito client-side)
└── data/
    └── mockData.ts                # Datos mock de fallback
```

### Providers

```tsx
<AuthProvider>           {/* Autenticación de clientes */}
  <AdminAuthProvider>    {/* Autenticación admin (independiente) */}
    <RouterProvider />
  </AdminAuthProvider>
</AuthProvider>
```

---

## 3. Páginas y rutas

| Ruta | Página | Auth requerida |
|------|--------|:--------------:|
| `/` | HomePage | No |
| `/store` | HomePage | No |
| `/store/products` | ProductListingPage | No |
| `/store/products?category=X` | ProductListingPage (filtrada) | No |
| `/store/presales` | PresalesPage | Sí |
| `/store/product/:id` | ProductDetailPage | No |
| `/store/cart` | CartPage | No |
| `/store/checkout` | CheckoutPage | Sí |
| `/store/order-confirmation?orderId=X` | OrderConfirmationPage | No |
| `/store/account` | AccountPage | Sí |
| `/reset-password?token=X` | ResetPasswordPage | No |

---

## 4. Componentes clave

### StoreLayout

Envuelve todas las páginas de la tienda:
- `StoreNavbar` (sticky, con búsqueda, logo centrado, carrito, cuenta)
- Barra de categorías (desktop)
- Menú hamburguesa (mobile)
- Footer con links y redes sociales
- `ChatWidget` flotante

### StoreNavbar

- Búsqueda de productos (input con icono Search)
- Logo centrado con link a `/`
- Carrito con badge de cantidad (Zustand store)
- Icono de cuenta (link a `/store/account`)
- Barra de categorías: 7 categorías + Preventas (con estrella dorada)
- Menú mobile colapsable

### ProductCard

Card reutilizable para mostrar productos en grids y carruseles. Muestra imagen, nombre, precio en CLP, badge de preventa si aplica.

---

## 5. Autenticación de clientes

**Contexto:** `AuthContext.tsx`  
**Token:** JWT almacenado en `localStorage` key `token`  
**API base:** `/api/auth/*`

### Funciones disponibles

| Función | Endpoint | Descripción |
|---------|----------|-------------|
| `login(email, password)` | `POST /api/auth/login` | Login con email/password |
| `register(email, password, name, phone?)` | `POST /api/auth/register` | Registro de nuevo cliente |
| `googleLogin(credential)` | `POST /api/auth/google` | Login con Google |
| `logout()` | — | Limpia token de localStorage |
| `updateProfile({name, phone})` | `PUT /api/auth/profile` | Actualizar perfil |
| `uploadAvatar(file)` | `POST /api/auth/avatar` | Subir foto de perfil |
| `getMe()` | `GET /api/auth/me` | Obtener usuario actual |
| `resetPassword(token, password)` | `POST /api/auth/reset-password` | Restablecer contraseña |

### Roles

| Rol | Acceso |
|-----|--------|
| `CUSTOMER` | Tienda, cuenta, checkout |
| `STAFF` | Tienda + Admin |
| `ADMIN` | Tienda + Admin + Config |

---

## 6. Carrito de compras

**Store:** Zustand (`src/app/lib/store.ts`)  
**Persistencia:** Client-side (Zustand persist)

### Funciones del store

- `addItem(product, quantity)` — Agrega producto al carrito
- `updateQuantity(id, quantity)` — Actualiza cantidad
- `removeItem(id)` — Elimina item
- `clearCart()` — Vacía el carrito
- `getItemCount()` — Total de items
- `getSubtotal()` — Subtotal en CLP

### Estructura de un item

```typescript
interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
  variantId?: string;
}
```

---

## 7. Flujo de checkout

### Pasos

1. **Envío** — Formulario con: nombre, apellido, email, teléfono, dirección, ciudad, estado, código postal, país
2. **Pago** — Selección de método: tarjeta de crédito o débito (procesado por Getnet)
3. **Revisión** — Resumen del pedido con opción de editar dirección o método de pago

### Proceso de pago

1. Se crea la orden via `POST /api/orders`
2. Se inicia el pago via `POST /api/payments/checkout`
3. Si Getnet devuelve `checkoutUrl`, se redirige al usuario
4. Al volver, `OrderConfirmationPage` hace polling del estado del pago cada 5 segundos (máx 60s)
5. Si el pago es `APPROVED`, se limpia el carrito y se muestra confirmación
6. Si es `DECLINED`, se ofrece reintentar

### Validaciones de envío

- Todos los campos marcados con `*` son requeridos
- Email debe tener formato válido
- Errores se muestran inline bajo cada campo

---

## 8. Catálogo de productos

### ProductListingPage

- Búsqueda por texto (nombre)
- Filtro por categoría (URL param `?category=slug`)
- Ordenamiento: Destacados, Precio menor/mayor, Nombre A-Z
- Grid responsive: 1 col (mobile), 2 col (tablet), 4 col (desktop)
- Contador de resultados

### ProductDetailPage

- Galería de imágenes con thumbnails
- Selector de variantes (si el producto tiene)
- Selector de cantidad con +/- y input numérico
- Botones: "Agregar al Carrito" y "Comprar Ahora"
- Favoritos (corazón, requiere login)
- Compartir producto (Web Share API o clipboard)
- Alerta de stock bajo (< 10 unidades)
- Info de preventa si aplica
- Breadcrumb: Inicio > Productos > [Nombre]
- Detalles: SKU, categoría, disponibilidad

---

## 9. Preventas

- Acceso exclusivo para usuarios autenticados
- Si no está logueado, se muestra un card con candado invitando a iniciar sesión
- Productos marcados con `isPresale: true` en la base de datos
- Datos adicionales: `presaleMaxQty`, `presaleAvailQty`, `presaleEndDate`
- Badge "Preventa" en cards y detalle
- Ruta: `/store/presales`

---

## 10. Favoritos (Wishlist)

- Requiere autenticación
- Botón de corazón en ProductDetailPage
- Lista de favoritos en AccountPage
- API: `GET /api/wishlist`, `POST /api/wishlist/:productId`, `DELETE /api/wishlist/:productId`, `GET /api/wishlist/check/:productId`

---

## 11. Modelos de datos (Prisma)

### User
- `id`, `email` (unique), `password`, `name`, `role` (CUSTOMER/STAFF/ADMIN), `phone?`, `avatarUrl?`
- `resetToken?`, `resetTokenExpires?`
- Relaciones: orders, cart, addresses, wishlist

### Product
- `id`, `sku` (unique), `name`, `description?`, `category`, `price`, `cost`, `stock`, `images` (JSON string), `status` (ACTIVE/ARCHIVED/HIDDEN)
- `ean?` (barcode), `isPresale`, `presaleMaxQty?`, `presaleAvailQty?`, `presaleEndDate?`
- Relaciones: variants, inventoryBatches, orderItems, cartItems, wishlists

### Order
- `id`, `orderNumber` (unique), `userId?`, `customerName`, `customerEmail`, `customerPhone?`
- Dirección de envío: `shippingStreet`, `shippingCity`, `shippingState`, `shippingZip`, `shippingCountry`
- Totales: `subtotal`, `tax`, `shipping`, `discount`, `total`
- `status` (PENDING/PROCESSING/SHIPPED/DELIVERED/CANCELLED/REFUNDED)
- `source` (ONLINE/POS/INSTAGRAM)
- Relaciones: items, payments

### Payment
- `id`, `orderId`, `method`, `status` (PENDING/APPROVED/DECLINED), `amount`
- Getnet: `getnetPaymentId?`, `getnetOrderId?`, `getnetCheckoutUrl?`
- `cardLast4?`, `cardBrand?`, `paidAt?`

---

## 12. API endpoints consumidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos (con filtros) |
| GET | `/api/products/:id` | Detalle de producto |
| POST | `/api/orders` | Crear orden |
| GET | `/api/orders/mine` | Mis pedidos |
| GET | `/api/orders/:id` | Detalle de orden |
| POST | `/api/payments/checkout` | Iniciar pago Getnet |
| POST | `/api/payments/query` | Consultar estado de pago |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| GET | `/api/auth/me` | Usuario actual |
| PUT | `/api/auth/profile` | Actualizar perfil |
| POST | `/api/auth/avatar` | Subir avatar |
| POST | `/api/auth/reset-password` | Restablecer contraseña |
| GET | `/api/wishlist` | Listar favoritos |
| POST | `/api/wishlist/:productId` | Agregar favorito |
| DELETE | `/api/wishlist/:productId` | Quitar favorito |
| GET | `/api/wishlist/check/:productId` | Verificar si es favorito |

---

## 13. Design system y estilo

- **Tema:** Dark mode por defecto, colores definidos en CSS variables (`--primary`, `--accent`, etc.)
- **Primary:** Dorado/amarillo (`#FFD60A` aprox.)
- **Accent:** Cyan (`#00D4FF` aprox.)
- **Success:** Verde (`#00E676`)
- **Fuentes:** `--font-body` (Outfit), `--font-mono` (JetBrains Mono), `--font-display` (pixel font para títulos)
- **Precios:** Siempre en CLP con formato `es-CL`, usando `font-mono` y `text-primary`
- **Componentes reutilizados:** Button, Card, Badge, Modal, Input, HeroSlider, ProductCard, EmptyState
- **Efectos:** Glow sutil en cards destacadas (`shadow-[0_0_*]`), backdrop-blur en navbar
- **Responsive:** Mobile-first, breakpoints sm/md/lg/xl

---

*Documentación de contexto para HobbyZamora Tienda Online · [www.hobbyzamora.cl](https://www.hobbyzamora.cl)*

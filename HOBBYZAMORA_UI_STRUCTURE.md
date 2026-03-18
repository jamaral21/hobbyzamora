# HobbyZamora - Commerce Platform UI

**Tienda de coleccionables** — Pokémon TCG, Beyblade X, figuras y más.

## Stack

- **React 18** + TypeScript + Vite 6
- **Tailwind CSS v4** (via @tailwindcss/vite)
- **Radix UI** primitivos (shadcn/ui pattern)
- **React Router v7** para navegación
- **Zustand** para state management (cart stores)
- **Recharts** para analytics
- **Lucide React** para iconos
- **Motion** para animaciones
- **Sonner** para toast notifications
- **Prisma** ORM con PostgreSQL (Docker) o SQLite

> Para detalles del design system (colores, tipografía, componentes), ver **DESIGN_SYSTEM.md**.

## Estructura del Proyecto

```
src/
├── main.tsx
├── vite-env.d.ts
├── styles/
│   ├── fonts.css              # Google Fonts (Press Start 2P, Outfit, JetBrains Mono)
│   ├── tailwind.css           # Tailwind v4 config
│   ├── theme.css              # CSS variables, dark mode, base typography
│   └── index.css              # Importa fonts → tailwind → theme
└── app/
    ├── App.tsx
    ├── routes.tsx             # Todas las rutas
    ├── components/
    │   ├── design-system/     # Componentes custom del design system
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Input.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Table.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Dropdown.tsx
    │   │   ├── Switch.tsx
    │   │   ├── EmptyState.tsx
    │   │   └── ProductCard.tsx
    │   ├── ui/                # Primitivos Radix/shadcn (NO modificar)
    │   ├── layout/
    │   │   ├── StoreNavbar.tsx
    │   │   ├── StoreLayout.tsx
    │   │   ├── AdminSidebar.tsx
    │   │   └── AdminLayout.tsx
    │   ├── store/             # Componentes de la tienda
    │   │   ├── ProductCard.tsx
    │   │   ├── CartPanel.tsx
    │   │   ├── CheckoutSummary.tsx
    │   │   └── VariantSelector.tsx
    │   ├── admin/             # Componentes del admin
    │   │   ├── DashboardWidget.tsx
    │   │   ├── SalesChart.tsx
    │   │   ├── InventoryTable.tsx
    │   │   └── ProductEditor.tsx
    │   ├── pos/               # Componentes del POS
    │   │   ├── POSCart.tsx
    │   │   ├── POSProductGrid.tsx
    │   │   └── PaymentSelector.tsx
    │   ├── instagram/         # Componentes del agente Instagram
    │   │   ├── ConversationList.tsx
    │   │   ├── ChatInterface.tsx
    │   │   └── ProductQuickInsert.tsx
    │   ├── auth/
    │   └── figma/
    ├── pages/
    │   ├── store/             # Páginas customer-facing
    │   │   ├── HomePage.tsx
    │   │   ├── ProductListingPage.tsx
    │   │   ├── ProductDetailPage.tsx
    │   │   ├── CartPage.tsx
    │   │   ├── CheckoutPage.tsx
    │   │   ├── OrderConfirmationPage.tsx
    │   │   ├── AccountPage.tsx
    │   │   └── PresalesPage.tsx
    │   ├── admin/             # Páginas del dashboard
    │   │   ├── DashboardPage.tsx
    │   │   ├── ProductsPage.tsx
    │   │   ├── OrdersPage.tsx
    │   │   ├── OrderDetailPage.tsx
    │   │   ├── CustomersPage.tsx
    │   │   └── InstagramAgentPage.tsx
    │   └── pos/
    │       └── POSPage.tsx
    ├── contexts/
    │   └── AuthContext.tsx
    ├── hooks/
    │   └── useData.ts
    ├── lib/
    │   ├── api.ts             # API client + interfaces TypeScript
    │   └── store.ts           # Zustand stores (useCartStore, usePOSCartStore)
    └── data/
        └── mockData.ts        # Mock data para desarrollo
```

## Rutas

### Tienda (Customer)
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | HomePage | Landing principal |
| `/store` | HomePage | Alias de home |
| `/store/products` | ProductListingPage | Catálogo de productos |
| `/store/product/:id` | ProductDetailPage | Detalle de producto |
| `/store/presales` | PresalesPage | Productos en preventa |
| `/store/cart` | CartPage | Carrito de compras |
| `/store/checkout` | CheckoutPage | Proceso de checkout |
| `/store/order-confirmation` | OrderConfirmationPage | Confirmación de orden |
| `/store/account` | AccountPage | Cuenta del usuario |

### Admin Dashboard
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/admin` | DashboardPage | Overview con métricas |
| `/admin/products` | ProductsPage | Gestión de productos |
| `/admin/orders` | OrdersPage | Gestión de órdenes |
| `/admin/orders/:id` | OrderDetailPage | Detalle de orden |
| `/admin/customers` | CustomersPage | Gestión de clientes |
| `/admin/instagram` | InstagramAgentPage | Agente de Instagram |

### POS
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/pos` | POSPage | Punto de venta (tablet-friendly) |

## Integración con API

### API Client

Todas las llamadas van a través de `fetchAPI<T>()` en `src/app/lib/api.ts`:

```typescript
import { fetchAPI } from '../lib/api';

// GET
const products = await fetchAPI<Product[]>('/products');

// POST
const order = await fetchAPI<Order>('/orders', {
  method: 'POST',
  body: JSON.stringify(orderData),
});
```

El backend corre en puerto 3001, Vite proxea `/api` automáticamente en dev.

### Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos |
| GET | `/api/products/:id` | Detalle de producto |
| POST | `/api/cart/items` | Agregar al carrito |
| PATCH | `/api/cart/items/:id` | Actualizar cantidad |
| DELETE | `/api/cart/items/:id` | Eliminar del carrito |
| POST | `/api/orders` | Crear orden |
| GET | `/api/orders` | Listar órdenes |
| GET | `/api/orders/:id` | Detalle de orden |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| GET | `/api/health` | Health check |

### State Management

- **Zustand** con persist middleware para el carrito (`useCartStore`, `usePOSCartStore`)
- **React Context** para autenticación (`AuthContext`)
- **Local state** (`useState`) para estado de componentes
- **`useData` hook** para patrones de data fetching

## Responsive Design

Breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

Patrones:
```jsx
// Grids adaptativos
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"

// Sidebar colapsa en mobile
// POS optimizado para tablet (botones touch-friendly)
```

## Dark Mode

El tema es dark-first. El modo oscuro es el default. Se usa la clase `.dark` y las variables CSS del tema:

```jsx
// Usar tokens semánticos, NO hardcodear colores
className="bg-background text-foreground"    // ✅
className="bg-[#0a0a0f] text-[#e8e6f0]"     // ❌
```

## Interfaces TypeScript

Definidas en `src/app/lib/api.ts`:

- `Product` — Producto con variantes, stock, presale
- `ProductVariant` — Variante de producto
- `Order` — Orden con items y pagos
- `OrderItem` — Item de una orden
- `Payment` — Pago (Getnet/PlacetoPay)
- `CartItem` — Item del carrito
- `Cart` — Carrito completo
- `Customer` — Cliente
- `DashboardStats` — Métricas del dashboard
- `InstagramConversation` — Conversación de Instagram
- `InstagramMessage` — Mensaje de Instagram
- `InventoryItem` / `InventoryBatch` — Inventario FIFO
- `User` — Usuario autenticado

## Crear una nueva página

```tsx
// 1. Crear el archivo en src/app/pages/{section}/
import { StoreLayout } from '../../components/layout/StoreLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';

export default function MiNuevaPagina() {
  return (
    <StoreLayout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-primary mb-4">MI SECCIÓN</h2>
        <Card hover>
          <p className="text-muted-foreground">Contenido aquí</p>
          <Button>Acción</Button>
        </Card>
      </section>
    </StoreLayout>
  );
}

// 2. Agregar la ruta en src/app/routes.tsx
{
  path: '/store/mi-pagina',
  Component: MiNuevaPagina,
}
```

## Feature Checklist

### ✅ Implementado
- [x] Tienda online (home, productos, detalle, carrito, checkout)
- [x] POS (optimizado para tablet)
- [x] Admin dashboard con widgets
- [x] Gestión de productos (listar, crear, editar)
- [x] Gestión de órdenes
- [x] UI de preventas
- [x] Panel de agente Instagram
- [x] Design system custom (retro-gaming aesthetic)
- [x] Responsive design
- [x] Dark mode (default)
- [x] Autenticación (login/registro)
- [x] Carrito persistente (Zustand + localStorage)
- [x] API client con proxy Vite
- [x] Base de datos con Prisma (PostgreSQL/SQLite)

### 🔄 Pendiente
- [ ] Integración de pagos Getnet/PlacetoPay
- [ ] Upload de imágenes para productos
- [ ] Integración real con Instagram API
- [ ] Notificaciones por email
- [ ] Generación de PDF (recibos)
- [ ] Updates en tiempo real (WebSocket)
- [ ] Analytics tracking
- [ ] SEO y meta tags

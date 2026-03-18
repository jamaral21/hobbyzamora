---
inclusion: auto
---

# HobbyZamora — Frontend Context

## Stack
- React 18 + TypeScript + Vite 6
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- Radix UI primitives (shadcn/ui pattern) in `src/app/components/ui/`
- Motion library for animations
- Zustand for state management (cart stores in `src/app/lib/store.ts`)
- React Router v7 (`src/app/routes.tsx`)
- Recharts for charts
- Lucide React for icons
- Sonner for toast notifications

## Project Structure
```
src/
  main.tsx                          # Entry point
  styles/
    index.css                       # Imports fonts → tailwind → theme
    fonts.css                       # Font declarations
    tailwind.css                    # Tailwind config (source: src/**/*.{ts,tsx})
    theme.css                       # CSS variables, dark mode, base typography
  app/
    App.tsx                         # Root component
    routes.tsx                      # All routes (store, admin, pos)
    components/
      ui/                           # Radix/shadcn primitives (button, card, dialog, etc.)
      design-system/                # Custom components (Badge, Button, Card, ProductCard, etc.)
      layout/                       # Layout components
      admin/                        # Admin-specific components
      store/                        # Storefront components (CartPanel, ProductCard, etc.)
      pos/                          # Point-of-sale components
      instagram/                    # Instagram chat/messaging components
      auth/                         # Auth components
      figma/                        # Figma-related helpers
    layouts/
      RootLayout.tsx
      AdminLayout.tsx
      StorefrontLayout.tsx
    pages/
      store/                        # Customer-facing pages
      admin/                        # Admin dashboard pages
      pos/                          # Point-of-sale pages
    contexts/
      AuthContext.tsx                # Auth state
    hooks/
      useData.ts                    # Data fetching hook
    lib/
      api.ts                        # API client + TypeScript interfaces
      store.ts                      # Zustand stores (useCartStore, usePOSCartStore)
    data/
      mockData.ts                   # Mock data for development
```

## Routes
- `/` and `/store` — Home page
- `/store/products` — Product listing
- `/store/product/:id` — Product detail
- `/store/presales` — Presales page
- `/store/cart` — Cart
- `/store/checkout` — Checkout
- `/store/order-confirmation` — Order confirmation
- `/store/account` — User account
- `/admin` — Dashboard
- `/admin/products` — Product management
- `/admin/orders` — Orders list
- `/admin/orders/:id` — Order detail
- `/admin/customers` — Customers
- `/admin/instagram` — Instagram agent
- `/pos` — Point of sale

## Theme System
CSS variables defined in `src/styles/theme.css`:
- Colors: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`
- Dark mode via `.dark` class
- Border radius: `--radius: 0.625rem`
- Base font size: 16px
- Tailwind theme mapping via `@theme inline` block

## Key Conventions
- Use `cn()` from `src/app/components/ui/utils.ts` for conditional class merging
- Prefer Radix UI primitives from `components/ui/` for interactive elements
- Custom design-system components in `components/design-system/` wrap UI primitives
- API calls go through `fetchAPI()` in `src/app/lib/api.ts` (base URL from env)
- State: Zustand stores with persist middleware for cart
- Auth: Context-based via `AuthContext.tsx`

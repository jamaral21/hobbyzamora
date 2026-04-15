# HobbyZamora — Design System

> Guía de referencia para el equipo de desarrollo. Última actualización: Marzo 2026.

---

## Identidad Visual

**Concepto:** Retro-gaming pixel art meets modern collectible store.

La estética combina la nostalgia del pixel art y los videojuegos retro con una interfaz moderna y oscura. El resultado es una tienda que se siente como un espacio de coleccionistas — energética, auténtica y memorable.

**Especialización:** Pokémon TCG, Beyblade X, figuras y coleccionables.

---

## Tipografía

Usamos tres familias tipográficas con roles específicos:

| Rol | Fuente | Variable CSS | Uso en Tailwind |
|-----|--------|-------------|-----------------|
| Display | `Press Start 2P` | `--font-display` | `font-[family-name:var(--font-display)]` |
| Body | `Outfit` | `--font-body` | `font-[family-name:var(--font-body)]` (default en body) |
| Mono | `JetBrains Mono` | `--font-mono` | `font-[family-name:var(--font-mono)]` |

### Cuándo usar cada una

- **Press Start 2P (Display):** Headings principales (h1, h2), nombre de marca, botones especiales con prop `pixel`, badges destacados. Nunca para párrafos largos.
- **Outfit (Body):** Todo el texto general — párrafos, labels, botones normales, navegación, h3, h4. Es la fuente por defecto del body.
- **JetBrains Mono:** Precios, SKUs, cantidades de stock, datos numéricos, código.

### Escala tipográfica

```
h1: font-display, clamp(1.25rem, 3vw, 1.75rem), line-height 1.6
h2: font-display, clamp(0.875rem, 2vw, 1.125rem), line-height 1.6
h3: font-body, text-lg, font-weight 600
h4: font-body, text-base, font-weight 600
body: font-body, 16px base
```

### Carga de fuentes

Las fuentes se importan desde Google Fonts en `src/styles/fonts.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

---

## Paleta de Colores

El tema es **dark-first**. El modo oscuro es el principal; el modo claro es un override más suave.

### Colores principales

| Token | Hex | Uso |
|-------|-----|-----|
| `--background` | `#0a0a0f` | Fondo principal de la app |
| `--card` | `#12121a` | Fondo de cards y contenedores |
| `--foreground` | `#e8e6f0` | Texto principal |
| `--muted-foreground` | `#8b8a9e` | Texto secundario/deshabilitado |
| `--secondary` | `#1a1a2e` | Fondos secundarios, inputs |

### Colores de marca

| Token | Hex | Nombre | Uso |
|-------|-----|--------|-----|
| `--primary` | `#ffd60a` | Electric Yellow | CTAs, precios, headings, glow effects |
| `--accent` | `#00d4ff` | Cyan | Acentos secundarios, info badges, links |

### Colores funcionales

| Token | Hex | Uso |
|-------|-----|-----|
| `--destructive` | `#ff3b5c` | Errores, stock bajo, acciones peligrosas |
| `--success` | `#00e676` | Éxito, stock disponible, confirmaciones |
| `--warning` | `#ffab00` | Advertencias, stock limitado |

### Bordes y focus

| Token | Valor | Uso |
|-------|-------|-----|
| `--border` | `rgba(255, 214, 10, 0.12)` | Bordes de cards y contenedores |
| `--ring` | `rgba(255, 214, 10, 0.4)` | Focus rings |
| `--input-background` | `#1a1a2e` | Fondo de inputs |

### Uso en Tailwind

```jsx
// Colores semánticos (preferir estos)
className="bg-background text-foreground"
className="bg-card border-border"
className="text-primary"        // Amarillo eléctrico
className="text-accent"         // Cyan
className="text-muted-foreground" // Texto secundario
className="text-destructive"    // Rojo error

// Precios siempre así:
className="text-primary font-[family-name:var(--font-mono)] font-bold"
```

---

## Efectos de Glow

Los glows son parte fundamental de la identidad visual. Simulan la energía de las cartas y el brillo de pantallas retro.

```jsx
// Glow primario (amarillo) — para CTAs y elementos destacados
shadow-[0_0_16px_rgba(255,214,10,0.2)]        // sutil
shadow-[0_0_24px_rgba(255,214,10,0.35)]       // hover

// Glow accent (cyan) — para elementos secundarios
shadow-[0_0_16px_rgba(0,212,255,0.2)]         // sutil
shadow-[0_0_20px_rgba(0,212,255,0.3)]         // hover

// Glow success (verde)
shadow-[0_0_16px_rgba(0,230,118,0.2)]
```

### Cuándo usar glow

- ✅ Botones primary en hover
- ✅ Cards destacadas (presales, featured)
- ✅ Badge de carrito con items
- ✅ Logo en navbar
- ❌ No usar en texto normal
- ❌ No usar en más de 3 elementos visibles a la vez

---

## Texturas y Fondos

Para crear profundidad y atmósfera en secciones hero o destacadas:

### Noise texture

```jsx
<div
  className="absolute inset-0 opacity-[0.03]"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
  }}
/>
```

### Grid pattern

```jsx
<div
  className="absolute inset-0 opacity-[0.04]"
  style={{
    backgroundImage: 'linear-gradient(rgba(255,214,10,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,214,10,0.3) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  }}
/>
```

### Glow orbs (ambient light)

```jsx
<div className="absolute top-20 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
<div className="absolute bottom-10 right-0 w-80 h-80 bg-accent/6 rounded-full blur-[100px]" />
```

---

## Componentes

Todos los componentes del design system están en `src/app/components/design-system/`.

### Button

```tsx
import { Button } from '../design-system/Button';
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger' \| 'accent'` | `'primary'` | Estilo visual |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamaño |
| `fullWidth` | `boolean` | `false` | Ancho completo |
| `pixel` | `boolean` | `false` | Usa tipografía pixel (Press Start 2P) |

```jsx
// CTA principal con glow
<Button size="lg" pixel>Ver Productos</Button>

// Acción secundaria
<Button variant="outline">Ver Todo</Button>

// Botón de peligro
<Button variant="danger">Eliminar</Button>

// Botón con acento cyan
<Button variant="accent">Info</Button>
```

**Variantes visuales:**
- `primary` — Fondo amarillo eléctrico con glow. Para CTAs principales.
- `secondary` — Fondo oscuro sutil. Para acciones secundarias.
- `outline` — Borde con fondo transparente. Para acciones terciarias.
- `ghost` — Sin fondo ni borde. Para acciones mínimas.
- `danger` — Rojo. Para acciones destructivas.
- `accent` — Cyan con glow. Para acciones informativas.

---

### Badge

```tsx
import { Badge } from '../design-system/Badge';
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'brand' \| 'presale'` | `'default'` | Estilo visual |
| `size` | `'sm' \| 'md'` | `'sm'` | Tamaño |
| `pixel` | `boolean` | `false` | Tipografía pixel |

```jsx
<Badge variant="brand">Nuevo</Badge>
<Badge variant="presale" pixel>Preventa</Badge>
<Badge variant="danger">Agotado</Badge>
<Badge variant="success">En Stock</Badge>
<Badge variant="warning">Últimas unidades</Badge>
```

**Nota:** `presale` tiene un gradiente especial de primary a accent con glow sutil.

---

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Padding interno |
| `hover` | `boolean` | `false` | Efecto hover con glow sutil |
| `glow` | `'none' \| 'primary' \| 'accent'` | `'none'` | Glow permanente |

```jsx
// Card básica
<Card>Contenido</Card>

// Card con hover interactivo
<Card hover>Contenido clickeable</Card>

// Card destacada con glow permanente
<Card glow="primary">Contenido especial</Card>

// Card para producto (sin padding, con hover)
<Card padding="none" hover className="overflow-hidden">
  <img ... />
  <div className="p-4">...</div>
</Card>
```

---

### Input

```tsx
import { Input } from '../design-system/Input';
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `label` | `string` | — | Label del input |
| `error` | `string` | — | Mensaje de error |
| `hint` | `string` | — | Texto de ayuda |

```jsx
<Input label="Email" placeholder="tu@email.com" />
<Input label="Cantidad" type="number" error="Mínimo 1 unidad" />
<Input label="Código" hint="Ingresa tu código de descuento" />
```

**Estilos:** Fondo `--input-background` (#1a1a2e), borde sutil, focus ring amarillo.

---

### Modal

```tsx
import { Modal, ModalFooter } from '../design-system/Modal';
```

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isOpen` | `boolean` | — | Controla visibilidad |
| `onClose` | `() => void` | — | Callback al cerrar |
| `title` | `string` | — | Título del modal |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Ancho máximo |

```jsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Confirmar">
  <p>¿Estás seguro?</p>
  <ModalFooter>
    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
    <Button>Confirmar</Button>
  </ModalFooter>
</Modal>
```

---

### EmptyState

```tsx
import { EmptyState } from '../design-system/EmptyState';
```

```jsx
<EmptyState
  icon={ShoppingCart}
  title="Tu carrito está vacío"
  description="Agrega productos para comenzar"
  action={{ label: "Ver Productos", onClick: () => navigate('/store/products') }}
/>
```

---

### Switch, Dropdown, Table

Estos componentes aún usan estilos gray genéricos y están pendientes de actualización al nuevo tema. Funcionan pero no reflejan la identidad visual completa.

---

## Iconografía

Usamos **Lucide React** como librería de iconos.

```tsx
import { ShoppingCart, Zap, Flame, Gamepad2 } from 'lucide-react';
```

Iconos frecuentes en el proyecto:
- `ShoppingCart` — Carrito
- `Zap` — Energía, CTAs
- `Flame` — Preventas, hot items
- `Gamepad2` — Gaming, brand
- `Sparkles` — Originalidad
- `Shield` — Seguridad
- `Clock` — Envío
- `Lock` — Contenido exclusivo
- `AlertCircle` — Stock bajo

---

## Patrones de Código

### Precios

Siempre con fuente mono y color primary:

```jsx
<span className="text-xl text-primary font-bold font-[family-name:var(--font-mono)]">
  ${product.price.toLocaleString('es-CL')}
</span>
```

### Stock bajo

Barra de progreso con gradiente:

```jsx
{stock <= 10 && stock > 0 && (
  <div className="flex items-center gap-1.5">
    <div className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-destructive to-warning"
        style={{ width: `${Math.max(10, (stock / 10) * 100)}%` }}
      />
    </div>
    <span className="text-xs text-muted-foreground">{stock} left</span>
  </div>
)}
```

### Secciones hero

Siempre con `relative overflow-hidden` y capas de textura:

```jsx
<section className="relative overflow-hidden bg-background">
  {/* Noise */}
  <div className="absolute inset-0 opacity-[0.03]" style={{...}} />
  {/* Grid */}
  <div className="absolute inset-0 opacity-[0.04]" style={{...}} />
  {/* Glow orbs */}
  <div className="absolute ... bg-primary/8 rounded-full blur-[120px]" />
  {/* Content */}
  <div className="relative max-w-7xl mx-auto ...">
    ...
  </div>
</section>
```

### Hover en links/nav

```jsx
className="text-muted-foreground hover:text-primary transition-colors"
```

---

## Estructura de Archivos

```
src/styles/
  fonts.css          ← Importación de Google Fonts
  tailwind.css       ← Config de Tailwind v4
  theme.css          ← Variables CSS, dark mode, base typography
  index.css          ← Importa fonts → tailwind → theme

src/app/components/
  design-system/     ← Componentes custom del design system
    Button.tsx
    Badge.tsx
    Card.tsx
    Input.tsx
    Modal.tsx
    Switch.tsx
    Dropdown.tsx
    EmptyState.tsx
    Table.tsx
    ProductCard.tsx
    ...
  ui/                ← Primitivos Radix/shadcn (NO modificar)
  layout/            ← StoreNavbar, StoreLayout, AdminLayout
  store/             ← Componentes específicos de la tienda
```

---

## Reglas del Equipo

1. **Nunca modificar** archivos en `components/ui/` — son primitivos generados de shadcn.
2. **Siempre usar** los tokens CSS del tema, nunca hardcodear colores como `#ffd60a` directamente en componentes.
3. **Precios** siempre con `font-mono` + `text-primary`.
4. **Texto customer-facing** siempre en español.
5. **Nuevos componentes** van en `components/design-system/`.
6. **Usar `cn()`** de `components/ui/utils.ts` para merge de clases condicionales.
7. **Animaciones** con la librería Motion (ya instalada como `motion`).
8. **Iconos** solo de Lucide React.
9. **No instalar** nuevas librerías de UI sin discusión previa.
10. **Responsive** mobile-first siempre.

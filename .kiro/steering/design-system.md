---
inclusion: auto
---

# HobbyZamora Design System

## Brand Identity
- Retro-gaming pixel art aesthetic meets modern collectible store
- Specializes in Pokémon TCG and Beyblade X collectibles
- Tagline: "Juegos, Figuras & Coleccionables"

## Typography
- Display: `Press Start 2P` (pixel font) — headings, brand elements, special buttons
- Body: `Outfit` — body text, labels, general UI
- Mono: `JetBrains Mono` — prices, SKUs, data values
- Use `font-[family-name:var(--font-display)]` for pixel text in Tailwind
- Use `font-[family-name:var(--font-mono)]` for monospace/prices

## Color Palette (Dark-first)
- Background: `#0a0a0f` (near-black)
- Card: `#12121a`
- Primary: `#ffd60a` (electric yellow — Pikachu energy)
- Accent: `#00d4ff` (cyan)
- Success: `#00e676`
- Warning: `#ffab00`
- Destructive: `#ff3b5c`
- Muted foreground: `#8b8a9e`

## Glow Effects
- Primary glow: `shadow-[0_0_20px_rgba(255,214,10,0.3)]`
- Accent glow: `shadow-[0_0_20px_rgba(0,212,255,0.3)]`
- Use glow on hover states, featured elements, and CTAs

## Component Conventions
- `pixel` prop on Button/Badge for pixel-font styling
- `glow` prop on Card for ambient glow effects
- Prices always use `font-[family-name:var(--font-mono)]` and `text-primary`
- Stock indicators use gradient progress bars
- Presale badges use gradient from primary to accent
- Noise texture + grid pattern on hero sections for depth
- All text in Spanish for customer-facing UI

## Background Patterns
- Noise texture SVG overlay at `opacity-[0.03]`
- Grid lines with primary color at `opacity-[0.04]`
- Blur orbs (`bg-primary/8 blur-[120px]`) for ambient glow

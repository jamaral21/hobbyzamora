# Implementation Plan: Store Homepage Redesign

## Overview

Rediseño del hero de la HomePage: nuevo componente HeroSlider con autoplay, swipe, navegación por teclado y accesibilidad. Consolidación de la navegación desktop y categorías en menú móvil. React + TypeScript + Tailwind CSS v4 + Motion.

## Tasks

- [x] 1. Create HeroSlider component with core rendering and slide data types
  - [x] 1.1 Create `src/app/components/design-system/HeroSlider.tsx` with `HeroSlide` and `HeroSliderProps` interfaces
    - Export `HeroSlide` interface: `id`, `image`, optional `title`, `subtitle`, `ctaText`, `ctaHref`
    - Export `HeroSliderProps`: `slides`, optional `autoplayInterval` (default 5000), `pauseDuration` (default 10000), `transitionDuration` (default 500), `className`
    - Implement `sliderReducer` with `useReducer` for state: `currentIndex`, `direction`, `isAutoplayPaused`, `isTabVisible`
    - Clamp slides array to 1–6 (truncate if >6, render fallback gradient if empty)
    - Render full-width container with `aspect-video` on desktop (`lg:`) and `aspect-[4/3]` on mobile
    - Render active slide `<img>` with `object-cover`, fallback gradient on `onError`
    - Render optional title (font-display), subtitle (font-body), CTA button (Link + Button component) — only when data present
    - Render semi-transparent dark overlay gradient only when slide has text content (title or subtitle)
    - Position text bottom-left on desktop, center-bottom on mobile
    - Use `motion.div` with `AnimatePresence` for horizontal slide transitions (500ms)
    - Use design system color tokens only (no hardcoded hex)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.1, 7.2_

  - [x] 1.2 Add navigation arrows, indicator dots, and keyboard navigation
    - Render left/right arrow buttons with `aria-label="Slide anterior"` / `"Slide siguiente"`
    - Hide arrows on mobile (`hidden md:flex`)
    - Implement circular navigation: forward from last → first, backward from first → last
    - Render N indicator dots matching slide count, active dot uses `primary` color, inactive uses `muted-foreground`
    - Each dot has `aria-label="Ir a slide {i+1}"` and navigates to that slide on click
    - Add `onKeyDown` handler for ArrowLeft/ArrowRight on the slider container with `tabIndex={0}`
    - Hide arrows, dots, and pause button when only 1 slide
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.3, 7.4, 8.2, 8.3, 8.4_

  - [x] 1.3 Implement autoplay, pause/resume, swipe gestures, and lazy loading
    - Implement `useAutoplay` hook: 5s interval, pause on user interaction for 10s, pause when tab hidden (`document.visibilitychange`), resume when tab visible
    - Render pause/play button with `aria-label="Pausar carrusel"` / `"Reanudar carrusel"`
    - Implement `useSwipe` hook with pointer events (`onPointerDown`/`onPointerMove`/`onPointerUp`), 50px threshold
    - Set `loading="lazy"` on non-active slide images, `loading="eager"` on active and adjacent slides
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.5_

  - [ ]* 1.4 Write property tests for HeroSlider (Properties 1–7, 10–11)
    - **Property 1: Slide count bounds** — generate arrays of 0–10 slides, verify rendered count is clamped 1–6
    - **Validates: Requirement 2.1**
    - **Property 2: Indicator dots match slide count** — generate arrays 1–6, verify exactly N dots with 1 active
    - **Validates: Requirement 2.4**
    - **Property 3: Dot click navigates to correct slide** — generate index i, simulate click, verify currentIndex = i
    - **Validates: Requirement 2.5**
    - **Property 4: Autoplay advances cyclically** — generate index i and total N, verify next = (i+1) % N
    - **Validates: Requirement 3.1**
    - **Property 5: Circular navigation** — generate N slides, verify wrap at both ends
    - **Validates: Requirements 2.6, 2.7**
    - **Property 6: Optional content renders iff data present** — generate slides with/without fields, verify DOM
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - **Property 7: Overlay follows text content** — generate slides, verify overlay ↔ text presence
    - **Validates: Requirement 4.5**
    - **Property 10: Non-active slides use lazy loading** — generate currentIndex and total, verify loading attrs
    - **Validates: Requirement 8.1**
    - **Property 11: Dot accessible labels** — generate N slides, verify aria-label = "Ir a slide {i+1}"
    - **Validates: Requirement 8.3**

  - [ ]* 1.5 Write unit tests for HeroSlider
    - Test render with 1 slide: no arrows, no dots, no pause button
    - Test render with all slide fields populated
    - Test fallback gradient when image onError fires
    - Test autoplay pause on interaction and resume after 10s (fake timers)
    - Test autoplay pause/resume on visibilitychange
    - Test keyboard navigation (ArrowLeft, ArrowRight)
    - Test swipe gesture with threshold
    - Test pause/play button aria-labels toggle
    - Test navigation arrow aria-labels
    - _Requirements: 1.5, 2.1, 2.2, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 7.5, 8.2, 8.4, 8.5_

- [x] 2. Checkpoint — Verify HeroSlider component
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Modify StoreNavbar — remove redundant desktop links, add categories to mobile menu
  - [x] 3.1 Update `src/app/components/layout/StoreNavbar.tsx`
    - Extract `STORE_CATEGORIES` constant array (shared between Category_Bar and Mobile_Menu)
    - Remove the `<div className="hidden md:flex items-center gap-8">` block with "Tienda", "Productos", "Preventas" links
    - Keep logo, search bar, cart icon, user account icon unchanged
    - Keep Category_Bar unchanged but refactor to use `STORE_CATEGORIES` constant
    - In Mobile_Menu: add a separator and "Categorías" label section
    - Render all category links from `STORE_CATEGORIES` in the mobile menu
    - Each category link click closes the mobile menu (`setIsMenuOpen(false)`)
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 3.2 Write property tests for StoreNavbar changes (Properties 8–9)
    - **Property 8: Mobile menu contains all categories** — verify all STORE_CATEGORIES names and hrefs appear as links
    - **Validates: Requirement 6.1**
    - **Property 9: Category link tap closes mobile menu** — simulate click on each category, verify menu closes
    - **Validates: Requirement 6.4**

  - [ ]* 3.3 Write unit tests for StoreNavbar changes
    - Test desktop: "Tienda", "Productos", "Preventas" links are absent
    - Test desktop: logo, search, cart, account icons are present
    - Test mobile menu: "Categorías" label is present
    - Test mobile menu: category link click closes menu
    - _Requirements: 5.1, 5.2, 6.2, 6.3, 6.4_

- [x] 4. Modify HomePage — replace hero section with HeroSlider
  - [x] 4.1 Update `src/app/pages/store/HomePage.tsx`
    - Remove the entire current hero `<section>` (noise texture, grid pattern, glow orbs, centered text, buttons)
    - Import `HeroSlider` and `HeroSlide` from design-system
    - Define `heroSlides` array with placeholder slide data (3–4 slides with Spanish text, placeholder images, CTAs linking to `/store/products` and `/store/presales`)
    - Render `<HeroSlider slides={heroSlides} />` in place of the old hero section
    - Keep all other sections unchanged (featured products, presales, new products, trust badges, CTA)
    - Remove unused imports from the old hero (Gamepad2, Zap, etc. if no longer needed)
    - _Requirements: 1.1, 1.2, 4.7_

- [x] 5. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All text content in Spanish as per project convention
- Uses `motion` library (already installed) for slide transitions
- Uses `lucide-react` for navigation arrow icons
- Property tests use `fast-check` with Vitest
- Design system tokens only — no hardcoded colors

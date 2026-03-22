# Requirements Document

## Introduction

Rediseño de la página principal (HomePage) de la tienda HobbyZamora, inspirado en el layout de geekers.cl. El cambio principal es reemplazar el hero banner actual (texto centrado con texturas de fondo) por un hero visual de ancho completo con imágenes tipo slider/carrusel, similar a geekers.cl. También se debe consolidar la navegación desktop (eliminar links redundantes con la barra de categorías) e integrar las categorías en el menú móvil. Las secciones de productos existentes (destacados, preventas, novedades, trust badges, CTA) se mantienen. Todo el desarrollo es frontend-only, usando el design system existente de HobbyZamora (tema oscuro, amarillo eléctrico, cyan, tipografía pixel).

## Glossary

- **HomePage**: Página principal de la tienda online, accesible en `/store`. Contiene hero banner, secciones de productos y CTA.
- **Hero_Banner**: Sección visual prominente en la parte superior de la HomePage, debajo de la barra de navegación y categorías. Muestra imágenes promocionales a ancho completo.
- **Hero_Slider**: Componente de carrusel dentro del Hero_Banner que permite navegar entre múltiples slides promocionales con imágenes, texto y CTAs.
- **Slide**: Unidad individual dentro del Hero_Slider. Contiene una imagen de fondo, título opcional, subtítulo opcional y un CTA opcional.
- **Category_Bar**: Barra horizontal de texto compacta debajo de la navegación principal (solo desktop) que muestra enlaces a categorías de productos. Ya implementada en StoreNavbar.
- **StoreNavbar**: Componente de navegación principal de la tienda. Contiene logo, búsqueda, acciones de usuario y la Category_Bar.
- **Mobile_Menu**: Menú desplegable de navegación visible solo en dispositivos móviles, activado por el botón hamburguesa en StoreNavbar.
- **Design_System**: Conjunto de tokens CSS, componentes y patrones definidos en DESIGN_SYSTEM.md y `src/styles/theme.css`.
- **Autoplay**: Funcionalidad del Hero_Slider que avanza automáticamente entre slides sin interacción del usuario.
- **Indicator_Dots**: Elementos visuales (puntos o barras) debajo del Hero_Slider que indican el slide activo y permiten navegación directa.

## Requirements

### Requirement 1: Hero Banner Visual de Ancho Completo

**User Story:** Como visitante de la tienda, quiero ver un hero banner visual con imágenes promocionales a ancho completo, para que la primera impresión de la tienda sea atractiva y profesional como en geekers.cl.

#### Acceptance Criteria

1. THE Hero_Banner SHALL display a full-width image-based banner section immediately below the StoreNavbar (including the Category_Bar).
2. THE Hero_Banner SHALL replace the current text-centered hero section that uses noise textures, grid patterns, and glow orbs.
3. THE Hero_Banner SHALL span the full viewport width without horizontal padding constraints.
4. THE Hero_Banner SHALL maintain a 16:9 aspect ratio on desktop viewports (1024px and above) and a 4:3 aspect ratio on mobile viewports (below 1024px).
5. WHEN no banner images are configured, THE Hero_Banner SHALL display a fallback gradient background using Design_System primary and accent colors.

### Requirement 2: Hero Slider con Navegación

**User Story:** Como visitante de la tienda, quiero poder navegar entre múltiples banners promocionales, para descubrir diferentes ofertas y categorías destacadas.

#### Acceptance Criteria

1. THE Hero_Slider SHALL support a minimum of 1 and a maximum of 6 Slides.
2. THE Hero_Slider SHALL display navigation arrows (left and right) on desktop viewports for manual slide navigation.
3. THE Hero_Slider SHALL support swipe gestures for slide navigation on touch-enabled devices.
4. THE Hero_Slider SHALL display Indicator_Dots below the slider to show the total number of slides and the currently active Slide.
5. WHEN a user clicks an Indicator_Dot, THE Hero_Slider SHALL navigate to the corresponding Slide.
6. WHEN a user clicks the right navigation arrow on the last Slide, THE Hero_Slider SHALL loop back to the first Slide.
7. WHEN a user clicks the left navigation arrow on the first Slide, THE Hero_Slider SHALL loop to the last Slide.
8. THE Hero_Slider SHALL animate transitions between slides using a horizontal slide animation with a duration of 500 milliseconds.

### Requirement 3: Autoplay del Hero Slider

**User Story:** Como visitante de la tienda, quiero que los banners roten automáticamente, para ver todas las promociones sin necesidad de interactuar.

#### Acceptance Criteria

1. THE Hero_Slider SHALL automatically advance to the next Slide every 5 seconds when Autoplay is active.
2. WHEN a user interacts with the Hero_Slider (click on arrows, swipe, or click on Indicator_Dots), THE Hero_Slider SHALL pause Autoplay for 10 seconds before resuming.
3. WHILE the browser tab is not visible (document is hidden), THE Hero_Slider SHALL pause Autoplay.
4. WHEN the browser tab becomes visible again, THE Hero_Slider SHALL resume Autoplay.

### Requirement 4: Contenido de Cada Slide

**User Story:** Como administrador de la tienda, quiero que cada slide pueda tener imagen, texto y enlace, para crear banners promocionales completos.

#### Acceptance Criteria

1. Each Slide SHALL display a background image that covers the full area of the Hero_Banner without distortion (object-fit cover).
2. Each Slide SHALL optionally display a title text using the Design_System display font (Press Start 2P).
3. Each Slide SHALL optionally display a subtitle text using the Design_System body font (Outfit).
4. Each Slide SHALL optionally display a CTA button that links to a configurable URL.
5. WHEN a Slide contains text content, THE Slide SHALL display a semi-transparent dark overlay gradient over the image to ensure text readability.
6. THE Slide text content SHALL be positioned at the bottom-left of the Slide on desktop and center-bottom on mobile.
7. All Slide text content SHALL be written in Spanish.

### Requirement 5: Consolidación de Navegación Desktop

**User Story:** Como visitante de la tienda, quiero una navegación limpia sin links duplicados, para encontrar lo que busco sin confusión.

#### Acceptance Criteria

1. THE StoreNavbar SHALL remove the desktop navigation links "Tienda", "Productos", and "Preventas" that are redundant with the Category_Bar.
2. THE StoreNavbar SHALL retain the logo, search bar, cart icon, and user account icon in the main navigation bar on desktop.
3. THE Category_Bar SHALL remain as the primary category navigation on desktop viewports.

### Requirement 6: Categorías en Menú Móvil

**User Story:** Como visitante móvil, quiero acceder a las categorías desde el menú hamburguesa, para navegar la tienda fácilmente desde mi teléfono.

#### Acceptance Criteria

1. THE Mobile_Menu SHALL include all category links from the Category_Bar: Pokémon TCG, Beyblade X, Pokémon Merch, Autos Tomy Tomica, Figuarts, Nintendo, Coleccionables Varios.
2. THE Mobile_Menu SHALL display category links in a visually distinct section separated from the main navigation links.
3. THE Mobile_Menu SHALL display a section label "Categorías" above the category links.
4. WHEN a user taps a category link in the Mobile_Menu, THE Mobile_Menu SHALL close and navigate to the corresponding category page.

### Requirement 7: Responsive y Design System

**User Story:** Como visitante, quiero que la página se vea bien en cualquier dispositivo y mantenga la identidad visual de HobbyZamora.

#### Acceptance Criteria

1. THE Hero_Banner SHALL use Design_System color tokens for all colors (borders, overlays, text, buttons) and never hardcode hex values.
2. THE Hero_Banner SHALL be responsive following a mobile-first approach with breakpoints at sm (640px), md (768px), and lg (1024px).
3. THE Hero_Banner navigation arrows SHALL be hidden on mobile viewports (below 768px) where swipe gestures are the primary navigation method.
4. THE Indicator_Dots SHALL use the Design_System primary color for the active state and muted-foreground color for inactive states.
5. IF a Slide image fails to load, THEN THE Hero_Banner SHALL display the fallback gradient background for that Slide.

### Requirement 8: Rendimiento y Accesibilidad

**User Story:** Como visitante, quiero que la página cargue rápido y sea accesible, para tener una buena experiencia independiente de mi conexión o capacidades.

#### Acceptance Criteria

1. THE Hero_Slider SHALL use lazy loading for Slide images that are not currently visible.
2. THE Hero_Slider navigation arrows SHALL have accessible labels ("Slide anterior" and "Slide siguiente").
3. THE Indicator_Dots SHALL have accessible labels indicating the slide number (e.g., "Ir a slide 1").
4. THE Hero_Slider SHALL be keyboard navigable using left and right arrow keys.
5. WHEN Autoplay is active, THE Hero_Slider SHALL include a visible pause/play button with accessible label ("Pausar carrusel" / "Reanudar carrusel").

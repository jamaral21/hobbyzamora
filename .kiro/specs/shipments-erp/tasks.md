# Implementation Plan: Shipments ERP

## Overview

Implementación frontend-only del módulo Shipments ERP para HobbyZamora. Se construye incrementalmente: primero la capa de datos y tipos, luego el shell (layout, sidebar, routing, contextos), y finalmente los 19 módulos agrupados por sección. Toda la lógica opera sobre datos mock tipados en TypeScript, usando el design system existente sin glow ni pixel-font. Se incluyen tareas de documentación (API spec + guías de usuario) como archivos markdown en `reference/`.

## Tasks

- [x] 1. Foundation — Mock data, types, helpers, and shared components
  - [x] 1.1 Create `src/app/data/shipmentsMockData.ts` with all TypeScript types, mock data, and helper functions
    - Define all types: `ShipmentsRole`, `PaymentState`, `LocationState`, `PurchaseRecord`, `Invoice`, `InvoiceItem`, `BoxState`, `BoxProduct`, `InternacionData`, `Box`, `ChileStockEntry`, `WebOrderProduct`, `WebOrder`, `LocalPurchase`, `SalesChannel`, `SaleRecord`, `GAVEntry`, `BankAccount`, `ERPConfig`
    - Export `ROLE_PAGES` matrix mapping each role to accessible module IDs
    - Implement and export helper functions: `calcDisponibleBySku`, `formatJPY`, `formatCLP`, `nextSku`, `nextBoletaId`, `calcCostoUnitario`, `calcInvoiceTotals`, `validateCosteoPercentages`, `calcMargin`, `marginColor`, `calcIncomeStatement`, `groupRevenueByChannel`, `calcBalanceSheet`, `calcCashFlow`
    - Generate realistic mock data: 10+ purchases, 3+ boxes, 3+ invoices, 5+ Chile stock entries, 5+ sales, 5+ GAV entries, 3 bank accounts, default config
    - Ensure referential integrity: box products reference existing purchases, Chile stock references existing boxes, SKUs use `JP-XXXX` format consistently
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 23.1, 23.2_

  - [x] 1.2 Write property tests for currency formatting (Property 1)
    - **Property 1: Currency formatting produces valid locale strings**
    - Test `formatJPY` returns `¥`-prefixed string with es-CL locale for any non-negative integer
    - Test `formatCLP` returns `$`-prefixed string with es-CL locale for any non-negative integer
    - Test idempotency: parsing numeric portion back yields original value
    - Test edge cases: 0, NaN, Infinity, negative values return `¥0` / `$0`
    - **Validates: Requirements 4.5, 15.4, 23.1, 23.2**

  - [x] 1.3 Write property tests for calcDisponibleBySku (Property 2)
    - **Property 2: calcDisponibleBySku returns correct available units**
    - For any valid state and SKU, result equals `compra.cant - unitsInActiveBoxes - unitsInChileStock`
    - Result is never negative
    - **Validates: Requirements 3.7, 5.1**

  - [x] 1.4 Write property tests for SKU generation (Property 3)
    - **Property 3: SKU generation is sequential and well-formatted**
    - `nextSku` returns `JP-XXXX` pattern with numeric portion = max existing + 1
    - Empty list returns `JP-0001`
    - **Validates: Requirements 3.6, 4.3**

  - [x] 1.5 Write property tests for invoice total calculation (Property 4)
    - **Property 4: Invoice total calculation follows the commission formula**
    - `subtotalJPY = Σ(precioU × cant)`, `totalJPY = subtotalJPY × (1 + comision/100)`, `totalCLP = totalJPY / tc`
    - **Validates: Requirements 6.3**

  - [x] 1.6 Write property tests for costeo calculations (Properties 6, 7)
    - **Property 6: Costo unitario calculation follows the distribution formula**
    - **Property 7: Costeo percentages must sum to 100**
    - **Validates: Requirements 13.3, 13.4**

  - [x] 1.7 Write property tests for margin calculation (Property 9)
    - **Property 9: Margin calculation and color assignment**
    - Margin = `(precioVenta - costoUnit) / precioVenta × 100`
    - Green if >30%, orange if >15%, red if ≤15%
    - **Validates: Requirements 14.3**

  - [x] 1.8 Write property tests for financial statements (Properties 11, 12, 13, 14)
    - **Property 11: Income statement calculation with pagado filter**
    - **Property 12: Revenue grouping by channel preserves total**
    - **Property 13: Balance sheet equation holds (Patrimonio = Activos - Pasivos)**
    - **Property 14: Cash flow equation holds (FlujoNeto = Ingresos - EgresosJP - EgresosCL)**
    - **Validates: Requirements 18.1, 18.2, 18.4, 19.1, 19.2, 19.3, 20.1**


- [-] 2. Foundation — Contexts, layout, sidebar, and routing
  - [x] 2.1 Create `src/app/contexts/ShipmentsRoleContext.tsx`
    - Implement `ShipmentsRoleProvider` with `role`, `setRole`, `hasAccess(moduleId)`, `accessibleModules`
    - Persist active role in `localStorage` key `shipments_role`
    - Default role to `admin` if no stored value
    - `hasAccess` checks against `ROLE_PAGES` matrix
    - _Requirements: 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Create `src/app/contexts/ShipmentsDataContext.tsx`
    - Implement `ShipmentsDataProvider` wrapping all mutable ERP state
    - Initialize state from mock data in `shipmentsMockData.ts`
    - Expose all mutation functions: `addCompra`, `updateCompra`, `addBoleta`, `confirmPayment`, `addCaja`, `updateCaja`, `deleteCaja`, `saveInternacion`, `confirmCosteo`, `updatePrecioVenta`, `addVenta`, `confirmGAV`, `updateConfig`, `addPedidoWeb`, `addCompraChile`, `generateGAVBoleta`
    - Expose computed: `calcDisponibleBySku`
    - _Requirements: 3.1, 3.7_

  - [x] 2.3 Write property tests for payment confirmation (Property 5)
    - **Property 5: Payment confirmation transitions invoice and related purchases to pagado**
    - Confirming payment sets `invoice.estado = 'pagado'` and all related `compra.estado = 'pagado'`
    - **Validates: Requirements 7.3**

  - [x] 2.4 Write property tests for costeo confirmation (Property 8)
    - **Property 8: Costeo confirmation creates Chile stock entries and updates box state**
    - Creates one ChileStockEntry per product, sets `box.estado = 'costeada'`, updates `compra.bodega` when disponible = 0
    - **Validates: Requirements 13.5**

  - [x] 2.5 Write property tests for sale registration (Property 10)
    - **Property 10: Sale registration deducts from Chile stock**
    - Registering a sale decreases `stockEntry.cant` by exactly the sold quantity
    - **Validates: Requirements 15.3**

  - [x] 2.6 Create shared shipments components
    - Create `src/app/components/shipments/KPICard.tsx` — reusable KPI card with title, value, icon, optional trend, variant (default/warning/success/danger)
    - Create `src/app/components/shipments/PriceDisplay.tsx` — inline price component with `font-mono text-primary` and correct currency format
    - Create `src/app/components/shipments/StatusBadge.tsx` — maps ERP states to Badge variants using the `statusMap` from design
    - Create `src/app/components/shipments/CurrencyFormatter.ts` — re-exports `formatJPY` and `formatCLP` for component convenience
    - _Requirements: 23.1, 23.2, 23.3_

  - [x] 2.7 Create `src/app/components/layout/ShipmentsSidebar.tsx`
    - Follow AdminSidebar pattern with collapsible sidebar
    - Include role selector dropdown in header using ShipmentsRoleContext
    - Group navigation items into 5 collapsable sections: Japón, Envíos, Chile, Finanzas, Principal
    - Filter visible items via `hasAccess()` from ShipmentsRoleContext
    - Highlight active route with `bg-primary/10 text-primary`
    - Use Lucide React icons for each module
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.8 Create `src/app/components/layout/ShipmentsLayout.tsx` and wire routing
    - Create ShipmentsLayout following AdminLayout pattern (flex h-screen, sidebar + main content area)
    - No authentication required — direct access
    - Redirect to first accessible module if current route is not accessible for active role
    - Create `ShipmentsApp` wrapper component that provides `ShipmentsRoleProvider` → `ShipmentsDataProvider` → `ShipmentsLayout` → `Outlet`
    - Add `/shipments` route group to `src/app/routes.tsx` with all 19 sub-routes and `ShipmentsApp` as parent
    - _Requirements: 1.1, 1.3, 1.4, 1.7, 2.6_

- [x] 3. Checkpoint — Foundation verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify routing works: `/shipments` renders layout with sidebar, navigation between modules works
  - Verify role switching filters sidebar items correctly


- [x] 4. Japan section modules
  - [x] 4.1 Implement `src/app/pages/shipments/ComprasPage.tsx` — Registro de Compras
    - Table with columns: SKU, Fecha, Tipo, Nombre, EAN, Tarjeta, Precio ¥, Cantidad, Total ¥, Estado Pago, Bodega
    - "Nueva Compra" button opens Modal with fields: fecha, tipo, nombre, EAN (optional), tarjeta, precio unitario ¥, cantidad, TC
    - Auto-assign next sequential SKU via `nextSku()` on submit
    - Filter controls for payment state and location
    - Prices displayed with PriceDisplay component (JPY)
    - Input validation: required fields, precio > 0, cantidad > 0
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.2 Implement `src/app/pages/shipments/BodegaJaponPage.tsx` — Bodega Japón
    - Table showing only products where `calcDisponibleBySku(sku) > 0`
    - Quantity column: `disponible / cant_total` format
    - KPI cards: SKUs disponibles, Unidades disponibles, Total ¥, Total CLP estimado
    - Filter by payment state
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 4.3 Implement `src/app/pages/shipments/BoletasPage.tsx` — Boletas
    - Table with columns: ID, Fecha, Productos, Subtotal ¥, Comisión %, Total ¥, TC, Total CLP, Estado
    - "Generar Boleta" modal with product checkboxes, editable quantity, comisión % (default 13%)
    - Calculate totals: subtotal, total with commission, CLP conversion
    - Click row to show detail view with line items
    - Invoice IDs: `BOL-YYYY-NNN` (regular) and `BOL-YYYY-GAV-NNN` (GAV)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.4 Implement `src/app/pages/shipments/PagosPage.tsx` — Confirmar Pagos
    - List invoices with estado `sin_pagar`
    - Payment form: cuenta bancaria dropdown, fecha transferencia, monto CLP
    - On confirm: update invoice and related purchases to `pagado`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.5 Implement `src/app/pages/shipments/GAVJaponPage.tsx` — Gastos Fijos Japón
    - Display two fixed expenses: Arriendo Bodega ¥25,000/mes, App Beyblade ¥550/mes
    - "Generar Boleta" button creates GAV invoice (`BOL-YYYY-GAV-NNN`) for current month
    - History table: last 6 months with month, invoice ID, total, status
    - Warning alert if day ≥ 3 and no GAV invoice for current month
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.6 Write unit tests for Japan section modules
    - ComprasPage: renders table, opens modal, auto-assigns SKU
    - BoletasPage: renders table, calculates totals, shows detail
    - PagosPage: confirms payment, updates states
    - StatusBadge: correct state-to-variant mapping
    - PriceDisplay: correct JPY and CLP formatting
    - _Requirements: 4.1–4.5, 5.1–5.4, 6.1–6.5, 7.1–7.3, 8.1–8.4_

- [x] 5. Checkpoint — Japan section verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 5 Japan modules render correctly and interact with ShipmentsDataContext


- [x] 6. Shipping section modules
  - [x] 6.1 Implement `src/app/pages/shipments/CajasPage.tsx` — Cajas / Envíos
    - Grid of Box cards: nombre, fecha, estado badge (StatusBadge), product count
    - "Nueva Caja" modal: nombre (unique validation), flete UPS ¥, horas MO, tarifa MO CLP/h, materiales ¥, TC
    - Product selector from Bodega Japón: only products with `calcDisponibleBySku > 0`, editable quantity with `max = disponible`
    - On create: update fully-shipped products from `japon` to `transito`
    - Action buttons by state: transito → Ver/Editar/Eliminar, llegada → Ver/Hacer Costeo/Eliminar, costeada → Ver only
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 6.2 Implement `src/app/pages/shipments/BodegaTransitoPage.tsx` — Bodega Tránsito
    - Display boxes grouped by state: transito, llegada, costeada
    - KPI cards: Cajas en tránsito, Llegadas pendientes, Costeadas
    - Expandable box cards showing product list: nombre, SKU, cantidad, valor ¥
    - "Hacer Costeo" button on `llegada` boxes navigates to Costeo module
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 6.3 Implement `src/app/pages/shipments/ComprasWebPage.tsx` — Compras Web
    - Table: ID, Fecha, Portal, N° Orden, Estado, Total
    - "Nuevo Pedido" modal: portal dropdown (Amazon Japan, Amazon USA, Rakuten, etc.), N° orden, fecha, TC, costo envío internacional, dynamic product list
    - Support multiple currencies (USD, JPY, CLP) with configurable TC per order
    - Order IDs: `WEB-NNN`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 6.4 Implement `src/app/pages/shipments/InternacionPage.tsx` — Internación
    - Table of boxes with internment status (pendiente / registrada)
    - On box select: input fields for arancel CIF (CLP) and IVA pagado en aduana (CLP)
    - Save stores arancel and IVA on Box entity, marks IVA as crédito fiscal
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 6.5 Implement `src/app/pages/shipments/CosteoPage.tsx` — Costeo de Cajas
    - Selector of boxes with state `llegada`
    - Costing table: SKU, Nombre, Cantidad, % Costo, Costo Unitario CLP
    - Calculate costo unitario per design formula
    - Validate percentages sum to 100% — disable confirm button if not, show sum in red
    - On confirm: create Chile_Stock entries, set box to `costeada`, update `compra.bodega` when disponible = 0
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 6.6 Write unit tests for Shipping section modules
    - CajasPage: renders grid, filters available products, actions by state
    - CosteoPage: selector shows only `llegada` boxes, validates 100%, costing table
    - BodegaTransitoPage: groups by state, KPIs, expandable cards
    - _Requirements: 9.1–9.5, 10.1–10.4, 13.1–13.5_

- [x] 7. Checkpoint — Shipping section verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the full flow: create box → transit → internación → costeo → stock Chile


- [x] 8. Chile section modules
  - [x] 8.1 Implement `src/app/pages/shipments/BodegaChilePage.tsx` — Bodega Chile
    - Table: SKU, Nombre, EAN, Caja, Cantidad, Costo Unitario, Precio Venta, Margen %
    - Inline editing of Precio Venta field
    - Margin calculation with color coding: green (>30%), orange (>15%), red (≤15%)
    - KPI cards: Unidades totales, Valor inventario CLP, Productos sin precio de venta
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 8.2 Implement `src/app/pages/shipments/ComprasLocalesPage.tsx` — Compras Locales
    - Table: ID, Fecha, Tipo, Doc. Tipo, Proveedor, Descripción, Monto, IVA, Estado
    - "Nueva Compra" modal: tipo (producto/gasto), documento (factura/boleta), proveedor, descripción, monto CLP, estado
    - When documento = factura: show IVA field, mark as crédito fiscal
    - IDs: `CC-NNN`
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 8.3 Implement `src/app/pages/shipments/VentasPage.tsx` — Ventas
    - Table: ID, Fecha, Producto, Cantidad, Precio Venta, Costo, Total, Canal
    - "Nueva Venta" modal: producto dropdown from Chile_Stock, cantidad, precio de venta, canal (Instagram, TikTok, Mercado Libre, Web, Local)
    - On register: deduct sold quantity from Chile_Stock entry
    - Validate quantity ≤ available stock
    - All values in CLP with PriceDisplay
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 8.4 Implement `src/app/pages/shipments/GAVChilePage.tsx` — Gastos Fijos Chile
    - Table: Concepto, Monto, Comprobante, Estado, Acciones
    - Require comprobante marked before allowing confirmation
    - Error message + red border on comprobante field if confirm without comprobante
    - On confirm: set estado to `pagado` with current date
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 8.5 Write unit tests for Chile section modules
    - BodegaChilePage: inline price editing, margin calculation, KPIs
    - VentasPage: sale registration, stock deduction
    - GAVChilePage: comprobante validation, confirmation
    - _Requirements: 14.1–14.4, 15.1–15.4, 16.1–16.4, 17.1–17.4_

- [x] 9. Checkpoint — Chile section verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: costeo creates stock → Bodega Chile shows it → Ventas deducts it


- [x] 10. Finance section modules
  - [x] 10.1 Implement `src/app/pages/shipments/EstadoResultadosPage.tsx` — Estado de Resultados
    - Calculate and display: Ingresos (ventas por canal), Costo de Venta, Margen Bruto, GAV Japón, GAV Chile, EBIT, IVA Crédito, Resultado Neto
    - Only include GAV entries with estado `pagado`
    - Group revenue by sales channel
    - All values in CLP with PriceDisplay
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 10.2 Implement `src/app/pages/shipments/BalancePage.tsx` — Balance General
    - Calculate: Activos (Caja estimada + Inventario Chile + Inventario Japón + IVA Crédito), Pasivos (Boletas sin pagar), Patrimonio (Activo − Pasivo)
    - Inventario Chile valued at costo unitario, Inventario Japón at precio ¥ / TC
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 10.3 Implement `src/app/pages/shipments/FlujoCajaPage.tsx` — Flujo de Caja
    - Calculate: Ingresos (ventas), Egresos Japón (boletas pagadas), Egresos Chile (GAV Chile pagado + compras locales pagadas), Flujo Neto
    - Summary card with Flujo Neto highlighted green (positive) or red (negative)
    - _Requirements: 20.1, 20.2_

  - [x] 10.4 Write unit tests for Finance section modules
    - EstadoResultadosPage: correct calculation, only pagado GAV included
    - BalancePage: Patrimonio = Activo - Pasivo equation holds
    - FlujoCajaPage: Flujo Neto equation holds
    - _Requirements: 18.1–18.4, 19.1–19.3, 20.1–20.2_

- [x] 11. Principal section modules
  - [x] 11.1 Implement `src/app/pages/shipments/DashboardPage.tsx` — Dashboard
    - KPI cards: Productos en Japón, Cajas en Tránsito, Cajas Llegadas, Unidades en Chile, Boletas Pendientes, Ventas del Mes, Margen Promedio
    - Visual timeline: Japón → Tránsito → Chile with counts at each stage
    - Warning alert if day ≥ 3 and no GAV Japón invoice for current month
    - _Requirements: 21.1, 21.2, 21.3_

  - [x] 11.2 Implement `src/app/pages/shipments/ConfiguracionPage.tsx` — Configuración
    - Editable fields: métodos de pago (10 slots), cuentas bancarias (3 entries: titular, RUT, banco, tipo, número), parámetros (arriendo bodega JP, app Beyblade, comisión %)
    - On save: update mock data state, changes reflected across all modules
    - _Requirements: 22.1, 22.2_

  - [x] 11.3 Write unit tests for Principal section modules
    - DashboardPage: KPIs render correctly, GAV alert logic
    - ConfiguracionPage: edits persist in context
    - KPICard: renders title, value, icon
    - _Requirements: 21.1–21.3, 22.1–22.2_

- [x] 12. Checkpoint — All modules verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 19 modules render, navigate, and interact with shared state correctly
  - Verify role switching hides/shows correct modules across all sections


- [x] 13. Documentation — Backend API spec and user guides
  - [x] 13.1 Create `reference/shipments-api-spec.md` — Backend API specification
    - Define RESTful endpoints for all 19 modules with HTTP methods, URL paths, request body schemas, and response schemas
    - Include authentication and role-based authorization requirements per endpoint
    - Define error response formats with HTTP status codes
    - Document business rules and validation constraints per endpoint
    - Written in Spanish
    - _Requirements: 24.1, 24.2, 24.3, 24.4_

  - [x] 13.2 Create `reference/shipments-guia-general.md` — General overview user doc
    - Explain the import flow (Japón → Envío → Internación → Costeo → Chile → Venta)
    - Document the SKU system (`JP-XXXX`) and how it tracks products through the cycle
    - Describe the 4 roles and their access permissions
    - Overview of the 19 modules organized by section
    - Written in Spanish
    - _Requirements: 25.1_

  - [x] 13.3 Create `reference/shipments-guia-tienda.md` — Store-facing user doc
    - Cover Chile modules: Bodega Chile, Ventas, Compras Locales, GAV Chile
    - Step-by-step instructions for common workflows: registering a sale, editing prices, confirming GAV
    - Written in Spanish
    - _Requirements: 25.2_

  - [x] 13.4 Create `reference/shipments-guia-admin.md` — Admin-facing user doc
    - Cover Japan modules, shipping modules, financial modules, Dashboard, and Configuración
    - Step-by-step instructions for: registering purchases, creating boxes, costeo, generating invoices, reading financial statements
    - Written in Spanish
    - _Requirements: 25.3, 25.4_

- [x] 14. Final checkpoint — Complete verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 19 module pages are accessible and functional
  - Verify all 4 documentation files exist in `reference/`
  - Verify role-based access works for all 4 roles

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 14 universal correctness properties from the design document
- Unit tests validate specific UI interactions and edge cases
- All text in the UI and documentation is in Spanish
- No glow effects or pixel-font in the ERP — uses `font-body` (Outfit) and `font-mono` (JetBrains Mono) only
- The design system components (Card, Button, Input, Badge, Modal, Table, EmptyState) are already available and should be reused

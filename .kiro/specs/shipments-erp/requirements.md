si# Requirements Document — Shipments ERP

## Introduction

Sistema ERP de gestión de importaciones para HobbyZamora. Cubre el ciclo completo de compra en Japón → envío → internación aduanera → costeo → bodega Chile → venta. Incluye 19 módulos organizados en 5 secciones (Japón, Envíos, Chile, Finanzas, Principal), navegación lateral con control de acceso por rol, y documentación backend + usuario. El frontend usa React + TypeScript con datos mock (sin backend), integrado al design system existente de HobbyZamora.

## Glossary

- **ERP_App**: La aplicación frontend React que implementa el sistema ERP de importaciones, accesible en la ruta `/shipments`
- **Sidebar**: Componente de navegación lateral del ERP con secciones colapsables y filtrado por rol
- **Module_Page**: Cada una de las 19 páginas funcionales del ERP (Registro de Compras, Bodega Japón, etc.)
- **Mock_Data_Layer**: Capa de datos estáticos en TypeScript que simula respuestas de API para todos los módulos
- **Role_Guard**: Lógica que filtra los módulos visibles en el Sidebar según el rol activo (admin, japon, chile, contador)
- **SKU**: Identificador único de producto con formato `JP-XXXX`, asignado al registrar una compra y persistente a lo largo de todo el ciclo
- **Purchase_Record**: Registro de compra en Japón con SKU, precio en JPY, cantidad, estado de pago y ubicación
- **Invoice**: Boleta generada a partir de productos seleccionados, con comisión configurable y totales en JPY/CLP
- **Box**: Caja de envío que agrupa productos para transporte de Japón a Chile, con costos de flete, mano de obra y materiales
- **Costing**: Proceso de distribución de costos (flete, MO, materiales, internación) entre productos de una caja para calcular costo unitario en CLP
- **Internment**: Registro de arancel CIF e IVA crédito fiscal pagados en aduana chilena
- **Chile_Stock**: Inventario de productos disponibles para venta en Chile, con costo unitario calculado por costeo
- **Sale_Record**: Registro de venta con canal, cantidad, precio de venta y costo unitario
- **GAV**: Gastos de Administración y Ventas — gastos fijos recurrentes (Japón: arriendo bodega + app; Chile: arriendo, contador, etc.)
- **Income_Statement**: Estado de Resultados calculado dinámicamente: Ingresos − Costo de Venta − GAV + IVA Crédito = Resultado Neto
- **Balance_Sheet**: Balance General: Activos (caja + inventarios + IVA crédito) − Pasivos (boletas sin pagar) = Patrimonio
- **Cash_Flow**: Flujo de Caja: Ingresos por ventas − Egresos Japón − Egresos Chile = Flujo Neto
- **Dashboard**: Panel principal con KPIs, alertas y timeline visual del flujo operacional
- **API_Spec_Doc**: Documento markdown que describe endpoints REST, schemas de request/response y reglas de negocio para el equipo backend
- **User_Doc**: Documentos markdown de referencia para usuarios del sistema (overview general, guía tienda, guía admin)
- **Price_Formatter**: Función utilitaria que formatea montos usando locale `es-CL` con prefijo `¥` para JPY y `$` para CLP

---

## Requirements

### Requirement 1: Shipments ERP Shell and Routing

**User Story:** As an admin, I want to access the Shipments ERP at `/shipments` with its own layout and sidebar navigation, so that I can manage imports independently from the store admin.

#### Acceptance Criteria

1. WHEN a user navigates to `/shipments`, THE ERP_App SHALL render a layout with a collapsible Sidebar on the left and a content area on the right, following the same pattern as AdminLayout
2. THE Sidebar SHALL display navigation items grouped into 5 sections: Japón, Envíos, Chile, Finanzas, and Principal
3. WHEN a navigation item is clicked, THE ERP_App SHALL render the corresponding Module_Page in the content area without a full page reload
4. THE ERP_App SHALL define sub-routes under `/shipments/*` for each of the 19 modules (e.g., `/shipments/compras`, `/shipments/bodega-japon`)
5. WHEN the current route matches a navigation item, THE Sidebar SHALL highlight that item with `bg-primary/10 text-primary` styling
6. THE Sidebar SHALL include a role selector dropdown at the top that allows switching between admin, japon, chile, and contador roles
7. THE ERP_App SHALL use design tokens from `src/styles/theme.css` and components from `src/app/components/design-system/` without glow or pixel-font effects

### Requirement 2: Role-Based Navigation Filtering

**User Story:** As a role-restricted user, I want to see only the modules I have access to, so that the interface is not cluttered with irrelevant options.

#### Acceptance Criteria

1. WHEN the active role is "admin", THE Role_Guard SHALL display all 19 modules in the Sidebar
2. WHEN the active role is "japon", THE Role_Guard SHALL display only: Registro de Compras, Boletas, GAV Japón, and Cajas/Envíos
3. WHEN the active role is "chile", THE Role_Guard SHALL display only: Dashboard, Bodega Japón, Bodega Tránsito, Bodega Chile, Ventas, Cajas/Envíos, Compras Web, Internación, Costeo, and Compras Locales
4. WHEN the active role is "contador", THE Role_Guard SHALL display only: Dashboard, Estado de Resultados, Balance, Flujo de Caja, GAV Chile, and GAV Japón
5. WHEN the active role changes, THE Sidebar SHALL immediately update the visible navigation items without a page reload
6. IF the user switches to a role that does not have access to the currently displayed Module_Page, THEN THE ERP_App SHALL redirect to the first accessible module for that role

### Requirement 3: Mock Data Layer

**User Story:** As a developer, I want all ERP modules to use a centralized mock data layer, so that the frontend can be developed and tested without a backend.

#### Acceptance Criteria

1. THE Mock_Data_Layer SHALL provide typed TypeScript data for all ERP entities: purchases, invoices, invoice items, boxes, box products, Chile stock, web orders, local purchases, sales, GAV Japan, GAV Chile, and configuration
2. THE Mock_Data_Layer SHALL include at least 10 Purchase_Record entries with varied payment states (por_pagar, esp_pago, pagado) and locations (japon, transito, chile)
3. THE Mock_Data_Layer SHALL include at least 3 Box entries with states transito, llegada, and costeada, each containing 2-4 products
4. THE Mock_Data_Layer SHALL include at least 5 Chile_Stock entries with calculated costo unitario and varied precio de venta values
5. THE Mock_Data_Layer SHALL include at least 5 Sale_Record entries across different channels (Instagram, TikTok, Mercado Libre, Web, Local)
6. THE Mock_Data_Layer SHALL use the SKU format `JP-XXXX` consistently across all entities that reference products
7. THE Mock_Data_Layer SHALL export a `calcDisponibleBySku(sku: string)` function that returns `compra.cant - unitsInActiveBoxes - unitsInChileStock`

### Requirement 4: Registro de Compras Module (Japan Purchases)

**User Story:** As a Japan operator, I want to register purchases with auto-assigned SKUs, so that every product is tracked from acquisition through the entire import cycle.

#### Acceptance Criteria

1. THE Module_Page for Registro de Compras SHALL display a table of all Purchase_Record entries with columns: SKU, Fecha, Tipo, Nombre, EAN, Tarjeta, Precio ¥, Cantidad, Total ¥, Estado Pago, and Bodega
2. WHEN the "Nueva Compra" button is clicked, THE Module_Page SHALL open a Modal with input fields for: fecha, tipo, nombre, EAN (optional), tarjeta, precio unitario (¥), cantidad, and tipo de cambio (¥→CLP)
3. WHEN a new purchase is submitted, THE Module_Page SHALL auto-assign the next sequential SKU in format `JP-XXXX` (e.g., JP-0011 if the highest existing SKU is JP-0010)
4. THE Module_Page SHALL provide filter controls for payment state (por_pagar, esp_pago, pagado) and location (japon, transito, chile)
5. THE Module_Page SHALL display prices in JPY using the Price_Formatter with `¥` prefix and `es-CL` locale formatting

### Requirement 5: Bodega Japón Module (Japan Warehouse)

**User Story:** As a Japan operator, I want to see available inventory in Japan, so that I know what products can be packed into boxes for shipping.

#### Acceptance Criteria

1. THE Module_Page for Bodega Japón SHALL display only products where `calcDisponibleBySku(sku) > 0`
2. THE Module_Page SHALL show quantity as `disponible / cant_total` format (e.g., "2 / 5")
3. THE Module_Page SHALL display KPI cards at the top: SKUs disponibles, Unidades disponibles, Total ¥, and Total CLP estimado
4. THE Module_Page SHALL provide a filter by payment state (por_pagar, esp_pago, pagado)

### Requirement 6: Boletas Module (Invoices)

**User Story:** As a Japan operator, I want to generate invoices from selected purchases, so that I can track payment obligations with suppliers.

#### Acceptance Criteria

1. THE Module_Page for Boletas SHALL display a table of all Invoice entries with columns: ID, Fecha, Productos, Subtotal ¥, Comisión %, Total ¥, TC, Total CLP, and Estado
2. WHEN the "Generar Boleta" button is clicked, THE Module_Page SHALL open a Modal with checkboxes to select products and an editable comisión percentage field (default 13%)
3. THE Module_Page SHALL calculate totals: subtotal ¥ = sum of selected items, total ¥ = subtotal × (1 + comisión/100), total CLP = total ¥ / TC
4. WHEN an invoice row is clicked, THE Module_Page SHALL display a detail view showing all line items with individual prices and quantities
5. THE Module_Page SHALL display invoice IDs in format `BOL-YYYY-NNN` for regular invoices and `BOL-YYYY-GAV-NNN` for GAV invoices

### Requirement 7: Confirmar Pagos Module (Payment Confirmation)

**User Story:** As a Japan operator, I want to confirm payments against invoices, so that the financial status of purchases is accurately tracked.

#### Acceptance Criteria

1. THE Module_Page for Confirmar Pagos SHALL display a list of Invoice entries with estado `sin_pagar`
2. WHEN an invoice is selected for payment, THE Module_Page SHALL display a form with fields: cuenta bancaria (dropdown), fecha de transferencia, and monto CLP
3. WHEN the payment is confirmed, THE Module_Page SHALL update the invoice estado to `pagado` and update related Purchase_Record entries to estado `pagado`

### Requirement 8: Gastos Fijos Japón Module (Japan Fixed Expenses)

**User Story:** As a Japan operator, I want to track monthly fixed expenses (warehouse rent and app subscription), so that recurring costs are properly recorded.

#### Acceptance Criteria

1. THE Module_Page for GAV Japón SHALL display two fixed expense items: Arriendo Bodega (¥25,000/mes) and App Beyblade (¥550/mes)
2. THE Module_Page SHALL include a "Generar Boleta" button that creates an Invoice with ID format `BOL-YYYY-GAV-NNN` for the current month
3. THE Module_Page SHALL display a history table of the last 6 months showing month, invoice ID, total, and payment status
4. WHEN the current date is day 3 or later of the month and no GAV invoice exists for the current month, THE Module_Page SHALL display a warning alert

### Requirement 9: Cajas / Envíos Module (Boxes / Shipments)

**User Story:** As a Japan operator, I want to create shipping boxes with selected products and cost parameters, so that I can track shipments from Japan to Chile.

#### Acceptance Criteria

1. THE Module_Page for Cajas SHALL display a grid of Box cards showing: nombre, fecha, estado badge (✈️ En tránsito / 📦 Llegada / ✅ Costeada), and product count
2. WHEN the "Nueva Caja" button is clicked, THE Module_Page SHALL open a Modal with fields: nombre (unique), flete UPS (¥), horas MO, tarifa MO (CLP/h), materiales (¥), and TC
3. THE Modal SHALL include a product selector showing only products from Bodega Japón where `calcDisponibleBySku(sku) > 0`, with editable quantity limited to available units
4. WHEN a box is created, THE Module_Page SHALL update the location of fully-shipped products from `japon` to `transito`
5. THE Module_Page SHALL display action buttons per box based on state: transito → Ver, Editar, Eliminar; llegada → Ver, Hacer Costeo, Eliminar; costeada → Ver only

### Requirement 10: Bodega Tránsito Module (Transit Warehouse)

**User Story:** As a Chile operator, I want to see all boxes in transit and their contents, so that I can plan for incoming inventory.

#### Acceptance Criteria

1. THE Module_Page for Bodega Tránsito SHALL display boxes grouped by state: transito, llegada, and costeada
2. THE Module_Page SHALL display KPI cards: Cajas en tránsito, Llegadas pendientes, and Costeadas
3. WHEN a box card is expanded, THE Module_Page SHALL show a product list with nombre, SKU, cantidad, and valor ¥
4. WHEN a box is in state `llegada`, THE Module_Page SHALL display a "Hacer Costeo" button that navigates to the Costeo module

### Requirement 11: Compras Web Module (Web Purchases)

**User Story:** As an operator, I want to register purchases from online portals (Amazon JP, Rakuten, etc.), so that web-sourced products are tracked alongside Japan purchases.

#### Acceptance Criteria

1. THE Module_Page for Compras Web SHALL display a table of web orders with columns: ID, Fecha, Portal, N° Orden, Estado, and Total
2. WHEN the "Nuevo Pedido" button is clicked, THE Module_Page SHALL open a Modal with fields: portal (dropdown: Amazon Japan, Amazon USA, Rakuten, etc.), N° orden, fecha, TC, costo envío internacional, and a dynamic product list
3. THE Module_Page SHALL support multiple currencies (USD, JPY, CLP) with configurable exchange rate per order
4. THE Module_Page SHALL display order IDs in format `WEB-NNN`

### Requirement 12: Internación Module (Customs Entry)

**User Story:** As a Chile operator, I want to register customs duties and VAT for each box, so that import costs are accurately recorded for costing.

#### Acceptance Criteria

1. THE Module_Page for Internación SHALL display a table of boxes with their internment status (pendiente / registrada)
2. WHEN a box is selected, THE Module_Page SHALL display input fields for: arancel CIF (CLP) and IVA pagado en aduana (CLP)
3. WHEN internment data is saved, THE Module_Page SHALL store the arancel and IVA values on the Box entity and mark the IVA as IVA Crédito Fiscal

### Requirement 13: Costeo de Cajas Module (Box Costing)

**User Story:** As a Chile operator, I want to distribute all import costs across products in a box, so that each product has an accurate unit cost in CLP.

#### Acceptance Criteria

1. THE Module_Page for Costeo SHALL display a selector of boxes with state `llegada`
2. WHEN a box is selected, THE Module_Page SHALL display a costing table with columns: SKU, Nombre, Cantidad, % Costo, and Costo Unitario CLP
3. THE Module_Page SHALL calculate costo unitario as: `(subtotalCLP × pct/100 + fleteCLP × pct/100 + moCLP × pct/100 + matCLP × pct/100 + internCLP × pct/100) / cant`
4. THE Module_Page SHALL validate that the sum of all product cost percentages equals 100% before allowing confirmation
5. WHEN costeo is confirmed, THE Module_Page SHALL create Chile_Stock entries with the calculated costo unitario and update the box state to `costeada`

### Requirement 14: Bodega Chile Module (Chile Warehouse)

**User Story:** As a Chile operator, I want to manage inventory available for sale with editable prices and margin visibility, so that I can optimize pricing decisions.

#### Acceptance Criteria

1. THE Module_Page for Bodega Chile SHALL display a table of Chile_Stock entries with columns: SKU, Nombre, EAN, Caja, Cantidad, Costo Unitario, Precio Venta, and Margen %
2. THE Module_Page SHALL allow inline editing of the Precio Venta field for each product
3. THE Module_Page SHALL calculate and display margin as `(precioVenta - costoUnit) / precioVenta × 100`, color-coded: green (>30%), orange (>15%), red (<15%)
4. THE Module_Page SHALL display KPI cards: Unidades totales, Valor inventario (CLP), and Productos sin precio de venta

### Requirement 15: Ventas Module (Sales)

**User Story:** As a Chile operator, I want to register sales from multiple channels, so that revenue and inventory are accurately tracked.

#### Acceptance Criteria

1. THE Module_Page for Ventas SHALL display a table of Sale_Record entries with columns: ID, Fecha, Producto, Cantidad, Precio Venta, Costo, Total, and Canal
2. WHEN the "Nueva Venta" button is clicked, THE Module_Page SHALL open a Modal with fields: producto (dropdown from Chile_Stock), cantidad, precio de venta, and canal (Instagram, TikTok, Mercado Libre, Web, Local)
3. WHEN a sale is registered, THE Module_Page SHALL deduct the sold quantity from the corresponding Chile_Stock entry
4. THE Module_Page SHALL display all monetary values in CLP using the Price_Formatter with `$` prefix and `es-CL` locale

### Requirement 16: Compras Locales Module (Local Purchases)

**User Story:** As a Chile operator, I want to register local purchases and expenses in Chile, so that all operational costs are tracked.

#### Acceptance Criteria

1. THE Module_Page for Compras Locales SHALL display a table with columns: ID, Fecha, Tipo, Doc. Tipo, Proveedor, Descripción, Monto, IVA, and Estado
2. WHEN the "Nueva Compra" button is clicked, THE Module_Page SHALL open a Modal with fields: tipo (producto/gasto), documento (factura/boleta), proveedor, descripción, monto CLP, and estado
3. WHEN documento tipo is "factura", THE Module_Page SHALL display an additional IVA field and mark the IVA as crédito fiscal
4. THE Module_Page SHALL display purchase IDs in format `CC-NNN`

### Requirement 17: Gastos Fijos Chile Module (Chile Fixed Expenses)

**User Story:** As an accountant, I want to track and confirm monthly fixed expenses in Chile with mandatory receipts, so that only verified expenses appear in financial statements.

#### Acceptance Criteria

1. THE Module_Page for GAV Chile SHALL display a table of GAV entries with columns: Concepto, Monto, Comprobante, Estado, and Acciones
2. THE Module_Page SHALL require a comprobante (receipt indicator) to be marked before allowing payment confirmation
3. IF the "Confirmar" button is clicked without a comprobante, THEN THE Module_Page SHALL display an error message and highlight the comprobante field with a red border
4. WHEN a GAV entry is confirmed, THE Module_Page SHALL update the entry estado to `pagado` with the current date

### Requirement 18: Estado de Resultados Module (Income Statement)

**User Story:** As an accountant, I want to view a dynamic income statement, so that I can assess the profitability of the import operation.

#### Acceptance Criteria

1. THE Module_Page for Estado de Resultados SHALL calculate and display: Ingresos (ventas por canal), Costo de Venta, Margen Bruto, GAV Japón, GAV Chile, EBIT, IVA Crédito, and Resultado Neto
2. THE Income_Statement SHALL include only GAV entries with estado `pagado` in the expense calculations
3. THE Module_Page SHALL display all monetary values in CLP using the Price_Formatter
4. THE Module_Page SHALL group revenue by sales channel (Instagram, TikTok, Mercado Libre, Web, Local)

### Requirement 19: Balance General Module (Balance Sheet)

**User Story:** As an accountant, I want to view the balance sheet, so that I can understand the financial position of the business.

#### Acceptance Criteria

1. THE Module_Page for Balance SHALL calculate and display: Activos (Caja estimada + Inventario Chile + Inventario Japón + IVA Crédito), Pasivos (Boletas sin pagar), and Patrimonio (Activo − Pasivo)
2. THE Balance_Sheet SHALL value Inventario Chile using costo unitario from Chile_Stock entries
3. THE Balance_Sheet SHALL value Inventario Japón using precio unitario in JPY converted to CLP at the purchase exchange rate

### Requirement 20: Flujo de Caja Module (Cash Flow)

**User Story:** As an accountant, I want to view the cash flow statement, so that I can monitor operational liquidity.

#### Acceptance Criteria

1. THE Module_Page for Flujo de Caja SHALL calculate and display: Ingresos (ventas confirmadas), Egresos Japón (boletas pagadas), Egresos Chile (GAV Chile pagado + compras locales pagadas), and Flujo Neto
2. THE Cash_Flow SHALL display a summary card with Flujo Neto highlighted in green (positive) or red (negative)

### Requirement 21: Dashboard Module

**User Story:** As an admin, I want a dashboard with KPIs and alerts, so that I can quickly assess the state of the import operation.

#### Acceptance Criteria

1. THE Module_Page for Dashboard SHALL display KPI cards: Productos en Japón, Cajas en Tránsito, Cajas Llegadas, Unidades en Chile, Boletas Pendientes, Ventas del Mes, and Margen Promedio
2. THE Dashboard SHALL display a visual timeline showing the flow: Japón → Tránsito → Chile with counts at each stage
3. WHEN the current date is day 3 or later and no GAV Japón invoice exists for the current month, THE Dashboard SHALL display a warning alert for pending GAV

### Requirement 22: Configuración Module (Settings)

**User Story:** As an admin, I want to configure payment methods, bank accounts, and system parameters, so that the ERP reflects the current operational setup.

#### Acceptance Criteria

1. THE Module_Page for Configuración SHALL display editable fields for: métodos de pago (10 slots), cuentas bancarias (3 entries with titular, RUT, banco, tipo, número), and parámetros (arriendo bodega JP, app Beyblade, comisión %)
2. WHEN configuration values are changed, THE Module_Page SHALL update the mock data state and reflect changes across all modules that reference configuration

### Requirement 23: Currency Formatting

**User Story:** As a user, I want all monetary values displayed with correct currency symbols and Chilean locale formatting, so that financial data is easy to read.

#### Acceptance Criteria

1. THE Price_Formatter SHALL format JPY values with `¥` prefix and `es-CL` locale (e.g., `¥25.000`)
2. THE Price_Formatter SHALL format CLP values with `$` prefix and `es-CL` locale (e.g., `$1.250.000`)
3. THE ERP_App SHALL use `font-[family-name:var(--font-mono)]` and `text-primary` classes for all price displays

### Requirement 24: Backend API Specification Documentation

**User Story:** As a backend developer, I want a comprehensive API specification document, so that I can implement the REST endpoints needed by the ERP frontend.

#### Acceptance Criteria

1. THE API_Spec_Doc SHALL define RESTful endpoints for all 19 modules with HTTP methods, URL paths, request body schemas, and response schemas
2. THE API_Spec_Doc SHALL include authentication and role-based authorization requirements for each endpoint
3. THE API_Spec_Doc SHALL define error response formats with appropriate HTTP status codes
4. THE API_Spec_Doc SHALL be written in markdown and placed in the `reference/` directory

### Requirement 25: User Documentation

**User Story:** As a user, I want reference documentation explaining how the shipments system works, so that I can understand the import workflow and use each module effectively.

#### Acceptance Criteria

1. THE User_Doc SHALL include a general overview document explaining the import flow, SKU system, roles, and module organization
2. THE User_Doc SHALL include a store-facing document covering Chile modules: Bodega Chile, Ventas, Compras Locales, and GAV Chile
3. THE User_Doc SHALL include an admin-facing document covering Japan modules, shipping modules, financial modules, Dashboard, and Configuración
4. THE User_Doc files SHALL be written in Spanish and placed in the `reference/` directory

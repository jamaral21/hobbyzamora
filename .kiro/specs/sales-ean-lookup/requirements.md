# Requirements Document

## Introduction

Este documento define los requisitos para el feature "Sales EAN Lookup", que agrega un filtro multi-select de productos (por EAN, SKU o nombre) al Dashboard de ventas existente (`/admin`). Cuando se seleccionan productos, todas las secciones del dashboard se recalculan mostrando solo datos de esos productos. Adicionalmente aparece un panel de discrepancia de inventario. Cuando no hay productos seleccionados, el dashboard funciona exactamente como hoy.

## Glossary

- **Dashboard**: La página de administración `/admin` que muestra KPIs de ventas, gráfico, resumen por SKU y detalle de órdenes.
- **ProductFilterBar**: Componente combobox multi-select buscable que permite al admin filtrar el dashboard por uno o más productos.
- **InventoryDiscrepancyPanel**: Panel que muestra información de inventario y discrepancias de stock para los productos seleccionados.
- **KPI_Cards**: Las tres tarjetas de indicadores clave (Ventas, Costos, Margen) en la parte superior del dashboard.
- **SKU_Summary**: Tabla "Resumen por SKU" que agrega ventas por producto.
- **Order_Detail**: Sección "Detalle de Ventas" que lista las órdenes individuales.
- **SalesChart**: Gráfico de ventas diarias del dashboard.
- **Product_Search_Endpoint**: `GET /api/products/search` — endpoint que busca productos por nombre, SKU o EAN.
- **Dashboard_Stats_Endpoint**: `GET /api/analytics/dashboard` — endpoint que retorna KPIs agregados.
- **Sales_Chart_Endpoint**: `GET /api/analytics/sales-chart` — endpoint que retorna datos del gráfico de ventas.
- **Orders_Endpoint**: `GET /api/orders` — endpoint que retorna órdenes filtradas.
- **Inventory_Discrepancy_Endpoint**: `GET /api/analytics/inventory-discrepancy` — endpoint que retorna datos de inventario y discrepancia.
- **Discrepancy**: Diferencia entre el stock esperado (totalReceived − totalSold) y el stock real registrado (totalRemaining).
- **productIds**: Parámetro de query string opcional que contiene UUIDs de productos separados por coma.

## Requirements

### Requirement 1: Product Filter Bar

**User Story:** As an admin, I want to search and select products by EAN, SKU, or name in the dashboard, so that I can analyze sales data for specific products.

#### Acceptance Criteria

1. WHEN the admin visits the Dashboard page, THE ProductFilterBar SHALL render a searchable multi-select combobox alongside the existing date filter
2. WHEN the admin types a search term of 2 or more characters into the ProductFilterBar, THE ProductFilterBar SHALL fetch matching products from the Product_Search_Endpoint after a 300ms debounce
3. WHEN the admin types a search term shorter than 2 characters, THE ProductFilterBar SHALL display no search results and make no API call
4. WHEN the admin selects a product from the search results, THE ProductFilterBar SHALL add the product as a removable chip and emit the updated list of selected product IDs
5. WHEN the admin removes a chip from the ProductFilterBar, THE ProductFilterBar SHALL remove that product from the selection and emit the updated list of selected product IDs
6. WHEN the admin clicks the "Limpiar filtro" button, THE ProductFilterBar SHALL clear all selected products and emit an empty list of product IDs

### Requirement 2: Dashboard Filtering — KPI Cards

**User Story:** As an admin, I want the KPI cards to reflect only the selected products, so that I can see sales, costs, and margin for specific products.

#### Acceptance Criteria

1. WHEN productIds are provided to the Dashboard_Stats_Endpoint, THE Dashboard_Stats_Endpoint SHALL calculate totalSales, totalCost, totalMargin, and orderCount only from OrderItems where productId is in the provided list within non-cancelled and non-refunded orders
2. WHEN productIds are not provided to the Dashboard_Stats_Endpoint, THE Dashboard_Stats_Endpoint SHALL return stats for all products identically to the pre-feature behavior
3. THE Dashboard_Stats_Endpoint SHALL compute marginPercent as (totalMargin / totalSales) × 100 when totalSales is greater than zero, and as zero otherwise

### Requirement 3: Dashboard Filtering — Sales Chart

**User Story:** As an admin, I want the sales chart to show only data for the selected products, so that I can visualize their sales trend over time.

#### Acceptance Criteria

1. WHEN productIds are provided to the Sales_Chart_Endpoint, THE Sales_Chart_Endpoint SHALL aggregate daily revenue only from OrderItems matching those productIds within non-cancelled and non-refunded orders
2. WHEN productIds are not provided to the Sales_Chart_Endpoint, THE Sales_Chart_Endpoint SHALL return chart data identically to the pre-feature behavior
3. THE Sales_Chart_Endpoint SHALL return exactly one entry per day for the requested number of days, including days with zero sales for the filtered products

### Requirement 4: Dashboard Filtering — Orders

**User Story:** As an admin, I want the order list and SKU summary to show only orders containing the selected products, so that I can review individual transactions for those products.

#### Acceptance Criteria

1. WHEN productIds are provided to the Orders_Endpoint, THE Orders_Endpoint SHALL return only orders that contain at least one OrderItem with a productId in the provided list
2. WHEN productIds are provided to the Orders_Endpoint, THE Orders_Endpoint SHALL return the full item list for each matching order without filtering individual OrderItems
3. WHEN productIds are not provided to the Orders_Endpoint, THE Orders_Endpoint SHALL return orders identically to the pre-feature behavior
4. WHEN productIds are provided to the Orders_Endpoint, THE Orders_Endpoint SHALL reflect the filtered set in pagination counts

### Requirement 5: Retrocompatibility

**User Story:** As an admin, I want the dashboard to work exactly as before when no products are selected, so that existing functionality is preserved.

#### Acceptance Criteria

1. WHEN the selectedProductIds list is empty, THE Dashboard SHALL display all data sections (KPI_Cards, SalesChart, SKU_Summary, Order_Detail) with unfiltered data identical to the pre-feature behavior
2. WHEN the selectedProductIds list is empty, THE Dashboard SHALL not render the InventoryDiscrepancyPanel

### Requirement 6: Inventory Discrepancy Panel

**User Story:** As an admin, I want to see inventory discrepancy information for the selected products, so that I can identify stock inconsistencies.

#### Acceptance Criteria

1. WHEN one or more products are selected in the ProductFilterBar, THE Dashboard SHALL render the InventoryDiscrepancyPanel
2. WHEN productIds are provided to the Inventory_Discrepancy_Endpoint, THE Inventory_Discrepancy_Endpoint SHALL return per-product inventory data including currentStock, totalReceived, totalSold, totalRemaining, expectedRemaining, and discrepancy
3. THE Inventory_Discrepancy_Endpoint SHALL compute expectedRemaining as totalReceived minus totalSold for each product
4. THE Inventory_Discrepancy_Endpoint SHALL compute discrepancy as expectedRemaining minus totalRemaining for each product
5. THE Inventory_Discrepancy_Endpoint SHALL exclude orders with status CANCELLED or REFUNDED from the totalSold calculation
6. WHEN discrepancy is greater than zero, THE InventoryDiscrepancyPanel SHALL highlight the row in red to indicate missing stock
7. WHEN discrepancy is less than zero, THE InventoryDiscrepancyPanel SHALL highlight the row in amber to indicate extra stock
8. WHEN discrepancy equals zero, THE InventoryDiscrepancyPanel SHALL highlight the row in green to indicate consistent inventory

### Requirement 7: Product Search Endpoint

**User Story:** As an admin, I want to search for products by name, SKU, or EAN in the filter combobox, so that I can quickly find the products I want to analyze.

#### Acceptance Criteria

1. WHEN a search query is provided to the Product_Search_Endpoint, THE Product_Search_Endpoint SHALL search across Product name, SKU, and EAN fields
2. THE Product_Search_Endpoint SHALL return only products with status ACTIVE
3. THE Product_Search_Endpoint SHALL return a maximum of 20 results per query
4. THE Product_Search_Endpoint SHALL return id, name, sku, and ean for each matching product
5. THE Product_Search_Endpoint SHALL perform no write operations on the database

### Requirement 8: Cancelled and Refunded Order Exclusion

**User Story:** As an admin, I want cancelled and refunded orders excluded from all calculations, so that the dashboard reflects actual business performance.

#### Acceptance Criteria

1. THE Dashboard_Stats_Endpoint SHALL exclude orders with status CANCELLED or REFUNDED from totalSales, totalCost, totalMargin, and orderCount calculations, both with and without the productIds filter
2. THE Sales_Chart_Endpoint SHALL exclude orders with status CANCELLED or REFUNDED from daily sales and revenue aggregation, both with and without the productIds filter

### Requirement 9: Error Handling

**User Story:** As an admin, I want the dashboard to handle errors gracefully, so that partial failures do not break the entire page.

#### Acceptance Criteria

1. IF the productIds query parameter contains non-UUID values, THEN THE backend endpoints SHALL ignore the invalid IDs and process only valid ones
2. IF all productIds are invalid, THEN THE backend endpoints SHALL behave as if no productIds filter was applied
3. IF the Product_Search_Endpoint returns no results, THEN THE ProductFilterBar SHALL display a "No se encontraron productos" message
4. IF the Inventory_Discrepancy_Endpoint returns an error, THEN THE InventoryDiscrepancyPanel SHALL display an error message without affecting the KPI_Cards, SalesChart, or Order_Detail sections
5. IF the selected products have no orders in the date range, THEN THE Dashboard SHALL display zero values in KPI_Cards, a flat zero line in SalesChart, and empty states in SKU_Summary and Order_Detail

### Requirement 10: Security and Authorization

**User Story:** As a system administrator, I want all new and modified endpoints to enforce authentication and role checks, so that unauthorized users cannot access admin data.

#### Acceptance Criteria

1. THE Product_Search_Endpoint SHALL require authentication and ADMIN or STAFF role
2. THE Inventory_Discrepancy_Endpoint SHALL require authentication and ADMIN or STAFF role
3. THE modified Dashboard_Stats_Endpoint, Sales_Chart_Endpoint, and Orders_Endpoint SHALL retain their existing authentication and role requirements without changes

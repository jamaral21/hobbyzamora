# Implementation Plan: Sales EAN Lookup (Dashboard Product Filter)

## Overview

Add a multi-select product filter (by EAN, SKU, or name) to the existing admin Dashboard. When products are selected, all dashboard sections recalculate for those products only. When no products are selected, the dashboard behaves identically to today. Implementation touches backend endpoints (analytics, orders), a new product search endpoint, a new inventory discrepancy endpoint, frontend API client, hooks, and two new UI components.

## Tasks

- [x] 1. Add product search endpoint and extend backend analytics/orders endpoints
  - [x] 1.1 Create `GET /api/products/search` endpoint in `server/src/routes/products.ts`
    - Search across `Product.name` (contains), `Product.sku` (contains), and `Product.ean` (cast to string, contains)
    - Return only ACTIVE products, max 20 results
    - Return `{ id, name, sku, ean }` per product
    - Require `authenticate` + `requireRole('ADMIN', 'STAFF')`
    - No write operations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1_

  - [x] 1.2 Add `productIds` filter to `GET /api/analytics/dashboard` in `server/src/routes/analytics.ts`
    - Parse optional `productIds` query param (comma-separated UUIDs)
    - Filter invalid (non-UUID) values; if all invalid, behave as unfiltered
    - When productIds present: calculate `totalSales`, `totalCost`, `totalMargin`, `orderCount` from OrderItems where `productId IN productIds` within non-cancelled/non-refunded orders in the date range
    - When productIds absent: behavior unchanged
    - Compute `marginPercent = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0`
    - _Requirements: 2.1, 2.2, 2.3, 8.1, 9.1, 9.2, 10.3_

  - [x] 1.3 Add `productIds` filter to `GET /api/analytics/sales-chart` in `server/src/routes/analytics.ts`
    - Parse optional `productIds` query param (comma-separated UUIDs)
    - When productIds present: aggregate daily revenue from OrderItems matching those productIds within non-cancelled/non-refunded orders
    - When productIds absent: behavior unchanged
    - Always return exactly one entry per day for the requested number of days
    - _Requirements: 3.1, 3.2, 3.3, 8.2, 10.3_

  - [x] 1.4 Add `productIds` filter to `GET /api/orders` in `server/src/routes/orders.ts`
    - Parse optional `productIds` query param (comma-separated UUIDs)
    - When productIds present: return only orders containing at least one OrderItem with `productId IN productIds`
    - Return full item list per order (do not filter individual items)
    - Pagination counts reflect the filtered set
    - When productIds absent: behavior unchanged
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 10.3_

  - [x] 1.5 Create `GET /api/analytics/inventory-discrepancy` endpoint in `server/src/routes/analytics.ts`
    - Require `productIds` query param (comma-separated UUIDs, at least one valid)
    - Require `authenticate` + `requireRole('ADMIN', 'STAFF')`
    - For each productId: query InventoryBatch (totalReceived = sum quantity, totalRemaining = sum remaining) and OrderItem aggregate (totalSold = sum quantity, excluding CANCELLED/REFUNDED orders)
    - Compute `expectedRemaining = totalReceived - totalSold`, `discrepancy = expectedRemaining - totalRemaining`
    - Return `{ products: [{ productId, productName, sku, ean, currentStock, totalReceived, totalSold, totalRemaining, expectedRemaining, discrepancy }] }`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 10.2_

  - [ ]* 1.6 Write property tests for backend endpoints using fast-check
    - **Property 1: Retrocompatibility — empty filter = no change**
    - **Validates: Requirements 2.2, 3.2, 4.3, 5.1**

  - [ ]* 1.7 Write property test for KPI filtered calculation correctness
    - **Property 2: KPI filtered calculation correctness**
    - **Validates: Requirements 2.1, 8.1**

  - [ ]* 1.8 Write property test for margin percent formula
    - **Property 3: Margin percent formula**
    - **Validates: Requirement 2.3**

  - [ ]* 1.9 Write property test for chart completeness invariant
    - **Property 5: Chart completeness invariant**
    - **Validates: Requirement 3.3**

  - [ ]* 1.10 Write property test for discrepancy formula correctness
    - **Property 8: Discrepancy formula correctness**
    - **Validates: Requirements 6.3, 6.4, 6.5**

- [x] 2. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Extend frontend API client and data hooks
  - [x] 3.1 Add `productIds` param to `analyticsAPI.getDashboard` and `analyticsAPI.getSalesChart` in `src/app/lib/api.ts`
    - Build `productIds` query param as comma-separated string when provided
    - Add new `analyticsAPI.getInventoryDiscrepancy(productIds: string[])` method
    - Add new `productsAPI.search(query: string, limit?: number)` method
    - Add `InventoryDiscrepancyResponse` and `ProductSearchResult` types
    - _Requirements: 2.1, 3.1, 6.2, 7.4_

  - [x] 3.2 Add `productIds` param to `ordersAPI.getAll` in `src/app/lib/api.ts`
    - Append `productIds` as comma-separated query param when provided
    - _Requirements: 4.1_

  - [x] 3.3 Update hooks in `src/app/hooks/useData.ts`
    - Update `useDashboardStats` to accept optional `productIds` param and pass to API
    - Update `useSalesChart` to accept optional `productIds` param and pass to API
    - Update `useOrders` to accept optional `productIds` param and pass to API
    - Add `useProductSearch(query: string)` hook with 300ms debounce, min 2 chars
    - Add `useInventoryDiscrepancy(productIds: string[])` hook (enabled only when productIds non-empty)
    - _Requirements: 1.2, 1.3, 6.1_

  - [ ]* 3.4 Write unit tests for `useProductSearch` hook
    - Test debounce behavior, min character threshold, result capping
    - _Requirements: 1.2, 1.3_

- [x] 4. Build ProductFilterBar component
  - [x] 4.1 Create `src/app/components/admin/ProductFilterBar.tsx`
    - Implement searchable multi-select combobox using existing design system primitives (Input, Dropdown/Popover)
    - Show barcode/search icon in the input
    - Use `useProductSearch` hook for fetching results
    - Display selected products as removable chips/tags
    - Provide "Limpiar filtro" button to clear all selections
    - Emit `onFilterChange(productIds: string[])` on every selection change
    - Show "No se encontraron productos" when search returns empty
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.3_

  - [ ]* 4.2 Write unit tests for ProductFilterBar
    - Test chip rendering, selection/deselection, clear button, empty state message
    - **Property 11: Product selection round-trip**
    - **Validates: Requirements 1.4, 1.5**

- [x] 5. Build InventoryDiscrepancyPanel component
  - [x] 5.1 Create `src/app/components/admin/InventoryDiscrepancyPanel.tsx`
    - Render a table/card showing per-product inventory info: productName, sku, ean, currentStock, totalReceived, totalSold, expectedRemaining, discrepancy
    - Highlight rows: red for discrepancy > 0 (missing stock), amber for discrepancy < 0 (extra stock), green for discrepancy === 0
    - Show summary row with totals
    - Only render when data array is non-empty
    - Show error message if endpoint fails, without affecting other dashboard sections
    - _Requirements: 6.1, 6.6, 6.7, 6.8, 9.4_

  - [ ]* 5.2 Write unit tests for InventoryDiscrepancyPanel
    - Test color highlighting logic, summary row, empty state, error state
    - _Requirements: 6.6, 6.7, 6.8, 9.4_

- [x] 6. Checkpoint — Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate filter into DashboardPage and wire everything together
  - [x] 7.1 Update `src/app/pages/admin/DashboardPage.tsx`
    - Add `selectedProductIds` state (`useState<string[]>([])`)
    - Render `ProductFilterBar` in the header area alongside the date filter
    - Pass `selectedProductIds` to `useDashboardStats`, `useSalesChart`, and `useOrders` hooks
    - Pass `selectedProductIds` to `useInventoryDiscrepancy` hook
    - Filter `skuSummary` useMemo by `selectedProductIds` when set (client-side)
    - Conditionally render `InventoryDiscrepancyPanel` only when `selectedProductIds.length > 0`
    - Ensure empty `selectedProductIds` results in unfiltered dashboard (retrocompatibility)
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 6.1, 9.5_

  - [ ]* 7.2 Write integration tests for DashboardPage with product filter
    - Test that selecting products triggers filtered API calls
    - Test that clearing filter returns to unfiltered state
    - Test that inventory panel appears/disappears based on selection
    - **Property 6: Order inclusion rule**
    - **Validates: Requirements 4.1, 5.1, 6.1**

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- No database schema changes are needed — all models already exist
- The implementation uses TypeScript throughout (backend Express + Prisma, frontend React)

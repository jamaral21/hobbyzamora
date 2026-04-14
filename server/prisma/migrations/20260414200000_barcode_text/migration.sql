-- Migration: restore barcode column to TEXT
-- The migration 20260413221802_add_presale_reservations accidentally changed
-- barcode from TEXT to INTEGER (32-bit), breaking EAN-13 codes (up to 13 digits).
-- This migration recreates the products table with barcode as TEXT.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "cost" DECIMAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "barcode" TEXT,
    "isPresale" BOOLEAN NOT NULL DEFAULT false,
    "presaleMaxQty" INTEGER,
    "presaleAvailQty" INTEGER,
    "presaleEndDate" DATETIME,
    "arrivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_products" SELECT
    "id", "sku", "name", "description", "category", "price", "cost", "stock",
    "images", "status",
    CAST("barcode" AS TEXT),
    "isPresale", "presaleMaxQty", "presaleAvailQty", "presaleEndDate", "arrivedAt",
    "createdAt", "updatedAt"
FROM "products";

DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

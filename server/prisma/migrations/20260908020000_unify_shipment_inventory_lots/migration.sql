-- Link all inventory lots to their shipment origin and retain non-sellable units
-- without turning them into storefront stock.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_inventory_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT,
    "shipmentBoxId" TEXT,
    "batchCode" TEXT NOT NULL,
    "ean" TEXT,
    "disposition" TEXT NOT NULL DEFAULT 'SELLABLE',
    "quantity" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "unitCost" DECIMAL NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_batches_shipmentBoxId_fkey" FOREIGN KEY ("shipmentBoxId") REFERENCES "shipments_boxes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_inventory_batches" ("id", "productId", "batchCode", "quantity", "remaining", "unitCost", "receivedAt")
SELECT "id", "productId", "batchCode", "quantity", "remaining", "unitCost", "receivedAt"
FROM "inventory_batches";

DROP TABLE "inventory_batches";
ALTER TABLE "new_inventory_batches" RENAME TO "inventory_batches";

CREATE INDEX "inventory_batches_productId_receivedAt_idx" ON "inventory_batches"("productId", "receivedAt");
CREATE INDEX "inventory_batches_ean_idx" ON "inventory_batches"("ean");
CREATE INDEX "inventory_batches_shipmentBoxId_idx" ON "inventory_batches"("shipmentBoxId");
CREATE INDEX "inventory_batches_disposition_idx" ON "inventory_batches"("disposition");

ALTER TABLE "shipments_boxes" ADD COLUMN "isHistorical" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shipments_boxes" ADD COLUMN "deductPurchaseUnits" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "inventory_reconciliations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT,
    "ean" TEXT,
    "nombre" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "importedVia" TEXT NOT NULL DEFAULT 'manual',
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "inventory_reconciliations_productId_idx" ON "inventory_reconciliations"("productId");
CREATE INDEX "inventory_reconciliations_ean_idx" ON "inventory_reconciliations"("ean");
CREATE INDEX "inventory_reconciliations_occurredAt_idx" ON "inventory_reconciliations"("occurredAt");

CREATE TABLE "inventory_consumptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_consumptions_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inventory_consumptions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "inventory_consumptions_orderItemId_idx" ON "inventory_consumptions"("orderItemId");
CREATE INDEX "inventory_consumptions_batchId_idx" ON "inventory_consumptions"("batchId");

PRAGMA foreign_keys=ON;
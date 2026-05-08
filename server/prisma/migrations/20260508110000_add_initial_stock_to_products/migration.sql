-- Add persisted initial stock field for products
ALTER TABLE "products" ADD COLUMN "initialStock" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows so current stock becomes the initial baseline
UPDATE "products"
SET "initialStock" = "stock"
WHERE "initialStock" = 0;

ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "orders" ADD COLUMN "shippingCompany" TEXT;
ALTER TABLE "orders" ADD COLUMN "reviewToken" TEXT;
ALTER TABLE "orders" ADD COLUMN "reviewRequestedAt" DATETIME;

CREATE UNIQUE INDEX "orders_reviewToken_key" ON "orders"("reviewToken");

CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "reviews_orderId_productId_key" ON "reviews"("orderId", "productId");
CREATE INDEX "reviews_status_createdAt_idx" ON "reviews"("status", "createdAt");
ALTER TABLE "product_variants" ADD COLUMN "condition" TEXT;
ALTER TABLE "product_variants" ADD COLUMN "paymentType" TEXT;
ALTER TABLE "presale_reservations" ADD COLUMN "variantKey" TEXT NOT NULL DEFAULT '';
DROP INDEX "presale_reservations_userId_productId_key";
CREATE UNIQUE INDEX "presale_reservations_userId_productId_variantKey_key" ON "presale_reservations"("userId", "productId", "variantKey");

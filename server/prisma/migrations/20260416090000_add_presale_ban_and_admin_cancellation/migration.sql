ALTER TABLE "users" ADD COLUMN "presaleBanned" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "presale_reservations" ADD COLUMN "cancellationReason" TEXT;
ALTER TABLE "presale_reservations" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "presale_reservations" ADD COLUMN "cancelledBy" TEXT;

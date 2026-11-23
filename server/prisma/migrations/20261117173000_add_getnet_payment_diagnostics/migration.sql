ALTER TABLE "payments" ADD COLUMN "getnetStatus" TEXT;
ALTER TABLE "payments" ADD COLUMN "getnetResponseCode" TEXT;
ALTER TABLE "payments" ADD COLUMN "getnetResponseMessage" TEXT;

CREATE TABLE "getnet_payment_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "paymentId" TEXT,
    "requestId" TEXT,
    "event" TEXT NOT NULL,
    "gatewayStatus" TEXT,
    "responseCode" TEXT,
    "responseMessage" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "getnet_payment_logs_createdAt_idx" ON "getnet_payment_logs"("createdAt");
CREATE INDEX "getnet_payment_logs_event_createdAt_idx" ON "getnet_payment_logs"("event", "createdAt");
CREATE INDEX "getnet_payment_logs_responseCode_createdAt_idx" ON "getnet_payment_logs"("responseCode", "createdAt");

INSERT INTO "getnet_payment_logs" (
    "id",
    "orderId",
    "orderNumber",
    "paymentId",
    "requestId",
    "event",
    "responseMessage",
    "createdAt"
)
SELECT
    lower(hex(randomblob(16))),
    o."id",
    o."orderNumber",
    p."id",
    p."getnetPaymentId",
    'LEGACY_DECLINED',
    'Rechazo anterior al registro de diagnósticos; no se guardó el código ni el motivo de Getnet.',
    p."updatedAt"
FROM "payments" p
JOIN "orders" o ON o."id" = p."orderId"
WHERE p."method" = 'GETNET' AND p."status" = 'DECLINED';

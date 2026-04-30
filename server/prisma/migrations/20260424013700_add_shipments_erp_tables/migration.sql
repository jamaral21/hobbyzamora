-- CreateTable
CREATE TABLE "shipments_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ean" TEXT,
    "tarjeta" TEXT NOT NULL,
    "precioU" DECIMAL NOT NULL,
    "cant" INTEGER NOT NULL,
    "total" DECIMAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'por_pagar',
    "bodega" TEXT NOT NULL DEFAULT 'japon',
    "tc" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "subtotalJPY" DECIMAL NOT NULL,
    "comision" DECIMAL NOT NULL,
    "totalJPY" DECIMAL NOT NULL,
    "tc" DECIMAL NOT NULL,
    "totalCLP" DECIMAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'sin_pagar',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_invoice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ean" TEXT,
    "precioU" DECIMAL NOT NULL,
    "cant" INTEGER NOT NULL,
    "comPct" DECIMAL NOT NULL,
    "tc" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipments_invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "shipments_invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipments_boxes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boxId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'transito',
    "fleJpy" DECIMAL,
    "moHoras" DECIMAL,
    "moTarifa" DECIMAL,
    "matJpy" DECIMAL,
    "tcEnvio" DECIMAL,
    "pesoTotal" DECIMAL,
    "internacionArancel" DECIMAL,
    "internacionIva" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_box_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boxId" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ean" TEXT,
    "cant" INTEGER NOT NULL,
    "precioU" DECIMAL NOT NULL,
    "tc" DECIMAL,
    "pesoUnit" DECIMAL,
    "fromManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipments_box_products_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "shipments_boxes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shipments_box_products_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "shipments_purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipments_chile_stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ean" TEXT,
    "cajaId" TEXT,
    "cant" INTEGER NOT NULL,
    "costoUnit" DECIMAL NOT NULL,
    "precioVenta" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_web_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "portal" TEXT NOT NULL,
    "orden" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "costoEnvioIntern" DECIMAL NOT NULL,
    "tc" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_web_order_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "webOrderId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ean" TEXT,
    "cant" INTEGER NOT NULL,
    "precioUSD" DECIMAL NOT NULL,
    "precioCLP" DECIMAL NOT NULL,
    "pctCosteo" DECIMAL NOT NULL,
    "costoUnit" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipments_web_order_products_webOrderId_fkey" FOREIGN KEY ("webOrderId") REFERENCES "shipments_web_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipments_local_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "docTipo" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL NOT NULL,
    "iva" DECIMAL,
    "ivaCredito" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'pagado',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_sales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "producto" TEXT NOT NULL,
    "ean" TEXT,
    "cant" INTEGER NOT NULL,
    "precioVenta" DECIMAL NOT NULL,
    "costo" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "canal" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "shipments_gav_chile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "concepto" TEXT NOT NULL,
    "monto" DECIMAL NOT NULL,
    "adjunto" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "docTipo" TEXT,
    "ivaCredito" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentas" TEXT NOT NULL,
    "metodosPago" TEXT NOT NULL,
    "arrBodegaJP" DECIMAL NOT NULL DEFAULT 25000,
    "appBeyblade" DECIMAL NOT NULL DEFAULT 550,
    "comisionPct" DECIMAL NOT NULL DEFAULT 13,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipments_gav_month_control" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mes" TEXT NOT NULL,
    "boletaId" TEXT,
    "compraId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipments_gav_month_control_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "shipments_purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_purchases_sku_key" ON "shipments_purchases"("sku");

-- CreateIndex
CREATE INDEX "shipments_purchases_sku_idx" ON "shipments_purchases"("sku");

-- CreateIndex
CREATE INDEX "shipments_purchases_estado_idx" ON "shipments_purchases"("estado");

-- CreateIndex
CREATE INDEX "shipments_purchases_bodega_idx" ON "shipments_purchases"("bodega");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_invoices_invoiceId_key" ON "shipments_invoices"("invoiceId");

-- CreateIndex
CREATE INDEX "shipments_invoices_invoiceId_idx" ON "shipments_invoices"("invoiceId");

-- CreateIndex
CREATE INDEX "shipments_invoices_estado_idx" ON "shipments_invoices"("estado");

-- CreateIndex
CREATE INDEX "shipments_invoice_items_invoiceId_idx" ON "shipments_invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_boxes_boxId_key" ON "shipments_boxes"("boxId");

-- CreateIndex
CREATE INDEX "shipments_boxes_boxId_idx" ON "shipments_boxes"("boxId");

-- CreateIndex
CREATE INDEX "shipments_boxes_estado_idx" ON "shipments_boxes"("estado");

-- CreateIndex
CREATE INDEX "shipments_box_products_boxId_idx" ON "shipments_box_products"("boxId");

-- CreateIndex
CREATE INDEX "shipments_box_products_sku_idx" ON "shipments_box_products"("sku");

-- CreateIndex
CREATE INDEX "shipments_chile_stock_sku_idx" ON "shipments_chile_stock"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_web_orders_orderId_key" ON "shipments_web_orders"("orderId");

-- CreateIndex
CREATE INDEX "shipments_web_orders_orderId_idx" ON "shipments_web_orders"("orderId");

-- CreateIndex
CREATE INDEX "shipments_web_orders_portal_idx" ON "shipments_web_orders"("portal");

-- CreateIndex
CREATE INDEX "shipments_web_order_products_webOrderId_idx" ON "shipments_web_order_products"("webOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_local_purchases_purchaseId_key" ON "shipments_local_purchases"("purchaseId");

-- CreateIndex
CREATE INDEX "shipments_local_purchases_purchaseId_idx" ON "shipments_local_purchases"("purchaseId");

-- CreateIndex
CREATE INDEX "shipments_local_purchases_tipo_idx" ON "shipments_local_purchases"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_sales_saleId_key" ON "shipments_sales"("saleId");

-- CreateIndex
CREATE INDEX "shipments_sales_fecha_idx" ON "shipments_sales"("fecha");

-- CreateIndex
CREATE INDEX "shipments_sales_canal_idx" ON "shipments_sales"("canal");

-- CreateIndex
CREATE INDEX "shipments_gav_chile_estado_idx" ON "shipments_gav_chile"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_gav_month_control_mes_key" ON "shipments_gav_month_control"("mes");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_gav_month_control_compraId_key" ON "shipments_gav_month_control"("compraId");

-- CreateIndex
CREATE INDEX "shipments_gav_month_control_mes_idx" ON "shipments_gav_month_control"("mes");

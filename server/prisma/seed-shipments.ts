import { Prisma, PrismaClient } from '@prisma/client';
import {
  mockCompras,
  mockBoletas,
  mockBoletaItems,
  mockCajas,
  mockStockChile,
  mockPedidosWeb,
  mockComprasChile,
  mockVentas,
  mockGAVChile,
  mockConfig,
} from '../../src/app/data/shipmentsMockData.ts';

const prisma = new PrismaClient();

const d = (value: number) => new Prisma.Decimal(value);

function toDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha invalida: ${value}`);
  }
  return parsed;
}

async function resetShipmentsData() {
  await prisma.$transaction([
    prisma.shipmentsGavMonthControl.deleteMany(),
    prisma.shipmentsInvoiceItem.deleteMany(),
    prisma.shipmentsInvoice.deleteMany(),
    prisma.shipmentsBoxProduct.deleteMany(),
    prisma.shipmentsBox.deleteMany(),
    prisma.shipmentsChileStock.deleteMany(),
    prisma.shipmentsWebOrderProduct.deleteMany(),
    prisma.shipmentsWebOrder.deleteMany(),
    prisma.shipmentsLocalPurchase.deleteMany(),
    prisma.shipmentsSale.deleteMany(),
    prisma.shipmentsGavChile.deleteMany(),
    prisma.shipmentsPurchase.deleteMany(),
    prisma.shipmentsConfig.deleteMany(),
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entity: 'ShipmentsCompraChile', action: 'UPSERT_COMPRA_CHILE' },
          { entity: 'ShipmentsGavChile', action: 'UPSERT_GAV_CHILE' },
        ],
      },
    }),
    prisma.order.deleteMany({
      where: {
        orderNumber: {
          startsWith: 'SHIP-MOCK-',
        },
      },
    }),
  ]);
}

async function seedShipmentsCore() {
  const purchaseIdMap = new Map<number, string>();

  for (const compra of mockCompras) {
    const created = await prisma.shipmentsPurchase.create({
      data: {
        sku: compra.sku,
        fecha: toDate(compra.fecha),
        tipo: compra.tipo,
        nombre: compra.nombre,
        ean: compra.ean || null,
        tarjeta: compra.tarjeta,
        precioU: d(compra.precioU),
        cant: compra.cant,
        total: d(compra.total),
        estado: compra.estado,
        bodega: compra.bodega,
        tc: compra.tc != null ? d(compra.tc) : null,
      },
    });
    purchaseIdMap.set(compra.id, created.id);
  }

  const invoiceIdMap = new Map<string, string>();
  for (const invoice of mockBoletas) {
    const created = await prisma.shipmentsInvoice.create({
      data: {
        invoiceId: invoice.id,
        fecha: toDate(invoice.fecha),
        subtotalJPY: d(invoice.subtotalJPY),
        comision: d(invoice.comision),
        totalJPY: d(invoice.totalJPY),
        tc: d(invoice.tc),
        totalCLP: d(invoice.totalCLP),
        estado: invoice.estado,
      },
    });
    invoiceIdMap.set(invoice.id, created.id);
  }

  for (const [invoiceRef, items] of Object.entries(mockBoletaItems)) {
    const invoiceInternalId = invoiceIdMap.get(invoiceRef);
    if (!invoiceInternalId) continue;

    await prisma.shipmentsInvoiceItem.createMany({
      data: items.map((item) => ({
        invoiceId: invoiceInternalId,
        fecha: toDate(item.fecha),
        tipo: item.tipo,
        nombre: item.nombre,
        ean: item.ean || null,
        precioU: d(item.precioU),
        cant: item.cant,
        comPct: d(item.comPct),
        tc: d(item.tc),
      })),
    });
  }

  for (const box of mockCajas) {
    const createdBox = await prisma.shipmentsBox.create({
      data: {
        boxId: box.id,
        fecha: toDate(box.fecha),
        estado: box.estado,
        fleJpy: d(box.flete_jpy),
        moHoras: d(box.mo_horas),
        moTarifa: d(box.mo_tarifa),
        matJpy: d(box.mat_jpy),
        tcEnvio: d(box.tc_envio),
        internacionArancel: box.internacion ? d(box.internacion.arancel) : null,
        internacionIva: box.internacion ? d(box.internacion.iva) : null,
      },
    });

    await prisma.shipmentsBoxProduct.createMany({
      data: box.productos
        .map((product) => {
          const purchaseId = purchaseIdMap.get(product._compraId);
          if (!purchaseId) return null;
          return {
            boxId: createdBox.id,
            compraId: purchaseId,
            sku: product._sku,
            nombre: product.nombre,
            ean: product.ean || null,
            cant: product.cant,
            precioU: d(product.precioU),
            tc: d(product.tc),
            fromManual: false,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    });
  }

  await prisma.shipmentsChileStock.createMany({
    data: mockStockChile.map((stock) => ({
      sku: stock._sku,
      nombre: stock.nombre,
      ean: stock.ean || null,
      cajaId: stock.caja,
      cant: stock.cant,
      costoUnit: d(stock.costoUnit),
      precioVenta: stock.precioVenta != null ? d(stock.precioVenta) : null,
    })),
  });

  for (const webOrder of mockPedidosWeb) {
    const createdOrder = await prisma.shipmentsWebOrder.create({
      data: {
        orderId: webOrder.id,
        fecha: toDate(webOrder.fecha),
        portal: webOrder.portal,
        orden: webOrder.orden,
        estado: webOrder.estado,
        costoEnvioIntern: d(webOrder.costoEnvioIntern),
        tc: d(webOrder.tc),
      },
    });

    await prisma.shipmentsWebOrderProduct.createMany({
      data: webOrder.productos.map((product) => ({
        webOrderId: createdOrder.id,
        nombre: product.nombre,
        ean: product.ean || null,
        cant: product.cant,
        precioUSD: d(product.precioUSD),
        precioCLP: d(product.precioCLP),
        pctCosteo: d(product.pctCosteo),
        costoUnit: d(product.costoUnit),
      })),
    });
  }

  await prisma.shipmentsLocalPurchase.createMany({
    data: mockComprasChile.map((purchase) => ({
      purchaseId: purchase.id,
      fecha: toDate(purchase.fecha),
      tipo: purchase.tipo,
      docTipo: purchase.docTipo,
      proveedor: purchase.proveedor,
      descripcion: purchase.descripcion,
      monto: d(purchase.monto),
      iva: purchase.iva > 0 ? d(purchase.iva) : null,
      ivaCredito: purchase.ivaCredito,
      estado: purchase.estado,
    })),
  });

  await prisma.shipmentsSale.createMany({
    data: mockVentas.map((sale) => ({
      saleId: sale.id,
      fecha: toDate(sale.fecha),
      producto: sale.producto,
      ean: sale.ean || null,
      cant: sale.cant,
      precioVenta: d(sale.precioVenta),
      costo: d(sale.costo),
      total: d(sale.total),
      canal: sale.canal,
    })),
  });

  await prisma.shipmentsGavChile.createMany({
    data: mockGAVChile.map((gav) => ({
      concepto: gav.concepto,
      monto: d(gav.monto),
      adjunto: gav.adjunto,
      estado: gav.estado,
      docTipo: gav.docTipo,
      ivaCredito: gav.ivaCredito,
      fechaPago: gav.fechaPago ? toDate(gav.fechaPago) : null,
    })),
  });

  await prisma.shipmentsConfig.create({
    data: {
      cuentas: JSON.stringify(mockConfig.cuentas),
      metodosPago: JSON.stringify(mockConfig.metodosPago),
      arrBodegaJP: d(mockConfig.arrBodegaJP),
      appBeyblade: d(mockConfig.appBeyblade),
      comisionPct: d(mockConfig.comisionPct),
    },
  });

  await prisma.auditLog.createMany({
    data: mockComprasChile.map((purchase) => ({
      action: 'UPSERT_COMPRA_CHILE',
      entity: 'ShipmentsCompraChile',
      entityIds: purchase.id,
      performedBy: 'seed:shipments',
      metadata: JSON.stringify({
        ...purchase,
        createdAt: new Date().toISOString(),
      }),
    })),
  });

  await prisma.auditLog.createMany({
    data: mockGAVChile.map((gav) => ({
      action: 'UPSERT_GAV_CHILE',
      entity: 'ShipmentsGavChile',
      entityIds: String(gav.id),
      performedBy: 'seed:shipments',
      metadata: JSON.stringify({
        ...gav,
        updatedAt: new Date().toISOString(),
      }),
    })),
  });
}

async function seedCompatibilityProductsAndOrders() {
  const bySku = new Map<
    string,
    {
      name: string;
      ean: string;
      stock: number;
      cost: number;
      price: number;
    }
  >();

  for (const item of mockStockChile) {
    const current = bySku.get(item._sku);
    const chosenPrice = item.precioVenta ?? current?.price ?? Math.round(item.costoUnit * 1.6);
    if (!current) {
      bySku.set(item._sku, {
        name: item.nombre,
        ean: item.ean,
        stock: item.cant,
        cost: item.costoUnit,
        price: chosenPrice,
      });
    } else {
      bySku.set(item._sku, {
        ...current,
        stock: current.stock + item.cant,
        cost: item.costoUnit,
        price: chosenPrice,
      });
    }
  }

  const productByEan = new Map<string, string>();
  const skuByEan = new Map<string, string>();

  for (const [sku, data] of bySku.entries()) {
    const product = await prisma.product.upsert({
      where: { sku },
      update: {
        name: data.name,
        category: 'Shipments',
        price: d(data.price),
        cost: d(data.cost),
        stock: data.stock,
        status: 'ACTIVE',
        ean: data.ean || null,
      },
      create: {
        sku,
        name: data.name,
        description: 'Producto sembrado para modulo Shipments',
        category: 'Shipments',
        price: d(data.price),
        cost: d(data.cost),
        stock: data.stock,
        images: JSON.stringify([]),
        status: 'ACTIVE',
        ean: data.ean || null,
      },
    });

    if (data.ean) {
      productByEan.set(data.ean, product.id);
      skuByEan.set(data.ean, sku);
    }
  }

  const firstProductId = Array.from(productByEan.values())[0];

  for (const sale of mockVentas) {
    const productId = productByEan.get(sale.ean) || firstProductId;
    if (!productId) continue;

    await prisma.order.create({
      data: {
        orderNumber: `SHIP-MOCK-${sale.id}`,
        customerName: `Venta ${sale.canal}`,
        customerEmail: 'shipments@hobbyzamora.local',
        subtotal: d(sale.total),
        tax: d(0),
        shipping: d(0),
        discount: d(0),
        total: d(sale.total),
        status: 'DELIVERED',
        source: sale.canal,
        createdAt: toDate(sale.fecha),
        items: {
          create: [
            {
              productId,
              name: sale.producto,
              sku: skuByEan.get(sale.ean) || 'SHIP-MOCK',
              price: d(sale.precioVenta),
              cost: d(sale.costo),
              quantity: sale.cant,
            },
          ],
        },
        payments: {
          create: {
            method: 'CASH',
            status: 'APPROVED',
            amount: d(sale.total),
            paidAt: toDate(sale.fecha),
          },
        },
      },
    });
  }
}

async function main() {
  console.log('🌱 Seeding Shipments data from mock arrays...');
  await resetShipmentsData();
  await seedShipmentsCore();
  await seedCompatibilityProductsAndOrders();
  console.log('✅ Shipments seed completed.');
}

main()
  .catch((error) => {
    console.error('❌ Shipments seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

function parseDateParam(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseProductIdsParam(value: unknown): string[] {
  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => UUID_REGEX.test(item));
}

// Get dashboard stats
router.get('/dashboard', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const { startDate, endDate, productIds } = req.query;
    const parsedStartDate = parseDateParam(startDate);
    const parsedEndDate = parseDateParam(endDate);
    const filteredProductIds = parseProductIdsParam(productIds);
    const hasProductFilter = filteredProductIds.length > 0;

    if ((startDate && !parsedStartDate) || (endDate && !parsedEndDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const hasCustomRange = Boolean(parsedStartDate || parsedEndDate);

    const defaultRangeEnd = new Date(today);
    defaultRangeEnd.setDate(defaultRangeEnd.getDate() + 1);
    const defaultRangeStart = new Date(defaultRangeEnd);
    defaultRangeStart.setDate(defaultRangeStart.getDate() - 30);

    const rangeStart = parsedStartDate ?? defaultRangeStart;
    const rangeEndExclusive = parsedEndDate
      ? new Date(parsedEndDate.getTime() + 24 * 60 * 60 * 1000)
      : defaultRangeEnd;

    if (rangeStart >= rangeEndExclusive) {
      return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
    }

    const rangeWhere = {
      createdAt: {
        gte: rangeStart,
        lt: rangeEndExclusive,
      },
      status: { notIn: ['CANCELLED', 'REFUNDED'] as string[] },
    };

    // Get orders for different periods
    const [todayOrders, weekOrders, monthOrders, rangeOrders, rangeOrderItems, monthOrderItems] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: today },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: weekAgo },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        select: { total: true, subtotal: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: monthAgo },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        select: { total: true, subtotal: true },
      }),
      prisma.order.findMany({
        where: hasProductFilter
          ? {
              ...rangeWhere,
              items: {
                some: {
                  productId: { in: filteredProductIds },
                },
              },
            }
          : rangeWhere,
        select: { id: true, total: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: rangeWhere,
          ...(hasProductFilter
            ? {
                productId: { in: filteredProductIds },
              }
            : {}),
        },
        select: {
          orderId: true,
          price: true,
          cost: true,
          quantity: true,
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: monthAgo },
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
        },
        select: {
          cost: true,
          quantity: true,
        },
      }),
    ]);

    // Get inventory value
    const inventory = await prisma.inventoryBatch.findMany({
      where: { remaining: { gt: 0 } },
      select: { remaining: true, unitCost: true },
    });

    // Get low stock items count
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        inventoryBatches: {
          where: { remaining: { gt: 0 } },
          select: { remaining: true },
        },
      },
    });

    const lowStockCount = products.filter(p => 
      p.inventoryBatches.reduce((sum, b) => sum + b.remaining, 0) < 10
    ).length;

    // Calculate totals
    const dailySales = todayOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
    const weeklySales = weekOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
    const monthlySales = monthOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);

    const totalSales = hasProductFilter
      ? rangeOrderItems.reduce(
          (sum, item) => sum + parseFloat(item.price.toString()) * item.quantity,
          0
        )
      : rangeOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
    const totalCost = rangeOrderItems.reduce(
      (sum, item) => sum + parseFloat(item.cost.toString()) * item.quantity,
      0
    );
    const totalMargin = totalSales - totalCost;
    const marginPercent = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;
    const orderCount = hasProductFilter
      ? new Set(rangeOrderItems.map((item) => item.orderId)).size
      : rangeOrders.length;
    
    const inventoryValue = inventory.reduce((sum, b) => 
      sum + b.remaining * parseFloat(b.unitCost.toString()), 0
    );

    const monthlyRevenue = monthOrders.reduce((sum, o) => sum + parseFloat(o.subtotal.toString()), 0);
    const monthlyCost = monthOrderItems.reduce(
      (sum, item) => sum + parseFloat(item.cost.toString()) * item.quantity,
      0
    );
    const profit = monthlyRevenue - monthlyCost;

    res.json({
      dailySales: Math.round(dailySales * 100) / 100,
      weeklySales: Math.round(weeklySales * 100) / 100,
      monthlySales: Math.round(monthlySales * 100) / 100,
      revenue: Math.round(monthlySales * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      lowStockItems: lowStockCount,
      totalSales: Math.round(totalSales * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalMargin: Math.round(totalMargin * 100) / 100,
      marginPercent: Math.round(marginPercent * 100) / 100,
      orderCount,
      range: {
        startDate: rangeStart.toISOString().slice(0, 10),
        endDate: new Date(rangeEndExclusive.getTime() - 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        hasCustomRange,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Get sales chart data
router.get('/sales-chart', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { days = '10', productIds } = req.query;
    const parsedDays = parseInt(days as string, 10);
    const numDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 10;
    const filteredProductIds = parseProductIdsParam(productIds);
    const hasProductFilter = filteredProductIds.length > 0;

    const chartData: Array<{ date: string; sales: number; revenue: number }> = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      if (hasProductFilter) {
        const items = await prisma.orderItem.findMany({
          where: {
            productId: { in: filteredProductIds },
            order: {
              createdAt: {
                gte: date,
                lt: nextDate,
              },
              status: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
          },
          select: { price: true, quantity: true },
        });

        const filteredRevenue = items.reduce(
          (sum, item) => sum + parseFloat(item.price.toString()) * item.quantity,
          0
        );

        chartData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: Math.round(filteredRevenue * 100) / 100,
          revenue: Math.round(filteredRevenue * 100) / 100,
        });

        continue;
      }

      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
        select: { total: true, subtotal: true },
      });

      const sales = orders.reduce((sum, o) => sum + parseFloat(o.subtotal.toString()), 0);
      const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);

      chartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: Math.round(sales * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
      });
    }

    res.json(chartData);
  } catch (error) {
    console.error('Get sales chart error:', error);
    res.status(500).json({ error: 'Failed to get sales chart' });
  }
});

router.get('/inventory-discrepancy', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const filteredProductIds = parseProductIdsParam(req.query.productIds);

    if (filteredProductIds.length === 0) {
      return res.status(400).json({ error: 'At least one valid productId is required' });
    }

    const [products, soldItems] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: filteredProductIds } },
        include: {
          inventoryBatches: {
            select: {
              quantity: true,
              remaining: true,
            },
          },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          productId: { in: filteredProductIds },
          order: {
            status: { notIn: ['CANCELLED', 'REFUNDED'] },
          },
        },
        select: {
          productId: true,
          quantity: true,
        },
      }),
    ]);

    const soldByProduct = new Map<string, number>();
    for (const item of soldItems) {
      soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const productsById = new Map(products.map((product) => [product.id, product]));

    const response = filteredProductIds
      .map((productId) => {
        const product = productsById.get(productId);
        if (!product) return null;

        const totalReceived = product.inventoryBatches.reduce((sum, batch) => sum + batch.quantity, 0);
        const totalRemaining = product.inventoryBatches.reduce((sum, batch) => sum + batch.remaining, 0);
        const totalSold = soldByProduct.get(product.id) ?? 0;
        const expectedRemaining = totalReceived - totalSold;
        const discrepancy = expectedRemaining - totalRemaining;

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          ean: product.ean ?? null,
          currentStock: totalRemaining,
          totalReceived,
          totalSold,
          totalRemaining,
          expectedRemaining,
          discrepancy,
        };
      })
      .filter(Boolean);

    res.json({ products: response });
  } catch (error) {
    console.error('Get inventory discrepancy error:', error);
    res.status(500).json({ error: 'Failed to get inventory discrepancy' });
  }
});

// Get top products
router.get('/top-products', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { limit = '5', period = 'month' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      include: {
        product: { select: { name: true } },
      },
    });

    // Group by product
    const productStats = orderItems.reduce((acc, item) => {
      const key = item.productId;
      if (!acc[key]) {
        acc[key] = {
          name: item.name,
          sales: 0,
          revenue: 0,
        };
      }
      acc[key].sales += item.quantity;
      acc[key].revenue += parseFloat(item.price.toString()) * item.quantity;
      return acc;
    }, {} as Record<string, { name: string; sales: number; revenue: number }>);

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit as string))
      .map(p => ({
        name: p.name,
        sales: p.sales,
        revenue: Math.round(p.revenue * 100) / 100,
      }));

    res.json(topProducts);
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ error: 'Failed to get top products' });
  }
});

// Get orders by source
router.get('/orders-by-source', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const orders = await prisma.order.groupBy({
      by: ['source'],
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      _count: true,
      _sum: { total: true },
    });

    res.json(orders.map(o => ({
      source: o.source,
      count: o._count,
      total: o._sum.total ? parseFloat(o._sum.total.toString()) : 0,
    })));
  } catch (error) {
    console.error('Get orders by source error:', error);
    res.status(500).json({ error: 'Failed to get orders by source' });
  }
});

// Get orders by status
router.get('/orders-by-status', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const orders = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json(orders.map(o => ({
      status: o.status,
      count: o._count,
    })));
  } catch (error) {
    console.error('Get orders by status error:', error);
    res.status(500).json({ error: 'Failed to get orders by status' });
  }
});

export default router;

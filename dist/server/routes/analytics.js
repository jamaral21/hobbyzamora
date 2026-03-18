import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
// Get dashboard stats
router.get('/dashboard', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        // Get orders for different periods
        const [todayOrders, weekOrders, monthOrders] = await Promise.all([
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
        const lowStockCount = products.filter(p => p.inventoryBatches.reduce((sum, b) => sum + b.remaining, 0) < 10).length;
        // Calculate totals
        const dailySales = todayOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
        const weeklySales = weekOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
        const monthlySales = monthOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
        const inventoryValue = inventory.reduce((sum, b) => sum + b.remaining * parseFloat(b.unitCost.toString()), 0);
        // Calculate profit (simplified - revenue minus costs from orders)
        const monthlyRevenue = monthOrders.reduce((sum, o) => sum + parseFloat(o.subtotal.toString()), 0);
        const profit = monthlyRevenue * 0.4; // Estimated 40% margin
        res.json({
            dailySales: Math.round(dailySales * 100) / 100,
            weeklySales: Math.round(weeklySales * 100) / 100,
            monthlySales: Math.round(monthlySales * 100) / 100,
            revenue: Math.round(monthlySales * 100) / 100,
            profit: Math.round(profit * 100) / 100,
            inventoryValue: Math.round(inventoryValue * 100) / 100,
            lowStockItems: lowStockCount,
        });
    }
    catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
});
// Get sales chart data
router.get('/sales-chart', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { days = '10' } = req.query;
        const numDays = parseInt(days);
        const chartData = [];
        for (let i = numDays - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
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
    }
    catch (error) {
        console.error('Get sales chart error:', error);
        res.status(500).json({ error: 'Failed to get sales chart' });
    }
});
// Get top products
router.get('/top-products', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { limit = '5', period = 'month' } = req.query;
        let startDate = new Date();
        if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        }
        else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        }
        else if (period === 'year') {
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
        }, {});
        const topProducts = Object.values(productStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, parseInt(limit))
            .map(p => ({
            name: p.name,
            sales: p.sales,
            revenue: Math.round(p.revenue * 100) / 100,
        }));
        res.json(topProducts);
    }
    catch (error) {
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
        }
        else if (period === 'month') {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Get orders by status error:', error);
        res.status(500).json({ error: 'Failed to get orders by status' });
    }
});
export default router;
//# sourceMappingURL=analytics.js.map
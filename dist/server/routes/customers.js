import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
// Get all customers
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { search, page = '1', limit = '50' } = req.query;
        const where = {
            role: 'CUSTOMER',
        };
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    createdAt: true,
                    _count: {
                        select: { orders: true },
                    },
                    orders: {
                        select: { total: true },
                    },
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count({ where }),
        ]);
        const customers = users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            joinDate: u.createdAt,
            totalOrders: u._count.orders,
            totalSpent: u.orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0),
        }));
        res.json({
            customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to get customers' });
    }
});
// Get single customer
router.get('/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                addresses: true,
                orders: {
                    include: {
                        items: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const totalSpent = user.orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            joinDate: user.createdAt,
            addresses: user.addresses,
            totalOrders: user.orders.length,
            totalSpent,
            recentOrders: user.orders.map(o => ({
                ...o,
                subtotal: parseFloat(o.subtotal.toString()),
                tax: parseFloat(o.tax.toString()),
                shipping: parseFloat(o.shipping.toString()),
                discount: parseFloat(o.discount.toString()),
                total: parseFloat(o.total.toString()),
                items: o.items.map(i => ({
                    ...i,
                    price: parseFloat(i.price.toString()),
                    cost: parseFloat(i.cost.toString()),
                })),
            })),
        });
    }
    catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Failed to get customer' });
    }
});
// Update customer notes (admin)
router.patch('/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { name, phone } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { name, phone },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
            },
        });
        res.json(user);
    }
    catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});
// Get top customers
router.get('/stats/top', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { limit = '10' } = req.query;
        const users = await prisma.user.findMany({
            where: { role: 'CUSTOMER' },
            select: {
                id: true,
                name: true,
                email: true,
                orders: {
                    select: { total: true },
                },
                _count: { select: { orders: true } },
            },
        });
        const customers = users
            .map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            totalOrders: u._count.orders,
            totalSpent: u.orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0),
        }))
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, parseInt(limit));
        res.json(customers);
    }
    catch (error) {
        console.error('Get top customers error:', error);
        res.status(500).json({ error: 'Failed to get top customers' });
    }
});
export default router;
//# sourceMappingURL=customers.js.map
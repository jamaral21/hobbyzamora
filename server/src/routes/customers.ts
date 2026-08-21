import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
const validSalesWhere = {
  status: { notIn: ['PENDING', 'CANCELLED'] },
};

// Get all customers
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { search, page = '1', limit = '50' } = req.query;

    const where: any = {
      role: 'CUSTOMER',
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [users, total, summary] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          _count: {
            select: { orders: { where: validSalesWhere } },
          },
          orders: {
            where: validSalesWhere,
            select: { total: true },
          },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
      prisma.order.aggregate({
        where: {
          ...validSalesWhere,
          user: { role: 'CUSTOMER' },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
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
      summary: {
        totalSpent: Number(summary._sum.total ?? 0),
        totalOrders: summary._count.id,
      },
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

// Get single customer
router.get('/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
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

    const [salesSummary, recentOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { userId: user.id, ...validSalesWhere },
        _sum: { total: true },
        _count: { id: true },
      }),
      prisma.order.findMany({
        where: { userId: user.id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      joinDate: user.createdAt,
      addresses: user.addresses,
      totalOrders: salesSummary._count.id,
      totalSpent: Number(salesSummary._sum.total ?? 0),
      recentOrders: recentOrders.map(o => ({
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
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// Update customer notes (admin)
router.patch('/:id', authenticate, requireRole('ADMIN', 'STAFF'), async (req: AuthRequest, res) => {
  try {
    const { name, phone } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data: { name, phone },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    res.json(user);
  } catch (error) {
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
          where: validSalesWhere,
          select: { total: true },
        },
        _count: { select: { orders: { where: validSalesWhere } } },
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
      .slice(0, parseInt(limit as string));

    res.json(customers);
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({ error: 'Failed to get top customers' });
  }
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.js';

const router = Router();

type ShipmentsRole = 'admin' | 'japon' | 'chile' | 'contador';

const VALID_ROLES = new Set(['ADMIN', 'STAFF']);
const VALID_SHIPMENTS_ROLES = new Set(['admin', 'japon', 'chile', 'contador']);

async function ensureShipmentsRoleTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS shipments_user_roles (
      userId TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

async function getShipmentsRoleMap() {
  await ensureShipmentsRoleTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ userId: string; role: string }>>(
    'SELECT userId, role FROM shipments_user_roles'
  );
  return new Map(rows.map((row) => [row.userId, row.role as ShipmentsRole]));
}

async function upsertShipmentsRole(userId: string, role: ShipmentsRole) {
  await ensureShipmentsRoleTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO shipments_user_roles (userId, role, updatedAt)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(userId) DO UPDATE SET role = excluded.role, updatedAt = CURRENT_TIMESTAMP
    `,
    userId,
    role
  );
}

router.use(authenticate, requireRole('ADMIN'));

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { search, page = '1', limit = '50' } = req.query;

    const pageNum = Number.parseInt(String(page), 10);
    const limitNum = Number.parseInt(String(limit), 10);
    const currentPage = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const take = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 100) : 50;
    const skip = (currentPage - 1) * take;

    const where: any = {
      role: { in: ['ADMIN', 'STAFF'] },
    };

    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    const [users, total, shipmentsRoleMap] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
      getShipmentsRoleMap(),
    ]);

    res.json({
      users: users.map((user) => ({
        ...user,
        shipmentsRole: shipmentsRoleMap.get(user.id) || 'chile',
      })),
      pagination: {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take)),
      },
    });
  } catch (error) {
    console.error('List admin users error:', error);
    res.status(500).json({ error: 'Failed to list admin users' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role, shipmentsRole } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email y password son obligatorios' });
    }

    if (!VALID_ROLES.has(String(role || ''))) {
      return res.status(400).json({ error: 'role debe ser ADMIN o STAFF' });
    }

    if (!VALID_SHIPMENTS_ROLES.has(String(shipmentsRole || ''))) {
      return res.status(400).json({ error: 'shipmentsRole inválido' });
    }

    const existing = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashedPassword,
        role: String(role),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await upsertShipmentsRole(user.id, String(shipmentsRole) as ShipmentsRole);

    res.status(201).json({
      ...user,
      shipmentsRole,
    });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { name, role, shipmentsRole, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (role !== undefined && !VALID_ROLES.has(String(role))) {
      return res.status(400).json({ error: 'role debe ser ADMIN o STAFF' });
    }

    if (shipmentsRole !== undefined && !VALID_SHIPMENTS_ROLES.has(String(shipmentsRole))) {
      return res.status(400).json({ error: 'shipmentsRole inválido' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (role !== undefined) updateData.role = String(role);
    if (password !== undefined && String(password).trim() !== '') {
      updateData.password = await bcrypt.hash(String(password), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (shipmentsRole !== undefined) {
      await upsertShipmentsRole(id, String(shipmentsRole) as ShipmentsRole);
    }

    const roleMap = await getShipmentsRoleMap();

    res.json({
      ...updated,
      shipmentsRole: roleMap.get(updated.id) || 'chile',
    });
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ error: 'Failed to update admin user' });
  }
});

export default router;

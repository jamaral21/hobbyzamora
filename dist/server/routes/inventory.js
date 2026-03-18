import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
// Get all inventory batches
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { productId, lowStock } = req.query;
        const where = {};
        if (productId) {
            where.productId = productId;
        }
        const batches = await prisma.inventoryBatch.findMany({
            where: {
                ...where,
                remaining: { gt: 0 },
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
            },
            orderBy: { receivedAt: 'asc' },
        });
        // Calculate totals per product
        const byProduct = batches.reduce((acc, batch) => {
            const key = batch.productId;
            if (!acc[key]) {
                acc[key] = {
                    productId: batch.productId,
                    productName: batch.product.name,
                    productSku: batch.product.sku,
                    totalQuantity: 0,
                    totalValue: 0,
                    batches: [],
                };
            }
            acc[key].totalQuantity += batch.remaining;
            acc[key].totalValue += batch.remaining * parseFloat(batch.unitCost.toString());
            acc[key].batches.push({
                id: batch.id,
                batchCode: batch.batchCode,
                quantity: batch.quantity,
                remaining: batch.remaining,
                unitCost: parseFloat(batch.unitCost.toString()),
                receivedAt: batch.receivedAt,
            });
            return acc;
        }, {});
        let inventory = Object.values(byProduct);
        // Filter low stock (less than 10 units)
        if (lowStock === 'true') {
            inventory = inventory.filter(item => item.totalQuantity < 10);
        }
        const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
        res.json({
            inventory,
            summary: {
                totalProducts: inventory.length,
                totalValue: Math.round(totalValue * 100) / 100,
                lowStockCount: inventory.filter(item => item.totalQuantity < 10).length,
            },
        });
    }
    catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Failed to get inventory' });
    }
});
// Add inventory batch (receive stock)
router.post('/receive', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { productId, quantity, unitCost, batchCode } = req.body;
        // Verify product exists
        const product = await prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Create batch
        const batch = await prisma.inventoryBatch.create({
            data: {
                productId,
                batchCode: batchCode || `BATCH-${Date.now()}`,
                quantity,
                remaining: quantity,
                unitCost,
            },
            include: {
                product: {
                    select: { id: true, sku: true, name: true },
                },
            },
        });
        // Record movement
        await prisma.inventoryMovement.create({
            data: {
                batchId: batch.id,
                type: 'IN',
                quantity,
                reference: `Stock received by ${req.user.email}`,
            },
        });
        res.status(201).json({
            ...batch,
            unitCost: parseFloat(batch.unitCost.toString()),
        });
    }
    catch (error) {
        console.error('Receive inventory error:', error);
        res.status(500).json({ error: 'Failed to receive inventory' });
    }
});
// Adjust inventory (manual adjustment)
router.post('/adjust', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { batchId, adjustment, reason } = req.body;
        const batch = await prisma.inventoryBatch.findUnique({
            where: { id: batchId },
        });
        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }
        const newRemaining = batch.remaining + adjustment;
        if (newRemaining < 0) {
            return res.status(400).json({ error: 'Cannot reduce stock below 0' });
        }
        const updatedBatch = await prisma.inventoryBatch.update({
            where: { id: batchId },
            data: { remaining: newRemaining },
        });
        // Record movement
        await prisma.inventoryMovement.create({
            data: {
                batchId,
                type: 'ADJUSTMENT',
                quantity: adjustment,
                reference: reason || `Manual adjustment by ${req.user.email}`,
            },
        });
        res.json({
            ...updatedBatch,
            unitCost: parseFloat(updatedBatch.unitCost.toString()),
        });
    }
    catch (error) {
        console.error('Adjust inventory error:', error);
        res.status(500).json({ error: 'Failed to adjust inventory' });
    }
});
// Get inventory movements history
router.get('/movements', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { productId, type, startDate, endDate, page = '1', limit = '50' } = req.query;
        const where = {};
        if (productId) {
            where.batch = { productId };
        }
        if (type) {
            where.type = type;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [movements, total] = await Promise.all([
            prisma.inventoryMovement.findMany({
                where,
                include: {
                    batch: {
                        include: {
                            product: {
                                select: { id: true, sku: true, name: true },
                            },
                        },
                    },
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
            }),
            prisma.inventoryMovement.count({ where }),
        ]);
        res.json({
            movements: movements.map(m => ({
                ...m,
                batch: {
                    ...m.batch,
                    unitCost: parseFloat(m.batch.unitCost.toString()),
                },
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get movements error:', error);
        res.status(500).json({ error: 'Failed to get movements' });
    }
});
// Bulk import inventory batches from CSV
router.post('/import', authenticate, requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { batches } = req.body;
        if (!Array.isArray(batches) || batches.length === 0) {
            return res.status(400).json({ error: 'No batches provided' });
        }
        if (batches.length > 500) {
            return res.status(400).json({ error: 'Maximum 500 batches per import' });
        }
        const results = {
            created: 0, skipped: 0, errors: [],
        };
        for (let i = 0; i < batches.length; i++) {
            const row = batches[i];
            const lineNum = i + 2;
            if (!row.sku || row.quantity == null || row.unitCost == null) {
                results.errors.push(`Línea ${lineNum}: faltan campos requeridos (sku, quantity, unitCost)`);
                results.skipped++;
                continue;
            }
            const quantity = parseInt(row.quantity);
            const unitCost = parseFloat(row.unitCost);
            if (isNaN(quantity) || isNaN(unitCost) || quantity <= 0 || unitCost < 0) {
                results.errors.push(`Línea ${lineNum} (${row.sku}): cantidad o costo inválido`);
                results.skipped++;
                continue;
            }
            const product = await prisma.product.findUnique({ where: { sku: row.sku } });
            if (!product) {
                results.errors.push(`Línea ${lineNum}: SKU "${row.sku}" no encontrado`);
                results.skipped++;
                continue;
            }
            try {
                const batch = await prisma.inventoryBatch.create({
                    data: {
                        productId: product.id,
                        batchCode: `IMPORT-${product.sku}-${Date.now()}-${i}`,
                        quantity,
                        remaining: quantity,
                        unitCost,
                    },
                });
                await prisma.inventoryMovement.create({
                    data: {
                        batchId: batch.id,
                        type: 'IN',
                        quantity,
                        reference: `CSV import by ${req.user.email}`,
                    },
                });
                results.created++;
            }
            catch (err) {
                results.errors.push(`Línea ${lineNum} (${row.sku}): error al crear batch`);
                results.skipped++;
            }
        }
        res.status(201).json(results);
    }
    catch (error) {
        console.error('Import inventory error:', error);
        res.status(500).json({ error: 'Failed to import inventory' });
    }
});
// FIFO: Deduct stock (internal function used by orders)
export async function deductStockFIFO(productId, quantity, reference) {
    let remainingToDeduct = quantity;
    let totalCost = 0;
    // Get batches ordered by FIFO (oldest first)
    const batches = await prisma.inventoryBatch.findMany({
        where: {
            productId,
            remaining: { gt: 0 },
        },
        orderBy: { receivedAt: 'asc' },
    });
    const totalAvailable = batches.reduce((sum, b) => sum + b.remaining, 0);
    if (totalAvailable < quantity) {
        return {
            success: false,
            cost: 0,
            error: `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`
        };
    }
    for (const batch of batches) {
        if (remainingToDeduct <= 0)
            break;
        const deductFromBatch = Math.min(batch.remaining, remainingToDeduct);
        totalCost += deductFromBatch * parseFloat(batch.unitCost.toString());
        remainingToDeduct -= deductFromBatch;
        // Update batch
        await prisma.inventoryBatch.update({
            where: { id: batch.id },
            data: { remaining: batch.remaining - deductFromBatch },
        });
        // Record movement
        await prisma.inventoryMovement.create({
            data: {
                batchId: batch.id,
                type: 'OUT',
                quantity: -deductFromBatch,
                reference,
            },
        });
    }
    return { success: true, cost: totalCost };
}
// FIFO: Return stock (for returns/cancellations)
export async function returnStockFIFO(productId, quantity, unitCost, reference) {
    // Create a new batch for returned items
    const batch = await prisma.inventoryBatch.create({
        data: {
            productId,
            batchCode: `RETURN-${Date.now()}`,
            quantity,
            remaining: quantity,
            unitCost,
        },
    });
    await prisma.inventoryMovement.create({
        data: {
            batchId: batch.id,
            type: 'RETURN',
            quantity,
            reference,
        },
    });
    return { success: true, batchId: batch.id };
}
export default router;
//# sourceMappingURL=inventory.js.map
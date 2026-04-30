import express from 'express';
import { authenticate } from '../middleware/auth.js';
import comprasRoutes from './shipments/compras.js';
import bodegaJaponRoutes from './shipments/bodega-japon.js';
import boletasRoutes from './shipments/boletas.js';
import pagosRoutes from './shipments/pagos.js';
import gavJaponRoutes from './shipments/gav-japon.js';
import cajasRoutes from './shipments/cajas.js';
import bodegaTransitoRoutes from './shipments/bodega-transito.js';
import comprasWebRoutes from './shipments/compras-web.js';
import internacionRoutes from './shipments/internacion.js';
import costeoRoutes from './shipments/costeo.js';
import bodegaChileRoutes from './bodegaChile.js';
import ventasRoutes from './ventas.js';
import comprasChileRoutes from './comprasChile.js';
import gavChileRoutes from './gavChile.js';
import eerrRoutes from './eerr.js';
import balanceRoutes from './balance.js';
import flujoRoutes from './flujo.js';
import dashboardRoutes from './dashboard.js';
import configRoutes from './config.js';

const router = express.Router();

/**
 * ESTRUCTURA DE RUTAS:
 * /api/shipments/compras/* → ./shipments/compras.ts
 * /api/shipments/bodega-japon/* → ./shipments/bodega-japon.ts
 * /api/shipments/boletas/* → ./shipments/boletas.ts
 * /api/shipments/cajas/* → ./shipments/cajas.ts
 * ... más módulos
 */

// Middleware global de autenticación para todos los submódulos.
router.use(authenticate);

// ==================== MÓDULOS JAPÓN ====================
router.use('/compras', comprasRoutes);
router.use('/bodega-japon', bodegaJaponRoutes);
router.use('/boletas', boletasRoutes);
router.use('/pagos', pagosRoutes);
router.use('/gav-japon', gavJaponRoutes);

// ==================== MÓDULOS ENVÍOS ====================
router.use('/cajas', cajasRoutes);
router.use('/bodega-transito', bodegaTransitoRoutes);
router.use('/compras-web', comprasWebRoutes);
router.use('/internacion', internacionRoutes);
router.use('/costeo', costeoRoutes);

// ==================== MÓDULOS CHILE ====================
router.use('/bodega-chile', bodegaChileRoutes);
router.use('/ventas', ventasRoutes);
router.use('/compras-chile', comprasChileRoutes);
router.use('/gav-chile', gavChileRoutes);

// ==================== MÓDULOS FINANZAS ====================
router.use('/dashboard', dashboardRoutes);
router.use('/eerr', eerrRoutes);
router.use('/balance', balanceRoutes);
router.use('/flujo', flujoRoutes);

// ==================== MÓDULO CONFIGURACIÓN ====================
router.use('/config', configRoutes);

export default router;

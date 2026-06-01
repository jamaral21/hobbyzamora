// ============================================================
// Shipments ERP — Types, Mock Data & Helper Functions
// Self-contained module: no external imports except standard TS
// ============================================================

// === Roles ===
export type ShipmentsRole = 'admin' | 'japon' | 'chile' | 'contador';

// === Compras (Purchases) ===
export type PaymentState = 'por_pagar' | 'esp_pago' | 'pagado';
export type LocationState = 'japon' | 'transito' | 'chile';

export interface PurchaseRecord {
  id: number;
  sku: string;                    // JP-XXXX
  fecha: string;                  // YYYY-MM-DD
  tipo: string;                   // 'Producto' | 'Arriendo/App' | etc.
  nombre: string;
  ean: string;
  tarjeta: string;
  precioU: number;                // precio unitario ¥
  cant: number;                   // cantidad total (inmutable)
  total: number;                  // precioU * cant
  estado: PaymentState;
  bodega: LocationState;
  tc: number | null;              // tipo de cambio ¥→CLP
}

// === Boletas (Invoices) ===
export type InvoiceState = 'sin_pagar' | 'pagado';

export interface Invoice {
  id: string;                     // BOL-YYYY-NNN | BOL-YYYY-GAV-NNN
  fecha: string;
  productos: number | string;
  subtotalJPY: number;
  comision: number;               // %
  totalJPY: number;
  tc: number;
  totalCLP: number;
  estado: InvoiceState;
}

export interface InvoiceItem {
  fecha: string;
  tipo: string;
  nombre: string;
  ean: string;
  precioU: number;                // ¥
  cant: number;
  comPct: number;
  tc: number;
}

// === Cajas (Boxes) ===
export type BoxState = 'transito' | 'llegada' | 'costeada';

export interface BoxProduct {
  _compraId: number;
  _sku: string;
  nombre: string;
  ean: string;
  cant: number;
  precioU: number;                // ¥
  tc: number;
}

export interface InternacionData {
  arancel: number;                // CLP
  iva: number;                    // CLP — IVA Crédito Fiscal
  total: number;
}

export interface CustomsDocument {
  nombre: string;
  tipo: 'DIN' | 'DTE' | 'Otro';
  fileName: string;
  fileUrl: string; // Puede ser base64, blob url o ruta
}

export interface Box {
  id: string;
  fecha: string;
  estado: BoxState;
  flete_jpy: number;
  mo_horas: number;
  mo_tarifa: number;              // CLP/hora
  mat_jpy: number;
  tc_envio: number;
  internacion: InternacionData | null;
  productos: BoxProduct[];
  documentosAduaneros?: CustomsDocument[];
}

// === Stock Chile ===
export interface ChileStockEntry {
  id: string;
  _sku: string;
  nombre: string;
  ean: string;
  caja: string;
  cant: number;
  costoUnit: number;              // CLP
  precioVenta: number | null;
}

// === Pedidos Web ===
export interface WebOrderProduct {
  nombre: string;
  ean: string;
  cant: number;
  precioUSD: number;
  precioCLP: number;
  pctCosteo: number;
  costoUnit: number;
}

export interface WebOrder {
  id: string;                     // WEB-NNN
  fecha: string;
  portal: string;
  orden: string;
  estado: 'pendiente' | 'costeado';
  costoEnvioIntern: number;       // CLP
  tc: number;
  productos: WebOrderProduct[];
  documentosAduaneros?: CustomsDocument[];
}

// === Compras Chile (Local Purchases) ===
export interface LocalPurchase {
  id: string;                     // CC-NNN
  fecha: string;
  tipo: 'producto' | 'gasto';
  docTipo: 'factura' | 'boleta';
  proveedor: string;
  descripcion: string;
  monto: number;                  // CLP
  iva: number;                    // CLP (solo facturas)
  ivaCredito: boolean;
  estado: 'pagado' | 'pendiente';
}

// === Ventas (Sales) ===
export type SalesChannel = 'Instagram' | 'TikTok' | 'Mercado Libre' | 'Web' | 'Local';

export interface SaleRecord {
  id: string;
  fecha: string;
  producto: string;
  ean: string;
  cant: number;
  precioVenta: number;
  costo: number;
  total: number;
  canal: SalesChannel;
}

// === GAV Chile ===
export interface GAVEntry {
  id: number;
  concepto: string;
  monto: number;                  // CLP
  adjunto: boolean;
  estado: 'pendiente' | 'pagado';
  docTipo: 'factura' | 'boleta';
  ivaCredito: boolean;
  fechaPago: string | null;
}

// === Configuración ===
export interface BankAccount {
  titular: string;
  rut: string;
  banco: string;
  tipo: string;
  numero: string;
}

export interface ERPConfig {
  cuentas: BankAccount[];
  metodosPago: string[];
  arrBodegaJP: number;            // ¥/mes
  appBeyblade: number;            // ¥/mes
  comisionPct: number;            // %
}

// ============================================================
// ROLE_PAGES — Access matrix
// ============================================================

export const ROLE_PAGES: Record<ShipmentsRole, string[]> = {
  admin: [
    'dashboard', 'compras', 'boletas', 'pagos', 'gav-japon', 'cajas',
    'compras-web', 'internacion', 'costeo', 'bodega-japon', 'bodega-transito',
    'bodega-chile', 'compras-chile', 'ventas', 'gav-chile',
    'eerr', 'balance', 'flujo', 'config',
  ],
  japon: ['compras', 'boletas', 'gav-japon', 'cajas'],
  chile: [
    'dashboard', 'bodega-japon', 'bodega-transito', 'bodega-chile', 'ventas',
    'cajas', 'compras-web', 'internacion', 'costeo', 'compras-chile',
  ],
  contador: ['dashboard', 'eerr', 'balance', 'flujo', 'gav-chile', 'gav-japon'],
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calcula unidades disponibles en Japón para un SKU.
 * disponible = compra.cant - unitsInActiveBoxes - unitsInChileStock
 * Never returns negative.
 */
export function calcDisponibleBySku(
  sku: string,
  compras: PurchaseRecord[],
  cajas: Box[],
  stockChile: ChileStockEntry[],
): number {
  const compra = compras.find((c) => c.sku === sku);
  if (!compra) return 0;

  const unitsInActiveBoxes = cajas
    .filter((b) => b.estado === 'transito' || b.estado === 'llegada')
    .reduce((sum, box) => {
      return sum + box.productos
        .filter((p) => p._sku === sku)
        .reduce((s, p) => s + p.cant, 0);
    }, 0);

  const unitsInChileStock = stockChile
    .filter((s) => s._sku === sku)
    .reduce((sum, s) => sum + s.cant, 0);

  return Math.max(0, compra.cant - unitsInActiveBoxes - unitsInChileStock);
}

/**
 * Formatea un monto en JPY con prefijo ¥ y locale es-CL.
 * Handles NaN, Infinity, negative → ¥0
 */
export function formatJPY(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '¥0';
  const formatted = Math.round(amount).toLocaleString('es-CL');
  return `¥${formatted}`;
}

/**
 * Formatea un monto en CLP con prefijo $ y locale es-CL.
 * Handles NaN, Infinity, negative → $0
 */
export function formatCLP(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '$0';
  const formatted = Math.round(amount).toLocaleString('es-CL');
  return `$${formatted}`;
}

/**
 * Genera el siguiente SKU secuencial JP-XXXX.
 * Empty list → JP-0001
 */
export function nextSku(compras: PurchaseRecord[]): string {
  if (compras.length === 0) return 'JP-0001';
  const maxNum = Math.max(
    ...compras.map((c) => parseInt(c.sku.replace(/\D/g, ''), 10) || 0),
  );
  return `JP-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Genera el siguiente ID de boleta.
 * Regular: BOL-YYYY-NNN
 * GAV:     BOL-YYYY-GAV-NNN
 */
export function nextBoletaId(boletas: Invoice[], isGAV = false): string {
  const year = new Date().getFullYear();
  const prefix = isGAV ? `BOL-${year}-GAV-` : `BOL-${year}-`;

  const existing = boletas
    .filter((b) => b.id.startsWith(prefix))
    .map((b) => {
      const suffix = b.id.slice(prefix.length);
      return parseInt(suffix, 10) || 0;
    });

  const maxNum = existing.length > 0 ? Math.max(...existing) : 0;
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Calcula el costo unitario de un producto en una caja.
 * Formula: (subtotalCLP * pct/100 + fleteCLP * pct/100 + moCLP * pct/100
 *           + matCLP * pct/100 + internCLP * pct/100) / cant
 */
export function calcCostoUnitario(
  box: Box,
  productPct: number,
  productCant: number,
): number {
  if (productCant <= 0) return 0;

  const subtotalCLP = box.productos.reduce(
    (sum, p) => sum + p.precioU * p.cant * (1 / box.tc_envio),
    0,
  );
  const fleteCLP = box.flete_jpy / box.tc_envio;
  const moCLP = box.mo_horas * box.mo_tarifa;
  const matCLP = box.mat_jpy / box.tc_envio;
  const internCLP = box.internacion
    ? box.internacion.arancel + box.internacion.iva
    : 0;

  const pctFraction = productPct / 100;
  const totalCost =
    subtotalCLP * pctFraction +
    fleteCLP * pctFraction +
    moCLP * pctFraction +
    matCLP * pctFraction +
    internCLP * pctFraction;

  return Math.round(totalCost / productCant);
}

/**
 * Calcula totales de una boleta/invoice.
 * Returns { subtotalJPY, totalJPY, totalCLP }
 */
export function calcInvoiceTotals(
  items: { precioU: number; cant: number }[],
  comisionPct: number,
  tc: number,
): { subtotalJPY: number; totalJPY: number; totalCLP: number } {
  const subtotalJPY = items.reduce((sum, i) => sum + i.precioU * i.cant, 0);
  const totalJPY = subtotalJPY * (1 + comisionPct / 100);
  const totalCLP = tc > 0 ? totalJPY * tc : 0;
  return { subtotalJPY, totalJPY, totalCLP };
}

/**
 * Valida que los porcentajes de costeo sumen exactamente 100.
 */
export function validateCosteoPercentages(percentages: number[]): boolean {
  const sum = percentages.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) < 0.0001;
}

/**
 * Calcula el margen porcentual.
 * margin = (precioVenta - costoUnit) / precioVenta * 100
 */
export function calcMargin(precioVenta: number, costoUnit: number): number {
  if (precioVenta <= 0) return 0;
  return ((precioVenta - costoUnit) / precioVenta) * 100;
}

/**
 * Retorna el color del margen: green (>30%), orange (>15%), red (≤15%).
 */
export function marginColor(margin: number): 'green' | 'orange' | 'red' {
  if (margin > 30) return 'green';
  if (margin > 15) return 'orange';
  return 'red';
}

// ============================================================
// Financial Statement Helpers
// ============================================================

export interface IncomeStatement {
  ingresos: number;
  costoVenta: number;
  margenBruto: number;
  gavJapon: number;
  gavChile: number;
  gavTotal: number;
  ebit: number;
  ivaCredito: number;
  resultadoNeto: number;
}

/**
 * Calcula el Estado de Resultados.
 * Solo incluye GAV con estado 'pagado'.
 */
export function calcIncomeStatement(
  ventas: SaleRecord[],
  gavJapon: Invoice[],
  gavChile: GAVEntry[],
  internaciones: Box[],
  comprasChile: LocalPurchase[],
): IncomeStatement {
  const ingresos = ventas.reduce((sum, v) => sum + v.total, 0);
  const costoVenta = ventas.reduce((sum, v) => sum + v.costo * v.cant, 0);
  const margenBruto = ingresos - costoVenta;

  // GAV Japón: boletas GAV pagadas
  const gavJaponTotal = gavJapon
    .filter((b) => b.estado === 'pagado' && b.id.includes('GAV'))
    .reduce((sum, b) => sum + b.totalCLP, 0);

  // GAV Chile: solo pagados
  const gavChileTotal = gavChile
    .filter((g) => g.estado === 'pagado')
    .reduce((sum, g) => sum + g.monto, 0);

  const gavTotal = gavJaponTotal + gavChileTotal;
  const ebit = margenBruto - gavTotal;

  // IVA Crédito: internaciones + compras locales con ivaCredito
  const ivaInternaciones = internaciones
    .filter((b) => b.internacion !== null)
    .reduce((sum, b) => sum + (b.internacion?.iva ?? 0), 0);

  const ivaComprasChile = comprasChile
    .filter((c) => c.ivaCredito)
    .reduce((sum, c) => sum + c.iva, 0);

  const ivaCredito = ivaInternaciones + ivaComprasChile;
  const resultadoNeto = ebit + ivaCredito;

  return {
    ingresos,
    costoVenta,
    margenBruto,
    gavJapon: gavJaponTotal,
    gavChile: gavChileTotal,
    gavTotal,
    ebit,
    ivaCredito,
    resultadoNeto,
  };
}

/**
 * Agrupa ingresos por canal de venta.
 */
export function groupRevenueByChannel(
  ventas: SaleRecord[],
): Record<SalesChannel, number> {
  const channels: SalesChannel[] = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'];
  const result = {} as Record<SalesChannel, number>;
  for (const ch of channels) {
    result[ch] = 0;
  }
  for (const v of ventas) {
    result[v.canal] = (result[v.canal] || 0) + v.total;
  }
  return result;
}

export interface BalanceSheet {
  cajaEstimada: number;
  invChile: number;
  invJapon: number;
  ivaCreditoTotal: number;
  activos: number;
  pasivos: number;
  patrimonio: number;
}

/**
 * Calcula el Balance General.
 * Activos = Caja estimada + Inv Chile + Inv Japón + IVA Crédito
 * Pasivos = Boletas sin pagar (totalCLP)
 * Patrimonio = Activos - Pasivos
 */
export function calcBalanceSheet(
  ventas: SaleRecord[],
  boletas: Invoice[],
  stockChile: ChileStockEntry[],
  compras: PurchaseRecord[],
  cajas: Box[],
  comprasChile: LocalPurchase[],
): BalanceSheet {
  // Caja estimada = ingresos ventas - egresos pagados
  const ingresosVentas = ventas.reduce((s, v) => s + v.total, 0);
  const egresosBoletas = boletas
    .filter((b) => b.estado === 'pagado')
    .reduce((s, b) => s + b.totalCLP, 0);
  const egresosChile = comprasChile
    .filter((c) => c.estado === 'pagado')
    .reduce((s, c) => s + c.monto, 0);
  const cajaEstimada = ingresosVentas - egresosBoletas - egresosChile;

  // Inventario Chile: cant * costoUnit
  const invChile = stockChile.reduce((s, e) => s + e.cant * e.costoUnit, 0);

  // Inventario Japón: compras con bodega=japon, precioU * cant * tc
  const invJapon = compras
    .filter((c) => c.bodega === 'japon' && c.tc && c.tc > 0)
    .reduce((s, c) => s + (c.precioU * c.cant) * (c.tc as number), 0);

  // IVA Crédito: internaciones + compras locales con ivaCredito
  const ivaInternaciones = cajas
    .filter((b) => b.internacion !== null)
    .reduce((s, b) => s + (b.internacion?.iva ?? 0), 0);
  const ivaComprasChile = comprasChile
    .filter((c) => c.ivaCredito)
    .reduce((s, c) => s + c.iva, 0);
  const ivaCreditoTotal = ivaInternaciones + ivaComprasChile;

  const activos = cajaEstimada + invChile + invJapon + ivaCreditoTotal;

  // Pasivos: boletas sin pagar
  const pasivos = boletas
    .filter((b) => b.estado === 'sin_pagar')
    .reduce((s, b) => s + b.totalCLP, 0);

  const patrimonio = activos - pasivos;

  return { cajaEstimada, invChile, invJapon, ivaCreditoTotal, activos, pasivos, patrimonio };
}

export interface CashFlow {
  ingresos: number;
  egresosJP: number;
  egresosCL: number;
  flujoNeto: number;
}

/**
 * Calcula el Flujo de Caja.
 * Ingresos = ventas totales
 * Egresos JP = boletas pagadas
 * Egresos CL = GAV Chile pagado + compras locales pagadas
 * Flujo Neto = Ingresos - EgresosJP - EgresosCL
 */
export function calcCashFlow(
  ventas: SaleRecord[],
  boletas: Invoice[],
  gavChile: GAVEntry[],
  comprasChile: LocalPurchase[],
): CashFlow {
  const ingresos = ventas.reduce((s, v) => s + v.total, 0);

  const egresosJP = boletas
    .filter((b) => b.estado === 'pagado')
    .reduce((s, b) => s + b.totalCLP, 0);

  const gavChilePagado = gavChile
    .filter((g) => g.estado === 'pagado')
    .reduce((s, g) => s + g.monto, 0);

  const comprasChilePagado = comprasChile
    .filter((c) => c.estado === 'pagado')
    .reduce((s, c) => s + c.monto, 0);

  const egresosCL = gavChilePagado + comprasChilePagado;
  const flujoNeto = ingresos - egresosJP - egresosCL;

  return { ingresos, egresosJP, egresosCL, flujoNeto };
}

// ============================================================
// Mock Data — Realistic for hobby store importing from Japan
// ============================================================

// --- Compras (12 purchases) ---
export const mockCompras: PurchaseRecord[] = [
  {
    id: 1, sku: 'JP-0001', fecha: '2026-01-15', tipo: 'Producto',
    nombre: 'Pokémon TCG Booster Box SV10', ean: '4521329400013',
    tarjeta: 'JCB Bandai', precioU: 5800, cant: 6, total: 34800,
    estado: 'pagado', bodega: 'chile', tc: 6.2,
  },
  {
    id: 2, sku: 'JP-0002', fecha: '2026-01-18', tipo: 'Producto',
    nombre: 'Beyblade X BX-30 Starter', ean: '4904810912347',
    tarjeta: 'Rakuten', precioU: 2200, cant: 10, total: 22000,
    estado: 'pagado', bodega: 'chile', tc: 6.2,
  },
  {
    id: 3, sku: 'JP-0003', fecha: '2026-02-05', tipo: 'Producto',
    nombre: 'Pokémon TCG ETB Terastal Festival', ean: '4521329401010',
    tarjeta: 'PayPay', precioU: 4500, cant: 4, total: 18000,
    estado: 'pagado', bodega: 'transito', tc: 6.1,
  },
  {
    id: 4, sku: 'JP-0004', fecha: '2026-02-10', tipo: 'Producto',
    nombre: 'Beyblade X BX-31 Booster', ean: '4904810912354',
    tarjeta: 'JCB Bandai', precioU: 1100, cant: 20, total: 22000,
    estado: 'esp_pago', bodega: 'transito', tc: 6.1,
  },
  {
    id: 5, sku: 'JP-0005', fecha: '2026-02-20', tipo: 'Producto',
    nombre: 'Pokémon TCG Special Deck Set ex', ean: '4521329402215',
    tarjeta: 'View Card', precioU: 3200, cant: 8, total: 25600,
    estado: 'pagado', bodega: 'japon', tc: 6.0,
  },
  {
    id: 6, sku: 'JP-0006', fecha: '2026-03-01', tipo: 'Producto',
    nombre: 'Tomica Premium Nissan GT-R', ean: '4904810234567',
    tarjeta: 'Rakuten', precioU: 980, cant: 15, total: 14700,
    estado: 'por_pagar', bodega: 'japon', tc: 5.9,
  },
  {
    id: 7, sku: 'JP-0007', fecha: '2026-03-05', tipo: 'Producto',
    nombre: 'Pokémon TCG Booster Box SV11', ean: '4521329403011',
    tarjeta: 'PayPay', precioU: 5800, cant: 4, total: 23200,
    estado: 'por_pagar', bodega: 'japon', tc: 5.9,
  },
  {
    id: 8, sku: 'JP-0008', fecha: '2026-03-08', tipo: 'Producto',
    nombre: 'Beyblade X BX-32 Random Booster', ean: '4904810912361',
    tarjeta: 'JCB Bandai', precioU: 850, cant: 24, total: 20400,
    estado: 'esp_pago', bodega: 'japon', tc: 5.9,
  },
  {
    id: 9, sku: 'JP-0009', fecha: '2026-03-12', tipo: 'Producto',
    nombre: 'Pokémon Plush Pikachu 30cm', ean: '4521329500100',
    tarjeta: 'Rakuten', precioU: 3500, cant: 5, total: 17500,
    estado: 'por_pagar', bodega: 'japon', tc: 5.8,
  },
  {
    id: 10, sku: 'JP-0010', fecha: '2026-03-15', tipo: 'Producto',
    nombre: 'Pokémon TCG Trainer Box Ultra', ean: '4521329404100',
    tarjeta: 'View Card', precioU: 7200, cant: 3, total: 21600,
    estado: 'por_pagar', bodega: 'japon', tc: 5.8,
  },
  {
    id: 11, sku: 'JP-0011', fecha: '2026-03-18', tipo: 'Producto',
    nombre: 'Beyblade X BX-33 String Launcher', ean: '4904810912378',
    tarjeta: 'PayPay', precioU: 1500, cant: 12, total: 18000,
    estado: 'esp_pago', bodega: 'japon', tc: 5.8,
  },
  {
    id: 12, sku: 'JP-0012', fecha: '2026-03-20', tipo: 'Producto',
    nombre: 'Pokémon TCG Promo Pack Set', ean: '4521329405200',
    tarjeta: 'Efectivo', precioU: 1800, cant: 10, total: 18000,
    estado: 'por_pagar', bodega: 'japon', tc: 5.8,
  },
];

// --- Cajas (3 boxes with referential integrity to compras) ---
export const mockCajas: Box[] = [
  {
    id: 'Caja_1_Ene26',
    fecha: '2026-01-25',
    estado: 'costeada',
    flete_jpy: 12000,
    mo_horas: 2,
    mo_tarifa: 5000,
    mat_jpy: 3000,
    tc_envio: 6.2,
    internacion: { arancel: 45000, iva: 38000, total: 83000 },
    productos: [
      {
        _compraId: 1, _sku: 'JP-0001', nombre: 'Pokémon TCG Booster Box SV10',
        ean: '4521329400013', cant: 6, precioU: 5800, tc: 6.2,
      },
      {
        _compraId: 2, _sku: 'JP-0002', nombre: 'Beyblade X BX-30 Starter',
        ean: '4904810912347', cant: 10, precioU: 2200, tc: 6.2,
      },
    ],
  },
  {
    id: 'Caja_2_Feb26',
    fecha: '2026-02-15',
    estado: 'transito',
    flete_jpy: 9500,
    mo_horas: 1.5,
    mo_tarifa: 5000,
    mat_jpy: 2500,
    tc_envio: 6.1,
    internacion: null,
    productos: [
      {
        _compraId: 3, _sku: 'JP-0003', nombre: 'Pokémon TCG ETB Terastal Festival',
        ean: '4521329401010', cant: 4, precioU: 4500, tc: 6.1,
      },
      {
        _compraId: 4, _sku: 'JP-0004', nombre: 'Beyblade X BX-31 Booster',
        ean: '4904810912354', cant: 15, precioU: 1100, tc: 6.1,
      },
    ],
  },
  {
    id: 'Caja_3_Mar26',
    fecha: '2026-03-10',
    estado: 'llegada',
    flete_jpy: 8000,
    mo_horas: 1,
    mo_tarifa: 5000,
    mat_jpy: 2000,
    tc_envio: 5.9,
    internacion: { arancel: 32000, iva: 28000, total: 60000 },
    productos: [
      {
        _compraId: 5, _sku: 'JP-0005', nombre: 'Pokémon TCG Special Deck Set ex',
        ean: '4521329402215', cant: 4, precioU: 3200, tc: 6.0,
      },
      {
        _compraId: 6, _sku: 'JP-0006', nombre: 'Tomica Premium Nissan GT-R',
        ean: '4904810234567', cant: 8, precioU: 980, tc: 5.9,
      },
      {
        _compraId: 7, _sku: 'JP-0007', nombre: 'Pokémon TCG Booster Box SV11',
        ean: '4521329403011', cant: 2, precioU: 5800, tc: 5.9,
      },
    ],
  },
];

// --- Boletas / Invoices (4 invoices) ---
export const mockBoletas: Invoice[] = [
  {
    id: 'BOL-2026-001', fecha: '2026-01-20', productos: 2,
    subtotalJPY: 56800, comision: 13, totalJPY: 64184, tc: 6.2,
    totalCLP: 397941, estado: 'pagado',
  },
  {
    id: 'BOL-2026-002', fecha: '2026-02-12', productos: 2,
    subtotalJPY: 40000, comision: 13, totalJPY: 45200, tc: 6.1,
    totalCLP: 275720, estado: 'sin_pagar',
  },
  {
    id: 'BOL-2026-003', fecha: '2026-03-08', productos: 1,
    subtotalJPY: 25600, comision: 13, totalJPY: 28928, tc: 6.0,
    totalCLP: 173568, estado: 'sin_pagar',
  },
  {
    id: 'BOL-2026-GAV-001', fecha: '2026-01-05', productos: 'GAV Enero 2026',
    subtotalJPY: 25550, comision: 13, totalJPY: 28872, tc: 6.2,
    totalCLP: 179006, estado: 'pagado',
  },
];

// --- Boleta Items (line items per invoice) ---
export const mockBoletaItems: Record<string, InvoiceItem[]> = {
  'BOL-2026-001': [
    {
      fecha: '2026-01-15', tipo: 'Producto', nombre: 'Pokémon TCG Booster Box SV10',
      ean: '4521329400013', precioU: 5800, cant: 6, comPct: 13, tc: 6.2,
    },
    {
      fecha: '2026-01-18', tipo: 'Producto', nombre: 'Beyblade X BX-30 Starter',
      ean: '4904810912347', precioU: 2200, cant: 10, comPct: 13, tc: 6.2,
    },
  ],
  'BOL-2026-002': [
    {
      fecha: '2026-02-05', tipo: 'Producto', nombre: 'Pokémon TCG ETB Terastal Festival',
      ean: '4521329401010', precioU: 4500, cant: 4, comPct: 13, tc: 6.1,
    },
    {
      fecha: '2026-02-10', tipo: 'Producto', nombre: 'Beyblade X BX-31 Booster',
      ean: '4904810912354', precioU: 1100, cant: 20, comPct: 13, tc: 6.1,
    },
  ],
  'BOL-2026-003': [
    {
      fecha: '2026-02-20', tipo: 'Producto', nombre: 'Pokémon TCG Special Deck Set ex',
      ean: '4521329402215', precioU: 3200, cant: 8, comPct: 13, tc: 6.0,
    },
  ],
  'BOL-2026-GAV-001': [
    {
      fecha: '2026-01-05', tipo: 'Arriendo/App', nombre: 'Arriendo Bodega Japón',
      ean: '', precioU: 25000, cant: 1, comPct: 13, tc: 6.2,
    },
    {
      fecha: '2026-01-05', tipo: 'Arriendo/App', nombre: 'App Beyblade',
      ean: '', precioU: 550, cant: 1, comPct: 13, tc: 6.2,
    },
  ],
};

// --- Stock Chile (6 entries, from costeada Caja_1_Ene26) ---
export const mockStockChile: ChileStockEntry[] = [
  {
    id: 'SC-001', _sku: 'JP-0001', nombre: 'Pokémon TCG Booster Box SV10',
    ean: '4521329400013', caja: 'Caja_1_Ene26', cant: 2,
    costoUnit: 8500, precioVenta: 14990,
  },
  {
    id: 'SC-002', _sku: 'JP-0002', nombre: 'Beyblade X BX-30 Starter',
    ean: '4904810912347', caja: 'Caja_1_Ene26', cant: 5,
    costoUnit: 3200, precioVenta: 5990,
  },
  {
    id: 'SC-003', _sku: 'JP-0001', nombre: 'Pokémon TCG Booster Box SV10',
    ean: '4521329400013', caja: 'Caja_1_Ene26', cant: 1,
    costoUnit: 8500, precioVenta: 12990,
  },
  {
    id: 'SC-004', _sku: 'JP-0002', nombre: 'Beyblade X BX-30 Starter',
    ean: '4904810912347', caja: 'Caja_1_Ene26', cant: 3,
    costoUnit: 3200, precioVenta: null,
  },
  {
    id: 'SC-005', _sku: 'JP-0001', nombre: 'Pokémon TCG Booster Box SV10',
    ean: '4521329400013', caja: 'Caja_1_Ene26', cant: 1,
    costoUnit: 8500, precioVenta: 16990,
  },
  {
    id: 'SC-006', _sku: 'JP-0002', nombre: 'Beyblade X BX-30 Starter',
    ean: '4904810912347', caja: 'Caja_1_Ene26', cant: 2,
    costoUnit: 3200, precioVenta: 4990,
  },
];

// --- Ventas / Sales (7 records across all channels) ---
export const mockVentas: SaleRecord[] = [
  {
    id: 'V-001', fecha: '2026-02-10', producto: 'Pokémon TCG Booster Box SV10',
    ean: '4521329400013', cant: 1, precioVenta: 14990, costo: 8500,
    total: 14990, canal: 'Instagram',
  },
  {
    id: 'V-002', fecha: '2026-02-14', producto: 'Beyblade X BX-30 Starter',
    ean: '4904810912347', cant: 2, precioVenta: 5990, costo: 3200,
    total: 11980, canal: 'TikTok',
  },
  {
    id: 'V-003', fecha: '2026-02-20', producto: 'Pokémon TCG Booster Box SV10',
    ean: '4521329400013', cant: 1, precioVenta: 14990, costo: 8500,
    total: 14990, canal: 'Mercado Libre',
  },
  {
    id: 'V-004', fecha: '2026-03-01', producto: 'Beyblade X BX-30 Starter',
    ean: '4904810912347', cant: 1, precioVenta: 5990, costo: 3200,
    total: 5990, canal: 'Web',
  },
  {
    id: 'V-005', fecha: '2026-03-05', producto: 'Pokémon TCG Booster Box SV10',
    ean: '4521329400013', cant: 1, precioVenta: 16990, costo: 8500,
    total: 16990, canal: 'Local',
  },
  {
    id: 'V-006', fecha: '2026-03-10', producto: 'Beyblade X BX-30 Starter',
    ean: '4904810912347', cant: 1, precioVenta: 4990, costo: 3200,
    total: 4990, canal: 'Instagram',
  },
  {
    id: 'V-007', fecha: '2026-03-15', producto: 'Pokémon TCG Booster Box SV10',
    ean: '4521329400013', cant: 1, precioVenta: 12990, costo: 8500,
    total: 12990, canal: 'TikTok',
  },
];

// --- GAV Chile (6 entries) ---
export const mockGAVChile: GAVEntry[] = [
  {
    id: 1, concepto: 'Arriendo bodega Chile', monto: 180000,
    adjunto: true, estado: 'pagado', docTipo: 'boleta',
    ivaCredito: false, fechaPago: '2026-01-05',
  },
  {
    id: 2, concepto: 'Contador', monto: 120000,
    adjunto: true, estado: 'pagado', docTipo: 'factura',
    ivaCredito: true, fechaPago: '2026-01-10',
  },
  {
    id: 3, concepto: 'Cuenta corriente', monto: 5990,
    adjunto: true, estado: 'pagado', docTipo: 'boleta',
    ivaCredito: false, fechaPago: '2026-02-01',
  },
  {
    id: 4, concepto: 'POS', monto: 15000,
    adjunto: false, estado: 'pendiente', docTipo: 'factura',
    ivaCredito: true, fechaPago: null,
  },
  {
    id: 5, concepto: 'Comisión web', monto: 25000,
    adjunto: true, estado: 'pagado', docTipo: 'factura',
    ivaCredito: true, fechaPago: '2026-03-01',
  },
  {
    id: 6, concepto: 'Arriendo bodega Chile', monto: 180000,
    adjunto: false, estado: 'pendiente', docTipo: 'boleta',
    ivaCredito: false, fechaPago: null,
  },
];

// --- Pedidos Web / Web Orders (2 entries) ---
export const mockPedidosWeb: WebOrder[] = [
  {
    id: 'WEB-001', fecha: '2026-02-01', portal: 'Amazon Japan',
    orden: 'AMZ-JP-98765', estado: 'costeado', costoEnvioIntern: 35000,
    tc: 6.1,
    productos: [
      {
        nombre: 'Pokémon TCG Promo Card Set', ean: '4521329410001',
        cant: 5, precioUSD: 0, precioCLP: 8200, pctCosteo: 60, costoUnit: 2800,
      },
      {
        nombre: 'Beyblade X Parts Set', ean: '4904810920001',
        cant: 3, precioUSD: 0, precioCLP: 5500, pctCosteo: 40, costoUnit: 3100,
      },
    ],
  },
  {
    id: 'WEB-002', fecha: '2026-03-05', portal: 'Rakuten',
    orden: 'RKT-2026-44321', estado: 'pendiente', costoEnvioIntern: 28000,
    tc: 5.9,
    productos: [
      {
        nombre: 'Pokémon Figure Mewtwo', ean: '4521329510050',
        cant: 2, precioUSD: 45, precioCLP: 42000, pctCosteo: 70, costoUnit: 0,
      },
      {
        nombre: 'Tomica Limited Vintage', ean: '4904810345678',
        cant: 4, precioUSD: 18, precioCLP: 16800, pctCosteo: 30, costoUnit: 0,
      },
    ],
  },
];

// --- Compras Chile / Local Purchases (4 entries) ---
export const mockComprasChile: LocalPurchase[] = [
  {
    id: 'CC-001', fecha: '2026-01-20', tipo: 'producto', docTipo: 'factura',
    proveedor: 'Distribuidora TCG Chile', descripcion: 'Protectores y sleeves',
    monto: 85000, iva: 13613, ivaCredito: true, estado: 'pagado',
  },
  {
    id: 'CC-002', fecha: '2026-02-05', tipo: 'gasto', docTipo: 'boleta',
    proveedor: 'Correos de Chile', descripcion: 'Envíos nacionales febrero',
    monto: 45000, iva: 0, ivaCredito: false, estado: 'pagado',
  },
  {
    id: 'CC-003', fecha: '2026-03-01', tipo: 'producto', docTipo: 'factura',
    proveedor: 'Importadora Juguetes SpA', descripcion: 'Cajas de cartón y embalaje',
    monto: 62000, iva: 9933, ivaCredito: true, estado: 'pagado',
  },
  {
    id: 'CC-004', fecha: '2026-03-10', tipo: 'gasto', docTipo: 'boleta',
    proveedor: 'Publicidad Digital', descripcion: 'Campaña Instagram marzo',
    monto: 50000, iva: 0, ivaCredito: false, estado: 'pendiente',
  },
];

// --- Bank Accounts (3 entries) ---
export const mockCuentas: BankAccount[] = [
  {
    titular: 'Sebastian Canales', rut: '16.232.924-3',
    banco: 'Banco Falabella', tipo: 'Cta. Corriente', numero: '019831141187',
  },
  {
    titular: 'Enedina Silva', rut: '8.307.035-8',
    banco: 'Banco Falabella', tipo: 'Cta. Corriente', numero: '011810026573',
  },
  {
    titular: 'Diego Zamora', rut: '17.472.094-0',
    banco: 'Banco Falabella', tipo: 'Cta. Corriente', numero: '014000123337',
  },
];

// --- ERP Config ---
export const mockConfig: ERPConfig = {
  cuentas: mockCuentas,
  metodosPago: [
    'Efectivo', 'JCB Bandai', 'Rakuten', 'PayPay', 'View Card',
    '', '', '', '', '',
  ],
  arrBodegaJP: 25000,
  appBeyblade: 550,
  comisionPct: 13,
};

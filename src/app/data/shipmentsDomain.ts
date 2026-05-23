// Shipments domain types and pure helpers (no mock seed data).

export type ShipmentsRole = 'admin' | 'japon' | 'chile' | 'contador';

export type PaymentState = 'por_pagar' | 'esp_pago' | 'pagado';
export type LocationState = 'japon' | 'transito' | 'chile';

export interface PurchaseRecord {
  id: number;
  sku: string;
  fecha: string;
  tipo: string;
  nombre: string;
  ean: string;
  tarjeta: string;
  precioU: number;
  cant: number;
  total: number;
  estado: PaymentState;
  bodega: LocationState;
  tc: number | null;
}

export type InvoiceState = 'sin_pagar' | 'pagado';

export interface Invoice {
  id: string;
  fecha: string;
  productos: number | string;
  subtotalJPY: number;
  comision: number;
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
  precioU: number;
  cant: number;
  comPct: number;
  tc: number;
}

export type BoxState = 'transito' | 'llegada' | 'costeada';

export interface BoxProduct {
  _compraId: number;
  _sku: string;
  nombre: string;
  ean: string;
  cant: number;
  precioU: number;
  tc: number;
}

export interface InternacionData {
  arancel: number;
  iva: number;
  total: number;
}

export interface CustomsDocument {
  nombre: string;
  tipo: 'DIN' | 'DTE' | 'Otro';
  fileName: string;
  fileUrl: string;
}

export interface Box {
  id: string;
  fecha: string;
  estado: BoxState;
  flete_jpy: number;
  mo_horas: number;
  mo_tarifa: number;
  mat_jpy: number;
  tc_envio: number;
  internacion: InternacionData | null;
  productos: BoxProduct[];
  documentosAduaneros?: CustomsDocument[];
}

export interface ChileStockEntry {
  id: string;
  _sku: string;
  nombre: string;
  ean: string;
  caja: string;
  cant: number;
  costoUnit: number;
  precioVenta: number | null;
}

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
  id: string;
  fecha: string;
  portal: string;
  orden: string;
  estado: 'pendiente' | 'costeado';
  costoEnvioIntern: number;
  tc: number;
  productos: WebOrderProduct[];
  documentosAduaneros?: CustomsDocument[];
}

export interface LocalPurchase {
  id: string;
  fecha: string;
  tipo: 'producto' | 'gasto';
  docTipo: 'factura' | 'boleta';
  proveedor: string;
  descripcion: string;
  monto: number;
  iva: number;
  ivaCredito: boolean;
  estado: 'pagado' | 'pendiente';
}

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

export interface GAVEntry {
  id: number;
  concepto: string;
  monto: number;
  adjunto: boolean;
  estado: 'pendiente' | 'pagado';
  docTipo: 'factura' | 'boleta';
  ivaCredito: boolean;
  fechaPago: string | null;
}

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
  arrBodegaJP: number;
  appBeyblade: number;
  comisionPct: number;
}

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

export function formatJPY(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '¥0';
  const formatted = Math.round(amount).toLocaleString('es-CL');
  return `¥${formatted}`;
}

export function formatCLP(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '$0';
  const formatted = Math.round(amount).toLocaleString('es-CL');
  return `$${formatted}`;
}

export function nextSku(compras: PurchaseRecord[]): string {
  if (compras.length === 0) return 'JP-0001';
  const maxNum = Math.max(...compras.map((c) => parseInt(c.sku.replace(/\D/g, ''), 10) || 0));
  return `JP-${String(maxNum + 1).padStart(4, '0')}`;
}

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

export function calcCostoUnitario(box: Box, productPct: number, productCant: number): number {
  if (productCant <= 0) return 0;

  const subtotalCLP = box.productos.reduce(
    (sum, p) => sum + p.precioU * p.cant * (1 / box.tc_envio),
    0,
  );
  const fleteCLP = box.flete_jpy / box.tc_envio;
  const moCLP = box.mo_horas * box.mo_tarifa;
  const matCLP = box.mat_jpy / box.tc_envio;
  const internCLP = box.internacion ? box.internacion.arancel + box.internacion.iva : 0;

  const pctFraction = productPct / 100;
  const totalCost =
    subtotalCLP * pctFraction +
    fleteCLP * pctFraction +
    moCLP * pctFraction +
    matCLP * pctFraction +
    internCLP * pctFraction;

  return Math.round(totalCost / productCant);
}

export function calcInvoiceTotals(
  items: { precioU: number; cant: number }[],
  comisionPct: number,
  tc: number,
): { subtotalJPY: number; totalJPY: number; totalCLP: number } {
  const subtotalJPY = items.reduce((sum, i) => sum + i.precioU * i.cant, 0);
  const totalJPY = subtotalJPY * (1 + comisionPct / 100);
  const totalCLP = tc > 0 ? totalJPY / tc : 0;
  return { subtotalJPY, totalJPY, totalCLP };
}

export function validateCosteoPercentages(percentages: number[]): boolean {
  const sum = percentages.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) < 0.0001;
}

export function calcMargin(precioVenta: number, costoUnit: number): number {
  if (precioVenta <= 0) return 0;
  return ((precioVenta - costoUnit) / precioVenta) * 100;
}

export function marginColor(margin: number): 'green' | 'orange' | 'red' {
  if (margin > 30) return 'green';
  if (margin > 15) return 'orange';
  return 'red';
}

export interface IncomeStatement {
  ingresos: number;
  costoVenta: number;
  margenBruto: number;
  gavJapon: number;
  gavChile: number;
  gavComprasLocales: number;
  gavTotal: number;
  ebit: number;
  ivaCredito: number;
  resultadoNeto: number;
}

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

  const gavJaponTotal = gavJapon
    .filter((b) => b.estado === 'pagado' && b.id.includes('GAV'))
    .reduce((sum, b) => sum + b.totalCLP, 0);

  const gavChileTotal = gavChile
    .filter((g) => g.estado === 'pagado')
    .reduce((sum, g) => sum + g.monto, 0);

  const gavComprasLocalesTotal = comprasChile
    .filter((c) => c.estado === 'pagado' && c.tipo === 'gasto')
    .reduce((sum, c) => sum + c.monto, 0);

  const gavTotal = gavJaponTotal + gavChileTotal + gavComprasLocalesTotal;
  const ebit = margenBruto - gavTotal;

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
    gavComprasLocales: gavComprasLocalesTotal,
    gavTotal,
    ebit,
    ivaCredito,
    resultadoNeto,
  };
}

export function groupRevenueByChannel(ventas: SaleRecord[]): Record<SalesChannel, number> {
  const channels: SalesChannel[] = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'];
  const result = {} as Record<SalesChannel, number>;
  for (const ch of channels) result[ch] = 0;
  for (const v of ventas) result[v.canal] = (result[v.canal] || 0) + v.total;
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

export function calcBalanceSheet(
  ventas: SaleRecord[],
  boletas: Invoice[],
  stockChile: ChileStockEntry[],
  compras: PurchaseRecord[],
  cajas: Box[],
  comprasChile: LocalPurchase[],
): BalanceSheet {
  const ingresosVentas = ventas.reduce((s, v) => s + v.total, 0);
  const egresosBoletas = boletas.filter((b) => b.estado === 'pagado').reduce((s, b) => s + b.totalCLP, 0);
  const egresosChile = comprasChile.filter((c) => c.estado === 'pagado').reduce((s, c) => s + c.monto, 0);
  const cajaEstimada = ingresosVentas - egresosBoletas - egresosChile;

  const invChile = stockChile.reduce((s, e) => s + e.cant * e.costoUnit, 0);

  const invJapon = compras
    .filter((c) => c.bodega === 'japon' && c.tc && c.tc > 0)
    .reduce((s, c) => s + (c.precioU * c.cant) / (c.tc as number), 0);

  const ivaInternaciones = cajas.filter((b) => b.internacion !== null).reduce((s, b) => s + (b.internacion?.iva ?? 0), 0);
  const ivaComprasChile = comprasChile.filter((c) => c.ivaCredito).reduce((s, c) => s + c.iva, 0);
  const ivaCreditoTotal = ivaInternaciones + ivaComprasChile;

  const activos = cajaEstimada + invChile + invJapon + ivaCreditoTotal;
  const pasivos = boletas.filter((b) => b.estado === 'sin_pagar').reduce((s, b) => s + b.totalCLP, 0);
  const patrimonio = activos - pasivos;

  return { cajaEstimada, invChile, invJapon, ivaCreditoTotal, activos, pasivos, patrimonio };
}

export interface CashFlow {
  ingresos: number;
  egresosJP: number;
  egresosCL: number;
  flujoNeto: number;
}

export function calcCashFlow(
  ventas: SaleRecord[],
  boletas: Invoice[],
  gavChile: GAVEntry[],
  comprasChile: LocalPurchase[],
): CashFlow {
  const ingresos = ventas.reduce((s, v) => s + v.total, 0);
  const egresosJP = boletas.filter((b) => b.estado === 'pagado').reduce((s, b) => s + b.totalCLP, 0);
  const gavChilePagado = gavChile.filter((g) => g.estado === 'pagado').reduce((s, g) => s + g.monto, 0);
  const comprasChilePagado = comprasChile.filter((c) => c.estado === 'pagado').reduce((s, c) => s + c.monto, 0);
  const egresosCL = gavChilePagado + comprasChilePagado;
  const flujoNeto = ingresos - egresosJP - egresosCL;
  return { ingresos, egresosJP, egresosCL, flujoNeto };
}

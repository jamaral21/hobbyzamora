import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {
  PurchaseRecord, Invoice, InvoiceItem, Box, ChileStockEntry,
  WebOrder, LocalPurchase, SaleRecord, GAVEntry, ERPConfig,
  InternacionData,
  CustomsDocument,
  calcDisponibleBySku as calcDisponibleBySkuHelper,
  nextSku, nextBoletaId,
} from '../data/shipmentsDomain';
import { getAdminToken, getCustomerToken } from '../lib/authStorage';

// Input types for mutations
interface NewBoletaInput {
  items: { compraId: number; precioU: number; cant: number; nombre: string; ean: string; tipo: string }[];
  comisionPct: number;
  tc: number;
}

interface CosteoEntry {
  _compraId: number;
  _sku: string;
  nombre: string;
  ean: string;
  cant: number;
  pct: number;
  costoUnit: number;
}

interface NewVentaInput {
  stockId: string;
  cant: number;
  precioVenta: number;
  canal: SaleRecord['canal'];
}

interface NewWebOrderInput {
  portal: string;
  orden: string;
  fecha: string;
  tc: number;
  costoEnvioIntern: number;
  productos: { nombre: string; ean: string; cant: number; precioUSD: number; precioCLP: number; pctCosteo: number; costoUnit: number }[];
}

interface NewLocalPurchaseInput {
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

interface PaymentAccountSplit {
  cuenta: string;
  montoCLP: number;
}

interface PaymentConfirmationPayload {
  cuenta?: string;
  fecha?: string;
  montoCLP?: number;
  cuentas?: PaymentAccountSplit[];
}

interface GavGenerationPeriod {
  year: number;
  month: number;
  tc: number;
}

interface NewCustomsDocumentInput {
  nombre: string;
  tipo: CustomsDocument['tipo'];
  fileName: string;
  file: File;
}

interface ShipmentsDataContextType {
  compras: PurchaseRecord[];
  boletas: Invoice[];
  boletaItems: Record<string, InvoiceItem[]>;
  cajas: Box[];
  stockChile: ChileStockEntry[];
  pedidosWeb: WebOrder[];
  comprasChile: LocalPurchase[];
  ventas: SaleRecord[];
  gavChile: GAVEntry[];
  config: ERPConfig;

  calcDisponibleBySku: (sku: string) => number;

  addCompra: (data: Omit<PurchaseRecord, 'id' | 'sku'>) => PurchaseRecord;
  updateCompra: (id: number, data: Partial<PurchaseRecord>) => void;
  addBoleta: (data: NewBoletaInput) => Invoice;
  updateBoleta: (boletaId: string, data: {
    comisionPct: number;
    tc: number;
    items: Array<{ nombre: string; ean?: string; tipo: string; precioU: number; cant: number }>;
  }) => Promise<void>;
  confirmPayment: (boletaId: string, payload?: PaymentConfirmationPayload) => void;
  deleteBoleta: (boletaId: string) => Promise<void>;
  addCaja: (data: Omit<Box, 'internacion'>) => Box;
  updateCaja: (id: string, data: Partial<Box>) => void;
  deleteCaja: (id: string) => void;
  saveInternacion: (cajaId: string, data: InternacionData) => void;
  confirmCosteo: (cajaId: string, costeoData: CosteoEntry[]) => void;
  updatePrecioVenta: (stockId: string, precio: number) => void;
  addVenta: (data: NewVentaInput) => SaleRecord;
  confirmGAV: (id: number) => void;
  updateConfig: (data: Partial<ERPConfig>) => Promise<{ ok: true } | { ok: false; error: string }>;
  createBackup: () => Promise<
    | { ok: true; data: { fileName: string; path: string; sizeBytes: number; createdAt: string } }
    | { ok: false; error: string }
  >;
  addPedidoWeb: (data: NewWebOrderInput) => WebOrder;
  updatePedidoWeb: (id: string, data: Partial<WebOrder>) => void;
  addDocumentoAduaneroCaja: (cajaId: string, data: NewCustomsDocumentInput) => Promise<void>;
  removeDocumentoAduaneroCaja: (cajaId: string, fileName: string) => Promise<void>;
  addDocumentoAduaneroWebOrder: (orderId: string, data: NewCustomsDocumentInput) => Promise<void>;
  removeDocumentoAduaneroWebOrder: (orderId: string, fileName: string) => Promise<void>;
  addCompraChile: (data: NewLocalPurchaseInput) => LocalPurchase;
  generateGAVBoleta: (period?: GavGenerationPeriod) => Promise<Invoice>;
}

const ShipmentsDataContext = createContext<ShipmentsDataContextType | null>(null);

type ShipmentsApiEnvelope<T> = {
  data: T;
  meta?: { total?: number };
};

type ApiCompra = {
  id: string;
  sku: string;
  fecha: string;
  tipo: string;
  nombre: string;
  ean: string | null;
  tarjeta: string;
  precioU: number;
  cant: number;
  total: number;
  estado: PurchaseRecord['estado'];
  bodega: PurchaseRecord['bodega'];
  tc: number | null;
};

type ApiBoleta = {
  id?: string;
  invoiceId?: string;
  fecha: string;
  subtotalJPY: number;
  comision: number;
  totalJPY: number;
  tc: number;
  totalCLP: number;
  estado: Invoice['estado'];
};

type ApiBoletaDetail = {
  data: {
    invoiceId?: string;
    id?: string;
    fecha: string;
    subtotalJPY: number;
    comision: number;
    totalJPY: number;
    tc: number;
    totalCLP: number;
    estado: Invoice['estado'];
    items: Array<{
      fecha: string;
      tipo: string;
      nombre: string;
      ean: string | null;
      precioU: number;
      cant: number;
      comPct: number;
      tc: number;
    }>;
  };
};

type ApiCaja = {
  boxId?: string;
  id?: string;
  fecha: string;
  estado: Box['estado'];
  fleJpy?: number | null;
  moHoras?: number | null;
  moTarifa?: number | null;
  matJpy?: number | null;
  tcEnvio?: number | null;
  internacionArancel?: number | null;
  internacionIva?: number | null;
  productos?: Array<{
    compraId: string;
    sku: string;
    nombre: string;
    ean: string | null;
    cant: number;
    precioU: number;
    tc: number | null;
  }>;
};

type ApiWebOrder = {
  orderId: string;
  fecha: string;
  portal: string;
  orden: string;
  estado: WebOrder['estado'];
  tc: number;
  costoEnvioIntern: number;
  productos: Array<{
    nombre: string;
    ean: string | null;
    cant: number;
    precioUSD: number;
    precioCLP: number;
    pctCosteo: number;
    costoUnit: number;
  }>;
};

type ApiStockChile = {
  id: string;
  sku: string;
  name: string;
  ean: string | null;
  stock: number;
  costUnit: number;
  salePrice: number;
};

type ApiVentas = {
  id: string;
  fecha: string;
  producto: string;
  ean: string | null;
  cant: number;
  precioVenta: number;
  costo: number;
  total: number;
  canal: SaleRecord['canal'];
};

type ApiComprasChile = LocalPurchase;
type ApiGavChile = GAVEntry;

type ApiConfig = {
  cuentas: ERPConfig['cuentas'];
  metodosPago: string[];
  arrBodegaJP: number;
  appBeyblade: number;
  comisionPct: number;
};

type ApiBackupResult = {
  fileName: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
};

const DEFAULT_METODOS_PAGO = ['Efectivo', 'JCB Bandai', 'Rakuten', 'PayPay', 'View Card', '', '', '', '', ''];

function normalizeMetodosPago(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_METODOS_PAGO];
  }

  const normalized = raw.map((value) => String(value ?? '').trim());
  const hasAny = normalized.some((value) => value.length > 0);

  if (!hasAny) {
    return [...DEFAULT_METODOS_PAGO];
  }

  if (!normalized[0]) {
    normalized[0] = DEFAULT_METODOS_PAGO[0];
  }

  return normalized;
}

const DEFAULT_ERP_CONFIG: ERPConfig = {
  cuentas: [],
  metodosPago: [...DEFAULT_METODOS_PAGO],
  arrBodegaJP: 0,
  appBeyblade: 0,
  comisionPct: 0,
};

async function shipmentsFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();
  const candidates = [adminToken, customerToken].filter((value, idx, arr): value is string => {
    return Boolean(value) && arr.indexOf(value) === idx;
  });

  const execute = async (token?: string) => {
    const response = await fetch(`/api/shipments${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }));
      const message =
        typeof data?.error === 'string'
          ? data.error
          : typeof data?.error?.message === 'string'
            ? data.error.message
            : response.statusText;
      throw new Error(`${response.status}: ${message}`);
    }

    return response.json() as Promise<T>;
  };

  if (candidates.length === 0) {
    return execute();
  }

  let lastError: unknown = null;
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      return await execute(candidates[i]);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : '';
      const shouldRetry = msg.startsWith('401:') || msg.startsWith('403:');
      if (!shouldRetry || i === candidates.length - 1) {
        throw error;
      }
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Request failed'));
}

function toDateOnly(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().split('T')[0];
  }

  const raw = String(value);
  const numeric = raw.match(/^\d+$/) ? Number(raw) : NaN;
  const parsedValue = Number.isFinite(numeric) ? numeric : raw;
  const d = new Date(parsedValue as string | number);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().split('T')[0];
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extractArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
    if (Array.isArray(record.data)) {
      return record.data as T[];
    }
  }

  return [];
}

async function uploadCustomsDocument(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();
  const token = adminToken || customerToken;

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'No se pudo subir el archivo' }));
    const message =
      typeof data?.error === 'string'
        ? data.error
        : typeof data?.error?.message === 'string'
          ? data.error.message
          : response.statusText;
    throw new Error(message);
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error('Respuesta inválida del servidor al subir documento');
  }

  return data.url;
}

export function ShipmentsDataProvider({ children }: { children: React.ReactNode }) {
  const [compras, setCompras] = useState<PurchaseRecord[]>([]);
  const [boletas, setBoletas] = useState<Invoice[]>([]);
  const [boletaItems, setBoletaItems] = useState<Record<string, InvoiceItem[]>>({});
  const [cajas, setCajas] = useState<Box[]>([]);
  const [stockChile, setStockChile] = useState<ChileStockEntry[]>([]);
  const [pedidosWeb, setPedidosWeb] = useState<WebOrder[]>([]);
  const [comprasChile, setComprasChile] = useState<LocalPurchase[]>([]);
  const [ventas, setVentas] = useState<SaleRecord[]>([]);
  const [gavChile, setGavChile] = useState<GAVEntry[]>([]);
  const [config, setConfig] = useState<ERPConfig>(DEFAULT_ERP_CONFIG);
  const [purchaseUiToApiId, setPurchaseUiToApiId] = useState<Record<number, string>>({});

  const applyConfigResponse = useCallback((apiConfig: ApiConfig) => {
    setConfig({
      cuentas: apiConfig?.cuentas || [],
      metodosPago: normalizeMetodosPago(apiConfig?.metodosPago),
      arrBodegaJP: toNumber(apiConfig?.arrBodegaJP),
      appBeyblade: toNumber(apiConfig?.appBeyblade),
      comisionPct: toNumber(apiConfig?.comisionPct),
    });
  }, []);

  const syncFromApi = useCallback(async () => {
    try {
      const configResp = await shipmentsFetch<{ data: ApiConfig }>('/config');
      applyConfigResponse(configResp.data);
    } catch (error) {
      console.warn('[shipments] No se pudo cargar configuracion', error);
      // Si config falla, no bloquea la carga del resto de módulos.
    }

    try {
      const [
        comprasResp,
        boletasResp,
        cajasResp,
        comprasWebResp,
        bodegaChileResp,
        ventasResp,
        comprasChileResp,
        gavChileResp,
      ] = await Promise.allSettled([
        shipmentsFetch<ShipmentsApiEnvelope<ApiCompra[]>>('/compras'),
        shipmentsFetch<ShipmentsApiEnvelope<ApiBoleta[]>>('/boletas'),
        shipmentsFetch<ShipmentsApiEnvelope<ApiCaja[]>>('/cajas'),
        shipmentsFetch<ShipmentsApiEnvelope<ApiWebOrder[]>>('/compras-web'),
        shipmentsFetch<{ data: { items: ApiStockChile[] } }>('/bodega-chile'),
        shipmentsFetch<{ data: ApiVentas[] }>('/ventas'),
        shipmentsFetch<{ data: ApiComprasChile[] }>('/compras-chile'),
        shipmentsFetch<{ data: ApiGavChile[] }>('/gav-chile'),
      ]);

      const failedModules: Array<{ module: string; error: unknown }> = [];
      if (comprasResp.status === 'rejected') failedModules.push({ module: 'compras', error: comprasResp.reason });
      if (boletasResp.status === 'rejected') failedModules.push({ module: 'boletas', error: boletasResp.reason });
      if (cajasResp.status === 'rejected') failedModules.push({ module: 'cajas', error: cajasResp.reason });
      if (comprasWebResp.status === 'rejected') failedModules.push({ module: 'compras-web', error: comprasWebResp.reason });
      if (bodegaChileResp.status === 'rejected') failedModules.push({ module: 'bodega-chile', error: bodegaChileResp.reason });
      if (ventasResp.status === 'rejected') failedModules.push({ module: 'ventas', error: ventasResp.reason });
      if (comprasChileResp.status === 'rejected') failedModules.push({ module: 'compras-chile', error: comprasChileResp.reason });
      if (gavChileResp.status === 'rejected') failedModules.push({ module: 'gav-chile', error: gavChileResp.reason });

      if (failedModules.length > 0) {
        console.warn('[shipments] Algunos módulos fallaron al sincronizar', failedModules);
      }

      const apiCompras = comprasResp.status === 'fulfilled' ? extractArray<ApiCompra>(comprasResp.value.data) : [];
      const uiToApi: Record<number, string> = {};
      const apiToUi: Record<string, number> = {};
      const nextCompras: PurchaseRecord[] = apiCompras.map((item, index) => {
        const uiId = index + 1;
        uiToApi[uiId] = item.id;
        apiToUi[item.id] = uiId;
        return {
          id: uiId,
          sku: item.sku,
          fecha: toDateOnly(item.fecha),
          tipo: item.tipo,
          nombre: item.nombre,
          ean: item.ean || '',
          tarjeta: item.tarjeta,
          precioU: toNumber(item.precioU),
          cant: toNumber(item.cant),
          total: toNumber(item.total),
          estado: item.estado,
          bodega: item.bodega,
          tc: item.tc === null ? null : toNumber(item.tc),
        };
      });

      setPurchaseUiToApiId(uiToApi);
      setCompras(nextCompras);

      const boletasList = boletasResp.status === 'fulfilled' ? extractArray<ApiBoleta>(boletasResp.value.data) : [];
      const boletaIds = boletasList
        .map((b) => b.invoiceId || b.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);
      const details = await Promise.all(
        boletaIds.map((id) =>
          shipmentsFetch<ApiBoletaDetail>(`/boletas/${encodeURIComponent(id)}`).catch(() => null)
        )
      );

      const itemsByInvoice: Record<string, InvoiceItem[]> = {};
      const productsCountByInvoice: Record<string, number> = {};
      for (const detail of details) {
        if (!detail?.data) continue;
        const invoiceId = detail.data.invoiceId || detail.data.id;
        if (!invoiceId) continue;
        const lines = detail.data.items || [];
        productsCountByInvoice[invoiceId] = lines.length;
        itemsByInvoice[invoiceId] = lines.map((line) => ({
          fecha: toDateOnly(line.fecha),
          tipo: line.tipo,
          nombre: line.nombre,
          ean: line.ean || '',
          precioU: toNumber(line.precioU),
          cant: toNumber(line.cant),
          comPct: toNumber(line.comPct),
          tc: toNumber(line.tc),
        }));
      }

      const nextBoletas: Invoice[] = boletasList.map((item) => {
        const id = item.invoiceId || item.id || `BOL-${Date.now()}`;
        return {
          id,
          fecha: toDateOnly(item.fecha),
          productos: productsCountByInvoice[id] ?? 0,
          subtotalJPY: toNumber(item.subtotalJPY),
          comision: toNumber(item.comision),
          totalJPY: toNumber(item.totalJPY),
          tc: toNumber(item.tc),
          totalCLP: toNumber(item.totalCLP),
          estado: item.estado,
        };
      });

      setBoletas(nextBoletas);
      setBoletaItems(itemsByInvoice);

      const apiCajas = cajasResp.status === 'fulfilled' ? extractArray<ApiCaja>(cajasResp.value.data) : [];
      const nextCajas: Box[] = apiCajas.map((item) => {
        const boxProducts = (item.productos || []).map((p) => ({
          _compraId: apiToUi[p.compraId] ?? 0,
          _sku: p.sku,
          nombre: p.nombre,
          ean: p.ean || '',
          cant: toNumber(p.cant),
          precioU: toNumber(p.precioU),
          tc: p.tc === null ? 0 : toNumber(p.tc),
        }));

        const hasInternacion = item.internacionArancel != null && item.internacionIva != null;
        const arancel = toNumber(item.internacionArancel);
        const iva = toNumber(item.internacionIva);

        return {
          id: item.boxId || item.id || `Caja-${Date.now()}`,
          fecha: toDateOnly(item.fecha),
          estado: item.estado,
          flete_jpy: toNumber(item.fleJpy),
          mo_horas: toNumber(item.moHoras),
          mo_tarifa: toNumber(item.moTarifa),
          mat_jpy: toNumber(item.matJpy),
          tc_envio: toNumber(item.tcEnvio),
          internacion: hasInternacion
            ? {
                arancel,
                iva,
                total: arancel + iva,
              }
            : null,
          productos: boxProducts,
        };
      });
      setCajas((prev) => {
        const docsByBoxId = new Map(prev.map((box) => [box.id, box.documentosAduaneros || []]));
        return nextCajas.map((box) => ({
          ...box,
          documentosAduaneros: docsByBoxId.get(box.id) || [],
        }));
      });

      const apiPedidosWeb = comprasWebResp.status === 'fulfilled' ? extractArray<ApiWebOrder>(comprasWebResp.value.data) : [];
      const nextPedidosWeb: WebOrder[] = apiPedidosWeb.map((order) => ({
        id: order.orderId,
        fecha: toDateOnly(order.fecha),
        portal: order.portal,
        orden: order.orden,
        estado: order.estado,
        costoEnvioIntern: toNumber(order.costoEnvioIntern),
        tc: toNumber(order.tc),
        productos: (order.productos || []).map((p) => ({
          nombre: p.nombre,
          ean: p.ean || '',
          cant: toNumber(p.cant),
          precioUSD: toNumber(p.precioUSD),
          precioCLP: toNumber(p.precioCLP),
          pctCosteo: toNumber(p.pctCosteo),
          costoUnit: toNumber(p.costoUnit),
        })),
      }));
      setPedidosWeb((prev) => {
        const docsByOrderId = new Map(prev.map((order) => [order.id, order.documentosAduaneros || []]));
        return nextPedidosWeb.map((order) => ({
          ...order,
          documentosAduaneros: docsByOrderId.get(order.id) || [],
        }));
      });

      const stockRows = bodegaChileResp.status === 'fulfilled'
        ? extractArray<ApiStockChile>(bodegaChileResp.value.data?.items)
        : [];
      const nextStockChile: ChileStockEntry[] = stockRows.map((row) => ({
        id: row.id,
        _sku: row.sku,
        nombre: row.name,
        ean: row.ean || '',
        caja: 'CHILE',
        cant: toNumber(row.stock),
        costoUnit: toNumber(row.costUnit),
        precioVenta: toNumber(row.salePrice) > 0 ? toNumber(row.salePrice) : null,
      }));
      setStockChile(nextStockChile);

      const apiVentas = ventasResp.status === 'fulfilled' ? extractArray<ApiVentas>(ventasResp.value.data) : [];
      const nextVentas: SaleRecord[] = apiVentas.map((sale) => ({
        id: sale.id,
        fecha: toDateOnly(sale.fecha),
        producto: sale.producto,
        ean: sale.ean || '',
        cant: toNumber(sale.cant),
        precioVenta: toNumber(sale.precioVenta),
        costo: toNumber(sale.costo),
        total: toNumber(sale.total),
        canal: sale.canal,
      }));
      setVentas(nextVentas);

      const apiComprasChile = comprasChileResp.status === 'fulfilled'
        ? extractArray<ApiComprasChile>(comprasChileResp.value.data)
        : [];
      setComprasChile(apiComprasChile.map((item) => ({
        ...item,
        fecha: toDateOnly(item.fecha),
      })));

      const apiGavChile = gavChileResp.status === 'fulfilled' ? extractArray<ApiGavChile>(gavChileResp.value.data) : [];
      setGavChile(apiGavChile.map((item) => ({
        ...item,
      })));
    } catch (error) {
      console.warn('[shipments] Error inesperado al sincronizar datos', error);
      // Si ocurre un error inesperado de parseo, mantenemos el estado actual.
    }
  }, [applyConfigResponse]);

  useEffect(() => {
    void syncFromApi();
  }, [syncFromApi]);

  const calcDisponible = useCallback(
    (sku: string) => calcDisponibleBySkuHelper(sku, compras, cajas, stockChile),
    [compras, cajas, stockChile],
  );

  const addCompra = useCallback((data: Omit<PurchaseRecord, 'id' | 'sku'>): PurchaseRecord => {
    const sku = nextSku(compras);
    const id = compras.length > 0 ? Math.max(...compras.map(c => c.id)) + 1 : 1;
    const record: PurchaseRecord = { ...data, id, sku };
    setCompras(prev => [...prev, record]);
    void shipmentsFetch<ShipmentsApiEnvelope<ApiCompra>>('/compras', {
      method: 'POST',
      body: JSON.stringify({
        fecha: data.fecha,
        tipo: data.tipo,
        nombre: data.nombre,
        ean: data.ean,
        tarjeta: data.tarjeta,
        precioU: data.precioU,
        cant: data.cant,
        tc: data.tc,
      }),
    }).then(() => syncFromApi()).catch(() => undefined);
    return record;
  }, [compras, syncFromApi]);

  const updateCompra = useCallback((id: number, data: Partial<PurchaseRecord>) => {
    setCompras(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const addBoleta = useCallback((data: NewBoletaInput): Invoice => {
    const id = nextBoletaId(boletas);
    const subtotalJPY = data.items.reduce((s, i) => s + i.precioU * i.cant, 0);
    const totalJPY = subtotalJPY * (1 + data.comisionPct / 100);
    const totalCLP = data.tc > 0 ? Math.round(totalJPY * data.tc) : 0;
    const invoice: Invoice = {
      id,
      fecha: new Date().toISOString().split('T')[0],
      productos: data.items.length,
      subtotalJPY,
      comision: data.comisionPct,
      totalJPY: Math.round(totalJPY),
      tc: data.tc,
      totalCLP,
      estado: 'sin_pagar',
    };
    setBoletas(prev => [...prev, invoice]);
    setBoletaItems(prev => ({
      ...prev,
      [id]: data.items.map(i => ({
        compraId: i.compraId,
        fecha: new Date().toISOString().split('T')[0],
        tipo: i.tipo,
        nombre: i.nombre,
        ean: i.ean,
        precioU: i.precioU,
        cant: i.cant,
        comPct: data.comisionPct,
        tc: data.tc,
      })),
    }));

    const itemsPayload = data.items.map((item) => ({
      compraId: purchaseUiToApiId[item.compraId] || String(item.compraId),
      precioU: item.precioU,
      cant: item.cant,
      nombre: item.nombre,
      ean: item.ean,
      tipo: item.tipo,
    }));

    void shipmentsFetch('/boletas', {
      method: 'POST',
      body: JSON.stringify({
        items: itemsPayload,
        comisionPct: data.comisionPct,
        tc: data.tc,
      }),
    }).then(() => syncFromApi()).catch(() => undefined);

    return invoice;
  }, [boletas, purchaseUiToApiId, syncFromApi]);

  const updateBoleta = useCallback(async (
    boletaId: string,
    data: {
      comisionPct: number;
      tc: number;
      items: Array<{ nombre: string; ean?: string; tipo: string; precioU: number; cant: number }>;
    }
  ): Promise<void> => {
    const previousBoletas = boletas;
    const previousItems = boletaItems;

    const subtotalJPY = data.items.reduce((s, i) => s + i.precioU * i.cant, 0);
    const totalJPY = subtotalJPY * (1 + data.comisionPct / 100);
    const totalCLP = data.tc > 0 ? Math.round(totalJPY * data.tc) : 0;

    setBoletas((prev) => prev.map((b) => b.id === boletaId ? {
      ...b,
      productos: data.items.length,
      subtotalJPY,
      comision: data.comisionPct,
      totalJPY: Math.round(totalJPY),
      tc: data.tc,
      totalCLP,
    } : b));
    setBoletaItems((prev) => ({
      ...prev,
      [boletaId]: data.items.map((i) => ({
        fecha: new Date().toISOString().split('T')[0],
        tipo: i.tipo,
        nombre: i.nombre,
        ean: i.ean ?? '',
        precioU: i.precioU,
        cant: i.cant,
        comPct: data.comisionPct,
        tc: data.tc,
      })),
    }));

    try {
      await shipmentsFetch(`/boletas/${encodeURIComponent(boletaId)}`, {
        method: 'PUT',
        body: JSON.stringify({
          comisionPct: data.comisionPct,
          tc: data.tc,
          items: data.items,
        }),
      });
      await syncFromApi();
    } catch (error) {
      setBoletas(previousBoletas);
      setBoletaItems(previousItems);
      throw error;
    }
  }, [boletas, boletaItems, syncFromApi]);

  const confirmPayment = useCallback((boletaId: string, payload?: PaymentConfirmationPayload) => {
    setBoletas(prev => prev.map(b => b.id === boletaId ? { ...b, estado: 'pagado' as const } : b));
    // Also update related purchases, attempting to honor partial quantities
    const items = boletaItems[boletaId] as (InvoiceItem & { compraId?: number })[] | undefined;
    if (items) {
      setCompras(prev => {
        const byId = new Map(prev.map(c => [c.id, c] as const));
        const updated = prev.map((c) => ({ ...c }));

        items.forEach((it) => {
          if (it.compraId != null) {
            const compra = byId.get(it.compraId);
            if (compra) {
              const targetIndex = updated.findIndex(u => u.id === compra.id);
              if (targetIndex >= 0) {
                if (it.cant >= compra.cant) {
                  updated[targetIndex].estado = 'pagado';
                } else if (it.cant > 0) {
                  updated[targetIndex].estado = 'esp_pago';
                }
              }
            }
            return;
          }

          // Fallback: match by nombre+ean as before (assume full)
          for (let i = 0; i < updated.length; i++) {
            const c = updated[i];
            if (c.nombre === it.nombre && c.ean === it.ean) {
              updated[i] = { ...c, estado: 'pagado' };
              break;
            }
          }
        });

        return updated;
      });
    }
    void shipmentsFetch(`/pagos/${encodeURIComponent(boletaId)}/confirmar`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }).then(() => syncFromApi()).catch(() => undefined);
  }, [boletaItems, syncFromApi]);

  const deleteBoleta = useCallback(async (boletaId: string): Promise<void> => {
    const previousBoletas = boletas;
    const previousItems = boletaItems;

    setBoletas((prev) => prev.filter((b) => b.id !== boletaId));
    setBoletaItems((prev) => {
      const next = { ...prev };
      delete next[boletaId];
      return next;
    });

    try {
      await shipmentsFetch(`/boletas/${encodeURIComponent(boletaId)}`, {
        method: 'DELETE',
      });
      await syncFromApi();
    } catch (error) {
      setBoletas(previousBoletas);
      setBoletaItems(previousItems);
      throw error;
    }
  }, [boletas, boletaItems, syncFromApi]);

  const addCaja = useCallback((data: Omit<Box, 'internacion'>): Box => {
    const box: Box = { ...data, internacion: null };
    setCajas(prev => [...prev, box]);
    // Update compra bodega for fully-shipped products
    data.productos.forEach(p => {
      const disponible = calcDisponibleBySkuHelper(p._sku, compras, [...cajas, box], stockChile);
      if (disponible <= 0) {
        setCompras(prev => prev.map(c => c.sku === p._sku ? { ...c, bodega: 'transito' as const } : c));
      }
    });

    const productosPayload = data.productos.map((p) => ({
      compraId: purchaseUiToApiId[p._compraId] || String(p._compraId),
      cant: p.cant,
    }));

    void shipmentsFetch('/cajas', {
      method: 'POST',
      body: JSON.stringify({
        boxId: data.id,
        fecha: data.fecha,
        fleJpy: data.flete_jpy,
        moHoras: data.mo_horas,
        moTarifa: data.mo_tarifa,
        matJpy: data.mat_jpy,
        tcEnvio: data.tc_envio,
        productos: productosPayload,
      }),
    }).then(() => syncFromApi()).catch(() => undefined);

    return box;
  }, [compras, cajas, stockChile, purchaseUiToApiId, syncFromApi]);

  const updateCaja = useCallback((id: string, data: Partial<Box>) => {
    setCajas(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    void shipmentsFetch(`/cajas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        estado: data.estado,
        fecha: data.fecha,
        fleJpy: data.flete_jpy,
        moHoras: data.mo_horas,
        moTarifa: data.mo_tarifa,
        matJpy: data.mat_jpy,
        tcEnvio: data.tc_envio,
      }),
    }).then(() => syncFromApi()).catch(() => syncFromApi());
  }, [syncFromApi]);

  const deleteCaja = useCallback((id: string) => {
    setCajas(prev => prev.filter(b => b.id !== id));
    void shipmentsFetch(`/cajas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).then(() => syncFromApi()).catch(() => undefined);
  }, [syncFromApi]);

  const saveInternacion = useCallback((cajaId: string, data: InternacionData) => {
    setCajas(prev => prev.map(b => b.id === cajaId ? { ...b, internacion: data } : b));
    void shipmentsFetch(`/internacion/${encodeURIComponent(cajaId)}`, {
      method: 'PUT',
      body: JSON.stringify({ arancel: data.arancel, iva: data.iva }),
    }).then(() => syncFromApi()).catch(() => undefined);
  }, [syncFromApi]);

  const confirmCosteo = useCallback((cajaId: string, costeoData: CosteoEntry[]) => {
    const box = cajas.find(b => b.id === cajaId);
    if (!box) return;

    // Create Chile stock entries
    const newEntries: ChileStockEntry[] = costeoData.map((entry, idx) => ({
      id: `SC-${Date.now()}-${idx}`,
      _sku: entry._sku,
      nombre: entry.nombre,
      ean: entry.ean,
      caja: cajaId,
      cant: entry.cant,
      costoUnit: entry.costoUnit,
      precioVenta: null,
    }));

    setStockChile(prev => [...prev, ...newEntries]);
    setCajas(prev => prev.map(b => b.id === cajaId ? { ...b, estado: 'costeada' as const } : b));

    // Update compra.bodega to 'chile' when disponible becomes 0
    costeoData.forEach(entry => {
      const updatedCajas = cajas.map(b => b.id === cajaId ? { ...b, estado: 'costeada' as const } : b);
      const updatedStock = [...stockChile, ...newEntries];
      const disponible = calcDisponibleBySkuHelper(entry._sku, compras, updatedCajas, updatedStock);
      if (disponible <= 0) {
        setCompras(prev => prev.map(c => c.sku === entry._sku ? { ...c, bodega: 'chile' as const } : c));
      }
    });

    void shipmentsFetch(`/costeo/${encodeURIComponent(cajaId)}/confirmar`, {
      method: 'POST',
      body: JSON.stringify({
        productos: costeoData.map((entry) => ({
          compraId: purchaseUiToApiId[entry._compraId] || String(entry._compraId),
          sku: entry._sku,
          nombre: entry.nombre,
          ean: entry.ean,
          cant: entry.cant,
          pct: entry.pct,
        })),
      }),
    }).then(() => syncFromApi()).catch(() => undefined);
  }, [cajas, stockChile, compras, purchaseUiToApiId, syncFromApi]);

  const updatePrecioVenta = useCallback((stockId: string, precio: number) => {
    setStockChile(prev => prev.map(s => s.id === stockId ? { ...s, precioVenta: precio } : s));
    void shipmentsFetch(`/bodega-chile/${encodeURIComponent(stockId)}/precio`, {
      method: 'PUT',
      body: JSON.stringify({ precioVenta: precio }),
    }).then(() => syncFromApi()).catch(() => undefined);
  }, [syncFromApi]);

  const addVenta = useCallback((data: NewVentaInput): SaleRecord => {
    const stockEntry = stockChile.find(s => s.id === data.stockId);
    if (!stockEntry) throw new Error('Stock entry not found');
    const id = `V-${String(ventas.length + 1).padStart(3, '0')}`;
    const record: SaleRecord = {
      id,
      fecha: new Date().toISOString().split('T')[0],
      producto: stockEntry.nombre,
      ean: stockEntry.ean,
      cant: data.cant,
      precioVenta: data.precioVenta,
      costo: stockEntry.costoUnit,
      total: data.precioVenta * data.cant,
      canal: data.canal,
    };
    setVentas(prev => [...prev, record]);
    setStockChile(prev => prev.map(s => s.id === data.stockId ? { ...s, cant: s.cant - data.cant } : s));

    void shipmentsFetch('/ventas', {
      method: 'POST',
      body: JSON.stringify({
        productId: data.stockId,
        cant: data.cant,
        precioVenta: data.precioVenta,
        canal: data.canal,
      }),
    }).then(() => syncFromApi()).catch(() => undefined);

    return record;
  }, [stockChile, ventas, syncFromApi]);

  const confirmGAV = useCallback((id: number) => {
    setGavChile(prev => prev.map(g =>
      g.id === id ? { ...g, estado: 'pagado' as const, fechaPago: new Date().toISOString().split('T')[0] } : g
    ));
    void shipmentsFetch(`/gav-chile/${id}/confirmar`, {
      method: 'PUT',
      body: JSON.stringify({ adjunto: true }),
    }).then(() => syncFromApi()).catch(() => undefined);
  }, [syncFromApi]);

  const updateConfig = useCallback(async (data: Partial<ERPConfig>): Promise<{ ok: true } | { ok: false; error: string }> => {
    const previous = config;
    setConfig(prev => ({ ...prev, ...data }));

    try {
      const response = await shipmentsFetch<{ data: ApiConfig }>('/config', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response?.data) {
        applyConfigResponse(response.data);
      }

      await syncFromApi();
      return { ok: true };
    } catch (error) {
      setConfig(previous);
      const message = error instanceof Error ? error.message : 'No se pudo guardar la configuración';
      return { ok: false, error: message };
    }
  }, [config, applyConfigResponse, syncFromApi]);

  const createBackup = useCallback(async (): Promise<
    | { ok: true; data: ApiBackupResult }
    | { ok: false; error: string }
  > => {
    try {
      const response = await shipmentsFetch<{ data: ApiBackupResult }>('/config/backup', {
        method: 'POST',
      });

      if (!response?.data) {
        return { ok: false, error: 'Respuesta inválida al crear backup' };
      }

      return { ok: true, data: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el backup';
      return { ok: false, error: message };
    }
  }, []);

  const addPedidoWeb = useCallback((data: NewWebOrderInput): WebOrder => {
    const id = `WEB-${String(pedidosWeb.length + 1).padStart(3, '0')}`;
    const order: WebOrder = { ...data, id, estado: 'pendiente' };
    setPedidosWeb(prev => [...prev, order]);

    void shipmentsFetch('/compras-web', {
      method: 'POST',
      body: JSON.stringify({
        portal: data.portal,
        orden: data.orden,
        fecha: data.fecha,
        tc: data.tc,
        costoEnvioIntern: data.costoEnvioIntern,
        productos: data.productos,
      }),
    }).then(() => syncFromApi()).catch(() => undefined);

    return order;
  }, [pedidosWeb, syncFromApi]);

  const updatePedidoWeb = useCallback((id: string, data: Partial<WebOrder>) => {
    setPedidosWeb((prev) => prev.map((order) => (order.id === id ? { ...order, ...data } : order)));
  }, []);

  const addDocumentoAduaneroCaja = useCallback(async (cajaId: string, data: NewCustomsDocumentInput) => {
    const fileUrl = await uploadCustomsDocument(data.file);
    const doc: CustomsDocument = {
      nombre: data.nombre,
      tipo: data.tipo,
      fileName: data.fileName,
      fileUrl,
    };

    setCajas((prev) => prev.map((box) => {
      if (box.id !== cajaId) return box;
      return {
        ...box,
        documentosAduaneros: [...(box.documentosAduaneros || []), doc],
      };
    }));
  }, []);

  const removeDocumentoAduaneroCaja = useCallback(async (cajaId: string, fileName: string) => {
    setCajas((prev) => prev.map((box) => {
      if (box.id !== cajaId) return box;
      return {
        ...box,
        documentosAduaneros: (box.documentosAduaneros || []).filter((doc) => doc.fileName !== fileName),
      };
    }));
  }, []);

  const addDocumentoAduaneroWebOrder = useCallback(async (orderId: string, data: NewCustomsDocumentInput) => {
    const fileUrl = await uploadCustomsDocument(data.file);
    const doc: CustomsDocument = {
      nombre: data.nombre,
      tipo: data.tipo,
      fileName: data.fileName,
      fileUrl,
    };

    setPedidosWeb((prev) => prev.map((order) => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        documentosAduaneros: [...(order.documentosAduaneros || []), doc],
      };
    }));
  }, []);

  const removeDocumentoAduaneroWebOrder = useCallback(async (orderId: string, fileName: string) => {
    setPedidosWeb((prev) => prev.map((order) => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        documentosAduaneros: (order.documentosAduaneros || []).filter((doc) => doc.fileName !== fileName),
      };
    }));
  }, []);

  const addCompraChile = useCallback((data: NewLocalPurchaseInput): LocalPurchase => {
    const id = `CC-${String(comprasChile.length + 1).padStart(3, '0')}`;
    const purchase: LocalPurchase = { ...data, id };
    setComprasChile(prev => [...prev, purchase]);

    void shipmentsFetch('/compras-chile', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(() => syncFromApi()).catch(() => undefined);

    return purchase;
  }, [comprasChile, syncFromApi]);

  const generateGAVBoleta = useCallback(async (period?: GavGenerationPeriod): Promise<Invoice> => {
    const targetDate = period
      ? new Date(period.year, period.month - 1, 1)
      : new Date();
    const invoiceYear = targetDate.getFullYear();
    const idPrefix = `BOL-${invoiceYear}-GAV-`;
    const sameYearIds = boletas
      .filter((b) => b.id.startsWith(idPrefix))
      .map((b) => {
        const suffix = b.id.slice(idPrefix.length);
        return parseInt(suffix, 10) || 0;
      });
    const id = `${idPrefix}${String((sameYearIds.length > 0 ? Math.max(...sameYearIds) : 0) + 1).padStart(3, '0')}`;
    const subtotalJPY = config.arrBodegaJP + config.appBeyblade;
    const totalJPY = Math.round(subtotalJPY * (1 + config.comisionPct / 100));
    const tc = period?.tc ?? (compras.length > 0 ? compras[compras.length - 1].tc || 6.0 : 6.0);
    const totalCLP = Math.round(totalJPY * tc);
    const monthLabel = targetDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' });
    const targetDateOnly = targetDate.toISOString().split('T')[0];
    const invoice: Invoice = {
      id,
      fecha: targetDateOnly,
      productos: `GAV ${monthLabel}`,
      subtotalJPY,
      comision: config.comisionPct,
      totalJPY,
      tc,
      totalCLP,
      estado: 'sin_pagar',
    };
    await shipmentsFetch('/gav-japon/generar', {
      method: 'POST',
      body: JSON.stringify({
        tc,
        ...(period ? { year: period.year, month: period.month } : {}),
      }),
    });

    await syncFromApi();

    return invoice;
  }, [boletas, config, compras, syncFromApi]);

  return (
    <ShipmentsDataContext.Provider
      value={{
        compras, boletas, boletaItems, cajas, stockChile,
        pedidosWeb, comprasChile, ventas, gavChile, config,
        calcDisponibleBySku: calcDisponible,
        addCompra, updateCompra, addBoleta, updateBoleta, confirmPayment, deleteBoleta,
        addCaja, updateCaja, deleteCaja, saveInternacion,
        confirmCosteo, updatePrecioVenta, addVenta, confirmGAV,
        updateConfig, createBackup, addPedidoWeb, updatePedidoWeb,
        addDocumentoAduaneroCaja, removeDocumentoAduaneroCaja,
        addDocumentoAduaneroWebOrder, removeDocumentoAduaneroWebOrder,
        addCompraChile, generateGAVBoleta,
      }}
    >
      {children}
    </ShipmentsDataContext.Provider>
  );
}

export function useShipmentsData() {
  const context = useContext(ShipmentsDataContext);
  if (!context) {
    throw new Error('useShipmentsData must be used within a ShipmentsDataProvider');
  }
  return context;
}

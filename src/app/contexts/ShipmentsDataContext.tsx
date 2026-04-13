import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  PurchaseRecord, Invoice, InvoiceItem, Box, ChileStockEntry,
  WebOrder, LocalPurchase, SaleRecord, GAVEntry, ERPConfig,
  InternacionData,
  mockCompras, mockBoletas, mockBoletaItems, mockCajas,
  mockStockChile, mockPedidosWeb, mockComprasChile, mockVentas,
  mockGAVChile, mockConfig,
  calcDisponibleBySku as calcDisponibleBySkuHelper,
  nextSku, nextBoletaId, calcCostoUnitario,
} from '../data/shipmentsMockData';

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
  confirmPayment: (boletaId: string) => void;
  addCaja: (data: Omit<Box, 'internacion'>) => Box;
  updateCaja: (id: string, data: Partial<Box>) => void;
  deleteCaja: (id: string) => void;
  saveInternacion: (cajaId: string, data: InternacionData) => void;
  confirmCosteo: (cajaId: string, costeoData: CosteoEntry[]) => void;
  updatePrecioVenta: (stockId: string, precio: number) => void;
  addVenta: (data: NewVentaInput) => SaleRecord;
  confirmGAV: (id: number) => void;
  updateConfig: (data: Partial<ERPConfig>) => void;
  addPedidoWeb: (data: NewWebOrderInput) => WebOrder;
  addCompraChile: (data: NewLocalPurchaseInput) => LocalPurchase;
  generateGAVBoleta: () => Invoice;
}

const ShipmentsDataContext = createContext<ShipmentsDataContextType | null>(null);

export function ShipmentsDataProvider({ children }: { children: React.ReactNode }) {
  const [compras, setCompras] = useState<PurchaseRecord[]>([...mockCompras]);
  const [boletas, setBoletas] = useState<Invoice[]>([...mockBoletas]);
  const [boletaItems, setBoletaItems] = useState<Record<string, InvoiceItem[]>>({ ...mockBoletaItems });
  const [cajas, setCajas] = useState<Box[]>([...mockCajas]);
  const [stockChile, setStockChile] = useState<ChileStockEntry[]>([...mockStockChile]);
  const [pedidosWeb, setPedidosWeb] = useState<WebOrder[]>([...mockPedidosWeb]);
  const [comprasChile, setComprasChile] = useState<LocalPurchase[]>([...mockComprasChile]);
  const [ventas, setVentas] = useState<SaleRecord[]>([...mockVentas]);
  const [gavChile, setGavChile] = useState<GAVEntry[]>([...mockGAVChile]);
  const [config, setConfig] = useState<ERPConfig>({ ...mockConfig });

  const calcDisponible = useCallback(
    (sku: string) => calcDisponibleBySkuHelper(sku, compras, cajas, stockChile),
    [compras, cajas, stockChile],
  );

  const addCompra = useCallback((data: Omit<PurchaseRecord, 'id' | 'sku'>): PurchaseRecord => {
    const sku = nextSku(compras);
    const id = compras.length > 0 ? Math.max(...compras.map(c => c.id)) + 1 : 1;
    const record: PurchaseRecord = { ...data, id, sku };
    setCompras(prev => [...prev, record]);
    return record;
  }, [compras]);

  const updateCompra = useCallback((id: number, data: Partial<PurchaseRecord>) => {
    setCompras(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const addBoleta = useCallback((data: NewBoletaInput): Invoice => {
    const id = nextBoletaId(boletas);
    const subtotalJPY = data.items.reduce((s, i) => s + i.precioU * i.cant, 0);
    const totalJPY = subtotalJPY * (1 + data.comisionPct / 100);
    const totalCLP = data.tc > 0 ? Math.round(totalJPY / data.tc) : 0;
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
    return invoice;
  }, [boletas]);

  const confirmPayment = useCallback((boletaId: string) => {
    setBoletas(prev => prev.map(b => b.id === boletaId ? { ...b, estado: 'pagado' as const } : b));
    // Also update related purchases
    const items = boletaItems[boletaId];
    if (items) {
      setCompras(prev => prev.map(c => {
        const matched = items.some(i => i.nombre === c.nombre && i.ean === c.ean);
        return matched ? { ...c, estado: 'pagado' as const } : c;
      }));
    }
  }, [boletaItems]);

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
    return box;
  }, [compras, cajas, stockChile]);

  const updateCaja = useCallback((id: string, data: Partial<Box>) => {
    setCajas(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  }, []);

  const deleteCaja = useCallback((id: string) => {
    setCajas(prev => prev.filter(b => b.id !== id));
  }, []);

  const saveInternacion = useCallback((cajaId: string, data: InternacionData) => {
    setCajas(prev => prev.map(b => b.id === cajaId ? { ...b, internacion: data } : b));
  }, []);

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
  }, [cajas, stockChile, compras]);

  const updatePrecioVenta = useCallback((stockId: string, precio: number) => {
    setStockChile(prev => prev.map(s => s.id === stockId ? { ...s, precioVenta: precio } : s));
  }, []);

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
    return record;
  }, [stockChile, ventas]);

  const confirmGAV = useCallback((id: number) => {
    setGavChile(prev => prev.map(g =>
      g.id === id ? { ...g, estado: 'pagado' as const, fechaPago: new Date().toISOString().split('T')[0] } : g
    ));
  }, []);

  const updateConfig = useCallback((data: Partial<ERPConfig>) => {
    setConfig(prev => ({ ...prev, ...data }));
  }, []);

  const addPedidoWeb = useCallback((data: NewWebOrderInput): WebOrder => {
    const id = `WEB-${String(pedidosWeb.length + 1).padStart(3, '0')}`;
    const order: WebOrder = { ...data, id, estado: 'pendiente' };
    setPedidosWeb(prev => [...prev, order]);
    return order;
  }, [pedidosWeb]);

  const addCompraChile = useCallback((data: NewLocalPurchaseInput): LocalPurchase => {
    const id = `CC-${String(comprasChile.length + 1).padStart(3, '0')}`;
    const purchase: LocalPurchase = { ...data, id };
    setComprasChile(prev => [...prev, purchase]);
    return purchase;
  }, [comprasChile]);

  const generateGAVBoleta = useCallback((): Invoice => {
    const id = nextBoletaId(boletas, true);
    const subtotalJPY = config.arrBodegaJP + config.appBeyblade;
    const totalJPY = Math.round(subtotalJPY * (1 + config.comisionPct / 100));
    const tc = compras.length > 0 ? compras[compras.length - 1].tc || 6.0 : 6.0;
    const totalCLP = Math.round(totalJPY / tc);
    const invoice: Invoice = {
      id,
      fecha: new Date().toISOString().split('T')[0],
      productos: `GAV ${new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })}`,
      subtotalJPY,
      comision: config.comisionPct,
      totalJPY,
      tc,
      totalCLP,
      estado: 'sin_pagar',
    };
    setBoletas(prev => [...prev, invoice]);
    setBoletaItems(prev => ({
      ...prev,
      [id]: [
        { fecha: invoice.fecha, tipo: 'Arriendo/App', nombre: 'Arriendo Bodega Japón', ean: '', precioU: config.arrBodegaJP, cant: 1, comPct: config.comisionPct, tc },
        { fecha: invoice.fecha, tipo: 'Arriendo/App', nombre: 'App Beyblade', ean: '', precioU: config.appBeyblade, cant: 1, comPct: config.comisionPct, tc },
      ],
    }));
    return invoice;
  }, [boletas, config, compras]);

  return (
    <ShipmentsDataContext.Provider
      value={{
        compras, boletas, boletaItems, cajas, stockChile,
        pedidosWeb, comprasChile, ventas, gavChile, config,
        calcDisponibleBySku: calcDisponible,
        addCompra, updateCompra, addBoleta, confirmPayment,
        addCaja, updateCaja, deleteCaja, saveInternacion,
        confirmCosteo, updatePrecioVenta, addVenta, confirmGAV,
        updateConfig, addPedidoWeb, addCompraChile, generateGAVBoleta,
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

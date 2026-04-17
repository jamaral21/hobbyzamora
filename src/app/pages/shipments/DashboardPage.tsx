import { useMemo } from 'react';
import {
  Package, Plane, PackageCheck, Warehouse, Receipt,
  ShoppingCart, TrendingUp, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { KPICard } from '../../components/shipments/KPICard';
import { formatCLP } from '../../data/shipmentsMockData';

export default function DashboardPage() {
  const { compras, cajas, stockChile, boletas, ventas, calcDisponibleBySku } = useShipmentsData();

  // KPI: Productos en Japón (SKUs with disponible > 0)
  const productosJapon = useMemo(() => {
    const skus = new Set(compras.map((c) => c.sku));
    let count = 0;
    skus.forEach((sku) => {
      if (calcDisponibleBySku(sku) > 0) count++;
    });
    return count;
  }, [compras, calcDisponibleBySku]);

  // KPI: Cajas en Tránsito
  const cajasTransito = useMemo(
    () => cajas.filter((c) => c.estado === 'transito').length,
    [cajas],
  );

  // KPI: Cajas Llegadas
  const cajasLlegadas = useMemo(
    () => cajas.filter((c) => c.estado === 'llegada').length,
    [cajas],
  );

  // KPI: Unidades en Chile
  const unidadesChile = useMemo(
    () => stockChile.reduce((s, e) => s + e.cant, 0),
    [stockChile],
  );

  // KPI: Boletas Pendientes
  const boletasPendientes = useMemo(
    () => boletas.filter((b) => b.estado === 'sin_pagar').length,
    [boletas],
  );

  // KPI: Ventas del Mes
  const ventasDelMes = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return ventas
      .filter((v) => {
        const d = new Date(v.fecha);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((s, v) => s + v.total, 0);
  }, [ventas]);

  // KPI: Margen Promedio
  const margenPromedio = useMemo(() => {
    const ventasConMargen = ventas.filter((v) => v.precioVenta > 0);
    if (ventasConMargen.length === 0) return 0;
    const totalMargen = ventasConMargen.reduce((s, v) => {
      return s + ((v.precioVenta - v.costo) / v.precioVenta) * 100;
    }, 0);
    return Math.round(totalMargen / ventasConMargen.length);
  }, [ventas]);

  // GAV Warning
  const showGAVWarning = useMemo(() => {
    const now = new Date();
    if (now.getDate() < 3) return false;
    const year = now.getFullYear();
    const month = now.getMonth();
    return !boletas.some((b) => {
      if (!b.id.includes('GAV')) return false;
      const d = new Date(b.fecha);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [boletas]);

  // Timeline counts
  const unidadesJapon = useMemo(() => {
    const skus = new Set(compras.map((c) => c.sku));
    let total = 0;
    skus.forEach((sku) => {
      total += calcDisponibleBySku(sku);
    });
    return total;
  }, [compras, calcDisponibleBySku]);

  const unidadesTransito = useMemo(
    () =>
      cajas
        .filter((c) => c.estado === 'transito')
        .reduce((s, c) => s + c.productos.reduce((ps, p) => ps + p.cant, 0), 0),
    [cajas],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>

      {/* GAV Warning */}
      {showGAVWarning && (
        <Card padding="sm" className="border-[#d97706]/40 bg-[#fef3c7]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#d97706] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#92400e]">Boleta GAV pendiente</p>
              <p className="text-xs text-[#a16207]">
                No se ha generado la boleta de gastos fijos Japón para este mes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Productos en Japón" value={productosJapon} icon={Package} />
        <KPICard title="Cajas en Tránsito" value={cajasTransito} icon={Plane} variant="warning" />
        <KPICard title="Cajas Llegadas" value={cajasLlegadas} icon={PackageCheck} variant="success" />
        <KPICard title="Unidades en Chile" value={unidadesChile} icon={Warehouse} />
        <KPICard
          title="Boletas Pendientes"
          value={boletasPendientes}
          icon={Receipt}
          variant={boletasPendientes > 0 ? 'danger' : 'default'}
        />
        <KPICard title="Ventas del Mes" value={formatCLP(ventasDelMes)} icon={ShoppingCart} variant="success" />
        <KPICard title="Margen Promedio" value={`${margenPromedio}%`} icon={TrendingUp} />
      </div>

      {/* Visual Timeline */}
      <Card>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Pipeline de Inventario
        </h3>
        <div className="flex items-center justify-center gap-3">
          <TimelineStage
            label="Japón"
            count={unidadesJapon}
            sublabel="unidades"
            icon={Package}
            color="text-blue-700"
            bgColor="bg-blue-50"
          />
          <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
          <TimelineStage
            label="Tránsito"
            count={unidadesTransito}
            sublabel="unidades"
            icon={Plane}
            color="text-amber-700"
            bgColor="bg-amber-50"
          />
          <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
          <TimelineStage
            label="Chile"
            count={unidadesChile}
            sublabel="unidades"
            icon={Warehouse}
            color="text-emerald-700"
            bgColor="bg-emerald-50"
          />
        </div>
      </Card>
    </div>
  );
}

function TimelineStage({
  label, count, sublabel, icon: Icon, color, bgColor,
}: {
  label: string;
  count: number;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`flex flex-col items-center px-8 py-4 rounded-xl ${bgColor} flex-1`}>
      <Icon className={`w-5 h-5 ${color} mb-1`} />
      <span className={`text-xl font-bold font-[family-name:var(--font-mono)] ${color}`}>
        {count}
      </span>
      <span className="text-[10px] text-muted-foreground">{sublabel}</span>
      <span className="text-xs font-medium text-foreground mt-0.5">{label}</span>
    </div>
  );
}

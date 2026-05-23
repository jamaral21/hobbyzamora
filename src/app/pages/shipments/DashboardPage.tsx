import { useMemo } from 'react';
import {
  Package, Plane, PackageCheck, Warehouse, Receipt,
  ShoppingCart, TrendingUp, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { KPICard } from '../../components/shipments/KPICard';
import { formatCLP } from '../../data/shipmentsDomain';

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
      <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>

      {/* GAV Warning */}
      {showGAVWarning && (
        <Card padding="sm" className="border-[#ffab00]/30 bg-[#ffab00]/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ffab00] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#ffab00]">Boleta GAV pendiente</p>
              <p className="text-xs text-[#ffab00]/80">
                No se ha generado la boleta de gastos fijos Japón para este mes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Productos en Japón" value={productosJapon} icon={Package} />
        <KPICard title="Cajas en Tránsito" value={cajasTransito} icon={Plane} variant="warning" />
        <KPICard title="Cajas Llegadas" value={cajasLlegadas} icon={PackageCheck} variant="success" />
        <KPICard title="Unidades en Chile" value={unidadesChile} icon={Warehouse} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Pipeline de Inventario
        </h3>
        <div className="grid grid-cols-5 items-center gap-2">
          {/* Japón */}
          <TimelineStage
            label="Japón"
            count={unidadesJapon}
            sublabel="unidades"
            icon={Package}
            color="text-primary"
            bgColor="bg-primary/10"
          />
          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>
          {/* Tránsito */}
          <TimelineStage
            label="Tránsito"
            count={unidadesTransito}
            sublabel="unidades"
            icon={Plane}
            color="text-[#ffab00]"
            bgColor="bg-[#ffab00]/10"
          />
          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>
          {/* Chile */}
          <TimelineStage
            label="Chile"
            count={unidadesChile}
            sublabel="unidades"
            icon={Warehouse}
            color="text-[#00e676]"
            bgColor="bg-[#00e676]/10"
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
    <div className={`flex flex-col items-center p-4 rounded-xl ${bgColor}`}>
      <Icon className={`w-6 h-6 ${color} mb-2`} />
      <span className={`text-2xl font-bold font-[family-name:var(--font-mono)] ${color}`}>
        {count}
      </span>
      <span className="text-xs text-muted-foreground">{sublabel}</span>
      <span className="text-sm font-medium text-foreground mt-1">{label}</span>
    </div>
  );
}

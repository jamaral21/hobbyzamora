import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import {
  calcIncomeStatement,
  groupRevenueByChannel,
  type SalesChannel,
} from '../../data/shipmentsDomain';

export default function EstadoResultadosPage() {
  const { ventas, boletas, gavChile, cajas, comprasChile } = useShipmentsData();

  // Month/Year filter UI state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [appliedMonth, setAppliedMonth] = useState<number>(selectedMonth);
  const [appliedYear, setAppliedYear] = useState<number>(selectedYear);

  function parseDateMonthYear(dateStr?: string | null) {
    if (!dateStr) return { month: 0, year: 0 };
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return { month: 0, year: 0 };
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  function inAppliedMonthYear(dateStr?: string | null) {
    const { month, year } = parseDateMonthYear(dateStr);
    return month === appliedMonth && year === appliedYear;
  }

  // Filter datasets by applied month/year
  const ventasFiltered = ventas.filter((v) => inAppliedMonthYear(v.fecha));
  const boletasFiltered = boletas.filter((b) => inAppliedMonthYear(b.fecha));
  const gavChileFiltered = gavChile.filter((g) => inAppliedMonthYear((g.fechaPago as string) || g.fecha || null));
  const cajasFiltered = cajas.filter((c) => inAppliedMonthYear(c.fecha));
  const comprasChileFiltered = comprasChile.filter((c) => inAppliedMonthYear(c.fecha));

  const eerr = useMemo(
    () => calcIncomeStatement(ventasFiltered, boletasFiltered, gavChileFiltered, cajasFiltered, comprasChileFiltered),
    [ventasFiltered, boletasFiltered, gavChileFiltered, cajasFiltered, comprasChileFiltered],
  );

  const revenueByChannel = useMemo(() => groupRevenueByChannel(ventasFiltered), [ventasFiltered]);

  const channels: SalesChannel[] = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Estado de Resultados</h2>

      {/* Filtros por mes/año */}
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-muted-foreground">Mes</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="mt-1 px-2 py-1 bg-surface border border-border rounded"
          >
            <option value={1}>Enero</option>
            <option value={2}>Febrero</option>
            <option value={3}>Marzo</option>
            <option value={4}>Abril</option>
            <option value={5}>Mayo</option>
            <option value={6}>Junio</option>
            <option value={7}>Julio</option>
            <option value={8}>Agosto</option>
            <option value={9}>Septiembre</option>
            <option value={10}>Octubre</option>
            <option value={11}>Noviembre</option>
            <option value={12}>Diciembre</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Año</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="mt-1 px-2 py-1 bg-surface border border-border rounded"
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = now.getFullYear() - 2 + i;
              return (
                <option key={y} value={y}>{y}</option>
              );
            })}
          </select>
        </div>
        <div>
          <button
            className="mt-5 px-3 py-1 bg-primary text-primary-foreground rounded"
            onClick={() => {
              setAppliedMonth(selectedMonth);
              setAppliedYear(selectedYear);
            }}
          >Consultar</button>
        </div>
      </div>

      {/* INGRESOS */}
      <Card>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ingresos
          </h3>
          <div className="space-y-2 pl-4">
            {channels.map((ch) => (
              <div key={ch} className="flex justify-between items-center py-1">
                <span className="text-sm text-foreground">{ch}</span>
                <PriceDisplay amount={revenueByChannel[ch]} currency="CLP" className="text-sm" />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="font-semibold text-foreground">Total Ingresos</span>
            <PriceDisplay
              amount={eerr.ingresos}
              currency="CLP"
              className="font-bold text-[#00e676]"
            />
          </div>
        </div>
      </Card>

      {/* COSTO DE VENTA */}
      <Card>
        <div className="flex justify-between items-center">
          <span className="text-foreground">(-) Costo de Venta</span>
          <PriceDisplay
            amount={eerr.costoVenta}
            currency="CLP"
            className="text-destructive"
          />
        </div>
      </Card>

      {/* MARGEN BRUTO */}
      <Card className="border-primary/20">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground flex items-center gap-2">
            <Minus className="w-4 h-4" /> Margen Bruto
          </span>
          <PriceDisplay
            amount={eerr.margenBruto}
            currency="CLP"
            className={`font-bold ${eerr.margenBruto >= 0 ? 'text-[#00e676]' : 'text-destructive'}`}
          />
        </div>
      </Card>

      {/* GAV */}
      <Card>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Gastos de Administración y Ventas
          </h3>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-foreground">(-) GAV Japón (pagado)</span>
            <PriceDisplay amount={eerr.gavJapon} currency="CLP" className="text-sm text-destructive" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-foreground">(-) GAV Chile (pagado)</span>
            <PriceDisplay amount={eerr.gavChile} currency="CLP" className="text-sm text-destructive" />
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-foreground">(-) Compras locales (pagado)</span>
            <PriceDisplay amount={eerr.gavComprasLocales} currency="CLP" className="text-sm text-destructive" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="font-medium text-foreground">Total GAV</span>
            <PriceDisplay amount={eerr.gavTotal} currency="CLP" className="text-destructive" />
          </div>
        </div>
      </Card>

      {/* EBIT */}
      <Card className="border-primary/20">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground flex items-center gap-2">
            {eerr.ebit >= 0 ? <TrendingUp className="w-4 h-4 text-[#00e676]" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
            EBIT (Resultado Operacional)
          </span>
          <PriceDisplay
            amount={eerr.ebit}
            currency="CLP"
            className={`font-bold ${eerr.ebit >= 0 ? 'text-[#00e676]' : 'text-destructive'}`}
          />
        </div>
      </Card>

      {/* IVA Crédito */}
      <Card>
        <div className="flex justify-between items-center">
          <span className="text-foreground">(+) IVA Crédito Fiscal</span>
          <PriceDisplay amount={eerr.ivaCredito} currency="CLP" className="text-[#00e676]" />
        </div>
      </Card>

      {/* RESULTADO NETO */}
      <Card className={`border-2 ${eerr.resultadoNeto >= 0 ? 'border-[#00e676]/30 bg-[#00e676]/5' : 'border-destructive/30 bg-destructive/5'}`}>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-foreground flex items-center gap-2">
            {eerr.resultadoNeto >= 0 ? <TrendingUp className="w-5 h-5 text-[#00e676]" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
            Resultado Neto
          </span>
          <PriceDisplay
            amount={eerr.resultadoNeto}
            currency="CLP"
            className={`text-xl font-bold ${eerr.resultadoNeto >= 0 ? 'text-[#00e676]' : 'text-destructive'}`}
          />
        </div>
      </Card>
    </div>
  );
}

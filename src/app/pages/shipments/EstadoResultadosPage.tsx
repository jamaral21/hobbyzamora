import { useMemo } from 'react';
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

  const eerr = useMemo(
    () => calcIncomeStatement(ventas, boletas, gavChile, cajas, comprasChile),
    [ventas, boletas, gavChile, cajas, comprasChile],
  );

  const revenueByChannel = useMemo(() => groupRevenueByChannel(ventas), [ventas]);

  const channels: SalesChannel[] = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Estado de Resultados</h2>

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
            <span className="text-sm text-foreground">(-) Compras locales (gasto, pagado)</span>
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

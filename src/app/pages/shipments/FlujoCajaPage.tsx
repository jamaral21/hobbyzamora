import { useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Activity } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { calcCashFlow } from '../../data/shipmentsMockData';

export default function FlujoCajaPage() {
  const { ventas, boletas, gavChile, comprasChile } = useShipmentsData();

  const flow = useMemo(
    () => calcCashFlow(ventas, boletas, gavChile, comprasChile),
    [ventas, boletas, gavChile, comprasChile],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Flujo de Caja</h2>

      {/* INGRESOS */}
      <Card>
        <div className="flex justify-between items-center">
          <span className="text-foreground flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-[#00e676]" />
            Ingresos — Ventas totales
          </span>
          <PriceDisplay amount={flow.ingresos} currency="CLP" className="font-bold text-[#00e676]" />
        </div>
      </Card>

      {/* EGRESOS JAPÓN */}
      <Card>
        <div className="flex justify-between items-center">
          <span className="text-foreground flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-destructive" />
            Egresos Japón — Boletas pagadas
          </span>
          <PriceDisplay amount={flow.egresosJP} currency="CLP" className="font-bold text-destructive" />
        </div>
      </Card>

      {/* EGRESOS CHILE */}
      <Card>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-foreground flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-destructive" />
              Egresos Chile
            </span>
            <PriceDisplay amount={flow.egresosCL} currency="CLP" className="font-bold text-destructive" />
          </div>
          <p className="text-xs text-muted-foreground pl-7">
            GAV Chile pagado + Compras locales pagadas
          </p>
        </div>
      </Card>

      {/* FLUJO NETO */}
      <Card className={`border-2 ${flow.flujoNeto >= 0 ? 'border-[#00e676]/30 bg-[#00e676]/5' : 'border-destructive/30 bg-destructive/5'}`}>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Flujo Neto
          </span>
          <PriceDisplay
            amount={flow.flujoNeto}
            currency="CLP"
            className={`text-xl font-bold ${flow.flujoNeto >= 0 ? 'text-[#00e676]' : 'text-destructive'}`}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Ingresos − Egresos Japón − Egresos Chile
        </p>
      </Card>
    </div>
  );
}

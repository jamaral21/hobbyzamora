import { useMemo } from 'react';
import { Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { calcBalanceSheet } from '../../data/shipmentsDomain';

export default function BalancePage() {
  const { ventas, boletas, stockChile, compras, cajas, comprasChile } = useShipmentsData();

  const balance = useMemo(
    () => calcBalanceSheet(ventas, boletas, stockChile, compras, cajas, comprasChile),
    [ventas, boletas, stockChile, compras, cajas, comprasChile],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Balance General</h2>

      {/* Two-column layout: Activos left, Pasivos+Patrimonio right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Activos */}
        <Card>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Activos
            </h3>
            <div className="space-y-2 pl-4">
              <Row label="Caja Estimada" amount={balance.cajaEstimada} />
              <Row label="Inventario Chile" amount={balance.invChile} />
              <Row label="Inventario Japón" amount={balance.invJapon} />
              <Row label="IVA Crédito Fiscal" amount={balance.ivaCreditoTotal} />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-semibold text-foreground">Total Activos</span>
              <PriceDisplay amount={balance.activos} currency="CLP" className="font-bold text-[#00e676]" />
            </div>
          </div>
        </Card>

        {/* RIGHT: Pasivos + Patrimonio */}
        <div className="space-y-6">
          <Card>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pasivos
              </h3>
              <div className="space-y-2 pl-4">
                <Row label="Boletas sin pagar" amount={balance.pasivos} />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-semibold text-foreground">Total Pasivos</span>
                <PriceDisplay amount={balance.pasivos} currency="CLP" className="font-bold text-destructive" />
              </div>
            </div>
          </Card>

          <Card className={`border-2 ${balance.patrimonio >= 0 ? 'border-[#00e676]/30 bg-[#00e676]/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-foreground flex items-center gap-2">
                <Landmark className="w-5 h-5" />
                Patrimonio
                {balance.patrimonio >= 0
                  ? <TrendingUp className="w-4 h-4 text-[#00e676]" />
                  : <TrendingDown className="w-4 h-4 text-destructive" />}
              </span>
              <PriceDisplay
                amount={balance.patrimonio}
                currency="CLP"
                className={`text-xl font-bold ${balance.patrimonio >= 0 ? 'text-[#00e676]' : 'text-destructive'}`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Activos − Pasivos</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-foreground">{label}</span>
      <PriceDisplay amount={amount} currency="CLP" className="text-sm" />
    </div>
  );
}

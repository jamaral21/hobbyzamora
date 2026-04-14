import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plane, PackageCheck, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { KPICard } from '../../components/shipments/KPICard';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { EmptyState } from '../../components/design-system/EmptyState';
import type { Box, BoxState } from '../../data/shipmentsMockData';

const SECTIONS: { state: BoxState; label: string }[] = [
  { state: 'transito', label: 'En Tránsito' },
  { state: 'llegada', label: 'Llegadas' },
  { state: 'costeada', label: 'Costeadas' },
];

export default function BodegaTransitoPage() {
  const { cajas } = useShipmentsData();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<BoxState, Box[]> = { transito: [], llegada: [], costeada: [] };
    for (const c of cajas) {
      map[c.estado].push(c);
    }
    return map;
  }, [cajas]);

  const counts = useMemo(() => ({
    transito: grouped.transito.length,
    llegada: grouped.llegada.length,
    costeada: grouped.costeada.length,
  }), [grouped]);

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Bodega Tránsito</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Cajas en tránsito" value={counts.transito} icon={Plane} variant="default" />
        <KPICard title="Llegadas pendientes" value={counts.llegada} icon={Package} variant="warning" />
        <KPICard title="Costeadas" value={counts.costeada} icon={PackageCheck} variant="success" />
      </div>

      {cajas.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin cajas registradas"
          description="No hay cajas en el sistema. Crea una desde el módulo Cajas / Envíos."
        />
      ) : (
        SECTIONS.map(({ state, label }) => {
          const boxes = grouped[state];
          if (boxes.length === 0) return null;
          return (
            <div key={state} className="space-y-3">
              <h3 className="text-lg font-medium text-foreground">{label}</h3>
              <div className="space-y-3">
                {boxes.map(box => (
                  <Card key={box.id} padding="md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggle(box.id)}
                          className="p-1 rounded hover:bg-secondary transition-colors"
                        >
                          {expandedId === box.id
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <div>
                          <p className="font-semibold text-foreground">{box.id}</p>
                          <p className="text-xs text-muted-foreground">{box.fecha} · {box.productos.length} producto(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={box.estado} />
                        {box.estado === 'llegada' && (
                          <Button size="sm" variant="outline" onClick={() => navigate('/shipments/costeo')}>
                            Hacer Costeo
                          </Button>
                        )}
                      </div>
                    </div>

                    {expandedId === box.id && (
                      <div className="mt-4 pt-3 border-t border-border space-y-2">
                        {box.productos.map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div>
                              <p className="text-foreground">{p.nombre}</p>
                              <p className="text-xs text-muted-foreground">{p._sku}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">×{p.cant}</span>
                              <PriceDisplay amount={p.precioU * p.cant} currency="JPY" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

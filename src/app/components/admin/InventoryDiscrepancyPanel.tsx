import { AlertTriangle, PackageCheck } from 'lucide-react';
import type { InventoryDiscrepancyItem } from '../../lib/api';
import { Badge } from '../design-system/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../design-system/Card';

interface InventoryDiscrepancyPanelProps {
  data: InventoryDiscrepancyItem[];
  error: string | null;
}

export function InventoryDiscrepancyPanel({ data, error }: InventoryDiscrepancyPanelProps) {
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ffab00]" />
            Discrepancias de inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No se pudo cargar la discrepancia de inventario para los productos seleccionados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-primary" />
          Discrepancias de inventario por producto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay movimientos suficientes para calcular discrepancias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-normal">Producto</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">Recibidas</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">Vendidas</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">Esperado</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">Stock real</th>
                  <th className="text-right py-2 text-muted-foreground font-normal">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {data.map((product) => {
                  const hasDiscrepancy = product.discrepancy > 0;

                  return (
                    <tr
                      key={product.productId}
                      className={hasDiscrepancy ? 'border-b border-border/50 bg-destructive/5' : 'border-b border-border/50'}
                    >
                      <td className="py-2.5">
                        <div className="text-foreground">{product.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.sku} {product.ean ? `• EAN ${product.ean}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-foreground">{product.totalReceived}</td>
                      <td className="py-2.5 text-right text-foreground">{product.totalSold}</td>
                      <td className="py-2.5 text-right text-foreground">{product.expectedRemaining}</td>
                      <td className="py-2.5 text-right text-foreground">{product.currentStock}</td>
                      <td className="py-2.5 text-right">
                        <Badge variant={hasDiscrepancy ? 'danger' : 'success'} size="sm">
                          {hasDiscrepancy ? `Faltan ${product.discrepancy}` : 'Sin diferencia'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

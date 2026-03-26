import { Package } from 'lucide-react';
import { Badge } from '../design-system/Badge';

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  images: string[];
  stock: number;
  isPresale?: boolean;
}

export interface POSProductGridProps {
  products: Product[];
  onSelect: (product: Product) => void;
}

export function POSProductGrid({ products, onSelect }: POSProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">No se encontraron productos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((product) => {
        const outOfStock = product.stock <= 0;
        const lowStock = product.stock > 0 && product.stock < 10;

        return (
          <button
            key={product.id}
            onClick={() => !outOfStock && onSelect(product)}
            disabled={outOfStock}
            className={`p-3 bg-card rounded-xl border text-left transition-all ${
              outOfStock
                ? 'border-border opacity-50 cursor-not-allowed'
                : 'border-border hover:border-primary'
            }`}
          >
            <div className="aspect-square bg-secondary rounded-lg mb-2 overflow-hidden relative">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {product.isPresale && (
                <span className="absolute top-1.5 left-1.5 text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                  Preventa
                </span>
              )}
              {outOfStock && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <span className="text-xs text-destructive font-medium">Agotado</span>
                </div>
              )}
            </div>
            <h3 className="text-xs text-foreground mb-1 line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm text-foreground font-medium tabular-nums">
                ${product.price.toLocaleString('es-CL')}
              </span>
              <span className={`text-[10px] tabular-nums ${
                outOfStock ? 'text-destructive' : lowStock ? 'text-[#ffab00]' : 'text-muted-foreground'
              }`}>
                {product.stock} uds
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router';
import { ShoppingCart, AlertCircle, Flame, Clock3 } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Product } from '../../lib/api';
import { useCartStore } from '../../lib/store';

export interface ProductCardProps {
  product: Product;
}

function getPresaleExpiryLabel(presaleEndDate?: string | null) {
  if (!presaleEndDate) return null;

  const diff = new Date(presaleEndDate).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.max(1, Math.floor((diff % 3600000) / 60000));

  if (days > 0) return `Expira en ${days}d ${hours}h`;
  if (hours > 0) return `Expira en ${hours}h ${minutes}m`;
  return `Expira en ${minutes}m`;
}

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = product.stock < 10;
  const isExpiredPresale = product.isPresale && product.presaleEndDate && new Date(product.presaleEndDate) < new Date();
  const isSoldOutPresale = product.isPresale && product.presaleAvailQty != null && product.presaleAvailQty <= 0;
  const isDisabled = product.stock <= 0 || !!isExpiredPresale || !!isSoldOutPresale;
  const { addItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);
  const presaleExpiryLabel = product.isPresale ? getPresaleExpiryLabel(product.presaleEndDate ?? null) : null;

  const handleAddToCart = () => {
    if (isDisabled) return;
    addItem(product, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <Card padding="none" hover className="group h-full overflow-hidden flex flex-col">
      <Link to={`/store/product/${product.id}`}>
        <div className="aspect-square overflow-hidden bg-secondary relative">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.isPresale && (
            <Badge variant="presale" pixel className="absolute top-3 left-3">
              <Flame className="w-3 h-3 mr-1" />
              Preventa
            </Badge>
          )}
          {product.isPresale && product.presaleEndDate && (
            <div className="absolute top-3 right-3">
              {new Date(product.presaleEndDate) < new Date() ? (
                <Badge variant="danger" className="text-[10px]">Expirada</Badge>
              ) : (
                <Badge variant="default" className="text-[10px] bg-background/80 backdrop-blur-sm">
                  Hasta {new Date(product.presaleEndDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                </Badge>
              )}
            </div>
          )}
          {/* Hover gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link to={`/store/product/${product.id}`} className="block">
            <h3 className="min-h-[3rem] line-clamp-2 text-foreground group-hover:text-primary transition-colors font-semibold leading-6">
              {product.name}
            </h3>
          </Link>
        </div>

        <p className="text-muted-foreground mb-3 uppercase tracking-wider text-xs line-clamp-1 min-h-[1rem]">{product.category}</p>

        <div className="mb-3 min-h-[24px]">
          {presaleExpiryLabel && (
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${presaleExpiryLabel === 'Expirado' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <Clock3 className="w-3 h-3" />
              {presaleExpiryLabel}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <span className="text-xl text-primary font-bold font-[family-name:var(--font-mono)]">
              ${product.price.toLocaleString('es-CL')}
            </span>
            <div className="mt-1.5 min-h-[18px]">
              {isLowStock && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-destructive" />
                  <span className="text-xs text-destructive">Quedan {product.stock}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            size="sm"
            disabled={isDisabled}
            className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 hover:shadow-[0_0_12px_rgba(255,214,10,0.3)]"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4" />
            {isExpiredPresale ? 'Expirada' : isSoldOutPresale ? 'Agotada' : product.stock <= 0 ? 'Agotado' : justAdded ? 'Agregado' : 'Agregar'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

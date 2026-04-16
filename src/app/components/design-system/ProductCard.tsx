import { Link } from 'react-router';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ShoppingCart, Eye, Flame, Clock3 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  category?: string;
  isPresale?: boolean;
  presaleEndDate?: string;
  maxPurchase?: number;
}

function getPresaleEndLabel(presaleEndDate?: string) {
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

export function ProductCard({
  id,
  name,
  price,
  image,
  stock,
  category,
  isPresale = false,
  presaleEndDate,
  maxPurchase,
}: ProductCardProps) {
  const isLowStock = stock > 0 && stock <= 5;
  const isOutOfStock = stock === 0;
  const presaleEndLabel = isPresale ? getPresaleEndLabel(presaleEndDate) : null;

  return (
    <div className="group relative bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:border-primary/25 hover:shadow-[0_0_24px_rgba(255,214,10,0.08)]">
      {/* Image */}
      <Link to={`/store/product/${id}`} className="block relative aspect-square overflow-hidden bg-secondary">
        <ImageWithFallback
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isPresale && (
            <Badge className="bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground border-0 shadow-[0_0_10px_rgba(255,214,10,0.3)]">
              <Flame className="w-3 h-3 mr-1" />
              Preventa
            </Badge>
          )}
          {isLowStock && !isOutOfStock && (
            <Badge variant="destructive" className="bg-destructive/90 border-0">
              Últimas {stock}
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="secondary" className="bg-secondary/90 border-0">
              Agotado
            </Badge>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
          <Button size="sm" variant="secondary" className="backdrop-blur-sm">
            <Eye className="h-4 w-4 mr-1.5" />
            Ver Detalle
          </Button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {category && (
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{category}</p>
        )}
        <Link to={`/store/product/${id}`}>
          <h3 className="font-semibold text-foreground mb-2 line-clamp-2 hover:text-primary transition-colors font-[family-name:var(--font-body)]">
            {name}
          </h3>
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-primary font-[family-name:var(--font-mono)]">
              ${price.toLocaleString('es-CL')}
            </p>
            {presaleEndLabel && (
              <p className={`text-xs font-semibold mt-1 inline-flex items-center gap-1 ${presaleEndLabel === 'Expirado' ? 'text-red-500' : 'text-amber-500'}`}>
                <Clock3 className="w-3 h-3" />
                {presaleEndLabel}
              </p>
            )}
            {isPresale && maxPurchase && (
              <p className="text-xs text-muted-foreground">Máx {maxPurchase} por orden</p>
            )}
          </div>
          <Button
            size="icon"
            disabled={isOutOfStock}
            className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 hover:shadow-[0_0_12px_rgba(255,214,10,0.3)] transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>

        {stock <= 10 && stock > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-destructive to-warning transition-all"
                style={{ width: `${Math.max(10, (stock / 10) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{stock} left</span>
          </div>
        )}
      </div>
    </div>
  );
}

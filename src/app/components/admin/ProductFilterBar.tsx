import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { productsAPI, Product } from '../../lib/api';
import { Badge } from '../design-system/Badge';
import { Button } from '../design-system/Button';

interface ProductFilterBarProps {
  selectedProductIds: string[];
  onFilterChange: (ids: string[]) => void;
}

export function ProductFilterBar({ selectedProductIds, onFilterChange }: ProductFilterBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedProducts((prev) => prev.filter((product) => selectedProductIds.includes(product.id)));
  }, [selectedProductIds]);

  useEffect(() => {
    let cancelled = false;

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    productsAPI.search(query.trim(), 8)
      .then((products) => {
        if (cancelled) return;
        setResults(products.filter((product) => !selectedProductIds.includes(product.id)));
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, selectedProductIds]);

  const addProduct = (product: Product) => {
    if (selectedProductIds.includes(product.id)) return;

    setSelectedProducts((prev) => [product, ...prev]);
    onFilterChange([...selectedProductIds, product.id]);
    setQuery('');
    setResults([]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((product) => product.id !== productId));
    onFilterChange(selectedProductIds.filter((id) => id !== productId));
  };

  const clearAll = () => {
    setSelectedProducts([]);
    setResults([]);
    setQuery('');
    onFilterChange([]);
  };

  const selectedSummary = useMemo(() => {
    if (selectedProducts.length === 0) return 'Sin filtro activo';
    if (selectedProducts.length === 1) return '1 producto seleccionado';
    return `${selectedProducts.length} productos seleccionados`;
  }, [selectedProducts.length]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            <p className="text-sm text-foreground">Filtrar por producto</p>
            <p className="text-xs text-muted-foreground">Busca por nombre, SKU o EAN para actualizar el dashboard.</p>
          </div>

          {selectedProductIds.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Limpiar filtro
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe 2 o más caracteres"
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>

        {query.trim().length >= 2 && (
          <div className="rounded-lg border border-border bg-background/70 overflow-hidden">
            {isLoading ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">Buscando productos...</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No se encontraron productos</p>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {results.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="w-full px-3 py-2.5 text-left border-b border-border/50 last:border-b-0 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="text-sm text-foreground">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.sku} • {product.ean ? `EAN ${product.ean}` : 'Sin EAN'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{selectedSummary}</span>
          {selectedProducts.map((product) => (
            <span key={product.id} className="inline-flex items-center gap-1">
              <Badge variant="brand" size="sm">
                {product.name}
              </Badge>
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
                aria-label={`Quitar ${product.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

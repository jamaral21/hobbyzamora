import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useProductSearch } from '../../hooks/useData';
import { Badge } from '../design-system/Badge';
import type { ProductSearchResult } from '../../lib/api';

export interface ProductFilterBarProps {
  selectedProductIds: string[];
  onFilterChange: (productIds: string[]) => void;
}

export function ProductFilterBar({ selectedProductIds, onFilterChange }: ProductFilterBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<ProductSearchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { options, isLoading } = useProductSearch(query);

  useEffect(() => {
    setSelectedProducts((prev) => prev.filter((product) => selectedProductIds.includes(product.id)));
  }, [selectedProductIds]);

  const filteredOptions = options.filter((option) => !selectedProductIds.includes(option.id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = useCallback((product: ProductSearchResult) => {
    if (selectedProductIds.includes(product.id)) return;

    const next = [product, ...selectedProducts];
    setSelectedProducts(next);
    onFilterChange(next.map((item) => item.id));
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onFilterChange, selectedProductIds, selectedProducts]);

  const handleRemove = useCallback((productId: string) => {
    const next = selectedProducts.filter((product) => product.id !== productId);
    setSelectedProducts(next);
    onFilterChange(next.map((product) => product.id));
  }, [onFilterChange, selectedProducts]);

  const handleClear = useCallback(() => {
    setSelectedProducts([]);
    onFilterChange([]);
    setQuery('');
    setIsOpen(false);
  }, [onFilterChange]);

  const selectedSummary = useMemo(() => {
    if (selectedProducts.length === 0) return 'Sin filtro activo';
    if (selectedProducts.length === 1) return '1 producto seleccionado';
    return `${selectedProducts.length} productos seleccionados`;
  }, [selectedProducts.length]);

  const showEmpty = query.trim().length >= 2 && !isLoading && filteredOptions.length === 0;

  return (
    <div ref={containerRef} className="relative rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <p className="text-sm text-foreground">Filtrar por producto</p>
        <p className="text-xs text-muted-foreground">Busca por nombre, SKU o EAN para actualizar el dashboard.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">{selectedSummary}</span>
        {selectedProducts.map((product) => (
          <span key={product.id} className="inline-flex items-center gap-1">
            <Badge variant="brand" size="sm">
              {product.name}
            </Badge>
            <button
              type="button"
              onClick={() => handleRemove(product.id)}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
              aria-label={`Quitar ${product.name}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        {selectedProductIds.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Buscar por EAN o nombre del producto…"
          className={clsx(
            'w-full pl-9 pr-4 py-2 rounded-lg text-sm text-foreground placeholder:text-muted-foreground',
            'bg-input-background border border-border transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background',
            'focus:border-primary/40 focus:ring-primary/30'
          )}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-4 right-4 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {isLoading && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}

          {showEmpty && (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              No se encontraron productos
            </div>
          )}

          {!isLoading && filteredOptions.length > 0 && (
            <ul className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(product)}
                    className="w-full text-left px-3 py-2 hover:bg-secondary/70 transition-colors"
                  >
                    <p className="text-sm text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {product.ean != null ? `EAN ${product.ean}` : 'Sin EAN'}
                      <span className="text-muted-foreground/50"> · {product.sku}</span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

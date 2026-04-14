import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useProductSearch } from '../../hooks/useData';
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

  // Filter out already-selected products from dropdown
  const filteredOptions = options.filter(
    (opt) => !selectedProductIds.includes(opt.id)
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when there are results
  useEffect(() => {
    if (query.length >= 2 && (filteredOptions.length > 0 || (!isLoading && options.length === 0))) {
      setIsOpen(true);
    }
  }, [query, filteredOptions.length, isLoading, options.length]);

  const handleSelect = useCallback((product: ProductSearchResult) => {
    const newSelected = [...selectedProducts, product];
    setSelectedProducts(newSelected);
    onFilterChange(newSelected.map((p) => p.id));
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [selectedProducts, onFilterChange]);

  const handleRemove = useCallback((productId: string) => {
    const newSelected = selectedProducts.filter((p) => p.id !== productId);
    setSelectedProducts(newSelected);
    onFilterChange(newSelected.map((p) => p.id));
  }, [selectedProducts, onFilterChange]);

  const handleClear = useCallback(() => {
    setSelectedProducts([]);
    onFilterChange([]);
    setQuery('');
  }, [onFilterChange]);

  const showEmpty = query.length >= 2 && !isLoading && options.length === 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Selected chips */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {selectedProducts.map((product) => (
            <span
              key={product.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/15 text-primary border border-primary/20"
            >
              <span className="truncate max-w-[160px]">{product.name}</span>
              {product.ean != null && <span className="text-primary/60 font-mono text-[10px]">EAN {product.ean}</span>}
              <button
                type="button"
                onClick={() => handleRemove(product.id)}
                className="ml-0.5 p-0.5 rounded hover:bg-primary/20 transition-colors"
                aria-label={`Quitar ${product.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          placeholder="Buscar por EAN o nombre del producto…"
          className={clsx(
            'w-full pl-9 pr-4 py-2 rounded-lg text-sm text-foreground placeholder:text-muted-foreground',
            'bg-input-background border border-border transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background',
            'focus:border-primary/40 focus:ring-primary/30'
          )}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {isLoading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>
          )}

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
                    className="w-full text-left px-3 py-2 hover:bg-secondary/70 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {product.ean != null ? `EAN ${product.ean}` : 'Sin EAN'}
                        <span className="text-muted-foreground/50"> · {product.sku}</span>
                      </p>
                    </div>
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

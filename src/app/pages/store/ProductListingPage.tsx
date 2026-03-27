import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { ProductCard } from '../../components/store/ProductCard';
import { Button } from '../../components/design-system/Button';
import { Select } from '../../components/design-system/Input';
import { useProducts } from '../../hooks/useData';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export default function ProductListingPage() {
  return (
    <StoreLayout>
      <ProductListingPageContent />
    </StoreLayout>
  );
}

export function ProductListingPageContent({ presalesOnly = false }: { presalesOnly?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';

  const { data: products, isLoading } = useProducts();

  const baseProducts = useMemo(() => {
    if (!products) return [];
    return presalesOnly
      ? products.filter((p: any) => p.isPresale)
      : products.filter((p: any) => !p.isPresale);
  }, [products, presalesOnly]);

  const categories = useMemo(() => {
    if (!baseProducts.length) return ['all'];
    return ['all', ...Array.from(new Set(baseProducts.map((p: any) => p.category)))];
  }, [baseProducts]);

  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slugify(value));
    }
    setSearchParams(searchParams, { replace: true });
  };

  const filteredProducts = useMemo(() => {
    if (!baseProducts.length) return [];
    return baseProducts
      .filter((p: any) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryParam === 'all' || slugify(p.category) === categoryParam;
        return matchesSearch && matchesCategory;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [baseProducts, searchQuery, categoryParam, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl text-foreground mb-2">{presalesOnly ? 'Preventas' : 'Todos los Productos'}</h1>
          <p className="text-muted-foreground">
            {presalesOnly ? 'Acceso exclusivo a productos próximos' : 'Explora nuestra colección completa de coleccionables'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Select
            value={categoryParam === 'all' ? 'all' : (categories.find((c) => slugify(c) === categoryParam) || 'all')}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="md:w-48"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Todas las Categorías' : cat}
              </option>
            ))}
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="md:w-48"
          >
            <option value="featured">Destacados</option>
            <option value="price-low">Precio: Menor a Mayor</option>
            <option value="price-high">Precio: Mayor a Menor</option>
            <option value="name">Nombre A-Z</option>
          </Select>

          <Button variant="outline">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredProducts.length} productos
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron productos</p>
          </div>
        )}
      </div>
  );
}

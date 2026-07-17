import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { ProductCard } from '../../components/store/ProductCard';
import { Button } from '../../components/design-system/Button';
import { Select } from '../../components/design-system/Input';
import { useProducts, useStoreSections } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import { buildSectionGroups, matchesCategoryFilter, orderSectionLabels, slugifySection } from '../../lib/sections';

export default function ProductListingPage() {
  return (
    <StoreLayout>
      <ProductListingPageContent />
    </StoreLayout>
  );
}

export function ProductListingPageContent({ presalesOnly = false }: { presalesOnly?: boolean }) {
  const { isAuthenticated } = useAuth();
  const [sortBy, setSortBy] = useState('featured');
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';
  const searchParam = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const { data: sectionData } = useStoreSections();

  const { data: products, isLoading } = useProducts({ limit: 1000 }, {
    authMode: isAuthenticated ? 'customer' : 'public',
  });

  const baseProducts = useMemo(() => {
    if (!products) return [];
    if (presalesOnly) {
      // Filter out expired presales (past end date) and sold-out presales (availQty = 0)
      return products.filter((p: any) => {
        if (!p.isPresale) return false;
        if (p.presaleEndDate && new Date(p.presaleEndDate) < new Date()) return false;
        if (p.presaleAvailQty != null && p.presaleAvailQty <= 0) return false;
        return true;
      });
    }
    return isAuthenticated ? products : products.filter((p: any) => !p.isPresale);
  }, [products, presalesOnly, isAuthenticated]);

  const groups = useMemo(() => buildSectionGroups(sectionData || []), [sectionData]);

  const categories = useMemo(() => {
    if (!baseProducts.length) return [{ label: 'Todas las Categorías', slug: 'all' }];

    const availableParents = new Set<string>();
    for (const product of baseProducts as any[]) {
      const category = String(product.category || '').trim();
      const group = groups.find((item) =>
        item.parentCategory === category || item.children.some((child) => child.name === category)
      );
      if (group) {
        availableParents.add(group.parentCategory);
      } else if (category) {
        availableParents.add(category);
      }
    }

    const normalized = orderSectionLabels(availableParents).map((value) => ({ label: value, slug: slugifySection(value) }));

    return [{ label: 'Todas las Categorías', slug: 'all' }, ...normalized];
  }, [baseProducts, groups]);

  const handleCategoryChange = (value: string) => {
    if (value === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      searchParams.set('search', value.trim());
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    setSearchQuery(searchParam);
  }, [searchParam]);

  const filteredProducts = useMemo(() => {
    if (!baseProducts.length) return [];
    return baseProducts
      .filter((p: any) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = matchesCategoryFilter(p.category, categoryParam, groups);
        return matchesSearch && matchesCategory;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [baseProducts, searchQuery, categoryParam, sortBy, groups]);

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
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Select
            value={categoryParam === 'all' ? 'all' : (categories.find((c) => c.slug === categoryParam)?.slug || 'all')}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="md:w-48"
          >
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.label}
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

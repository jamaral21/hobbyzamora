import { useMemo, useRef } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Sparkles,
  Loader2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Truck,
  CreditCard,
  Package,
} from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { ProductCard } from '../../components/store/ProductCard';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { HeroSlider, type HeroSlide } from '../../components/design-system/HeroSlider';
import { useInstagramFeed, useProducts, useReviews, useStoreSections } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import { buildSectionGroups } from '../../lib/sections';
import { mockProducts } from '../../data/mockData';

const slugify = (text: string) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const heroSlides: HeroSlide[] = [
  {
    id: 'slide-pokemon-tcg',
    image: '/banners/pokemon tcg.webp',
    title: '',
    subtitle: '',
    ctaHref: '/store/products?category=pokemon-tcg',
  },
  {
    id: 'slide-beyblade',
    image: '/banners/beyblade.webp',
    title: '',
    subtitle: '',
    ctaHref: '/store/products?category=beyblade-x',
  },
  {
    id: 'slide-nintendo',
    image: '/banners/nintendo.webp',
    title: '',
    subtitle: '',
    ctaHref: '/store/products?category=nintendo',
  },
  {
    id: 'slide-pokemon-merch',
    image: '/banners/pokemon varios.webp',
    title: '',
    subtitle: '',
    ctaHref: '/store/products?category=pokemon-merch',
  },
  {
    id: 'slide-tomica',
    image: '/banners/tomica.webp',
    title: '',
    subtitle: '',
    ctaHref: '/store/products?category=tomica',
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { data: products, isLoading } = useProducts(undefined, {
    authMode: isAuthenticated ? 'customer' : 'public',
  });
  const { data: sections } = useStoreSections();
  const { data: instagramFeed } = useInstagramFeed();
  const { data: approvedReviews } = useReviews({ status: 'APPROVED', limit: 6 });
  const categoryGroups = useMemo(() => buildSectionGroups(sections || []), [sections]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allProducts = products && products.length > 0 ? products : mockProducts;
  const instagramPosts = instagramFeed?.posts || [];
  const showInstagramSection = instagramFeed?.source === 'instagram' && instagramPosts.length > 0;
  const homepageReviews = approvedReviews && approvedReviews.length > 0
    ? approvedReviews
    : [{
        id: 'placeholder-review',
        customerName: 'Próximamente',
        productName: 'Reseñas verificadas',
        comment: 'Pronto podrás ver reseñas de clientes reales que compraron en HobbyZamora.',
        rating: 5,
        status: 'APPROVED' as const,
        createdAt: new Date().toISOString(),
      }];

  const sortedByNewest = useMemo(() => {
    return [...allProducts].sort((a: any, b: any) => {
      const aDate = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bDate = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bDate - aDate;
    });
  }, [allProducts]);

  const featuredProducts = useMemo(() => {
    return sortedByNewest.slice(0, 8);
  }, [sortedByNewest]);

  const presaleProducts = useMemo(() => {
    return allProducts.filter((p: any) => p.isPresale);
  }, [allProducts]);

  // Dynamic category products — one carousel per category that has products
  const categoryProducts = useMemo(() => {
    if (!categoryGroups.length || !allProducts.length) return [];
    return categoryGroups
      .map((group) => {
        const products = allProducts.filter((p: any) =>
          slugify(p.category).includes(group.slug) || slugify(p.category) === group.slug
        );
        return { ...group, products: products.slice(0, 10) };
      })
      .filter((g) => g.products.length > 0);
  }, [categoryGroups, allProducts]);

  const novedadesEnStock = useMemo(() => {
    return sortedByNewest
      .filter((p: any) => !p.isPresale && Number(p.stock || 0) > 0)
      .slice(0, 6);
  }, [sortedByNewest]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      {/* ═══════════════════════════════════════════
          HERO BANNER — Full-width visual
      ═══════════════════════════════════════════ */}
      <HeroSlider slides={heroSlides} />

      {/* ═══════════════════════════════════════════
          PRODUCTOS DESTACADOS — Carrusel horizontal
      ═══════════════════════════════════════════ */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-primary mb-2">PRODUCTOS DESTACADOS</h2>
              <p className="text-muted-foreground">Los mas nuevos del catalogo</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="p-2 rounded-lg border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-2 rounded-lg border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <Link to="/store/products" className="ml-2">
                <Button variant="outline" size="sm">
                  Ver Todo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{ scrollbarWidth: 'none' }}
        >
          {featuredProducts.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[280px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          NOVEDADES EN STOCK
      ═══════════════════════════════════════════ */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-primary mb-2">NOVEDADES EN STOCK</h2>
              <p className="text-muted-foreground">Productos nuevos disponibles para compra inmediata</p>
            </div>
            <Link to="/store/products">
              <Button variant="outline" size="sm">
                Ver Todo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {novedadesEnStock.length > 0 ? (
          <div
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
            style={{ scrollbarWidth: 'none' }}
          >
            {novedadesEnStock.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-[280px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="text-center py-10">
              <p className="text-sm text-muted-foreground">Aun no hay novedades con stock disponible.</p>
            </Card>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          PREVENTAS — Acceso exclusivo
      ═══════════════════════════════════════════ */}
      {presaleProducts.length > 0 && (
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-primary mb-2">PREVENTAS</h2>
                <p className="text-muted-foreground">Acceso exclusivo a productos próximos</p>
              </div>
              <Link to="/store/presales">
                <Button variant="outline" size="sm">
                  Ver Todas
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            {isAuthenticated ? (
              <div
                className="flex gap-5 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollbarWidth: 'none' }}
              >
                {presaleProducts.map((product) => (
                  <div key={product.id} className="flex-shrink-0 w-[280px]">
                    <ProductCard product={product} hideStock />
                  </div>
                ))}
              </div>
            ) : (
              <Card glow="primary" className="max-w-md mx-auto text-center py-10">
                <Lock className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg text-foreground mb-2">Contenido Exclusivo</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Inicia sesión para ver y reservar productos en preventa
                </p>
                <Link to="/store/account">
                  <Button>Iniciar Sesión</Button>
                </Link>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          BANNER DIVISOR — CATEGORÍAS
      ═══════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <h2 className="text-primary shrink-0">CATEGORÍAS</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECCIONES POR CATEGORÍA — Carrusel dinámico por cada categoría
      ═══════════════════════════════════════════ */}
      {categoryProducts.map((cat) => (
        <section key={cat.parentCategory} className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-primary mb-1">{cat.parentCategory.toUpperCase()}</h2>
              </div>
              <Link to={`/store/products?category=${cat.slug}`}>
                <Button variant="outline" size="sm">
                  Ver Todo
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
            style={{ scrollbarWidth: 'none' }}
          >
            {cat.products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-[280px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ═══════════════════════════════════════════
          INSTAGRAM — Feed placeholder
      ═══════════════════════════════════════════ */}
      {showInstagramSection && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">Síguenos en Instagram</p>
              <h2 className="text-primary">@HOBBYZAMORA</h2>
            </div>
            <a href="https://www.instagram.com/hobbyzamora" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                Seguir
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {instagramPosts.map((post) => (
              <a
                key={post.id}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden hover:border-primary/30 transition-colors"
              >
                <img src={post.imageUrl} alt={post.caption || 'Publicación de Instagram'} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          RESEÑAS — Placeholder
      ═══════════════════════════════════════════ */}
      <section className="border-t border-border py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-primary mb-2">RESEÑAS DE CLIENTES</h2>
            <p className="text-muted-foreground">Lo que dicen nuestros compradores</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {homepageReviews.slice(0, 3).map((review) => (
              <Card key={review.id} className="p-5">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-sm ${star <= review.rating ? 'text-primary' : 'text-muted-foreground/30'}`}>★</span>
                  ))}
                </div>
                <p className="text-sm text-foreground mb-3">{review.comment}</p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{review.customerName}</span>
                  {' · '}{review.productName}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TRUST BADGES — Envío, Pago, Originales, Soporte
      ═══════════════════════════════════════════ */}
      <section className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(255,214,10,0.2)] transition-shadow">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Envío a todo Chile</p>
                <p className="text-xs text-muted-foreground">Despacho rápido y seguro</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(0,212,255,0.2)] transition-shadow">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Pagos seguros</p>
                <p className="text-xs text-muted-foreground">Tarjeta, transferencia y más</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#00e676]/10 border border-[#00e676]/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(0,230,118,0.2)] transition-shadow">
                <Package className="w-6 h-6 text-[#00e676]" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">100% Originales</p>
                <p className="text-xs text-muted-foreground">Productos verificados y sellados</p>
              </div>
            </div>
            <a href="https://www.instagram.com/hobbyzamora" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(255,214,10,0.2)] transition-shadow">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">¿Preguntas?</p>
                <p className="text-xs text-muted-foreground">Contáctanos por Instagram</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA — Únete a la comunidad
      ═══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="relative overflow-hidden bg-gradient-to-br from-secondary via-card to-secondary border-primary/15 text-center py-14 px-8">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-[60px]" />
          <div className="relative">
            <h2 className="text-primary mb-4">ÚNETE A LA COMUNIDAD</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Ofertas exclusivas, acceso anticipado a nuevos productos e inspiración para tu colección
            </p>
            <Link to="/store/account">
              <Button size="lg" pixel>
                Registrarse
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </StoreLayout>
  );
}

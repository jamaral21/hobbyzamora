import { useRef } from 'react';
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
import { useProducts } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';
import { mockProducts } from '../../data/mockData';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const allProducts = products && products.length > 0 ? products : mockProducts;
  const featuredProducts = allProducts.slice(0, 8);
  const presaleProducts = allProducts.filter((p: any) => p.isPresale);
  const newProducts = allProducts.slice(0, 6);

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
              <p className="text-muted-foreground">Lo más popular de nuestra comunidad</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {presaleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
          NOVEDADES — Grid de productos recientes
      ═══════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-primary mb-2">NOVEDADES</h2>
            <p className="text-muted-foreground">Recién agregados a la tienda</p>
          </div>
          <Link to="/store/products">
            <Button variant="outline" size="sm">
              Ver Todo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {newProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
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
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:shadow-[0_0_16px_rgba(255,214,10,0.2)] transition-shadow">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">¿Preguntas?</p>
                <p className="text-xs text-muted-foreground">Contáctanos por Instagram o email</p>
              </div>
            </div>
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

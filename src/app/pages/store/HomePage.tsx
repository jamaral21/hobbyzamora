import { Link } from 'react-router';
import { ArrowRight, Sparkles, Clock, Shield, Loader2, Lock, Zap, Gamepad2 } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { ProductCard } from '../../components/store/ProductCard';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { useProducts } from '../../hooks/useData';
import { useAuth } from '../../contexts/AuthContext';

export default function HomePage() {
  const { data: products, isLoading } = useProducts();
  const { isAuthenticated } = useAuth();

  const featuredProducts = (products || []).slice(0, 4);
  const presaleProducts = (products || []).filter((p: any) => p.isPresale);

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
      {/* Developer Navigation Badge */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link to="/nav">
          <Button size="sm" variant="secondary" className="shadow-lg backdrop-blur-sm">
            🗺️ Ver Páginas
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background">
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,214,10,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,214,10,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-accent/6 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="flex items-center gap-8 lg:gap-16">
            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-5">
                <Gamepad2 className="w-4 h-4" />
                <span className="font-[family-name:var(--font-display)] text-[0.6rem] tracking-wider">JUEGOS, FIGURAS & COLECCIONABLES</span>
              </div>

              <h1 className="text-primary mb-4 leading-tight">
                HOBBY ZAMORA
              </h1>
              <p className="text-lg mb-8 text-muted-foreground max-w-xl leading-relaxed">
                Sobres sellados, cartas sueltas, productos exclusivos y preventas de Pokémon TCG y Beyblade X
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/store/products">
                  <Button size="lg" pixel>
                    <Zap className="w-5 h-5" />
                    Ver Productos
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/store/presales">
                  <Button size="lg" variant="outline" pixel>
                    Preventas
                  </Button>
                </Link>
              </div>
            </div>

            {/* Logo */}
            <div className="hidden md:flex items-center justify-center flex-shrink-0">
              <img
                src="/logo.png"
                alt="HobbyZamora"
                className="w-64 lg:w-80 h-auto drop-shadow-[0_0_30px_rgba(255,214,10,0.15)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card hover className="text-center group">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_16px_rgba(255,214,10,0.2)] transition-shadow">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-foreground mb-2">100% Originales</h3>
            <p className="text-sm text-muted-foreground">
              Productos Pokémon TCG sellados y verificados
            </p>
          </Card>
          <Card hover className="text-center group">
            <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_16px_rgba(0,212,255,0.2)] transition-shadow">
              <Clock className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-foreground mb-2">Envío Rápido</h3>
            <p className="text-sm text-muted-foreground">
              Entrega rápida y segura para tu colección
            </p>
          </Card>
          <Card hover className="text-center group">
            <div className="w-14 h-14 rounded-xl bg-[#00e676]/10 border border-[#00e676]/20 flex items-center justify-center mx-auto mb-4 group-hover:shadow-[0_0_16px_rgba(0,230,118,0.2)] transition-shadow">
              <Shield className="w-7 h-7 text-[#00e676]" />
            </div>
            <h3 className="text-foreground mb-2">Pago Seguro</h3>
            <p className="text-sm text-muted-foreground">
              Procesamiento de pago seguro y confiable
            </p>
          </Card>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-primary mb-2">PRODUCTOS DESTACADOS</h2>
            <p className="text-muted-foreground">Lo más popular de nuestra comunidad</p>
          </div>
          <Link to="/store/products">
            <Button variant="outline" size="sm">
              Ver Todo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Presales */}
      {presaleProducts.length > 0 && (
        <section className="relative py-16 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-primary mb-2">PREVENTAS</h2>
              <p className="text-muted-foreground">
                Acceso exclusivo a productos próximos
              </p>
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

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="relative overflow-hidden bg-gradient-to-br from-secondary via-card to-secondary border-primary/15 text-center py-14 px-8">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/5 rounded-full blur-[60px]" />
          <div className="relative">
            <h2 className="text-primary mb-4">ÚNETE A LA COMUNIDAD</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Ofertas exclusivas, acceso anticipado a nuevos productos e inspiración para tu colección
            </p>
            <Button size="lg" pixel>
              Registrarse
            </Button>
          </div>
        </Card>
      </section>
    </StoreLayout>
  );
}

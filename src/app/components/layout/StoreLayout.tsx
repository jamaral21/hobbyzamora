import { StoreNavbar } from './StoreNavbar';

export function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <StoreNavbar />
      <main>{children}</main>
      <footer className="bg-card border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.png" alt="HobbyZamora" className="h-10 w-auto brightness-200" />
              </div>
              <p className="text-sm text-muted-foreground">
                Juegos, Figuras & Coleccionables
              </p>
            </div>
            <div>
              <h4 className="text-sm text-foreground mb-4 font-semibold">Tienda</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/store/products" className="hover:text-primary transition-colors">Todos los Productos</a></li>
                <li><a href="/store/presales" className="hover:text-primary transition-colors">Preventas</a></li>
                <li><a href="/store/products" className="hover:text-primary transition-colors">Novedades</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm text-foreground mb-4 font-semibold">Soporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Contáctanos</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Preguntas Frecuentes</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Envíos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm text-foreground mb-4 font-semibold">Síguenos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Facebook</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">TikTok</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2026 HobbyZamora. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Clock,
  Users,
  Instagram,
  Store,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Panel', icon: LayoutDashboard, path: '/admin' },
  { label: 'Productos', icon: Package, path: '/admin/products' },
  { label: 'Pedidos', icon: ShoppingBag, path: '/admin/orders' },
  { label: 'Preventas', icon: Clock, path: '/admin/presales' },
  { label: 'Clientes', icon: Users, path: '/admin/customers' },
  { label: 'Agente Instagram', icon: Instagram, path: '/admin/instagram' },
];

export function AdminSidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { logout } = useAdminAuth();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border border-border md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col h-screen bg-card border-r border-border transition-all duration-300',
          // Desktop
          'hidden md:flex',
          isCollapsed ? 'md:w-16' : 'md:w-64',
        )}
      >
        <SidebarContent
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          location={location}
          logout={logout}
        />
      </aside>

      {/* Mobile sidebar (overlay) */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-card border-r border-border transition-transform duration-300 md:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/logo.png" alt="HobbyZamora" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-foreground">HobbyZamora</span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <SidebarContent
          isCollapsed={false}
          onToggleCollapse={() => {}}
          location={location}
          logout={logout}
          hidCollapseButton
        />
      </aside>
    </>
  );
}

function SidebarContent({
  isCollapsed,
  onToggleCollapse,
  location,
  logout,
  hidCollapseButton,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  location: { pathname: string };
  logout: () => void;
  hidCollapseButton?: boolean;
}) {
  return (
    <>
      {/* Header — desktop only */}
      {!hidCollapseButton && (
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!isCollapsed && (
            <Link to="/admin" className="flex items-center gap-2">
              <img src="/logo.png" alt="HobbyZamora" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-foreground">HobbyZamora</span>
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Store className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Ver Tienda</span>}
        </Link>
        <Link
          to="/admin/settings/sections"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full',
            location.pathname.startsWith('/admin/settings')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Configuración</span>}
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Cerrar Sesión</span>}
        </button>
      </div>
    </>
  );
}

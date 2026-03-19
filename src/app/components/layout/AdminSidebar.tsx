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
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

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

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!isCollapsed && (
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/logo.png" alt="HobbyZamora" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-foreground">HobbyZamora</span>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

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
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full">
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Configuración</span>}
        </button>
      </div>
    </aside>
  );
}

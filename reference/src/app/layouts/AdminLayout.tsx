import { Outlet, Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  ShoppingBag, 
  Clock, 
  Users, 
  TrendingUp,
  Instagram,
  Store,
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../components/ui/utils';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Inventory', href: '/admin/inventory', icon: Layers },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Presales', href: '/admin/presales', icon: Clock },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { name: 'Instagram Agent', href: '/admin/instagram-agent', icon: Instagram },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r bg-white">
        <div className="flex items-center gap-2 h-16 px-6 border-b">
          <Store className="h-6 w-6 text-purple-600" />
          <span className="font-semibold text-lg">HobbyZamora</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/admin' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-purple-50 text-purple-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors mb-1">
            <Store className="h-5 w-5" />
            View Store
          </Link>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors w-full">
            <Settings className="h-5 w-5" />
            Settings
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors w-full">
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">
              {navigation.find(item => 
                location.pathname === item.href || 
                (item.href !== '/admin' && location.pathname.startsWith(item.href))
              )?.name || 'Admin'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Admin User
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

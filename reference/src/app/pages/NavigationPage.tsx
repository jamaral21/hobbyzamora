import { Link } from 'react-router';
import { Store, LayoutDashboard, CreditCard, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/design-system/Card';

export default function NavigationPage() {
  const sections = [
    {
      title: 'Customer Store',
      icon: Store,
      description: 'Browse the online shopping experience',
      links: [
        { path: '/', label: 'Home Page' },
        { path: '/store/products', label: 'Product Listing' },
        { path: '/store/product/1', label: 'Product Detail' },
        { path: '/store/cart', label: 'Shopping Cart' },
        { path: '/store/checkout', label: 'Checkout' },
        { path: '/store/order-confirmation', label: 'Order Confirmation' },
      ],
    },
    {
      title: 'Admin Dashboard',
      icon: LayoutDashboard,
      description: 'Manage your commerce platform',
      links: [
        { path: '/admin', label: 'Dashboard Overview' },
        { path: '/admin/products', label: 'Products' },
        { path: '/admin/inventory', label: 'Inventory' },
        { path: '/admin/orders', label: 'Orders' },
        { path: '/admin/instagram', label: 'Instagram Agent' },
      ],
    },
    {
      title: 'Point of Sale',
      icon: CreditCard,
      description: 'Tablet-friendly POS interface',
      links: [
        { path: '/pos', label: 'POS Terminal' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl" />
          </div>
          <h1 className="text-5xl text-white mb-4">
            HobbyZamora
          </h1>
          <p className="text-xl text-purple-100 mb-2">
            Modern Commerce Platform UI
          </p>
          <p className="text-sm text-purple-200">
            Complete UI-only implementation ready for API integration
          </p>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {section.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.links.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {link.label}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardContent className="text-center py-8">
            <h2 className="text-2xl mb-3">🎨 UI-Only Implementation</h2>
            <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
              This is a complete, production-ready UI built with React, Tailwind CSS, and modern design patterns.
              All components use mock data and are ready for API integration.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="px-4 py-2 bg-white/20 rounded-lg backdrop-blur">
                ✓ Design System
              </div>
              <div className="px-4 py-2 bg-white/20 rounded-lg backdrop-blur">
                ✓ Responsive Layout
              </div>
              <div className="px-4 py-2 bg-white/20 rounded-lg backdrop-blur">
                ✓ Dark Mode
              </div>
              <div className="px-4 py-2 bg-white/20 rounded-lg backdrop-blur">
                ✓ Component Library
              </div>
              <div className="px-4 py-2 bg-white/20 rounded-lg backdrop-blur">
                ✓ Mock Data
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { StoreNavbar } from './StoreNavbar';

export function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StoreNavbar />
      <main>{children}</main>
      <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg" />
                <span className="text-gray-900 dark:text-gray-100">HobbyZamora</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your creative hobby destination
              </p>
            </div>
            <div>
              <h4 className="text-sm text-gray-900 dark:text-gray-100 mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="#" className="hover:text-purple-600">All Products</a></li>
                <li><a href="#" className="hover:text-purple-600">Presales</a></li>
                <li><a href="#" className="hover:text-purple-600">New Arrivals</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm text-gray-900 dark:text-gray-100 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="#" className="hover:text-purple-600">Contact Us</a></li>
                <li><a href="#" className="hover:text-purple-600">FAQ</a></li>
                <li><a href="#" className="hover:text-purple-600">Shipping</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm text-gray-900 dark:text-gray-100 mb-4">Follow Us</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="#" className="hover:text-purple-600">Instagram</a></li>
                <li><a href="#" className="hover:text-purple-600">Facebook</a></li>
                <li><a href="#" className="hover:text-purple-600">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-500 dark:text-gray-400">
            © 2026 HobbyZamora. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

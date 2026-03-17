import { Link } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CartPanel } from '../../components/store/CartPanel';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { useCartStore } from '../../lib/store';

export default function CartPage() {
  const { items: cartItems, updateQuantity, removeItem } = useCartStore();

  const handleUpdateQuantity = (id: string, quantity: number) => {
    updateQuantity(id, quantity);
  };

  const handleRemove = (id: string) => {
    removeItem(id);
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <Card className="text-center py-12">
            <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Start adding some amazing products!
            </p>
            <Link to="/store/products">
              <Button>Continue Shopping</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <CartPanel
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            </div>
            <div>
              <Card className="sticky top-8">
                <h3 className="text-lg text-gray-900 dark:text-gray-100 mb-4">
                  Continue Shopping
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Add more items to your cart or proceed to checkout
                </p>
                <div className="flex flex-col gap-3">
                  <Link to="/store/checkout">
                    <Button fullWidth size="lg">Checkout</Button>
                  </Link>
                  <Link to="/store/products">
                    <Button fullWidth variant="outline">Continue Shopping</Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}

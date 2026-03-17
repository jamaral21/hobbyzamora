import { useState } from 'react';
import { Link } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CartPanel } from '../../components/store/CartPanel';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';

export default function CartPage() {
  const [cartItems, setCartItems] = useState([
    {
      id: '1',
      name: 'Premium Watercolor Set',
      price: 49.99,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
      variant: '24 colors',
    },
    {
      id: '2',
      name: 'Calligraphy Starter Kit',
      price: 34.99,
      quantity: 2,
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400',
    },
    {
      id: '5',
      name: 'Professional Sketch Pencils',
      price: 18.99,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    },
  ]);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemove = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
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
                <div className="space-y-3">
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

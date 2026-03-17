import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { CartPanel } from '../../components/design-system/CartPanel';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ArrowRight, Tag } from 'lucide-react';

const cartItems = [
  {
    id: '1',
    name: 'Premium Action Figure Collection',
    price: 89.99,
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1700909416178-40b292788200?w=200',
    variant: 'Standard Edition',
  },
  {
    id: '2',
    name: 'Limited Edition Model Kit',
    price: 149.99,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1705393928685-4dec061491dd?w=200',
  },
  {
    id: '3',
    name: 'Collectible Trading Cards',
    price: 34.99,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1579361647854-cf9cda91d4b8?w=200',
  },
];

export function CartPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <CartPanel items={cartItems} />
          </Card>
          
          {/* Promo Code */}
          <Card className="p-6 mt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Promo Code
            </h3>
            <div className="flex gap-3">
              <Input placeholder="Enter promo code" />
              <Button variant="outline">Apply</Button>
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="p-6 sticky top-20">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal (3 items)</span>
                <span className="font-medium">$364.97</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">$36.50</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between">
                <span className="font-semibold text-lg">Total</span>
                <span className="font-semibold text-lg text-purple-600">$401.47</span>
              </div>
            </div>

            <Link to="/checkout">
              <Button size="lg" className="w-full">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link to="/products">
              <Button variant="ghost" className="w-full mt-3">
                Continue Shopping
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

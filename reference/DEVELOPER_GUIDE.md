# HobbyZamora - Developer Integration Guide

## 🎯 Purpose

This guide helps developers integrate the HobbyZamora UI with a backend API. The UI is **100% complete and functional** using mock data. Your job is to connect it to real APIs.

## 🗺️ Quick Navigation

**Start here:** Visit `/nav` in the browser to see all pages!

## 📋 Integration Checklist

### ✅ Phase 1: API Setup (Week 1)

#### Day 1-2: Create API Endpoints
```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
GET    /api/inventory
POST   /api/cart/items
PATCH  /api/cart/items/:id
DELETE /api/cart/items/:id
GET    /api/customers
GET    /api/analytics/dashboard
GET    /api/instagram/conversations
POST   /api/instagram/messages
```

#### Day 3-4: Set Up Authentication
```typescript
// Example: Add auth context
import { createContext, useContext, useState } from 'react';

interface AuthContext {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContext>(null!);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setUser(data.user);
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### Day 5: Add API Client
```typescript
// src/lib/api.ts
const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000/api';

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Product API
export const productsAPI = {
  getAll: () => fetchAPI('/products'),
  getById: (id: string) => fetchAPI(`/products/${id}`),
  create: (data: Partial<Product>) => 
    fetchAPI('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Product>) => 
    fetchAPI(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => 
    fetchAPI(`/products/${id}`, { method: 'DELETE' }),
};

// Cart API
export const cartAPI = {
  getCart: () => fetchAPI('/cart'),
  addItem: (productId: string, quantity: number) =>
    fetchAPI('/cart/items', { 
      method: 'POST', 
      body: JSON.stringify({ productId, quantity }) 
    }),
  updateItem: (itemId: string, quantity: number) =>
    fetchAPI(`/cart/items/${itemId}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ quantity }) 
    }),
  removeItem: (itemId: string) =>
    fetchAPI(`/cart/items/${itemId}`, { method: 'DELETE' }),
};

// Orders API
export const ordersAPI = {
  getAll: () => fetchAPI('/orders'),
  getById: (id: string) => fetchAPI(`/orders/${id}`),
  create: (data: any) => 
    fetchAPI('/orders', { method: 'POST', body: JSON.stringify(data) }),
};
```

### ✅ Phase 2: Replace Mock Data (Week 2)

#### Product Pages

**File:** `/src/app/pages/store/ProductListingPage.tsx`

```typescript
// BEFORE (using mock data)
import { mockProducts } from '../../data/mockData';
const filteredProducts = mockProducts.filter(...);

// AFTER (using API)
import { useEffect, useState } from 'react';
import { productsAPI } from '../../lib/api';

const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  productsAPI.getAll()
    .then(setProducts)
    .finally(() => setLoading(false));
}, []);
```

#### Product Detail

**File:** `/src/app/pages/store/ProductDetailPage.tsx`

```typescript
// BEFORE
const product = mockProducts.find((p) => p.id === id);

// AFTER
const [product, setProduct] = useState(null);

useEffect(() => {
  if (id) {
    productsAPI.getById(id).then(setProduct);
  }
}, [id]);
```

#### Shopping Cart

**File:** `/src/app/pages/store/CartPage.tsx`

```typescript
// BEFORE
const handleUpdateQuantity = (id: string, quantity: number) => {
  setCartItems((items) =>
    items.map((item) => (item.id === id ? { ...item, quantity } : item))
  );
};

// AFTER
const handleUpdateQuantity = async (id: string, quantity: number) => {
  await cartAPI.updateItem(id, quantity);
  const updatedCart = await cartAPI.getCart();
  setCartItems(updatedCart.items);
};
```

#### Admin Dashboard

**File:** `/src/app/pages/admin/DashboardPage.tsx`

```typescript
// BEFORE
import { mockDashboardStats, mockOrders } from '../../data/mockData';

// AFTER
const [stats, setStats] = useState(null);
const [orders, setOrders] = useState([]);

useEffect(() => {
  Promise.all([
    fetchAPI('/analytics/dashboard'),
    ordersAPI.getAll(),
  ]).then(([statsData, ordersData]) => {
    setStats(statsData);
    setOrders(ordersData);
  });
}, []);
```

### ✅ Phase 3: Add State Management (Week 3)

#### Option A: React Context (Recommended for Medium Apps)

```typescript
// src/context/CartContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../lib/api';

interface CartContextType {
  items: CartItem[];
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  total: number;
}

const CartContext = createContext<CartContextType>(null!);

export function CartProvider({ children }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const fetchCart = async () => {
    const cart = await cartAPI.getCart();
    setItems(cart.items);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addItem = async (productId: string, quantity: number) => {
    await cartAPI.addItem(productId, quantity);
    await fetchCart();
  };

  const updateItem = async (id: string, quantity: number) => {
    await cartAPI.updateItem(id, quantity);
    await fetchCart();
  };

  const removeItem = async (id: string) => {
    await cartAPI.removeItem(id);
    await fetchCart();
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateItem, removeItem, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
```

**Usage in components:**
```typescript
import { useCart } from '../../context/CartContext';

function ProductCard({ product }) {
  const { addItem } = useCart();

  return (
    <Button onClick={() => addItem(product.id, 1)}>
      Add to Cart
    </Button>
  );
}
```

#### Option B: TanStack Query (Recommended for Large Apps)

```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '../lib/api';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: productsAPI.getAll,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsAPI.getById(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

**Usage:**
```typescript
function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {products.map(product => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
```

### ✅ Phase 4: Add Form Validation (Week 4)

#### Using React Hook Form + Zod

```bash
npm install react-hook-form zod @hookform/resolvers
```

```typescript
// src/schemas/product.ts
import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().min(0, 'Price must be positive'),
  cost: z.number().min(0, 'Cost must be positive'),
  stock: z.number().int().min(0, 'Stock must be a positive integer'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

**Update ProductEditor:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, ProductFormData } from '../../schemas/product';

export function ProductEditor({ product, onSave, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product,
  });

  const onSubmit = (data: ProductFormData) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        label="Product Name"
        {...register('name')}
        error={errors.name?.message}
      />
      
      <Input
        label="Price"
        type="number"
        step="0.01"
        {...register('price', { valueAsNumber: true })}
        error={errors.price?.message}
      />

      {/* ... other fields */}

      <Button type="submit">Save Product</Button>
    </form>
  );
}
```

### ✅ Phase 5: Add Loading & Error States (Week 5)

#### Loading Skeleton Component

```typescript
// src/components/design-system/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <Card>
      <Skeleton className="aspect-square mb-4" />
      <Skeleton className="h-6 mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <Skeleton className="h-10" />
    </Card>
  );
}
```

**Usage:**
```typescript
function ProductListingPage() {
  const { data: products, isLoading } = useProducts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      {products.map(product => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
```

#### Error Handling

```typescript
// src/components/design-system/ErrorMessage.tsx
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export function ErrorMessage({ 
  title = 'Something went wrong',
  message,
  onRetry 
}: { 
  title?: string; 
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry}>Try Again</Button>
      )}
    </div>
  );
}
```

**Usage:**
```typescript
const { data, isLoading, error, refetch } = useProducts();

if (error) {
  return <ErrorMessage message={error.message} onRetry={refetch} />;
}
```

### ✅ Phase 6: Add Real Payment (Week 6)

#### Stripe Integration

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

```typescript
// src/lib/stripe.ts
import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY!);
```

**Update CheckoutPage:**
```typescript
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../lib/stripe';
import { CheckoutForm } from '../../components/store/CheckoutForm';

export default function CheckoutPage() {
  return (
    <StoreLayout>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </StoreLayout>
  );
}
```

### ✅ Phase 7: Environment Setup

#### Create `.env` file
```env
VITE_API_URL=http://localhost:3000/api
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_INSTAGRAM_CLIENT_ID=...
```

#### Update `vite.config.ts`
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

## 🔒 Security Checklist

- [ ] Add CSRF protection
- [ ] Implement rate limiting
- [ ] Validate all inputs server-side
- [ ] Use HTTPS in production
- [ ] Store JWTs securely (httpOnly cookies)
- [ ] Sanitize user inputs
- [ ] Add content security policy
- [ ] Implement proper CORS

## 🚀 Deployment Checklist

- [ ] Set up environment variables
- [ ] Configure build scripts
- [ ] Add error tracking (Sentry)
- [ ] Set up analytics (Google Analytics/Plausible)
- [ ] Configure CDN for assets
- [ ] Add monitoring (Datadog/New Relic)
- [ ] Set up backup strategy
- [ ] Configure SSL certificates

## 📚 Recommended Tools

- **State Management**: TanStack Query or Zustand
- **Forms**: React Hook Form + Zod
- **API Client**: Axios or native fetch
- **Testing**: Vitest + React Testing Library
- **E2E**: Playwright
- **Error Tracking**: Sentry
- **Analytics**: Plausible or Google Analytics

## 🎓 Best Practices

1. **Keep components small** - Each component should do one thing
2. **Use TypeScript** - Already set up, keep using it
3. **Add loading states** - Users should know when something is happening
4. **Handle errors gracefully** - Show helpful error messages
5. **Optimize images** - Use Next/Image or similar
6. **Add tests** - Start with critical user flows
7. **Monitor performance** - Use React DevTools Profiler

## 💬 Need Help?

The UI is fully functional with mock data. If something doesn't work:
1. Check the browser console
2. Verify the route exists in `/src/app/routes.ts`
3. Check that mock data exists in `/src/app/data/mockData.ts`
4. Review component props in the TypeScript interfaces

---

**Good luck with integration!** 🎉

The UI is production-ready and waiting for your backend magic.

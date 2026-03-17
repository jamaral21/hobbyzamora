# HobbyZamora - Commerce Platform UI

**UI-ONLY Implementation** - Ready for API Integration

## 🎨 Design System

This is a complete UI implementation using:
- **React** for component architecture
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Recharts** for analytics visualization
- **Lucide React** for icons
- **Mock Data** throughout (ready to be replaced with API calls)

## 📁 Project Structure

```
src/app/
├── data/
│   └── mockData.ts                 # All mock data - REPLACE WITH API CALLS
├── components/
│   ├── design-system/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Table.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Switch.tsx
│   │   └── EmptyState.tsx
│   ├── layout/                     # Layout components
│   │   ├── StoreNavbar.tsx
│   │   ├── StoreLayout.tsx
│   │   ├── AdminSidebar.tsx
│   │   └── AdminLayout.tsx
│   ├── store/                      # Store-specific components
│   │   ├── ProductCard.tsx
│   │   ├── CartPanel.tsx
│   │   ├── CheckoutSummary.tsx
│   │   └── VariantSelector.tsx
│   ├── admin/                      # Admin-specific components
│   │   ├── DashboardWidget.tsx
│   │   ├── SalesChart.tsx
│   │   ├── InventoryTable.tsx
│   │   └── ProductEditor.tsx
│   ├── pos/                        # POS-specific components
│   │   ├── POSCart.tsx
│   │   ├── POSProductGrid.tsx
│   │   └── PaymentSelector.tsx
│   └── instagram/                  # Instagram agent components
│       ├── ConversationList.tsx
│       ├── ChatInterface.tsx
│       └── ProductQuickInsert.tsx
├── pages/
│   ├── store/                      # Customer-facing pages
│   │   ├── HomePage.tsx
│   │   ├── ProductListingPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   └── OrderConfirmationPage.tsx
│   ├── admin/                      # Admin dashboard pages
│   │   ├── DashboardPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── OrdersPage.tsx
│   │   └── InstagramAgentPage.tsx
│   └── pos/
│       └── POSPage.tsx             # Point of sale interface
├── routes.ts                       # Route configuration
└── App.tsx                         # Main app component
```

## 🛣️ Routes

### Customer Store
- `/` - Home page
- `/store/products` - Product listing
- `/store/product/:id` - Product detail
- `/store/cart` - Shopping cart
- `/store/checkout` - Checkout process
- `/store/order-confirmation` - Order success

### Admin Dashboard
- `/admin` - Dashboard overview
- `/admin/products` - Product management
- `/admin/inventory` - Inventory tracking
- `/admin/orders` - Order management
- `/admin/presales` - Presale products
- `/admin/customers` - Customer management
- `/admin/analytics` - Analytics & reports
- `/admin/instagram` - Instagram agent monitoring

### POS
- `/pos` - Point of sale interface

## 🔌 API Integration Points

### Replace Mock Data with Real APIs

All mock data is centralized in `/src/app/data/mockData.ts`. Replace these with API calls:

#### Products API
```typescript
// Example: Replace mockProducts
export async function fetchProducts() {
  const response = await fetch('/api/products');
  return response.json();
}
```

#### Orders API
```typescript
// Example: Replace mockOrders
export async function fetchOrders() {
  const response = await fetch('/api/orders');
  return response.json();
}
```

#### Inventory API
```typescript
// Example: Replace mockInventory
export async function fetchInventory() {
  const response = await fetch('/api/inventory');
  return response.json();
}
```

### Component Integration Examples

#### ProductCard Component
```typescript
// Current: Uses mock data passed as props
<ProductCard product={mockProduct} />

// Future: Fetch from API
const [products, setProducts] = useState([]);
useEffect(() => {
  fetchProducts().then(setProducts);
}, []);
```

#### Cart Operations
Replace these console.log statements with API calls:
- `onAddToCart` → POST `/api/cart/items`
- `onUpdateQuantity` → PATCH `/api/cart/items/:id`
- `onRemove` → DELETE `/api/cart/items/:id`

#### Checkout Flow
Replace form submissions with API calls:
- Shipping info → POST `/api/checkout/shipping`
- Payment info → POST `/api/checkout/payment`
- Place order → POST `/api/orders`

## 🎨 Design Tokens

### Colors
- **Primary**: Purple (`purple-600`, `purple-700`)
- **Secondary**: Blue (`blue-600`, `blue-700`)
- **Success**: Green (`green-600`)
- **Warning**: Orange/Yellow (`orange-500`, `yellow-600`)
- **Danger**: Red (`red-600`)
- **Neutral**: Gray scale

### Typography
Uses default Tailwind typography with system fonts.

### Spacing
- Consistent padding: `p-3`, `p-4`, `p-6`, `p-8`
- Gap spacing: `gap-2`, `gap-3`, `gap-4`, `gap-6`

### Border Radius
- Small: `rounded-lg` (8px)
- Large: `rounded-xl` (12px)
- Full: `rounded-full`

### Shadows
- Default: `shadow-sm`
- Hover: `shadow-md`
- Modal: `shadow-xl`

## 🧩 Component API Reference

### Button
```tsx
<Button 
  variant="primary | secondary | outline | ghost | danger"
  size="sm | md | lg"
  fullWidth={boolean}
>
  Content
</Button>
```

### Card
```tsx
<Card padding="none | sm | md | lg" hover={boolean}>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Input
```tsx
<Input 
  label="Label"
  error="Error message"
  fullWidth={boolean}
  // ...standard input props
/>
```

### Badge
```tsx
<Badge 
  variant="default | success | warning | danger | info | purple"
  size="sm | md"
>
  Text
</Badge>
```

### Modal
```tsx
<Modal 
  isOpen={boolean}
  onClose={() => {}}
  title="Title"
  size="sm | md | lg | xl"
>
  Content
</Modal>
```

## 📱 Responsive Design

All components are responsive with breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Key responsive patterns:
- Grid columns adjust: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Sidebar collapses on mobile
- Touch-friendly buttons on POS (tablet-optimized)

## 🌓 Dark Mode

Components support dark mode using Tailwind's `dark:` variant:
```tsx
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
```

## 🔧 State Management

Currently uses:
- **React useState** for local state
- **Props drilling** for component communication

### Recommended for production:
- **React Context** for global state (cart, user, theme)
- **TanStack Query** for API data fetching
- **Zustand** or **Redux** for complex state

## 📊 Data Flow Example

```
User Action → Component Event Handler → API Call → State Update → UI Re-render
```

Example flow for adding to cart:
```typescript
// 1. User clicks "Add to Cart"
<Button onClick={() => handleAddToCart(product)}>

// 2. Handler makes API call
async function handleAddToCart(product) {
  await fetch('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId: product.id, quantity: 1 })
  });
  
  // 3. Refresh cart data
  const updatedCart = await fetchCart();
  setCart(updatedCart);
}
```

## 🚀 Next Steps for Developers

1. **Set up backend API** endpoints matching the data structures in `mockData.ts`
2. **Replace mock data** with API calls using fetch/axios
3. **Add authentication** (user login, JWT tokens)
4. **Implement state management** (Context/Redux/Zustand)
5. **Add form validation** (React Hook Form, Zod)
6. **Set up error handling** (error boundaries, toast notifications)
7. **Add loading states** (skeletons, spinners)
8. **Implement real payment** integration (Stripe, PayPal)
9. **Add image uploads** for product management
10. **Connect Instagram API** for real agent functionality

## 📝 TypeScript Interfaces

All data types are defined in `/src/app/data/mockData.ts`:
- `Product`
- `Order`
- `OrderItem`
- `InventoryBatch`
- `Customer`
- `InstagramConversation`
- `DashboardStats`

Use these as your API response types.

## 🎯 Feature Checklist

### ✅ Implemented (UI Only)
- [x] Online store pages (home, products, detail, cart, checkout)
- [x] POS interface (tablet-friendly)
- [x] Admin dashboard with widgets
- [x] Product management (list, create, edit)
- [x] Inventory tracking
- [x] Order management
- [x] Presale product UI
- [x] Instagram agent panel
- [x] Responsive design
- [x] Dark mode support
- [x] Clean component architecture

### 🔄 To Be Connected
- [ ] Backend API integration
- [ ] Real authentication
- [ ] Payment processing
- [ ] Image upload functionality
- [ ] Instagram API integration
- [ ] Email notifications
- [ ] PDF receipt generation
- [ ] Real-time updates
- [ ] Analytics tracking
- [ ] Database persistence

## 💡 Design Inspiration

The UI draws inspiration from:
- **Shopify Admin** - Clean, organized product management
- **Stripe Dashboard** - Simple, elegant data visualization
- **Linear** - Minimal, modern interface design
- **Vercel** - Smooth gradients and card-based layouts

## 📞 Component Usage Examples

### Creating a new page
```tsx
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';

export default function MyNewPage() {
  return (
    <AdminLayout>
      <h1>My Page</h1>
      <Card>
        <p>Content here</p>
        <Button>Action</Button>
      </Card>
    </AdminLayout>
  );
}
```

### Adding a new route
```typescript
// In routes.ts
{
  path: '/admin/my-page',
  Component: MyNewPage,
}
```

---

**Ready for development!** 🚀

All UI components are production-ready and waiting for API integration.

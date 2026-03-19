// Mock data for HobbyZamora platform - UI only
// Developers will replace this with actual API calls

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  images: string[];
  description: string;
  status: 'active' | 'draft' | 'archived';
  isPresale?: boolean;
  presaleData?: {
    maxQuantity: number;
    availableQuantity: number;
    endDate: string;
  };
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  options: string[];
  stock: number;
  price?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  productName: string;
  batch: string;
  quantity: number;
  unitCost: number;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  joinDate: string;
}

export interface InstagramConversation {
  id: string;
  customer: string;
  username: string;
  lastMessage: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'pending';
  unread: boolean;
}

export interface DashboardStats {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  revenue: number;
  profit: number;
  inventoryValue: number;
  lowStockItems: number;
}

// Mock Products
export const mockProducts: Product[] = [
  {
    id: '1',
    sku: 'HBZ-001',
    name: 'Booster Box Scarlet & Violet 151',
    category: 'Booster Boxes',
    price: 144.99,
    cost: 90.00,
    stock: 45,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800'],
    description: 'Caja sellada de 36 sobres de la expansión Scarlet & Violet 151',
    status: 'active',
    variants: [
      { id: 'v1', name: 'Idioma', options: ['Español', 'Inglés', 'Japonés'], stock: 45 }
    ]
  },
  {
    id: '2',
    sku: 'HBZ-002',
    name: 'Elite Trainer Box Obsidian Flames',
    category: 'Elite Trainer Boxes',
    price: 54.99,
    cost: 32.00,
    stock: 3,
    images: ['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800'],
    description: 'ETB con 9 sobres, protectores, energías, dados y marcadores',
    status: 'active'
  },
  {
    id: '3',
    sku: 'HBZ-003',
    name: 'Ultra Premium Collection Charizard',
    category: 'Colecciones Premium',
    price: 149.99,
    cost: 85.00,
    stock: 0,
    images: ['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800'],
    description: 'Colección ultra premium con Charizard en metal y 16 sobres',
    status: 'active'
  },
  {
    id: '4',
    sku: 'HBZ-004',
    name: 'Booster Box Prismatic Evolutions',
    category: 'Booster Boxes',
    price: 179.99,
    cost: 110.00,
    stock: 15,
    images: ['https://images.unsplash.com/photo-1452509133926-2b180c6d6245?w=800'],
    description: 'Caja sellada de 36 sobres de Prismatic Evolutions con Eeveeluciones',
    status: 'active',
    isPresale: true,
    presaleData: {
      maxQuantity: 2,
      availableQuantity: 15,
      endDate: '2026-04-15T00:00:00Z'
    }
  },
  {
    id: '5',
    sku: 'HBZ-005',
    name: 'Sobre Suelto Paldea Evolved',
    category: 'Sobres Sueltos',
    price: 5.99,
    cost: 3.00,
    stock: 67,
    images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800'],
    description: 'Sobre individual de 10 cartas de Paldea Evolved',
    status: 'active'
  },
  {
    id: '6',
    sku: 'HBZ-006',
    name: 'Tin Metálica Pikachu ex',
    category: 'Tins y Latas',
    price: 29.99,
    cost: 16.00,
    stock: 1,
    images: ['https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800'],
    description: 'Lata coleccionable con Pikachu ex promo y 4 sobres',
    status: 'active'
  },
  {
    id: '7',
    sku: 'HBZ-007',
    name: 'ETB Surging Sparks',
    category: 'Elite Trainer Boxes',
    price: 64.99,
    cost: 38.00,
    stock: 20,
    images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800'],
    description: 'Elite Trainer Box de Surging Sparks con 9 sobres y accesorios',
    status: 'active',
    isPresale: true,
    presaleData: {
      maxQuantity: 3,
      availableQuantity: 20,
      endDate: '2026-05-01T00:00:00Z'
    }
  },
  {
    id: '8',
    sku: 'HBZ-008',
    name: 'Blister Pack Temporal Forces',
    category: 'Blisters',
    price: 7.99,
    cost: 4.50,
    stock: 0,
    images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800'],
    description: 'Blister de 3 sobres de Temporal Forces con carta promo',
    status: 'active'
  }
];

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2026-001',
    customer: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    date: '2026-03-10T10:30:00Z',
    total: 199.98,
    status: 'processing',
    items: [
      { productId: '1', name: 'Booster Box Scarlet & Violet 151', quantity: 1, price: 144.99 },
      { productId: '2', name: 'Elite Trainer Box Obsidian Flames', quantity: 1, price: 54.99 }
    ]
  },
  {
    id: '2',
    orderNumber: 'ORD-2026-002',
    customer: 'Michael Chen',
    email: 'mchen@email.com',
    date: '2026-03-09T15:20:00Z',
    total: 149.99,
    status: 'shipped',
    items: [
      { productId: '3', name: 'Ultra Premium Collection Charizard', quantity: 1, price: 149.99 }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD-2026-003',
    customer: 'Emma Davis',
    email: 'emma.d@email.com',
    date: '2026-03-08T09:15:00Z',
    total: 11.98,
    status: 'delivered',
    items: [
      { productId: '5', name: 'Sobre Suelto Paldea Evolved', quantity: 2, price: 5.99 }
    ]
  }
];

// Mock Inventory
export const mockInventory: InventoryBatch[] = [
  {
    id: '1',
    productId: '1',
    productName: 'Booster Box Scarlet & Violet 151',
    batch: 'BATCH-2026-001',
    quantity: 45,
    unitCost: 90.00,
    date: '2026-02-15'
  },
  {
    id: '2',
    productId: '2',
    productName: 'Elite Trainer Box Obsidian Flames',
    batch: 'BATCH-2026-002',
    quantity: 8,
    unitCost: 32.00,
    date: '2026-02-20'
  },
  {
    id: '3',
    productId: '4',
    productName: 'Booster Box Prismatic Evolutions',
    batch: 'BATCH-2026-003',
    quantity: 3,
    unitCost: 110.00,
    date: '2026-03-01'
  }
];

// Mock Customers
export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 (555) 123-4567',
    totalOrders: 8,
    totalSpent: 567.89,
    joinDate: '2025-11-15'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'mchen@email.com',
    phone: '+1 (555) 234-5678',
    totalOrders: 3,
    totalSpent: 899.97,
    joinDate: '2026-01-10'
  },
  {
    id: '3',
    name: 'Emma Davis',
    email: 'emma.d@email.com',
    phone: '+1 (555) 345-6789',
    totalOrders: 12,
    totalSpent: 1234.56,
    joinDate: '2025-08-22'
  }
];

// Mock Instagram Conversations
export const mockConversations: InstagramConversation[] = [
  {
    id: '1',
    customer: 'Jessica Martinez',
    username: '@jessmart_pokemon',
    lastMessage: '¿Tienen la Booster Box de 151 en stock?',
    timestamp: '2026-03-10T11:45:00Z',
    status: 'active',
    unread: true
  },
  {
    id: '2',
    customer: 'David Lee',
    username: '@davidlee_tcg',
    lastMessage: 'Thanks! Order placed.',
    timestamp: '2026-03-10T10:30:00Z',
    status: 'resolved',
    unread: false
  },
  {
    id: '3',
    customer: 'Sophie Turner',
    username: '@sophiepaints',
    lastMessage: 'Can I get a custom bundle?',
    timestamp: '2026-03-10T09:15:00Z',
    status: 'pending',
    unread: true
  }
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  dailySales: 1247.89,
  weeklySales: 8934.56,
  monthlySales: 34567.89,
  revenue: 34567.89,
  profit: 15234.50,
  inventoryValue: 45678.90,
  lowStockItems: 3
};

// Mock Sales Chart Data
export const mockSalesChartData = [
  { date: 'Mar 1', sales: 1200, revenue: 1500 },
  { date: 'Mar 2', sales: 1800, revenue: 2200 },
  { date: 'Mar 3', sales: 1500, revenue: 1800 },
  { date: 'Mar 4', sales: 2200, revenue: 2800 },
  { date: 'Mar 5', sales: 1900, revenue: 2400 },
  { date: 'Mar 6', sales: 2500, revenue: 3100 },
  { date: 'Mar 7', sales: 2100, revenue: 2600 },
  { date: 'Mar 8', sales: 1700, revenue: 2100 },
  { date: 'Mar 9', sales: 2300, revenue: 2900 },
  { date: 'Mar 10', sales: 1247, revenue: 1550 }
];

// Mock Top Products
export const mockTopProducts = [
  { name: 'Booster Box Scarlet & Violet 151', sales: 145, revenue: 21023.55 },
  { name: 'Ultra Premium Collection Charizard', sales: 23, revenue: 3449.77 },
  { name: 'Tin Metálica Pikachu ex', sales: 89, revenue: 2669.11 },
  { name: 'Elite Trainer Box Obsidian Flames', sales: 67, revenue: 3684.33 },
  { name: 'Sobre Suelto Paldea Evolved', sales: 312, revenue: 1868.88 }
];

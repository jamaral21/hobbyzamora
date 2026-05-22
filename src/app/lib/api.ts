// API Client for HobbyZamora
// Replaces mock data with real API calls

const API_BASE = '/api';
import {
  clearCustomerToken,
  getAdminToken,
  getAnyAuthToken,
  getCustomerToken,
  setCustomerToken,
} from './authStorage';

// Types matching the database schema
export interface Product {
  id: string;
  sku: string;
  ean?: number | null;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  images: string[];
  description: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'HIDDEN';
  isPresale?: boolean;
  presaleMaxQty?: number;
  presaleAvailQty?: number;
  presaleEndDate?: string;
  presaleArrivedAt?: string | null;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  options: string[];
  stock: number;
  price?: number | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  createdAt: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  source: 'ONLINE' | 'POS' | 'INSTAGRAM';
  items: OrderItem[];
  payments?: Payment[];
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
  variantName?: string | null;
  product?: { images: string[] };
}

export interface Payment {
  id: string;
  method: 'CARD' | 'CASH' | 'TRANSFER' | 'GETNET';
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'REFUNDED';
  amount: number;
  paidAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images: string[];
    stock: number;
  };
  variant?: {
    id: string;
    name: string;
    options: string[];
    price?: number | null;
  } | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
}

export interface DashboardStats {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  revenue: number;
  profit: number;
  inventoryValue: number;
  lowStockItems: number;
  // New fields for date-filtered KPIs
  totalSales?: number;
  totalCost?: number;
  totalMargin?: number;
  marginPercent?: number;
  orderCount?: number;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  sku: string;
  ean: number | null;
}

export interface ProductInventoryInfo {
  productId: string;
  productName: string;
  sku: string;
  ean: number | null;
  currentStock: number;
  totalReceived: number;
  totalSold: number;
  totalRemaining: number;
  expectedRemaining: number;
  discrepancy: number;
}

export interface InventoryDiscrepancyItem extends ProductInventoryInfo {}

export interface InventoryDiscrepancyResponse {
  products: ProductInventoryInfo[];
}

export interface InstagramConversation {
  id: string;
  customerName: string;
  username: string;
  lastMessage: string;
  status: 'ACTIVE' | 'PENDING' | 'RESOLVED';
  unread: boolean;
  handedOver: boolean;
  updatedAt: string;
}

export interface InstagramMessage {
  id: string;
  sender: 'CUSTOMER' | 'BOT' | 'AGENT';
  content: string;
  productId?: string;
  createdAt: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantity: number;
  totalValue: number;
  batches: InventoryBatch[];
}

export interface InventoryBatch {
  id: string;
  batchCode: string;
  quantity: number;
  remaining: number;
  unitCost: number;
  receivedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  phone?: string;
  avatarUrl?: string | null;
  presaleBanned?: boolean;
}

// API Error class
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type AuthMode = 'auto' | 'customer' | 'admin' | 'public';

function getAuthToken(mode: AuthMode = 'auto') {
  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();

  if (mode === 'public') return null;
  if (mode === 'customer') return customerToken;
  if (mode === 'admin') return adminToken;
  return customerToken || adminToken;
}

// Base fetch function with auth
async function fetchAPI<T>(endpoint: string, options?: RequestInit, authMode: AuthMode = 'auto'): Promise<T> {
  const token = getAuthToken(authMode);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, data.error || response.statusText);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const data = await fetchAPI<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCustomerToken(data.token);
    return data;
  },

  register: async (email: string, password: string, name: string, phone?: string) => {
    const data = await fetchAPI<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, phone }),
    });
    setCustomerToken(data.token);
    return data;
  },

  logout: () => {
    clearCustomerToken();
  },

  getMe: () => fetchAPI<User>('/auth/me', undefined, 'customer'),

  updateProfile: (data: { name?: string; phone?: string }) =>
    fetchAPI<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, 'customer'),

  uploadAvatar: async (file: File) => {
    const token = getAuthToken('customer');
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE}/auth/me/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, data.error || response.statusText);
    }

    return response.json() as Promise<User>;
  },

  googleLogin: async (credential: string) => {
    const data = await fetchAPI<{ user: User; token: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    setCustomerToken(data.token);
    return data;
  },

  forgotPassword: (email: string) =>
    fetchAPI<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    fetchAPI<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

// Products API
export const productsAPI = {
  getAll: (params?: {
    category?: string;
    status?: string;
    search?: string;
    presale?: boolean;
    page?: number;
    limit?: number;
  }, authMode: AuthMode = 'auto') => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.presale) searchParams.set('presale', 'true');
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return fetchAPI<{ products: Product[]; pagination: any }>(`/products${query ? `?${query}` : ''}`, undefined, authMode);
  },

  getById: (id: string) => fetchAPI<Product>(`/products/${id}`),
  getByIdAdmin: (id: string) => fetchAPI<Product>(`/products/admin-detail/${id}`, undefined, 'admin'),

  create: (data: Partial<Product> & { initialStock?: number }) =>
    fetchAPI<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  update: (id: string, data: Partial<Product>) =>
    fetchAPI<Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, 'admin'),

  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/products/${id}`, { method: 'DELETE' }, 'admin'),

  getCategories: () => fetchAPI<string[]>('/products/meta/categories'),

  getSuggestedSku: (category: string) =>
    fetchAPI<{ sku: string; prefix: string }>(`/products/meta/sku-preview?category=${encodeURIComponent(category)}`, undefined, 'admin'),

  search: async (query: string, limit = 8) => {
    const response = await productsAPI.getAll({ search: query, limit }, 'admin');
    return response.products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      ean: product.ean ?? null,
    }));
  },

  importCSV: (products: Record<string, string>[], presale = false) =>
    fetchAPI<{ created: number; updated: number; skipped: number; errors: string[] }>(`/products/import${presale ? '?presale=true' : ''}`, {
      method: 'POST',
      body: JSON.stringify({ products }),
    }, 'admin'),

  uploadImages: async (file: File, onProgress?: (pct: number) => void) => {
    const token = getAnyAuthToken();
    const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB per chunk (safe for most proxy limits)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Init session
    const initRes = await fetchAPI<{ uploadId: string }>('/products/upload-images/init', {
      method: 'POST',
      body: JSON.stringify({ totalChunks, filename: file.name }),
    });
    const { uploadId } = initRes;

    // 2. Send chunks sequentially
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', blob);

      const chunkRes = await fetch(`${API_BASE}/products/upload-images/chunk`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          'X-Upload-Id': uploadId,
          'X-Chunk-Index': String(i),
        },
        body: formData,
      });
      if (!chunkRes.ok) {
        const err = await chunkRes.json().catch(() => ({ error: 'Chunk failed' }));
        throw new ApiError(chunkRes.status, err.error || 'Error al subir chunk');
      }
      onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
    }

    // 3. Complete — process the ZIP
    return fetchAPI<{ extracted: number; skipped: number; productsUpdated: number; files: string[] }>(
      '/products/upload-images/complete',
      { method: 'POST', body: JSON.stringify({ uploadId }) },
    );
  },

  uploadImage: async (file: File) => {
    const token = getAnyAuthToken();
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/products/upload-image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(response.status, data.error || response.statusText);
    }

    return response.json() as Promise<{ url: string; filename: string }>;
  },
};

// Orders API
export const ordersAPI = {
  getAll: (params?: {
    status?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    productIds?: string[];
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.productIds?.length) searchParams.set('productIds', params.productIds.join(','));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return fetchAPI<{
      orders: Order[];
      pagination: any;
      statusCounts?: Record<string, number>;
    }>(`/orders${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  getById: (id: string) => fetchAPI<Order>(`/orders/${id}`),

  create: (data: {
    items: Array<{ productId: string; variantId?: string; quantity: number }>;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    shipping?: { cost: number };
    shippingAddress?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    paymentMethod?: 'credit' | 'debit' | 'cash' | 'transfer';
    notes?: string;
  }) =>
    fetchAPI<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    fetchAPI<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, 'admin'),

  getMyOrders: () => fetchAPI<Order[]>('/orders/my/orders', undefined, 'customer'),

  deleteById: (id: string) =>
    fetchAPI<{ message: string }>(`/orders/${id}`, { method: 'DELETE' }, 'admin'),
};

// Cart API
export const cartAPI = {
  getCart: () => fetchAPI<Cart>('/cart', undefined, 'customer'),

  addItem: (productId: string, quantity: number, variantId?: string) =>
    fetchAPI<CartItem>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, variantId }),
    }, 'customer'),

  updateItem: (itemId: string, quantity: number) =>
    fetchAPI<CartItem>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }, 'customer'),

  removeItem: (itemId: string) =>
    fetchAPI<{ message: string }>(`/cart/items/${itemId}`, { method: 'DELETE' }, 'customer'),

  clearCart: () =>
    fetchAPI<{ message: string }>('/cart', { method: 'DELETE' }, 'customer'),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params?: { productId?: string; lowStock?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set('productId', params.productId);
    if (params?.lowStock) searchParams.set('lowStock', 'true');
    
    const query = searchParams.toString();
    return fetchAPI<{
      inventory: InventoryItem[];
      summary: { totalProducts: number; totalValue: number; lowStockCount: number };
    }>(`/inventory${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  receive: (productId: string, quantity: number, unitCost: number, batchCode?: string) =>
    fetchAPI<InventoryBatch>('/inventory/receive', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, unitCost, batchCode }),
    }, 'admin'),

  adjust: (batchId: string, adjustment: number, reason?: string) =>
    fetchAPI<InventoryBatch>('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ batchId, adjustment, reason }),
    }, 'admin'),

  getMovements: (params?: {
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set('productId', params.productId);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return fetchAPI<{ movements: any[]; pagination: any }>(`/inventory/movements${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  importCSV: (batches: Record<string, string>[]) =>
    fetchAPI<{ created: number; skipped: number; errors: string[] }>('/inventory/import', {
      method: 'POST',
      body: JSON.stringify({ batches }),
    }, 'admin'),
};

// POS API
export const posAPI = {
  getProducts: (search?: string, category?: string) => {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set('search', search);
    if (category) searchParams.set('category', category);
    
    const query = searchParams.toString();
    return fetchAPI<Product[]>(`/pos/products${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  scanProduct: (code: string) => fetchAPI<Product[]>(`/pos/scan/${code}`, undefined, 'admin'),

  createSale: (data: {
    items: Array<{ productId: string; quantity: number; price?: number; variantName?: string }>;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerId?: string;
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
    amountPaid?: number;
    notes?: string;
  }) =>
    fetchAPI<Order & { change: number; checkoutUrl?: string; requestId?: number; paymentId?: string }>('/pos/sale', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'admin'),

  getTodaySales: () =>
    fetchAPI<{
      sales: Order[];
      summary: { count: number; totalSales: number; totalItems: number };
    }>('/pos/today', undefined, 'admin'),

  getRegister: () =>
    fetchAPI<{
      total: number;
      byMethod: Record<string, { count: number; total: number }>;
      transactionCount: number;
    }>('/pos/register', undefined, 'admin'),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: (startDate?: string, endDate?: string, productIds?: string[]) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (productIds?.length) params.set('productIds', productIds.join(','));
    const query = params.toString();
    return fetchAPI<DashboardStats>(`/analytics/dashboard${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  getSalesChart: (days?: number, productIds?: string[]) => {
    const params = new URLSearchParams();
    if (days) params.set('days', String(days));
    if (productIds?.length) params.set('productIds', productIds.join(','));
    const query = params.toString();
    return fetchAPI<Array<{ date: string; sales: number; revenue: number }>>(`/analytics/sales-chart${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  getInventoryDiscrepancy: (productIds: string[]) => {
    const params = new URLSearchParams();
    params.set('productIds', productIds.join(','));
    return fetchAPI<InventoryDiscrepancyResponse>(`/analytics/inventory-discrepancy?${params.toString()}`, undefined, 'admin');
  },

  getTopProducts: (limit?: number, period?: 'week' | 'month' | 'year') => {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set('limit', String(limit));
    if (period) searchParams.set('period', period);
    
    const query = searchParams.toString();
    return fetchAPI<Array<{ name: string; sales: number; revenue: number }>>(`/analytics/top-products${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  getOrdersBySource: (period?: 'week' | 'month') => {
    const query = period ? `?period=${period}` : '';
    return fetchAPI<Array<{ source: string; count: number; total: number }>>(`/analytics/orders-by-source${query}`, undefined, 'admin');
  },

  getOrdersByStatus: () =>
    fetchAPI<Array<{ status: string; count: number }>>('/analytics/orders-by-status', undefined, 'admin'),
};

// Customers API
export const customersAPI = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return fetchAPI<{ customers: Customer[]; pagination: any }>(`/customers${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  getById: (id: string) => fetchAPI<Customer & { recentOrders: Order[] }>(`/customers/${id}`, undefined, 'admin'),

  getTopCustomers: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchAPI<Customer[]>(`/customers/stats/top${query}`, undefined, 'admin');
  },
};

// Instagram API
export const instagramAPI = {
  getConversations: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    
    const query = searchParams.toString();
    return fetchAPI<InstagramConversation[]>(`/instagram/conversations${query ? `?${query}` : ''}`, undefined, 'admin');
  },

  getConversation: (id: string) =>
    fetchAPI<InstagramConversation & { messages: InstagramMessage[] }>(`/instagram/conversations/${id}`, undefined, 'admin'),

  sendMessage: (conversationId: string, content: string, productId?: string) =>
    fetchAPI<InstagramMessage>(`/instagram/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, productId }),
    }, 'admin'),

  takeOver: (conversationId: string) =>
    fetchAPI<InstagramConversation>(`/instagram/conversations/${conversationId}/takeover`, {
      method: 'POST',
    }, 'admin'),

  returnToBot: (conversationId: string) =>
    fetchAPI<InstagramConversation>(`/instagram/conversations/${conversationId}/return-to-bot`, {
      method: 'POST',
    }, 'admin'),

  updateStatus: (conversationId: string, status: 'ACTIVE' | 'PENDING' | 'RESOLVED') =>
    fetchAPI<InstagramConversation>(`/instagram/conversations/${conversationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, 'admin'),

  getStats: () =>
    fetchAPI<{
      activeConversations: number;
      pendingConversations: number;
      todayConversations: number;
      todayMessages: number;
      conversionRate: number;
      avgResponseTime: string;
    }>('/instagram/stats', undefined, 'admin'),

  getHealth: () =>
    fetchAPI<{
      connected: boolean;
      pageId?: string;
      pageName?: string;
      tokenValid?: boolean;
      tokenExpires?: string;
      scopes?: string[];
      error?: string;
      code?: number;
    }>('/instagram/health', undefined, 'admin'),
};

// Payments API
export const paymentsAPI = {
  checkout: (orderId: string, paymentMethod?: 'credit' | 'debit' | 'cash' | 'transfer') =>
    fetchAPI<{ paymentId: string; checkoutUrl?: string; requestId?: number; status: string; mode: string }>('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({ orderId, paymentMethod }),
    }),

  querySession: (params: { requestId?: number; paymentId?: string }) =>
    fetchAPI<{ id: string; status: string; orderId: string; orderStatus: string; getnetStatus?: string }>('/payments/getnet/query', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getStatus: (paymentId: string) =>
    fetchAPI<Payment & { order: { orderNumber: string; status: string } }>(`/payments/${paymentId}/status`),

  processManual: (data: {
    orderId: string;
    method: 'CASH' | 'CARD' | 'TRANSFER';
    amount: number;
    cardLast4?: string;
    cardBrand?: string;
  }) =>
    fetchAPI<Payment>('/payments/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  confirmManual: (paymentId: string) =>
    fetchAPI<Payment & { order: { id: string; status: string } }>(`/payments/${paymentId}/confirm`, {
      method: 'PATCH',
    }),

  refund: (paymentId: string, amount?: number, reason?: string) =>
    fetchAPI<{ message: string }>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    }),
};

// Wishlist API
export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images: string[];
    category: string;
    stock: number;
    status: string;
  };
}

export const wishlistAPI = {
  getAll: () => fetchAPI<WishlistItem[]>('/wishlist', undefined, 'customer'),

  add: (productId: string) =>
    fetchAPI<{ id: string }>(`/wishlist/${productId}`, { method: 'POST' }, 'customer'),

  remove: (productId: string) =>
    fetchAPI<{ message: string }>(`/wishlist/${productId}`, { method: 'DELETE' }, 'customer'),

  check: (productId: string) =>
    fetchAPI<{ isFavorite: boolean }>(`/wishlist/check/${productId}`, undefined, 'customer'),
};

// Presale API
export type PresaleStatus = 'PENDING' | 'NOTIFIED' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface PresaleReservation {
  id: string;
  userId: string;
  productId: string;
  status: PresaleStatus;
  notifiedAt: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images: string[];
    status: string;
    isPresale: boolean;
    presaleEndDate: string | null;
  };
}

export interface AdminPresaleReservation {
  id: string;
  userId: string;
  productId: string;
  status: PresaleStatus;
  notifiedAt: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; presaleBanned?: boolean };
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images: string[];
    presaleAvailQty: number | null;
    presaleMaxQty: number | null;
  };
}

export const presaleAPI = {
  /** Reserve a presale product (authenticated) */
  reserve: (productId: string) =>
    fetchAPI<{ reservation: PresaleReservation }>(`/presale/reserve/${productId}`, {
      method: 'POST',
    }, 'customer'),

  /** Customer self-cancel is disabled; only admins can cancel a reservation */
  cancelReservation: (productId: string) =>
    fetchAPI<{ message: string }>(`/presale/reserve/${productId}`, { method: 'DELETE' }, 'customer'),

  /** Get logged-in user's reservations */
  getMyReservations: () =>
    fetchAPI<{ reservations: PresaleReservation[] }>('/presale/my', undefined, 'customer'),

  // ── Admin ──
  adminList: (params?: { productId?: string; status?: string; page?: number; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.productId) sp.set('productId', params.productId);
    if (params?.status) sp.set('status', params.status);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return fetchAPI<{ reservations: AdminPresaleReservation[]; pagination: any }>(
      `/presale/admin/list${q ? `?${q}` : ''}`,
      undefined,
      'admin'
    );
  },

  /** Confirm product arrival → notify all PENDING reservers */
  confirmArrival: (productId: string) =>
    fetchAPI<{ message: string; notified: number }>(`/presale/admin/confirm-arrival/${productId}`, {
      method: 'POST',
    }, 'admin'),

  /** Convert presale into regular product and enable immediate sale */
  releaseForSale: (productId: string) =>
    fetchAPI<{ message: string; product: Product; releasedReservations: number }>(`/presale/admin/release-for-sale/${productId}`, {
      method: 'PATCH',
    }, 'admin'),

  /** Release expired NOTIFIED reservations → restore stock */
  releaseExpired: () =>
    fetchAPI<{ message: string; released: number }>('/presale/admin/release-expired', {
      method: 'POST',
    }, 'admin'),

  /** Manually mark a reservation as paid */
  markPaid: (reservationId: string) =>
    fetchAPI<{ reservation: AdminPresaleReservation }>(`/presale/admin/mark-paid/${reservationId}`, {
      method: 'PATCH',
    }, 'admin'),

  /** Admin: cancel a reservation, store the reason, and optionally ban the user */
  adminCancelReservation: (reservationId: string, reason: string, banUser = false) =>
    fetchAPI<{ message: string; reservation: AdminPresaleReservation }>(`/presale/admin/cancel/${reservationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reason, banUser }),
    }, 'admin'),

  /** Admin: block a user from future presales */
  blockUserAccess: (userId: string) =>
    fetchAPI<{ message: string; user: User }>(`/presale/admin/block-access/${userId}`, {
      method: 'PATCH',
    }, 'admin'),

  /** Admin: restore presale access for a blocked user */
  restoreUserAccess: (userId: string) =>
    fetchAPI<{ message: string; user: User }>(`/presale/admin/restore-access/${userId}`, {
      method: 'PATCH',
    }, 'admin'),

  /** Legacy hard delete for cleanup */
  adminDeleteReservation: (reservationId: string) =>
    fetchAPI<{ message: string }>(`/presale/admin/reservation/${reservationId}`, {
      method: 'DELETE',
    }, 'admin'),
};

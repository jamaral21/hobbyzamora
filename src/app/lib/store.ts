import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartAPI, CartItem, Product } from '../lib/api';

interface LocalCartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  name: string;
  price: number;
  image?: string;
  variant?: string;
  stock?: number;
  isPresale?: boolean;
}

interface CartState {
  items: LocalCartItem[];
  isLoading: boolean;
  
  // Actions
  addItem: (product: Product, quantity?: number, variantId?: string, variantName?: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  
  // Computed
  getSubtotal: () => number;
  getItemCount: () => number;
  
  // Sync with backend (for logged in users)
  syncWithBackend: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (product, quantity = 1, variantId, variantName) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.productId === product.id && item.variantId === (variantId || null)
          );

          if (existingIndex >= 0) {
            const newItems = [...state.items];
            const existing = newItems[existingIndex];
            const maxStock = existing.stock ?? Infinity;
            newItems[existingIndex] = {
              ...existing,
              quantity: Math.min(existing.quantity + quantity, maxStock),
            };
            return { items: newItems };
          }

          const variantData = variantId ? product.variants?.find(v => v.id === variantId) : undefined;
          const variantPrice = variantData?.price;
          const variantStock = variantData?.stock;

          return {
            items: [
              ...state.items,
              {
                id: `${product.id}-${variantId || 'default'}-${Date.now()}`,
                productId: product.id,
                variantId: variantId || null,
                quantity,
                name: product.name,
                price: variantPrice || product.price,
                image: product.images[0],
                variant: variantName,
                stock: variantStock ?? product.stock,
                isPresale: product.isPresale,
              },
            ],
          };
        });
      },

      updateQuantity: (id, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((item) => item.id !== id) };
          }
          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      syncWithBackend: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        set({ isLoading: true });
        try {
          const cart = await cartAPI.getCart();
          const items: LocalCartItem[] = cart.items.map((item: CartItem) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            name: item.product.name,
            price: item.variant?.price || item.product.price,
            image: item.product.images[0],
            variant: item.variant ? `${item.variant.name}: ${item.variant.options.join(', ')}` : undefined,
          }));
          set({ items });
        } catch (error) {
          console.error('Failed to sync cart with backend:', error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'hobbyzamora-cart',
    }
  )
);

// POS Cart Store (separate from customer cart)
interface POSCartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  image?: string;
}

interface POSCartState {
  items: POSCartItem[];
  
  addItem: (product: Product) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  
  getSubtotal: () => number;
  getTotal: () => number; // With tax
  getItemCount: () => number;
}

export const usePOSCartStore = create<POSCartState>((set, get) => ({
  items: [],

  addItem: (product) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.productId === product.id
      );

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + 1,
        };
        return { items: newItems };
      }

      return {
        items: [
          ...state.items,
          {
            id: product.id,
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            sku: product.sku,
            image: product.images[0],
          },
        ],
      };
    });
  },

  updateQuantity: (id, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.id !== id) };
      }
      return {
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
      };
    });
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  clearCart: () => {
    set({ items: [] });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getTotal: () => {
    // POS: Tax already included in displayed prices
    return get().getSubtotal();
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

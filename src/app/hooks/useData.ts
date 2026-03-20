import { useState, useEffect, useCallback } from 'react';
import {
  productsAPI,
  ordersAPI,
  inventoryAPI,
  analyticsAPI,
  customersAPI,
  instagramAPI,
  posAPI,
  Product,
  Order,
  DashboardStats,
  Customer,
  InstagramConversation,
  InventoryItem,
} from '../lib/api';

// Generic hook for data fetching
interface UseFetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  options?: { enabled?: boolean }
): UseFetchState<T> {
  const enabled = options?.enabled !== false;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    if (enabled) {
      fetch();
    }
  }, [fetch, enabled]);

  return { data, isLoading: enabled ? isLoading : true, error, refetch: fetch };
}

// Products hooks
export function useProducts(params?: {
  category?: string;
  status?: string;
  search?: string;
  presale?: boolean;
  page?: number;
  limit?: number;
}, options?: { enabled?: boolean }) {
  return useFetch(
    () => productsAPI.getAll(params).then((res) => res.products),
    [params?.category, params?.status, params?.search, params?.presale, params?.page, params?.limit],
    options
  );
}

export function useProduct(id: string | undefined) {
  return useFetch(
    () => (id ? productsAPI.getById(id) : Promise.resolve(null)),
    [id]
  );
}

export function useCategories() {
  return useFetch(() => productsAPI.getCategories(), []);
}

// Orders hooks
export function useOrders(params?: {
  status?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}, options?: { enabled?: boolean }) {
  return useFetch(
    () => ordersAPI.getAll(params).then((res) => res.orders),
    [params?.status, params?.source, params?.startDate, params?.endDate, params?.search, params?.page, params?.limit],
    options
  );
}

export function useOrder(id: string | undefined) {
  return useFetch(
    () => (id ? ordersAPI.getById(id) : Promise.resolve(null)),
    [id]
  );
}

export function useMyOrders() {
  return useFetch(() => ordersAPI.getMyOrders(), []);
}

// Inventory hooks
export function useInventory(params?: { productId?: string; lowStock?: boolean }) {
  return useFetch(
    () => inventoryAPI.getAll(params),
    [params?.productId, params?.lowStock]
  );
}

// Analytics hooks
export function useDashboardStats(options?: { enabled?: boolean }) {
  return useFetch(() => analyticsAPI.getDashboard(), [], options);
}

export function useSalesChart(days?: number, options?: { enabled?: boolean }) {
  return useFetch(() => analyticsAPI.getSalesChart(days), [days], options);
}

export function useTopProducts(limit?: number, period?: 'week' | 'month' | 'year', options?: { enabled?: boolean }) {
  return useFetch(() => analyticsAPI.getTopProducts(limit, period), [limit, period], options);
}

// Customers hooks
export function useCustomers(params?: { search?: string; page?: number; limit?: number }, options?: { enabled?: boolean }) {
  return useFetch(
    () => customersAPI.getAll(params).then((res) => res.customers),
    [params?.search, params?.page, params?.limit],
    options
  );
}

export function useCustomer(id: string | undefined) {
  return useFetch(
    () => (id ? customersAPI.getById(id) : Promise.resolve(null)),
    [id]
  );
}

// Instagram hooks
export function useInstagramConversations(params?: { status?: string; search?: string }, options?: { enabled?: boolean }) {
  return useFetch(
    () => instagramAPI.getConversations(params),
    [params?.status, params?.search],
    options
  );
}

export function useInstagramConversation(id: string | undefined) {
  return useFetch(
    () => (id ? instagramAPI.getConversation(id) : Promise.resolve(null)),
    [id]
  );
}

export function useInstagramStats() {
  return useFetch(() => instagramAPI.getStats(), []);
}

// POS hooks
export function usePOSProducts(search?: string, category?: string) {
  return useFetch(
    () => posAPI.getProducts(search, category),
    [search, category]
  );
}

export function useTodaySales() {
  return useFetch(() => posAPI.getTodaySales(), []);
}

export function usePOSRegister() {
  return useFetch(() => posAPI.getRegister(), []);
}

// Mutation hooks with loading states
interface UseMutationState<T, A extends any[]> {
  mutate: (...args: A) => Promise<T>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useMutation<T, A extends any[]>(
  mutationFn: (...args: A) => Promise<T>
): UseMutationState<T, A> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: A): Promise<T> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await mutationFn(...args);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { mutate, isLoading, error, reset };
}

// Example mutation hooks
export function useCreateOrder() {
  return useMutation(ordersAPI.create);
}

export function useUpdateOrderStatus() {
  return useMutation(ordersAPI.updateStatus);
}

export function useCreateProduct() {
  return useMutation(productsAPI.create);
}

export function useUpdateProduct() {
  return useMutation((id: string, data: Partial<Product>) => productsAPI.update(id, data));
}

export function useDeleteProduct() {
  return useMutation(productsAPI.delete);
}

export function useReceiveInventory() {
  return useMutation(inventoryAPI.receive);
}

export function useCreatePOSSale() {
  return useMutation(posAPI.createSale);
}

export function useSendInstagramMessage() {
  return useMutation(
    (conversationId: string, content: string, productId?: string) =>
      instagramAPI.sendMessage(conversationId, content, productId)
  );
}

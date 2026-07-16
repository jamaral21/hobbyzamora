import { useState, useEffect, useCallback, useRef } from 'react';
import {
  productsAPI,
  ordersAPI,
  inventoryAPI,
  analyticsAPI,
  customersAPI,
  instagramAPI,
  posAPI,
  reviewsAPI,
  Product,
  ProductSearchResult,
} from '../lib/api';

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

  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (enabled) {
      fetch();
    }
  }, [fetch, enabled]);

  return { data, isLoading: enabled ? isLoading : true, error, refetch: fetch };
}

export function useProducts(
  params?: {
    category?: string;
    status?: string;
    search?: string;
    presale?: boolean;
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean; authMode?: 'auto' | 'customer' | 'admin' }
) {
  return useFetch(
    () => productsAPI.getAll(params, options?.authMode ?? 'auto').then((res) => res.products),
    [params?.category, params?.status, params?.search, params?.presale, params?.page, params?.limit, options?.authMode],
    options
  );
}

export function useProduct(id: string | undefined) {
  return useFetch(() => (id ? productsAPI.getById(id) : Promise.resolve(null)), [id]);
}

export function useCategories() {
  return useFetch(() => productsAPI.getCategories(), []);
}

export function useStoreSections() {
  return useFetch(() => productsAPI.getSections(), []);
}

export function useOrders(
  params?: {
    status?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    productIds?: string[];
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean }
) {
  return useFetch(
    () => ordersAPI.getAll(params),
    [params?.status, params?.source, params?.startDate, params?.endDate, params?.search, params?.productIds?.join(','), params?.page, params?.limit],
    options
  );
}

export function useOrder(id: string | undefined) {
  return useFetch(() => (id ? ordersAPI.getById(id) : Promise.resolve(null)), [id]);
}

export function useMyOrders() {
  return useFetch(() => ordersAPI.getMyOrders(), []);
}

export function useInventory(params?: { productId?: string; lowStock?: boolean }) {
  return useFetch(() => inventoryAPI.getAll(params), [params?.productId, params?.lowStock]);
}

export function useDashboardStats(startDate?: string, endDate?: string, productIds?: string[], options?: { enabled?: boolean }) {
  return useFetch(
    () => analyticsAPI.getDashboard(startDate, endDate, productIds),
    [startDate, endDate, productIds?.join(',')],
    options
  );
}

export function useSalesChart(
  params?: { days?: number; startDate?: string; endDate?: string; productIds?: string[] },
  options?: { enabled?: boolean }
) {
  return useFetch(
    () => analyticsAPI.getSalesChart(params),
    [params?.days, params?.startDate, params?.endDate, params?.productIds?.join(',')],
    options
  );
}

export function useTopProducts(limit?: number, period?: 'week' | 'month' | 'year', options?: { enabled?: boolean }) {
  return useFetch(() => analyticsAPI.getTopProducts(limit, period), [limit, period], options);
}

export function useProductSearch(query: string) {
  const [options, setOptions] = useState<ProductSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const results = await productsAPI.search(query.trim(), 20);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { options, isLoading };
}

export function useInventoryDiscrepancy(productIds: string[], options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && productIds.length > 0;
  return useFetch(
    () => analyticsAPI.getInventoryDiscrepancy(productIds),
    [productIds.join(',')],
    { enabled }
  );
}

export function useCustomers(params?: { search?: string; page?: number; limit?: number }, options?: { enabled?: boolean }) {
  return useFetch(
    () => customersAPI.getAll(params).then((res) => res.customers),
    [params?.search, params?.page, params?.limit],
    options
  );
}

export function useCustomer(id: string | undefined) {
  return useFetch(() => (id ? customersAPI.getById(id) : Promise.resolve(null)), [id]);
}

export function useInstagramConversations(params?: { status?: string; search?: string }, options?: { enabled?: boolean }) {
  return useFetch(() => instagramAPI.getConversations(params), [params?.status, params?.search], options);
}

export function useInstagramConversation(id: string | undefined) {
  return useFetch(() => (id ? instagramAPI.getConversation(id) : Promise.resolve(null)), [id]);
}

export function useInstagramStats() {
  return useFetch(() => instagramAPI.getStats(), []);
}

export function useInstagramHealth() {
  return useFetch(() => instagramAPI.getHealth(), []);
}

export function useInstagramFeed() {
  return useFetch(() => instagramAPI.getFeed(), []);
}

export function useReviews(
  params?: { status?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'; limit?: number },
  options?: { enabled?: boolean; authMode?: 'public' | 'admin' }
) {
  return useFetch(
    () => reviewsAPI.getAll(params, options?.authMode ?? 'public'),
    [params?.status, params?.limit, options?.authMode],
    options
  );
}

export function usePOSProducts(search?: string, category?: string) {
  return useFetch(() => posAPI.getProducts(search, category), [search, category]);
}

export function useTodaySales() {
  return useFetch(() => posAPI.getTodaySales(), []);
}

export function usePOSRegister() {
  return useFetch(() => posAPI.getRegister(), []);
}

interface UseMutationState<T, A extends any[]> {
  mutate: (...args: A) => Promise<T>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useMutation<T, A extends any[]>(mutationFn: (...args: A) => Promise<T>): UseMutationState<T, A> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (...args: A): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await mutationFn(...args);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn]);

  const reset = useCallback(() => setError(null), []);

  return { mutate, isLoading, error, reset };
}

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
  return useMutation((conversationId: string, content: string, productId?: string) =>
    instagramAPI.sendMessage(conversationId, content, productId)
  );
}

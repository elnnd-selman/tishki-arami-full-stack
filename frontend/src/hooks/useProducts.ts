import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Product, Lookup, Paginated, PublishStatus } from '../types/api';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  status?: PublishStatus | '';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// Drops empty values so we don't send blank query params.
function clean(params: ProductListParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async (): Promise<Paginated<Product>> => {
      const res = await api.get('/products', { params: clean(params) });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Product> => {
      const res = await api.get(`/products/${id}`);
      return res.data.data;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['lookup', 'categories'],
    queryFn: async (): Promise<Lookup[]> => {
      const res = await api.get('/categories', { params: { type: 'PRODUCT', pageSize: 100, sortBy: 'name', sortDir: 'asc' } });
      return res.data.data;
    },
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['lookup', 'brands'],
    queryFn: async (): Promise<Lookup[]> => {
      const res = await api.get('/brands', { params: { pageSize: 100, sortBy: 'name', sortDir: 'asc' } });
      return res.data.data;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown): Promise<Product> => {
      const res = await api.post('/products', body);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown): Promise<Product> => {
      const res = await api.put(`/products/${id}`, body);
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.setQueryData(['product', id], data);
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ---- Image mutations ----
function patchProductCache(qc: ReturnType<typeof useQueryClient>, product: Product) {
  qc.setQueryData(['product', product.id], product);
  qc.invalidateQueries({ queryKey: ['products'] });
}

export function useUploadImages(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]): Promise<Product> => {
      const form = new FormData();
      files.forEach((f) => form.append('images', f));
      const res = await api.post(`/products/${productId}/images`, form);
      return res.data.data;
    },
    onSuccess: (p) => patchProductCache(qc, p),
  });
}

export function useReplaceImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId, file }: { imageId: string; file: File }): Promise<Product> => {
      const form = new FormData();
      form.append('image', file);
      const res = await api.put(`/products/${productId}/images/${imageId}`, form);
      return res.data.data;
    },
    onSuccess: (p) => patchProductCache(qc, p),
  });
}

export function useDeleteImage(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string): Promise<Product> => {
      const res = await api.delete(`/products/${productId}/images/${imageId}`);
      return res.data.data;
    },
    onSuccess: (p) => patchProductCache(qc, p),
  });
}

export function useSetCover(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string): Promise<Product> => {
      const res = await api.patch(`/products/${productId}/images/${imageId}/cover`);
      return res.data.data;
    },
    onSuccess: (p) => patchProductCache(qc, p),
  });
}

// ---- Variant mutations ----
export interface VariantPayload {
  sku?: string | null;
  price?: number | null;
  currency?: string;
  isActive?: boolean;
  attributes: Array<{ key: string; value: string }>;
}

export function useSaveVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      body,
    }: {
      variantId?: string;
      body: VariantPayload;
    }): Promise<Product> => {
      const res = variantId
        ? await api.put(`/products/${productId}/variants/${variantId}`, body)
        : await api.post(`/products/${productId}/variants`, body);
      return res.data.data;
    },
    onSuccess: (p) => patchProductCache(qc, p),
  });
}

export function useDeleteVariant(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string): Promise<Product> => {
      const res = await api.delete(`/products/${productId}/variants/${variantId}`);
      return res.data.data;
    },
    onSuccess: (p) => patchProductCache(qc, p),
  });
}

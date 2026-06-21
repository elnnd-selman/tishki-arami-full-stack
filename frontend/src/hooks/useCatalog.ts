import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Brand, Category, Paginated } from '../types/api';

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

function clean(params: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
}

// ---------------- Categories ----------------
export function useCategoryList(params: ListParams) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: async (): Promise<Paginated<Category>> => {
      const res = await api.get('/categories', { params: clean(params) });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useCategoryItem(id: string | undefined) {
  return useQuery({
    queryKey: ['category', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Category> => (await api.get(`/categories/${id}`)).data.data,
  });
}

export function useSaveCategory(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown): Promise<Category> => {
      const res = id ? await api.put(`/categories/${id}`, body) : await api.post('/categories', body);
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['lookup', 'categories'] });
      qc.setQueryData(['category', data.id], data);
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['lookup', 'categories'] });
    },
  });
}

export function useCategoryImage(id: string) {
  const qc = useQueryClient();
  const onSuccess = (data: Category) => {
    qc.setQueryData(['category', id], data);
    qc.invalidateQueries({ queryKey: ['categories'] });
  };
  const upload = useMutation({
    mutationFn: async (file: File): Promise<Category> => {
      const form = new FormData();
      form.append('image', file);
      return (await api.put(`/categories/${id}/image`, form)).data.data;
    },
    onSuccess,
  });
  const remove = useMutation({
    mutationFn: async (): Promise<Category> => (await api.delete(`/categories/${id}/image`)).data.data,
    onSuccess,
  });
  return { upload, remove };
}

// ---------------- Brands ----------------
export function useBrandList(params: ListParams) {
  return useQuery({
    queryKey: ['brands', params],
    queryFn: async (): Promise<Paginated<Brand>> => {
      const res = await api.get('/brands', { params: clean(params) });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useBrandItem(id: string | undefined) {
  return useQuery({
    queryKey: ['brand', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Brand> => (await api.get(`/brands/${id}`)).data.data,
  });
}

export function useSaveBrand(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown): Promise<Brand> => {
      const res = id ? await api.put(`/brands/${id}`, body) : await api.post('/brands', body);
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      qc.invalidateQueries({ queryKey: ['lookup', 'brands'] });
      qc.setQueryData(['brand', data.id], data);
    },
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/brands/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      qc.invalidateQueries({ queryKey: ['lookup', 'brands'] });
    },
  });
}

export function useBrandLogo(id: string) {
  const qc = useQueryClient();
  const onSuccess = (data: Brand) => {
    qc.setQueryData(['brand', id], data);
    qc.invalidateQueries({ queryKey: ['brands'] });
  };
  const upload = useMutation({
    mutationFn: async (file: File): Promise<Brand> => {
      const form = new FormData();
      form.append('logo', file);
      return (await api.put(`/brands/${id}/logo`, form)).data.data;
    },
    onSuccess,
  });
  const remove = useMutation({
    mutationFn: async (): Promise<Brand> => (await api.delete(`/brands/${id}/logo`)).data.data,
    onSuccess,
  });
  return { upload, remove };
}

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Blog, Brand, Category, HomeData, Paginated, Product, Project, Service } from '../types';

function clean(p: object) {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== null && v !== '') o[k] = String(v);
  return o;
}

export function useHome() {
  return useQuery({
    queryKey: ['home'],
    queryFn: async (): Promise<HomeData> => (await api.get('/home')).data.data,
  });
}

export interface ProductFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  categorySlug?: string;
  brandSlug?: string;
  sortBy?: string;
}
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async (): Promise<Paginated<Product>> => {
      const res = await api.get('/products', { params: clean(filters) });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<{ product: Product; related: Product[] }> =>
      (await api.get(`/products/${slug}`)).data.data,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => (await api.get('/categories')).data.data,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<Brand[]> => (await api.get('/brands')).data.data,
  });
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => (await api.get('/services')).data.data,
  });
}

export function useProjects(page = 1) {
  return useQuery({
    queryKey: ['projects', page],
    queryFn: async (): Promise<Paginated<Project>> => {
      const res = await api.get('/projects', { params: { page, pageSize: 12 } });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useProject(slug: string | undefined) {
  return useQuery({
    queryKey: ['project', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<Project> => (await api.get(`/projects/${slug}`)).data.data,
  });
}

export function useBlogs(page = 1) {
  return useQuery({
    queryKey: ['blogs', page],
    queryFn: async (): Promise<Paginated<Blog>> => {
      const res = await api.get('/blogs', { params: { page, pageSize: 9 } });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useBlog(slug: string | undefined) {
  return useQuery({
    queryKey: ['blog', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<Blog> => (await api.get(`/blogs/${slug}`)).data.data,
  });
}

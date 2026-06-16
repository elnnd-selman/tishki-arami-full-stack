export type LocaleKey = 'en' | 'ar' | 'ku';

export interface Translation {
  name?: string;
  title?: string;
  shortDescription?: string | null;
  description?: string | null;
  excerpt?: string | null;
  content?: string | null;
}
export type TranslationMap = Record<LocaleKey, Translation | null>;

export interface ImageUrls {
  url: string;
  webpUrl: string | null;
  thumbnailUrl: string | null;
  thumbnailWebpUrl: string | null;
}

export interface ProductImage extends ImageUrls {
  id: string;
  isCover: boolean;
  altText: string | null;
}

export interface VariantAttribute {
  id: string;
  key: string;
  value: string;
}
export interface ProductVariant {
  id: string;
  sku: string | null;
  price: number | null;
  currency: string;
  isActive: boolean;
  attributes: VariantAttribute[];
}

export interface Ref {
  id: string;
  slug: string;
  translations: TranslationMap;
}

export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  price: number | null;
  currency: string;
  isFeatured: boolean;
  category: Ref | null;
  brand: Ref | null;
  translations: TranslationMap;
  images: ProductImage[];
  coverImage: ProductImage | null;
  variants: ProductVariant[];
}

export interface Category {
  id: string;
  slug: string;
  productCount: number;
  image: ImageUrls | null;
  translations: TranslationMap;
}

export interface Brand {
  id: string;
  slug: string;
  website: string | null;
  productCount: number;
  logo: ImageUrls | null;
  translations: TranslationMap;
}

export interface Service {
  id: string;
  slug: string;
  image: ImageUrls | null;
  category: Ref | null;
  translations: TranslationMap;
}

export interface Project {
  id: string;
  slug: string;
  clientName: string | null;
  location: string | null;
  completedAt: string | null;
  isFeatured: boolean;
  translations: TranslationMap;
  images: ProductImage[];
  coverImage: ProductImage | null;
}

export interface Blog {
  id: string;
  slug: string;
  publishedAt: string | null;
  viewsCount: number;
  authorName: string | null;
  cover: ImageUrls | null;
  category: Ref | null;
  translations: TranslationMap;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface HomeData {
  featuredProducts: Product[];
  categories: Category[];
  brands: Brand[];
  services: Service[];
  projects: Project[];
  blogs: Blog[];
  stats: { products: number; categories: number; brands: number; projects: number };
}

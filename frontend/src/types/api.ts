export type LocaleKey = 'en' | 'ar' | 'ku';
export type PublishStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: { id: string; name: string };
  permissions: string[];
}

export interface Translation {
  name?: string;
  shortDescription?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export type TranslationMap = Record<LocaleKey, Translation | null>;

export interface ProductImage {
  id: string;
  url: string;
  webpUrl: string;
  thumbnailUrl: string;
  thumbnailWebpUrl: string;
  path: string;
  isCover: boolean;
  sortOrder: number;
  width: number;
  height: number;
  sizeBytes: number;
  altText: string | null;
}

export interface CategoryRef {
  id: string;
  slug: string;
  translations: TranslationMap;
}

export interface BrandRef {
  id: string;
  slug: string;
  translations: TranslationMap;
}

export interface VariantAttribute {
  id: string;
  key: string;
  value: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string | null;
  price: number | null;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  attributes: VariantAttribute[];
}

export interface Product {
  id: string;
  slug: string;
  sku: string | null;
  status: PublishStatus;
  isFeatured: boolean;
  sortOrder: number;
  price: number | null;
  currency: string;
  categoryId: string;
  brandId: string | null;
  category: CategoryRef | null;
  brand: BrandRef | null;
  translations: TranslationMap;
  images: ProductImage[];
  coverImage: ProductImage | null;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Lookup {
  id: string;
  slug: string;
  translations: TranslationMap;
}

export interface SingleImage {
  url: string;
  webpUrl: string | null;
  thumbnailUrl: string | null;
  thumbnailWebpUrl: string | null;
}

export type CategoryType = 'PRODUCT' | 'SERVICE' | 'BLOG';

export interface Category {
  id: string;
  slug: string;
  type: CategoryType;
  parentId: string | null;
  parent: { id: string; slug: string; translations: TranslationMap } | null;
  isActive: boolean;
  sortOrder: number;
  image: SingleImage | null;
  productCount: number;
  childCount: number;
  translations: TranslationMap;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  slug: string;
  website: string | null;
  isActive: boolean;
  sortOrder: number;
  logo: SingleImage | null;
  productCount: number;
  translations: TranslationMap;
  createdAt: string;
  updatedAt: string;
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

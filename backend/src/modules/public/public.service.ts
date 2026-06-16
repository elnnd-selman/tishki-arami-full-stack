import { Prisma, PublishStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { buildPageMeta, parsePagination } from '../../utils/pagination.js';
import { productInclude, serializeProduct } from '../products/product.serializer.js';
import { categoryInclude, serializeCategory } from '../categories/category.serializer.js';
import { brandInclude, serializeBrand } from '../brands/brand.serializer.js';
import {
  serviceInclude,
  serializeService,
  projectInclude,
  serializeProject,
  blogInclude,
  serializeBlog,
} from './public.serializer.js';

interface ProductQuery {
  page?: unknown;
  pageSize?: unknown;
  search?: string;
  categorySlug?: string;
  brandSlug?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  featured?: string;
}

// ---------------- Products ----------------
export async function listProducts(query: ProductQuery) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const filters: Prisma.ProductWhereInput[] = [{ status: PublishStatus.PUBLISHED }];

  if (query.categorySlug) filters.push({ category: { slug: query.categorySlug } });
  if (query.brandSlug) filters.push({ brand: { slug: query.brandSlug } });
  if (query.featured === 'true') filters.push({ isFeatured: true });
  if (query.search) {
    const s = query.search;
    filters.push({
      OR: [
        { slug: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { translations: { some: { name: { contains: s, mode: 'insensitive' } } } },
        { translations: { some: { shortDescription: { contains: s, mode: 'insensitive' } } } },
      ],
    });
  }

  const where: Prisma.ProductWhereInput = { AND: filters };
  const sortDir = query.sortDir ?? 'desc';
  let orderBy: Prisma.ProductOrderByWithRelationInput;
  switch (query.sortBy) {
    case 'price':
      orderBy = { price: sortDir };
      break;
    case 'name':
      orderBy = { slug: sortDir };
      break;
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    default:
      orderBy = { createdAt: 'desc' };
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: productInclude, orderBy, skip, take }),
  ]);
  return { items: items.map(serializeProduct), meta: buildPageMeta(page, pageSize, total) };
}

export async function getProduct(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: PublishStatus.PUBLISHED },
    include: productInclude,
  });
  if (!product) throw new NotFoundError('Product not found');

  // Related: same category, published, excluding this product.
  const related = await prisma.product.findMany({
    where: {
      status: PublishStatus.PUBLISHED,
      categoryId: product.categoryId,
      NOT: { id: product.id },
    },
    include: productInclude,
    take: 4,
    orderBy: { createdAt: 'desc' },
  });

  return { product: serializeProduct(product), related: related.map(serializeProduct) };
}

// ---------------- Categories / Brands ----------------
export async function listCategories() {
  const cats = await prisma.category.findMany({
    where: { isActive: true, type: 'PRODUCT' },
    include: categoryInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return cats.map(serializeCategory);
}

export async function listBrands() {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: brandInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return brands.map(serializeBrand);
}

// ---------------- Services ----------------
export async function listServices() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: serviceInclude,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return services.map(serializeService);
}

// ---------------- Projects ----------------
export async function listProjects(query: { page?: unknown; pageSize?: unknown }) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where: Prisma.ProjectWhereInput = { status: PublishStatus.PUBLISHED };
  const [total, items] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { completedAt: 'desc' }],
      skip,
      take,
    }),
  ]);
  return { items: items.map(serializeProject), meta: buildPageMeta(page, pageSize, total) };
}

export async function getProject(slug: string) {
  const project = await prisma.project.findFirst({
    where: { slug, status: PublishStatus.PUBLISHED },
    include: projectInclude,
  });
  if (!project) throw new NotFoundError('Project not found');
  return serializeProject(project);
}

// ---------------- Blogs ----------------
export async function listBlogs(query: { page?: unknown; pageSize?: unknown }) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where: Prisma.BlogWhereInput = { status: PublishStatus.PUBLISHED };
  const [total, items] = await Promise.all([
    prisma.blog.count({ where }),
    prisma.blog.findMany({
      where,
      include: blogInclude,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
  ]);
  return { items: items.map(serializeBlog), meta: buildPageMeta(page, pageSize, total) };
}

export async function getBlog(slug: string) {
  const blog = await prisma.blog.findFirst({
    where: { slug, status: PublishStatus.PUBLISHED },
    include: blogInclude,
  });
  if (!blog) throw new NotFoundError('Article not found');
  // Best-effort view count bump (don't fail the request if it errors).
  prisma.blog.update({ where: { id: blog.id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});
  return serializeBlog(blog);
}

// ---------------- Home aggregate ----------------
export async function getHome() {
  const [featured, latest, categories, brands, services, projects, blogs, counts] = await Promise.all([
    prisma.product.findMany({
      where: { status: PublishStatus.PUBLISHED, isFeatured: true },
      include: productInclude,
      take: 8,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { status: PublishStatus.PUBLISHED },
      include: productInclude,
      take: 8,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({
      where: { isActive: true, type: 'PRODUCT' },
      include: categoryInclude,
      take: 6,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      include: brandInclude,
      take: 12,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.service.findMany({
      where: { isActive: true },
      include: serviceInclude,
      take: 6,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.project.findMany({
      where: { status: PublishStatus.PUBLISHED },
      include: projectInclude,
      take: 3,
      orderBy: [{ isFeatured: 'desc' }, { completedAt: 'desc' }],
    }),
    prisma.blog.findMany({
      where: { status: PublishStatus.PUBLISHED },
      include: blogInclude,
      take: 3,
      orderBy: [{ publishedAt: 'desc' }],
    }),
    Promise.all([
      prisma.product.count({ where: { status: PublishStatus.PUBLISHED } }),
      prisma.category.count({ where: { isActive: true, type: 'PRODUCT' } }),
      prisma.brand.count({ where: { isActive: true } }),
      prisma.project.count({ where: { status: PublishStatus.PUBLISHED } }),
    ]),
  ]);

  return {
    featuredProducts: (featured.length ? featured : latest).map(serializeProduct),
    categories: categories.map(serializeCategory),
    brands: brands.map(serializeBrand),
    services: services.map(serializeService),
    projects: projects.map(serializeProject),
    blogs: blogs.map(serializeBlog),
    stats: {
      products: counts[0],
      categories: counts[1],
      brands: counts[2],
      projects: counts[3],
    },
  };
}

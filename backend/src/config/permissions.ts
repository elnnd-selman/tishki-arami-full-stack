// Single source of truth for every permission in the system.
// Used by: the seeder (to create Permission rows), the authorize() middleware,
// and the /auth/me response (so the frontend can hide menus/buttons).

export const PERMISSIONS = {
  // Products
  PRODUCT_VIEW: 'product.view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_UPLOAD: 'product.upload',

  // Categories
  CATEGORY_VIEW: 'category.view',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',

  // Brands
  BRAND_VIEW: 'brand.view',
  BRAND_CREATE: 'brand.create',
  BRAND_UPDATE: 'brand.update',
  BRAND_DELETE: 'brand.delete',
  BRAND_UPLOAD: 'brand.upload',

  // Projects
  PROJECT_VIEW: 'project.view',
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_UPLOAD: 'project.upload',

  // Services
  SERVICE_VIEW: 'service.view',
  SERVICE_CREATE: 'service.create',
  SERVICE_UPDATE: 'service.update',
  SERVICE_DELETE: 'service.delete',

  // Blogs
  BLOG_VIEW: 'blog.view',
  BLOG_CREATE: 'blog.create',
  BLOG_UPDATE: 'blog.update',
  BLOG_DELETE: 'blog.delete',

  // Administration
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  ROLE_VIEW: 'role.view',
  ROLE_MANAGE: 'role.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Human-readable metadata for each permission, grouped for the role editor UI.
export const PERMISSION_DEFINITIONS: Array<{
  code: PermissionCode;
  group: string;
  description: string;
}> = [
  { code: PERMISSIONS.PRODUCT_VIEW, group: 'product', description: 'View products' },
  { code: PERMISSIONS.PRODUCT_CREATE, group: 'product', description: 'Create products' },
  { code: PERMISSIONS.PRODUCT_UPDATE, group: 'product', description: 'Edit products' },
  { code: PERMISSIONS.PRODUCT_DELETE, group: 'product', description: 'Delete products' },
  { code: PERMISSIONS.PRODUCT_UPLOAD, group: 'product', description: 'Upload product images' },

  { code: PERMISSIONS.CATEGORY_VIEW, group: 'category', description: 'View categories' },
  { code: PERMISSIONS.CATEGORY_CREATE, group: 'category', description: 'Create categories' },
  { code: PERMISSIONS.CATEGORY_UPDATE, group: 'category', description: 'Edit categories' },
  { code: PERMISSIONS.CATEGORY_DELETE, group: 'category', description: 'Delete categories' },

  { code: PERMISSIONS.BRAND_VIEW, group: 'brand', description: 'View brands' },
  { code: PERMISSIONS.BRAND_CREATE, group: 'brand', description: 'Create brands' },
  { code: PERMISSIONS.BRAND_UPDATE, group: 'brand', description: 'Edit brands' },
  { code: PERMISSIONS.BRAND_DELETE, group: 'brand', description: 'Delete brands' },
  { code: PERMISSIONS.BRAND_UPLOAD, group: 'brand', description: 'Upload brand logo' },

  { code: PERMISSIONS.PROJECT_VIEW, group: 'project', description: 'View projects' },
  { code: PERMISSIONS.PROJECT_CREATE, group: 'project', description: 'Create projects' },
  { code: PERMISSIONS.PROJECT_UPDATE, group: 'project', description: 'Edit projects' },
  { code: PERMISSIONS.PROJECT_DELETE, group: 'project', description: 'Delete projects' },
  { code: PERMISSIONS.PROJECT_UPLOAD, group: 'project', description: 'Upload project images' },

  { code: PERMISSIONS.SERVICE_VIEW, group: 'service', description: 'View services' },
  { code: PERMISSIONS.SERVICE_CREATE, group: 'service', description: 'Create services' },
  { code: PERMISSIONS.SERVICE_UPDATE, group: 'service', description: 'Edit services' },
  { code: PERMISSIONS.SERVICE_DELETE, group: 'service', description: 'Delete services' },

  { code: PERMISSIONS.BLOG_VIEW, group: 'blog', description: 'View blogs' },
  { code: PERMISSIONS.BLOG_CREATE, group: 'blog', description: 'Create blogs' },
  { code: PERMISSIONS.BLOG_UPDATE, group: 'blog', description: 'Edit blogs' },
  { code: PERMISSIONS.BLOG_DELETE, group: 'blog', description: 'Delete blogs' },

  { code: PERMISSIONS.USER_VIEW, group: 'admin', description: 'View users' },
  { code: PERMISSIONS.USER_CREATE, group: 'admin', description: 'Create users' },
  { code: PERMISSIONS.USER_UPDATE, group: 'admin', description: 'Edit users' },
  { code: PERMISSIONS.USER_DELETE, group: 'admin', description: 'Delete users' },
  { code: PERMISSIONS.ROLE_VIEW, group: 'admin', description: 'View roles' },
  { code: PERMISSIONS.ROLE_MANAGE, group: 'admin', description: 'Create and edit roles' },
];

export const ALL_PERMISSION_CODES = PERMISSION_DEFINITIONS.map((p) => p.code);

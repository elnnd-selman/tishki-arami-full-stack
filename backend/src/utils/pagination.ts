// Normalizes pagination query params with safe bounds.
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): PaginationParams {
  let page = Number(query.page);
  let pageSize = Number(query.pageSize);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
  if (pageSize > 100) pageSize = 100; // hard cap to protect the DB

  page = Math.floor(page);
  pageSize = Math.floor(pageSize);

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPageMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

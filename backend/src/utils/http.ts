import type { Response } from 'express';

// Consistent success envelope so the frontend always reads the same shape.
export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function paginated(res: Response, items: unknown[], meta: PageMeta) {
  return res.status(200).json({ success: true, data: items, meta });
}

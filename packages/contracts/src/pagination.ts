import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

/** Every list endpoint accepts the same query envelope. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(60).optional(),
  direction: z.enum(['asc', 'desc']).default('asc'),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).default('ACTIVE'),
  filter: z.record(z.string(), z.string()).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PageMeta;
};

export const pageMeta = (page: number, pageSize: number, total: number): PageMeta => ({
  page,
  pageSize,
  total,
  pageCount: Math.max(1, Math.ceil(total / pageSize)),
});

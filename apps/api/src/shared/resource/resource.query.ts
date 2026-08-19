import type { Request } from 'express';
import type { listQuerySchema } from '@campus-connect/contracts';
import type { z } from 'zod';
import type { ResourceDefinition, WhereFragment } from './resource.types.js';

/**
 * Pure query construction for the resource framework: search, status, filters,
 * scope and ordering.
 *
 * Deliberately free of Prisma, the audit trail and `config/env`. Importing the
 * service to test the query shape would drag the whole runtime in with it —
 * including the environment validation that (correctly) refuses to load without
 * a DATABASE_URL.
 */

type ListQuery = z.infer<typeof listQuerySchema>;

/** Turns `a.b.c` into a nested object with `leaf` at the bottom. */
const nest = (path: string, leaf: unknown): WhereFragment =>
  path
    .split('.')
    .reduceRight<unknown>((acc, key, index, parts) => ({ [key]: index === parts.length - 1 ? leaf : acc }), leaf) as WhereFragment;

/** `?filter[departmentId]=x` and the flat `?departmentId=x` form both work. */
export const readFilters = (query: Record<string, unknown>, definition: ResourceDefinition): WhereFragment[] => {
  const nested = (query.filter ?? {}) as Record<string, string>;
  return (definition.filters ?? [])
    .map((f) => {
      const raw = nested[f.key] ?? (typeof query[f.key] === 'string' ? (query[f.key] as string) : undefined);
      return raw ? f.where(raw) : null;
    })
    .filter((w): w is WhereFragment => w !== null);
};

export const searchWhere = (definition: ResourceDefinition, search?: string): WhereFragment | null => {
  if (!search || !definition.searchFields.length) return null;
  return { OR: definition.searchFields.map((field) => nest(field, { contains: search, mode: 'insensitive' })) };
};

export const statusWhere = (definition: ResourceDefinition, status: 'ACTIVE' | 'ARCHIVED' | 'ALL'): WhereFragment | null => {
  if (definition.archivable === false || status === 'ALL') return null;
  return { status };
};

export const orderBy = (definition: ResourceDefinition, sort: string | undefined, direction: 'asc' | 'desc'): WhereFragment => {
  // An unrecognised sort column falls back to the resource default rather than
  // reaching Prisma, so `?sort=` cannot be used to probe the schema.
  const known = sort !== undefined && definition.sortFields.includes(sort);
  const field = known ? sort : definition.defaultSort;
  const dir = known ? direction : (definition.defaultDirection ?? direction);
  return nest(field, dir);
};

/**
 * The complete `where` for a list query: the caller's scope AND their search AND
 * the status filter AND any column filters. Scope is first and joined with AND,
 * so a query parameter can only ever narrow what a caller sees, never widen it.
 */
export const buildWhere = (req: Request, definition: ResourceDefinition, query: ListQuery): WhereFragment => {
  const clauses = [
    definition.scope?.(req),
    searchWhere(definition, query.search),
    statusWhere(definition, query.status),
    ...readFilters(req.query as Record<string, unknown>, definition),
  ].filter((c): c is WhereFragment => Boolean(c) && Object.keys(c as WhereFragment).length > 0);

  return clauses.length ? { AND: clauses } : {};
};

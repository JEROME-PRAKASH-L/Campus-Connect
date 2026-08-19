import type { Request } from 'express';
import { listQuerySchema, pageMeta, type Paginated } from '@campus-connect/contracts';
import { conflict, notFound } from '../errors/http-error.js';
import { parseOrThrow } from '../../middleware/validation.middleware.js';
import { recordAudit } from '../../modules/audit/audit.service.js';
import type { ResourceDefinition, ResourceRow, WhereFragment } from './resource.types.js';

/** `?filter[departmentId]=x` and the flat `?departmentId=x` form both work. */
const readFilters = (query: Record<string, unknown>, definition: ResourceDefinition): WhereFragment[] => {
  const nested = (query.filter ?? {}) as Record<string, string>;
  return (definition.filters ?? [])
    .map((f) => {
      const raw = nested[f.key] ?? (typeof query[f.key] === 'string' ? (query[f.key] as string) : undefined);
      return raw ? f.where(raw) : null;
    })
    .filter((w): w is WhereFragment => w !== null);
};

const searchWhere = (definition: ResourceDefinition, search?: string): WhereFragment | null => {
  if (!search || !definition.searchFields.length) return null;
  return {
    OR: definition.searchFields.map((field) =>
      field.includes('.')
        ? field.split('.').reduceRight<WhereFragment>((acc, key, index, parts) => (index === parts.length - 1 ? { [key]: { contains: search, mode: 'insensitive' } } : { [key]: acc }), {})
        : { [field]: { contains: search, mode: 'insensitive' } },
    ),
  };
};

const statusWhere = (definition: ResourceDefinition, status: 'ACTIVE' | 'ARCHIVED' | 'ALL'): WhereFragment | null => {
  if (definition.archivable === false || status === 'ALL') return null;
  return { status };
};

const orderBy = (definition: ResourceDefinition, sort: string | undefined, direction: 'asc' | 'desc'): WhereFragment => {
  const field = sort && definition.sortFields.includes(sort) ? sort : definition.defaultSort;
  const dir = sort && definition.sortFields.includes(sort) ? direction : (definition.defaultDirection ?? direction);
  return field.includes('.')
    ? field.split('.').reduceRight<WhereFragment>((acc, key, index, parts) => (index === parts.length - 1 ? { [key]: dir } : { [key]: acc }), {})
    : { [field]: dir };
};

export const buildWhere = (req: Request, definition: ResourceDefinition, query: ReturnType<typeof listQuerySchema.parse>): WhereFragment => {
  const clauses = [
    definition.scope?.(req),
    searchWhere(definition, query.search),
    statusWhere(definition, query.status),
    ...readFilters(req.query as Record<string, unknown>, definition),
  ].filter((c): c is WhereFragment => Boolean(c) && Object.keys(c as WhereFragment).length > 0);

  return clauses.length ? { AND: clauses } : {};
};

export const listResource = async (req: Request, definition: ResourceDefinition): Promise<Paginated<ResourceRow>> => {
  const query = parseOrThrow(listQuerySchema, req.query);
  const where = buildWhere(req, definition, query);
  const delegate = definition.delegate();

  const [rows, total] = await Promise.all([
    delegate.findMany({
      where,
      include: definition.include,
      orderBy: orderBy(definition, query.sort, query.direction),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    delegate.count({ where }),
  ]);

  return { items: rows.map(definition.serialize), meta: pageMeta(query.page, query.pageSize, total) };
};

/** Same filters as the list, no pagination — used to build the CSV export. */
export const exportResource = async (req: Request, definition: ResourceDefinition): Promise<ResourceRow[]> => {
  const query = parseOrThrow(listQuerySchema, { ...req.query, page: 1, pageSize: 1 });
  const rows = await definition.delegate().findMany({
    where: buildWhere(req, definition, query),
    include: definition.include,
    orderBy: orderBy(definition, query.sort, query.direction),
    take: 5000,
  });
  return rows.map(definition.serialize);
};

export const getResource = async (req: Request, definition: ResourceDefinition, id: string): Promise<ResourceRow> => {
  const row = await definition.delegate().findUnique({ where: { id }, include: definition.include });
  if (!row) throw notFound(`${definition.entity} not found.`);
  await definition.assertAccess?.(req, row);
  return definition.serialize(row);
};

const stamp = (req: Request, mode: 'create' | 'update'): ResourceRow =>
  mode === 'create' ? { createdById: req.user?.sub ?? null, updatedById: req.user?.sub ?? null } : { updatedById: req.user?.sub ?? null };

export const createResource = async (req: Request, definition: ResourceDefinition): Promise<ResourceRow> => {
  const input = parseOrThrow(definition.createSchema, req.body);
  const data = { ...((await definition.toCreateData?.(input, req)) ?? input), ...(definition.archivable === false ? {} : stamp(req, 'create')) };

  const row = await definition.delegate().create({ data, include: definition.include });
  const serialized = definition.serialize(row);
  await recordAudit(req, { action: 'CREATE', module: definition.module, entityType: definition.entity, entityId: row.id, newValues: serialized });
  return serialized;
};

export const updateResource = async (req: Request, definition: ResourceDefinition, id: string): Promise<ResourceRow> => {
  const delegate = definition.delegate();
  const existing = await delegate.findUnique({ where: { id }, include: definition.include });
  if (!existing) throw notFound(`${definition.entity} not found.`);
  await definition.assertAccess?.(req, existing);

  const input = parseOrThrow(definition.updateSchema, req.body);
  const data = { ...((await definition.toUpdateData?.(input, req, existing)) ?? input), ...(definition.archivable === false ? {} : stamp(req, 'update')) };

  const row = await delegate.update({ where: { id }, data, include: definition.include });
  const serialized = definition.serialize(row);
  await recordAudit(req, {
    action: 'UPDATE',
    module: definition.module,
    entityType: definition.entity,
    entityId: id,
    oldValues: definition.serialize(existing),
    newValues: serialized,
  });
  return serialized;
};

/**
 * Financial, attendance, examination and result records are never deleted. Every
 * resource here archives instead: the row stays, `status` flips and `archivedAt`
 * is stamped, so history and referential integrity both survive.
 */
export const archiveResource = async (req: Request, definition: ResourceDefinition, id: string, restore: boolean): Promise<ResourceRow> => {
  if (definition.archivable === false) throw conflict(`${definition.entity} records cannot be archived.`);

  const delegate = definition.delegate();
  const existing = await delegate.findUnique({ where: { id }, include: definition.include });
  if (!existing) throw notFound(`${definition.entity} not found.`);
  await definition.assertAccess?.(req, existing);

  if (!restore && existing.status === 'ARCHIVED') throw conflict(`That ${definition.entity.toLowerCase()} is already archived.`);
  if (restore && existing.status !== 'ARCHIVED') throw conflict(`That ${definition.entity.toLowerCase()} is not archived.`);

  const row = await delegate.update({
    where: { id },
    data: { status: restore ? 'ACTIVE' : 'ARCHIVED', archivedAt: restore ? null : new Date(), updatedById: req.user?.sub ?? null },
    include: definition.include,
  });
  const serialized = definition.serialize(row);
  await recordAudit(req, {
    action: restore ? 'RESTORE' : 'ARCHIVE',
    module: definition.module,
    entityType: definition.entity,
    entityId: id,
    oldValues: definition.serialize(existing),
    newValues: serialized,
  });
  return serialized;
};

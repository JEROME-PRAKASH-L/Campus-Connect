import type { Request } from 'express';
import { listQuerySchema, pageMeta, type Paginated } from '@campus-connect/contracts';
import { conflict, notFound } from '../errors/http-error.js';
import { parseOrThrow } from '../../middleware/validation.middleware.js';
import { recordAudit } from '../../modules/audit/audit.service.js';
import { buildWhere, orderBy } from './resource.query.js';
import type { ResourceDefinition, ResourceRow } from './resource.types.js';

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

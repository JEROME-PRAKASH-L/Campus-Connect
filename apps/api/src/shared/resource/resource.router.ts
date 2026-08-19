import { Router } from 'express';
import { requirePermission } from '../../middleware/authorization.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toCsv } from '../utils/csv.js';
import { param } from '../utils/params.js';
import { archiveResource, createResource, exportResource, getResource, listResource, updateResource } from './resource.service.js';
import type { ResourceDefinition } from './resource.types.js';

/**
 * Builds the seven endpoints every master-data resource needs. Writing these by
 * hand eighteen times would be eighteen chances to forget pagination, the audit
 * write or the department scope; here every resource gets all three for free and
 * only declares what actually differs — its schemas, its filters, its shape.
 *
 *   GET    /                list  (search, filter, sort, page, status)
 *   GET    /export          CSV of the same query
 *   GET    /:id             one record
 *   POST   /                create
 *   PATCH  /:id             update
 *   POST   /:id/archive     archive
 *   POST   /:id/restore     un-archive
 */
export const resourceRouter = (definition: ResourceDefinition): Router => {
  const router = Router();
  const read = requirePermission(definition.readPermission);
  const write = requirePermission(definition.writePermission);

  router.get(
    '/',
    read,
    asyncHandler(async (req, res) => {
      res.json(await listResource(req, definition));
    }),
  );

  router.get(
    '/export',
    read,
    asyncHandler(async (req, res) => {
      const rows = await exportResource(req, definition);
      res.setHeader('content-type', 'text/csv; charset=utf-8');
      res.setHeader('content-disposition', `attachment; filename="${definition.name}.csv"`);
      res.send(toCsv(definition.csvColumns, rows));
    }),
  );

  router.get(
    '/:id',
    read,
    asyncHandler(async (req, res) => {
      res.json({ item: await getResource(req, definition, param(req, 'id')) });
    }),
  );

  router.post(
    '/',
    write,
    asyncHandler(async (req, res) => {
      res.status(201).json({ item: await createResource(req, definition) });
    }),
  );

  router.patch(
    '/:id',
    write,
    asyncHandler(async (req, res) => {
      res.json({ item: await updateResource(req, definition, param(req, 'id')) });
    }),
  );

  router.post(
    '/:id/archive',
    write,
    asyncHandler(async (req, res) => {
      res.json({ item: await archiveResource(req, definition, param(req, 'id'), false) });
    }),
  );

  router.post(
    '/:id/restore',
    write,
    asyncHandler(async (req, res) => {
      res.json({ item: await archiveResource(req, definition, param(req, 'id'), true) });
    }),
  );

  return router;
};

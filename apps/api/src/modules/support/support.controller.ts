import type { Request, Response } from 'express';
import { can, supportRequestCreateSchema, supportRequestResolveSchema } from '@campus-connect/contracts';
import { validated } from '../../middleware/validation.middleware.js';
import { param } from '../../shared/utils/params.js';
import { recordAudit } from '../audit/audit.service.js';
import { createRequest, listRequests, resolveRequest, serializeRequest } from './support.service.js';

export const getRequests = async (req: Request, res: Response) => {
  const canResolve = can(req.user!.role, 'support:resolve');
  res.json({ scope: canResolve ? 'staff' : 'own', requests: await listRequests(req, canResolve) });
};

export const postRequest = async (req: Request, res: Response) => {
  const input = validated<typeof supportRequestCreateSchema>(req);
  const row = await createRequest(req.user!.sub, input);
  await recordAudit(req, { action: 'CREATE', module: 'support', entityType: 'SupportRequest', entityId: row.id, newValues: { kind: input.kind, subject: input.subject } });
  res.status(201).json({ request: serializeRequest(row) });
};

export const postResolution = async (req: Request, res: Response) => {
  const input = validated<typeof supportRequestResolveSchema>(req);
  const id = param(req, 'id');
  const { previous, current } = await resolveRequest(id, req.user!.sub, input);
  await recordAudit(req, {
    action: input.status === 'RESOLVED' ? 'APPROVE' : 'REJECT',
    module: 'support',
    entityType: 'SupportRequest',
    entityId: id,
    oldValues: previous,
    newValues: serializeRequest(current),
  });
  res.json({ request: serializeRequest(current) });
};

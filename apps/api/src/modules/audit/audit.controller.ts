import type { Request, Response } from 'express';
import { pageMeta } from '@campus-connect/contracts';
import { listAudits } from './audit.service.js';

export const getAuditTrail = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 25) || 25));
  const str = (key: string) => (typeof req.query[key] === 'string' && req.query[key] ? (req.query[key] as string) : undefined);

  const { entries, total } = await listAudits({
    module: str('module'),
    entityType: str('entityType'),
    entityId: str('entityId'),
    userId: str('userId'),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  res.json({ items: entries, meta: pageMeta(page, pageSize, total) });
};

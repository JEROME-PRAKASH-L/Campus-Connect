import type { Request } from 'express';
import type { SupportRequestKind, SupportRequestStatus } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { notFound } from '../../shared/errors/http-error.js';

type Row = Awaited<ReturnType<typeof prisma.supportRequest.findMany>>[number] & {
  raisedBy?: { name: string; roleLabel: string } | null;
  resolvedBy?: { name: string } | null;
};

export const serializeRequest = (row: Row) => ({
  id: row.id,
  kind: row.kind,
  subject: row.subject,
  body: row.body,
  status: row.status,
  resolution: row.resolution,
  raisedBy: row.raisedBy?.name ?? '—',
  raisedByRole: row.raisedBy?.roleLabel ?? '—',
  resolvedBy: row.resolvedBy?.name ?? null,
  resolvedAt: row.resolvedAt,
  createdAt: row.createdAt,
});

const INCLUDE = {
  raisedBy: { select: { name: true, roleLabel: true } },
  resolvedBy: { select: { name: true } },
} as const;

/**
 * Students and parents see only what they raised. Staff who may resolve see the
 * whole queue. The split is driven by the caller's role, never by a query param.
 */
export const listRequests = async (req: Request, canResolve: boolean) => {
  const rows = await prisma.supportRequest.findMany({
    where: canResolve ? {} : { raisedById: req.user!.sub },
    include: INCLUDE,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  return rows.map(serializeRequest);
};

export const createRequest = async (userId: string, input: { kind: SupportRequestKind; subject: string; body: string }) =>
  prisma.supportRequest.create({ data: { ...input, raisedById: userId }, include: INCLUDE });

export const resolveRequest = async (id: string, userId: string, input: { status: SupportRequestStatus; resolution: string }) => {
  const existing = await prisma.supportRequest.findUnique({ where: { id } });
  if (!existing) throw notFound('Support request not found.');
  const row = await prisma.supportRequest.update({
    where: { id },
    data: { status: input.status, resolution: input.resolution, resolvedById: userId, resolvedAt: new Date() },
    include: INCLUDE,
  });
  return { previous: serializeRequest(existing as Row), current: row };
};

import { feeCreateSchema, feeUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import { assertDepartmentAccess, departmentScopeFor } from '../../middleware/authorization.middleware.js';
import { conflict } from '../../shared/errors/http-error.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

/**
 * Fee assignments. A settled head of fee is frozen: once a `Payment` exists the
 * record can no longer be edited or archived, so a receipt can never be
 * invalidated by a later edit. Reversal is a finance action, not a delete.
 */
export const feeResource: ResourceDefinition = {
  name: 'fees',
  entity: 'Fee',
  module: 'fees',
  delegate: () => prisma.fee,
  createSchema: feeCreateSchema,
  updateSchema: feeUpdateSchema,
  searchFields: ['head', 'academicYear', 'student.registerNumber', 'student.user.name'],
  sortFields: ['dueDate', 'amount', 'head', 'createdAt'],
  defaultSort: 'dueDate',
  filters: [
    { key: 'studentId', where: (value) => ({ studentId: value }) },
    { key: 'categoryId', where: (value) => ({ categoryId: value }) },
    { key: 'paymentStatus', where: (value) => ({ status: value }) },
    { key: 'academicYear', where: (value) => ({ academicYear: value }) },
  ],
  include: {
    student: { select: { id: true, registerNumber: true, departmentId: true, user: { select: { name: true } } } },
    category: { select: { code: true, name: true } },
    payment: { select: { receiptNumber: true, paidOn: true, mode: true } },
  },
  readPermission: 'fee:read',
  writePermission: 'fee:write',
  scope: (req) => {
    const scope = departmentScopeFor(req);
    return scope ? { student: { departmentId: scope } } : {};
  },
  assertAccess: (req, row) => assertDepartmentAccess(req, row.student?.departmentId as string),
  toCreateData: (input) => ({ ...input, categoryId: input.categoryId || null }),
  toUpdateData: (input, _req, existing) => {
    if (existing.payment) throw conflict('That head of fee is already settled; issue a reversal instead of editing it.');
    return { ...input, ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}) };
  },
  serialize: (row) => ({
    id: row.id,
    head: row.head,
    amount: row.amount,
    paymentStatus: row.status === 'ARCHIVED' ? 'ARCHIVED' : row.status,
    // `Fee.status` is the PAID/PENDING enum; the lifecycle column is separate.
    settlement: row.payment ? 'PAID' : 'PENDING',
    dueDate: row.dueDate,
    academicYear: row.academicYear,
    studentId: row.studentId,
    student: row.student?.user?.name ?? '—',
    registerNumber: row.student?.registerNumber ?? '—',
    categoryId: row.categoryId ?? '',
    category: row.category?.name ?? '—',
    receipt: row.payment?.receiptNumber ?? null,
    paidOn: row.payment?.paidOn ?? null,
    mode: row.payment?.mode ?? null,
  }),
  csvColumns: [
    { key: 'registerNumber', label: 'Register number' },
    { key: 'student', label: 'Student' },
    { key: 'head', label: 'Head of fee' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'dueDate', label: 'Due date' },
    { key: 'settlement', label: 'Settlement' },
    { key: 'receipt', label: 'Receipt' },
    { key: 'paidOn', label: 'Paid on' },
  ],
  // The lifecycle columns exist on Fee, but archiving money is not a thing an
  // operator should do casually — the finance reversal endpoint handles it.
  archivable: false,
};

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import { listQuerySchema } from '@campus-connect/contracts';
import { buildWhere } from './resource.service.js';
import type { ResourceDefinition } from './resource.types.js';

const definition = {
  name: 'widgets',
  entity: 'Widget',
  module: 'widgets',
  delegate: () => ({}) as never,
  createSchema: listQuerySchema,
  updateSchema: listQuerySchema,
  searchFields: ['code', 'user.name'],
  sortFields: ['code'],
  defaultSort: 'code',
  filters: [{ key: 'departmentId', where: (value: string) => ({ departmentId: value }) }],
  readPermission: 'department:read',
  writePermission: 'department:write',
  serialize: (row) => row,
  csvColumns: [],
} satisfies ResourceDefinition;

const request = (query: Record<string, unknown>) => ({ query }) as unknown as Request;

describe('resource list filters', () => {
  it('is unfiltered when nothing is asked for and archiving is off', () => {
    const q = listQuerySchema.parse({ status: 'ALL' });
    assert.deepEqual(buildWhere(request({}), { ...definition, archivable: false }, q), {});
  });

  it('hides archived records by default', () => {
    const q = listQuerySchema.parse({});
    assert.deepEqual(buildWhere(request({}), definition, q), { AND: [{ status: 'ACTIVE' }] });
  });

  it('matches every search field case-insensitively, including nested ones', () => {
    const q = listQuerySchema.parse({ search: 'aarav', status: 'ALL' });
    assert.deepEqual(buildWhere(request({}), definition, q), {
      AND: [{ OR: [{ code: { contains: 'aarav', mode: 'insensitive' } }, { user: { name: { contains: 'aarav', mode: 'insensitive' } } }] }],
    });
  });

  it('accepts a filter in either the flat or the nested form', () => {
    const q = listQuerySchema.parse({ status: 'ALL' });
    assert.deepEqual(buildWhere(request({ departmentId: 'dep-1' }), definition, q), { AND: [{ departmentId: 'dep-1' }] });
    assert.deepEqual(buildWhere(request({ filter: { departmentId: 'dep-2' } }), definition, q), { AND: [{ departmentId: 'dep-2' }] });
  });

  it('ANDs the caller scope with the search so a scope can never be widened by a query', () => {
    const scoped = { ...definition, scope: () => ({ departmentId: 'own-dept' }) };
    const q = listQuerySchema.parse({ search: 'x', status: 'ALL' });
    const where = buildWhere(request({ departmentId: 'other-dept' }), scoped, q) as { AND: Record<string, unknown>[] };
    assert.deepEqual(where.AND[0], { departmentId: 'own-dept' });
    assert.equal(where.AND.length, 3);
  });

  it('rejects a page size beyond the ceiling', () => {
    assert.equal(listQuerySchema.safeParse({ pageSize: 5000 }).success, false);
  });
});

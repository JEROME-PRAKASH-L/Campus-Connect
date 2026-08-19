import type { Request } from 'express';
import type { ZodTypeAny } from 'zod';
import type { Permission } from '@campus-connect/contracts';

/**
 * Prisma generates a distinct, deeply-specific type per model delegate, and there
 * is no public union that spans them. Rather than thread eighteen generics
 * through the CRUD factory, the framework talks to a delegate through this
 * structural shape. Type safety is not lost — it is moved to the edges: each
 * resource declares Zod schemas for input and a typed `serialize` for output, so
 * everything crossing the wire is still checked.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type PrismaDelegate = {
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
  findUnique: (args: any) => Promise<any | null>;
  findFirst: (args: any) => Promise<any | null>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
};

export type WhereFragment = Record<string, any>;

export type ResourceRow = Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type ResourceFilter = {
  /** Query-string key, e.g. `departmentId`. */
  key: string;
  /** Turns the raw query value into a Prisma `where` fragment. */
  where: (value: string) => WhereFragment;
};

export type CsvColumn = { key: string; label: string };

export type ResourceDefinition = {
  /** URL segment under `/api/admin`, e.g. `departments`. */
  name: string;
  /** Human label used in error copy and the audit trail. */
  entity: string;
  /** Audit module name. */
  module: string;
  delegate: () => PrismaDelegate;

  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;

  /** String columns matched case-insensitively against `?search=`. */
  searchFields: string[];
  sortFields: string[];
  defaultSort: string;
  defaultDirection?: 'asc' | 'desc';
  filters?: ResourceFilter[];

  /** Prisma `include` applied to both list and detail reads. */
  include?: WhereFragment;

  readPermission: Permission;
  writePermission: Permission;

  /** Extra `where` clause limiting the caller to what their role may see. */
  scope?: (req: Request) => WhereFragment;
  /** Throws when the caller may not touch this particular row. */
  assertAccess?: (req: Request, row: ResourceRow) => void | Promise<void>;

  /** Maps validated input onto a Prisma `data` object. Defaults to identity. */
  toCreateData?: (input: ResourceRow, req: Request) => ResourceRow | Promise<ResourceRow>;
  toUpdateData?: (input: ResourceRow, req: Request, existing: ResourceRow) => ResourceRow | Promise<ResourceRow>;

  /** Shapes a row for the wire. */
  serialize: (row: ResourceRow) => ResourceRow;

  csvColumns: CsvColumn[];

  /** False for records that have no lifecycle columns (archive is then unavailable). */
  archivable?: boolean;
};

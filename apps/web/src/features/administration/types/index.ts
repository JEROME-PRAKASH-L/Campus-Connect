import type { ZodTypeAny } from 'zod';
import type { FilterSpec } from '@campus-connect/ui';
import type { Permission } from '@campus-connect/contracts';
import type { ColumnSpec } from '@/components/tables/ResourceTable';
import type { FieldSpec } from '@/components/forms/ResourceForm';
import type { FormOptions } from '@/hooks/useFormOptions';

export type AdminRow = { id: string; status?: string } & Record<string, unknown>;

export type AdminResource = {
  /** URL segment under `/api/admin`. */
  name: string;
  title: string;
  /** Sidebar grouping — Institution, People, Academics, Finance, Engagement. */
  group: string;
  description: string;
  readPermission: Permission;
  writePermission: Permission;
  columns: ColumnSpec<AdminRow>[];
  fields: (options: FormOptions) => FieldSpec[];
  filters?: (options: FormOptions) => FilterSpec[];
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  /** False for records that reverse rather than archive — fees, for one. */
  archivable?: boolean;
  singularLabel: string;
};

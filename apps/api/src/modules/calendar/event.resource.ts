import { eventCreateSchema, eventUpdateSchema } from '@campus-connect/contracts';
import { prisma } from '../../database/prisma.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

export const eventResource: ResourceDefinition = {
  name: 'events',
  entity: 'Event',
  module: 'calendar',
  delegate: () => prisma.event,
  createSchema: eventCreateSchema,
  updateSchema: eventUpdateSchema,
  searchFields: ['title', 'tag'],
  sortFields: ['date', 'title', 'tag'],
  defaultSort: 'date',
  filters: [{ key: 'tag', where: (value) => ({ tag: value }) }],
  readPermission: 'calendar:read',
  writePermission: 'calendar:write',
  serialize: (row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    tag: row.tag,
    tone: row.tone,
    status: row.status,
    archivedAt: row.archivedAt,
  }),
  csvColumns: [
    { key: 'date', label: 'Date' },
    { key: 'title', label: 'Event' },
    { key: 'tag', label: 'Tag' },
    { key: 'status', label: 'Status' },
  ],
};

'use client';

import { useMemo, useState } from 'react';
import { ConfirmationDialog, PermissionNotice, SuccessBanner } from '@campus-connect/ui';
import { ResourceForm } from '@/components/forms/ResourceForm';
import { ResourceTable } from '@/components/tables/ResourceTable';
import { Icon, Section, SectionHead } from '@/components/ui/primitives';
import { ICONS } from '@/lib/utilities/icons';
import { messageFrom } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { useFormOptions, type FormOptions } from '@/hooks/useFormOptions';
import { useShell } from '@/components/layout/AppShell';
import { can } from '@/config/permissions';
import type { AdminResource, AdminRow } from '../types';

type Mode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; row: AdminRow } | { kind: 'view'; row: AdminRow };

/** Prefills the edit form from the row, coercing everything to the string the inputs hold. */
const initialFrom = (resource: AdminResource, row: AdminRow, options: FormOptions): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const field of resource.fields(options)) {
    const value = row[field.key];
    if (value === null || value === undefined) continue;
    out[field.key] = field.kind === 'date' ? String(value).slice(0, 10) : String(value);
  }
  return out;
};

/**
 * One screen for one resource: table, create and edit forms, a detail view and
 * an archive confirmation. Behind every write is the same round trip — validate
 * in the browser, post, let the API validate and audit, then reload the table.
 */
export const ResourceManager = ({ resource }: { resource: AdminResource }) => {
  const { user, toast } = useShell();
  const { options } = useFormOptions();
  const list = useResource<AdminRow>(resource.name);
  const [mode, setMode] = useState<Mode>({ kind: 'closed' });
  const [confirm, setConfirm] = useState<{ row: AdminRow; restore: boolean } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [banner, setBanner] = useState('');

  const readable = can(user.role, resource.readPermission);
  const writable = can(user.role, resource.writePermission);
  const archivable = resource.archivable !== false;

  const fields = useMemo(() => resource.fields(options), [resource, options]);
  const filters = useMemo(() => resource.filters?.(options) ?? [], [resource, options]);

  if (!readable) return <PermissionNotice what={`view ${resource.title.toLowerCase()}`} />;

  const close = () => setMode({ kind: 'closed' });

  const submit = async (values: Record<string, string>) => {
    if (mode.kind === 'create') {
      await list.create(values);
      setBanner(`${resource.singularLabel.replace(/^\w/, (c) => c.toUpperCase())} created.`);
    } else if (mode.kind === 'edit') {
      await list.update(mode.row.id, values);
      setBanner(`${resource.singularLabel.replace(/^\w/, (c) => c.toUpperCase())} updated.`);
    }
    close();
  };

  const runArchive = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError('');
    try {
      if (confirm.restore) await list.restore(confirm.row.id);
      else await list.archive(confirm.row.id);
      setBanner(confirm.restore ? 'Record restored.' : 'Record archived. Nothing was deleted.');
      setConfirm(null);
    } catch (error) {
      setConfirmError(messageFrom(error));
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <>
      {banner ? <SuccessBanner message={banner} onDismiss={() => setBanner('')} /> : null}

      <ResourceTable<AdminRow>
        title={resource.title}
        description={resource.description}
        columns={resource.columns}
        data={list.data}
        loading={list.loading}
        error={list.error}
        search={list.state.search}
        onSearch={list.setSearch}
        filters={filters}
        filterValues={list.state.filters}
        onFilter={list.setFilter}
        onResetFilters={list.resetFilters}
        sort={list.state.sort}
        direction={list.state.direction}
        onSort={list.toggleSort}
        onPage={list.setPage}
        onRetry={list.reload}
        emptyTitle={`No ${resource.title.toLowerCase()} yet`}
        emptyBody={writable ? `Use “Add ${resource.singularLabel}” to enter the first record.` : 'Nothing matches your search and filters.'}
        toolbar={
          <>
            {archivable ? (
              <select
                className="input"
                aria-label="Record status"
                value={list.state.status}
                onChange={(e) => list.setStatus(e.target.value as 'ACTIVE' | 'ARCHIVED' | 'ALL')}
                style={{ width: 'auto', minWidth: 128, fontSize: 13 }}
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="ALL">All</option>
              </select>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
              onClick={() =>
                void list.exportCsv().catch((error) => toast(messageFrom(error, 'The export could not be generated.')))
              }
            >
              <Icon path={ICONS.down} size={14} />
              Export CSV
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12.5 }} onClick={() => window.print()}>
              <Icon path={ICONS.file} size={14} />
              Print
            </button>
            {writable ? (
              <button type="button" className="btn btn-primary" style={{ fontSize: 12.5 }} onClick={() => setMode({ kind: 'create' })}>
                <Icon path={ICONS.plus} size={14} />
                Add {resource.singularLabel}
              </button>
            ) : null}
          </>
        }
        actions={(row) => (
          <>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => setMode({ kind: 'view', row })}>
              View
            </button>
            {writable ? (
              <button type="button" className="btn btn-secondary" style={{ fontSize: 11.5, padding: '3px 9px' }} onClick={() => setMode({ kind: 'edit', row })}>
                Edit
              </button>
            ) : null}
            {writable && archivable ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 11.5, padding: '3px 9px' }}
                onClick={() => {
                  setConfirmError('');
                  setConfirm({ row, restore: row.status === 'ARCHIVED' });
                }}
              >
                {row.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
              </button>
            ) : null}
          </>
        )}
      />

      {mode.kind === 'create' || mode.kind === 'edit' ? (
        <Section>
          <SectionHead
            title={mode.kind === 'create' ? `New ${resource.singularLabel}` : `Edit ${resource.singularLabel}`}
            meta={mode.kind === 'edit' ? String(mode.row.id).slice(-8) : 'Not yet saved'}
            action={
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={close}>
                Close
              </button>
            }
          />
          <ResourceForm
            fields={fields}
            initial={mode.kind === 'edit' ? initialFrom(resource, mode.row, options) : undefined}
            schema={mode.kind === 'create' ? resource.createSchema : resource.updateSchema}
            submitLabel={mode.kind === 'create' ? `Create ${resource.singularLabel}` : 'Save changes'}
            onCancel={close}
            onSubmit={submit}
          />
        </Section>
      ) : null}

      {mode.kind === 'view' ? (
        <Section>
          <SectionHead
            title={`${resource.singularLabel.replace(/^\w/, (c) => c.toUpperCase())} details`}
            action={
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={close}>
                Close
              </button>
            }
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 'var(--space-3) var(--space-4)' }}>
            {Object.entries(mode.row)
              .filter(([key]) => key !== 'id')
              .map(([key, value]) => (
                <div key={key} style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: 7, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', opacity: 0.72 }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div style={{ fontSize: 14, marginTop: 2, wordBreak: 'break-word' }}>{value === null || value === '' ? '—' : String(value)}</div>
                </div>
              ))}
          </div>
        </Section>
      ) : null}

      {confirm ? (
        <ConfirmationDialog
          title={confirm.restore ? `Restore this ${resource.singularLabel}?` : `Archive this ${resource.singularLabel}?`}
          body={
            confirm.restore
              ? 'The record will become active again and reappear in the default list.'
              : 'The record is kept and stays linked to everything that references it — it is hidden from the active list and can be restored at any time. Nothing is deleted.'
          }
          confirmLabel={confirm.restore ? 'Restore' : 'Archive'}
          tone={confirm.restore ? 'accent' : 'danger'}
          busy={confirmBusy}
          error={confirmError}
          onConfirm={() => void runArchive()}
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </>
  );
};

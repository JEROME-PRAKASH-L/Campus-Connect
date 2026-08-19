'use client';

import { useMemo, type ReactNode } from 'react';
import { EmptyState, ErrorState, FilterPanel, SearchBox, Spinner, type FilterSpec } from '@campus-connect/ui';
import { Icon, Section, SectionHead, Tag } from '@/components/ui/primitives';
import { ICONS } from '@/lib/utilities/icons';
import type { ListResponse } from '@/types';

export type ColumnSpec<T> = {
  key: string;
  label: string;
  align?: 'left' | 'right';
  width?: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
};

export type ResourceTableProps<T extends { id: string; status?: string }> = {
  title: string;
  description?: string;
  columns: ColumnSpec<T>[];
  data: ListResponse<T> | null;
  loading: boolean;
  error: string;
  search: string;
  onSearch: (value: string) => void;
  filters?: FilterSpec[];
  filterValues?: Record<string, string>;
  onFilter?: (key: string, value: string) => void;
  onResetFilters?: () => void;
  sort: string;
  direction: 'asc' | 'desc';
  onSort: (key: string) => void;
  onPage: (page: number) => void;
  onRetry: () => void;
  /** Rendered at the row's right edge — view, edit, archive. */
  actions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
};

const arrow = (active: boolean, direction: 'asc' | 'desc') => (active ? (direction === 'asc' ? ' ▲' : ' ▼') : '');

/**
 * The one table every management screen uses: search, filters, sortable
 * headers, pagination, loading, empty and error states, and an actions column.
 * All of it is presentation — the query itself is run by `useResource`.
 */
export const ResourceTable = <T extends { id: string; status?: string }>({
  title,
  description,
  columns,
  data,
  loading,
  error,
  search,
  onSearch,
  filters = [],
  filterValues = {},
  onFilter,
  onResetFilters,
  sort,
  direction,
  onSort,
  onPage,
  onRetry,
  actions,
  toolbar,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'Add the first record, or widen your search and filters.',
}: ResourceTableProps<T>) => {
  const meta = data?.meta;
  const rows = data?.items ?? [];
  const showing = useMemo(() => {
    if (!meta || meta.total === 0) return '0 records';
    const from = (meta.page - 1) * meta.pageSize + 1;
    const to = Math.min(meta.total, meta.page * meta.pageSize);
    return `${from}–${to} of ${meta.total}`;
  }, [meta]);

  return (
    <Section>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <SectionHead title={title} meta={showing} />
          {description ? <div style={{ fontSize: 11.5, opacity: 0.72 }}>{description}</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <SearchBox value={search} onChange={onSearch} placeholder="Search…" />
          {toolbar}
        </div>
      </div>

      {filters.length && onFilter ? <FilterPanel filters={filters} values={filterValues} onChange={onFilter} onReset={onResetFilters} /> : null}

      {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {loading && !data ? <Spinner label="Loading records…" /> : null}

      {!error && data ? (
        rows.length === 0 ? (
          <EmptyState title={emptyTitle} body={emptyBody} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 720, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} style={{ textAlign: c.align ?? 'left', width: c.width ?? 'auto' }}>
                      {c.sortable ? (
                        <button
                          type="button"
                          onClick={() => onSort(c.key)}
                          style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', letterSpacing: 'inherit', textTransform: 'inherit' }}
                          aria-label={`Sort by ${c.label}`}
                        >
                          {c.label}
                          {arrow(sort === c.key, direction)}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                  {actions ? <th style={{ textAlign: 'right', width: '190px' }}>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} style={row.status === 'ARCHIVED' ? { opacity: 0.55 } : undefined}>
                    {columns.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align ?? 'left', verticalAlign: 'middle' }}>
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                      </td>
                    ))}
                    {actions ? (
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>{actions(row)}</span>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {meta && meta.pageCount > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--color-divider)', paddingTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, opacity: 0.72 }}>
            Page {meta.page} of {meta.pageCount}
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
              <Icon path={ICONS.arrow} size={13} style={{ transform: 'rotate(180deg)' }} />
              Previous
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} disabled={meta.page >= meta.pageCount} onClick={() => onPage(meta.page + 1)}>
              Next
              <Icon path={ICONS.arrow} size={13} />
            </button>
          </span>
        </div>
      ) : null}
    </Section>
  );
};

export const StatusTag = ({ status }: { status?: string }) => (
  <Tag kind={status === 'ARCHIVED' ? 'tag-neutral' : 'tag-accent'}>{status === 'ARCHIVED' ? 'Archived' : 'Active'}</Tag>
);

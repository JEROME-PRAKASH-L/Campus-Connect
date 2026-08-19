'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, downloadCsv, messageFrom, patch, post, query } from '@/lib/api';
import type { ListResponse } from '@/types';

export type ResourceState = {
  page: number;
  search: string;
  sort: string;
  direction: 'asc' | 'desc';
  status: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  filters: Record<string, string>;
};

const INITIAL: ResourceState = { page: 1, search: '', sort: '', direction: 'asc', status: 'ACTIVE', filters: {} };

/**
 * Drives one master-data resource: the list query and every write against it.
 *
 * Each mutation reloads the list before it resolves, which is what makes the
 * table refresh on its own after a successful create, edit or archive — the last
 * step of the data-entry workflow.
 */
export const useResource = <T extends { id: string }>(resource: string, initial: Partial<ResourceState> = {}) => {
  const [state, setState] = useState<ResourceState>({ ...INITIAL, ...initial });
  const [data, setData] = useState<ListResponse<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const path = useMemo(
    () =>
      `/api/admin/${resource}${query({
        page: state.page,
        pageSize: 20,
        search: state.search,
        sort: state.sort,
        direction: state.direction,
        status: state.status,
        ...state.filters,
      })}`,
    [resource, state],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<ListResponse<T>>(path));
      setError('');
    } catch (e) {
      setError(messageFrom(e, 'Could not load these records.'));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  const setSearch = useCallback((search: string) => setState((s) => ({ ...s, search, page: 1 })), []);
  const setPage = useCallback((page: number) => setState((s) => ({ ...s, page })), []);
  const setStatus = useCallback((status: ResourceState['status']) => setState((s) => ({ ...s, status, page: 1 })), []);
  const setFilter = useCallback((key: string, value: string) => setState((s) => ({ ...s, filters: { ...s.filters, [key]: value }, page: 1 })), []);
  const resetFilters = useCallback(() => setState((s) => ({ ...s, filters: {}, page: 1 })), []);

  const toggleSort = useCallback(
    (sort: string) => setState((s) => (s.sort === sort ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { ...s, sort, direction: 'asc' })),
    [],
  );

  const create = useCallback(
    async (values: unknown) => {
      const result = await post<{ item: T }>(`/api/admin/${resource}`, values);
      await load();
      return result.item;
    },
    [resource, load],
  );

  const update = useCallback(
    async (id: string, values: unknown) => {
      const result = await patch<{ item: T }>(`/api/admin/${resource}/${id}`, values);
      await load();
      return result.item;
    },
    [resource, load],
  );

  const archive = useCallback(
    async (id: string) => {
      await post(`/api/admin/${resource}/${id}/archive`);
      await load();
    },
    [resource, load],
  );

  const restore = useCallback(
    async (id: string) => {
      await post(`/api/admin/${resource}/${id}/restore`);
      await load();
    },
    [resource, load],
  );

  const exportCsv = useCallback(
    () =>
      downloadCsv(
        `/api/admin/${resource}/export${query({ search: state.search, sort: state.sort, direction: state.direction, status: state.status, ...state.filters })}`,
        `${resource}.csv`,
      ),
    [resource, state],
  );

  return { state, data, loading, error, reload: load, setSearch, setPage, setStatus, setFilter, resetFilters, toggleSort, create, update, archive, restore, exportCsv };
};

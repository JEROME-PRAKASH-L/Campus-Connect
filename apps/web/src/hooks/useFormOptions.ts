'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Option } from '@/types';

export type FormOptions = {
  departments: Option[];
  programmes: Option[];
  semesters: Option[];
  sections: Option[];
  subjects: Option[];
  faculty: Option[];
  students: Option[];
  feeCategories: (Option & { amount: number })[];
  companies: Option[];
};

const EMPTY: FormOptions = { departments: [], programmes: [], semesters: [], sections: [], subjects: [], faculty: [], students: [], feeCategories: [], companies: [] };

/**
 * Every select on the administration screens is fed from one call, already
 * scoped to the caller's department by the API — so an HOD's dropdowns cannot
 * even offer a record their own write would be refused for.
 */
export const useFormOptions = (): { options: FormOptions; loading: boolean } => {
  const [options, setOptions] = useState<FormOptions>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<FormOptions>('/api/admin/options')
      .then(setOptions)
      .catch(() => setOptions(EMPTY))
      .finally(() => setLoading(false));
  }, []);

  return { options, loading };
};

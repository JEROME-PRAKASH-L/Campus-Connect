'use client';

import { useEffect, useState } from 'react';
import { PageState } from '@/components/PageHeader';
import { useShell } from '@/components/AppShell';
import { fetchAttendanceOverview } from './api';
import { DepartmentAttendanceView } from './components/DepartmentAttendanceView';
import { FacultyAttendanceRegister } from './components/FacultyAttendanceRegister';
import { StudentAttendanceView } from './components/StudentAttendanceView';
import type {
  DepartmentAttendanceView as DepartmentAttendanceData,
  StudentAttendanceView as StudentAttendanceData,
} from './types';

export const AttendancePage = () => {
  const { user } = useShell();
  const [data, setData] = useState<StudentAttendanceData | DepartmentAttendanceData | null>(null);
  const [error, setError] = useState('');
  const isFaculty = user.role === 'FACULTY';

  useEffect(() => {
    if (isFaculty) return;

    fetchAttendanceOverview<StudentAttendanceData | DepartmentAttendanceData>()
      .then(setData)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Could not load attendance.'),
      );
  }, [isFaculty]);

  if (isFaculty) return <FacultyAttendanceRegister />;
  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading attendance…</PageState>;

  return data.scope === 'department' ? (
    <DepartmentAttendanceView data={data} />
  ) : (
    <StudentAttendanceView data={data} />
  );
};

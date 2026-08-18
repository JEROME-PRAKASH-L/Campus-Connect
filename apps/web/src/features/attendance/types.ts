export type AttendanceMark = 'PRESENT' | 'ABSENT' | 'ON_DUTY' | 'LEAVE';

export type StudentAttendanceView = {
  scope: 'student';
  student: { name: string; registerNumber: string; section: string };
  subjects: {
    id: string;
    code: string;
    name: string;
    shortName: string;
    kind: string;
    faculty: string;
    held: number;
    attended: number;
    percentage: number;
  }[];
  overall: { held: number; attended: number; percentage: number };
};

export type DepartmentAttendanceView = {
  scope: 'department';
  departments: {
    code: string;
    name: string;
    hodName: string;
    studentCount: number;
    facultyCount: number;
    avgAttendance: number;
  }[];
  institute: number;
};

export type FacultyAttendanceView = {
  scope: 'faculty';
  subjects: {
    id: string;
    code: string;
    name: string;
    shortName: string;
    kind: string;
    percentage: number;
    sessions: number;
  }[];
};

export type AttendanceOverview =
  | StudentAttendanceView
  | DepartmentAttendanceView
  | FacultyAttendanceView;

export type AttendanceRegister = {
  subject: { id: string; code: string; name: string };
  section: string;
  students: {
    id: string;
    name: string;
    registerNumber: string;
    cumulative: number;
    mark: AttendanceMark | null;
  }[];
};

export type AttendanceSession = {
  date: string;
  code: string;
  name: string;
  percentage: number;
};

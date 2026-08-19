import { PrismaClient, type AttendanceMark, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ACADEMIC_YEAR = '2026 – 27';
const DEMO_PASSWORD = 'demo1234';

const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering', hodName: 'Dr. Meera Rajan', facultyCount: 38, studentCount: 642, avgAttendance: 88.4, passPercentage: 94.2, block: 'A Block' },
  { code: 'ECE', name: 'Electronics & Communication', hodName: 'Dr. S. Anand', facultyCount: 29, studentCount: 511, avgAttendance: 86.1, passPercentage: 91.8, block: 'B Block' },
  { code: 'MECH', name: 'Mechanical Engineering', hodName: 'Dr. P. Ganesan', facultyCount: 26, studentCount: 468, avgAttendance: 83.7, passPercentage: 89.4, block: 'C Block' },
  { code: 'IT', name: 'Information Technology', hodName: 'Dr. Nithya Balan', facultyCount: 22, studentCount: 398, avgAttendance: 89.2, passPercentage: 95.1, block: 'A Block' },
  { code: 'CIVIL', name: 'Civil Engineering', hodName: 'Dr. R. Krishnan', facultyCount: 19, studentCount: 326, avgAttendance: 81.3, passPercentage: 87.6, block: 'D Block' },
  { code: 'MBA', name: 'School of Management', hodName: 'Dr. Fathima Zahra', facultyCount: 17, studentCount: 284, avgAttendance: 90.6, passPercentage: 96.3, block: 'E Block' },
];

const FACULTY = [
  { staffId: 'FAC1180', name: 'Prof. Kavitha Suresh', designation: 'Associate Professor', experienceYears: 11 },
  { staffId: 'FAC1024', name: 'Dr. Arun Prakash', designation: 'Professor', experienceYears: 17 },
  { staffId: 'HOD204', name: 'Dr. Meera Rajan', designation: 'Professor & Head', experienceYears: 22 },
  { staffId: 'FAC1312', name: 'Prof. Divya Nair', designation: 'Assistant Professor', experienceYears: 6 },
  { staffId: 'FAC1198', name: 'Prof. Rahul Iyer', designation: 'Assistant Professor', experienceYears: 8 },
  { staffId: 'FAC1077', name: 'Dr. Lakshmi Rao', designation: 'Associate Professor', experienceYears: 14 },
  { staffId: 'FAC1245', name: 'Dr. Vinod Shetty', designation: 'Professor', experienceYears: 19 },
  { staffId: 'FAC1401', name: 'Prof. Anjali Menon', designation: 'Assistant Professor', experienceYears: 5 },
];

const SUBJECTS = [
  { code: 'CS501', name: 'Computer Networks', shortName: 'Networks', credits: 4, room: 'A-204', kind: 'THEORY' as const, staffId: 'FAC1180', held: 52, attended: 47, ia1: 44, ia2: 41, assignment: 18, practical: null },
  { code: 'CS502', name: 'Compiler Design', shortName: 'Compiler', credits: 4, room: 'A-206', kind: 'THEORY' as const, staffId: 'FAC1024', held: 48, attended: 39, ia1: 36, ia2: 38, assignment: 16, practical: null },
  { code: 'CS503', name: 'Machine Learning', shortName: 'Mach. Learning', credits: 4, room: 'A-301', kind: 'THEORY' as const, staffId: 'HOD204', held: 50, attended: 46, ia1: 46, ia2: 45, assignment: 19, practical: null },
  { code: 'CS504', name: 'Software Engineering', shortName: 'Soft. Engg.', credits: 3, room: 'B-112', kind: 'THEORY' as const, staffId: 'FAC1312', held: 46, attended: 41, ia1: 40, ia2: 43, assignment: 19, practical: null },
  { code: 'CS505', name: 'Cryptography & Network Security', shortName: 'Cryptography', credits: 3, room: 'A-204', kind: 'THEORY' as const, staffId: 'FAC1198', held: 44, attended: 32, ia1: 31, ia2: 34, assignment: 14, practical: null },
  { code: 'CS506', name: 'Computer Networks Laboratory', shortName: 'Networks Lab', credits: 2, room: 'CN-Lab', kind: 'PRACTICAL' as const, staffId: 'FAC1180', held: 24, attended: 23, ia1: null, ia2: null, assignment: null, practical: 47 },
  { code: 'HS501', name: 'Professional Ethics & Values', shortName: 'Ethics', credits: 2, room: 'B-104', kind: 'THEORY' as const, staffId: 'FAC1077', held: 22, attended: 18, ia1: 38, ia2: 42, assignment: 17, practical: null },
];

const TIMETABLE: Record<number, string[]> = {
  1: ['CS501', 'CS503', 'CS502', 'CS504', 'CS506', 'CS506', 'HS501'],
  2: ['CS502', 'CS505', 'CS501', 'CS503', 'CS504', 'LIB', 'CS505'],
  3: ['CS503', 'CS501', 'CS504', 'CS505', 'CS506', 'CS506', 'CS502'],
  4: ['CS504', 'CS502', 'CS503', 'CS501', 'HS501', 'CS505', 'LIB'],
  5: ['CS505', 'CS504', 'CS502', 'CS506', 'CS506', 'CS503', 'CS501'],
  6: ['CS501', 'CS503', 'CS502', 'HS501', 'SPT', 'SPT', ''],
};

const PERIODS = [
  ['09:00', '09:50'],
  ['09:50', '10:40'],
  ['11:00', '11:50'],
  ['11:50', '12:40'],
  ['13:30', '14:20'],
  ['14:20', '15:10'],
  ['15:10', '16:00'],
];

const CLASSMATES = [
  'Aarav Menon', 'Diya Krishnan', 'Farhan Sheikh', 'Ishita Bose', 'Joel Mathew', 'Kavya Ramesh',
  'Manav Gupta', 'Nithya Prakash', 'Om Sundaram', 'Priya Varghese', 'Rahul Deshmukh', 'Sneha Balaji',
  'Tarun Chandrasekar', 'Vidya Nambiar', 'Yusuf Rahman', 'Zoya Fernandes',
];
const CLASS_ATTENDANCE = [86, 93, 71, 95, 88, 90, 64, 97, 82, 91, 76, 94, 68, 89, 84, 92];

const PAST_SEMESTERS = [
  {
    number: 1, gpa: 8.12, credits: 22,
    rows: ['MA101|Engineering Mathematics I|4|A', 'PH102|Engineering Physics|3|A+', 'CY103|Engineering Chemistry|3|A', 'CS104|Problem Solving & C|4|O', 'EG105|Engineering Graphics|3|B+', 'HS106|Technical English|3|A', 'CS107|C Programming Lab|2|O'],
  },
  {
    number: 2, gpa: 8.34, credits: 23,
    rows: ['MA201|Engineering Mathematics II|4|A+', 'CS202|Data Structures|4|O', 'EE203|Basic Electrical Engineering|3|A', 'CS204|Digital Principles|4|A+', 'HS205|Environmental Science|3|A', 'CS206|Data Structures Lab|2|O', 'CS207|Digital Lab|2|A+'],
  },
  {
    number: 3, gpa: 8.61, credits: 24,
    rows: ['MA301|Discrete Mathematics|4|A+', 'CS302|Object Oriented Programming|4|O', 'CS303|Computer Architecture|4|A+', 'CS304|Operating Systems|4|A', 'CS305|Database Management Systems|4|A+', 'CS306|OOP Lab|2|O', 'CS307|DBMS Lab|2|O'],
  },
  {
    number: 4, gpa: 8.48, credits: 23,
    rows: ['MA401|Probability & Statistics|4|A', 'CS402|Design & Analysis of Algorithms|4|A+', 'CS403|Theory of Computation|4|B+', 'CS404|Microprocessors|3|A', 'CS405|Web Technologies|4|O', 'CS406|Algorithms Lab|2|A+', 'CS407|Web Tech Lab|2|O'],
  },
];

const GRADE_POINTS: Record<string, number> = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5 };

const EVENTS = [
  { day: '2026-07-27', title: 'Model Examination I — schedule released', tag: 'Examination', tone: 'ACCENT' as const },
  { day: '2026-07-28', title: 'CS501 assignment submission closes', tag: 'Assignment', tone: 'WARN' as const },
  { day: '2026-08-01', title: 'Guest lecture — Edge AI, Dr. R. Sundaram', tag: 'Event', tone: 'ACCENT' as const },
  { day: '2026-08-03', title: 'Model Examination I begins', tag: 'Examination', tone: 'ACCENT' as const },
  { day: '2026-08-10', title: 'Hostel & mess fee due', tag: 'Fees', tone: 'WARN' as const },
  { day: '2026-08-15', title: 'Independence Day — institute holiday', tag: 'Holiday', tone: 'OK' as const },
  { day: '2026-08-24', title: 'Internal Assessment II begins', tag: 'Examination', tone: 'ACCENT' as const },
  { day: '2026-09-12', title: 'Cognizance ’26 — technical symposium', tag: 'Event', tone: 'ACCENT' as const },
  { day: '2026-10-20', title: 'End-semester examinations begin', tag: 'Examination', tone: 'ACCENT' as const },
];

const COMPANIES = [
  { name: 'Zoho Corporation', sector: 'Product engineering', website: 'https://www.zoho.com', contactName: 'Campus Relations', contactEmail: 'campus@example.invalid', contactPhone: '+91 44 6900 0000' },
  { name: 'Freshworks', sector: 'SaaS', website: 'https://www.freshworks.com', contactName: 'University Programmes', contactEmail: 'university@example.invalid', contactPhone: '+91 44 6100 0000' },
  { name: 'TCS Digital', sector: 'IT services', website: 'https://www.tcs.com', contactName: 'Talent Acquisition', contactEmail: 'hiring@example.invalid', contactPhone: '+91 44 6600 0000' },
  { name: 'Qualcomm India', sector: 'Semiconductors', website: 'https://www.qualcomm.com', contactName: 'Campus Hiring', contactEmail: 'campus.in@example.invalid', contactPhone: '+91 80 4000 0000' },
];

const FEE_CATEGORIES = [
  { code: 'TUITION', name: 'Tuition fee', defaultAmount: 62500, description: 'Semester tuition, payable at the start of the term.' },
  { code: 'EXAM', name: 'Examination fee', defaultAmount: 3200, description: 'End-semester examination and valuation.' },
  { code: 'HOSTEL', name: 'Hostel & mess', defaultAmount: 48000, description: 'Room, mess and utilities for resident students.' },
  { code: 'TRANSPORT', name: 'Transport', defaultAmount: 18500, description: 'College bus, route-wise.' },
  { code: 'LAB', name: 'Laboratory & library', defaultAmount: 6400, description: 'Consumables, laboratory and library access.' },
];

const DRIVES = [
  { company: 'Zoho Corporation', role: 'Member Technical Staff', ctc: '₹9.5 LPA', date: '2026-07-31', eligibility: 'CGPA ≥ 7.0, no arrears', minCgpa: 7, noArrears: true },
  { company: 'Freshworks', role: 'Software Engineer I', ctc: '₹12.0 LPA', date: '2026-08-12', eligibility: 'CGPA ≥ 8.0, no arrears', minCgpa: 8, noArrears: true },
  { company: 'TCS Digital', role: 'Systems Engineer', ctc: '₹7.2 LPA', date: '2026-08-05', eligibility: 'CGPA ≥ 6.5', minCgpa: 6.5, noArrears: false },
  { company: 'Qualcomm India', role: 'Software Intern → FTE', ctc: '₹18.0 LPA', date: '2026-08-22', eligibility: 'CGPA ≥ 8.5, no arrears', minCgpa: 8.5, noArrears: true },
];

const initials = (name: string) =>
  name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.)\s+/, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

/** Spread a target percentage across `held` sessions so the stored records reproduce it exactly. */
const marksFor = (held: number, targetPct: number): AttendanceMark[] => {
  const present = Math.round((targetPct / 100) * held);
  return Array.from({ length: held }, (_, i) => (i < present ? 'PRESENT' : 'ABSENT'));
};

const wipe = async () => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.supportRequest.deleteMany(),
    prisma.studentRemark.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.facultyFeedback.deleteMany(),
    prisma.placementRegistration.deleteMany(),
    prisma.placementDrive.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.event.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.studyMaterial.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.fee.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.resultRow.deleteMany(),
    prisma.semesterResult.deleteMany(),
    prisma.mark.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.timetableEntry.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.parent.deleteMany(),
    prisma.student.deleteMany(),
    prisma.faculty.deleteMany(),
    prisma.section.deleteMany(),
    prisma.semester.deleteMany(),
    prisma.course.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany(),
    prisma.feeCategory.deleteMany(),
    prisma.company.deleteMany(),
    prisma.storedFile.deleteMany(),
  ]);
};

async function main() {
  console.log('Clearing existing data…');
  await wipe();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('Seeding departments and courses…');
  const departments = Object.fromEntries(
    await Promise.all(DEPARTMENTS.map(async (d) => [d.code, await prisma.department.create({ data: d })] as const)),
  );

  const course = await prisma.course.create({
    data: { code: 'BE-CSE', name: 'Computer Science & Engineering', degree: 'B.E.', durationYears: 4, departmentId: departments.CSE.id },
  });
  await prisma.course.createMany({
    data: [
      { code: 'BE-ECE', name: 'Electronics & Communication', degree: 'B.E.', durationYears: 4, departmentId: departments.ECE.id },
      { code: 'BE-MECH', name: 'Mechanical Engineering', degree: 'B.E.', durationYears: 4, departmentId: departments.MECH.id },
      { code: 'BTECH-IT', name: 'Information Technology', degree: 'B.Tech', durationYears: 4, departmentId: departments.IT.id },
      { code: 'BE-CIVIL', name: 'Civil Engineering', degree: 'B.E.', durationYears: 4, departmentId: departments.CIVIL.id },
      { code: 'MBA-GEN', name: 'Business Administration', degree: 'MBA', durationYears: 2, departmentId: departments.MBA.id },
    ],
  });

  console.log('Seeding semesters and sections…');
  const semesters = await Promise.all(
    [1, 2, 3, 4, 5].map((number) =>
      prisma.semester.create({
        data: { number, label: `Semester ${number}`, academicYear: number === 5 ? ACADEMIC_YEAR : '2024 – 26', isCurrent: number === 5 },
      }),
    ),
  );
  const currentSemester = semesters.find((s) => s.number === 5)!;

  const sections = await Promise.all(
    ['A', 'B', 'C'].map((name) =>
      prisma.section.create({ data: { name, courseId: course.id, semesterId: currentSemester.id } }),
    ),
  );
  const sectionB = sections.find((s) => s.name === 'B')!;

  console.log('Seeding faculty…');
  const facultyByStaffId = new Map<string, { id: string; userId: string }>();
  for (const f of FACULTY) {
    const user = await prisma.user.create({
      data: {
        loginId: f.staffId,
        email: `${f.staffId.toLowerCase()}@dmice.edu.in`,
        passwordHash,
        name: f.name,
        role: f.staffId === 'HOD204' ? 'HOD' : 'FACULTY',
        initials: initials(f.name),
        roleLabel: f.staffId === 'HOD204' ? 'Head of Dept.' : 'Faculty',
        extra: f.staffId === 'HOD204' ? 'Professor & Head, CSE' : f.designation,
        departmentId: departments.CSE.id,
      },
    });
    const faculty = await prisma.faculty.create({
      data: {
        staffId: f.staffId,
        designation: f.designation,
        qualification: 'Ph.D. Computer Science',
        experienceYears: f.experienceYears,
        cabin: 'A Block, Room 214',
        mobile: `+91 98410 33${f.staffId.slice(-3)}`,
        joinedOn: new Date('2015-06-14'),
        userId: user.id,
        departmentId: departments.CSE.id,
      },
    });
    facultyByStaffId.set(f.staffId, { id: faculty.id, userId: user.id });
  }

  const adminUser = await prisma.user.create({
    data: {
      loginId: 'ADM001',
      email: 'adm001@dmice.edu.in',
      passwordHash,
      name: 'Dr. S. Venkatesh',
      role: 'ADMIN',
      initials: 'SV',
      roleLabel: 'Administrator',
      extra: 'Registrar',
    },
  });

  console.log('Seeding subjects, timetable and examinations…');
  const subjectByCode = new Map<string, { id: string; kind: 'THEORY' | 'PRACTICAL' }>();
  for (const s of SUBJECTS) {
    const subject = await prisma.subject.create({
      data: {
        code: s.code,
        name: s.name,
        shortName: s.shortName,
        credits: s.credits,
        room: s.room,
        kind: s.kind,
        periodsHeld: s.held,
        departmentId: departments.CSE.id,
        semesterId: currentSemester.id,
        facultyId: facultyByStaffId.get(s.staffId)!.id,
      },
    });
    subjectByCode.set(s.code, { id: subject.id, kind: s.kind });
  }

  const timetableRows: Prisma.TimetableEntryCreateManyInput[] = [];
  for (const [day, codes] of Object.entries(TIMETABLE)) {
    codes.forEach((code, index) => {
      if (!code) return;
      const subject = subjectByCode.get(code);
      const staffId = SUBJECTS.find((s) => s.code === code)?.staffId;
      timetableRows.push({
        dayOfWeek: Number(day),
        period: index + 1,
        startTime: PERIODS[index][0],
        endTime: PERIODS[index][1],
        room: subject ? SUBJECTS.find((s) => s.code === code)!.room : code === 'LIB' ? 'Library' : 'Grounds',
        label: subject ? null : code === 'LIB' ? 'Library / Mentoring' : 'Sports & Clubs',
        sectionId: sectionB.id,
        semesterId: currentSemester.id,
        subjectId: subject?.id ?? null,
        facultyId: staffId ? facultyByStaffId.get(staffId)!.id : null,
      });
    });
  }
  await prisma.timetableEntry.createMany({ data: timetableRows });

  const examSchedule = [
    { code: 'CS501', date: '2026-08-03', hall: 'Hall A-1', seat: 'A1-034' },
    { code: 'CS502', date: '2026-08-04', hall: 'Hall A-1', seat: 'A1-034' },
    { code: 'CS503', date: '2026-08-05', hall: 'Hall B-2', seat: 'B2-011' },
    { code: 'CS504', date: '2026-08-06', hall: 'Hall B-2', seat: 'B2-011' },
    { code: 'CS505', date: '2026-08-07', hall: 'Hall A-1', seat: 'A1-034' },
    { code: 'CS506', date: '2026-08-08', hall: 'CN-Lab', seat: '—' },
  ];
  await prisma.exam.createMany({
    data: examSchedule.map((e) => ({
      title: 'Model Examination I',
      date: new Date(e.date),
      session: '09:30 – 12:30',
      hall: e.hall,
      seatNo: e.seat,
      strength: 62,
      subjectId: subjectByCode.get(e.code)!.id,
    })),
  });

  console.log('Seeding students…');
  const studentIds: { id: string; userId: string; name: string; attendance: number }[] = [];
  for (const [index, name] of CLASSMATES.entries()) {
    const registerNumber = `21CSE0${String(42 + index * 3).padStart(2, '0')}`;
    const user = await prisma.user.create({
      data: {
        loginId: registerNumber,
        email: `${registerNumber.toLowerCase()}@dmice.edu.in`,
        passwordHash,
        name,
        role: 'STUDENT',
        initials: initials(name),
        roleLabel: 'Student',
        extra: 'Semester 5 · Section B',
        departmentId: departments.CSE.id,
      },
    });
    const student = await prisma.student.create({
      data: {
        registerNumber,
        batch: '2022 – 2026',
        dateOfBirth: new Date('2004-03-09'),
        bloodGroup: 'O positive',
        mobile: `+91 98407 21${String(800 + index).slice(-3)}`,
        residence: index % 3 === 0 ? 'Day scholar · Route 14' : 'Hostel · Block C',
        admissionQuota: 'Merit · Counselling',
        mentorName: 'Prof. Kavitha Suresh',
        userId: user.id,
        departmentId: departments.CSE.id,
        courseId: course.id,
        sectionId: sectionB.id,
      },
    });
    studentIds.push({ id: student.id, userId: user.id, name, attendance: CLASS_ATTENDANCE[index] });
  }
  const aarav = studentIds[0];

  const parentUser = await prisma.user.create({
    data: {
      loginId: 'PAR7042',
      email: 'par7042@dmice.edu.in',
      passwordHash,
      name: 'Ramesh Menon',
      role: 'PARENT',
      initials: 'RM',
      roleLabel: 'Parent',
      extra: 'Guardian of Aarav Menon',
    },
  });
  await prisma.parent.create({
    data: { relation: 'Father', mobile: '+91 94440 10228', userId: parentUser.id, wardId: aarav.id },
  });

  console.log('Seeding attendance registers…');
  const attendanceRows: Prisma.AttendanceRecordCreateManyInput[] = [];
  const baseDate = new Date('2026-06-01');
  for (const subjectSpec of SUBJECTS) {
    const subject = subjectByCode.get(subjectSpec.code)!;
    for (const student of studentIds) {
      // Aarav's record reproduces the subject figures exactly; classmates track their own cumulative rate.
      const target = student.id === aarav.id ? (subjectSpec.attended / subjectSpec.held) * 100 : student.attendance;
      const marks = marksFor(subjectSpec.held, target);
      marks.forEach((mark, session) => {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + session);
        attendanceRows.push({
          date,
          period: (session % 7) + 1,
          mark,
          studentId: student.id,
          subjectId: subject.id,
          markedById: facultyByStaffId.get(subjectSpec.staffId)!.userId,
        });
      });
    }
  }
  for (let i = 0; i < attendanceRows.length; i += 2000) {
    await prisma.attendanceRecord.createMany({ data: attendanceRows.slice(i, i + 2000), skipDuplicates: true });
  }

  console.log('Seeding marks and results…');
  await prisma.mark.createMany({
    data: SUBJECTS.flatMap((s) =>
      studentIds.map((student, index) => ({
        studentId: student.id,
        subjectId: subjectByCode.get(s.code)!.id,
        internal1: s.ia1 === null ? null : Math.max(20, Math.min(50, s.ia1 + (student.id === aarav.id ? 0 : ((index * 5) % 11) - 5))),
        internal2: s.ia2 === null ? null : Math.max(20, Math.min(50, s.ia2 + (student.id === aarav.id ? 0 : ((index * 7) % 11) - 5))),
        assignment: s.assignment === null ? null : Math.max(8, Math.min(20, s.assignment + (student.id === aarav.id ? 0 : ((index * 3) % 5) - 2))),
        practical: s.practical === null ? null : Math.max(30, Math.min(50, s.practical + (student.id === aarav.id ? 0 : ((index * 4) % 7) - 3))),
      })),
    ),
  });

  for (const spec of PAST_SEMESTERS) {
    const semester = semesters.find((s) => s.number === spec.number)!;
    for (const [index, student] of studentIds.entries()) {
      const drift = student.id === aarav.id ? 0 : (((index * 13) % 17) - 8) / 10;
      const result = await prisma.semesterResult.create({
        data: {
          gpa: Number(Math.min(9.8, Math.max(6.2, spec.gpa + drift)).toFixed(2)),
          credits: spec.credits,
          publishedOn: new Date(spec.number === 4 ? '2026-07-18' : '2025-12-20'),
          studentId: student.id,
          semesterId: semester.id,
        },
      });
      await prisma.resultRow.createMany({
        data: spec.rows.map((row) => {
          const [code, name, credits, grade] = row.split('|');
          return { code, name, credits: Number(credits), grade, gradePoint: GRADE_POINTS[grade] ?? 0, resultId: result.id };
        }),
      });
    }
  }

  console.log('Seeding assignments and submissions…');
  const assignmentSpecs = [
    { code: 'CS501', title: 'Subnetting & VLSM Worksheet', due: '2026-07-28', brief: 'Solve 12 subnetting problems and submit as a single PDF with working shown.', submittedCount: 41, score: null },
    { code: 'CS503', title: 'Regression on Housing Dataset', due: '2026-07-30', brief: 'Build and evaluate a linear regression model; submit notebook and a one-page report.', submittedCount: 18, score: null },
    { code: 'CS505', title: 'RSA Implementation in Python', due: '2026-08-05', brief: 'Implement key generation, encryption and decryption; include test vectors.', submittedCount: 6, score: null },
    { code: 'CS502', title: 'Lexical Analyzer in C', due: '2026-07-21', brief: 'Write a lexical analyzer for a subset of C using Lex.', submittedCount: 16, score: 18 },
    { code: 'CS504', title: 'SRS Document — Campus App', due: '2026-07-15', brief: 'Prepare an IEEE-830 style SRS for a campus utility application.', submittedCount: 16, score: 19 },
  ];

  for (const spec of assignmentSpecs) {
    const subject = SUBJECTS.find((s) => s.code === spec.code)!;
    const assignment = await prisma.assignment.create({
      data: {
        title: spec.title,
        brief: spec.brief,
        dueDate: new Date(spec.due),
        maxMarks: 20,
        subjectId: subjectByCode.get(spec.code)!.id,
        sectionId: sectionB.id,
        facultyId: facultyByStaffId.get(subject.staffId)!.id,
      },
    });
    const submittedUpTo = Math.min(studentIds.length, Math.round((spec.submittedCount / 62) * studentIds.length) || spec.submittedCount);
    await prisma.submission.createMany({
      data: studentIds.map((student, index) => {
        // Closed assignments are in from everyone; open ones fill from the back so Aarav's three stay pending.
        const hasSubmitted = spec.score !== null || index >= studentIds.length - submittedUpTo;
        const graded = spec.score !== null && hasSubmitted;
        return {
          assignmentId: assignment.id,
          studentId: student.id,
          status: graded ? ('GRADED' as const) : hasSubmitted ? ('SUBMITTED' as const) : ('PENDING' as const),
          score: graded ? Math.max(12, Math.min(20, (spec.score ?? 0) - (index % 4))) : null,
          fileCount: hasSubmitted ? 1 : 0,
          feedback: graded ? 'Well-structured submission. Cite the RFC numbers in the next one.' : '',
          submittedAt: hasSubmitted ? new Date(spec.due) : null,
        };
      }),
    });
  }

  console.log('Seeding materials, fees, leave and notifications…');
  const materialSpecs = [
    { code: 'CS501', title: 'Unit III — Network Layer & Routing', kind: 'PDF' as const, size: '4.2 MB', staffId: 'FAC1180', downloads: 214 },
    { code: 'CS501', title: 'Wireshark Lab Handout', kind: 'PDF' as const, size: '1.1 MB', staffId: 'FAC1180', downloads: 186 },
    { code: 'CS503', title: 'Gradient Descent — Slide Deck', kind: 'PPTX' as const, size: '8.6 MB', staffId: 'HOD204', downloads: 301 },
    { code: 'CS502', title: 'Syntax Analysis — Solved Problems', kind: 'PDF' as const, size: '2.8 MB', staffId: 'FAC1024', downloads: 158 },
    { code: 'CS504', title: 'Agile Estimation Case Study', kind: 'DOCX' as const, size: '640 KB', staffId: 'FAC1312', downloads: 97 },
    { code: 'CS505', title: 'Number Theory Primer', kind: 'PDF' as const, size: '1.9 MB', staffId: 'FAC1198', downloads: 143 },
  ];
  await prisma.studyMaterial.createMany({
    data: materialSpecs.map((m) => ({
      title: m.title,
      kind: m.kind,
      size: m.size,
      downloads: m.downloads,
      subjectId: subjectByCode.get(m.code)!.id,
      uploadedById: facultyByStaffId.get(m.staffId)!.userId,
    })),
  });

  const feeSpecs = [
    { head: 'Tuition Fee — 2026/27', amount: 92500, status: 'PAID' as const, due: '2026-06-12', mode: 'Net Banking', receipt: 'RCT-2026-0442' },
    { head: 'Examination Fee — Semester 5', amount: 4200, status: 'PAID' as const, due: '2026-07-02', mode: 'UPI', receipt: 'RCT-2026-0781' },
    { head: 'Hostel & Mess — Term 1', amount: 48000, status: 'PENDING' as const, due: '2026-08-10', mode: '', receipt: '' },
    { head: 'Transport — Route 14', amount: 18500, status: 'PAID' as const, due: '2026-06-20', mode: 'UPI', receipt: 'RCT-2026-0553' },
    { head: 'Library & Laboratory', amount: 6000, status: 'PAID' as const, due: '2026-06-12', mode: 'Net Banking', receipt: 'RCT-2026-0443' },
  ];
  for (const [studentIndex, student] of studentIds.entries()) {
    for (const [feeIndex, spec] of feeSpecs.entries()) {
      // Every seventh student (Aarav included) carries an outstanding hostel balance, matching the design's defaulter rate.
      const status = spec.status === 'PENDING' ? (studentIndex % 7 === 0 ? ('PENDING' as const) : ('PAID' as const)) : spec.status;
      const fee = await prisma.fee.create({
        data: {
          head: spec.head,
          amount: spec.amount,
          status,
          dueDate: new Date(spec.due),
          academicYear: ACADEMIC_YEAR,
          studentId: student.id,
        },
      });
      if (status === 'PAID') {
        await prisma.payment.create({
          data: {
            feeId: fee.id,
            receiptNumber: student.id === aarav.id ? spec.receipt : `RCT-2026-${1000 + studentIndex * 10 + feeIndex}`,
            amount: spec.amount,
            mode: spec.mode || 'UPI',
            paidOn: new Date(spec.due),
            referenceName: student.name,
          },
        });
      }
    }
  }

  const leaveSpecs = [
    { student: 'Aarav Menon', type: 'MEDICAL' as const, from: '2026-06-12', to: '2026-06-13', reason: 'Viral fever — medical certificate attached.', status: 'APPROVED' as const, by: 'FAC1180' },
    { student: 'Aarav Menon', type: 'ON_DUTY' as const, from: '2026-07-04', to: '2026-07-04', reason: 'Inter-college hackathon at Vellore.', status: 'APPROVED' as const, by: 'HOD204' },
    { student: 'Aarav Menon', type: 'CASUAL' as const, from: '2026-07-29', to: '2026-07-29', reason: 'Sibling wedding at Kochi.', status: 'PENDING' as const, by: null },
    { student: 'Farhan Sheikh', type: 'MEDICAL' as const, from: '2026-07-27', to: '2026-07-29', reason: 'Dengue — hospitalised, report attached.', status: 'PENDING' as const, by: null },
    { student: 'Kavya Ramesh', type: 'ON_DUTY' as const, from: '2026-07-31', to: '2026-08-01', reason: 'State-level basketball selection.', status: 'PENDING' as const, by: null },
    { student: 'Manav Gupta', type: 'CASUAL' as const, from: '2026-08-03', to: '2026-08-03', reason: 'Passport verification appointment.', status: 'PENDING' as const, by: null },
  ];
  await prisma.leaveRequest.createMany({
    data: leaveSpecs.map((l) => {
      const from = new Date(l.from);
      const to = new Date(l.to);
      return {
        type: l.type,
        fromDate: from,
        toDate: to,
        days: Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1,
        reason: l.reason,
        status: l.status,
        studentId: studentIds.find((s) => s.name === l.student)!.id,
        decidedById: l.by ? facultyByStaffId.get(l.by)!.userId : null,
      };
    }),
  });

  const notificationSpecs = [
    { kind: 'ATTENDANCE' as const, title: 'Attendance shortage — CS505', body: 'Cryptography & Network Security is at 72.7%. Minimum required is 75%.', tone: 'BAD' as const, route: 'attendance', read: false },
    { kind: 'ASSIGNMENT' as const, title: 'New assignment posted — CS503', body: 'Regression on Housing Dataset, due 30 Jul 2026.', tone: 'ACCENT' as const, route: 'assignments', read: false },
    { kind: 'DEADLINE' as const, title: 'Submission due tomorrow — CS501', body: 'Subnetting & VLSM Worksheet closes 28 Jul, 23:59.', tone: 'WARN' as const, route: 'assignments', read: false },
    { kind: 'EXAMINATION' as const, title: 'Model Examination I timetable published', body: 'Model exams run 03 Aug – 08 Aug. Hall tickets available.', tone: 'ACCENT' as const, route: 'examinations', read: false },
    { kind: 'FEES' as const, title: 'Hostel fee reminder', body: '₹48,000 payable by 10 Aug 2026 to avoid a late fee.', tone: 'WARN' as const, route: 'fees', read: true },
    { kind: 'LEAVE' as const, title: 'Leave approved — On Duty, 04 Jul', body: 'Approved by Dr. Meera Rajan.', tone: 'OK' as const, route: 'leave', read: true },
    { kind: 'RESULTS' as const, title: 'Semester 4 results published', body: 'GPA 8.48 · CGPA 8.39. No arrears.', tone: 'OK' as const, route: 'results', read: true },
    { kind: 'ANNOUNCEMENT' as const, title: 'Cognizance ’26 registrations open', body: 'Annual technical symposium, 12 Sep. Register before 20 Aug.', tone: 'ACCENT' as const, route: 'notifications', read: true },
  ];
  const allUsers = await prisma.user.findMany();
  await prisma.notification.createMany({
    data: allUsers.flatMap((user) =>
      notificationSpecs
        .filter((n) => {
          if (user.role === 'STUDENT' || user.role === 'PARENT') return true;
          return ['EXAMINATION', 'ANNOUNCEMENT', 'LEAVE', 'RESULTS'].includes(n.kind);
        })
        .map((n, index) => ({
          ...n,
          recipientId: user.id,
          createdAt: new Date(Date.now() - index * 6 * 3_600_000),
        })),
    ),
  });

  console.log('Seeding calendar, certificates and placement…');
  await prisma.event.createMany({
    data: EVENTS.map((e) => ({ title: e.title, date: new Date(e.day), tag: e.tag, tone: e.tone })),
  });

  await prisma.certificate.createMany({
    data: [
      { title: 'Bonafide Certificate', reference: 'BON/2026/1184', issuedOn: new Date('2026-07-14'), status: 'Issued', studentId: aarav.id },
      { title: 'Semester 4 Grade Sheet', reference: 'GS/S4/21CSE042', issuedOn: new Date('2026-07-18'), status: 'Issued', studentId: aarav.id },
      { title: 'Course Completion — NPTEL Deep Learning', reference: 'NPTEL26CS88', issuedOn: new Date('2026-05-02'), status: 'Issued', studentId: aarav.id },
      { title: 'Transfer Certificate', reference: '—', issuedOn: null, status: 'Not applicable', studentId: aarav.id },
    ],
  });

  const companies = Object.fromEntries(
    await Promise.all(
      COMPANIES.map(async (c) => [c.name, await prisma.company.create({ data: c })] as const),
    ),
  );

  const drives = await Promise.all(
    DRIVES.map((d) =>
      prisma.placementDrive.create({
        data: {
          company: d.company,
          companyId: companies[d.company]?.id ?? null,
          role: d.role,
          ctc: d.ctc,
          driveDate: new Date(d.date),
          eligibility: d.eligibility,
          minCgpa: d.minCgpa,
          noArrears: d.noArrears,
        },
      }),
    ),
  );
  await prisma.placementRegistration.create({ data: { driveId: drives[0].id, studentId: aarav.id } });

  console.log('Seeding institution profile, fee categories and allocations…');
  await prisma.setting.create({
    data: {
      key: 'institution.profile',
      scope: 'INSTITUTION',
      value: {
        name: 'DMI College of Engineering',
        shortName: 'DMI',
        affiliation: 'Affiliated to Anna University, Chennai',
        addressLine1: 'Palanchur, Nazarethpet Post',
        addressLine2: 'Chennai – Bangalore Highway',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600123',
        phone: '+91 44 2745 1234',
        email: 'office@example.invalid',
        website: 'https://www.example.invalid',
        logoFileId: '',
      },
    },
  });

  await prisma.feeCategory.createMany({
    data: FEE_CATEGORIES.map((c) => ({ ...c, academicYear: ACADEMIC_YEAR })),
  });

  // The HOD account heads CSE; the class adviser for 5-B is the section's own faculty.
  const hodUser = await prisma.user.findUnique({ where: { loginId: 'HOD204' } });
  if (hodUser) await prisma.department.update({ where: { id: departments.CSE.id }, data: { hodUserId: hodUser.id } });

  const adviser = await prisma.faculty.findUnique({ where: { staffId: 'FAC1180' } });
  if (adviser) await prisma.section.update({ where: { id: sectionB.id }, data: { advisorFacultyId: adviser.id } });

  console.log('\nSeed complete. Demo accounts (password: demo1234):');
  console.table([
    { role: 'Student', loginId: '21CSE042', name: 'Aarav Menon' },
    { role: 'Faculty', loginId: 'FAC1180', name: 'Prof. Kavitha Suresh' },
    { role: 'HOD', loginId: 'HOD204', name: 'Dr. Meera Rajan' },
    { role: 'Admin', loginId: adminUser.loginId, name: adminUser.name },
    { role: 'Parent', loginId: 'PAR7042', name: 'Ramesh Menon' },
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

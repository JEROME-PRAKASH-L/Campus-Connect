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

const EVENTS = [
  { day: '2026-08-03', title: 'Semester classes commence', tag: 'Academic', tone: 'ACCENT' as const },
  { day: '2026-08-05', title: 'TCS Digital campus drive', tag: 'Placement', tone: 'OK' as const },
  { day: '2026-08-10', title: 'Internal Assessment I begins', tag: 'Examination', tone: 'WARN' as const },
  { day: '2026-08-15', title: 'Independence Day', tag: 'Holiday', tone: 'ACCENT' as const },
  { day: '2026-08-22', title: 'Qualcomm India campus drive', tag: 'Placement', tone: 'OK' as const },
];

const DRIVES = [
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
      email: 'administrator@dmice.edu.in',
      passwordHash,
      name: 'Dr. S. Venkatesh',
      role: 'ADMIN',
      initials: 'SV',
      roleLabel: 'Administrator',
      extra: 'Principal & Campus Administrator',
    },
  });

  console.log('Seeding students and parents…');
  const studentIds: { id: string; userId: string; attendance: number }[] = [];
  let aarav!: { id: string; userId: string };
  for (const [index, name] of CLASSMATES.entries()) {
    const registerNumber = index === 0 ? '21CSE042' : `21CSE${String(43 + index).padStart(3, '0')}`;
    const user = await prisma.user.create({
      data: {
        loginId: registerNumber,
        email: `${registerNumber.toLowerCase()}@dmice.edu.in`,
        passwordHash,
        name,
        role: 'STUDENT',
        initials: initials(name),
        roleLabel: 'Student',
        extra: `B.E. CSE · Semester 5 · Section B`,
        departmentId: departments.CSE.id,
      },
    });
    const student = await prisma.student.create({
      data: {
        registerNumber,
        batch: '2024 – 2028',
        dateOfBirth: new Date(index === 0 ? '2006-09-14' : `2006-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 25) + 1).padStart(2, '0')}`),
        bloodGroup: ['B+', 'O+', 'A+', 'AB+'][index % 4],
        mobile: `+91 98765 ${String(42000 + index)}`,
        residence: index % 3 === 0 ? 'College Hostel' : 'Day Scholar',
        admissionQuota: index % 5 === 0 ? 'Management' : 'Government',
        mentorName: 'Prof. Kavitha Suresh',
        userId: user.id,
        departmentId: departments.CSE.id,
        courseId: course.id,
        sectionId: sectionB.id,
      },
    });
    studentIds.push({ id: student.id, userId: user.id, attendance: CLASS_ATTENDANCE[index] });
    if (index === 0) aarav = { id: student.id, userId: user.id };
  }

  const parentUser = await prisma.user.create({
    data: {
      loginId: 'PAR7042',
      email: 'ramesh.menon@example.com',
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
    await prisma.attendanceRecord.createMany({ data: attendanceRows.slice(i, i + 2000) });
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
      const result = await prisma.semesterResult.create({
        data: {
          gpa: student.id === aarav.id ? spec.gpa : Math.max(6.1, Math.min(9.7, spec.gpa + ((index % 7) - 3) * 0.17)),
          credits: spec.credits,
          publishedOn: new Date(`2026-0${spec.number + 1}-15`),
          arrears: index % 8 === 6 ? 1 : 0,
          studentId: student.id,
          semesterId: semester.id,
        },
      });
      await prisma.resultRow.createMany({
        data: spec.rows.map((row) => {
          const [code, name, credits, grade] = row.split('|');
          const points: Record<string, number> = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, RA: 0 };
          return { code, name, credits: Number(credits), grade, gradePoint: points[grade], resultId: result.id };
        }),
      });
    }
  }

  console.log('Seeding subjects, timetable and academic activity…');
  const subjectByCode = new Map<string, { id: string }>();
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
    subjectByCode.set(s.code, subject);
  }

  for (const [dayText, codes] of Object.entries(TIMETABLE)) {
    const dayOfWeek = Number(dayText);
    for (const [index, code] of codes.entries()) {
      if (!code) continue;
      const subjectSpec = SUBJECTS.find((s) => s.code === code);
      await prisma.timetableEntry.create({
        data: {
          dayOfWeek,
          period: index + 1,
          startTime: PERIODS[index][0],
          endTime: PERIODS[index][1],
          room: subjectSpec?.room ?? '—',
          label: subjectSpec ? null : code,
          sectionId: sectionB.id,
          semesterId: currentSemester.id,
          subjectId: subjectSpec ? subjectByCode.get(code)!.id : null,
          facultyId: subjectSpec ? facultyByStaffId.get(subjectSpec.staffId)!.id : null,
        },
      });
    }
  }

  const assignments = await Promise.all([
    prisma.assignment.create({ data: { title: 'Subnetting Design Exercise', brief: 'Design an IPv4 subnet plan for six departments and justify the address allocation.', dueDate: new Date('2026-08-08'), maxMarks: 20, subjectId: subjectByCode.get('CS501')!.id, sectionId: sectionB.id, facultyId: facultyByStaffId.get('FAC1180')!.id } }),
    prisma.assignment.create({ data: { title: 'Lexical Analyser Implementation', brief: 'Implement a lexical analyser for the specified token set and submit source code with output.', dueDate: new Date('2026-08-14'), maxMarks: 20, subjectId: subjectByCode.get('CS502')!.id, sectionId: sectionB.id, facultyId: facultyByStaffId.get('FAC1024')!.id } }),
    prisma.assignment.create({ data: { title: 'Classification Model Report', brief: 'Train and compare two classification algorithms using the supplied student-performance dataset.', dueDate: new Date('2026-08-18'), maxMarks: 20, subjectId: subjectByCode.get('CS503')!.id, sectionId: sectionB.id, facultyId: facultyByStaffId.get('HOD204')!.id } }),
  ]);

  for (const assignment of assignments) {
    await prisma.submission.createMany({
      data: studentIds.map((student, index) => ({
        assignmentId: assignment.id,
        studentId: student.id,
        status: index % 4 === 0 ? 'PENDING' : index % 3 === 0 ? 'GRADED' : 'SUBMITTED',
        score: index % 3 === 0 ? 14 + (index % 7) : null,
        fileCount: index % 4 === 0 ? 0 : 1,
        note: index % 4 === 0 ? '' : 'Submitted through the portal.',
        feedback: index % 3 === 0 ? 'Good work. Review the marked comments.' : '',
        submittedAt: index % 4 === 0 ? null : new Date('2026-08-02'),
      })),
    });
  }

  await prisma.exam.createMany({
    data: SUBJECTS.slice(0, 5).map((s, index) => ({
      title: index < 2 ? 'Internal Assessment I' : 'Model Examination',
      date: new Date(`2026-08-${String(10 + index).padStart(2, '0')}`),
      session: index % 2 === 0 ? 'FN · 10:00 AM' : 'AN · 2:00 PM',
      hall: `A-${201 + index}`,
      seatNo: `A${String(42 + index).padStart(3, '0')}`,
      strength: 60,
      subjectId: subjectByCode.get(s.code)!.id,
    })),
  });

  const feeHeads = [
    { head: 'Tuition Fee', amount: 75000, status: 'PAID' as const, dueDate: '2026-07-10' },
    { head: 'Examination Fee', amount: 2250, status: 'PAID' as const, dueDate: '2026-07-25' },
    { head: 'Hostel Fee', amount: 48000, status: 'PENDING' as const, dueDate: '2026-08-15' },
    { head: 'Transport Fee', amount: 18000, status: 'PENDING' as const, dueDate: '2026-08-20' },
  ];
  for (const student of studentIds) {
    for (const fee of feeHeads) {
      const created = await prisma.fee.create({
        data: { ...fee, dueDate: new Date(fee.dueDate), academicYear: ACADEMIC_YEAR, studentId: student.id },
      });
      if (fee.status === 'PAID') {
        await prisma.payment.create({
          data: {
            receiptNumber: `DMICE/${created.id.slice(-8).toUpperCase()}`,
            amount: fee.amount,
            mode: student.id === aarav.id ? 'UPI' : 'Online',
            paidOn: new Date('2026-07-08'),
            referenceName: student.id === aarav.id ? 'Ramesh Menon' : '',
            feeId: created.id,
          },
        });
      }
    }
  }

  await prisma.leaveRequest.createMany({
    data: [
      { type: 'MEDICAL', fromDate: new Date('2026-07-10'), toDate: new Date('2026-07-11'), days: 2, reason: 'Fever and medical consultation', status: 'APPROVED', studentId: aarav.id, decidedById: facultyByStaffId.get('HOD204')!.userId },
      { type: 'ON_DUTY', fromDate: new Date('2026-07-22'), toDate: new Date('2026-07-22'), days: 1, reason: 'Inter-college coding competition', status: 'APPROVED', studentId: aarav.id, decidedById: facultyByStaffId.get('HOD204')!.userId },
    ],
  });

  await prisma.studyMaterial.createMany({
    data: [
      { title: 'Computer Networks — Unit I Notes', kind: 'PDF', size: '2.4 MB', downloads: 118, subjectId: subjectByCode.get('CS501')!.id, uploadedById: facultyByStaffId.get('FAC1180')!.userId },
      { title: 'Compiler Design — Parsing Slides', kind: 'PPTX', size: '5.8 MB', downloads: 94, subjectId: subjectByCode.get('CS502')!.id, uploadedById: facultyByStaffId.get('FAC1024')!.userId },
      { title: 'Machine Learning — Classification Lab', kind: 'DOCX', size: '1.2 MB', downloads: 131, subjectId: subjectByCode.get('CS503')!.id, uploadedById: facultyByStaffId.get('HOD204')!.userId },
      { title: 'Cryptography — RSA Demonstration', kind: 'VIDEO', size: '48 MB', downloads: 76, subjectId: subjectByCode.get('CS505')!.id, uploadedById: facultyByStaffId.get('FAC1198')!.userId },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { kind: 'ATTENDANCE', title: 'Attendance shortage — CS505', body: 'Cryptography & Network Security is below the required 75%.', tone: 'BAD', route: 'attendance', recipientId: aarav.userId },
      { kind: 'ASSIGNMENT', title: 'Assignment due soon', body: 'Subnetting Design Exercise is due on 8 August.', tone: 'WARN', route: 'assignments', recipientId: aarav.userId },
      { kind: 'EXAMINATION', title: 'IA I timetable published', body: 'The Internal Assessment I timetable is now available.', tone: 'ACCENT', route: 'examinations', recipientId: aarav.userId },
      { kind: 'ANNOUNCEMENT', title: 'Semester classes commence', body: 'Semester 5 classes begin on 3 August 2026.', tone: 'OK', route: 'calendar', recipientId: aarav.userId, authorId: adminUser.id },
    ],
  });

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

  const drives = await Promise.all(
    DRIVES.map((d) =>
      prisma.placementDrive.create({
        data: {
          company: d.company,
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

  console.log('\nSeed complete. Demo accounts (password: demo1234):');
  console.table([
    { role: 'Student', loginId: '21CSE042', name: 'Aarav Menon' },
    { role: 'Faculty', loginId: 'FAC1180', name: 'Prof. Kavitha Suresh' },
    { role: 'HOD', loginId: 'HOD204', name: 'Dr. Meera Rajan' },
    { role: 'Admin', loginId: adminUser.loginId, name: adminUser.name },
    { role: 'Parent', loginId: 'PAR7042', name: 'Ramesh Menon' },
  ]);
}

export { main as seed };

const runDirectly = Boolean(process.argv[1] && /[\\/]seed\.(ts|js)$/.test(process.argv[1]));

if (runDirectly) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

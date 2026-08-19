'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ICONS } from '@/lib/utilities/icons';
import { attendanceTone, money, shortDate } from '@/lib/utilities/format';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader, PageState } from '@/components/ui/PageHeader';
import { KpiCards, type KpiSpec } from '@/components/ui/primitives';
import { AnnouncementFeed, AttendanceDonut, BarChart, Grid, TodayClasses, UpcomingList } from '@/components/ui/blocks';

type DashboardData = {
  scope: 'student' | 'parent' | 'faculty' | 'hod' | 'admin';
  todayClasses: { code: string; name: string; who: string; room: string; start: string; end: string; live: boolean }[];
  events: { title: string; date: string; tag: string; tone: string }[];
  feed: { title: string; body: string; kind: string; tone: string; createdAt: string }[];
  departments: { code: string; name: string; attendance: number; passPercentage: number; students: number; faculty: number }[];
  instituteAttendance: number;
  student?: { name: string; firstName: string; registerNumber: string; section: string };
  staff?: { name: string; department?: string };
  attendance?: { percentage: number; attended: number; held: number; subjects: { code: string; shortName: string; percentage: number }[] };
  cgpa?: number;
  gpaTrend?: { label: string; gpa: number }[];
  pendingAssignments?: number;
  nextDue?: string | null;
  feeBalance?: number;
  feeDue?: string | null;
  upcomingExams?: number;
  nextExam?: { date: string } | null;
  subjectsAtRisk?: number;
  subjectCount?: number;
  studentsTaught?: number;
  averageAttendance?: number;
  toGrade?: number;
  pendingLeaves?: number;
  sections?: number;
  department?: { code: string; name: string; students: number; faculty: number; attendance: number; passPercentage: number } | null;
  institute?: { students: number; faculty: number; departments: number; attendance: number; feeCollection: number };
};

export const Dashboard = () => {
  const { user, go } = useShell();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardData>('/api/dashboard')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the dashboard.'));
  }, []);

  if (error) return <PageState>{error}</PageState>;
  if (!data) return <PageState>Loading your dashboard…</PageState>;

  const isStudentView = data.scope === 'student' || data.scope === 'parent';
  const isLeadership = data.scope === 'hod' || data.scope === 'admin';

  const kpis: KpiSpec[] = (() => {
    if (isStudentView && data.attendance) {
      const attendance = data.attendance.percentage;
      const cgpa = data.cgpa ?? 0;
      if (data.scope === 'parent') {
        return [
          { label: 'Ward attendance', value: `${attendance}%`, sub: `${data.student?.name} · ${data.student?.section}`, icon: ICONS.att, tone: attendanceTone(attendance), bar: `${attendance}%` },
          { label: 'CGPA', value: cgpa.toFixed(2), sub: 'Across completed semesters', icon: ICONS.cap, tone: 'var(--color-accent)', bar: `${cgpa * 10}%` },
          { label: 'Fee balance', value: money(data.feeBalance ?? 0), sub: data.feeDue ? `Due ${shortDate(data.feeDue)}` : 'Nothing outstanding', icon: ICONS.card, tone: data.feeBalance ? 'var(--status-bad)' : 'var(--status-ok)', bar: '28%' },
          { label: 'Subjects at risk', value: String(data.subjectsAtRisk ?? 0), sub: 'Below the 75% requirement', icon: ICONS.chart, tone: data.subjectsAtRisk ? 'var(--status-bad)' : 'var(--status-ok)', bar: '15%' },
          { label: 'Upcoming exams', value: String(data.upcomingExams ?? 0), sub: data.nextExam ? `From ${shortDate(data.nextExam.date)}` : 'None scheduled', icon: ICONS.cal, tone: 'var(--color-accent)', bar: '45%' },
        ];
      }
      return [
        { label: 'Attendance', value: `${attendance}%`, sub: `${data.attendance.attended} of ${data.attendance.held} periods`, icon: ICONS.att, tone: attendanceTone(attendance), bar: `${attendance}%` },
        { label: 'CGPA', value: cgpa.toFixed(2), sub: 'Across completed semesters', icon: ICONS.cap, tone: 'var(--color-accent)', bar: `${cgpa * 10}%` },
        { label: 'Pending assignments', value: String(data.pendingAssignments ?? 0), sub: data.nextDue ? `Next due ${shortDate(data.nextDue)}` : 'Nothing outstanding', icon: ICONS.file, tone: data.pendingAssignments ? 'var(--status-warn)' : 'var(--status-ok)', bar: '60%' },
        { label: 'Upcoming exams', value: String(data.upcomingExams ?? 0), sub: data.nextExam ? `From ${shortDate(data.nextExam.date)}` : 'None scheduled', icon: ICONS.cal, tone: 'var(--color-accent)', bar: '45%' },
        { label: 'Fee balance', value: money(data.feeBalance ?? 0), sub: data.feeDue ? `Due ${shortDate(data.feeDue)}` : 'Nothing outstanding', icon: ICONS.card, tone: data.feeBalance ? 'var(--status-bad)' : 'var(--status-ok)', bar: '28%' },
      ];
    }
    if (data.scope === 'faculty') {
      return [
        { label: 'Classes today', value: String(data.todayClasses.length), sub: `${data.sections ?? 0} sections`, icon: ICONS.cal, tone: 'var(--color-accent)', bar: '55%' },
        { label: 'Students taught', value: String(data.studentsTaught ?? 0), sub: `${data.subjectCount ?? 0} subjects`, icon: ICONS.users, tone: 'var(--color-accent)', bar: '70%' },
        { label: 'Avg. attendance', value: `${data.averageAttendance ?? 0}%`, sub: 'Across your subjects', icon: ICONS.att, tone: attendanceTone(data.averageAttendance ?? 0), bar: `${data.averageAttendance ?? 0}%` },
        { label: 'To grade', value: String(data.toGrade ?? 0), sub: 'Submissions awaiting a mark', icon: ICONS.file, tone: data.toGrade ? 'var(--status-warn)' : 'var(--status-ok)', bar: '66%' },
        { label: 'Leave requests', value: String(data.pendingLeaves ?? 0), sub: 'Awaiting your decision', icon: ICONS.chart, tone: data.pendingLeaves ? 'var(--status-warn)' : 'var(--status-ok)', bar: '40%' },
      ];
    }
    if (data.scope === 'hod' && data.department) {
      return [
        { label: 'Dept. students', value: String(data.department.students), sub: `${data.department.code} · all years`, icon: ICONS.users, tone: 'var(--color-accent)', bar: '80%' },
        { label: 'Faculty', value: String(data.department.faculty), sub: 'Teaching staff on roll', icon: ICONS.users, tone: 'var(--color-accent)', bar: '62%' },
        { label: 'Avg. attendance', value: `${data.department.attendance}%`, sub: 'Department, this month', icon: ICONS.att, tone: attendanceTone(data.department.attendance), bar: `${data.department.attendance}%` },
        { label: 'Pass percentage', value: `${data.department.passPercentage}%`, sub: 'Latest published results', icon: ICONS.cap, tone: 'var(--status-ok)', bar: `${data.department.passPercentage}%` },
        { label: 'Approvals', value: String(data.pendingLeaves ?? 0), sub: 'Leave & OD requests', icon: ICONS.file, tone: data.pendingLeaves ? 'var(--status-warn)' : 'var(--status-ok)', bar: '35%' },
      ];
    }
    const institute = data.institute;
    return [
      { label: 'Students', value: institute ? institute.students.toLocaleString('en-IN') : '0', sub: `${institute?.departments ?? 0} departments`, icon: ICONS.users, tone: 'var(--color-accent)', bar: '86%' },
      { label: 'Faculty', value: String(institute?.faculty ?? 0), sub: institute ? `Student : faculty ${(institute.students / institute.faculty).toFixed(1)} : 1` : '', icon: ICONS.users, tone: 'var(--color-accent)', bar: '58%' },
      { label: 'Institute attendance', value: `${institute?.attendance ?? 0}%`, sub: 'Rolling 30 days', icon: ICONS.att, tone: attendanceTone(institute?.attendance ?? 0), bar: `${institute?.attendance ?? 0}%` },
      { label: 'Fee collection', value: `${institute?.feeCollection ?? 0}%`, sub: 'Against demand raised', icon: ICONS.card, tone: (institute?.feeCollection ?? 0) >= 85 ? 'var(--status-ok)' : 'var(--status-warn)', bar: `${institute?.feeCollection ?? 0}%` },
      { label: 'Approvals', value: String(data.pendingLeaves ?? 0), sub: 'Leave & OD requests', icon: ICONS.file, tone: data.pendingLeaves ? 'var(--status-warn)' : 'var(--status-ok)', bar: '48%' },
    ];
  })();

  const greeting = (() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  })();

  const header = (() => {
    switch (data.scope) {
      case 'student':
        return { kicker: user.extra || 'Student', title: `${greeting}, ${data.student?.firstName}`, sub: `Odd semester ${new Date().getFullYear()}/${String(new Date().getFullYear() + 1).slice(2)}. ${data.subjectsAtRisk ? `${data.subjectsAtRisk} subject is below the 75% attendance requirement.` : 'All subjects meet the attendance requirement.'}` };
      case 'parent':
        return { kicker: `Guardian view · ${data.student?.name}`, title: `${greeting}, ${user.name.split(' ').slice(-1)[0]}`, sub: `Progress for your ward, updated to ${shortDate(new Date())}.` };
      case 'faculty':
        return { kicker: data.staff?.department ?? 'Faculty', title: `${greeting}, ${user.name.replace(/^(Prof\.|Dr\.)\s+/, '')}`, sub: `You have ${data.todayClasses.length} classes today and ${data.pendingLeaves ?? 0} pending approvals.` };
      case 'hod':
        return { kicker: `Department of ${data.department?.code ?? 'CSE'}`, title: 'Department overview', sub: `${data.department?.students ?? 0} students and ${data.department?.faculty ?? 0} faculty under your charge.` };
      default:
        return { kicker: 'DMI College of Engineering', title: 'Institute overview', sub: `Live figures across ${data.institute?.departments ?? 0} departments for the current academic year.` };
    }
  })();

  return (
    <>
      <PageHeader
        kicker={header.kicker}
        title={header.title}
        sub={header.sub}
        actions={[
          { label: 'Academic calendar', icon: ICONS.cal, onClick: () => go('calendar') },
          data.scope === 'faculty'
            ? { label: 'Take attendance', icon: ICONS.att, onClick: () => go('attendance'), primary: true }
            : data.scope === 'student'
              ? { label: 'My timetable', icon: ICONS.chart, onClick: () => go('timetable'), primary: true }
              : data.scope === 'parent'
                ? { label: 'View results', icon: ICONS.chart, onClick: () => go('results'), primary: true }
                : { label: 'Reports', icon: ICONS.chart, onClick: () => go('reports'), primary: true },
        ]}
      />

      <KpiCards kpis={kpis} />

      <Grid>
        {!isLeadership ? <TodayClasses label={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} classes={data.todayClasses} /> : null}

        {isStudentView && data.attendance ? (
          <AttendanceDonut
            title="Attendance overview"
            meta={`${data.attendance.attended} / ${data.attendance.held} periods`}
            percentage={data.attendance.percentage}
            caption="OVERALL"
            bars={data.attendance.subjects.slice(0, 5).map((s) => ({ label: s.shortName, value: s.percentage }))}
            note={data.subjectsAtRisk ? 'Minimum requirement is 75%. Subjects below that are flagged in Attendance.' : 'Every subject is above the 75% requirement.'}
          />
        ) : (
          <AttendanceDonut
            title="Attendance by department"
            meta="This month"
            percentage={data.instituteAttendance}
            caption="INSTITUTE AVG"
            bars={data.departments.slice(0, 5).map((d) => ({ label: `${d.name.split(' ')[0]} (${d.code})`, value: d.attendance }))}
            note={`Institute average ${data.instituteAttendance}%. Departments below the 85% target are flagged for review.`}
          />
        )}

        {isStudentView && data.gpaTrend?.length ? (
          <BarChart
            title="Academic performance"
            meta="GPA per semester"
            bars={data.gpaTrend.map((g) => ({ label: g.label, value: g.gpa.toFixed(2), height: (g.gpa / 10) * 100 }))}
            note={`CGPA ${(data.cgpa ?? 0).toFixed(2)} across completed semesters.`}
          />
        ) : (
          <BarChart
            title={isLeadership ? 'Pass percentage by department' : 'Attendance by department'}
            meta={`${data.departments.length} departments`}
            bars={data.departments.map((d) => ({
              label: d.code,
              value: isLeadership ? d.passPercentage.toFixed(1) : d.attendance.toFixed(1),
              height: isLeadership ? d.passPercentage : d.attendance,
              tone: isLeadership ? 'var(--color-accent)' : attendanceTone(d.attendance),
            }))}
            note={isLeadership ? 'Pass percentage from the most recently published results.' : `Institute average ${data.instituteAttendance}%.`}
          />
        )}

        <AnnouncementFeed items={data.feed} onViewAll={() => go('notifications')} />
        {!isStudentView ? <UpcomingList events={data.events} /> : null}
      </Grid>
    </>
  );
};

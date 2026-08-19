'use client';

import { useState, type ReactNode } from 'react';
import { post } from '@/lib/api';
import { useShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section, SectionHead } from '@/components/ui/primitives';
import { useTheme } from '@/providers/ThemeProvider';
import { permissionCount } from '@/config/permissions';
import { ROLES, ROLE_LABELS } from '@campus-connect/contracts';
import { SupportRequests } from '@/features/support/SupportRequests';

type SettingRow = { label: string; sub: string; control: ReactNode };

/** One line per role, describing the remit the permission matrix encodes. */
const ROLE_SUMMARIES: Record<string, string> = {
  STUDENT: 'Read own record · submit work',
  FACULTY: 'Registers, marks, materials, approvals',
  HOD: 'Department master data & approvals',
  ADMIN: 'Full access including finance',
  PARENT: 'Read-only on the linked ward',
};

const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    style={{
      width: 44,
      height: 23,
      flex: 'none',
      padding: 2,
      borderRadius: 999,
      border: `1px solid ${on ? 'var(--color-accent)' : 'var(--color-divider)'}`,
      background: on ? 'var(--color-accent)' : 'transparent',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background .18s',
    }}
  >
    <span style={{ width: 17, height: 17, borderRadius: 999, background: on ? '#fff' : 'var(--color-neutral-400)', transition: 'background .18s' }} />
  </button>
);

export const Settings = () => {
  const { user, toast, openModal, closeModal } = useShell();
  const { theme, setTheme: onTheme } = useTheme();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    compactTables: false,
    notifyAttendance: true,
    notifyAssignments: true,
    notifyExams: true,
    notifyFees: true,
    notifyGuardian: user.role === 'STUDENT',
    twoFactor: true,
    loginAlerts: true,
  });

  const setPref = (key: string, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    toast('Preference saved.');
  };

  const changePassword = () =>
    openModal({
      kicker: 'Security',
      title: 'Change password',
      sub: 'You will be signed out of other devices.',
      fields: [
        { key: 'currentPassword', label: 'Current password', kind: 'text', placeholder: '••••••••' },
        { key: 'newPassword', label: 'New password', kind: 'text', placeholder: 'At least 10 characters' },
        { key: 'confirm', label: 'Confirm new password', kind: 'text', placeholder: 'Repeat it', span: 2 },
      ],
      confirmLabel: 'Update password',
      onConfirm: async (form) => {
        if (form.newPassword !== form.confirm) throw new Error('The new passwords do not match.');
        await post('/api/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
        closeModal();
        toast('Password updated.');
      },
    });

  const groups: { title: string; sub: string; rows: SettingRow[] }[] = [
    {
      title: 'Appearance',
      sub: 'How the portal looks on this device',
      rows: [
        { label: 'Dark mode', sub: 'Follows this device only', control: <Toggle on={theme === 'dark'} onChange={(v) => onTheme(v ? 'dark' : 'light')} label="Dark mode" /> },
        { label: 'Compact tables', sub: 'Denser rows in data tables', control: <Toggle on={prefs.compactTables} onChange={(v) => setPref('compactTables', v)} label="Compact tables" /> },
        { label: 'Language', sub: 'Portal and notification language', control: <span style={{ fontSize: 12.5, opacity: 0.7 }}>English (India)</span> },
        { label: 'Time zone', sub: 'Used for deadlines and registers', control: <span style={{ fontSize: 12.5, opacity: 0.7 }}>IST · UTC+05:30</span> },
      ],
    },
    {
      title: 'Notifications',
      sub: 'Where each alert is delivered',
      rows: [
        { label: 'Attendance shortage', sub: 'Portal, email and SMS', control: <Toggle on={prefs.notifyAttendance} onChange={(v) => setPref('notifyAttendance', v)} label="Attendance alerts" /> },
        { label: 'Assignment deadlines', sub: '24 hours before closing', control: <Toggle on={prefs.notifyAssignments} onChange={(v) => setPref('notifyAssignments', v)} label="Assignment alerts" /> },
        { label: 'Examination & results', sub: 'Timetables and publications', control: <Toggle on={prefs.notifyExams} onChange={(v) => setPref('notifyExams', v)} label="Examination alerts" /> },
        { label: 'Fee reminders', sub: '7 days and 1 day before the due date', control: <Toggle on={prefs.notifyFees} onChange={(v) => setPref('notifyFees', v)} label="Fee reminders" /> },
        { label: 'Guardian copy', sub: 'Send a copy to the registered guardian', control: <Toggle on={prefs.notifyGuardian} onChange={(v) => setPref('notifyGuardian', v)} label="Guardian copy" /> },
      ],
    },
    {
      title: 'Security',
      sub: 'Account access and sessions',
      rows: [
        {
          label: 'Password',
          sub: 'Change your sign-in password',
          control: (
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px', flex: 'none' }} onClick={changePassword}>
              Change
            </button>
          ),
        },
        { label: 'Two-factor authentication', sub: 'One-time code by SMS', control: <Toggle on={prefs.twoFactor} onChange={(v) => setPref('twoFactor', v)} label="Two-factor authentication" /> },
        {
          label: 'Active sessions',
          sub: 'Devices signed in to your account',
          control: (
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px', flex: 'none' }} onClick={() => toast('Signed out of all other devices.')}>
              Sign out all
            </button>
          ),
        },
        { label: 'Login alerts', sub: 'Email on a new device', control: <Toggle on={prefs.loginAlerts} onChange={(v) => setPref('loginAlerts', v)} label="Login alerts" /> },
      ],
    },
  ];

  if (user.role === 'ADMIN') {
    groups.push({
      title: 'Roles & permissions',
      sub: 'What each role can reach',
      rows: ROLES.map((role) => ({
        label: ROLE_LABELS[role],
        sub: ROLE_SUMMARIES[role],
        control: <span style={{ fontSize: 12.5, opacity: 0.7 }}>{permissionCount(role)} permissions</span>,
      })),
    });
  }

  return (
    <>
      <PageHeader kicker="Preferences" title="Settings" sub={`Appearance, notification delivery and account security for ${user.name}.`} actions={[]} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
        {groups.map((g) => (
          <Section key={g.title}>
            <div>
              <SectionHead title={g.title} />
              <div style={{ fontSize: 11.5, opacity: 0.72 }}>{g.sub}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {g.rows.map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5 }}>{r.label}</span>
                    <span style={{ display: 'block', fontSize: 11.5, opacity: 0.72 }}>{r.sub}</span>
                  </span>
                  {r.control}
                </div>
              ))}
            </div>
          </Section>
        ))}
      </div>

      <SupportRequests />
    </>
  );
};

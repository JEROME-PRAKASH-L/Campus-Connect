'use client';

import { useMemo, useState } from 'react';
import { PermissionNotice } from '@campus-connect/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { Chips } from '@/components/ui/primitives';
import { ICONS } from '@/lib/utilities/icons';
import { useShell } from '@/components/layout/AppShell';
import { can } from '@/config/permissions';
import { ADMIN_RESOURCES, RESOURCE_GROUPS } from './config/resources';
import { ResourceManager } from './components/ResourceManager';
import { InstitutionProfile } from './components/InstitutionProfile';
import { AuditTrail } from './components/AuditTrail';

const EXTRA_TABS = ['Institution profile', 'Audit trail'] as const;

/**
 * The master-data console. Which entities appear is decided by the same
 * permission matrix the API enforces, so an HOD sees the department-scoped
 * subset and an administrator sees everything.
 */
export const Administration = () => {
  const { user } = useShell();

  const available = useMemo(() => ADMIN_RESOURCES.filter((r) => can(user.role, r.readPermission)), [user.role]);
  const groups = useMemo(() => RESOURCE_GROUPS.filter((g) => available.some((r) => r.group === g)), [available]);

  const tabs = useMemo(
    () => [...groups, ...(can(user.role, 'institution:read') ? ['Institution profile'] : []), ...(can(user.role, 'audit:read') ? ['Audit trail'] : [])],
    [groups, user.role],
  );

  const [tab, setTab] = useState(tabs[0] ?? '');
  const inGroup = available.filter((r) => r.group === tab);
  const [selected, setSelected] = useState(inGroup[0]?.name ?? '');

  if (!tabs.length) return <PermissionNotice what="manage institutional records" />;

  const activeTab = tabs.includes(tab) ? tab : tabs[0];
  const resources = available.filter((r) => r.group === activeTab);
  const active = resources.find((r) => r.name === selected) ?? resources[0];

  return (
    <>
      <PageHeader
        kicker={user.role === 'HOD' ? `Department of ${user.department}` : 'Institution administration'}
        title="Administration"
        sub={
          user.role === 'HOD'
            ? 'Master data for your department. Every list and every dropdown is scoped to it server-side.'
            : 'Institution-wide master data. Records are archived rather than deleted, and every change is written to the audit trail.'
        }
        actions={[]}
      />

      <Chips
        options={tabs}
        value={activeTab}
        onChange={(next) => {
          setTab(next);
          const first = available.find((r) => r.group === next);
          if (first) setSelected(first.name);
        }}
      />

      {(EXTRA_TABS as readonly string[]).includes(activeTab) ? (
        activeTab === 'Institution profile' ? (
          <InstitutionProfile />
        ) : (
          <AuditTrail />
        )
      ) : (
        <>
          {resources.length > 1 ? <Chips options={resources.map((r) => r.title)} value={active?.title ?? ''} onChange={(title) => setSelected(resources.find((r) => r.title === title)?.name ?? '')} /> : null}
          {active ? <ResourceManager key={active.name} resource={active} /> : <PermissionNotice what="manage these records" />}
        </>
      )}
    </>
  );
};

export const ADMINISTRATION_ICON = ICONS.board;

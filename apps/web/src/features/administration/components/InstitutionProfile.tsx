'use client';

import { useEffect, useState } from 'react';
import { institutionSchema, type InstitutionInput } from '@campus-connect/contracts';
import { PermissionNotice, Spinner, SuccessBanner } from '@campus-connect/ui';
import { ResourceForm } from '@/components/forms/ResourceForm';
import { ErrorState } from '@/components/feedback';
import { Section, SectionHead } from '@/components/ui/primitives';
import { api, messageFrom, put } from '@/lib/api';
import { useShell } from '@/components/layout/AppShell';
import { can } from '@/config/permissions';

const FIELDS = [
  { key: 'name', label: 'Institution name', kind: 'text' as const, required: true, span: 2 },
  { key: 'shortName', label: 'Short name', kind: 'text' as const, required: true },
  { key: 'affiliation', label: 'Affiliation', kind: 'text' as const, span: 2 },
  { key: 'addressLine1', label: 'Address line 1', kind: 'text' as const, span: 2 },
  { key: 'addressLine2', label: 'Address line 2', kind: 'text' as const, span: 2 },
  { key: 'city', label: 'City', kind: 'text' as const },
  { key: 'state', label: 'State', kind: 'text' as const },
  { key: 'postalCode', label: 'Postal code', kind: 'text' as const },
  { key: 'phone', label: 'Phone', kind: 'phone' as const },
  { key: 'email', label: 'Email', kind: 'email' as const },
  { key: 'website', label: 'Website', kind: 'text' as const },
  { key: 'logoFileId', label: 'Crest', kind: 'image' as const, purpose: 'INSTITUTION_LOGO' as const },
];

/** Institution information — one settings record, edited as an ordinary form. */
export const InstitutionProfile = () => {
  const { user, toast } = useShell();
  const [institution, setInstitution] = useState<InstitutionInput | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const writable = can(user.role, 'institution:write');

  const load = () => {
    setError('');
    api<{ institution: InstitutionInput }>('/api/settings/institution')
      .then((data) => setInstitution(data.institution))
      .catch((e) => setError(messageFrom(e, 'Could not load the institution profile.')));
  };

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!institution) return <Spinner label="Loading the institution profile…" />;

  return (
    <>
      {saved ? <SuccessBanner message="Institution profile saved." onDismiss={() => setSaved(false)} /> : null}
      <Section>
        <SectionHead title="Institution profile" meta="Used on letterheads and receipts" />
        {writable ? null : <PermissionNotice what="change the institution profile" />}
        <ResourceForm
          fields={FIELDS.map((f) => ({ ...f, readOnly: !writable }))}
          initial={Object.fromEntries(Object.entries(institution).map(([k, v]) => [k, v == null ? '' : String(v)]))}
          schema={institutionSchema}
          submitLabel="Save institution profile"
          onSubmit={async (values) => {
            const result = await put<{ institution: InstitutionInput }>('/api/settings/institution', values);
            setInstitution(result.institution);
            setSaved(true);
            toast('Institution profile saved.');
          }}
        />
      </Section>
    </>
  );
};

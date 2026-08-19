'use client';

import { useState } from 'react';
import { certificateCreateSchema, studentSelfUpdateSchema } from '@campus-connect/contracts';
import { SuccessBanner } from '@campus-connect/ui';
import { ResourceForm, type FieldSpec } from '@/components/forms/ResourceForm';
import { Section, SectionHead } from '@/components/ui/primitives';
import { patch, post } from '@/lib/api';
import { useShell } from '@/components/layout/AppShell';

const CONTACT_FIELDS: FieldSpec[] = [
  { key: 'mobile', label: 'Mobile', kind: 'phone', placeholder: '+91 98765 43210' },
  { key: 'bloodGroup', label: 'Blood group', kind: 'text', placeholder: 'O+' },
  { key: 'residence', label: 'Residence', kind: 'text', placeholder: 'Hosteller' },
  { key: 'photoFileId', label: 'Photograph', kind: 'image', purpose: 'STUDENT_PHOTO', hint: 'Held in object storage; the record keeps only the URL.' },
];

const CERTIFICATE_FIELDS: FieldSpec[] = [
  { key: 'title', label: 'Certificate title', kind: 'text', required: true, span: 2, placeholder: 'NPTEL — Cloud Computing' },
  { key: 'reference', label: 'Reference number', kind: 'text', required: true },
  { key: 'issuedOn', label: 'Issued on', kind: 'date' },
  { key: 'fileId', label: 'Scanned copy', kind: 'file', purpose: 'CERTIFICATE', span: 2 },
];

/**
 * What a student may maintain on their own record. The four contact fields are
 * the whole of it — everything academic is registry-owned, and the endpoint
 * rejects any other key rather than quietly ignoring it.
 */
export const SelfServicePanel = ({ initial, onSaved }: { initial: { mobile?: string; bloodGroup?: string; residence?: string }; onSaved: () => void }) => {
  const { toast } = useShell();
  const [banner, setBanner] = useState('');

  return (
    <>
      {banner ? <SuccessBanner message={banner} onDismiss={() => setBanner('')} /> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
        <Section>
          <SectionHead title="Update my details" meta="Contact information only" />
          <ResourceForm
            fields={CONTACT_FIELDS}
            initial={{ mobile: initial.mobile ?? '', bloodGroup: initial.bloodGroup ?? '', residence: initial.residence ?? '' }}
            schema={studentSelfUpdateSchema}
            submitLabel="Save my details"
            onSubmit={async (values) => {
              await patch('/api/profile', values);
              setBanner('Your contact details were updated.');
              toast('Profile updated.');
              onSaved();
            }}
          />
        </Section>

        <Section>
          <SectionHead title="Add a certificate" meta="Verified by the registry" />
          <ResourceForm
            fields={CERTIFICATE_FIELDS}
            schema={certificateCreateSchema}
            submitLabel="Submit certificate"
            onSubmit={async (values) => {
              await post('/api/profile/certificates', values);
              setBanner('Certificate submitted for verification.');
              toast('Certificate submitted.');
              onSaved();
            }}
          />
        </Section>
      </div>
    </>
  );
};

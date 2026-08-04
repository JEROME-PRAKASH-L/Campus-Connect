'use client';

import type { ReactNode } from 'react';
import { Section, SectionHead } from './primitives';

export type Column = { label: string; align?: 'left' | 'right'; width?: string };

export type Row = { key: string; cells: ReactNode[] };

export const DataTable = ({
  title,
  sub,
  columns,
  rows,
  note,
  controls,
  minWidth = 640,
  emptyLabel = 'Nothing to show yet.',
}: {
  title: string;
  sub?: string;
  columns: Column[];
  rows: Row[];
  note?: string;
  controls?: ReactNode;
  minWidth?: number;
  emptyLabel?: string;
}) => (
  <Section>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
      <div>
        <SectionHead title={title} />
        {sub ? <div style={{ fontSize: 11.5, opacity: 0.72 }}>{sub}</div> : null}
      </div>
      {controls ? <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>{controls}</div> : null}
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={`${c.label}-${i}`} style={{ textAlign: c.align ?? 'left', width: c.width ?? 'auto' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ opacity: 0.7, fontSize: 13 }}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, i) => (
                  <td key={i} style={{ textAlign: columns[i]?.align ?? 'left', verticalAlign: 'middle' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    {note ? <div style={{ fontSize: 11.5, opacity: 0.72, borderTop: '1px solid var(--color-divider)', paddingTop: 9 }}>{note}</div> : null}
  </Section>
);

export const TwoLine = ({ top, bottom }: { top: ReactNode; bottom: ReactNode }) => (
  <>
    <span style={{ display: 'block', fontSize: 13.5 }}>{top}</span>
    <span style={{ display: 'block', fontSize: 11.5, opacity: 0.72 }}>{bottom}</span>
  </>
);

export const Figure = ({ children }: { children: ReactNode }) => (
  <span className="figure" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>
    {children}
  </span>
);

export const RowActions = ({ children }: { children: ReactNode }) => (
  <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>{children}</span>
);

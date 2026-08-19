'use client';

import { useEffect, useState } from 'react';
import type { RouteKey, SearchResult } from '@campus-connect/contracts';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/primitives';
import { ICONS } from '@/lib/utilities/icons';

export const GlobalSearch = ({ visible, onGo }: { visible: boolean; onGo: (route: RouteKey) => void }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    // Debounced so typing a register number does not fire a request per keystroke.
    const handle = setTimeout(async () => {
      try {
        const data = await api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data.results);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div style={{ position: 'relative', flex: '0 1 300px', minWidth: 186, display: visible ? 'block' : 'none', marginLeft: 'auto' }}>
      <span style={{ position: 'absolute', left: 9, top: 10, opacity: 0.72, pointerEvents: 'none' }}>
        <Icon path={ICONS.search} size={15} />
      </span>
      <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students, subjects, pages…" style={{ paddingLeft: 29 }} aria-label="Search" />
      {results.length > 0 ? (
        <div className="elev-lg anim-pop" style={{ position: 'absolute', top: 42, right: 0, width: 'min(360px,80vw)', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 10, zIndex: 70, maxHeight: 340, overflow: 'auto' }}>
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.label}-${i}`}
              type="button"
              onClick={() => {
                setQuery('');
                onGo(r.route as RouteKey);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 11px', border: 0, borderBottom: '1px solid var(--color-divider)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--color-accent)', width: 66, flex: 'none' }}>{r.kind}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5 }}>{r.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, opacity: 0.72 }}>{r.sub}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

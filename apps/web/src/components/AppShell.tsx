'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, clearToken, post, setToken as persistToken } from '@/lib/api';
import { asset } from '@/lib/asset';
import { ICONS } from '@/lib/icons';
import { navFor } from '@/lib/nav';
import { relativeTime, toneVar } from '@/lib/format';
import type { Notification, RouteKey, SearchResult, SessionUser } from '@/lib/types';
import { Icon } from './primitives';
import { Modal, type ModalSpec } from './Modal';

type ShellContextValue = {
  user: SessionUser;
  route: RouteKey;
  go: (route: RouteKey) => void;
  toast: (message: string) => void;
  openModal: (spec: ModalSpec) => void;
  closeModal: () => void;
  refreshNotifications: () => Promise<void>;
  academicYear: string;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export const useShell = () => {
  const value = useContext(ShellContext);
  if (!value) throw new Error('useShell must be used inside the app shell');
  return value;
};

export const ThemeToggleContext = createContext<{ theme: string; toggle: () => void } | null>(null);

export const AppShell = ({
  user,
  onSignOut,
  route,
  onRoute,
  children,
  theme,
  onTheme,
}: {
  user: SessionUser;
  onSignOut: () => void;
  route: RouteKey;
  onRoute: (route: RouteKey) => void;
  children: ReactNode;
  theme: string;
  onTheme: (theme: string) => void;
}) => {
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalSpec | null>(null);
  const [width, setWidth] = useState(1280);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [academicYear, setAcademicYear] = useState('2026 – 27');

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api<{ notifications: Notification[] }>('/api/notifications');
      setNotifications(data.notifications);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications, route]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
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

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2800);
  }, []);

  const go = useCallback(
    (next: RouteKey) => {
      onRoute(next);
      setNavOpen(false);
      setBellOpen(false);
      setQuery('');
    },
    [onRoute],
  );

  const mobile = width < 900;
  const wide = !mobile || navOpen;
  const unread = notifications.filter((n) => !n.read).length;
  const pendingLeaves = 0;

  const nav = useMemo(
    () =>
      navFor(user.role).map((item) => ({
        ...item,
        on: route === item.key,
        badge: item.key === 'notifications' ? unread || null : item.key === 'leave' && user.role !== 'STUDENT' ? pendingLeaves || null : null,
      })),
    [user.role, route, unread],
  );

  const pageTitle = nav.find((n) => n.key === route)?.label ?? 'Dashboard';

  const contextValue = useMemo<ShellContextValue>(
    () => ({
      user,
      route,
      go,
      toast,
      openModal: (spec) => setModal(spec),
      closeModal: () => setModal(null),
      refreshNotifications,
      academicYear,
    }),
    [user, route, go, toast, refreshNotifications, academicYear],
  );

  const markAllRead = async () => {
    await post('/api/notifications/read-all');
    await refreshNotifications();
    toast('All notifications marked as read.');
  };

  const signOut = () => {
    clearToken();
    onSignOut();
  };

  return (
    <ShellContext.Provider value={contextValue}>
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: 15 }}>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'flex-start' }}>
          {mobile && navOpen ? <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,18,.5)', zIndex: 55 }} /> : null}

          <aside
            className="rail"
            style={{
              flex: 'none',
              display: mobile && !navOpen ? 'none' : 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              width: mobile ? 250 : 232,
              position: mobile ? 'fixed' : 'sticky',
              top: 0,
              left: 0,
              height: '100vh',
              zIndex: 60,
              color: 'var(--rail-ink)',
              borderRight: '1px solid rgba(238,242,246,.14)',
              padding: 'var(--space-4) var(--space-3)',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px 0 2px' }}>
              <img src={asset('/dmi-logo.png')} alt="DMI Campus Connect" style={{ width: 34, height: 34, flex: 'none', objectFit: 'contain' }} />
              {wide ? (
                <div style={{ lineHeight: 1.25, minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 14.5, color: '#FBFCFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    DMI Campus Connect
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', color: 'rgba(238,241,250,.72)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    DMI College of Engg.
                  </div>
                </div>
              ) : null}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {nav.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="rail-item"
                  onClick={() => go(item.key)}
                  title={item.label}
                  aria-current={item.on ? 'page' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 11px',
                    border: 0,
                    borderLeft: `3px solid ${item.on ? '#F2B417' : 'transparent'}`,
                    borderRadius: '0 10px 10px 0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: item.on ? 'rgba(107,63,160,.34)' : 'transparent',
                    color: item.on ? '#FBFCFF' : 'rgba(238,241,250,.82)',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  <Icon path={item.icon} size={18} strokeWidth={1.7} style={{ flex: 'none' }} />
                  {wide ? (
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                  ) : null}
                  {item.badge ? (
                    <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, height: 19, padding: '0 6px', borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--gold)', color: '#3A2A02' }}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid rgba(238,242,246,.16)' }}>
              {wide ? (
                <>
                  <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(238,242,246,.66)' }}>Signed in as</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--purple)', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12 }}>
                      {user.initials}
                    </div>
                    <div style={{ minWidth: 0, lineHeight: 1.25 }}>
                      <div style={{ fontSize: 13, color: '#f6f8fa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(238,242,246,.72)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{user.roleLabel}</div>
                    </div>
                  </div>
                </>
              ) : null}
              <button
                type="button"
                className="rail-item"
                onClick={signOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  padding: 10,
                  border: '1px solid rgba(238,242,246,.28)',
                  borderRadius: 10,
                  background: 'transparent',
                  color: '#eef2f6',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  fontSize: 12.5,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                }}
              >
                <Icon path={ICONS.out} size={15} />
                {wide ? <span>Sign out</span> : null}
              </button>
            </div>
          </aside>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <header
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 45,
                background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--color-divider)',
                padding: '12px var(--space-6)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setNavOpen((v) => !v)} title="Menu" aria-label="Toggle navigation" style={{ display: mobile ? 'inline-flex' : 'none' }}>
                <Icon path={ICONS.menu} />
              </button>

              <div style={{ minWidth: 0, display: width < 700 ? 'none' : 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: '1 1 auto' }}>
                {width >= 1180 ? (
                  <>
                    <span className="eyebrow" style={{ whiteSpace: 'nowrap' }}>
                      {user.roleLabel}
                    </span>
                    <span style={{ width: 14, height: 1, background: 'var(--color-divider)', flex: 'none' }} />
                  </>
                ) : null}
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, letterSpacing: '.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pageTitle}
                </span>
              </div>

              <div style={{ position: 'relative', flex: '0 1 300px', minWidth: 186, display: width < 1100 && !searchOpen ? 'none' : 'block', marginLeft: 'auto' }}>
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
                        onClick={() => go(r.route as RouteKey)}
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

              <button type="button" className="btn btn-secondary btn-icon" onClick={() => setSearchOpen((v) => !v)} title="Search" aria-label="Search" style={{ display: width < 1100 ? 'inline-flex' : 'none' }}>
                <Icon path={ICONS.search} strokeWidth={1.7} />
              </button>

              <button type="button" className="btn btn-secondary btn-icon" onClick={() => onTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme" aria-label="Toggle theme">
                <Icon path={theme === 'light' ? ICONS.moon : ICONS.sun} />
              </button>

              <div style={{ position: 'relative', flex: 'none' }}>
                <button type="button" className="btn btn-secondary btn-icon" onClick={() => setBellOpen((v) => !v)} title="Notifications" aria-label="Notifications">
                  <Icon path={ICONS.bell} />
                </button>
                {unread ? (
                  <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--color-accent)', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 11 }}>
                    {unread}
                  </span>
                ) : null}
                {bellOpen ? (
                  <div className="elev-lg anim-pop" style={{ position: 'absolute', top: 44, right: 0, width: 'min(370px,84vw)', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 10, zIndex: 70, maxHeight: 400, overflow: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--color-divider)' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, letterSpacing: '.06em', textTransform: 'uppercase' }}>Notifications</span>
                      <button type="button" className="btn btn-ghost" style={{ fontSize: 11.5 }} onClick={markAllRead}>
                        Mark all read
                      </button>
                    </div>
                    {notifications.slice(0, 6).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={async () => {
                          await post(`/api/notifications/${n.id}/read`);
                          await refreshNotifications();
                          go(n.route as RouteKey);
                        }}
                        style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', border: 0, borderBottom: '1px solid var(--color-divider)', background: n.read ? 'transparent' : 'color-mix(in srgb, var(--color-accent) 6%, transparent)', color: 'inherit', cursor: 'pointer' }}
                      >
                        <span style={{ width: 26, height: 26, flex: 'none', display: 'grid', placeItems: 'center', border: '1px solid var(--color-divider)', borderRadius: 8, color: toneVar(n.tone) }}>
                          <Icon path={n.kind === 'FEES' ? ICONS.card : n.kind === 'ATTENDANCE' ? ICONS.alert : n.kind === 'RESULTS' ? ICONS.award : ICONS.file} size={14} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, lineHeight: 1.3 }}>{n.title}</span>
                          <span style={{ display: 'block', fontSize: 11.5, opacity: 0.72, marginTop: 2 }}>{n.body}</span>
                          <span style={{ display: 'block', fontSize: 11.5, letterSpacing: '.1em', textTransform: 'uppercase', opacity: 0.62, marginTop: 3 }}>{relativeTime(n.createdAt)}</span>
                        </span>
                      </button>
                    ))}
                    {notifications.length === 0 ? <div style={{ padding: 14, fontSize: 13, opacity: 0.7 }}>Nothing new.</div> : null}
                  </div>
                ) : null}
              </div>

              {width >= 1180 ? (
                <select
                  className="input"
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    toast(`Academic year switched to ${e.target.value}.`);
                  }}
                  title="Academic year"
                  aria-label="Academic year"
                  style={{ width: 'auto', minWidth: 118, flex: 'none', height: 36, fontSize: 13, fontWeight: 600 }}
                >
                  {['2026 – 27', '2025 – 26', '2024 – 25'].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              ) : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', paddingLeft: 12, borderLeft: '1px solid var(--color-divider)' }}>
                <div style={{ width: 36, height: 36, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 999, background: 'var(--purple)', color: '#fff', fontSize: 13, fontWeight: 700 }}>{user.initials}</div>
                {width >= 1180 ? (
                  <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{user.roleLabel}</div>
                  </div>
                ) : null}
                <button type="button" className="btn btn-secondary btn-icon" onClick={signOut} title="Log out" aria-label="Log out">
                  <Icon path={ICONS.out} strokeWidth={1.7} />
                </button>
              </div>
            </header>

            <main style={{ width: '100%', maxWidth: 1480, margin: '0 auto', padding: 'var(--space-8) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 34 }}>{children}</main>
          </div>
        </div>

        {modal ? <Modal spec={modal} onClose={() => setModal(null)} /> : null}

        {toastMessage ? (
          <div
            className="elev-lg anim-fade-up"
            role="status"
            style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 90, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 10, padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340 }}
          >
            <span style={{ color: 'var(--status-ok)', flex: 'none' }}>
              <Icon path={ICONS.check} size={16} />
            </span>
            <span style={{ fontSize: 13 }}>{toastMessage}</span>
          </div>
        ) : null}
      </div>
    </ShellContext.Provider>
  );
};

export const persistSession = persistToken;

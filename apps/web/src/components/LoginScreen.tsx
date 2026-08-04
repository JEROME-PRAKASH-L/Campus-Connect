'use client';

import { useEffect, useState } from 'react';
import { api, post, setToken } from '@/lib/api';
import { ICONS } from '@/lib/icons';
import type { SessionUser } from '@/lib/types';
import { Icon } from './primitives';

type DemoAccount = { role: string; roleLabel: string; name: string; loginId: string };

const ROLE_ICONS: Record<string, string> = {
  STUDENT: ICONS.cap,
  FACULTY: ICONS.board,
  HOD: ICONS.star,
  ADMIN: ICONS.shield,
  PARENT: ICONS.users,
};

const chip = {
  fontSize: 12.5,
  fontWeight: 600,
  padding: '7px 12px',
  borderRadius: 999,
  background: 'rgba(255,255,255,.1)',
  border: '1px solid rgba(238,241,250,.24)',
} as const;

const Stat = ({ value, label, first }: { value: string; label: string; first?: boolean }) => (
  <div style={{ padding: first ? 'var(--space-4) 0' : 'var(--space-4) 0 var(--space-4) var(--space-4)', borderLeft: first ? undefined : '1px solid rgba(238,241,250,.16)' }}>
    <div className="figure" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 32, lineHeight: 1, color: '#FBFCFF' }}>
      {value}
    </div>
    <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(238,241,250,.7)', textTransform: 'uppercase', marginTop: 5 }}>{label}</div>
  </div>
);

export const LoginScreen = ({ onSignedIn, onToast }: { onSignedIn: (user: SessionUser) => void; onToast: (message: string) => void }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelection, setRoleSelection] = useState('Student');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demos, setDemos] = useState<DemoAccount[]>([]);

  useEffect(() => {
    api<{ accounts: DemoAccount[] }>('/api/auth/demo-accounts')
      .then((data) => setDemos(data.accounts))
      .catch(() => setDemos([]));
  }, []);

  const signIn = async (id: string, pw: string) => {
    setBusy(true);
    setError('');
    try {
      const data = await post<{ token: string; user: SessionUser }>('/api/auth/login', { loginId: id, password: pw });
      setToken(data.token);
      onSignedIn(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.');
      setBusy(false);
    }
  };

  const onRoleChange = (value: string) => {
    setRoleSelection(value);
    const match = demos.find((d) => d.roleLabel === value || (value === 'Head of Department' && d.role === 'HOD'));
    if (match) setLoginId(match.loginId);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(420px,100%),1fr))', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{ background: '#14224E', color: '#EEF1FA', padding: 'clamp(36px,4vw,64px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', minHeight: 'min(600px,88vh)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.13, backgroundImage: 'radial-gradient(rgba(238,241,250,.9) 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(110% 80% at 8% 4%, rgba(107,63,160,.62) 0%, rgba(20,34,78,0) 60%),radial-gradient(80% 60% at 96% 96%, rgba(242,180,23,.22) 0%, rgba(20,34,78,0) 60%)' }} />
        <svg viewBox="0 0 400 260" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '44%', opacity: 0.5 }} aria-hidden="true">
          <g fill="none" stroke="rgba(238,241,250,.34)" strokeWidth="1">
            <path d="M0 210 L70 168 L146 196 L212 140 L286 172 L352 122 L400 148" />
            <path d="M0 244 L70 168M70 168 L146 196M146 196 L212 140M212 140 L286 172M286 172 L352 122" />
          </g>
          <g fill="#F2B417">
            <circle cx="70" cy="168" r="3.4" />
            <circle cx="212" cy="140" r="3.4" />
            <circle cx="352" cy="122" r="3.4" />
          </g>
          <g fill="#B08BE0">
            <circle cx="146" cy="196" r="3" />
            <circle cx="286" cy="172" r="3" />
          </g>
        </svg>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13 }}>
          <img src="/dmi-logo.png" alt="DMI Foundations — Fully Human & Fully Alive" style={{ width: 64, height: 64, flex: 'none', objectFit: 'contain', filter: 'drop-shadow(0 3px 12px rgba(0,0,0,.4))' }} />
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 21, letterSpacing: '-.01em' }}>DMI Campus Connect</div>
            <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'rgba(238,241,250,.72)', textTransform: 'uppercase' }}>DMI College of Engineering</div>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: 660, display: 'flex', flexDirection: 'column', gap: 20, padding: 'var(--space-8) 0' }}>
          <div className="gold-rule" />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', color: '#F2B417', textTransform: 'uppercase' }}>Smart College ERP &amp; Learning Platform</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px,5.4vw,74px)', color: '#FBFCFF' }}>
            Connecting students,
            <br />
            faculty and campus
            <br />
            services.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(238,241,250,.8)', maxWidth: '48ch', margin: 0 }}>
            One platform for admissions, attendance, examinations, fees, learning materials and placements — for 2,629 students across six departments.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            <span style={chip}>Student information system</span>
            <span style={chip}>Learning management</span>
            <span style={chip}>Campus ERP</span>
          </div>
        </div>

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(96px,1fr))', borderTop: '1px solid rgba(238,241,250,.22)' }}>
          <Stat value="2,629" label="Students" first />
          <Stat value="151" label="Faculty" />
          <Stat value="06" label="Departments" />
          <Stat value="18" label="Programmes" />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(32px,4vw,56px) clamp(24px,3vw,44px)' }}>
        <div style={{ width: '100%', maxWidth: 452, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <img src="/dmi-logo.png" alt="DMI Foundations crest" style={{ width: 58, height: 58, flex: 'none', objectFit: 'contain' }} />
            <div style={{ lineHeight: 1.25, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16.5 }}>DMI Campus Connect</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', color: 'var(--muted)', textTransform: 'uppercase' }}>DMI College of Engineering</div>
            </div>
          </div>
          <hr className="hair" />

          <div>
            <div className="eyebrow">Secure sign in</div>
            <h2 className="display" style={{ margin: '8px 0', fontSize: 'clamp(30px,3vw,40px)' }}>
              Welcome back
            </h2>
            <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: '44ch' }}>
              Sign in with your registration number, staff ID or college email address.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(loginId, password);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div className="field">
              <label htmlFor="loginId">Email or registration number</label>
              <input id="loginId" className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="21CSE042" autoComplete="username" style={{ height: 46 }} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={{ height: 46 }} />
            </div>
            <div className="field">
              <label htmlFor="roleSelect">Sign in as</label>
              <select id="roleSelect" className="input" value={roleSelection} onChange={(e) => onRoleChange(e.target.value)} style={{ height: 46 }}>
                {['Student', 'Faculty', 'Head of Department', 'Administrator', 'Parent'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setRemember((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 13.5 }}>
                <span className="chk" data-on={remember ? '1' : '0'}>
                  {remember ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : null}
                </span>
                <span>Remember me</span>
              </button>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  onToast('A reset link has been sent to your registered college email.');
                }}
                style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
              >
                Forgot password?
              </a>
            </div>

            {error ? (
              <div style={{ border: '1px solid var(--status-bad)', borderRadius: 8, color: 'var(--status-bad)', fontSize: 12.5, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center' }} role="alert">
                <Icon path={ICONS.alert} size={15} />
                <span>{error}</span>
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary" disabled={busy} style={{ height: 48, fontSize: 15, fontWeight: 700 }}>
              {busy ? 'Signing in…' : 'Log in'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" className="sso" onClick={() => onToast('Single sign-on is configured by the IT office for @dmice.edu.in accounts.')}>
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.75 4.4-5.5 4.4A6.5 6.5 0 1 1 16.4 7l2.8-2.7A10 10 0 1 0 22 12c0-.6-.06-1.2-.16-1.8z" />
              </svg>
              Google
            </button>
            <button type="button" className="sso" onClick={() => onToast('Single sign-on is configured by the IT office for @dmice.edu.in accounts.')}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#F35325" d="M3 3h8.5v8.5H3z" />
                <path fill="#81BC06" d="M12.5 3H21v8.5h-8.5z" />
                <path fill="#05A6F0" d="M3 12.5h8.5V21H3z" />
                <path fill="#FFBA08" d="M12.5 12.5H21V21h-8.5z" />
              </svg>
              Microsoft
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'var(--space-2)' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
            <span className="eyebrow">Demo accounts</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-divider)' }} />
          </div>

          <div style={{ display: 'grid', borderTop: '1px solid var(--color-divider)' }}>
            {demos.map((d) => (
              <button
                key={d.loginId}
                type="button"
                onClick={() => {
                  setLoginId(d.loginId);
                  setPassword('demo1234');
                  void signIn(d.loginId, 'demo1234');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '12px 4px', border: 0, borderBottom: '1px solid var(--color-divider)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
              >
                <span style={{ width: 15, height: 15, flex: 'none', color: 'var(--color-accent-700)' }}>
                  <Icon path={ROLE_ICONS[d.role] ?? ICONS.user} size={15} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, letterSpacing: '.12em', textTransform: 'uppercase' }}>{d.roleLabel}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
                    {d.name} · {d.loginId}
                  </span>
                </span>
                <span style={{ color: 'var(--muted)' }}>
                  <Icon path={ICONS.arrow} size={15} />
                </span>
              </button>
            ))}
          </div>

          <p className="text-muted" style={{ fontSize: 11.5, margin: 0 }}>
            All demo accounts use the password <strong style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>demo1234</strong>. Sample data is fictional.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--color-divider)', paddingTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>DMI Campus Connect · Smart College ERP &amp; Learning Platform</span>
            <a
              href="#help"
              onClick={(e) => {
                e.preventDefault();
                onToast('Help desk: helpdesk@dmice.edu.in · 044 2745 1234');
              }}
              style={{ fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}
            >
              Help &amp; support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROLE_THEME, otherRole } from './theme';
import type { Role } from './theme';
import { LogoMark } from '../../components/Logo';

interface AuthLayoutProps {
  role: Role;
  mode: 'login' | 'register';
  title: string;
  children: ReactNode;
}

// Shared visual shell for every auth page — a full-width divider under
// the centered logo, a gradient marketing panel on the left (vertically
// centered), and the form on the right. Each page (LoginCreator,
// RegisterBusiness, etc.) just passes its role + mode + heading + form
// fields; this component owns the card, the gradient, and all the CSS.
export function AuthLayout({ role, mode, title, children }: AuthLayoutProps) {
  const theme = ROLE_THEME[role];
  const other = otherRole(role);
  const otherTheme = ROLE_THEME[other];
  const isDark = theme.panelText === 'light';

  return (
    <div
      className="az-page"
      style={{ ['--az-accent' as any]: theme.accent, ['--az-accent-soft' as any]: theme.accentSoft }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

        .az-page {
          --ink: #171717;
          --ink-soft: #6c6d73;
          --ink-faint: #a0a1a8;
          --line: #e6e6ea;
          --bad: #d1293d;
          --bad-soft: #fdecee;
          position: relative;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          color: var(--ink);
          min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 56px 24px 40px;
          background: #faf9f6;
          -webkit-font-smoothing: antialiased;
        }
        .az-page * { box-sizing: border-box; }
        .az-page a { text-decoration: none; }
        .az-page button { font-family: inherit; cursor: pointer; }
        .az-font-logo { font-family: 'League Spartan', sans-serif; font-weight: 600; letter-spacing: 0.01em; }

        .az-wordmark { display: flex; align-items: center; justify-content: center; gap: 9px; margin-top: -14px; margin-bottom: 20px; }
        .az-wordmark .az-font-logo { font-size: 28px; color: var(--ink); }

        .az-card {
          position: relative; width: 100%; max-width: 1120px; min-height: 680px;
          border-radius: 24px; overflow: hidden; background: #faf9f6;
          border: 1px solid var(--line);
          display: flex; align-items: stretch; gap: 28px; padding: 18px;
        }

        .az-panel {
          flex: 1 1 0;
          border-radius: 20px;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center; padding: 56px;
        }
        .az-panel-inner { max-width: 320px; text-align: center; }
        .az-panel-icon {
          width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        .az-panel-title { font-family: 'League Spartan', sans-serif; font-weight: 700; font-size: 24px; margin: 0; }
        .az-panel-desc { font-size: 13.5px; line-height: 1.65; margin-top: 14px; }

        .az-form-pane { flex: 1 1 0; display: flex; align-items: center; justify-content: center; padding: 40px 40px 40px 8px; }
        .az-form { width: 100%; max-width: 460px; }

        .az-h1 { font-family: 'League Spartan', sans-serif; font-size: 26px; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; margin: 0 0 24px; }

        .az-field { margin-top: 15px; }
        .az-label { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; color: var(--ink); margin-bottom: 6px; }
        .az-input {
          width: 100%; border: 1.5px solid var(--line); border-radius: 9px; padding: 12px 14px;
          font-size: 14px; color: var(--ink); outline: none; background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .az-input:focus { border-color: var(--az-accent); box-shadow: 0 0 0 3px var(--az-accent-soft); }
        .az-pw-wrap { position: relative; }
        .az-pw-toggle { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); background: none; border: none; padding: 2px; display: flex; }
        .az-pw-toggle:hover { color: var(--ink-soft); }

        .az-select-wrap { position: relative; }
        .az-select-wrap select.az-input { appearance: none; -webkit-appearance: none; padding-right: 38px; cursor: pointer; }
        .az-select-chevron { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); pointer-events: none; }

        .az-error { margin-top: 12px; border-radius: 9px; padding: 9px 12px; font-size: 12px; background: var(--bad-soft); color: var(--bad); }
        .az-submit {
          width: 100%; margin-top: 22px; border-radius: 9px; padding: 12px; font-size: 14px; font-weight: 600;
          background: var(--az-accent); color: #ffffff; border: none;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: filter 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
        }
        .az-submit:hover:not(:disabled) { filter: brightness(0.92); transform: translateY(-1px); }
        .az-submit:disabled { opacity: 0.6; }

        .az-terms { display: flex; align-items: flex-start; gap: 7px; margin-top: 14px; font-size: 11px; color: var(--ink-soft); line-height: 1.45; }
        .az-terms input { margin-top: 2px; accent-color: var(--az-accent); }
        .az-terms a { color: var(--az-accent); font-weight: 500; }

        .az-footer-links { margin-top: 20px; font-size: 12.5px; color: var(--ink-soft); line-height: 1.9; }
        .az-footer-links a { color: var(--az-accent); font-weight: 600; }

        @media (max-width: 760px) {
          .az-card { flex-direction: column; gap: 0; padding: 0; min-height: 0; }
          .az-panel { display: none; }
          .az-form-pane { padding: 40px 28px; }
        }
      `}</style>

      <Link to="/" className="az-wordmark">
        <LogoMark size={26} />
        <span className="az-font-logo">creatorhub</span>
      </Link>

      <div className="az-card">
        <div
          className="az-panel"
          style={{
            background: `radial-gradient(circle at 80% 15%, ${theme.glow1}, transparent 55%), radial-gradient(circle at 15% 85%, ${theme.glow2}, transparent 60%), linear-gradient(155deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
            color: isDark ? '#ffffff' : 'var(--ink)',
          }}
        >
          <div className="az-panel-inner">
            <span className="az-panel-icon" style={{ background: isDark ? 'rgba(255,255,255,0.14)' : '#ffffff' }}>
              <LogoMark size={22} />
            </span>
            <h2 className="az-panel-title">Welcome to creatorhub</h2>
            <p className="az-panel-desc" style={{ color: isDark ? 'rgba(255,255,255,0.78)' : 'var(--ink-soft)' }}>
              {theme.welcomeDesc}
            </p>
          </div>
        </div>

        <div className="az-form-pane">
          <div className="az-form">
            <h1 className="az-h1">{title}</h1>

            {children}

            <div className="az-footer-links">
              {mode === 'login' ? (
                <div>No account yet? <Link to={`/register/${role}`}>Join now</Link></div>
              ) : (
                <div>Already have an account? <Link to={`/login/${role}`}>Log in</Link></div>
              )}
              <div>
                Looking to {other === 'business' ? 'book creators' : 'get discovered'}?{' '}
                <Link to={`/${mode}/${other}`}>
                  {mode === 'login' ? 'Log in' : 'Sign up'} as a {otherTheme.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
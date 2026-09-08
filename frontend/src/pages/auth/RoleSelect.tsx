import { useLocation, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Shown at /login and /register (no role in the URL yet).
// Picking a card sends the user to /login/creator, /login/business,
// /register/creator or /register/business.
export function RoleSelect() {
  const location = useLocation();
  const mode: 'login' | 'register' = location.pathname.startsWith('/login') ? 'login' : 'register';

  return (
    <div className="rs-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

        .rs-page {
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 24px;
          background:
            radial-gradient(ellipse 1000px 640px at 20% 0%, rgba(10,17,40,0.08), transparent 65%),
            radial-gradient(ellipse 1000px 640px at 85% 5%, rgba(255,109,0,0.10), transparent 65%),
            #F8F9FA;
        }
        .rs-page * { box-sizing: border-box; }
        .rs-page a { text-decoration: none; color: inherit; }
        .rs-font-logo { font-family: 'League Spartan', sans-serif; font-weight: 600; letter-spacing: 0.02em; }

        .rs-logo-row { display: flex; align-items: center; justify-content: center; gap: 9px; margin-bottom: 16px; }
        .rs-logo-text { font-size: 26px; color: #111217; }

        .rs-card {
          width: 100%; max-width: 640px; border-radius: 20px; background: #fbfaff;
          border: 1px solid #e6e6ea;
          padding: 40px 44px;
        }
        .rs-wave { font-size: 26px; }
        .rs-kicker {
          display: flex; align-items: center; justify-content: flex-start; gap: 6px;
          font-size: 16px; font-weight: 600; color: #111217; margin-top: 10px;
        }
        .rs-title { font-family: 'League Spartan', sans-serif; font-size: 26px; font-weight: 700; color: #111217; margin-top: 4px; }

        .rs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 26px; }
        .rs-tile {
          display: block; border: 1.5px solid #e6e6ea; border-radius: 16px; overflow: hidden;
          background: #ffffff;
          transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }
        .rs-tile:hover { transform: translateY(-2px); box-shadow: 0 16px 30px -14px rgba(17,18,23,0.18); }
        .rs-tile--creator:hover { border-color: #FF6B5A; }
        .rs-tile--business:hover { border-color: #1E2A78; }

        .rs-thumb { height: 140px; }
        .rs-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .rs-body { padding: 16px 18px 20px; }
        .rs-name { font-size: 14.5px; font-weight: 700; }
        .rs-tile--creator .rs-name { color: #FF6B5A; }
        .rs-tile--business .rs-name { color: #1E2A78; }
        .rs-desc { font-size: 12.5px; color: #6c6d73; margin-top: 6px; line-height: 1.5; }
        .rs-go { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; margin-top: 12px; }
        .rs-tile--creator .rs-go { color: #FF6B5A; }
        .rs-tile--business .rs-go { color: #1E2A78; }

        .rs-switch { text-align: center; margin-top: 26px; font-size: 12.5px; color: #6c6d73; }
        .rs-switch a { font-weight: 600; color: #1E2A78; }

        @media (max-width: 560px) {
          .rs-grid { grid-template-columns: 1fr; }
          .rs-card { padding: 30px 22px; }
        }
      `}</style>

      <div>
        <Link to="/" className="rs-logo-row">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="10" cy="13" r="8" fill="#1E2A78" />
            <circle cx="17" cy="9" r="6" fill="#FF6B5A" fillOpacity="0.9" />
          </svg>
          <span className="rs-font-logo rs-logo-text">creatorhub</span>
        </Link>

        <div className="rs-card">
          <p className="rs-kicker">
            <svg width="16" height="16" viewBox="0 0 26 26" aria-hidden="true">
              <circle cx="10" cy="13" r="8" fill="#1E2A78" />
              <circle cx="17" cy="9" r="6" fill="#FF6B5A" fillOpacity="0.9" />
            </svg>
            Welcome to creatorhub
          </p>
          <h1 className="rs-title">
            Pick your role to {mode === 'login' ? 'log in' : 'get started'}
          </h1>

          <div className="rs-grid">
            <Link to={`/${mode}/creator`} className="rs-tile rs-tile--creator">
              <div className="rs-thumb">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop&q=70" alt="" />
              </div>
              <div className="rs-body">
                <div className="rs-name">I&apos;m a Creator</div>
                <p className="rs-desc">
                  Get discovered by trusted brands, manage collabs, and get paid — all in one place.
                </p>
                <span className="rs-go">
                  {mode === 'login' ? 'Log in as a Creator' : 'Continue as a Creator'} <ArrowRight size={13} />
                </span>
              </div>
            </Link>

            <Link to={`/${mode}/business`} className="rs-tile rs-tile--business">
              <div className="rs-thumb">
                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=70" alt="" />
              </div>
              <div className="rs-body">
                <div className="rs-name">I&apos;m a Brand</div>
                <p className="rs-desc">
                  Access a curated network of high-quality creators, manage campaigns, and track results.
                </p>
                <span className="rs-go">
                  {mode === 'login' ? 'Log in as a Brand' : 'Continue as a Brand'} <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          </div>

          <div className="rs-switch">
            {mode === 'login' ? (
              <>Don&apos;t have an account? <Link to="/register">Sign up</Link></>
            ) : (
              <>Already have an account? <Link to="/login">Log in</Link></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
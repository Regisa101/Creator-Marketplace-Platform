import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, User, Briefcase, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NICHES = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Tech', 'Travel', 'Gaming', 'Music', 'Home', 'Wellness'];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'Other'];
const AUDIENCE_SIZES = ['1K – 10K', '10K – 50K', '50K – 200K', '200K+'];
const INDUSTRIES = ['Fashion & Beauty', 'Food & Beverage', 'Health & Fitness', 'Tech & SaaS', 'Travel & Hospitality', 'Retail & E-commerce', 'Other'];
const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'];

export function AuthCard() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode: 'login' | 'register' = location.pathname.startsWith('/register') ? 'register' : 'login';

  const { loginUser, registerUser } = useAuth();

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'creator' as 'creator' | 'business',
    niche: '',
    platform: '',
    audience_size: '',
    company_name: '',
    industry: '',
    team_size: '',
    website: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchTo = (target: 'login' | 'register') => {
    setError('');
    navigate(target === 'login' ? '/login' : '/register');
  };

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setRegisterData((p) => ({ ...p, [field]: e.target.value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(loginData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { redirectTo } = await registerUser(registerData);
      navigate(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCreator = registerData.role === 'creator';

  return (
    <div className="ac-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

        .ac-page {
          --ink: #111217;
          --ink-soft: #6c6d73;
          --ink-faint: #a0a1a8;
          --line: #e6e6ea;
          --bg: #ffffff;
          --surface: #fbfaff;
          --accent: #6C5DD3;
          --accent-hover: #5A4CC2;
          --accent-soft: #EDEAFB;
          --coral: #FF8A5B;
          --coral-hover: #E86F3E;
          --coral-soft: #FFEEE5;
          --bad: #d1293d;
          --bad-soft: #fdecee;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          color: var(--ink);
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 24px;
          background:
            radial-gradient(ellipse 1000px 640px at 20% 0%, rgba(108,93,211,0.13), transparent 65%),
            radial-gradient(ellipse 1000px 640px at 85% 5%, rgba(255,138,91,0.11), transparent 65%),
            var(--surface);
          -webkit-font-smoothing: antialiased;
        }
        .ac-page * { box-sizing: border-box; }
        .ac-page a { text-decoration: none; }
        .ac-page button { font-family: inherit; cursor: pointer; }
        .ac-font-logo { font-family: 'League Spartan', sans-serif; font-weight: 700; letter-spacing: 0.02em; }

        .ac-card {
          position: relative; width: 100%; max-width: 720px; max-height: 88vh;
          border-radius: 20px; overflow: hidden; background: var(--bg);
          border: 1px solid var(--line); box-shadow: 0 40px 90px -20px rgba(76,60,150,0.22), 0 10px 30px rgba(17,18,23,0.06);
          display: grid; grid-template-columns: 1fr 1fr;
        }
        .ac-pane {
          display: flex; align-items: flex-start; justify-content: center;
          padding: 36px 34px; overflow-y: auto; max-height: 88vh;
        }
        @supports (align-items: safe center) {
          .ac-pane { align-items: safe center; }
        }
        .ac-pane[aria-hidden="true"] { visibility: hidden; }
        .ac-form { width: 100%; max-width: 280px; }
        .ac-logo-row { display: flex; align-items: center; justify-content: center; gap: 7px; }
        .ac-logo-text { font-size: 16px; color: var(--ink); }
        .ac-h1 { font-family: 'League Spartan', sans-serif; font-size: 19px; font-weight: 700; color: var(--ink); margin-top: 14px; text-align: center; letter-spacing: -0.01em; }
        .ac-sub { font-size: 12.5px; color: var(--ink-soft); margin-top: 4px; text-align: center; }

        .ac-field { margin-top: 12px; }
        .ac-label { display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; color: var(--ink); margin-bottom: 6px; }
        .ac-input {
          width: 100%; border: 1.5px solid var(--line); border-radius: 9px; padding: 8px 12px;
          font-size: 13px; color: var(--ink); outline: none; background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .ac-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
        .ac-pw-wrap { position: relative; }
        .ac-pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); background: none; border: none; padding: 2px; display: flex; }
        .ac-pw-toggle:hover { color: var(--ink-soft); }

        .ac-select-wrap { position: relative; }
        .ac-select-wrap select.ac-input { appearance: none; -webkit-appearance: none; padding-right: 34px; cursor: pointer; }
        .ac-select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); pointer-events: none; }

        .ac-role-toggle { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--surface); border: 1.5px solid var(--line); border-radius: 100px; padding: 4px; }
        .ac-role-pill {
          position: absolute; top: 4px; left: 4px; width: calc(50% - 4px); height: calc(100% - 8px);
          border-radius: 100px; z-index: 0;
          transition: transform 0.28s cubic-bezier(0.65,0,0.35,1), background 0.28s ease;
        }
        .ac-role-btn {
          position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: none; border: none; padding: 9px 10px; border-radius: 100px;
          font-size: 12.5px; font-weight: 600; color: var(--ink-soft);
          transition: color 0.2s ease;
        }
        .ac-role-btn.active { color: #fff; }

        .ac-error { margin-top: 10px; border-radius: 9px; padding: 8px 12px; font-size: 12px; background: var(--bad-soft); color: var(--bad); }
        .ac-submit {
          width: 100%; margin-top: 14px; border-radius: 9px; padding: 9.5px; font-size: 13px; font-weight: 600;
          background: var(--accent); color: #ffffff; border: none;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: background 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
        }
        .ac-submit:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
        .ac-submit:disabled { opacity: 0.6; }
        .ac-terms { display: flex; align-items: flex-start; gap: 7px; margin-top: 12px; font-size: 11px; color: var(--ink-soft); line-height: 1.45; }
        .ac-terms input { margin-top: 2px; accent-color: var(--accent); }
        .ac-terms a { color: var(--accent); font-weight: 500; }
        .ac-mobile-switch { display: none; text-align: center; margin-top: 14px; font-size: 12.5px; color: var(--ink-soft); }
        .ac-mobile-switch button { color: var(--accent); font-weight: 600; background: none; border: none; padding: 0; }

        .ac-overlay {
          position: absolute; top: 0; left: 0; width: 50%; height: 100%;
          color: #fff; overflow: hidden;
          display: flex; align-items: center; justify-content: center; text-align: center;
          padding: 32px 30px; z-index: 20;
          transition: transform 0.65s cubic-bezier(0.65, 0, 0.35, 1);
          transform: translateX(${mode === 'register' ? '0%' : '100%'});
          background:
            radial-gradient(circle at 20% 15%, rgba(255,138,91,0.42), transparent 58%),
            radial-gradient(circle at 85% 90%, rgba(108,93,211,0.42), transparent 58%),
            linear-gradient(160deg, #1a1526 0%, #0f0c16 100%);
        }
        .ac-overlay-mark { display: flex; justify-content: center; margin-bottom: 14px; }
        .ac-overlay-inner { max-width: 230px; position: relative; z-index: 1; }
        .ac-overlay-title { font-family: 'League Spartan', sans-serif; font-weight: 700; font-size: 21px; }
        .ac-overlay-sub { margin-top: 8px; font-size: 12.5px; color: rgba(255,255,255,0.72); line-height: 1.55; }
        .ac-overlay-btn {
          margin-top: 18px; display: inline-flex; align-items: center; gap: 7px;
          background: #fff; color: var(--ink); font-size: 12.5px; font-weight: 600; border: none;
          padding: 9px 20px; border-radius: 100px; transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .ac-overlay-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        @media (max-width: 760px) {
          .ac-card { grid-template-columns: 1fr; min-height: 0; }
          .ac-overlay { display: none; }
          .ac-pane[aria-hidden="true"] { display: none; }
          .ac-pane { padding: 40px 28px; max-height: none; }
          .ac-mobile-switch { display: block; }
        }
      `}</style>

      <div className="ac-card">
        <div className="ac-pane" aria-hidden={mode !== 'login'}>
          <form className="ac-form" onSubmit={handleLogin}>
            <Link to="/" className="ac-logo-row">
              <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="10" cy="13" r="8" fill="#6C5DD3" />
                <circle cx="17" cy="9" r="6" fill="#FF8A5B" fillOpacity="0.9" />
              </svg>
              <span className="ac-font-logo ac-logo-text">creatorhub</span>
            </Link>
            <h1 className="ac-h1">Welcome back</h1>
            <p className="ac-sub">Log in to your account</p>

            <div className="ac-field">
              <label className="ac-label">Email</label>
              <input
                className="ac-input"
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
              />
            </div>
            <div className="ac-field">
              <div className="ac-label">
                Password
                <Link to="/forgot-password" style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 12 }}>
                  Forgot?
                </Link>
              </div>
              <div className="ac-pw-wrap">
                <input
                  className="ac-input"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Enter your password"
                  style={{ paddingRight: 38 }}
                />
                <button type="button" className="ac-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password visibility">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === 'login' && error && <div className="ac-error">{error}</div>}

            <button type="submit" className="ac-submit" disabled={mode === 'login' && loading}>
              {mode === 'login' && loading ? 'Logging in…' : 'Log in'}
              {!(mode === 'login' && loading) && <ArrowRight size={15} />}
            </button>

            <div className="ac-mobile-switch">
              Don't have an account?{' '}
              <button type="button" onClick={() => switchTo('register')}>Sign up</button>
            </div>
          </form>
        </div>

        <div className="ac-pane" aria-hidden={mode !== 'register'}>
          <form className="ac-form" onSubmit={handleRegister}>
            <Link to="/" className="ac-logo-row">
              <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="10" cy="13" r="8" fill="#6C5DD3" />
                <circle cx="17" cy="9" r="6" fill="#FF8A5B" fillOpacity="0.9" />
              </svg>
              <span className="ac-font-logo ac-logo-text">creatorhub</span>
            </Link>
            <h1 className="ac-h1">Create your account</h1>
            <p className="ac-sub">Join the creator marketplace</p>

            <div className="ac-field">
              <label className="ac-label">I am a</label>
              <div className="ac-role-toggle">
                <span
                  className="ac-role-pill"
                  style={{
                    transform: isCreator ? 'translateX(0%)' : 'translateX(100%)',
                    background: isCreator ? 'var(--coral)' : 'var(--accent)',
                  }}
                />
                <button
                  type="button"
                  className={`ac-role-btn ${isCreator ? 'active' : ''}`}
                  onClick={() => setRegisterData((p) => ({ ...p, role: 'creator' }))}
                >
                  <User size={14} /> Content creator
                </button>
                <button
                  type="button"
                  className={`ac-role-btn ${!isCreator ? 'active' : ''}`}
                  onClick={() => setRegisterData((p) => ({ ...p, role: 'business' }))}
                >
                  <Briefcase size={14} /> Business / brand
                </button>
              </div>
            </div>

            <div className="ac-field">
              <label className="ac-label">Full name</label>
              <input
                className="ac-input"
                type="text"
                required
                value={registerData.full_name}
                onChange={setField('full_name')}
                placeholder="Enter your full name"
              />
            </div>
            <div className="ac-field">
              <label className="ac-label">Email</label>
              <input
                className="ac-input"
                type="email"
                required
                value={registerData.email}
                onChange={setField('email')}
                placeholder="you@company.com"
              />
            </div>
            <div className="ac-field">
              <label className="ac-label">Password</label>
              <div className="ac-pw-wrap">
                <input
                  className="ac-input"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={registerData.password}
                  onChange={setField('password')}
                  placeholder="Min 6 characters"
                  style={{ paddingRight: 38 }}
                />
                <button type="button" className="ac-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password visibility">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {isCreator ? (
              <>
                <div className="ac-field">
                  <label className="ac-label">Primary niche</label>
                  <div className="ac-select-wrap">
                    <select className="ac-input" required value={registerData.niche} onChange={setField('niche')}>
                      <option value="" disabled>Select a niche</option>
                      {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <ChevronDown size={14} className="ac-select-chevron" />
                  </div>
                </div>
                <div className="ac-field">
                  <label className="ac-label">Main platform</label>
                  <div className="ac-select-wrap">
                    <select className="ac-input" required value={registerData.platform} onChange={setField('platform')}>
                      <option value="" disabled>Select a platform</option>
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={14} className="ac-select-chevron" />
                  </div>
                </div>
                <div className="ac-field">
                  <label className="ac-label">Audience size</label>
                  <div className="ac-select-wrap">
                    <select className="ac-input" required value={registerData.audience_size} onChange={setField('audience_size')}>
                      <option value="" disabled>Select a range</option>
                      {AUDIENCE_SIZES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronDown size={14} className="ac-select-chevron" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="ac-field">
                  <label className="ac-label">Company name</label>
                  <input
                    className="ac-input"
                    type="text"
                    required
                    value={registerData.company_name}
                    onChange={setField('company_name')}
                    placeholder="e.g. Himalayan Skincare Co."
                  />
                </div>
                <div className="ac-field">
                  <label className="ac-label">Industry</label>
                  <div className="ac-select-wrap">
                    <select className="ac-input" required value={registerData.industry} onChange={setField('industry')}>
                      <option value="" disabled>Select an industry</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <ChevronDown size={14} className="ac-select-chevron" />
                  </div>
                </div>
                <div className="ac-field">
                  <label className="ac-label">Team size</label>
                  <div className="ac-select-wrap">
                    <select className="ac-input" required value={registerData.team_size} onChange={setField('team_size')}>
                      <option value="" disabled>Select a size</option>
                      {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="ac-select-chevron" />
                  </div>
                </div>
                <div className="ac-field">
                  <label className="ac-label">Website <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    className="ac-input"
                    type="text"
                    value={registerData.website}
                    onChange={setField('website')}
                    placeholder="yourcompany.com"
                  />
                </div>
              </>
            )}

            <label className="ac-terms">
              <input type="checkbox" required />
              <span>
                I agree to the <Link to="/terms">Terms</Link> and{' '}
                <Link to="/privacy">Privacy Policy</Link>.
              </span>
            </label>

            {mode === 'register' && error && <div className="ac-error">{error}</div>}

            <button type="submit" className="ac-submit" disabled={mode === 'register' && loading}>
              {mode === 'register' && loading ? 'Creating account…' : 'Create account'}
              {!(mode === 'register' && loading) && <ArrowRight size={15} />}
            </button>

            <div className="ac-mobile-switch">
              Already have an account?{' '}
              <button type="button" onClick={() => switchTo('login')}>Log in</button>
            </div>
          </form>
        </div>

        <div className="ac-overlay">
          <div className="ac-overlay-inner">
            <div className="ac-overlay-mark">
              <svg width="34" height="34" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="9" cy="13" r="7" fill="#8C7FE8" />
                <circle cx="18" cy="9" r="7" fill="#FF8A5B" />
              </svg>
            </div>
            {mode === 'login' ? (
              <>
                <div className="ac-overlay-title">New here?</div>
                <p className="ac-overlay-sub">Sign up and start matching with creators or brands in minutes.</p>
                <button className="ac-overlay-btn" onClick={() => switchTo('register')}>
                  Sign up <ArrowRight size={13} />
                </button>
              </>
            ) : (
              <>
                <div className="ac-overlay-title">Welcome back</div>
                <p className="ac-overlay-sub">Already running campaigns or collabs with us? Log in to pick up where you left off.</p>
                <button className="ac-overlay-btn" onClick={() => switchTo('login')}>
                  Log in <ArrowRight size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
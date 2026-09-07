import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

const NICHES = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Tech', 'Travel', 'Gaming', 'Music', 'Home', 'Wellness'];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'Other'];
const AUDIENCE_SIZES = ['1K – 10K', '10K – 50K', '50K – 200K', '200K+'];

export function RegisterCreator() {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [data, setData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'creator' as const,
    niche: '',
    platform: '',
    audience_size: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setData((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { redirectTo } = await registerUser(data);
      navigate(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="creator" mode="register" title="Create your Creator account">
      <form onSubmit={handleSubmit}>
        <div className="az-field">
          <label className="az-label">Full name</label>
          <input
            className="az-input"
            type="text"
            required
            value={data.full_name}
            onChange={setField('full_name')}
            placeholder="Enter your full name"
          />
        </div>

        <div className="az-field">
          <label className="az-label">Email</label>
          <input
            className="az-input"
            type="email"
            required
            value={data.email}
            onChange={setField('email')}
            placeholder="you@example.com"
          />
        </div>

        <div className="az-field">
          <label className="az-label">Password</label>
          <div className="az-pw-wrap">
            <input
              className="az-input"
              type={showPw ? 'text' : 'password'}
              required
              minLength={6}
              value={data.password}
              onChange={setField('password')}
              placeholder="Min 6 characters"
              style={{ paddingRight: 38 }}
            />
            <button type="button" className="az-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="az-field">
          <label className="az-label">Primary niche</label>
          <div className="az-select-wrap">
            <select className="az-input" required value={data.niche} onChange={setField('niche')}>
              <option value="" disabled>Select a niche</option>
              {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown size={14} className="az-select-chevron" />
          </div>
        </div>

        <div className="az-field">
          <label className="az-label">Main platform</label>
          <div className="az-select-wrap">
            <select className="az-input" required value={data.platform} onChange={setField('platform')}>
              <option value="" disabled>Select a platform</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={14} className="az-select-chevron" />
          </div>
        </div>

        <div className="az-field">
          <label className="az-label">Audience size</label>
          <div className="az-select-wrap">
            <select className="az-input" required value={data.audience_size} onChange={setField('audience_size')}>
              <option value="" disabled>Select a range</option>
              {AUDIENCE_SIZES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={14} className="az-select-chevron" />
          </div>
        </div>

        <label className="az-terms">
          <input type="checkbox" required />
          <span>
            I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </span>
        </label>

        {error && <div className="az-error">{error}</div>}

        <button type="submit" className="az-submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>
    </AuthLayout>
  );
}
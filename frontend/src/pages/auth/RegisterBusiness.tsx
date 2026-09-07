import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

const INDUSTRIES = ['Fashion & Beauty', 'Food & Beverage', 'Health & Fitness', 'Tech & SaaS', 'Travel & Hospitality', 'Retail & E-commerce', 'Other'];
const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'];

export function RegisterBusiness() {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [data, setData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'business' as const,
    company_name: '',
    industry: '',
    team_size: '',
    website: '',
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
    <AuthLayout role="business" mode="register" title="Create your Brand account">
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
            placeholder="you@company.com"
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
          <label className="az-label">Company name</label>
          <input
            className="az-input"
            type="text"
            required
            value={data.company_name}
            onChange={setField('company_name')}
            placeholder="e.g. Himalayan Skincare Co."
          />
        </div>

        <div className="az-field">
          <label className="az-label">Industry</label>
          <div className="az-select-wrap">
            <select className="az-input" required value={data.industry} onChange={setField('industry')}>
              <option value="" disabled>Select an industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <ChevronDown size={14} className="az-select-chevron" />
          </div>
        </div>

        <div className="az-field">
          <label className="az-label">Team size</label>
          <div className="az-select-wrap">
            <select className="az-input" required value={data.team_size} onChange={setField('team_size')}>
              <option value="" disabled>Select a size</option>
              {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={14} className="az-select-chevron" />
          </div>
        </div>

        <div className="az-field">
          <label className="az-label">Website <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></label>
          <input
            className="az-input"
            type="text"
            value={data.website}
            onChange={setField('website')}
            placeholder="yourcompany.com"
          />
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
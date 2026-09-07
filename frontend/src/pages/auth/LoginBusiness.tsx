import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

export function LoginBusiness() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [data, setData] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="business" mode="login" title="Sign in to your Brand account">
      <form onSubmit={handleSubmit}>
        <div className="az-field">
          <label className="az-label">Email</label>
          <input
            className="az-input"
            type="email"
            required
            value={data.email}
            onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))}
            placeholder="you@company.com"
          />
        </div>

        <div className="az-field">
          <div className="az-label">
            Password
            <Link to="/forgot-password" style={{ color: 'var(--az-accent)', fontWeight: 500, fontSize: 12 }}>
              Forgot?
            </Link>
          </div>
          <div className="az-pw-wrap">
            <input
              className="az-input"
              type={showPw ? 'text' : 'password'}
              required
              value={data.password}
              onChange={(e) => setData((p) => ({ ...p, password: e.target.value }))}
              placeholder="Enter your password"
              style={{ paddingRight: 38 }}
            />
            <button type="button" className="az-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && <div className="az-error">{error}</div>}

        <button type="submit" className="az-submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>
    </AuthLayout>
  );
}
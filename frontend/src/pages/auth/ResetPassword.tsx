import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '../../api/client';
import { AuthLayout } from './AuthLayout';

const PASSWORD_DOTS = '••••••••';

const noticeStyle: React.CSSProperties = {
  margin: '0 0 18px',
  padding: '12px 14px',
  border: '1px solid #d7d7d7',
  borderRadius: 8,
  background: '#f7f7f7',
  color: '#222',
  fontSize: 13,
  lineHeight: 1.55,
};

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const validate = () => {
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Password must be at least 8 characters and include a letter and a number.';
    }
    if (confirm !== password) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not reset your password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout mode="login" title="Reset link missing">
        <p style={noticeStyle}>This page needs the link from your reset email. Request a new one to continue.</p>
        <Link to="/forgot-password" className="az-submit" style={{ textDecoration: 'none' }}>
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout mode="login" title="Password updated">
        <p style={noticeStyle}>Your password has been changed. Log in with your new password.</p>
        <Link to="/login" className="az-submit" style={{ textDecoration: 'none' }}>
          Go to log in
          <ArrowRight size={15} />
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="login" title="Choose a new password">
      <form onSubmit={handleSubmit} noValidate>
        <div className="az-field">
          <label className="az-label" htmlFor="reset-password">
            New password
          </label>
          <div className="az-pw-wrap">
            <input
              id="reset-password"
              className="az-input"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={PASSWORD_DOTS}
              disabled={loading}
            />
            <button
              type="button"
              className="az-pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              disabled={loading}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="az-field">
          <label className="az-label" htmlFor="reset-confirm">
            Retype new password
          </label>
          <div className="az-pw-wrap">
            <input
              id="reset-confirm"
              className="az-input"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={PASSWORD_DOTS}
              disabled={loading}
            />
            <button
              type="button"
              className="az-pw-toggle"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              disabled={loading}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="az-error" role="alert">
            {error}{' '}
            {/link/i.test(error) && <Link to="/forgot-password">Request a new link</Link>}
          </div>
        )}

        <button type="submit" className="az-submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save new password'}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
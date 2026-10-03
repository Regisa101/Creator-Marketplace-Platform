import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { forgotPassword } from '../../api/client';
import { AuthLayout } from './AuthLayout';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setSentTo(trimmed);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout mode="login" title="Check your email">
        <p style={noticeStyle}>
          If an account exists for <strong>{sentTo}</strong>, we've sent a link to choose a new
          password. It works once and expires in 30 minutes. If you don't see it, check your spam folder.
        </p>
        <button
          type="button"
          className="az-submit"
          onClick={() => {
            setSentTo('');
            setEmail('');
          }}
        >
          Use a different email
        </button>
        <p className="az-switch">
          <Link to="/login">Back to log in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="login" title="Reset your password">
      <p style={{ ...noticeStyle, background: 'transparent', border: 0, padding: 0 }}>
        Enter the email you signed up with and we'll send you a link to choose a new password.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="az-field">
          <label className="az-label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            className="az-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="az-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="az-submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>

      <p className="az-switch">
        Remembered it? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;
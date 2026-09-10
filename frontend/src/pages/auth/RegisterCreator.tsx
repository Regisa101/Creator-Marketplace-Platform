import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_DOTS = '••••••••';

export function RegisterCreator() {
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const [data, setData] = useState({ email: '', full_name: '', password: '', confirmPassword: '', role: 'creator' as const });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const name = data.full_name.trim();
    const email = data.email.trim();
    if (name.length < 2 || name.length > 80) return 'Full name must be between 2 and 80 characters.';
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address.';
    if (data.password.length < 8 || !/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      return 'Password must be at least 8 characters and include a letter and a number.';
    }
    if (data.confirmPassword !== data.password) {
      return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validation = validate();
    if (validation) { setError(validation); return; }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = data;
      const { redirectTo } = await registerUser({ ...payload, email: data.email.trim(), full_name: data.full_name.trim() });
      navigate(redirectTo);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return <AuthLayout role="creator" mode="register" title="Create your Creator account">
    <form onSubmit={handleSubmit} noValidate>
      <div className="az-field"><label className="az-label">Full name</label><input className="az-input" type="text" required maxLength={80} value={data.full_name} onChange={(e) => setData(p => ({...p, full_name: e.target.value}))} placeholder="Enter your full name" /></div>
      <div className="az-field"><label className="az-label">Email</label><input className="az-input" type="email" required value={data.email} onChange={(e) => setData(p => ({...p, email: e.target.value}))} placeholder="you@example.com" /></div>
      <div className="az-field"><label className="az-label">Password</label><div className="az-pw-wrap"><input className="az-input" type={showPw ? 'text' : 'password'} required value={data.password} onChange={(e) => setData(p => ({...p, password: e.target.value}))} placeholder={PASSWORD_DOTS} style={{paddingRight:38}} /><button type="button" className="az-pw-toggle" onClick={() => setShowPw(v => !v)} aria-label="Toggle password visibility">{showPw ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div></div>
      <div className="az-field"><label className="az-label">Retype password</label><div className="az-pw-wrap"><input className="az-input" type={showConfirmPw ? 'text' : 'password'} required value={data.confirmPassword} onChange={(e) => setData(p => ({...p, confirmPassword: e.target.value}))} placeholder={PASSWORD_DOTS} style={{paddingRight:38}} /><button type="button" className="az-pw-toggle" onClick={() => setShowConfirmPw(v => !v)} aria-label="Toggle password visibility">{showConfirmPw ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div></div>
      <label className="az-terms"><input type="checkbox" required /><span>I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>
      {error && <div className="az-error" role="alert">{error}</div>}
      <button type="submit" className="az-submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}{!loading && <ArrowRight size={15}/>}</button>
    </form>
  </AuthLayout>;
}
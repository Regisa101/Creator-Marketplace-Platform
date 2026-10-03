import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';

type Props = {
  /**
   * Register pages pass the role of the account to create.
   * The login page passes nothing: it only logs in existing accounts.
   */
  role?: 'creator' | 'business';
};

export function GoogleButton({ role }: Props) {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const [error, setError] = useState('');
  const [width, setWidth] = useState(320);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Make Google's button fill the card (Google allows 200-400px).
  useEffect(() => {
    const w = wrapRef.current?.clientWidth;
    if (w) setWidth(Math.min(400, Math.max(200, Math.floor(w))));
  }, []);

  // No client id configured -> hide the button instead of showing a broken one.
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;

  return (
    <div style={{ marginBottom: 4 }}>
      <div ref={wrapRef} style={{ display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          text="continue_with"
          theme="outline"
          size="large"
          shape="rectangular"
          width={width}
          onSuccess={async (res) => {
            setError('');
            if (!res.credential) {
              setError('Google sign-in failed. Please try again.');
              return;
            }
            try {
              const { redirectTo } = await googleLogin(res.credential, role);
              navigate(redirectTo, { replace: true });
            } catch (err: any) {
              const detail = err?.response?.data?.detail;
              setError(typeof detail === 'string' ? detail : 'Google sign-in failed. Please try again.');
            }
          }}
          onError={() => setError('Google sign-in failed. Please try again.')}
        />
      </div>

      {error && (
        <div className="az-error" role="alert" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}

      <div
        aria-hidden="true"
        style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 22px', color: '#888', fontSize: 12 }}
      >
        <span style={{ flex: 1, height: 1, background: '#dedede' }} />
        OR
        <span style={{ flex: 1, height: 1, background: '#dedede' }} />
      </div>
    </div>
  );
}

export default GoogleButton;
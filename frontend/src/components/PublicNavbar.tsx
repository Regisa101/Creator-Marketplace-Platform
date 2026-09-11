import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME, BRAND_PURPLE, BRAND_PURPLE_DARK, LogoMark } from './Logo';

const API_ORIGIN = 'http://localhost:8000';

function resolveMediaUrl(url?: string | null) {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url.replace(/^\/+/, '')}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'U';
}

export function PublicNavbar({ sticky = true }: { sticky?: boolean }) {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const authenticated = !loading && !!user;
  const isHome = location.pathname === '/' && !location.hash;
  const isCampaigns = location.pathname.startsWith('/campaigns');
  const isBrands = location.hash === '#for-brands';
  const isAbout = false;

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    logout();
    navigate('/');
  };

  const avatarUrl = resolveMediaUrl(user?.profile?.profile_image || user?.profile?.logo_url || null);
  const avatarName = user?.role === 'business'
    ? (user?.profile?.company_name || user?.full_name || 'Brand')
    : (user?.profile?.display_name || user?.full_name || 'User');

  return (
    <>
      <style>{`
        .ch-public-nav {
          position: ${sticky ? 'sticky' : 'relative'};
          top: 0;
          z-index: 1000;
          width: 100%;
          background: #FBF8F4;
          border-bottom: 1px solid #EEE8E2;
          box-sizing: border-box;
        }
        .ch-public-nav *,
        .ch-public-nav *::before,
        .ch-public-nav *::after { box-sizing: border-box; }
        .ch-public-nav-inner {
          width: min(1240px, 100%);
          min-height: 72px;
          margin: 0 auto;
          padding: 16px 32px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 24px;
        }
        .ch-public-logo {
          justify-self: start;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #17171A;
          text-decoration: none;
          font-family: 'League Spartan', sans-serif;
          font-size: 21px;
          font-weight: 700;
          line-height: 1;
        }
        .ch-public-links { display: flex; align-items: center; justify-content: center; gap: 30px; }
        .ch-public-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          color: #55545A;
          text-decoration: none;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }
        .ch-public-link::after {
          content: '';
          position: absolute;
          left: 0;
          right: 100%;
          bottom: -3px;
          height: 2px;
          border-radius: 999px;
          background: ${BRAND_PURPLE};
          transition: right .18s ease;
        }
        .ch-public-link:hover, .ch-public-link.is-active { color: ${BRAND_PURPLE}; }
        .ch-public-link:hover::after, .ch-public-link.is-active::after { right: 0; }
        .ch-public-actions { justify-self: end; display: flex; align-items: center; gap: 10px; }
        .ch-public-auth-link {
          min-width: 68px;
          padding: 9px 15px;
          border-radius: 8px;
          text-decoration: none;
          text-align: center;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 600;
        }
        .ch-public-login { color: #55545A; border: 1px solid transparent; background: transparent; }
        .ch-public-login:hover { color: ${BRAND_PURPLE}; }
        .ch-public-register { color: #fff; background: ${BRAND_PURPLE}; border: 1px solid ${BRAND_PURPLE}; }
        .ch-public-register:hover { background: ${BRAND_PURPLE_DARK}; border-color: ${BRAND_PURPLE_DARK}; }
        .ch-public-round {
          width: 38px; height: 38px; border: 1px solid #E5DFDA; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          color: #55545A; background: #fff; text-decoration: none;
        }
        .ch-public-round:hover { color: ${BRAND_PURPLE}; border-color: #D7CDE4; }
        .ch-public-profile { position: relative; }
        .ch-public-avatar {
          width: 38px; height: 38px; padding: 0; border-radius: 50%; border: 1px solid #E5DFDA;
          overflow: hidden; display: inline-flex; align-items: center; justify-content: center;
          background: #F0EBF6; color: ${BRAND_PURPLE}; cursor: pointer; font-size: 11px; font-weight: 700;
        }
        .ch-public-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ch-public-avatar:hover { border-color: #CFC1E4; }
        .ch-public-profile-menu {
          position: absolute; top: calc(100% + 10px); right: 0; width: 190px; padding: 7px;
          background: #fff; border: 1px solid #E7E0F3; border-radius: 13px;
          box-shadow: 0 16px 40px rgba(36,31,46,.14); z-index: 1100;
        }
        .ch-public-profile-name { padding: 9px 10px 8px; border-bottom: 1px solid #EEE8E2; margin-bottom: 4px; }
        .ch-public-profile-name strong { display: block; color: #241F2E; font-size: 12px; line-height: 1.35; }
        .ch-public-profile-name span { display: block; margin-top: 2px; color: #8A8394; font-size: 10.5px; }
        .ch-public-profile-menu a, .ch-public-profile-menu button {
          width: 100%; display: flex; align-items: center; padding: 10px; border: 0; border-radius: 8px;
          background: transparent; color: #4B4654; text-decoration: none; text-align: left;
          font: 500 12.5px 'Poppins', sans-serif; cursor: pointer;
        }
        .ch-public-profile-menu a:hover, .ch-public-profile-menu button:hover { background: #F5F1F9; color: ${BRAND_PURPLE}; }
        .ch-public-profile-menu button.logout { color: #C84642; }
        .ch-public-profile-menu button.logout:hover { background: #FFF0EF; color: #C84642; }
        .ch-public-burger { display: none; width: 38px; height: 38px; border: 1px solid #E5DFDA; border-radius: 9px; background: #fff; color: #55545A; align-items: center; justify-content: center; cursor: pointer; }
        .ch-public-mobile { display: none; border-top: 1px solid #EEE8E2; background: #FBF8F4; padding: 8px 20px 16px; }
        .ch-public-mobile a, .ch-public-mobile button {
          width: 100%; display: block; padding: 11px 4px; border: 0; border-bottom: 1px solid #EEE8E2;
          background: transparent; color: #241F2E; text-align: left; text-decoration: none;
          font: 500 14px 'Poppins', sans-serif; cursor: pointer;
        }
        .ch-public-mobile a.is-active { color: ${BRAND_PURPLE}; font-weight: 650; }
        .ch-public-mobile button.logout { color: #C84642; }
        @media (max-width: 760px) {
          .ch-public-nav-inner { min-height: 66px; padding: 14px 18px; grid-template-columns: 1fr auto; }
          .ch-public-links { display: none; }
          .ch-public-actions > .ch-public-auth-link, .ch-public-actions > .ch-public-profile, .ch-public-actions > .ch-public-round { display: none; }
          .ch-public-burger { display: inline-flex; }
          .ch-public-logo { font-size: 20px; }
          .ch-public-mobile { display: block; }
        }
      `}</style>

      <nav className="ch-public-nav" aria-label="Main navigation">
        <div className="ch-public-nav-inner">
          <Link to="/" className="ch-public-logo" aria-label={`${BRAND_NAME} home`}>
            <LogoMark size={26} />
            <span>{BRAND_NAME}</span>
          </Link>

          <div className="ch-public-links">
            <Link to="/#home" className={`ch-public-link${isHome ? ' is-active' : ''}`}>Home</Link>
            <Link to="/#campaigns" className={`ch-public-link${isCampaigns ? ' is-active' : ''}`}>Campaigns</Link>
            <Link to="/#for-brands" className={`ch-public-link${isBrands ? ' is-active' : ''}`}>For Brands</Link>
            <Link to="/#for-brands" className={`ch-public-link${isAbout ? ' is-active' : ''}`}>About</Link>
          </div>

          <div className="ch-public-actions">
            {!authenticated ? (
              <>
                <Link to="/login" className="ch-public-auth-link ch-public-login">Login</Link>
                <Link to="/register" className="ch-public-auth-link ch-public-register">Register</Link>
              </>
            ) : (
              <>
                {user?.role === 'creator' && (
                  <Link to="/saved" className="ch-public-round" aria-label="Wishlist" title="Wishlist">
                    <Heart size={18} />
                  </Link>
                )}
                <div className="ch-public-profile" ref={profileRef}>
                  <button
                    type="button"
                    className="ch-public-avatar"
                    aria-label="Open profile menu"
                    aria-expanded={profileOpen}
                    onClick={() => setProfileOpen((value) => !value)}
                  >
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(avatarName)}
                  </button>
                  {profileOpen && (
                    <div className="ch-public-profile-menu" role="menu">
                      <div className="ch-public-profile-name">
                        <strong>{avatarName}</strong>
                        <span>{user?.role === 'business' ? 'Brand account' : 'Creator account'}</span>
                      </div>
                      <Link to="/dashboard" role="menuitem" onClick={() => setProfileOpen(false)}>Dashboard</Link>
                      <button type="button" className="logout" role="menuitem" onClick={handleLogout}>Log out</button>
                    </div>
                  )}
                </div>
              </>
            )}
            <button
              type="button"
              className="ch-public-burger"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="ch-public-mobile">
            <Link to="/#home" className={isHome ? 'is-active' : ''} onClick={closeMobile}>Home</Link>
            <Link to="/#campaigns" className={isCampaigns ? 'is-active' : ''} onClick={closeMobile}>Campaigns</Link>
            <Link to="/#for-brands" className={isBrands ? 'is-active' : ''} onClick={closeMobile}>For Brands</Link>
            <Link to="/#for-brands" className={isAbout ? 'is-active' : ''} onClick={closeMobile}>About</Link>
            {authenticated ? (
              <>
                {user?.role === 'creator' && <Link to="/saved" onClick={closeMobile}>Wishlist</Link>}
                <Link to="/dashboard" onClick={closeMobile}>Dashboard</Link>
                <button type="button" className="logout" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMobile}>Login</Link>
                <Link to="/register" onClick={closeMobile}>Register</Link>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  );
}

export default PublicNavbar;

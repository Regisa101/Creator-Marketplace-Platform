import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME, BRAND_PURPLE, BRAND_PURPLE_DARK, LogoMark, OFF_WHITE } from './Logo';
import { getSavedCampaigns, unsaveCampaign, type SavedCampaignEntry } from '../api/client';

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

  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlist, setWishlist] = useState<SavedCampaignEntry[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);

  const authenticated = !loading && !!user;
  const isHome = location.pathname === '/' && !location.hash;
  const isCampaigns = location.pathname.startsWith('/campaigns');
  const isBrands = location.hash === '#for-brands';
  const isAbout = false;

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setWishlistOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!wishlistOpen) return;
    let cancelled = false;
    setWishlistLoading(true);
    setWishlistError('');
    getSavedCampaigns()
      .then((data) => {
        if (!cancelled) setWishlist(data);
      })
      .catch((err) => {
        console.error('Could not load wishlist:', err);
        if (!cancelled) setWishlistError('Could not load your wishlist. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setWishlistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wishlistOpen]);

  // Lock page scroll while the wishlist drawer is open.
  useEffect(() => {
    if (!wishlistOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [wishlistOpen]);

  const handleRemoveFromWishlist = async (entry: SavedCampaignEntry) => {
    setRemovingId(entry.id);
    const previous = wishlist;
    setWishlist(wishlist.filter((item) => item.id !== entry.id));
    try {
      await unsaveCampaign(entry.campaign_id);
    } catch (err) {
      console.error('Could not remove saved campaign:', err);
      setWishlist(previous);
    } finally {
      setRemovingId(null);
    }
  };

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
          background: ${OFF_WHITE};
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
        .ch-public-wishlist-btn {
          width: 38px; height: 38px; border: none; background: transparent; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          color: #55545A; cursor: pointer;
        }
        .ch-public-wishlist-btn:hover, .ch-public-wishlist-btn.is-active { color: ${BRAND_PURPLE}; }
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
          .ch-public-actions > .ch-public-auth-link, .ch-public-actions > .ch-public-profile, .ch-public-actions > .ch-public-wishlist-btn { display: none; }
          .ch-public-burger { display: inline-flex; }
          .ch-public-logo { font-size: 20px; }
          .ch-public-mobile { display: block; }
        }

        .ch-wishlist-overlay {
          position: fixed; inset: 0; background: rgba(23, 23, 26, 0.32);
          z-index: 1400; animation: ch-fade-in .15s ease;
        }
        @keyframes ch-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .ch-wishlist-drawer {
          position: fixed; top: 0; right: 0; bottom: 0; width: min(400px, 100%);
          background: ${OFF_WHITE}; z-index: 1401; display: flex; flex-direction: column;
          box-shadow: -18px 0 48px rgba(36,31,46,.18);
          animation: ch-slide-in .22s ease;
        }
        @keyframes ch-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .ch-wishlist-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 22px; border-bottom: 1px solid #EEE8E2; flex-shrink: 0;
        }
        .ch-wishlist-title { display: flex; align-items: center; gap: 8px; font: 700 16px 'Poppins', sans-serif; color: #241F2E; }
        .ch-wishlist-close {
          width: 34px; height: 34px; border-radius: 9px; border: 1px solid #E5DFDA; background: #fff;
          color: #55545A; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .ch-wishlist-close:hover { color: ${BRAND_PURPLE}; border-color: #D7CDE4; }
        .ch-wishlist-body { flex: 1; overflow-y: auto; padding: 14px 18px 24px; }
        .ch-wishlist-state { padding: 60px 18px; text-align: center; color: #8A8394; font: 500 13px 'Poppins', sans-serif; }
        .ch-wishlist-empty-title { color: #241F2E; font-weight: 700; font-size: 14.5px; margin-bottom: 6px; }
        .ch-wishlist-item {
          display: flex; align-items: flex-start; gap: 10px; background: #fff; border: 1px solid #EEE8E2;
          border-radius: 14px; padding: 14px; margin-bottom: 10px;
        }
        .ch-wishlist-item-link { flex: 1; min-width: 0; text-decoration: none; color: inherit; }
        .ch-wishlist-item-title {
          font: 650 13.5px 'Poppins', sans-serif; color: #241F2E; margin: 0 0 5px; line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .ch-wishlist-item-meta { display: flex; align-items: center; gap: 5px; font: 500 11.5px 'Poppins', sans-serif; color: #8A8394; flex-wrap: wrap; }
        .ch-wishlist-remove {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; border: 1px solid #EEE8E2; background: #fff;
          color: #8A8394; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .ch-wishlist-remove:hover { background: #FFF0EF; border-color: #F6C8C8; color: #C84642; }
        .ch-wishlist-remove:disabled { opacity: .5; cursor: not-allowed; }
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
                  <button
                    type="button"
                    className={`ch-public-wishlist-btn${wishlistOpen ? ' is-active' : ''}`}
                    aria-label="Open wishlist"
                    title="Wishlist"
                    onClick={() => setWishlistOpen(true)}
                  >
                    <Heart size={19} fill={wishlistOpen ? 'currentColor' : 'none'} />
                  </button>
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
                {user?.role === 'creator' && (
                  <button type="button" className="ch-public-mobile-wishlist" onClick={() => { closeMobile(); setWishlistOpen(true); }}>
                    Wishlist
                  </button>
                )}
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

      {wishlistOpen && (
        <>
          <div className="ch-wishlist-overlay" onClick={() => setWishlistOpen(false)} />
          <aside className="ch-wishlist-drawer" role="dialog" aria-label="Wishlist">
            <div className="ch-wishlist-head">
              <span className="ch-wishlist-title"><Heart size={17} /> Wishlist</span>
              <button type="button" className="ch-wishlist-close" aria-label="Close wishlist" onClick={() => setWishlistOpen(false)}>
                <X size={17} />
              </button>
            </div>
            <div className="ch-wishlist-body">
              {wishlistLoading && <div className="ch-wishlist-state">Loading your wishlist…</div>}
              {!wishlistLoading && wishlistError && <div className="ch-wishlist-state">{wishlistError}</div>}
              {!wishlistLoading && !wishlistError && wishlist.length === 0 && (
                <div className="ch-wishlist-state">
                  <div className="ch-wishlist-empty-title">Nothing saved yet</div>
                  Tap the heart on any campaign to bookmark it here.
                </div>
              )}
              {!wishlistLoading && !wishlistError && wishlist.map((entry) => {
                const c = entry.campaign;
                return (
                  <div className="ch-wishlist-item" key={entry.id}>
                    <Link to={`/campaigns/${c.id}`} className="ch-wishlist-item-link" onClick={() => setWishlistOpen(false)}>
                      <p className="ch-wishlist-item-title">{c.title}</p>
                      <div className="ch-wishlist-item-meta">
                        <span>{c.brand_name || 'Business'}</span>
                        {c.category && <span>· {c.category}</span>}
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="ch-wishlist-remove"
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                      disabled={removingId === entry.id}
                      onClick={() => handleRemoveFromWishlist(entry)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

export default PublicNavbar;

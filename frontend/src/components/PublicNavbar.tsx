import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  Heart,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Trash2,
} from "lucide-react";
import { LogoMark } from "./Logo";
import { useAuth } from "../context/AuthContext";
import {
  getSavedCampaigns,
  unsaveCampaign,
  type SavedCampaignEntry,
} from "../api/client";

type PublicNavbarProps = {
  sticky?: boolean;
};

// The 3 sections this navbar can scroll to. Update these ids to match
// whatever section ids actually exist on your landing page.
type SectionKey = "home" | "campaigns" | "for-brands";
const SECTION_HASHES: Record<SectionKey, string> = {
  home: "#home",
  campaigns: "#campaigns",
  "for-brands": "#for-brands",
};

const SCROLL_TARGET_KEY = "ch-scroll-target";

const API_ORIGIN = "http://localhost:8000";

function mediaUrl(url?: string | null): string {
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  if (url.startsWith("/api/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url.replace(/^\/+/, "")}`;
}

function getInitials(fullName?: string | null): string {
  const value = (fullName || "User").trim();
  if (!value) return "U";

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return parts[0].slice(0, 2).toUpperCase();
}

function getAvatarUrl(user: any): string {
  return mediaUrl(
    user?.profile?.profile_image ||
      user?.profile?.profile_image_url ||
      user?.profile?.avatar_url ||
      user?.profile?.logo_url ||
      null
  );
}

export function PublicNavbar({ sticky = true }: PublicNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, isAuthenticated, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [saved, setSaved] = useState<SavedCampaignEntry[]>([]);
  // Which nav link is "lit up". Fixed on whatever was last clicked/landed on
  // (does not track scroll position), per your "static" requirement.
  const [activeSection, setActiveSection] = useState<SectionKey>("home");

  const profileWrapRef = useRef<HTMLDivElement>(null);

  const isLandingPage = location.pathname === "/";
  // Campaign Detail opened from Landing keeps the exact same public-navbar
  // experience as Landing, including the creator wishlist.
  const isLandingContext =
    isLandingPage || searchParams.get("source") === "landing";
  const isCreator = user?.role === "creator";
  const showWishlist = Boolean(
    !loading && isAuthenticated && isCreator && isLandingContext
  );

  const avatarUrl = getAvatarUrl(user);
  const initials = getInitials(user?.full_name);

  const loadWishlist = async () => {
    if (!isAuthenticated || !isCreator) {
      setSaved([]);
      return;
    }

    setWishlistLoading(true);

    try {
      const result = await getSavedCampaigns();
      setSaved(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Failed to load wishlist", error);
      setSaved([]);
    } finally {
      setWishlistLoading(false);
    }
  };

  useEffect(() => {
    if (showWishlist) {
      void loadWishlist();
    } else {
      setWishlistOpen(false);
      setSaved([]);
    }
  }, [showWishlist]);

  useEffect(() => {
    const handleWishlistChanged = () => {
      if (showWishlist) {
        void loadWishlist();
      }
    };

    window.addEventListener("ch:wishlist-changed", handleWishlistChanged);

    return () => {
      window.removeEventListener(
        "ch:wishlist-changed",
        handleWishlistChanged
      );
    };
  }, [showWishlist]);

  useEffect(() => {
    if (!wishlistOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWishlistOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [wishlistOpen]);

  useEffect(() => {
    document.body.style.overflow = wishlistOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [wishlistOpen]);

  // Close the profile dropdown on outside click or Escape.
  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (
        profileWrapRef.current &&
        !profileWrapRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  // On landing, either (a) honor a scroll target left behind by a
  // cross-page nav click, or (b) honor a hash already in the URL
  // (e.g. someone opened /#campaigns directly), and set the matching
  // nav link active.
  useEffect(() => {
    if (!isLandingPage) return;

    const pendingTarget = sessionStorage.getItem(SCROLL_TARGET_KEY);
    const targetId = pendingTarget || location.hash.replace("#", "");

    if (pendingTarget) {
      sessionStorage.removeItem(SCROLL_TARGET_KEY);
    }

    if (targetId) {
      const sectionKey: SectionKey =
        targetId === "campaigns" || targetId === "for-brands"
          ? targetId
          : "home";
      setActiveSection(sectionKey);

      requestAnimationFrame(() => {
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    // Only run this on mount / when landing status changes, not on every
    // hash change, since clicks below manage activeSection themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLandingPage]);

  const navLink = (href: string): string => {
    if (!href.startsWith("#")) return href;
    return isLandingContext ? href : `/${href}`;
  };

  const isActive = (href: string): boolean => {
    if (href === "#home") return activeSection === "home";
    if (href === "#campaigns") return activeSection === "campaigns";
    if (href === "#for-brands") return activeSection === "for-brands";

    return location.pathname === href;
  };

  // Handles clicks on Home / Campaigns / For Brands. If we're already on
  // the landing page, scroll straight to the section instead of letting
  // react-router treat it as a route change. If we're elsewhere, let the
  // Link navigate to "/#section" and stash the target so the effect above
  // can scroll to it once the landing page has mounted.
  const handleSectionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    section: SectionKey
  ) => {
    setActiveSection(section);
    setMobileOpen(false);

    const sectionId = section === "home" ? "home" : section;

    if (isLandingPage) {
      event.preventDefault();
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", SECTION_HASHES[section]);
    } else {
      sessionStorage.setItem(SCROLL_TARGET_KEY, sectionId);
    }
  };

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    logout();
    navigate("/");
  };

  const removeSaved = async (
    event: MouseEvent<HTMLButtonElement>,
    campaignId: number
  ) => {
    event.stopPropagation();

    try {
      await unsaveCampaign(campaignId);
      setSaved((items) =>
        items.filter((item) => item.campaign_id !== campaignId)
      );
    } catch (error) {
      console.error("Failed to remove wishlist item", error);
    }
  };

  const openCampaign = (campaignId: number) => {
    setWishlistOpen(false);
    navigate(`/campaigns/${campaignId}?source=landing`);
  };

  return (
    <>
      <style>{`
        .ch-public-nav {
          position: ${sticky ? "fixed" : "relative"};
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 9999;
          /* Set --ch-hero-bg to match your Hero section's exact background
             (color or gradient) so the navbar blends seamlessly into it. */
          background: var(--ch-hero-bg, rgba(255,253,250,.96));
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #EEE8E2;
          box-sizing: border-box;
        }

        .ch-public-nav-inner {
          max-width: 1240px;
          height: 72px;
          margin: 0 auto;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .ch-public-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #17171A;
          text-decoration: none;
          flex-shrink: 0;
        }

        .ch-public-logo-text {
          font-family: 'League Spartan', sans-serif;
          font-size: 21px;
          font-weight: 700;
          line-height: 1;
        }

        .ch-public-nav-links {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .ch-public-nav-link {
          position: relative;
          padding: 7px 0;
          color: #6F6A7C;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          background: transparent;
          border: 0;
          cursor: pointer;
        }

        .ch-public-nav-link:hover,
        .ch-public-nav-link.active {
          color: #7661A1;
        }

        .ch-public-nav-link.active {
          font-weight: 600;
        }

        .ch-public-nav-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 0;
          height: 2px;
          border-radius: 999px;
          background: #7661A1;
          transition: width .18s ease;
        }

        .ch-public-nav-link:hover::after,
        .ch-public-nav-link.active::after {
          width: 100%;
        }

        .ch-public-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .ch-public-login,
        .ch-public-register {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 68px;
          padding: 8px 15px;
          border: 1px solid #7661A1;
          border-radius: 8px;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }

        .ch-public-login {
          background: #7661A1;
          color: #fff;
        }

        .ch-public-register {
          background: #fff;
          color: #7661A1;
        }

        .ch-public-login:hover {
          background: #66518F;
        }

        .ch-public-register:hover {
          background: #F0EBF6;
        }

        .ch-public-icon-btn {
          position: relative;
          width: 38px;
          height: 38px;
          border: 1px solid #E7E0F3;
          border-radius: 50%;
          background: #fff;
          color: #7661A1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .ch-public-icon-btn:hover {
          background: #F5F0F8;
        }

        .ch-public-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid #E7E0F3;
          background: #F0EBF6;
          color: #7661A1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          text-decoration: none;
          font: 700 12px 'Poppins', sans-serif;
          padding: 0;
          cursor: pointer;
        }

        .ch-public-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ch-wishlist-badge {
          position: absolute;
          right: -2px;
          top: -3px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 99px;
          background: #7661A1;
          color: #fff;
          font: 700 9px/16px 'Poppins', sans-serif;
        }

        .ch-profile-wrap {
          position: relative;
        }

        .ch-profile-menu {
          position: absolute;
          right: 0;
          top: 47px;
          width: 190px;
          padding: 7px;
          background: #fff;
          border: 1px solid #EAE4F0;
          border-radius: 12px;
          box-shadow: 0 14px 35px rgba(38,28,54,.14);
          z-index: 10001;
        }

        .ch-profile-menu a,
        .ch-profile-menu button {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 11px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #383240;
          text-decoration: none;
          font: 500 13px 'Poppins', sans-serif;
          cursor: pointer;
          text-align: left;
        }

        .ch-profile-menu a:hover,
        .ch-profile-menu button:hover {
          background: #F5F0F8;
          color: #7661A1;
        }

        .ch-wishlist-drawer {
          position: fixed;
          inset: 0;
          z-index: 10000;
          pointer-events: none;
        }

        .ch-wishlist-drawer.open {
          pointer-events: auto;
        }

        .ch-wishlist-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(25,18,32,.32);
          opacity: 0;
          transition: opacity .22s ease;
        }

        .ch-wishlist-drawer.open .ch-wishlist-backdrop {
          opacity: 1;
        }

        .ch-wishlist-panel {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: min(410px, 92vw);
          background: #FFFDFA;
          box-shadow: -15px 0 40px rgba(35,25,45,.16);
          transform: translateX(100%);
          transition: transform .24s ease;
          display: flex;
          flex-direction: column;
        }

        .ch-wishlist-drawer.open .ch-wishlist-panel {
          transform: translateX(0);
        }

        .ch-wishlist-head {
          min-height: 72px;
          box-sizing: border-box;
          padding: 0 20px;
          border-bottom: 1px solid #EEE8E2;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ch-wishlist-head h3 {
          margin: 0;
          color: #211C29;
          font: 700 18px 'Poppins', sans-serif;
        }

        .ch-wishlist-close {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 50%;
          background: #F3EFF6;
          color: #7661A1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .ch-wishlist-list {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ch-wishlist-card {
          display: flex;
          gap: 12px;
          padding: 10px;
          border: 1px solid #EAE5EE;
          border-radius: 12px;
          background: #fff;
          cursor: pointer;
        }

        .ch-wishlist-card:hover {
          border-color: #CFC2DD;
        }

        .ch-wishlist-image {
          width: 76px;
          height: 68px;
          border-radius: 9px;
          object-fit: cover;
          background: #F0EBF6;
          flex: 0 0 auto;
        }

        .ch-wishlist-info {
          min-width: 0;
          flex: 1;
        }

        .ch-wishlist-title {
          margin: 2px 0 5px;
          color: #241F2C;
          font: 600 13px 'Poppins', sans-serif;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ch-wishlist-brand {
          color: #756E7E;
          font: 500 11px 'Poppins', sans-serif;
        }

        .ch-wishlist-budget {
          margin-top: 6px;
          color: #7661A1;
          font: 600 11px 'Poppins', sans-serif;
        }

        .ch-wishlist-remove {
          align-self: flex-start;
          padding: 4px;
          border: 0;
          background: transparent;
          color: #AAA2B2;
          cursor: pointer;
        }

        .ch-wishlist-remove:hover {
          color: #D35D68;
        }

        .ch-wishlist-empty {
          padding: 50px 24px;
          text-align: center;
          color: #7B7484;
          font: 500 13px/1.6 'Poppins', sans-serif;
        }

        .ch-public-burger {
          display: none;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          border: 1px solid #E7E0F3;
          border-radius: 8px;
          background: #fff;
          color: #7661A1;
          cursor: pointer;
        }

        .ch-public-mobile-panel {
          display: none;
        }

        .ch-public-nav-spacer {
          height: ${sticky ? "72px" : "0px"};
          width: 100%;
        }

        @media (max-width: 760px) {
          .ch-public-nav-inner {
            height: 64px;
            padding: 0 18px;
          }

          .ch-public-nav-spacer {
            height: ${sticky ? "64px" : "0px"};
          }

          .ch-public-nav-links,
          .ch-public-nav-actions {
            display: none;
          }

          .ch-public-burger {
            display: flex;
          }

          .ch-public-mobile-panel {
            display: block;
            padding: 12px 18px 16px;
            border-top: 1px solid #EEE8E2;
            background: #fff;
          }

          .ch-public-mobile-panel a,
          .ch-public-mobile-panel button.ch-public-mobile-link {
            display: block;
            width: 100%;
            padding: 9px 0;
            border: 0;
            background: transparent;
            color: #6F6A7C;
            text-decoration: none;
            font: 500 14px 'Poppins', sans-serif;
            text-align: left;
            cursor: pointer;
          }

          .ch-public-mobile-panel a.active,
          .ch-public-mobile-panel button.ch-public-mobile-link.active {
            color: #7661A1;
            font-weight: 600;
          }

          .ch-public-mobile-actions {
            display: flex;
            gap: 8px;
            padding-top: 8px;
          }

          .ch-public-mobile-actions > * {
            flex: 1;
            text-align: center;
          }

          .ch-public-mobile-profile {
            display: block;
            padding: 9px;
            border: 0;
            border-radius: 8px;
            background: #F0EBF6;
            color: #7661A1 !important;
            font: 600 13px 'Poppins', sans-serif;
            cursor: pointer;
          }

          .ch-wishlist-panel {
            width: min(430px, 96vw);
          }
        }
      `}</style>

      <nav className="ch-public-nav" aria-label="Main navigation">
        <div className="ch-public-nav-inner">
          <Link
            to={navLink("#home")}
            className="ch-public-logo"
            onClick={(event) => handleSectionClick(event, "home")}
          >
            <LogoMark size={24} />
            <span className="ch-public-logo-text">creatorhub</span>
          </Link>

          <div className="ch-public-nav-links">
            <Link
              to={navLink("#home")}
              className={`ch-public-nav-link ${
                isActive("#home") ? "active" : ""
              }`}
              onClick={(event) => handleSectionClick(event, "home")}
            >
              Home
            </Link>
            <Link
              to={navLink("#campaigns")}
              className={`ch-public-nav-link ${
                isActive("#campaigns") ? "active" : ""
              }`}
              onClick={(event) => handleSectionClick(event, "campaigns")}
            >
              Campaigns
            </Link>
            <Link
              to={navLink("#for-brands")}
              className={`ch-public-nav-link ${
                isActive("#for-brands") ? "active" : ""
              }`}
              onClick={(event) => handleSectionClick(event, "for-brands")}
            >
              For Brands
            </Link>
          </div>

          <div className="ch-public-nav-actions">
            {!loading && isAuthenticated ? (
              <>
                {showWishlist && (
                  <button
                    type="button"
                    className="ch-public-icon-btn"
                    aria-label="Open wishlist"
                    onClick={() => setWishlistOpen(true)}
                  >
                    <Heart size={18} />
                    {saved.length > 0 && (
                      <span className="ch-wishlist-badge">
                        {saved.length > 99 ? "99+" : saved.length}
                      </span>
                    )}
                  </button>
                )}

                <div className="ch-profile-wrap" ref={profileWrapRef}>
                  <button
                    type="button"
                    className="ch-public-avatar"
                    aria-label="Open profile menu"
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    onClick={() => setProfileOpen((value) => !value)}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </button>

                  {profileOpen && (
                    <div className="ch-profile-menu" role="menu">
                      <Link to="/dashboard" onClick={() => setProfileOpen(false)}>
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                      <Link to="/profile" onClick={() => setProfileOpen(false)}>
                        <LayoutDashboard size={16} />
                        Profile
                      </Link>
                      <button type="button" onClick={handleLogout}>
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : !loading ? (
              <>
                <Link to="/login" className="ch-public-login">
                  Login
                </Link>
                <Link to="/register" className="ch-public-register">
                  Register
                </Link>
              </>
            ) : null}
          </div>

          <button
            type="button"
            className="ch-public-burger"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="ch-public-mobile-panel">
            <Link
              to={navLink("#home")}
              className={isActive("#home") ? "active" : ""}
              onClick={(event) => handleSectionClick(event, "home")}
            >
              Home
            </Link>
            <Link
              to={navLink("#campaigns")}
              className={isActive("#campaigns") ? "active" : ""}
              onClick={(event) => handleSectionClick(event, "campaigns")}
            >
              Campaigns
            </Link>
            <Link
              to={navLink("#for-brands")}
              className={isActive("#for-brands") ? "active" : ""}
              onClick={(event) => handleSectionClick(event, "for-brands")}
            >
              For Brands
            </Link>

            {!loading && isAuthenticated ? (
              <div className="ch-public-mobile-actions">
                <Link
                  to="/dashboard"
                  className="ch-public-mobile-profile"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="ch-public-mobile-profile"
                  onClick={() => setMobileOpen(false)}
                >
                  Profile
                </Link>

                {showWishlist && (
                  <button
                    type="button"
                    className="ch-public-mobile-profile"
                    onClick={() => {
                      setMobileOpen(false);
                      setWishlistOpen(true);
                    }}
                  >
                    Wishlist ({saved.length})
                  </button>
                )}

                <button
                  type="button"
                  className="ch-public-mobile-profile"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : !loading ? (
              <div className="ch-public-mobile-actions">
                <Link
                  to="/login"
                  className="ch-public-login"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="ch-public-register"
                  onClick={() => setMobileOpen(false)}
                >
                  Register
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </nav>

      {showWishlist && (
        <div
          className={`ch-wishlist-drawer ${wishlistOpen ? "open" : ""}`}
          aria-hidden={!wishlistOpen}
        >
          <button
            type="button"
            className="ch-wishlist-backdrop"
            aria-label="Close wishlist"
            onClick={() => setWishlistOpen(false)}
          />

          <aside className="ch-wishlist-panel" aria-label="Wishlist">
            <div className="ch-wishlist-head">
              <h3>
                Wishlist{" "}
                <span
                  style={{
                    color: "#8C8494",
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  ({saved.length})
                </span>
              </h3>

              <button
                type="button"
                className="ch-wishlist-close"
                onClick={() => setWishlistOpen(false)}
                aria-label="Close wishlist"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ch-wishlist-list">
              {wishlistLoading ? (
                <div className="ch-wishlist-empty">
                  Loading your saved campaigns...
                </div>
              ) : saved.length === 0 ? (
                <div className="ch-wishlist-empty">
                  Your wishlist is empty.
                  <br />
                  Save campaigns you like and they will appear here.
                </div>
              ) : (
                saved.map((entry) => {
                  const campaign = entry.campaign;

                  return (
                    <div
                      key={entry.id}
                      className="ch-wishlist-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openCampaign(campaign.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCampaign(campaign.id);
                        }
                      }}
                    >
                      {campaign.hero_image ? (
                        <img
                          className="ch-wishlist-image"
                          src={mediaUrl(campaign.hero_image)}
                          alt=""
                        />
                      ) : (
                        <div className="ch-wishlist-image" />
                      )}

                      <div className="ch-wishlist-info">
                        <div className="ch-wishlist-title">
                          {campaign.title}
                        </div>
                        <div className="ch-wishlist-brand">
                          {campaign.brand_name || "Creatorhub campaign"}
                        </div>
                        {campaign.budget != null && (
                          <div className="ch-wishlist-budget">
                            Rs. {Number(campaign.budget).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="ch-wishlist-remove"
                        aria-label={`Remove ${campaign.title} from wishlist`}
                        onClick={(event) =>
                          void removeSaved(event, campaign.id)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
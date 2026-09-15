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
  Search,
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

  if (
    /^(https?:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
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
  const [activeSection, setActiveSection] =
    useState<SectionKey>("home");

  const [searchValue, setSearchValue] = useState("");

  const profileWrapRef = useRef<HTMLDivElement>(null);

  const isLandingPage = location.pathname === "/";

  const isLandingContext =
    isLandingPage || searchParams.get("source") === "landing";

  const isCreator = user?.role === "creator";

  const showWishlist = Boolean(
    !loading &&
      isAuthenticated &&
      isCreator &&
      isLandingContext
  );

  const avatarUrl = getAvatarUrl(user);
  const initials = getInitials(user?.full_name);

  /* ----------------------------------------------------------
     WISHLIST
  ---------------------------------------------------------- */

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

    window.addEventListener(
      "ch:wishlist-changed",
      handleWishlistChanged
    );

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

  /* ----------------------------------------------------------
     PROFILE MENU
  ---------------------------------------------------------- */

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

    document.addEventListener(
      "pointerdown",
      handleClickOutside
    );

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleClickOutside
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [profileOpen]);

  /* ----------------------------------------------------------
     LANDING PAGE SCROLL
  ---------------------------------------------------------- */

  useEffect(() => {
    if (!isLandingPage) return;

    const pendingTarget =
      sessionStorage.getItem(SCROLL_TARGET_KEY);

    const targetId =
      pendingTarget ||
      location.hash.replace("#", "");

    if (pendingTarget) {
      sessionStorage.removeItem(SCROLL_TARGET_KEY);
    }

    if (targetId) {
      const sectionKey: SectionKey =
        targetId === "campaigns" ||
        targetId === "for-brands"
          ? targetId
          : "home";

      setActiveSection(sectionKey);

      requestAnimationFrame(() => {
        document
          .getElementById(targetId)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      });
    }
  }, [isLandingPage]);

  const navLink = (href: string): string => {
    if (!href.startsWith("#")) return href;

    return isLandingContext ? href : `/${href}`;
  };

  const isActive = (href: string): boolean => {
    if (href === "#home") {
      return activeSection === "home";
    }

    if (href === "#campaigns") {
      return activeSection === "campaigns";
    }

    if (href === "#for-brands") {
      return activeSection === "for-brands";
    }

    return location.pathname === href;
  };

  const handleSectionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    section: SectionKey
  ) => {
    setActiveSection(section);
    setMobileOpen(false);

    const sectionId =
      section === "home" ? "home" : section;

    if (isLandingPage) {
      event.preventDefault();

      document
        .getElementById(sectionId)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

      window.history.replaceState(
        null,
        "",
        SECTION_HASHES[section]
      );
    } else {
      sessionStorage.setItem(
        SCROLL_TARGET_KEY,
        sectionId
      );
    }
  };

  /* ----------------------------------------------------------
     SEARCH
  ---------------------------------------------------------- */

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();

    const value = searchValue.trim();

    if (!value) {
      navigate("/campaigns");
      return;
    }

    navigate(
      `/campaigns?search=${encodeURIComponent(value)}`
    );

    setMobileOpen(false);
  };

  /* ----------------------------------------------------------
     LOGOUT
  ---------------------------------------------------------- */

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileOpen(false);

    logout();
    navigate("/");
  };

  /* ----------------------------------------------------------
     WISHLIST ACTIONS
  ---------------------------------------------------------- */

  const removeSaved = async (
    event: MouseEvent<HTMLButtonElement>,
    campaignId: number
  ) => {
    event.stopPropagation();

    try {
      await unsaveCampaign(campaignId);

      setSaved((items) =>
        items.filter(
          (item) => item.campaign_id !== campaignId
        )
      );
    } catch (error) {
      console.error(
        "Failed to remove wishlist item",
        error
      );
    }
  };

  const openCampaign = (campaignId: number) => {
    setWishlistOpen(false);

    navigate(
      `/campaigns/${campaignId}?source=landing`
    );
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
          background: #FFFFFF;
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #E5E5E5;
          box-sizing: border-box;
        }

        /*
         * =====================================================
         * TOP ROW
         * =====================================================
         *
         * Logo is centered.
         * Search is on the left.
         * Login/Register or profile actions are on the right.
         */

        .ch-public-top {
          position: relative;
          max-width: 1240px;
          height: 78px;
          margin: 0 auto;
          padding: 0 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .ch-public-top-left,
        .ch-public-top-right {
          width: 330px;
          display: flex;
          align-items: center;
        }

        .ch-public-top-left {
          justify-content: flex-start;
        }

        .ch-public-top-right {
          justify-content: flex-end;
        }

        /*
         * =====================================================
         * CENTERED LOGO
         * =====================================================
         */

        .ch-public-logo {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);

          display: flex;
          align-items: center;
          gap: 13px;

          color: #111111;
          text-decoration: none;
          white-space: nowrap;
          z-index: 2;
        }

        .ch-public-logo-text {
          font-family: 'League Spartan', sans-serif;
          font-size: 23px;
          font-weight: 600;
          letter-spacing: 0.01em;
          line-height: 1;
        }

        /*
         * =====================================================
         * SEARCH
         * =====================================================
         */

        .ch-public-search,
        .ch-public-search * {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .ch-public-search {
          width: 280px;
          height: 40px;

          display: flex;
          align-items: center;

          border-radius: 22px;
          background: #FAFAFA;

          overflow: hidden;
          transition:
            background .18s ease,
            box-shadow .18s ease;
        }

        .ch-public-search:focus-within {
          background: #FFFFFF;
          box-shadow: 0 4px 14px rgba(0,0,0,.05) !important;
        }

        .ch-public-search-icon {
          margin-left: 14px;
          flex-shrink: 0;
          color: #8A8490;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .ch-public-search-input {
          width: 100%;
          height: 100%;
          padding: 0 14px 0 9px;

          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent;
          caret-color: #222222;
          -webkit-appearance: none;
          appearance: none;

          color: #222222;
          font: 400 13px 'Poppins', sans-serif;
        }

        /*
         * The app's global stylesheet applies
         *   input:focus { border-color: #111 !important; box-shadow: 0 0 0 2px rgba(17,17,17,.08) !important; }
         * to every input on focus. That rule's specificity (element + :focus)
         * beats a plain class selector, so it was leaking a faint ring around
         * this <input> on focus, visible as a line right after the icon.
         * This selector matches class + :focus, which is more specific and wins.
         */
        .ch-public-search-input:focus {
          border: none !important;
          border-color: transparent !important;
          outline: none !important;
          outline-color: transparent !important;
          box-shadow: none !important;
        }

        .ch-public-search-input::placeholder {
          color: #99939F;
        }

        /*
         * =====================================================
         * NAV MENUS
         * =====================================================
         */

        .ch-public-nav-menu-row {
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ch-public-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
        }

        .ch-public-nav-link {
          position: relative;

          display: inline-flex;
          align-items: center;

          height: 48px;
          padding: 0;

          color: #6F6A7C;
          text-decoration: none;

          border: 0;
          background: transparent;

          font: 500 14px 'Poppins', sans-serif;

          transition: color .18s ease;
        }

        .ch-public-nav-link:hover,
        .ch-public-nav-link.active {
          color: #111111;
        }

        .ch-public-nav-link.active {
          font-weight: 600;
        }

        .ch-public-nav-link::after {
          content: '';

          position: absolute;
          left: 0;
          right: 0;
          bottom: 6px;

          width: 0;
          height: 2px;

          margin: auto;

          border-radius: 2px;
          background: #111111;

          transition: width .18s ease;
        }

        .ch-public-nav-link:hover::after,
        .ch-public-nav-link.active::after {
          width: 100%;
        }

        /*
         * =====================================================
         * LOGIN / REGISTER
         * =====================================================
         */

        .ch-public-nav-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .ch-public-login,
        .ch-public-register {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          min-width: 72px;
          height: 38px;
          box-sizing: border-box;

          padding: 0 15px;

          border: 1px solid #111111;
          border-radius: 8px;

          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 500;

          text-decoration: none;

          transition: all .18s ease;
        }

        .ch-public-login {
          background: #111111;
          color: #FFFFFF;
        }

        .ch-public-register {
          background: #FFFFFF;
          color: #111111;
        }

        .ch-public-login:hover {
          background: #000000;
          border-color: #000000;
          color: #FFFFFF;
          transform: translateY(-1px);
        }

        .ch-public-register:hover {
          background: #F5F5F5;
          border-color: #111111;
          color: #111111;
          transform: translateY(-1px);
        }

        .ch-public-login:focus-visible,
        .ch-public-register:focus-visible {
          outline: 2px solid #111111;
          outline-offset: 2px;
        }

        /*
         * =====================================================
         * ICON BUTTON
         * =====================================================
         */

        .ch-public-icon-btn {
          position: relative;

          width: 38px;
          height: 38px;

          border: 1px solid #E5E5E5;
          border-radius: 50%;

          background: #FFFFFF;
          color: #111111;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;
        }

        .ch-public-icon-btn:hover {
          background: #F5F5F5;
        }

        /*
         * =====================================================
         * AVATAR
         * =====================================================
         */

        .ch-public-avatar {
          width: 38px;
          height: 38px;

          border-radius: 50%;
          border: 1px solid #E5E5E5;

          background: #F3F3F3;
          color: #111111;

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

        /*
         * =====================================================
         * WISHLIST BADGE
         * =====================================================
         */

        .ch-wishlist-badge {
          position: absolute;
          right: -2px;
          top: -3px;

          min-width: 16px;
          height: 16px;

          padding: 0 4px;

          border-radius: 99px;

          background: #111111;
          color: #FFFFFF;

          font: 700 9px/16px 'Poppins', sans-serif;
        }

        /*
         * =====================================================
         * PROFILE DROPDOWN
         * =====================================================
         */

        .ch-profile-wrap {
          position: relative;
        }

        .ch-profile-menu {
          position: absolute;

          right: 0;
          top: calc(100% + 76px);

          width: 190px;

          padding: 7px;

          background: #FFFFFF;
          border: 1px solid #E6E6E6;
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
          background: #F5F5F5;
          color: #111111;
        }

        /*
         * =====================================================
         * WISHLIST DRAWER
         * =====================================================
         */

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

          border-bottom: 1px solid #E5E5E5;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ch-wishlist-head h3 {
          margin: 0;

          color: #1E1E1E;

          font: 700 18px 'Poppins', sans-serif;
        }

        .ch-wishlist-close {
          width: 36px;
          height: 36px;

          border: 0;
          border-radius: 50%;

          background: #F0F0F0;
          color: #111111;

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

          border: 1px solid #E7E7E7;
          border-radius: 12px;

          background: #FFFFFF;

          cursor: pointer;
        }

        .ch-wishlist-card:hover {
          border-color: #C7C7C7;
        }

        .ch-wishlist-image {
          width: 76px;
          height: 68px;

          border-radius: 9px;

          object-fit: cover;

          background: #F3F3F3;

          flex: 0 0 auto;
        }

        .ch-wishlist-info {
          min-width: 0;
          flex: 1;
        }

        .ch-wishlist-title {
          margin: 2px 0 5px;

          color: #212121;

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

          color: #111111;

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
          color: #777777;
        }

        .ch-wishlist-empty {
          padding: 50px 24px;

          text-align: center;

          color: #7B7484;

          font: 500 13px/1.6 'Poppins', sans-serif;
        }

        /*
         * =====================================================
         * MOBILE
         * =====================================================
         */

        .ch-public-burger {
          display: none;

          width: 38px;
          height: 38px;

          align-items: center;
          justify-content: center;

          border: 1px solid #E5E5E5;
          border-radius: 8px;

          background: #FFFFFF;
          color: #111111;

          cursor: pointer;
        }

        .ch-public-mobile-panel {
          display: none;
        }

        /*
         * Total desktop navbar height:
         * 78px top row + 48px menu row = 126px
         */

        .ch-public-nav-spacer {
          height: ${sticky ? "126px" : "0px"};
          width: 100%;
        }

        @media (max-width: 900px) {
          .ch-public-top {
            padding: 0 24px;
          }

          .ch-public-top-left,
          .ch-public-top-right {
            width: 280px;
          }

          .ch-public-search {
            width: 235px;
          }

          .ch-public-nav-links {
            gap: 34px;
          }
        }

        @media (max-width: 760px) {
          .ch-public-top {
            height: 64px;
            padding: 0 18px;
          }

          .ch-public-nav-spacer {
            height: ${sticky ? "64px" : "0px"};
          }

          .ch-public-top-left {
            display: none;
          }

          .ch-public-top-right {
            width: auto;
            margin-left: auto;
          }

          .ch-public-logo {
            position: static;
            transform: none;
          }

          .ch-public-logo-text {
            font-size: 20px;
          }

          .ch-public-nav-menu-row {
            display: none;
          }

          .ch-public-nav-actions {
            display: none;
          }

          .ch-public-burger {
            display: flex;
          }

          .ch-public-mobile-panel {
            display: block;

            padding: 12px 18px 16px;

            border-top: 1px solid #E5E5E5;
            background: #FFFFFF;
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
            color: #111111;
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

            background: #F3F3F3;
            color: #111111 !important;

            font: 600 13px 'Poppins', sans-serif;

            cursor: pointer;
          }

          .ch-wishlist-panel {
            width: min(430px, 96vw);
          }
        }
      `}</style>

      <nav
        className="ch-public-nav"
        aria-label="Main navigation"
      >
        {/* =====================================================
            TOP ROW
            ===================================================== */}

        <div className="ch-public-top">

          {/* LEFT — SEARCH */}

          <div className="ch-public-top-left">
            <form
              className="ch-public-search"
              onSubmit={handleSearch}
            >
              <Search
                size={17}
                className="ch-public-search-icon"
              />

              <input
                type="text"
                className="ch-public-search-input"
                placeholder="Search campaigns..."
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(event.target.value)
                }
                aria-label="Search campaigns"
              />
            </form>
          </div>

          {/* CENTER — LOGO */}

          <Link
            to={navLink("#home")}
            className="ch-public-logo"
            onClick={(event) =>
              handleSectionClick(event, "home")
            }
          >
            <LogoMark size={27} />

            <span className="ch-public-logo-text">
              creatorhub
            </span>
          </Link>

          {/* RIGHT — LOGIN / REGISTER / USER */}

          <div className="ch-public-top-right">
            <div className="ch-public-nav-actions">

              {!loading && isAuthenticated ? (
                <>
                  {showWishlist && (
                    <button
                      type="button"
                      className="ch-public-icon-btn"
                      aria-label="Open wishlist"
                      onClick={() =>
                        setWishlistOpen(true)
                      }
                    >
                      <Heart size={18} />

                      {saved.length > 0 && (
                        <span className="ch-wishlist-badge">
                          {saved.length > 99
                            ? "99+"
                            : saved.length}
                        </span>
                      )}
                    </button>
                  )}

                  <div
                    className="ch-profile-wrap"
                    ref={profileWrapRef}
                  >
                    <button
                      type="button"
                      className="ch-public-avatar"
                      aria-label="Open profile menu"
                      aria-haspopup="menu"
                      aria-expanded={profileOpen}
                      onClick={() =>
                        setProfileOpen(
                          (value) => !value
                        )
                      }
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Profile"
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </button>

                    {profileOpen && (
                      <div
                        className="ch-profile-menu"
                        role="menu"
                      >
                        <Link
                          to="/dashboard"
                          onClick={() =>
                            setProfileOpen(false)
                          }
                        >
                          <LayoutDashboard size={16} />
                          Dashboard
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() =>
                            setProfileOpen(false)
                          }
                        >
                          <LayoutDashboard size={16} />
                          Profile
                        </Link>

                        <button
                          type="button"
                          onClick={handleLogout}
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : !loading ? (
                <>
                  <Link
                    to="/login"
                    className="ch-public-login"
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    className="ch-public-register"
                  >
                    Register
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {/* MOBILE MENU BUTTON */}

          <button
            type="button"
            className="ch-public-burger"
            aria-label={
              mobileOpen
                ? "Close menu"
                : "Open menu"
            }
            onClick={() =>
              setMobileOpen((value) => !value)
            }
          >
            {mobileOpen ? (
              <X size={20} />
            ) : (
              <Menu size={20} />
            )}
          </button>
        </div>

        {/* =====================================================
            SECOND ROW — NAV MENUS
            ===================================================== */}

        <div className="ch-public-nav-menu-row">
          <div className="ch-public-nav-links">

            <Link
              to={navLink("#home")}
              className={`ch-public-nav-link ${
                isActive("#home")
                  ? "active"
                  : ""
              }`}
              onClick={(event) =>
                handleSectionClick(
                  event,
                  "home"
                )
              }
            >
              Home
            </Link>

            <Link
              to={navLink("#campaigns")}
              className={`ch-public-nav-link ${
                isActive("#campaigns")
                  ? "active"
                  : ""
              }`}
              onClick={(event) =>
                handleSectionClick(
                  event,
                  "campaigns"
                )
              }
            >
              Campaigns
            </Link>

            <Link
              to={navLink("#for-brands")}
              className={`ch-public-nav-link ${
                isActive("#for-brands")
                  ? "active"
                  : ""
              }`}
              onClick={(event) =>
                handleSectionClick(
                  event,
                  "for-brands"
                )
              }
            >
              For Brands
            </Link>
          </div>
        </div>

        {/* =====================================================
            MOBILE MENU
            ===================================================== */}

        {mobileOpen && (
          <div className="ch-public-mobile-panel">

            <form
              className="ch-public-search"
              onSubmit={handleSearch}
              style={{
                width: "100%",
                marginBottom: "8px",
              }}
            >
              <Search
                size={17}
                className="ch-public-search-icon"
              />

              <input
                type="text"
                className="ch-public-search-input"
                placeholder="Search campaigns..."
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(
                    event.target.value
                  )
                }
              />
            </form>

            <Link
              to={navLink("#home")}
              className={
                isActive("#home")
                  ? "active"
                  : ""
              }
              onClick={(event) =>
                handleSectionClick(
                  event,
                  "home"
                )
              }
            >
              Home
            </Link>

            <Link
              to={navLink("#campaigns")}
              className={
                isActive("#campaigns")
                  ? "active"
                  : ""
              }
              onClick={(event) =>
                handleSectionClick(
                  event,
                  "campaigns"
                )
              }
            >
              Campaigns
            </Link>

            <Link
              to={navLink("#for-brands")}
              className={
                isActive("#for-brands")
                  ? "active"
                  : ""
              }
              onClick={(event) =>
                handleSectionClick(
                  event,
                  "for-brands"
                )
              }
            >
              For Brands
            </Link>

            {!loading && isAuthenticated ? (
              <div className="ch-public-mobile-actions">

                <Link
                  to="/dashboard"
                  className="ch-public-mobile-profile"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  Dashboard
                </Link>

                <Link
                  to="/profile"
                  className="ch-public-mobile-profile"
                  onClick={() =>
                    setMobileOpen(false)
                  }
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
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="ch-public-register"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  Register
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </nav>

      {/* =======================================================
          WISHLIST DRAWER
      ======================================================= */}

      {showWishlist && (
        <div
          className={`ch-wishlist-drawer ${
            wishlistOpen ? "open" : ""
          }`}
          aria-hidden={!wishlistOpen}
        >
          <button
            type="button"
            className="ch-wishlist-backdrop"
            aria-label="Close wishlist"
            onClick={() =>
              setWishlistOpen(false)
            }
          />

          <aside
            className="ch-wishlist-panel"
            aria-label="Wishlist"
          >
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
                onClick={() =>
                  setWishlistOpen(false)
                }
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
                  Save campaigns you like and they
                  will appear here.
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
                      onClick={() =>
                        openCampaign(
                          campaign.id
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" ||
                          event.key === " "
                        ) {
                          event.preventDefault();

                          openCampaign(
                            campaign.id
                          );
                        }
                      }}
                    >
                      {campaign.hero_image ? (
                        <img
                          className="ch-wishlist-image"
                          src={mediaUrl(
                            campaign.hero_image
                          )}
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
                          {campaign.brand_name ||
                            "Creatorhub campaign"}
                        </div>

                        {campaign.budget != null && (
                          <div className="ch-wishlist-budget">
                            Rs.{" "}
                            {Number(
                              campaign.budget
                            ).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="ch-wishlist-remove"
                        aria-label={`Remove ${campaign.title} from wishlist`}
                        onClick={(event) =>
                          void removeSaved(
                            event,
                            campaign.id
                          )
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
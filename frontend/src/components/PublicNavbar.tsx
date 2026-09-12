import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LogoMark } from "./Logo";
import { Menu, X } from "lucide-react";

type PublicNavbarProps = {
  sticky?: boolean;
};

export function PublicNavbar({ sticky = true }: PublicNavbarProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLandingPage = location.pathname === "/";

  const navLink = (href: string) => {
    if (href.startsWith("#")) {
      return isLandingPage ? href : `/${href}`;
    }

    return href;
  };

  const isActive = (href: string) => {
    if (href === "#home") {
      return isLandingPage && !location.hash;
    }

    if (href === "#campaigns") {
      return isLandingPage && location.hash === "#campaigns";
    }

    if (href === "#for-brands") {
      return isLandingPage && location.hash === "#for-brands";
    }

    return location.pathname === href;
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
          background: rgba(255, 253, 250, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
          text-decoration: none;
          flex-shrink: 0;
        }

        .ch-public-logo-text {
          color: #17171A;
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
          transition: color 0.18s ease;
        }

        .ch-public-nav-link:hover {
          color: #7661A1;
        }

        .ch-public-nav-link.active {
          color: #7661A1;
          font-weight: 600;
        }

        .ch-public-nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 0;
          height: 2px;
          border-radius: 999px;
          background: #7661A1;
          transition: width 0.18s ease;
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

        .ch-public-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 68px;
          padding: 8px 15px;
          border: 1px solid #7661A1;
          border-radius: 8px;
          background: #7661A1;
          color: #fff;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.18s ease;
        }

        .ch-public-login:hover {
          background: #66518F;
          border-color: #66518F;
          transform: translateY(-1px);
        }

        .ch-public-register {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 68px;
          padding: 8px 15px;
          border: 1px solid #7661A1;
          border-radius: 8px;
          background: #fff;
          color: #7661A1;
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.18s ease;
        }

        .ch-public-register:hover {
          background: #F0EBF6;
          transform: translateY(-1px);
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
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          font-weight: 700;
          overflow: hidden;
          text-decoration: none;
        }

        .ch-public-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
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

        /*
         * IMPORTANT:
         * Because the navbar is fixed, the page needs top spacing.
         * This prevents the hero section from hiding underneath it.
         */
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
            display: flex;
            flex-direction: column;
            gap: 3px;
            padding: 10px 18px 18px;
            background: rgba(255, 253, 250, 0.98);
            border-top: 1px solid #EEE8E2;
          }

          .ch-public-mobile-panel a {
            display: block;
            padding: 11px 4px;
            color: #241F2E;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
          }

          .ch-public-mobile-panel a:hover {
            color: #7661A1;
          }

          .ch-public-mobile-actions {
            display: flex;
            gap: 8px;
            padding-top: 8px;
          }

          .ch-public-mobile-actions a {
            flex: 1;
            text-align: center;
            border-radius: 8px;
          }
        }
      `}</style>

      <nav className="ch-public-nav" aria-label="Main navigation">
        <div className="ch-public-nav-inner">

          {/* LOGO */}
          <Link
            to={navLink("#home")}
            className="ch-public-logo"
            onClick={() => setMobileOpen(false)}
          >
            <LogoMark size={24} />
            <span className="ch-public-logo-text">
              creatorhub
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <div className="ch-public-nav-links">
            <Link
              to={navLink("#home")}
              className={`ch-public-nav-link ${
                isActive("#home") ? "active" : ""
              }`}
            >
              Home
            </Link>

            <Link
              to={navLink("#campaigns")}
              className={`ch-public-nav-link ${
                isActive("#campaigns") ? "active" : ""
              }`}
            >
              Campaigns
            </Link>

            <Link
              to={navLink("#for-brands")}
              className={`ch-public-nav-link ${
                isActive("#for-brands") ? "active" : ""
              }`}
            >
              For Brands
            </Link>
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="ch-public-nav-actions">
            <Link to="/login" className="ch-public-login">
              Login
            </Link>

            <Link to="/register" className="ch-public-register">
              Register
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            className="ch-public-burger"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && (
          <div className="ch-public-mobile-panel">
            <Link
              to={navLink("#home")}
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>

            <Link
              to={navLink("#campaigns")}
              onClick={() => setMobileOpen(false)}
            >
              Campaigns
            </Link>

            <Link
              to={navLink("#for-brands")}
              onClick={() => setMobileOpen(false)}
            >
              For Brands
            </Link>

            <div className="ch-public-mobile-actions">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                style={{
                  background: "#7661A1",
                  color: "#fff",
                }}
              >
                Login
              </Link>

              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                style={{
                  background: "#F0EBF6",
                  color: "#7661A1",
                }}
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Keeps Landing content from going underneath the fixed navbar */}
      <div className="ch-public-nav-spacer" />
    </>
  );
}

export default PublicNavbar;
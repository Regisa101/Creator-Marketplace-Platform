import { useLocation, Link } from "react-router-dom";
import { ArrowRight, UserRound, Building2 } from "lucide-react";
import { LogoMark } from "../../components/Logo";

export function RoleSelect() {
  const location = useLocation();

  const mode: "login" | "register" =
    location.pathname.startsWith("/login")
      ? "login"
      : "register";

  return (
    <div className="rs-page">
      <style>{`
        /* =====================================================
           PAGE
        ===================================================== */

        .rs-page {
          min-height: 100vh;
          width: 100%;

          margin: 0;
          padding: 0;

          background: #ffffff;
          color: #111111;

          font-family:
            Poppins,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;

          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .rs-page *,
        .rs-page *::before,
        .rs-page *::after {
          box-sizing: border-box;
        }

        .rs-page a {
          text-decoration: none;
        }


        /* =====================================================
           LOGO
           
           Completely white.
           No navbar.
           No border.
           No divider.
           No gradient.
        ===================================================== */

        .rs-logo {
          width: 100%;
          height: 90px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #ffffff;

          border: none;
          outline: none;
          box-shadow: none;
        }

        .rs-logo-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          color: #111111;

          text-decoration: none;

          transition: opacity 0.18s ease;
        }

        .rs-logo-link:hover {
          opacity: 0.7;
        }

        .rs-logo-mark {
          display: flex;
          align-items: center;
          justify-content: center;

          line-height: 0;
        }

        .rs-logo-text {
          color: #111111;

          font-size: 22px;
          line-height: 1;

          font-weight: 500;

          letter-spacing: -0.9px;
        }


        /* =====================================================
           MAIN CONTENT
        ===================================================== */

        .rs-shell {
          width: 100%;
          max-width: 900px;

          display: flex;
          flex-direction: column;
          align-items: center;

          padding:
            5px
            24px
            60px;
        }


        /* =====================================================
           HEADING
        ===================================================== */

        .rs-heading {
          width: 100%;

          text-align: center;

          margin: 0 0 42px;
        }

        .rs-title {
          margin: 0;

          color: #111111;

          font-size: 42px;
          line-height: 1.12;

          font-weight: 400;

          letter-spacing: -1.4px;
        }

        .rs-subtitle {
          margin: 15px 0 0;

          color: #666666;

          font-size: 15px;
          line-height: 1.55;

          font-weight: 400;
        }


        /* =====================================================
           ROLE GRID
        ===================================================== */

        .rs-grid {
          width: 100%;

          display: grid;

          grid-template-columns:
            repeat(2, 250px);

          justify-content: center;

          gap: 24px;
        }


        /* =====================================================
           ROLE CARD
        ===================================================== */

        .rs-card {
          width: 250px;
          min-height: 315px;

          position: relative;

          display: flex;
          flex-direction: column;

          overflow: hidden;

          background: #ffffff;

          border:
            1px solid #dddddd;

          border-radius: 9px;

          color: #111111;

          cursor: pointer;

          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .rs-card:hover {
          transform: translateY(-3px);

          border-color: #aaaaaa;

          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.07);
        }


        /* =====================================================
           CARD VISUAL
           
           Monochrome gradient only.
           No pink.
           No purple.
           No green.
        ===================================================== */

        .rs-visual {
          position: relative;

          height: 205px;

          margin:
            16px
            16px
            0;

          overflow: hidden;

          border-radius: 8px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            1px solid rgba(0, 0, 0, 0.035);
        }

        .rs-card--creator .rs-visual {
          background:
            radial-gradient(
              circle at 25% 20%,
              #ffffff 0%,
              #f2f2f2 45%,
              #dddddd 100%
            );
        }

        .rs-card--business .rs-visual {
          background:
            radial-gradient(
              circle at 75% 25%,
              #ffffff 0%,
              #eeeeee 45%,
              #d9d9d9 100%
            );
        }

        .rs-visual::after {
          content: "";

          position: absolute;

          inset: 0;

          pointer-events: none;

          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.42),
              transparent 60%
            );
        }


        /* =====================================================
           ROLE ICON
        ===================================================== */

        .rs-role-icon {
          position: relative;

          z-index: 2;

          width: 68px;
          height: 68px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #111111;
        }

        .rs-role-icon svg {
          width: 48px;
          height: 48px;

          stroke-width: 1.35;
        }


        /* =====================================================
           CARD BODY
        ===================================================== */

        .rs-body {
          flex: 1;

          padding:
            18px
            16px
            20px;

          display: flex;
          flex-direction: column;
          align-items: center;

          text-align: center;
        }

        .rs-name {
          margin: 0;

          color: #111111;

          font-size: 18px;
          line-height: 1.3;

          font-weight: 400;

          letter-spacing: -0.2px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 4px;
        }

        .rs-name svg {
          width: 16px;
          height: 16px;

          stroke-width: 1.6;
        }

        .rs-desc {
          margin:
            7px
            0
            0;

          color: #707070;

          font-size: 13px;
          line-height: 1.45;

          font-weight: 400;

          max-width: 195px;
        }


        /* =====================================================
           LOGIN / REGISTER SWITCH
        ===================================================== */

        .rs-switch {
          margin-top: 38px;

          color: #555555;

          font-size: 13px;
          line-height: 1.5;

          font-weight: 400;

          text-align: center;
        }

        .rs-switch a {
          color: #111111;

          font-weight: 500;

          text-decoration: underline;

          text-underline-offset: 3px;

          transition: color 0.15s ease;
        }

        .rs-switch a:hover {
          color: #666666;
        }


        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 650px) {

          .rs-logo {
            height: 76px;
          }

          .rs-shell {
            padding:
              45px
              18px
              45px;
          }

          .rs-title {
            font-size: 34px;
            letter-spacing: -1px;
          }

          .rs-subtitle {
            font-size: 14px;
          }

          .rs-heading {
            margin-bottom: 34px;
          }

          .rs-grid {
            width: 100%;
            max-width: 310px;

            grid-template-columns: 1fr;

            gap: 18px;
          }

          .rs-card {
            width: 100%;
          }
        }


        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 380px) {

          .rs-shell {
            padding-top: 35px;
          }

          .rs-title {
            font-size: 30px;
          }

          .rs-card {
            min-height: 300px;
          }

          .rs-visual {
            height: 190px;
          }
        }
      `}</style>


      {/* =====================================================
          CENTERED CREATORHUB LOGO

          Pure white.
          No navbar.
          No divider.
      ===================================================== */}

      <header className="rs-logo">
        <Link
          to="/"
          className="rs-logo-link"
          aria-label="Creatorhub home"
        >
          <span className="rs-logo-mark">
            <LogoMark size={27} />
          </span>

          <span className="rs-logo-text">
            creatorhub
          </span>
        </Link>
      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="rs-shell">

        {/* Heading */}

        <header className="rs-heading">

          <h1 className="rs-title">
            {mode === "login"
              ? "How do you want to log in?"
              : "How do you want to get started?"}
          </h1>

          <p className="rs-subtitle">
            Choose the account type that matches
            <br />
            what you want to do on creatorhub.
          </p>

        </header>


        {/* ===================================================
            ROLE CARDS
        =================================================== */}

        <div className="rs-grid">

          {/* =================================================
              CREATOR
          ================================================= */}

          <Link
            to={`/${mode}/creator`}
            className="rs-card rs-card--creator"
          >

            <div className="rs-visual">

              <span className="rs-role-icon">
                <UserRound />
              </span>

            </div>

            <div className="rs-body">

              <h2 className="rs-name">

                <span>
                  I&apos;m a Creator
                </span>

                <ArrowRight />

              </h2>

              <p className="rs-desc">
                Work and get paid
              </p>

            </div>

          </Link>


          {/* =================================================
              BRAND
          ================================================= */}

          <Link
            to={`/${mode}/business`}
            className="rs-card rs-card--business"
          >

            <div className="rs-visual">

              <span className="rs-role-icon">
                <Building2 />
              </span>

            </div>

            <div className="rs-body">

              <h2 className="rs-name">

                <span>
                  I&apos;m a Brand
                </span>

                <ArrowRight />

              </h2>

              <p className="rs-desc">
                Find creators and launch campaigns
              </p>

            </div>

          </Link>

        </div>


        {/* ===================================================
            LOGIN / REGISTER
        =================================================== */}

        <div className="rs-switch">

          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}

              <Link to="/register">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}

              <Link to="/login">
                Log in
              </Link>
            </>
          )}

        </div>

      </main>
    </div>
  );
}

export default RoleSelect;
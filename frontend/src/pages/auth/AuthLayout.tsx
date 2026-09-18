import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogoMark } from "../../components/Logo";
import type { Role } from "./theme";

interface AuthLayoutProps {
  mode: "login" | "register";
  title: string;
  children: ReactNode;
  role?: Role;
}

export function AuthLayout({
  mode,
  title,
  children,
  role,
}: AuthLayoutProps) {
  const isBusiness = role === "business";

  const alternatePath = isBusiness
    ? "/register/creator"
    : "/register/business";

  const alternateLabel = isBusiness
    ? "Apply as creator"
    : "Apply as brand";

  const alternateText = isBusiness
    ? "Looking for work?"
    : "Looking to hire?";

  return (
    <div className="az-root">
      <style>{`

        /* =====================================================
           RESET
        ===================================================== */

        .az-root,
        .az-root *,
        .az-root *::before,
        .az-root *::after {
          box-sizing: border-box;
        }


        /* =====================================================
           ROOT
        ===================================================== */

        .az-root {
          width: 100%;
          min-height: 100vh;

          margin: 0;
          padding: 0;

          background: #ffffff;

          color: #111111;

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;

          -webkit-font-smoothing: antialiased;
        }


        /* =====================================================
           PAGE
        ===================================================== */

        .az-page {
          position: relative;

          width: 100%;
          min-height: 100vh;

          display: flex;
          flex-direction: column;
          align-items: center;

          padding:
            96px
            24px
            42px;

          background: #ffffff;
        }


        /* =====================================================
           TOP BAR
           
           White only.
           
           Logo is ABSOLUTELY centered against the entire
           viewport — the right-side text cannot move it.
        ===================================================== */

        .az-topbar {
          position: absolute;

          top: 0;
          left: 0;

          width: 100%;
          height: 72px;

          background: #ffffff;

          border: none;
          box-shadow: none;
        }


        /* =====================================================
           LOGO

           SMALL + EXACTLY CENTERED
        ===================================================== */

        .az-header {
          position: absolute;

          top: 50%;
          left: 50%;

          transform: translate(-50%, -50%);

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 6px;

          width: max-content;

          margin: 0;
          padding: 0;

          color: #111111;

          text-decoration: none;

          white-space: nowrap;

          line-height: 1;

          cursor: pointer;

          transition:
            opacity 0.15s ease;
        }

        .az-header:hover {
          color: #111111;

          opacity: 0.72;
        }


        /* =====================================================
           LOGO MARK

           Keep this SMALL so it matches the landing page.
        ===================================================== */

        .az-logo {
          width: 22px;
          height: 22px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex: 0 0 22px;

          line-height: 0;
        }

        .az-logo svg {
          width: 22px;
          height: 22px;
        }


        /* =====================================================
           LOGO WORDMARK
        ===================================================== */

        .az-brand-name {
          margin: 0;

          color: #111111;

          font-size: 22px;
          line-height: 1;

          font-weight: 500;

          letter-spacing: -0.9px;
        }


        /* =====================================================
           TOP RIGHT ROLE SWITCH

           BLACK / GRAY ONLY
           
           NO GREEN.
        ===================================================== */

        .az-role-switch {
          position: absolute;

          top: 50%;
          right: 24px;

          transform: translateY(-50%);

          display: flex;
          align-items: center;
          justify-content: flex-end;

          gap: 7px;

          color: #555555;

          font-size: 13px;
          line-height: 1.4;

          font-weight: 400;

          white-space: nowrap;
        }

        .az-role-switch-label {
          color: #555555;

          font-weight: 400;
        }

        .az-role-switch a {
          color: #111111;

          font-weight: 500;

          text-decoration: none;

          cursor: pointer;

          transition:
            opacity 0.15s ease;
        }

        .az-role-switch a:hover {
          color: #111111;

          opacity: 0.62;

          text-decoration: underline;

          text-underline-offset: 3px;
        }


        /* =====================================================
           AUTH CARD
        ===================================================== */

        .az-card {
          width: 100%;
          max-width: 430px;

          padding:
            36px
            38px
            30px;

          background: #ffffff;

          border:
            1px solid #dedede;

          border-radius: 14px;

          box-shadow:
            0 10px 30px
            rgba(0, 0, 0, 0.045);
        }


        /* =====================================================
           HEADING
        ===================================================== */

        .az-heading {
          margin:
            0
            0
            28px;

          color: #111111;

          font-size: 28px;
          line-height: 1.15;

          font-weight: 400;

          letter-spacing: -0.7px;

          text-align: center;
        }


        /* =====================================================
           REMOVE OLD ROLE BADGE
        ===================================================== */

        .az-role {
          display: none !important;
        }


        /* =====================================================
           FORM FIELDS
        ===================================================== */

        .az-field {
          width: 100%;

          margin-bottom: 17px;
        }

        .az-label {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin:
            0
            0
            7px;

          color: #222222;

          font-size: 13px;
          line-height: 1.4;

          font-weight: 400;
        }


        /* =====================================================
           INPUT
        ===================================================== */

        .az-input {
          width: 100%;
          height: 46px;

          display: block;

          padding:
            0
            13px;

          border:
            1px solid #cfcfcf;

          border-radius: 9px;

          outline: none;

          background: #ffffff;

          color: #111111;

          font-family: inherit;

          font-size: 13px;

          font-weight: 400;

          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .az-input::placeholder {
          color: #999999;
        }

        .az-input:focus {
          border-color: #111111;

          box-shadow:
            0 0 0 2px
            rgba(0, 0, 0, 0.055);
        }


        /* =====================================================
           PASSWORD
        ===================================================== */

        .az-pw-wrap {
          position: relative;

          width: 100%;
        }

        .az-pw-wrap .az-input {
          padding-right: 44px;
        }

        .az-pw-toggle {
          position: absolute;

          top: 50%;
          right: 7px;

          width: 31px;
          height: 31px;

          display: flex;
          align-items: center;
          justify-content: center;

          transform: translateY(-50%);

          margin: 0;
          padding: 0;

          border: 0 !important;
          outline: 0 !important;

          background: transparent !important;

          color: #777777;

          box-shadow: none !important;

          cursor: pointer;

          appearance: none;
        }

        .az-pw-toggle:hover,
        .az-pw-toggle:focus,
        .az-pw-toggle:active {
          border: 0 !important;

          background: transparent !important;

          color: #111111;

          box-shadow: none !important;
        }


        /* =====================================================
           ERROR
        ===================================================== */

        .az-error {
          margin:
            -2px
            0
            16px;

          padding:
            10px
            12px;

          border:
            1px solid #d8d8d8;

          border-radius: 8px;

          background: #f7f7f7;

          color: #222222;

          font-size: 12px;

          line-height: 1.45;
        }


        /* =====================================================
           TERMS
        ===================================================== */

        .az-terms {
          display: flex;
          align-items: flex-start;

          gap: 8px;

          margin:
            3px
            0
            18px;

          color: #666666;

          font-size: 11px;

          line-height: 1.5;

          font-weight: 400;
        }

        .az-terms input {
          width: 14px;
          height: 14px;

          flex: 0 0 14px;

          margin:
            2px
            0
            0;

          accent-color: #111111;
        }

        .az-terms a {
          color: #111111;

          font-weight: 500;

          text-decoration: none;
        }

        .az-terms a:hover {
          text-decoration: underline;

          text-underline-offset: 2px;
        }


        /* =====================================================
           SUBMIT BUTTON
           
           BLACK PLATFORM THEME.
        ===================================================== */

        .az-submit {
          width: 100%;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-top: 3px;

          padding:
            0
            16px;

          border:
            1px solid #111111;

          border-radius: 9px;

          background: #111111;

          color: #ffffff !important;

          font-family: inherit;

          font-size: 13px;

          font-weight: 500;

          cursor: pointer;

          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .az-submit:hover:not(:disabled) {
          background: #111111 !important;

          color: #ffffff !important;

          transform:
            translateY(-1px);
        }

        .az-submit:focus,
        .az-submit:active {
          background: #111111 !important;

          color: #ffffff !important;
        }

        .az-submit:disabled {
          opacity: 0.55;

          cursor: not-allowed;
        }


        /* =====================================================
           ALREADY HAVE ACCOUNT
           
           This is now shown BELOW registration forms.
        ===================================================== */

        .az-account-switch {
          margin:
            21px
            0
            0;

          padding-top:
            18px;

          border-top:
            1px solid #eeeeee;

          text-align: center;

          color: #666666;

          font-size: 12px;

          line-height: 1.5;

          font-weight: 400;
        }

        .az-account-switch a {
          color: #111111;

          font-weight: 500;

          text-decoration: underline;

          text-underline-offset: 3px;

          transition:
            opacity 0.15s ease;
        }

        .az-account-switch a:hover {
          color: #111111;

          opacity: 0.65;
        }


        /* =====================================================
           LOGIN BOTTOM SWITCH
        ===================================================== */

        .az-switch {
          margin:
            21px
            0
            0;

          padding-top:
            18px;

          border-top:
            1px solid #eeeeee;

          text-align: center;

          color: #666666;

          font-size: 12px;

          line-height: 1.5;
        }

        .az-switch a {
          color: #111111;

          font-weight: 500;

          text-decoration: underline;

          text-underline-offset: 3px;
        }


        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 650px) {

          .az-page {
            justify-content: flex-start;

            padding:
              94px
              16px
              40px;
          }

          .az-topbar {
            height: 68px;
          }

          .az-header {
            gap: 6px;
          }

          .az-logo {
            width: 21px;
            height: 21px;

            flex-basis: 21px;
          }

          .az-logo svg {
            width: 21px;
            height: 21px;
          }

          .az-brand-name {
            font-size: 17px;
          }

          .az-role-switch {
            right: 16px;

            font-size: 12px;
          }

          .az-card {
            max-width: 430px;

            padding:
              30px
              22px
              26px;

            border-radius: 13px;
          }

          .az-heading {
            font-size: 27px;
          }
        }


        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 430px) {

          .az-role-switch-label {
            display: none;
          }

          .az-role-switch {
            right: 14px;

            font-size: 11px;
          }

          .az-role-switch a::before {
            content: "Switch: ";

            color: #666666;

            font-weight: 400;
          }

          .az-card {
            padding:
              27px
              18px
              24px;
          }

          .az-heading {
            font-size: 25px;
          }
        }

      `}</style>


      {/* =====================================================
          PAGE
      ===================================================== */}

      <main className="az-page">


        {/* ===================================================
            TOP BAR
        =================================================== */}

        <header className="az-topbar">


          {/* =================================================
              CENTERED CREATORHUB LOGO

              IMPORTANT:
              This uses absolute positioning against the
              viewport, so it stays EXACTLY in the middle.
          ================================================= */}

          <Link
            to="/"
            className="az-header"
            aria-label="Creatorhub home"
          >
            <span
              className="az-logo"
              aria-hidden="true"
            >
              <LogoMark size={22} />
            </span>

            <span className="az-brand-name">
              creatorhub
            </span>
          </Link>


          {/* =================================================
              TOP-RIGHT ROLE SWITCH
          ================================================= */}

          {mode === "register" && role && (
            <div className="az-role-switch">

              <span className="az-role-switch-label">
                {alternateText}
              </span>

              <Link to={alternatePath}>
                {alternateLabel}
              </Link>

            </div>
          )}

        </header>


        {/* ===================================================
            AUTH CARD
        =================================================== */}

        <section className="az-card">


          {/* =================================================
              TITLE
          ================================================= */}

          <h1 className="az-heading">
            {title}
          </h1>


          {/* =================================================
              FORM

              The existing Creator / Brand form is rendered
              here without changing its functionality.
          ================================================= */}

          {children}


          {/* =================================================
              REGISTRATION → LOGIN

              "Already have an account? Log in"
          ================================================= */}

          {mode === "register" && (
            <div className="az-account-switch">

              Already have an account?{" "}

              <Link to="/login">
                Log in
              </Link>

            </div>
          )}


          {/* =================================================
              LOGIN → REGISTER
          ================================================= */}

          {mode === "login" && (
            <p className="az-switch">

              Don&apos;t have an account?{" "}

              <Link to="/register">
                Sign up
              </Link>

            </p>
          )}

        </section>

      </main>
    </div>
  );
}

export default AuthLayout;
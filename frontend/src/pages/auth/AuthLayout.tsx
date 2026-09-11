import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ROLE_THEME, otherRole } from "./theme";
import type { Role } from "./theme";
import { LogoMark } from "../../components/Logo";
import { PublicNavbar } from "../../components/PublicNavbar";

interface AuthLayoutProps {
  role: Role;
  mode: "login" | "register";
  title: string;
  children: ReactNode;
}

export function AuthLayout({
  role,
  mode,
  title,
  children,
}: AuthLayoutProps) {
  const theme = ROLE_THEME[role];
  const other = otherRole(role);
  const otherTheme = ROLE_THEME[other];

  return (
    <div className="az-root">
      {/* Navbar is intentionally outside the auth page layout */}
      <PublicNavbar />

      <div
        className="az-page"
        style={{
          ["--az-accent" as any]: theme.accent,
          ["--az-accent-hover" as any]: theme.accentHover,
          ["--az-accent-soft" as any]: theme.accentSoft,
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

          /* =========================
             ROOT
          ========================= */

          .az-root {
            width: 100%;
            min-height: 100vh;
            background: #FBF8F4;
          }

          /* =========================
             AUTH PAGE
          ========================= */

          .az-page {
            width: 100%;
            min-height: calc(100vh - 76px);

            display: flex;
            flex-direction: column;
            align-items: center;

            padding: 38px 32px 64px;

            position: relative;

            box-sizing: border-box;
            overflow-x: hidden;

            background: #FBF8F4;

            color: #241F2E;

            font-family:
              'Poppins',
              -apple-system,
              BlinkMacSystemFont,
              'Segoe UI',
              sans-serif;

            -webkit-font-smoothing: antialiased;
          }

          .az-page *,
          .az-page *::before,
          .az-page *::after {
            box-sizing: border-box;
          }

          .az-page a {
            text-decoration: none;
          }

          .az-page button,
          .az-page input,
          .az-page select {
            font-family: inherit;
          }

          /* =========================
             AUTH CARD
          ========================= */

          .az-card {
            width: 100%;
            max-width: 1080px;
            min-height: 620px;

            display: grid;
            grid-template-columns:
              minmax(0, .94fr)
              minmax(0, 1.06fr);

            gap: 0;

            overflow: hidden;

            border: 1px solid #E6E1EA;
            border-radius: 24px;

            background: #FFFFFF;

            box-shadow:
              0 22px 60px -38px rgba(62,43,83,.28);
          }

          /* =========================
             LEFT ROLE PANEL
          ========================= */

          .az-panel {
            position: relative;

            min-height: 620px;

            padding: 58px 56px;

            display: flex;
            align-items: center;
            justify-content: center;

            overflow: hidden;

            background:
              radial-gradient(
                circle at 80% 14%,
                ${theme.glow1},
                transparent 48%
              ),
              radial-gradient(
                circle at 15% 86%,
                ${theme.glow2},
                transparent 54%
              ),
              linear-gradient(
                145deg,
                ${theme.gradientFrom},
                ${theme.gradientTo}
              );
          }

          .az-panel::before,
          .az-panel::after {
            content: '';

            position: absolute;

            border-radius: 50%;

            pointer-events: none;
          }

          .az-panel::before {
            width: 180px;
            height: 180px;

            right: -90px;
            top: 50px;

            border: 1px solid rgba(255,255,255,.55);
          }

          .az-panel::after {
            width: 130px;
            height: 130px;

            left: -72px;
            bottom: 35px;

            border: 1px solid rgba(255,255,255,.50);
          }

          .az-panel-inner {
            position: relative;
            z-index: 1;

            max-width: 360px;

            text-align: center;
          }

          /* =========================
             ROLE LOGO
          ========================= */

          .az-panel-logo {
            width: 64px;
            height: 64px;

            margin: 0 auto 24px;

            border-radius: 20px;

            display: flex;
            align-items: center;
            justify-content: center;

            background: rgba(255,255,255,.76);

            border: 1px solid rgba(255,255,255,.85);

            box-shadow:
              0 16px 30px -18px rgba(54,37,73,.30);
          }

          /* =========================
             ROLE LABEL
          ========================= */

          .az-panel-role {
            display: inline-flex;

            align-items: center;
            justify-content: center;

            min-height: 27px;

            padding: 5px 12px;

            margin-bottom: 13px;

            border-radius: 999px;

            background: rgba(255,255,255,.68);

            color: ${theme.accent};

            font-size: 11px;
            font-weight: 700;

            letter-spacing: .35px;

            text-transform: uppercase;
          }

          /* =========================
             ROLE TITLE
          ========================= */

          .az-panel-title {
            margin: 0;

            color: #241F2E;

            font-family:
              'League Spartan',
              sans-serif;

            font-size: 34px;

            line-height: 1.02;

            font-weight: 700;

            letter-spacing: -.02em;
          }

          /* =========================
             ROLE DESCRIPTION
          ========================= */

          .az-panel-desc {
            max-width: 340px;

            margin: 16px auto 0;

            color: #6C6877;

            font-size: 13.5px;

            line-height: 1.65;
          }

          /* =========================
             FORM PANEL
          ========================= */

          .az-form-pane {
            min-width: 0;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 56px 58px;

            background: #FFFFFF;
          }

          .az-form {
            width: 100%;
            max-width: 430px;
          }

          /* =========================
             FORM HEADING
          ========================= */

          .az-h1 {
            margin: 0 0 24px;

            color: #241F2E;

            font-family:
              'League Spartan',
              sans-serif;

            font-size: 29px;

            line-height: 1.05;

            font-weight: 700;

            letter-spacing: -.015em;
          }

          /* =========================
             FORM FIELDS
          ========================= */

          .az-field {
            margin-top: 15px;
          }

          .az-label {
            display: flex;

            align-items: center;
            justify-content: space-between;

            gap: 12px;

            margin-bottom: 7px;

            color: #292632;

            font-size: 12.5px;

            font-weight: 600;
          }

          .az-input {
            width: 100%;

            min-height: 45px;

            padding: 11px 13px;

            border: 1.5px solid #E3DEE8;

            border-radius: 9px;

            outline: none;

            background: #FFFFFF;

            color: #241F2E;

            font-size: 13.5px;

            transition:
              border-color .15s ease,
              box-shadow .15s ease;
          }

          .az-input::placeholder {
            color: #A6A1AE;
          }

          .az-input:focus {
            border-color: var(--az-accent);

            box-shadow:
              0 0 0 3px var(--az-accent-soft);
          }

          /* =========================
             PASSWORD TOGGLE
          ========================= */

          .az-pw-wrap {
            position: relative;
          }

          .az-pw-toggle {
            position: absolute;

            right: 12px;
            top: 50%;

            transform: translateY(-50%);

            display: flex;

            align-items: center;
            justify-content: center;

            padding: 4px;

            border: 0;

            background: transparent;

            color: #A6A1AE;

            cursor: pointer;
          }

          .az-pw-toggle:hover {
            color: #6C6877;
          }

          /* =========================
             ERROR
          ========================= */

          .az-error {
            margin-top: 12px;

            padding: 9px 11px;

            border-radius: 8px;

            background: #FDECEE;

            color: #C32E42;

            font-size: 12px;

            line-height: 1.45;
          }

          /* =========================
             SUBMIT BUTTON
          ========================= */

          .az-submit {
            width: 100%;

            min-height: 45px;

            margin-top: 21px;

            border: 1px solid var(--az-accent);

            border-radius: 9px;

            display: flex;

            align-items: center;
            justify-content: center;

            gap: 7px;

            background: var(--az-accent);

            color: #FFFFFF !important;

            -webkit-text-fill-color: #FFFFFF;

            font-size: 13.5px;

            font-weight: 700;

            cursor: pointer;

            box-shadow:
              0 10px 18px -13px var(--az-accent);

            transition:
              background .15s ease,
              border-color .15s ease,
              transform .15s ease,
              opacity .15s ease;
          }

          .az-submit:hover:not(:disabled) {
            background: var(--az-accent-hover);

            border-color: var(--az-accent-hover);

            transform: translateY(-1px);
          }

          .az-submit:disabled {
            opacity: .62;

            cursor: not-allowed;
          }

          /* =========================
             TERMS
          ========================= */

          .az-terms {
            display: flex;

            align-items: flex-start;

            gap: 7px;

            margin-top: 13px;

            color: #77727F;

            font-size: 10.5px;

            line-height: 1.5;
          }

          .az-terms input {
            margin-top: 2px;

            accent-color: var(--az-accent);
          }

          .az-terms a {
            color: var(--az-accent);

            font-weight: 600;
          }

          /* =========================
             FOOTER LINKS
          ========================= */

          .az-footer-links {
            margin-top: 20px;

            color: #77727F;

            font-size: 12px;

            line-height: 1.9;
          }

          .az-footer-links a {
            color: var(--az-accent);

            font-weight: 600;
          }

          /* =========================
             TABLET
          ========================= */

          @media (max-width: 850px) {

            .az-card {
              grid-template-columns: 1fr;

              max-width: 620px;
            }

            .az-panel {
              min-height: 300px;

              padding: 42px 34px;
            }

            .az-panel-title {
              font-size: 30px;
            }

            .az-form-pane {
              padding: 44px 38px;
            }
          }

          /* =========================
             MOBILE
          ========================= */

          @media (max-width: 760px) {

            .az-page {
              min-height: calc(100vh - 68px);

              padding: 22px 14px 34px;
            }

            .az-card {
              border-radius: 18px;
            }

            .az-panel {
              min-height: 260px;
            }

            .az-form-pane {
              padding: 36px 24px;
            }
          }
        `}</style>

        <div className="az-card">

          {/* =========================
              LEFT ROLE PANEL
          ========================= */}

          <section
            className="az-panel"
            aria-label={`${theme.label} introduction`}
          >
            <div className="az-panel-inner">

              <div className="az-panel-logo">
                <LogoMark size={34} />
              </div>

              <div className="az-panel-role">
                {theme.label}
              </div>

              <h2 className="az-panel-title">
                Welcome to creatorhub
              </h2>

              <p className="az-panel-desc">
                {theme.welcomeDesc}
              </p>

            </div>
          </section>

          {/* =========================
              FORM PANEL
          ========================= */}

          <section className="az-form-pane">
            <div className="az-form">

              <h1 className="az-h1">
                {title}
              </h1>

              {children}

              <div className="az-footer-links">

                {mode === "login" ? (
                  <div>
                    No account yet?{" "}
                    <Link to={`/register/${role}`}>
                      Create one
                    </Link>
                  </div>
                ) : (
                  <div>
                    Already have an account?{" "}
                    <Link to={`/login/${role}`}>
                      Log in
                    </Link>
                  </div>
                )}

                <div>
                  Looking to{" "}
                  {other === "business"
                    ? "book creators"
                    : "get discovered"}
                  ?{" "}

                  <Link to={`/${mode}/${other}`}>
                    {mode === "login" ? "Log in" : "Sign up"} as a{" "}
                    {otherTheme.label}
                  </Link>
                </div>

              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

export default AuthLayout;

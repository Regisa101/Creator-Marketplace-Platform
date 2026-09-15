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
  const roleLabel = role === "business" ? "Brand" : "Creator";
  const alternatePath =
    role === "business" ? "/register/creator" : "/register/business";
  const alternateLabel =
    role === "business" ? "Creator" : "Brand";

  return (
    <div className="az-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600&family=Poppins:wght@300;400;500;600&display=swap');

        .az-root {
          min-height: 100vh;
          background: #ffffff;
          color: #111111;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .az-page {
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: #ffffff;
        }

        .az-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin-bottom: 28px;
          text-decoration: none;
          color: #111111;
          cursor: pointer;
        }

        .az-header:hover,
        .az-header:focus,
        .az-header:active {
          color: #111111;
          text-decoration: none;
        }

        .az-logo {
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 27px;
        }

        .az-brand-name {
          margin: 0;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 23px;
          line-height: 1;
          font-weight: 500;
          letter-spacing: 0;
        }

        .az-card {
          width: 100%;
          max-width: 430px;
          box-sizing: border-box;
          padding: 38px;
          border: 1px solid #dedede;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.06);
        }

        .az-heading {
          margin: 0 0 26px;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 30px;
          line-height: 1.08;
          font-weight: 400;
          letter-spacing: -0.015em;
          text-align: center;
        }

        .az-role {
          display: block;
          width: fit-content;
          margin: -12px auto 24px;
          padding: 5px 10px;
          border: 1px solid #dedede;
          border-radius: 999px;
          color: #555555;
          background: #ffffff;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .az-field {
          margin-bottom: 18px;
        }

        .az-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 7px;
          color: #222222;
          font-size: 13px;
          font-weight: 400;
        }

        .az-label a {
          color: #555555;
          font-size: 12px;
          font-weight: 400;
          text-decoration: none;
        }

        .az-label a:hover {
          color: #111111;
          text-decoration: underline;
        }

        .az-input {
          width: 100%;
          height: 46px;
          box-sizing: border-box;
          padding: 0 13px;
          border: 1px solid #cfcfcf;
          border-radius: 9px;
          outline: none;
          color: #111111;
          background: #ffffff;
          font-family: inherit;
          font-size: 13px;
          font-weight: 400;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .az-input::placeholder {
          color: #999999;
        }

        .az-input:focus {
          border-color: #111111;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
        }

        .az-input:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .az-pw-wrap {
          position: relative;
        }

        .az-pw-wrap .az-input {
          padding-right: 44px;
        }

        .az-pw-toggle {
          position: absolute;
          top: 50%;
          right: 8px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 0;
          transform: translateY(-50%);
          border: 0 !important;
          outline: 0;
          border-radius: 6px;
          background: transparent !important;
          color: #666666;
          box-shadow: none !important;
          cursor: pointer;
          appearance: none;
        }

        .az-pw-toggle:hover,
        .az-pw-toggle:focus,
        .az-pw-toggle:active {
          background: transparent !important;
          color: #111111;
          box-shadow: none !important;
        }

        .az-pw-toggle:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .az-error {
          margin: -2px 0 16px;
          padding: 10px 12px;
          border: 1px solid #d7d7d7;
          border-radius: 8px;
          color: #222222;
          background: #f7f7f7;
          font-size: 12px;
          line-height: 1.45;
        }

        .az-submit {
          width: 100%;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          border: 1px solid #111111;
          border-radius: 9px;
          background: #111111;
          color: #ffffff !important;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .az-submit:hover:not(:disabled),
        .az-submit:focus:not(:disabled),
        .az-submit:active:not(:disabled) {
          background: #111111 !important;
          color: #ffffff !important;
          transform: translateY(-1px);
        }

        .az-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .az-switch {
          margin: 22px 0 0;
          color: #666666;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 400;
          text-align: center;
        }

        .az-switch a {
          color: #111111;
          font-weight: 500;
          text-decoration: none;
        }

        .az-switch a:hover {
          text-decoration: underline;
        }

        .az-terms {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 4px 0 18px;
          color: #666666;
          font-size: 11px;
          line-height: 1.5;
          font-weight: 400;
        }

        .az-terms input {
          margin-top: 2px;
          accent-color: #111111;
        }

        .az-terms a {
          color: #111111;
          font-weight: 500;
        }

        @media (max-width: 520px) {
          .az-page {
            padding: 28px 16px;
          }

          .az-card {
            padding: 28px 22px;
            border-radius: 14px;
          }

          .az-heading {
            font-size: 27px;
          }

          .az-brand-name {
            font-size: 22px;
          }
        }
      `}</style>

      <main className="az-page">
        <Link
          to="/"
          className="az-header"
          aria-label="Go to creatorhub landing page"
        >
          <div className="az-logo" aria-hidden="true">
            <LogoMark size={27} />
          </div>
          <p className="az-brand-name">creatorhub</p>
        </Link>

        <section className="az-card">
          <h1 className="az-heading">{title}</h1>

          {mode === "register" && role && (
            <span className="az-role">{roleLabel} account</span>
          )}

          {children}

          {mode === "login" ? (
            <p className="az-switch">
              Don't have an account?{" "}
              <Link to="/register">Create one</Link>
            </p>
          ) : role ? (
            <p className="az-switch">
              Want to register as a different role?{" "}
              <Link to={alternatePath}>{alternateLabel}</Link>
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}

import { useLocation, Link } from "react-router-dom";
import { ArrowRight, UserRound, Building2 } from "lucide-react";
import { PublicNavbar } from "../../components/PublicNavbar";
import { LogoMark } from "../../components/Logo";
import { BRAND_PINK_CORAL, BRAND_PURPLE } from "../../components/Logo";

export function RoleSelect() {
  const location = useLocation();
  const mode: "login" | "register" = location.pathname.startsWith("/login") ? "login" : "register";

  return (
    <div className="rs-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

        .rs-page {
  min-height: 100vh;
  background: #FBF8F4;
  color: #241F2E;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
        .rs-page *, .rs-page *::before, .rs-page *::after { box-sizing: border-box; }
        .rs-page a { text-decoration: none; }
        .rs-shell {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 46px 32px 64px;
        }
        .rs-heading {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 30px;
        }
        .rs-welcome {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #6F6A7C;
  font-size: 16px;
  font-weight: 600;
}

.rs-welcome svg {
  flex-shrink: 0;
}
        .rs-title {
          margin: 10px 0 9px;
          color: #241F2E;
          font-family: 'League Spartan', sans-serif;
          font-size: 40px;
          line-height: 1.02;
          letter-spacing: -.02em;
        }
        .rs-subtitle {
          max-width: 560px;
          margin: 0 auto;
          color: #77727F;
          font-size: 14px;
          line-height: 1.6;
        }
        .rs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }
        .rs-card {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 0;
          border: 1px solid #E4DFE8;
          border-radius: 22px;
          background: #FFFFFF;
          box-shadow: 0 20px 45px -32px rgba(49,35,68,.30);
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .rs-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 48px -30px rgba(49,35,68,.36);
        }
        .rs-card--creator:hover { border-color: rgba(244,124,120,.70); }
        .rs-card--business:hover { border-color: rgba(118,97,161,.70); }
        .rs-visual {
          position: relative;
          height: 275px;
          overflow: hidden;
        }
        .rs-visual::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .rs-card--creator .rs-visual {
          background: linear-gradient(145deg, #F9D1CE, #FFF8F7);
        }
        .rs-card--business .rs-visual {
          background: linear-gradient(145deg, #E1D8EE, #FBF9FD);
        }
        .rs-visual img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center;
        }
        .rs-card--creator .rs-visual::after {
          background: linear-gradient(180deg, rgba(244,124,120,.02), rgba(255,247,246,.34));
        }
        .rs-card--business .rs-visual::after {
          background: linear-gradient(180deg, rgba(118,97,161,.03), rgba(250,248,252,.34));
        }
        .rs-role-icon {
          position: absolute;
          z-index: 2;
          left: 24px;
          bottom: 20px;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.91);
          box-shadow: 0 8px 20px -12px rgba(38,27,51,.42);
        }
        .rs-card--creator .rs-role-icon { color: ${BRAND_PINK_CORAL}; }
        .rs-card--business .rs-role-icon { color: ${BRAND_PURPLE}; }
        .rs-body {
          padding: 23px 28px 28px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .rs-name {
          margin: 0;
          color: #25304F;
          font-family: 'League Spartan', sans-serif;
          font-size: 27px;
          line-height: 1.05;
          font-weight: 700;
        }
        .rs-card--creator .rs-name { color: #25304F; }
        .rs-card--business .rs-name { color: #25304F; }
        .rs-desc {
          min-height: 62px;
          margin: 10px 0 20px;
          color: #6D7180;
          font-size: 13px;
          line-height: 1.62;
        }
        .rs-continue {
          min-height: 46px;
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 9px;
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF;
          font-size: 13px;
          font-weight: 700;
          transition: transform .16s ease, filter .16s ease;
        }
        .rs-card--creator .rs-continue {
          background: ${BRAND_PINK_CORAL};
          box-shadow: 0 9px 18px -13px rgba(244,124,120,.8);
        }
        .rs-card--business .rs-continue {
          background: ${BRAND_PURPLE};
          box-shadow: 0 9px 18px -13px rgba(118,97,161,.8);
        }
        .rs-continue:hover { filter: brightness(.94); transform: translateY(-1px); }
        .rs-switch {
          margin-top: 26px;
          text-align: center;
          color: #77727F;
          font-size: 12.5px;
        }
        .rs-switch a { color: ${BRAND_PURPLE}; font-weight: 700; }

        @media (max-width: 760px) {
          .rs-shell { padding: 32px 18px 48px; }
          .rs-title { font-size: 34px; }
          .rs-grid { grid-template-columns: 1fr; max-width: 520px; }
          .rs-visual { height: 235px; }
        }
        @media (max-width: 460px) {
          .rs-title { font-size: 30px; }
          .rs-body { padding: 20px 20px 22px; }
          .rs-name { font-size: 24px; }
        }
      `}</style>

      <PublicNavbar />

      <main className="rs-shell">
        <header className="rs-heading">
          <div className="rs-welcome">
            <LogoMark size={18} />
            Welcome to creatorhub
          </div>
          <h1 className="rs-title">
            {mode === "login" ? "How do you want to log in?" : "How do you want to get started?"}
          </h1>
          <p className="rs-subtitle">
            Choose the account type that matches what you want to do on creatorhub.
          </p>
        </header>

        <div className="rs-grid">
          <Link to={`/${mode}/creator`} className="rs-card rs-card--creator">
            <div className="rs-visual">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=600&fit=crop&q=85"
                alt="Creators collaborating and creating content"
              />
              <span className="rs-role-icon"><UserRound size={22} /></span>
            </div>
            <div className="rs-body">
              <h2 className="rs-name">I&apos;m a Creator</h2>
              <p className="rs-desc">
                Discover paid campaigns from brands, collaborate on exciting projects, and turn your creativity into opportunities.
              </p>
              <span className="rs-continue">
                {mode === "login" ? "Continue as Creator" : "Continue as Creator"}
                <ArrowRight size={15} />
              </span>
            </div>
          </Link>

          <Link to={`/${mode}/business`} className="rs-card rs-card--business">
            <div className="rs-visual">
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&h=600&fit=crop&q=85"
                alt="A brand team working together"
              />
              <span className="rs-role-icon"><Building2 size={22} /></span>
            </div>
            <div className="rs-body">
              <h2 className="rs-name">I&apos;m a Brand</h2>
              <p className="rs-desc">
                Find talented creators, launch campaigns, manage collaborations, and grow your brand&apos;s presence.
              </p>
              <span className="rs-continue">
                {mode === "login" ? "Continue as Brand" : "Continue as Brand"}
                <ArrowRight size={15} />
              </span>
            </div>
          </Link>
        </div>

        <div className="rs-switch">
          {mode === "login" ? (
            <>Don&apos;t have an account? <Link to="/register">Sign up</Link></>
          ) : (
            <>Already have an account? <Link to="/login">Log in</Link></>
          )}
        </div>
      </main>
    </div>
  );
}

export default RoleSelect;


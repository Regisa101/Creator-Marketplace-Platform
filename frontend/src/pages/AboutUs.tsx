
// frontend/src/pages/AboutUs.tsx

import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  Handshake,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { LogoMark } from "../components/Logo";
import { PublicNavbar } from "../components/PublicNavbar";

const WHY_ITEMS = [
  {
    number: "01",
    title: "The problem",
    text: "Finding the right creator for a campaign can take time, while creators often struggle to find opportunities that actually fit their skills.",
  },
  {
    number: "02",
    title: "The idea",
    text: "CreatorHub brings businesses and creators together in one simple marketplace built around real campaign needs.",
  },
];

const OFFER_ITEMS = [
  {
    icon: BriefcaseBusiness,
    title: "For Businesses",
    text: "Create campaigns, define your requirements, discover creators, and review applications in one place.",
  },
  {
    icon: Sparkles,
    title: "For Creators",
    text: "Build your profile, showcase your work, discover relevant campaigns, and apply directly.",
  },
  {
    icon: Handshake,
    title: "Simple Collaboration",
    text: "Keep applications, creator selection, campaign details, and collaboration organized in one place.",
  },
  {
    icon: CircleDollarSign,
    title: "Transparent Pricing",
    text: "Creators can join and apply for free. Businesses pay a 10% platform service fee when they select a creator.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Create",
    text: "A business creates a campaign with its requirements, budget, and deliverables.",
  },
  {
    number: "02",
    title: "Discover",
    text: "Creators browse campaigns and find opportunities that match their skills and interests.",
  },
  {
    number: "03",
    title: "Apply",
    text: "Creators apply to campaigns they are interested in and share their proposed rate.",
  },
  {
    number: "04",
    title: "Connect",
    text: "The business reviews applications and selects the creator who fits the campaign.",
  },
  {
    number: "05",
    title: "Collaborate",
    text: "The creator and business work together to bring the campaign to life.",
  },
];

export function AboutUs() {
  return (
    <div className="about-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@300;400;500;600&family=Poppins:wght@300;400;500&display=swap');

        .about-page {
          --content-width: 1304px;
          --content-left-space: 32px;
          --content-right-space: 32px;

          min-height: 100vh;
          background: #ffffff;
          color: #111111;
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
          overflow-x: hidden;
        }

        .about-page *,
        .about-page *::before,
        .about-page *::after {
          box-sizing: border-box;
        }

        .about-page a {
          text-decoration: none;
        }

        .about-container {
          width: 100%;
          max-width: var(--content-width);
          margin: 0 auto;
          padding-left: var(--content-left-space);
          padding-right: var(--content-right-space);
        }

        .about-divider {
          width: 100%;
          height: 1px;
          background: #e8e8e8;
        }

        /* ============================================
           HERO
        ============================================ */

        .about-hero {
          padding: 126px 0 118px;
          text-align: center;
        }

        .about-eyebrow {
          margin: 0 0 18px;
          color: #777777;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .about-hero h1 {
          max-width: 850px;
          margin: 0 auto;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: clamp(48px, 6vw, 72px);
          font-weight: 400;
          line-height: .98;
          letter-spacing: -.04em;
        }

        .about-hero-copy {
          max-width: 610px;
          margin: 28px auto 0;
          color: #6b6b6b;
          font-size: 16px;
          line-height: 1.75;
        }

        .about-hero-line {
          width: 72px;
          height: 1px;
          margin: 34px auto 0;
          background: #111111;
        }

        /* ============================================
           WHY WE BUILT IT
        ============================================ */

        .about-section {
          padding: 82px 0;
        }

        .about-section-heading {
          max-width: 700px;
        }

        .about-section-label {
          display: block;
          margin-bottom: 13px;
          color: #777777;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .about-section-title {
          margin: 0;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 42px;
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -.025em;
        }

        .about-section-intro {
          max-width: 620px;
          margin: 17px 0 0;
          color: #6b6b6b;
          font-size: 14px;
          line-height: 1.75;
        }

        .about-why-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0;
          margin-top: 52px;
          border-top: 1px solid #e5e5e5;
        }

        .about-why-item {
          display: grid;
          grid-template-columns: 54px minmax(0, 1fr);
          gap: 22px;
          padding: 32px 34px 32px 0;
        }

        .about-why-item + .about-why-item {
          padding-left: 34px;
          border-left: 1px solid #e5e5e5;
        }

        .about-number {
          color: #999999;
          font-family: 'League Spartan', sans-serif;
          font-size: 14px;
          font-weight: 400;
          letter-spacing: .02em;
        }

        .about-why-title {
          margin: 0 0 9px;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 25px;
          font-weight: 400;
        }

        .about-why-text {
          max-width: 480px;
          margin: 0;
          color: #707070;
          font-size: 13px;
          line-height: 1.75;
        }

        /* ============================================
           OFFER CARDS
        ============================================ */

        .about-offer-section {
          padding: 82px 0;
          background: #fafafa;
        }

        .about-offer-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 48px;
        }

        .about-offer-card {
          min-height: 285px;
          padding: 25px 23px;
          background: #ffffff;
          border: 1px solid #e4e4e4;
          border-radius: 14px;
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .about-offer-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px -22px rgba(0,0,0,.28);
        }

        .about-offer-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 38px;
          border: 1px solid #dedede;
          border-radius: 10px;
          color: #111111;
          background: #ffffff;
        }

        .about-offer-card h3 {
          margin: 0 0 11px;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 22px;
          font-weight: 400;
          line-height: 1.1;
        }

        .about-offer-card p {
          margin: 0;
          color: #6c6c6c;
          font-size: 12px;
          line-height: 1.7;
        }

        /* ============================================
           HOW IT WORKS
        ============================================ */

        .about-how-section {
          padding: 86px 0;
        }

        .about-steps {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          margin-top: 54px;
          border-top: 1px solid #e3e3e3;
          border-bottom: 1px solid #e3e3e3;
        }

        .about-step {
          position: relative;
          min-height: 245px;
          padding: 28px 25px 30px 0;
        }

        .about-step + .about-step {
          padding-left: 25px;
          border-left: 1px solid #e3e3e3;
        }

        .about-step-number {
          display: block;
          margin-bottom: 48px;
          color: #999999;
          font-family: 'League Spartan', sans-serif;
          font-size: 13px;
        }

        .about-step h3 {
          margin: 0 0 10px;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 24px;
          font-weight: 400;
        }

        .about-step p {
          margin: 0;
          color: #707070;
          font-size: 11.5px;
          line-height: 1.7;
        }

        .about-step-arrow {
          position: absolute;
          top: 30px;
          right: -7px;
          z-index: 2;
          width: 13px;
          height: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          color: #777777;
        }

        /* ============================================
           WHO IT IS FOR
        ============================================ */

        .about-audience-section {
          padding: 82px 0;
          background: #fafafa;
        }

        .about-audience-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 48px;
        }

        .about-audience-card {
          position: relative;
          min-height: 340px;
          padding: 34px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e3e3e3;
          border-radius: 16px;
        }

        .about-audience-card::after {
          content: "";
          position: absolute;
          right: -80px;
          bottom: -100px;
          width: 260px;
          height: 260px;
          border: 1px solid #eeeeee;
          border-radius: 50%;
        }

        .about-audience-icon {
          width: 45px;
          height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 72px;
          border-radius: 11px;
          background: #111111;
          color: #ffffff;
        }

        .about-audience-card h3 {
          margin: 0 0 12px;
          font-family: 'League Spartan', sans-serif;
          font-size: 31px;
          font-weight: 400;
          letter-spacing: -.02em;
        }

        .about-audience-card p {
          max-width: 470px;
          margin: 0;
          color: #6b6b6b;
          font-size: 13px;
          line-height: 1.75;
        }

        .about-audience-link {
          position: relative;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 25px;
          color: #111111;
          font-size: 12px;
          font-weight: 500;
        }

        .about-audience-link:hover {
          opacity: .65;
        }

        /* ============================================
           MISSION
        ============================================ */

        .about-mission {
          padding: 112px 0;
          text-align: center;
        }

        .about-mission h2 {
          max-width: 850px;
          margin: 0 auto;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: clamp(38px, 5vw, 58px);
          font-weight: 400;
          line-height: 1;
          letter-spacing: -.035em;
        }

        .about-mission p {
          max-width: 570px;
          margin: 25px auto 0;
          color: #707070;
          font-size: 14px;
          line-height: 1.75;
        }

        /* ============================================
           CTA
        ============================================ */

        .about-cta {
          margin-bottom: 0;
          padding: 72px 0;
          background: #111111;
          color: #ffffff;
        }

        .about-cta-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 35px;
        }

        .about-cta-copy h2 {
          margin: 0 0 9px;
          color: #ffffff;
          font-family: 'League Spartan', sans-serif;
          font-size: 38px;
          font-weight: 400;
          letter-spacing: -.025em;
        }

        .about-cta-copy p {
          margin: 0;
          color: #bcbcbc;
          font-size: 13px;
        }

        .about-cta-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }

        .about-cta-btn {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          transition: all .18s ease;
        }

        .about-cta-btn-primary {
          background: #ffffff;
          border: 1px solid #ffffff;
          color: #111111;
        }

        .about-cta-btn-primary:hover {
          background: #eeeeee;
          border-color: #eeeeee;
          transform: translateY(-1px);
        }

        .about-cta-btn-secondary {
          background: transparent;
          border: 1px solid #666666;
          color: #ffffff;
        }

        .about-cta-btn-secondary:hover {
          border-color: #ffffff;
          background: rgba(255,255,255,.06);
          transform: translateY(-1px);
        }

        /* ============================================
           FOOTER
        ============================================ */

        .about-footer {
          padding: 60px 0 22px;
          background: #ffffff;
        }

        .about-footer-top {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          padding-bottom: 32px;
          border-bottom: 1px solid #e7e7e7;
        }

        .about-footer-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 10px;
        }

        .about-footer-brand span {
          font-family: 'League Spartan', sans-serif;
          font-size: 19px;
          font-weight: 400;
        }

        .about-footer-tag {
          max-width: 280px;
          margin: 0;
          color: #707070;
          font-size: 13px;
          line-height: 1.6;
        }

        .about-footer-cols {
          display: flex;
          gap: 56px;
        }

        .about-footer-col h4 {
          margin: 0 0 14px;
          color: #111111;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .about-footer-col a {
          display: block;
          margin-bottom: 10px;
          color: #707070;
          font-size: 13px;
        }

        .about-footer-col a:hover {
          color: #111111;
        }

        .about-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 18px;
          color: #888888;
          font-size: 11px;
        }

        .about-footer-social {
          display: flex;
          gap: 10px;
        }

        .about-footer-social a {
          color: #777777;
        }

        .about-footer-social a:hover {
          color: #111111;
        }

        /* ============================================
           RESPONSIVE
        ============================================ */

        @media (max-width: 1050px) {
          .about-offer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .about-steps {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .about-step:nth-child(4) {
            border-left: 0;
            border-top: 1px solid #e3e3e3;
          }

          .about-step:nth-child(5) {
            border-top: 1px solid #e3e3e3;
          }
        }

        @media (max-width: 760px) {
          .about-page {
            --content-left-space: 20px;
            --content-right-space: 20px;
          }

          .about-hero {
            padding: 90px 0 80px;
          }

          .about-hero h1 {
            font-size: 48px;
          }

          .about-section,
          .about-offer-section,
          .about-how-section,
          .about-audience-section {
            padding: 64px 0;
          }

          .about-section-title {
            font-size: 36px;
          }

          .about-why-grid {
            grid-template-columns: 1fr;
          }

          .about-why-item,
          .about-why-item + .about-why-item {
            padding: 27px 0;
            border-left: 0;
          }

          .about-why-item + .about-why-item {
            border-top: 1px solid #e5e5e5;
          }

          .about-offer-grid {
            grid-template-columns: 1fr;
          }

          .about-offer-card {
            min-height: auto;
          }

          .about-steps {
            grid-template-columns: 1fr;
          }

          .about-step,
          .about-step + .about-step {
            min-height: auto;
            padding: 25px 0;
            border-left: 0;
            border-top: 1px solid #e3e3e3;
          }

          .about-step:first-child {
            border-top: 0;
          }

          .about-step-number {
            margin-bottom: 22px;
          }

          .about-step-arrow {
            display: none;
          }

          .about-audience-grid {
            grid-template-columns: 1fr;
          }

          .about-audience-card {
            min-height: 310px;
          }

          .about-audience-icon {
            margin-bottom: 50px;
          }

          .about-mission {
            padding: 82px 0;
          }

          .about-cta {
            padding: 55px 0;
          }

          .about-cta-inner {
            align-items: flex-start;
            flex-direction: column;
          }

          .about-cta-copy h2 {
            font-size: 34px;
          }

          .about-footer-top {
            flex-direction: column;
          }

          .about-footer-cols {
            gap: 42px;
          }

          .about-footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .about-hero h1 {
            font-size: 42px;
          }

          .about-hero-copy {
            font-size: 14px;
          }

          .about-cta-actions {
            width: 100%;
            flex-direction: column;
          }

          .about-cta-btn {
            width: 100%;
          }
        }
      `}</style>

      <PublicNavbar />

      {/* ============================================
          HERO
      ============================================ */}

      <section className="about-hero">
        <div className="about-container">
          <p className="about-eyebrow">About CreatorHub</p>

          <h1>Connecting Businesses with Creators</h1>

          <p className="about-hero-copy">
            We make it easier for businesses to find creators and for creators
            to discover meaningful collaboration opportunities.
          </p>

          <div className="about-hero-line" aria-hidden="true" />
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          WHY WE BUILT IT
      ============================================ */}

      <section className="about-section">
        <div className="about-container">
          <div className="about-section-heading">
            <span className="about-section-label">Why we built it</span>

            <h2 className="about-section-title">
              A simpler way to bring both sides together.
            </h2>

            <p className="about-section-intro">
              Finding the right creator for a campaign can be difficult for
              businesses, while creators often struggle to find relevant
              opportunities. CreatorHub brings both sides together in one
              simple marketplace.
            </p>
          </div>

          <div className="about-why-grid">
            {WHY_ITEMS.map((item) => (
              <article className="about-why-item" key={item.number}>
                <span className="about-number">{item.number}</span>

                <div>
                  <h3 className="about-why-title">{item.title}</h3>
                  <p className="about-why-text">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          WHAT WE OFFER
      ============================================ */}

      <section className="about-offer-section">
        <div className="about-container">
          <div className="about-section-heading">
            <span className="about-section-label">What we offer</span>

            <h2 className="about-section-title">
              Everything starts with a real campaign.
            </h2>
          </div>

          <div className="about-offer-grid">
            {OFFER_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <article className="about-offer-card" key={item.title}>
                  <div className="about-offer-icon">
                    <Icon size={18} strokeWidth={1.5} />
                  </div>

                  <h3>{item.title}</h3>

                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          HOW IT WORKS
      ============================================ */}

      <section className="about-how-section">
        <div className="about-container">
          <div className="about-section-heading">
            <span className="about-section-label">How it works</span>

            <h2 className="about-section-title">
              From campaign idea to collaboration.
            </h2>

            <p className="about-section-intro">
              The process is designed to stay simple for both businesses and
              creators.
            </p>
          </div>

          <div className="about-steps">
            {STEPS.map((step, index) => (
              <article className="about-step" key={step.number}>
                <span className="about-step-number">{step.number}</span>

                <h3>{step.title}</h3>

                <p>{step.text}</p>

                {index < STEPS.length - 1 && (
                  <span className="about-step-arrow" aria-hidden="true">
                    <ArrowRight size={13} />
                  </span>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          WHO IT IS FOR
      ============================================ */}

      <section className="about-audience-section">
        <div className="about-container">
          <div className="about-section-heading">
            <span className="about-section-label">Who is it for?</span>

            <h2 className="about-section-title">
              One marketplace. Two sides.
            </h2>
          </div>

          <div className="about-audience-grid">
            <article className="about-audience-card">
              <div className="about-audience-icon">
                <BriefcaseBusiness size={19} strokeWidth={1.5} />
              </div>

              <h3>Businesses</h3>

              <p>
                Have a campaign in mind? Find creators for product promotions,
                social media content, events, photography, and more.
              </p>

              <Link to="/register/business" className="about-audience-link">
                Post a Campaign
                <ArrowRight size={14} />
              </Link>
            </article>

            <article className="about-audience-card">
              <div className="about-audience-icon">
                <Users size={19} strokeWidth={1.5} />
              </div>

              <h3>Creators</h3>

              <p>
                Looking for your next opportunity? Showcase your work and
                discover campaigns from businesses looking for creators.
              </p>

              <Link to="/campaigns?source=about" className="about-audience-link">
                Explore Campaigns
                <ArrowRight size={14} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          MISSION
      ============================================ */}

      <section className="about-mission">
        <div className="about-container">
          <span className="about-section-label">Our mission</span>

          <h2>Making creator collaboration simple.</h2>

          <p>
            Our goal is to create a straightforward space where businesses can
            find creative talent and creators can find opportunities that
            match their skills and interests.
          </p>
        </div>
      </section>

      {/* ============================================
          CTA
      ============================================ */}

      <section className="about-cta">
        <div className="about-container about-cta-inner">
          <div className="about-cta-copy">
            <h2>Ready to create something together?</h2>

            <p>
              Start with a campaign or discover your next opportunity.
            </p>
          </div>

          <div className="about-cta-actions">
            <Link
              to="/register/business"
              className="about-cta-btn about-cta-btn-primary"
            >
              Post a Campaign
              <ArrowRight size={14} />
            </Link>

            <Link
              to="/campaigns?source=about"
              className="about-cta-btn about-cta-btn-secondary"
            >
              Explore Campaigns
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
      ============================================ */}

      <footer className="about-footer">
        <div className="about-container">
          <div className="about-footer-top">
            <div>
              <div className="about-footer-brand">
                <LogoMark size={22} />
                <span>Creator Marketplace</span>
              </div>

              <p className="about-footer-tag">
                Real campaigns. Real people. Real opportunities.
              </p>
            </div>

            <div className="about-footer-cols">
              <div className="about-footer-col">
                <h4>Platform</h4>

                <Link to="/">Home</Link>
                <Link to="/campaigns?source=about">Campaigns</Link>
                <Link to="/pricing">Pricing</Link>
                <Link to="/about">About</Link>
              </div>

              <div className="about-footer-col">
                <h4>Account</h4>

                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </div>
            </div>
          </div>

          <div className="about-footer-bottom">
            <span>© 2026 Creator Marketplace. All rights reserved.</span>

            <div className="about-footer-social">
              <a href="#" aria-label="Instagram">
                IG
              </a>

              <a href="#" aria-label="TikTok">
                TT
              </a>

              <a href="#" aria-label="YouTube">
                YT
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AboutUs;


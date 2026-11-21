// frontend/src/pages/AboutUs.tsx
// creatorhub about page, styled to match the pricing page.

import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Handshake,
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
    text: "creatorhub brings businesses and creators together in one simple marketplace built around real campaign needs.",
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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        /* ============================================
           BASE
        ============================================ */

        .about-page {
          --content-width: 1304px;
          --content-left-space: 32px;
          --content-right-space: 32px;

          --about-ink: #111111;
          --about-soft: #6b6b6b;
          --about-green: #1b5e3b;
          --about-green-dark: #154b30;
          --about-tint: #eaf4ee;
          --about-border: #e6e6e6;

          min-height: 100vh;
          background: #ffffff;
          color: #212121;
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
          overflow-x: hidden;
        }

        .about-page,
        .about-page *,
        .about-page *::before,
        .about-page *::after {
          box-sizing: border-box;
          font-family: 'Poppins', sans-serif;
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
          background: #d6d6d6;
        }

        /* ============================================
           PILL HEADER + SECTION HEADINGS
        ============================================ */

        .about-pill-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          max-width: 620px;
          margin: 0 auto 26px;
        }

        .about-pill-row::before,
        .about-pill-row::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2e2e2;
        }

        .about-pill {
          padding: 8px 22px;
          border-radius: 999px;
          background: var(--about-tint);
          color: var(--about-green);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: .04em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .about-section {
          padding: 95px 0;
        }

        .about-section-heading {
          max-width: 760px;
          margin: 0 auto;
          text-align: center;
        }

        .about-section-title {
          margin: 0;
          color: var(--about-ink);
          font-size: 44px;
          font-weight: 500;
          line-height: 1.12;
          letter-spacing: -.03em;
        }

        .about-section-intro {
          max-width: 640px;
          margin: 20px auto 0;
          color: var(--about-soft);
          font-size: 17px;
          line-height: 1.7;
        }

        /* ============================================
           HERO
        ============================================ */

        .about-hero {
          position: relative;
          padding: 126px 0 108px;
          background: #ffffff;
          text-align: center;
          overflow: hidden;
        }

        .about-hero-curves {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .about-hero .about-container {
          position: relative;
          z-index: 1;
        }

        .about-hero-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 860px;
          margin: 0 auto;
        }

        .about-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px;
          margin-bottom: 30px;
          border-radius: 999px;
          background: #f2f2f2;
          color: #333333;
          font-size: 12.5px;
          font-weight: 400;
        }

        .about-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--about-green);
        }

        .about-hero h1 {
          margin: 0;
          color: var(--about-ink);
          font-size: 62px;
          font-weight: 500;
          line-height: 1.12;
          letter-spacing: -.035em;
        }

        .about-hero-accent {
          color: var(--about-green);
        }

        .about-hero-copy {
          max-width: 580px;
          margin: 26px 0 0;
          color: #555555;
          font-size: 15.5px;
          line-height: 1.65;
        }

        .about-hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 26px;
          margin-top: 32px;
          flex-wrap: wrap;
        }

        .about-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 8px;
          background: var(--about-green);
          border: 1px solid var(--about-green);
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 500;
          transition: background .18s ease, transform .18s ease;
        }

        .about-btn:hover {
          background: var(--about-green-dark);
          border-color: var(--about-green-dark);
          color: #ffffff;
          transform: translateY(-2px);
        }

        .about-btn-outline {
          background: #ffffff;
          border-color: #cfcfcf;
          color: var(--about-ink);
        }

        .about-btn-outline:hover {
          background: #ffffff;
          border-color: var(--about-ink);
          color: var(--about-ink);
        }

        .about-hero-link {
          padding-bottom: 2px;
          border-bottom: 1px solid var(--about-ink);
          color: var(--about-ink);
          font-size: 13.5px;
          font-weight: 400;
          transition: opacity .16s ease;
        }

        .about-hero-link:hover {
          color: var(--about-ink);
          opacity: .7;
        }

        /* ============================================
           WHY WE BUILT IT
        ============================================ */

        .about-why-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          max-width: 1000px;
          margin: 52px auto 0;
        }

        .about-why-item {
          display: grid;
          grid-template-columns: 44px 1px minmax(0, 1fr);
          gap: 20px;
          align-items: stretch;
          padding: 32px 30px;
          background: #ffffff;
          border: 1px solid var(--about-border);
          border-radius: 18px;
          text-align: left;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .about-why-item:hover {
          border-color: #cfe3d5;
          box-shadow: 0 8px 24px rgba(25, 80, 45, .06);
        }

        .about-number {
          align-self: center;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--about-tint);
          color: var(--about-green);
          font-size: 14px;
          font-weight: 500;
        }

        .about-rule {
          width: 1px;
          background: #d9d9d9;
        }

        .about-why-body {
          align-self: center;
          min-width: 0;
        }

        .about-why-title {
          margin: 0 0 8px;
          color: var(--about-ink);
          font-size: 20px;
          font-weight: 500;
          letter-spacing: -.01em;
        }

        .about-why-text {
          margin: 0;
          color: var(--about-soft);
          font-size: 14.5px;
          line-height: 1.7;
        }

        /* ============================================
           OFFER CARDS
        ============================================ */

        .about-offer-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
          margin-top: 52px;
        }

        .about-offer-card {
          min-height: 270px;
          padding: 30px 26px;
          background: #ffffff;
          border: 1px solid var(--about-border);
          border-radius: 18px;
          text-align: left;
          transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
        }

        .about-offer-card:hover {
          border-color: #cfe3d5;
          box-shadow: 0 8px 24px rgba(25, 80, 45, .06);
          transform: translateY(-3px);
        }

        .about-offer-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 34px;
          border-radius: 50%;
          background: var(--about-tint);
          color: var(--about-green);
        }

        .about-offer-card h3 {
          margin: 0 0 10px;
          color: var(--about-ink);
          font-size: 19px;
          font-weight: 500;
          line-height: 1.25;
          letter-spacing: -.01em;
        }

        .about-offer-card p {
          margin: 0;
          color: var(--about-soft);
          font-size: 14px;
          line-height: 1.65;
        }

        /* ============================================
           HOW IT WORKS
        ============================================ */

        .about-steps {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
          margin-top: 52px;
        }

        .about-step {
          padding: 28px 22px 30px;
          background: #ffffff;
          border: 1px solid var(--about-border);
          border-radius: 18px;
          text-align: left;
          transition: border-color .18s ease, box-shadow .18s ease;
        }

        .about-step:hover {
          border-color: #cfe3d5;
          box-shadow: 0 8px 24px rgba(25, 80, 45, .06);
        }

        .about-step-number {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 26px;
          border-radius: 50%;
          background: var(--about-tint);
          color: var(--about-green);
          font-size: 13px;
          font-weight: 500;
        }

        .about-step h3 {
          margin: 0 0 8px;
          color: var(--about-ink);
          font-size: 19px;
          font-weight: 500;
          letter-spacing: -.01em;
        }

        .about-step p {
          margin: 0;
          color: var(--about-soft);
          font-size: 13.5px;
          line-height: 1.65;
        }

        /* ============================================
           WHO IT IS FOR
        ============================================ */

        .about-audience-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          max-width: 1100px;
          margin: 52px auto 0;
        }

        .about-audience-card {
          position: relative;
          min-height: 330px;
          padding: 38px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid var(--about-border);
          border-radius: 20px;
          text-align: left;
        }

        .about-audience-card::after {
          content: "";
          position: absolute;
          right: -90px;
          bottom: -110px;
          width: 270px;
          height: 270px;
          background: #f1f8f3;
          border-radius: 50%;
        }

        .about-audience-icon {
          position: relative;
          z-index: 1;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 56px;
          border-radius: 14px;
          background: var(--about-green);
          color: #ffffff;
        }

        .about-audience-card h3 {
          position: relative;
          z-index: 1;
          margin: 0 0 12px;
          color: var(--about-ink);
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -.02em;
        }

        .about-audience-card p {
          position: relative;
          z-index: 1;
          max-width: 440px;
          margin: 0;
          color: var(--about-soft);
          font-size: 15px;
          line-height: 1.7;
        }

        .about-audience-link {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 26px;
          color: var(--about-green);
          font-size: 14px;
          font-weight: 500;
          transition: transform .16s ease, opacity .16s ease;
        }

        .about-audience-link:hover {
          color: var(--about-green);
          transform: translateX(4px);
          opacity: .8;
        }

        /* ============================================
           MISSION
        ============================================ */

        .about-mission {
          padding: 110px 0;
          text-align: center;
        }

        .about-mission h2 {
          max-width: 820px;
          margin: 0 auto;
          color: var(--about-ink);
          font-size: 52px;
          font-weight: 500;
          line-height: 1.12;
          letter-spacing: -.035em;
        }

        .about-mission p {
          max-width: 600px;
          margin: 26px auto 0;
          color: var(--about-soft);
          font-size: 16px;
          line-height: 1.75;
        }

        /* ============================================
           CTA
        ============================================ */

        .about-cta {
          width: calc(100% - 2 * var(--content-left-space));
          max-width: calc(var(--content-width) - 2 * var(--content-left-space));
          margin: 64px auto;
          background: linear-gradient(
            110deg,
            #f3f3f3 0%,
            #fafafa 42%,
            #ffffff 72%,
            #f2f2f2 100%
          );
          border: 1px solid #e7e7e7;
          border-radius: 16px;
          overflow: hidden;
        }

        .about-cta-inner {
          min-height: 340px;
          padding: 64px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .about-cta-inner h2 {
          max-width: 760px;
          margin: 0 auto 16px;
          color: var(--about-ink);
          font-size: 40px;
          font-weight: 500;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .about-cta-inner p {
          max-width: 560px;
          margin: 0 auto 30px;
          color: var(--about-soft);
          font-size: 16px;
          line-height: 1.7;
        }

        .about-cta-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* ============================================
           FOOTER
        ============================================ */

        .about-footer {
          padding: 64px 0 22px;
          background: #ffffff;
        }

        .about-footer-top {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          flex-wrap: wrap;
          padding-bottom: 36px;
          border-bottom: 1px solid #e7e0da;
        }

        .about-footer-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 12px;
          color: var(--about-ink);
          font-size: 18px;
          font-weight: 500;
        }

        .about-footer-tag {
          max-width: 320px;
          margin: 0;
          color: var(--about-soft);
          font-size: 14px;
          line-height: 1.6;
        }

        .about-footer-cols {
          display: flex;
          gap: 64px;
        }

        .about-footer-col h4 {
          margin: 0 0 16px;
          color: var(--about-ink);
          font-size: 14px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .about-footer-col a {
          display: block;
          margin-bottom: 11px;
          color: var(--about-soft);
          font-size: 14px;
        }

        .about-footer-col a:hover {
          color: var(--about-ink);
        }

        .about-footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-top: 22px;
          color: var(--about-soft);
          font-size: 13px;
        }

        .about-footer-social {
          display: flex;
          gap: 12px;
        }

        .about-footer-social a {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dcd4cc;
          border-radius: 50%;
          color: var(--about-soft);
          font-size: 11px;
          letter-spacing: .3px;
          transition: border-color .16s ease, color .16s ease, transform .16s ease;
        }

        .about-footer-social a:hover {
          border-color: #111111;
          color: #111111;
          transform: translateY(-1px);
        }

        /* ============================================
           RESPONSIVE
        ============================================ */

        @media (max-width: 1180px) {
          .about-steps {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1050px) {
          .about-hero h1 {
            font-size: 54px;
          }

          .about-section-title {
            font-size: 40px;
          }

          .about-offer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .about-offer-card {
            min-height: 0;
          }
        }

        @media (max-width: 900px) {
          .about-why-grid,
          .about-audience-grid {
            grid-template-columns: 1fr;
          }

          .about-audience-card {
            min-height: 300px;
          }

          .about-mission h2 {
            font-size: 44px;
          }
        }

        @media (max-width: 760px) {
          .about-page {
            --content-left-space: 18px;
            --content-right-space: 18px;
          }

          .about-hero {
            padding: 96px 0 76px;
          }

          .about-hero h1 {
            font-size: 44px;
          }

          .about-section {
            padding: 70px 0;
          }

          .about-section-title {
            font-size: 34px;
          }

          .about-section-intro {
            font-size: 16px;
          }

          .about-pill-row {
            gap: 14px;
          }

          .about-pill {
            font-size: 12px;
            padding: 7px 18px;
          }

          .about-why-item {
            padding: 24px 22px;
          }

          .about-offer-grid,
          .about-steps {
            grid-template-columns: 1fr;
          }

          .about-audience-card {
            padding: 30px 24px;
          }

          .about-audience-icon {
            margin-bottom: 40px;
          }

          .about-mission {
            padding: 80px 0;
          }

          .about-mission h2 {
            font-size: 36px;
          }

          .about-cta-inner {
            min-height: 0;
            padding: 52px 24px;
          }

          .about-cta-inner h2 {
            font-size: 32px;
          }

          .about-footer-cols {
            gap: 32px;
          }
        }

        @media (max-width: 480px) {
          .about-hero h1 {
            font-size: 34px;
          }

          .about-hero-copy {
            font-size: 14.5px;
          }

          .about-badge {
            font-size: 12px;
            margin-bottom: 24px;
          }

          .about-section-title {
            font-size: 30px;
          }

          .about-why-item {
            grid-template-columns: 38px 1px minmax(0, 1fr);
            gap: 14px;
            padding: 20px 16px;
          }

          .about-number {
            width: 38px;
            height: 38px;
            font-size: 13px;
          }

          .about-mission h2 {
            font-size: 32px;
          }

          .about-cta {
            width: calc(100% - 36px);
          }

          .about-cta-inner {
            padding: 44px 20px;
          }

          .about-cta-inner h2 {
            font-size: 28px;
          }

          .about-cta-inner p {
            font-size: 15px;
          }

          .about-cta-actions {
            width: 100%;
            flex-direction: column;
          }

          .about-cta-actions .about-btn {
            width: 100%;
          }

          .about-footer-top {
            flex-direction: column;
          }

          .about-footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      <PublicNavbar />

      {/* ============================================
          HERO
      ============================================ */}

      <section className="about-hero">
        {/* faint decorative curves */}
        <svg
          className="about-hero-curves"
          viewBox="0 0 1440 460"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M-40 140 C 120 120, 260 200, 330 460"
            stroke="#ececec"
            strokeWidth="1.5"
          />
          <path
            d="M1480 120 C 1330 150, 1230 260, 1160 470"
            stroke="#ececec"
            strokeWidth="1.5"
          />
        </svg>

        <div className="about-container">
          <div className="about-hero-inner">
            <span className="about-badge">
              <span className="about-badge-dot" />
              About creatorhub
            </span>

            <h1>
              Connecting Businesses
              <br />
              with <span className="about-hero-accent">Creators</span>
            </h1>

            <p className="about-hero-copy">
              We make it easier for businesses to find creators and for
              creators to discover meaningful collaboration opportunities.
            </p>

            <div className="about-hero-actions">
              <Link to="/register/business" className="about-btn">
                Post a Campaign
                <ArrowRight size={14} />
              </Link>

              <Link to="/campaigns?source=about" className="about-hero-link">
                Explore Campaigns
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          WHY WE BUILT IT
      ============================================ */}

      <section className="about-section">
        <div className="about-container">
          <div className="about-section-heading">
            <div className="about-pill-row">
              <span className="about-pill">Why we built it</span>
            </div>

            <h2 className="about-section-title">
              A simpler way to bring both sides together.
            </h2>

            <p className="about-section-intro">
              Finding the right creator for a campaign can be difficult for
              businesses, while creators often struggle to find relevant
              opportunities. creatorhub brings both sides together in one
              simple marketplace.
            </p>
          </div>

          <div className="about-why-grid">
            {WHY_ITEMS.map((item) => (
              <article className="about-why-item" key={item.number}>
                <span className="about-number">{item.number}</span>

                <span className="about-rule" aria-hidden="true" />

                <div className="about-why-body">
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

      <section className="about-section">
        <div className="about-container">
          <div className="about-section-heading">
            <div className="about-pill-row">
              <span className="about-pill">What we offer</span>
            </div>

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
                    <Icon size={20} strokeWidth={1.6} />
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

      <section className="about-section">
        <div className="about-container">
          <div className="about-section-heading">
            <div className="about-pill-row">
              <span className="about-pill">How it works</span>
            </div>

            <h2 className="about-section-title">
              From campaign idea to collaboration.
            </h2>

            <p className="about-section-intro">
              The process is designed to stay simple for both businesses and
              creators.
            </p>
          </div>

          <div className="about-steps">
            {STEPS.map((step) => (
              <article className="about-step" key={step.number}>
                <span className="about-step-number">{step.number}</span>

                <h3>{step.title}</h3>

                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          WHO IT IS FOR
      ============================================ */}

      <section className="about-section">
        <div className="about-container">
          <div className="about-section-heading">
            <div className="about-pill-row">
              <span className="about-pill">Who is it for?</span>
            </div>

            <h2 className="about-section-title">
              One marketplace. Two sides.
            </h2>
          </div>

          <div className="about-audience-grid">
            <article className="about-audience-card">
              <div className="about-audience-icon">
                <BriefcaseBusiness size={21} strokeWidth={1.6} />
              </div>

              <h3>Businesses</h3>

              <p>
                Have a campaign in mind? Find creators for product promotions,
                social media content, events, photography, and more.
              </p>

              <Link to="/register/business" className="about-audience-link">
                Post a Campaign
                <ArrowRight size={15} />
              </Link>
            </article>

            <article className="about-audience-card">
              <div className="about-audience-icon">
                <Users size={21} strokeWidth={1.6} />
              </div>

              <h3>Creators</h3>

              <p>
                Looking for your next opportunity? Showcase your work and
                discover campaigns from businesses looking for creators.
              </p>

              <Link
                to="/campaigns?source=about"
                className="about-audience-link"
              >
                Explore Campaigns
                <ArrowRight size={15} />
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
          <div className="about-pill-row">
            <span className="about-pill">Our mission</span>
          </div>

          <h2>
            Making creator collaboration{" "}
            <span className="about-hero-accent">simple.</span>
          </h2>

          <p>
            Our goal is to create a straightforward space where businesses can
            find creative talent and creators can find opportunities that
            match their skills and interests.
          </p>
        </div>
      </section>

      <div className="about-divider" />

      {/* ============================================
          CTA
      ============================================ */}

      <section className="about-cta">
        <div className="about-cta-inner">
          <h2>Ready to create something together?</h2>

          <p>Start with a campaign or discover your next opportunity.</p>

          <div className="about-cta-actions">
            <Link to="/register/business" className="about-btn">
              Post a Campaign
              <ArrowRight size={14} />
            </Link>

            <Link
              to="/campaigns?source=about"
              className="about-btn about-btn-outline"
            >
              Explore Campaigns
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <div className="about-divider" />

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
            <span>
              © {new Date().getFullYear()} Creator Marketplace. All rights
              reserved.
            </span>

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
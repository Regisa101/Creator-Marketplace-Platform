// frontend/src/pages/Pricing.tsx
// creatorhub public pricing page.
// Centered hero with badge, green highlight word and two actions,
// then pricing, features, creators, FAQ, CTA.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "../components/Logo";
import { PublicNavbar } from "../components/PublicNavbar";

const PRICING_FEATURES = [
  {
    title: "Create campaigns",
    text: "Set your budget, requirements and deliverables.",
  },
  {
    title: "Find creators",
    text: "Browse creator profiles and portfolios.",
  },
  {
    title: "Review applications",
    text: "Compare creators before making your selection.",
  },
  {
    title: "Manage collaborations",
    text: "Keep campaign work and communication organized.",
  },
  {
    title: "Track progress",
    text: "From application to completion.",
  },
  {
    title: "Secure payments",
    text: "Pay for approved creator work.",
  },
];

const FAQS = [
  {
    question: "What is the creatorhub platform fee?",
    answer:
      "creatorhub charges a 10% platform fee for brands when they hire a creator.",
  },
  {
    question: "When is the fee charged?",
    answer:
      "The fee applies when you hire a creator. The pricing model is based on the creator payment rather than an upfront platform charge.",
  },
  {
    question: "Do creators pay to join?",
    answer:
      "Creators can join creatorhub and apply for campaigns for free.",
  },
  {
    question: "What do brands get on creatorhub?",
    answer:
      "Brands can create campaigns, discover creators, review applications, manage collaborations, track progress, and make payments through the platform.",
  },
];

export function Pricing() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pricing-page">
      <PublicNavbar />

      <main>
        {/* =========================================================
            HERO
        ========================================================== */}
        <section className="pricing-hero">
          {/* faint decorative curves */}
          <svg
            className="pricing-hero-curves"
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

          <div className="pricing-container">
            <div className="pricing-hero-inner">
              <span className="pricing-badge">
                <span className="pricing-badge-dot" />
                Simple &amp; Transparent Pricing
              </span>

              <h1>
                We grow when your
                <br />
                <span className="pricing-hero-accent">collaborations</span>{" "}
                grow.
              </h1>

              <p className="pricing-hero-copy">
                No subscription plans. No complicated packages. creatorhub
                earns through a 10% commission on successful collaborations.
              </p>

              <div className="pricing-hero-actions">
                <a href="#how-pricing" className="pricing-hero-btn">
                  Explore How It Works
                  <ArrowRight size={14} />
                </a>

                <Link to="/register" className="pricing-hero-link">
                  Join as a Creator
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="pricing-divider" aria-hidden="true" />

        {/* =========================================================
            MAIN PRICING
        ========================================================== */}
        <section className="pricing-section" id="how-pricing">
          <div className="pricing-container">
            <div className="pricing-section-head">
              <div>
                <div className="pricing-pill-row">
                  <span className="pricing-pill">FOR BRANDS</span>
                </div>

                <h2>Pay when you hire.</h2>
              </div>

              <p className="pricing-section-intro">
                One clear platform fee for using creatorhub to discover,
                select, and collaborate with creators.
              </p>
            </div>

            <div className="pricing-main-grid">
              {/* FEE */}
              <div className="pricing-fee-block">
                <div className="pricing-fee">
                  <span>10%</span>
                </div>

                <p className="pricing-fee-label">platform fee</p>

                <p className="pricing-muted">
                  Pay only when you hire a creator.
                </p>
              </div>

              {/* EXAMPLE */}
              <div className="pricing-example">
                <p className="pricing-eyebrow">EXAMPLE</p>

                <div className="pricing-example-row">
                  <span>Creator payment</span>
                  <strong>NPR 10,000</strong>
                </div>

                <div className="pricing-example-row">
                  <span>Platform fee (10%)</span>
                  <strong>NPR 1,000</strong>
                </div>

                <div className="pricing-example-row pricing-example-total">
                  <span>Paid to creatorhub</span>
                  <strong>NPR 1,000</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="pricing-divider" aria-hidden="true" />

        {/* =========================================================
            WHAT BRANDS GET
        ========================================================== */}
        <section className="pricing-section">
          <div className="pricing-container">
            <div className="pricing-section-head">
              <div>
                <div className="pricing-pill-row">
                  <span className="pricing-pill">WHAT YOU GET</span>
                </div>

                <h2>Everything you need to collaborate.</h2>
              </div>

              <p className="pricing-section-intro">
                creatorhub brings the main parts of a creator collaboration
                into one place.
              </p>
            </div>

            <div className="pricing-features-grid">
              {PRICING_FEATURES.map((feature, index) => (
                <article className="pricing-feature" key={feature.title}>
                  <span className="pricing-feature-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="pricing-feature-rule" aria-hidden="true" />

                  <div className="pricing-feature-body">
                    <h3>{feature.title}</h3>

                    <p>{feature.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="pricing-divider" aria-hidden="true" />

        {/* =========================================================
            CREATOR PRICING
        ========================================================== */}
        <section className="pricing-section">
          <div className="pricing-container">
            <div className="pricing-section-head">
              <div>
                <div className="pricing-pill-row">
                  <span className="pricing-pill">FOR CREATORS</span>
                </div>

                <h2>Join and apply for free.</h2>
              </div>

              <div className="pricing-creator-copy">
                <p>
                  Creators can join creatorhub, discover relevant campaigns,
                  and apply for opportunities without a platform fee.
                </p>

                <Link to="/register" className="pricing-text-link">
                  Join as a Creator
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="pricing-divider" aria-hidden="true" />

        {/* =========================================================
            FAQ
        ========================================================== */}
        <section className="pricing-section">
          <div className="pricing-container">
            <div className="pricing-section-head">
              <div>
                <div className="pricing-pill-row">
                  <span className="pricing-pill">FAQ</span>
                </div>

                <h2>Pricing, explained.</h2>
              </div>

              <p className="pricing-section-intro">
                A few quick answers about how the creatorhub pricing model
                works.
              </p>
            </div>

            <div className="pricing-faq-list">
              {FAQS.map((faq, index) => (
                <details className="pricing-faq-item" key={faq.question}>
                  <summary>
                    <span className="pricing-faq-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span>{faq.question}</span>

                    <span className="pricing-faq-plus" aria-hidden="true">
                      +
                    </span>
                  </summary>

                  <div className="pricing-faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <div className="pricing-divider" aria-hidden="true" />

        {/* =========================================================
            CTA
        ========================================================== */}
        <section className="pricing-cta">
          <div className="pricing-cta-inner">
            <p className="pricing-eyebrow">READY TO START?</p>

            <h2>Find the right creators for your next campaign.</h2>

            <p className="pricing-cta-text">
              Post your campaign, discover talented creators, and collaborate
              to create content that connects with your audience.
            </p>

            <Link
              to="/register/business"
              className="pricing-cta-button"
            >
              Get started for free
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        <div className="pricing-divider" aria-hidden="true" />
      </main>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer className="pricing-footer">
        <div className="pricing-container">
          <div className="pricing-footer-top">
            <div>
              <Link to="/" className="pricing-footer-brand">
                <LogoMark size={22} />

                <span>Creator Marketplace</span>
              </Link>

              <p className="pricing-footer-tag">
                Real campaigns. Real people. Real opportunities.
              </p>
            </div>

            <div className="pricing-footer-cols">
              <div className="pricing-footer-col">
                <h4>Platform</h4>

                <Link to="/">Home</Link>

                <Link to="/campaigns?source=landing">
                  Campaigns
                </Link>

                <Link to="/pricing">Pricing</Link>

                <Link to="/about">About</Link>
              </div>

              <div className="pricing-footer-col">
                <h4>Account</h4>

                <Link to="/login">Login</Link>

                <Link to="/register">Register</Link>
              </div>
            </div>
          </div>

          <div className="pricing-footer-bottom">
            <span>
              © {new Date().getFullYear()} Creator Marketplace. All rights
              reserved.
            </span>

            <div className="pricing-footer-social">
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

      {/* =========================================================
          STYLES
      ========================================================== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        /* =========================================================
           BASE
        ========================================================== */

        .pricing-page {
          --content-width: 1304px;
          --content-padding: 32px;
          --section-space: 64px;

          --pricing-ink: #111111;
          --pricing-soft: #6b6b6b;
          --pricing-line: #e5e5e5;
          --pricing-green: #1b5e3b;

          min-height: 100vh;

          padding-top: 68px;

          background: #ffffff;
          color: #212121;

          font-family: 'Poppins', sans-serif;
          font-weight: 400;

          overflow-x: hidden;
        }

        .pricing-page,
        .pricing-page * {
          box-sizing: border-box;
          font-family: 'Poppins', sans-serif;
        }

        .pricing-page a {
          text-decoration: none;
        }

        .pricing-container {
          width: 100%;

          max-width: var(--content-width);

          margin: 0 auto;

          padding-left: var(--content-padding);
          padding-right: var(--content-padding);
        }

        .pricing-divider {
          width: 100%;
          height: 1px;

          border: 0;

          border-top: 1px solid #d6d6d6;
        }

        /* =========================================================
           EYEBROW
        ========================================================== */

        .pricing-eyebrow {
          margin: 0 0 24px;

          color: #444444;

          font-size: 15px;

          line-height: 1.3;

          font-weight: 500;

          letter-spacing: .16em;

          text-transform: uppercase;
        }

        /* =========================================================
           GENERAL HEADINGS
        ========================================================== */

        .pricing-section h2,
        .pricing-cta h2 {
          margin: 0;

          font-weight: 500;

          letter-spacing: -0.03em;

          color: var(--pricing-ink);
        }

        .pricing-section h2,
        .pricing-cta h2 {
          font-size: 44px;

          line-height: 1.12;
        }

        /* =========================================================
           HERO
        ========================================================== */

        .pricing-hero {
          position: relative;

          padding: 96px 0 104px;

          background: #ffffff;

          text-align: center;

          overflow: hidden;
        }

        .pricing-hero-curves {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          pointer-events: none;
        }

        .pricing-hero .pricing-container {
          position: relative;

          z-index: 1;
        }

        .pricing-hero-inner {
          display: flex;

          flex-direction: column;

          align-items: center;

          max-width: 860px;

          margin: 0 auto;
        }

        .pricing-badge {
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

        .pricing-badge-dot {
          width: 6px;

          height: 6px;

          border-radius: 50%;

          background: var(--pricing-green);
        }

        .pricing-hero h1 {
          margin: 0;

          font-size: 64px;

          font-weight: 500;

          line-height: 1.12;

          letter-spacing: -0.035em;

          color: var(--pricing-ink);
        }

        .pricing-hero-accent {
          color: var(--pricing-green);
        }

        .pricing-hero-copy {
          max-width: 560px;

          margin: 26px 0 0;

          color: #555555;

          font-size: 15.5px;

          line-height: 1.6;
        }

        .pricing-hero-actions {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 26px;

          margin-top: 32px;

          flex-wrap: wrap;
        }

        .pricing-hero-btn {
          display: inline-flex;

          align-items: center;

          gap: 8px;

          padding: 12px 24px;

          border-radius: 8px;

          background: var(--pricing-green);

          color: #ffffff;

          font-size: 13.5px;

          font-weight: 500;

          transition:
            background .18s ease,
            transform .18s ease;
        }

        .pricing-hero-btn:hover {
          background: #154b30;

          color: #ffffff;

          transform: translateY(-2px);
        }

        .pricing-hero-link {
          padding-bottom: 2px;

          border-bottom: 1px solid var(--pricing-ink);

          color: var(--pricing-ink);

          font-size: 13.5px;

          font-weight: 400;

          transition: opacity .16s ease;
        }

        .pricing-hero-link:hover {
          color: var(--pricing-ink);

          opacity: .7;
        }

        #how-pricing {
          scroll-margin-top: 80px;
        }

        /* =========================================================
           SECTIONS
        ========================================================== */

        .pricing-section {
          padding: 95px 0;
        }

        .pricing-section-head {
          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 28px;

          margin-bottom: 55px;

          text-align: center;
        }

        .pricing-section-head > div {
          width: 100%;
        }

        .pricing-section-intro {
          max-width: 800px;

          margin: 0 auto;

          color: var(--pricing-soft);

          font-size: 18px;

          line-height: 1.7;
        }

        /* =========================================================
           FOR BRANDS PILL
        ========================================================== */

        .pricing-pill-row {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 22px;

          max-width: 620px;

          margin: 0 auto 26px;
        }

        .pricing-pill-row::before,
        .pricing-pill-row::after {
          content: "";

          flex: 1;

          height: 1px;

          background: #e2e2e2;
        }

        .pricing-pill {
          padding: 8px 22px;

          border-radius: 999px;

          background: #eaf4ee;

          color: var(--pricing-green);

          font-size: 13px;

          font-weight: 500;

          letter-spacing: .04em;
        }

        /* =========================================================
           MAIN PRICING
        ========================================================== */

        .pricing-main-grid {
          width: 100%;

          max-width: 1100px;

          margin: 0 auto;

          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);

          gap: 24px;
        }

        .pricing-fee-block,
        .pricing-example {
          border: 1px solid #e6e6e6;

          border-radius: 20px;

          background: #ffffff;
        }

        .pricing-fee-block {
          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          padding: 48px 40px;

          text-align: center;
        }

        .pricing-fee span {
          display: block;

          font-size: 84px;

          line-height: 1;

          font-weight: 300;

          letter-spacing: -.05em;

          color: var(--pricing-green);
        }

        .pricing-fee-label {
          margin: 10px 0 0;

          font-size: 22px;

          line-height: 1.2;

          font-weight: 300;

          color: #666666;
        }

        .pricing-muted {
          width: 100%;

          max-width: 340px;

          margin: 28px auto 0;

          padding-top: 22px;

          border-top: 1px solid #e8e8e8;

          color: var(--pricing-soft);

          font-size: 15px;

          line-height: 1.6;
        }

        /* =========================================================
           EXAMPLE
        ========================================================== */

        .pricing-example {
          padding: 36px 36px 30px;
        }

        .pricing-example .pricing-eyebrow {
          margin: 0 0 12px;

          text-align: left;

          font-size: 12px;

          font-weight: 400;

          letter-spacing: .32em;

          color: #555555;
        }

        .pricing-example-row {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 24px;

          padding: 16px 0;

          color: var(--pricing-soft);

          font-size: 15px;

          border-bottom: 1px solid #ececec;
        }

        .pricing-example-row strong {
          color: var(--pricing-ink);

          font-size: 15px;

          font-weight: 500;

          white-space: nowrap;
        }

        .pricing-example-total {
          margin: 10px -14px 0;

          padding: 16px 14px;

          border-bottom: 0;

          border-radius: 14px;

          background: #eef6f0;

          color: var(--pricing-ink);
        }

        .pricing-example-total span {
          font-weight: 500;
        }

        .pricing-example-total strong {
          color: var(--pricing-green);

          font-size: 17px;

          font-weight: 600;
        }

        /* =========================================================
           FEATURES
        ========================================================== */

        .pricing-features-grid {
          max-width: 1150px;

          margin: 0 auto;

          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 20px;
        }

        .pricing-feature {
          display: grid;

          grid-template-columns:
            44px 1px minmax(0, 1fr);

          gap: 20px;

          align-items: stretch;

          min-width: 0;

          padding: 30px 28px;

          border: 1px solid #e6e6e6;

          border-radius: 18px;

          background: #ffffff;

          text-align: left;

          transition:
            border-color .18s ease,
            box-shadow .18s ease;
        }

        .pricing-feature:hover {
          border-color: #cfe3d5;

          box-shadow: 0 8px 24px rgba(25, 80, 45, .06);
        }

        .pricing-feature-number {
          align-self: center;

          width: 44px;

          height: 44px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          background: #eaf4ee;

          color: var(--pricing-green);

          font-size: 14px;

          font-weight: 500;
        }

        .pricing-feature-rule {
          width: 1px;

          background: #d9d9d9;
        }

        .pricing-feature-body {
          align-self: center;

          min-width: 0;
        }

        .pricing-feature h3 {
          margin: 0;

          font-size: 18px;

          line-height: 1.3;

          font-weight: 500;

          letter-spacing: -0.01em;

          color: var(--pricing-ink);
        }

        .pricing-feature p {
          margin: 8px 0 0;

          color: var(--pricing-soft);

          font-size: 14.5px;

          line-height: 1.6;
        }

        /* =========================================================
           CREATOR SECTION
        ========================================================== */

        .pricing-creator-copy {
          width: 100%;

          max-width: 760px;

          margin: 0 auto;

          padding: 40px 40px 42px;

          border: 1px solid #e6e6e6;

          border-radius: 20px;

          background: #ffffff;
        }

        .pricing-creator-copy p {
          max-width: 560px;

          margin: 0 auto 26px;

          color: var(--pricing-soft);

          font-size: 17px;

          line-height: 1.7;
        }

        .pricing-text-link {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          padding: 12px 24px;

          border-radius: 8px;

          background: var(--pricing-green);

          color: #ffffff;

          font-size: 14px;

          font-weight: 500;

          transition:
            background .18s ease,
            transform .18s ease;
        }

        .pricing-text-link:hover {
          background: #154b30;

          color: #ffffff;

          transform: translateY(-2px);
        }

        /* =========================================================
           FAQ
        ========================================================== */

        .pricing-faq-list {
          max-width: 900px;

          margin: 0 auto;

          display: grid;

          gap: 14px;
        }

        .pricing-faq-item {
          border: 1px solid #e6e6e6;

          border-radius: 16px;

          background: #ffffff;

          transition: border-color .18s ease;
        }

        .pricing-faq-item[open] {
          border-color: #cfe3d5;
        }

        .pricing-faq-item summary {
          display: grid;

          grid-template-columns:
            40px minmax(0, 1fr) 30px;

          align-items: center;

          gap: 18px;

          padding: 18px 24px;

          cursor: pointer;

          list-style: none;

          font-size: 16px;

          font-weight: 500;

          text-align: left;

          color: var(--pricing-ink);
        }

        .pricing-faq-item summary::-webkit-details-marker {
          display: none;
        }

        .pricing-faq-number {
          width: 40px;

          height: 40px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          background: #eaf4ee;

          color: var(--pricing-green);

          font-size: 13px;

          font-weight: 500;
        }

        .pricing-faq-plus {
          justify-self: end;

          font-size: 26px;

          line-height: 1;

          font-weight: 300;

          color: #555555;

          transition: transform .18s ease;
        }

        .pricing-faq-item[open] .pricing-faq-plus {
          transform: rotate(45deg);
        }

        .pricing-faq-answer {
          padding: 0 60px 24px 82px;

          text-align: left;
        }

        .pricing-faq-answer p {
          max-width: 700px;

          margin: 0;

          color: var(--pricing-soft);

          font-size: 15px;

          line-height: 1.7;
        }

        /* =========================================================
           CTA
        ========================================================== */

        .pricing-cta {
          width: calc(100% - 2 * var(--content-padding));

          max-width:
            calc(var(--content-width) - 2 * var(--content-padding));

          margin: var(--section-space) auto;

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

        .pricing-cta-inner {
          min-height: 390px;

          padding: 70px 40px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          text-align: center;
        }

        .pricing-cta h2 {
          max-width: 900px;

          margin: 0 auto 24px;

          font-size: 44px;
        }

        .pricing-cta-text {
          max-width: 800px;

          margin: 0 auto 32px;

          color: var(--pricing-soft);

          font-size: 17px;

          line-height: 1.7;
        }

        .pricing-cta-button {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          min-height: 52px;

          padding: 0 28px;

          border: 1px solid var(--pricing-green);

          border-radius: 8px;

          background: var(--pricing-green);

          color: #ffffff;

          font-size: 15px;

          font-weight: 500;

          white-space: nowrap;

          transition:
            transform .18s ease,
            background .18s ease;
        }

        .pricing-cta-button:hover {
          background: #154b30;

          border-color: #154b30;

          color: #ffffff;

          transform: translateY(-2px);
        }

        /* =========================================================
           FOOTER
        ========================================================== */

        .pricing-footer {
          background: #ffffff;

          color: #212121;

          padding: var(--section-space) 0 22px;
        }

        .pricing-footer-top {
          display: flex;

          justify-content: space-between;

          gap: 40px;

          flex-wrap: wrap;

          padding-bottom: 36px;

          border-bottom: 1px solid #e7e0da;
        }

        .pricing-footer-brand {
          display: flex;

          align-items: center;

          gap: 9px;

          margin-bottom: 12px;

          font-weight: 500;

          font-size: 18px;

          color: var(--pricing-ink);
        }

        .pricing-footer-brand:hover {
          color: var(--pricing-ink);
        }

        .pricing-footer-tag {
          margin: 0;

          max-width: 320px;

          font-size: 14px;

          line-height: 1.6;

          color: var(--pricing-soft);
        }

        .pricing-footer-cols {
          display: flex;

          gap: 64px;
        }

        .pricing-footer-col h4 {
          margin: 0 0 16px;

          font-size: 14px;

          text-transform: uppercase;

          letter-spacing: .08em;

          color: var(--pricing-ink);
        }

        .pricing-footer-col a {
          display: block;

          margin-bottom: 11px;

          font-size: 14px;

          color: var(--pricing-soft);
        }

        .pricing-footer-col a:hover {
          color: var(--pricing-ink);
        }

        .pricing-footer-bottom {
          display: flex;

          justify-content: space-between;

          align-items: center;

          flex-wrap: wrap;

          gap: 12px;

          padding-top: 22px;

          font-size: 13px;

          color: var(--pricing-soft);
        }

        .pricing-footer-social {
          display: flex;

          gap: 12px;
        }

        .pricing-footer-social a {
          width: 36px;

          height: 36px;

          border-radius: 50%;

          border: 1px solid #dcd4cc;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 11px;

          letter-spacing: .3px;

          color: var(--pricing-soft);

          transition:
            border-color .16s ease,
            color .16s ease,
            transform .16s ease;
        }

        .pricing-footer-social a:hover {
          border-color: #111111;

          color: #111111;

          transform: translateY(-1px);
        }

        /* =========================================================
           LARGE TABLETS
        ========================================================== */

        @media (max-width: 1080px) {
          .pricing-page {
            padding-top: 64px;
          }

          .pricing-hero h1 {
            font-size: 54px;
          }

          .pricing-section h2,
          .pricing-cta h2 {
            font-size: 40px;
          }

          .pricing-section-intro,
          .pricing-creator-copy p {
            font-size: 17px;
          }

          .pricing-fee span {
            font-size: 76px;
          }
        }

        /* =========================================================
           TABLETS
        ========================================================== */

        @media (max-width: 900px) {
          .pricing-hero {
            padding: 80px 0 88px;
          }

          .pricing-main-grid {
            grid-template-columns: 1fr;
          }

          .pricing-example {
            padding: 32px 28px 26px;
          }

          .pricing-fee-block {
            padding: 40px 28px;
          }

          .pricing-features-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        /* =========================================================
           SMALL TABLET
        ========================================================== */

        @media (max-width: 768px) {
          .pricing-page {
            --section-space: 48px;
          }

          .pricing-hero h1 {
            font-size: 46px;
          }

          .pricing-section {
            padding: 75px 0;
          }

          .pricing-section h2,
          .pricing-cta h2 {
            font-size: 36px;
          }

          .pricing-section-intro,
          .pricing-creator-copy p {
            font-size: 16px;
          }

          .pricing-cta-inner {
            min-height: 350px;
          }
        }

        /* =========================================================
           MOBILE
        ========================================================== */

        @media (max-width: 760px) {
          .pricing-page {
            --content-padding: 18px;
          }

          .pricing-hero {
            padding: 64px 0 72px;
          }

          .pricing-section {
            padding: 70px 0;
          }

          .pricing-section-head {
            display: flex;

            flex-direction: column;

            margin-bottom: 42px;

            text-align: center;
          }

          .pricing-section h2,
          .pricing-cta h2 {
            font-size: 34px;
          }

          .pricing-section-intro,
          .pricing-creator-copy p {
            font-size: 16px;
          }

          .pricing-eyebrow {
            font-size: 13px;

            margin-bottom: 18px;
          }

          .pricing-fee span {
            font-size: 64px;
          }

          .pricing-fee-label {
            font-size: 20px;
          }

          .pricing-pill-row {
            gap: 14px;
          }

          .pricing-features-grid {
            grid-template-columns: 1fr;
          }

          .pricing-feature {
            padding: 24px 22px;
          }

          .pricing-creator-copy {
            padding: 32px 24px 34px;
          }

          .pricing-faq-item summary {
            grid-template-columns:
              36px minmax(0, 1fr) 22px;

            gap: 12px;

            padding: 14px 16px;

            font-size: 15px;
          }

          .pricing-faq-number {
            width: 36px;

            height: 36px;
          }

          .pricing-faq-answer {
            padding: 0 16px 20px 64px;
          }

          .pricing-cta-inner {
            min-height: 0;

            padding: 55px 24px;
          }

          .pricing-cta-text {
            font-size: 16px;
          }

          .pricing-footer-cols {
            gap: 32px;
          }
        }

        /* =========================================================
           SMALL MOBILE
        ========================================================== */

        @media (max-width: 480px) {
          .pricing-hero h1 {
            font-size: 34px;
          }

          .pricing-hero-copy {
            font-size: 14.5px;
          }

          .pricing-badge {
            font-size: 12px;

            margin-bottom: 24px;
          }

          .pricing-section h2,
          .pricing-cta h2 {
            font-size: 30px;
          }

          .pricing-section-intro,
          .pricing-creator-copy p {
            font-size: 15px;
          }

          .pricing-eyebrow {
            font-size: 12px;

            letter-spacing: .14em;
          }

          .pricing-main-grid {
            max-width: 100%;
          }

          .pricing-example {
            padding-left: 20px;

            padding-right: 20px;
          }

          .pricing-example-row {
            font-size: 14px;

            gap: 14px;
          }

          .pricing-example-row strong {
            font-size: 15px;
          }

          .pricing-fee-block {
            padding-left: 20px;

            padding-right: 20px;
          }

          .pricing-fee span {
            font-size: 56px;
          }

          .pricing-fee-label {
            font-size: 18px;
          }

          .pricing-example-total {
            margin-left: -10px;

            margin-right: -10px;

            padding-left: 10px;

            padding-right: 10px;
          }

          .pricing-muted {
            font-size: 14px;
          }

          .pricing-feature {
            grid-template-columns:
              38px 1px minmax(0, 1fr);

            gap: 14px;

            padding: 20px 16px;
          }

          .pricing-feature-number {
            width: 38px;

            height: 38px;

            font-size: 13px;
          }

          .pricing-feature h3 {
            font-size: 17px;
          }

          .pricing-feature p {
            font-size: 14px;
          }

          .pricing-faq-item summary {
            font-size: 14px;
          }

          .pricing-cta {
            width: calc(100% - 36px);
          }

          .pricing-cta-inner {
            padding: 45px 20px;
          }

          .pricing-cta-text {
            font-size: 15px;
          }

          .pricing-cta-button {
            min-height: 48px;

            padding: 0 22px;

            font-size: 14px;
          }

          .pricing-footer-top {
            flex-direction: column;
          }

          .pricing-footer-bottom {
            align-items: flex-start;

            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default Pricing;
// frontend/src/pages/Pricing.tsx
// CreatorHub public pricing page.
// Centered layout with large typography and creator CTA in hero.

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
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
    question: "What is the CreatorHub platform fee?",
    answer:
      "CreatorHub charges a 10% platform fee for brands when they hire a creator.",
  },
  {
    question: "When is the fee charged?",
    answer:
      "The fee applies when you hire a creator. The pricing model is based on the creator payment rather than an upfront platform charge.",
  },
  {
    question: "Do creators pay to join?",
    answer:
      "Creators can join CreatorHub and apply for campaigns for free.",
  },
  {
    question: "What do brands get on CreatorHub?",
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
          <div className="pricing-container">
            <div className="pricing-hero-inner">
              <h1>
                Simple pricing for
                <br />
                real collaborations.
              </h1>

              <p className="pricing-hero-copy">
                A straightforward platform fee for brands, with creators free
                to join and apply for campaigns.
              </p>

              <div className="pricing-hero-work">
                <span>Looking to work?</span>

                <Link
                  to="/register"
                  className="pricing-hero-work-link"
                >
                  Join as a brand
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="pricing-divider" aria-hidden="true" />

        {/* =========================================================
            MAIN PRICING
        ========================================================== */}
        <section className="pricing-section">
          <div className="pricing-container">
            <div className="pricing-section-head">
              <div>
                <p className="pricing-eyebrow">FOR BRANDS</p>

                <h2>Pay when you hire.</h2>
              </div>

              <p className="pricing-section-intro">
                One clear platform fee for using CreatorHub to discover,
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
                  <span>Total for brand</span>
                  <strong>NPR 11,000</strong>
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
                <p className="pricing-eyebrow">WHAT YOU GET</p>

                <h2>Everything you need to collaborate.</h2>
              </div>

              <p className="pricing-section-intro">
                CreatorHub brings the main parts of a creator collaboration
                into one place.
              </p>
            </div>

            <div className="pricing-features-grid">
              {PRICING_FEATURES.map((feature, index) => (
                <article className="pricing-feature" key={feature.title}>
                  <span className="pricing-feature-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <div className="pricing-feature-title-row">
                      <Check size={18} strokeWidth={1.7} />

                      <h3>{feature.title}</h3>
                    </div>

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
                <p className="pricing-eyebrow">FOR CREATORS</p>

                <h2>Join and apply for free.</h2>
              </div>

              <div className="pricing-creator-copy">
                <p>
                  Creators can join CreatorHub, discover relevant campaigns,
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
                <p className="pricing-eyebrow">FAQ</p>

                <h2>Pricing, explained.</h2>
              </div>

              <p className="pricing-section-intro">
                A few quick answers about how the CreatorHub pricing model
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
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

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

          font-size: 17px;

          line-height: 1.3;

          font-weight: 500;

          letter-spacing: .18em;

          text-transform: uppercase;
        }

        /* =========================================================
           GENERAL HEADINGS
        ========================================================== */

        .pricing-hero h1,
        .pricing-section h2,
        .pricing-cta h2 {
          margin: 0;

          font-family: 'League Spartan', sans-serif;

          font-weight: 400;

          letter-spacing: -0.035em;

          color: var(--pricing-ink);
        }

        .pricing-section h2,
        .pricing-cta h2 {
          font-size: 52px;

          line-height: 1.02;
        }

        /* =========================================================
           HERO
        ========================================================== */

        .pricing-hero {
          padding: 120px 0 105px;

          text-align: center;
        }

        .pricing-hero-inner {
          max-width: 1050px;

          margin: 0 auto;
        }

        .pricing-hero h1 {
          font-size: 88px;

          line-height: .98;

          letter-spacing: -0.045em;
        }

        .pricing-hero-copy {
          max-width: 760px;

          margin: 28px auto 0;

          color: var(--pricing-soft);

          font-size: 18px;

          line-height: 1.65;
        }

        /* =========================================================
           LOOKING TO WORK CTA
        ========================================================== */

        .pricing-hero-work {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 10px;

          margin-top: 28px;

          font-size: 16px;

          line-height: 1.5;
        }

        .pricing-hero-work > span {
          color: var(--pricing-soft);
        }

        .pricing-hero-work-link {
          display: inline-flex;

          align-items: center;

          gap: 6px;

          color: var(--pricing-ink);

          font-weight: 500;

          transition:
            transform .16s ease,
            opacity .16s ease;
        }

        .pricing-hero-work-link:hover {
          color: var(--pricing-ink);

          transform: translateX(3px);

          opacity: .7;
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

          font-size: 20px;

          line-height: 1.7;
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
            minmax(400px, .8fr);

          border-top: 1px solid var(--pricing-line);

          border-bottom: 1px solid var(--pricing-line);
        }

        .pricing-fee-block {
          padding: 55px 45px;

          text-align: center;
        }

        .pricing-fee span {
          display: block;

          font-family: 'League Spartan', sans-serif;

          font-size: 120px;

          line-height: .82;

          font-weight: 300;

          letter-spacing: -.055em;

          color: var(--pricing-ink);
        }

        .pricing-fee-label {
          margin: 20px 0 0;

          font-family: 'League Spartan', sans-serif;

          font-size: 28px;

          line-height: 1.1;

          font-weight: 300;

          color: var(--pricing-ink);
        }

        .pricing-muted {
          max-width: 400px;

          margin: 22px auto 0;

          color: var(--pricing-soft);

          font-size: 16px;

          line-height: 1.7;
        }

        /* =========================================================
           EXAMPLE
        ========================================================== */

        .pricing-example {
          align-self: stretch;

          padding: 42px 45px;

          border-left: 1px solid var(--pricing-line);
        }

        .pricing-example .pricing-eyebrow {
          text-align: left;
        }

        .pricing-example-row {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 24px;

          padding: 16px 0;

          color: var(--pricing-soft);

          font-size: 16px;

          border-bottom: 1px solid #eeeeee;
        }

        .pricing-example-row strong {
          color: var(--pricing-ink);

          font-size: 17px;

          font-weight: 500;

          white-space: nowrap;
        }

        .pricing-example-total {
          border-bottom: 0;

          padding-top: 20px;

          color: var(--pricing-ink);
        }

        .pricing-example-total strong {
          font-size: 20px;
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

          border-top: 1px solid var(--pricing-line);

          border-bottom: 1px solid var(--pricing-line);
        }

        .pricing-feature {
          display: grid;

          grid-template-columns:
            40px minmax(0, 1fr);

          gap: 18px;

          min-width: 0;

          padding: 36px 36px 38px;

          text-align: left;
        }

        .pricing-feature:nth-child(3n + 2),
        .pricing-feature:nth-child(3n + 3) {
          border-left: 1px solid var(--pricing-line);
        }

        .pricing-feature:nth-child(n + 4) {
          border-top: 1px solid var(--pricing-line);
        }

        .pricing-feature-number {
          color: #999999;

          font-size: 15px;

          line-height: 1.5;
        }

        .pricing-feature-title-row {
          display: flex;

          align-items: center;

          gap: 10px;
        }

        .pricing-feature-title-row svg {
          flex-shrink: 0;
        }

        .pricing-feature h3 {
          margin: 0;

          font-family: 'League Spartan', sans-serif;

          font-size: 25px;

          line-height: 1.15;

          font-weight: 400;

          letter-spacing: -0.02em;

          color: var(--pricing-ink);
        }

        .pricing-feature p {
          max-width: 320px;

          margin: 11px 0 0;

          color: var(--pricing-soft);

          font-size: 15px;

          line-height: 1.7;
        }

        /* =========================================================
           CREATOR SECTION
        ========================================================== */

        .pricing-creator-copy {
          max-width: 760px;

          margin: 0 auto;
        }

        .pricing-creator-copy p {
          max-width: 760px;

          margin: 0 auto 28px;

          color: var(--pricing-soft);

          font-size: 20px;

          line-height: 1.7;
        }

        .pricing-text-link {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          color: var(--pricing-ink);

          font-size: 17px;

          font-weight: 400;

          transition:
            transform .16s ease,
            opacity .16s ease;
        }

        .pricing-text-link:hover {
          color: var(--pricing-ink);

          transform: translateX(4px);

          opacity: .7;
        }

        /* =========================================================
           FAQ
        ========================================================== */

        .pricing-faq-list {
          max-width: 1000px;

          margin: 0 auto;

          border-top: 1px solid var(--pricing-line);
        }

        .pricing-faq-item {
          border-bottom: 1px solid var(--pricing-line);
        }

        .pricing-faq-item summary {
          display: grid;

          grid-template-columns:
            58px minmax(0, 1fr) 30px;

          align-items: center;

          gap: 20px;

          min-height: 84px;

          cursor: pointer;

          list-style: none;

          font-size: 17px;

          font-weight: 500;

          color: var(--pricing-ink);
        }

        .pricing-faq-item summary::-webkit-details-marker {
          display: none;
        }

        .pricing-faq-number {
          color: #999999;

          font-size: 14px;

          font-weight: 400;
        }

        .pricing-faq-plus {
          justify-self: end;

          font-size: 28px;

          line-height: 1;

          font-weight: 300;

          transition: transform .18s ease;
        }

        .pricing-faq-item[open] .pricing-faq-plus {
          transform: rotate(45deg);
        }

        .pricing-faq-answer {
          padding: 0 50px 30px 78px;
        }

        .pricing-faq-answer p {
          max-width: 750px;

          margin: 0;

          color: var(--pricing-soft);

          font-size: 16px;

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

          font-size: 52px;
        }

        .pricing-cta-text {
          max-width: 800px;

          margin: 0 auto 32px;

          color: var(--pricing-soft);

          font-size: 18px;

          line-height: 1.7;
        }

        .pricing-cta-button {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          min-height: 52px;

          padding: 0 28px;

          border: 1px solid #111111;

          border-radius: 8px;

          background: #111111;

          color: #ffffff;

          font-size: 15px;

          font-weight: 500;

          white-space: nowrap;

          transition:
            transform .18s ease,
            background .18s ease;
        }

        .pricing-cta-button:hover {
          background: #000000;

          border-color: #000000;

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

          font-family: 'League Spartan', sans-serif;

          font-weight: 400;

          font-size: 21px;

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
            font-size: 72px;
          }

          .pricing-section h2,
          .pricing-cta h2 {
            font-size: 46px;
          }

          .pricing-section-intro,
          .pricing-creator-copy p {
            font-size: 18px;
          }

          .pricing-fee span {
            font-size: 105px;
          }
        }

        /* =========================================================
           TABLETS
        ========================================================== */

        @media (max-width: 900px) {
          .pricing-main-grid {
            grid-template-columns: 1fr;
          }

          .pricing-example {
            border-left: 0;

            border-top: 1px solid var(--pricing-line);

            padding: 35px 32px;
          }

          .pricing-fee-block {
            padding: 42px 32px 40px;
          }

          .pricing-features-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .pricing-feature:nth-child(3n + 2),
          .pricing-feature:nth-child(3n + 3) {
            padding-left: 0;

            border-left: 0;
          }

          .pricing-feature:nth-child(even) {
            padding-left: 28px;

            border-left: 1px solid var(--pricing-line);
          }

          .pricing-feature:nth-child(n + 3) {
            border-top: 1px solid var(--pricing-line);
          }
        }

        /* =========================================================
           SMALL TABLET
        ========================================================== */

        @media (max-width: 768px) {
          .pricing-page {
            --section-space: 48px;
          }

          .pricing-hero {
            padding: 90px 0 75px;
          }

          .pricing-hero h1 {
            font-size: 60px;
          }

          .pricing-hero-copy {
            font-size: 18px;
          }

          .pricing-section {
            padding: 75px 0;
          }

          .pricing-section h2,
          .pricing-cta h2 {
            font-size: 43px;
          }

          .pricing-section-intro,
          .pricing-creator-copy p {
            font-size: 18px;
          }

          .pricing-feature h3 {
            font-size: 23px;
          }

          .pricing-feature p {
            font-size: 14px;
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
            padding: 80px 0 70px;
          }

          .pricing-hero h1 {
            font-size: 52px;

            line-height: 1;
          }

          .pricing-hero-copy {
            max-width: 650px;

            margin-top: 24px;

            font-size: 17px;
          }

          .pricing-hero-work {
            margin-top: 24px;

            font-size: 15px;
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
            font-size: 40px;
          }

          .pricing-section-intro,
          .pricing-creator-copy p {
            font-size: 17px;
          }

          .pricing-eyebrow {
            font-size: 15px;

            margin-bottom: 18px;
          }

          .pricing-fee span {
            font-size: 82px;
          }

          .pricing-fee-label {
            font-size: 25px;
          }

          .pricing-features-grid {
            grid-template-columns: 1fr;
          }

          .pricing-feature,
          .pricing-feature:nth-child(even),
          .pricing-feature:nth-child(3n + 2),
          .pricing-feature:nth-child(3n + 3) {
            padding: 28px 0;

            border-left: 0;
          }

          .pricing-feature + .pricing-feature {
            border-top: 1px solid var(--pricing-line);
          }

          .pricing-feature h3 {
            font-size: 24px;
          }

          .pricing-feature p {
            max-width: 500px;

            font-size: 15px;
          }

          .pricing-faq-item summary {
            grid-template-columns:
              38px minmax(0, 1fr) 20px;

            gap: 10px;

            min-height: 72px;

            font-size: 15px;
          }

          .pricing-faq-answer {
            padding: 0 20px 24px 48px;
          }

          .pricing-faq-answer p {
            font-size: 15px;
          }

          .pricing-cta-inner {
            min-height: 0;

            padding: 55px 24px;
          }

          .pricing-cta h2 {
            font-size: 40px;
          }

          .pricing-cta-text {
            font-size: 17px;
          }

          .pricing-footer-cols {
            gap: 32px;
          }
        }

        /* =========================================================
           SMALL MOBILE
        ========================================================== */

        @media (max-width: 480px) {
          .pricing-hero {
            padding: 70px 0 60px;
          }

          .pricing-hero h1 {
            font-size: 42px;
          }

          .pricing-hero-copy {
            font-size: 16px;

            line-height: 1.65;
          }

          .pricing-hero-work {
            flex-direction: column;

            gap: 5px;

            font-size: 14px;
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

            letter-spacing: .15em;
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
            font-size: 72px;
          }

          .pricing-fee-label {
            font-size: 23px;
          }

          .pricing-muted {
            font-size: 14px;
          }

          .pricing-feature {
            grid-template-columns:
              32px minmax(0, 1fr);

            gap: 13px;
          }

          .pricing-feature h3 {
            font-size: 21px;
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

          .pricing-cta h2 {
            font-size: 34px;
          }

          .pricing-cta-text {
            font-size: 16px;
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
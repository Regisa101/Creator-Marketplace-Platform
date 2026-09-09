import { useState, useEffect, useRef, memo } from "react";
import { Link } from "react-router-dom";
import { LogoMark } from '../components/Logo';
import {
  ChevronDown,
  ArrowRight,
  Search,
  Compass,
  Inbox,
  Briefcase as BriefcaseIcon,
  UserPlus,
  PlayCircle,
  BarChart3,
  User,
  Users,
  Send,
  X,
  Check,
  Sparkles,
  Tag,
  Mail,
  FileSpreadsheet,
  MessageCircle,
  Camera,
  Video,
  Wallet,
  FileSignature,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Settings as SettingsIcon,
  FileText,
  Bell,
  Wand2,
} from "lucide-react";

// ============================================
// 🔥 BRAND COLORS — official palette
// Brand Navy + Brand Coral
// ============================================
const MIDNIGHT_BLUE = "#1E2A78";
const MIDNIGHT_BLUE_LIGHT = "#4A4F96";
const MIDNIGHT_BLUE_SOFT = "#F2F4FC";

const ELECTRIC_ORANGE = "#FF6B5A";
const ELECTRIC_ORANGE_DARK = "#F0523F";
const ELECTRIC_ORANGE_LIGHT = "#FF9686";
const ELECTRIC_ORANGE_SOFT = "#FFF4F2";

const SOFT_PURPLE = "#7B2CBF";
const SOFT_PURPLE_LIGHT = "#9D4EDD";
const SOFT_PURPLE_SOFT = "#F3E8FF";

const LIGHT_BG = "#F8F9FA";
const TEXT_DARK = "#0D0D0D";
const TEXT_SOFT = "#6B7280";

const VIOLET = SOFT_PURPLE;
const VIOLET_LIGHT = SOFT_PURPLE_LIGHT;
const VIOLET_DARK = "#5A1E8A";
const VIOLET_SOFT = SOFT_PURPLE_SOFT;
const CORAL = ELECTRIC_ORANGE;
const CORAL_DARK = ELECTRIC_ORANGE_DARK;
const CORAL_LIGHT = ELECTRIC_ORANGE_LIGHT;
const CORAL_SOFT = ELECTRIC_ORANGE_SOFT;

const FIND_NAVY = MIDNIGHT_BLUE;
const FIND_CORAL = ELECTRIC_ORANGE;
const FIND_CORAL_DARK = ELECTRIC_ORANGE_DARK;
const FIND_CORAL_SOFT = ELECTRIC_ORANGE_SOFT;
const FIND_BLOB = MIDNIGHT_BLUE_SOFT;

const NAV_MENUS = {
  creator: {
    label: "For Creators",
    href: "/creators",
    accent: ELECTRIC_ORANGE,
    accentSoft: ELECTRIC_ORANGE_SOFT,
    items: [
      { title: "Features", desc: "Everything you need to land and manage collabs.", icon: Sparkles, href: "/creators#features" },
      { title: "How it works", desc: "From signup to your first paid collab.", icon: Compass, href: "/creators#how-it-works" },
      { title: "Pricing", desc: "It's free to apply — no subscription, ever.", icon: Tag, href: "/creators#pricing" },
    ],
  },
  business: {
    label: "For Business",
    href: "/business",
    accent: MIDNIGHT_BLUE,
    accentSoft: MIDNIGHT_BLUE_SOFT,
    items: [
      { title: "Features", desc: "Briefs, discovery, tracking, and payments in one place.", icon: Sparkles, href: "/business#features" },
      { title: "How it works", desc: "From brief to a shortlist of matched creators.", icon: Compass, href: "/business#how-it-works" },
      { title: "Pricing", desc: "Plans that scale with how many campaigns you run.", icon: Tag, href: "/business#pricing" },
    ],
  },
};

// ============================================
// HERO DASHBOARD PREVIEW — alternates between the
// Business dashboard and the Creator dashboard every
// few seconds. Both the mock app-frame content and the
// floating notification cards swap together so the
// whole preview reads as "here's what each side sees."
// ============================================
const FIND_FEATURES = [
  {
    title: "Discover creators that fit your brand",
    desc: "Find relevant Nepali based on niche, audience, engagement, location, and campaign needs.",
    visual: "avatars",
    badge: "3 creators matched",
    badgeIcon: Users,
    cardPhoto: "https://i.pravatar.cc/160?img=68",
  },
  {
    title: "Launch campaigns without the hassle",
    desc: "Create campaigns, set requirements and deadlines, and let creators apply — all in one place.",
    visual: "badge",
    badge: "12 creators applied",
    badgeIcon: Users,
    cardPhoto: "https://plus.unsplash.com/premium_photo-1715015440855-7d95cf92608a?q=80&w=388&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    title: "Manage collaborations. Measure what matters.",
    desc: "Keep creator communication, deliverables, deadlines, and campaign performance organized in one workspace.",
    visual: "hub",
    badge: "65% complete",
    badgeIcon: BarChart3,
    cardPhoto: "https://images.unsplash.com/photo-1597400473368-b2f08a070bde?q=80&w=436&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

const FIND_AVATAR_PHOTOS = [
  "https://i.pravatar.cc/64?img=47",
  "https://i.pravatar.cc/64?img=12",
  "https://i.pravatar.cc/64?img=32",
];

const CATEGORIES = ["Fashion", "Beauty", "Fitness", "Food", "Tech", "Travel", "Gaming", "Music", "Home", "Wellness"];

const GOALS_CREATOR_POINTS = [
  { text: "Discover relevant campaigns that match your niche", icon: Compass },
  { text: "Build a professional creator profile", icon: User },
  { text: "Apply with AI-powered proposals", icon: Send },
  { text: "Manage collaborations and deliverables", icon: BriefcaseIcon },
  { text: "Get paid securely", icon: Wallet },
];

const GOALS_BRAND_POINTS = [
  { text: "Create and publish campaigns", icon: Sparkles },
  { text: "Search and filter creators by niche, platform, location & more", icon: Search },
  { text: "Review applications and compare performance", icon: Users },
  { text: "Chat and collaborate in one place", icon: MessageCircle },
  { text: "Track deliverables and payments", icon: BarChart3 },
];

const COMPARE_BEFORE = [
  "Creators cold-DM'd brands and got ignored",
  "No way to build a portfolio or track record",
  "Brands paid expensive agencies for average results",
  "Micro-influencers and UGC creators were overlooked",
  "No structured way to manage collabs",
];

const COMPARE_AFTER = [
  "Creators apply to campaigns in one click",
  "Brands discover creators by niche, location, and engagement",
  "Direct collaboration — no middlemen",
  "Any creator can apply regardless of follower count",
  "Full campaign management in one dashboard",
];

const MERGE_ICONS = [
  { label: "Email", icon: Mail, x: 70, y: 90, variant: "light" },
  { label: "Sheets", icon: FileSpreadsheet, x: 380, y: 80, variant: "light" },
  { label: "Chat", icon: MessageCircle, x: 420, y: 210, variant: "navy" },
  { label: "Social", icon: Camera, x: 390, y: 370, variant: "light" },
  { label: "Reels", icon: Video, x: 250, y: 410, variant: "navy" },
  { label: "Payments", icon: Wallet, x: 110, y: 380, variant: "light" },
  { label: "Contracts", icon: FileSignature, x: 60, y: 230, variant: "orange" },
  { label: "Invoices", icon: CreditCard, x: 200, y: 50, variant: "navy" },
  { label: "Reports", icon: BarChart3, x: 300, y: 140, variant: "light" },
];

const FAQ_CREATOR = [
  { q: "Is it free to join as a creator?", a: "Yes, completely free. There are no subscription fees or hidden charges for creators." },
  { q: "Do I need a minimum follower count?", a: "No. CreatorHub matches on engagement and content quality, not follower count — micro and nano creators are welcome." },
  { q: "How do I get paid for campaigns?", a: "Once a brand approves your deliverable, payment is released directly to you through the platform — no invoices or waiting on screenshots." },
  { q: "What if a brand doesn't respond after I apply?", a: "Brands typically respond within a few days. If a brand goes quiet, you can withdraw your application anytime and apply to other open campaigns." },
  { q: "What types of content do brands look for?", a: "It varies by campaign — reels, unboxings, tutorials, and honest reviews are the most requested formats. Each campaign brief lists exactly what's needed." },
];

const FAQ_BUSINESS = [
  { q: "How do I post a campaign?", a: "Fill out a short brief with your product, budget, and target niche — CreatorHub turns it into a full campaign listing in minutes." },
  { q: "Can I set my own budget?", a: "Yes, you set the budget per campaign, whether it's a paid collab, gifted product, or a mix of both." },
  { q: "How long does it take to find creators?", a: "Most campaigns start receiving applications within hours of posting, since creators can discover and apply instantly." },
  { q: "Is there a platform fee for brands?", a: "Pricing plans scale with how many campaigns you run — check the Pricing section under For Business for details." },
  { q: "How do I know creators are legitimate?", a: "Every creator profile shows verified engagement and content history, so you can review real performance before shortlisting." },
];



const NavMegaMenu = memo(function NavMegaMenu({
  menu,
  onNavigate,
}: {
  menu: (typeof NAV_MENUS)["creator"];
  onNavigate: () => void;
}) {
  return (
    <div className="ch-dropdown">
      <div className="ch-dropdown-left">
        {menu.items.map((item) => {
          const Icon = item.icon;
          return (
            <Link to={item.href} key={item.title} className="ch-drop-item" onClick={onNavigate}>
              <span className="ch-drop-icon">
                <Icon size={18} />
              </span>
              <span>
                <span className="ch-drop-title">{item.title}</span>
                <div className="ch-drop-desc">{item.desc}</div>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// HERO DASHBOARD PREVIEW
// ============================================

function HeroFloatCard({ float }: { float: any }) {
  const Icon = float.icon;
  return (
    <div className={`hero-float hero-float--${float.pos}`}>
      {float.avatar && <img className="hero-float-avatar" src={float.avatar} alt="" />}
      {float.avatars && (
        <div className="hero-float-avatars">
          {float.avatars.map((src: string) => (
            <img key={src} src={src} alt="" />
          ))}
        </div>
      )}
      {Icon && (
        <span className="hero-float-icon" style={float.iconBg ? { background: float.iconBg } : undefined}>
          <Icon size={14} />
        </span>
      )}
      <div className="hero-float-body">
        <div className="hero-float-title-row">
          <span className="hero-float-title">{float.title}</span>
          {float.verified && <Check size={11} className="hero-float-verified" />}
        </div>
        {float.amount && <div className="hero-float-amount">{float.amount}</div>}
        <div className="hero-float-sub">{float.sub}</div>
      </div>
      {float.time && <span className="hero-float-time">{float.time}</span>}
    </div>
  );
}

const HeroDashboardPreview = memo(function HeroDashboardPreview() {
  return (
    <div className="hero-product-preview" aria-label="CreatorHub business and creator dashboards">
      <img
        className="hero-dashboard-composite"
        src="/creatorhub-hero-dashboard.png"
        alt="CreatorHub business and creator dashboards"
      />
    </div>
  );
});

function FindCreatorsVisual({ kind, photo }: { kind: string; photo: string }) {
  if (kind === "avatars") {
    return (
      <div className="find-campaign-wrap">
        <div className="find-campaign-card find-campaign-card--back">
          <div className="find-campaign-skeleton">
            <div className="find-skeleton-line" style={{ width: "60%" }} />
            <div className="find-skeleton-line" style={{ width: "40%" }} />
            <div className="find-skeleton-line" style={{ width: "75%" }} />
            <div className="find-skeleton-line" style={{ width: "55%" }} />
          </div>
        </div>
        <div className="find-campaign-card find-campaign-card--front">
          <div className="find-creator-top">
            <img className="find-creator-avatar" src={photo} alt="" />
            <div>
              <div className="find-creator-name">
                Aayusha K. <Check size={11} className="find-creator-verified" />
              </div>
              <div className="find-creator-niche">Food & Lifestyle · Kathmandu</div>
            </div>
            <span className="find-creator-match">98% match</span>
          </div>
          <div className="find-campaign-desc">
            Reels-first creator known for cozy home-baking content and high save rates.
          </div>
          <div className="find-creator-stats">
            <div>
              <strong>24.5K</strong>
              <span>Followers</span>
            </div>
            <div>
              <strong>6.8%</strong>
              <span>Engagement</span>
            </div>
            <div>
              <strong>4.9</strong>
              <span>Rating</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "badge") {
    return (
      <div className="find-campaign-wrap">
        <div className="find-campaign-card find-campaign-card--back">
          <div className="find-campaign-skeleton">
            <div className="find-skeleton-line" style={{ width: "60%" }} />
            <div className="find-skeleton-line" style={{ width: "40%" }} />
            <div className="find-skeleton-line" style={{ width: "75%" }} />
            <div className="find-skeleton-line" style={{ width: "55%" }} />
          </div>
        </div>
        <div className="find-campaign-card find-campaign-card--front">
          <div className="find-campaign-top">
            <span className="find-campaign-paid">
              <Tag size={10} /> paid
            </span>
            <span className="find-campaign-status">Published</span>
          </div>
          <div className="find-campaign-body">
            <div className="find-campaign-copy">
              <div className="find-campaign-title">Sweet Moments with CloudeBakes</div>
              <div className="find-campaign-meta">CloudeBakes · Food · Kathmandu</div>
              <div className="find-campaign-desc">
                We're looking for food and lifestyle creators to showcase our freshly baked treats…
              </div>
            </div>
            <img className="find-campaign-media" src={photo} alt="" />
          </div>
          <div className="find-campaign-footer">
            <span>0 applicants</span>
            <span className="find-campaign-due">Due Sep 17</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="find-campaign-wrap">
      <div className="find-campaign-card find-campaign-card--back">
        <div className="find-campaign-skeleton">
          <div className="find-skeleton-line" style={{ width: "60%" }} />
          <div className="find-skeleton-line" style={{ width: "40%" }} />
          <div className="find-skeleton-line" style={{ width: "75%" }} />
          <div className="find-skeleton-line" style={{ width: "55%" }} />
        </div>
      </div>
      <div className="find-campaign-card find-campaign-card--front">
        <div className="find-campaign-top">
          <span className="find-campaign-paid find-campaign-paid--purple">In progress</span>
          <span className="find-campaign-status">Reel</span>
        </div>
        <div className="find-campaign-body">
          <div className="find-campaign-copy">
            <div className="find-campaign-title">PaperMadePaper × @creator</div>
            <div className="find-campaign-meta">Deliverable: Handmade Paper Reel</div>
            <div className="find-progress-track">
              <div className="find-progress-fill" style={{ width: "65%" }} />
            </div>
          </div>
          <img className="find-campaign-media" src={photo} alt="" />
        </div>
        <div className="find-campaign-footer">
          <span>Rs. 8,000</span>
          <span className="find-campaign-due">Due Sep 20</span>
        </div>
      </div>
    </div>
  );
}

const FindCreatorsSection = memo(function FindCreatorsSection() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % FIND_FEATURES.length);
    }, 5000);
  }

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, []);

  function goTo(i: number) {
    setActive(i);
    startTimer();
  }
  function prev() {
    goTo((active - 1 + FIND_FEATURES.length) % FIND_FEATURES.length);
  }
  function next() {
    goTo((active + 1) % FIND_FEATURES.length);
  }

  const current = FIND_FEATURES[active];
  const BadgeIcon = current.badgeIcon;

  return (
    <section className="ch-section" id="features">
      <div className="find-split" onMouseEnter={stopTimer} onMouseLeave={startTimer}>
        <div className="find-copy">
          <span className="find-dash" />
          <h2 className="find-h2">
            Find the right creators
            <br />
            <span className="find-h2-accent">instantly</span>.
          </h2>
          <p className="find-sub" key={active}>
            {current.desc}
          </p>
          <Link to="/register" className="find-cta">
            Get Started Free <ArrowRight size={16} />
          </Link>
        </div>

        <div className="find-card" key={active}>
          <div className="find-visual-scene">
            <span className="find-blob" />
            <span className="find-scene-dot find-scene-dot--a" />
            <span className="find-scene-dot find-scene-dot--b" />

            <svg className="find-scene-swirl" viewBox="0 0 460 320" aria-hidden="true">
              <path
                d="M 425 6 C 452 22, 458 60, 448 92 C 440 118, 442 140, 452 155 C 460 168, 452 182, 432 180"
                fill="none"
                stroke={FIND_CORAL}
                strokeWidth="2"
                strokeDasharray="1 8"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path d="M 438 174 L 430 181 L 439 187" fill="none" stroke={FIND_CORAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>

            <div className="find-avatar-stack">
              {FIND_AVATAR_PHOTOS.map((src) => (
                <img className="find-avatar-chip" src={src} alt="" key={src} />
              ))}
            </div>

            <div className="find-callout">
              <svg className="find-callout-curl" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 4 C4 14, 14 14, 14 8 C14 4, 9 3, 9 8 C9 12, 15 16, 20 15"
                  fill="none"
                  stroke={FIND_CORAL}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path d="M17 12 L20 15 L16 17" fill="none" stroke={FIND_CORAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{current.title}</span>
            </div>

            <div className="find-visual">
              <FindCreatorsVisual kind={current.visual} photo={current.cardPhoto} />
            </div>

            <div className="find-mini-badge">
              <span className="find-mini-badge-sparkle">
                <Sparkles size={11} />
              </span>
              <BadgeIcon size={14} className="find-mini-badge-icon" />
              {current.badge}
            </div>
          </div>

          <div className="find-nav">
            <button className="find-nav-btn" onClick={prev} aria-label="Previous">
              <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
            <div className="find-dots">
              {FIND_FEATURES.map((f, i) => (
                <button
                  key={f.title}
                  className={`find-dot ${i === active ? "find-dot-active" : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            <button className="find-nav-btn" onClick={next} aria-label="Next">
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

// ============================================
// "DIFFERENT GOALS. SAME PLATFORM." SECTION
// Matches the annotated reference spec exactly:
// full-bleed white wrapper, 1200px content, 48px
// title, 24px card titles, 32px card padding,
// pill/button colors from the spec's palette.
//
// Buttons are pinned to the bottom of each card via
// `margin-top: auto` on .goals-btn (inside a flex
// column), so "Join as a Brand" / "Join as a Creator"
// always align on the same baseline regardless of
// how much copy sits above them.
//
// The photo + its two floating cards are wrapped in
// .goals-photo-frame, a fixed-size relatively
// positioned box, so the floating cards anchor to the
// image itself instead of the wider .goals-visual
// column.
// ============================================

const GoalsSection = memo(function GoalsSection() {
  return (
    <section className="goals-section" id="goals">
      <div className="goals-container">
        <div className="goals-head">
          <span className="find-dash" />
          <h2 className="goals-h2">
            Different goals. <span className="goals-h2-accent">Same platform.</span>
          </h2>
          <p className="goals-sub">
            Whether you're a creator looking for opportunities or a business looking for the
            right creator, creatorhub gives you the tools, support, and opportunities to grow.
          </p>
        </div>

        <div className="goals-grid">
          {/* ===== BRAND CARD (left) ===== */}
          <div className="goals-card goals-card--brand">
            <div className="goals-copy">
              <span className="goals-badge goals-badge--brand">For Brands</span>
              <h3 className="goals-title">
                Find the right creators
                <br />
                for your brand.
              </h3>
              <p className="goals-desc">
                Launch campaigns, discover verified creators, manage collaborations, and track
                results — with less hassle and more impact.
              </p>
              <ul className="goals-list">
                {GOALS_BRAND_POINTS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.text}>
                      <span className="goals-icon-circle goals-icon-circle--brand">
                        <Icon size={13} />
                      </span>
                      {p.text}
                    </li>
                  );
                })}
              </ul>
              <Link to="/register/business" className="goals-btn goals-btn--brand">
                Join as a Brand <ArrowRight size={16} />
              </Link>
            </div>

            <div className="goals-visual">
              <div className="goals-photo-frame">
                <img
                  className="goals-photo"
                  src="/images/business-hero.png"
                  alt="Business team"
                />

                <div className="goals-float-card goals-float-card--top">
                  <img
                    className="goals-float-thumb"
                    src="https://images.unsplash.com/photo-1500835556837-99ac94a94552?q=80&w=100&auto=format&fit=crop"
                    alt=""
                  />
                  <div>
                    <div className="goals-float-title">Campaign Launch</div>
                    <div className="goals-float-meta">Travel Brand</div>
                  </div>
                  <span className="goals-float-status">Active</span>
                </div>
                <div className="goals-float-card goals-float-card--avatars">
                  <span className="goals-stat-label">
                    <Users size={11} /> Top Creator Matches
                  </span>
                  <div className="goals-avatar-row">
                    {FIND_AVATAR_PHOTOS.map((src) => (
                      <img key={src} className="goals-avatar-chip" src={src} alt="" />
                    ))}
                    <Link to="/business" className="goals-view-all">
                      View all <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CREATOR CARD (right) ===== */}
          <div className="goals-card goals-card--creator">
            <div className="goals-copy">
              <span className="goals-badge goals-badge--creator">For Creators</span>
              <h3 className="goals-title">
                Turn your creativity
                <br />
                into opportunities.
              </h3>
              <p className="goals-desc">
                Discover campaigns, showcase your work, collaborate with brands, and get paid —
                all in one place.
              </p>
              <ul className="goals-list">
                {GOALS_CREATOR_POINTS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <li key={p.text}>
                      <span className="goals-icon-circle goals-icon-circle--creator">
                        <Icon size={13} />
                      </span>
                      {p.text}
                    </li>
                  );
                })}
              </ul>
              <Link to="/register/creator" className="goals-btn goals-btn--creator">
                Join as a Creator <ArrowRight size={16} />
              </Link>
            </div>

            <div className="goals-visual">
              <div className="goals-photo-frame">
                <img
                  className="goals-photo"
                  src="/images/creator-hero.png"
                  alt="Creator working"
                />

                <div className="goals-float-card goals-float-card--top">
                  <span className="goals-float-icon goals-float-icon--creator">
                    <Inbox size={12} />
                  </span>
                  <div>
                    <div className="goals-float-title">New Campaign Match!</div>
                    <div className="goals-float-meta">Skincare Brand</div>
                    <div className="goals-float-meta">NPR 15,000 · 2 weeks</div>
                  </div>
                  <ArrowRight size={12} className="goals-float-arrow" />
                </div>
                <div className="goals-float-card goals-float-card--stat">
                  <span className="goals-stat-label">
                    <BarChart3 size={11} /> Your Growth
                  </span>
                  <div className="goals-stat-row">
                    <strong>+12%</strong>
                    <span>More views this month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

const FaqSection = memo(function FaqSection() {
  const [openFaq, setOpenFaq] = useState<{ col: "creator" | "business"; index: number } | null>(null);

  function toggleFaq(col: "creator" | "business", index: number) {
    setOpenFaq((prev) => (prev && prev.col === col && prev.index === index ? null : { col, index }));
  }

  return (
    <section className="ch-section why-section" id="faq">
      <div className="ch-section-head">
        <span className="find-dash" />
        <h2 className="ch-h2 why-h2">
          Everything you need <span className="why-h2-accent">to know</span>
        </h2>
      </div>

      <div className="faq-cols">
        <div>
          <p className="faq-col-label creator">For Creators</p>
          <div className="faq-list">
            {FAQ_CREATOR.map((item, i) => {
              const isOpen = openFaq?.col === "creator" && openFaq.index === i;
              return (
                <div className={`faq-item creator ${isOpen ? "open" : ""}`} key={item.q}>
                  <button className="faq-question" onClick={() => toggleFaq("creator", i)}>
                    <span className="faq-question-text">{item.q}</span>
                    <ChevronDown size={16} className="faq-chevron" />
                  </button>
                  <div className="faq-answer">
                    <p className="faq-answer-inner">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="faq-col-label business">For Brands</p>
          <div className="faq-list">
            {FAQ_BUSINESS.map((item, i) => {
              const isOpen = openFaq?.col === "business" && openFaq.index === i;
              return (
                <div className={`faq-item business ${isOpen ? "open" : ""}`} key={item.q}>
                  <button className="faq-question" onClick={() => toggleFaq("business", i)}>
                    <span className="faq-question-text">{item.q}</span>
                    <ChevronDown size={16} className="faq-chevron" />
                  </button>
                  <div className="faq-answer">
                    <p className="faq-answer-inner">{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});

type OpenMenu = "creator" | "business" | "login" | null;

export function Landing() {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [merged, setMerged] = useState(false);
  const [mergeNoTransition, setMergeNoTransition] = useState(false);
  const mergeRef = useRef<HTMLDivElement | null>(null);
  const mergeRevertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function openMenuNow(name: Exclude<OpenMenu, null>) {
    clearCloseTimer();
    setOpenMenu(name);
  }
  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenMenu(null), 150);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".ch-nav-links") && !target.closest(".ch-nav-menu-wrap")) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scheduleMergeRevert() {
    if (mergeRevertTimeoutRef.current) {
      clearTimeout(mergeRevertTimeoutRef.current);
    }
    mergeRevertTimeoutRef.current = setTimeout(() => {
      setMerged(false);
    }, 8400); // 3.4s icons-to-logo animation + 5s hold on the logo
  }

  useEffect(() => {
    const el = mergeRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMerged(true);
          scheduleMergeRevert();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (mergeRevertTimeoutRef.current) {
        clearTimeout(mergeRevertTimeoutRef.current);
      }
    };
  }, []);

  function replayMerge() {
    setMergeNoTransition(true);
    setMerged(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMergeNoTransition(false);
        setMerged(true);
        scheduleMergeRevert();
      });
    });
  }

  return (
    <div className="ch">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

.ch {
  --midnight: #1E2A78;
  --midnight-light: #4A4F96;
  --midnight-soft: #F2F4FC;
  --orange: #FF6B5A;
  --orange-dark: #F0523F;
  --orange-light: #FF9686;
  --orange-soft: #FFF4F2;
  --purple: #7B2CBF;
  --purple-light: #9D4EDD;
  --purple-soft: #F3E8FF;
  --bg: #F8F9FA;
  --ink: #0D0D0D;
  --ink-soft: #6B7280;
  --line: #e6e6ea;
  --surface: #f7f7f9;
  --good: #16a34a;
  --bad: #E8544E;
  --bad-soft: #FCE8E7;
  font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
  color: var(--ink);
  background:
    radial-gradient(ellipse 1000px 640px at 20% 0%, rgba(10,17,40,0.08), transparent 65%),
    radial-gradient(ellipse 1000px 640px at 85% 5%, rgba(255,109,0,0.10), transparent 65%),
    var(--bg);
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
  overflow-x: hidden;
}
.ch * { box-sizing: border-box; }
.ch a { text-decoration: none; color: inherit; }
.ch button { font-family: inherit; cursor: pointer; }
.ch-logo { font-family: 'League Spartan', sans-serif; font-weight: 600; letter-spacing: 0.03em; }

.ch-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px clamp(24px, 5vw, 72px);
  background: transparent;
  box-shadow: none;
  transition: background 0.2s ease, box-shadow 0.2s ease, backdrop-filter 0.2s ease;
}
.ch-nav-scrolled {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 0 var(--line);
  padding: 10px clamp(24px, 5vw, 72px);
}
.ch-nav-left { display: flex; align-items: center; gap: 48px; position: relative; }
.ch-nav-logo { display: flex; align-items: center; gap: 10px; font-size: 22px; color: var(--ink); }
.ch-nav-links { display: flex; align-items: center; gap: 28px; position: relative; }
.ch-nav-mega-wrap { display: flex; }
.ch-nav-item {
  position: relative; display: flex; align-items: center; gap: 4px;
  font-size: 14px; font-weight: 400; color: var(--ink);
  background: none; border: none; padding: 6px 0;
  transition: opacity 0.15s ease, color 0.15s ease;
}
.ch-nav-item:hover { opacity: 0.6; }
.ch-nav-item-creator:hover { opacity: 1; color: var(--orange); }
.ch-nav-item-business:hover { opacity: 1; color: var(--midnight); }

.ch-chevron { transition: transform 0.15s ease; }

.ch-nav-right { display: flex; align-items: center; gap: 12px; }
.ch-btn-outline {
  font-size: 14px; font-weight: 450; color: var(--ink);
  background: none; border: none; padding: 8px 12px; border-radius: 8px;
  transition: color 0.15s ease;
}
.ch-btn-outline:hover { color: var(--ink-soft); }

.ch-btn-solid {
  font-size: 14px; font-weight: 450;
  background: var(--midnight); border: none; padding: 9px 22px; border-radius: 8px;
  display: inline-flex; align-items: center; gap: 8px;
  transition: background 0.15s ease, transform 0.15s ease;
}
.ch-btn-solid, .ch-btn-solid * { color: #ffffff !important; }
.ch-btn-solid:hover { background: var(--midnight-light); transform: translateY(-1px); }

.ch-burger { display: none; background: none; border: none; padding: 4px; color: var(--ink); font-size: 24px; }

.ch-nav-menu-wrap { position: relative; }

.ch-dropdown {
  position: absolute;
  top: calc(100% + 14px);
  left: 0;
  transform: none;
  width: 520px;
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: 0 32px 64px -18px rgba(17,18,23,0.22), 0 8px 20px rgba(17,18,23,0.07);
  z-index: 60;
  padding: 20px 16px;
}

.ch-dropdown-left { display: flex; flex-direction: column; gap: 4px; width: 100%; }

.ch-drop-item { display: flex; align-items: flex-start; gap: 14px; padding: 12px 14px; border-radius: 10px; transition: background 0.15s ease; }
.ch-drop-item:hover { background: var(--surface); }

.ch-drop-icon { flex-shrink: 0; width: 22px; margin-top: 1px; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); }
.ch-drop-title { display: block; font-size: 15px; font-weight: 500; color: var(--ink); }
.ch-drop-desc { font-size: 13px; color: var(--ink-soft); margin-top: 2px; line-height: 1.4; max-width: 100%; }

.ch-chevron-open { transform: rotate(180deg); }

.ch-login-dropdown {
  position: absolute; top: calc(100% + 4px); right: 0; width: 220px;
  background: #fff; border: 1px solid var(--line); border-radius: 14px;
  box-shadow: 0 24px 48px -16px rgba(17,18,23,0.20), 0 4px 12px rgba(17,18,23,0.06);
  padding: 12px; z-index: 60;
}
.ch-login-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); margin: 2px 6px 8px; }
.ch-login-item { display: flex; align-items: center; gap: 10px; padding: 8px 8px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--ink); transition: background 0.15s ease; }
.ch-login-item:hover { background: var(--surface); }
.ch-login-icon { width: 18px; flex-shrink: 0; color: var(--ink-soft); display: flex; align-items: center; justify-content: center; }

.ch-btn-textarrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 14.5px; font-weight: 500; color: var(--ink);
  background: none; border: none; padding: 8px 2px;
  transition: gap 0.15s ease, color 0.15s ease;
}
.ch-btn-textarrow:hover { gap: 10px; color: var(--ink-soft); }

.ch-btn-hero-link {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 15.5px; font-weight: 600; color: var(--ink);
  background: none; border: none; padding: 11px 4px;
  position: relative; transition: color 0.2s ease, gap 0.2s ease;
}
.ch-btn-hero-link::after {
  content: ''; position: absolute; left: 4px; right: 4px; bottom: 4px; height: 2px;
  background: var(--midnight); transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease;
}
.ch-btn-hero-link:hover { color: var(--midnight); gap: 12px; }
.ch-btn-hero-link:hover::after { transform: scaleX(1); }
.ch-btn-hero-link svg { transition: transform 0.25s ease; }
.ch-btn-hero-link:hover svg { transform: translateX(3px); }

.ch-hero {
  position: relative;
  max-width: 1480px;
  margin: 0 auto;
  padding: 72px clamp(28px, 5vw, 76px) 52px;
  overflow: hidden;
}

.ch-hero-copy {
  position: relative;
  z-index: 5;
  max-width: 560px;
  margin: 70px 0 0;
  text-align: left;
}

.ch-h1 {
  font-family: 'League Spartan', sans-serif;
  font-size: clamp(52px, 5.5vw, 78px);
  font-weight: 700;
  line-height: .98;
  letter-spacing: -0.045em;
  margin: 18px 0 0;
  color: var(--midnight);
}

.ch-h1-accent-violet {
  color: var(--midnight);
}

.ch-h1-accent-coral {
  color: var(--orange);
}

.ch-h1-swash {
  display: block;
  margin: 0;
  width: 220px;
  max-width: 100%;
}

.ch-sub {
  font-size: 17px;
  line-height: 1.65;
  color: var(--ink-soft);
  margin: 24px 0 0;
  font-weight: 400;
  max-width: 500px;
}

.ch-hero-ctas {
  display: flex;
  gap: 14px;
  margin-top: 32px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.ch-btn-hero-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  height: 44px;
  padding: 0 22px;

  background: #2E3278;
  color: #FFFFFF !important;

  border: none;
  border-radius: 999px;

  font-size: 14px;
  font-weight: 700;
  text-decoration: none !important;

  box-shadow: 0 8px 20px rgba(46, 50, 120, 0.18);

  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.ch-btn-hero-link:hover,
.ch-btn-hero-link:focus,
.ch-btn-hero-link:active {
  color: #FFFFFF !important;
  text-decoration: none !important;
  background: #2E3278;
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(46, 50, 120, 0.24);
}


.ch-btn-hero-link:hover {
  text-decoration: none !important;
}

.ch-btn-hero-link svg {
  color: #FFFFFF !important;
  stroke: #FFFFFF !important;
}

.ch-btn-ghost-play {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--midnight);
  background: #fff;
  border: 1.5px solid rgba(30,42,120,.35);
  padding: 13px 22px;
  border-radius: 9px;
  transition: border-color .15s ease, transform .18s ease;
}

.ch-btn-ghost-play:hover {
  border-color: var(--midnight);
  transform: translateY(-2px);
}

/* ===== Real dashboard showcase ===== */
.hero-product-preview {
  position: absolute;
  z-index: 2;
  top: 35px;
  right: -4%;
  width: 78%;
  max-width: 1100px;
  pointer-events: none;
}

.hero-dashboard-composite {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.hero-product-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(1px);
}

.hero-product-blob--blue {
  width: 570px;
  height: 570px;
  left: 3%;
  top: 45px;
  background: radial-gradient(circle, rgba(30,42,120,.13), transparent 68%);
}

.hero-product-blob--coral {
  width: 520px;
  height: 520px;
  right: 0;
  top: 80px;
  background: radial-gradient(circle, rgba(255,107,90,.14), transparent 68%);
}

.hero-dashboard-shot {
  position: absolute;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(225,226,235,.95);
  border-radius: 18px;
  box-shadow: 0 30px 65px rgba(24,30,75,.14), 0 8px 25px rgba(24,30,75,.08);
}

.hero-dashboard-shot img {
  display: block;
  width: 100%;
  height: auto;
}

.hero-dashboard-shot--business {
  left: 0;
  top: 95px;
  width: 66%;
  transform: rotate(-1.5deg);
  z-index: 3;
}

.hero-dashboard-shot--creator {
  right: 0;
  top: 150px;
  width: 53%;
  transform: rotate(1.2deg);
  z-index: 2;
  box-shadow: 0 28px 55px rgba(24,30,75,.12), 0 7px 22px rgba(24,30,75,.07);
}

.hero-product-float {
  position: absolute;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 215px;
  padding: 10px 13px;
  background: rgba(255,255,255,.97);
  border: 1px solid rgba(225,226,235,.9);
  border-radius: 12px;
  box-shadow: 0 18px 38px rgba(20,25,55,.12);
  transform: rotate(-2deg);
}

.hero-product-float--top {
  left: 8%;
  top: 24px;
}

.hero-product-float--right {
  right: -1%;
  top: 72px;
  transform: rotate(2deg);
}

.hero-product-float--bottom {
  right: 7%;
  bottom: 42px;
  transform: rotate(-2deg);
}

.hero-product-float-avatar {
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 800;
}

.hero-product-float-avatar--blue {
  color: var(--midnight);
  background: var(--midnight-soft);
}

.hero-product-float-avatar--coral {
  color: var(--orange);
  background: var(--orange-soft);
}

.hero-product-float-avatar--green {
  color: #18a957;
  background: #e9f9ef;
}

.hero-product-float strong,
.hero-product-float span {
  display: block;
}

.hero-product-float strong {
  color: var(--ink);
  font-size: 10px;
  white-space: nowrap;
}

.hero-product-float span {
  margin-top: 2px;
  color: var(--ink-soft);
  font-size: 8px;
  white-space: nowrap;
}

.hero-product-float small {
  margin-left: auto;
  align-self: flex-start;
  color: #9a9eaa;
  font-size: 7px;
  white-space: nowrap;
}

.ch-marquee { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); overflow: hidden; padding: 22px 0; background: var(--surface); margin-top: 60px; }
.ch-marquee-track { display: flex; width: max-content; gap: 44px; animation: ch-scroll 28s linear infinite; }
@keyframes ch-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.ch-chip { font-family: 'League Spartan', sans-serif; font-weight: 600; font-size: 14.5px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink-soft); white-space: nowrap; display: flex; align-items: center; }
.ch-chip::after { content: '·'; margin-left: 44px; color: var(--line); font-style: normal; }

.ch-section { padding: 80px clamp(24px, 5vw, 72px); max-width: 1120px; margin: 0 auto; position: relative; }
.ch-section + .ch-section:not(.why-section)::before {
  content: ''; position: absolute; top: 0; left: 50%; right: 50%;
  margin-left: -50vw; margin-right: -50vw; border-top: 1px solid rgba(17,18,23,0.07);
}

/* Full-bleed section matching the Goals section's framing (Why We Exist, FAQ) */
.why-section {
  max-width: 100%;
  width: 100%;
  padding: 64px 0;
  border-top: 1px solid rgba(17,18,23,0.07);
  border-bottom: 1px solid rgba(17,18,23,0.07);
}
.why-section .ch-section-head,
.why-section .compare-row,
.why-section .faq-cols {
  max-width: 1120px;
  margin-left: auto;
  margin-right: auto;
  padding-left: clamp(24px, 5vw, 72px);
  padding-right: clamp(24px, 5vw, 72px);
}
.why-section + .why-section { border-top: none; }
.ch-section-head { max-width: 520px; margin-bottom: 56px; }
.ch-kicker { font-size: 18px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink-soft); }
.ch-h2 { font-family: 'League Spartan', sans-serif; font-weight: 700; font-size: clamp(28px, 3.6vw, 36px); letter-spacing: -0.01em; margin: 12px 0 0; color: var(--ink); }
.why-h2 { color: var(--midnight) !important; }
.why-h2-accent { color: var(--orange) !important; }
.merge-h2 { font-size: clamp(34px, 4.4vw, 46px); color: var(--midnight); }

/* ===== Find the right creators instantly ===== */
.find-split { display: grid; grid-template-columns: 0.85fr 1fr; gap: 64px; align-items: center; }
.find-copy { max-width: 420px; }
.find-dash { display: block; width: 40px; height: 4px; border-radius: 2px; background: #FF6B5A; margin-bottom: 18px; }
.find-h2 {
  font-family: 'League Spartan', sans-serif; font-weight: 800; font-size: clamp(32px, 4vw, 42px);
  line-height: 1.15; letter-spacing: -0.01em; margin: 0; color: #1E2A78;
}
.find-h2-accent { color: #FF6B5A; }
.find-sub { font-size: 15px; line-height: 1.65; color: var(--ink-soft); margin: 18px 0 0; max-width: 400px; animation: find-sub-fade 0.4s ease; }
@keyframes find-sub-fade { from { opacity: 0; } to { opacity: 1; } }
.find-cta {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 28px;
  background: #FF6B5A; color: #fff !important; font-size: 14.5px; font-weight: 600;
  padding: 13px 26px; border-radius: 999px; border: none;
  box-shadow: 0 14px 26px -12px rgba(255,107,90,0.55);
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.find-cta:hover { background: #F0523F; transform: translateY(-1px); box-shadow: 0 16px 30px -12px rgba(255,107,90,0.6); }
.find-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 24px; }
.find-nav-btn {
  width: 38px; height: 38px; border-radius: 50%; background: #fff; border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center; color: var(--ink); flex-shrink: 0;
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.find-nav-btn:hover { border-color: var(--midnight); color: var(--midnight); transform: translateY(-2px); }
.find-dots { display: flex; align-items: center; gap: 7px; }
.find-dot { width: 8px; height: 8px; border-radius: 999px; padding: 0; border: none; background: var(--line); transition: width 0.25s ease, background 0.25s ease; }
.find-dot:hover { background: var(--ink-soft); }
.find-dot-active { width: 24px; background: var(--midnight); }
.find-dot-active:hover { background: var(--midnight); }

.find-card { animation: find-zoom-in 0.4s ease; }
@keyframes find-zoom-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.find-visual-scene { position: relative; padding: 56px 40px 40px 20px; }
.find-blob {
  position: absolute; top: 30px; left: -6px; right: -6px; bottom: 4px;
  background: #F2F4FC; border-radius: 62% 38% 55% 45% / 44% 48% 52% 56%; z-index: 0;
}
.find-scene-dot { position: absolute; border-radius: 50%; background: #FF6B5A; opacity: 0.7; z-index: 1; }
.find-scene-dot--a { width: 9px; height: 9px; top: 12px; left: 34px; }
.find-scene-dot--b { width: 12px; height: 12px; bottom: 46px; left: -2px; opacity: 0.55; }
.find-scene-swirl { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.find-avatar-stack { position: absolute; top: 2px; right: 6px; display: flex; flex-direction: column; align-items: center; gap: 10px; z-index: 2; }
.find-avatar-chip { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2.5px solid #fff; box-shadow: 0 6px 14px -6px rgba(17,18,23,0.35); }
.find-callout {
  position: absolute; top: 8px; right: 84px; max-width: 116px; display: flex; align-items: flex-start; gap: 5px;
  font-size: 12px; font-weight: 600; font-style: italic; line-height: 1.35; color: #1E2A78;
  text-align: right; z-index: 2; transform: rotate(-4deg); transform-origin: right top;
}
.find-callout-curl { flex-shrink: 0; margin-top: 2px; transform: scaleX(-1); }
.find-mini-badge {
  position: absolute; left: 4px; bottom: 68px; display: inline-flex; align-items: center; gap: 7px;
  background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 10px 16px;
  font-size: 12.5px; font-weight: 700; color: var(--ink); box-shadow: 0 16px 28px -14px rgba(17,18,23,0.28); z-index: 2; white-space: nowrap;
}
.find-mini-badge-sparkle { position: absolute; top: -13px; left: -11px; color: #FF6B5A; transform: rotate(-14deg); }
.find-mini-badge-icon { color: #FF6B5A; flex-shrink: 0; }

.find-visual {
  background: #fff; border: 1px solid var(--line); border-radius: 16px; height: 236px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 18px; padding: 24px;
  position: relative; overflow: hidden; z-index: 1;
}
.find-visual:hover .find-campaign-card--front { transform: translateY(-6px); box-shadow: 0 22px 36px -14px rgba(17,18,23,0.24); }
.find-visual:hover .find-campaign-card--back { transform: rotate(6deg) translateY(4px); }

.find-creator-top { display: flex; align-items: flex-start; gap: 9px; margin-bottom: 10px; }
.find-creator-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
.find-creator-name { font-size: 12px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 4px; }
.find-creator-verified { color: var(--good); flex-shrink: 0; }
.find-creator-niche { font-size: 9px; color: var(--ink-soft); margin-top: 2px; }
.find-creator-match {
  margin-left: auto; font-size: 8.5px; font-weight: 700; white-space: nowrap;
  background: var(--orange-soft); color: var(--orange-dark); border-radius: 999px; padding: 3px 7px;
}
.find-creator-stats { display: flex; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 9px; margin-top: auto; }
.find-creator-stats > div { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.find-creator-stats strong { font-size: 11.5px; color: var(--ink); }
.find-creator-stats span { font-size: 8px; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.03em; }

.find-campaign-paid--purple { background: var(--midnight-soft); color: var(--midnight); }
.find-progress-track { height: 5px; border-radius: 999px; background: var(--surface); margin: 8px 0 10px; overflow: hidden; }
.find-progress-fill { height: 100%; border-radius: 999px; background: var(--midnight); }

.find-campaign-wrap { position: relative; width: 100%; height: 100%; }
.find-campaign-card { position: absolute; background: #fff; border: 1px solid var(--line); border-radius: 12px; transition: transform 0.3s ease, box-shadow 0.3s ease; }
.find-campaign-card--back { top: 14px; left: 24px; right: 4px; bottom: 4px; padding: 16px 14px; transform: rotate(3deg); box-shadow: 0 10px 20px -10px rgba(17,18,23,0.12); }
.find-campaign-skeleton { display: flex; flex-direction: column; gap: 9px; }
.find-skeleton-line { height: 6px; border-radius: 4px; background: var(--surface); border: 1px solid var(--line); }
.find-campaign-card--front { top: 4px; left: 4px; right: 24px; bottom: 14px; padding: 12px 14px; box-shadow: 0 16px 28px -12px rgba(17,18,23,0.18); display: flex; flex-direction: column; }
.find-campaign-body { display: flex; gap: 10px; flex: 1; }
.find-campaign-copy { flex: 1; min-width: 0; }
.find-campaign-media { width: 54px; height: 54px; border-radius: 10px; flex-shrink: 0; object-fit: cover; box-shadow: 0 6px 14px -8px rgba(17,18,23,0.3); }
.find-campaign-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.find-campaign-paid { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 700; background: var(--orange-soft); color: var(--orange-dark); border-radius: 999px; padding: 3px 8px; }
.find-campaign-status { font-size: 9px; font-weight: 600; background: var(--surface); color: var(--ink-soft); border-radius: 999px; padding: 3px 8px; }
.find-campaign-title { font-size: 12.5px; font-weight: 700; line-height: 1.3; color: var(--ink); margin-bottom: 5px; }
.find-campaign-meta { font-size: 9.5px; color: var(--ink-soft); margin-bottom: 6px; }
.find-campaign-desc { font-size: 9.5px; color: var(--ink-soft); line-height: 1.45; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.find-campaign-footer { display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: var(--ink-soft); border-top: 1px solid var(--line); padding-top: 7px; margin-top: auto; }
.find-campaign-due { color: var(--midnight); font-weight: 600; }

/* ===== Different goals. Same platform. ===== */
.goals-section { width: 100%; background: transparent; padding: 64px 0; border-top: 1px solid rgba(17,18,23,0.07); border-bottom: 1px solid rgba(17,18,23,0.07); }.goals-container { max-width: 1120px; margin: 0 auto; padding: 0 clamp(24px, 5vw, 72px); }
.goals-head { text-align: left; margin: 0 0 44px; max-width: 700px; }
.goals-h2 { font-family: 'League Spartan', sans-serif; font-size: clamp(28px, 3.6vw, 36px); font-weight: 700; line-height: 1.2; color: #1E2A78; margin: 0 0 12px; }
.goals-h2-accent { color: #FF6B5A; }
.goals-sub { font-size: 16px; line-height: 1.6; color: #64748B; max-width: 700px; margin: 0; }



.goals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; position: relative; }
.goals-grid::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1.5px dashed var(--line);
}

.goals-card {
  display: grid; grid-template-columns: minmax(0, 52%) minmax(0, 48%); gap: 0; padding: 0; border-radius: 20px;
  min-height: 500px; overflow: hidden; align-items: stretch; border: 1px solid transparent;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.goals-card:hover { box-shadow: 0 20px 40px -16px rgba(17,18,23,0.12); }
.goals-card--creator { background: transparent; border-color: transparent; }
.goals-card--brand { background: transparent; border-color: transparent; }

.goals-copy { padding: 30px 26px 30px 32px; display: flex; flex-direction: column; height: 100%; justify-content: flex-start; gap: 4px; }

.goals-badge {
  display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 6px 12px; border-radius: 999px; margin-bottom: 16px; align-self: flex-start;
}
.goals-badge--creator { background: #FFE8E5; color: #FF6B5A; }
.goals-badge--brand { background: #E2E8FF; color: #2B2F6B; }

.goals-title { font-family: 'Inter', 'League Spartan', sans-serif; font-size: 23px; font-weight: 700; line-height: 1.3; color: #1E2A78; margin: 0 0 12px; }
.goals-desc { font-size: 14px; line-height: 1.65; color: #64748B; margin: 0 0 20px; max-width: 100%; }

.goals-list { list-style: none; margin: 0 0 22px; padding: 0; display: flex; flex-direction: column; gap: 13px; }
.goals-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: #1E293B; line-height: 1.5; }
.goals-icon-circle { width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.goals-icon-circle--creator { background: #FFE8E5; color: #FF6B5A; }
.goals-icon-circle--brand { background: #E2E8FF; color: #2B2F6B; }

/* Button pinned to the bottom of the flex column so both
   "Join as a Brand" / "Join as a Creator" buttons sit on
   the same baseline regardless of copy length above them. */
.goals-btn {
  display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 600;
  color: #FFFFFF !important; padding: 11px 22px; border-radius: 999px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  border: none; cursor: pointer; align-self: flex-start; text-decoration: none !important;
  white-space: nowrap; flex-shrink: 0;
  margin-top: auto;
}
.goals-btn--creator { background: #FF6B5A; box-shadow: 0 12px 20px -10px rgba(255,107,90,0.35); }
.goals-btn--creator:hover { background: #F0523F; transform: translateY(-2px); }
.goals-btn--brand { background: #2B2F6B; box-shadow: 0 12px 20px -10px rgba(43,47,107,0.35); }
.goals-btn--brand:hover { background: #232561; transform: translateY(-2px); }

/* ---- Visual side: photo + floating UI ---- */
.goals-visual { position: relative; height: 100%; overflow: visible; display: flex; align-items: center; justify-content: center; }
.goals-blob { position: absolute; width: 230px; height: 260px; background: #FFE0DA; border-radius: 58% 42% 55% 45% / 45% 48% 52% 55%; z-index: 0; }
.goals-blob--brand { background: #DCE3FF; }

/* Fixed-size frame the photo AND its floating cards live in,
   so the floating cards anchor to the image itself instead of
   the wider .goals-visual column. */
.goals-photo-frame {
  position: relative;
  width: 280px;
  height: 280px;
  flex-shrink: 0;
  z-index: 3;
}

.goals-photo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.goals-float-card {
  position: absolute; background: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transition: transform 0.3s ease; padding: 8px 12px; display: flex; align-items: center; gap: 8px; z-index: 2; max-width: 180px;
}

.goals-card:hover .goals-float-card--top { transform: translateY(-6px); }
.goals-card:hover .goals-float-card--stat,
.goals-card:hover .goals-float-card--avatars { transform: translateY(6px); }

/* Anchored to the photo frame's own corners, so they hug the
   image regardless of how wide .goals-visual is. */
.goals-photo-frame .goals-float-card--top {
  top: -40px;
  right: 16px;
}
.goals-photo-frame .goals-float-card--stat,
.goals-photo-frame .goals-float-card--avatars {
  bottom: 16px;
  left: -24px;
}

.goals-float-icon { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.goals-float-icon--creator { background: #FFF4F2; color: #FF6B5A; }
.goals-float-title { font-size: 12px; font-weight: 700; color: #1E293B; line-height: 1.2; }
.goals-float-meta { font-size: 10px; color: #64748B; line-height: 1.3; }
.goals-float-arrow { color: #64748B; flex-shrink: 0; }
.goals-float-thumb { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.goals-float-status { margin-left: auto; font-size: 9px; font-weight: 700; background: #E1F6EA; color: #16a34a; padding: 2px 8px; border-radius: 999px; }
.goals-stat-label { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #64748B; }
.goals-stat-row { display: flex; align-items: baseline; gap: 6px; }
.goals-stat-row strong { font-size: 15px; color: #FF6B5A; font-weight: 800; }
.goals-stat-row span { font-size: 10px; color: #64748B; }

.goals-float-card--stat { flex-direction: column; align-items: flex-start; gap: 4px; padding: 8px 12px; }
.goals-float-card--avatars { flex-direction: column; align-items: flex-start; gap: 6px; padding: 8px 12px; }
.goals-avatar-row { display: flex; align-items: center; }
.goals-avatar-chip { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 2px solid #FFFFFF; margin-left: -6px; }
.goals-avatar-chip:first-child { margin-left: 0; }
.goals-view-all { margin-left: 8px; font-size: 10px; font-weight: 600; color: #1E2A78; display: inline-flex; align-items: center; gap: 2px; }

.goals-tagline {
  display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 40px;
  font-family: 'League Spartan', sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.01em; color: #1E2A78;
}
.goals-tagline-dash { width: 46px; height: 2px; background: #E5E7EB; }

/* ===== FAQ ===== */
.faq-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; position: relative; }
.faq-cols::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 1.5px dashed var(--line); }
.faq-col-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 16px; }
.faq-col-label.creator { color: var(--orange); }
.faq-col-label.business { color: var(--midnight); }

.faq-list { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 4px 20px; }
.faq-item { border-bottom: 1px solid var(--line); padding: 16px 0; }
.faq-item:last-child { border-bottom: none; }

.faq-question { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; background: none; border: none; text-align: left; font-size: 14px; font-weight: 500; color: var(--ink); padding: 0; transition: color 0.2s ease; }
.faq-question-text { text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; transition: text-decoration-color 0.2s ease; }
.faq-question:hover .faq-question-text { text-decoration-color: currentColor; }
.faq-item.open.creator .faq-question { color: var(--orange); font-weight: 600; padding-bottom: 12px; border-bottom: 1.5px solid var(--orange); margin-bottom: 4px; }
.faq-item.open.business .faq-question { color: var(--midnight); font-weight: 600; padding-bottom: 12px; border-bottom: 1.5px solid var(--midnight); margin-bottom: 4px; }

.faq-chevron { flex-shrink: 0; transition: transform 0.25s ease; color: var(--ink-soft); }
.faq-item.open .faq-chevron { transform: rotate(180deg); }
.faq-item.open.creator .faq-chevron { color: var(--orange); }
.faq-item.open.business .faq-chevron { color: var(--midnight); }

.faq-answer { overflow: hidden; max-height: 0; transition: max-height 0.3s ease; }
.faq-item.open .faq-answer { max-height: 200px; }
.faq-answer-inner { font-size: 13.5px; color: var(--ink-soft); line-height: 1.6; padding-top: 4px; }

/* ===== Merge / Tool Replace ===== */
.merge-card { display: grid; grid-template-columns: 1fr 1.15fr; align-items: stretch; gap: 40px; }
.merge-copy { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
.merge-sub { font-size: 14.5px; line-height: 1.7; color: var(--ink-soft); margin: 18px 0 28px; max-width: 380px; }
.merge-cta {
  display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; background: none; border: none;
  padding: 11px 4px; font-size: 15.5px; font-weight: 600; color: var(--ink); position: relative;
  transition: gap 0.2s ease, color 0.2s ease;
}
.merge-cta::after { content: ''; position: absolute; left: 4px; right: 4px; bottom: 4px; height: 2px; background: var(--midnight); transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease; }
.merge-cta:hover { gap: 12px; color: var(--midnight); }
.merge-cta:hover::after { transform: scaleX(1); }
.merge-cta svg { transition: transform 0.25s ease; }
.merge-cta:hover svg { transform: translateX(3px); }

.merge-visual { position: relative; min-height: 460px; display: flex; align-items: center; justify-content: center; overflow: hidden; }

.icon-collage { position: relative; width: 460px; height: 460px; flex-shrink: 0; z-index: 1; }
.merge-icon {
  position: absolute; transform: translate(-50%, -50%); width: 52px; height: 52px; border-radius: 14px;
  background: #fff; border: 1px solid var(--line); box-shadow: 0 10px 22px -12px rgba(17,18,23,0.18);
  display: flex; align-items: center; justify-content: center; color: var(--ink-soft); opacity: 1;
  transition: color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.merge-icon-navy { background: var(--midnight); border-color: var(--midnight); color: #fff; box-shadow: 0 14px 26px -12px rgba(10,17,40,0.45); }
.merge-icon-orange { background: var(--orange); border-color: var(--orange); color: #fff; box-shadow: 0 14px 26px -12px rgba(255,109,0,0.45); }
.merge-icon:hover { color: var(--orange); animation-play-state: paused; transform: translate(-50%, -50%) translateY(-3px); box-shadow: 0 14px 26px -12px rgba(255,109,0,0.35); }
.merge-icon-navy:hover, .merge-icon-orange:hover { color: #fff; }
@keyframes icon-converge {
  0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
  40%  { transform: translate(-50%, -50%) translate(calc(var(--dx) * 0.4), calc(var(--dy) * 0.4)) scale(1.08); opacity: 1; }
  58%  { transform: translate(-50%, -50%) translate(calc(var(--dx) * 0.4), calc(var(--dy) * 0.4)) scale(1.08); opacity: 1; }
  88%  { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.5); opacity: 1; }
  100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.1); opacity: 0; }
}
.icon-collage.in-view .merge-icon { animation: icon-converge 3s cubic-bezier(0.45,0,0.3,1) forwards; }
.icon-collage.no-transition .merge-icon { animation: none; }
.merge-logo {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.3); opacity: 0;
  display: flex; align-items: center; gap: 10px; background: #fff; padding: 14px 22px; border-radius: 16px;
  border: 1px solid var(--line); box-shadow: 0 16px 28px -12px rgba(17,18,23,0.18); z-index: 2;
}
@keyframes logo-pop {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
  65% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
.icon-collage.in-view .merge-logo { animation: logo-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 2.9s both; }
.icon-collage.no-transition .merge-icon, .icon-collage.no-transition .merge-logo { animation: none !important; transition: none !important; }
.merge-logo-text { font-family: 'League Spartan', sans-serif; font-weight: 600; font-size: 22px; color: var(--ink); }

/* ===== Compare ===== */
.compare-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; gap: 0; max-width: 980px; margin: 0 auto; }
.compare-card { background: #fff; border: 1px solid var(--line); border-top: 3px solid transparent; border-radius: 16px; padding: 30px 32px; }
.compare-before { border-top-color: var(--bad); }
.compare-after { border-top-color: var(--good); }
.compare-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; display: block; margin-bottom: 20px; }
.compare-label-before { color: var(--bad); }
.compare-label-after { color: var(--good); }
.compare-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.compare-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: var(--ink); line-height: 1.55; }
.compare-icon { width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
.compare-icon-before { background: var(--bad-soft); color: var(--bad); }
.compare-icon-after { background: #E1F6EA; color: var(--good); }
.compare-divider { position: relative; display: flex; align-items: center; justify-content: center; padding: 0 28px; }
.compare-divider::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 1.5px dashed var(--line); }
.compare-vs {
  position: relative; z-index: 1; width: 42px; height: 42px; border-radius: 50%; background: #fff; border: 1px solid var(--line);
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--bad);
}

/* ===== How It Works ===== */
.hiw-row { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 20px; }
.hiw-line { position: absolute; top: 32px; left: 64px; right: 64px; height: 2px; background: repeating-linear-gradient(to right, var(--orange) 0px, var(--orange) 8px, transparent 8px, transparent 16px); opacity: 0.55; z-index: 0; border-top: none; }
.hiw-step { position: relative; z-index: 1; text-align: center; padding: 0 8px; }
.hiw-icon-box {
  width: 64px; height: 64px; border-radius: 18px; background: var(--orange-soft); color: var(--orange);
  display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, color 0.25s ease;
}
.hiw-step:hover .hiw-icon-box { transform: translateY(-5px) scale(1.06); background: var(--orange); color: #fff; box-shadow: 0 16px 28px -12px rgba(255,109,0,0.55); }
.hiw-step-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 10px; }
.hiw-title { font-size: 16px; font-weight: 700; color: var(--ink); margin: 0 0 6px; }
.hiw-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.6; margin: 0; }

/* ===== Footer ===== */
.ch-footer { border-top: 1px solid var(--line); padding: 56px clamp(24px, 5vw, 72px) 36px; background: var(--surface); }
.ch-footer-top { display: flex; justify-content: space-between; align-items: flex-start; max-width: 1120px; margin: 0 auto; flex-wrap: wrap; gap: 40px; }
.ch-footer-brand { max-width: 260px; }
.ch-footer-brand-row { display: flex; align-items: center; gap: 9px; }
.ch-footer-tag { font-size: 13.5px; color: var(--ink-soft); margin-top: 14px; line-height: 1.65; }
.ch-footer-cols { display: flex; gap: 72px; flex-wrap: wrap; }
.ch-footer-col h4 { font-size: 12.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-soft); margin: 0 0 18px; }
.ch-footer-col a { display: block; font-size: 14px; color: var(--ink); margin-bottom: 13px; transition: opacity 0.15s ease; }
.ch-footer-col a:hover { opacity: 0.6; }
.ch-footer-bottom { max-width: 1120px; margin: 48px auto 0; padding-top: 28px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-soft); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }

/* ===== Responsive ===== */
@media (max-width: 1100px) { .ch-dropdown { width: 440px; } }
@media (max-width: 900px) {
  .hiw-row { grid-template-columns: repeat(2, 1fr); row-gap: 32px; }
  .hiw-line { display: none; }
  .merge-card { grid-template-columns: 1fr; gap: 32px; }
  .merge-sub { max-width: 420px; }
  .merge-visual { min-height: 380px; }
  .icon-collage { transform: scale(0.75); }
  .compare-row { grid-template-columns: 1fr; gap: 20px; }
  .compare-divider { padding: 0; }
  .compare-divider::before { display: none; }
  .ch-dropdown { width: 360px; left: 0; transform: none; }
  .faq-cols { grid-template-columns: 1fr; gap: 32px; }
  .find-split { grid-template-columns: 1fr; gap: 32px; }
  .find-copy { max-width: 100%; }
  .faq-cols::before { display: none; }

  .hero-frame { grid-template-columns: 1fr; }
  .hero-frame-sidebar { display: none; }
  .hero-frame-body { grid-template-columns: 1fr; }
  .hero-float { display: none; }

  .goals-h2 { font-size: 36px; }
    .goals-card--brand .goals-copy { order: 2; }
  .goals-card--brand .goals-visual { order: 1; }
  .goals-grid { grid-template-columns: 1fr; gap: 16px; }
  .goals-grid::before { display: none; }
  .goals-card { grid-template-columns: 1fr; height: auto; min-height: 0; padding: 0; }
  .goals-copy { padding: 24px 24px 20px; height: auto; justify-content: flex-start; }
  .goals-copy .goals-btn { margin-top: 8px; }
  .goals-visual { height: 220px; }
  .goals-blob { width: 180px; height: 200px; }
  .goals-photo-frame { width: 150px; height: 190px; }
  .goals-photo { width: 100%; height: 100%; }
}
@media (max-width: 860px) {
  .ch-nav-links, .ch-nav-right .ch-btn-outline { display: none; }
  .ch-burger { display: block; }
  .ch-mobile-panel { position: fixed; inset: 78px 0 0 0; background: #fff; z-index: 55; padding: 28px 24px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
  .ch-mobile-panel a, .ch-mobile-panel button { font-size: 16px; font-weight: 500; padding: 18px 4px; border-bottom: 1px solid var(--line); text-align: left; background: none; border-left: none; border-right: none; border-top: none; color: var(--ink); }
}
@media (max-width: 560px) {
  .hiw-row { grid-template-columns: 1fr; }
  .ch-dropdown { width: 300px; padding: 16px 12px; }
  .ch-drop-item { padding: 10px 12px; }
  .icon-collage { transform: scale(0.55); }
  .find-mini-badge { left: -8px; font-size: 11px; padding: 7px 11px; }
  .find-callout { max-width: 120px; font-size: 11px; }
  .goals-h2 { font-size: 30px; }
  .goals-container { padding: 0 16px; }
  .goals-float-card { display: none; }
  .goals-tagline { font-size: 14px; gap: 10px; }
  .goals-tagline-dash { width: 20px; }
}

/* ===== Hero showcase responsive overrides ===== */
@media (max-width: 1100px) {
  .ch-hero { padding-top: 52px; }
  .ch-hero-copy { margin-top: 35px; max-width: 500px; }
  .ch-h1 { font-size: clamp(48px, 6vw, 66px); }
  .hero-product-preview { right: -12%; width: 67%; }
  .hero-dashboard-shot--business { top: 115px; width: 70%; }
  .hero-dashboard-shot--creator { top: 185px; width: 56%; }
  .hero-product-float { min-width: 185px; }
}

@media (max-width: 900px) {
  .ch-hero {
    padding: 48px 24px 20px;
    min-height: 0;
  }
  .ch-hero-copy {
    max-width: 700px;
  }
  .ch-h1 { font-size: clamp(48px, 8vw, 64px); }
  .hero-product-preview {
    position: relative;
    top: auto;
    right: auto;
    width: 100%;
    height: 470px;
    margin: 25px auto 0;
    max-width: 760px;
  }
  .hero-dashboard-shot--business { left: 2%; top: 70px; width: 70%; }
  .hero-dashboard-shot--creator { right: 2%; top: 125px; width: 56%; }
  .hero-product-float--top { left: 7%; top: 8px; }
  .hero-product-float--right { right: 0; top: 45px; }
  .hero-product-float--bottom { right: 6%; bottom: 20px; }
}

@media (max-width: 560px) {
  .ch-hero { padding: 36px 18px 10px; }
  .ch-h1 { font-size: 43px; }
  .ch-sub { font-size: 15px; }
  .ch-hero-ctas { gap: 9px; }
  .ch-btn-hero-link,
  .ch-btn-ghost-play { padding: 11px 15px; font-size: 13px; }
  .hero-product-preview { height: 330px; }
  .hero-dashboard-shot--business { left: 0; top: 50px; width: 82%; }
  .hero-dashboard-shot--creator { right: 0; top: 95px; width: 62%; }
  .hero-product-float { min-width: 145px; padding: 7px 9px; gap: 6px; }
  .hero-product-float-avatar { width: 25px; height: 25px; flex-basis: 25px; font-size: 11px; }
  .hero-product-float strong { font-size: 8px; }
  .hero-product-float span { font-size: 6.5px; }
  .hero-product-float small { display: none; }
  .hero-product-float--top { left: 2%; top: 8px; }
  .hero-product-float--right { right: 0; top: 30px; }
  .hero-product-float--bottom { right: 2%; bottom: 6px; }
}

      `}</style>

      {/* ===== NAVBAR ===== */}
      <nav className={`ch-nav ${scrolled ? "ch-nav-scrolled" : ""}`}>
        <div className="ch-nav-left">
          <a href="#top" className="ch-nav-logo ch-logo">
            <LogoMark size={28} /> creatorhub
          </a>
          <div className="ch-nav-links" onMouseEnter={clearCloseTimer} onMouseLeave={scheduleClose}>
            <div className="ch-nav-mega-wrap" onMouseEnter={() => openMenuNow("creator")}>
              <button
                className="ch-nav-item ch-nav-item-creator"
                aria-expanded={openMenu === "creator"}
                onClick={() => setOpenMenu((v) => (v === "creator" ? null : "creator"))}
              >
                For Creators <ChevronDown size={14} className={`ch-chevron ${openMenu === "creator" ? "ch-chevron-open" : ""}`} />
              </button>
              {openMenu === "creator" && <NavMegaMenu menu={NAV_MENUS.creator} onNavigate={() => setOpenMenu(null)} />}
            </div>
            <div className="ch-nav-mega-wrap" onMouseEnter={() => openMenuNow("business")}>
              <button
                className="ch-nav-item ch-nav-item-business"
                aria-expanded={openMenu === "business"}
                onClick={() => setOpenMenu((v) => (v === "business" ? null : "business"))}
              >
                For Business <ChevronDown size={14} className={`ch-chevron ${openMenu === "business" ? "ch-chevron-open" : ""}`} />
              </button>
              {openMenu === "business" && <NavMegaMenu menu={NAV_MENUS.business} onNavigate={() => setOpenMenu(null)} />}
            </div>
          </div>
        </div>

        <div className="ch-nav-right">
          <div className="ch-nav-menu-wrap" onMouseEnter={() => openMenuNow("login")} onMouseLeave={scheduleClose}>
            <button
              className="ch-btn-outline"
              aria-expanded={openMenu === "login"}
              onClick={() => setOpenMenu((v) => (v === "login" ? null : "login"))}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Log in <ChevronDown size={13} className={`ch-chevron ${openMenu === "login" ? "ch-chevron-open" : ""}`} />
            </button>
            {openMenu === "login" && (
              <div className="ch-login-dropdown">
                <p className="ch-login-label">Login as a</p>
                <Link to="/login/creator" className="ch-login-item" onClick={() => setOpenMenu(null)}>
                  <span className="ch-login-icon">
                    <User size={14} />
                  </span>
                  Creator
                </Link>
                <Link to="/login/business" className="ch-login-item" onClick={() => setOpenMenu(null)}>
                  <span className="ch-login-icon">
                    <BriefcaseIcon size={14} />
                  </span>
                  Business
                </Link>
              </div>
            )}
          </div>
          <Link to="/register" className="ch-btn-textarrow">
            Get started <ArrowRight size={15} />
          </Link>
          <button className="ch-burger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileOpen && (
          <div className="ch-mobile-panel">
            <Link to="/creators" onClick={() => setMobileOpen(false)}>For Creators</Link>
            <Link to="/business" onClick={() => setMobileOpen(false)}>For Business</Link>
            <Link to="/login/creator" onClick={() => setMobileOpen(false)}>Log in as Creator</Link>
            <Link to="/login/business" onClick={() => setMobileOpen(false)}>Log in as Business</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}>Get started</Link>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="ch-hero" id="top">
        <div className="ch-hero-copy">
          <h1 className="ch-h1">
            Plan. Approve.
            <br />
            <span className="ch-h1-accent-violet">Launch</span>{" "}
            <span className="ch-h1-accent-coral">campaigns.</span>
            <svg className="ch-h1-swash" viewBox="0 0 220 12" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 8 C60 2, 160 2, 218 8" stroke={ELECTRIC_ORANGE} strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
          </h1>
          <p className="ch-sub">
            creatorhub connects brands with creators, making collaborations simple, transparent, and rewarding for everyone.
          </p>
          <div className="ch-hero-ctas">
            <Link to="/register" className="ch-btn-hero-link">
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#demo" className="ch-btn-ghost-play">
              <PlayCircle size={16} /> Watch how it works
            </a>
          </div>
        </div>

        <HeroDashboardPreview />
      </section>

      {/* ===== MARQUEE ===== */}
      <div className="ch-marquee">
        <div className="ch-marquee-track">
          {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
            <span className="ch-chip" key={i}>{c}</span>
          ))}
        </div>
      </div>

      {/* ===== TOOL MERGE ===== */}
      <section className="ch-section" id="tool-merge">
        <div className="merge-card">
          <div className="merge-copy">
            <span className="find-dash" />
            <h2 className="find-h2">
              Replace <span className="find-h2-accent">multiple</span> tools
              <br />
              with one <span className="find-h2-accent">platform</span>
            </h2>
            <p className="merge-sub">
              Search. Brief. Chat. Approve. Pay. Report. Most teams run each of these in a different app. CreatorHub
              runs all of them in one place.
            </p>
            <Link to="/register" className="find-cta">
              Get Started Free <ArrowRight size={16} />
            </Link>
          </div>

          <div className="merge-visual" ref={mergeRef} onMouseEnter={replayMerge}>
            <div className={`icon-collage ${merged ? "in-view" : ""} ${mergeNoTransition ? "no-transition" : ""}`}>
              {MERGE_ICONS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className={`merge-icon ${item.variant && item.variant !== "light" ? `merge-icon-${item.variant}` : ""}`}
                    style={
                      {
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        "--dx": `${230 - item.x}px`,
                        "--dy": `${230 - item.y}px`,
                        animationDelay: `${i * 0.04}s`,
                      } as React.CSSProperties
                    }
                  >
                    <Icon size={20} />
                  </span>
                );
              })}
              <div className="merge-logo">
                <LogoMark size={30} />
                <span className="merge-logo-text">creatorhub</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DIFFERENT GOALS. SAME PLATFORM. ===== */}
      <GoalsSection />

      {/* ===== WHY WE EXIST — before / after ===== */}
      <section className="ch-section why-section" id="why-we-exist">
        <div className="ch-section-head">
          <span className="find-dash" />
          <h2 className="ch-h2 why-h2">
            Creator marketing in Nepal <span className="why-h2-accent">was broken</span>
          </h2>
        </div>

        <div className="compare-row">
          <div className="compare-card compare-before">
            <span className="compare-label compare-label-before">Before creatorhub</span>
            <ul className="compare-list">
              {COMPARE_BEFORE.map((item) => (
                <li key={item}>
                  <span className="compare-icon compare-icon-before">
                    <X size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="compare-divider">
            <span className="compare-vs">vs</span>
          </div>

          <div className="compare-card compare-after">
            <span className="compare-label compare-label-after">With creatorhub</span>
            <ul className="compare-list">
              {COMPARE_AFTER.map((item) => (
                <li key={item}>
                  <span className="compare-icon compare-icon-after">
                    <Check size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== FIND THE RIGHT CREATORS INSTANTLY ===== */}
      <FindCreatorsSection />

      {/* ===== FAQ ===== */}
      <FaqSection />

      {/* ===== FOOTER ===== */}
      <footer className="ch-footer">
        <div className="ch-footer-top">
          <div className="ch-footer-brand">
            <div className="ch-footer-brand-row">
              <LogoMark size={20} />
              <span className="ch-logo" style={{ fontSize: 19 }}>creatorhub</span>
            </div>
            <p className="ch-footer-tag">The workspace where brands and creators run collaborations end to end.</p>
          </div>
          <div className="ch-footer-cols">
            <div className="ch-footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#goals">How it works</a>
              <Link to="/register">Get started</Link>
            </div>
            <div className="ch-footer-col">
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="ch-footer-col">
              <h4>Account</h4>
              <Link to="/login">Log in</Link>
              <Link to="/register">Sign up</Link>
            </div>
          </div>
        </div>
        <div className="ch-footer-bottom">
          <span>© 2026 CreatorHub. All rights reserved.</span>
          <span>Made in Kathmandu 🇳🇵</span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
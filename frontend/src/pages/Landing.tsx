import { useState, useEffect, useRef, memo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ArrowRight,
  FileText,
  Search,
  Wallet,
  Bell,
  Plus,
  LayoutGrid,
  Megaphone,
  Compass,
  Inbox,
  Briefcase as BriefcaseIcon,
  ChevronRight,
  UserPlus,
  ClipboardCheck,
  Circle,
  CheckCircle2,
  PlayCircle,
  TrendingUp,
  Clock,
  Map,
  BarChart3,
  Plug,
  User,
  Send,
  Handshake,
  Star,
  Zap,
  X,
  Check,
  Sparkles,
  Tag,
} from "lucide-react";

const VIOLET = "#6C5DD3";
const VIOLET_LIGHT = "#9C8FE8";
const VIOLET_DARK = "#4A3BA8";
const CORAL = "#FF8A5B";
const CORAL_LIGHT = "#FFB08A";
const CORAL_DARK = "#E86B3E";
const VIOLET_SOFT = "#EDEAFB";
const CORAL_SOFT = "#FFEEE5";

const NAV_MENUS = {
  creator: {
    label: "For Creators",
    href: "/creators",
    accent: CORAL,
    accentSoft: CORAL_SOFT,
    items: [
      {
        title: "Features",
        desc: "Everything you need to land and manage collabs.",
        icon: Sparkles,
        href: "/creators#features",
      },
      {
        title: "How it works",
        desc: "From signup to your first paid collab.",
        icon: Compass,
        href: "/creators#how-it-works",
      },
      {
        title: "Pricing",
        desc: "It's free to apply — no subscription, ever.",
        icon: Tag,
        href: "/creators#pricing",
      },
    ],
  },
  business: {
    label: "For Business",
    href: "/business",
    accent: VIOLET,
    accentSoft: VIOLET_SOFT,
    items: [
      {
        title: "Features",
        desc: "Briefs, discovery, tracking, and payments in one place.",
        icon: Sparkles,
        href: "/business#features",
      },
      {
        title: "How it works",
        desc: "From brief to a shortlist of matched creators.",
        icon: Compass,
        href: "/business#how-it-works",
      },
      {
        title: "Pricing",
        desc: "Plans that scale with how many campaigns you run.",
        icon: Tag,
        href: "/business#pricing",
      },
    ],
  },
};

const BUSINESS_FEATURES = [
  {
    title: "Campaign briefs",
    desc: "Turn a product and a budget into a full brief in minutes.",
    icon: FileText,
  },
  {
    title: "Creator discovery",
    desc: "Filter by niche, audience size, and engagement.",
    icon: Search,
  },
  {
    title: "Spend reports",
    desc: "See what each campaign cost and what it earned back.",
    icon: BarChart3,
  },
];

const CREATOR_FEATURES = [
  {
    title: "One-click apply",
    desc: "Apply to campaigns instantly with your saved profile.",
    icon: Send,
  },
  {
    title: "Deliverable tracking",
    desc: "Every draft, revision, and approval in one thread.",
    icon: Clock,
  },
  {
    title: "Payments, handled",
    desc: "Get paid on approval — no invoices, no screenshots.",
    icon: Plug,
  },
];

const CATEGORIES = [
  "Fashion",
  "Beauty",
  "Fitness",
  "Food",
  "Tech",
  "Travel",
  "Gaming",
  "Music",
  "Home",
  "Wellness",
];

const HIW_STEPS = [
  {
    title: "Create Your Profile",
    desc: "Sign up in under 2 minutes. Add your niche, socials, and portfolio.",
    icon: UserPlus,
  },
  {
    title: "Discover Campaigns",
    desc: "Browse PR drops, gifted collabs, and paid opportunities from top brands.",
    icon: Search,
  },
  {
    title: "Apply Instantly",
    desc: "One-click apply with your profile — no cold pitching or awkward DMs.",
    icon: Send,
  },
  {
    title: "Land the Collab",
    desc: "Brands review your profile, shortlist, and reach out directly.",
    icon: Handshake,
  },
];

const WHY_ITEMS = [
  {
    title: "Engagement Over Vanity",
    desc: "Brands care about real engagement, not inflated numbers.",
    icon: TrendingUp,
  },
  {
    title: "Quality Content Wins",
    desc: "Great content creators get discovered regardless of size.",
    icon: Star,
  },
  {
    title: "Zero Gatekeeping",
    desc: "No agency needed. Apply directly and build your portfolio.",
    icon: Zap,
  },
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

// FIX: these were previously declared inside DashboardPreview(), so the
// FAQ section in Landing() couldn't see them (ReferenceError: FAQ_CREATOR
// is not defined). Moved to module scope alongside the other constant data.
const FAQ_CREATOR = [
  {
    q: "Is it free to join as a creator?",
    a: "Yes, completely free. There are no subscription fees or hidden charges for creators.",
  },
  {
    q: "Do I need a minimum follower count?",
    a: "No. CreatorHub matches on engagement and content quality, not follower count — micro and nano creators are welcome.",
  },
  {
    q: "How do I get paid for campaigns?",
    a: "Once a brand approves your deliverable, payment is released directly to you through the platform — no invoices or waiting on screenshots.",
  },
  {
    q: "What if a brand doesn't respond after I apply?",
    a: "Brands typically respond within a few days. If a brand goes quiet, you can withdraw your application anytime and apply to other open campaigns.",
  },
  {
    q: "What types of content do brands look for?",
    a: "It varies by campaign — reels, unboxings, tutorials, and honest reviews are the most requested formats. Each campaign brief lists exactly what's needed.",
  },
];

const FAQ_BUSINESS = [
  {
    q: "How do I post a campaign?",
    a: "Fill out a short brief with your product, budget, and target niche — CreatorHub turns it into a full campaign listing in minutes.",
  },
  {
    q: "Can I set my own budget?",
    a: "Yes, you set the budget per campaign, whether it's a paid collab, gifted product, or a mix of both.",
  },
  {
    q: "How long does it take to find creators?",
    a: "Most campaigns start receiving applications within hours of posting, since creators can discover and apply instantly.",
  },
  {
    q: "Is there a platform fee for brands?",
    a: "Pricing plans scale with how many campaigns you run — check the Pricing section under For Business for details.",
  },
  {
    q: "How do I know creators are legitimate?",
    a: "Every creator profile shows verified engagement and content history, so you can review real performance before shortlisting.",
  },
];

const LogoMark = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 26 26"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="10" cy="13" r="8" fill={VIOLET} />
    <circle cx="17" cy="9" r="6" fill={CORAL} fillOpacity={0.9} />
  </svg>
);

const PALETTE = {
  business: [
    { tint: VIOLET_SOFT, fg: VIOLET },
    { tint: "#E4DFFB", fg: VIOLET_DARK },
    { tint: "#F1EEFC", fg: VIOLET_LIGHT },
    { tint: "#DCD5F7", fg: VIOLET_DARK },
  ],
  creator: [
    { tint: CORAL_SOFT, fg: CORAL },
    { tint: "#FFE3D1", fg: CORAL_DARK },
    { tint: "#FFF1E8", fg: CORAL_LIGHT },
    { tint: "#FFD9BE", fg: CORAL_DARK },
  ],
};

const DONUT_STOPS = {
  business: [VIOLET, VIOLET_LIGHT, "#D8D5F2"],
  creator: [CORAL, CORAL_LIGHT, "#FFE1CC"],
};

const CAMPAIGN_LIST = [
  { name: "Summer Glow — Skincare", applicants: 12, status: "Live" },
  { name: "Back to School — Fashion", applicants: 8, status: "Draft" },
  { name: "Festive Gadgets", applicants: 19, status: "Live" },
];

const APPLICATION_LIST = [
  {
    name: "Summer Glow — Skincare",
    brand: "Herbivore Nepal",
    status: "Shortlisted",
  },
  { name: "Trail Run Gear", brand: "Kaski Outdoors", status: "Applied" },
  { name: "Cafe Launch Reel", brand: "Brew & Co.", status: "In review" },
];

// ============================================
// DASHBOARD TOGGLE
// ============================================

type DashboardRole = "creator" | "business";

function DashboardToggle({
  role,
  setRole,
}: {
  role: DashboardRole;
  setRole: (r: DashboardRole) => void;
}) {
  return (
    <div className="dashboard-toggle">
      <button
        className={`toggle-btn ${role === "creator" ? "active-coral" : ""}`}
        onClick={() => setRole("creator")}
      >
        <User size={14} /> Creator
      </button>
      <button
        className={`toggle-btn ${role === "business" ? "active-violet" : ""}`}
        onClick={() => setRole("business")}
      >
        <BriefcaseIcon size={14} /> Business
      </button>
    </div>
  );
}

// ============================================
// DASHBOARD COMPONENT
// ============================================

interface DashboardPreviewProps {
  role: "creator" | "business";
}

const DashboardPreview = memo(function DashboardPreview({ role }: DashboardPreviewProps) {
  const isCreator = role === "creator";
  const accentColor = isCreator ? CORAL : VIOLET;
  const accentSoft = isCreator ? "#FFEEE5" : "#EDEAFB";
  const userInitial = "R";
  const userName = isCreator ? "Ram Thapa" : "Regisha Maharjan";
  const userRole = isCreator ? "Creator" : "Business";

  const sideNav = [
    { label: "Home", icon: LayoutGrid, active: true },
    { label: "My Campaigns", icon: Megaphone },
    { label: "Discover Creators", icon: Compass },
    { label: "Applications", icon: Inbox },
    { label: "Workspace", icon: BriefcaseIcon },
  ];

  const roleKey = isCreator ? "creator" : "business";
  const pal = PALETTE[roleKey];
  const donutColors = DONUT_STOPS[roleKey];

  const stats = isCreator
    ? [
        { label: "Active Applications", value: "4", icon: Inbox, ...pal[0] },
        { label: "Active Collabs", value: "2", icon: Megaphone, ...pal[1] },
        {
          label: "Total Earnings",
          value: "Rs. 34,500",
          icon: Wallet,
          ...pal[2],
        },
        { label: "Profile Completion", value: "85%", icon: User, ...pal[3] },
      ]
    : [
        { label: "Active Campaigns", value: "3", icon: Megaphone, ...pal[0] },
        { label: "Applications Received", value: "24", icon: Inbox, ...pal[1] },
        { label: "Deliverables Due", value: "6", icon: FileText, ...pal[2] },
        {
          label: "Spend this month",
          value: "Rs. 68,400",
          icon: Wallet,
          ...pal[3],
        },
      ];

  const recentActivity = isCreator
    ? [
        {
          name: "Priya Karki",
          action: "accepted your proposal",
          time: "2h ago",
          initial: "P",
          ...pal[0],
        },
        {
          name: "Aayush Rai",
          action: "requested revisions",
          time: "5h ago",
          initial: "A",
          ...pal[1],
        },
        {
          name: "Sneha Maharjan",
          action: "paid you Rs. 8,000",
          time: "Yesterday",
          initial: "S",
          ...pal[2],
        },
        {
          name: "Bibek Thapa",
          action: "approved your deliverable",
          time: "2 days ago",
          initial: "B",
          ...pal[3],
        },
      ]
    : [
        {
          name: "Priya Karki",
          action: "submitted a deliverable for review",
          time: "2h ago",
          initial: "P",
          ...pal[0],
        },
        {
          name: "Aayush Rai",
          action: "applied to Summer Glow campaign",
          time: "5h ago",
          initial: "A",
          ...pal[1],
        },
        {
          name: "Sneha Maharjan",
          action: "was paid Rs. 8,000",
          time: "Yesterday",
          initial: "S",
          ...pal[2],
        },
        {
          name: "Bibek Thapa",
          action: "had a deliverable approved",
          time: "2 days ago",
          initial: "B",
          ...pal[3],
        },
      ];

  const gettingStarted = isCreator
    ? [
        { label: "Complete your profile", done: true },
        { label: "Apply to 3 campaigns", done: false },
        { label: "Submit your first deliverable", done: false },
      ]
    : [
        { label: "Complete your business profile", done: true },
        { label: "Publish your first campaign", done: true },
        { label: "Review your first application", done: false },
      ];

  const workItems = isCreator ? APPLICATION_LIST : CAMPAIGN_LIST;

  return (
    <div className="dash-full">
      <div className="dash-sidebar">
        <div className="dash-logo">
          <LogoMark size={20} /> creatorhub
        </div>

        <nav className="dash-nav">
          {sideNav.map((item) => {
            const Icon = item.icon;
            return (
              <span
                key={item.label}
                className={`dash-navitem ${item.active ? "active" : ""}`}
              >
                <Icon size={16} /> {item.label}
                {item.label === "Workspace" && (
                  <ChevronRight size={13} style={{ marginLeft: "auto" }} />
                )}
              </span>
            );
          })}
        </nav>

        <div className="dash-profile-card">
          <p className="dash-profile-title">Complete your profile</p>
          <p className="dash-profile-desc">
            A complete profile builds trust with{" "}
            {isCreator ? "brands" : "creators"}.
          </p>
          <div className="dash-progress">
            <div
              className="dash-progress-fill"
              style={{ width: isCreator ? "85%" : "22%" }}
            />
          </div>
          <span className="dash-progress-pct">{isCreator ? "85" : "22"}%</span>
          <button
            className="dash-profile-btn"
            style={{ background: accentColor }}
          >
            Complete profile <ArrowRight size={13} />
          </button>
        </div>

        <div className="dash-user">
          <span
            className="dash-user-avatar"
            style={{ background: accentColor }}
          >
            {userInitial}
          </span>
          <span>
            <div className="dash-user-name">{userName}</div>
            <div className="dash-user-role">{userRole}</div>
          </span>
        </div>
      </div>

      <div className="dash-main">
        <div className="dash-topbar">
          <div>
            <p className="dash-greeting">
              Good evening, {isCreator ? "Ram" : "Regisha"} 👋
            </p>
            <p className="dash-greeting-sub">
              Here's what's happening across your{" "}
              {isCreator ? "applications" : "campaigns"}.
            </p>
          </div>
          <div className="dash-topbar-actions">
            <span className="dash-search">
              <Search size={14} /> Search anything…
            </span>
            <span className="dash-bell">
              <Bell size={16} />
            </span>
            <button
              className="dash-new-campaign"
              style={{ background: accentColor }}
            >
              <Plus size={14} /> {isCreator ? "Apply Now" : "New Campaign"}
            </button>
          </div>
        </div>

        <div className="dash-stats">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div className="dash-stat" key={s.label}>
                <span
                  className="dash-stat-icon"
                  style={{ background: s.tint, color: s.fg }}
                >
                  <Icon size={15} />
                </span>
                <div className="dash-stat-value">{s.value}</div>
                <div className="dash-stat-label">{s.label}</div>
              </div>
            );
          })}
        </div>

        <div
          className="dash-hero-card"
          style={{
            background: `radial-gradient(circle at 85% 20%, ${accentColor}80 0%, #14101f 55%)`,
          }}
        >
          <span className="dash-hero-eyebrow">
            ✦ {isCreator ? "Featured" : "Active campaign"}
          </span>
          <p className="dash-hero-title">
            {isCreator
              ? "Summer Glow — Apply Now!"
              : "Summer Glow — Skincare Launch"}
          </p>
          <p className="dash-hero-sub">
            {isCreator
              ? "Beauty · NPR 15,000 · 12 applicants already"
              : "12 creators submitted content · 4 deliverables pending review."}
          </p>
          <button className="dash-hero-btn" style={{ background: accentColor }}>
            {isCreator ? "View Details" : "View Campaign"}{" "}
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="dash-bottom">
          <div className="dash-quick">
            <p className="dash-panel-title">
              {isCreator ? "My Applications" : "Active Campaigns"}
            </p>
            <div className="dash-camp-list">
              {workItems.map((item) => (
                <div className="dash-camp-item" key={item.name}>
                  <div className="dash-camp-info">
                    <span className="dash-camp-name">{item.name}</span>
                    <span className="dash-camp-meta">
                      {isCreator
                        ? (item as (typeof APPLICATION_LIST)[number]).brand
                        : `${(item as (typeof CAMPAIGN_LIST)[number]).applicants} applicants`}
                    </span>
                  </div>
                  <span
                    className="dash-status-badge"
                    style={{
                      background:
                        item.status === "Draft" ? "#F1EEFC" : accentSoft,
                      color: item.status === "Draft" ? "#8B7FD1" : accentColor,
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-recent">
            <p className="dash-panel-title">Recent Activity</p>
            <div className="dash-recent-list">
              {recentActivity.map((a) => (
                <div className="dash-recent-item" key={a.name}>
                  <span
                    className="dash-recent-avatar"
                    style={{ background: a.tint, color: a.fg }}
                  >
                    {a.initial}
                  </span>
                  <span className="dash-recent-text">
                    <span className="dash-recent-name">{a.name}</span>{" "}
                    {a.action}
                  </span>
                  <span className="dash-recent-time">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-right">
        <div className="dash-status-card">
          <div className="dash-panel-head">
            <p className="dash-panel-title">Application Status</p>
            <span className="dash-panel-period">This month</span>
          </div>

          <div style={{ position: "relative" }}>
            <div className="dash-donut-shadow" />
            <div
              className="dash-donut"
              style={{
                background: `conic-gradient(${donutColors[0]} 0% 58%, ${donutColors[1]} 58% 87%, ${donutColors[2]} 87% 100%)`,
                boxShadow: isCreator
                  ? "0 20px 34px -10px rgba(255,138,91,0.55), 0 6px 14px -4px rgba(255,138,91,0.35)"
                  : "0 20px 34px -10px rgba(108,93,211,0.55), 0 6px 14px -4px rgba(108,93,211,0.35)",
              }}
            >
              <span className="dash-donut-center">
                <b>24</b>
                <span>total</span>
              </span>
            </div>
          </div>

          <div className="dash-legend">
            <span>
              <i style={{ background: donutColors[0] }} /> Approved <b>14</b>
            </span>
            <span>
              <i style={{ background: donutColors[1] }} /> In review <b>7</b>
            </span>
            <span>
              <i style={{ background: donutColors[2] }} /> Draft <b>3</b>
            </span>
          </div>
        </div>
        <div className="dash-getting-started">
          <p className="dash-panel-title">Getting Started</p>
          {gettingStarted.map((g) => (
            <span className="dash-checklist-item" key={g.label}>
              {g.done ? (
                <CheckCircle2 size={15} color="#16A34A" />
              ) : (
                <Circle size={15} />
              )}
              {g.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// NAV MEGA MENU
// ============================================

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
            <Link
              to={item.href}
              key={item.title}
              className="ch-drop-item"
              onClick={onNavigate}
            >
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
// FINAL CTA — join as creator / request brand access
// ============================================

const FinalCta = memo(function FinalCta() {
  return (
    <section className="ch-section" id="get-started">
      <div className="cta-row">
        <div className="cta-card cta-card-creator">
          <span className="cta-kicker cta-kicker-creator">For Creators</span>
          <h3 className="cta-title">
            Start landing
            <br />
            collabs
          </h3>
          <p className="cta-desc">
            Free forever. Join 200+ creators already on the platform.
          </p>
          <Link to="/register/creator" className="cta-btn cta-btn-creator">
            Join as Creator <ArrowRight size={15} />
          </Link>

          <div className="cta-preview cta-preview-creator">
            <span className="cta-preview-avatar">
              <User size={20} />
            </span>
            <div className="cta-preview-line cta-preview-line-lg" />
            <div className="cta-preview-line cta-preview-line-sm" />
            <div className="cta-preview-tags">
              <span className="cta-tag">Beauty</span>
              <span className="cta-tag">UGC</span>
            </div>
            <span className="cta-preview-btn">View profile</span>
          </div>
        </div>

        <div className="cta-card cta-card-business">
          <span className="cta-kicker cta-kicker-business">For Brands</span>
          <h3 className="cta-title">
            Find your
            <br />
            creators
          </h3>
          <p className="cta-desc">
            Authentic Nepali creators, ready for your next campaign.
          </p>
          <Link to="/register/business" className="cta-btn cta-btn-business">
            Request Brand Access <ArrowRight size={15} />
          </Link>

          <div className="cta-preview cta-preview-business">
            <span className="cta-preview-new">+ New</span>
            <div className="cta-preview-stats">
              <div>
                <span className="cta-preview-stat-label">Active</span>
                <b>12</b>
              </div>
              <div>
                <span className="cta-preview-stat-label">Apps</span>
                <b className="stat-coral">186</b>
              </div>
              <div>
                <span className="cta-preview-stat-label">Done</span>
                <b className="stat-accent">48</b>
              </div>
            </div>
            <div className="cta-preview-row">
              <div className="cta-preview-line cta-preview-line-sm" />
              <span className="cta-status-badge cta-status-approved">
                Approved
              </span>
            </div>
            <div className="cta-preview-row">
              <div className="cta-preview-line cta-preview-line-sm" />
              <span className="cta-status-badge cta-status-review">
                Review
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

// ============================================
// FAQ SECTION
// ============================================

const FaqSection = memo(function FaqSection() {
  const [openFaq, setOpenFaq] = useState<{ col: "creator" | "business"; index: number } | null>(null);

  function toggleFaq(col: "creator" | "business", index: number) {
    setOpenFaq((prev) => (prev && prev.col === col && prev.index === index ? null : { col, index }));
  }

  return (
    <section className="ch-section" id="faq">
      <div className="ch-section-head" style={{ margin: "0 auto 56px", textAlign: "center", maxWidth: 460 }}>
        <span className="ch-kicker">Common Questions</span>
        <h2 className="ch-h2">Everything you need to know</h2>
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

// ============================================
// MAIN LANDING
// ============================================

type OpenMenu = "creator" | "business" | "login" | null;

export function Landing() {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dashboardRole, setDashboardRole] = useState<DashboardRole>("business");
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
      if (
        !target.closest(".ch-nav-links") &&
        !target.closest(".ch-nav-menu-wrap")
      ) {
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

  return (
    <div className="ch">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

        .ch {
          --bg: #fbfaff;
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          --surface: #f7f7f9;
          --accent: #6C5DD3;
          --accent-soft: #EDEAFB;
          --coral: #FF8A5B;
          --coral-soft: #FFEEE5;
          --good: #16a34a;
          --bad: #E8544E;
          --bad-soft: #FCE8E7;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          color: var(--ink);
          background:
            radial-gradient(ellipse 1000px 640px at 20% 0%, rgba(108,93,211,0.13), transparent 65%),
            radial-gradient(ellipse 1000px 640px at 85% 5%, rgba(255,138,91,0.11), transparent 65%),
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
          background: rgba(251, 250, 255, 0.92);
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
        .ch-nav-item-creator:hover { opacity: 1; color: var(--coral); }
        .ch-nav-item-business:hover { opacity: 1; color: var(--accent); }

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
          background: var(--accent); border: none; padding: 9px 22px; border-radius: 8px;
          display: inline-flex; align-items: center; gap: 8px;
          transition: background 0.15s ease, transform 0.15s ease;
        }
        .ch-btn-solid, .ch-btn-solid * { color: #ffffff !important; }
        .ch-btn-solid:hover { background: #5A4CC2; transform: translateY(-1px); }

        .ch-burger { display: none; background: none; border: none; padding: 4px; color: var(--ink); font-size: 24px; }

        .ch-nav-menu-wrap { position: relative; }

        /* ---- Mega Dropdown - anchored to nav-links, same position for both menus ---- */
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

        .ch-dropdown-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }

        .ch-drop-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 10px;
          transition: background 0.15s ease;
        }

        .ch-drop-item:hover {
          background: var(--surface);
        }

        .ch-drop-icon {
          flex-shrink: 0;
          width: 22px;
          margin-top: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-soft);
        }

        .ch-drop-title {
          display: block;
          font-size: 15px;
          font-weight: 500;
          color: var(--ink);
        }

        .ch-drop-desc {
          font-size: 13px;
          color: var(--ink-soft);
          margin-top: 2px;
          line-height: 1.4;
          max-width: 100%;
        }

        .ch-chevron-open { transform: rotate(180deg); }

        .ch-login-dropdown {
          position: absolute; top: calc(100% + 4px); right: 0; width: 220px;
          background: #fff; border: 1px solid var(--line); border-radius: 14px;
          box-shadow: 0 24px 48px -16px rgba(17,18,23,0.20), 0 4px 12px rgba(17,18,23,0.06);
          padding: 12px; z-index: 60;
        }
        .ch-login-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--ink-soft); margin: 2px 6px 8px;
        }
        .ch-login-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 8px; border-radius: 8px;
          font-size: 13px; font-weight: 500; color: var(--ink);
          transition: background 0.15s ease;
        }
        .ch-login-item:hover { background: var(--surface); }
        .ch-login-icon {
          width: 18px; flex-shrink: 0; color: var(--ink-soft);
          display: flex; align-items: center; justify-content: center;
        }

        .ch-btn-textarrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 14.5px; font-weight: 500; color: var(--ink);
          background: none; border: none; padding: 8px 2px;
          transition: gap 0.15s ease, color 0.15s ease;
        }
        .ch-btn-textarrow:hover { gap: 10px; color: var(--ink-soft); }

        .ch-btn-hero-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 15.5px;
          font-weight: 600;
          color: var(--ink);
          background: none;
          border: none;
          padding: 11px 4px;
          position: relative;
          transition: color 0.2s ease, gap 0.2s ease;
        }
        .ch-btn-hero-link::after {
          content: '';
          position: absolute;
          left: 4px;
          right: 4px;
          bottom: 4px;
          height: 2px;
          background: var(--accent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.25s ease;
        }
        .ch-btn-hero-link:hover {
          color: var(--accent);
          gap: 12px;
        }
        .ch-btn-hero-link:hover::after {
          transform: scaleX(1);
        }
        .ch-btn-hero-link svg {
          transition: transform 0.25s ease;
        }
        .ch-btn-hero-link:hover svg {
          transform: translateX(3px);
        }

        .dashboard-toggle {
          display: inline-flex;
          background: white;
          border: 1px solid var(--line);
          border-radius: 100px;
          padding: 4px;
          gap: 4px;
        }
        .toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: none;
          border-radius: 100px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--ink-soft);
          background: transparent;
          transition: all 0.15s ease;
        }
        .toggle-btn.active-coral { background: var(--coral); color: white; }
        .toggle-btn.active-violet { background: var(--accent); color: white; }
        .toggle-btn:not(.active-coral):not(.active-violet):hover { color: var(--ink); }

        .dash-full {
          display: grid;
          grid-template-columns: 200px 1fr 260px;
          background: var(--surface);
          border-radius: 18px;
          overflow: hidden;
          min-height: 520px;
          border: 1px solid var(--line);
        }
        .dash-sidebar {
          background: #fff;
          border-right: 1px solid var(--line);
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dash-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          color: var(--ink);
          padding: 0 4px 16px;
          font-weight: 700;
        }
        .dash-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dash-navitem {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 500;
          color: var(--ink-soft);
          padding: 9px 10px;
          border-radius: 8px;
        }
        .dash-navitem.active {
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 600;
        }
        .dash-profile-card {
          margin-top: auto;
          background: var(--ink);
          border-radius: 12px;
          padding: 14px;
        }
        .dash-profile-title {
          font-size: 12.5px;
          font-weight: 600;
          color: #fff;
          margin: 0;
        }
        .dash-profile-desc {
          font-size: 11px;
          color: #a9a9b2;
          margin: 5px 0 10px;
          line-height: 1.4;
        }
        .dash-progress {
          height: 4px;
          background: #3a3a42;
          border-radius: 100px;
          overflow: hidden;
        }
        .dash-progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 100px;
        }
        .dash-progress-pct {
          font-size: 10.5px;
          color: #a9a9b2;
          display: block;
          margin: 5px 0 10px;
        }
        .dash-profile-btn {
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 8px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .dash-user {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 14px 4px 2px;
          border-top: 1px solid var(--line);
          margin-top: 12px;
        }
        .dash-user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dash-user-name { font-size: 12.5px; font-weight: 600; color: var(--ink); }
        .dash-user-role { font-size: 11px; color: var(--ink-soft); }

        .dash-main {
          padding: 20px 22px;
          min-width: 0;
        }
        .dash-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .dash-greeting {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          color: var(--ink);
        }
        .dash-greeting-sub {
          font-size: 12px;
          color: var(--ink-soft);
          margin: 2px 0 0;
        }
        .dash-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dash-search {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--ink-soft);
          background: #fff;
          border: 1px solid var(--line);
          padding: 6px 12px;
          border-radius: 8px;
        }
        .dash-bell {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-soft);
        }
        .dash-new-campaign {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
        }

        .dash-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .dash-stat {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 12px 14px;
        }
        .dash-stat-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dash-stat-value {
          font-family: 'League Spartan', sans-serif;
          font-weight: 700;
          font-size: 18px;
          margin-top: 10px;
          color: var(--ink);
        }
        .dash-stat-label {
          font-size: 10.5px;
          color: var(--ink-soft);
          margin-top: 2px;
        }

        .dash-hero-card {
          background: radial-gradient(circle at 85% 20%, #3c2f6e 0%, #14101f 55%);
          border-radius: 12px;
          padding: 18px 22px;
          margin-bottom: 14px;
        }
        .dash-hero-eyebrow {
          font-size: 11px;
          font-weight: 600;
          color: #b6acf0;
        }
        .dash-hero-title {
          font-size: 17px;
          font-weight: 700;
          color: #fff;
          margin: 6px 0 3px;
        }
        .dash-hero-sub {
          font-size: 12px;
          color: #b9b9c4;
          margin: 0 0 14px;
        }
        .dash-hero-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .dash-bottom {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 12px;
        }
        .dash-quick, .dash-recent, .dash-status-card, .dash-getting-started {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px;
        }
        
        .dash-status-card { position: relative; overflow: visible; }

        .dash-panel-title {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 10px;
        }

        /* ---- Campaign / application list (replaces generic quick actions) ---- */
        .dash-camp-list { display: flex; flex-direction: column; gap: 10px; }
        .dash-camp-item {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; padding: 8px 4px;
          border-bottom: 1px solid var(--line);
        }
        .dash-camp-item:last-child { border-bottom: none; }
        .dash-camp-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .dash-camp-name {
          font-size: 12px; font-weight: 600; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dash-camp-meta { font-size: 10.5px; color: var(--ink-soft); }
        .dash-status-badge {
          font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 100px;
          white-space: nowrap; flex-shrink: 0;
        }

        .dash-recent-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dash-recent-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 2px;
        }
        .dash-recent-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          flex-shrink: 0;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dash-recent-text {
          font-size: 12px;
          color: var(--ink-soft);
          line-height: 1.4;
          flex: 1;
          min-width: 0;
        }
        .dash-recent-name {
          color: var(--ink);
          font-weight: 600;
        }
        .dash-recent-time {
          font-size: 10.5px;
          color: var(--ink-soft);
          flex-shrink: 0;
          white-space: nowrap;
        }

        .dash-right {
          padding: 20px 16px 20px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dash-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .dash-panel-period {
          font-size: 10.5px;
          color: var(--ink-soft);
        }

        /* ---- 3D glossy donut ---- */
        .dash-donut {
          position: relative;
          width: 118px;
          height: 118px;
          border-radius: 50%;
          margin: 6px auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-4px);
          transition: transform 0.2s ease;
        }
        .dash-donut::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: inherit;
          mask: radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 15px));
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 15px), #000 calc(100% - 15px));
        }
        /* glossy top-left highlight */
        .dash-donut::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 28% 18%, rgba(255,255,255,0.95), rgba(255,255,255,0) 55%);
          mix-blend-mode: overlay;
          pointer-events: none;
        }
        /* soft dark contact shadow underneath, like it's lifted off the card */
        .dash-donut-shadow {
          position: absolute;
          left: 50%;
          bottom: -14px;
          transform: translateX(-50%);
          width: 78px;
          height: 16px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(17,18,23,0.16) 0%, rgba(17,18,23,0) 72%);
          z-index: 0;
        }
        .dash-donut-center {
          position: relative;
          z-index: 1;
          background: #fff;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          box-shadow: inset 0 2px 8px rgba(17,18,23,0.07);
        }
        .dash-donut-center b { font-size: 17px; color: var(--ink); font-weight: 700; }
        .dash-donut-center span { font-size: 10px; color: var(--ink-soft); }

        .dash-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dash-legend span {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          color: var(--ink);
        }
        .dash-legend i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .dash-legend b {
          margin-left: auto;
          font-weight: 600;
        }
        .dash-checklist-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--ink-soft);
          padding: 5px 0;
        }

        .ch-dash-wrap { position: relative; margin: 30px auto 0; max-width: 1180px; }
        .ch-dash-frame {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--line);
          background: #f8f9fc;
          padding: 20px;
          box-shadow: 0 50px 90px -30px rgba(76,60,150,0.28), 0 10px 30px rgba(17,18,23,0.06);
        }

        .ch-hero {
          position: relative; padding: 48px clamp(24px, 5vw, 72px) 0; max-width: 1320px; margin: 0 auto;
        }
        .ch-hero-copy { max-width: 640px; margin: 0 auto; text-align: center; }
        .ch-h1 { font-size: clamp(36px, 4.5vw, 52px); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; margin: 18px 0 0; color: var(--ink); }
        .ch-h1-accent-violet { color: var(--accent); }
        .ch-h1-accent-coral { color: var(--coral); }
        .ch-h1-swash { display: block; margin: 0 auto; width: 60%; max-width: 200px; }
        .ch-sub { font-size: 16px; line-height: 1.65; color: var(--ink-soft); margin: 20px auto 0; font-weight: 400; max-width: 480px; }
        .ch-hero-ctas { display: flex; gap: 14px; margin-top: 30px; flex-wrap: wrap; justify-content: center; }
        .ch-btn-ghost-play {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600; color: var(--ink);
          background: #fff; border: 1.5px solid var(--line); padding: 9px 22px; border-radius: 8px;
          transition: border-color 0.15s ease;
        }
        .ch-btn-ghost-play:hover { border-color: var(--ink); }

        .ch-marquee { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); overflow: hidden; padding: 22px 0; background: var(--surface); margin-top: 60px; }
        .ch-marquee-track { display: flex; width: max-content; gap: 44px; animation: ch-scroll 28s linear infinite; }
        @keyframes ch-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ch-chip { font-family: 'League Spartan', sans-serif; font-weight: 600; font-size: 14.5px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink-soft); white-space: nowrap; display: flex; align-items: center; }
        .ch-chip::after { content: '·'; margin-left: 44px; color: var(--line); font-style: normal; }

        .ch-section { padding: 80px clamp(24px, 5vw, 72px); max-width: 1120px; margin: 0 auto; position: relative; }
        .ch-section + .ch-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          border-top: 1px solid rgba(17,18,23,0.07);
        }
        .ch-section-head { max-width: 520px; margin-bottom: 56px; }
        .ch-kicker { font-size: 18px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink-soft); }
        .ch-h2 { font-family: 'League Spartan', sans-serif; font-weight: 700; font-size: clamp(28px, 3.6vw, 36px); letter-spacing: -0.01em; margin: 12px 0 0; color: var(--ink); }
        .ch-h2-sub { font-size: 15.5px; color: var(--ink-soft); margin-top: 16px; line-height: 1.65; }

        .ch-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .feat-groups {
          display: flex;
          flex-direction: column;
          gap: 44px;
        }
        .feat-group-head {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 100px;
          margin-bottom: 18px;
        }
        .feat-group-head-business { background: var(--accent-soft); color: var(--accent); }
        .feat-group-head-creator { background: var(--coral-soft); color: var(--coral); }
        .feat-group-icon { display: flex; align-items: center; }

        .feat-grid-single { grid-template-columns: repeat(3, 1fr); }

        .feat-card-business { border-top: 3px solid var(--accent); }
        .feat-card-creator { border-top: 3px solid var(--coral); }
        .ch-feature-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 28px 24px; transition: border-color 0.15s ease, transform 0.15s ease; }
        .ch-feature-card:hover { border-color: #d8d8dc; transform: translateY(-2px); }
        .ch-feature-icon {
          width: 40px; height: 40px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .ch-feature-card:hover .ch-feature-icon {
          transform: translateY(-3px) scale(1.08);
        }
        .feat-card-business:hover .ch-feature-icon {
          box-shadow: 0 12px 22px -10px rgba(108,93,211,0.45);
        }
        .feat-card-creator:hover .ch-feature-icon {
          box-shadow: 0 12px 22px -10px rgba(255,138,91,0.45);
        }
        .ch-feature-title { font-size: 15.5px; font-weight: 600; margin: 16px 0 6px; color: var(--ink); }
        .ch-feature-desc { font-size: 13.5px; color: var(--ink-soft); line-height: 1.6; margin: 0; }

        /* ---- Final CTA: join as creator / request brand access ---- */
        .cta-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .cta-card {
          position: relative;
          border-radius: 20px;
          padding: 40px 44px;
          overflow: hidden;
          min-height: 300px;
        }
        .cta-card-creator {
          background: var(--coral-soft);
        }
        .cta-card-business {
          background: linear-gradient(135deg, #EDEAFB 0%, #E1DBF7 100%);
          border: 1px solid rgba(108,93,211,0.14);
        }
        .cta-kicker {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: block;
          margin-bottom: 14px;
        }
        .cta-kicker-creator { color: var(--coral); }
        .cta-kicker-business { color: var(--accent); }
        .cta-title {
          font-family: 'League Spartan', sans-serif;
          font-weight: 700;
          font-size: clamp(24px, 2.6vw, 30px);
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--ink);
          margin: 0 0 14px;
          max-width: 260px;
        }
        .cta-desc {
          font-size: 14px;
          color: var(--ink-soft);
          line-height: 1.6;
          max-width: 300px;
          margin: 0 0 28px;
        }
        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 22px;
          border-radius: 9px;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .cta-btn, .cta-btn * { color: #ffffff !important; }
        .cta-btn-creator { background: var(--coral); }
        .cta-btn-creator:hover { background: #E86B3E; transform: translateY(-1px); }
        .cta-btn-business { background: var(--accent); }
        .cta-btn-business:hover { background: #5A4CC2; transform: translateY(-1px); }

        .cta-preview {
          position: absolute;
          right: 32px;
          bottom: 28px;
          box-shadow: 0 24px 44px -18px rgba(17,18,23,0.20), 0 6px 14px rgba(17,18,23,0.06);
          border-radius: 14px;
        }
        .cta-preview-creator {
          width: 148px;
          background: #fff;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .cta-preview-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--coral);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cta-preview-line {
          height: 6px;
          border-radius: 100px;
          background: var(--line);
        }
        .cta-preview-line-lg { width: 82%; height: 7px; background: var(--ink); opacity: 0.85; }
        .cta-preview-line-sm { width: 52%; }
        .cta-preview-tags { display: flex; gap: 6px; margin-top: 2px; }
        .cta-tag {
          font-size: 9.5px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 100px;
          background: var(--coral-soft);
          color: var(--coral);
        }
        .cta-preview-btn {
          margin-top: 4px;
          width: 100%;
          text-align: center;
          font-size: 10.5px;
          font-weight: 700;
          color: #fff;
          background: var(--coral);
          padding: 7px;
          border-radius: 8px;
        }

        .cta-preview-business {
          width: 224px;
          background: #fff;
          border: 1px solid var(--line);
          padding: 16px;
          right: -28px;
          bottom: 34px;
        }
        .cta-preview-new {
          position: absolute;
          top: 12px;
          right: 12px;
          background: var(--accent);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 4px 9px;
          border-radius: 100px;
        }
        .cta-preview-stats {
          display: flex;
          gap: 16px;
          margin: 8px 0 12px;
        }
        .cta-preview-stats > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cta-preview-stat-label {
          font-size: 9px;
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .cta-preview-stats b { font-size: 15px; font-weight: 700; color: var(--ink); }
        .cta-preview-stats .stat-coral { color: var(--coral); }
        .cta-preview-stats .stat-accent { color: var(--accent); }
        .cta-preview-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 0;
          border-top: 1px solid var(--line);
        }
        .cta-status-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 100px;
          white-space: nowrap;
        }
        .cta-status-approved { background: #E1F6EA; color: var(--good); }
        .cta-status-review { background: var(--coral-soft); color: var(--coral); }

        .faq-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          position: relative;
        }
        .faq-cols::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0; left: 50%;
          border-left: 1.5px dashed var(--line);
        }
        .faq-col-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .faq-col-label.creator { color: var(--coral); }
        .faq-col-label.business { color: var(--accent); }

        .faq-list {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 4px 20px;
        }
        .faq-item {
          border-bottom: 1px solid var(--line);
          padding: 16px 0;
        }
        .faq-item:last-child { border-bottom: none; }

        .faq-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          background: none;
          border: none;
          text-align: left;
          font-size: 14px;
          font-weight: 500;
          color: var(--ink);
          padding: 0;
          transition: color 0.2s ease;
        }
        .faq-question-text {
          text-decoration: underline;
          text-decoration-color: transparent;
          text-underline-offset: 3px;
          transition: text-decoration-color 0.2s ease;
        }
        .faq-question:hover .faq-question-text {
          text-decoration-color: currentColor;
        }
        .faq-item.open.creator .faq-question {
          color: var(--coral);
          font-weight: 600;
          padding-bottom: 12px;
          border-bottom: 1.5px solid var(--coral);
          margin-bottom: 4px;
        }
        .faq-item.open.business .faq-question {
          color: var(--accent);
          font-weight: 600;
          padding-bottom: 12px;
          border-bottom: 1.5px solid var(--accent);
          margin-bottom: 4px;
        }

        .faq-chevron {
          flex-shrink: 0;
          transition: transform 0.25s ease;
          color: var(--ink-soft);
        }
        .faq-item.open .faq-chevron { transform: rotate(180deg); }
        .faq-item.open.creator .faq-chevron { color: var(--coral); }
        .faq-item.open.business .faq-chevron { color: var(--accent); }

        .faq-answer {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.3s ease;
        }
        .faq-item.open .faq-answer {
          max-height: 200px;
        }
        .faq-answer-inner {
          font-size: 13.5px;
          color: var(--ink-soft);
          line-height: 1.6;
          padding-top: 4px;
        }

        .ch-why {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .why-kicker { font-size: 12.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-soft); }
        .why-h2 { font-family: 'League Spartan', sans-serif; font-weight: 700; font-size: clamp(26px, 3.2vw, 32px); letter-spacing: -0.01em; margin: 10px 0 16px; color: var(--ink); }
        .why-sub { font-size: 14.5px; line-height: 1.7; color: var(--ink-soft); margin: 0 0 32px; max-width: 440px; }
        .why-list { display: flex; flex-direction: column; gap: 20px; }
        .why-item { display: flex; align-items: flex-start; gap: 14px; }
        .why-icon { width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px; background: var(--coral-soft); color: var(--coral); display: flex; align-items: center; justify-content: center; }
        .why-item-title { font-size: 14.5px; font-weight: 600; color: var(--ink); margin: 0 0 3px; }
        .why-item-desc { font-size: 13px; color: var(--ink-soft); margin: 0; line-height: 1.55; }

        .why-visual {
          position: relative;
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ---- "In their words": two-voice statement cards, business (violet) vs creator (coral) ---- */
        .why-convo {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .why-convo-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }
        .why-convo-label i { width: 14px; height: 1.5px; background: var(--line); display: inline-block; }

        .why-voice-card {
          position: relative;
          width: 84%;
          border-radius: 18px;
          padding: 18px 20px 16px;
          color: #fff;
          overflow: hidden;
          box-shadow: 0 22px 40px -20px rgba(17,18,23,0.35);
          transition: transform 0.25s ease;
        }
        .why-voice-card.business {
          align-self: flex-start;
          background: linear-gradient(135deg, ${VIOLET} 0%, ${VIOLET_DARK} 100%);
          transform: rotate(-1.4deg);
          border-bottom-left-radius: 4px;
        }
        .why-voice-card.creator {
          align-self: flex-end;
          background: linear-gradient(135deg, ${CORAL} 0%, ${CORAL_DARK} 100%);
          transform: rotate(1.4deg);
          border-bottom-right-radius: 4px;
        }
        .why-voice-card:hover { transform: rotate(0deg) translateY(-3px); }
        .why-voice-card::before {
          content: '\u201C';
          position: absolute;
          top: -22px;
          font-family: 'League Spartan', sans-serif;
          font-weight: 800;
          font-size: 96px;
          line-height: 1;
          color: rgba(255,255,255,0.16);
          pointer-events: none;
        }
        .why-voice-card.business::before { left: 10px; }
        .why-voice-card.creator::before { right: 10px; }

        .why-voice-head { position: relative; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .why-voice-avatar {
          width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
          background: rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
        }
        .why-voice-role { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85; }
        .why-voice-text {
          position: relative;
          margin: 0;
          font-family: 'League Spartan', sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          line-height: 1.45;
          letter-spacing: -0.005em;
        }

        .why-convo-outcome {
          align-self: center;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 4px;
          padding: 9px 16px;
          border-radius: 100px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--ink);
          background: #fff;
          border: 1px solid var(--line);
          box-shadow: 0 12px 24px -14px rgba(17,18,23,0.18);
        }
        .why-convo-outcome b { font-weight: 700; }

        .compare-row {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: stretch;
          gap: 0;
          max-width: 980px;
          margin: 0 auto;
        }
        .compare-card {
          background: #fff;
          border: 1px solid var(--line);
          border-top: 3px solid transparent;
          border-radius: 16px;
          padding: 30px 32px;
        }
        .compare-before { border-top-color: var(--bad); }
        .compare-after { border-top-color: var(--good); }
        .compare-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          display: block;
          margin-bottom: 20px;
        }
        .compare-label-before { color: var(--bad); }
        .compare-label-after { color: var(--good); }
        .compare-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
        .compare-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: var(--ink); line-height: 1.55; }
        .compare-icon {
          width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
          display: flex; align-items: center; justify-content: center;
        }
        .compare-icon-before { background: var(--bad-soft); color: var(--bad); }
        .compare-icon-after { background: #E1F6EA; color: var(--good); }
        .compare-divider {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 28px;
        }
        .compare-divider::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          border-left: 1.5px dashed var(--line);
        }
        .compare-vs {
          position: relative;
          z-index: 1;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #fff;
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--bad);
        }

        .hiw-row {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 20px;
        }
        .hiw-line {
          position: absolute;
          top: 32px;
          left: 64px;
          right: 64px;
          height: 2px;
          background: repeating-linear-gradient(
            to right,
            var(--coral) 0px, var(--coral) 8px,
            transparent 8px, transparent 16px
          );
          opacity: 0.55;
          z-index: 0;
          border-top: none;
        }
        .hiw-step {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 0 8px;
        }
        .hiw-icon-box {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: var(--coral-soft);
          color: var(--coral);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease, color 0.25s ease;
        }
        .hiw-step:hover .hiw-icon-box {
          transform: translateY(-5px) scale(1.06);
          background: var(--coral);
          color: #fff;
          box-shadow: 0 16px 28px -12px rgba(255,138,91,0.55);  
        }
        .hiw-step-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 10px;
        }
        .hiw-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--ink);
          margin: 0 0 6px;
        }
        .hiw-desc {
          font-size: 13px;
          color: var(--ink-soft);
          line-height: 1.6;
          margin: 0;
        }

        .ch-footer {
          border-top: 1px solid var(--line);
          padding: 56px clamp(24px, 5vw, 72px) 36px;
          background: var(--surface);
        }
        .ch-footer-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          max-width: 1120px; margin: 0 auto; flex-wrap: wrap; gap: 40px;
        }
        .ch-footer-brand { max-width: 260px; }
        .ch-footer-brand-row { display: flex; align-items: center; gap: 9px; }
        .ch-footer-tag { font-size: 13.5px; color: var(--ink-soft); margin-top: 14px; line-height: 1.65; }
        .ch-footer-cols { display: flex; gap: 72px; flex-wrap: wrap; }
        .ch-footer-col h4 {
          font-size: 12.5px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--ink-soft); margin: 0 0 18px;
        }
        .ch-footer-col a {
          display: block; font-size: 14px; color: var(--ink); margin-bottom: 13px;
          transition: opacity 0.15s ease;
        }
        .ch-footer-col a:hover { opacity: 0.6; }
        .ch-footer-bottom {
          max-width: 1120px; margin: 48px auto 0; padding-top: 28px;
          border-top: 1px solid var(--line);
          font-size: 13px; color: var(--ink-soft);
          display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }

        @media (max-width: 1100px) {
          .dash-full { grid-template-columns: 180px 1fr 220px; }
          .ch-dropdown { width: 440px; }
        }
        @media (max-width: 900px) {
          .dash-full { grid-template-columns: 1fr; }
          .dash-sidebar { flex-direction: row; flex-wrap: wrap; border-right: none; border-bottom: 1px solid var(--line); }
          .dash-nav, .dash-profile-card, .dash-user { display: none; }
          .dash-right { padding: 0 20px 20px; }
          .dash-stats { grid-template-columns: 1fr 1fr; }
          .dash-bottom { grid-template-columns: 1fr; }
          .hiw-row { grid-template-columns: repeat(2, 1fr); row-gap: 32px; }
          .hiw-line { display: none; }
          .ch-why { grid-template-columns: 1fr; gap: 40px; }
          .why-visual { height: auto; padding: 24px 0; order: -1; }
          .compare-row { grid-template-columns: 1fr; gap: 20px; }
          .compare-divider { padding: 0; }
          .compare-divider::before { display: none; }
          .ch-dropdown { width: 360px; left: 0; transform: none; }
          .faq-cols { grid-template-columns: 1fr; gap: 32px; }
          .cta-row { grid-template-columns: 1fr; gap: 16px; }
          .cta-card { padding: 32px 28px; min-height: 0; }
          .cta-preview { display: none; }
          .faq-cols::before { display: none; }
        }
        @media (max-width: 860px) {
          .ch-nav-links, .ch-nav-right .ch-btn-outline { display: none; }
          .ch-burger { display: block; }
          .ch-feature-grid { grid-template-columns: 1fr 1fr; }
          .feat-grid-single { grid-template-columns: 1fr 1fr; }
          .ch-mobile-panel {
            position: fixed; inset: 78px 0 0 0; background: #fff; z-index: 55;
            padding: 28px 24px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto;
          }
          .ch-mobile-panel a, .ch-mobile-panel button {
            font-size: 16px; font-weight: 500; padding: 18px 4px;
            border-bottom: 1px solid var(--line); text-align: left;
            background: none; border-left: none; border-right: none; border-top: none; color: var(--ink);
          }
        }
        @media (max-width: 560px) {
          .ch-feature-grid { grid-template-columns: 1fr; }
          .dash-stats { grid-template-columns: 1fr; }
          .hiw-row { grid-template-columns: 1fr; }
          .ch-dropdown { width: 300px; padding: 16px 12px; }
          .ch-drop-item { padding: 10px 12px; }
          .feat-grid-single { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ===== NAVBAR ===== */}
      <nav className={`ch-nav ${scrolled ? "ch-nav-scrolled" : ""}`}>
        <div className="ch-nav-left">
          <a href="#top" className="ch-nav-logo ch-logo">
            <LogoMark size={28} /> creatorhub
          </a>
          <div
            className="ch-nav-links"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
          >
            <div
              className="ch-nav-mega-wrap"
              onMouseEnter={() => openMenuNow("creator")}
            >
              <button
                className="ch-nav-item ch-nav-item-creator"
                aria-expanded={openMenu === "creator"}
                onClick={() =>
                  setOpenMenu((v) => (v === "creator" ? null : "creator"))
                }
              >
                For Creators{" "}
                <ChevronDown
                  size={14}
                  className={`ch-chevron ${openMenu === "creator" ? "ch-chevron-open" : ""}`}
                />
              </button>
              {openMenu === "creator" && (
                <NavMegaMenu
                  menu={NAV_MENUS.creator}
                  onNavigate={() => setOpenMenu(null)}
                />
              )}
            </div>
            <div
              className="ch-nav-mega-wrap"
              onMouseEnter={() => openMenuNow("business")}
            >
              <button
                className="ch-nav-item ch-nav-item-business"
                aria-expanded={openMenu === "business"}
                onClick={() =>
                  setOpenMenu((v) => (v === "business" ? null : "business"))
                }
              >
                For Business{" "}
                <ChevronDown
                  size={14}
                  className={`ch-chevron ${openMenu === "business" ? "ch-chevron-open" : ""}`}
                />
              </button>
              {openMenu === "business" && (
                <NavMegaMenu
                  menu={NAV_MENUS.business}
                  onNavigate={() => setOpenMenu(null)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="ch-nav-right">
          <div
            className="ch-nav-menu-wrap"
            onMouseEnter={() => openMenuNow("login")}
            onMouseLeave={scheduleClose}
          >
            <button
              className="ch-btn-outline"
              aria-expanded={openMenu === "login"}
              onClick={() =>
                setOpenMenu((v) => (v === "login" ? null : "login"))
              }
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              Log in{" "}
              <ChevronDown
                size={13}
                className={`ch-chevron ${openMenu === "login" ? "ch-chevron-open" : ""}`}
              />
            </button>
            {openMenu === "login" && (
              <div className="ch-login-dropdown">
                <p className="ch-login-label">Login as a</p>
                <Link
                  to="/login/creator"
                  className="ch-login-item"
                  onClick={() => setOpenMenu(null)}
                >
                  <span className="ch-login-icon">
                    <User size={14} />
                  </span>
                  Creator
                </Link>
                <Link
                  to="/login/business"
                  className="ch-login-item"
                  onClick={() => setOpenMenu(null)}
                >
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
          <button
            className="ch-burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileOpen && (
          <div className="ch-mobile-panel">
            <Link to="/creators" onClick={() => setMobileOpen(false)}>
              For Creators
            </Link>
            <Link to="/business" onClick={() => setMobileOpen(false)}>
              For Business
            </Link>
            <Link to="/login/creator" onClick={() => setMobileOpen(false)}>
              Log in as Creator
            </Link>
            <Link to="/login/business" onClick={() => setMobileOpen(false)}>
              Log in as Business
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}>
              Get started
            </Link>
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
            <svg
              className="ch-h1-swash"
              viewBox="0 0 220 12"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M2 8 C60 2, 160 2, 218 8"
                stroke={CORAL}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </h1>
          <p className="ch-sub">
            creatorhub matches your business with creators who fit, writes the
            brief, tracks every deliverable, and handles the payment — all from
            one dashboard.
          </p>
          <div className="ch-hero-ctas">
            <Link to="/register" className="ch-btn-hero-link">
              Start for free <ArrowRight size={16} />
            </Link>
            <a href="#demo" className="ch-btn-ghost-play">
              <PlayCircle size={16} /> Watch demo
            </a>
          </div>
        </div>

        <div className="ch-dash-wrap">
          <div className="ch-dash-frame">
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 12,
                paddingRight: 4,
              }}
            >
              <DashboardToggle
                role={dashboardRole}
                setRole={setDashboardRole}
              />
            </div>
            <DashboardPreview role={dashboardRole} />
          </div>
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      <div className="ch-marquee">
        <div className="ch-marquee-track">
          {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
            <span className="ch-chip" key={i}>
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <section className="ch-section" id="how-it-works">
        <div
          className="ch-section-head"
          style={{ textAlign: "center", margin: "0 auto 56px" }}
        >
          <span className="ch-kicker">How It Works</span>
          <h2 className="ch-h2">
            From signup to your first brand collab in 4 simple steps
          </h2>
        </div>

        <div className="hiw-row">
          <div className="hiw-line" />
          {HIW_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div className="hiw-step" key={step.title}>
                <div className="hiw-icon-box">
                  <Icon size={20} />
                </div>
                <div className="hiw-step-label">
                  Step {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="hiw-title">{step.title}</h3>
                <p className="hiw-desc">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== WHY CREATORHUB ===== */}
      <section className="ch-section" id="why-creatorhub">
        <div className="ch-why">
          <div>
            <h2 className="why-h2">Why creatorhub?</h2>
            <p className="why-sub">
              We believe in creator potential — not just follower counts. Brands
              on CreatorHub value engagement, content quality, and authentic
              storytelling.
            </p>
            <div className="why-list">
              {WHY_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="why-item" key={item.title}>
                    <span className="why-icon">
                      <Icon size={17} />
                    </span>
                    <div>
                      <p className="why-item-title">{item.title}</p>
                      <p className="why-item-desc">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="why-visual">
            <div className="why-convo">
              <div className="why-voice-card business">
                <div className="why-voice-head">
                  <span className="why-voice-avatar">
                    <BriefcaseIcon size={12} />
                  </span>
                  <span className="why-voice-role">Business</span>
                </div>
                <p className="why-voice-text">
                  We posted one brief and had matches by morning — not a
                  follower count in sight.
                </p>
              </div>

              <div className="why-voice-card creator">
                <div className="why-voice-head">
                  <span className="why-voice-avatar">
                    <User size={12} />
                  </span>
                  <span className="why-voice-role">Creator</span>
                </div>
                <p className="why-voice-text">
                  One click to apply. No cold DMs, no chasing brands that never
                  reply.
                </p>
              </div>

              <div className="why-voice-card business">
                <div className="why-voice-head">
                  <span className="why-voice-avatar">
                    <BriefcaseIcon size={12} />
                  </span>
                  <span className="why-voice-role">Business</span>
                </div>
                <p className="why-voice-text">
                  Every draft and approval lives in one thread — no more
                  screenshots in a group chat.
                </p>
              </div>

              <div className="why-voice-card creator">
                <div className="why-voice-head">
                  <span className="why-voice-avatar">
                    <User size={12} />
                  </span>
                  <span className="why-voice-role">Creator</span>
                </div>
                <p className="why-voice-text">
                  And I get paid the moment it's approved — no invoices, no
                  waiting around.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY WE EXIST — before / after ===== */}
      <section className="ch-section" id="why-we-exist">
        <div
          className="ch-section-head"
          style={{ textAlign: "center", margin: "0 auto 48px" }}
        >
          <span className="ch-kicker">Why We Exist</span>
          <h2 className="ch-h2">Creator marketing in Nepal was broken</h2>
        </div>

        <div className="compare-row">
          <div className="compare-card compare-before">
            <span className="compare-label compare-label-before">
              Before creatorhub
            </span>
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
            <span className="compare-label compare-label-after">
              With creatorhub
            </span>
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

      {/* ===== FEATURES ===== */}
      <section className="ch-section" id="features">
        <div
          className="ch-section-head"
          style={{ margin: "0 auto 56px", textAlign: "center", maxWidth: 460 }}
        >
          <span className="ch-kicker">Features</span>
          <h2 className="ch-h2">
            Everything a collab needs
            <br />
            to get done right
          </h2>
        </div>

        <div className="feat-groups">
          <div className="feat-group">
            <div className="ch-feature-grid feat-grid-single">
              {BUSINESS_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    className="ch-feature-card feat-card-business"
                    key={f.title}
                  >
                    <span
                      className="ch-feature-icon"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      <Icon size={19} />
                    </span>
                    <h3 className="ch-feature-title">{f.title}</h3>
                    <p className="ch-feature-desc">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="feat-group">
            <div className="ch-feature-grid feat-grid-single">
              {CREATOR_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    className="ch-feature-card feat-card-creator"
                    key={f.title}
                  >
                    <span
                      className="ch-feature-icon"
                      style={{
                        background: "var(--coral-soft)",
                        color: "var(--coral)",
                      }}
                    >
                      <Icon size={19} />
                    </span>
                    <h3 className="ch-feature-title">{f.title}</h3>
                    <p className="ch-feature-desc">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <FinalCta />

      {/* ===== FAQ ===== */}
      <FaqSection />

      {/* ===== FOOTER ===== */}
      <footer className="ch-footer">
        <div className="ch-footer-top">
          <div className="ch-footer-brand">
            <div className="ch-footer-brand-row">
              <LogoMark size={20} />
              <span className="ch-logo" style={{ fontSize: 19 }}>
                creatorhub
              </span>
            </div>
            <p className="ch-footer-tag">
              The workspace where brands and creators run collaborations end to
              end.
            </p>
          </div>
          <div className="ch-footer-cols">
            <div className="ch-footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
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
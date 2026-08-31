import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Megaphone, Compass, Inbox, Briefcase, Search, Bell,
  ChevronDown, ChevronRight, LogOut, Settings, Plus, ArrowRight, Send, Eye,
  Wallet, FileText, Users, CircleDashed, CheckCircle2, MessageSquare,
  Calendar, PackageCheck,
} from 'lucide-react';
import { useState } from 'react';

/**
 * /dashboard — increment 1, single file on purpose.
 * White sidebar + light content, role-aware (creator vs business).
 *
 * IMPORTANT: this renders REAL zero-state, not sample data. Swap the
 * `stats` / `spotlight` / `checklist` blocks for real API data once
 * GET /api/dashboard exists — the shapes are already set up for that.
 *
 * FONT: the logo uses League Spartan. Add it once, globally, e.g. in
 * index.html:
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600&display=swap" rel="stylesheet">
 * or `npm install @fontsource/league-spartan` and import the 500/600 weights.
 */

const C = {
  sidebar: '#FFFFFF',
  sidebarBorder: '#EAE7F2',
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  violet: '#6C5DD3',       // business primary — from the logo mark
  violetSoft: '#EDEAFB',
  coral: '#FF8A5B',        // creator primary — from the logo mark
  coralSoft: '#FFEEE5',
  mint: '#22C55E',
  sky: '#38BDF8',
  amber: '#F59E0B',
};

const WORKSPACE_CHILDREN = [
  { label: 'Active Collab', icon: CheckCircle2, to: '/workspace/active' },
  { label: 'Messages', icon: MessageSquare, to: '/workspace/messages' },
  { label: 'Calendar', icon: Calendar, to: '/workspace/calendar' },
  { label: 'Deliverables', icon: PackageCheck, to: '/workspace/deliverables' },
];

// ------------------------------------------------------------------
// PROFILE COMPLETION
// ------------------------------------------------------------------
// Computed from the actual profile fields instead of a hardcoded
// number, so the bar/percentage move as the user fills things in.
//
// This assumes `user.profile` mirrors the onboarding payload shape
// for each role (see CreatorOnboarding.tsx / BusinessOnboarding.tsx).
// If your AuthContext's User type doesn't have `profile` yet, add it
// once GET /api/me (or similar) returns the saved profile — until
// then this safely falls back to BASE_COMPLETION only.
//
// BASE_COMPLETION: just having an account (registered, role picked)
// is worth a flat head start, so the bar isn't sitting at 0% the
// moment someone lands here. The remaining (100 - BASE_COMPLETION)
// is spread evenly across the onboarding fields below, so completing
// step 1 alone visibly moves the needle instead of waiting for the
// whole flow to finish.

const BASE_COMPLETION = 22;

// Field names here must match the keys CreatorOnboarding.tsx sends —
// both in its partial updateProfile() calls per step and in the final
// payload to POST /onboarding/creator/complete (see
// CreatorOnboardingComplete in app/schemas/creator.py). `profile_image`
// and `portfolio` are intentionally excluded: both are optional on the
// backend, so they shouldn't gate completion.
//
// Some entries are arrays of aliases rather than a single string: the
// backend's computed User.profile property (models/user.py) returns
// client-facing names (niches, content_languages, audience_interests),
// but a couple of older code paths — namely GET /onboarding/creator/profile
// via getCreatorProgress() — still return raw DB column names
// (categories, languages, interests) for the same data. Checking both
// means completion % stays correct regardless of which one populated
// user.profile at the time.
const CREATOR_PROFILE_FIELDS: Array<string | string[]> = [
  'display_name',
  'username',
  'bio',
  'location',
  'creator_type',
  ['niches', 'categories'],
  'content_types',
  ['content_languages', 'languages'],
  ['audience_interests', 'interests'],
  'audience_age_range',
  'audience_location',
  'socials',
  'starting_price',
];

const BUSINESS_PROFILE_FIELDS: Array<string | string[]> = [
  'company_name',
  'business_type',
  'industry',
  'location',
  'website',
  'description',
  'logo_url',
  'contact_phone',
  'interested_categories',
  'preferred_content_types',
  'typical_budget',
];

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function isAnyAliasFilled(profile: Record<string, any>, key: string | string[]): boolean {
  const aliases = Array.isArray(key) ? key : [key];
  return aliases.some((alias) => isFieldFilled(profile[alias]));
}

function calculateProfileCompletion(profile: Record<string, any> | undefined, role: 'creator' | 'business'): number {
  const fields = role === 'creator' ? CREATOR_PROFILE_FIELDS : BUSINESS_PROFILE_FIELDS;
  if (!profile) return BASE_COMPLETION;
  const filled = fields.filter((key) => isAnyAliasFilled(profile, key)).length;
  const onboardingPortion = (filled / fields.length) * (100 - BASE_COMPLETION);
  return Math.min(100, Math.round(BASE_COMPLETION + onboardingPortion));
}

const Donut = ({ segments }: { segments: { value: number; color: string; label: string }[] }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-full" style={{ background: C.line }}>
        <span className="text-xs" style={{ color: C.inkFaint }}>No data yet</span>
      </div>
    );
  }
  let acc = 0;
  const stops = segments
    .map((seg) => {
      const start = (acc / total) * 360;
      acc += seg.value;
      const end = (acc / total) * 360;
      return `${seg.color} ${start}deg ${end}deg`;
    })
    .join(', ');
  return (
    <div className="relative flex h-32 w-32 items-center justify-center rounded-full" style={{ background: `conic-gradient(${stops})` }}>
      <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full" style={{ background: C.card }}>
        <span className="text-lg font-bold" style={{ color: C.ink }}>{total}</span>
        <span className="text-[10px]" style={{ color: C.inkFaint }}>total</span>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const role = user?.role === 'creator' ? 'creator' : 'business';
  const primary = role === 'creator' ? C.coral : C.violet;
  const primarySoft = role === 'creator' ? C.coralSoft : C.violetSoft;
  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const initials = user?.full_name?.[0]?.toUpperCase() ?? '?';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const profileCompletion = calculateProfileCompletion(user?.profile, role);

  // "Complete Profile" (sidebar CTA) always goes to the onboarding form
  // to finish/edit. "Edit profile" in the user menu goes to the real,
  // view-only profile page — /profile now renders CreatorProfile or
  // BusinessProfile depending on role (see App.tsx), so both roles use
  // the same URL.
  const profileEditRoute = `/onboarding/${role}`;
  const profileViewRoute = '/profile';

  // Prefer the actual uploaded photo/logo; initials are the fallback
  // for accounts that haven't uploaded one yet.
  const avatarUrl: string | null = user?.profile?.profile_image || user?.profile?.logo_url || null;

  const NAV = role === 'creator'
    ? [
        { label: 'Home', icon: LayoutDashboard, active: true, to: '/dashboard' },
        { label: 'Discover Collabs', icon: Compass, to: '/campaigns' },
        { label: 'My Applications', icon: Inbox, to: '/applications' },
        { label: 'Workspace', icon: Briefcase, to: '/workspace', children: WORKSPACE_CHILDREN },
      ]
    : [
        { label: 'Home', icon: LayoutDashboard, active: true, to: '/dashboard' },
        { label: 'My Campaigns', icon: Megaphone, to: '/campaigns' },
        { label: 'Discover Creators', icon: Compass, to: '/creators' },
        { label: 'Applications', icon: Inbox, to: '/applications' },
        { label: 'Workspace', icon: Briefcase, to: '/workspace', children: WORKSPACE_CHILDREN },
      ];

  const STATS = role === 'creator'
    ? [
        { label: 'Active Collabs', value: 0, icon: Briefcase, color: primary },
        { label: 'Applications Sent', value: 0, icon: Send, color: C.mint },
        { label: 'Profile Views', value: 0, icon: Eye, color: C.sky },
        { label: 'Earnings this month', value: 'Rs. 0', icon: Wallet, color: C.amber },
      ]
    : [
        { label: 'Active Campaigns', value: 0, icon: Megaphone, color: primary },
        { label: 'Applications Received', value: 0, icon: Inbox, color: C.mint },
        { label: 'Deliverables Due', value: 0, icon: FileText, color: C.sky },
        { label: 'Spend this month', value: 'Rs. 0', icon: Wallet, color: C.amber },
      ];

  const spotlight = role === 'creator'
    ? { title: "You don't have an active collab yet", sub: 'Apply to a campaign to get your first one started.', cta: 'Browse Campaigns', ctaTo: '/campaigns' }
    : { title: "You haven't launched a campaign yet", sub: 'Create your first campaign to start receiving applications.', cta: 'Create Campaign', ctaTo: '/campaigns/new' };

  const quickActions = role === 'creator'
    ? [
        { label: 'Browse Campaigns', icon: Compass, to: '/campaigns', color: primary },
        { label: 'Complete Portfolio', icon: FileText, to: '/onboarding/creator', color: C.sky },
        { label: 'Messages', icon: Send, to: '/messages', color: C.amber },
      ]
    : [
        { label: 'Create Campaign', icon: Plus, to: '/campaigns/new', color: primary },
        { label: 'Discover Creators', icon: Users, to: '/creators', color: C.sky },
        { label: 'Review Applications', icon: Inbox, to: '/applications', color: C.amber },
      ];

  const checklist = role === 'creator'
    ? [
        { label: 'Complete your profile', done: profileCompletion >= 100 },
        { label: 'Apply to your first campaign', done: false },
        { label: 'Get your first application approved', done: false },
      ]
    : [
        { label: 'Complete your business profile', done: profileCompletion >= 100 },
        { label: 'Publish your first campaign', done: false },
        { label: 'Review your first application', done: false },
      ];

  const statusSegments = [
    { value: 0, color: C.mint, label: 'Approved' },
    { value: 0, color: C.amber, label: 'In review' },
    { value: 0, color: C.inkFaint, label: 'Draft' },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: C.surface }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto border-r px-4 py-6 md:flex"
        style={{ background: C.sidebar, borderColor: C.sidebarBorder }}
      >
        <div className="flex items-center gap-2.5 px-2">
          <svg width="28" height="28" viewBox="0 0 26 26" className="shrink-0" aria-hidden="true">
            <circle cx="10" cy="13" r="8" fill={C.violet} />
            <circle cx="17" cy="9" r="6" fill="#FF8A5B" fillOpacity="0.9" />
          </svg>
          <span
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.03em',
              fontSize: '1.05rem',
              color: C.ink,
            }}
          >
            creatorhub
          </span>
        </div>

        <nav className="mt-8 flex flex-col gap-1.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const hasChildren = 'children' in item && item.children;
            const isExpanded = expanded.has(item.label);
            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={item.active ? { background: primarySoft, color: primary } : { color: C.inkSoft }}
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                ) : (
                  <Link
                    to={item.to}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={item.active ? { background: primarySoft, color: primary } : { color: C.inkSoft }}
                  >
                    <Icon size={17} className="shrink-0" />
                    {item.label}
                  </Link>
                )}

                {hasChildren && isExpanded && (
                  <div className="mb-1 mt-1 flex flex-col gap-1">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.label}
                          to={child.to}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
                          style={{ color: C.inkSoft }}
                        >
                          <ChildIcon size={15} className="shrink-0" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Profile completion promo — percentage/bar reflect the real
            profile data and animate as it changes (see profileCompletion
            above). Hidden once the profile is fully filled in. */}
        {profileCompletion < 100 && (
          <div className="mt-8 rounded-xl p-4" style={{ background: '#1F1A2E' }}>
            <div className="text-sm font-semibold text-white">Complete your profile</div>
            <p className="mt-1 text-xs" style={{ color: '#9992AD' }}>
              {role === 'creator' ? 'A complete profile gets seen by more brands.' : 'A complete profile builds trust with creators.'}
            </p>
            <div className="mt-3 h-1.5 w-full rounded-full" style={{ background: '#332C48' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${profileCompletion}%`, background: primary }}
              />
            </div>
            <div className="mt-1 text-right text-[11px]" style={{ color: '#9992AD' }}>{profileCompletion}%</div>
            <Link
              to={profileEditRoute}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white"
              style={{ background: primary }}
            >
              Complete Profile <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* User chip */}
        <div className="relative mt-4">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white" style={{ background: primary }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs font-medium leading-tight" style={{ color: C.ink }}>{user?.full_name}</div>
              <div className="text-[11px] capitalize leading-tight" style={{ color: C.inkFaint }}>{user?.role}</div>
            </div>
            <ChevronDown size={14} style={{ color: C.inkFaint }} />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border py-1 shadow-lg" style={{ background: C.card, borderColor: C.line }}>
              <Link to={profileViewRoute} className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: C.ink }} onClick={() => setMenuOpen(false)}>
                <Settings size={13} /> Edit profile
              </Link>
              <button
                onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
                style={{ color: C.ink }}
              >
                <LogOut size={13} /> Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 md:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: C.surface }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: C.ink }}>
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: C.inkSoft }}>
              {role === 'creator' ? "Let's get your first collab started." : "Let's get your first campaign launched."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:flex" style={{ borderColor: C.line, background: C.card, color: C.inkFaint }}>
              <Search size={14} /> Search anything…
            </div>
            <button aria-label="Notifications" style={{ color: C.inkSoft }}>
              <Bell size={19} />
            </button>
            <Link
              to={role === 'creator' ? '/campaigns' : '/campaigns/new'}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
              style={{ background: primary }}
            >
              <Plus size={15} /> {role === 'creator' ? 'Apply' : 'New Campaign'}
            </Link>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-5 px-6 pb-10 lg:grid-cols-[1fr_320px]">
          <div>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl border p-4" style={{ borderColor: C.line, background: C.card }}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${s.color}1A`, color: s.color }}>
                      <Icon size={17} />
                    </div>
                    <div className="mt-3 text-xl font-bold" style={{ color: C.ink }}>{s.value}</div>
                    <div className="text-xs" style={{ color: C.inkSoft }}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Onboarding spotlight */}
            <div className="relative mt-5 overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(120deg, #15111F 40%, #241D38 100%)' }}>
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full opacity-50"
                style={{ background: `radial-gradient(circle at 30% 30%, ${primary}, transparent 70%)`, filter: 'blur(10px)' }}
              />
              <div className="relative flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#B8AEE8' }}>
                <CircleDashed size={13} /> Getting started
              </div>
              <h2 className="relative mt-1 text-xl font-bold text-white">{spotlight.title}</h2>
              <p className="relative mt-1 text-sm" style={{ color: '#B7B0C9' }}>{spotlight.sub}</p>
              <Link
                to={spotlight.ctaTo}
                className="relative mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: primary }}
              >
                {spotlight.cta} <ArrowRight size={14} />
              </Link>
            </div>

            {/* Quick actions + recent activity */}
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[220px_1fr]">
              <div className="rounded-xl border p-4" style={{ borderColor: C.line, background: C.card }}>
                <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Quick Actions</h3>
                <div className="mt-3 flex flex-col gap-2">
                  {quickActions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Link key={a.label} to={a.to} className="flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium" style={{ borderColor: C.line, color: C.ink }}>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: `${a.color}1A`, color: a.color }}>
                          <Icon size={14} />
                        </div>
                        {a.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ borderColor: C.line, background: C.card }}>
                <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Recent Activity</h3>
                <div className="mt-6 flex flex-col items-center justify-center py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: primarySoft, color: primary }}>
                    <CircleDashed size={18} />
                  </div>
                  <div className="mt-3 text-xs font-medium" style={{ color: C.ink }}>Nothing here yet</div>
                  <p className="mt-1 max-w-[220px] text-[11px]" style={{ color: C.inkFaint }}>
                    {role === 'creator'
                      ? 'Applications, messages, and status updates will show up here.'
                      : 'New applications and deliverable updates will show up here.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <aside className="flex flex-col gap-5">
            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Application Status</h3>
                <span className="text-[11px]" style={{ color: C.inkFaint }}>This month</span>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <Donut segments={statusSegments} />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {statusSegments.map((seg) => (
                  <div key={seg.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2" style={{ color: C.inkSoft }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                      {seg.label}
                    </span>
                    <span className="font-medium" style={{ color: C.ink }}>{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ borderColor: C.line, background: C.card }}>
              <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Getting Started</h3>
              <div className="mt-3 flex flex-col gap-3">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 text-xs">
                    {item.done
                      ? <CheckCircle2 size={16} style={{ color: C.mint }} />
                      : <CircleDashed size={16} style={{ color: C.inkFaint }} />}
                    <span style={{ color: item.done ? C.ink : C.inkSoft, textDecoration: item.done ? 'line-through' : 'none' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};
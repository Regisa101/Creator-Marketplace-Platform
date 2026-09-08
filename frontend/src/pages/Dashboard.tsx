// frontend/src/pages/Dashboard.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from '../components/Logo';
import {
  LayoutDashboard, Megaphone, Compass, Inbox, Briefcase, Search, Bell,
  ChevronDown, ChevronRight, LogOut, Settings, Plus, ArrowRight, Send, Eye,
  Wallet, FileText, Users, CircleDashed, CheckCircle2, MessageSquare,
  Calendar, PackageCheck, Bookmark, HelpCircle, ExternalLink,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getApplications, getCampaigns, type Application, type Campaign } from '../api/client';

/**
 * /dashboard — restyled to match the reference layout: tinted stat
 * cards, a light "campaign spotlight" card (falls back to the dark
 * getting-started prompt when there's nothing to show yet), a two-up
 * "My Campaigns / My Applications" + "Recent Activity" row, and a
 * right rail with a real Application Status donut, a "Quick Tasks"
 * list, and a discovery promo card.
 *
 * IMPORTANT: still renders REAL zero-state, not sample data. Numbers
 * and list items come from the same `applications` / `ownCampaigns`
 * fetches as before — nothing here is hardcoded to match the
 * reference screenshot's sample numbers. Two small honesty notes vs.
 * the reference image:
 *   - the reference shows deltas like "↑ 1 this month" on stat cards;
 *     there's no history/analytics endpoint backing that yet, so
 *     those are short status captions instead of fabricated deltas.
 *   - the reference's Application Status donut has a "Draft" segment;
 *     the Application type only has accepted/pending/rejected, so
 *     that segment is labeled "Rejected" here instead of invented.
 *
 * FONT: the logo uses League Spartan. Add it once, globally, e.g. in
 * index.html:
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600&display=swap" rel="stylesheet">
 * or `npm install @fontsource/league-spartan` and import the 500/600 weights.
 */

// Brand palette — matches Landing.tsx / CreatorOnboarding.tsx / AuthLayout.tsx
// (navy #1E2A78 + coral #FF6B5A). Keeping the keys named `violet`/`coral`
// rather than renaming them, since they're referenced ~20+ times below —
// only the hex values changed, to bring this page onto the same theme as
// the rest of the site.
const C = {
  sidebar: '#FFFFFF',
  sidebarBorder: '#EAE7F2',
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  violet: '#1E2A78',       // business primary — brand navy
  violetSoft: '#F2F4FC',
  coral: '#FF6B5A',        // creator primary — brand coral
  coralSoft: '#FFF4F2',
  mint: '#22C55E',
  mintSoft: '#EAFBF1',
  sky: '#38BDF8',
  skySoft: '#EAF8FE',
  amber: '#F59E0B',
  amberSoft: '#FEF6E7',
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
        <span className="text-[10px]" style={{ color: C.inkFaint }}>Total</span>
      </div>
    </div>
  );
};

// Small helper — status string -> display label + color, used by
// both the campaign spotlight and the "My Campaigns" list so the two
// stay visually consistent.
function statusMeta(status: string | undefined) {
  switch (status) {
    case 'published':
    case 'in_progress':
      return { label: 'In progress', color: C.mint, bg: C.mintSoft };
    case 'in_review':
    case 'review':
      return { label: 'In review', color: C.sky, bg: C.skySoft };
    case 'draft':
      return { label: 'Draft', color: C.inkFaint, bg: C.line };
    case 'completed':
      return { label: 'Completed', color: C.violet, bg: C.violetSoft };
    default:
      return { label: status || 'Active', color: C.inkSoft, bg: C.line };
  }
}

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Campaign Defaults nudge dismissal — persisted so it doesn't
  // reappear every visit once someone's closed it.
  const [defaultsHintDismissed, setDefaultsHintDismissed] = useState(
    () => localStorage.getItem('ck_defaults_hint_dismissed') === '1'
  );
  const dismissDefaultsHint = () => {
    localStorage.setItem('ck_defaults_hint_dismissed', '1');
    setDefaultsHintDismissed(true);
  };
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

  // Backs the top stat cards, the campaign spotlight, and the "My
  // Campaigns" list below. GET /api/applications is already
  // role-scoped server-side (creators get their own, businesses get
  // applicants to their campaigns), so no extra filtering needed here.
  // GET /api/campaigns is the same for the business "Active Campaigns"
  // count and list. There's deliberately no "Profile Views" / "Earnings"
  // / "Deliverables Due" / "Spend" fetch — those have no backing model
  // anywhere in the API yet (no analytics, payments, or deliverable
  // tracking), so those cards stay at their zero-state below rather
  // than being wired to numbers that don't exist.
  const [applications, setApplications] = useState<Application[]>([]);
  const [ownCampaigns, setOwnCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const apps = await getApplications();
        if (!cancelled) setApplications(apps);
      } catch (err) {
        console.error('Could not load applications for dashboard stats:', err);
      }

      if (role === 'business') {
        try {
          const data = await getCampaigns({ limit: 50 });
          if (!cancelled) setOwnCampaigns(data.campaigns);
        } catch (err) {
          console.error('Could not load campaigns for dashboard stats:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role]);

  const acceptedApplications = applications.filter((a) => a.status === 'accepted');
  const pendingApplications = applications.filter((a) => a.status === 'pending');
  const rejectedApplications = applications.filter((a) => a.status === 'rejected');

  const activeCollabsCount = acceptedApplications.length;
  const activeCampaigns = ownCampaigns.filter(
    (c) => c.status === 'published' || c.status === 'in_progress'
  );
  const activeCampaignsCount = activeCampaigns.length;

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
        { label: 'Saved Campaigns', icon: Bookmark, to: '/saved' },
        { label: 'Workspace', icon: Briefcase, to: '/workspace', children: WORKSPACE_CHILDREN },
      ]
    : [
        { label: 'Home', icon: LayoutDashboard, active: true, to: '/dashboard' },
        { label: 'My Campaigns', icon: Megaphone, to: '/campaigns' },
        { label: 'Discover Creators', icon: Compass, to: '/creators' },
        { label: 'Applications', icon: Inbox, to: '/applications' },
        { label: 'Workspace', icon: Briefcase, to: '/workspace', children: WORKSPACE_CHILDREN },
      ];

  // Stat cards now carry a tinted background (not just a tinted icon
  // square) plus a short status caption instead of a fabricated
  // period-over-period delta — see file header note.
  const STATS = role === 'creator'
    ? [
        { label: 'Active Collabs', value: activeCollabsCount, icon: Briefcase, color: primary, soft: primarySoft, caption: activeCollabsCount > 0 ? 'In progress' : 'None yet' },
        { label: 'Applications Sent', value: applications.length, icon: Send, color: C.mint, soft: C.mintSoft, caption: pendingApplications.length > 0 ? `${pendingApplications.length} pending` : 'All reviewed' },
        { label: 'Profile Views', value: 0, icon: Eye, color: C.sky, soft: C.skySoft, caption: 'No views yet' },
        { label: 'Earnings this month', value: 'Rs. 0', icon: Wallet, color: C.amber, soft: C.amberSoft, caption: 'No payouts yet' },
      ]
    : [
        { label: 'Active Campaigns', value: activeCampaignsCount, icon: Megaphone, color: primary, soft: primarySoft, caption: activeCampaignsCount > 0 ? 'Live now' : 'None yet' },
        { label: 'Applications Received', value: applications.length, icon: Inbox, color: C.mint, soft: C.mintSoft, caption: pendingApplications.length > 0 ? `${pendingApplications.length} to review` : 'All reviewed' },
        { label: 'Deliverables Due', value: 0, icon: FileText, color: C.sky, soft: C.skySoft, caption: 'All caught up' },
        { label: 'Spent this month', value: 'Rs. 0', icon: Wallet, color: C.amber, soft: C.amberSoft, caption: 'No expenses yet' },
      ];

  // Campaign spotlight — when there's something real to show (a
  // published campaign for business, an accepted collab for creator)
  // render the light "in progress" card from the reference. Otherwise
  // fall back to the original dark getting-started prompt.
  const spotlightCampaign = role === 'business' ? activeCampaigns[0] : undefined;
  const spotlightCollab = role === 'creator' ? acceptedApplications[0] : undefined;
  const hasSpotlightContent = role === 'business' ? Boolean(spotlightCampaign) : Boolean(spotlightCollab);

  const emptySpotlight = role === 'creator'
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

  // "Quick Tasks" — same underlying checklist as before, restyled as
  // a tappable list (chevron -> route) instead of a static checklist,
  // matching the reference. Each task links somewhere real.
  const quickTasks = role === 'creator'
    ? [
        { label: 'Complete your profile', sub: profileCompletion >= 100 ? 'Profile complete' : `${profileCompletion}% done`, done: profileCompletion >= 100, to: profileEditRoute },
        { label: 'Apply to your first campaign', sub: applications.length > 0 ? `${applications.length} application${applications.length > 1 ? 's' : ''} sent` : 'Browse open campaigns', done: applications.length > 0, to: '/campaigns' },
        { label: 'Get your first application approved', sub: activeCollabsCount > 0 ? `${activeCollabsCount} accepted` : 'Waiting on a response', done: activeCollabsCount > 0, to: '/applications' },
      ]
    : [
        { label: 'Review applications', sub: pendingApplications.length > 0 ? `${pendingApplications.length} new application${pendingApplications.length > 1 ? 's' : ''}` : 'All caught up', done: applications.length > 0 && pendingApplications.length === 0, to: '/applications' },
        { label: 'Publish your first campaign', sub: activeCampaignsCount > 0 ? `${activeCampaignsCount} live` : 'Get started with your brand', done: activeCampaignsCount > 0, to: '/campaigns/new' },
        { label: 'Update your profile', sub: profileCompletion >= 100 ? 'Profile complete' : 'Complete your brand profile', done: profileCompletion >= 100, to: profileEditRoute },
      ];

  // Application Status donut — real counts. The reference screenshot's
  // "Draft" segment doesn't map to anything the Application type has
  // (accepted / pending / rejected), so that slot is "Rejected" here.
  const statusSegments = [
    { value: acceptedApplications.length, color: C.mint, label: 'Approved' },
    { value: pendingApplications.length, color: C.amber, label: 'In review' },
    { value: rejectedApplications.length, color: C.inkFaint, label: 'Rejected' },
  ];

  const discoveryPromo = role === 'creator'
    ? { title: 'Get discovered by the right brands.', sub: 'Complete your portfolio and browse open campaigns that match your niche.', cta: 'Browse campaigns', to: '/campaigns' }
    : { title: 'Get better results with the right creators.', sub: 'Explore our creator database and find perfect matches for your brand.', cta: 'Discover creators', to: '/creators' };

  return (
    <div className="flex min-h-screen" style={{ background: C.surface }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto border-r px-4 py-6 md:flex"
        style={{ background: C.sidebar, borderColor: C.sidebarBorder }}
      >
        <div className="flex items-center gap-2.5 px-2">
          <LogoMark size={28} />
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

        {/* Push the rest of the rail to the bottom, like the reference */}
        <div className="mt-6 flex flex-1 flex-col justify-end gap-4">

          {/* Profile completion promo — percentage/bar reflect the real
              profile data and animate as it changes (see profileCompletion
              above). Hidden once the profile is fully filled in. */}
          {profileCompletion < 100 && (
            <div className="rounded-xl p-4" style={{ background: '#1F1A2E' }}>
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

          {/* Campaign Defaults nudge — points business users at the new
              Settings page. Dismissible (localStorage) rather than tied
              to whether defaults are actually set, since that would
              need an extra profile fetch just for this hint; a one-time
              nudge is enough to make the feature discoverable without
              nagging indefinitely. */}
          {role === 'business' && !defaultsHintDismissed && (
            <div className="rounded-xl p-4" style={{ background: C.violetSoft, border: `1px solid #d7ddf5` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold" style={{ color: C.violet }}>Save time on your next campaign</div>
                <button
                  onClick={() => dismissDefaultsHint()}
                  className="text-[11px] leading-none"
                  style={{ color: '#9992AD' }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-xs" style={{ color: C.inkSoft }}>
                Set your usual Do's, Don'ts &amp; video specs once — they'll auto-fill every new campaign.
              </p>
              <Link
                to="/settings"
                className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold"
                style={{ background: '#fff', color: C.violet, border: `1px solid #d7ddf5` }}
              >
                Set up Campaign Defaults <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* User chip */}
          <div className="relative">
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
                {role === 'business' && (
                  <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: C.ink }} onClick={() => setMenuOpen(false)}>
                    <Settings size={13} /> Settings
                  </Link>
                )}
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
              {role === 'creator' ? "Here's what's happening with your collabs today." : "Here's what's happening with your campaigns today."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:flex" style={{ borderColor: C.line, background: C.card, color: C.inkFaint }}>
              <Search size={14} /> {role === 'creator' ? 'Search campaigns…' : 'Search campaigns, creators…'}
            </div>
            <button aria-label="Notifications" style={{ color: C.inkSoft }}>
              <Bell size={19} />
            </button>
            <Link
              to={role === 'creator' ? '/campaigns' : '/campaigns/new'}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
              style={{ background: '#15111F' }}
            >
              <Plus size={15} /> {role === 'creator' ? 'Apply' : 'New Campaign'}
            </Link>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-5 px-6 pb-10 lg:grid-cols-[1fr_320px]">
          <div>
            {/* Stat cards — tinted background per card, short status
                caption instead of a fabricated delta */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl p-4" style={{ background: s.soft }}>
                  <div className="text-xs font-medium" style={{ color: C.inkSoft }}>{s.label}</div>
                  <div className="mt-2 text-xl font-bold" style={{ color: C.ink }}>{s.value}</div>
                  <div className="mt-1.5 text-[11px] font-medium" style={{ color: s.color }}>{s.caption}</div>
                </div>
              ))}
            </div>

            {/* Campaign / collab spotlight — light "in progress" card
                when there's something real to show, dark
                getting-started prompt otherwise. */}
            {hasSpotlightContent && role === 'business' && spotlightCampaign ? (
              <div className="relative mt-5 overflow-hidden rounded-2xl border p-6 sm:flex sm:items-center sm:justify-between sm:gap-6" style={{ borderColor: C.line, background: '#FBFAFF' }}>
                <div className="max-w-md">
                  <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.mint }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.mint }} />
                    {statusMeta(spotlightCampaign.status).label === 'In progress' ? 'Campaign in progress' : statusMeta(spotlightCampaign.status).label}
                  </div>
                  <h2 className="mt-1 text-xl font-bold" style={{ color: C.ink }}>{spotlightCampaign.title}</h2>
                  {spotlightCampaign.description && (
                    <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>{spotlightCampaign.description}</p>
                  )}
                  <Link
                    to={`/campaigns/${spotlightCampaign.id}`}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ background: '#15111F' }}
                  >
                    View campaign <ArrowRight size={14} />
                  </Link>
                </div>
                {(spotlightCampaign as any).image_url && (
                  <img
                    src={(spotlightCampaign as any).image_url}
                    alt=""
                    className="mt-5 h-40 w-full rounded-xl object-cover sm:mt-0 sm:h-32 sm:w-56"
                  />
                )}
              </div>
            ) : hasSpotlightContent && role === 'creator' && spotlightCollab ? (
              <div className="relative mt-5 overflow-hidden rounded-2xl border p-6" style={{ borderColor: C.line, background: '#FBFAFF' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.mint }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.mint }} />
                  Active collab
                </div>
                <h2 className="mt-1 text-xl font-bold" style={{ color: C.ink }}>{(spotlightCollab as any).campaign_title ?? 'Your accepted campaign'}</h2>
                <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>You're in! Head to your workspace to see deliverables and message the brand.</p>
                <Link
                  to="/workspace/active"
                  className="mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: '#15111F' }}
                >
                  Go to workspace <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="relative mt-5 overflow-hidden rounded-2xl p-6" style={{ background: 'linear-gradient(120deg, #15111F 40%, #241D38 100%)' }}>
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full opacity-50"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${primary}, transparent 70%)`, filter: 'blur(10px)' }}
                />
                <div className="relative flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#B8AEE8' }}>
                  <CircleDashed size={13} /> Getting started
                </div>
                <h2 className="relative mt-1 text-xl font-bold text-white">{emptySpotlight.title}</h2>
                <p className="relative mt-1 text-sm" style={{ color: '#B7B0C9' }}>{emptySpotlight.sub}</p>
                <Link
                  to={emptySpotlight.ctaTo}
                  className="relative mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: primary }}
                >
                  {emptySpotlight.cta} <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* My Campaigns / My Applications + Recent Activity */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-xl border p-4" style={{ borderColor: C.line, background: C.card }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: C.ink }}>
                    {role === 'creator' ? 'My Applications' : 'My Campaigns'}
                  </h3>
                  <Link to={role === 'creator' ? '/applications' : '/campaigns'} className="flex items-center gap-1 text-xs font-medium" style={{ color: primary }}>
                    View all <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {role === 'business' ? (
                    ownCampaigns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: primarySoft, color: primary }}>
                          <Megaphone size={16} />
                        </div>
                        <p className="mt-2.5 text-xs font-medium" style={{ color: C.ink }}>No campaigns yet</p>
                        <p className="mt-1 max-w-[200px] text-[11px]" style={{ color: C.inkFaint }}>Create your first campaign to start receiving applications.</p>
                      </div>
                    ) : (
                      ownCampaigns.slice(0, 3).map((c) => {
                        const meta = statusMeta(c.status);
                        return (
                          <Link
                            key={c.id}
                            to={`/campaigns/${c.id}`}
                            className="flex items-center gap-3 rounded-lg border p-2.5"
                            style={{ borderColor: C.line }}
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: primarySoft, color: primary }}>
                              {(c as any).image_url ? (
                                <img src={(c as any).image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Megaphone size={16} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold" style={{ color: C.ink }}>{c.title}</div>
                              <div className="mt-0.5 truncate text-[11px]" style={{ color: C.inkFaint }}>
                                {(c as any).creator_count !== undefined ? `${(c as any).creator_count} creators` : meta.label}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                            <ChevronRight size={14} style={{ color: C.inkFaint }} />
                          </Link>
                        );
                      })
                    )
                  ) : applications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: primarySoft, color: primary }}>
                        <Inbox size={16} />
                      </div>
                      <p className="mt-2.5 text-xs font-medium" style={{ color: C.ink }}>No applications yet</p>
                      <p className="mt-1 max-w-[200px] text-[11px]" style={{ color: C.inkFaint }}>Browse campaigns and apply to get your first collab.</p>
                    </div>
                  ) : (
                    applications.slice(0, 3).map((a, i) => {
                      const meta = statusMeta(a.status === 'accepted' ? 'in_progress' : a.status === 'rejected' ? 'draft' : 'in_review');
                      return (
                        <div key={(a as any).id ?? i} className="flex items-center gap-3 rounded-lg border p-2.5" style={{ borderColor: C.line }}>
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: primarySoft, color: primary }}>
                            <Send size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold" style={{ color: C.ink }}>{(a as any).campaign_title ?? 'Campaign application'}</div>
                            <div className="mt-0.5 truncate text-[11px]" style={{ color: C.inkFaint }}>{a.status}</div>
                          </div>
                          <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-4" style={{ borderColor: C.line, background: C.card }}>
                <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Recent Activity</h3>
                {/* No activity/events endpoint exists yet (see comment
                    above the `applications` fetch), so this stays a
                    real empty state rather than sample rows. */}
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

            {/* Quick actions */}
            <div className="mt-5 rounded-xl border p-4" style={{ borderColor: C.line, background: C.card }}>
              <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Quick Actions</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
              <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Quick Tasks</h3>
              <div className="mt-3 flex flex-col gap-1">
                {quickTasks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-2 -mx-2"
                  >
                    {item.done
                      ? <CheckCircle2 size={16} style={{ color: C.mint }} className="shrink-0" />
                      : <CircleDashed size={16} style={{ color: C.inkFaint }} className="shrink-0" />}
                    <span className="min-w-0 flex-1">
                      <div className="text-xs font-medium" style={{ color: C.ink }}>{item.label}</div>
                      <div className="truncate text-[11px]" style={{ color: C.inkFaint }}>{item.sub}</div>
                    </span>
                    <ChevronRight size={14} style={{ color: C.inkFaint }} className="shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: primarySoft }}>
              <h3 className="text-sm font-semibold" style={{ color: C.ink }}>{discoveryPromo.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.inkSoft }}>{discoveryPromo.sub}</p>
              <Link to={discoveryPromo.to} className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: primary }}>
                {discoveryPromo.cta} <ArrowRight size={12} />
              </Link>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};
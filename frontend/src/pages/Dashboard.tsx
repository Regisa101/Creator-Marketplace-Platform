import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { mediaUrl } from '../components/PublicProfileKit';
import {
  getApplications,
  getBusinessAnalytics,
  getBusinessProgress,
  getCampaigns,
  type Application,
  type Campaign,
} from '../api/client';

function money(value?: number | null) {
  return `NPR ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function formatDueDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function campaignStatusLabel(status?: string) {
  switch (status) {
    case 'published': return 'Active';
    case 'draft': return 'Draft';
    case 'closed': return 'Closed';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status || '—';
  }
}

type CampaignTab = 'active' | 'drafts' | 'completed';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Header search box: pressing Enter opens "My campaigns" filtered by the text.
  const [searchText, setSearchText] = useState('');
  const submitSearch = (value: string) => {
    const q = value.trim();
    navigate(q ? `/campaigns?search=${encodeURIComponent(q)}` : '/campaigns');
  };

  // Creator accounts no longer have a dashboard. If an old bookmark,
  // login flow, or onboarding flow sends a creator here, take them back to
  // the public marketplace instead of rendering a creator dashboard.
  const isBusinessUser = !!user && user.role === 'business';

  // The page title is "Welcome, <brand name>" (from the business profile),
  // not the logged-in person's name. Until it loads the title is just "Welcome".
  const [brandName, setBrandName] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  // Real spending, calculated by the backend from paid contracts.
  // null = not loaded (or the request failed) -> the card shows "—".
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [campaignTab, setCampaignTab] = useState<CampaignTab>('active');

  useEffect(() => {
    // Skip fetching entirely for creators or while auth is still loading —
    // this dashboard is business-only. Keeping the check inside the effect
    // (rather than an early return before hooks) keeps hook order stable.
    if (!isBusinessUser) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrors([]);

      // Do NOT use one Promise.all here. A failure in one request must not
      // wipe the entire homepage.
      const results = await Promise.allSettled([
        getCampaigns({ limit: 50 }),
        getApplications(),
        getBusinessAnalytics('all'),
        getBusinessProgress(),
      ]);

      if (cancelled) return;

      const nextErrors: string[] = [];

      if (results[0].status === 'fulfilled') {
        setCampaigns(results[0].value.campaigns || []);
      } else {
        setCampaigns([]);
        nextErrors.push('Campaigns could not be loaded.');
      }

      if (results[1].status === 'fulfilled') {
        setApplications(results[1].value || []);
      } else {
        setApplications([]);
        nextErrors.push('Applications could not be loaded.');
      }

      if (results[2].status === 'fulfilled') {
        setTotalSpent(Number(results[2].value.summary?.total_spent ?? 0));
      } else {
        setTotalSpent(null);
        nextErrors.push('Spending could not be loaded.');
      }

      // The brand name is cosmetic: if this request fails the title simply
      // stays "Welcome" and no error banner is shown.
      if (results[3].status === 'fulfilled') {
        const name = String(results[3].value?.profile?.company_name ?? '').trim();
        if (name) setBrandName(name);
      }

      setErrors(nextErrors);
      setLoading(false);
    }

    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isBusinessUser]);

  const openCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'published'),
    [campaigns]
  );

  const draftCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'draft'),
    [campaigns]
  );

  const closedCampaigns = useMemo(
    () => campaigns.filter((c) => ['closed', 'completed', 'cancelled'].includes(String(c.status))),
    [campaigns]
  );

  // Number of applications received per campaign, used by the campaigns
  // table below (mirrors the "8 applications" / "3 applications" style).
  const applicationCountByCampaign = useMemo(() => {
    const map = new Map<number, number>();
    applications.forEach((application) => {
      map.set(application.campaign_id, (map.get(application.campaign_id) || 0) + 1);
    });
    return map;
  }, [applications]);

  // "In progress" = applications that have moved past pending into an
  // active collaboration (accepted, in progress, or otherwise ongoing).
  // Adjust this list of status values if your Application status field
  // uses different wording.
  const inProgressCount = useMemo(
    () =>
      applications.filter((a) =>
        ['accepted', 'in_progress', 'active', 'ongoing'].includes(String((a as any).status))
      ).length,
    [applications]
  );

  // The applications that are actually waiting for a decision, newest first.
  const pendingApplications = useMemo(
    () =>
      applications
        .filter((a) => String((a as any).status) === 'pending')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [applications]
  );

  const campaignsForTab = useMemo(() => {
    if (campaignTab === 'drafts') return draftCampaigns;
    if (campaignTab === 'completed') return closedCampaigns;
    return openCampaigns;
  }, [campaignTab, openCampaigns, draftCampaigns, closedCampaigns]);

  // All hooks above run unconditionally on every render, so it's safe to
  // branch on `user` here without violating the rules of hooks.
  if (!user) return null;
  if (user.role !== 'business') {
    return <Navigate to="/" replace />;
  }

  // Rendered inside AppLayout's header row, to the right of the
  // brand-name title — not in the page body — so it lines up
  // with the title instead of floating below it.
  const headerActions = (
    <Link className="btn btn-primary" to="/campaigns/new">
      <Plus size={14} />
      Create campaign
    </Link>
  );

  return (
    <AppLayout
      title={brandName ? `Welcome, ${brandName}` : 'Welcome'}
      subtitle="Manage campaigns, review creators and confirm selections."
      showNotifications
      headerActions={headerActions}
      searchValue={searchText}
      onSearchChange={setSearchText}
      onSearchSubmit={submitSearch}
      searchPlaceholder="Search your campaigns…"
    >
      <style>{`
        /*
         * Left/right padding here (24px) matches AppLayout's .app-topbar
         * padding exactly, and margin is 0 (not "0 auto") so this block
         * never re-centers itself — its left edge always lines up with
         * the search box, settings/bell icons, and avatar above it.
         */
        .brand-home{max-width:1180px;margin:0;padding:18px 24px 54px;color:#17151d;background:#ffffff;font-family:'Poppins',sans-serif;font-weight:400}
        .brand-error{margin:0 0 14px;padding:10px 12px;border:1px solid #ead7d7;background:#fff8f8;border-radius:9px;color:#9b4545;font-size:12px}
        .brand-empty{padding:28px 14px;text-align:center;background:#ffffff;border-radius:9px;color:#8d8792;font-size:12px}

        /* =================================================
           OVERVIEW — clickable stat cards
           ================================================= */

        .overview-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 28px;padding:0;background:#fff}
        .overview-item{display:block;padding:16px 18px;border:1px solid #e5e5e5;border-radius:12px;background:#fff;text-decoration:none;color:inherit;text-align:left;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease}
        .overview-item:hover{border-color:#111;box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .overview-item:focus-visible{outline:2px solid #111;outline-offset:2px}
        .overview-value{font-family:'League Spartan',sans-serif;font-size:28px;font-weight:400;letter-spacing:-0.02em;color:#111;line-height:1.1}
        .overview-label{font-size:12px;color:#6b6b6b;margin-top:6px;font-weight:400}

        /* =================================================
           YOUR CAMPAIGNS — tabbed table
           ================================================= */

        .campaigns-section{background:#ffffff;padding:8px 0 0}
        .campaigns-heading{font-family:'League Spartan',sans-serif;font-size:24px;font-weight:400;letter-spacing:-0.02em;margin:0 0 16px;color:#111}
        .campaigns-tabs{display:flex;gap:8px;margin:0 0 8px}
        .campaigns-tabs .campaigns-tab{height:32px;padding:0 14px;border:1px solid #dedede;border-radius:999px;background:#fff;color:#111;font:500 12.5px 'Poppins',sans-serif;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}
        .campaigns-tabs .campaigns-tab:hover{background:#f5f5f5;border-color:#c4c4c4}
        .campaigns-tabs .campaigns-tab.active{background:#197935;color:#fff;border-color:#197935}
        .campaigns-row{display:grid;grid-template-columns:minmax(0,1.7fr) 110px 120px 100px 28px;gap:12px;align-items:center;padding:18px 0;border-top:1px solid #e4e1d9;text-decoration:none;color:inherit}
        .campaigns-row:first-of-type{border-top:0}
        .campaigns-row:hover{background:rgba(0,0,0,.02)}
        .campaign-cell{min-width:0}
        .campaign-title{font-size:15px;font-weight:500;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .campaign-meta{font-size:12px;font-weight:400;color:#777;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .campaign-due{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:400;color:#777;margin-top:6px}
        .campaign-col{font-size:13px;font-weight:500;color:#111}
        .campaign-col-sub{font-size:11px;color:#777;margin-top:3px;font-weight:400}
        .campaign-status{display:inline-flex;align-items:center;padding:5px 11px;border-radius:999px;background:#e9f6ee;color:#1e8a4c;font-size:11px;font-weight:500}
        .campaign-status.draft{background:#f1eef7;color:#62577f}
        .campaign-status.closed{background:#f3f2f4;color:#77717e}
        .campaign-arrow{color:#a29cae;display:flex;align-items:center;justify-content:center}

        @media(max-width:720px){.campaigns-row{grid-template-columns:minmax(0,1fr) 28px}.campaigns-row>.campaign-col{display:none}}
        @media(max-width:760px){.overview-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.brand-home{padding:14px 16px 40px}}

        /* =================================================
           APPLICATIONS — plain text section, no box
           ================================================= */

        .applications-section{margin-top:26px;padding-top:22px;border-top:1px solid #e4e1d9}
        .applications-heading{font-family:'League Spartan',sans-serif;font-size:24px;font-weight:400;letter-spacing:-0.02em;margin:0 0 8px;color:#111}
        .review-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1.3fr) 120px 96px;gap:14px;align-items:center;padding:14px 0;border-top:1px solid #e4e1d9}
        .review-row:first-of-type{border-top:0}
        .review-person{display:flex;align-items:center;gap:12px;min-width:0;text-decoration:none;color:inherit}
        .review-avatar{width:38px;height:38px;border-radius:50%;background:#e9f6ee;color:#1e8a4c;display:grid;place-items:center;font-size:14px;font-weight:600;overflow:hidden;flex:none}
        .review-avatar img{width:100%;height:100%;object-fit:cover}
        .review-name{font-size:14px;font-weight:500;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .review-date{font-size:12px;color:#777;margin-top:2px}
        .review-campaign{font-size:13px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .review-rate{font-size:13px;font-weight:500;color:#111}
        .review-rate small{display:block;font-size:11px;font-weight:400;color:#777;margin-top:2px}
        .review-more{display:inline-block;margin-top:10px;font-size:13px;font-weight:500;color:#197935;text-decoration:none}
        .review-more:hover{text-decoration:underline}
        @media(max-width:720px){.review-row{grid-template-columns:minmax(0,1fr) 88px}.review-campaign,.review-rate{display:none}}
      `}</style>

      <main className="brand-home">
        {errors.length > 0 && (
          <div className="brand-error">
            {errors.join(' ')} The rest of the dashboard is still available.
          </div>
        )}

        <section className="overview-row" aria-label="Overview">
          <Link className="overview-item" to="/campaigns">
            <div className="overview-value">{loading ? '—' : openCampaigns.length}</div>
            <div className="overview-label">Active Campaigns</div>
          </Link>
          <Link className="overview-item" to="/applications">
            <div className="overview-value">{loading ? '—' : pendingApplications.length}</div>
            <div className="overview-label">To Review</div>
          </Link>
          <Link className="overview-item" to="/applications">
            <div className="overview-value">{loading ? '—' : inProgressCount}</div>
            <div className="overview-label">In Progress</div>
          </Link>
          <Link className="overview-item" to="/collab-history">
            <div className="overview-value">
              {loading || totalSpent === null ? '—' : money(totalSpent)}
            </div>
            <div className="overview-label">Total Spent</div>
          </Link>
        </section>

        <section className="campaigns-section" aria-label="Your campaigns">
          <h2 className="campaigns-heading">Your campaigns</h2>

          <div className="campaigns-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`campaigns-tab ${campaignTab === 'active' ? 'active' : ''}`}
              onClick={() => setCampaignTab('active')}
            >
              Active ({openCampaigns.length})
            </button>
            <button
              type="button"
              role="tab"
              className={`campaigns-tab ${campaignTab === 'drafts' ? 'active' : ''}`}
              onClick={() => setCampaignTab('drafts')}
            >
              Drafts ({draftCampaigns.length})
            </button>
            <button
              type="button"
              role="tab"
              className={`campaigns-tab ${campaignTab === 'completed' ? 'active' : ''}`}
              onClick={() => setCampaignTab('completed')}
            >
              Completed ({closedCampaigns.length})
            </button>
          </div>

          {campaignsForTab.length === 0 && !loading ? (
            <div className="brand-empty">No {campaignTab} campaigns yet.</div>
          ) : (
            campaignsForTab.map((campaign) => {
              const c = campaign as any;
              const appCount = applicationCountByCampaign.get(campaign.id) || 0;
              const statusClass =
                campaign.status === 'draft'
                  ? 'draft'
                  : ['closed', 'completed', 'cancelled'].includes(String(campaign.status))
                  ? 'closed'
                  : '';
              const category = c.category || c.niche || c.industry;
              const contentType = c.content_type || c.deliverable_type || c.platform;
              const meta = [category, contentType].filter(Boolean).join(' \u00b7 ');
              const dueDate = formatDueDate(c.due_date || c.deadline || c.end_date);

              return (
                <Link
                  key={campaign.id}
                  className="campaigns-row"
                  to={`/campaigns/${campaign.id}`}
                >
                  <div className="campaign-cell">
                    <div className="campaign-title">{campaign.title}</div>
                    {meta && <div className="campaign-meta">{meta}</div>}
                    {dueDate && (
                      <div className="campaign-due">
                        <Calendar size={11} />
                        Due {dueDate}
                      </div>
                    )}
                  </div>

                  <div className="campaign-col">
                    {appCount || '—'}
                    <div className="campaign-col-sub">Applications</div>
                  </div>

                  <div className="campaign-col">
                    {money(c.budget)}
                    <div className="campaign-col-sub">Budget</div>
                  </div>

                  <div>
                    <span className={`campaign-status ${statusClass}`}>
                      {campaignStatusLabel(campaign.status)}
                    </span>
                  </div>

                  <div className="campaign-arrow">
                    <ArrowRight size={15} />
                  </div>
                </Link>
              );
            })
          )}
        </section>

        {/*
          Plain text section — no card/box. A hairline border-top acts as
          the "dash" separator from the campaigns table above it.
        */}
        <section className="applications-section" aria-label="Applications">
          <h2 className="applications-heading">Applications to review</h2>

          {loading ? (
            <div className="brand-empty">Loading…</div>
          ) : pendingApplications.length === 0 ? (
            <div className="brand-empty">Nothing waiting for review right now.</div>
          ) : (
            <>
              {pendingApplications.slice(0, 5).map((app) => {
                const name = app.creator_name || `Creator #${app.creator_id}`;
                const rate = app.rate ?? app.campaign_budget;
                return (
                  <div className="review-row" key={app.id}>
                    <Link className="review-person" to={`/creators/${app.creator_id}`}>
                      <div className="review-avatar">
                        {app.creator_avatar ? (
                          <img src={mediaUrl(app.creator_avatar)} alt="" />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="review-name">{name}</div>
                        <div className="review-date">Applied {formatDueDate(app.created_at) || ''}</div>
                      </div>
                    </Link>

                    <div className="review-campaign">{app.campaign_title || `Campaign #${app.campaign_id}`}</div>

                    <div className="review-rate">
                      {rate != null ? money(rate) : '—'}
                      <small>{app.rate != null ? 'Proposed' : 'Budget'}</small>
                    </div>

                    <Link className="btn btn-primary" to={`/applications?campaign=${app.campaign_id}`}>
                      Review
                    </Link>
                  </div>
                );
              })}

              {pendingApplications.length > 5 && (
                <Link className="review-more" to="/applications">
                  View all {pendingApplications.length} applications
                </Link>
              )}
            </>
          )}
        </section>
      </main>
    </AppLayout>
  );
}

export default Dashboard;
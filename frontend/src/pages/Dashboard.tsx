import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import {
  getApplications,
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

  // Creator accounts no longer have a dashboard. If an old bookmark,
  // login flow, or onboarding flow sends a creator here, take them back to
  // the public marketplace instead of rendering a creator dashboard.
  const isBusinessUser = !!user && user.role === 'business';

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
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

  // Total spent = budget of campaigns that have actually completed, i.e.
  // money that's gone out the door rather than just budgeted/open spend.
  const totalSpent = useMemo(
    () =>
      campaigns
        .filter((c) => c.status === 'completed')
        .reduce((sum, c) => sum + Number((c as any).budget || 0), 0),
    [campaigns]
  );

  // Pending applications are what actually need a business's attention —
  // everything else in the funnel (accepted/rejected/etc.) has already
  // been acted on.
  const pendingCount = useMemo(
    () => applications.filter((a) => String((a as any).status) === 'pending').length,
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
  // "Welcome, {firstName}" title — not in the page body — so it lines up
  // with the title instead of floating below it.
  const headerActions = (
    <Link className="brand-btn primary" to="/campaigns/new">
      <Plus size={14} />
      Create campaign
    </Link>
  );

  return (
    <AppLayout
      title={`Welcome, ${firstName}`}
      subtitle="Manage campaigns, review creators and confirm selections."
      showNotifications
      headerActions={headerActions}
    >
      <style>{`
        /*
         * Left/right padding here (24px) matches AppLayout's .app-topbar
         * padding exactly, and margin is 0 (not "0 auto") so this block
         * never re-centers itself — its left edge always lines up with
         * the search box, settings/bell icons, and avatar above it.
         */
        .brand-home{max-width:1180px;margin:0;padding:18px 24px 54px;color:#17151d;background:#ffffff;font-family:'Poppins',sans-serif;font-weight:400}
        .brand-btn{height:36px;padding:0 15px;border-radius:9px;border:1px solid #ddd9e3;background:#fff;color:#27232f;font-size:13px;font-weight:500;text-decoration:none;display:inline-flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap}
        .brand-btn.primary{background:#111;color:#fff;border-color:#111}
        .brand-error{margin:0 0 14px;padding:10px 12px;border:1px solid #ead7d7;background:#fff8f8;border-radius:9px;color:#9b4545;font-size:12px}
        .brand-empty{padding:28px 14px;text-align:center;background:#ffffff;border-radius:9px;color:#8d8792;font-size:12px}

        /* =================================================
           OVERVIEW — flat stat row, no card box
           ================================================= */

        .overview-row{display:flex;flex-wrap:wrap;margin:0 0 24px;padding:18px 0;background:#ffffff;border-top:1px solid #e4e1d9;border-bottom:1px solid #e4e1d9}
        .overview-item{flex:1;min-width:120px;padding:0 20px;border-left:1px solid #e4e1d9;display:block;text-decoration:none;color:inherit;background:transparent;border-top:0;border-right:0;border-bottom:0;text-align:left;cursor:pointer;border-radius:6px;transition:background .12s ease}
        .overview-item:first-child{border-left:0;padding-left:0}
        .overview-item:hover{background:rgba(0,0,0,.035)}
        .overview-value{font-family:'League Spartan',sans-serif;font-size:28px;font-weight:400;letter-spacing:-0.02em;color:#111;line-height:1.1}
        .overview-label{font-size:12px;color:#6b6b6b;margin-top:6px;font-weight:400}

        /* =================================================
           YOUR CAMPAIGNS — tabbed table
           ================================================= */

        .campaigns-section{background:#ffffff;padding:8px 0 0}
        .campaigns-heading{font-family:'League Spartan',sans-serif;font-size:24px;font-weight:400;letter-spacing:-0.02em;margin:0 0 16px;color:#111}
        .campaigns-tabs{display:flex;gap:20px;border-bottom:1px solid #e4e1d9;margin-bottom:0}
        .campaigns-tabs .campaigns-tab{background:transparent;border:0;padding:0 0 9px;font-size:13px;font-weight:400;color:#6b6b6b;cursor:pointer;border-bottom:1.5px solid transparent}
        .campaigns-tabs .campaigns-tab.active{color:#111111;font-weight:500;border-bottom-color:#111111}
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
        @media(max-width:560px){.brand-home{padding:14px 16px 40px}.overview-item{min-width:45%;border-left:0;margin-bottom:14px}}

        /* =================================================
           APPLICATIONS — plain text section, no box
           ================================================= */

        .applications-section{margin-top:26px;padding-top:22px;border-top:1px solid #e4e1d9}
        .applications-heading{font-family:'League Spartan',sans-serif;font-size:24px;font-weight:400;letter-spacing:-0.02em;margin:0 0 8px;color:#111}
        .applications-review{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#5b5564;text-decoration:none}
        .applications-review:hover{color:#17151d}
        .applications-review .review-arrow{display:inline-flex;align-items:center}
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
            <div className="overview-value">{loading ? '—' : applications.length}</div>
            <div className="overview-label">Applications</div>
          </Link>
          <Link className="overview-item" to="/applications">
            <div className="overview-value">{loading ? '—' : inProgressCount}</div>
            <div className="overview-label">In Progress</div>
          </Link>
          <Link className="overview-item" to="/workspace/history">
            <div className="overview-value">{loading ? '—' : money(totalSpent)}</div>
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
          <h2 className="applications-heading">Applications</h2>
          <Link className="applications-review" to="/applications">
            {loading ? '—' : pendingCount} application{pendingCount === 1 ? '' : 's'} to review
            <span className="review-arrow">
              <ArrowRight size={13} />
            </span>
          </Link>
        </section>
      </main>
    </AppLayout>
  );
}

export default Dashboard;
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, DollarSign, Loader2 } from 'lucide-react';
import { getApplications, updateApplicationStatus, type Application, type ApplicationStatus } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LogoMark, BRAND_NAME, PAGE_GRADIENT_BG } from '../components/Brand';

const VIOLET = '#1E2A78';
const VIOLET_DARK = '#182262';

const TABS: { key: ApplicationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

export function ApplicationsInbox() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('pending');
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (err) {
      console.error('Could not load applications:', err);
      setError('Could not load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (activeTab === 'all' ? applications : applications.filter((a) => a.status === activeTab)),
    [applications, activeTab]
  );

  // Group by campaign so a business managing several campaigns doesn't
  // get one long undifferentiated list.
  const grouped = useMemo(() => {
    const map = new Map<number, { campaignId: number; campaignTitle: string; items: Application[] }>();
    for (const app of filtered) {
      const key = app.campaign_id;
      if (!map.has(key)) {
        map.set(key, { campaignId: key, campaignTitle: app.campaign_title || `Campaign #${key}`, items: [] });
      }
      map.get(key)!.items.push(app);
    }
    return Array.from(map.values());
  }, [filtered]);

  const handleAction = async (app: Application, status: 'accepted' | 'rejected') => {
    setActingOn(app.id);
    setActionError(null);
    try {
      const updated = await updateApplicationStatus(app.id, status);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err: any) {
      console.error('Could not update application:', err);
      setActionError({
        id: app.id,
        message: err?.response?.data?.detail || 'Could not update this application.',
      });
    } finally {
      setActingOn(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: applications.length, pending: 0, accepted: 0, rejected: 0, withdrawn: 0 };
    for (const a of applications) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [applications]);

  return (
    <div className="ai">
      <style>{`
        .ai {
          --violet: ${VIOLET};
          --violet-dark: ${VIOLET_DARK};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: ${PAGE_GRADIENT_BG};
          color: var(--ink);
        }
        .ai * { box-sizing: border-box; }

        .ai-topbar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .ai-logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 17px; }

        .ai-body { max-width: 880px; margin: 0 auto; padding: 32px 24px 80px; }

        .ai-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-soft);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 0;
          margin-bottom: 16px;
          text-decoration: none;
        }
        .ai-back:hover { color: var(--ink); }

        .ai-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        .ai-sub { font-size: 13.5px; color: var(--ink-soft); margin: 0 0 24px; }

        .ai-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .ai-tab {
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink-soft);
          cursor: pointer;
        }
        .ai-tab--active { background: var(--violet); border-color: var(--violet); color: #fff; }

        .ai-group { margin-bottom: 28px; }
        .ai-group-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--line);
        }
        .ai-group-title a { color: inherit; text-decoration: none; }
        .ai-group-title a:hover { text-decoration: underline; }

        .ai-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 12px;
        }
        .ai-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
        .ai-applicant { display: flex; align-items: center; gap: 10px; }
        .ai-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--violet); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px; flex-shrink: 0;
          object-fit: cover;
        }
        .ai-applicant-name { font-size: 14px; font-weight: 600; }
        .ai-applicant-date { font-size: 12px; color: var(--ink-soft); }

        .ai-status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 999px;
          text-transform: capitalize;
          flex-shrink: 0;
        }
        .ai-status-pill--pending { background: #fff4de; color: #9a6b00; }
        .ai-status-pill--accepted { background: #e6f7ec; color: #1a8a4a; }
        .ai-status-pill--rejected { background: #fdecec; color: #d64545; }
        .ai-status-pill--withdrawn { background: #f1f0f5; color: var(--ink-soft); }

        .ai-proposal { font-size: 13.5px; color: #3d3d42; line-height: 1.65; margin-bottom: 10px; white-space: pre-wrap; }
        .ai-rate { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--violet-dark); margin-bottom: 10px; }
        .ai-message { font-size: 12.5px; color: var(--ink-soft); background: #f7f7fa; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }

        .ai-actions { display: flex; gap: 8px; }
        .ai-accept, .ai-reject {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          border: none;
        }
        .ai-accept { background: #1a8a4a; color: #fff; }
        .ai-reject { background: #fdecec; color: #d64545; }
        .ai-accept:disabled, .ai-reject:disabled { opacity: 0.6; cursor: not-allowed; }
        .ai-action-error { font-size: 12px; color: #d64545; margin-top: 8px; }

        .ai-state { text-align: center; padding: 60px 20px; color: var(--ink-soft); }
        .ai-spin { animation: ai-spin 0.8s linear infinite; }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ai-topbar">
        <span className="ai-logo"><LogoMark size={20} /> {BRAND_NAME}</span>
      </div>

      <div className="ai-body">
        <Link to="/campaigns" className="ai-back">
          <ArrowLeft size={15} /> Back to Campaigns
        </Link>

        <h1 className="ai-title">{isBusiness ? 'Applications' : 'My Applications'}</h1>
        <p className="ai-sub">
          {isBusiness
            ? "Review and respond to creators who've applied to your campaigns."
            : "Track the status of campaigns you've applied to."}
        </p>

        <div className="ai-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ai-tab ${activeTab === tab.key ? 'ai-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({counts[tab.key] || 0})
            </button>
          ))}
        </div>

        {loading && <div className="ai-state">Loading applications…</div>}
        {!loading && error && <div className="ai-state">{error}</div>}

        {!loading && !error && grouped.length === 0 && (
          <div className="ai-state">
            No {activeTab !== 'all' ? activeTab : ''} applications{activeTab === 'pending' ? ' right now' : ''}.
          </div>
        )}

        {!loading &&
          !error &&
          grouped.map((group) => (
            <div className="ai-group" key={group.campaignId}>
              <div className="ai-group-title">
                <Link to={`/campaigns/${group.campaignId}`}>{group.campaignTitle}</Link>
              </div>

              {group.items.map((app) => (
                <div className="ai-card" key={app.id}>
                  <div className="ai-card-top">
                    {isBusiness ? (
                      <div className="ai-applicant">
                        {app.creator_avatar ? (
                          <img className="ai-avatar" src={app.creator_avatar} alt={app.creator_name || 'Creator'} />
                        ) : (
                          <div className="ai-avatar">{(app.creator_name || 'C')[0].toUpperCase()}</div>
                        )}
                        <div>
                          <div className="ai-applicant-name">{app.creator_name || `Creator #${app.creator_id}`}</div>
                          <div className="ai-applicant-date">
                            Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="ai-applicant-date">
                        Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <span className={`ai-status-pill ai-status-pill--${app.status}`}>{app.status}</span>
                  </div>

                  <div className="ai-proposal">{app.proposal}</div>

                  {app.rate != null && (
                    <div className="ai-rate">
                      <DollarSign size={13} /> Rs. {app.rate.toLocaleString()}
                    </div>
                  )}

                  {app.message && <div className="ai-message">{app.message}</div>}

                  {isBusiness && app.status === 'pending' && (
                    <div className="ai-actions">
                      <button
                        className="ai-accept"
                        disabled={actingOn === app.id}
                        onClick={() => handleAction(app, 'accepted')}
                      >
                        {actingOn === app.id ? <Loader2 size={14} className="ai-spin" /> : <Check size={14} />}
                        Accept
                      </button>
                      <button
                        className="ai-reject"
                        disabled={actingOn === app.id}
                        onClick={() => handleAction(app, 'rejected')}
                      >
                        {actingOn === app.id ? <Loader2 size={14} className="ai-spin" /> : <X size={14} />}
                        Reject
                      </button>
                    </div>
                  )}

                  {actionError?.id === app.id && <div className="ai-action-error">{actionError.message}</div>}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
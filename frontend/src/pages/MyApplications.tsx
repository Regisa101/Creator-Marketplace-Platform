import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getApplicationTracker,
  withdrawApplication,
  type ApplicationTracker,
  type TrackerApplication,
  type TrackerStatusGroup,
} from '../api/client';
import { PublicNavbar } from '../components/PublicNavbar';

type Filter = 'all' | TrackerStatusGroup;
type Sort = 'newest' | 'oldest';

const GROUP_LABEL: Record<TrackerStatusGroup, string> = {
  under_review: 'Under review',
  accepted: 'Accepted',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn',
};

// Readable label for the exact backend value; falls back to the bucket label.
function statusLabel(a: TrackerApplication) {
  switch (a.raw_status) {
    case 'pending': return 'Pending review';
    case 'selected': return 'Contract in progress';
    case 'completed': return 'Completed';
    default: return GROUP_LABEL[a.status_group];
  }
}

function dateLabel(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function BrandAvatar({ name, logo }: { name?: string | null; logo?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return <img className="ma-logo" src={logo} alt="" onError={() => setFailed(true)} />;
  }
  return <span className="ma-logo ma-logo--fallback">{(name || '?').trim().charAt(0).toUpperCase()}</span>;
}

export function MyApplications() {
  const [data, setData] = useState<ApplicationTracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await getApplicationTracker('newest'));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load your applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleWithdraw = async (id: number) => {
    setBusyId(id);
    setActionError('');
    try {
      await withdrawApplication(id);
      setConfirmId(null);
      await load(); // re-read from the server so counts stay accurate
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Could not withdraw this application.');
      setConfirmId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const all = data?.applications ?? [];
  const summary = data?.summary;

  const visible = useMemo(() => {
    const list = filter === 'all' ? all : all.filter((a) => a.status_group === filter);
    const sorted = [...list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return sort === 'newest' ? sorted.reverse() : sorted;
  }, [all, filter, sort]);

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: summary?.total ?? 0 },
    { key: 'under_review', label: 'Pending / under review', count: summary?.under_review ?? 0 },
    { key: 'accepted', label: 'Accepted', count: summary?.accepted ?? 0 },
    { key: 'rejected', label: 'Rejected', count: summary?.rejected ?? 0 },
    { key: 'withdrawn', label: 'Withdrawn', count: summary?.withdrawn ?? 0 },
  ];

  return (
    <div className="ma-page">
      <style>{`
        .ma-page{min-height:100vh;background:#fcfaf9;font-family:Poppins,sans-serif;color:#111}
        .ma-wrap{max-width:980px;margin:0 auto;padding:100px 24px 60px}
        .ma-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:18px;flex-wrap:wrap}
        .ma-head h1{margin:0;font:600 24px 'League Spartan',Poppins,sans-serif;letter-spacing:-.02em}
        .ma-head p{margin:4px 0 0;font-size:12px;color:#777}
        .ma-back{font-size:12px;color:#111;text-decoration:underline;text-underline-offset:3px}
        .ma-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
        .ma-stat{background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:16px 18px}
        .ma-stat span{display:block;font-size:12px;font-weight:500;color:#666}
        .ma-stat strong{display:block;margin-top:8px;font:600 22px Poppins,sans-serif}
        .ma-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        .ma-tabs{display:flex;gap:8px;flex-wrap:wrap}
        .ma-tab{border:1px solid #ddd;background:#fff;border-radius:99px;padding:7px 14px;font:500 11.5px Poppins,sans-serif;color:#444;cursor:pointer}
        .ma-tab.is-active{background:#197935;border-color:#197935;color:#fff}
        .ma-sort{border:1px solid #ddd;background:#fff;border-radius:9px;padding:7px 10px;font:500 11.5px Poppins,sans-serif;color:#444}
        .ma-list{display:flex;flex-direction:column;gap:10px}
        .ma-item{display:flex;gap:14px;align-items:center;background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:16px 18px}
        .ma-item:hover{border-color:#cfcfcf;box-shadow:0 12px 24px -16px rgba(0,0,0,.2)}
        .ma-logo{width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0;background:#f1f1f1}
        .ma-logo--fallback{display:inline-flex;align-items:center;justify-content:center;font:600 16px Poppins,sans-serif;color:#555}
        .ma-main{flex:1;min-width:0}
        .ma-title{font:500 14px Poppins,sans-serif;color:#111;text-decoration:none}
        .ma-title:hover{text-decoration:underline}
        .ma-brand{display:block;font-size:11.5px;color:#777;margin-top:2px}
        .ma-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
        .ma-chip{font-size:10.5px;padding:3px 9px;border-radius:99px;background:#f3f1ef;color:#333;font-weight:500}
        .ma-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0}
        .ma-date{font-size:11px;color:#888}
        .ma-status{font-size:11px;font-weight:500;padding:4px 11px;border-radius:99px;background:#f1f1f1;color:#333;white-space:nowrap}
        .ma-status--accepted{background:#e7f6ec;color:#1e8a4c}
        .ma-status--rejected,.ma-status--withdrawn{background:#f6eaea;color:#a33}
        .ma-status--under_review{background:#fff6e5;color:#9a6a08}
        .ma-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
        .ma-link{font-size:11.5px;font-weight:500;color:#197935;text-decoration:none}
        .ma-link:hover{text-decoration:underline}
        .ma-ghost{border:1px solid #ddd;background:#fff;border-radius:8px;padding:5px 11px;font:500 11px Poppins,sans-serif;color:#a33;cursor:pointer}
        .ma-ghost:hover{background:#fbf3f3}
        .ma-ghost:disabled{opacity:.6;cursor:default}
        .ma-state{text-align:center;padding:50px 20px;color:#777;font-size:12.5px;border:1.5px dashed #ddd;border-radius:16px}
        .ma-error{background:#fbf3f3;border:1px solid #f0d4d4;color:#a33;border-radius:10px;padding:10px 14px;font-size:12px;margin-bottom:14px}
        .ma-btn{display:inline-flex;margin-top:14px;min-height:38px;align-items:center;padding:0 16px;border-radius:9px;background:#197935;color:#fff;font:500 12px Poppins,sans-serif;text-decoration:none}
        .ma-btn:hover{color:#fff;background:#15672d}
        @media(max-width:760px){.ma-stats{grid-template-columns:repeat(2,1fr)}.ma-item{flex-direction:column;align-items:flex-start}.ma-side{align-items:flex-start;width:100%}.ma-actions{justify-content:flex-start}}
      `}</style>

      <PublicNavbar />

      <div className="ma-wrap">
        <div className="ma-head">
          <div>
            <h1>Application Tracker</h1>
            <p>Every campaign you have applied to, and where each one stands.</p>
          </div>
          <Link to="/dashboard" className="ma-back">Back to dashboard</Link>
        </div>

        <div className="ma-stats">
          <div className="ma-stat"><span>Total applications</span><strong>{summary?.total ?? 0}</strong></div>
          <div className="ma-stat"><span>Pending / under review</span><strong>{summary?.under_review ?? 0}</strong></div>
          <div className="ma-stat"><span>Accepted</span><strong>{summary?.accepted ?? 0}</strong></div>
          <div className="ma-stat"><span>Rejected</span><strong>{summary?.rejected ?? 0}</strong></div>
        </div>

        <div className="ma-toolbar">
          <div className="ma-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={filter === t.key}
                className={`ma-tab${filter === t.key ? ' is-active' : ''}`}
                onClick={() => setFilter(t.key)}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          <select
            className="ma-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort applications"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {actionError && <div className="ma-error">{actionError}</div>}
        {loading && <div className="ma-state">Loading your applications…</div>}
        {!loading && error && <div className="ma-state">{error}</div>}

        {!loading && !error && visible.length === 0 && (
          <div className="ma-state">
            {all.length === 0 ? 'You have not applied to any campaign yet.' : 'No applications in this view.'}
            {all.length === 0 && (
              <div><Link to="/campaigns" className="ma-btn">Browse campaigns</Link></div>
            )}
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="ma-list">
            {visible.map((a) => {
              const platforms = a.platforms.length ? a.platforms : a.applied_platform ? [a.applied_platform] : [];
              return (
                <div key={a.id} className="ma-item">
                  <BrandAvatar name={a.brand_name} logo={a.brand_logo} />

                  <div className="ma-main">
                    <Link to={`/campaigns/${a.campaign_id}`} className="ma-title">
                      {a.campaign_title || 'Campaign'}
                    </Link>
                    {a.brand_name && <span className="ma-brand">{a.brand_name}</span>}
                    <div className="ma-meta">
                      {a.campaign_category && <span className="ma-chip">{a.campaign_category}</span>}
                      {platforms.map((p) => <span key={p} className="ma-chip">{p}</span>)}
                      {a.compensation && <span className="ma-chip">{a.compensation}</span>}
                    </div>
                  </div>

                  <div className="ma-side">
                    <span className={`ma-status ma-status--${a.status_group}`}>{statusLabel(a)}</span>
                    <span className="ma-date">Applied {dateLabel(a.created_at)}</span>
                    <div className="ma-actions">
                      <Link to={`/campaigns/${a.campaign_id}`} className="ma-link">View details</Link>
                      {a.status_group !== 'withdrawn' && (
                        <Link to={`/messages?application=${a.id}`} className="ma-link">Message</Link>
                      )}
                      {a.contract_id && (
                        <Link to={`/contracts/${a.contract_id}`} className="ma-link">Open contract</Link>
                      )}
                      {a.can_withdraw && confirmId !== a.id && (
                        <button type="button" className="ma-ghost" onClick={() => setConfirmId(a.id)}>
                          Withdraw
                        </button>
                      )}
                      {a.can_withdraw && confirmId === a.id && (
                        <>
                          <button
                            type="button"
                            className="ma-ghost"
                            disabled={busyId === a.id}
                            onClick={() => handleWithdraw(a.id)}
                          >
                            {busyId === a.id ? 'Withdrawing…' : 'Confirm withdraw'}
                          </button>
                          <button type="button" className="ma-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setConfirmId(null)}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyApplications;
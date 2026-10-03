import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApplications, type Application } from '../api/client';
import { PublicNavbar } from '../components/PublicNavbar';

type Filter = 'all' | 'pending' | 'accepted' | 'rejected';

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Under review';
    case 'selected': return 'Contract in progress';
    case 'accepted': return 'Accepted';
    case 'rejected': return 'Not selected';
    case 'withdrawn': return 'Withdrawn';
    case 'completed': return 'Completed';
    default: return status;
  }
}

function matches(filter: Filter, status: string) {
  if (filter === 'all') return true;
  if (filter === 'pending') return status === 'pending' || status === 'selected';
  if (filter === 'accepted') return status === 'accepted' || status === 'completed';
  return status === 'rejected' || status === 'withdrawn';
}

function dateLabel(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MyApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let alive = true;
    getApplications()
      .then((data) => { if (alive) setApplications(data || []); })
      .catch((err: any) => {
        if (alive) setError(err?.response?.data?.detail || 'Could not load your applications.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const visible = useMemo(
    () => applications.filter((a) => matches(filter, a.status)),
    [applications, filter],
  );

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Under review' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Not selected' },
  ];

  return (
    <div className="ma-page">
      <style>{`
        .ma-page{min-height:100vh;background:#fcfaf9;font-family:Poppins,sans-serif;color:#111}
        .ma-wrap{max-width:900px;margin:0 auto;padding:100px 24px 60px}
        .ma-wrap h1{margin:0;font:600 24px 'League Spartan',Poppins,sans-serif;letter-spacing:-.02em}
        .ma-wrap > p{margin:4px 0 20px;font-size:12px;color:#777}
        .ma-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
        .ma-tab{border:1px solid #ddd;background:#fff;border-radius:99px;padding:7px 15px;font:500 11.5px Poppins,sans-serif;color:#444;cursor:pointer}
        .ma-tab.is-active{background:#111;border-color:#111;color:#fff}
        .ma-list{display:flex;flex-direction:column;gap:10px}
        .ma-item{display:flex;justify-content:space-between;align-items:center;gap:14px;background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:16px 18px;text-decoration:none;color:#111;transition:.18s}
        .ma-item:hover{border-color:#cfcfcf;box-shadow:0 12px 24px -16px rgba(0,0,0,.2)}
        .ma-item strong{display:block;font:500 14px Poppins,sans-serif}
        .ma-item small{font-size:11px;color:#888}
        .ma-status{font-size:11px;font-weight:500;padding:4px 11px;border-radius:99px;background:#f1f1f1;color:#333;white-space:nowrap}
        .ma-status--accepted,.ma-status--completed{background:#e7f6ec;color:#1e8a4c}
        .ma-status--rejected,.ma-status--withdrawn{background:#f6eaea;color:#a33}
        .ma-status--pending,.ma-status--selected{background:#fff6e5;color:#9a6a08}
        .ma-state{text-align:center;padding:50px 20px;color:#777;font-size:12.5px;border:1.5px dashed #ddd;border-radius:16px}
        .ma-btn{display:inline-flex;margin-top:14px;min-height:38px;align-items:center;padding:0 16px;border-radius:9px;background:#111;color:#fff;font:500 12px Poppins,sans-serif;text-decoration:none}
        .ma-btn:hover{color:#fff;background:#000}
      `}</style>

      <PublicNavbar />

      <div className="ma-wrap">
        <h1>My Applications</h1>
        <p>Track every campaign you have applied to.</p>

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
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="ma-state">Loading your applications…</div>}
        {!loading && error && <div className="ma-state">{error}</div>}

        {!loading && !error && visible.length === 0 && (
          <div className="ma-state">
            {applications.length === 0 ? 'You have not applied to any campaign yet.' : 'No applications in this view.'}
            {applications.length === 0 && (
              <div><Link to="/campaigns" className="ma-btn">Browse campaigns</Link></div>
            )}
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="ma-list">
            {visible.map((a) => (
              <Link key={a.id} to={`/campaigns/${a.campaign_id}`} className="ma-item">
                <div>
                  <strong>{a.campaign_title || 'Campaign'}</strong>
                  <small>Applied {dateLabel(a.created_at)}</small>
                </div>
                <span className={`ma-status ma-status--${a.status}`}>{statusLabel(a.status)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyApplications;
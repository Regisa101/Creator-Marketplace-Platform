import { useEffect, useMemo, useState } from 'react';

import { getMyComplaints, getReceivedComplaints } from '../api/client';
import type { MyComplaint, ReceivedComplaint } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { ComplaintModal } from '../components/ComplaintModal';
import { useAuth } from '../context/AuthContext';

const STATUS: Record<string, string> = {
  new: 'Received',
  under_review: 'Under review',
  upheld: 'We took action',
  dismissed: 'Reviewed, no action',
};

const RECEIVED_STATUS: Record<string, string> = {
  new: 'Waiting for review',
  under_review: 'Under review',
  upheld: 'Action taken',
  dismissed: 'Closed, no action',
};

export function MyComplaints() {
  const { user } = useAuth();
  const role = user?.role === 'business' ? 'business' : 'creator';
  const [items, setItems] = useState<MyComplaint[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'sent' | 'received'>('sent');
  const [received, setReceived] = useState<ReceivedComplaint[] | null>(null);

  const load = () =>
    getMyComplaints()
      .then(setItems)
      .catch(() => setError('Could not load your complaints.'));

  useEffect(() => {
    void load();
    getReceivedComplaints().then(setReceived).catch(() => setReceived([]));
  }, []);

  // Search by problem type, who it was about, status or the description.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!items || !q) return items;
    return items.filter((c) =>
      [c.category_label, c.target_name, c.description, STATUS[c.status] ?? c.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  return (
    <AppLayout
      title="Complaints"
      showNotifications
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search complaints"
    >
      <style>{CSS}</style>
      <div className="mc-wrap">
        <div className="mc-top">
          <div className="mc-tabs" role="tablist">
            <button type="button" role="tab" className={`mc-tab${tab === 'sent' ? ' on' : ''}`} onClick={() => setTab('sent')}>
              Sent{items && items.length > 0 ? ` (${items.length})` : ''}
            </button>
            <button type="button" role="tab" className={`mc-tab${tab === 'received' ? ' on' : ''}`} onClick={() => setTab('received')}>
              Received{received && received.length > 0 ? ` (${received.length})` : ''}
            </button>
          </div>
          {tab === 'sent' && (
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Report a problem with CreatorHub</button>
          )}
        </div>

        {error && tab === 'sent' && <div className="mc-error">{error}</div>}

        {tab === 'sent' && (
          <>
            {!items && !error && <div className="mc-empty">Loading…</div>}
            {items && items.length === 0 && <div className="mc-empty">You have not sent any complaints.</div>}
            {items && items.length > 0 && visible && visible.length === 0 && (
              <div className="mc-empty">No complaints match “{query}”.</div>
            )}
            {visible?.map((c) => (
              <section className="mc-card" key={c.id}>
                <div className="mc-row">
                  <strong>{c.category_label}</strong>
                  <span className={`mc-badge mc-${c.status}`}>{STATUS[c.status] ?? c.status}</span>
                </div>
                <div className="mc-meta">About {c.target_name || 'CreatorHub'} · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <p>{c.description}</p>
              </section>
            ))}
          </>
        )}

        {tab === 'received' && (
          <>
            {!received && <div className="mc-empty">Loading…</div>}
            {received && received.length === 0 && <div className="mc-empty">No one has complained about you.</div>}
            {received?.map((c) => (
              <section className="mc-card" key={c.id}>
                <div className="mc-row">
                  <strong>{c.category_label}</strong>
                  <span className={`mc-badge mc-${c.status}`}>{RECEIVED_STATUS[c.status] ?? c.status}</span>
                </div>
                <div className="mc-meta">About {c.about} · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </section>
            ))}
          </>
        )}
      </div>

      <ComplaintModal open={open} onClose={() => setOpen(false)} role={role} onFiled={() => void load()} />
    </AppLayout>
  );
}

const CSS = `
.mc-wrap{font-family:Poppins,sans-serif;color:#111;padding:0 24px 50px;display:flex;flex-direction:column;gap:14px}
.mc-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.mc-tabs{display:flex;gap:8px}
.mc-tab{height:34px;padding:0 16px;border:1px solid #ddd;border-radius:999px;background:#fff;color:#333;font:500 12.5px Poppins,sans-serif;cursor:pointer}
.mc-tab:hover{border-color:#bbb}
.mc-tab.on{background:#197935;border-color:#197935;color:#fff}
.mc-card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:16px 18px}
.mc-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.mc-row strong{font:500 13.5px Poppins,sans-serif}
.mc-meta{margin-top:3px;color:#888;font:400 11.5px Poppins,sans-serif}
.mc-card p{margin:10px 0 0;color:#444;font:400 12.5px/1.55 Poppins,sans-serif;white-space:pre-wrap}
.mc-badge{padding:3px 9px;border-radius:999px;background:#f0f0f0;color:#555;font:500 10.5px Poppins,sans-serif}
.mc-under_review{background:#e9f0fb;color:#2456a6}
.mc-upheld{background:#e8f5ee;color:#1f7a4d}
.mc-empty{padding:40px;text-align:center;color:#888;font:400 12.5px Poppins,sans-serif}
.mc-error{padding:12px 14px;border-radius:10px;background:#f8eeee;color:#a52b2b;font:500 12px Poppins,sans-serif}
`;

export default MyComplaints;
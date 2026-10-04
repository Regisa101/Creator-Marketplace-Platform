import { useEffect, useMemo, useState } from 'react';

import { getMyComplaints } from '../api/client';
import type { MyComplaint } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { ComplaintModal } from '../components/ComplaintModal';
import { useAuth } from '../context/AuthContext';

const STATUS: Record<string, string> = {
  new: 'Received',
  under_review: 'Under review',
  upheld: 'We took action',
  dismissed: 'Reviewed, no action',
};

export function MyComplaints() {
  const { user } = useAuth();
  const role = user?.role === 'business' ? 'business' : 'creator';
  const [items, setItems] = useState<MyComplaint[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const load = () =>
    getMyComplaints()
      .then(setItems)
      .catch(() => setError('Could not load your complaints.'));

  useEffect(() => {
    void load();
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
      subtitle="Problems you reported. Only you and CreatorHub admins can see them."
      showNotifications
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search complaints"
    >
      <style>{CSS}</style>
      <div className="mc-wrap">
        <div className="mc-top">
          <p>To report a person, open the contract you shared with them and choose “Report a problem”.</p>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Report a problem with CreatorHub</button>
        </div>

        {error && <div className="mc-error">{error}</div>}
        {!items && !error && <div className="mc-empty">Loading…</div>}
        {items && items.length === 0 && <div className="mc-empty">You have not filed any complaints.</div>}
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
      </div>

      <ComplaintModal open={open} onClose={() => setOpen(false)} role={role} onFiled={() => void load()} />
    </AppLayout>
  );
}

const CSS = `
.mc-wrap{font-family:Poppins,sans-serif;color:#111;padding:0 24px 50px;display:flex;flex-direction:column;gap:14px}
.mc-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.mc-top p{margin:0;color:#777;font:400 12px Poppins,sans-serif}
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
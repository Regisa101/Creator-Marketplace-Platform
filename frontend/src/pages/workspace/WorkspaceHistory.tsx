import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { getCollabHistory, type Collab } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/AppLayout';

export function WorkspaceHistory() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const [history, setHistory] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCollabHistory()
      .then(setHistory)
      .catch((err) => { console.error('Could not load collaboration history:', err); setError('Could not load collaboration history.'); })
      .finally(() => setLoading(false));
  }, []);

  const initials = (name?: string | null) => (name || 'C').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

  return (
    <AppLayout title="Collab History" subtitle="Completed collaborations and collaborations you chose to leave." showSearch={false} showNotifications={false}>
      <style>{`
        .wh-content { padding: 28px 24px 40px; max-width: 900px; margin: 0 auto; }
        .wh-state { text-align:center; padding:60px 20px; color:#6B6478; font-size:13px; }
        .wh-card { background:#fff; border:1px solid #EAE7F2; border-radius:16px; padding:18px 20px; margin-bottom:12px; display:flex; gap:15px; align-items:center; }
        .wh-avatar { width:44px; height:44px; border-radius:50%; object-fit:cover; background:#1E2A78; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; flex:none; }
        .wh-main { flex:1; min-width:0; }
        .wh-title { font-size:14.5px; font-weight:750; color:#1A1625; }
        .wh-sub { font-size:12px; color:#6B6478; margin-top:3px; }
        .wh-meta { font-size:11px; color:#A39DB8; margin-top:5px; }
        .wh-status { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:750; border-radius:999px; padding:6px 10px; flex:none; }
        .wh-status.completed { color:#16834A; background:#EAF8F0; }
        .wh-status.withdrawn { color:#8B5E34; background:#FFF4E7; }
        @keyframes wh-spin { to { transform:rotate(360deg); } }
        .wh-spin { animation:wh-spin .8s linear infinite; }
      `}</style>
      <div className="wh-content">
        {loading && <div className="wh-state"><Loader2 size={20} className="wh-spin" /></div>}
        {!loading && error && <div className="wh-state">{error}</div>}
        {!loading && !error && history.length === 0 && <div className="wh-state">No collaboration history yet. Finished collaborations will appear here automatically.</div>}
        {!loading && !error && history.map((c) => {
          const name = isBusiness ? c.creator_name : c.business_name;
          const avatar = isBusiness ? c.creator_avatar : c.business_logo;
          const completed = c.status === 'completed';
          return (
            <div className="wh-card" key={c.id}>
              {avatar ? <img className="wh-avatar" src={avatar} alt="" /> : <div className="wh-avatar">{initials(name)}</div>}
              <div className="wh-main">
                <div className="wh-title">{c.campaign_title || `Campaign #${c.campaign_id}`}</div>
                <div className="wh-sub">with {name || 'collaborator'}</div>
                <div className="wh-meta">
                  {c.campaign_type === 'gifted' ? 'Gifted · ' : c.rate != null ? `Rs. ${c.rate.toLocaleString()} · ` : ''}
                  {c.approved_deliverables}/{c.total_deliverables} deliverables approved
                  {c.campaign_type !== 'gifted' && c.payment_status === 'completed' ? ' · Paid' : ''}
                </div>
              </div>
              <span className={`wh-status ${completed ? 'completed' : 'withdrawn'}`}>
                {completed ? <CheckCircle2 size={13} /> : <RotateCcw size={13} />}
                {completed ? 'Completed' : 'Left collaboration'}
              </span>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

export default WorkspaceHistory;

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, DollarSign, Loader2, MessageSquare, PackageCheck } from 'lucide-react';
import { getCollabs, type Collab } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/AppLayout';

const C = {
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  navy: '#1E2A78',
  navySoft: '#EEF1FF',
  coral: '#FF6B5A',
  coralSoft: '#FFF4F2',
  green: '#22C55E',
  greenSoft: '#EAFBF1',
};

function initials(name?: string | null) {
  if (!name) return 'C';
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export function WorkspaceActive() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;

  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCollabs()
      .then(setCollabs)
      .catch((err) => {
        console.error('Could not load collaborations:', err);
        setError('Could not load your active collaborations.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout
      title="Active Collabs"
      subtitle="Campaigns you're currently working on together."
      showSearch={false}
      showNotifications={false}
    >
      <style>{`
        .wa-content { padding: 28px 24px 40px; max-width: 900px; margin: 0 auto; }
        .wa-state { text-align: center; padding: 60px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .wa-spin { animation: wa-spin 0.8s linear infinite; }
        @keyframes wa-spin { to { transform: rotate(360deg); } }

        .wa-card {
          background: ${C.card}; border: 1px solid ${C.line}; border-radius: 16px;
          padding: 18px 20px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        }
        .wa-avatar { width: 44px; height: 44px; border-radius: 50%; background: ${primary}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; object-fit: cover; }
        .wa-main { flex: 1; min-width: 180px; }
        .wa-title { font-size: 14.5px; font-weight: 700; color: ${C.ink}; }
        .wa-sub { font-size: 12.5px; color: ${C.inkSoft}; margin-top: 2px; }
        .wa-badge { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; background: ${C.greenSoft}; color: #1a8a4a; }
        .wa-rate { font-size: 12.5px; font-weight: 600; color: ${C.ink}; display: inline-flex; align-items: center; gap: 4px; }
        .wa-pending { font-size: 11.5px; font-weight: 700; color: #9a6b00; background: #fff4de; padding: 4px 10px; border-radius: 999px; }

        .wa-links { display: flex; gap: 8px; }
        .wa-link { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.ink}; text-decoration: none; border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 12px; }
        .wa-link:hover { background: ${C.surface}; }
      `}</style>

      <div className="wa-content">
        {loading && <div className="wa-state"><Loader2 size={20} className="wa-spin" /></div>}
        {!loading && error && <div className="wa-state">{error}</div>}
        {!loading && !error && collabs.length === 0 && (
          <div className="wa-state">
            No active collaborations yet. {isBusiness ? 'Accept an application to get started.' : 'Once a business accepts your application, it will show up here.'}
          </div>
        )}

        {!loading && !error && collabs.map((collab) => {
          const name = isBusiness ? collab.creator_name : collab.business_name;
          const avatar = isBusiness ? collab.creator_avatar : collab.business_logo;
          return (
            <div className="wa-card" key={collab.id}>
              {avatar ? (
                <img className="wa-avatar" src={avatar} alt={name || ''} />
              ) : (
                <div className="wa-avatar">{initials(name)}</div>
              )}

              <div className="wa-main">
                <div className="wa-title">{collab.campaign_title || `Campaign #${collab.campaign_id}`}</div>
                <div className="wa-sub">with {name || 'your collaborator'}</div>
              </div>

              {collab.rate != null && (
                <div className="wa-rate"><DollarSign size={13} /> Rs. {collab.rate.toLocaleString()}</div>
              )}

              {collab.pending_deliverables > 0 && (
                <div className="wa-pending">{collab.pending_deliverables} deliverable{collab.pending_deliverables === 1 ? '' : 's'} due</div>
              )}

              <span className="wa-badge">Active</span>

              <div className="wa-links">
                <Link className="wa-link" to={`/workspace/messages?collab=${collab.id}`}>
                  <MessageSquare size={13} /> Messages
                </Link>
                <Link className="wa-link" to={`/workspace/calendar?collab=${collab.id}`}>
                  <Calendar size={13} /> Calendar
                </Link>
                <Link className="wa-link" to={`/workspace/deliverables?collab=${collab.id}`}>
                  <PackageCheck size={13} /> Deliverables
                </Link>
                <Link className="wa-link" to={`/campaigns/${collab.campaign_id}`}>
                  Campaign
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

export default WorkspaceActive;

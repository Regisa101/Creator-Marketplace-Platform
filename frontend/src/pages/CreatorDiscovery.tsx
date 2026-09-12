import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Loader2, MapPin, Send, Star, X } from 'lucide-react';
import {
  getCreators,
  shortlistCreator,
  unshortlistCreator,
  inviteCreator,
  getCampaigns,
  type CreatorListItem,
  type Campaign,
} from '../api/client';
import { AppLayout } from '../components/AppLayout';

const C = {
  surface: '#FBF8F4',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  navy: '#7661A1',
  navySoft: '#F0EBF6',
  coral: '#F47C78',
  coralSoft: '#FDEBE9',
};

const CATEGORIES = [
  'Beauty', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness',
  'Travel', 'Gaming', 'Education', 'Finance', 'Wellness',
  'Skincare', 'Home Decor', 'Parenting', 'Entertainment',
];

function initials(name?: string | null) {
  if (!name) return 'C';
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export function CreatorDiscovery() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const [creators, setCreators] = useState<CreatorListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [busyId, setBusyId] = useState<number | null>(null);
  const [inviteTarget, setInviteTarget] = useState<CreatorListItem | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCreators({
        search: search.trim() || undefined,
        category: category || undefined,
        page,
        limit: 12,
      });
      setCreators(data.creators);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Could not load creators:', err);
      setError('Could not load creators. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, page]);

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  const toggleShortlist = async (creator: CreatorListItem) => {
    setBusyId(creator.id);
    try {
      if (creator.is_shortlisted) {
        await unshortlistCreator(creator.id);
      } else {
        await shortlistCreator(creator.id);
      }
      setCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, is_shortlisted: !c.is_shortlisted } : c))
      );
    } catch (err) {
      console.error('Could not update shortlist:', err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout
      title="Discover Creators"
      subtitle="Search and filter creators to shortlist or invite to your campaigns."
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search creators by name or bio…"
    >
      <style>{`
        .cd-content { padding: 28px 24px 40px; max-width: 1100px; margin: 0 auto; }
        .cd-filters { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; align-items: center; }
        .cd-chip {
          font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 999px;
          border: 1px solid ${C.line}; background: ${C.card}; color: ${C.inkSoft}; cursor: pointer;
        }
        .cd-chip--active { background: ${C.navy}; border-color: ${C.navy}; color: #fff; }
        .cd-count { font-size: 12.5px; color: ${C.inkSoft}; margin-left: auto; }

        .cd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
        .cd-card {
          background: ${C.card}; border: 1px solid ${C.line}; border-radius: 16px;
          padding: 18px; display: flex; flex-direction: column; gap: 10px;
        }
        .cd-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .cd-avatar-wrap { display: flex; align-items: center; gap: 10px; }
        .cd-avatar {
          width: 46px; height: 46px; border-radius: 50%; background: ${C.navy}; color: #fff;
          display: flex; align-items: center; justify-content: center; font-weight: 700;
          font-size: 16px; flex-shrink: 0; object-fit: cover;
        }
        .cd-name { font-size: 14.5px; font-weight: 700; color: ${C.ink}; }
        .cd-username { font-size: 12px; color: ${C.inkSoft}; }
        .cd-rating { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: ${C.ink}; margin-top: 2px; }
        .cd-rating-count { color: ${C.inkSoft}; font-weight: 500; }
        .cd-heart {
          border: none; background: transparent; cursor: pointer; color: ${C.inkFaint};
          padding: 4px; border-radius: 8px; flex-shrink: 0;
        }
        .cd-heart--active { color: ${C.coral}; }
        .cd-heart:disabled { opacity: 0.5; cursor: not-allowed; }

        .cd-location { display: flex; align-items: center; gap: 5px; font-size: 12px; color: ${C.inkSoft}; }
        .cd-bio { font-size: 12.5px; color: #3d3d42; line-height: 1.55; min-height: 34px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .cd-tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .cd-tag { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: ${C.navySoft}; color: ${C.navy}; }

        .cd-price { font-size: 12.5px; font-weight: 600; color: ${C.ink}; }

        .cd-actions { display: flex; gap: 8px; margin-top: auto; }
        .cd-view, .cd-invite {
          flex: 1; text-align: center; font-size: 12.5px; font-weight: 600; padding: 9px 10px;
          border-radius: 8px; cursor: pointer; text-decoration: none; border: 1px solid ${C.line};
        }
        .cd-view { color: ${C.ink}; background: ${C.card}; }
        .cd-invite { color: #fff; background: ${C.navy}; border-color: ${C.navy}; display: inline-flex; align-items: center; justify-content: center; gap: 5px; }

        .cd-state { text-align: center; padding: 60px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .cd-spin { animation: cd-spin 0.8s linear infinite; }
        @keyframes cd-spin { to { transform: rotate(360deg); } }

        .cd-pagination { display: flex; justify-content: center; gap: 8px; margin-top: 28px; }
        .cd-page-btn {
          font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px;
          border: 1px solid ${C.line}; background: ${C.card}; color: ${C.ink}; cursor: pointer;
        }
        .cd-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .cd-page-btn--active { background: ${C.navy}; border-color: ${C.navy}; color: #fff; }

        .cd-modal-backdrop {
          position: fixed; inset: 0; background: rgba(26,22,37,0.5); z-index: 100;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .cd-modal {
          background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 420px;
        }
        .cd-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .cd-modal-head h3 { font-size: 16px; font-weight: 700; color: ${C.ink}; margin: 0; }
        .cd-modal-close { border: none; background: transparent; cursor: pointer; color: ${C.inkSoft}; }
        .cd-modal-label { font-size: 12.5px; font-weight: 600; color: ${C.ink}; margin: 12px 0 6px; display: block; }
        .cd-modal select, .cd-modal textarea {
          width: 100%; border: 1px solid ${C.line}; border-radius: 8px; padding: 10px 12px;
          font: 13px/1.5 -apple-system, sans-serif; color: ${C.ink}; resize: vertical;
        }
        .cd-modal-submit {
          width: 100%; margin-top: 16px; background: ${C.navy}; color: #fff; border: none;
          border-radius: 8px; padding: 11px; font-size: 13.5px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .cd-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .cd-modal-error { font-size: 12px; color: #d64545; margin-top: 8px; }
        .cd-modal-success { font-size: 13px; color: #1a8a4a; text-align: center; padding: 10px 0; }
      `}</style>

      <div className="cd-content">
        <div className="cd-filters">
          <button className={`cd-chip ${category === '' ? 'cd-chip--active' : ''}`} onClick={() => setCategory('')}>
            All niches
          </button>
          {CATEGORIES.slice(0, 8).map((cat) => (
            <button
              key={cat}
              className={`cd-chip ${category === cat ? 'cd-chip--active' : ''}`}
              onClick={() => setCategory(cat === category ? '' : cat)}
            >
              {cat}
            </button>
          ))}
          {!loading && !error && <span className="cd-count">{total} creator{total === 1 ? '' : 's'}</span>}
        </div>

        {loading && (
          <div className="cd-state">
            <Loader2 size={20} className="cd-spin" />
          </div>
        )}
        {!loading && error && <div className="cd-state">{error}</div>}
        {!loading && !error && creators.length === 0 && (
          <div className="cd-state">No creators match your search yet.</div>
        )}

        {!loading && !error && creators.length > 0 && (
          <div className="cd-grid">
            {creators.map((creator) => (
              <div className="cd-card" key={creator.id}>
                <div className="cd-card-top">
                  <div className="cd-avatar-wrap">
                    {creator.profile_image ? (
                      <img className="cd-avatar" src={creator.profile_image} alt={creator.display_name || ''} />
                    ) : (
                      <div className="cd-avatar">{initials(creator.display_name)}</div>
                    )}
                    <div>
                      <div className="cd-name">{creator.display_name || 'Creator'}</div>
                      {creator.username && <div className="cd-username">@{creator.username}</div>}
                      {creator.avg_rating != null && (
                        <div className="cd-rating">
                          <Star size={12} fill="#FFB020" color="#FFB020" /> {creator.avg_rating.toFixed(1)}
                          <span className="cd-rating-count">({creator.ratings_count})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className={`cd-heart ${creator.is_shortlisted ? 'cd-heart--active' : ''}`}
                    disabled={busyId === creator.id}
                    onClick={() => toggleShortlist(creator)}
                    aria-label="Shortlist"
                  >
                    <Heart size={18} fill={creator.is_shortlisted ? C.coral : 'none'} />
                  </button>
                </div>

                {creator.location && (
                  <div className="cd-location">
                    <MapPin size={12} /> {creator.location}
                  </div>
                )}

                {creator.bio && <div className="cd-bio">{creator.bio}</div>}

                {creator.categories.length > 0 && (
                  <div className="cd-tags">
                    {creator.categories.slice(0, 3).map((cat) => (
                      <span className="cd-tag" key={cat}>{cat}</span>
                    ))}
                  </div>
                )}

                {creator.starting_price != null && (
                  <div className="cd-price">From Rs. {creator.starting_price.toLocaleString()}</div>
                )}

                <div className="cd-actions">
                  <Link className="cd-view" to={`/creators/${creator.id}`}>View Profile</Link>
                  <button className="cd-invite" onClick={() => setInviteTarget(creator)}>
                    <Send size={13} /> Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && pages > 1 && (
          <div className="cd-pagination">
            <button className="cd-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`cd-page-btn ${p === page ? 'cd-page-btn--active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button className="cd-page-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>

      {inviteTarget && (
        <InviteModal creator={inviteTarget} onClose={() => setInviteTarget(null)} />
      )}
    </AppLayout>
  );
}

function InviteModal({ creator, onClose }: { creator: CreatorListItem; onClose: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getCampaigns({ status: 'published', limit: 50 })
      .then((data) => setCampaigns(data.campaigns))
      .catch((err) => console.error('Could not load campaigns for invite:', err));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await inviteCreator(creator.id, {
        campaign_id: campaignId ? Number(campaignId) : undefined,
        message: message.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      console.error('Could not send invite:', err);
      setError(err?.response?.data?.detail || 'Could not send invite. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cd-modal-backdrop" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-head">
          <h3>Invite {creator.display_name || 'Creator'}</h3>
          <button className="cd-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {success ? (
          <div className="cd-modal-success">Invite sent!</div>
        ) : (
          <>
            <label className="cd-modal-label" htmlFor="cd-invite-campaign">Attach to a campaign (optional)</label>
            <select id="cd-invite-campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">No specific campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <label className="cd-modal-label" htmlFor="cd-invite-message">Message</label>
            <textarea
              id="cd-invite-message"
              rows={4}
              placeholder={`Hi ${creator.display_name || ''}, we'd love to work with you on...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {error && <div className="cd-modal-error">{error}</div>}

            <button className="cd-modal-submit" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 size={15} className="cd-spin" /> : <Send size={14} />}
              Send Invite
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CreatorDiscovery;
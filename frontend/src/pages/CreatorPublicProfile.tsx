import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Loader2, MapPin, Send, Star, X } from 'lucide-react';
import {
  getCreatorProfile,
  shortlistCreator,
  unshortlistCreator,
  inviteCreator,
  getCampaigns,
  type PublicCreatorProfile as PublicCreatorProfileType,
  type Campaign,
} from '../api/client';
import { AppLayout } from '../components/AppLayout';

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
};

function initials(name?: string | null) {
  if (!name) return 'C';
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export function CreatorPublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<PublicCreatorProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shortlistBusy, setShortlistBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getCreatorProfile(id);
      setProfile(data);
    } catch (err) {
      console.error('Could not load creator profile:', err);
      setError('This creator profile could not be found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleShortlist = async () => {
    if (!profile) return;
    setShortlistBusy(true);
    try {
      if (profile.is_shortlisted) {
        await unshortlistCreator(profile.id);
      } else {
        await shortlistCreator(profile.id);
      }
      setProfile({ ...profile, is_shortlisted: !profile.is_shortlisted });
    } catch (err) {
      console.error('Could not update shortlist:', err);
    } finally {
      setShortlistBusy(false);
    }
  };

  return (
    <AppLayout title="Creator Profile" showSearch={false} showNotifications={false}>
      <style>{`
        .cp-content { padding: 28px 24px 40px; max-width: 780px; margin: 0 auto; }
        .cp-state { text-align: center; padding: 60px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .cp-spin { animation: cp-spin 0.8s linear infinite; }
        @keyframes cp-spin { to { transform: rotate(360deg); } }

        .cp-header { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 18px; padding: 26px; display: flex; gap: 18px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; }
        .cp-avatar { width: 76px; height: 76px; border-radius: 50%; background: ${C.navy}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; object-fit: cover; flex-shrink: 0; }
        .cp-name { font-size: 21px; font-weight: 700; color: ${C.ink}; }
        .cp-username { font-size: 13px; color: ${C.inkSoft}; margin-top: 2px; }
        .cp-location { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: ${C.inkSoft}; margin-top: 8px; }
        .cp-rating { display: flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.ink}; margin-top: 8px; }
        .cp-rating-count { color: ${C.inkSoft}; font-weight: 500; }
        .cp-bio { font-size: 13.5px; color: #3d3d42; line-height: 1.6; margin-top: 12px; white-space: pre-wrap; }
        .cp-actions { display: flex; gap: 10px; margin-left: auto; }
        .cp-heart-btn, .cp-invite-btn {
          border-radius: 10px; padding: 10px 18px; font-size: 13.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
        }
        .cp-heart-btn { border: 1px solid ${C.line}; background: ${C.card}; color: ${C.ink}; }
        .cp-heart-btn--active { color: ${C.coral}; border-color: ${C.coral}33; background: #FFF4F2; }
        .cp-invite-btn { border: none; background: ${C.navy}; color: #fff; }

        .cp-section { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 16px; padding: 20px 22px; margin-bottom: 16px; }
        .cp-section h3 { font-size: 14px; font-weight: 700; color: ${C.ink}; margin: 0 0 12px; }
        .cp-tags { display: flex; gap: 8px; flex-wrap: wrap; }
        .cp-tag { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; background: ${C.navySoft}; color: ${C.navy}; }
        .cp-price { font-size: 15px; font-weight: 700; color: ${C.ink}; }

        .cp-social-list { display: flex; flex-direction: column; gap: 8px; }
        .cp-social-row { display: flex; justify-content: space-between; font-size: 13px; color: ${C.ink}; padding: 8px 0; border-bottom: 1px solid ${C.line}; }
        .cp-social-row:last-child { border-bottom: none; }
        .cp-social-platform { font-weight: 600; text-transform: capitalize; }
        .cp-social-followers { color: ${C.inkSoft}; }

        .cp-portfolio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .cp-portfolio-item { border-radius: 10px; overflow: hidden; aspect-ratio: 1; background: ${C.surface}; }
        .cp-portfolio-item img { width: 100%; height: 100%; object-fit: cover; }

        .cp-modal-backdrop { position: fixed; inset: 0; background: rgba(26,22,37,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .cp-modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 420px; }
        .cp-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .cp-modal-head h3 { font-size: 16px; font-weight: 700; color: ${C.ink}; margin: 0; }
        .cp-modal-close { border: none; background: transparent; cursor: pointer; color: ${C.inkSoft}; }
        .cp-modal-label { font-size: 12.5px; font-weight: 600; color: ${C.ink}; margin: 12px 0 6px; display: block; }
        .cp-modal select, .cp-modal textarea { width: 100%; border: 1px solid ${C.line}; border-radius: 8px; padding: 10px 12px; font: 13px/1.5 -apple-system, sans-serif; color: ${C.ink}; resize: vertical; }
        .cp-modal-submit { width: 100%; margin-top: 16px; background: ${C.navy}; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .cp-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .cp-modal-error { font-size: 12px; color: #d64545; margin-top: 8px; }
        .cp-modal-success { font-size: 13px; color: #1a8a4a; text-align: center; padding: 10px 0; }
      `}</style>

      <div className="cp-content">
        {loading && <div className="cp-state"><Loader2 size={20} className="cp-spin" /></div>}
        {!loading && error && <div className="cp-state">{error}</div>}

        {!loading && !error && profile && (
          <>
            <div className="cp-header">
              {profile.profile_image ? (
                <img className="cp-avatar" src={profile.profile_image} alt={profile.display_name || ''} />
              ) : (
                <div className="cp-avatar">{initials(profile.display_name)}</div>
              )}

              <div>
                <div className="cp-name">{profile.display_name || 'Creator'}</div>
                {profile.username && <div className="cp-username">@{profile.username}</div>}
                {profile.location && (
                  <div className="cp-location"><MapPin size={13} /> {profile.location}</div>
                )}
                {profile.avg_rating != null && (
                  <div className="cp-rating">
                    <Star size={14} fill="#FFB020" color="#FFB020" /> {profile.avg_rating.toFixed(1)}
                    <span className="cp-rating-count">({profile.ratings_count} rating{profile.ratings_count === 1 ? '' : 's'})</span>
                  </div>
                )}
                {profile.bio && <div className="cp-bio">{profile.bio}</div>}
              </div>

              <div className="cp-actions">
                <button
                  className={`cp-heart-btn ${profile.is_shortlisted ? 'cp-heart-btn--active' : ''}`}
                  disabled={shortlistBusy}
                  onClick={toggleShortlist}
                >
                  <Heart size={15} fill={profile.is_shortlisted ? C.coral : 'none'} />
                  {profile.is_shortlisted ? 'Shortlisted' : 'Shortlist'}
                </button>
                <button className="cp-invite-btn" onClick={() => setInviteOpen(true)}>
                  <Send size={14} /> Invite
                </button>
              </div>
            </div>

            {(profile.categories.length > 0 || profile.content_types.length > 0 || profile.starting_price != null) && (
              <div className="cp-section">
                <h3>Niche & Rates</h3>
                {profile.categories.length > 0 && (
                  <div className="cp-tags" style={{ marginBottom: 10 }}>
                    {profile.categories.map((c) => <span className="cp-tag" key={c}>{c}</span>)}
                  </div>
                )}
                {profile.content_types.length > 0 && (
                  <div className="cp-tags" style={{ marginBottom: 10 }}>
                    {profile.content_types.map((c) => <span className="cp-tag" key={c}>{c}</span>)}
                  </div>
                )}
                {profile.starting_price != null && (
                  <div className="cp-price">Starting from Rs. {profile.starting_price.toLocaleString()}</div>
                )}
              </div>
            )}

            {(profile.audience_age_range.length > 0 || profile.audience_location.length > 0 || profile.interests.length > 0) && (
              <div className="cp-section">
                <h3>Audience</h3>
                <div className="cp-tags">
                  {[...profile.audience_age_range, ...profile.audience_location, ...profile.interests].map((a, i) => (
                    <span className="cp-tag" key={`${a}-${i}`}>{a}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.socials.length > 0 && (
              <div className="cp-section">
                <h3>Socials</h3>
                <div className="cp-social-list">
                  {profile.socials.map((s: any, i: number) => (
                    <div className="cp-social-row" key={i}>
                      <span className="cp-social-platform">{s.platform}{s.username ? ` · @${s.username}` : ''}</span>
                      <span className="cp-social-followers">
                        {s.follower_count ? `${Number(s.follower_count).toLocaleString()} followers` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.portfolio.length > 0 && (
              <div className="cp-section">
                <h3>Portfolio</h3>
                <div className="cp-portfolio-grid">
                  {profile.portfolio.map((item: any, i: number) => (
                    <div className="cp-portfolio-item" key={i}>
                      {item.media_url && <img src={item.media_url} alt={item.title || ''} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {inviteOpen && profile && (
        <InviteModal profile={profile} onClose={() => setInviteOpen(false)} />
      )}
    </AppLayout>
  );
}

function InviteModal({ profile, onClose }: { profile: PublicCreatorProfileType; onClose: () => void }) {
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
      await inviteCreator(profile.id, {
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
    <div className="cp-modal-backdrop" onClick={onClose}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-modal-head">
          <h3>Invite {profile.display_name || 'Creator'}</h3>
          <button className="cp-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {success ? (
          <div className="cp-modal-success">Invite sent!</div>
        ) : (
          <>
            <label className="cp-modal-label" htmlFor="cp-invite-campaign">Attach to a campaign (optional)</label>
            <select id="cp-invite-campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">No specific campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <label className="cp-modal-label" htmlFor="cp-invite-message">Message</label>
            <textarea
              id="cp-invite-message"
              rows={4}
              placeholder={`Hi ${profile.display_name || ''}, we'd love to work with you on...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {error && <div className="cp-modal-error">{error}</div>}

            <button className="cp-modal-submit" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 size={15} className="cp-spin" /> : <Send size={14} />}
              Send Invite
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CreatorPublicProfile;

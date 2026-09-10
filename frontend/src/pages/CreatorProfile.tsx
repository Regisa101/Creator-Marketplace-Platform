import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Pencil,
  BadgeCheck,
  Clock,
  Music2,
  Link2,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react';

// lucide-react dropped its brand/trademark icons (Instagram, YouTube,
// Facebook, Twitter/X) in the version this project has pinned
// (1.33.0) — importing them causes "no exported member" errors. These
// small inline SVGs replace them so social platform badges keep their
// distinct look without depending on icons that no longer exist.
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <polygon points="10,9 15,12 10,15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 4 2 20M2 4l20 16" />
    </svg>
  );
}

import { useAuth } from '../context/AuthContext';
import { getCreatorProgress } from '../api/client';

const CORAL = '#FF6B5A';
const CORAL_DARK = '#F0523F';
const VIOLET = '#1E2A78';

const PLATFORM_ICON: Record<string, any> = {
  instagram: InstagramIcon,
  tiktok: Music2,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  twitter: TwitterIcon,
};

export function CreatorProfile() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Could not delete your account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getCreatorProgress();
        if (!cancelled) {
          setProfile(data?.profile ?? null);
          setSocials(data?.socials ?? []);
        }
      } catch (err) {
        console.error('Could not load profile:', err);
        if (!cancelled) setError('Could not load your profile right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profile?.display_name || user?.full_name || 'Creator';
  const initial = displayName[0]?.toUpperCase() ?? 'C';

  return (
    <div className="cp">
      <style>{`
        .cp {
          --coral: ${CORAL};
          --coral-dark: ${CORAL_DARK};
          --violet: ${VIOLET};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: #fbfaff;
          color: var(--ink);
        }
        .cp * { box-sizing: border-box; }
        .cp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .cp-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-soft);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 4px;
        }
        .cp-back:hover { color: var(--ink); }

        .cp-body { max-width: 880px; margin: 0 auto; padding: 32px 24px 64px; }

        .cp-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          overflow: hidden;
        }
        .cp-cover {
          height: 150px;
          background: linear-gradient(120deg, var(--coral) 0%, var(--coral-dark) 55%, var(--violet) 130%);
        }
        .cp-header {
          padding: 0 32px 24px;
          position: relative;
        }
        .cp-avatar {
          width: 104px;
          height: 104px;
          border-radius: 50%;
          border: 5px solid #fff;
          margin-top: -52px;
          background: var(--coral);
          color: #fff;
          font-size: 34px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .cp-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .cp-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .cp-name { font-size: 24px; font-weight: 700; margin: 0; }
        .cp-username { font-size: 13.5px; color: var(--ink-soft); margin: 2px 0 10px; }
        .cp-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--ink-soft); }
        .cp-meta span { display: inline-flex; align-items: center; gap: 5px; }

        .cp-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: var(--coral);
          border: none;
          padding: 9px 16px;
          border-radius: 9px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease;
        }
        .cp-edit-btn:hover { background: var(--coral-dark); }

        .cp-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
        .cp-badge {
          font-size: 11.5px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 100px;
        }
        .cp-badge-pending { background: #F1EEFC; color: #6c6d73; }
        .cp-badge-verified { background: #E1F6EA; color: #16a34a; display: inline-flex; align-items: center; gap: 4px; }
        .cp-badge-tag { background: #FFF4F2; color: var(--coral-dark); }

        .cp-section { padding: 24px 32px; border-top: 1px solid var(--line); }
        .cp-section-title {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 12px;
        }
        .cp-about {
          font-size: 14px;
          line-height: 1.65;
          color: var(--ink);
          background: #f7f7f9;
          border-radius: 12px;
          padding: 16px 18px;
          margin: 0;
        }

        .cp-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .cp-chip {
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 13px;
          border-radius: 100px;
          background: #F1EEFC;
          color: var(--violet);
        }

        .cp-social-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .cp-social-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 14px;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.15s ease;
        }
        .cp-social-card:hover { border-color: var(--coral); }
        .cp-social-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #FFF4F2;
          color: var(--coral-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cp-social-platform { font-size: 12.5px; font-weight: 600; text-transform: capitalize; margin: 0; }
        .cp-social-handle { font-size: 12px; color: var(--ink-soft); margin: 1px 0 0; }
        .cp-social-followers { margin-left: auto; font-size: 12px; font-weight: 700; color: var(--ink); white-space: nowrap; }

        .cp-portfolio-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .cp-portfolio-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
        }
        .cp-portfolio-media {
          height: 130px;
          background: #f1eefc;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-soft);
        }
        .cp-portfolio-media img { width: 100%; height: 100%; object-fit: cover; }
        .cp-portfolio-body { padding: 12px 14px; }
        .cp-portfolio-title { font-size: 13px; font-weight: 600; margin: 0 0 3px; }
        .cp-portfolio-desc { font-size: 12px; color: var(--ink-soft); margin: 0; line-height: 1.5; }

        .cp-empty { font-size: 13.5px; color: var(--ink-soft); }
        .cp-loading, .cp-error { text-align: center; padding: 80px 20px; color: var(--ink-soft); font-size: 14px; }

        .cp-danger-zone {
          border: 1px solid #f3caca;
          background: #fff8f8;
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .cp-danger-title { font-size: 13.5px; font-weight: 700; color: #b3261e; margin: 0; }
        .cp-danger-desc { font-size: 12.5px; color: var(--ink-soft); margin: 3px 0 0; max-width: 480px; }
        .cp-danger-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: #b3261e;
          background: #fff; border: 1.5px solid #f0b4b4; border-radius: 9px;
          padding: 9px 16px; cursor: pointer; white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .cp-danger-btn:hover { background: #fdecec; border-color: #e69696; }

        .cp-modal-overlay {
          position: fixed; inset: 0; background: rgba(17,18,23,0.45);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; z-index: 100;
        }
        .cp-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 400px;
          padding: 24px; position: relative;
        }
        .cp-modal-close {
          position: absolute; top: 14px; right: 14px; background: none; border: none;
          color: var(--ink-soft); cursor: pointer; padding: 4px; display: flex;
        }
        .cp-modal-close:hover { color: var(--ink); }
        .cp-modal-title { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
        .cp-modal-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.55; margin: 0 0 16px; }
        .cp-modal-input {
          width: 100%; border: 1.5px solid var(--line); border-radius: 9px; padding: 11px 13px;
          font-size: 14px; outline: none; margin-bottom: 6px;
        }
        .cp-modal-input:focus { border-color: #b3261e; }
        .cp-modal-error { font-size: 12px; color: #b3261e; margin: 4px 0 10px; }
        .cp-modal-actions { display: flex; gap: 10px; margin-top: 16px; }
        .cp-modal-cancel {
          flex: 1; padding: 10px; border-radius: 9px; border: 1.5px solid var(--line);
          background: #fff; font-size: 13.5px; font-weight: 600; color: var(--ink); cursor: pointer;
        }
        .cp-modal-confirm {
          flex: 1; padding: 10px; border-radius: 9px; border: none;
          background: #b3261e; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;
        }
        .cp-modal-confirm:disabled { opacity: 0.6; cursor: default; }
      `}</style>

      <div className="cp-topbar">
        <button className="cp-back" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </div>

      <div className="cp-body">
        {loading ? (
          <div className="cp-loading">Loading your profile...</div>
        ) : error ? (
          <div className="cp-error">{error}</div>
        ) : (
          <div className="cp-card">
            <div className="cp-cover" />

            <div className="cp-header">
              <div className="cp-avatar">
                {profile?.profile_image ? (
                  <img src={profile.profile_image} alt={displayName} />
                ) : (
                  initial
                )}
              </div>

              <div className="cp-header-row">
                <div>
                  <p className="cp-name">{displayName}</p>
                  {profile?.username && (
                    <p className="cp-username">@{profile.username}</p>
                  )}
                  <div className="cp-meta">
                    {profile?.creator_type && (
                      <span>{profile.creator_type}</span>
                    )}
                    {profile?.location && (
                      <span><MapPin size={13} /> {profile.location}</span>
                    )}
                    {Array.isArray(profile?.languages) && profile.languages.length > 0 && (
                      <span><Globe size={13} /> {profile.languages.join(', ')}</span>
                    )}
                  </div>
                </div>

                <Link to="/onboarding/creator" className="cp-edit-btn">
                  <Pencil size={13} /> Edit Profile
                </Link>
              </div>

              <div className="cp-badges">
                {profile?.is_onboarding_complete ? (
                  <span className="cp-badge cp-badge-verified">
                    <BadgeCheck size={13} /> Published
                  </span>
                ) : (
                  <span className="cp-badge cp-badge-pending">
                    <Clock size={12} style={{ marginRight: 3 }} />
                    Verification Pending
                  </span>
                )}
                {Array.isArray(profile?.categories) &&
                  profile.categories.map((c: string) => (
                    <span className="cp-badge cp-badge-tag" key={c}>{c}</span>
                  ))}
              </div>
            </div>

            {profile?.bio && (
              <div className="cp-section">
                <p className="cp-section-title">About</p>
                <p className="cp-about">{profile.bio}</p>
              </div>
            )}

            {Array.isArray(profile?.content_types) && profile.content_types.length > 0 && (
              <div className="cp-section">
                <p className="cp-section-title">Content Types</p>
                <div className="cp-chip-row">
                  {profile.content_types.map((c: string) => (
                    <span className="cp-chip" key={c}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="cp-section">
              <p className="cp-section-title">Social Media</p>
              {socials.length === 0 ? (
                <p className="cp-empty">No social accounts added yet.</p>
              ) : (
                <div className="cp-social-grid">
                  {socials.map((s: any) => {
                    const Icon = PLATFORM_ICON[s.platform] || Link2;
                    return (
                      <a
                        key={`${s.platform}-${s.username}`}
                        className="cp-social-card"
                        href={s.profile_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="cp-social-icon"><Icon size={16} /></span>
                        <span>
                          <p className="cp-social-platform">{s.platform}</p>
                          <p className="cp-social-handle">@{s.username}</p>
                        </span>
                        {s.follower_count > 0 && (
                          <span className="cp-social-followers">
                            {s.follower_count.toLocaleString()}
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="cp-section">
              <p className="cp-section-title">Portfolio</p>
              {!Array.isArray(profile?.portfolio) || profile.portfolio.length === 0 ? (
                <p className="cp-empty">No portfolio items yet.</p>
              ) : (
                <div className="cp-portfolio-grid">
                  {profile.portfolio.map((item: any, i: number) => (
                    <div className="cp-portfolio-card" key={i}>
                      <div className="cp-portfolio-media">
                        {item.media_url ? (
                          item.type === 'video' ? (
                            <Video size={22} />
                          ) : (
                            <img src={item.media_url} alt={item.title} />
                          )
                        ) : (
                          <ImageIcon size={22} />
                        )}
                      </div>
                      <div className="cp-portfolio-body">
                        <p className="cp-portfolio-title">{item.title}</p>
                        {item.description && (
                          <p className="cp-portfolio-desc">{item.description}</p>
                        )}
                        {item.media_url && (
                          <a
                            href={item.media_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11.5, color: CORAL_DARK, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}
                          >
                            View <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="cp-section">
              <p className="cp-section-title">Work History</p>
              {Array.isArray(profile?.work_history) && profile.work_history.length > 0 ? (
                <div style={{display:'grid',gap:10}}>
                  {profile.work_history.map((item:any, i:number) => <div key={`${item.campaign_id}-${i}`} style={{border:'1px solid #eae7f2',borderRadius:11,padding:'12px 14px'}}><div style={{fontWeight:700,fontSize:13}}>{item.campaign_title}</div><div style={{fontSize:11.5,color:'var(--ink-soft)',marginTop:3}}>{item.business_name || 'Brand'} · Completed</div>{item.deliverables?.length > 0 && <div style={{fontSize:11,color:'var(--ink-soft)',marginTop:5}}>{item.deliverables.join(' · ')}</div>}</div>)}
                </div>
              ) : <p className="cp-empty">Completed collaborations will appear here automatically.</p>}
            </div>

            <div className="cp-section">
              <p className="cp-section-title">Danger Zone</p>
              <div className="cp-danger-zone">
                <div>
                  <p className="cp-danger-title">Delete account</p>
                  <p className="cp-danger-desc">
                    Permanently deletes your creator profile, portfolio, social links, and campaign applications. This can't be undone.
                  </p>
                </div>
                <button
                  type="button"
                  className="cp-danger-btn"
                  onClick={() => {
                    setDeletePassword('');
                    setDeleteError('');
                    setShowDeleteModal(true);
                  }}
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="cp-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cp-modal-close"
              onClick={() => setShowDeleteModal(false)}
              aria-label="Close"
              disabled={deleting}
            >
              <X size={18} />
            </button>
            <h2 className="cp-modal-title">Delete your account?</h2>
            <p className="cp-modal-desc">
              This permanently deletes your account and everything tied to it — profile, portfolio, and applications. Enter your password to confirm.
            </p>
            <form onSubmit={handleDeleteAccount}>
              <input
                type="password"
                className="cp-modal-input"
                placeholder="Current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                autoFocus
              />
              {deleteError && <div className="cp-modal-error">{deleteError}</div>}
              <div className="cp-modal-actions">
                <button
                  type="button"
                  className="cp-modal-cancel"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button type="submit" className="cp-modal-confirm" disabled={deleting || !deletePassword}>
                  {deleting ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorProfile;
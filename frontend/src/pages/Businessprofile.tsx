import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Pencil,
  BadgeCheck,
  Clock,
  Phone,
  ExternalLink,
  Building2,
  Users,
  Trash2,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getBusinessProgress } from '../api/client';

const CORAL = '#FF6B5A';
const VIOLET = '#1E2A78';
const VIOLET_DARK = '#182262';

export function BusinessProfile() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
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
        const data = await getBusinessProgress();
        if (!cancelled) {
          setProfile(data?.profile ?? null);
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

  const companyName = profile?.company_name || user?.full_name || 'Business';
  const initial = companyName[0]?.toUpperCase() ?? 'B';

  return (
    <div className="bp">
      <style>{`
        .bp {
          --coral: ${CORAL};
          --violet: ${VIOLET};
          --violet-dark: ${VIOLET_DARK};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: #fbfaff;
          color: var(--ink);
        }
        .bp * { box-sizing: border-box; }
        .bp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .bp-back {
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
        .bp-back:hover { color: var(--ink); }

        .bp-body { max-width: 880px; margin: 0 auto; padding: 32px 24px 64px; }

        .bp-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          overflow: hidden;
        }
        .bp-cover {
          height: 150px;
          background: linear-gradient(120deg, var(--violet) 0%, var(--violet-dark) 55%, var(--coral) 130%);
        }
        .bp-header {
          padding: 0 32px 24px;
          position: relative;
        }
        .bp-avatar {
          width: 104px;
          height: 104px;
          border-radius: 24px;
          border: 5px solid #fff;
          margin-top: -52px;
          background: var(--violet);
          color: #fff;
          font-size: 34px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .bp-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .bp-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .bp-name { font-size: 24px; font-weight: 700; margin: 0; }
        .bp-type { font-size: 13.5px; color: var(--ink-soft); margin: 2px 0 10px; }
        .bp-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: var(--ink-soft); }
        .bp-meta span { display: inline-flex; align-items: center; gap: 5px; }
        .bp-meta a { color: inherit; text-decoration: none; }
        .bp-meta a:hover { color: var(--violet); }

        .bp-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: var(--violet);
          border: none;
          padding: 9px 16px;
          border-radius: 9px;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .bp-edit-btn:hover { background: var(--violet-dark); }

        .bp-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
        .bp-badge {
          font-size: 11.5px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 100px;
        }
        .bp-badge-pending { background: #F1EEFC; color: #6c6d73; }
        .bp-badge-verified { background: #E1F6EA; color: #16a34a; display: inline-flex; align-items: center; gap: 4px; }
        .bp-badge-tag { background: #F2F4FC; color: var(--violet-dark); }

        .bp-section { padding: 24px 32px; border-top: 1px solid var(--line); }
        .bp-section-title {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 12px;
        }
        .bp-about {
          font-size: 14px;
          line-height: 1.65;
          color: var(--ink);
          margin: 0;
          white-space: pre-wrap;
        }

        .bp-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .bp-chip {
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 13px;
          border-radius: 100px;
          background: #FFF4F2;
          color: #F0523F;
        }

        .bp-info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .bp-info-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 14px;
        }
        .bp-info-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #F2F4FC;
          color: var(--violet-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .bp-info-label { font-size: 11px; color: var(--ink-soft); margin: 0; }
        .bp-info-value { font-size: 13px; font-weight: 600; margin: 1px 0 0; }
        .bp-info-value a { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
        .bp-info-value a:hover { color: var(--violet); }

        .bp-empty { font-size: 13.5px; color: var(--ink-soft); }
        .bp-loading, .bp-error { text-align: center; padding: 80px 20px; color: var(--ink-soft); font-size: 14px; }

        .bp-danger-zone {
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
        .bp-danger-title { font-size: 13.5px; font-weight: 700; color: #b3261e; margin: 0; }
        .bp-danger-desc { font-size: 12.5px; color: var(--ink-soft); margin: 3px 0 0; max-width: 480px; }
        .bp-danger-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: #b3261e;
          background: #fff; border: 1.5px solid #f0b4b4; border-radius: 9px;
          padding: 9px 16px; cursor: pointer; white-space: nowrap;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .bp-danger-btn:hover { background: #fdecec; border-color: #e69696; }

        .bp-modal-overlay {
          position: fixed; inset: 0; background: rgba(17,18,23,0.45);
          display: flex; align-items: center; justify-content: center;
          padding: 20px; z-index: 100;
        }
        .bp-modal {
          background: #fff; border-radius: 16px; width: 100%; max-width: 400px;
          padding: 24px; position: relative;
        }
        .bp-modal-close {
          position: absolute; top: 14px; right: 14px; background: none; border: none;
          color: var(--ink-soft); cursor: pointer; padding: 4px; display: flex;
        }
        .bp-modal-close:hover { color: var(--ink); }
        .bp-modal-title { font-size: 17px; font-weight: 700; margin: 0 0 8px; }
        .bp-modal-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.55; margin: 0 0 16px; }
        .bp-modal-input {
          width: 100%; border: 1.5px solid var(--line); border-radius: 9px; padding: 11px 13px;
          font-size: 14px; outline: none; margin-bottom: 6px;
        }
        .bp-modal-input:focus { border-color: #b3261e; }
        .bp-modal-error { font-size: 12px; color: #b3261e; margin: 4px 0 10px; }
        .bp-modal-actions { display: flex; gap: 10px; margin-top: 16px; }
        .bp-modal-cancel {
          flex: 1; padding: 10px; border-radius: 9px; border: 1.5px solid var(--line);
          background: #fff; font-size: 13.5px; font-weight: 600; color: var(--ink); cursor: pointer;
        }
        .bp-modal-confirm {
          flex: 1; padding: 10px; border-radius: 9px; border: none;
          background: #b3261e; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;
        }
        .bp-modal-confirm:disabled { opacity: 0.6; cursor: default; }
      `}</style>

      <div className="bp-topbar">
        <button className="bp-back" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
      </div>

      <div className="bp-body">
        {loading ? (
          <div className="bp-loading">Loading your profile...</div>
        ) : error ? (
          <div className="bp-error">{error}</div>
        ) : (
          <div className="bp-card">
            <div className="bp-cover" />

            <div className="bp-header">
              <div className="bp-avatar">
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt={companyName} />
                ) : (
                  initial
                )}
              </div>

              <div className="bp-header-row">
                <div>
                  <p className="bp-name">{companyName}</p>
                  {profile?.business_type && (
                    <p className="bp-type">{profile.business_type}</p>
                  )}
                  <div className="bp-meta">
                    {profile?.industry && (
                      <span><Building2 size={13} /> {profile.industry}</span>
                    )}
                    {profile?.location && (
                      <span><MapPin size={13} /> {profile.location}</span>
                    )}
                    {profile?.website && (
                      <span>
                        <Globe size={13} />
                        <a href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a>
                      </span>
                    )}
                  </div>
                </div>

                <Link to="/onboarding/business" className="bp-edit-btn">
                  <Pencil size={13} /> Edit Profile
                </Link>
              </div>

              <div className="bp-badges">
                {profile?.is_onboarding_complete ? (
                  <span className="bp-badge bp-badge-verified">
                    <BadgeCheck size={13} /> Published
                  </span>
                ) : (
                  <span className="bp-badge bp-badge-pending">
                    <Clock size={12} style={{ marginRight: 3 }} />
                    Verification Pending
                  </span>
                )}
                {Array.isArray(profile?.interested_categories) &&
                  profile.interested_categories.map((c: string) => (
                    <span className="bp-badge bp-badge-tag" key={c}>{c}</span>
                  ))}
              </div>
            </div>

            {profile?.description && (
              <div className="bp-section">
                <p className="bp-section-title">About</p>
                <p className="bp-about">{profile.description}</p>
              </div>
            )}

            {Array.isArray(profile?.preferred_content_types) && profile.preferred_content_types.length > 0 && (
              <div className="bp-section">
                <p className="bp-section-title">Preferred Content Types</p>
                <div className="bp-chip-row">
                  {profile.preferred_content_types.map((c: string) => (
                    <span className="bp-chip" key={c}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="bp-section">
              <p className="bp-section-title">Company Info</p>
              <div className="bp-info-grid">
                <div className="bp-info-card">
                  <span className="bp-info-icon"><Users size={16} /></span>
                  <span>
                    <p className="bp-info-label">Team size</p>
                    <p className="bp-info-value">{profile?.team_size || 'Not specified'}</p>
                  </span>
                </div>
                <div className="bp-info-card">
                  <span className="bp-info-icon"><Phone size={16} /></span>
                  <span>
                    <p className="bp-info-label">Contact</p>
                    <p className="bp-info-value">{profile?.contact_phone || 'Not specified'}</p>
                  </span>
                </div>
                {typeof profile?.typical_budget === 'number' && profile.typical_budget > 0 && (
                  <div className="bp-info-card">
                    <span className="bp-info-icon"><ExternalLink size={16} /></span>
                    <span>
                      <p className="bp-info-label">Typical budget</p>
                      <p className="bp-info-value">Rs. {profile.typical_budget.toLocaleString()}</p>
                    </span>
                  </div>
                )}
                {profile?.year_established && (
                  <div className="bp-info-card">
                    <span className="bp-info-icon"><Building2 size={16} /></span>
                    <span>
                      <p className="bp-info-label">Established</p>
                      <p className="bp-info-value">{profile.year_established}</p>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bp-section">
              <p className="bp-section-title">Danger Zone</p>
              <div className="bp-danger-zone">
                <div>
                  <p className="bp-danger-title">Delete account</p>
                  <p className="bp-danger-desc">
                    Permanently deletes your business profile and every campaign you've created, along with their applications. This can't be undone.
                  </p>
                </div>
                <button
                  type="button"
                  className="bp-danger-btn"
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
        <div className="bp-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="bp-modal-close"
              onClick={() => setShowDeleteModal(false)}
              aria-label="Close"
              disabled={deleting}
            >
              <X size={18} />
            </button>
            <h2 className="bp-modal-title">Delete your account?</h2>
            <p className="bp-modal-desc">
              This permanently deletes your account and everything tied to it — profile, campaigns, and applications. Enter your password to confirm.
            </p>
            <form onSubmit={handleDeleteAccount}>
              <input
                type="password"
                className="bp-modal-input"
                placeholder="Current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                autoFocus
              />
              {deleteError && <div className="bp-modal-error">{deleteError}</div>}
              <div className="bp-modal-actions">
                <button
                  type="button"
                  className="bp-modal-cancel"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button type="submit" className="bp-modal-confirm" disabled={deleting || !deletePassword}>
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

export default BusinessProfile;
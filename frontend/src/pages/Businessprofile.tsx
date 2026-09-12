import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Pencil,
  Phone,
  Building2,
  Users,
  Trash2,
  X,
  Briefcase,
  CheckCircle2,
  Megaphone,
  Layers,
  Clock3,
  ArrowUpRight,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import {
  getBusinessProgress,
  getCampaigns,
  getApplications,
} from '../api/client';

const VIOLET = '#1E2A78';
const VIOLET_DARK = '#182262';
const CORAL = '#FF6B5A';

export function BusinessProfile() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [profileData, campaignData, applicationData] =
          await Promise.all([
            getBusinessProgress(),
            getCampaigns({ limit: 50 }),
            getApplications(),
          ]);

        if (!cancelled) {
          setProfile(profileData?.profile ?? null);
          setCampaigns(campaignData?.campaigns ?? []);
          setApplications(applicationData ?? []);
        }
      } catch (err) {
        console.error('Could not load profile:', err);
        if (!cancelled) {
          setError('Could not load your profile right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword.trim()) {
      setDeleteError('Please enter your current password.');
      return;
    }

    setDeleting(true);

    try {
      await deleteAccount(deletePassword);
      navigate('/');
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.detail ||
        'Could not delete your account. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const companyName =
    profile?.company_name ||
    user?.full_name ||
    'Business';

  const initial =
    companyName[0]?.toUpperCase() ?? 'B';

  const liveCampaigns = campaigns.filter(
    (campaign) => campaign.status === 'published'
  );

  const activeCampaigns = campaigns.filter(
    (campaign) =>
      campaign.status === 'published' ||
      campaign.status === 'in_progress'
  );

  const completedCampaigns = campaigns.filter(
    (campaign) => campaign.status === 'completed'
  );

  const acceptedApplications = applications.filter(
    (application) =>
      application.status === 'accepted' ||
      application.status === 'completed'
  );

  const creatorsWorkedWith = useMemo(() => {
    const map = new Map<string, any>();

    acceptedApplications.forEach((application) => {
      const key =
        application.creator_id?.toString() ||
        application.creator_name ||
        `creator-${application.id}`;

      if (!map.has(key)) {
        map.set(key, application);
      }
    });

    return Array.from(map.values());
  }, [acceptedApplications]);

  const categories = Array.isArray(profile?.interested_categories)
    ? profile.interested_categories
    : [];

  const contentTypes = Array.isArray(
    profile?.preferred_content_types
  )
    ? profile.preferred_content_types
    : [];

  return (
    <div className="bp">
      <style>{`
        .bp {
          --violet: ${VIOLET};
          --violet-dark: ${VIOLET_DARK};
          --coral: ${CORAL};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --ink-faint: #9b9ba3;
          --line: #e6e6ea;
          --surface: #fbfaff;
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          min-height: 100vh;
          background: var(--surface);
          color: var(--ink);
        }

        .bp * { box-sizing: border-box; }

        .bp-topbar {
          display: flex;
          align-items: center;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }

        .bp-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-soft);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 4px;
        }

        .bp-back:hover { color: var(--ink); }

        .bp-body {
          max-width: 980px;
          margin: 0 auto;
          padding: 30px 24px 70px;
        }

        .bp-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(30,42,120,.035);
        }

        .bp-cover {
          height: 170px;
          background:
            radial-gradient(circle at 18% 22%, rgba(255,255,255,.18), transparent 28%),
            linear-gradient(120deg, var(--violet) 0%, var(--violet-dark) 56%, var(--coral) 130%);
        }

        .bp-header {
          padding: 0 34px 26px;
          position: relative;
        }

        .bp-avatar {
          width: 112px;
          height: 112px;
          border-radius: 25px;
          border: 5px solid #fff;
          margin-top: -56px;
          background: var(--violet);
          color: #fff;
          font-size: 36px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 5px 18px rgba(0,0,0,.08);
        }

        .bp-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bp-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .bp-name {
          font-size: 27px;
          font-weight: 750;
          margin: 0;
          letter-spacing: -.02em;
        }

        .bp-type {
          font-size: 13.5px;
          color: var(--ink-soft);
          margin: 3px 0 11px;
        }

        .bp-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 20px;
          font-size: 13px;
          color: var(--ink-soft);
        }

        .bp-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .bp-meta a {
          color: inherit;
          text-decoration: none;
        }

        .bp-meta a:hover {
          color: var(--violet);
        }

        .bp-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 650;
          color: #fff;
          background: var(--violet);
          border: none;
          padding: 10px 17px;
          border-radius: 10px;
          text-decoration: none;
          white-space: nowrap;
        }

        .bp-edit-btn:hover { background: var(--violet-dark); }

        .bp-tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 17px;
        }

        .bp-tag {
          font-size: 11.5px;
          font-weight: 650;
          padding: 6px 11px;
          border-radius: 999px;
          background: #f2f4fc;
          color: var(--violet-dark);
        }

        .bp-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 0 34px 26px;
        }

        .bp-stat {
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 15px;
        }

        .bp-stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #f2f4fc;
          color: var(--violet);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-stat-value {
          font-size: 20px;
          font-weight: 750;
          margin: 10px 0 2px;
        }

        .bp-stat-label {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 0;
        }

        .bp-section {
          padding: 26px 34px;
          border-top: 1px solid var(--line);
        }

        .bp-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .bp-section-title {
          font-size: 11.5px;
          font-weight: 750;
          letter-spacing: .07em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0;
        }

        .bp-section-sub {
          font-size: 12px;
          color: var(--ink-faint);
          margin: 0;
        }

        .bp-about {
          font-size: 14px;
          line-height: 1.75;
          color: var(--ink);
          background: #f8f8fa;
          border-radius: 13px;
          padding: 17px 18px;
          margin: 0;
          white-space: pre-wrap;
        }

        .bp-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .bp-chip {
          font-size: 12px;
          font-weight: 600;
          padding: 7px 12px;
          border-radius: 999px;
          background: #f2f4fc;
          color: var(--violet);
        }

        .bp-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 11px;
        }

        .bp-info-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 14px;
          min-width: 0;
        }

        .bp-info-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #f2f4fc;
          color: var(--violet);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bp-info-label {
          font-size: 11px;
          color: var(--ink-soft);
          margin: 0;
        }

        .bp-info-value {
          font-size: 13px;
          font-weight: 650;
          margin: 2px 0 0;
          overflow-wrap: anywhere;
        }

        .bp-info-value a {
          color: inherit;
          text-decoration: none;
        }

        .bp-campaign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 14px;
        }

        .bp-campaign-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          text-decoration: none;
          color: inherit;
        }

        .bp-campaign-card:hover {
          border-color: #bfc4e2;
          transform: translateY(-1px);
        }

        .bp-campaign-image {
          height: 125px;
          background: linear-gradient(135deg, #f2f4fc, #fff4f2);
          overflow: hidden;
        }

        .bp-campaign-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bp-campaign-body {
          padding: 13px 14px;
        }

        .bp-campaign-status {
          font-size: 10px;
          font-weight: 700;
          color: var(--violet);
          text-transform: uppercase;
          letter-spacing: .04em;
          margin: 0 0 5px;
        }

        .bp-campaign-title {
          font-size: 13.5px;
          font-weight: 700;
          margin: 0;
          line-height: 1.4;
        }

        .bp-campaign-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 11px;
          color: var(--ink-soft);
          margin-top: 8px;
        }

        .bp-creators {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 10px;
        }

        .bp-creator-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 13px 14px;
        }

        .bp-creator-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #f2f4fc;
          color: var(--violet);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 750;
          flex-shrink: 0;
          overflow: hidden;
        }

        .bp-creator-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bp-creator-name {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
        }

        .bp-creator-meta {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 3px 0 0;
        }

        .bp-empty {
          border: 1px dashed #d9d8df;
          background: #fafafd;
          border-radius: 13px;
          padding: 22px;
          text-align: center;
          color: var(--ink-soft);
          font-size: 13px;
        }

        .bp-empty strong {
          display: block;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .bp-empty-link {
          display: inline-flex;
          margin-top: 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--violet);
          text-decoration: none;
        }

        .bp-danger-zone {
          border: 1px solid #f3caca;
          background: #fff8f8;
          border-radius: 13px;
          padding: 17px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .bp-danger-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #b3261e;
          margin: 0;
        }

        .bp-danger-desc {
          font-size: 12.5px;
          color: var(--ink-soft);
          margin: 3px 0 0;
          max-width: 540px;
          line-height: 1.5;
        }

        .bp-danger-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 650;
          color: #b3261e;
          background: #fff;
          border: 1.5px solid #f0b4b4;
          border-radius: 9px;
          padding: 9px 16px;
          cursor: pointer;
        }

        .bp-danger-btn:hover {
          background: #fdecec;
        }

        .bp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(17,18,23,.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
        }

        .bp-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 410px;
          padding: 24px;
          position: relative;
        }

        .bp-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          color: var(--ink-soft);
          cursor: pointer;
          padding: 4px;
          display: flex;
        }

        .bp-modal-title {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .bp-modal-desc {
          font-size: 13px;
          color: var(--ink-soft);
          line-height: 1.55;
          margin: 0 0 16px;
        }

        .bp-modal-input {
          width: 100%;
          border: 1.5px solid var(--line);
          border-radius: 9px;
          padding: 11px 13px;
          font-size: 14px;
          outline: none;
        }

        .bp-modal-input:focus {
          border-color: #b3261e;
        }

        .bp-modal-error {
          font-size: 12px;
          color: #b3261e;
          margin: 6px 0 0;
        }

        .bp-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .bp-modal-cancel,
        .bp-modal-confirm {
          flex: 1;
          padding: 10px;
          border-radius: 9px;
          font-size: 13.5px;
          font-weight: 650;
          cursor: pointer;
        }

        .bp-modal-cancel {
          border: 1.5px solid var(--line);
          background: #fff;
          color: var(--ink);
        }

        .bp-modal-confirm {
          border: none;
          background: #b3261e;
          color: #fff;
        }

        .bp-modal-confirm:disabled {
          opacity: .6;
          cursor: default;
        }

        .bp-loading,
        .bp-error {
          text-align: center;
          padding: 90px 20px;
          color: var(--ink-soft);
          font-size: 14px;
        }

        @media (max-width: 760px) {
          .bp-topbar { padding: 14px 18px; }
          .bp-body { padding: 20px 12px 50px; }
          .bp-header, .bp-section { padding-left: 20px; padding-right: 20px; }
          .bp-stats { grid-template-columns: repeat(2, 1fr); padding-left: 20px; padding-right: 20px; }
          .bp-info-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="bp-topbar">
        <button className="bp-back" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={15} />
          Back to Dashboard
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
                  <h1 className="bp-name">{companyName}</h1>

                  {profile?.business_type && (
                    <p className="bp-type">{profile.business_type}</p>
                  )}

                  <div className="bp-meta">
                    {profile?.industry && (
                      <span>
                        <Building2 size={13} />
                        {profile.industry}
                      </span>
                    )}

                    {profile?.location && (
                      <span>
                        <MapPin size={13} />
                        {profile.location}
                      </span>
                    )}

                    {profile?.website && (
                      <span>
                        <Globe size={13} />
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Website
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                <Link to="/onboarding/business" className="bp-edit-btn">
                  <Pencil size={13} />
                  Edit Profile
                </Link>
              </div>

              {categories.length > 0 && (
                <div className="bp-tag-row">
                  {categories.slice(0, 10).map((category: string) => (
                    <span className="bp-tag" key={category}>
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bp-stats">
              <div className="bp-stat">
                <span className="bp-stat-icon">
                  <Megaphone size={16} />
                </span>
                <p className="bp-stat-value">
                  {activeCampaigns.length}
                </p>
                <p className="bp-stat-label">Active campaigns</p>
              </div>

              <div className="bp-stat">
                <span className="bp-stat-icon">
                  <Layers size={16} />
                </span>
                <p className="bp-stat-value">
                  {campaigns.length}
                </p>
                <p className="bp-stat-label">Campaigns created</p>
              </div>

              <div className="bp-stat">
                <span className="bp-stat-icon">
                  <Users size={16} />
                </span>
                <p className="bp-stat-value">
                  {creatorsWorkedWith.length}
                </p>
                <p className="bp-stat-label">Creators worked with</p>
              </div>

              <div className="bp-stat">
                <span className="bp-stat-icon">
                  <CheckCircle2 size={16} />
                </span>
                <p className="bp-stat-value">
                  {completedCampaigns.length}
                </p>
                <p className="bp-stat-label">Completed campaigns</p>
              </div>
            </div>

            {profile?.description && (
              <section className="bp-section">
                <div className="bp-section-heading">
                  <p className="bp-section-title">About the company</p>
                </div>
                <p className="bp-about">{profile.description}</p>
              </section>
            )}

            {categories.length > 0 && (
              <section className="bp-section">
                <div className="bp-section-heading">
                  <p className="bp-section-title">What we look for</p>
                </div>

                <div className="bp-chip-row">
                  {categories.map((item: string) => (
                    <span className="bp-chip" key={item}>{item}</span>
                  ))}
                </div>
              </section>
            )}

            {contentTypes.length > 0 && (
              <section className="bp-section">
                <div className="bp-section-heading">
                  <p className="bp-section-title">Content we commission</p>
                </div>

                <div className="bp-chip-row">
                  {contentTypes.map((item: string) => (
                    <span className="bp-chip" key={item}>{item}</span>
                  ))}
                </div>
              </section>
            )}

            <section className="bp-section">
              <div className="bp-section-heading">
                <p className="bp-section-title">Company Information</p>
              </div>

              <div className="bp-info-grid">
                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Users size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Team size</p>
                    <p className="bp-info-value">
                      {profile?.team_size || 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Phone size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Contact</p>
                    <p className="bp-info-value">
                      {profile?.contact_phone || 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Briefcase size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Typical campaign budget</p>
                    <p className="bp-info-value">
                      {Number(profile?.typical_budget || 0) > 0
                        ? `NPR ${Number(profile.typical_budget).toLocaleString()}`
                        : 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Building2 size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Established</p>
                    <p className="bp-info-value">
                      {profile?.year_established || 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Globe size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Website</p>
                    <p className="bp-info-value">
                      {profile?.website ? (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visit website <ArrowUpRight size={12} style={{ verticalAlign: 'middle' }} />
                        </a>
                      ) : (
                        'Not specified'
                      )}
                    </p>
                  </span>
                </div>
              </div>
            </section>

            <section className="bp-section">
              <div className="bp-section-heading">
                <p className="bp-section-title">Recent Campaigns</p>
                <p className="bp-section-sub">
                  {campaigns.length} total
                </p>
              </div>

              {campaigns.length === 0 ? (
                <div className="bp-empty">
                  <strong>Your campaign history will appear here</strong>
                  Create campaigns to show creators what your brand works on.
                  <Link className="bp-empty-link" to="/campaigns/new">
                    Create your first campaign →
                  </Link>
                </div>
              ) : (
                <div className="bp-campaign-grid">
                  {campaigns.slice(0, 6).map((campaign: any) => (
                    <Link
                      key={campaign.id}
                      to={`/campaigns/${campaign.id}`}
                      className="bp-campaign-card"
                    >
                      <div className="bp-campaign-image">
                        {campaign.hero_image ? (
                          <img
                            src={campaign.hero_image}
                            alt={campaign.title}
                          />
                        ) : null}
                      </div>

                      <div className="bp-campaign-body">
                        <p className="bp-campaign-status">
                          {campaign.status?.replace('_', ' ') || 'Campaign'}
                        </p>

                        <p className="bp-campaign-title">
                          {campaign.title}
                        </p>

                        <div className="bp-campaign-meta">
                          <span>
                            {campaign.category || 'General'}
                          </span>

                          <span>
                            {campaign.budget
                              ? `NPR ${Number(campaign.budget).toLocaleString()}`
                              : campaign.campaign_type || 'Campaign'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="bp-section">
              <div className="bp-section-heading">
                <p className="bp-section-title">Creators We've Worked With</p>
                <p className="bp-section-sub">
                  {creatorsWorkedWith.length} creator{creatorsWorkedWith.length === 1 ? '' : 's'}
                </p>
              </div>

              {creatorsWorkedWith.length === 0 ? (
                <div className="bp-empty">
                  <strong>No completed creator relationships yet</strong>
                  Accepted collaborations will automatically appear here.
                  <Link className="bp-empty-link" to="/creators">
                    Discover creators →
                  </Link>
                </div>
              ) : (
                <div className="bp-creators">
                  {creatorsWorkedWith.slice(0, 8).map((application: any) => {
                    const name =
                      application.creator_name ||
                      `Creator #${application.creator_id}`;

                    const initial =
                      name[0]?.toUpperCase() || 'C';

                    return (
                      <div className="bp-creator-card" key={application.id}>
                        <div className="bp-creator-avatar">
                          {application.creator_avatar ? (
                            <img
                              src={application.creator_avatar}
                              alt={name}
                            />
                          ) : (
                            initial
                          )}
                        </div>

                        <div>
                          <p className="bp-creator-name">{name}</p>
                          <p className="bp-creator-meta">
                            {application.status === 'completed'
                              ? 'Completed collaboration'
                              : 'Active collaboration'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="bp-section">
              <p className="bp-section-title" style={{ marginBottom: 12 }}>
                Collaboration Snapshot
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 11,
                }}
              >
                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Clock3 size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Live campaigns</p>
                    <p className="bp-info-value">
                      {liveCampaigns.length} currently accepting creators
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <CheckCircle2 size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Completed work</p>
                    <p className="bp-info-value">
                      {completedCampaigns.length} completed campaign
                      {completedCampaigns.length === 1 ? '' : 's'}
                    </p>
                  </span>
                </div>
              </div>
            </section>

            <section className="bp-section">
              <p className="bp-section-title">Account</p>

              <div className="bp-danger-zone">
                <div>
                  <p className="bp-danger-title">Delete account</p>
                  <p className="bp-danger-desc">
                    Permanently deletes your business account and associated profile data.
                    This action cannot be undone.
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
                  <Trash2 size={14} />
                  Delete Account
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div
          className="bp-modal-overlay"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="bp-modal-close"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h2 className="bp-modal-title">Delete your account?</h2>

            <p className="bp-modal-desc">
              This permanently deletes your account and everything tied to it.
              Enter your current password to continue.
            </p>

            <form onSubmit={handleDeleteAccount}>
              <input
                type="password"
                className="bp-modal-input"
                placeholder="Current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />

              {deleteError && (
                <div className="bp-modal-error">{deleteError}</div>
              )}

              <div className="bp-modal-actions">
                <button
                  type="button"
                  className="bp-modal-cancel"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bp-modal-confirm"
                  disabled={deleting || !deletePassword.trim()}
                >
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

import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Building2, DollarSign, Calendar, CheckCircle2, Target, ListChecks, Film, X, Hash, Quote, ClipboardList, Music2, Smartphone, Volume2, Captions, Loader2, Bookmark, BookmarkCheck } from 'lucide-react';
import {
  getCampaign,
  getCampaigns,
  getApplications,
  createApplication,
  saveCampaign,
  unsaveCampaign,
  getSavedCampaigns,
  type Campaign,
  type Application,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

const CORAL = '#FF8A5B';
const CORAL_DARK = '#E86B3E';
const VIOLET = '#6C5DD3';

function formatDeadline(deadline?: string | null): { label: string; closed: boolean } | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  const closed = date.getTime() < Date.now();
  const formatted = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return { label: `${formatted}${closed ? ' (Closed)' : ''}`, closed };
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSpecTab, setActiveSpecTab] = useState(0);
  const [related, setRelated] = useState<Campaign[]>([]);

  // Apply flow state
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [proposal, setProposal] = useState('');
  const [rate, setRate] = useState('');
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Save/bookmark state
  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getCampaign(id);
        if (!cancelled) setCampaign(data);

        // Has this creator already applied? Only relevant for
        // creators — businesses viewing their own campaign, or a
        // logged-out preview, skip this entirely rather than firing
        // a call the backend would just ignore/reject.
        if (user?.role === 'creator') {
          try {
            const apps = await getApplications({ campaign_id: data.id });
            if (!cancelled) setMyApplication(apps[0] ?? null);
          } catch (appErr) {
            console.error('Could not check application status:', appErr);
          }

          try {
            const saved = await getSavedCampaigns();
            if (!cancelled) setIsSaved(saved.some((s) => s.campaign_id === data.id));
          } catch (savedErr) {
            console.error('Could not check saved status:', savedErr);
          }
        }

        // Related campaigns: same category, published, excluding this one.
        // Best-effort — a failure here shouldn't block the page from
        // showing the campaign itself, so it's swallowed rather than
        // setting the page-level `error` state.
        try {
          const list = await getCampaigns({ category: data.category, status: 'published', limit: 4 });
          if (!cancelled) {
            setRelated(list.campaigns.filter((c) => c.id !== data.id).slice(0, 3));
          }
        } catch (relErr) {
          console.error('Could not load related campaigns:', relErr);
        }
      } catch (err) {
        console.error('Could not load campaign:', err);
        if (!cancelled) setError('This campaign could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user?.role]);

  const handleToggleSave = async () => {
    if (!campaign || savingBookmark) return;
    setSavingBookmark(true);
    // Optimistic — flip immediately, roll back on failure. A save/unsave
    // toggle should feel instant; the network round-trip isn't worth
    // making the person wait to see their own click register.
    const previous = isSaved;
    setIsSaved(!previous);
    try {
      if (previous) {
        await unsaveCampaign(campaign.id);
      } else {
        await saveCampaign(campaign.id);
      }
    } catch (err) {
      console.error('Could not update saved status:', err);
      setIsSaved(previous);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleApplySubmit = async () => {
    if (!campaign) return;
    if (!proposal.trim()) {
      setApplyError('Tell them why you\'re a good fit before submitting.');
      return;
    }
    setApplying(true);
    setApplyError('');
    try {
      const created = await createApplication({
        campaign_id: campaign.id,
        proposal: proposal.trim(),
        rate: rate ? Number(rate) : null,
        message: message.trim() || null,
      });
      setMyApplication(created);
      setShowApplyForm(false);
    } catch (err: any) {
      console.error('Application failed:', err);
      setApplyError(
        err?.response?.data?.detail || 'Could not submit your application. Please try again.'
      );
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="cd">
      <style>{`
        .cd {
          --coral: ${CORAL};
          --coral-dark: ${CORAL_DARK};
          --violet: ${VIOLET};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          --surface: #fbfaff;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: var(--surface);
          color: var(--ink);
        }
        .cd * { box-sizing: border-box; }

        .cd-topbar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .cd-logo { font-weight: 700; font-size: 17px; color: var(--ink); }
        .cd-nav-link { font-size: 13.5px; color: var(--ink-soft); text-decoration: none; }
        .cd-nav-link:hover { color: var(--ink); }

        .cd-crumb {
          max-width: 1080px;
          margin: 0 auto;
          padding: 20px 24px 0;
          font-size: 13px;
          color: var(--ink-soft);
        }
        .cd-crumb a { color: var(--ink-soft); text-decoration: none; }
        .cd-crumb a:hover { color: var(--ink); }

        .cd-body {
          max-width: 1080px;
          margin: 0 auto;
          padding: 16px 24px 64px;
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .cd-body { grid-template-columns: 1fr; }
        }

        .cd-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-soft);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 0;
          margin-bottom: 8px;
        }
        .cd-back:hover { color: var(--ink); }

        .cd-hero-banner {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 20px 24px 0;
        }
        .cd-hero-banner img {
          width: 100%;
          max-height: 320px;
          object-fit: cover;
          border-radius: 16px;
          display: block;
        }

        .cd-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          background: #f1f0f5;
          border-radius: 999px;
          padding: 5px 12px;
          margin-bottom: 14px;
        }

        .cd-title { font-size: 28px; font-weight: 700; line-height: 1.25; margin: 0 0 10px; }

        .cd-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 13.5px;
          color: var(--ink-soft);
          margin-bottom: 16px;
        }
        .cd-meta b { color: var(--ink); font-weight: 600; }
        .cd-meta-sep { opacity: 0.5; }
        .cd-meta-item { display: inline-flex; align-items: center; gap: 4px; }

        .cd-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
        .cd-tag {
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--line);
          color: var(--ink-soft);
          background: #fff;
        }
        .cd-tag--type-paid { color: var(--coral-dark); background: #fff1ea; border-color: #ffd9c2; }
        .cd-tag--type-gifted { color: var(--coral-dark); background: #fff1ea; border-color: #ffd9c2; }

        .cd-hr { border: none; border-top: 1px solid var(--line); margin: 20px 0; }

        .cd-section-title { font-size: 17px; font-weight: 700; margin: 0 0 12px; }
        .cd-prose { font-size: 14.5px; line-height: 1.7; color: #3d3d42; white-space: pre-wrap; }

        .cd-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 20px;
        }
        .cd-sidebar { display: flex; flex-direction: column; gap: 16px; }
        .cd-sidebar-title { font-size: 15px; font-weight: 700; text-align: center; margin: 0 0 4px; }
        .cd-sidebar-sub { font-size: 13px; color: var(--ink-soft); text-align: center; margin: 0 0 16px; }
        .cd-cta {
          display: block;
          width: 100%;
          text-align: center;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: var(--coral);
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-bottom: 10px;
        }
        .cd-save {
          display: block;
          width: 100%;
          text-align: center;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .cd-save:disabled { opacity: 0.6; cursor: not-allowed; }

        .cd-brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .cd-brand-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--coral); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px; flex-shrink: 0;
        }
        .cd-brand-name { font-size: 14px; font-weight: 600; }
        .cd-brand-cat { font-size: 12.5px; color: var(--ink-soft); }
        .cd-brand-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.6; }

        .cd-state { max-width: 1080px; margin: 60px auto; padding: 0 24px; text-align: center; color: var(--ink-soft); }

        .cd-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin: 20px 0;
        }
        .cd-info-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 16px 18px;
        }
        .cd-info-card--full { grid-column: 1 / -1; }
        .cd-info-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .cd-info-value { font-size: 13.5px; color: #3d3d42; line-height: 1.6; }
        .cd-info-value--deadline-closed { color: #d64545; font-weight: 500; }
        .cd-info-value--deadline-open { color: #1a8a4a; font-weight: 500; }

        .cd-list { margin: 0; padding-left: 20px; }
        .cd-list li { font-size: 14.5px; line-height: 1.9; color: #3d3d42; }

        .cd-checklist-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 560px) {
          .cd-checklist-grid { grid-template-columns: 1fr; }
        }
        .cd-checklist-item {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #ffd9c2;
          background: #fff7f2;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13.5px;
          font-weight: 500;
        }
        .cd-checklist-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--coral-dark);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cd-scenes { position: relative; padding-left: 4px; }
        .cd-scene {
          position: relative;
          display: flex;
          gap: 16px;
          padding-bottom: 16px;
        }
        .cd-scene:last-child { padding-bottom: 0; }
        .cd-scene-num {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--coral-dark);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 1;
        }
        .cd-scene-line {
          position: absolute;
          left: 15px;
          top: 30px;
          bottom: -16px;
          width: 2px;
          background: #ffd9c2;
        }
        .cd-scene:last-child .cd-scene-line { display: none; }
        .cd-scene-card {
          flex: 1;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .cd-scene-title { font-size: 14px; font-weight: 600; margin-bottom: 3px; }
        .cd-scene-text { font-size: 13.5px; color: var(--ink-soft); line-height: 1.5; }

        .cd-dosdonts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 560px) {
          .cd-dosdonts { grid-template-columns: 1fr; }
        }
        .cd-dosdonts-card { border-radius: 12px; padding: 16px 18px; }
        .cd-dosdonts-card--do { border: 1px solid #bfe8cd; background: #f2fbf5; }
        .cd-dosdonts-card--dont { border: 1px solid #f6c8c8; background: #fdf3f3; }
        .cd-dosdonts-heading {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .cd-dosdonts-heading--do { color: #1a8a4a; }
        .cd-dosdonts-heading--dont { color: #d64545; }
        .cd-dosdonts-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13.5px;
          color: #3d3d42;
          line-height: 1.7;
        }

        .cd-caption-box {
          background: #f7f7fa;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 16px 18px;
          font-size: 14px;
          line-height: 1.7;
          color: #3d3d42;
          white-space: pre-wrap;
          margin-bottom: 16px;
        }
        .cd-hashtag-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .cd-hashtag {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--coral-dark);
          background: #fff1ea;
          border: 1px solid #ffd9c2;
          border-radius: 999px;
          padding: 5px 12px;
        }
        .cd-subheading {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-soft);
          margin: 0 0 10px;
        }

        .cd-guidelines-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 18px 20px;
          margin-bottom: 16px;
        }
        .cd-guidelines-label { font-size: 13.5px; font-weight: 700; margin-bottom: 6px; }
        .cd-guidelines-text { font-size: 13.5px; color: var(--ink-soft); line-height: 1.7; }

        .cd-spec-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
        .cd-spec-tab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          padding: 9px 16px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink-soft);
          cursor: pointer;
        }
        .cd-spec-tab--active { background: #fff7f2; border-color: #ffd9c2; color: var(--coral-dark); }

        .cd-spec-table { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff; }
        .cd-spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 18px;
          font-size: 13.5px;
          border-bottom: 1px solid var(--line);
        }
        .cd-spec-row:last-child { border-bottom: none; }
        .cd-spec-row-label { color: var(--ink-soft); }
        .cd-spec-row-value { font-weight: 500; }
        .cd-spec-pill {
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--coral);
          color: #fff;
        }
        .cd-spec-pill--off { background: #ececef; color: var(--ink-soft); }

        .cd-related-item {
          display: block;
          text-decoration: none;
          color: inherit;
          padding: 10px 0;
          border-bottom: 1px solid var(--line);
        }
        .cd-related-item:last-child { border-bottom: none; }
        .cd-related-title { font-size: 13.5px; font-weight: 600; margin-bottom: 3px; }
        .cd-related-meta { font-size: 12px; color: var(--ink-soft); }

        .cd-sidebar-heading { font-size: 13px; color: var(--ink-soft); margin-bottom: 10px; }

        .cd-cta--disabled { background: #f4a98a; cursor: not-allowed; }
        .cd-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          justify-content: center;
          padding: 12px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .cd-status-pill--pending { background: #fff4de; color: #9a6b00; }
        .cd-status-pill--accepted { background: #e6f7ec; color: #1a8a4a; }
        .cd-status-pill--rejected { background: #fdecec; color: #d64545; }

        .cd-form-field { margin-bottom: 12px; }
        .cd-form-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; }
        .cd-form-input, .cd-form-textarea {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--ink);
          resize: vertical;
        }
        .cd-form-textarea { min-height: 76px; }
        .cd-form-input:focus, .cd-form-textarea:focus {
          outline: none;
          border-color: var(--coral);
        }
        .cd-apply-error {
          font-size: 12.5px;
          color: #d64545;
          background: #fdecec;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 10px;
        }
        .cd-form-actions { display: flex; gap: 8px; }
        .cd-form-cancel {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink);
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
        }
        .cd-form-submit {
          flex: 2;
          padding: 10px;
          border-radius: 10px;
          border: none;
          background: var(--coral);
          color: #fff;
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .cd-form-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .cd-spin { animation: cd-spin 0.8s linear infinite; }
        @keyframes cd-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="cd-topbar">
        <span className="cd-logo">CreatorKhoj</span>
        <Link to="/campaigns" className="cd-nav-link">Browse Campaigns</Link>
      </div>

      {loading && (
        <div className="cd-state">Loading campaign…</div>
      )}

      {!loading && error && (
        <div className="cd-state">
          {error}
          <div style={{ marginTop: 12 }}>
            <button className="cd-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={15} /> Go back
            </button>
          </div>
        </div>
      )}

      {!loading && !error && campaign && (
        <>
          <div className="cd-crumb">
            <Link to="/campaigns">Campaigns</Link> / {campaign.title}
          </div>

          {campaign.hero_image && (
            <div className="cd-hero-banner">
              <img src={campaign.hero_image} alt={campaign.title} />
            </div>
          )}

          <div className="cd-body">
            {/* MAIN COLUMN */}
            <div>
              <button className="cd-back" onClick={() => navigate(-1)}>
                <ArrowLeft size={15} /> Back
              </button>

              <div className="cd-badge">✦ Featured Campaign</div>

              <h1 className="cd-title">{campaign.title}</h1>

              <div className="cd-meta">
                <span className="cd-meta-item">
                  <Building2 size={14} />
                  <b>{campaign.brand_name || 'Business'}</b>
                </span>
                <span className="cd-meta-sep">·</span>
                <span>{campaign.category}</span>
                {campaign.brand_location && (
                  <>
                    <span className="cd-meta-sep">·</span>
                    <span className="cd-meta-item">
                      <MapPin size={14} />
                      {campaign.brand_location}
                    </span>
                  </>
                )}
              </div>

              <div className="cd-tags">
                <span className={`cd-tag cd-tag--type-${campaign.campaign_type}`}>
                  {campaign.campaign_type === 'paid' ? '$ paid' : '🎁 gifted'}
                </span>
                {campaign.sub_category && <span className="cd-tag">{campaign.sub_category}</span>}
              </div>

              <hr className="cd-hr" />

              <h2 className="cd-section-title">About This Campaign</h2>
              <p className="cd-prose">{campaign.description}</p>

              <div className="cd-info-grid">
                <div className="cd-info-card">
                  <div className="cd-info-label">
                    <DollarSign size={15} color={CORAL_DARK} /> Compensation
                  </div>
                  <div className="cd-info-value">
                    {campaign.compensation_description ||
                      (campaign.budget ? `Rs. ${campaign.budget.toLocaleString()}` : 'Not specified')}
                  </div>
                </div>

                <div className="cd-info-card">
                  <div className="cd-info-label">
                    <Calendar size={15} color={CORAL_DARK} /> Deadline
                  </div>
                  {(() => {
                    const dl = formatDeadline(campaign.deadline);
                    if (!dl) return <div className="cd-info-value">No deadline set</div>;
                    return (
                      <div
                        className={`cd-info-value ${
                          dl.closed ? 'cd-info-value--deadline-closed' : 'cd-info-value--deadline-open'
                        }`}
                      >
                        {dl.label}
                      </div>
                    );
                  })()}
                </div>

                {campaign.brand_location && (
                  <div className="cd-info-card cd-info-card--full">
                    <div className="cd-info-label">
                      <MapPin size={15} color={CORAL_DARK} /> Location
                    </div>
                    <div className="cd-info-value">{campaign.brand_location}</div>
                  </div>
                )}
              </div>

              {campaign.requirements && (
                <>
                  <h2 className="cd-section-title">
                    <CheckCircle2 size={17} color={CORAL_DARK} style={{ verticalAlign: -3, marginRight: 6 }} />
                    Requirements
                  </h2>
                  <p className="cd-prose">{campaign.requirements}</p>
                </>
              )}

              {campaign.deliverables && campaign.deliverables.length > 0 && (
                <>
                  <h2 className="cd-section-title">
                    <Target size={17} color={CORAL_DARK} style={{ verticalAlign: -3, marginRight: 6 }} />
                    Deliverables
                  </h2>
                  <ul className="cd-list">
                    {campaign.deliverables.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {campaign.checklist && campaign.checklist.length > 0 && (
                <>
                  <h2 className="cd-section-title">
                    <ListChecks size={17} color={CORAL_DARK} style={{ verticalAlign: -3, marginRight: 6 }} />
                    Quick Checklist
                  </h2>
                  <div className="cd-checklist-grid">
                    {campaign.checklist.map((item, i) => (
                      <div className="cd-checklist-item" key={i}>
                        <span className="cd-checklist-dot">
                          <CheckCircle2 size={12} />
                        </span>
                        {item.text}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {campaign.required_scenes && campaign.required_scenes.length > 0 && (
                <>
                  <h2 className="cd-section-title">
                    <Film size={17} color={CORAL_DARK} style={{ verticalAlign: -3, marginRight: 6 }} />
                    Required Scenes
                  </h2>
                  <div className="cd-scenes">
                    {campaign.required_scenes.map((scene, i) => (
                      <div className="cd-scene" key={i}>
                        <div className="cd-scene-num">{i + 1}</div>
                        <div className="cd-scene-line" />
                        <div className="cd-scene-card">
                          <div className="cd-scene-text">{scene}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {((campaign.dos && campaign.dos.length > 0) || (campaign.donts && campaign.donts.length > 0)) && (
                <>
                  <h2 className="cd-section-title">Do's &amp; Don'ts</h2>
                  <div className="cd-dosdonts">
                    {campaign.dos && campaign.dos.length > 0 && (
                      <div className="cd-dosdonts-card cd-dosdonts-card--do">
                        <div className="cd-dosdonts-heading cd-dosdonts-heading--do">
                          <CheckCircle2 size={15} /> Do
                        </div>
                        {campaign.dos.map((item, i) => (
                          <div className="cd-dosdonts-row" key={i}>
                            <CheckCircle2 size={14} color="#1a8a4a" style={{ marginTop: 2, flexShrink: 0 }} />
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                    {campaign.donts && campaign.donts.length > 0 && (
                      <div className="cd-dosdonts-card cd-dosdonts-card--dont">
                        <div className="cd-dosdonts-heading cd-dosdonts-heading--dont">
                          <X size={15} /> Don't
                        </div>
                        {campaign.donts.map((item, i) => (
                          <div className="cd-dosdonts-row" key={i}>
                            <X size={14} color="#d64545" style={{ marginTop: 2, flexShrink: 0 }} />
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(campaign.suggested_caption || (campaign.hashtags && campaign.hashtags.length > 0)) && (
                <>
                  <h2 className="cd-section-title">
                    <Hash size={17} color={CORAL_DARK} style={{ verticalAlign: -3, marginRight: 6 }} />
                    Caption &amp; Tags
                  </h2>
                  {campaign.suggested_caption && (
                    <>
                      <div className="cd-subheading">
                        <Quote size={13} style={{ verticalAlign: -1, marginRight: 4 }} />
                        Suggested Caption
                      </div>
                      <div className="cd-caption-box">{campaign.suggested_caption}</div>
                    </>
                  )}
                  {campaign.hashtags && campaign.hashtags.length > 0 && (
                    <>
                      <div className="cd-subheading">Hashtags</div>
                      <div className="cd-hashtag-row">
                        {campaign.hashtags.map((tag, i) => (
                          <span className="cd-hashtag" key={i}>
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {(campaign.brief || (campaign.video_specs && campaign.video_specs.length > 0)) && (
                <>
                  <h2 className="cd-section-title">
                    <ClipboardList size={17} color={CORAL_DARK} style={{ verticalAlign: -3, marginRight: 6 }} />
                    Campaign Guidelines
                  </h2>

                  {campaign.brief && (
                    <div className="cd-guidelines-card">
                      <div className="cd-guidelines-label">Overview</div>
                      <div className="cd-guidelines-text">{campaign.brief}</div>
                    </div>
                  )}

                  {campaign.video_specs && campaign.video_specs.length > 0 && (
                    <>
                      <h2 className="cd-section-title" style={{ fontSize: 15, marginTop: 20 }}>
                        <Film size={16} color={CORAL_DARK} style={{ verticalAlign: -3, marginRight: 6 }} />
                        Video Specs
                      </h2>
                      <div className="cd-spec-tabs">
                        {campaign.video_specs.map((spec, i) => {
                          const isTikTok = spec.platform.toLowerCase().includes('tiktok');
                          const Icon = isTikTok ? Music2 : Smartphone;
                          return (
                            <button
                              key={i}
                              className={`cd-spec-tab ${activeSpecTab === i ? 'cd-spec-tab--active' : ''}`}
                              onClick={() => setActiveSpecTab(i)}
                            >
                              <Icon size={14} /> {spec.platform}
                            </button>
                          );
                        })}
                      </div>
                      {campaign.video_specs[activeSpecTab] && (
                        <div className="cd-spec-table">
                          <div className="cd-spec-row">
                            <span className="cd-spec-row-label">Video Length</span>
                            <span className="cd-spec-row-value">
                              {campaign.video_specs[activeSpecTab].duration || '—'}
                            </span>
                          </div>
                          <div className="cd-spec-row">
                            <span className="cd-spec-row-label">Aspect Ratio</span>
                            <span className="cd-spec-row-value">
                              {campaign.video_specs[activeSpecTab].aspect_ratio || '—'}
                            </span>
                          </div>
                          <div className="cd-spec-row">
                            <span className="cd-spec-row-label">
                              <Volume2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                              Voiceover
                            </span>
                            <span
                              className={`cd-spec-pill ${
                                !campaign.video_specs[activeSpecTab].voiceover_required ? 'cd-spec-pill--off' : ''
                              }`}
                            >
                              {campaign.video_specs[activeSpecTab].voiceover_required ? 'Required' : 'Optional'}
                            </span>
                          </div>
                          <div className="cd-spec-row">
                            <span className="cd-spec-row-label">
                              <Captions size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                              Subtitles
                            </span>
                            <span
                              className={`cd-spec-pill ${
                                !campaign.video_specs[activeSpecTab].subtitles_required ? 'cd-spec-pill--off' : ''
                              }`}
                            >
                              {campaign.video_specs[activeSpecTab].subtitles_required ? 'Required' : 'Optional'}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* SIDEBAR */}
            <div className="cd-sidebar">
              {user?.role === 'business' && campaign.business_id === user.id && (
                <div className="cd-card">
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
                    Manage
                  </div>
                  <Link
                    to={`/campaigns/${campaign.id}/edit`}
                    className="cd-cta"
                    style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Edit Campaign
                  </Link>
                  {campaign.status === 'draft' && (
                    <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: 'var(--ink-soft)' }}>
                      This campaign is a draft — only you can see it.
                    </div>
                  )}
                </div>
              )}

              <div className="cd-card">
                <div className="cd-sidebar-title">Interested?</div>
                <div className="cd-sidebar-sub">
                  Apply to collaborate with {campaign.brand_name || 'this brand'}
                </div>

                {(() => {
                  const dl = formatDeadline(campaign.deadline);
                  const deadlinePassed = dl?.closed || campaign.status !== 'published';

                  // Already applied — show status instead of a button.
                  if (myApplication) {
                    const statusLabel =
                      myApplication.status === 'pending'
                        ? 'Application Pending'
                        : myApplication.status === 'accepted'
                        ? 'Application Accepted'
                        : myApplication.status === 'rejected'
                        ? 'Application Rejected'
                        : 'Application Withdrawn';
                    return (
                      <div className={`cd-status-pill cd-status-pill--${myApplication.status}`}>
                        <CheckCircle2 size={15} /> {statusLabel}
                      </div>
                    );
                  }

                  // Not logged in as a creator — businesses previewing
                  // their own listing, or a logged-out visitor, get a
                  // disabled state rather than a broken submit.
                  if (!user || user.role !== 'creator') {
                    return (
                      <button className="cd-cta cd-cta--disabled" disabled>
                        {user ? 'Only creators can apply' : 'Log in to apply'}
                      </button>
                    );
                  }

                  if (deadlinePassed) {
                    return (
                      <button className="cd-cta cd-cta--disabled" disabled>
                        Deadline Passed
                      </button>
                    );
                  }

                  if (showApplyForm) {
                    return (
                      <div>
                        {applyError && <div className="cd-apply-error">{applyError}</div>}
                        <div className="cd-form-field">
                          <label className="cd-form-label">Why are you a fit? *</label>
                          <textarea
                            className="cd-form-textarea"
                            value={proposal}
                            onChange={(e) => setProposal(e.target.value)}
                            placeholder="Tell them about your content style and why this campaign fits your audience…"
                          />
                        </div>
                        <div className="cd-form-field">
                          <label className="cd-form-label">Your rate (optional)</label>
                          <input
                            className="cd-form-input"
                            type="number"
                            min="0"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            placeholder="Rs. 0"
                          />
                        </div>
                        <div className="cd-form-field">
                          <label className="cd-form-label">Message (optional)</label>
                          <textarea
                            className="cd-form-textarea"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Anything else they should know?"
                          />
                        </div>
                        <div className="cd-form-actions">
                          <button
                            className="cd-form-cancel"
                            onClick={() => {
                              setShowApplyForm(false);
                              setApplyError('');
                            }}
                            disabled={applying}
                          >
                            Cancel
                          </button>
                          <button className="cd-form-submit" onClick={handleApplySubmit} disabled={applying}>
                            {applying && <Loader2 size={14} className="cd-spin" />}
                            {applying ? 'Submitting…' : 'Submit'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button className="cd-cta" onClick={() => setShowApplyForm(true)}>
                      Apply Now
                    </button>
                  );
                })()}

                {!myApplication && !showApplyForm && user?.role === 'creator' && (
                  <button className="cd-save" onClick={handleToggleSave} disabled={savingBookmark}>
                    {isSaved ? (
                      <>
                        <BookmarkCheck size={15} style={{ verticalAlign: -3, marginRight: 6 }} />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark size={15} style={{ verticalAlign: -3, marginRight: 6 }} />
                        Save Campaign
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="cd-card">
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
                  About the Brand
                </div>
                <div className="cd-brand-row">
                  <div className="cd-brand-avatar">
                    {(campaign.brand_name || 'B')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="cd-brand-name">{campaign.brand_name || 'Business'}</div>
                    <div className="cd-brand-cat">{campaign.category}</div>
                  </div>
                </div>
              </div>

              {related.length > 0 && (
                <div className="cd-card">
                  <div className="cd-sidebar-heading">Related Campaigns</div>
                  {related.map((c) => (
                    <Link key={c.id} to={`/campaigns/${c.id}`} className="cd-related-item">
                      <div className="cd-related-title">{c.title}</div>
                      <div className="cd-related-meta">
                        {c.brand_name || 'Business'} · {c.category}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
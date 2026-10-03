import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Send,
  Users,
  X,
} from 'lucide-react';

import {
  deleteCampaign,
  duplicateCampaign,
  getApplications,
  getCampaign,
  getPublicBusinessProfile,
  getPublicCampaign,
  getSavedCampaigns,
  publishCampaign,
  saveCampaign,
  unsaveCampaign,
  updateCampaign,
  type Application,
  type Campaign,
  type PublicBusinessProfile,
  type PublicCampaign,
} from '../api/client';

import { useAuth } from '../context/AuthContext';
import { PublicNavbar } from '../components/PublicNavbar';
import { AppLayout } from '../components/AppLayout';
import { ApplyModal } from '../components/ApplyModels';

function money(value?: number | null) {
  if (value == null) return null;

  return `NPR ${Number(value).toLocaleString('en-NP')}`;
}

function dateLabel(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getBudgetLabel(campaign: Campaign) {
  if (campaign.compensation_type === 'Budget range') {
    if (campaign.budget_min != null && campaign.budget_max != null) {
      return `${money(campaign.budget_min)} – ${money(campaign.budget_max)}`;
    }

    if (campaign.budget_min != null) {
      return `From ${money(campaign.budget_min)}`;
    }

    if (campaign.budget_max != null) {
      return `Up to ${money(campaign.budget_max)}`;
    }
  }

  if (campaign.compensation_type === 'Negotiable') {
    return 'Negotiable';
  }

  return money(campaign.budget) || 'Budget not specified';
}

function getPlatform(campaign: Campaign) {
  const publicCampaign = campaign as PublicCampaign;

  if (publicCampaign.required_platforms?.length) {
    return publicCampaign.required_platforms.join(' · ');
  }

  return publicCampaign.required_platform || null;
}



function localDateInputValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function isDeadlinePassed(value?: string | null) {
  if (!value) return false;

  // Date-only deadlines represent the whole local calendar day.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const endOfDay = new Date(`${value}T23:59:59.999`);
    return endOfDay.getTime() < Date.now();
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function tomorrowInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // The detail page keeps the exact navigation of the place that opened it.
  // Landing/home -> PublicNavbar. Dashboard -> AppLayout.
  const fromLanding = searchParams.get('source') === 'landing';
  const fromDashboard = searchParams.get('source') === 'dashboard';
  const wantsApply = searchParams.get('apply') === 'true';
  const backHref = fromLanding ? '/#campaigns' : '/campaigns';
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | PublicCampaign | null>(null);
  const [business, setBusiness] = useState<PublicBusinessProfile | null>(null);

  const [application, setApplication] = useState<Application | null>(null);

  const [saved, setSaved] = useState(false);

  const [showApply, setShowApply] = useState(false);
  const autoApplyHandled = useRef(false);

  const [ownerApplications, setOwnerApplications] = useState<Application[]>([]);
  const [ownerApplicationsLoaded, setOwnerApplicationsLoaded] = useState(false);
  const [ownerApplicationsFailed, setOwnerApplicationsFailed] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [extending, setExtending] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [manageAction, setManageAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isOwner = Boolean(
    user?.role === 'business' && campaign && campaign.business_id === user.id,
  );

  const isCreator = user?.role === 'creator';

  // Opened from a campaign card's "Apply now": show the application popup once.
  useEffect(() => {
    if (
      !wantsApply ||
      autoApplyHandled.current ||
      loading ||
      !campaign ||
      !isCreator ||
      application ||
      campaign.status !== 'published'
    ) {
      return;
    }
    autoApplyHandled.current = true;
    setShowApply(true);
  }, [wantsApply, loading, campaign, isCreator, application]);

  const deadlinePassed = isDeadlinePassed(campaign?.application_deadline);
  const hasAcceptedCreator = ownerApplications.some(
    (a) => a.status === 'accepted' || a.status === 'completed',
  );
  const canExtendCampaign = Boolean(
    isOwner &&
      campaign?.status === 'published' &&
      deadlinePassed &&
      ownerApplicationsLoaded &&
      !hasAcceptedCreator,
  );

  // Say the REAL reason the deadline can or can't be extended, instead of
  // always claiming "a creator was already selected".
  const acceptedCount = ownerApplications.filter(
    (a) => a.status === 'accepted' || a.status === 'completed',
  ).length;

  let deadlineNoticeText = '';
  if (campaign?.status === 'draft') {
    deadlineNoticeText =
      'This deadline is in the past. Edit the campaign and choose a new deadline before publishing.';
  } else if (
    campaign?.status === 'closed' ||
    campaign?.status === 'completed' ||
    campaign?.status === 'cancelled'
  ) {
    deadlineNoticeText = `This campaign is ${campaign.status}, so its deadline can no longer be extended.`;
  } else if (ownerApplicationsFailed) {
    deadlineNoticeText = 'Could not check applications. Refresh the page to try again.';
  } else if (!ownerApplicationsLoaded) {
    deadlineNoticeText = 'Checking applications...';
  } else if (canExtendCampaign) {
    deadlineNoticeText =
      'No creator has been selected yet. Extend the deadline to keep accepting applicants, or delete the campaign.';
  } else if (hasAcceptedCreator) {
    const needed = Number(campaign?.creators_needed || 1);
    deadlineNoticeText =
      acceptedCount < needed
        ? `${acceptedCount} of ${needed} creators selected. The campaign is already in progress, so the deadline can't be extended.`
        : 'A creator was already selected for this campaign.';
  } else {
    deadlineNoticeText = 'This campaign is already in progress.';
  }

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      setNotice('');

      try {
        const data =
          user?.role === 'business'
            ? await getCampaign(id)
            : await getPublicCampaign(id);

        if (cancelled) return;

        setCampaign(data);
        setBusiness(null);

        try {
          const profile = await getPublicBusinessProfile(data.business_id);
          if (!cancelled) setBusiness(profile);
        } catch {
          // Business profile is supplementary; campaign details still work without it.
        }

        setOwnerApplicationsLoaded(false);
        setOwnerApplicationsFailed(false);
        setOwnerApplications([]);

        if (user?.role === 'business' && data.business_id === user.id) {
          try {
            const applications = await getApplications({ campaign_id: data.id });

            if (!cancelled) {
              setOwnerApplications(applications);
              setOwnerApplicationsLoaded(true);
            }
          } catch {
            // Do not show the extension action unless we successfully verified
            // that the campaign has no applications.
            if (!cancelled) {
              setOwnerApplicationsLoaded(false);
              setOwnerApplicationsFailed(true);
            }
          }
        }

        if (user?.role === 'creator') {
          try {
            const applications = await getApplications({
              campaign_id: data.id,
            });

            if (!cancelled) {
              setApplication(
                applications.find((item) => item.creator_id === user.id) || null,
              );
            }
          } catch {
            // Application state is optional.
          }

          try {
            const savedItems = await getSavedCampaigns();

            if (!cancelled) {
              setSaved(savedItems.some((item) => item.campaign_id === data.id));
            }
          } catch {
            // Save state is optional.
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'Could not load this campaign.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user?.id, user?.role]);

  const toggleSave = async () => {
    if (!campaign || !user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'creator') return;

    const previous = saved;

    setSaved(!previous);
    setSaving(true);
    setError('');

    try {
      if (previous) {
        await unsaveCampaign(campaign.id);
      } else {
        await saveCampaign(campaign.id);
      }
    } catch (err: any) {
      setSaved(previous);

      setError(err?.response?.data?.detail || 'Could not update saved status.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!campaign) return;

    setManageAction('publish');
    setError('');

    try {
      setCampaign(await publishCampaign(campaign.id));

      setNotice('Campaign published.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not publish the campaign.');
    } finally {
      setManageAction('');
    }
  };

  const duplicate = async () => {
    if (!campaign) return;

    setManageAction('duplicate');
    setError('');

    try {
      const copy = await duplicateCampaign(campaign.id);

      navigate(`/campaigns/${copy.id}/edit`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not duplicate the campaign.');

      setManageAction('');
    }
  };

  const remove = async () => {
    if (!campaign) return;

    if (!window.confirm(`Delete "${campaign.title}"?`)) {
      return;
    }

    setManageAction('delete');
    setError('');

    try {
      await deleteCampaign(campaign.id);
      navigate('/campaigns');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not delete the campaign.');

      setManageAction('');
    }
  };

  const extendCampaign = async () => {
    if (!campaign || !canExtendCampaign || !extensionDate) return;

    if (
      campaign.application_deadline &&
      extensionDate <= localDateInputValue(campaign.application_deadline)
    ) {
      setError('Choose a new deadline after the current deadline.');
      return;
    }

    setExtending(true);
    setManageAction('extend');
    setError('');

    try {
      const updated = await updateCampaign(campaign.id, {
        application_deadline: extensionDate,
      });

      setCampaign(updated);
      setShowExtend(false);
      setExtensionDate('');
      setNotice(
        `Campaign deadline extended to ${
          dateLabel(updated.application_deadline) || extensionDate
        }.`,
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Could not extend the campaign deadline.',
      );
    } finally {
      setExtending(false);
      setManageAction('');
    }
  };

  const openExtensionModal = () => {
    if (!campaign) return;

    setError('');
    setNotice('');
    setExtensionDate('');
    setShowExtend(true);
  };

  const renderFrame = (content: ReactNode) => {
    if (fromLanding) {
      // Reuse the exact navbar used by the home page. Do not duplicate or
      // restyle the navbar here.
      return (
        <>
          <PublicNavbar />
          {/* PublicNavbar is position:fixed (68px, 64px on mobile), so reserve its space */}
          <div className="cd-navbar-spacer" aria-hidden="true" />
          <style>{`.cd-navbar-spacer{height:68px}@media(max-width:700px){.cd-navbar-spacer{height:64px}}`}</style>
          {content}
        </>
      );
    }

    // Dashboard/detail links use source=dashboard. For authenticated users
    // without a source we keep the dashboard shell as the safe fallback.
    if (fromDashboard || user) {
      return (
        <AppLayout title="Campaign details" showNotifications>
          {content}
        </AppLayout>
      );
    }

    return content;
  };

  if (loading) {
    return renderFrame(
      <div className="cd-state">
        <Loader2 className="spin" size={20} />
        Loading campaign...
        <style>{STYLE}</style>
      </div>,
    );
  }

  if (!campaign) {
    return renderFrame(
      <div className="cd-state">
        <strong>{error || 'Campaign not found.'}</strong>

        <Link to={backHref}>Back to campaigns</Link>

        <style>{STYLE}</style>
      </div>,
    );
  }

  const budgetLabel = getBudgetLabel(campaign);
  const platform = getPlatform(campaign);
  const publicCampaign = campaign as PublicCampaign;
  const businessName = business?.company_name || publicCampaign.brand_name || 'Business';

  return renderFrame(
    <main className="cd-page">
      <style>{STYLE}</style>
      <div className="cd-shell">
        {/* BACK */}
        <Link to={backHref} className="cd-back">
          <ArrowLeft size={15} />
          Back to campaigns
        </Link>

        {/* ALERTS */}
        {error && (
          <div className="cd-alert cd-alert--error">
            <X size={15} />
            {error}
          </div>
        )}

        {notice && (
          <div className="cd-alert">
            <Check size={15} />
            {notice}
          </div>
        )}

        {/* HEADER */}
        <header className="cd-header">
          <div className="cd-header-main">
            <div className="cd-tags">
              {campaign.category && <span>{campaign.category}</span>}
              {campaign.engagement_type && <span>{campaign.engagement_type}</span>}
              {campaign.work_arrangement && <span>{campaign.work_arrangement}</span>}
            </div>

            <div className="cd-title-row">
              <h1>{campaign.title}</h1>

              {isCreator && (
                <button
                  className="cd-save"
                  onClick={() => void toggleSave()}
                  disabled={saving}
                  aria-label={saved ? 'Unsave campaign' : 'Save campaign'}
                >
                  {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                </button>
              )}
            </div>

            <p className="cd-intro">{campaign.description}</p>

            <div className="cd-header-meta">
              <span>
                <MapPin size={13} />
                {campaign.location || 'Remote / flexible'}
              </span>
              <span>
                <Users size={13} />
                {campaign.creators_needed || 1} creators needed
              </span>
              <span>
                <Clock size={13} />
                {campaign.duration || 'Flexible duration'}
              </span>
              {campaign.application_deadline && (
                <span>
                  <CalendarDays size={13} />
                  Apply by {dateLabel(campaign.application_deadline)}
                </span>
              )}
            </div>

            {!isOwner && campaign.status === 'published' && (
              <div className="cd-header-apply">
                {isCreator && !application ? (
                  <button
                    className="cd-apply cd-apply--header"
                    onClick={() => {
                      setError('');
                      setShowApply(true);
                    }}
                  >
                    <Send size={14} />
                    Apply now
                  </button>
                ) : !user ? (
                  <button className="cd-apply cd-apply--header" onClick={() => navigate('/login')}>
                    <Send size={14} />
                    Apply now
                  </button>
                ) : application ? (
                  <div className="cd-header-applied">
                    <Check size={14} />
                    Application submitted
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {isOwner && deadlinePassed && (
            <div className="cd-deadline-notice" role="status">
              <CalendarDays size={16} />
              <div className="cd-deadline-notice-text">
                <strong>Application deadline has passed</strong>
                <span>{deadlineNoticeText}</span>
              </div>

              {canExtendCampaign && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={openExtensionModal}
                  disabled={!!manageAction}
                >
                  <CalendarDays size={14} />
                  Extend deadline
                </button>
              )}
            </div>
          )}

          {isOwner && (
            <div className="cd-owner-actions">
              {campaign.status === 'draft' && (
                <button
                  className="cd-dark"
                  onClick={() => void publish()}
                  disabled={!!manageAction}
                >
                  {manageAction === 'publish' ? 'Publishing...' : 'Publish'}
                </button>
              )}

              <Link className="cd-light" to={`/campaigns/${campaign.id}/edit`}>
                Edit
              </Link>

              <button
                className="cd-light"
                onClick={() => void duplicate()}
                disabled={!!manageAction}
              >
                Duplicate
              </button>

              <button
                className="cd-dark"
                onClick={() => void remove()}
                disabled={!!manageAction}
              >
                {campaign.status === 'draft' ? 'Delete' : 'Delete campaign'}
              </button>
            </div>
          )}
        </header>

        {/* BODY: exact two-column campaign information structure */}
        <div className="cd-layout">
          <div className="cd-column">
            <Section title="About the campaign">
              <p className="cd-copy">
                {campaign.description ||
                  'The business has not provided additional campaign details yet.'}
              </p>
            </Section>

            <Section title="What you'll do">
              <p className="cd-copy">
                {campaign.responsibilities ||
                  campaign.description ||
                  'The selected creator will work with the business to complete the campaign requirements.'}
              </p>
            </Section>

            <Section title="Deliverables">
              {campaign.deliverables?.length ? (
                <ul className="cd-list">
                  {campaign.deliverables.map((item: string, index: number) => (
                    <li key={`${item}-${index}`}>
                      <span className="cd-check"><Check size={13} /></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cd-muted">Deliverables will be agreed with the selected creator.</p>
              )}
            </Section>

            <Section title="Requirements">
              {campaign.requirements ? (
                <p className="cd-copy">{campaign.requirements}</p>
              ) : (
                <div className="cd-info-list cd-info-list--compact">
                  <DetailItem label="Work arrangement" value={campaign.work_arrangement || 'Not specified'} />
                  <DetailItem label="Location" value={campaign.location || 'Remote / flexible'} />
                </div>
              )}
            </Section>
          </div>

          <div className="cd-column">
            <Section title="Campaign details">
              <div className="cd-info-list">
                <DetailItem label="Compensation" value={campaign.compensation_type || 'Not specified'} />
                <DetailItem label="Pricing" value={budgetLabel} />
                <DetailItem label="Location" value={campaign.location || 'Remote / flexible'} />
                <DetailItem label="Experience" value={campaign.experience_level || 'Not specified'} />
                <DetailItem label="Creators needed" value={String(campaign.creators_needed || 1)} />
              </div>
            </Section>

            <Section title="Creator type">
              {campaign.creator_types?.length ? (
                <div className="cd-choice-list">
                  {campaign.creator_types.map((type: string) => (
                    <span key={type}>{type}</span>
                  ))}
                </div>
              ) : (
                <p className="cd-muted">Open to any creator type</p>
              )}
            </Section>

            <Section title="Skills">
              {campaign.required_skills?.length ? (
                <div className="cd-skills">
                  {campaign.required_skills.map((skill: string) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              ) : (
                <p className="cd-muted">No specific skills were listed.</p>
              )}

              {platform && (
                <div className="cd-platform-box">
                  <small>Required platform</small>
                  <strong>{platform}</strong>
                </div>
              )}
            </Section>

            <Section title="Timeline">
              <div className="cd-timeline">
                {campaign.start_date || campaign.end_date ? (
                  <>
                    <TimelineItem label="Campaign starts" value={dateLabel(campaign.start_date)} />
                    <TimelineItem label="Campaign ends" value={dateLabel(campaign.end_date)} />
                  </>
                ) : (
                  <TimelineItem label="Campaign duration" value="Ongoing – starts once selected" />
                )}
                <TimelineItem label="Applications close" value={dateLabel(campaign.application_deadline)} />
              </div>
            </Section>

            <div className="cd-business-card">
              <div className="cd-business-card-title">About the business</div>

              <Link
                to={`/brands/${campaign.business_id}`}
                className="cd-business-profile-link"
                aria-label={`View ${businessName} business profile`}
              >
                <div className="cd-business-card-avatar">
                  {business?.logo_url ? (
                    <img src={business.logo_url} alt={`${businessName} logo`} />
                  ) : (
                    <span>{(businessName.trim()[0] || 'B').toUpperCase()}</span>
                  )}
                </div>

                <div className="cd-business-profile-copy">
                  <strong>{businessName}</strong>
                  {business?.industry && <span>{business.industry}</span>}
                  {business?.location && (
                    <span className="cd-business-location">
                      <MapPin size={11} />
                      {business.location}
                    </span>
                  )}
                </div>

                <ChevronRight size={15} className="cd-business-profile-arrow" />
              </Link>

              <Link to={`/brands/${campaign.business_id}`} className="cd-business-see-more">
                See business profile
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>

      {showApply && (
        <ApplyModal
          isOpen={showApply}
          campaign={campaign}
          onClose={() => setShowApply(false)}
          onSuccess={async () => {
            try {
              const applications = await getApplications({ campaign_id: campaign.id });
              setApplication(
                applications.find((item) => item.creator_id === user?.id) || null,
              );
            } catch {
              // The success state is still shown even if the refresh is unavailable.
            }
          }}
        />
      )}

      {showExtend && canExtendCampaign && (
        <div
          className="cd-extension-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cd-extension-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !extending) {
              setShowExtend(false);
            }
          }}
        >
          <div className="cd-extension-modal">
            <div className="cd-extension-header">
              <div className="cd-extension-header-content">
                <div className="cd-extension-eyebrow">Extend campaign</div>
                <h2 id="cd-extension-title" className="cd-extension-title">
                  Extend the application deadline
                </h2>
                <p className="cd-extension-description">
                  No creators applied before the previous deadline. Choose a new date to keep this campaign open for applications.
                </p>
              </div>

              <button
                type="button"
                className="cd-extension-close"
                onClick={() => setShowExtend(false)}
                disabled={extending}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="cd-extension-date-comparison">
              <div className="cd-extension-date-block">
                <div className="cd-extension-date-label">Current deadline</div>
                <div className="cd-extension-date-value">
                  {dateLabel(campaign.application_deadline) || 'Not specified'}
                </div>
              </div>

              <div className="cd-extension-date-arrow">
                <ChevronRight size={18} />
              </div>

              <div className="cd-extension-date-block">
                <div className="cd-extension-date-label">New deadline</div>
                <div className="cd-extension-date-value">
                  {extensionDate ? dateLabel(extensionDate) : 'Choose a date'}
                </div>
              </div>
            </div>

            <div className="cd-extension-form">
              <label className="cd-extension-field">
                <span className="cd-extension-field-label">
                  Extend applications until
                </span>

                <input
                  className="cd-extension-date-input"
                  type="date"
                  value={extensionDate}
                  min={tomorrowInputValue()}
                  onChange={(event) => setExtensionDate(event.target.value)}
                  disabled={extending}
                  required
                />

                <span className="cd-extension-help">
                  Choose any future date for the new application deadline.
                </span>
              </label>

              <div className="cd-extension-confirmation">
                <Check size={15} />
                <span>
                  Once extended, creators will be able to apply again until the new deadline.
                </span>
              </div>

              <div className="cd-extension-actions">
                <button
                  type="button"
                  className="cd-extension-cancel"
                  onClick={() => setShowExtend(false)}
                  disabled={extending}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="cd-extension-submit"
                  onClick={() => void extendCampaign()}
                  disabled={!extensionDate || extending}
                >
                  {extending ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Extending...
                    </>
                  ) : (
                    <>
                      <CalendarDays size={14} />
                      Extend campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>,
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="cd-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="cd-detail-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function TimelineItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="cd-timeline-item">
      <small>{label}</small>
      <strong>{value || 'Not specified'}</strong>
    </div>
  );
}

const STYLE = `
.cd-page{
  min-height:100vh;
  background:transparent;
  color:#111;
  font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  padding:8px 20px 70px;
}

.cd-shell{
  max-width:1080px;
  margin:0 auto;
}

.cd-back{
  display:inline-flex;
  align-items:center;
  gap:7px;
  color:#777;
  text-decoration:none;
  font-size:11px;
  margin-bottom:18px;
}
.cd-back:hover{color:#111}

.cd-alert{
  display:flex;
  align-items:center;
  gap:7px;
  padding:10px 12px;
  border:1px solid #dedede;
  border-radius:7px;
  color:#444;
  font-size:11px;
  margin-bottom:12px;
}
.cd-alert--error{color:#8b3030;border-color:#e5caca}

.cd-header{
  position:relative;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  column-gap:28px;
  row-gap:16px;
  padding:14px 0 25px;
  border-bottom:1px solid #dedbd4;
  margin-bottom:0;
}
.cd-header-main{min-width:0}

.cd-company-line{
  display:flex;
  align-items:center;
  gap:9px;
  margin-bottom:13px;
}
.cd-company-avatar{
  width:32px;
  height:32px;
  border-radius:7px;
  background:#f2f2f2;
  color:#555;
  display:grid;
  place-items:center;
  overflow:hidden;
}
.cd-company-name{display:block;font-size:11px;font-weight:600}
.cd-company-category{display:block;color:#999;font-size:9.5px;margin-top:2px}

.cd-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.cd-tags span{
  padding:4px 8px;
  border:1px solid #dedede;
  border-radius:999px;
  color:#666;
  font-size:9px;
  text-transform:capitalize;
}

.cd-title-row{display:flex;align-items:flex-start;gap:12px}
.cd-header h1{
  margin:0;
  max-width:760px;
  font-size:30px;
  line-height:1.18;
  letter-spacing:-.035em;
  font-weight:500;
}
.cd-save{
  flex:none;
  width:35px;
  height:35px;
  border:1px solid #ddd;
  border-radius:7px;
  background:#fff;
  color:#222;
  display:grid;
  place-items:center;
  cursor:pointer;
}
.cd-save:hover{border-color:#aaa}
.cd-save:disabled{opacity:.5;cursor:not-allowed}

.cd-intro{
  max-width:760px;
  margin:11px 0 14px;
  color:#666;
  font-size:11.5px;
  line-height:1.7;
}
.cd-header-meta{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  color:#777;
  font-size:10px;
}
.cd-header-meta span{display:inline-flex;align-items:center;gap:5px}

.cd-header-apply{
  display:flex;
  align-items:flex-start;
  margin-top:20px;
  padding-top:0;
}
.cd-apply--header{
  width:auto;
  min-width:116px;
  height:40px;
  margin:0;
  padding:0 17px;
}
.cd-header-applied{
  min-height:40px;
  padding:0 13px;
  display:flex;
  align-items:center;
  gap:6px;
  border:1px solid #ddd;
  border-radius:7px;
  color:#555;
  font-size:10px;
}

.cd-owner-actions{
  grid-column:1 / -1;
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-end;
  gap:6px;
  padding-top:1px;
}

.cd-light,.cd-dark,.cd-apply{
  border-radius:7px;
  font-family:inherit;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  text-decoration:none;
}
.cd-light{
  min-height:34px;
  padding:0 11px;
  border:1px solid #ddd;
  background:#fff;
  color:#222;
  font-size:10.5px;
}
.cd-dark{
  min-height:34px;
  padding:0 12px;
  border:1px solid #111;
  background:#111;
  color:#fff;
  font-size:10.5px;
}
.cd-light:disabled,.cd-dark:disabled{opacity:.5;cursor:not-allowed}

.cd-deadline-notice{
  grid-column:1 / -1;
  display:flex;
  align-items:center;
  gap:12px;
  padding:14px 16px;
  border:1px solid #e6dfcf;
  border-radius:10px;
  background:#faf8f2;
  color:#444;
}
.cd-deadline-notice>svg{flex:none;color:#8a7a4a}
.cd-deadline-notice-text{flex:1;min-width:0}
.cd-deadline-notice strong{display:block;font-size:13px;font-weight:600;color:#222}
.cd-deadline-notice span{display:block;margin-top:3px;color:#666;font-size:12px;line-height:1.5}
.cd-deadline-notice .btn{flex:none}

/* EXACT TWO-COLUMN CONTENT STRUCTURE */
.cd-layout{
  display:grid;
  grid-template-columns:minmax(0,1.55fr) minmax(260px,.82fr);
  column-gap:34px;
  align-items:start;
}

.cd-column{
  min-width:0;
}

.cd-section{
  padding:24px 0;
  border-bottom:1px solid #e3e0d9;
}

.cd-column .cd-section:first-child{
  padding-top:23px;
}

.cd-column .cd-section:last-child{
  border-bottom:0;
}

.cd-section h2{
  margin:0 0 13px;
  color:#111;
  font-size:13px;
  line-height:1.3;
  font-weight:600;
  letter-spacing:-.01em;
}
.cd-copy{
  margin:0;
  color:#5c5c5c;
  font-size:11.5px;
  line-height:1.8;
  white-space:pre-wrap;
}
.cd-muted{margin:0;color:#999;font-size:10.5px;line-height:1.6}

.cd-info-list{display:flex;flex-direction:column;gap:11px}
.cd-info-list--compact{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cd-detail-item{min-width:0}
.cd-detail-item small{display:block;color:#999;font-size:9px;margin-bottom:3px}
.cd-detail-item strong{display:block;color:#333;font-size:10.5px;font-weight:500;line-height:1.5}

.cd-choice-list{display:flex;flex-direction:column;gap:9px}
.cd-choice-list span{
  display:block;
  color:#444;
  font-size:10.5px;
  line-height:1.4;
}

.cd-list{display:flex;flex-direction:column;gap:10px;padding:0;margin:0;list-style:none}
.cd-list li{display:flex;align-items:flex-start;gap:8px;color:#555;font-size:11px;line-height:1.55}
.cd-check{
  width:19px;height:19px;flex:none;
  display:grid;place-items:center;
  background:#f0f0f0;border-radius:50%;color:#222;
}

.cd-skills{display:flex;flex-wrap:wrap;gap:6px}
.cd-skills span{
  padding:6px 9px;
  border:1px solid #ddd;
  border-radius:5px;
  color:#555;
  font-size:9.5px;
}
.cd-platform-box{margin-top:12px;padding-top:11px;border-top:1px solid #e6e3dd}
.cd-platform-box small{display:block;color:#999;font-size:8.5px;margin-bottom:3px}
.cd-platform-box strong{font-size:10px;font-weight:600}

.cd-timeline{display:flex;flex-direction:column;gap:11px}
.cd-timeline-item{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.cd-timeline-item small{color:#999;font-size:9px}
.cd-timeline-item strong{color:#333;font-size:10.5px;font-weight:500;text-align:right}

/* BUSINESS PROFILE */
.cd-business-card{
  margin-top:14px;
  padding:17px 0 0;
  border-top:1px solid #e3e0d9;
}
.cd-business-card-title{
  margin-bottom:12px;
  color:#111;
  font-size:12px;
  font-weight:600;
}
.cd-business-profile-link{
  display:flex;
  align-items:center;
  gap:10px;
  color:#111;
  text-decoration:none;
  border-radius:8px;
}
.cd-business-profile-link:hover .cd-business-profile-copy strong{
  text-decoration:underline;
}
.cd-business-profile-link:hover .cd-business-card-avatar{
  border-color:#bbb;
}
.cd-business-card-avatar{
  width:40px;
  height:40px;
  flex:0 0 40px;
  display:grid;
  place-items:center;
  overflow:hidden;
  border:1px solid #e1e1e1;
  border-radius:9px;
  background:#f3f3f3;
  color:#333;
  font-size:14px;
  font-weight:600;
}
.cd-business-card-avatar img{
  width:100%;
  height:100%;
  object-fit:cover;
}
.cd-business-profile-copy{
  min-width:0;
  flex:1;
}
.cd-business-profile-copy strong{
  display:block;
  color:#111;
  font-size:11.5px;
  font-weight:600;
  line-height:1.35;
}
.cd-business-profile-copy span{
  display:block;
  margin-top:3px;
  color:#777;
  font-size:10px;
  line-height:1.35;
}
.cd-business-profile-copy .cd-business-location{
  display:flex;
  align-items:center;
  gap:3px;
}
.cd-business-profile-arrow{
  flex:0 0 auto;
  color:#999;
}
.cd-business-see-more{
  display:inline-flex;
  align-items:center;
  gap:3px;
  margin-top:10px;
  color:#777;
  font-size:9.5px;
  text-decoration:none;
}
.cd-business-see-more:hover{
  color:#111;
  text-decoration:underline;
}

/* Header / shared buttons */
.cd-extend-owner-button{white-space:nowrap}
.cd-apply{
  border:1px solid #111;
  background:#111;
  color:#fff;
  font-size:11px;
  font-weight:600;
}
.cd-apply:hover{background:#252525}

/* States */
.cd-state{
  min-height:70vh;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  color:#666;font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;
}
.cd-state a{color:#111;font-size:11px}
.spin{animation:cd-spin 1s linear infinite}
@keyframes cd-spin{to{transform:rotate(360deg)}}

/* Apply / extension modal */
.cd-extension-backdrop{
  position:fixed;top:51px;right:0;bottom:0;left:0;z-index:2000;
  display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;
  background:rgba(0,0,0,.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);overflow-y:auto;
}
.cd-extension-modal{
  width:min(500px,calc(100vw - 48px));max-height:calc(100vh - 99px);overflow-y:auto;
  background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.20),0 4px 20px rgba(0,0,0,.08);position:relative;
  animation:cd-extension-in .18s ease-out;
}
@keyframes cd-extension-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.cd-extension-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px 8px}
.cd-extension-header-content{min-width:0}
.cd-extension-eyebrow{margin-bottom:7px;color:#999;font-size:9px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
.cd-extension-title{margin:0;color:#111;font-size:20px;line-height:1.2;font-weight:700}
.cd-extension-description{margin:7px 0 0;color:#777;font-size:12px;line-height:1.55}
.cd-extension-close{flex:0 0 auto;width:30px;height:30px;margin-left:12px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:#111;color:#fff;cursor:pointer}
.cd-extension-close:disabled{opacity:.5;cursor:not-allowed}
.cd-extension-date-comparison{margin:12px 24px 18px;display:grid;grid-template-columns:1fr 32px 1fr;align-items:center;padding:14px;border:1px solid #e4e4e4;border-radius:10px;background:#fafafa}
.cd-extension-date-block{min-width:0}
.cd-extension-date-label{margin-bottom:5px;color:#999;font-size:9px;font-weight:500}
.cd-extension-date-value{color:#222;font-size:12px;font-weight:700}
.cd-extension-date-arrow{display:flex;align-items:center;justify-content:center;color:#aaa}
.cd-extension-form{padding:0 24px 22px}
.cd-extension-field{display:flex;flex-direction:column;gap:7px}
.cd-extension-field-label{color:#333;font-size:12px;font-weight:700}
.cd-extension-date-input{width:100%;height:43px;padding:0 12px;box-sizing:border-box;border:1px solid #d8d8d8;border-radius:8px;background:#fff;color:#222;font-family:inherit;font-size:13px;outline:none}
.cd-extension-date-input:focus{border-color:#111;box-shadow:0 0 0 2px rgba(0,0,0,.05)}
.cd-extension-date-input:disabled{opacity:.65}
.cd-extension-help{color:#999;font-size:10px;line-height:1.4}
.cd-extension-confirmation{display:flex;align-items:center;gap:9px;margin-top:14px;padding:10px 12px;border-radius:7px;background:#f7f7f7;color:#777;font-size:10px;line-height:1.4}
.cd-extension-confirmation svg{flex:0 0 auto;color:#333}
.cd-extension-actions{display:flex;justify-content:flex-end;align-items:center;gap:7px;margin-top:18px}
.cd-extension-cancel,.cd-extension-submit{height:37px;padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:7px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer}
.cd-extension-cancel{border:1px solid #ddd;background:#fff;color:#222}
.cd-extension-submit{border:1px solid #111;background:#111;color:#fff}
.cd-extension-submit:disabled,.cd-extension-cancel:disabled{opacity:.5;cursor:not-allowed}

@media(max-width:760px){
  .cd-page{padding:10px 16px 55px}
  .cd-header{grid-template-columns:1fr;gap:15px}
  .cd-header-apply{padding-top:0}
  .cd-apply--header{width:100%}
  .cd-owner-actions{justify-content:flex-start}
  .cd-deadline-notice{flex-wrap:wrap}
  .cd-deadline-notice .btn{width:100%}
  .cd-layout{grid-template-columns:1fr;column-gap:0}
  .cd-column .cd-section:last-child{border-bottom:1px solid #e3e0d9}
  .cd-column:last-child .cd-section:last-child{border-bottom:0}
  .cd-info-list--compact{grid-template-columns:1fr}
  .cd-timeline-item{justify-content:flex-start;flex-direction:column;gap:3px}
  .cd-timeline-item strong{text-align:left}
}

@media(max-width:600px){
  .cd-header h1{font-size:25px}
  .cd-header-meta{flex-direction:column;gap:7px}
  .cd-extension-backdrop{top:51px;padding:14px}
  .cd-extension-modal{width:calc(100vw - 28px);max-height:calc(100vh - 79px);border-radius:12px}
  .cd-extension-header{padding:18px 18px 8px}
  .cd-extension-title{font-size:18px}
  .cd-extension-description{font-size:11px}
  .cd-extension-date-comparison{margin:10px 18px 16px;padding:12px}
  .cd-extension-form{padding:0 18px 18px}
  .cd-extension-actions{flex-direction:column-reverse;width:100%}
  .cd-extension-cancel,.cd-extension-submit{width:100%}
}
`;


export default CampaignDetail;
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
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
    if (
      campaign.budget_min != null &&
      campaign.budget_max != null
    ) {
      return `${money(campaign.budget_min)} – ${money(
        campaign.budget_max,
      )}`;
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

function getBusinessName(
  campaign: Campaign,
  business?: PublicBusinessProfile | null,
) {
  const publicCampaign = campaign as PublicCampaign;

  return (
    business?.company_name ||
    publicCampaign.brand_name ||
    'Business'
  );
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
  const backHref = fromLanding ? '/#campaigns' : '/campaigns';
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<
    Campaign | PublicCampaign | null
  >(null);

  const [business, setBusiness] =
    useState<PublicBusinessProfile | null>(null);

  const [application, setApplication] =
    useState<Application | null>(null);

  const [saved, setSaved] = useState(false);

  const [showApply, setShowApply] = useState(false);

  const [ownerApplications, setOwnerApplications] = useState<Application[]>([]);
  const [ownerApplicationsLoaded, setOwnerApplicationsLoaded] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [extending, setExtending] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [manageAction, setManageAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isOwner = Boolean(
    user?.role === 'business' &&
      campaign &&
      campaign.business_id === user.id,
  );

  const isCreator = user?.role === 'creator';

  const deadlinePassed = isDeadlinePassed(campaign?.application_deadline);
  const canExtendCampaign = Boolean(
    isOwner &&
      campaign?.status === 'published' &&
      deadlinePassed &&
      ownerApplicationsLoaded &&
      ownerApplications.length === 0,
  );

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

        setOwnerApplicationsLoaded(false);
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
            }
          }
        }

        try {
          const profile =
            await getPublicBusinessProfile(
              data.business_id,
            );

          if (!cancelled) {
            setBusiness(profile);
          }
        } catch {
          // Business profile is supplementary.
        }

        if (user?.role === 'creator') {
          try {
            const applications =
              await getApplications({
                campaign_id: data.id,
              });

            if (!cancelled) {
              setApplication(
                applications.find(
                  (item) =>
                    item.creator_id === user.id,
                ) || null,
              );
            }
          } catch {
            // Application state is optional.
          }

          try {
            const savedItems =
              await getSavedCampaigns();

            if (!cancelled) {
              setSaved(
                savedItems.some(
                  (item) =>
                    item.campaign_id === data.id,
                ),
              );
            }
          } catch {
            // Save state is optional.
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              'Could not load this campaign.',
          );
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

      setError(
        err?.response?.data?.detail ||
          'Could not update saved status.',
      );
    } finally {
      setSaving(false);
    }
  };


  const publish = async () => {
    if (!campaign) return;

    setManageAction('publish');
    setError('');

    try {
      setCampaign(
        await publishCampaign(campaign.id),
      );

      setNotice('Campaign published.');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not publish the campaign.',
      );
    } finally {
      setManageAction('');
    }
  };

  const duplicate = async () => {
    if (!campaign) return;

    setManageAction('duplicate');
    setError('');

    try {
      const copy = await duplicateCampaign(
        campaign.id,
      );

      navigate(`/campaigns/${copy.id}/edit`);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not duplicate the campaign.',
      );

      setManageAction('');
    }
  };

  const remove = async () => {
    if (!campaign) return;

    if (
      !window.confirm(
        `Delete "${campaign.title}"?`,
      )
    ) {
      return;
    }

    setManageAction('delete');
    setError('');

    try {
      await deleteCampaign(campaign.id);
      navigate('/campaigns');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not delete the campaign.',
      );

      setManageAction('');
    }
  };

  const extendCampaign = async () => {
    if (!campaign || !canExtendCampaign || !extensionDate) return;

    if (campaign.application_deadline &&
        extensionDate <= localDateInputValue(campaign.application_deadline)) {
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
      setNotice(`Campaign deadline extended to ${dateLabel(updated.application_deadline) || extensionDate}.`);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not extend the campaign deadline.',
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
      // restyle the navbar here. PublicNavbar handles the same logo, search,
      // profile and Home/Campaigns/For Brands navigation.
      return (
        <>
          <PublicNavbar />
          {content}
        </>
      );
    }

    // Dashboard/detail links use source=dashboard. For authenticated users
    // without a source we keep the dashboard shell as the safe fallback.
    if (fromDashboard || user) {
      return (
        <AppLayout
          title="Campaign details"
          showSearch={false}
          showNotifications
        >
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
        <strong>
          {error || 'Campaign not found.'}
        </strong>

        <Link to={backHref}>
          Back to campaigns
        </Link>

        <style>{STYLE}</style>
      </div>,
    );
  }

  const budgetLabel = getBudgetLabel(campaign);
  const platform = getPlatform(campaign);
  const businessName = getBusinessName(
    campaign,
    business,
  );

  return renderFrame(
    <main className="cd-page">
      <style>{STYLE}</style>
      <div className="cd-shell">

        {/* BACK */}
        <Link
          to={backHref}
          className="cd-back"
        >
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

        {/* JOB HEADER */}
        <header className="cd-header">
          <div className="cd-header-main">

            <div className="cd-company-line">
              <div className="cd-company-avatar">
                <Building2 size={18} />
              </div>

              <div>
                <span className="cd-company-name">
                  {businessName}
                </span>

                <span className="cd-company-category">
                  {campaign.category}
                </span>
              </div>
            </div>

            <div className="cd-title-row">
              <div>
                <div className="cd-tags">
                  <span>{campaign.category}</span>

                  {campaign.engagement_type && (
                    <span>
                      {campaign.engagement_type}
                    </span>
                  )}

                  {platform && (
                    <span>{platform}</span>
                  )}
                </div>

                <h1>{campaign.title}</h1>
              </div>

              {isCreator && (
                <button
                  className="cd-save"
                  onClick={() => void toggleSave()}
                  disabled={saving}
                  aria-label={
                    saved
                      ? 'Unsave campaign'
                      : 'Save campaign'
                  }
                >
                  {saved ? (
                    <BookmarkCheck size={18} />
                  ) : (
                    <Bookmark size={18} />
                  )}
                </button>
              )}
            </div>

            <p className="cd-intro">
              {campaign.description}
            </p>

            <div className="cd-header-meta">
              <span>
                <MapPin size={14} />
                {campaign.location ||
                  'Remote / flexible'}
              </span>

              <span>
                <Users size={14} />
                {campaign.creators_needed || 1}{' '}
                creator
                {campaign.creators_needed === 1
                  ? ''
                  : 's'} needed
              </span>

              <span>
                <Clock3 size={14} />
                {campaign.duration ||
                  'Flexible duration'}
              </span>

              {campaign.application_deadline && (
                <span>
                  <CalendarDays size={14} />
                  Apply by{' '}
                  {dateLabel(
                    campaign.application_deadline,
                  )}
                </span>
              )}
            </div>
          </div>

          {/* BUSINESS MANAGEMENT ACTIONS */}
          {isOwner && (
            <div className="cd-owner-actions">
              {campaign.status === 'draft' && (
                <button
                  className="cd-dark"
                  onClick={() => void publish()}
                  disabled={!!manageAction}
                >
                  {manageAction === 'publish'
                    ? 'Publishing...'
                    : 'Publish'}
                </button>
              )}

              {canExtendCampaign && (
                <button
                  className="cd-dark cd-extend-owner-button"
                  onClick={openExtensionModal}
                  disabled={!!manageAction}
                >
                  <CalendarDays size={14} />
                  Extend deadline
                </button>
              )}

              <Link
                className="cd-light"
                to={`/campaigns/${campaign.id}/edit`}
              >
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
                className="cd-danger"
                onClick={() => void remove()}
                disabled={!!manageAction}
              >
                {campaign.status === 'draft' ? 'Delete' : 'Delete campaign'}
              </button>
            </div>
          )}
        </header>

        {/* MAIN LAYOUT */}
        <div className="cd-layout">

          {/* LEFT */}
          <div className="cd-main">

            {/* ABOUT */}
            <Section title="About the campaign">
              <p className="cd-copy">
                {campaign.responsibilities ||
                  campaign.description ||
                  'The business has not provided additional campaign details yet.'}
              </p>
            </Section>

            {/* REQUIREMENTS */}
            <Section title="Requirements">
              <div className="cd-requirement-grid">
                {campaign.experience_level && (
                  <DetailItem
                    label="Experience level"
                    value={
                      campaign.experience_level
                    }
                  />
                )}

                {campaign.work_arrangement && (
                  <DetailItem
                    label="Work arrangement"
                    value={
                      campaign.work_arrangement
                    }
                  />
                )}

                {campaign.location && (
                  <DetailItem
                    label="Location"
                    value={campaign.location}
                  />
                )}

                {campaign.creator_types?.length ? (
                  <DetailItem
                    label="Creator type"
                    value={campaign.creator_types.join(
                      ', ',
                    )}
                  />
                ) : null}
              </div>

              {campaign.requirements && (
                <p className="cd-copy cd-requirements-copy">
                  {campaign.requirements}
                </p>
              )}
            </Section>

            {/* DELIVERABLES */}
            <Section title="Deliverables">
              {campaign.deliverables?.length ? (
                <ul className="cd-list">
                  {campaign.deliverables.map(
                    (item, index) => (
                      <li
                        key={`${item}-${index}`}
                      >
                        <span className="cd-check">
                          <Check size={13} />
                        </span>

                        <span>{item}</span>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="cd-muted">
                  Deliverables will be agreed with the
                  selected creator.
                </p>
              )}
            </Section>

            {/* SKILLS */}
            <Section title="Skills and content requirements">
              {campaign.required_skills?.length ? (
                <div className="cd-skills">
                  {campaign.required_skills.map(
                    (skill) => (
                      <span key={skill}>
                        {skill}
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <p className="cd-muted">
                  No specific skills were listed.
                </p>
              )}

              {platform && (
                <div className="cd-platform-box">
                  <div>
                    <small>Required platform</small>
                    <strong>{platform}</strong>
                  </div>
                </div>
              )}
            </Section>

            {/* TIMELINE */}
            <Section title="Timeline">
              <div className="cd-timeline">
                <TimelineItem
                  label="Start date"
                  value={dateLabel(
                    campaign.start_date,
                  )}
                />

                <TimelineItem
                  label="End date"
                  value={dateLabel(
                    campaign.end_date,
                  )}
                />

                <TimelineItem
                  label="Application deadline"
                  value={dateLabel(
                    campaign.application_deadline,
                  )}
                />
              </div>

              {campaign.duration && (
                <div className="cd-duration">
                  <Clock3 size={15} />
                  <div>
                    <small>Expected duration</small>
                    <strong>
                      {campaign.duration}
                    </strong>
                  </div>
                </div>
              )}
            </Section>

            {/* COMPENSATION */}
            {campaign.compensation_description && (
              <Section title="Compensation details">
                <p className="cd-copy">
                  {campaign.compensation_description}
                </p>
              </Section>
            )}

          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="cd-sidebar">

            <div className="cd-apply-card">

              <div className="cd-budget-label">
                Compensation
              </div>

              <div className="cd-budget-value">
                {budgetLabel}
              </div>

              <div className="cd-budget-note">
                {campaign.compensation_type ===
                'Budget range'
                  ? 'Budget provided by the business'
                  : campaign.compensation_type ===
                      'Negotiable'
                    ? 'Compensation can be discussed'
                    : 'Campaign compensation'}
              </div>

              {isOwner && deadlinePassed && (
                <div className="cd-deadline-notice">
                  <CalendarDays size={15} />
                  <div>
                    <strong>Application deadline has passed</strong>
                    <span>
                      {canExtendCampaign
                        ? 'No creators applied before the deadline. You can extend it.'
                        : ownerApplicationsLoaded
                          ? 'Applications were received before the deadline.'
                          : 'Checking applications...'}
                    </span>
                  </div>
                </div>
              )}

              {isCreator &&
                !application &&
                campaign.status ===
                  'published' && (
                  <button
                    className="cd-apply"
                    onClick={() => {
                      setError('');
                      setShowApply(true);
                    }}
                  >
                    <Send size={15} />
                    Apply now
                  </button>
                )}

              {!user && (
                <button
                  className="cd-apply"
                  onClick={() =>
                    navigate('/login')
                  }
                >
                  Log in to apply
                </button>
              )}

              {application && (
                <div className="cd-applied">
                  <div className="cd-applied-icon">
                    <Check size={15} />
                  </div>

                  <div>
                    <strong>
                      Application submitted
                    </strong>

                    <span>
                      Status:{' '}
                      {application.status}
                    </span>
                  </div>
                </div>
              )}

              {campaign.status !==
                'published' &&
                !application && (
                  <p className="cd-muted cd-not-accepting">
                    This campaign is not currently
                    accepting applications.
                  </p>
                )}

              <div className="cd-sidebar-divider" />

              <div className="cd-quick-info">
                <QuickInfo
                  label="Budget"
                  value={budgetLabel || 'NPR not specified'}
                />

                <QuickInfo
                  icon={<Users size={15} />}
                  label="Creators needed"
                  value={String(
                    campaign.creators_needed ||
                      1,
                  )}
                />

                <QuickInfo
                  icon={<Clock3 size={15} />}
                  label="Engagement"
                  value={
                    campaign.engagement_type ||
                    'Flexible'
                  }
                />

                <QuickInfo
                  icon={<CalendarDays size={15} />}
                  label="Duration"
                  value={
                    campaign.duration ||
                    'Not specified'
                  }
                />
              </div>
            </div>

            {/* ABOUT THE BUSINESS */}
            <div className="cd-business-card">
              <div className="cd-business-card-title">
                About the business
              </div>

              <Link
                to={`/brands/${campaign.business_id}`}
                className="cd-business-profile-link"
                aria-label={`View ${businessName} business profile`}
              >
                <div className="cd-business-card-avatar">
                  {business?.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={`${businessName} logo`}
                    />
                  ) : (
                    <span>
                      {(businessName.trim()[0] || 'B').toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="cd-business-profile-copy">
                  <strong>{businessName}</strong>

                  {business?.industry && (
                    <span>{business.industry}</span>
                  )}

                  {business?.location && (
                    <span className="cd-business-location">
                      <MapPin size={11} />
                      {business.location}
                    </span>
                  )}
                </div>

                <ChevronRight size={15} className="cd-business-profile-arrow" />
              </Link>

              <Link
                to={`/brands/${campaign.business_id}`}
                className="cd-business-see-more"
              >
                See more
                <ChevronRight size={13} />
              </Link>
            </div>
          </aside>
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
              setApplication(applications.find((item) => item.creator_id === user?.id) || null);
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
      <strong>
        {value || 'Not specified'}
      </strong>
    </div>
  );
}

function QuickInfo({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={`cd-quick-info-item${icon ? '' : ' cd-quick-info-item--no-icon'}`}>
      {icon && (
        <div className="cd-quick-icon">
          {icon}
        </div>
      )}

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

const STYLE = `
.cd-page{
  min-height:100vh;
  background:#fafafa;
  color:#111;
  font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  padding:25px 20px 80px;
}

.cd-shell{
  max-width:1050px;
  margin:0 auto;
}

/* BACK */

.cd-back{
  display:inline-flex;
  align-items:center;
  gap:7px;
  color:#666;
  text-decoration:none;
  font-size:11.5px;
  margin-bottom:18px;
}

.cd-back:hover{
  color:#111;
}

/* ALERTS */

.cd-alert{
  display:flex;
  align-items:center;
  gap:7px;
  padding:10px 12px;
  background:#fff;
  border:1px solid #ddd;
  border-radius:8px;
  font-size:11.5px;
  margin-bottom:12px;
}

.cd-alert--error{
  color:#8b3030;
  background:#fff8f8;
  border-color:#e5caca;
}

/* HEADER */

.cd-header{
  background:#fff;
  border-top:1px solid #e3e3e3;
  border-bottom:1px solid #e3e3e3;
  padding:25px 0 23px;
  margin-bottom:17px;
  display:flex;
  justify-content:space-between;
  gap:25px;
}

.cd-header-main{
  min-width:0;
  flex:1;
}

.cd-company-line{
  display:flex;
  align-items:center;
  gap:9px;
  margin-bottom:17px;
}

.cd-company-avatar{
  width:34px;
  height:34px;
  border-radius:8px;
  background:#f1f1f1;
  color:#555;
  display:grid;
  place-items:center;
}

.cd-company-name{
  display:block;
  font-size:11.5px;
  font-weight:600;
}

.cd-company-category{
  display:block;
  color:#888;
  font-size:10px;
  margin-top:2px;
}

.cd-title-row{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:15px;
}

.cd-tags{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-bottom:8px;
}

.cd-tags span{
  padding:4px 8px;
  border:1px solid #e0e0e0;
  border-radius:999px;
  color:#666;
  font-size:9.5px;
  text-transform:capitalize;
}

.cd-header h1{
  max-width:760px;
  margin:0;
  font-size:30px;
  line-height:1.2;
  letter-spacing:-.035em;
  font-weight:500;
}

.cd-intro{
  max-width:780px;
  margin:12px 0 15px;
  color:#5f5f5f;
  font-size:12.5px;
  line-height:1.7;
}

.cd-header-meta{
  display:flex;
  flex-wrap:wrap;
  gap:13px;
  color:#777;
  font-size:10.5px;
}

.cd-header-meta span{
  display:inline-flex;
  align-items:center;
  gap:5px;
}

.cd-save{
  flex:none;
  width:37px;
  height:37px;
  border:1px solid #ddd;
  border-radius:8px;
  background:#fff;
  display:grid;
  place-items:center;
  color:#222;
  cursor:pointer;
}

.cd-save:hover{
  border-color:#aaa;
}

.cd-save:disabled{
  opacity:.5;
  cursor:not-allowed;
}

/* OWNER */

.cd-owner-actions{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  align-items:flex-start;
  justify-content:flex-end;
}

/* BUTTONS */

.cd-light,
.cd-dark,
.cd-danger,
.cd-apply,
.cd-close{
  border-radius:8px;
  font-family:inherit;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:6px;
  text-decoration:none;
}

.cd-light{
  min-height:36px;
  padding:0 11px;
  border:1px solid #ddd;
  background:#fff;
  color:#222;
  font-size:11px;
}

.cd-dark{
  min-height:36px;
  padding:0 12px;
  border:1px solid #111;
  background:#111;
  color:#fff;
  font-size:11px;
}

.cd-danger{
  min-height:36px;
  padding:0 11px;
  border:1px solid #e1c1c1;
  background:#fff;
  color:#8b3030;
  font-size:11px;
}

.cd-light:disabled,
.cd-dark:disabled,
.cd-danger:disabled{
  opacity:.5;
  cursor:not-allowed;
}

/* LAYOUT */

.cd-layout{
  display:grid;
  grid-template-columns:minmax(0,1fr) 295px;
  gap:17px;
  align-items:start;
}

.cd-main{
  min-width:0;
}

/* SECTIONS */

.cd-section{
  background:#fff;
  border:1px solid #e3e3e3;
  border-radius:10px;
  padding:21px 23px;
  margin-bottom:13px;
}

.cd-section h2{
  margin:0 0 15px;
  font-size:16px;
  font-weight:600;
  letter-spacing:-.015em;
}

.cd-copy{
  margin:0;
  color:#555;
  font-size:12px;
  line-height:1.75;
  white-space:pre-wrap;
}

.cd-muted{
  margin:0;
  color:#888;
  font-size:11.5px;
  line-height:1.6;
}

/* REQUIREMENTS */

.cd-requirement-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
  margin-bottom:15px;
}

.cd-detail-item{
  padding:12px;
  background:#fafafa;
  border:1px solid #ededed;
  border-radius:8px;
}

.cd-detail-item small,
.cd-timeline-item small,
.cd-duration small{
  display:block;
  color:#929292;
  font-size:9.5px;
  margin-bottom:4px;
}

.cd-detail-item strong,
.cd-timeline-item strong,
.cd-duration strong{
  display:block;
  color:#333;
  font-size:11.5px;
  font-weight:600;
}

.cd-requirements-copy{
  padding-top:2px;
}

/* DELIVERABLES */

.cd-list{
  display:flex;
  flex-direction:column;
  gap:11px;
  padding:0;
  margin:0;
  list-style:none;
}

.cd-list li{
  display:flex;
  align-items:flex-start;
  gap:9px;
  color:#4c4c4c;
  font-size:12px;
  line-height:1.55;
}

.cd-check{
  width:20px;
  height:20px;
  flex:none;
  display:grid;
  place-items:center;
  background:#f1f1f1;
  border-radius:50%;
  color:#222;
  margin-top:0;
}

/* SKILLS */

.cd-skills{
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}

.cd-skills span{
  border:1px solid #ddd;
  background:#fafafa;
  color:#555;
  border-radius:5px;
  padding:6px 9px;
  font-size:10.5px;
}

.cd-platform-box{
  margin-top:15px;
  padding-top:15px;
  border-top:1px solid #eee;
}

.cd-platform-box small{
  display:block;
  color:#999;
  font-size:9.5px;
  margin-bottom:3px;
}

.cd-platform-box strong{
  font-size:11.5px;
  font-weight:600;
}

/* TIMELINE */

.cd-timeline{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:9px;
}

.cd-timeline-item{
  padding:12px;
  background:#fafafa;
  border:1px solid #ededed;
  border-radius:8px;
}

.cd-duration{
  display:flex;
  align-items:center;
  gap:9px;
  margin-top:10px;
  padding:11px 12px;
  border:1px solid #eee;
  border-radius:8px;
}

.cd-duration>svg{
  color:#666;
}

/* BUSINESS INLINE */

.cd-business-inline{
  display:flex;
  align-items:center;
  gap:11px;
}

.cd-business-inline-avatar{
  width:40px;
  height:40px;
  display:grid;
  place-items:center;
  border-radius:9px;
  background:#f2f2f2;
  color:#555;
}

.cd-business-inline h3{
  margin:0 0 3px;
  font-size:13px;
  font-weight:600;
}

.cd-business-inline span{
  color:#777;
  font-size:10.5px;
  margin-right:9px;
}

.cd-business-description{
  margin-top:14px;
}

.cd-business-link{
  display:inline-flex;
  align-items:center;
  gap:2px;
  margin-top:12px;
  color:#111;
  font-size:11px;
  text-decoration:none;
  font-weight:600;
}

/* SIDEBAR */

.cd-sidebar{
  min-width:0;
}

.cd-apply-card{
  position:sticky;
  top:18px;
  padding:21px;
  background:#fff;
  border:1px solid #dcdcdc;
  border-radius:10px;
  box-shadow:0 5px 20px rgba(0,0,0,.035);
}

.cd-budget-label{
  color:#888;
  font-size:10px;
  margin-bottom:5px;
}

.cd-budget-value{
  font-size:22px;
  line-height:1.3;
  font-weight:500;
  letter-spacing:-.025em;
}

.cd-budget-note{
  margin-top:4px;
  color:#999;
  font-size:9.5px;
  line-height:1.5;
}

.cd-apply{
  width:100%;
  height:43px;
  margin-top:17px;
  border:1px solid #111;
  background:#111;
  color:#fff;
  font-size:12px;
  font-weight:600;
}

.cd-apply:hover{
  background:#242424;
}

.cd-applied{
  display:flex;
  align-items:flex-start;
  gap:9px;
  margin-top:16px;
  padding:11px;
  background:#fafafa;
  border:1px solid #ddd;
  border-radius:8px;
}

.cd-applied-icon{
  width:22px;
  height:22px;
  flex:none;
  display:grid;
  place-items:center;
  background:#111;
  color:#fff;
  border-radius:50%;
}

.cd-applied strong{
  display:block;
  font-size:11.5px;
  margin-bottom:2px;
}

.cd-applied span{
  display:block;
  color:#777;
  font-size:10px;
  text-transform:capitalize;
}

.cd-not-accepting{
  margin-top:13px;
}

.cd-sidebar-divider{
  height:1px;
  background:#eee;
  margin:18px 0 15px;
}

.cd-quick-info{
  display:flex;
  flex-direction:column;
  gap:13px;
}

.cd-quick-info-item{
  display:flex;
  align-items:center;
  gap:9px;
}

.cd-quick-icon{
  width:29px;
  height:29px;
  display:grid;
  place-items:center;
  background:#f5f5f5;
  border-radius:7px;
  color:#555;
}

.cd-quick-info-item small{
  display:block;
  color:#999;
  font-size:9px;
  margin-bottom:2px;
}

.cd-quick-info-item strong{
  display:block;
  color:#333;
  font-size:10.5px;
  font-weight:600;
}

/* BUSINESS SIDEBAR */

.cd-business-card{
  margin-top:14px;
  padding:17px;
  background:#fff;
  border:1px solid #e3e3e3;
  border-radius:10px;
}

.cd-business-card-title{
  margin-bottom:12px;
  color:#111;
  font-size:12px;
  font-weight:600;
}

.cd-business-profile-link{
  display:flex;
  cursor:pointer;
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

.cd-business-see-more:hover{
  text-decoration:underline;
}

.cd-business-card-avatar{
  width:40px;
  height:40px;
  flex:0 0 40px;
  display:grid;
  place-items:center;
  overflow:hidden;
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
  color:#777;
}

.cd-business-see-more{
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:2px;
  margin-top:13px;
  color:#111;
  font-size:10.5px;
  font-weight:600;
  text-decoration:none;
}

.cd-business-see-more:hover{
  text-decoration:underline;
}

/* EXTEND CAMPAIGN
------------------------------------------------------------ */

.cd-extend-owner-button{
  white-space:nowrap;
}

.cd-deadline-notice{
  display:flex;
  align-items:flex-start;
  gap:9px;
  margin-top:15px;
  padding:11px 10px;
  border:1px solid #e7e7e7;
  border-radius:8px;
  background:#fafafa;
  color:#555;
}

.cd-deadline-notice>svg{
  flex:none;
  color:#555;
  margin-top:1px;
}

.cd-deadline-notice strong{
  display:block;
  color:#222;
  font-size:10.5px;
  font-weight:600;
  line-height:1.4;
}

.cd-deadline-notice span{
  display:block;
  margin-top:3px;
  color:#888;
  font-size:9px;
  line-height:1.45;
}

/* The extension overlay intentionally starts below the public navbar.
   This prevents the modal from covering the navbar while keeping the
   rest of the page dimmed. */
.cd-extension-backdrop{
  position:fixed;
  top:51px;
  right:0;
  bottom:0;
  left:0;
  z-index:2000;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  box-sizing:border-box;
  background:rgba(0,0,0,.42);
  backdrop-filter:blur(2px);
  -webkit-backdrop-filter:blur(2px);
  overflow-y:auto;
}

.cd-extension-modal{
  width:min(500px,calc(100vw - 48px));
  max-height:calc(100vh - 99px);
  overflow-y:auto;
  background:#fff;
  border-radius:14px;
  box-shadow:0 24px 70px rgba(0,0,0,.20),0 4px 20px rgba(0,0,0,.08);
  position:relative;
  animation:cd-extension-in .18s ease-out;
}

@keyframes cd-extension-in{
  from{opacity:0;transform:translateY(8px) scale(.985)}
  to{opacity:1;transform:translateY(0) scale(1)}
}

.cd-extension-header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  padding:20px 24px 8px;
}

.cd-extension-header-content{
  min-width:0;
}

.cd-extension-eyebrow{
  margin-bottom:7px;
  color:#999;
  font-size:9px;
  font-weight:700;
  letter-spacing:.13em;
  text-transform:uppercase;
}

.cd-extension-title{
  margin:0;
  color:#111;
  font-size:20px;
  line-height:1.2;
  font-weight:700;
}

.cd-extension-description{
  margin:7px 0 0;
  color:#777;
  font-size:12px;
  line-height:1.55;
}

.cd-extension-close{
  flex:0 0 auto;
  width:30px;
  height:30px;
  margin-left:12px;
  display:flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:50%;
  background:#111;
  color:#fff;
  cursor:pointer;
}

.cd-extension-close:disabled{
  opacity:.5;
  cursor:not-allowed;
}

.cd-extension-date-comparison{
  margin:12px 24px 18px;
  display:grid;
  grid-template-columns:1fr 32px 1fr;
  align-items:center;
  padding:14px;
  border:1px solid #e4e4e4;
  border-radius:10px;
  background:#fafafa;
}

.cd-extension-date-block{
  min-width:0;
}

.cd-extension-date-label{
  margin-bottom:5px;
  color:#999;
  font-size:9px;
  font-weight:500;
}

.cd-extension-date-value{
  color:#222;
  font-size:12px;
  font-weight:700;
}

.cd-extension-date-arrow{
  display:flex;
  align-items:center;
  justify-content:center;
  color:#aaa;
}

.cd-extension-form{
  padding:0 24px 22px;
}

.cd-extension-field{
  display:flex;
  flex-direction:column;
  gap:7px;
}

.cd-extension-field-label{
  color:#333;
  font-size:12px;
  font-weight:700;
}

.cd-extension-date-input{
  width:100%;
  height:43px;
  padding:0 12px;
  box-sizing:border-box;
  border:1px solid #d8d8d8;
  border-radius:8px;
  background:#fff;
  color:#222;
  font-family:inherit;
  font-size:13px;
  outline:none;
}

.cd-extension-date-input:focus{
  border-color:#111;
  box-shadow:0 0 0 2px rgba(0,0,0,.05);
}

.cd-extension-date-input:disabled{
  opacity:.65;
}

.cd-extension-help{
  color:#999;
  font-size:10px;
  line-height:1.4;
}

.cd-extension-confirmation{
  display:flex;
  align-items:center;
  gap:9px;
  margin-top:14px;
  padding:10px 12px;
  border-radius:7px;
  background:#f7f7f7;
  color:#777;
  font-size:10px;
  line-height:1.4;
}

.cd-extension-confirmation svg{
  flex:0 0 auto;
  color:#333;
}

.cd-extension-actions{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:7px;
  margin-top:18px;
}

.cd-extension-cancel,
.cd-extension-submit{
  height:37px;
  padding:0 15px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  border-radius:7px;
  font-family:inherit;
  font-size:11px;
  font-weight:600;
  cursor:pointer;
}

.cd-extension-cancel{
  border:1px solid #ddd;
  background:#fff;
  color:#222;
}

.cd-extension-cancel:hover{
  background:#f7f7f7;
}

.cd-extension-submit{
  border:1px solid #111;
  background:#111;
  color:#fff;
}

.cd-extension-submit:hover{
  background:#292929;
}

.cd-extension-submit:disabled,
.cd-extension-cancel:disabled{
  opacity:.5;
  cursor:not-allowed;
}

/* MODAL */

.cd-modal-backdrop{
  position:fixed;
  inset:0;
  z-index:50;
  display:grid;
  place-items:center;
  padding:18px;
  background:rgba(0,0,0,.4);
}

.cd-modal{
  width:min(650px,100%);
  max-height:91vh;
  overflow:auto;
  background:#fff;
  border-radius:12px;
  padding:24px;
  box-shadow:0 25px 70px rgba(0,0,0,.2);
}

.cd-modal-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:15px;
  margin-bottom:20px;
}

.cd-modal-eyebrow{
  color:#888;
  text-transform:uppercase;
  letter-spacing:.1em;
  font-size:9px;
  font-weight:600;
  margin-bottom:5px;
}

.cd-modal-head h2{
  margin:0 0 4px;
  font-size:20px;
  font-weight:500;
}

.cd-modal-head p{
  max-width:510px;
  margin:0;
  color:#777;
  font-size:11px;
  line-height:1.5;
}

.cd-close{
  width:32px;
  height:32px;
  flex:none;
  border:1px solid #ddd;
  background:#fff;
}

.cd-proposal-budget{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  padding:14px;
  margin-bottom:18px;
  background:#fafafa;
  border:1px solid #e6e6e6;
  border-radius:9px;
}

.cd-proposal-budget>div>small{
  display:block;
  color:#999;
  font-size:9.5px;
  margin-bottom:4px;
}

.cd-proposal-budget>div>strong{
  display:block;
  font-size:12.5px;
  font-weight:600;
}

.cd-field{
  display:block;
  margin-bottom:17px;
}

.cd-field-title{
  display:block;
  color:#222;
  font-size:11.5px;
  font-weight:600;
}

.cd-field-title b{
  color:#888;
  margin-left:3px;
}

.cd-field-help{
  display:block;
  margin-top:3px;
  color:#888;
  font-size:9.5px;
  line-height:1.5;
}

.cd-field textarea,
.cd-money input{
  width:100%;
  border:1px solid #ddd;
  border-radius:8px;
  background:#fff;
  color:#222;
  font-family:inherit;
  font-size:12px;
  outline:none;
}

.cd-field textarea{
  display:block;
  resize:vertical;
  margin-top:8px;
  padding:10px;
  line-height:1.55;
}

.cd-field textarea:focus,
.cd-money input:focus{
  border-color:#999;
}

.cd-money{
  display:flex;
  margin-top:5px;
}

.cd-money span{
  display:grid;
  place-items:center;
  padding:0 10px;
  border:1px solid #ddd;
  border-right:0;
  background:#f4f4f4;
  color:#777;
  border-radius:8px 0 0 8px;
  font-size:10.5px;
}

.cd-money input{
  height:37px;
  margin:0;
  padding:0 10px;
  border-radius:0 8px 8px 0;
}

.cd-modal-actions{
  display:flex;
  justify-content:flex-end;
  gap:7px;
  padding-top:4px;
}

.cd-modal-cancel{
  min-width:82px;
}

.cd-submit{
  min-width:145px;
}

/* STATES */

.cd-state{
  min-height:70vh;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:11px;
  color:#666;
  font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:12px;
}

.cd-state a{
  color:#111;
  font-size:11px;
}

.spin{
  animation:cd-spin 1s linear infinite;
}

@keyframes cd-spin{
  to{
    transform:rotate(360deg);
  }
}

/* RESPONSIVE */

@media(max-width:850px){
  .cd-layout{
    grid-template-columns:1fr;
  }

  .cd-sidebar{
    order:-1;
  }

  .cd-apply-card{
    position:static;
  }

  .cd-header{
    flex-direction:column;
  }

  .cd-owner-actions{
    justify-content:flex-start;
  }
}

@media(max-width:600px){
  .cd-extension-backdrop{
    top:51px;
    padding:14px;
    align-items:center;
  }

  .cd-extension-modal{
    width:calc(100vw - 28px);
    max-height:calc(100vh - 79px);
    border-radius:12px;
  }

  .cd-extension-header{
    padding:18px 18px 8px;
  }

  .cd-extension-title{
    font-size:18px;
  }

  .cd-extension-description{
    font-size:11px;
  }

  .cd-extension-date-comparison{
    margin:10px 18px 16px;
    padding:12px;
  }

  .cd-extension-form{
    padding:0 18px 18px;
  }

  .cd-extension-actions{
    flex-direction:column-reverse;
    width:100%;
  }

  .cd-extension-cancel,
  .cd-extension-submit{
    width:100%;
  }


  .cd-page{
    padding:20px 14px 60px;
  }

  .cd-header{
    padding:19px 0;
  }

  .cd-header h1{
    font-size:25px;
  }

  .cd-header-meta{
    flex-direction:column;
    gap:7px;
  }

  .cd-requirement-grid,
  .cd-timeline,
  .cd-proposal-budget{
    grid-template-columns:1fr;
  }

  .cd-section{
    padding:18px;
  }

  .cd-modal{
    padding:19px;
  }

  .cd-modal-actions{
    flex-direction:column-reverse;
  }

  .cd-modal-actions button{
    width:100%;
  }
}
`;

export default CampaignDetail;
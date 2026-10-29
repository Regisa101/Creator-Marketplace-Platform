import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Bookmark, BookmarkCheck, Loader2, Share2, X } from 'lucide-react';

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
import { LogoMark } from '../components/Logo';
import { brandDisplayName, isCreatorHub } from '../utils/brand';
import { categoryImage } from '../utils/categoryArt';
import { brandCoverStyle } from '../utils/brandCover';
import { mediaUrl } from '../components/PublicProfileKit';
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

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c',
  tiktok: '#111111',
  youtube: '#ff0000',
  facebook: '#1877f2',
  linkedin: '#0a66c2',
  x: '#111111',
  twitter: '#1d9bf0',
};

function platformColor(name: string) {
  return PLATFORM_COLORS[name.trim().toLowerCase()] || '#197935';
}

/** Whole days until the deadline (0 = today, negative = passed), or null. */
function getDaysLeft(value?: string | null) {
  if (!value) return null;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T23:59:59.999`)
    : new Date(value);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - Date.now()) / 86400000) - (end.getTime() < Date.now() ? 1 : 0);
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
  const [searchParams, setSearchParams] = useSearchParams();

  // The detail page keeps the exact navigation of the place that opened it.
  // Landing/home -> PublicNavbar. Dashboard -> AppLayout.
  const fromLanding = searchParams.get('source') === 'landing';
  const fromDashboard = searchParams.get('source') === 'dashboard';
  const wantsApply = searchParams.get('apply') === 'true';
  const backHref = fromLanding ? '/#campaigns' : '/campaigns';
  const { user, loading: authLoading } = useAuth();

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
  const [showMore, setShowMore] = useState(false);

  const [manageAction, setManageAction] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isOwner = Boolean(
    user?.role === 'business' && campaign && campaign.business_id === user.id,
  );

  const isCreator = user?.role === 'creator';

  // Opened with ?apply=true (from a campaign card's "Apply now", or after
  // logging in from this page): show the application popup once, then remove
  // the flag from the URL so a refresh does not reopen it.
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

    const next = new URLSearchParams(searchParams);
    next.delete('apply');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsApply, loading, campaign, isCreator, application]);

  // Arrived with ?apply=true but not logged in (e.g. "Apply" on a campaign
  // card): send them to login first. After login they return to this exact
  // URL, and the effect above opens the application popup.
  useEffect(() => {
    if (!wantsApply || authLoading || user) return;

    const returnTo = `/campaigns/${id}?${searchParams.toString()}`;

    navigate(`/login?redirect=${encodeURIComponent(returnTo)}`, {
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsApply, authLoading, user, id]);

  // Lock background scroll while the extension popup is open.
  // (ApplyModal locks scroll by itself.)
  useEffect(() => {
    if (!showExtend) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [showExtend]);

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

  // Not logged in: go to login, and come back to this campaign with
  // ?apply=true so the application popup opens right after login.
  const goLoginToApply = () => {
    const params = new URLSearchParams(searchParams);
    params.set('apply', 'true');

    const returnTo = `/campaigns/${id}?${params.toString()}`;

    navigate(`/login?redirect=${encodeURIComponent(returnTo)}`);
  };

  const renderFrame = (content: ReactNode) => {
    // Creators always get the landing-page navbar (the same one used on the
    // dashboard and campaign browse pages), never the brand dashboard shell.
    if (fromLanding || isCreator) {
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
  const publicCampaign = campaign as PublicCampaign;
  const businessName = brandDisplayName(
    business?.company_name || publicCampaign.brand_name,
    'Business'
  );
  // CreatorHub's own campaigns (posted by the platform admin).
  const isHub = isCreatorHub(businessName) || isCreatorHub(publicCampaign.brand_name);

  const platforms: string[] = publicCampaign.required_platforms?.length
    ? publicCampaign.required_platforms
    : publicCampaign.required_platform
      ? [publicCampaign.required_platform]
      : [];

  const daysLeft = getDaysLeft(campaign.application_deadline);
  const deadlineText =
    daysLeft == null
      ? 'Open'
      : daysLeft < 0
        ? 'Closed'
        : daysLeft === 0
          ? 'Last day'
          : daysLeft === 1
            ? '1 day left'
            : `${daysLeft} days left`;

  const needed = Number(campaign.creators_needed || 1);
  const applied = Number(campaign.application_count ?? 0);
  const canApply = !isOwner && campaign.status === 'published';

  const aboutText =
    campaign.description || 'The business has not provided additional campaign details yet.';
  const longAbout = aboutText.length > 420;

  const sourceQuery = fromLanding ? '?source=landing' : fromDashboard ? '?source=dashboard' : '';
  const campaignHref = (campaignId: number) => `/campaigns/${campaignId}${sourceQuery}`;
  const moreFromBrand = (business?.campaigns || [])
    .filter((c) => c.id !== campaign.id && c.status === 'published')
    .slice(0, 3);

  const shareCampaign = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: campaign.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice('Campaign link copied to clipboard.');
      }
    } catch {
      // Sharing was cancelled or is unavailable; nothing to do.
    }
  };

  const applyControl = !canApply ? null : application ? (
    <div className="cd-applied">
      Application submitted
    </div>
  ) : deadlinePassed ? (
    <div className="cd-closed">Applications closed</div>
  ) : isCreator ? (
    <button
      className="cd-apply cd-apply--big"
      onClick={() => {
        setError('');
        setShowApply(true);
      }}
    >
      Apply now
    </button>
  ) : !user ? (
    <button className="cd-apply cd-apply--big" onClick={goLoginToApply}>
      Apply now
    </button>
  ) : null;

  return renderFrame(
    <main className={`cd-page${isCreator ? ' cd-page--white' : ''}`}>
      <style>{STYLE}</style>
      <div className="cd-shell">
        {/* BACK */}
        <Link to={backHref} className="cd-back">
          Back to campaigns
        </Link>

        {/* ALERTS */}
        {error && (
          <div className="cd-alert cd-alert--error">
            {error}
          </div>
        )}

        {notice && (
          <div className="cd-alert">
            {notice}
          </div>
        )}

        {/* HERO: cover photo + business + title */}
        <header className="cd-hero">
          <div
            className="cd-cover"
            style={isHub ? { backgroundImage: 'linear-gradient(135deg,#111 0%,#2b2b2b 55%,#197935 140%)' } : brandCoverStyle(
              {
                name: businessName,
                category: business?.industry || campaign.category,
                hints: [campaign.category, business?.business_type, ...(business?.interested_categories || [])],
                coverUrl: business?.cover_url,
              },
              mediaUrl,
            )}
          >
            <div className="cd-cover-shade" />
            <Link
              to={`/brands/${campaign.business_id}`}
              className="cd-brandchip"
              aria-label={`View ${businessName} business profile`}
            >
              <span className="cd-brandchip-logo">
                {isHub ? (
                  <LogoMark size={28} />
                ) : (
                  <img
                    src={
                      business?.logo_url ||
                      categoryImage(business?.industry, campaign.category, businessName)
                    }
                    alt=""
                  />
                )}
              </span>
              <span className="cd-brandchip-text">
                <strong>{businessName}</strong>
                <small>
                  {business?.location || publicCampaign.brand_location || campaign.location || 'Nepal'}
                </small>
              </span>
            </Link>
          </div>

          <div className="cd-hero-body">
            <div className="cd-tags">
              {campaign.category && <span className="cd-tag-main">{campaign.category}</span>}
              {campaign.engagement_type && <span>{campaign.engagement_type}</span>}
              {campaign.work_arrangement && <span>{campaign.work_arrangement}</span>}
              {campaign.experience_level && <span>{campaign.experience_level}</span>}
              {campaign.status !== 'published' && (
                <span className="cd-tag-status">{campaign.status}</span>
              )}
            </div>

            <div className="cd-title-row">
              <h1>{campaign.title}</h1>

              <div className="cd-title-actions">
                <button
                  className="cd-text-btn"
                  onClick={() => void shareCampaign()}
                  aria-label="Share campaign"
                  title="Share"
                >
                  <Share2 size={17} />
                </button>
                {isCreator && (
                  <button
                    className={`cd-text-btn${saved ? ' is-on' : ''}`}
                    onClick={() => void toggleSave()}
                    disabled={saving}
                    aria-label={saved ? 'Unsave campaign' : 'Save campaign'}
                    title={saved ? 'Saved' : 'Save'}
                  >
                    {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                  </button>
                )}
              </div>
            </div>

            <p className="cd-intro">{campaign.description}</p>

            {/* KEY FACTS: the four things a creator wants to know first */}
            <div className="cd-facts">
              <div className="cd-fact cd-fact--budget">
                <small>Budget</small>
                <strong>{budgetLabel}</strong>
              </div>
              <div className={`cd-fact${daysLeft != null && daysLeft >= 0 && daysLeft <= 3 ? ' cd-fact--urgent' : ''}`}>
                <small>Apply by</small>
                <strong>{deadlineText}</strong>
                {campaign.application_deadline && <em>{dateLabel(campaign.application_deadline)}</em>}
              </div>
              <div className="cd-fact">
                <small>Creators needed</small>
                <strong>{needed} {needed === 1 ? 'creator' : 'creators'}</strong>
                {isOwner && applied > 0 && <em>{applied} applied</em>}
              </div>
              <div className="cd-fact">
                <small>Duration</small>
                <strong>{campaign.duration || 'Flexible'}</strong>
                <em>{campaign.engagement_type || 'One-time'}</em>
              </div>
            </div>
          </div>

          {isOwner && deadlinePassed && (
            <div className="cd-deadline-notice" role="status">
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

        {/* BODY */}
        <div className="cd-layout">
          <div className="cd-main">
            <Section title="About this campaign">
              <p className="cd-copy">
                {longAbout && !showMore ? `${aboutText.slice(0, 380).trimEnd()}…` : aboutText}
              </p>
              {longAbout && (
                <button type="button" className="cd-more" onClick={() => setShowMore((v) => !v)}>
                  {showMore ? 'Show less' : 'Read more'}
                </button>
              )}
            </Section>

            <Section title="What you'll do">
              <p className="cd-copy">
                {campaign.responsibilities ||
                  'The selected creator will work with the business to complete the campaign requirements.'}
              </p>
            </Section>

            <Section title="What you'll deliver">
              {campaign.deliverables?.length ? (
                <div className="cd-deliver">
                  {campaign.deliverables.map((item: string, index: number) => (
                    <div className="cd-deliver-item" key={`${item}-${index}`}>
                      <span className="cd-deliver-no">{index + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cd-muted">Deliverables will be agreed with the selected creator.</p>
              )}
            </Section>

            <Section title="Who we're looking for">
              <div className="cd-looking">
                <div>
                  <small>Creator type</small>
                  <div className="cd-chips">
                    {campaign.creator_types?.length ? (
                      campaign.creator_types.map((type: string) => (
                        <span className="cd-chip cd-chip--green" key={type}>{type}</span>
                      ))
                    ) : (
                      <span className="cd-chip">Open to any creator</span>
                    )}
                  </div>
                </div>

                <div>
                  <small>Platforms</small>
                  <div className="cd-chips">
                    {platforms.length ? (
                      platforms.map((p) => (
                        <span className="cd-chip cd-chip--platform" key={p}>
                          <i style={{ background: platformColor(p) }} />
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="cd-chip">Any platform</span>
                    )}
                  </div>
                </div>

                <div>
                  <small>Skills</small>
                  <div className="cd-chips">
                    {campaign.required_skills?.length ? (
                      campaign.required_skills.map((skill: string) => (
                        <span className="cd-chip" key={skill}>{skill}</span>
                      ))
                    ) : (
                      <span className="cd-chip">No specific skills</span>
                    )}
                  </div>
                </div>
              </div>

              {campaign.requirements && (
                <div className="cd-req">
                  <small>Requirements</small>
                  <p className="cd-copy">{campaign.requirements}</p>
                </div>
              )}
            </Section>

            {moreFromBrand.length > 0 && (
              <Section title={`More from ${businessName}`}>
                <div className="cd-more-list">
                  {moreFromBrand.map((c) => (
                    <Link key={c.id} to={campaignHref(c.id)} className="cd-more-card">
                      <div>
                        <strong>{c.title}</strong>
                        <small>{c.category}</small>
                      </div>
                      <span>{c.budget != null ? money(c.budget) : 'View'}</span>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <aside className="cd-side">
            <div className="cd-applycard">
              <small>Campaign budget</small>
              <div className="cd-applycard-budget">{budgetLabel}</div>

              <div className={`cd-countdown${daysLeft != null && daysLeft >= 0 && daysLeft <= 3 ? ' is-urgent' : ''}${daysLeft != null && daysLeft < 0 ? ' is-closed' : ''}`}>
                {daysLeft == null ? 'Open for applications' : deadlineText}
              </div>

              <div className="cd-applycard-stats">
                <span>{needed} {needed === 1 ? 'spot' : 'spots'} available</span>
                {isOwner && <span>{applied} applied</span>}
              </div>

              {applyControl}

              {!applyControl && !isOwner && (
                <p className="cd-muted">Sign in as a creator to apply to this campaign.</p>
              )}

              <div className="cd-applycard-list">
                <DetailItem label="Compensation" value={campaign.compensation_type || 'Not specified'} />
                <DetailItem label="Experience" value={campaign.experience_level || 'Not specified'} />
                <DetailItem label="Location" value={campaign.location || 'Remote / flexible'} />
                <DetailItem label="Work style" value={campaign.work_arrangement || 'Flexible'} />
              </div>
            </div>

            <div className="cd-business-card">
              <div className="cd-business-card-title">About the business</div>

              <Link
                to={`/brands/${campaign.business_id}`}
                className="cd-business-profile-link"
                aria-label={`View ${businessName} business profile`}
              >
                <div className="cd-business-card-avatar">
                  {isHub ? (
                    <LogoMark size={28} />
                  ) : (
                    <img
                      src={
                        business?.logo_url ||
                        categoryImage(business?.industry, campaign.category, businessName)
                      }
                      alt={`${businessName} logo`}
                    />
                  )}
                </div>

                <div className="cd-business-profile-copy">
                  <strong>{businessName}</strong>
                  {business?.industry && <span>{business.industry}</span>}
                  {business?.location && (
                    <span className="cd-business-location">
                      {business.location}
                    </span>
                  )}
                </div>

              </Link>

              {business && (
                <div className="cd-business-stats">
                  <div>
                    <strong>{business.campaigns?.length ?? 0}</strong>
                    <small>Campaigns</small>
                  </div>
                  <div>
                    <strong>{business.completed_collaborations ?? 0}</strong>
                    <small>Collaborations</small>
                  </div>
                  <div>
                    <strong>{business.creators_worked_with ?? 0}</strong>
                    <small>Creators</small>
                  </div>
                </div>
              )}

              <Link to={`/brands/${campaign.business_id}`} className="cd-business-see-more">
                See business profile
              </Link>
            </div>
          </aside>
        </div>

        {/* Mobile: apply bar that stays at the bottom of the screen */}
        {canApply && (
          <div className="cd-mobilebar">
            <div>
              <small>Budget</small>
              <strong>{budgetLabel}</strong>
            </div>
            {applyControl}
          </div>
        )}

        {/* ApplyModal portals itself to document.body, so it always opens
            over the part of the page the user is currently looking at. */}
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

        {showExtend &&
          canExtendCampaign &&
          createPortal(
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
              <style>{EXTENSION_STYLE}</style>
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
                    to
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
                          Extend campaign
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
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

/*
 * Extension popup styles live in their own string because the popup is
 * rendered in a portal on document.body (outside the page's <style> tag
 * scope is not an issue for CSS, but this keeps the portal self-contained).
 */
const EXTENSION_STYLE = `
.cd-extension-backdrop{
  position:fixed;top:0;right:0;bottom:0;left:0;z-index:20000;
  display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;
  background:rgba(0,0,0,.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);overflow-y:auto;
  font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
.cd-extension-modal{
  width:min(500px,calc(100vw - 48px));max-height:calc(100vh - 48px);overflow-y:auto;
  background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.20),0 4px 20px rgba(0,0,0,.08);position:relative;
  animation:cd-extension-in .18s ease-out;
}
@keyframes cd-extension-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.cd-extension-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px 8px}
.cd-extension-header-content{min-width:0}
.cd-extension-eyebrow{margin-bottom:7px;color:#999;font-size:9px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
.cd-extension-title{margin:0;color:#111;font-size:20px;line-height:1.2;font-weight:700}
.cd-extension-description{margin:7px 0 0;color:#777;font-size:12px;line-height:1.55}
.cd-extension-close{flex:0 0 auto;width:30px;height:30px;margin-left:12px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:#197935;color:#fff;cursor:pointer}
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
.cd-extension-submit{border:1px solid #197935;background:#197935;color:#fff}
.cd-extension-submit:disabled,.cd-extension-cancel:disabled{opacity:.5;cursor:not-allowed}
.spin{animation:cd-spin 1s linear infinite}
@keyframes cd-spin{to{transform:rotate(360deg)}}

@media(max-width:600px){
  .cd-extension-backdrop{padding:14px}
  .cd-extension-modal{width:calc(100vw - 28px);max-height:calc(100vh - 28px);border-radius:12px}
  .cd-extension-header{padding:18px 18px 8px}
  .cd-extension-title{font-size:18px}
  .cd-extension-description{font-size:11px}
  .cd-extension-date-comparison{margin:10px 18px 16px;padding:12px}
  .cd-extension-form{padding:0 18px 18px}
  .cd-extension-actions{flex-direction:column-reverse;width:100%}
  .cd-extension-cancel,.cd-extension-submit{width:100%}
}
`;

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
  border:1px solid #197935;
  background:#197935;
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
  border:1px solid #197935;
  background:#197935;
  color:#fff;
  font-size:11px;
  font-weight:600;
}
.cd-apply:hover{background:#15672d}

/* States */
.cd-state{
  min-height:70vh;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  color:#666;font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:12px;
}
.cd-state a{color:#111;font-size:11px}
.spin{animation:cd-spin 1s linear infinite}
@keyframes cd-spin{to{transform:rotate(360deg)}}

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
}

/* ===================== REDESIGN ===================== */
.cd-page{padding:8px 20px 90px}
.cd-shell{max-width:1120px;animation:cdIn .45s ease both}
@keyframes cdIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.cd-back{font-size:12px;color:#666;margin-bottom:14px}

/* Hero */
.cd-hero{margin-bottom:22px}
.cd-cover{
  position:relative;
  height:230px;
  border-radius:18px 18px 0 0;
  overflow:hidden;
  background-color:#d9ded9;
}
.cd-cover-shade{
  position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(0,0,0,.05) 35%,rgba(0,0,0,.62) 100%);
}
.cd-brandchip{
  position:absolute;left:20px;bottom:18px;
  display:flex;align-items:center;gap:12px;
  padding:9px 14px 9px 9px;
  background:rgba(255,255,255,.96);
  border-radius:14px;
  color:#111;text-decoration:none;
  box-shadow:0 8px 24px rgba(0,0,0,.22);
  max-width:calc(100% - 40px);
  transition:transform .15s;
}
.cd-brandchip:hover{transform:translateY(-1px)}
.cd-brandchip-logo{
  width:46px;height:46px;border-radius:11px;overflow:hidden;
  background:#fff;border:1px solid #eee;display:grid;place-items:center;flex:none;
}
.cd-brandchip-logo img{width:100%;height:100%;object-fit:cover;display:block}
.cd-brandchip-text{display:flex;flex-direction:column;min-width:0}
.cd-brandchip-text strong{font-size:14px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-brandchip-text small{display:flex;align-items:center;gap:4px;color:#777;font-size:11.5px;margin-top:2px}

.cd-hero-body{
  background:#fff;
  border:1px solid #e6e3dd;
  border-top:0;
  border-radius:0 0 18px 18px;
  padding:22px 26px 26px;
}
.cd-tags{margin-bottom:12px;gap:7px}
.cd-tags span{padding:5px 11px;font-size:11px;border-color:#e3e3e3;background:#fafafa;color:#555}
.cd-tags .cd-tag-main{background:#e8f5ec;border-color:#cfe8d6;color:#197935;font-weight:600}
.cd-tags .cd-tag-status{background:#fff4e0;border-color:#f3dcae;color:#9a6200;font-weight:600}
.cd-title-row{align-items:flex-start;justify-content:space-between;gap:16px}
.cd-hero h1{
  margin:0;max-width:780px;
  font-size:34px;line-height:1.15;letter-spacing:-.03em;font-weight:600;color:#111;
}
.cd-title-actions{display:flex;gap:8px;flex:none}
.cd-text-btn{
  display:inline-grid;place-items:center;
  width:40px;height:40px;padding:0;border:1px solid #ddd;border-radius:10px;background:#fff;color:#222;
  font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;
}
.cd-text-btn:hover{border-color:#197935;color:#197935}
.cd-text-btn.is-on{background:#e8f5ec;border-color:#197935;color:#197935}
.cd-text-btn:disabled{opacity:.5;cursor:not-allowed}
.cd-hero .cd-intro{
  max-width:780px;margin:12px 0 22px;color:#555;font-size:14px;line-height:1.7;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
}

/* Key facts */
.cd-facts{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr;gap:12px}
.cd-fact{
  position:relative;
  padding:14px 16px;
  border:1px solid #ebe8e1;border-radius:14px;background:#faf9f6;
  display:flex;flex-direction:column;gap:2px;min-width:0;
}
.cd-fact small{color:#888;font-size:11px;letter-spacing:.02em}
.cd-fact strong{font-size:16px;font-weight:600;color:#111;line-height:1.3}
.cd-fact em{font-style:normal;font-size:11.5px;color:#888}
.cd-fact--budget{background:#197935;border-color:#197935}
.cd-fact--budget small{color:rgba(255,255,255,.8)}
.cd-fact--budget strong{color:#fff;font-size:19px}
.cd-fact--urgent{background:#fff1ee;border-color:#f6cfc6}
.cd-fact--urgent strong{color:#d6381f}

/* Layout */
.cd-layout{
  display:grid;
  grid-template-columns:minmax(0,1fr) 350px;
  gap:24px;
  align-items:start;
}
.cd-main{min-width:0;display:flex;flex-direction:column;gap:16px}
.cd-side{position:sticky;top:84px;display:flex;flex-direction:column;gap:16px;min-width:0}

/* Section cards */
.cd-main .cd-section{
  padding:24px 26px;
  background:#fff;border:1px solid #e6e3dd;border-radius:16px;
}
.cd-section h2{
  margin:0 0 14px;font-size:17px;font-weight:600;letter-spacing:-.015em;color:#111;
}
.cd-main .cd-copy{font-size:14px;line-height:1.8;color:#4d4d4d}
.cd-main .cd-muted{font-size:13px}
.cd-more{
  margin-top:10px;border:0;background:none;color:#197935;font-weight:600;font-size:13px;cursor:pointer;padding:0;
}
.cd-more:hover{text-decoration:underline}

/* Deliverables */
.cd-deliver{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cd-deliver-item{
  display:flex;align-items:center;gap:12px;padding:13px 14px;
  border:1px solid #ebe8e1;border-radius:12px;background:#faf9f6;font-size:13.5px;color:#222;line-height:1.4;
}
.cd-deliver-no{
  width:26px;height:26px;border-radius:50%;background:#197935;color:#fff;
  display:grid;place-items:center;font-size:12px;font-weight:600;flex:none;
}

/* Who we're looking for */
.cd-looking{display:flex;flex-direction:column;gap:16px}
.cd-looking small,.cd-req small{display:block;color:#888;font-size:11.5px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.07em}
.cd-chips{display:flex;flex-wrap:wrap;gap:8px}
.cd-chip{
  display:inline-flex;align-items:center;gap:7px;
  padding:7px 13px;border-radius:999px;border:1px solid #e3e3e3;background:#fafafa;color:#444;font-size:12.5px;
}
.cd-chip--green{background:#e8f5ec;border-color:#cfe8d6;color:#14602a;font-weight:500}
.cd-chip--platform i{width:9px;height:9px;border-radius:50%;display:block}
.cd-req{margin-top:18px;padding-top:16px;border-top:1px solid #eeeae3}

/* More from brand */
.cd-more-list{display:flex;flex-direction:column;gap:10px}
.cd-more-card{
  display:flex;align-items:center;gap:12px;padding:13px 15px;border:1px solid #ebe8e1;border-radius:12px;
  text-decoration:none;color:#111;background:#faf9f6;transition:border-color .15s;
}
.cd-more-card:hover{border-color:#197935}
.cd-more-card>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.cd-more-card strong{font-size:13.5px;font-weight:600}
.cd-more-card small{color:#888;font-size:12px}
.cd-more-card>span{font-size:12.5px;font-weight:600;color:#197935}

/* Apply card */
.cd-applycard{
  padding:22px;background:#fff;border:1px solid #dcd9d1;border-radius:18px;
  box-shadow:0 14px 34px rgba(20,40,25,.09);
}
.cd-applycard>small{color:#888;font-size:12px}
.cd-applycard-budget{font-size:25px;font-weight:700;letter-spacing:-.02em;color:#111;margin:3px 0 12px;line-height:1.2}
.cd-countdown{
  display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;
  background:#e8f5ec;color:#14602a;font-size:13px;font-weight:600;
}
.cd-countdown.is-urgent{background:#fff1ee;color:#d6381f}
.cd-countdown.is-closed{background:#f1f1f1;color:#777}
.cd-applycard-stats{display:flex;gap:16px;margin:14px 0 16px;color:#555;font-size:13px}
.cd-applycard-stats span{display:inline-flex;align-items:center;gap:6px}
.cd-apply--big{
  width:100%;height:50px;border-radius:12px;font-size:15px;
  display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;
  box-shadow:0 8px 20px rgba(25,121,53,.28);transition:transform .15s,background .15s;
}
.cd-apply--big:hover{transform:translateY(-1px)}
.cd-applied,.cd-closed{
  display:flex;align-items:center;justify-content:center;gap:7px;height:50px;border-radius:12px;
  font-size:14px;font-weight:600;
}
.cd-applied{background:#e8f5ec;color:#14602a;border:1px solid #cfe8d6}
.cd-closed{background:#f1f1f1;color:#777;border:1px solid #e3e3e3}
.cd-applycard .cd-muted{margin-top:10px;text-align:center;font-size:12px}
.cd-applycard-list{
  margin-top:18px;padding-top:16px;border-top:1px solid #eeeae3;
  display:grid;grid-template-columns:1fr 1fr;gap:14px;
}
.cd-applycard-list small{font-size:11px;color:#999}
.cd-applycard-list strong{font-size:13px;font-weight:600;color:#222}

/* Business card */
.cd-business-card{background:#fff;border:1px solid #e6e3dd;border-radius:16px;padding:20px}
.cd-business-card-title{font-size:15px;font-weight:600;margin-bottom:12px;color:#111}
.cd-business-stats{
  display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0 4px;
  padding:12px 0;border-top:1px solid #eeeae3;border-bottom:1px solid #eeeae3;text-align:center;
}
.cd-business-stats strong{display:block;font-size:17px;font-weight:700;color:#111}
.cd-business-stats small{font-size:11px;color:#888}

/* Mobile apply bar */
.cd-mobilebar{display:none}

/* Creators see a plain white page background */
.cd-page--white{background:#fff}

@media(max-width:960px){
  .cd-layout{grid-template-columns:1fr}
  .cd-side{position:static}
  .cd-applycard{display:none}
  .cd-facts{grid-template-columns:repeat(2,1fr)}
  .cd-mobilebar{
    position:fixed;left:0;right:0;bottom:0;z-index:40;
    display:flex;align-items:center;justify-content:space-between;gap:14px;
    padding:12px 18px calc(12px + env(safe-area-inset-bottom));
    background:#fff;border-top:1px solid #e0ddd5;box-shadow:0 -8px 24px rgba(0,0,0,.08);
  }
  .cd-mobilebar>div{display:flex;flex-direction:column;min-width:0}
  .cd-mobilebar small{font-size:11px;color:#888}
  .cd-mobilebar strong{font-size:15px;font-weight:700;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cd-mobilebar .cd-apply--big,.cd-mobilebar .cd-applied,.cd-mobilebar .cd-closed{width:auto;flex:none;padding:0 22px;height:46px}
}
@media(max-width:640px){
  .cd-page{padding:6px 12px 100px}
  .cd-cover{height:160px;border-radius:14px 14px 0 0}
  .cd-hero-body{padding:18px 16px 18px;border-radius:0 0 14px 14px}
  .cd-hero h1{font-size:25px}
  .cd-facts{gap:9px}
  .cd-fact{padding:12px}
  .cd-fact strong{font-size:14px}
  .cd-fact--budget strong{font-size:15px}
  .cd-main .cd-section{padding:18px 16px}
  .cd-deliver{grid-template-columns:1fr}
  .cd-brandchip{left:12px;bottom:12px}
}
`;

export default CampaignDetail;
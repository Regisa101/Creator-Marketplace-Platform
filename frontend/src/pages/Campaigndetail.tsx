import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ChevronRight,
  Clipboard,
  Copy,
  DollarSign,
  Film,
  Gift,
  Loader2,
  MapPin,
  Music2,
  Rocket,
  Smartphone,
  Trash2,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import {
  closeCampaign,
  deleteCampaign,
  duplicateCampaign,
  getApplications,
  getCampaign,
  getCampaigns,
  getPublicBusinessProfile,
  getSavedCampaigns,
  publishCampaign,
  saveCampaign,
  unsaveCampaign,
  withdrawApplication,
  type Application,
  type Campaign,
  type PublicBusinessProfile,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { ApplyModal } from '../components/ApplyModels';

const CORAL = '#FF6B5A';
const CORAL_DARK = '#F0523F';
const NAVY = '#1E2A78';

const API_ORIGIN = 'http://localhost:8000';

function resolveMediaUrl(url?: string | null) {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url.replace(/^\/+/, '')}`;
}

function formatDeadline(deadline?: string | null) {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return {
    label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    closed: date.getTime() < Date.now(),
  };
}

function formatMoney(value?: number | null) {
  if (value == null) return '';
  return `Rs. ${Number(value).toLocaleString()}`;
}

function cleanTag(tag: string) {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [brandProfile, setBrandProfile] = useState<PublicBusinessProfile | null>(null);
  const [related, setRelated] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSpecTab, setActiveSpecTab] = useState(0);
  const [activeProductImage, setActiveProductImage] = useState(0);

  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [applicationWithdrawn, setApplicationWithdrawn] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [copied, setCopied] = useState(false);

  const [managing, setManaging] = useState<'publish' | 'delete' | 'duplicate' | 'close' | null>(null);
  const [manageError, setManageError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getCampaign(id);
        if (cancelled) return;
        setCampaign(data);

        try {
          const profile = await getPublicBusinessProfile(data.business_id);
          if (!cancelled) setBrandProfile(profile);
        } catch (err) {
          console.error('Could not load brand profile:', err);
        }

        if (user?.role === 'creator') {
          try {
            const apps = await getApplications({ campaign_id: data.id });
            if (!cancelled) setMyApplication(apps[0] ?? null);
          } catch (err) {
            console.error('Could not check application status:', err);
          }

          try {
            const saved = await getSavedCampaigns();
            if (!cancelled) setIsSaved(saved.some((item) => item.campaign_id === data.id));
          } catch (err) {
            console.error('Could not check saved status:', err);
          }
        }

        try {
          const list = await getCampaigns({ category: data.category, status: 'published', limit: 6 });
          if (!cancelled) setRelated(list.campaigns.filter((item) => item.id !== data.id).slice(0, 3));
        } catch (err) {
          console.error('Could not load related campaigns:', err);
        }
      } catch (err) {
        console.error('Could not load campaign:', err);
        if (!cancelled) setError('This campaign could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, user?.role]);

  const deadline = useMemo(() => formatDeadline(campaign?.deadline), [campaign?.deadline]);
  const brandName = brandProfile?.company_name || campaign?.brand_name || 'Business';
  const brandLocation = brandProfile?.location || campaign?.brand_location || '';
  const brandIndustry = brandProfile?.industry || campaign?.category || '';
  const brandLogo = resolveMediaUrl(brandProfile?.logo_url);
  const productImages = useMemo(() => {
    const extraPhotos = Array.isArray((campaign as (Campaign & { extra_photos?: string[] }) | null)?.extra_photos)
      ? ((campaign as (Campaign & { extra_photos?: string[] }) | null)?.extra_photos || [])
      : [];
    return Array.from(new Set([campaign?.hero_image || '', ...extraPhotos].filter(Boolean))).map(resolveMediaUrl);
  }, [campaign]);

  useEffect(() => {
    if (searchParams.get('apply') !== 'true') return;
    if (!campaign || loading) return;
    if (!user || user.role !== 'creator') return;
    if (myApplication) return;
    if (deadline?.closed || campaign.status !== 'published') return;

    setShowApplyForm(true);
    setSearchParams((params) => { params.delete('apply'); return params; }, { replace: true });
  }, [searchParams, campaign, loading, user, myApplication, deadline, setSearchParams]);

  const handleToggleSave = async () => {
    if (!campaign || savingBookmark) return;
    const previous = isSaved;
    setSavingBookmark(true);
    setIsSaved(!previous);
    try {
      if (previous) await unsaveCampaign(campaign.id);
      else await saveCampaign(campaign.id);
    } catch (err) {
      console.error('Could not update saved status:', err);
      setIsSaved(previous);
    } finally {
      setSavingBookmark(false);
    }
  };

  const openWithdrawConfirmation = () => {
    if (!myApplication || myApplication.status !== 'pending' || withdrawing) return;
    setWithdrawError('');
    setShowWithdrawConfirm(true);
  };

  const cancelWithdraw = () => {
    if (withdrawing) return;
    setShowWithdrawConfirm(false);
    setWithdrawError('');
  };

  const handleWithdraw = async () => {
    if (!myApplication || myApplication.status !== 'pending' || withdrawing) return;

    setWithdrawing(true);
    setWithdrawError('');
    try {
      await withdrawApplication(myApplication.id);
      setMyApplication(null);
      setApplicationWithdrawn(true);
      setShowWithdrawConfirm(false);
    } catch (err: any) {
      console.error('Could not withdraw application:', err);
      setWithdrawError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'We could not withdraw your application. Please try again.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCopyCaption = async () => {
    if (!campaign?.suggested_caption) return;
    try {
      await navigator.clipboard.writeText(campaign.suggested_caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('Could not copy caption:', err);
    }
  };

  const handlePublish = async () => {
    if (!campaign) return;
    setManaging('publish'); setManageError('');
    try { setCampaign(await publishCampaign(campaign.id)); }
    catch (err: any) { setManageError(err?.response?.data?.detail || 'Could not publish. Please try again.'); }
    finally { setManaging(null); }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    if (!window.confirm(`Delete "${campaign.title}"? This can't be undone.`)) return;
    setManaging('delete'); setManageError('');
    try { await deleteCampaign(campaign.id); navigate('/campaigns'); }
    catch (err: any) { setManageError(err?.response?.data?.detail || 'Could not delete. Please try again.'); setManaging(null); }
  };

  const handleClose = async () => {
    if (!campaign) return;
    if (!window.confirm(`Close "${campaign.title}"? Existing applications and collaboration history will be preserved.`)) return;
    setManaging('close'); setManageError('');
    try { setCampaign(await closeCampaign(campaign.id)); }
    catch (err: any) { setManageError(err?.response?.data?.detail || 'Could not close campaign. Please try again.'); }
    finally { setManaging(null); }
  };

  const handleDuplicate = async () => {
    if (!campaign) return;
    setManaging('duplicate'); setManageError('');
    try { const copy = await duplicateCampaign(campaign.id); navigate(`/campaigns/${copy.id}/edit`); }
    catch (err: any) { setManageError(err?.response?.data?.detail || 'Could not duplicate. Please try again.'); setManaging(null); }
  };

  const renderApplicationAction = () => {
    if (!campaign) return null;

    if (myApplication) {
      if (myApplication.status === 'pending') {
        return (
          <div>
            <div className="cd-application-status cd-application-status--pending cd-application-status--with-action">
              <div className="cd-application-status-main">
                <span className="cd-status-dot" aria-hidden="true" />
                <div>
                  <strong>Application pending</strong>
                  <span>The brand has received your application.</span>
                </div>
              </div>
              <button
                type="button"
                className="cd-withdraw-button"
                onClick={openWithdrawConfirmation}
                disabled={withdrawing}
                aria-label="Withdraw application"
              >
                <Trash2 size={14} />
                Withdraw application
              </button>
            </div>
            {showWithdrawConfirm && (
              <div className="cd-withdraw-confirm" role="alertdialog" aria-label="Confirm application withdrawal">
                <div className="cd-withdraw-confirm-title">Withdraw your application?</div>
                <p className="cd-withdraw-confirm-copy">The brand will no longer see this application as pending. You can apply again while the campaign is open.</p>
                {withdrawError && <div className="cd-withdraw-error">{withdrawError}</div>}
                <div className="cd-withdraw-confirm-actions">
                  <button type="button" className="cd-withdraw-cancel" onClick={cancelWithdraw} disabled={withdrawing}>Keep application</button>
                  <button type="button" className="cd-withdraw-confirm-button" onClick={handleWithdraw} disabled={withdrawing}>
                    {withdrawing ? <Loader2 size={13} className="cd-spin" /> : <Trash2 size={13} />}
                    {withdrawing ? 'Withdrawing…' : 'Yes, withdraw'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      if (myApplication.status === 'accepted') {
        return (
          <div className="cd-application-status cd-application-status--accepted">
            <CheckCircle2 size={17} />
            <div>
              <strong>Application accepted</strong>
              <span>Your collaboration with {brandName} is active.</span>
            </div>
          </div>
        );
      }

      if (myApplication.status === 'rejected') {
        return (
          <div className="cd-application-status cd-application-status--rejected">
            <X size={17} />
            <div>
              <strong>Application not selected</strong>
              <span>This campaign won't be available for this application.</span>
            </div>
          </div>
        );
      }
    }

    if (applicationWithdrawn) {
      return (
        <div className="cd-application-status cd-application-status--withdrawn cd-application-status--with-action">
          <div className="cd-application-status-main">
            <CheckCircle2 size={17} />
            <div>
              <strong>Application withdrawn</strong>
              <span>Your application was withdrawn successfully.</span>
            </div>
          </div>
          {user?.role === 'creator' && !deadline?.closed && campaign.status === 'published' && (
            <button
              type="button"
              className="cd-reapply-button"
              onClick={() => { setApplicationWithdrawn(false); setShowApplyForm(true); }}
            >
              Apply again <ChevronRight size={14} />
            </button>
          )}
        </div>
      );
    }

    if (!user || user.role !== 'creator') {
      return <button className="cd-apply-button cd-apply-button--disabled" disabled>{user ? 'Apply unavailable' : 'Sign in to apply'}</button>;
    }

    if (deadline?.closed || campaign.status !== 'published') {
      return <button className="cd-apply-button cd-apply-button--disabled" disabled>Applications closed</button>;
    }

    return (
      <button className="cd-apply-button" onClick={() => setShowApplyForm(true)}>
        Apply to this campaign <ChevronRight size={17} />
      </button>
    );
  };

  return (
    <AppLayout title={campaign?.title || 'Campaign'} subtitle={brandName ? `${brandName}${brandLocation ? ` · ${brandLocation}` : ''}` : undefined} showSearch={false}>
      <div className="cd-page">
        <style>{`
          .cd-page {
            --coral: ${CORAL};
            --coral-dark: ${CORAL_DARK};
            --navy: ${NAVY};
            --ink: #1A1625;
            --muted: #6B6478;
            --soft: #F5F4FA;
            --line: #EAE7F2;
            --radius-lg: 20px;
            --radius-md: 14px;
            --radius-sm: 10px;
            --shadow: 0 6px 22px rgba(26,22,37,.05);
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: var(--ink);
            padding: 4px 24px 70px;
          }
          .cd-page *, .cd-page *::before, .cd-page *::after { box-sizing: border-box; }
          .cd-page a { text-decoration: none; color: inherit; }

          .cd-shell { max-width: 1180px; margin: 0 auto; }
          .cd-back { border: 0; background: transparent; padding: 6px 0; display: inline-flex; align-items: center; gap: 7px; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 16px; }
          .cd-back:hover { color: var(--ink); }

          .cd-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 26px; align-items: start; }
          .cd-main { min-width: 0; }
          .cd-sidebar { position: sticky; top: 20px; display: flex; flex-direction: column; gap: 12px; }

          /* --- hero --- */
          .cd-hero {
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(300px, .95fr);
            gap: 26px;
            align-items: stretch;
            padding: 26px;
            border-radius: var(--radius-lg);
            background: #fff;
            box-shadow: var(--shadow);
          }
          .cd-hero--no-media { grid-template-columns: 1fr; }
          .cd-hero-text { display: flex; flex-direction: column; min-width: 0; }
          .cd-brandline { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
          .cd-brand-logo { width: 44px; height: 44px; border-radius: 13px; overflow: hidden; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; background: var(--coral); color: #fff; font-weight: 800; }
          .cd-brand-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .cd-brandline-name { font-size: 13.5px; font-weight: 700; line-height: 1.3; }
          .cd-brandline-meta { margin-top: 2px; color: var(--muted); font-size: 12px; }
          .cd-title { font-size: clamp(26px, 3.4vw, 38px); line-height: 1.18; letter-spacing: -.5px; max-width: 640px; margin: 0 0 10px; font-weight: 750; color: var(--navy); }
          .cd-tagline { max-width: 620px; margin: 0; color: #555; font-size: 14.5px; line-height: 1.65; }
          .cd-pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
          .cd-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; background: var(--soft); border: 1px solid var(--line); color: #4a4a52; font-size: 12px; font-weight: 600; line-height: 1.2; }
          .cd-pill svg { color: var(--coral-dark); flex: 0 0 auto; }
          .cd-meta-row { display: flex; flex-wrap: wrap; gap: 9px 16px; margin-top: 12px; }
          .cd-meta-item { display: inline-flex; align-items: center; gap: 6px; color: #4a4a52; font-size: 12px; font-weight: 600; }
          .cd-meta-item svg { color: var(--coral-dark); }
          .cd-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: auto; padding-top: 16px; }
          .cd-tags:not(:first-child) { border-top: 1px solid var(--line); }
          .cd-tag { padding: 5px 10px; border-radius: 999px; background: var(--soft); border: 1px solid var(--line); color: #55565e; font-size: 11.5px; font-weight: 600; }
          .cd-tag--accent { color: var(--coral-dark); background: #fff2ed; border-color: #ffd8cc; }

          .cd-hero-media { min-width: 0; min-height: 0; display: flex; flex-direction: column; border-radius: var(--radius-md); overflow: hidden; background: var(--soft); border: 1px solid var(--line); }
          .cd-product-gallery-main { position: relative; background: var(--soft); display: flex; align-items: center; justify-content: center; flex: 1 1 auto; min-height: 240px; overflow: hidden; }
          .cd-product-gallery-main img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .cd-product-gallery-count { position: absolute; right: 12px; bottom: 12px; padding: 5px 9px; border-radius: 999px; background: rgba(26,22,37,.68); color: #fff; font-size: 10px; font-weight: 700; }
          .cd-product-gallery-footer { flex: 0 0 auto; padding: 11px 12px 12px; background: #fff; border-top: 1px solid var(--line); }
          .cd-product-gallery-label { color: #55565e; font-size: 10.5px; font-weight: 750; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
          .cd-product-thumbs { display: flex; gap: 7px; overflow-x: auto; }
          .cd-product-thumb { width: 50px; height: 50px; padding: 0; border: 1px solid var(--line); border-radius: 9px; overflow: hidden; background: var(--soft); cursor: pointer; flex: 0 0 auto; opacity: .7; }
          .cd-product-thumb:hover { opacity: 1; }
          .cd-product-thumb--active { opacity: 1; border: 2px solid var(--coral); }
          .cd-product-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

          /* --- sections --- */
          .cd-section { margin-top: 34px; }
          .cd-section-header { margin-bottom: 14px; }
          .cd-section-title { margin: 0; font-size: 18px; letter-spacing: -.2px; font-weight: 750; color: var(--navy); }
          .cd-section-intro { margin: 4px 0 0; color: var(--muted); font-size: 12.5px; line-height: 1.6; }
          .cd-prose { color: #3a3a42; font-size: 14px; line-height: 1.75; white-space: pre-wrap; margin: 0; }
          .cd-prose + .cd-prose { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); }

          .cd-opportunity { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          @media (max-width: 720px) { .cd-opportunity { grid-template-columns: repeat(2, 1fr); } }
          .cd-opportunity-card { display: flex; flex-direction: column; background: #fff; border-radius: var(--radius-md); padding: 16px; min-height: 100px; box-shadow: var(--shadow); }
          .cd-opportunity-label { color: #8b8b93; font-size: 11px; font-weight: 600; margin-bottom: 8px; }
          .cd-opportunity-value { font-size: 14px; line-height: 1.4; font-weight: 700; margin-top: auto; }
          .cd-opportunity-value--open { color: #1a8a4a; }
          .cd-opportunity-icon { color: var(--coral-dark); margin-bottom: 10px; }

          .cd-brief { background: #fff; border-radius: var(--radius-md); padding: 20px 22px; box-shadow: var(--shadow); }
          .cd-brief-label { color: var(--coral-dark); font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 10px; }

          .cd-deliverables { background: #fff; border-radius: var(--radius-md); padding: 0 20px; box-shadow: var(--shadow); }
          .cd-deliverable { display: grid; grid-template-columns: 38px minmax(0,1fr); gap: 14px; align-items: start; padding: 16px 0; border-bottom: 1px solid var(--line); }
          .cd-deliverable:last-child { border-bottom: 0; }
          .cd-number { width: 32px; height: 32px; border-radius: 10px; background: #fff0eb; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
          .cd-deliverable-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; line-height: 1.4; }
          .cd-deliverable-copy { color: var(--muted); font-size: 12.5px; line-height: 1.6; }

          .cd-requirement-list { margin: 0; padding: 0 20px; list-style: none; background: #fff; border-radius: var(--radius-md); box-shadow: var(--shadow); }
          .cd-requirement-list li { display: flex; align-items: flex-start; gap: 12px; padding: 13px 0; color: #3a3a42; font-size: 13.5px; line-height: 1.6; border-bottom: 1px solid var(--line); }
          .cd-requirement-list li:last-child { border-bottom: 0; }
          .cd-check { width: 19px; height: 19px; border-radius: 50%; background: #fff0eb; color: var(--coral-dark); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; margin-top: 1px; }

          .cd-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          @media (max-width: 720px) { .cd-checklist { grid-template-columns: 1fr; } }
          .cd-checklist-item { min-height: 50px; display: flex; align-items: center; gap: 10px; background: #fff; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 12.5px; line-height: 1.5; color: #3a3a42; box-shadow: var(--shadow); }
          .cd-checklist-item .cd-check { background: #edf8f1; color: #21894c; }

          .cd-scenes { background: #fff; border-radius: var(--radius-md); box-shadow: var(--shadow); padding: 20px 20px 4px; }
          .cd-scene { position: relative; display: grid; grid-template-columns: 32px minmax(0,1fr); gap: 14px; padding-bottom: 20px; }
          .cd-scene:last-child { padding-bottom: 16px; }
          .cd-scene-line { position: absolute; left: 15px; top: 34px; bottom: 0; width: 1px; background: #ffd5ca; }
          .cd-scene:last-child .cd-scene-line { display: none; }
          .cd-scene-num { width: 32px; height: 32px; border-radius: 50%; background: #fff; border: 2px solid #ffd0c6; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; position: relative; z-index: 1; flex: 0 0 auto; }
          .cd-scene-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; line-height: 1.4; padding-top: 5px; }
          .cd-scene-copy { color: var(--muted); font-size: 12.5px; line-height: 1.6; }

          .cd-dosdonts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
          @media (max-width: 720px) { .cd-dosdonts { grid-template-columns: 1fr; } }
          .cd-do, .cd-dont { border-radius: var(--radius-md); padding: 18px 20px; }
          .cd-do { background: #f3fbf6; border: 1px solid #ccebd7; }
          .cd-dont { background: #fff6f5; border: 1px solid #f2ceca; }
          .cd-rule-heading { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 750; margin-bottom: 10px; }
          .cd-rule-heading--do { color: #21894c; }
          .cd-rule-heading--dont { color: #cf4944; }
          .cd-rule { display: flex; align-items: flex-start; gap: 9px; padding: 6px 0; color: #45464d; font-size: 13px; line-height: 1.6; }
          .cd-rule svg { flex: 0 0 auto; margin-top: 3px; }

          .cd-caption { background: #fff; border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow); }
          .cd-caption-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--line); }
          .cd-caption-label { color: #85868e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
          .cd-copy-button { border: 1px solid var(--line); background: #fff; color: #4f5058; border-radius: 9px; padding: 7px 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
          .cd-copy-button:hover { border-color: #c9c9d1; color: var(--ink); }
          .cd-caption-text { padding: 16px 18px; white-space: pre-wrap; color: #3a3a42; font-size: 13.5px; line-height: 1.75; }
          .cd-hashtags { display: flex; flex-wrap: wrap; gap: 7px; padding: 0 18px 18px; }
          .cd-hashtag { color: var(--navy); background: #f2f4fc; border: 1px solid #d7ddf5; border-radius: 999px; padding: 5px 10px; font-size: 11.5px; font-weight: 650; }

          .cd-spec-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
          .cd-spec-tab { border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 8px 12px; display: inline-flex; align-items: center; gap: 6px; color: #686971; font-size: 12px; font-weight: 650; cursor: pointer; }
          .cd-spec-tab--active { border-color: #ffcdbf; color: var(--coral-dark); background: #fff5f1; }
          .cd-spec-table { background: #fff; border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow); }
          .cd-spec-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 18px; border-bottom: 1px solid var(--line); font-size: 13px; }
          .cd-spec-row:last-child { border-bottom: 0; }
          .cd-spec-row-label { color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
          .cd-spec-row-value { font-weight: 700; text-align: right; }
          .cd-spec-pill { padding: 4px 9px; border-radius: 999px; background: #fff0eb; color: var(--coral-dark); font-size: 10.5px; font-weight: 750; }
          .cd-spec-pill--off { background: #f0f0f3; color: #73747c; }

          .cd-guidelines-note { display: flex; gap: 14px; align-items: flex-start; background: #fff8f2; border: 1px solid #ffe1d2; border-radius: var(--radius-md); padding: 18px 20px; }
          .cd-guidelines-note-icon { width: 32px; height: 32px; border-radius: 10px; background: #fff0eb; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
          .cd-guidelines-note-title { font-size: 14px; font-weight: 750; margin-bottom: 5px; }
          .cd-guidelines-note-copy { margin: 0; color: #5c5d66; font-size: 13px; line-height: 1.7; }

          .cd-withdraw-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 7px 12px; border-radius: 9px; border: 1px solid #f1b4ad; background: #fff; color: #c84642; font-size: 11.5px; font-weight: 750; cursor: pointer; white-space: nowrap; transition: background .16s ease, border-color .16s ease, transform .16s ease; }
          .cd-withdraw-button:hover:not(:disabled) { background: #fff5f3; border-color: #e98e84; transform: translateY(-1px); }
          .cd-withdraw-button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
          .cd-application-status--with-action { justify-content: space-between; text-align: left; }
          .cd-application-status-main { display: flex; align-items: center; gap: 9px; min-width: 0; }
          .cd-application-status-main > div, .cd-application-status > div:not(.cd-application-status-main) { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
          .cd-application-status strong { font-size: 12px; line-height: 1.35; }
          .cd-application-status span:not(.cd-status-dot) { font-size: 10.5px; font-weight: 550; line-height: 1.45; opacity: .82; }
          .cd-status-dot { width: 8px; height: 8px; border-radius: 999px; background: #d39b00; flex: 0 0 auto; box-shadow: 0 0 0 4px rgba(211,155,0,.12); }
          .cd-reapply-button { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-height: 34px; padding: 7px 12px; border: 1px solid #d7ddf5; border-radius: 9px; background: #fff; color: var(--navy); font-size: 11.5px; font-weight: 750; cursor: pointer; white-space: nowrap; }
          .cd-reapply-button:hover { background: #f7f8fe; border-color: #bdc6ec; }
          .cd-withdraw-confirm { margin-top: 9px; padding: 12px; border: 1px solid #f0d5d0; border-radius: 10px; background: #fff9f7; }
          .cd-withdraw-confirm-title { color: #33333a; font-size: 11.5px; font-weight: 750; margin-bottom: 3px; }
          .cd-withdraw-confirm-copy { color: #6b6478; font-size: 10.5px; line-height: 1.5; margin: 0 0 9px; }
          .cd-withdraw-confirm-actions { display: flex; justify-content: flex-end; gap: 7px; }
          .cd-withdraw-cancel, .cd-withdraw-confirm-button { min-height: 32px; padding: 6px 11px; border-radius: 8px; font-size: 10.5px; font-weight: 750; cursor: pointer; }
          .cd-withdraw-cancel { border: 1px solid var(--line); background: #fff; color: #55565e; }
          .cd-withdraw-confirm-button { border: 1px solid #dc6d63; background: #dc6d63; color: #fff; }
          .cd-withdraw-confirm-button:hover:not(:disabled) { background: #c9584e; border-color: #c9584e; }
          .cd-withdraw-confirm-button:disabled, .cd-withdraw-cancel:disabled { opacity: .6; cursor: not-allowed; }
          .cd-withdraw-error { margin-top: 8px; color: #c84642; font-size: 10.5px; line-height: 1.45; }

          /* --- sidebar cards --- */
          .cd-side-card { background: #fff; border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow); }
          .cd-side-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13.5px; font-weight: 750; margin-bottom: 12px; }

          .cd-apply-bar { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; background: #fff; border: 1px solid #ffd6ce; border-radius: var(--radius-md); padding: 18px 22px; margin-top: 22px; box-shadow: var(--shadow); }
          .cd-apply-bar-text strong { display: block; font-size: 15px; font-weight: 800; color: #20213a; margin-bottom: 3px; }
          .cd-apply-bar-text span { display: block; font-size: 12.5px; color: var(--muted); line-height: 1.5; }
          .cd-apply-bar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
          .cd-apply-bar-actions .cd-apply-button,
          .cd-apply-bar-actions .cd-save-button,
          .cd-apply-bar-actions .cd-application-status { width: auto; min-width: 210px; }
          .cd-apply-button { width: 100%; min-height: 43px; border: 1px solid var(--coral); border-radius: 11px; background: var(--coral); color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 750; cursor: pointer; }
          .cd-apply-button:hover:not(:disabled) { background: var(--coral-dark); border-color: var(--coral-dark); }
          .cd-apply-button:disabled { opacity: .72; cursor: not-allowed; }
          .cd-apply-button--disabled { background: #f0b5a9; border-color: #f0b5a9; }
          .cd-save-button { width: 100%; margin-top: 9px; min-height: 41px; border: 1px solid var(--line); border-radius: 11px; background: #fff; color: #383941; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
          .cd-save-button:hover { border-color: #c8c8d0; background: #fafafd; }

          .cd-side-stat { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--line); }
          .cd-side-stat:last-child { border-bottom: 0; padding-bottom: 0; }
          .cd-side-stat-icon { color: var(--coral-dark); margin-top: 1px; flex: 0 0 auto; }
          .cd-side-stat-label { color: #8b8b93; font-size: 10.5px; margin-bottom: 2px; }
          .cd-side-stat-value { color: #333; font-size: 12.5px; font-weight: 700; line-height: 1.5; }

          .cd-brand-side { text-decoration: none; color: inherit; }
          .cd-brand-side-row { display: flex; align-items: center; gap: 11px; }
          .cd-brand-side-logo { width: 42px; height: 42px; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--coral); color: #fff; font-weight: 800; flex: 0 0 auto; }
          .cd-brand-side-logo img { width: 100%; height: 100%; object-fit: cover; }
          .cd-brand-side-name { font-size: 13px; font-weight: 750; }
          .cd-brand-side-meta { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
          .cd-brand-side-link { margin-top: 12px; color: var(--coral-dark); font-size: 11.5px; font-weight: 750; display: flex; align-items: center; justify-content: space-between; }

          .cd-related-item { display: block; padding: 11px 0; border-bottom: 1px solid var(--line); }
          .cd-related-item:last-child { border-bottom: 0; padding-bottom: 0; }
          .cd-related-title { font-size: 12.5px; font-weight: 700; line-height: 1.45; margin-bottom: 3px; }
          .cd-related-meta { color: var(--muted); font-size: 10.5px; }

          .cd-apply-form label { display: block; color: #55565e; font-size: 11px; font-weight: 700; margin: 11px 0 5px; }
          .cd-apply-form label span { color: #999aa1; font-weight: 500; }
          .cd-apply-form textarea, .cd-apply-form input { width: 100%; border: 1px solid var(--line); border-radius: 9px; padding: 9px 10px; color: var(--ink); background: #fff; font: inherit; font-size: 12px; outline: none; }
          .cd-apply-form textarea { min-height: 74px; resize: vertical; }
          .cd-portfolio-select { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; }
          .cd-portfolio-select button { border: 1px solid var(--line); background:#fff; border-radius:9px; padding:5px; text-align:left; cursor:pointer; font-size:10px; }
          .cd-portfolio-select button.selected { border-color: var(--coral); box-shadow:0 0 0 2px rgba(255,107,90,.12); }
          .cd-upload-work { display:flex !important; align-items:center; justify-content:center; min-height:38px; border:1px dashed #cfcfd7; border-radius:9px; color:var(--coral-dark) !important; cursor:pointer; margin-top:7px !important; }
          .cd-hint { color:#85868e; font-size:10.5px; }
          .cd-portfolio-select img { width:100%; aspect-ratio:1; object-fit:cover; border-radius:6px; display:block; margin-bottom:4px; }
          .cd-form-actions { display: grid; grid-template-columns: 1fr 1.6fr; gap: 8px; margin-top: 12px; }
          .cd-secondary-button { min-height: 41px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: #42434a; font-size: 12px; font-weight: 700; cursor: pointer; }
          .cd-error { color: #c84642; background: #fff0ef; border: 1px solid #f2cfcc; padding: 9px 10px; border-radius: 9px; font-size: 11.5px; line-height: 1.5; }
          .cd-application-status { min-height: 43px; display: flex; align-items: center; justify-content: center; gap: 7px; border-radius: 11px; font-size: 12.5px; font-weight: 750; text-transform: capitalize; flex-wrap: wrap; padding: 8px 12px; }
          .cd-application-status--pending { color: #956b00; background: #fff5df; }
          .cd-application-status--accepted { color: #21894c; background: #edf8f1; }
          .cd-application-status--rejected { color: #c84642; background: #fff0ef; }
          .cd-application-status--withdrawn { color: #6b6b72; background: #f1f0f5; }

          .cd-owner-actions { display: grid; gap: 7px; }
          .cd-owner-button { min-height: 38px; border: 1px solid var(--line); border-radius: 9px; background: #fff; display: flex; align-items: center; justify-content: center; gap: 6px; color: #41424a; font-size: 11.5px; font-weight: 700; cursor: pointer; text-decoration: none; }
          .cd-owner-button:hover { background: #fafafd; }
          .cd-owner-button--danger { color: #c84642; border-color: #f0cdca; }

          .cd-empty { max-width: 600px; margin: 60px auto; text-align: center; padding: 0 24px; color: var(--muted); }
          .cd-empty button { margin-top: 12px; }
          .cd-spin { animation: cd-spin .8s linear infinite; }
          @keyframes cd-spin { to { transform: rotate(360deg); } }

          @media (max-width: 920px) {
            .cd-layout { grid-template-columns: 1fr; }
            .cd-hero { grid-template-columns: 1fr; }
            .cd-hero-media { order: -1; }
            .cd-sidebar { position: static; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
          }
          @media (max-width: 650px) {
            .cd-page { padding: 4px 14px 56px; }
            .cd-hero { padding: 20px; border-radius: 16px; }
            .cd-title { font-size: 28px; }
            .cd-opportunity, .cd-checklist, .cd-dosdonts, .cd-sidebar { grid-template-columns: 1fr; }
          }
        `}</style>

        {loading && <div className="cd-empty">Loading campaign…</div>}

        {!loading && error && (
          <div className="cd-empty">
            <div>{error}</div>
            <button className="cd-back" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Go back</button>
          </div>
        )}

        {!loading && !error && campaign && (
          <div className="cd-shell">
            <button className="cd-back" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back to campaigns</button>

            <div className="cd-layout">
              <article className="cd-main">
                <section className={`cd-hero ${productImages.length === 0 ? 'cd-hero--no-media' : ''}`}>
                  <div className="cd-hero-text">
                    <div className="cd-brandline">
                      <div className="cd-brand-logo">{brandLogo ? <img src={brandLogo} alt={`${brandName} logo`} /> : brandName[0].toUpperCase()}</div>
                      <div>
                        <div className="cd-brandline-name">{brandName}</div>
                        <div className="cd-brandline-meta">{brandIndustry}{brandLocation ? ` · ${brandLocation}` : ''}</div>
                      </div>
                    </div>

                    <h1 className="cd-title">{campaign.title}</h1>
                    {campaign.tagline && <p className="cd-tagline">{campaign.tagline}</p>}

                    <div className="cd-pill-row">
                      {brandLocation && <span className="cd-pill"><MapPin size={13} /> {brandLocation}</span>}
                      <span className="cd-pill"><Film size={13} /> {campaign.sub_category || campaign.category}</span>
                      <span className="cd-pill">{campaign.campaign_type === 'paid' ? <DollarSign size={13} /> : <Gift size={13} />} {campaign.campaign_type === 'paid' ? 'Paid Campaign' : 'Gifted Campaign'}</span>
                      {deadline && <span className="cd-pill"><Calendar size={13} /> Apply by {deadline.label}</span>}
                    </div>

                    {campaign.application_count > 0 && (
                      <div className="cd-meta-row">
                        <span className="cd-meta-item"><CheckCircle2 size={14} /> {campaign.application_count} creator{campaign.application_count === 1 ? '' : 's'} applied</span>
                      </div>
                    )}

                    {(campaign.category || campaign.sub_category) && (
                      <div className="cd-tags">
                        {campaign.category && <span className="cd-tag cd-tag--accent">{campaign.category}</span>}
                        {campaign.sub_category && <span className="cd-tag">{campaign.sub_category}</span>}
                      </div>
                    )}
                  </div>

                  {productImages.length > 0 && (
                    <div className="cd-hero-media">
                      <div className="cd-product-gallery-main">
                        <img src={productImages[Math.min(activeProductImage, productImages.length - 1)]} alt={`${brandName} product ${Math.min(activeProductImage, productImages.length - 1) + 1}`} />
                        {productImages.length > 1 && (
                          <div className="cd-product-gallery-count">{Math.min(activeProductImage, productImages.length - 1) + 1} / {productImages.length}</div>
                        )}
                      </div>
                      {productImages.length > 1 && (
                        <div className="cd-product-gallery-footer">
                          <div className="cd-product-gallery-label">Products</div>
                          <div className="cd-product-thumbs">
                            {productImages.map((image, index) => (
                              <button type="button" key={`${image}-${index}`} className={`cd-product-thumb ${activeProductImage === index ? 'cd-product-thumb--active' : ''}`} onClick={() => setActiveProductImage(index)} aria-label={`View product ${index + 1}`}>
                                <img src={image} alt="" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="cd-apply-bar">
                  <div className="cd-apply-bar-text">
                    <strong>Ready to create something great?</strong>
                    <span>Pitch your idea to <b>{brandName}</b> — it goes straight to the brand.</span>
                  </div>
                  <div className="cd-apply-bar-actions">
                    {renderApplicationAction()}
                    {!myApplication && user?.role === 'creator' && (
                      <button className="cd-save-button" onClick={handleToggleSave} disabled={savingBookmark}>
                        {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                        {isSaved ? 'Saved' : 'Save for later'}
                      </button>
                    )}
                  </div>
                </section>

                <section className="cd-section">
                  <div className="cd-section-header"><h2 className="cd-section-title">The opportunity</h2><p className="cd-section-intro">Everything you need to know before you apply.</p></div>
                  <div className="cd-opportunity">
                    <div className="cd-opportunity-card"><DollarSign size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Compensation</div><div className="cd-opportunity-value">{campaign.compensation_description || formatMoney(campaign.budget) || 'Discuss with brand'}</div></div>
                    <div className="cd-opportunity-card"><Calendar size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Apply by</div><div className={`cd-opportunity-value ${deadline && !deadline.closed ? 'cd-opportunity-value--open' : ''}`}>{deadline ? deadline.label : 'Open until filled'}</div></div>
                    <div className="cd-opportunity-card"><MapPin size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Location</div><div className="cd-opportunity-value">{brandLocation || 'Remote / flexible'}</div></div>
                    <div className="cd-opportunity-card"><Film size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Content type</div><div className="cd-opportunity-value">{campaign.sub_category || campaign.category}</div></div>
                  </div>
                </section>

                {(campaign.description || campaign.brief) && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">About this campaign</h2><p className="cd-section-intro">The story the brand wants creators to bring to life.</p></div>
                    <div className="cd-brief">
                      {campaign.description && (
                        <>
                          {campaign.brief && <div className="cd-brief-label">Campaign brief</div>}
                          <p className="cd-prose">{campaign.description}</p>
                        </>
                      )}
                      {campaign.brief && campaign.brief !== campaign.description && <p className="cd-prose">{campaign.brief}</p>}
                    </div>
                  </section>
                )}

                {campaign.deliverables && campaign.deliverables.length > 0 && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">What you'll create</h2><p className="cd-section-intro">A simple creative direction for your content.</p></div>
                    <div className="cd-deliverables">
                      {campaign.deliverables.map((item, index) => (
                        <div className="cd-deliverable" key={`${item}-${index}`}>
                          <div className="cd-number">{String(index + 1).padStart(2, '0')}</div>
                          <div><div className="cd-deliverable-title">{item}</div><div className="cd-deliverable-copy">Create this naturally in your own style while staying aligned with the campaign brief.</div></div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {campaign.requirements && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">What we're looking for</h2><p className="cd-section-intro">Make sure you meet these creator requirements before applying.</p></div>
                    <ul className="cd-requirement-list">
                      {campaign.requirements.split(/\r?\n|•/).map((item) => item.trim()).filter(Boolean).map((item, index) => (
                        <li key={`${item}-${index}`}><span className="cd-check"><Check size={12} strokeWidth={3} /></span><span>{item}</span></li>
                      ))}
                    </ul>
                  </section>
                )}

                {campaign.before_you_apply && campaign.before_you_apply.length > 0 && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">Before you apply</h2><p className="cd-section-intro">Confirm these before you send your pitch.</p></div>
                    <ul className="cd-requirement-list">
                      {campaign.before_you_apply.map((item, index) => (
                        <li key={`${item}-${index}`}><span className="cd-check"><Check size={12} strokeWidth={3} /></span><span>{item}</span></li>
                      ))}
                    </ul>
                  </section>
                )}

                {campaign.checklist && campaign.checklist.length > 0 && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">Creator checklist</h2><p className="cd-section-intro">A quick check before you hit submit.</p></div>
                    <div className="cd-checklist">
                      {campaign.checklist.map((item, index) => <div className="cd-checklist-item" key={`${item.text}-${index}`}><span className="cd-check"><Check size={12} strokeWidth={3} /></span>{item.text}</div>)}
                    </div>
                  </section>
                )}

                {campaign.required_scenes && campaign.required_scenes.length > 0 && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">Your content flow</h2><p className="cd-section-intro">Use these scenes as a guide, not a script.</p></div>
                    <div className="cd-scenes">
                      {campaign.required_scenes.map((scene, index) => {
                        const parts = scene.split(/\n|:/);
                        const title = parts[0]?.trim() || scene;
                        const copy = parts.slice(1).join(':').trim();
                        return <div className="cd-scene" key={`${scene}-${index}`}><div className="cd-scene-num">{String(index + 1).padStart(2, '0')}</div><div className="cd-scene-line" /><div><div className="cd-scene-title">{title}</div>{copy && <div className="cd-scene-copy">{copy}</div>}</div></div>;
                      })}
                    </div>
                  </section>
                )}

                {((campaign.dos?.length || 0) > 0 || (campaign.donts?.length || 0) > 0) && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">Do's &amp; don'ts</h2><p className="cd-section-intro">Creative guardrails from the brand.</p></div>
                    <div className="cd-dosdonts">
                      {campaign.dos && campaign.dos.length > 0 && <div className="cd-do"><div className="cd-rule-heading cd-rule-heading--do"><CheckCircle2 size={16} /> Do</div>{campaign.dos.map((item, index) => <div className="cd-rule" key={`${item}-${index}`}><Check size={13} color="#21894c" />{item}</div>)}</div>}
                      {campaign.donts && campaign.donts.length > 0 && <div className="cd-dont"><div className="cd-rule-heading cd-rule-heading--dont"><X size={16} /> Don't</div>{campaign.donts.map((item, index) => <div className="cd-rule" key={`${item}-${index}`}><X size={13} color="#cf4944" />{item}</div>)}</div>}
                    </div>
                  </section>
                )}

                {(campaign.suggested_caption || campaign.hashtags?.length) && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">Caption &amp; tags</h2><p className="cd-section-intro">Optional copy to help you get started faster.</p></div>
                    <div className="cd-caption">
                      {campaign.suggested_caption && <><div className="cd-caption-top"><span className="cd-caption-label">Suggested caption</span><button className="cd-copy-button" onClick={handleCopyCaption}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div><div className="cd-caption-text">{campaign.suggested_caption}</div></>}
                      {campaign.hashtags && campaign.hashtags.length > 0 && <div className="cd-hashtags">{campaign.hashtags.map((tag, index) => <span className="cd-hashtag" key={`${tag}-${index}`}>{cleanTag(tag)}</span>)}</div>}
                    </div>
                  </section>
                )}

                {campaign.video_specs && campaign.video_specs.length > 0 && (
                  <section className="cd-section">
                    <div className="cd-section-header"><h2 className="cd-section-title">Content specifications</h2><p className="cd-section-intro">Technical details for getting the final content right.</p></div>
                    <div className="cd-spec-tabs">
                      {campaign.video_specs.map((spec, index) => {
                        const Icon = spec.platform.toLowerCase().includes('tiktok') ? Music2 : Smartphone;
                        return <button key={`${spec.platform}-${index}`} className={`cd-spec-tab ${activeSpecTab === index ? 'cd-spec-tab--active' : ''}`} onClick={() => setActiveSpecTab(index)}><Icon size={14} /> {spec.platform}</button>;
                      })}
                    </div>
                    {campaign.video_specs[activeSpecTab] && (
                      <div className="cd-spec-table">
                        <div className="cd-spec-row"><span className="cd-spec-row-label"><Film size={14} /> Format</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].aspect_ratio || '—'}</span></div>
                        <div className="cd-spec-row"><span className="cd-spec-row-label">Resolution</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].resolution || '—'}</span></div>
                        <div className="cd-spec-row"><span className="cd-spec-row-label">Duration</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].duration || '—'}</span></div>
                        <div className="cd-spec-row"><span className="cd-spec-row-label">Frame rate</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].frame_rate || '—'}</span></div>
                        <div className="cd-spec-row"><span className="cd-spec-row-label">Platform</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].platform || '—'}</span></div>
                        <div className="cd-spec-row"><span className="cd-spec-row-label">File type</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].file_type || '—'}</span></div>
                        <div className="cd-spec-row"><span className="cd-spec-row-label"><Volume2 size={14} /> Voiceover</span><span className={`cd-spec-pill ${!campaign.video_specs[activeSpecTab].voiceover_required ? 'cd-spec-pill--off' : ''}`}>{campaign.video_specs[activeSpecTab].voiceover_required ? 'Required' : 'Optional'}</span></div>
                        <div className="cd-spec-row"><span className="cd-spec-row-label"><Clipboard size={14} /> Subtitles</span><span className={`cd-spec-pill ${!campaign.video_specs[activeSpecTab].subtitles_required ? 'cd-spec-pill--off' : ''}`}>{campaign.video_specs[activeSpecTab].subtitles_required ? 'Required' : 'Optional'}</span></div>
                      </div>
                    )}
                  </section>
                )}

                {campaign.guidelines_note && (
                  <section className="cd-section">
                    <div className="cd-guidelines-note">
                      <div className="cd-guidelines-note-icon"><CheckCircle2 size={17} /></div>
                      <div>
                        <div className="cd-guidelines-note-title">Campaign guidelines</div>
                        <p className="cd-guidelines-note-copy">{campaign.guidelines_note}</p>
                      </div>
                    </div>
                  </section>
                )}
              </article>

              <aside className="cd-sidebar">
                {user?.role === 'business' && campaign.business_id === user.id && (
                  <div className="cd-side-card">
                    <div className="cd-side-heading">Manage campaign</div>
                    {manageError && <div className="cd-error" style={{ marginBottom: 9 }}>{manageError}</div>}
                    <div className="cd-owner-actions">
                      <Link className="cd-owner-button" to={`/campaigns/${campaign.id}/edit`}>Edit campaign</Link>
                      {campaign.status === 'draft' && <button className="cd-owner-button" onClick={handlePublish} disabled={managing !== null}>{managing === 'publish' ? <Loader2 size={14} className="cd-spin" /> : <Rocket size={14} />}{managing === 'publish' ? 'Publishing…' : 'Publish campaign'}</button>}
                      <button className="cd-owner-button" onClick={handleDuplicate} disabled={managing !== null}>{managing === 'duplicate' ? <Loader2 size={14} className="cd-spin" /> : <Copy size={14} />}{managing === 'duplicate' ? 'Duplicating…' : 'Duplicate campaign'}</button>
                      {campaign.status === 'in_progress' && (
                        <button className="cd-owner-button cd-owner-button--danger" onClick={handleClose} disabled={managing !== null}>
                          {managing === 'close' ? <Loader2 size={14} className="cd-spin" /> : <Ban size={14} />}
                          {managing === 'close' ? 'Closing…' : 'Close campaign'}
                        </button>
                      )}
                      {campaign.status === 'in_progress' ? (
                        <div className="cd-owner-button" style={{ opacity: 0.6, cursor: 'not-allowed', background: '#FFF4F2', color: '#D64545', border: '1px solid #FFD9D3' }}>Cancel first to delete</div>
                      ) : (
                        <button className="cd-owner-button cd-owner-button--danger" onClick={handleDelete} disabled={managing !== null}>{managing === 'delete' ? <Loader2 size={14} className="cd-spin" /> : <Trash2 size={14} />}{managing === 'delete' ? 'Deleting…' : 'Delete campaign'}</button>
                      )}
                    </div>
                  </div>
                )}

                <Link to={`/brands/${campaign.business_id}`} className="cd-side-card cd-brand-side">
                  <div className="cd-side-heading"><span>About the brand</span><ArrowUpRight size={15} color={CORAL_DARK} /></div>
                  <div className="cd-brand-side-row">
                    <div className="cd-brand-side-logo">{brandLogo ? <img src={brandLogo} alt={`${brandName} logo`} /> : brandName[0].toUpperCase()}</div>
                    <div><div className="cd-brand-side-name">{brandName}</div><div className="cd-brand-side-meta">{brandIndustry}{brandLocation ? ` · ${brandLocation}` : ''}</div></div>
                  </div>
                  <div className="cd-brand-side-link">View brand profile <ArrowUpRight size={13} /></div>
                </Link>

                <div className="cd-side-card">
                  <div className="cd-side-heading">Campaign snapshot</div>
                  <div className="cd-side-stat"><DollarSign size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Compensation</div><div className="cd-side-stat-value">{campaign.compensation_description || formatMoney(campaign.budget) || 'Discuss with brand'}</div></div></div>
                  <div className="cd-side-stat"><Calendar size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Applications close</div><div className="cd-side-stat-value">{campaign.application_deadline ? new Date(campaign.application_deadline).toLocaleDateString() : (deadline ? deadline.label : 'Open until filled')}</div></div></div>
                  <div className="cd-side-stat"><Clock size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Deliverables due</div><div className="cd-side-stat-value">{campaign.deliverable_deadline ? new Date(campaign.deliverable_deadline).toLocaleDateString() : 'Set with selected creators'}</div></div></div>
                  <div className="cd-side-stat"><Users size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Creators needed</div><div className="cd-side-stat-value">{campaign.creators_needed || 1}</div></div></div>
                  <div className="cd-side-stat"><MapPin size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Location</div><div className="cd-side-stat-value">{brandLocation || 'Remote / flexible'}</div></div></div>
                  <div className="cd-side-stat"><Film size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Content type</div><div className="cd-side-stat-value">{campaign.sub_category || campaign.category}</div></div></div>
                </div>

                {related.length > 0 && (
                  <div className="cd-side-card">
                    <div className="cd-side-heading">More campaigns</div>
                    {related.map((item) => <Link key={item.id} to={`/campaigns/${item.id}`} className="cd-related-item"><div className="cd-related-title">{item.title}</div><div className="cd-related-meta">{item.brand_name || 'Business'} · {item.category}</div></Link>)}
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}
      </div>

      {campaign && user?.role === 'creator' && (
        <ApplyModal
          isOpen={showApplyForm}
          campaign={campaign}
          onClose={() => setShowApplyForm(false)}
          onSuccess={async () => {
            setApplicationWithdrawn(false);
            try {
              const apps = await getApplications({ campaign_id: campaign.id });
              setMyApplication(apps[0] ?? null);
            } catch (err) {
              console.error('Could not refresh application status:', err);
            }
          }}
        />
      )}
    </AppLayout>
  );
}

export default CampaignDetail;
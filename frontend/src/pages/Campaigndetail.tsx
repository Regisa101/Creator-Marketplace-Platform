import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Copy,
  DollarSign,
  Film,
  Gift,
  Loader2,
  MapPin,
  MessageCircle,
  Music2,
  Rocket,
  Smartphone,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  createApplication,
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
import { LogoMark, BRAND_NAME } from '../components/Brand';

const CORAL = '#FF6B5A';
const CORAL_DARK = '#F0523F';
const VIOLET = '#1E2A78';

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
    label: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
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

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [brandProfile, setBrandProfile] = useState<PublicBusinessProfile | null>(null);
  const [related, setRelated] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [navVisible, setNavVisible] = useState(true);
  const [activeSpecTab, setActiveSpecTab] = useState(0);
  const [activeProductImage, setActiveProductImage] = useState(0);

  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [proposal, setProposal] = useState('');
  const [rate, setRate] = useState('');
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [copied, setCopied] = useState(false);

  const [managing, setManaging] = useState<'publish' | 'delete' | 'duplicate' | null>(null);
  const [manageError, setManageError] = useState('');

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const current = window.scrollY;
      if (current <= 8 || current < lastScrollY - 2) setNavVisible(true);
      else if (current > lastScrollY + 2) setNavVisible(false);
      lastScrollY = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

    return () => {
      cancelled = true;
    };
  }, [id, user?.role]);

  const deadline = useMemo(() => formatDeadline(campaign?.deadline), [campaign?.deadline]);
  const brandName = brandProfile?.company_name || campaign?.brand_name || 'Business';
  const brandLocation = brandProfile?.location || campaign?.brand_location || '';
  const brandIndustry = brandProfile?.industry || campaign?.category || '';
  const heroImage = resolveMediaUrl(campaign?.hero_image);
  const brandLogo = resolveMediaUrl(brandProfile?.logo_url);
  const productImages = useMemo(() => {
    const extraPhotos = Array.isArray((campaign as (Campaign & { extra_photos?: string[] }) | null)?.extra_photos)
      ? ((campaign as (Campaign & { extra_photos?: string[] }) | null)?.extra_photos || [])
      : [];
    return Array.from(new Set([campaign?.hero_image || '', ...extraPhotos].filter(Boolean))).map(resolveMediaUrl);
  }, [campaign]);

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

  const handleApplySubmit = async () => {
    if (!campaign) return;
    if (!proposal.trim()) {
      setApplyError("Tell them why you're a good fit before submitting.");
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
      setProposal('');
      setRate('');
      setMessage('');
    } catch (err: any) {
      setApplyError(err?.response?.data?.detail || 'Could not submit your application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // 🔥 NEW: Withdraw handler
  const handleWithdraw = async () => {
    if (!myApplication) return;
    if (!confirm('Are you sure you want to withdraw your application?')) return;
    
    setWithdrawing(true);
    setApplyError('');
    try {
      await withdrawApplication(myApplication.id);
      // Refresh application status
      if (id) {
        const apps = await getApplications({ campaign_id: parseInt(id) });
        setMyApplication(apps[0] ?? null);
      }
    } catch (err: any) {
      console.error('Could not withdraw application:', err);
      setApplyError(err?.response?.data?.detail || 'Could not withdraw application. Please try again.');
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
    setManaging('publish');
    setManageError('');
    try {
      setCampaign(await publishCampaign(campaign.id));
    } catch (err: any) {
      setManageError(err?.response?.data?.detail || 'Could not publish. Please try again.');
    } finally {
      setManaging(null);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    if (!window.confirm(`Delete "${campaign.title}"? This can't be undone.`)) return;
    setManaging('delete');
    setManageError('');
    try {
      await deleteCampaign(campaign.id);
      navigate('/campaigns');
    } catch (err: any) {
      setManageError(err?.response?.data?.detail || 'Could not delete. Please try again.');
      setManaging(null);
    }
  };

  const handleDuplicate = async () => {
    if (!campaign) return;
    setManaging('duplicate');
    setManageError('');
    try {
      const copy = await duplicateCampaign(campaign.id);
      navigate(`/campaigns/${copy.id}/edit`);
    } catch (err: any) {
      setManageError(err?.response?.data?.detail || 'Could not duplicate. Please try again.');
      setManaging(null);
    }
  };

  const renderApplicationAction = () => {
    if (!campaign) return null;

    if (myApplication) {
      const label =
        myApplication.status === 'pending'
          ? 'Application pending'
          : myApplication.status === 'accepted'
          ? 'Application accepted ✓'
          : myApplication.status === 'rejected'
          ? 'Application rejected ✗'
          : 'Application withdrawn';

      // 🔥 NEW: Show Withdraw button for pending applications
      return (
        <div className={`cd-application-status cd-application-status--${myApplication.status}`}>
          <CheckCircle2 size={17} /> 
          {label}
          {myApplication.status === 'pending' && (
            <button
              className="cd-withdraw-button"
              onClick={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? <Loader2 size={14} className="cd-spin" /> : <Trash2 size={14} />}
              {withdrawing ? 'Withdrawing...' : 'Withdraw'}
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

    if (!showApplyForm) {
      return <button className="cd-apply-button" onClick={() => setShowApplyForm(true)}>Apply to this campaign <ChevronRight size={17} /></button>;
    }

    return (
      <div className="cd-apply-form">
        {applyError && <div className="cd-error">{applyError}</div>}
        <label>Why are you a good fit? *</label>
        <textarea 
          value={proposal} 
          onChange={(e) => setProposal(e.target.value)} 
          placeholder="Tell the brand about your content style, audience and why this campaign fits you…" 
        />
        <label>Your rate <span>(optional)</span></label>
        <input 
          type="number" 
          min="0" 
          value={rate} 
          onChange={(e) => setRate(e.target.value)} 
          placeholder="Rs. 0" 
        />
        <label>Message <span>(optional)</span></label>
        <textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Anything else the brand should know?" 
        />
        <div className="cd-form-actions">
          <button 
            className="cd-secondary-button" 
            onClick={() => { setShowApplyForm(false); setApplyError(''); }} 
            disabled={applying}
          >
            Cancel
          </button>
          <button 
            className="cd-apply-button" 
            onClick={handleApplySubmit} 
            disabled={applying || !proposal.trim()}
          >
            {applying && <Loader2 size={15} className="cd-spin" />}
            {applying ? 'Sending…' : 'Send application'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="cd-page">
      <style>{`
        .cd-page {
          --coral: ${CORAL};
          --coral-dark: ${CORAL_DARK};
          --violet: ${VIOLET};
          --ink: #12131a;
          --muted: #70717a;
          --soft: #f7f7fa;
          --line: #e7e7eb;
          min-height: 100vh;
          background: #f7f7f8;
          color: var(--ink);
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .cd-page *, .cd-page *::before, .cd-page *::after { box-sizing: border-box; }
        .cd-topbar {
          position: sticky; top: 0; z-index: 50; height: 72px; background: rgba(255,255,255,.96);
          backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); transition: transform .22s ease;
        }
        .cd-topbar--hidden { transform: translateY(-100%); }
        .cd-topbar-inner { max-width: 1240px; height: 100%; margin: 0 auto; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .cd-nav-left { display: flex; align-items: center; gap: 34px; min-width: 0; }
        .cd-logo { display: inline-flex; align-items: center; gap: 9px; color: var(--ink); text-decoration: none; font-size: 18px; font-weight: 700; flex: 0 0 auto; }
        .cd-breadcrumb { min-width: 0; display: flex; align-items: center; gap: 9px; color: #8b8c93; font-size: 12px; overflow: hidden; }
        .cd-breadcrumb a { color: #5f6068; font-weight: 600; text-decoration: none; }
        .cd-breadcrumb span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cd-nav-actions { display: flex; align-items: center; gap: 4px; }
        .cd-nav-icon { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; color: #676870; text-decoration: none; border-radius: 9px; position: relative; }
        .cd-nav-icon:hover { background: #f5f5f7; color: var(--ink); }
        .cd-nav-dot { position: absolute; width: 6px; height: 6px; top: 6px; right: 6px; border-radius: 50%; background: var(--coral); border: 1px solid #fff; }
        .cd-profile-avatar { width: 32px; height: 32px; margin-left: 6px; overflow: hidden; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--violet); color: #fff; font-size: 11px; font-weight: 700; }
        .cd-profile-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .cd-shell { max-width: 1160px; margin: 0 auto; padding: 28px 24px 80px; }
        .cd-back { border: 0; background: transparent; padding: 6px 0; display: inline-flex; align-items: center; gap: 7px; color: #6d6e76; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 18px; }
        .cd-back:hover { color: var(--ink); }
        .cd-layout { display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: 34px; align-items: start; }
        .cd-main { min-width: 0; }

        .cd-hero { background: #fff; border: 1px solid var(--line); border-radius: 24px; padding: 28px; box-shadow: 0 8px 30px rgba(18,19,26,.035); }
        .cd-brandline { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .cd-brand-logo { width: 46px; height: 46px; border-radius: 14px; overflow: hidden; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; background: var(--coral); color: #fff; font-weight: 800; }
        .cd-brand-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cd-brandline-name { font-size: 14px; font-weight: 700; }
        .cd-brandline-meta { margin-top: 2px; color: var(--muted); font-size: 12.5px; }
        .cd-kicker { display: inline-flex; align-items: center; gap: 6px; color: var(--coral-dark); font-size: 12px; font-weight: 700; letter-spacing: .02em; margin-bottom: 9px; }
        .cd-kicker svg { color: var(--coral-dark); }
        .cd-title { font-size: clamp(30px, 4vw, 44px); line-height: 1.1; letter-spacing: -.9px; max-width: 800px; margin: 0 0 11px; font-weight: 750; }
        .cd-tagline { max-width: 760px; margin: 0; color: #666771; font-size: 15px; line-height: 1.75; }
        .cd-pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
        .cd-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; background: #fff5f2; border: 1px solid #ffdccf; color: #55565e; font-size: 12.5px; font-weight: 650; }
        .cd-pill svg { color: var(--coral-dark); flex: 0 0 auto; }
        .cd-meta-row { display: flex; flex-wrap: wrap; gap: 9px 16px; margin-top: 14px; }
        .cd-meta-item { display: inline-flex; align-items: center; gap: 6px; color: #55565e; font-size: 12.5px; font-weight: 600; }
        .cd-meta-item svg { color: var(--coral-dark); }
        .cd-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; padding-top: 15px; border-top: 1px solid var(--line); }
        .cd-tag { padding: 5px 10px; border-radius: 999px; background: #f6f6f8; border: 1px solid #e7e7eb; color: #666771; font-size: 11.5px; font-weight: 600; }
        .cd-tag--accent { color: var(--coral-dark); background: #fff2ed; border-color: #ffd8cc; }
        .cd-hero-hashtags { display: flex; flex-wrap: wrap; gap: 5px 12px; margin-top: 10px; }
        .cd-hero-hashtag { color: var(--coral-dark); font-size: 12px; font-weight: 650; }

        .cd-visual { margin-top: 18px; overflow: hidden; border-radius: 22px; border: 1px solid var(--line); background: linear-gradient(145deg, #fff, #f3f3f7); min-height: 260px; }
        .cd-visual img { width: 100%; max-height: 560px; display: block; object-fit: cover; }
        .cd-visual-placeholder { min-height: 270px; display: flex; align-items: center; justify-content: center; padding: 42px; position: relative; overflow: hidden; }
        .cd-visual-placeholder::before, .cd-visual-placeholder::after { content: ''; position: absolute; border-radius: 50%; filter: blur(2px); opacity: .8; }
        .cd-visual-placeholder::before { width: 220px; height: 220px; right: 7%; top: -80px; background: #fff0eb; }
        .cd-visual-placeholder::after { width: 190px; height: 190px; left: 8%; bottom: -95px; background: #eceefd; }
        .cd-visual-placeholder-inner { position: relative; z-index: 1; max-width: 520px; text-align: center; }
        .cd-visual-label { color: var(--coral-dark); font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 8px; }
        .cd-visual-title { font-size: 24px; line-height: 1.25; font-weight: 750; }

        .cd-section { margin-top: 42px; }
        .cd-section-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 15px; }
        .cd-section-title { margin: 0; font-size: 21px; letter-spacing: -.25px; font-weight: 750; }
        .cd-section-intro { margin: 5px 0 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
        .cd-prose { color: #3f4047; font-size: 14.5px; line-height: 1.8; white-space: pre-wrap; margin: 0; }

        .cd-opportunity { display: grid; grid-template-columns: repeat(var(--cd-opportunity-cols, 3), 1fr); gap: 11px; }
        @media (max-width: 720px) { .cd-opportunity { grid-template-columns: repeat(2, 1fr); } }
        .cd-opportunity-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 17px; min-height: 100px; }
        .cd-opportunity-label { color: #888991; font-size: 11.5px; font-weight: 600; margin-bottom: 8px; }
        .cd-opportunity-value { font-size: 15px; line-height: 1.45; font-weight: 700; }
        .cd-opportunity-value--open { color: #1a8a4a; }
        .cd-opportunity-icon { color: var(--coral-dark); margin-bottom: 12px; }

        .cd-brief { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 22px; }
        .cd-brief-label { color: var(--coral-dark); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 8px; }

        .cd-deliverables { display: grid; gap: 0; border-top: 1px solid var(--line); }
        .cd-deliverable { display: grid; grid-template-columns: 40px minmax(0,1fr); gap: 14px; padding: 18px 0; border-bottom: 1px solid var(--line); }
        .cd-number { width: 34px; height: 34px; border-radius: 11px; background: #fff0eb; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
        .cd-deliverable-title { font-size: 14.5px; font-weight: 700; margin-bottom: 3px; }
        .cd-deliverable-copy { color: var(--muted); font-size: 13px; line-height: 1.65; }

        .cd-requirements { padding: 0; }
        .cd-requirement-list { margin: 0; padding: 0; list-style: none; }
        .cd-requirement-list li { display: flex; align-items: flex-start; gap: 10px; padding: 11px 0; color: #3f4047; font-size: 14px; line-height: 1.65; border-bottom: 1px solid #ededf0; }
        .cd-requirement-list li:last-child { border-bottom: 0; }
        .cd-check { width: 20px; height: 20px; border-radius: 50%; background: #fff0eb; color: var(--coral-dark); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; margin-top: 1px; }
        .cd-requirements-copy { white-space: pre-wrap; }

        .cd-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .cd-checklist-item { min-height: 52px; display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--line); border-radius: 13px; padding: 11px 13px; font-size: 13px; color: #3f4047; }
        .cd-checklist-item .cd-check { background: #edf8f1; color: #21894c; }

        .cd-scenes { position: relative; padding-left: 3px; }
        .cd-scene { position: relative; display: grid; grid-template-columns: 44px minmax(0,1fr); gap: 13px; padding-bottom: 23px; }
        .cd-scene:last-child { padding-bottom: 0; }
        .cd-scene-line { position: absolute; left: 16px; top: 35px; bottom: 0; width: 1px; background: #ffd5ca; }
        .cd-scene:last-child .cd-scene-line { display: none; }
        .cd-scene-num { width: 34px; height: 34px; border-radius: 50%; background: #fff; border: 2px solid #ffd0c6; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; position: relative; z-index: 1; }
        .cd-scene-content { padding-top: 5px; }
        .cd-scene-title { font-size: 14.5px; font-weight: 700; margin-bottom: 3px; }
        .cd-scene-copy { color: var(--muted); font-size: 13px; line-height: 1.65; }

        .cd-dosdonts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cd-do, .cd-dont { border-radius: 17px; padding: 19px; }
        .cd-do { background: #f3fbf6; border: 1px solid #ccebd7; }
        .cd-dont { background: #fff6f5; border: 1px solid #f2ceca; }
        .cd-rule-heading { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 750; margin-bottom: 10px; }
        .cd-rule-heading--do { color: #21894c; }
        .cd-rule-heading--dont { color: #cf4944; }
        .cd-rule { display: flex; align-items: flex-start; gap: 8px; padding: 7px 0; color: #45464d; font-size: 13px; line-height: 1.6; }

        .cd-caption { border: 1px solid var(--line); background: #fff; border-radius: 17px; overflow: hidden; }
        .cd-caption-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--line); }
        .cd-caption-label { color: #85868e; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
        .cd-copy-button { border: 1px solid #e1e1e7; background: #fff; color: #4f5058; border-radius: 9px; padding: 7px 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
        .cd-copy-button:hover { border-color: #c9c9d1; color: var(--ink); }
        .cd-caption-text { padding: 17px; white-space: pre-wrap; color: #3f4047; font-size: 14px; line-height: 1.75; }
        .cd-hashtags { display: flex; flex-wrap: wrap; gap: 7px; padding: 0 17px 17px; }
        .cd-hashtag { color: var(--coral-dark); background: #fff2ed; border: 1px solid #ffd8cc; border-radius: 999px; padding: 5px 10px; font-size: 11.5px; font-weight: 650; }

        .cd-spec-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .cd-spec-tab { border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 8px 11px; display: inline-flex; align-items: center; gap: 6px; color: #686971; font-size: 12px; font-weight: 650; cursor: pointer; }
        .cd-spec-tab--active { border-color: #ffcdbf; color: var(--coral-dark); background: #fff5f1; }
        .cd-spec-table { background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
        .cd-spec-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 13px 16px; border-bottom: 1px solid #ededf0; font-size: 13px; }
        .cd-spec-row:last-child { border-bottom: 0; }
        .cd-spec-row-label { color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
        .cd-spec-row-value { font-weight: 700; text-align: right; }
        .cd-spec-pill { padding: 4px 9px; border-radius: 999px; background: #fff0eb; color: var(--coral-dark); font-size: 10.5px; font-weight: 750; }
        .cd-spec-pill--off { background: #f0f0f3; color: #73747c; }

        .cd-guidelines-note { display: flex; gap: 13px; align-items: flex-start; background: #fff8f2; border: 1px solid #ffe1d2; border-radius: 18px; padding: 20px 22px; }
        .cd-guidelines-note-icon { width: 34px; height: 34px; border-radius: 11px; background: #fff0eb; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
        .cd-guidelines-note-title { font-size: 14.5px; font-weight: 750; margin-bottom: 5px; }
        .cd-guidelines-note-copy { margin: 0; color: #5c5d66; font-size: 13.5px; line-height: 1.7; }

        /* Withdraw button styles */
        .cd-withdraw-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #fca5a5;
          background: #fee2e2;
          color: #dc2626;
          cursor: pointer;
          margin-left: 10px;
          transition: all 0.15s ease;
        }
        .cd-withdraw-button:hover {
          background: #fca5a5;
          border-color: #ef4444;
        }
        .cd-withdraw-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cd-sidebar { position: sticky; top: 92px; display: flex; flex-direction: column; gap: 13px; }
        .cd-side-card { background: #fff; border: 1px solid var(--line); border-radius: 19px; padding: 19px; box-shadow: 0 7px 26px rgba(18,19,26,.04); }
        .cd-apply-card { position: relative; overflow: hidden; border-color: #ffcfc4; background: linear-gradient(180deg, #fffaf8 0%, #fff 42%); box-shadow: 0 12px 34px rgba(255,107,90,.11), 0 3px 12px rgba(30,42,120,.035); }
        .cd-apply-accent { position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, var(--coral), #ff9a88, var(--violet)); }
        .cd-apply-topline { display: inline-flex; align-items: center; gap: 7px; color: var(--coral-dark); font-size: 10px; font-weight: 800; letter-spacing: .075em; text-transform: uppercase; margin: 2px 0 10px; }
        .cd-apply-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--coral); box-shadow: 0 0 0 4px rgba(255,107,90,.10); }
        .cd-apply-title { font-size: 23px; line-height: 1.18; font-weight: 800; letter-spacing: -.55px; margin: 0 0 9px; color: #20213a; }
        .cd-apply-copy { color: var(--muted); font-size: 12.5px; line-height: 1.65; margin: 0 0 16px; }
        .cd-apply-copy strong { color: #343541; font-weight: 750; }
        .cd-apply-highlights { display: grid; gap: 10px; margin-bottom: 16px; }
        .cd-apply-highlight { display: grid; grid-template-columns: 31px 1fr; gap: 9px; align-items: start; }
        .cd-apply-highlight-icon { width: 31px; height: 31px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--coral-dark); background: #fff0eb; border: 1px solid #ffd9d0; }
        .cd-apply-highlight strong { display: block; color: #373841; font-size: 11.5px; line-height: 1.35; margin-bottom: 2px; }
        .cd-apply-highlight span { display: block; color: #85868e; font-size: 10.5px; line-height: 1.45; }
        .cd-apply-divider { height: 1px; background: #eee2df; margin: 0 -2px 14px; }
        .cd-apply-note { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 10px; color: #85868e; font-size: 10px; line-height: 1.4; }
        .cd-apply-note svg { color: #42a66b; flex: 0 0 auto; }
        .cd-apply-button { width: 100%; min-height: 43px; border: 1px solid var(--coral); border-radius: 11px; background: var(--coral); color: #fff; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 750; cursor: pointer; box-shadow: 0 7px 18px rgba(255,107,90,.18); }
        .cd-apply-button:hover:not(:disabled) { background: var(--coral-dark); border-color: var(--coral-dark); }
        .cd-apply-button:disabled { opacity: .72; cursor: not-allowed; box-shadow: none; }
        .cd-apply-button--disabled { background: #f0b5a9; border-color: #f0b5a9; }
        .cd-save-button { width: 100%; margin-top: 9px; min-height: 41px; border: 1px solid #dedee5; border-radius: 11px; background: #fff; color: #383941; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
        .cd-save-button:hover { border-color: #c8c8d0; background: #fafafd; }
        .cd-side-stat { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #ededf0; }
        .cd-side-stat:last-child { border-bottom: 0; padding-bottom: 0; }
        .cd-side-stat-icon { color: var(--coral-dark); margin-top: 1px; }
        .cd-side-stat-label { color: #898a91; font-size: 10.5px; margin-bottom: 2px; }
        .cd-side-stat-value { color: #36373e; font-size: 12.5px; font-weight: 700; line-height: 1.5; }
        .cd-side-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 14px; font-weight: 750; margin-bottom: 13px; }
        .cd-brand-side { text-decoration: none; color: inherit; border-color: #f0d4cd; transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
        .cd-brand-side:hover { transform: translateY(-2px); border-color: #f2a99c; box-shadow: 0 10px 28px rgba(255,107,90,.11); }
        .cd-brand-side-row { display: flex; align-items: center; gap: 11px; }
        .cd-brand-side-logo { width: 43px; height: 43px; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--coral); color: #fff; font-weight: 800; flex: 0 0 auto; }
        .cd-brand-side-logo img { width: 100%; height: 100%; object-fit: cover; }
        .cd-brand-side-name { font-size: 13px; font-weight: 750; }
        .cd-brand-side-meta { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
        .cd-brand-side-link { margin-top: 13px; color: var(--coral-dark); font-size: 11.5px; font-weight: 750; display: flex; align-items: center; justify-content: space-between; }
        .cd-sidebar > .cd-brand-side { order: 2; }
        .cd-sidebar > .cd-apply-card { order: 3; }
        .cd-sidebar > .cd-side-card:not(.cd-owner):not(.cd-brand-side):not(.cd-apply-card):not(.cd-related) { order: 4; }
        .cd-sidebar > .cd-related { order: 5; }
        .cd-brand-side { padding: 16px 18px; }
        .cd-brand-side .cd-side-heading { margin-bottom: 10px; }
        .cd-brand-side-link { margin-top: 10px; }

        .cd-related { border-color: #eadeda; }
        .cd-related-item { display: block; text-decoration: none; color: inherit; padding: 11px 0; border-bottom: 1px solid #ededf0; }
        .cd-related-item:last-child { border-bottom: 0; padding-bottom: 0; }
        .cd-related-title { font-size: 12.5px; font-weight: 700; line-height: 1.45; margin-bottom: 3px; }
        .cd-related-meta { color: var(--muted); font-size: 10.5px; }

        .cd-apply-form label { display: block; color: #55565e; font-size: 11px; font-weight: 700; margin: 11px 0 5px; }
        .cd-apply-form label span { color: #999aa1; font-weight: 500; }
        .cd-apply-form textarea, .cd-apply-form input { width: 100%; border: 1px solid #dedee4; border-radius: 9px; padding: 9px 10px; color: var(--ink); background: #fff; font: inherit; font-size: 12px; outline: none; }
        .cd-apply-form textarea { min-height: 74px; resize: vertical; }
        .cd-apply-form textarea:focus, .cd-apply-form input:focus { border-color: var(--coral); box-shadow: 0 0 0 3px rgba(255,107,90,.08); }
        .cd-form-actions { display: grid; grid-template-columns: 1fr 1.6fr; gap: 8px; margin-top: 12px; }
        .cd-secondary-button { min-height: 41px; border: 1px solid #dedee4; border-radius: 10px; background: #fff; color: #42434a; font-size: 12px; font-weight: 700; cursor: pointer; }
        .cd-error { color: #c84642; background: #fff0ef; border: 1px solid #f2cfcc; padding: 9px 10px; border-radius: 9px; font-size: 11.5px; line-height: 1.5; }
        .cd-application-status { min-height: 43px; display: flex; align-items: center; justify-content: center; gap: 7px; border-radius: 11px; font-size: 12.5px; font-weight: 750; text-transform: capitalize; flex-wrap: wrap; padding: 8px 12px; }
        .cd-application-status--pending { color: #956b00; background: #fff5df; }
        .cd-application-status--accepted { color: #21894c; background: #edf8f1; }
        .cd-application-status--rejected { color: #c84642; background: #fff0ef; }
        .cd-application-status--withdrawn { color: #6b6b72; background: #f1f0f5; }

        .cd-owner { border-color: #dddde5; }
        .cd-sidebar > .cd-owner { order: 1; }
        .cd-owner-actions { display: grid; gap: 7px; }
        .cd-owner-button { min-height: 38px; border: 1px solid #dedee5; border-radius: 9px; background: #fff; display: flex; align-items: center; justify-content: center; gap: 6px; color: #41424a; font-size: 11.5px; font-weight: 700; cursor: pointer; text-decoration: none; }
        .cd-owner-button:hover { background: #fafafd; }
        .cd-owner-button--danger { color: #c84642; border-color: #f0cdca; }

        .cd-empty { max-width: 600px; margin: 80px auto; text-align: center; padding: 0 24px; color: var(--muted); }
        .cd-empty button { margin-top: 12px; }
        .cd-spin { animation: cd-spin .8s linear infinite; }
        @keyframes cd-spin { to { transform: rotate(360deg); } }

        /* Reference-style campaign layout */
        .cd-page { background: #fbfbfc; }
        .cd-shell { max-width: 1240px; padding: 24px 28px 90px; }
        .cd-layout { grid-template-columns: minmax(0, 1fr) 306px; gap: 28px; }
        .cd-main { min-width: 0; }
        .cd-hero-reference {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(330px, .98fr);
          gap: 30px;
          align-items: center;
          padding: 30px;
          border: 0;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 10px 34px rgba(30,42,120,.055);
        }
        .cd-hero-copy { min-width: 0; }
        .cd-hero-media {
          min-width: 0;
          overflow: hidden;
          border-radius: 18px;
          background: #f5f6fa;
          border: 1px solid #ececf2;
          box-shadow: 0 10px 30px rgba(18,19,26,.06);
        }
        .cd-hero-media img {
          width: 100%;
          aspect-ratio: 1.12 / 1;
          object-fit: cover;
          display: block;
        }
        .cd-product-gallery-main { position: relative; background: #f5f6fa; }
        .cd-product-gallery-main img {
          width: 100%;
          aspect-ratio: 1.12 / 1;
          object-fit: cover;
          display: block;
        }
        .cd-product-gallery-count {
          position: absolute;
          right: 12px;
          bottom: 12px;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(18,19,26,.68);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .02em;
          backdrop-filter: blur(5px);
        }
        .cd-product-gallery-footer {
          padding: 12px 13px 13px;
          background: #fff;
          border-top: 1px solid #ececf2;
        }
        .cd-product-gallery-label {
          color: #55565e;
          font-size: 10.5px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 8px;
        }
        .cd-product-thumbs {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-bottom: 1px;
        }
        .cd-product-thumb {
          width: 52px;
          height: 52px;
          padding: 0;
          border: 1px solid #e6e6eb;
          border-radius: 9px;
          overflow: hidden;
          background: #f7f7fa;
          cursor: pointer;
          flex: 0 0 auto;
          opacity: .72;
          transition: opacity .15s ease, border-color .15s ease, transform .15s ease;
        }
        .cd-product-thumb:hover { opacity: 1; transform: translateY(-1px); }
        .cd-product-thumb--active { opacity: 1; border: 2px solid var(--coral); }
        .cd-product-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cd-hero-media .cd-visual-placeholder { min-height: 360px; }
        .cd-section { margin-top: 34px; }
        .cd-section-header { margin-bottom: 13px; }
        .cd-section-title { font-size: 20px; color: #183b72; }
        .cd-section-intro { font-size: 12.5px; }
        .cd-opportunity { gap: 10px; }
        .cd-opportunity-card { border: 0; background: #fff; box-shadow: 0 5px 20px rgba(18,19,26,.035); min-height: 105px; }
        .cd-brief, .cd-caption, .cd-spec-table, .cd-checklist-item { box-shadow: 0 5px 20px rgba(18,19,26,.03); }
        .cd-brief { border: 0; }
        .cd-deliverables { background: #fff; border: 0; border-radius: 16px; padding: 0 18px; box-shadow: 0 5px 20px rgba(18,19,26,.03); }
        .cd-deliverable { padding: 17px 0; }
        .cd-checklist { gap: 10px; }
        .cd-sidebar { top: 88px; }
        .cd-side-card { border: 0; box-shadow: 0 6px 24px rgba(18,19,26,.045); }
        .cd-apply-card { border: 1px solid #ffd6ce; }
        .cd-back { margin-bottom: 13px; }
        .cd-title { color: #123b78; font-size: clamp(32px, 4vw, 46px); }
        .cd-kicker { color: #f0523f; }
        .cd-pill { background: #f8f9fc; border-color: #e9eaf0; }
        .cd-tag { background: #f5f6fa; border-color: #e7e8ee; }
        .cd-tag--accent { background: #fff1ed; border-color: #ffd7ce; }
        .cd-hero-hashtag { color: #1e2a78; }

        @media (max-width: 920px) {
          .cd-layout { grid-template-columns: 1fr; }
          .cd-hero-reference { grid-template-columns: 1fr; }
          .cd-hero-media { order: -1; }
          .cd-sidebar { position: static; display: grid; grid-template-columns: 1fr 1fr; align-items: start; }
          .cd-apply-card { grid-column: 1 / -1; }
        }
        @media (max-width: 650px) {
          .cd-topbar-inner { padding: 0 16px; }
          .cd-nav-left { gap: 12px; }
          .cd-breadcrumb { display: none; }
          .cd-shell { padding: 18px 14px 56px; }
          .cd-hero { padding: 20px; border-radius: 19px; }
          .cd-title { font-size: 30px; }
          .cd-visual { border-radius: 17px; }
          .cd-product-thumb { width: 48px; height: 48px; }
          .cd-opportunity, .cd-checklist, .cd-dosdonts, .cd-sidebar { grid-template-columns: 1fr; }
          .cd-section { margin-top: 34px; }
        }
      `}</style>

      <header className={`cd-topbar${navVisible ? '' : ' cd-topbar--hidden'}`}>
        <div className="cd-topbar-inner">
          <div className="cd-nav-left">
            <Link to="/campaigns" className="cd-logo"><LogoMark size={24} /><span>{BRAND_NAME}</span></Link>
            {campaign && <div className="cd-breadcrumb"><Link to="/campaigns">Campaigns</Link><span>/</span><span>{campaign.title}</span></div>}
          </div>
          <div className="cd-nav-actions">
            <Link to="/messages" className="cd-nav-icon" aria-label="Messages"><MessageCircle size={17} /></Link>
            <Link to="/notifications" className="cd-nav-icon" aria-label="Notifications"><Bell size={17} /><span className="cd-nav-dot" /></Link>
            <Link to="/profile" aria-label="Profile">
              <span className="cd-profile-avatar">
                {user?.profile?.profile_image || user?.profile?.logo_url ? <img src={user.profile.profile_image || user.profile.logo_url || ''} alt="" /> : (user?.full_name?.[0] || '?').toUpperCase()}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {loading && <div className="cd-empty">Loading campaign…</div>}

      {!loading && error && (
        <div className="cd-empty">
          <div>{error}</div>
          <button className="cd-back" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Go back</button>
        </div>
      )}

      {!loading && !error && campaign && (
        <main className="cd-shell">
          <button className="cd-back" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back to campaigns</button>

          <div className="cd-layout">
            <article className="cd-main">
              <section className="cd-hero cd-hero-reference">
                <div className="cd-hero-copy">
                  <div className="cd-brandline">
                    <div className="cd-brand-logo">
                      {brandLogo ? <img src={brandLogo} alt={`${brandName} logo`} /> : brandName[0].toUpperCase()}
                    </div>
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

                  <div className="cd-tags">
                    {campaign.category && <span className="cd-tag cd-tag--accent">{campaign.category}</span>}
                    {campaign.sub_category && <span className="cd-tag">{campaign.sub_category}</span>}
                  </div>

                  {campaign.hashtags && campaign.hashtags.length > 0 && (
                    <div className="cd-hero-hashtags">
                      {campaign.hashtags.map((tag, index) => <span className="cd-hero-hashtag" key={`${tag}-${index}`}>{cleanTag(tag)}</span>)}
                    </div>
                  )}
                </div>

                <div className="cd-hero-media">
                  {productImages.length > 0 ? (
                    <>
                      <div className="cd-product-gallery-main">
                        <img
                          src={productImages[Math.min(activeProductImage, productImages.length - 1)]}
                          alt={`${brandName} product ${Math.min(activeProductImage, productImages.length - 1) + 1}`}
                        />
                        {productImages.length > 1 && (
                          <div className="cd-product-gallery-count">
                            {Math.min(activeProductImage, productImages.length - 1) + 1} / {productImages.length}
                          </div>
                        )}
                      </div>
                      {productImages.length > 1 && (
                        <div className="cd-product-gallery-footer">
                          <div className="cd-product-gallery-label">Products</div>
                          <div className="cd-product-thumbs" aria-label="Product gallery">
                            {productImages.map((image, index) => (
                              <button
                                type="button"
                                key={`${image}-${index}`}
                                className={`cd-product-thumb ${activeProductImage === index ? 'cd-product-thumb--active' : ''}`}
                                onClick={() => setActiveProductImage(index)}
                                aria-label={`View product ${index + 1}`}
                              >
                                <img src={image} alt="" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="cd-visual-placeholder">
                      <div className="cd-visual-placeholder-inner">
                        <div className="cd-visual-label">{brandName}</div>
                        <div className="cd-visual-title">Product photos coming soon</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="cd-section">
                <div className="cd-section-header"><div><h2 className="cd-section-title">The opportunity</h2><p className="cd-section-intro">Everything you need to know before you apply.</p></div></div>
                <div className="cd-opportunity" style={{ ['--cd-opportunity-cols' as any]: 4 }}>
                  <div className="cd-opportunity-card"><DollarSign size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Compensation</div><div className="cd-opportunity-value">{campaign.compensation_description || formatMoney(campaign.budget) || 'Discuss with brand'}</div></div>
                  <div className="cd-opportunity-card"><Calendar size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Apply by</div><div className={`cd-opportunity-value ${deadline && !deadline.closed ? 'cd-opportunity-value--open' : ''}`}>{deadline ? deadline.label : 'Open until filled'}</div></div>
                  <div className="cd-opportunity-card"><MapPin size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Location</div><div className="cd-opportunity-value">{brandLocation || 'Remote / flexible'}</div></div>
                  <div className="cd-opportunity-card"><Film size={17} className="cd-opportunity-icon" /><div className="cd-opportunity-label">Content type</div><div className="cd-opportunity-value">{campaign.sub_category || campaign.category}</div></div>
                </div>
              </section>

              {(campaign.description || campaign.brief) && (
                <section className="cd-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">About this campaign</h2><p className="cd-section-intro">The story the brand wants creators to bring to life.</p></div></div>
                  <div className="cd-brief">
                    {campaign.brief && <div className="cd-brief-label">Campaign brief</div>}
                    <p className="cd-prose">{campaign.description}</p>
                    {campaign.brief && campaign.brief !== campaign.description && <p className="cd-prose" style={{ marginTop: 14 }}>{campaign.brief}</p>}
                  </div>
                </section>
              )}

              {campaign.deliverables && campaign.deliverables.length > 0 && (
                <section className="cd-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">What you'll create</h2><p className="cd-section-intro">A simple creative direction for your content.</p></div></div>
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
                <section className="cd-section cd-requirements">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">What we're looking for</h2><p className="cd-section-intro">Make sure you meet these creator requirements before applying.</p></div></div>
                  <ul className="cd-requirement-list">
                    {campaign.requirements.split(/\r?\n|•/).map((item) => item.trim()).filter(Boolean).map((item, index) => (
                      <li key={`${item}-${index}`}><span className="cd-check"><Check size={12} strokeWidth={3} /></span><span>{item}</span></li>
                    ))}
                  </ul>
                </section>
              )}

              {campaign.before_you_apply && campaign.before_you_apply.length > 0 && (
                <section className="cd-section cd-requirements">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Before you apply</h2><p className="cd-section-intro">Confirm these before you send your pitch.</p></div></div>
                  <ul className="cd-requirement-list">
                    {campaign.before_you_apply.map((item, index) => (
                      <li key={`${item}-${index}`}><span className="cd-check"><Check size={12} strokeWidth={3} /></span><span>{item}</span></li>
                    ))}
                  </ul>
                </section>
              )}

              {campaign.checklist && campaign.checklist.length > 0 && (
                <section className="cd-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Creator checklist</h2><p className="cd-section-intro">A quick check before you hit submit.</p></div></div>
                  <div className="cd-checklist">
                    {campaign.checklist.map((item, index) => <div className="cd-checklist-item" key={`${item.text}-${index}`}><span className="cd-check"><Check size={12} strokeWidth={3} /></span>{item.text}</div>)}
                  </div>
                </section>
              )}

              {campaign.required_scenes && campaign.required_scenes.length > 0 && (
                <section className="cd-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Your content flow</h2><p className="cd-section-intro">Use these scenes as a guide, not a script.</p></div></div>
                  <div className="cd-scenes">
                    {campaign.required_scenes.map((scene, index) => {
                      const parts = scene.split(/\n|:/);
                      const title = parts[0]?.trim() || scene;
                      const copy = parts.slice(1).join(':').trim();
                      return <div className="cd-scene" key={`${scene}-${index}`}><div className="cd-scene-num">{String(index + 1).padStart(2, '0')}</div><div className="cd-scene-line" /><div className="cd-scene-content"><div className="cd-scene-title">{title}</div>{copy && <div className="cd-scene-copy">{copy}</div>}</div></div>;
                    })}
                  </div>
                </section>
              )}

              {((campaign.dos?.length || 0) > 0 || (campaign.donts?.length || 0) > 0) && (
                <section className="cd-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Do's &amp; don'ts</h2><p className="cd-section-intro">Creative guardrails from the brand.</p></div></div>
                  <div className="cd-dosdonts">
                    {campaign.dos && campaign.dos.length > 0 && <div className="cd-do"><div className="cd-rule-heading cd-rule-heading--do"><CheckCircle2 size={16} /> Do</div>{campaign.dos.map((item, index) => <div className="cd-rule" key={`${item}-${index}`}><Check size={13} color="#21894c" />{item}</div>)}</div>}
                    {campaign.donts && campaign.donts.length > 0 && <div className="cd-dont"><div className="cd-rule-heading cd-rule-heading--dont"><X size={16} /> Don't</div>{campaign.donts.map((item, index) => <div className="cd-rule" key={`${item}-${index}`}><X size={13} color="#cf4944" />{item}</div>)}</div>}
                  </div>
                </section>
              )}

              {(campaign.suggested_caption || campaign.hashtags?.length) && (
                <section className="cd-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Caption &amp; tags</h2><p className="cd-section-intro">Optional copy to help you get started faster.</p></div></div>
                  <div className="cd-caption">
                    {campaign.suggested_caption && <><div className="cd-caption-top"><span className="cd-caption-label">Suggested caption</span><button className="cd-copy-button" onClick={handleCopyCaption}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div><div className="cd-caption-text">{campaign.suggested_caption}</div></>}
                    {campaign.hashtags && campaign.hashtags.length > 0 && <div className="cd-hashtags">{campaign.hashtags.map((tag, index) => <span className="cd-hashtag" key={`${tag}-${index}`}>{cleanTag(tag)}</span>)}</div>}
                  </div>
                </section>
              )}

              {campaign.video_specs && campaign.video_specs.length > 0 && (
                <section className="cd-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Content specifications</h2><p className="cd-section-intro">Technical details for getting the final content right.</p></div></div>
                  <div className="cd-spec-tabs">
                    {campaign.video_specs.map((spec, index) => {
                      const Icon = spec.platform.toLowerCase().includes('tiktok') ? Music2 : Smartphone;
                      return <button key={`${spec.platform}-${index}`} className={`cd-spec-tab ${activeSpecTab === index ? 'cd-spec-tab--active' : ''}`} onClick={() => setActiveSpecTab(index)}><Icon size={14} /> {spec.platform}</button>;
                    })}
                  </div>
                  {campaign.video_specs[activeSpecTab] && <div className="cd-spec-table">
                    <div className="cd-spec-row"><span className="cd-spec-row-label"><Film size={14} /> Format</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].aspect_ratio || '—'}</span></div>
                    <div className="cd-spec-row"><span className="cd-spec-row-label">Resolution</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].resolution || '—'}</span></div>
                    <div className="cd-spec-row"><span className="cd-spec-row-label">Duration</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].duration || '—'}</span></div>
                    <div className="cd-spec-row"><span className="cd-spec-row-label">Frame rate</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].frame_rate || '—'}</span></div>
                    <div className="cd-spec-row"><span className="cd-spec-row-label">Platform</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].platform || '—'}</span></div>
                    <div className="cd-spec-row"><span className="cd-spec-row-label">File type</span><span className="cd-spec-row-value">{campaign.video_specs[activeSpecTab].file_type || '—'}</span></div>
                    <div className="cd-spec-row"><span className="cd-spec-row-label"><Volume2 size={14} /> Voiceover</span><span className={`cd-spec-pill ${!campaign.video_specs[activeSpecTab].voiceover_required ? 'cd-spec-pill--off' : ''}`}>{campaign.video_specs[activeSpecTab].voiceover_required ? 'Required' : 'Optional'}</span></div>
                    <div className="cd-spec-row"><span className="cd-spec-row-label"><Clipboard size={14} /> Subtitles</span><span className={`cd-spec-pill ${!campaign.video_specs[activeSpecTab].subtitles_required ? 'cd-spec-pill--off' : ''}`}>{campaign.video_specs[activeSpecTab].subtitles_required ? 'Required' : 'Optional'}</span></div>
                  </div>}
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
                <div className="cd-side-card cd-owner">
                  <div className="cd-side-heading">Manage campaign</div>
                  {manageError && <div className="cd-error" style={{ marginBottom: 9 }}>{manageError}</div>}
                  <div className="cd-owner-actions">
                    <Link className="cd-owner-button" to={`/campaigns/${campaign.id}/edit`}>Edit campaign</Link>
                    {campaign.status === 'draft' && <button className="cd-owner-button" onClick={handlePublish} disabled={managing !== null}>{managing === 'publish' ? <Loader2 size={14} className="cd-spin" /> : <Rocket size={14} />}{managing === 'publish' ? 'Publishing…' : 'Publish campaign'}</button>}
                    <button className="cd-owner-button" onClick={handleDuplicate} disabled={managing !== null}>{managing === 'duplicate' ? <Loader2 size={14} className="cd-spin" /> : <Copy size={14} />}{managing === 'duplicate' ? 'Duplicating…' : 'Duplicate campaign'}</button>
                    <button className="cd-owner-button cd-owner-button--danger" onClick={handleDelete} disabled={managing !== null}>{managing === 'delete' ? <Loader2 size={14} className="cd-spin" /> : <Trash2 size={14} />}{managing === 'delete' ? 'Deleting…' : 'Delete campaign'}</button>
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

              <div className="cd-side-card cd-apply-card">
                <div className="cd-apply-accent" />
                <div className="cd-apply-topline">
                  <span className="cd-apply-dot" />
                  <span>Creator opportunity</span>
                </div>
                <h2 className="cd-apply-title">Ready to create something great?</h2>
                <p className="cd-apply-copy">
                  Pitch your creative idea to <strong>{brandName}</strong> and show the brand what makes your content a great fit for this campaign.
                </p>

                <div className="cd-apply-highlights">
                  <div className="cd-apply-highlight">
                    <div className="cd-apply-highlight-icon"><MessageCircle size={15} /></div>
                    <div><strong>Share your idea</strong><span>Tell the brand how you would bring the campaign to life.</span></div>
                  </div>
                  <div className="cd-apply-highlight">
                    <div className="cd-apply-highlight-icon"><Film size={15} /></div>
                    <div><strong>Show your style</strong><span>Highlight the kind of content and storytelling you create.</span></div>
                  </div>
                  <div className="cd-apply-highlight">
                    <div className="cd-apply-highlight-icon"><Rocket size={15} /></div>
                    <div><strong>Send your pitch</strong><span>Keep it clear, personal and relevant to this brief.</span></div>
                  </div>
                </div>

                <div className="cd-apply-divider" />
                {renderApplicationAction()}
                {!myApplication && !showApplyForm && user?.role === 'creator' && <button className="cd-save-button" onClick={handleToggleSave} disabled={savingBookmark}>{isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{isSaved ? 'Saved to your campaigns' : 'Save for later'}</button>}
                <div className="cd-apply-note"><Check size={13} /> Your pitch is sent directly to the brand.</div>
              </div>

              <div className="cd-side-card">
                <div className="cd-side-heading">Campaign snapshot</div>
                <div className="cd-side-stat"><DollarSign size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Compensation</div><div className="cd-side-stat-value">{campaign.compensation_description || formatMoney(campaign.budget) || 'Discuss with brand'}</div></div></div>
                <div className="cd-side-stat"><Calendar size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Deadline</div><div className="cd-side-stat-value">{deadline ? deadline.label : 'Open until filled'}</div></div></div>
                <div className="cd-side-stat"><MapPin size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Location</div><div className="cd-side-stat-value">{brandLocation || 'Remote / flexible'}</div></div></div>
                <div className="cd-side-stat"><Film size={15} className="cd-side-stat-icon" /><div><div className="cd-side-stat-label">Content type</div><div className="cd-side-stat-value">{campaign.sub_category || campaign.category}</div></div></div>
              </div>

              {related.length > 0 && <div className="cd-side-card cd-related">
                <div className="cd-side-heading">More campaigns</div>
                {related.map((item) => <Link key={item.id} to={`/campaigns/${item.id}`} className="cd-related-item"><div className="cd-related-title">{item.title}</div><div className="cd-related-meta">{item.brand_name || 'Business'} · {item.category}</div></Link>)}
              </div>}
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}

export default CampaignDetail;
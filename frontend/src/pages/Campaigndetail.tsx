import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Copy,
  Film,
  Loader2,
  MapPin,
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
  getPublicCampaigns,
  getPublicCampaign,
  initiateCampaignFunding,
  getCampaignPayments,
  getSavedCampaigns,
  publishCampaign,
  saveCampaign,
  unsaveCampaign,
  type Application,
  type Campaign,
  type PublicCampaign,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PublicNavbar } from '../components/PublicNavbar';
import { AppLayout } from '../components/AppLayout';
import { BRAND_PURPLE, BRAND_PURPLE_DARK, BRAND_PINK_CORAL, OFF_WHITE } from '../components/Logo';

const CORAL = BRAND_PINK_CORAL;
const CORAL_DARK = BRAND_PURPLE_DARK;
const VIOLET = BRAND_PURPLE;

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

function cleanCompensation(value?: string | null) {
  if (!value) return '';
  return value
    .replace(/\$/g, 'Rs. ')
    .replace(/Rs\.\s*Rs\.\s*/gi, 'Rs. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanTag(tag: string) {
  return tag.startsWith('#') ? tag : `#${tag}`;
}

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: -1, business_id: -1, title: "Weekend Coffee Stories", tagline: "A cosy creator-led coffee moment.",
    description: "Create a short lifestyle reel around a weekend coffee routine.", brief: "Show a relaxed weekend coffee moment in your own natural style.",
    category: "Food", sub_category: "Lifestyle", campaign_type: "paid", brand_name: "Brew & Bean", brand_location: "Kathmandu", budget: 3500,
    compensation_description: "Rs. 3,500", requirements: "Create a natural lifestyle reel with a clear product moment and an authentic voice.",
    deliverables: ["1 Instagram Reel", "1 story mention"], before_you_apply: ["Be available before the application deadline.", "Have an active Instagram account."],
    dos: ["Keep the coffee moment natural.", "Show the product clearly."], donts: ["Do not make medical or exaggerated claims."],
    creators_needed: 2, application_deadline: "2026-10-05", deadline: "2026-10-05",
    hero_image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=900&auto=format&fit=crop",
    status: "published", is_active: true, created_at: "2026-09-01T00:00:00Z", required_platform: "Instagram", required_platforms: ["Instagram"],
    application_count: 0, application_questions: ["What would your coffee story look like?"]
  },
  {
    id: -2, business_id: -2, title: "Everyday Skincare Routine", tagline: "Make self-care feel real.",
    description: "Show your honest everyday skincare routine in a clean, natural format.", brief: "Create a simple, believable skincare routine that feels like your real life.",
    category: "Beauty", sub_category: "Skincare", campaign_type: "paid", brand_name: "PureGlow", brand_location: "Lalitpur", budget: 5000,
    compensation_description: "Rs. 5,000", requirements: "Create a clean skincare video with a natural routine and clear product visibility.",
    deliverables: ["1 TikTok video", "1 product-focused story"], before_you_apply: ["Use the product naturally in your routine."],
    dos: ["Keep the routine authentic.", "Use clear product shots."], donts: ["Do not make unsupported skincare claims."],
    creators_needed: 3, application_deadline: "2026-10-12", deadline: "2026-10-12",
    hero_image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=900&auto=format&fit=crop",
    status: "published", is_active: true, created_at: "2026-09-01T00:00:00Z", required_platform: "TikTok", required_platforms: ["TikTok"],
    application_count: 0, application_questions: ["How would you make this skincare routine feel authentic to your audience?"]
  },
  {
    id: -3, business_id: -3, title: "City Style Edit", tagline: "Your take on everyday street style.",
    description: "Create a stylish short-form fashion edit featuring your favourite everyday look.", brief: "Put your own spin on an easy everyday street-style look.",
    category: "Fashion", sub_category: "Style", campaign_type: "paid", brand_name: "Mode Studio", brand_location: "Kathmandu", budget: 4500,
    compensation_description: "Rs. 4,500", requirements: "Create a polished short-form fashion edit with a strong visual hook.",
    deliverables: ["1 Instagram Reel"], before_you_apply: ["Have access to a suitable everyday fashion look."],
    dos: ["Keep the styling personal.", "Make the first few seconds visually strong."], donts: ["Do not copy another creator's concept exactly."],
    creators_needed: 1, application_deadline: "2026-10-18", deadline: "2026-10-18",
    hero_image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=900&auto=format&fit=crop",
    status: "published", is_active: true, created_at: "2026-09-01T00:00:00Z", required_platform: "Instagram", required_platforms: ["Instagram"],
    application_count: 0
  },
  {
    id: -4, business_id: -4, title: "Mountain Escape", tagline: "Tell the story of a quick escape.",
    description: "Create a travel-focused reel highlighting a memorable Nepal getaway.", brief: "Capture a short, immersive travel story around a Nepal getaway.",
    category: "Travel", sub_category: "Travel", campaign_type: "paid", brand_name: "Himalayan Trails", brand_location: "Pokhara", budget: 7000,
    compensation_description: "Rs. 7,000", requirements: "Create an engaging travel reel featuring destination moments and your personal perspective.",
    deliverables: ["1 Instagram Reel", "3 story frames"], before_you_apply: ["Be able to feature a Nepal travel experience."],
    dos: ["Show the destination naturally.", "Include a clear story arc."], donts: ["Do not use misleading destination information."],
    creators_needed: 2, application_deadline: "2026-10-22", deadline: "2026-10-22",
    hero_image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=900&auto=format&fit=crop",
    status: "published", is_active: true, created_at: "2026-09-01T00:00:00Z", required_platform: "Instagram", required_platforms: ["Instagram"],
    application_count: 0
  },
  {
    id: -5, business_id: -5, title: "Sunday Brunch", tagline: "A simple brunch story with personality.",
    description: "Capture a relaxed brunch experience with your own visual style.", brief: "Tell a casual Sunday brunch story that feels warm and personal.",
    category: "Food", sub_category: "Lifestyle", campaign_type: "paid", brand_name: "The Brunch House", brand_location: "Kathmandu", budget: 3000,
    compensation_description: "Rs. 3,000", requirements: "Create a relaxed food/lifestyle story around the brunch experience.",
    deliverables: ["1 Instagram Reel"], before_you_apply: [], dos: ["Keep the experience natural."], donts: ["Do not misrepresent the menu."],
    creators_needed: 2, application_deadline: "2026-10-26", deadline: "2026-10-26",
    hero_image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=900&auto=format&fit=crop",
    status: "in_progress", is_active: true, created_at: "2026-09-01T00:00:00Z", required_platform: "Instagram", required_platforms: ["Instagram"],
    application_count: 0
  },
  {
    id: -6, business_id: -6, title: "Glow Night", tagline: "A night-time beauty story.",
    description: "Create a polished evening beauty routine with a strong visual hook.", brief: "Show a polished evening beauty routine with a clear, creator-led point of view.",
    category: "Beauty", sub_category: "Makeup", campaign_type: "paid", brand_name: "Luna Beauty", brand_location: "Lalitpur", budget: 5500,
    compensation_description: "Rs. 5,500", requirements: "Create a polished evening beauty routine with clear product moments.",
    deliverables: ["1 TikTok video"], before_you_apply: [], dos: ["Keep lighting and product shots clear."], donts: ["Do not make unsupported beauty claims."],
    creators_needed: 1, application_deadline: "2026-11-01", deadline: "2026-11-01",
    hero_image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=900&auto=format&fit=crop",
    status: "in_progress", is_active: true, created_at: "2026-09-01T00:00:00Z", required_platform: "TikTok", required_platforms: ["TikTok"],
    application_count: 0
  },
];

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Navigation is chosen from the actual entry context.
  // Landing/public -> PublicNavbar. Business dashboard -> AppLayout/sidebar.
  // Creators always keep the public navbar, even if they open a campaign from
  // their dashboard.
  const stateSource = (location.state as { source?: string } | null)?.source;
  const requestedDashboardContext =
    searchParams.get('source') === 'dashboard' || stateSource === 'dashboard';
  const fromDashboard =
    user?.role === 'business' && requestedDashboardContext;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [related, setRelated] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicationAnswers, setApplicationAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [activeSpecTab, setActiveSpecTab] = useState(0);
  const [activeProductImage, setActiveProductImage] = useState(0);

  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [proposal, setProposal] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [copied, setCopied] = useState(false);

  const [managing, setManaging] = useState<'publish' | 'delete' | 'duplicate' | null>(null);
  const [manageError, setManageError] = useState('');

  const [fundingCampaign, setFundingCampaign] = useState(false);
  const [fundingError, setFundingError] = useState('');
  const [fundingAccountMasked, setFundingAccountMasked] = useState('••••••••');
  const [fundingAccountName, setFundingAccountName] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const numericId = Number(id);
    const isDemo = Number.isFinite(numericId) && numericId < 0;

    (async () => {
      setLoading(true);
      setError('');
      setRelated([]);
      setMyApplication(null);
      setIsSaved(false);
      setFundingAccountName(user?.profile?.company_name || '');
      setFundingAccountMasked('••••••••');

      try {
        let data: Campaign;

        if (isDemo) {
          const demo = DEMO_CAMPAIGNS.find((item) => item.id === numericId);
          if (!demo) throw new Error('Demo campaign not found');
          data = demo;
        } else {
          // Business dashboard -> authenticated endpoint (also permits drafts).
          // Landing/public/creator -> public endpoint (never hits the protected
          // /api/campaigns/{id} endpoint, so visitors and creators don't get 403).
          data = fromDashboard
            ? await getCampaign(id)
            : await getPublicCampaign(id);
        }

        if (cancelled) return;
        setCampaign(data);
        if (user?.role === 'business' && data.business_id === user.id && data.id > 0) {
          try {
            const payments = await getCampaignPayments(data.id);
            const funding = payments.find(
              (payment) =>
                payment.payment_type === 'campaign_funding' &&
                ['funded', 'completed', 'released'].includes(payment.status)
            );
            setFundingAccountName(
              funding?.funding_account_name || user.profile?.company_name || 'Registered business'
            );
            setFundingAccountMasked(
              funding?.funding_account_masked || '••••••••'
            );
          } catch (err) {
            console.error('Could not load campaign funding details:', err);
            setFundingAccountName(user.profile?.company_name || 'Registered business');
            setFundingAccountMasked('••••••••');
          }
        } else {
          setFundingAccountName(user?.profile?.company_name || '');
          setFundingAccountMasked('••••••••');
        }

        // Demo campaigns are presentation-only. Never call protected APIs with
        // their negative placeholder IDs.
        if (data.id < 0) {
          setLoading(false);
          return;
        }

        // The public campaign response already contains the brand name, location,
        // and (for public campaigns) logo. Do not call the old /businesses/...
        // public-profile endpoint here because it is not available in every backend
        // version and otherwise causes an unnecessary 404 on campaign detail.

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
          // Related campaigns are public content, so use the public endpoint.
          const list = await getPublicCampaigns({
            category: data.category,
            limit: 100,
          });
          if (!cancelled) {
            setRelated(
              list.campaigns
                .filter((item) => item.id !== data.id)
                .slice(0, 3)
            );
          }
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
  }, [id, user?.role, fromDashboard]);

  const deadline = useMemo(() => formatDeadline(campaign?.deadline), [campaign?.deadline]);

  useEffect(() => {
    if (searchParams.get('apply') !== 'true') return;
    if (loading || !campaign || myApplication) return;

    // Keep the existing application modal. Logged-in creators get the normal
    // form; logged-out visitors get the registration gate inside that same
    // modal. A booked/closed campaign cannot be applied to.
    if (deadline?.closed || campaign.status !== 'published') {
      setApplyError(campaign.status === 'in_progress' ? 'This campaign is already booked.' : 'Applications for this campaign are closed.');
      setShowApplyForm(false);
    } else {
      setApplyError('');
      setShowApplyForm(true);
      if (user?.role === 'creator' && applicationAnswers.length === 0 && campaign.application_questions?.length) {
        setApplicationAnswers(campaign.application_questions.map((question) => ({ question, answer: '' })));
      }
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('apply');
      return next;
    }, { replace: true });
  }, [searchParams, loading, campaign, user?.role, myApplication, deadline?.closed, applicationAnswers.length, setSearchParams]);
  const publicCampaign = campaign as PublicCampaign | null;
  const brandName = campaign?.brand_name || 'Business';
  const brandLocation = campaign?.brand_location || '';
  const brandIndustry = campaign?.category || '';
  const brandLogo = resolveMediaUrl(publicCampaign?.brand_logo);
  const productImages = useMemo(() => {
    const extraPhotos = Array.isArray((campaign as (Campaign & { extra_photos?: string[] }) | null)?.extra_photos)
      ? ((campaign as (Campaign & { extra_photos?: string[] }) | null)?.extra_photos || [])
      : [];
    return Array.from(new Set([campaign?.hero_image || '', ...extraPhotos].filter(Boolean))).map(resolveMediaUrl);
  }, [campaign]);

  const handleToggleSave = async () => {
    if (!campaign || campaign.id < 0 || savingBookmark) return;
    const previous = isSaved;
    setSavingBookmark(true);
    setIsSaved(!previous);
    try {
      if (previous) {
        await unsaveCampaign(campaign.id);
      } else {
        await saveCampaign(campaign.id);
      }

      window.dispatchEvent(new Event('ch:wishlist-changed'));
    } catch (err) {
      console.error('Could not update saved status:', err);
      setIsSaved(previous);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleApplySubmit = async () => {
    if (!campaign) return;
    if (campaign.id < 0) {
      setApplyError("This is a demo campaign. Applications are available on live campaigns.");
      return;
    }
    if (!proposal.trim()) {
      setApplyError("Tell them why you're a good fit before submitting.");
      return;
    }

    const unanswered = applicationAnswers.find((item) => !item.answer.trim());
    if (unanswered) {
      setApplyError("Please answer all application questions before submitting.");
      return;
    }

    setApplying(true);
    setApplyError('');
    try {
      const created = await createApplication({
        campaign_id: campaign.id,
        proposal: proposal.trim(),
        application_answers: applicationAnswers.filter((item) => item.answer.trim()),
      });
      setMyApplication(created);
      setShowApplyForm(false);
      setProposal('');
      setApplicationAnswers([]);
    } catch (err: any) {
      setApplyError(err?.response?.data?.detail || 'Could not submit your application. Please try again.');
    } finally {
      setApplying(false);
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

  const handleFundCampaign = async () => {
    if (!campaign || campaign.campaign_type !== 'paid') return;
    if (!campaign.budget || Number(campaign.budget) <= 0) {
      setFundingError('Set a valid campaign budget before funding this campaign.');
      return;
    }
    setFundingCampaign(true);
    setFundingError('');
    try {
      const result = await initiateCampaignFunding(campaign.id);
      window.location.href = result.payment_url;
    } catch (err: any) {
      setFundingError(err?.response?.data?.detail || 'Could not start campaign funding.');
    } finally {
      setFundingCampaign(false);
    }
  };

  const handlePublish = async () => {
    if (!campaign) return;

    // A paid campaign must be fully funded before the owner can publish it.
    // Funding and publishing are intentionally separate steps.
    if (campaign.campaign_type === 'paid' && campaign.funding_status !== 'funded') {
      setManageError('Fund the campaign budget before publishing.');
      return;
    }

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
          ? 'Application accepted'
          : myApplication.status === 'rejected'
          ? 'Application rejected'
          : 'Application withdrawn';
      return (
        <div className={`cd-application-status cd-application-status--${myApplication.status}`}>
          <CheckCircle2 size={17} /> {label}
        </div>
      );
    }

    if (!user || user.role !== 'creator') {
      return <button className="cd-apply-button cd-apply-button--disabled" disabled>{user ? 'Apply unavailable' : 'Sign in to apply'}</button>;
    }

    if (campaign.id < 0) {
      return <button className="cd-apply-button cd-apply-button--disabled" disabled>Demo campaign</button>;
    }

    if (deadline?.closed || campaign.status !== 'published') {
      return <button className="cd-apply-button cd-apply-button--disabled" disabled>{campaign.status === 'in_progress' ? 'Campaign booked' : 'Applications closed'}</button>;
    }

    if (campaign.campaign_type === 'paid' && campaign.funding_status !== 'funded') {
      return <button className="cd-apply-button cd-apply-button--disabled" disabled>Applications open after funding</button>;
    }

    return (
      <button className="cd-apply-button" onClick={() => {
        setApplyError('');
        setShowApplyForm(true);
        if (applicationAnswers.length === 0 && campaign.application_questions?.length) {
          setApplicationAnswers(campaign.application_questions.map((question) => ({ question, answer: '' })));
        }
      }}>
        Apply to this campaign <ChevronRight size={17} />
      </button>
    );
  };

  const pageContent = (
    <div className="cd-page">
      <style>{`
        .cd-page {
          --coral: ${CORAL};
          --coral-dark: ${CORAL_DARK};
          --violet: ${VIOLET};
          --violet-dark: ${CORAL_DARK};
          --ink: #12131a;
          --muted: #70717a;
          --soft: #f7f7fa;
          --line: #e7e7eb;
          min-height: 100vh;
          background: ${OFF_WHITE};
          color: var(--ink);
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .cd-page *, .cd-page *::before, .cd-page *::after { box-sizing: border-box; }
        .cd-creator-nav {
          position: sticky; top: 0; z-index: 60;
          background: #FBF8F4; border-bottom: 1px solid #EEE8E2;
          backdrop-filter: blur(10px);
        }
        .cd-creator-nav-inner {
          max-width: 1240px; margin: 0 auto; padding: 16px 32px;
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
        }
        .cd-creator-logo { display:flex; align-items:center; gap:9px; color:#7661A1; text-decoration:none; font-family:'League Spartan','Poppins',sans-serif; font-size:19px; font-weight:700; }
        .cd-creator-links { display:flex; align-items:center; gap:30px; }
        .cd-creator-link { position:relative; padding-bottom:4px; color:#6F6A7C; text-decoration:none; font-size:14.5px; font-weight:500; }
        .cd-creator-link:hover, .cd-creator-link.active { color:#7661A1; }
        .cd-creator-link.active { font-weight:600; }
        .cd-creator-link::after { content:''; position:absolute; left:0; right:100%; bottom:-3px; height:2px; background:#7661A1; border-radius:2px; transition:right .2s ease; }
        .cd-creator-link:hover::after, .cd-creator-link.active::after { right:0; }
        .cd-creator-actions { display:flex; align-items:center; gap:10px; }
        .cd-nav-round { width:38px; height:38px; border-radius:50%; border:1px solid #E7E0F3; display:flex; align-items:center; justify-content:center; background:#fff; color:#6F6A7C; text-decoration:none; }
        .cd-nav-round:hover { color:#7661A1; border-color:#7661A1; }
        .cd-creator-nav .cd-profile-avatar { width:38px; height:38px; margin-left:0; border:1px solid #E7E0F3; background:#F0EBF6; color:#7661A1; }
        .cd-creator-burger { display:none; border:0; background:transparent; color:#7661A1; padding:5px; }
        .cd-creator-mobile { display:flex; flex-direction:column; gap:4px; padding:12px 32px 20px; background:#FBF8F4; border-top:1px solid #EEE8E2; }
        .cd-creator-mobile a { padding:11px 4px; color:#241F2E; text-decoration:none; font-size:15px; font-weight:500; }

        .cd-topbar {
          position: sticky; top: 0; z-index: 50; height: 64px; background: rgba(255,255,255,.98);
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
        .cd-nav-back { border: 0; background: transparent; color: var(--violet); display: inline-flex; align-items: center; gap: 6px; font: 600 12px 'Poppins', sans-serif; cursor: pointer; padding: 7px 9px; border-radius: 8px; }
        .cd-nav-back:hover { background: #F2ECF7; color: var(--violet-dark); }
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
        .cd-pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; background: #FDF0F0; border: 1px solid #F4D7D8; color: #55565e; font-size: 12.5px; font-weight: 650; }
        .cd-pill svg { color: var(--coral-dark); flex: 0 0 auto; }
        .cd-meta-row { display: flex; flex-wrap: wrap; gap: 9px 16px; margin-top: 14px; }
        .cd-meta-item { display: inline-flex; align-items: center; gap: 6px; color: #55565e; font-size: 12.5px; font-weight: 600; }
        .cd-meta-item svg { color: var(--coral-dark); }
        .cd-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; padding-top: 15px; border-top: 1px solid var(--line); }
        .cd-tag { padding: 5px 10px; border-radius: 999px; background: #f6f6f8; border: 1px solid #e7e7eb; color: #666771; font-size: 11.5px; font-weight: 600; }
        .cd-tag--accent { color: var(--coral-dark); background: #FDEDEC; border-color: #F4D0D1; }
        .cd-hero-hashtags { display: flex; flex-wrap: wrap; gap: 5px 12px; margin-top: 10px; }
        .cd-hero-hashtag { color: var(--coral-dark); font-size: 12px; font-weight: 650; }

        .cd-visual { margin-top: 18px; overflow: hidden; border-radius: 22px; border: 1px solid var(--line); background: linear-gradient(145deg, #fff, #f3f3f7); min-height: 260px; }
        .cd-visual img { width: 100%; max-height: 560px; display: block; object-fit: cover; }
        .cd-visual-placeholder { min-height: 270px; display: flex; align-items: center; justify-content: center; padding: 42px; position: relative; overflow: hidden; }
        .cd-visual-placeholder::before, .cd-visual-placeholder::after { content: ''; position: absolute; border-radius: 50%; filter: blur(2px); opacity: .8; }
        .cd-visual-placeholder::before { width: 220px; height: 220px; right: 7%; top: -80px; background: #FDE7E7; }
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
        .cd-number { width: 34px; height: 34px; border-radius: 11px; background: #FDE7E7; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
        .cd-deliverable-title { font-size: 14.5px; font-weight: 700; margin-bottom: 3px; }
        .cd-deliverable-copy { color: var(--muted); font-size: 13px; line-height: 1.65; }

        .cd-requirements { padding: 0; }
        .cd-requirement-list { margin: 0; padding: 0; list-style: none; }
        .cd-requirement-list li { display: flex; align-items: flex-start; gap: 10px; padding: 11px 0; color: #3f4047; font-size: 14px; line-height: 1.65; border-bottom: 1px solid #ededf0; }
        .cd-requirement-list li:last-child { border-bottom: 0; }
        .cd-check { width: 20px; height: 20px; border-radius: 50%; background: #FDE7E7; color: var(--coral-dark); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; margin-top: 1px; }
        .cd-requirements-copy { white-space: pre-wrap; }

        .cd-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
        .cd-checklist-item { min-height: 52px; display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--line); border-radius: 13px; padding: 11px 13px; font-size: 13px; color: #3f4047; }
        .cd-checklist-item .cd-check { background: #edf8f1; color: #21894c; }

        .cd-scenes { position: relative; padding-left: 3px; }
        .cd-scene { position: relative; display: grid; grid-template-columns: 44px minmax(0,1fr); gap: 13px; padding-bottom: 23px; }
        .cd-scene:last-child { padding-bottom: 0; }
        .cd-scene-line { position: absolute; left: 16px; top: 35px; bottom: 0; width: 1px; background: #F2C9D0; }
        .cd-scene:last-child .cd-scene-line { display: none; }
        .cd-scene-num { width: 34px; height: 34px; border-radius: 50%; background: #fff; border: 2px solid #EDC0CB; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; position: relative; z-index: 1; }
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
        .cd-hashtag { color: var(--coral-dark); background: #FDEDEC; border: 1px solid #F4D0D1; border-radius: 999px; padding: 5px 10px; font-size: 11.5px; font-weight: 650; }

        .cd-spec-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .cd-spec-tab { border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 8px 11px; display: inline-flex; align-items: center; gap: 6px; color: #686971; font-size: 12px; font-weight: 650; cursor: pointer; }
        .cd-spec-tab--active { border-color: #ffcdbf; color: var(--coral-dark); background: #fff5f1; }
        .cd-spec-table { background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
        .cd-spec-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 13px 16px; border-bottom: 1px solid #ededf0; font-size: 13px; }
        .cd-spec-row:last-child { border-bottom: 0; }
        .cd-spec-row-label { color: var(--muted); display: inline-flex; align-items: center; gap: 6px; }
        .cd-spec-row-value { font-weight: 700; text-align: right; }
        .cd-spec-pill { padding: 4px 9px; border-radius: 999px; background: #FDE7E7; color: var(--coral-dark); font-size: 10.5px; font-weight: 750; }
        .cd-spec-pill--off { background: #f0f0f3; color: #73747c; }

        .cd-guidelines-note { display: flex; gap: 13px; align-items: flex-start; background: #FAF6F8; border: 1px solid #E9DDF0; border-radius: 18px; padding: 20px 22px; }
        .cd-guidelines-note-icon { width: 34px; height: 34px; border-radius: 11px; background: #FDE7E7; color: var(--coral-dark); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; }
        .cd-guidelines-note-title { font-size: 14.5px; font-weight: 750; margin-bottom: 5px; }
        .cd-guidelines-note-copy { margin: 0; color: #5c5d66; font-size: 13.5px; line-height: 1.7; }

        .cd-sidebar { position: sticky; top: 92px; display: flex; flex-direction: column; gap: 13px; }
        .cd-side-card { background: #fff; border: 1px solid var(--line); border-radius: 19px; padding: 19px; box-shadow: 0 7px 26px rgba(18,19,26,.04); }
        .cd-apply-card { position: relative; overflow: hidden; border-color: #F7C8C5; background: linear-gradient(180deg, #FBF8FA 0%, #fff 42%); box-shadow: 0 12px 34px rgba(255,107,90,.11), 0 3px 12px rgba(30,42,120,.035); }
        .cd-apply-accent { position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, var(--coral), #F8A09D, var(--violet)); }
        .cd-apply-topline { display: inline-flex; align-items: center; gap: 7px; color: var(--coral-dark); font-size: 10px; font-weight: 800; letter-spacing: .075em; text-transform: uppercase; margin: 2px 0 10px; }
        .cd-apply-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--coral); box-shadow: 0 0 0 4px rgba(255,107,90,.10); }
        .cd-apply-title { font-size: 23px; line-height: 1.18; font-weight: 800; letter-spacing: -.55px; margin: 0 0 9px; color: #20213a; }
        .cd-apply-copy { color: var(--muted); font-size: 12.5px; line-height: 1.65; margin: 0 0 16px; }
        .cd-apply-copy strong { color: #343541; font-weight: 750; }
        .cd-apply-highlights { display: grid; gap: 10px; margin-bottom: 16px; }
        .cd-apply-highlight { display: grid; grid-template-columns: 31px 1fr; gap: 9px; align-items: start; }
        .cd-apply-highlight-icon { width: 31px; height: 31px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--coral-dark); background: #FDE7E7; border: 1px solid #ffd9d0; }
        .cd-apply-highlight strong { display: block; color: #373841; font-size: 11.5px; line-height: 1.35; margin-bottom: 2px; }
        .cd-apply-highlight span { display: block; color: #85868e; font-size: 10.5px; line-height: 1.45; }
        .cd-apply-divider { height: 1px; background: #E9E0E8; margin: 0 -2px 14px; }
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
        .cd-brand-side { text-decoration: none; color: inherit; border-color: #EAD7E7; transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
        .cd-brand-side:hover { transform: translateY(-2px); border-color: #DDB0CB; box-shadow: 0 10px 28px rgba(255,107,90,.11); }
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
        .cd-secondary-button { min-height: 41px; border: 1px solid #DED7E9; border-radius: 10px; background: #fff; color: #42434a; font-size: 12px; font-weight: 700; cursor: pointer; }
        .cd-error { color: #c84642; background: #fff0ef; border: 1px solid #f2cfcc; padding: 9px 10px; border-radius: 9px; font-size: 11.5px; line-height: 1.5; }
        .cd-application-status { min-height: 43px; display: flex; align-items: center; justify-content: center; gap: 7px; border-radius: 11px; font-size: 12.5px; font-weight: 750; text-transform: capitalize; }
        .cd-application-status--pending { color: #956b00; background: #fff5df; }
        .cd-application-status--accepted { color: #21894c; background: #edf8f1; }
        .cd-application-status--rejected { color: #c84642; background: #fff0ef; }

        .cd-funding-box { border: 1px solid #EAE7F2; border-radius: 12px; padding: 13px; margin-bottom: 9px; background: #FBFAFD; }
        .cd-funding-box--funded { background: #F2FAF5; border-color: #CFE8D8; }
        .cd-funding-title { color: #241F2E; font-size: 11.5px; font-weight: 800; }
        .cd-funding-amount { color: #66518F; font-size: 20px; font-weight: 850; margin-top: 4px; }
        .cd-funding-copy { color: #6B6478; font-size: 10.5px; line-height: 1.5; margin: 3px 0 10px; }
        .cd-fund-campaign { width: 100%; background: #7661A1; color: #fff; border-color: #7661A1; }
        .cd-fund-campaign:hover { background: #66518F; color: #fff; }
        .cd-funding-error { color: #C84642; font-size: 10.5px; margin-top: 8px; line-height: 1.4; }
        .cd-creator-funding { margin-bottom: 10px; }
        .cd-owner { border-color: #dddde5; }
        .cd-sidebar > .cd-owner { order: 1; }
        .cd-owner-actions { display: grid; gap: 7px; }
        .cd-owner-button { min-height: 38px; border: 1px solid #dedee5; border-radius: 9px; background: #fff; display: flex; align-items: center; justify-content: center; gap: 6px; color: #41424a; font-size: 11.5px; font-weight: 700; cursor: pointer; text-decoration: none; }
        .cd-owner-button:hover { background: #F0EBF6; border-color: #D9D0E7; color: #66518F; }
        .cd-owner-button--danger { color: #c84642; border-color: #f0cdca; }

        .cd-extra-section, .cd-snapshot-card { display: none !important; }
        .cd-money-mark { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:8px; background:#FDEBE9; color:#E86966; font-size:9px; font-weight:800; letter-spacing:-.02em; }
        .cd-modal-backdrop { position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(36,31,46,.38); backdrop-filter:blur(5px); }
        .cd-apply-modal { position:relative; width:min(560px,100%); max-height:min(760px,calc(100vh - 48px)); overflow:auto; background:#FBF8F4; border:1px solid #E7E0F3; border-radius:24px; padding:28px; box-shadow:0 24px 70px rgba(36,31,46,.2); }
        .cd-modal-close { position:absolute; top:17px; right:17px; width:34px; height:34px; border:1px solid #E7E0F3; border-radius:50%; background:#fff; color:#6F6A7C; display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .cd-modal-close:hover { color:#7661A1; border-color:#7661A1; }
        .cd-modal-kicker { color:#F47C78; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
        .cd-apply-modal h2 { margin:0 40px 8px 0; color:#7661A1; font-family:'League Spartan','Poppins',sans-serif; font-size:30px; line-height:1.1; }
        .cd-modal-copy { margin:0 0 20px; color:#6F6A7C; font-size:12.5px; line-height:1.7; }
        .cd-modal-label { display:block; margin:0 0 7px; color:#241F2E; font-size:11.5px; font-weight:700; }
        .cd-modal-label span { color:#F47C78; }
        .cd-modal-input { width:100%; border:1px solid #DED7E9; border-radius:12px; background:#fff; color:#241F2E; font:inherit; font-size:12.5px; outline:none; padding:11px 12px; }
        .cd-modal-input:focus { border-color:#7661A1; box-shadow:0 0 0 3px rgba(118,97,161,.1); }
        .cd-modal-textarea { min-height:105px; resize:vertical; }
        .cd-modal-questions { display:grid; gap:14px; margin-top:15px; }
        .cd-modal-question-input { min-height:74px; }
        .cd-modal-field { margin-top:15px; }
        .cd-fixed-compensation { margin-top:14px; padding:12px 14px; border-radius:10px; background:#F4F1F8; color:#5F566D; font-size:12px; line-height:1.5; }
        .cd-fixed-compensation strong { color:#7661A1; }
        .cd-modal-actions { display:grid; grid-template-columns:1fr 1.6fr; gap:9px; margin-top:20px; }
        .cd-modal-actions--gate { grid-template-columns:1fr 1.6fr; }
        .cd-modal-error { margin:0 0 13px; }

        .cd-empty { max-width: 600px; margin: 80px auto; text-align: center; padding: 0 24px; color: var(--muted); }
        .cd-empty button { margin-top: 12px; }
        .cd-spin { animation: cd-spin .8s linear infinite; }
        @keyframes cd-spin { to { transform: rotate(360deg); } }

        /* Reference-style campaign layout */
        .cd-page { background: #FBF8F4; }
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
        .cd-section-title { font-size: 20px; color: #66518F; }
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
        .cd-apply-card { border: 1px solid #F7C8C5; }
        .cd-back { margin-bottom: 13px; }
        .cd-title { color: #66518F; font-size: clamp(32px, 4vw, 46px); }
        .cd-kicker { color: #66518F; }
        .cd-pill { background: #f8f9fc; border-color: #e9eaf0; }
        .cd-tag { background: #f5f6fa; border-color: #e7e8ee; }
        .cd-tag--accent { background: #fff1ed; border-color: #ffd7ce; }
        .cd-hero-hashtag { color: #7661A1; }

        .cd-public-nav { position: sticky; top: 0; z-index: 80; background: #FBF8F4; border-bottom: 1px solid #EEE8E2; }
        .cd-public-nav-inner { max-width: 1240px; height: 62px; margin: 0 auto; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; gap: 28px; }
        .cd-public-logo { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; color: #17171A; }
        .cd-public-logo span { font-family: 'League Spartan', sans-serif; font-size: 19px; font-weight: 650; letter-spacing: .01em; color: #17171A; }
        .cd-public-links { display: flex; align-items: center; gap: 30px; margin-left: auto; margin-right: auto; }
        .cd-public-link { position: relative; text-decoration: none; color: #55545A; font-size: 13px; font-weight: 650; padding: 23px 0 20px; }
        .cd-public-link:hover, .cd-public-link.active { color: #7661A1; }
        .cd-public-link.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: 14px; height: 2px; border-radius: 2px; background: #7661A1; }
        .cd-public-actions { display: flex; align-items: center; gap: 10px; }
        .cd-public-login { text-decoration: none; color: #55545A; font-size: 13px; font-weight: 700; padding: 10px 13px; }
        .cd-public-login:hover { color: #7661A1; }
        .cd-public-register { text-decoration: none; background: #7661A1; color: #fff; border: 1px solid #7661A1; border-radius: 9px; padding: 10px 17px; font-size: 13px; font-weight: 750; }
        .cd-public-register:hover { background: #66518F; border-color: #66518F; }
        .cd-public-round { width: 38px; height: 38px; border: 1px solid #E5DFDA; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #55545A; background: #fff; text-decoration: none; }
        .cd-public-round:hover { color: #7661A1; border-color: #D7CDE4; }
        .cd-public-avatar { width: 38px; height: 38px; border-radius: 50%; }
        .cd-public-burger { display: none; width: 38px; height: 38px; border: 1px solid #E5DFDA; border-radius: 9px; background: #fff; color: #55545A; align-items: center; justify-content: center; cursor: pointer; }
        .cd-public-mobile { display: none; }

        /* Shared dashboard visual language */
        .cd-page { background: #FBF8F4; }
        .cd-shell { color: #1A1625; }
        .cd-back { color: #6B6478; }
        .cd-back:hover { color: #7661A1; }
        .cd-section-title { color: #66518F; }
        .cd-hero, .cd-opportunity-card, .cd-brief, .cd-deliverables, .cd-side-card { background: #FFFFFF; }
        .cd-hero, .cd-opportunity-card, .cd-side-card { box-shadow: 0 6px 24px rgba(26,22,37,.045); }
        .cd-apply-button { background: #F47C78; border-color: #F47C78; box-shadow: 0 6px 16px rgba(244,124,120,.18); }
        .cd-apply-button:hover:not(:disabled) { background: #E86966; border-color: #E86966; }
        .cd-owner-button { border-color: #EAE7F2; }
        .cd-owner-button:hover { background: #F0EBF6; border-color: #D9D0E7; color: #66518F; }
        .cd-public-register { background: #7661A1; border-color: #7661A1; }
        .cd-public-register:hover { background: #66518F; border-color: #66518F; }

        @media (max-width: 920px) {
          .cd-layout { grid-template-columns: 1fr; }
          .cd-hero-reference { grid-template-columns: 1fr; }
          .cd-hero-media { order: -1; }
          .cd-sidebar { position: static; display: grid; grid-template-columns: 1fr 1fr; align-items: start; }
          .cd-apply-card { grid-column: 1 / -1; }
        }
        @media (max-width: 650px) {
          .cd-public-nav-inner { height: 60px; padding: 0 16px; }
          .cd-public-links { display: none; }
          .cd-public-burger { display: inline-flex; }
          .cd-public-mobile { display: flex; flex-direction: column; gap: 0; padding: 8px 16px 14px; background: #FBF8F4; border-top: 1px solid #EEE8E2; }
          .cd-public-mobile a { color: #55545A; text-decoration: none; font-size: 14px; font-weight: 650; padding: 11px 4px; }
          .cd-public-mobile a:hover { color: #7661A1; }
          .cd-topbar-inner { padding: 0 16px; }
          .cd-creator-nav-inner { padding: 14px 16px; }
          .cd-creator-links, .cd-creator-nav .cd-nav-round { display: none; }
          .cd-creator-burger { display: inline-flex; align-items:center; justify-content:center; }
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
                    <span className="cd-pill">Paid Campaign</span>
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
                  <div className="cd-opportunity-card"><span className="cd-opportunity-icon cd-money-mark">Rs</span><div className="cd-opportunity-label">Compensation</div><div className="cd-opportunity-value">{cleanCompensation(campaign.compensation_description) || formatMoney(campaign.budget) || 'Discuss with brand'}</div></div>
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
                <section className="cd-section cd-extra-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Creator checklist</h2><p className="cd-section-intro">A quick check before you hit submit.</p></div></div>
                  <div className="cd-checklist">
                    {campaign.checklist.map((item, index) => <div className="cd-checklist-item" key={`${item.text}-${index}`}><span className="cd-check"><Check size={12} strokeWidth={3} /></span>{item.text}</div>)}
                  </div>
                </section>
              )}

              {campaign.required_scenes && campaign.required_scenes.length > 0 && (
                <section className="cd-section cd-extra-section">
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
                <section className="cd-section cd-extra-section">
                  <div className="cd-section-header"><div><h2 className="cd-section-title">Caption &amp; tags</h2><p className="cd-section-intro">Optional copy to help you get started faster.</p></div></div>
                  <div className="cd-caption">
                    {campaign.suggested_caption && <><div className="cd-caption-top"><span className="cd-caption-label">Suggested caption</span><button className="cd-copy-button" onClick={handleCopyCaption}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button></div><div className="cd-caption-text">{campaign.suggested_caption}</div></>}
                    {campaign.hashtags && campaign.hashtags.length > 0 && <div className="cd-hashtags">{campaign.hashtags.map((tag, index) => <span className="cd-hashtag" key={`${tag}-${index}`}>{cleanTag(tag)}</span>)}</div>}
                  </div>
                </section>
              )}

              {campaign.video_specs && campaign.video_specs.length > 0 && (
                <section className="cd-section cd-extra-section">
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
                <section className="cd-section cd-extra-section">
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
                    {campaign.campaign_type === 'paid' && campaign.funding_status !== 'funded' && (
                      <div className="cd-funding-box">
                        <div className="cd-funding-title">Funding account</div>
                        <div className="cd-funding-amount">Rs. {Number(campaign.budget || 0).toLocaleString()}</div>
                        <div className="cd-funding-copy">
                          Account name: <strong>{fundingAccountName || user?.profile?.company_name || 'Registered business'}</strong><br />
                          Account number: <strong>{fundingAccountMasked}</strong><br />
                          The registered company name cannot be changed during funding.
                        </div>
                        <button type="button" className="cd-owner-button cd-fund-campaign" onClick={handleFundCampaign} disabled={fundingCampaign || campaign.status === 'completed' || campaign.status === 'cancelled'}>
                          {fundingCampaign ? <Loader2 size={14} className="cd-spin" /> : null}
                          {fundingCampaign ? 'Starting checkout…' : 'Fund campaign'}
                        </button>
                        {fundingError && <div className="cd-funding-error">{fundingError}</div>}
                      </div>
                    )}
                    {campaign.campaign_type === 'paid' && campaign.funding_status === 'funded' && (
                      <div className="cd-funding-box cd-funding-box--funded">
                        <div className="cd-funding-title">Campaign funded</div>
                        <div className="cd-funding-amount">Rs. {Number(campaign.funded_amount || campaign.budget || 0).toLocaleString()}</div>
                        <div className="cd-funding-copy">
                          Account name: <strong>{fundingAccountName || user?.profile?.company_name || 'Registered business'}</strong><br />
                          Account number: <strong>{fundingAccountMasked}</strong><br />
                          Budget secured. Creators can now apply.
                        </div>
                      </div>
                    )}

                    {campaign.status === 'draft' && campaign.campaign_type === 'paid' && campaign.funding_status === 'funded' && (
                      <button className="cd-owner-button" onClick={handlePublish} disabled={managing !== null}>
                        {managing === 'publish' ? <Loader2 size={14} className="cd-spin" /> : <Rocket size={14} />}
                        {managing === 'publish' ? 'Publishing…' : 'Publish campaign'}
                      </button>
                    )}
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
                  Send a short pitch to <strong>{brandName}</strong> explaining why your content is a good fit.
                </p>

                {user?.role === 'creator' && campaign.campaign_type === 'paid' && campaign.funding_status === 'funded' && (
                  <div className="cd-funding-box cd-funding-box--funded cd-creator-funding">
                    <div className="cd-funding-title">Payment secured</div>
                    <div className="cd-funding-amount">Rs. {Number(campaign.funded_amount || campaign.budget || 0).toLocaleString()}</div>
                    <div className="cd-funding-copy">The brand has already secured the campaign budget.</div>
                  </div>
                )}
                <div className="cd-apply-divider" />
                {renderApplicationAction()}
                {!myApplication && !showApplyForm && user?.role === 'creator' && <button className="cd-save-button" onClick={handleToggleSave} disabled={savingBookmark}>{isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{isSaved ? 'Saved to your campaigns' : 'Save for later'}</button>}
                <div className="cd-apply-note"><Check size={13} /> Your pitch is sent directly to the brand.</div>
              </div>

              <div className="cd-side-card cd-snapshot-card">
                <div className="cd-side-heading">Campaign snapshot</div>
                <div className="cd-side-stat"><span className="cd-opportunity-icon cd-money-mark cd-side-stat-icon">Rs</span><div><div className="cd-side-stat-label">Compensation</div><div className="cd-side-stat-value">{cleanCompensation(campaign.compensation_description) || formatMoney(campaign.budget) || 'Discuss with brand'}</div></div></div>
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


        {showApplyForm && campaign?.status === 'published' && !myApplication && (
          <div className="cd-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowApplyForm(false); }}>
            <div className="cd-apply-modal" role="dialog" aria-modal="true" aria-labelledby="cd-apply-modal-title">
              <button type="button" className="cd-modal-close" onClick={() => setShowApplyForm(false)} aria-label="Close application form"><X size={18} /></button>

              {user?.role !== 'creator' ? (
                <>
                  <div className="cd-modal-kicker">Apply to campaign</div>
                  <h2 id="cd-apply-modal-title">Create a creator account to apply.</h2>
                  <p className="cd-modal-copy">You can browse campaigns and view all the details without an account. To send an application, register or log in as a creator.</p>
                  <div className="cd-modal-actions cd-modal-actions--gate">
                    <Link to="/login/creator" className="cd-secondary-button" onClick={() => setShowApplyForm(false)}>Log in</Link>
                    <Link to="/register/creator" className="cd-apply-button" onClick={() => setShowApplyForm(false)}>Register as creator</Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="cd-modal-kicker">Apply to campaign</div>
                  <h2 id="cd-apply-modal-title">Tell {brandName} why you're a good fit.</h2>
                  <p className="cd-modal-copy">Keep it clear and personal. Your profile will be shared with the brand alongside your application.</p>
                  {applyError && <div className="cd-error cd-modal-error">{applyError}</div>}
                  <label className="cd-modal-label">Why are you a good fit? <span>*</span></label>
                  <textarea className="cd-modal-input cd-modal-textarea" value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="Tell the brand about your content style, audience and idea for this campaign…" autoFocus />
                  {campaign.application_questions?.length ? (
                    <div className="cd-modal-questions">
                      {applicationAnswers.map((item, index) => (
                        <div key={`${item.question}-${index}`}>
                          <label className="cd-modal-label">{item.question} <span>*</span></label>
                          <textarea className="cd-modal-input cd-modal-textarea cd-modal-question-input" value={item.answer} onChange={(e) => setApplicationAnswers((prev) => prev.map((answer, i) => i === index ? { ...answer, answer: e.target.value } : answer))} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {campaign.campaign_type === 'paid' && (
                    <div className="cd-fixed-compensation">The fixed compensation is <strong>Rs. {Math.round(Number(campaign.budget || 0) / Math.max(Number(campaign.creators_needed || 1), 1)).toLocaleString()}</strong> per creator. No price negotiation is required.</div>
                  )}
                  <div className="cd-modal-actions">
                    <button type="button" className="cd-secondary-button" onClick={() => { setShowApplyForm(false); setApplyError(''); }} disabled={applying}>Cancel</button>
                    <button type="button" className="cd-apply-button" onClick={handleApplySubmit} disabled={applying}>{applying && <Loader2 size={15} className="cd-spin" />}{applying ? 'Sending…' : 'Send application'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );

  return fromDashboard ? (
    <AppLayout
      title="Campaign details"
      subtitle={campaign?.title || 'Campaign details'}
      showSearch={false}
    >
      {pageContent}
    </AppLayout>
  ) : (
    <>
      <PublicNavbar />
      {pageContent}
    </>
  );
}

export default CampaignDetail;
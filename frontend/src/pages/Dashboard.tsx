import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import {
  getApplications,
  getCampaign,
  getCampaigns,
  getCollabHistory,
  getCollabs,
  getCreators,
  getNotifications,
  getPaymentSummary,
  shortlistCreator,
  unshortlistCreator,
  type Application,
  type Campaign,
  type Collab,
  type CreatorListItem,
  type Notification,
} from '../api/client';

const API_ORIGIN = 'http://localhost:8000';

const BRAND_PURPLE = '#7661A1';
const BRAND_PURPLE_DARK = '#66518F';
const BRAND_PINK_CORAL = '#F47C78';

function mediaUrl(url?: string | null) {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url.replace(/^\/+/, '')}`;
}

function money(value?: number | null) {
  return value == null ? '—' : `Rs. ${Number(value).toLocaleString()}`;
}

function fundingStatus(campaign: Campaign) {
  const status = String((campaign as Campaign & { funding_status?: string }).funding_status || '').toLowerCase();
  return status || 'unfunded';
}

function fundingLabel(campaign: Campaign) {
  const status = fundingStatus(campaign);
  if (status === 'funded') return 'Payment secured';
  if (status === 'pending') return 'Payment pending';
  if (status === 'refunded' || status === 'partially_refunded') return 'Refunded';
  return 'Funding required';
}

function timeAgo(raw?: string | null) {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatStatus(campaign: Campaign, completedIds: Set<number>) {
  if (completedIds.has(campaign.id)) return 'Completed';
  switch (campaign.status) {
    case 'published': return 'Open';
    case 'in_progress': return 'Booked';
    case 'completed': return 'Completed';
    case 'closed': return 'Closed';
    default: return String(campaign.status).replace('_', ' ');
  }
}

function statusTone(campaign: Campaign, completedIds: Set<number>) {
  const status = completedIds.has(campaign.id) ? 'completed' : campaign.status;
  switch (status) {
    case 'published': return 'open';
    case 'in_progress': return 'booked';
    case 'completed': return 'completed';
    default: return 'closed';
  }
}

function imageFor(campaign: Campaign) {
  return mediaUrl(campaign.hero_image || campaign.extra_photos?.[0]);
}

/* ---------- Small inline icons (no external deps) ---------- */
type IconProps = { size?: number };
const IconUsers = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconStar = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>
);
const IconFileCheck = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>
);
const IconHeart = ({ size = 16, filled = false }: IconProps & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const IconLeaf = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 11 13 11 11"/></svg>
);
const IconCalendar = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
);
const IconChevronRight = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

function activityKindFromTitle(title?: string | null): 'created' | 'completed' | 'applications' {
  const text = (title || '').toLowerCase();
  if (text.includes('completed')) return 'completed';
  if (text.includes('application')) return 'applications';
  return 'created';
}

function creatorInitials(name?: string | null) {
  if (!name) return 'C';
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function Dashboard() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [history, setHistory] = useState<Collab[]>([]);
  const [payments, setPayments] = useState({ this_month: 0, lifetime: 0 });
  const [activity, setActivity] = useState<Notification[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<CreatorListItem[]>([]);
  const [businessTab, setBusinessTab] = useState<'all' | 'published' | 'in_progress' | 'completed' | 'draft'>('all');
  const [activityVisibleCount, setActivityVisibleCount] = useState(3);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyCreatorId, setBusyCreatorId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const business = user?.role === 'business';

    (async () => {
      setLoading(true);
      try {
        if (!business) {
          const [apps, active, finished, paymentSummary] = await Promise.all([
            getApplications(), getCollabs(), getCollabHistory(), getPaymentSummary(),
          ]);
          if (cancelled) return;
          setCampaigns([]); setApplications(apps); setCollabs(active); setHistory(finished);
          setPayments({ this_month: paymentSummary.this_month, lifetime: paymentSummary.lifetime });
          setActivity([]); setSuggestedCreators([]);
          return;
        }

        const [campaignData, apps, active, finished, paymentSummary, extra] = await Promise.all([
          getCampaigns({ limit: 50 }), getApplications(), getCollabs(), getCollabHistory(), getPaymentSummary(),
          Promise.all([getNotifications(), getCreators({ limit: 50 })]),
        ]);
        if (cancelled) return;
        const visibleCampaigns = campaignData.campaigns;
        const knownIds = new Set(visibleCampaigns.map((campaign) => campaign.id));
        const historyIds = Array.from(new Set([...active, ...finished].map((collab) => collab.campaign_id))).filter((id) => !knownIds.has(id));
        let recovered: Campaign[] = [];
        if (historyIds.length) {
          const results = await Promise.allSettled(historyIds.slice(0, 20).map((id) => getCampaign(id)));
          recovered = results.filter((r): r is PromiseFulfilledResult<Campaign> => r.status === 'fulfilled').map((r) => r.value);
        }
        if (cancelled) return;
        setCampaigns([...visibleCampaigns, ...recovered].filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i));
        setApplications(apps); setCollabs(active); setHistory(finished);
        setPayments({ this_month: paymentSummary.this_month, lifetime: paymentSummary.lifetime });
        const [notes, creatorData] = extra as [Notification[], { creators: CreatorListItem[] }];
        setActivity(notes); setSuggestedCreators(creatorData.creators);
      } catch (err) {
        console.error('Could not load dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.role]);

  // Keep campaign funding information in sync after a payment is completed.
  // This refreshes when the dashboard becomes active and periodically while it
  // is open, so "Funding required" changes to "Payment secured" without
  // needing a full page reload.
  useEffect(() => {
    if (!isBusiness) return;

    let cancelled = false;

    const refreshCampaignFunding = async () => {
      try {
        const campaignData = await getCampaigns({ limit: 50 });
        if (cancelled) return;

        setCampaigns((previous) => {
          const latestById = new Map(campaignData.campaigns.map((campaign) => [campaign.id, campaign]));
          return previous.map((campaign) => latestById.get(campaign.id) || campaign);
        });
      } catch (err) {
        console.error('Could not refresh campaign funding:', err);
      }
    };

    const handleFocus = () => {
      void refreshCampaignFunding();
    };

    window.addEventListener('focus', handleFocus);
    const intervalId = window.setInterval(refreshCampaignFunding, 10000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [isBusiness]);

  const completedCampaignIds = useMemo(
    () => new Set(history.filter((collab) => collab.status === 'completed').map((collab) => collab.campaign_id)),
    [history]
  );

  // Business-only figures
  const pendingCount = applications.filter((application) => application.status === 'pending').length;
  const completedCampaigns = campaigns.filter((campaign) => campaign.status === 'completed').length +
    history.filter((collab) => collab.status === 'completed' && !campaigns.some((campaign) => campaign.id === collab.campaign_id)).length;
  const activeCreators = new Set(collabs.map((collab) => collab.creator_id)).size;
  const totalApplications = applications.length;

  // Categories this brand actually runs campaigns in — used to prioritize the
  // "Suggested Creators" list (e.g. a food brand sees food creators first).
  const brandCampaignCategories = useMemo(
    () => new Set(campaigns.map((campaign) => campaign.category).filter(Boolean).map((value) => String(value).toLowerCase())),
    [campaigns]
  );

  const suggestedCreatorsRanked = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? suggestedCreators.filter((creator) =>
          [creator.display_name, creator.username, ...(creator.categories || [])]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        )
      : suggestedCreators;
    return [...filtered].sort((a, b) => {
      const aMatch = (a.categories || []).some((value) => brandCampaignCategories.has(String(value).toLowerCase()));
      const bMatch = (b.categories || []).some((value) => brandCampaignCategories.has(String(value).toLowerCase()));
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      return (b.avg_rating || 0) - (a.avg_rating || 0);
    });
  }, [suggestedCreators, brandCampaignCategories, search]);

  const toggleCreatorShortlist = async (creator: CreatorListItem) => {
    setBusyCreatorId(creator.id);
    try {
      if (creator.is_shortlisted) await unshortlistCreator(creator.id);
      else await shortlistCreator(creator.id);
      setSuggestedCreators((prev) =>
        prev.map((c) => (c.id === creator.id ? { ...c, is_shortlisted: !c.is_shortlisted } : c))
      );
    } catch (err) {
      console.error('Could not update shortlist:', err);
    } finally {
      setBusyCreatorId(null);
    }
  };

  const derivedActivity = useMemo(() => {
    type Item = { id: string; title: string; time: string; campaignId: number; kind: 'created' | 'completed' | 'applications' };
    const items: Item[] = [];

    campaigns.forEach((campaign) => {
      if (campaign.created_at) {
        items.push({ id: `created-${campaign.id}`, title: `Campaign "${campaign.title}" was created`, time: campaign.created_at, campaignId: campaign.id, kind: 'created' });
      }
      if ((campaign.status === 'completed' || completedCampaignIds.has(campaign.id)) && (campaign.updated_at || campaign.created_at)) {
        items.push({ id: `completed-${campaign.id}`, title: `Campaign "${campaign.title}" was completed`, time: campaign.updated_at || campaign.created_at!, campaignId: campaign.id, kind: 'completed' });
      }
      if (campaign.application_count > 0 && (campaign.updated_at || campaign.created_at)) {
        items.push({
          id: `apps-${campaign.id}`,
          title: `${campaign.application_count} application${campaign.application_count === 1 ? '' : 's'} received for "${campaign.title}"`,
          time: campaign.updated_at || campaign.created_at!,
          campaignId: campaign.id,
          kind: 'applications',
        });
      }
    });

    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [campaigns, completedCampaignIds]);

  const activitySource = activity.length > 0 ? activity : derivedActivity;

  const businessTabCounts = useMemo(() => ({
    all: campaigns.length,
    published: campaigns.filter((c) => c.status === 'published').length,
    in_progress: campaigns.filter((c) => c.status === 'in_progress').length,
    completed: campaigns.filter((c) => c.status === 'completed' || completedCampaignIds.has(c.id)).length,
    draft: campaigns.filter((c) => c.status === 'draft').length,
  }), [campaigns, completedCampaignIds]);

  const businessCampaignList = useMemo(() => {
    if (businessTab === 'all') return campaigns;
    if (businessTab === 'completed') return campaigns.filter((c) => c.status === 'completed' || completedCampaignIds.has(c.id));
    return campaigns.filter((c) => c.status === businessTab);
  }, [campaigns, businessTab, completedCampaignIds]);

  const fundingStats = useMemo(() => {
    const paidCampaigns = campaigns.filter((campaign) => campaign.campaign_type === 'paid');
    const fundedCampaigns = paidCampaigns.filter((campaign) => fundingStatus(campaign) === 'funded');
    const fundingRequired = paidCampaigns.filter((campaign) => fundingStatus(campaign) !== 'funded');
    const fundedAmount = fundedCampaigns.reduce((total, campaign) => {
      const value = Number((campaign as Campaign & { funded_amount?: number | null }).funded_amount);
      return total + (Number.isFinite(value) && value > 0 ? value : Number(campaign.budget) || 0);
    }, 0);
    const pendingAmount = fundingRequired.reduce((total, campaign) => total + (Number(campaign.budget) || 0), 0);
    return { fundedCampaigns: fundedCampaigns.length, fundingRequired: fundingRequired.length, fundedAmount, pendingAmount };
  }, [campaigns]);

  const greetingTime = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <AppLayout
      title={undefined}
      subtitle={undefined}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={isBusiness ? 'Search creators by name or niche…' : 'Search campaigns…'}
      actionLabel={isBusiness ? 'Create Campaign' : 'Browse Campaigns'}
      actionTo={isBusiness ? '/campaigns/new' : '/#campaigns'}
    >
      <style>{`
        .dash{max-width:1180px;margin:0 auto;padding:28px 28px 76px;color:#1A1625}

        .hero{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(240px,.9fr);gap:18px;align-items:stretch;margin-bottom:24px}
        .hero-main{position:relative;overflow:hidden;background:linear-gradient(120deg, #F4F1FE 0%, #F7EEFE 45%, #FDF1F6 100%);border:1px solid #EEE9FB;border-radius:18px;padding:28px 30px;display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,380px);align-items:center;gap:14px}
        .hero-copy-col{position:relative;z-index:1}
        .hero-kicker{font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:#8B8697}
        .hero-title{margin:6px 0 0;font-size:27px;line-height:1.15;letter-spacing:-.6px;font-weight:750;color:#1A1625}
        .hero-title-accent{color:var(--accent)}
        .hero-copy{margin:9px 0 0;color:#6B6478;font-size:12.5px;line-height:1.65;max-width:480px}
        .hero-cta{display:inline-flex;align-items:center;gap:7px;margin-top:16px;width:fit-content;padding:11px 18px;border-radius:10px;background:var(--accent);color:#fff;text-decoration:none;font-size:12.5px;font-weight:650}
        .hero-illustration-wrap{position:relative;z-index:1;display:flex;align-items:center;justify-content:center}
        .hero-illustration-wrap img{width:100%;max-width:380px;height:auto;object-fit:contain}

        .hero-stats{background:#fff;border:1px solid #EAE7F2;border-radius:18px;padding:22px;display:flex;flex-direction:column}
        .hero-stats-title{display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:700;color:#6B6478;text-transform:uppercase;letter-spacing:.07em}
        .hero-stats-title a{text-transform:none;font-weight:700;font-size:11px;letter-spacing:0;color:var(--accent);text-decoration:none}
        .hero-stats-rows{flex:1;display:flex;flex-direction:column;justify-content:space-evenly}
        .hero-stat-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid #EAE7F2}
        .hero-stat-row:last-child{border-bottom:0;padding-bottom:0}
        .hero-stat-row .label-group{display:flex;align-items:center;gap:9px}
        .hero-stat-row span{font-size:11.5px;color:#6B6478;font-weight:600}
        .hero-stat-row strong{font-size:19px;font-weight:700;color:#1A1625}
        .hero-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
        .overview-card{border:0;border-radius:14px;padding:14px;background:var(--accent-tint)}
        .overview-card small{display:block;color:#A39DB8;font-size:10px;font-weight:650}
        .overview-card strong{display:block;margin-top:6px;font-size:19px;font-weight:700;color:#1A1625}

        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
        .stat{border:0;border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:13px}
        .stat:nth-child(1){background:#E6F9EF}
        .stat:nth-child(2){background:#EFEBFE}
        .stat:nth-child(3){background:#FFF2DF}
        .stat-body small{display:block;color:#A39DB8;font-size:10px;font-weight:650}.stat-body strong{display:block;margin-top:4px;color:#1A1625;font-size:20px;font-weight:700;letter-spacing:-.2px}

        .section-head{margin:28px 0 14px}.section-head h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.2px;color:#1A1625}.section-head p{margin:4px 0 0;color:#A39DB8;font-size:11.5px;line-height:1.5}

        .placeholder{height:100%;display:grid;place-items:center;color:#A39DB8;font-size:11px;font-weight:650;text-align:center;padding:6px;line-height:1.3}
        .tag{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.96);font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
        .tag.open{color:#16834a}.tag.booked{color:var(--accent)}.tag.completed{color:#6B6478}.tag.closed{color:#7b7582}
        .cat-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:var(--accent-tint);color:var(--accent);font-size:10px;font-weight:650}

        .campaign-list{margin-top:14px;display:flex;flex-direction:column;gap:12px}
        .campaign-row{display:flex;align-items:center;gap:14px;padding:12px;border:1px solid #EAE7F2;border-radius:14px;text-decoration:none;color:inherit;transition:box-shadow .15s ease,transform .15s ease}
        .campaign-row:hover{box-shadow:0 8px 20px rgba(20,20,30,.06);transform:translateY(-1px)}
        .campaign-row-media{position:relative;flex:0 0 auto;width:92px;height:92px;border-radius:12px;overflow:hidden;background:#F5F4FA}
        .campaign-row-media img{width:100%;height:100%;object-fit:cover;display:block}
        .campaign-row-media .tag{left:6px;top:6px;padding:4px 8px;font-size:9px}
        .campaign-row-body{flex:1;min-width:0}
        .campaign-row-title{font-size:14px;font-weight:700;color:#1A1625;margin-top:7px;line-height:1.3}
        .campaign-funding{display:flex;align-items:center;gap:7px;margin-top:9px;flex-wrap:wrap}
        .funding-badge{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid transparent}
        .funding-badge--funded{background:#F0EBF6;color:#66518F;border-color:#E2D9EF}
        .funding-badge--needed{background:#FDEBE9;color:#C95F5B;border-color:#F7D0CD}
        .funding-badge--pending{background:#F8F2E7;color:#8A6A31;border-color:#EEE0C5}
        .funding-amount{font-size:10.5px;color:#7C7588;font-weight:600}
        .funding-panel{margin-top:14px;border:1px solid #EAE7F2;border-radius:14px;padding:14px;background:#FBFAFD}
        .funding-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .funding-panel-title{font-size:12px;font-weight:750;color:#1A1625}
        .funding-panel-copy{margin-top:3px;font-size:10.5px;color:#8B8596;line-height:1.45}
        .funding-total{font-size:18px;font-weight:800;color:#1A1625;white-space:nowrap}
        .funding-breakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
        .funding-mini{padding:10px 11px;background:#fff;border:1px solid #EEEAF3;border-radius:10px}
        .funding-mini small{display:block;font-size:9.5px;color:#8B8596;margin-bottom:4px}
        .funding-mini strong{font-size:13px;color:#1A1625}
        .funding-link{display:inline-flex;margin-top:11px;color:#7661A1;font-size:10.5px;font-weight:700;text-decoration:none}
        .campaign-row-price{font-size:14px;font-weight:700;color:#1A1625;margin-top:5px}
        .campaign-row-meta{display:flex;flex-wrap:wrap;gap:14px;margin-top:7px;font-size:11px;color:#6B6478;font-weight:600}
        .campaign-row-meta span{display:inline-flex;align-items:center;gap:5px}
        .campaign-row-created{display:flex;align-items:center;gap:5px;margin-top:7px;font-size:10px;color:#A39DB8}
        .campaign-row-action{flex:0 0 auto;display:flex;align-items:center;gap:6px;color:#C9C4D9}
        .btn-view-sm{padding:9px 16px;border-radius:10px;background:var(--accent-tint);color:var(--accent);font-size:11.5px;font-weight:650;white-space:nowrap}

        .activity--scroll{max-height:305px;overflow-y:auto;padding-right:4px}
        .activity--scroll::-webkit-scrollbar{width:5px}
        .activity--scroll::-webkit-scrollbar-thumb{background:#E2DEEF;border-radius:99px}

        .brand-side-col{display:flex;flex-direction:column;gap:16px}
        .panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .panel-head-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#1A1625}
        .panel-head-title .icon-badge{width:26px;height:26px;border-radius:8px;background:var(--accent-tint);color:var(--accent);display:flex;align-items:center;justify-content:center}

        .brand-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.75fr);gap:16px;align-items:start}.panel{background:#fff;border:1px solid #EAE7F2;border-radius:18px;padding:21px}
        .panel--compact{padding:18px}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        .tab-btn{height:32px;padding:0 14px;border-radius:999px;border:1px solid #EAE7F2;background:#fff;color:#6B6478;font:600 11px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}
        .tab-btn.active{background:var(--accent);border-color:var(--accent);color:#fff}
        .list{margin-top:10px}.item{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid #EAE7F2}.item:last-child{border-bottom:0}.item-title{font-size:12.5px;font-weight:650;color:#1A1625}.item-meta{font-size:10.5px;color:#A39DB8;margin-top:3px}.meter{height:5px;background:#F5F4FA;border-radius:99px;overflow:hidden;margin-top:7px}.meter span{display:block;height:100%;background:var(--accent)}.mini-link{color:var(--accent);font-size:10.5px;font-weight:700;text-decoration:none}
        .mini-btn{color:#7661A1;font-size:10.5px;font-weight:700;text-decoration:none;background:none;border:0;cursor:pointer;padding:0;font-family:inherit}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.summary-card{padding:14px;border:0;border-radius:14px;background:var(--accent-tint)}.summary-label{font-size:10px;color:#A39DB8}.summary-value{font-size:18px;font-weight:700;margin-top:3px;color:#1A1625}.summary-note{font-size:9.5px;color:#A39DB8;margin-top:3px}

        .activity{display:grid;gap:0}.activity-item{display:flex;gap:11px;padding:14px 0;border-bottom:1px solid #EAE7F2;color:inherit;text-decoration:none}.activity-item:last-child{border-bottom:0}
        .activity-item--clickable{cursor:pointer;margin:0 -10px;padding-left:10px;padding-right:10px;border-radius:10px;transition:background .15s ease}
        .activity-item--clickable:hover{background:var(--accent-tint)}
        .activity-dot{width:7px;height:7px;border-radius:50%;background:#EAE7F2;margin-top:5px;flex:0 0 auto}
        .activity-dot.unread{box-shadow:0 0 0 3px rgba(30,42,120,0.14)}
        .activity-dot--completed{background:#1DB876}
        .activity-dot--applications{background:#FFB020}
        .activity-dot--created{background:#C9C4D9}
        .activity-title{font-size:12px;font-weight:650;color:#1A1625;line-height:1.4}.activity-time{font-size:10px;color:#A39DB8;margin-top:3px}

        .creator-suggest-list{margin-top:12px;display:flex;flex-direction:column;gap:9px}
        .creator-suggest-item{display:flex;align-items:center;gap:10px;padding:9px;border:1px solid #EAE7F2;border-radius:12px;text-decoration:none;color:inherit;transition:box-shadow .15s ease,transform .15s ease}
        .creator-suggest-item:hover{box-shadow:0 6px 16px rgba(20,20,30,.06);transform:translateY(-1px)}
        .creator-suggest-avatar{width:36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;flex:0 0 auto;object-fit:cover}
        .creator-suggest-body{flex:1;min-width:0}
        .creator-suggest-name{font-size:12px;font-weight:700;color:#1A1625;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .creator-suggest-username{font-size:10.5px;color:#A39DB8;font-weight:600;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .creator-suggest-meta{display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap}
        .creator-suggest-rating{display:inline-flex;align-items:center;gap:3px;font-size:10px;color:#6B6478;font-weight:650}
        .creator-suggest-rating svg{color:#FFB020}
        .creator-suggest-tag{font-size:9px;font-weight:650;padding:3px 8px;border-radius:999px;background:#F5F4FA;color:#6B6478}
        .creator-suggest-tag--match{background:var(--accent-tint);color:var(--accent)}
        .creator-suggest-heart{border:0;background:transparent;cursor:pointer;color:#C9C4D9;padding:4px;flex:0 0 auto}
        .creator-suggest-heart--active{color:var(--accent)}
        .creator-suggest-heart:disabled{opacity:.5;cursor:not-allowed}

        .collab-people-list{display:flex;flex-direction:column;gap:10px;margin-top:12px}
        .collab-person-card{display:flex;align-items:center;gap:14px;padding:14px 16px;background:#fff;border:1px solid #EAE7F2;border-radius:16px;text-decoration:none;color:inherit;transition:box-shadow .15s ease,transform .15s ease}
        .collab-person-card:hover{box-shadow:0 8px 22px rgba(20,20,30,.06);transform:translateY(-1px)}
        .collab-person-avatar{width:46px;height:46px;border-radius:50%;background:var(--accent-tint);color:var(--accent);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:13px;font-weight:750;flex:0 0 auto}
        .collab-person-avatar img{width:100%;height:100%;object-fit:cover}
        .collab-person-body{flex:1;min-width:0}.collab-person-name{font-size:13px;font-weight:750;color:#1A1625}.collab-person-campaign{font-size:11px;color:#6B6478;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.collab-person-meta{font-size:10px;color:#A39DB8;margin-top:4px}.collab-person-status{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;color:var(--accent);white-space:nowrap}

        .empty{padding:50px;text-align:center;color:#A39DB8;font-size:12px;border:1px dashed #EAE7F2;border-radius:16px;background:#fff}

        @media(max-width:900px){.brand-layout{grid-template-columns:1fr}.hero{grid-template-columns:1fr}.hero-main{grid-template-columns:1fr}.hero-illustration-wrap img{max-width:220px;margin:0 auto}}
        @media(max-width:620px){.dash{padding:20px 15px 50px}.stats,.summary,.hero-stat-grid{grid-template-columns:1fr}.campaign-row{flex-wrap:wrap}.campaign-row-action{width:100%;justify-content:flex-end;margin-top:8px}}
      `}</style>

      <div
        className="dash"
        style={{
          ['--accent' as string]: isBusiness ? BRAND_PURPLE : BRAND_PINK_CORAL,
          ['--accent-dark' as string]: isBusiness ? BRAND_PURPLE_DARK : '#E86966',
          ['--accent2' as string]: isBusiness ? BRAND_PINK_CORAL : BRAND_PURPLE,
          ['--accent-tint' as string]: isBusiness ? '#F0EBF6' : '#FDEBE9',
        }}
      >
        {!isBusiness ? (
          <>
            <div className="hero">
              <div className="hero-main">
                <div className="hero-copy-col">
                  <div className="hero-kicker">Good {greetingTime}, {firstName}</div>
                  <h1 className="hero-title">Your <span className="hero-title-accent">collaborations.</span></h1>
                  <p className="hero-copy">This is your work space for the brands you are already working with and the collaborations you have completed. Discover new campaigns from the creatorhub landing page.</p>
                  <Link className="app-action" to="/#campaigns" style={{ width: 'fit-content', marginTop: 16 }}>Browse Campaigns <IconChevronRight size={14} /></Link>
                </div>
                <div className="hero-illustration-wrap"><img src="/assets/hero-illustration.png" alt="Creator working on a laptop" /></div>
              </div>
              <aside className="hero-stats">
                <div className="hero-stats-title">Your overview</div>
                <div className="hero-stats-rows">
                  <div className="hero-stat-row"><span>Active collaborations</span><strong>{collabs.length}</strong></div>
                  <div className="hero-stat-row"><span>Completed collaborations</span><strong>{history.filter((item) => item.status === 'completed').length}</strong></div>
                  <div className="hero-stat-row"><span>Earnings this month</span><strong>{money(payments.this_month)}</strong></div>
                </div>
              </aside>
            </div>

            <div className="stats">
              <div className="stat"><div className="stat-body"><small>Active collaborations</small><strong>{collabs.length}</strong></div></div>
              <div className="stat"><div className="stat-body"><small>Applications sent</small><strong>{applications.length}</strong></div></div>
              <div className="stat"><div className="stat-body"><small>Lifetime earnings</small><strong>{money(payments.lifetime)}</strong></div></div>
            </div>

            <div className="section-head">
              <div><h2>People you've worked with</h2><p>Active and completed collaborations are kept here.</p></div>
              <Link className="mini-link" to="/workspace/history">View history</Link>
            </div>

            {loading ? <div className="empty">Loading collaborations…</div> : (collabs.length + history.length) === 0 ? (
              <div className="empty"><strong style={{ display: 'block', color: '#1A1625', fontSize: 14, marginBottom: 6 }}>No collaborations yet</strong><span>When you start working with a brand, it will appear here.</span></div>
            ) : (
              <div className="collab-people-list">
                {[...collabs, ...history].filter((collab, index, all) => all.findIndex((item) => item.id === collab.id) === index).map((collab) => {
                  const isCompleted = collab.status === 'completed' || history.some((item) => item.id === collab.id);
                  const brandName = collab.business_name || 'Brand';
                  const logo = mediaUrl(collab.business_logo);
                  return <Link key={collab.id} to={isCompleted ? '/workspace/history' : `/workspace/active?collab=${collab.id}`} className="collab-person-card">
                    <div className="collab-person-avatar">{logo ? <img src={logo} alt="" /> : creatorInitials(brandName)}</div>
                    <div className="collab-person-body"><div className="collab-person-name">{brandName}</div><div className="collab-person-campaign">{collab.campaign_title || 'Collaboration'}</div><div className="collab-person-meta">{isCompleted ? 'Completed collaboration' : 'Active collaboration'}</div></div>
                    <span className="collab-person-status">{isCompleted ? 'History' : 'Open workspace'} <IconChevronRight size={14} /></span>
                  </Link>;
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="hero">
              <div className="hero-main">
                <div className="hero-copy-col">
                  <div className="hero-kicker">Good {greetingTime}, {firstName}</div>
                  <h1 className="hero-title">Let's create something <span className="hero-title-accent">amazing today.</span></h1>
                  <p className="hero-copy">Discover talented creators, launch campaigns and grow your brand with authentic collaborations.</p>
                </div>
                <div className="hero-illustration-wrap">
                  <img src="/assets/hero-illustration.png" alt="Brand manager working on a laptop" />
                </div>
              </div>

              <aside className="panel hero-activity-aside">
                <div className="panel-head">
                  <div className="panel-head-title">Recent activity</div>
                  {activitySource.length > activityVisibleCount && (
                    <button type="button" className="mini-btn" onClick={() => setActivityVisibleCount((count) => count + 5)}>See more →</button>
                  )}
                </div>
                <div className="activity activity--scroll">
                  {activitySource.length > 0 ? (
                    activity.length > 0 ? (
                      activity.slice(0, activityVisibleCount).map((note) => {
                        const noteCampaignId = (note as unknown as { campaign_id?: number }).campaign_id;
                        const noteKind = activityKindFromTitle(note.title);
                        const content = (
                          <>
                            <span className={`activity-dot activity-dot--${noteKind} ${note.is_read ? '' : 'unread'}`} />
                            <div>
                              <div className="activity-title">{note.title}{note.message ? ` — ${note.message}` : ''}</div>
                              <div className="activity-time">{timeAgo(note.created_at)}</div>
                            </div>
                          </>
                        );
                        return noteCampaignId ? (
                          <Link className="activity-item activity-item--clickable" key={note.id} to={`/campaigns/${noteCampaignId}?source=dashboard`} state={{ source: 'dashboard' }}>
                            {content}
                          </Link>
                        ) : (
                          <div className="activity-item" key={note.id}>{content}</div>
                        );
                      })
                    ) : (
                      derivedActivity.slice(0, activityVisibleCount).map((item) => (
                        <Link className="activity-item activity-item--clickable" key={item.id} to={`/campaigns/${item.campaignId}?source=dashboard`} state={{ source: 'dashboard' }}>
                          <span className={`activity-dot activity-dot--${item.kind}`} />
                          <div>
                            <div className="activity-title">{item.title}</div>
                            <div className="activity-time">{timeAgo(item.time)}</div>
                          </div>
                        </Link>
                      ))
                    )
                  ) : (
                    !loading && <div className="empty">No activity yet.</div>
                  )}
                </div>
                {activityVisibleCount > 3 && activitySource.length > 3 && (
                  <button
                    type="button"
                    className="mini-btn"
                    style={{ marginTop: 10 }}
                    onClick={() => setActivityVisibleCount(3)}
                  >
                    Show less
                  </button>
                )}
                {pendingCount > 0 && (
                  <Link className="mini-link" to="/applications" style={{ display: 'block', marginTop: 12 }}>
                    {pendingCount} application{pendingCount === 1 ? '' : 's'} waiting for review →
                  </Link>
                )}
              </aside>
            </div>

            <div className="brand-layout">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Your Campaigns</h2>
                    <p style={{ margin: '4px 0 0', color: '#A39DB8', fontSize: 11.5 }}>Manage your active and past campaigns, track progress, and view performance.</p>
                  </div>
                  <Link className="mini-link" to="/campaigns" style={{ flex: '0 0 auto' }}>View all →</Link>
                </div>
                <div className="tabs">
                  <button type="button" className={`tab-btn ${businessTab === 'all' ? 'active' : ''}`} onClick={() => setBusinessTab('all')}>All ({businessTabCounts.all})</button>
                  <button type="button" className={`tab-btn ${businessTab === 'published' ? 'active' : ''}`} onClick={() => setBusinessTab('published')}>Active ({businessTabCounts.published})</button>
                  <button type="button" className={`tab-btn ${businessTab === 'in_progress' ? 'active' : ''}`} onClick={() => setBusinessTab('in_progress')}>Booked ({businessTabCounts.in_progress})</button>
                  <button type="button" className={`tab-btn ${businessTab === 'completed' ? 'active' : ''}`} onClick={() => setBusinessTab('completed')}>Completed ({businessTabCounts.completed})</button>
                  <button type="button" className={`tab-btn ${businessTab === 'draft' ? 'active' : ''}`} onClick={() => setBusinessTab('draft')}>Draft ({businessTabCounts.draft})</button>
                </div>
                <div className="campaign-list">
                  {businessCampaignList.slice(0, 8).map((campaign) => {
                    const img = imageFor(campaign);
                    const createdLabel = campaign.created_at ? timeAgo(campaign.created_at) : '';
                    return (
                      <Link className="campaign-row" key={campaign.id} to={`/campaigns/${campaign.id}?source=dashboard`} state={{ source: 'dashboard' }}>
                        <div className="campaign-row-media">
                          {img ? <img src={img} alt="" /> : <div className="placeholder">{campaign.brand_name || 'No image'}</div>}
                          <span className={`tag ${statusTone(campaign, completedCampaignIds)}`}>{formatStatus(campaign, completedCampaignIds)}</span>
                        </div>
                        <div className="campaign-row-body">
                          <div className="cat-pill"><IconLeaf size={11} /> {campaign.category}</div>
                          <div className="campaign-row-title">{campaign.title}</div>
                          <div className="campaign-row-price">{money(campaign.budget)}</div>
                          <div className="campaign-funding">
                            <span className={`funding-badge funding-badge--${fundingStatus(campaign) === 'funded' ? 'funded' : fundingStatus(campaign) === 'pending' ? 'pending' : 'needed'}`}>
                              {fundingLabel(campaign)}
                            </span>
                            {fundingStatus(campaign) === 'funded' && (
                              <span className="funding-amount">{money(Number((campaign as Campaign & { funded_amount?: number }).funded_amount) || Number(campaign.budget) || 0)} secured</span>
                            )}
                          </div>
                          <div className="campaign-row-meta">
                            <span><IconUsers size={12} /> {campaign.creators_needed || 1} creator{(campaign.creators_needed || 1) === 1 ? '' : 's'}</span>
                            <span><IconFileCheck size={12} /> {campaign.application_count} application{campaign.application_count === 1 ? '' : 's'}</span>
                          </div>
                          {createdLabel && <div className="campaign-row-created"><IconCalendar size={11} /> Created {createdLabel}</div>}
                        </div>
                        <span className="campaign-row-action">
                          <span className="btn-view-sm">View Details</span>
                          <IconChevronRight size={16} />
                        </span>
                      </Link>
                    );
                  })}
                  {businessCampaignList.length === 0 && !loading && <div className="empty">No campaigns in this view yet.</div>}
                </div>
                <div className="summary">
                  <div className="summary-card"><div className="summary-label">Applications received</div><div className="summary-value">{totalApplications}</div><div className="summary-note">Across your campaigns</div></div>
                  <div className="summary-card"><div className="summary-label">Active creators</div><div className="summary-value">{activeCreators}</div><div className="summary-note">Currently collaborating</div></div>
                  <div className="summary-card"><div className="summary-label">Completed campaigns</div><div className="summary-value">{completedCampaigns}</div><div className="summary-note">Finished work stays visible</div></div>
                </div>
              </section>

              <div className="brand-side-col">
                <section className="panel panel--compact">
                  <div className="panel-head">
                    <div className="panel-head-title">Campaign overview</div>
                    <Link className="mini-link" to="/campaigns">View All →</Link>
                  </div>
                  <div className="hero-stat-grid" style={{ marginTop: 14 }}>
                    <div className="overview-card">
                      <small>Total campaigns</small>
                      <strong>{campaigns.length}</strong>
                    </div>
                    <div className="overview-card">
                      <small>Active creators</small>
                      <strong>{activeCreators}</strong>
                    </div>
                    <div className="overview-card">
                      <small>Applications received</small>
                      <strong>{totalApplications}</strong>
                    </div>
                    <div className="overview-card">
                      <small>Completed</small>
                      <strong>{completedCampaigns}</strong>
                    </div>
                  </div>
                  <div className="funding-panel">
                    <div className="funding-panel-head">
                      <div>
                        <div className="funding-panel-title">Campaign payments</div>
                        <div className="funding-panel-copy">Paid campaign budgets secured before creators begin.</div>
                      </div>
                      <div className="funding-total">{money(fundingStats.fundedAmount)}</div>
                    </div>
                    <div className="funding-breakdown">
                      <div className="funding-mini"><small>Funded campaigns</small><strong>{fundingStats.fundedCampaigns}</strong></div>
                      <div className="funding-mini"><small>Needs funding</small><strong>{fundingStats.fundingRequired}</strong></div>
                    </div>
                    {fundingStats.fundingRequired > 0 && (
                      <div className="funding-panel-copy" style={{ marginTop: 10 }}>
                        {money(fundingStats.pendingAmount)} is still awaiting funding. Open a campaign to fund it.
                      </div>
                    )}
                    <Link className="funding-link" to="/campaigns">Manage campaign payments →</Link>
                  </div>
                </section>

                <section className="panel panel--compact">
                  <div className="panel-head">
                    <div className="panel-head-title">{search.trim() ? 'Creators matching your search' : 'Suggested Creators'}</div>
                    <Link
                      className="mini-link"
                      to={search.trim() ? `/creators?search=${encodeURIComponent(search.trim())}` : '/creators'}
                    >
                      See more →
                    </Link>
                  </div>
                  <div className="creator-suggest-list">
                    {suggestedCreatorsRanked.slice(0, 4).map((creator) => {
                      const avatar = mediaUrl(creator.profile_image);
                      const topCategory = creator.categories?.[0];
                      const isMatch = (creator.categories || []).some((value) =>
                        brandCampaignCategories.has(String(value).toLowerCase())
                      );
                      return (
                        <Link className="creator-suggest-item" key={creator.id} to={`/creators/${creator.id}`}>
                          {avatar ? (
                            <img className="creator-suggest-avatar" src={avatar} alt="" />
                          ) : (
                            <div className="creator-suggest-avatar">{creatorInitials(creator.display_name)}</div>
                          )}
                          <div className="creator-suggest-body">
                            <div className="creator-suggest-name">{creator.display_name || 'Creator'}</div>
                            {creator.username && <div className="creator-suggest-username">@{creator.username}</div>}
                            <div className="creator-suggest-meta">
                              {creator.avg_rating != null && (
                                <span className="creator-suggest-rating"><IconStar size={11} /> {creator.avg_rating.toFixed(1)}</span>
                              )}
                              {topCategory && (
                                <span className={`creator-suggest-tag ${isMatch ? 'creator-suggest-tag--match' : ''}`}>{topCategory}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`creator-suggest-heart ${creator.is_shortlisted ? 'creator-suggest-heart--active' : ''}`}
                            disabled={busyCreatorId === creator.id}
                            onClick={(event) => { event.preventDefault(); toggleCreatorShortlist(creator); }}
                            aria-label={creator.is_shortlisted ? 'Remove from shortlist' : 'Shortlist creator'}
                          >
                            <IconHeart size={14} filled={creator.is_shortlisted} />
                          </button>
                        </Link>
                      );
                    })}
                    {suggestedCreatorsRanked.length === 0 && !loading && (
                      <div className="empty" style={{ padding: 24 }}>
                        {search.trim() ? 'No creators match your search.' : 'No creators to suggest yet.'}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Dashboard;
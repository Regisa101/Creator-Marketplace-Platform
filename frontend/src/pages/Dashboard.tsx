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
  getInvites,
  getNotifications,
  getPaymentSummary,
  getSavedCampaigns,
  saveCampaign,
  shortlistCreator,
  unsaveCampaign,
  unshortlistCreator,
  type Application,
  type Campaign,
  type Collab,
  type CreatorInvite,
  type CreatorListItem,
  type Notification,
  type SavedCampaignEntry,
} from '../api/client';

const API_ORIGIN = 'http://localhost:8000';

type FeedFilter = 'all' | 'open' | 'booked' | 'completed' | 'closed' | 'this_month' | 'past';
type PriceRange = 'all' | '0-10000' | '10000-50000' | '50000-100000' | '100000+';
type AppliedFilter = 'all' | 'applied' | 'not_applied' | 'new';

const MASTER_CATEGORIES = [
  'Beauty',
  'Fashion',
  'Food',
  'Tech',
  'Fitness',
  'Travel',
  'Lifestyle',
  'Gaming',
  'Home',
  'Parenting',
  'Finance',
  'Education',
  'Automotive',
  'Health',
];

const PRICE_RANGES: { value: PriceRange; label: string }[] = [
  { value: 'all', label: 'Price Range' },
  { value: '0-10000', label: 'Under Rs. 10,000' },
  { value: '10000-50000', label: 'Rs. 10,000 – 50,000' },
  { value: '50000-100000', label: 'Rs. 50,000 – 100,000' },
  { value: '100000+', label: 'Above Rs. 100,000' },
];

const APPLIED_FILTERS: { value: AppliedFilter; label: string }[] = [
  { value: 'all', label: 'All Campaigns' },
  { value: 'applied', label: 'Applied' },
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'new', label: 'New (This Week)' },
];

const CAMPAIGNS_PER_PAGE = 10;
const ACTIVITY_VISIBLE_ROWS = 5;

function mediaUrl(url?: string | null) {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/api/')) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url.replace(/^\/+/, '')}`;
}

function money(value?: number | null) {
  return value == null ? '—' : `Rs. ${Number(value).toLocaleString()}`;
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

function isThisMonth(campaign: Campaign) {
  const raw = campaign.created_at || campaign.updated_at;
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isOpen(campaign: Campaign, completedIds: Set<number>) {
  return !completedIds.has(campaign.id) && campaign.status === 'published';
}

function isBooked(campaign: Campaign, completedIds: Set<number>) {
  return !completedIds.has(campaign.id) && campaign.status === 'in_progress';
}

function isCompleted(campaign: Campaign, completedIds: Set<number>) {
  return campaign.status === 'completed' || completedIds.has(campaign.id);
}

function isPast(campaign: Campaign, completedIds: Set<number>) {
  return isCompleted(campaign, completedIds) || campaign.status === 'closed';
}

function isNewThisWeek(campaign: Campaign) {
  const raw = campaign.created_at;
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  const days = (Date.now() - date.getTime()) / 86400000;
  return days <= 7;
}

function matchesPriceRange(campaign: Campaign, range: PriceRange) {
  if (range === 'all') return true;
  const budget = Number(campaign.budget) || 0;
  if (range === '100000+') return budget >= 100000;
  const [min, max] = range.split('-').map(Number);
  return budget >= min && budget < max;
}

/* ---------- Small inline icons (no external deps) ---------- */
type IconProps = { size?: number };
const IconEye = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const IconSend = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
);
const IconUsers = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconMegaphone = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
);
const IconStar = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>
);
const IconBell = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);
const IconGrid = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
);
const IconTag = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83L12 2Z"/><circle cx="7" cy="7" r="1.5"/></svg>
);
const IconFileCheck = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>
);
const IconCheckCircle = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
);
const IconHeart = ({ size = 16, filled = false }: IconProps & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const IconLeaf = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 11 13 11 11"/></svg>
);
const IconGift = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8"/><path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8"/></svg>
);
const IconCalendar = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
);
const IconChevronRight = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const IconZap = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
);

function StatIcon({ tone, children }: { tone: 'green' | 'purple' | 'orange' | 'pink' | 'blue'; children: React.ReactNode }) {
  const tones: Record<string, { bg: string; fg: string }> = {
    green: { bg: '#E4F7EC', fg: '#16834a' },
    purple: { bg: '#EFEBFE', fg: '#6D4DFF' },
    orange: { bg: '#FFF3DF', fg: '#B87400' },
    pink: { bg: '#FDE9F1', fg: '#D2418C' },
    blue: { bg: '#E9EDFB', fg: '#1E2A78' },
  };
  const t = tones[tone];
  return (
    <span className="stat-icon" style={{ background: t.bg, color: t.fg }}>
      {children}
    </span>
  );
}

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

function galleryImages(campaign: Campaign) {
  const extras = Array.isArray(campaign.extra_photos) ? campaign.extra_photos : [];
  return Array.from(new Set([campaign.hero_image || '', ...extras].filter(Boolean))).map(mediaUrl);
}

function CampaignCard({
  campaign,
  completedCampaignIds,
  alreadyApplied,
  isSaved,
  onToggleSave,
}: {
  campaign: Campaign;
  completedCampaignIds: Set<number>;
  alreadyApplied: boolean;
  isSaved: boolean;
  onToggleSave: (campaignId: number) => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const images = useMemo(() => galleryImages(campaign), [campaign]);
  const canApply = isOpen(campaign, completedCampaignIds) && !alreadyApplied;
  const deadline = campaign.deadline ? new Date(campaign.deadline) : null;
  const deadlineLabel = deadline && !Number.isNaN(deadline.getTime())
    ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Open';
  const activeImg = images[Math.min(imgIndex, images.length - 1)];

  return (
    <div className="campaign">
      <div className="media">
        {activeImg ? <img src={activeImg} alt="" /> : <div className="placeholder">Campaign image</div>}
        <span className={`tag ${statusTone(campaign, completedCampaignIds)}`}>{formatStatus(campaign, completedCampaignIds)}</span>
        <button
          type="button"
          className={`save-btn ${isSaved ? 'save-btn--active' : ''}`}
          onClick={(event) => { event.preventDefault(); onToggleSave(campaign.id); }}
          aria-label={isSaved ? 'Remove from saved' : 'Save campaign'}
        >
          <IconHeart size={15} filled={isSaved} />
        </button>
        {images.length > 1 && (
          <div className="media-dots">
            {images.map((_, index) => (
              <button
                type="button"
                key={index}
                className={`media-dot ${index === imgIndex ? 'media-dot--active' : ''}`}
                onClick={(event) => { event.preventDefault(); setImgIndex(index); }}
                aria-label={`Show photo ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="body">
        <Link to={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="cat-pill"><IconLeaf size={12} /> {campaign.brand_name || 'Brand'} · {campaign.category}</div>
          <div className="title">{campaign.title}</div>
          <div className="desc">{campaign.tagline || campaign.description || 'View the brief to see the full campaign details.'}</div>
        </Link>
        <div className="row">
          <span className="pay">{campaign.campaign_type === 'paid' ? money(campaign.budget) : 'Gifted product'}</span>
          <span className="kind-pill"><IconTag size={12} /> {campaign.creators_needed || 1} creator{(campaign.creators_needed || 1) === 1 ? '' : 's'}</span>
        </div>
        <div className="feature-grid">
          <div className="feature"><span className="feature-icon">{campaign.campaign_type === 'paid' ? <IconTag size={14} /> : <IconGift size={14} />}</span><span>{campaign.campaign_type === 'paid' ? 'Paid campaign' : 'Gifted product'}</span></div>
          <div className="feature"><span className="feature-icon"><IconCalendar size={14} /></span><span>{deadlineLabel}</span></div>
          <div className="feature"><span className="feature-icon"><IconUsers size={14} /></span><span>{campaign.creators_needed || 1} needed</span></div>
          <div className="feature"><span className="feature-icon"><IconFileCheck size={14} /></span><span>{campaign.sub_category || campaign.category || 'General'}</span></div>
        </div>
        <div className="card-actions">
          {canApply ? (
            <Link className="btn-apply" to={`/campaigns/${campaign.id}?apply=true`}><IconSend size={14} /> Apply</Link>
          ) : (
            <span className="btn-apply btn-apply--disabled">
              {alreadyApplied ? 'Applied' : formatStatus(campaign, completedCampaignIds)}
            </span>
          )}
          <Link className="btn-view" to={`/campaigns/${campaign.id}`}><IconEye size={14} /> View Details</Link>
        </div>
      </div>
    </div>
  );
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
  const [invites, setInvites] = useState<CreatorInvite[]>([]);
  const [saved, setSaved] = useState<SavedCampaignEntry[]>([]);
  const [activity, setActivity] = useState<Notification[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<CreatorListItem[]>([]);
  const [category, setCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>('all');
  const [businessTab, setBusinessTab] = useState<'all' | 'published' | 'in_progress' | 'completed' | 'draft'>('all');
  const [activityVisibleCount, setActivityVisibleCount] = useState(3);
  const [feedPage, setFeedPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyCreatorId, setBusyCreatorId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const business = user?.role === 'business';

    (async () => {
      setLoading(true);
      try {
        const [campaignData, apps, active, finished, paymentSummary, invitesList, extra] = await Promise.all([
          getCampaigns({ limit: 50 }),
          getApplications(),
          getCollabs(),
          getCollabHistory(),
          getPaymentSummary(),
          getInvites(),
          business ? Promise.all([getNotifications(), getCreators({ limit: 50 })]) : getSavedCampaigns(),
        ]);

        if (cancelled) return;

        // Business owners need to see their own drafts (the Draft tab depends on
        // it) and cancelled campaigns; only the creator feed should hide them.
        const visibleCampaigns = business
          ? campaignData.campaigns
          : campaignData.campaigns.filter((campaign) => campaign.status !== 'draft' && campaign.status !== 'cancelled');
        const knownIds = new Set(visibleCampaigns.map((campaign) => campaign.id));
        const historyIds = Array.from(new Set([...active, ...finished].map((collab) => collab.campaign_id)))
          .filter((campaignId) => !knownIds.has(campaignId));

        let recovered: Campaign[] = [];
        if (historyIds.length > 0) {
          const results = await Promise.allSettled(
            historyIds.slice(0, 20).map((campaignId) => getCampaign(campaignId))
          );
          recovered = results
            .filter((result): result is PromiseFulfilledResult<Campaign> => result.status === 'fulfilled')
            .map((result) => result.value)
            .filter((campaign) => business || (campaign.status !== 'draft' && campaign.status !== 'cancelled'));
        }

        if (cancelled) return;
        const merged = [...visibleCampaigns, ...recovered].filter(
          (campaign, index, all) => all.findIndex((item) => item.id === campaign.id) === index
        );
        setCampaigns(merged);
        setApplications(apps);
        setCollabs(active);
        setHistory(finished);
        setPayments({ this_month: paymentSummary.this_month, lifetime: paymentSummary.lifetime });
        setInvites(invitesList);

        if (business) {
          const [notes, creatorData] = extra as [Notification[], { creators: CreatorListItem[] }];
          setActivity(notes);
          setSuggestedCreators(creatorData.creators);
        } else {
          setSaved(extra as SavedCampaignEntry[]);
        }
      } catch (err) {
        console.error('Could not load dashboard:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.role]);

  const completedCampaignIds = useMemo(
    () => new Set(history.filter((collab) => collab.status === 'completed').map((collab) => collab.campaign_id)),
    [history]
  );

  const categories = useMemo(() => {
    const fromCampaigns = campaigns.map((campaign) => campaign.category).filter(Boolean) as string[];
    const values = Array.from(new Set([...MASTER_CATEGORIES, ...fromCampaigns])).sort();
    return ['All', ...values];
  }, [campaigns]);

  // Applied campaign ids — computed before `feed` so the applied-status filter can use it.
  const appliedCampaignIds = useMemo(() => new Set(applications.map((application) => application.campaign_id)), [applications]);

  const feed = useMemo(() => {
    const query = search.trim().toLowerCase();
    return campaigns
      .filter((campaign) => {
        const categoryMatch = category === 'All' || campaign.category === category;
        const priceMatch = matchesPriceRange(campaign, priceRange);
        const searchMatch = !query || [campaign.title, campaign.brand_name, campaign.category, campaign.sub_category, campaign.tagline]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
        let filterMatch = true;
        switch (feedFilter) {
          case 'open': filterMatch = isOpen(campaign, completedCampaignIds); break;
          case 'booked': filterMatch = isBooked(campaign, completedCampaignIds); break;
          case 'completed': filterMatch = isCompleted(campaign, completedCampaignIds); break;
          case 'closed': filterMatch = campaign.status === 'closed'; break;
          case 'this_month': filterMatch = isThisMonth(campaign); break;
          case 'past': filterMatch = isPast(campaign, completedCampaignIds); break;
        }
        let appliedMatch = true;
        switch (appliedFilter) {
          case 'applied': appliedMatch = appliedCampaignIds.has(campaign.id); break;
          case 'not_applied': appliedMatch = !appliedCampaignIds.has(campaign.id); break;
          case 'new': appliedMatch = isNewThisWeek(campaign); break;
        }
        return categoryMatch && priceMatch && searchMatch && filterMatch && appliedMatch;
      })
      .sort((a, b) => (new Date(b.updated_at || b.created_at).getTime() || 0) - (new Date(a.updated_at || a.created_at).getTime() || 0));
  }, [campaigns, category, priceRange, completedCampaignIds, feedFilter, appliedFilter, appliedCampaignIds, search]);

  // Reset to page 1 whenever the filtered feed changes shape (new filters/search/data)
  useEffect(() => {
    setFeedPage(1);
  }, [category, priceRange, feedFilter, appliedFilter, search, campaigns.length]);

  const feedTotalPages = Math.max(1, Math.ceil(feed.length / CAMPAIGNS_PER_PAGE));
  const currentFeedPage = Math.min(feedPage, feedTotalPages);
  const pagedFeed = useMemo(
    () => feed.slice((currentFeedPage - 1) * CAMPAIGNS_PER_PAGE, currentFeedPage * CAMPAIGNS_PER_PAGE),
    [feed, currentFeedPage]
  );

  // Creator-only figures
  const openCampaignCount = useMemo(
    () => campaigns.filter((campaign) => isOpen(campaign, completedCampaignIds)).length,
    [campaigns, completedCampaignIds]
  );
  const pendingInvites = useMemo(() => invites.filter((invite) => invite.status === 'pending'), [invites]);
  const creatorNiches = useMemo(() => {
    const profile = (user?.profile || {}) as Record<string, any>;
    const raw = profile.niches || profile.categories || [];
    return new Set((Array.isArray(raw) ? raw : []).map((value: string) => String(value).toLowerCase()));
  }, [user?.profile]);
  const recommended = useMemo(() => {
    if (creatorNiches.size === 0) return [];
    return campaigns.filter(
      (campaign) =>
        isOpen(campaign, completedCampaignIds) &&
        !appliedCampaignIds.has(campaign.id) &&
        campaign.category &&
        creatorNiches.has(campaign.category.toLowerCase())
    );
  }, [campaigns, completedCampaignIds, appliedCampaignIds, creatorNiches]);

  const savedCampaignIds = useMemo(() => new Set(saved.map((entry) => entry.campaign_id)), [saved]);

  const handleToggleSave = async (campaignId: number) => {
    const currentlySaved = savedCampaignIds.has(campaignId);
    // Optimistic update
    setSaved((previous) =>
      currentlySaved
        ? previous.filter((entry) => entry.campaign_id !== campaignId)
        : [...previous, { campaign_id: campaignId } as SavedCampaignEntry]
    );
    try {
      if (currentlySaved) await unsaveCampaign(campaignId);
      else await saveCampaign(campaignId);
    } catch (err) {
      console.error('Could not update saved campaign:', err);
      // Revert on failure
      setSaved((previous) =>
        currentlySaved
          ? [...previous, { campaign_id: campaignId } as SavedCampaignEntry]
          : previous.filter((entry) => entry.campaign_id !== campaignId)
      );
    }
  };

  // Business-only figures
  const pendingCount = applications.filter((application) => application.status === 'pending').length;
  const completedCampaigns = campaigns.filter((campaign) => campaign.status === 'completed').length +
    history.filter((collab) => collab.status === 'completed' && !campaigns.some((campaign) => campaign.id === collab.campaign_id)).length;
  const activeCreators = new Set(collabs.map((collab) => collab.creator_id)).size;
  const totalApplications = applications.length;
  const pendingInvitesSent = useMemo(() => invites.filter((invite) => invite.status === 'pending'), [invites]);
  const businessNiches = useMemo(() => {
    const profile = (user?.profile || {}) as Record<string, any>;
    const raw = profile.interested_categories || [];
    return new Set((Array.isArray(raw) ? raw : []).map((value: string) => String(value).toLowerCase()));
  }, [user?.profile]);
  const recommendedCreators = useMemo(() => {
    if (businessNiches.size === 0) return [];
    return suggestedCreators.filter(
      (creator) =>
        !creator.is_shortlisted &&
        (creator.categories || []).some((value) => businessNiches.has(String(value).toLowerCase()))
    );
  }, [suggestedCreators, businessNiches]);

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

  const greetingTime = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <AppLayout
      title={undefined}
      subtitle={undefined}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={isBusiness ? 'Search creators by name or niche…' : 'Search campaigns…'}
      actionLabel={isBusiness ? 'Create Campaign' : 'Browse Campaigns'}
      actionTo={isBusiness ? '/campaigns/new' : '/campaigns'}
    >
      <style>{`
        .dash{max-width:1180px;margin:0 auto;padding:28px 28px 76px;color:#1A1625}

        .hero{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(240px,.9fr);gap:18px;align-items:stretch;margin-bottom:24px}
        .hero-main{position:relative;overflow:hidden;background:linear-gradient(120deg, #F4F1FE 0%, #F7EEFE 45%, #FDF1F6 100%);border:1px solid #EEE9FB;border-radius:18px;padding:28px 30px;display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,380px);align-items:center;gap:14px}
        .hero-copy-col{position:relative;z-index:1}
        .hero-kicker{font-size:10px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:#8B8697}
        .hero-title{margin:6px 0 0;font-size:27px;line-height:1.15;letter-spacing:-.6px;font-weight:750;color:#1A1625}
        .hero-title-accent{color:#1E2A78}
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

        .stat-icon{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;flex:0 0 auto}

        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
        .stat{border:0;border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:13px}
        .stat:nth-child(1){background:#E6F9EF}
        .stat:nth-child(2){background:#EFEBFE}
        .stat:nth-child(3){background:#FFF2DF}
        .stat-body small{display:block;color:#A39DB8;font-size:10px;font-weight:650}.stat-body strong{display:block;margin-top:4px;color:#1A1625;font-size:20px;font-weight:700;letter-spacing:-.2px}

        .section-head{margin:28px 0 14px}.section-head h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.2px;color:#1A1625}.section-head p{margin:4px 0 0;color:#A39DB8;font-size:11.5px;line-height:1.5}
        .feed-controls{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
        .feed-label{font-size:10px;font-weight:650;color:#6B6478}

        /* Coral pill by default (white text), flips to white bg / black text while its dropdown is open */
        .filter-pill{display:flex;align-items:center;gap:7px;height:36px;padding:0 16px;border:1px solid var(--accent);border-radius:999px;background:var(--accent);color:#fff;transition:background .15s ease,color .15s ease}
        .filter-pill:focus-within{background:#fff;color:#1A1625}
        .feed-select{border:0;background:transparent;color:inherit;font:650 11.5px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;outline:none;min-width:120px;accent-color:var(--accent)}
        .feed-select:focus{outline:none}

        .feed{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start}
        .campaign{display:flex;flex-direction:column;height:100%;background:#fff;border:1px solid #EAE7F2;border-radius:18px;overflow:hidden;color:inherit;transition:box-shadow .15s ease,transform .15s ease}
        .campaign:hover{box-shadow:0 10px 26px rgba(20,20,30,.07);transform:translateY(-2px)}

        .media{aspect-ratio:1.35/1;background:#F5F4FA;overflow:hidden;position:relative;flex:0 0 auto}
        .media img{width:100%;height:100%;object-fit:cover;display:block}
        .placeholder{height:100%;display:grid;place-items:center;color:#A39DB8;font-size:11px}
        .tag{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.96);font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:5px}
        .tag.open{color:#16834a}.tag.booked{color:#1E2A78}.tag.completed{color:#6B6478}.tag.closed{color:#7b7582}
        .save-btn{position:absolute;right:12px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.96);color:#8B8697;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 10px rgba(20,20,30,.12)}
        .save-btn--active{color:var(--accent)}
        .media-dots{position:absolute;left:0;right:0;bottom:11px;display:flex;justify-content:center;gap:6px}
        .media-dot{width:6px;height:6px;border-radius:50%;border:0;padding:0;background:rgba(255,255,255,.65);cursor:pointer}
        .media-dot--active{background:#fff;width:16px;border-radius:4px}

        /* body becomes a flex column so the actions row always sits at the bottom, aligned across cards */
        .body{padding:16px;display:flex;flex-direction:column;flex:1 1 auto}
        .body > a{display:block}
        .cat-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:var(--accent-tint);color:var(--accent);font-size:10px;font-weight:650}
        .title{
          font-size:16px;font-weight:700;line-height:1.32;margin-top:9px;color:#1A1625;
          display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:42px
        }
        .desc{font-size:11.5px;line-height:1.6;color:#6B6478;margin-top:5px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:37px}
        .row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:13px}
        .pay{font-size:16px;font-weight:700;color:#1A1625}
        .kind-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:var(--accent-tint);color:var(--accent);font-size:10px;font-weight:650}

        .feature-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px;padding-top:13px;border-top:1px solid #EAE7F2}
        .feature{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;font-size:9px;color:#6B6478;font-weight:550;line-height:1.3}
        .feature span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:23px}
        .feature-icon{width:30px;height:30px;border-radius:50%;background:var(--accent-tint);color:var(--accent);display:flex;align-items:center;justify-content:center;flex:0 0 auto}

        /* pushed to the bottom of the flex column + margin-top:auto keeps every card's button row on the same baseline */
        .card-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:auto;padding-top:14px}
        .btn-apply,.btn-view{display:flex;align-items:center;justify-content:center;gap:6px;height:40px;border-radius:11px;font-size:12px;font-weight:650;text-decoration:none;text-align:center;transition:filter .15s ease,background .15s ease}
        .btn-apply{background:var(--accent);color:#fff;border:1px solid var(--accent)}
        .btn-apply:hover{filter:brightness(0.94)}
        .btn-apply--disabled{opacity:.55;pointer-events:none}
        .btn-view{background:#fff;color:#1A1625;border:1px solid #EAE7F2}
        .btn-view:hover{background:#F7F6FB}

        .feed-pagination{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px}
        .page-btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 18px;border-radius:999px;border:1px solid var(--accent);background:#fff;color:var(--accent);font:650 11.5px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}
        .page-btn:disabled{opacity:.4;cursor:not-allowed}
        .page-status{font-size:11px;font-weight:650;color:#6B6478}

        .hero--solo{grid-template-columns:1fr}

        .campaign-list{margin-top:14px;display:flex;flex-direction:column;gap:12px}
        .campaign-row{display:flex;align-items:center;gap:14px;padding:12px;border:1px solid #EAE7F2;border-radius:14px;text-decoration:none;color:inherit;transition:box-shadow .15s ease,transform .15s ease}
        .campaign-row:hover{box-shadow:0 8px 20px rgba(20,20,30,.06);transform:translateY(-1px)}
        .campaign-row-media{position:relative;flex:0 0 auto;width:92px;height:92px;border-radius:12px;overflow:hidden;background:#F5F4FA}
        .campaign-row-media img{width:100%;height:100%;object-fit:cover;display:block}
        .campaign-row-media .tag{left:6px;top:6px;padding:4px 8px;font-size:9px}
        .campaign-row-body{flex:1;min-width:0}
        .campaign-row-title{font-size:14px;font-weight:700;color:#1A1625;margin-top:7px;line-height:1.3}
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
        .tab-btn.active{background:#1E2A78;border-color:#1E2A78;color:#fff}
        .list{margin-top:10px}.item{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid #EAE7F2}.item:last-child{border-bottom:0}.item-title{font-size:12.5px;font-weight:650;color:#1A1625}.item-meta{font-size:10.5px;color:#A39DB8;margin-top:3px}.meter{height:5px;background:#F5F4FA;border-radius:99px;overflow:hidden;margin-top:7px}.meter span{display:block;height:100%;background:#1E2A78}.mini-link{color:#1E2A78;font-size:10.5px;font-weight:700;text-decoration:none}
        .mini-btn{color:#1E2A78;font-size:10.5px;font-weight:700;text-decoration:none;background:none;border:0;cursor:pointer;padding:0;font-family:inherit}
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

        .empty{padding:50px;text-align:center;color:#A39DB8;font-size:12px;border:1px dashed #EAE7F2;border-radius:16px;background:#fff}

        @media(max-width:900px){.feed{grid-template-columns:repeat(2,minmax(0,1fr))}.brand-layout{grid-template-columns:1fr}.hero{grid-template-columns:1fr}.hero-main{grid-template-columns:1fr}.hero-illustration-wrap img{max-width:220px;margin:0 auto}}
        @media(max-width:620px){.dash{padding:20px 15px 50px}.stats,.summary,.hero-stat-grid{grid-template-columns:1fr}.feed{grid-template-columns:1fr}.campaign{max-width:100%}.campaign-row{flex-wrap:wrap}.campaign-row-action{width:100%;justify-content:flex-end;margin-top:8px}}
      `}</style>

      <div
        className="dash"
        style={{
          ['--accent' as string]: isBusiness ? '#1E2A78' : '#FF6B5A',
          ['--accent-dark' as string]: isBusiness ? '#141B52' : '#E85440',
          ['--accent2' as string]: isBusiness ? '#FF6B5A' : '#1E2A78',
          ['--accent-tint' as string]: isBusiness ? '#EFF1FB' : '#FFF3F1',
        }}
      >
        {!isBusiness ? (
          <>
            <div className="hero">
              <div className="hero-main">
                <div className="hero-copy-col">
                  <div className="hero-kicker">Good {greetingTime}, {firstName}</div>
                  <h1 className="hero-title">Find your next <span className="hero-title-accent">collaboration.</span></h1>
                  <p className="hero-copy">Browse paid and gifted brand opportunities in one feed. Open campaigns, booked work, and completed collaborations stay visible so the marketplace feels like a living portfolio.</p>
                </div>
                <div className="hero-illustration-wrap">
                  <img src="/assets/hero-illustration.png" alt="Creator working on a laptop" />
                </div>
              </div>
              <aside className="hero-stats">
                <div className="hero-stats-title">Your stats</div>
                <div className="hero-stats-rows">
                  <div className="hero-stat-row">
                    <span>Applications sent</span>
                    <strong>{applications.length}</strong>
                  </div>
                  <div className="hero-stat-row">
                    <span>Active collaborations</span>
                    <strong>{collabs.length}</strong>
                  </div>
                  <div className="hero-stat-row">
                    <span>Saved campaigns</span>
                    <strong>{saved.length}</strong>
                  </div>
                </div>
              </aside>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="stat-body"><small>Active campaigns</small><strong>{openCampaignCount}</strong></div>
              </div>
              <div className="stat">
                <div className="stat-body"><small>New invitations</small><strong>{pendingInvites.length}</strong></div>
              </div>
              <div className="stat">
                <div className="stat-body"><small>Recommended for you</small><strong>{recommended.length}</strong></div>
              </div>
            </div>

            <div className="section-head">
              <h2>Explore Campaigns</h2>
            </div>

            <div className="feed-controls">
              <div className="filter-pill">
                <select id="campaign-category-filter" className="feed-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categories.map((value) => <option key={value} value={value}>{value === 'All' ? 'All Categories' : value}</option>)}
                </select>
              </div>
              <div className="filter-pill">
                <select id="campaign-price-filter" className="feed-select" value={priceRange} onChange={(event) => setPriceRange(event.target.value as PriceRange)}>
                  {PRICE_RANGES.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
                </select>
              </div>
              <div className="filter-pill">
                <select id="campaign-applied-filter" className="feed-select" value={appliedFilter} onChange={(event) => setAppliedFilter(event.target.value as AppliedFilter)}>
                  {APPLIED_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {loading ? <div className="empty">Loading campaigns…</div> : feed.length === 0 ? <div className="empty">No campaigns match these filters yet.</div> : (
              <>
                <div className="feed">
                  {pagedFeed.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      completedCampaignIds={completedCampaignIds}
                      alreadyApplied={appliedCampaignIds.has(campaign.id)}
                      isSaved={savedCampaignIds.has(campaign.id)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>

                {feedTotalPages > 1 && (
                  <div className="feed-pagination">
                    <button
                      type="button"
                      className="page-btn"
                      disabled={currentFeedPage <= 1}
                      onClick={() => setFeedPage((page) => Math.max(1, page - 1))}
                    >
                      ← Prev
                    </button>
                    <span className="page-status">Page {currentFeedPage} of {feedTotalPages}</span>
                    <button
                      type="button"
                      className="page-btn"
                      disabled={currentFeedPage >= feedTotalPages}
                      onClick={() => setFeedPage((page) => Math.min(feedTotalPages, page + 1))}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
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
                          <Link className="activity-item activity-item--clickable" key={note.id} to={`/campaigns/${noteCampaignId}`}>
                            {content}
                          </Link>
                        ) : (
                          <div className="activity-item" key={note.id}>{content}</div>
                        );
                      })
                    ) : (
                      derivedActivity.slice(0, activityVisibleCount).map((item) => (
                        <Link className="activity-item activity-item--clickable" key={item.id} to={`/campaigns/${item.campaignId}`}>
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
                      <Link className="campaign-row" key={campaign.id} to={`/campaigns/${campaign.id}`}>
                        <div className="campaign-row-media">
                          {img ? <img src={img} alt="" /> : <div className="placeholder">No image</div>}
                          <span className={`tag ${statusTone(campaign, completedCampaignIds)}`}>{formatStatus(campaign, completedCampaignIds)}</span>
                        </div>
                        <div className="campaign-row-body">
                          <div className="cat-pill"><IconLeaf size={11} /> {campaign.category}</div>
                          <div className="campaign-row-title">{campaign.title}</div>
                          <div className="campaign-row-price">{campaign.campaign_type === 'paid' ? money(campaign.budget) : 'Gifted product'}</div>
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
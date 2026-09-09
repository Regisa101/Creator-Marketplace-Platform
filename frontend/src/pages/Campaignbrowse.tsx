import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Megaphone,
  PauseCircle,
  Radio,
} from 'lucide-react';
import { getCampaigns, type Campaign } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';

const C = {
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  navy: '#1E2A78',
  navySoft: '#EEF1FF',
  coral: '#FF6B5A',
  green: '#22C55E',
  greenSoft: '#EAFBF1',
  amberSoft: '#FFF6E5',
  blue: '#38BDF8',
  blueSoft: '#EAF8FE',
};

const CATEGORIES = [
  'Beauty',
  'Fashion',
  'Lifestyle',
  'Food',
  'Tech',
  'Fitness',
  'Travel',
  'Gaming',
  'Education',
  'Finance',
  'Wellness',
  'Skincare',
  'Home Decor',
  'Parenting',
  'Entertainment',
];

const TAB_ORDER = ['all', 'active', 'draft', 'review', 'completed'] as const;
type CampaignTab = (typeof TAB_ORDER)[number];

function tabMatches(campaign: Campaign, tab: CampaignTab) {
  const status = String(campaign.status || '').toLowerCase();

  if (tab === 'all') return true;
  if (tab === 'active') return status === 'published' || status === 'in_progress';
  if (tab === 'draft') return status === 'draft';
  if (tab === 'review') return status === 'in_review' || status === 'review';
  return status === 'completed';
}

function statusMeta(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'published':
    case 'in_progress':
      return {
        label: 'Active',
        color: C.green,
        bg: C.greenSoft,
        Icon: Radio,
      };

    case 'in_review':
    case 'review':
      return {
        label: 'Review',
        color: C.blue,
        bg: C.blueSoft,
        Icon: Clock3,
      };

    case 'draft':
      return {
        label: 'Draft',
        color: C.inkSoft,
        bg: '#F0EFF4',
        Icon: Clock3,
      };

    case 'completed':
      return {
        label: 'Completed',
        color: C.navy,
        bg: C.navySoft,
        Icon: CheckCircle2,
      };

    case 'cancelled':
    case 'closed':
      return {
        label: 'Paused',
        color: '#A16207',
        bg: C.amberSoft,
        Icon: PauseCircle,
      };

    default:
      return {
        label: status || 'Active',
        color: C.inkSoft,
        bg: '#F0EFF4',
        Icon: Clock3,
      };
  }
}

function getDeliverableTotal(campaign: Campaign) {
  return campaign.deliverables?.length || campaign.checklist?.length || 0;
}

function formatDate(date?: string | null) {
  if (!date) return '';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatBudget(campaign: Campaign) {
  if (campaign.compensation_description) {
    return campaign.compensation_description;
  }

  if (campaign.budget != null) {
    return `Rs. ${Number(campaign.budget).toLocaleString()}`;
  }

  return 'Budget not set';
}

function CampaignCard({
  campaign,
  isBusiness,
}: {
  campaign: Campaign;
  isBusiness: boolean;
}) {
  const meta = statusMeta(campaign.status);
  const totalDeliverables = getDeliverableTotal(campaign);
  const description =
    campaign.description?.trim() ||
    campaign.tagline?.trim() ||
    'No campaign description yet.';

  const StatusIcon = meta.Icon;

  return (
    <Link to={`/campaigns/${campaign.id}`} className="mc-card">
      <div className="mc-card-head">
        <div className="mc-card-icon">
          {campaign.hero_image ? (
            <img src={campaign.hero_image} alt="" />
          ) : campaign.campaign_type === 'paid' ? (
            <Radio size={18} />
          ) : (
            <ImageIcon size={18} />
          )}
        </div>

        <span
          className="mc-status"
          style={{
            background: meta.bg,
            color: meta.color,
          }}
        >
          <StatusIcon size={10} />
          {meta.label}
        </span>
      </div>

      <h3 className="mc-card-title">{campaign.title}</h3>

      <p className="mc-card-description">{description}</p>

      <div className="mc-card-stats">
        <span>
          Applications: <strong>{campaign.application_count ?? 0}</strong>
        </span>

        <span>
          Deliverables:{' '}
          <strong>
            {totalDeliverables ? `0/${totalDeliverables}` : '—'}
          </strong>
        </span>
      </div>

      <div className="mc-progress-track" aria-hidden="true">
        <div className="mc-progress-fill" />
      </div>

      <div className="mc-card-footer">
        <span>{formatBudget(campaign)}</span>
        <span>
          {campaign.deadline
            ? `Due ${formatDate(campaign.deadline)}`
            : campaign.category || 'Campaign'}
        </span>
      </div>

      <div className="mc-view-btn">
        {isBusiness ? 'View Details' : 'View Campaign'}
      </div>
    </Link>
  );
}

export function CampaignBrowse() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<CampaignTab>('all');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    const timer = window.setTimeout(async () => {
      try {
        const data = await getCampaigns({
  search: search.trim() || undefined,
  category: category || undefined,
  page: 1,
  limit: 50,
});

        if (!cancelled) {
          setCampaigns(data.campaigns ?? []);
        }
      } catch (err) {
        console.error('Could not load campaigns:', err);

        if (!cancelled) {
          setError('Could not load campaigns. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, category]);

  const visibleCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((campaign) => tabMatches(campaign, activeTab))
      .sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();

        return sort === 'newest'
          ? bTime - aTime
          : aTime - bTime;
      });
  }, [campaigns, activeTab, sort]);

  const counts = useMemo(
    () => ({
      all: campaigns.length,
      active: campaigns.filter((campaign) =>
        tabMatches(campaign, 'active')
      ).length,
      draft: campaigns.filter((campaign) =>
        tabMatches(campaign, 'draft')
      ).length,
      review: campaigns.filter((campaign) =>
        tabMatches(campaign, 'review')
      ).length,
      completed: campaigns.filter((campaign) =>
        tabMatches(campaign, 'completed')
      ).length,
    }),
    [campaigns]
  );

  return (
    <AppLayout
      title={isBusiness ? 'My Campaigns' : 'Discover Collabs'}
      subtitle={
        isBusiness
          ? "Here's all your campaigns."
          : 'Browse open campaigns from businesses looking for creators.'
      }
      searchValue={search}
      onSearchChange={(value) => {
        setSearch(value);
        setActiveTab('all');
      }}
      searchPlaceholder={
        isBusiness
          ? 'Search campaigns, creators…'
          : 'Search campaigns…'
      }
      actionLabel={isBusiness ? 'New Campaign' : undefined}
      actionTo={isBusiness ? '/campaigns/new' : undefined}
    >
      <style>{`
        .campaign-page {
          min-height: calc(100vh - 68px);
          background: ${C.surface};
          color: ${C.ink};
          font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .campaign-page * {
          box-sizing: border-box;
        }

        .mc-content {
          padding: 0 24px 40px;
          max-width: 1500px;
          margin: 0 auto;
        }

        .mc-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .mc-title-row > div:first-child {
          display: none;
        }

        .mc-sort {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          font-size: 11px;
          color: ${C.inkSoft};
          white-space: nowrap;
        }

        .mc-sort select {
          border: 1px solid ${C.line};
          border-radius: 7px;
          background: #fff;
          color: ${C.ink};
          padding: 7px 9px;
          font-size: 11px;
          outline: none;
        }

        .mc-tabs {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .mc-tab {
          border: 1px solid ${C.line};
          background: #fff;
          color: ${C.inkSoft};
          padding: 12px 24px;
          border-radius: 999px;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .mc-tab.active {
          border-color: ${C.navy};
          background: ${C.navy};
          color: #fff;
          font-weight: 600;
        }

        .mc-tab-count {
          margin-left: 3px;
          opacity: .75;
        }

        .mc-select {
          border: 1px solid ${C.line};
          background: #fff;
          color: ${C.inkSoft};
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .mc-state {
          padding: 70px 20px;
          text-align: center;
          color: ${C.inkSoft};
          font-size: 12px;
        }

        .mc-state-title {
          margin: 8px 0 4px;
          color: ${C.ink};
          font-size: 14px;
          font-weight: 600;
        }

        .mc-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .mc-card {
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 330px;
          padding: 22px;
          border: 1px solid ${C.line};
          border-radius: 16px;
          background: ${C.card};
          color: inherit;
          text-decoration: none;
          transition: transform .15s ease, box-shadow .15s ease;
        }

        .mc-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 7px 22px rgba(35, 29, 58, .08);
        }

        .mc-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }

        .mc-card-icon {
          width: 52px;
          height: 52px;
          flex: 0 0 52px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 10px;
          background: ${C.navySoft};
          color: ${C.navy};
        }

        .mc-card-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mc-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
        }

        .mc-card-title {
          margin: 0 0 8px;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 700;
          min-height: 42px;
        }

        .mc-card-description {
          margin: 0 0 14px;
          color: ${C.inkSoft};
          font-size: 12.5px;
          line-height: 1.55;
          min-height: 40px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .mc-card-stats {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: auto;
          color: ${C.inkSoft};
          font-size: 12px;
          white-space: nowrap;
        }

        .mc-card-stats strong {
          color: ${C.ink};
          font-weight: 700;
        }

        .mc-progress-track {
          height: 3px;
          margin: 6px 0 8px;
          border-radius: 99px;
          overflow: hidden;
          background: #ECEAF1;
        }

        .mc-progress-fill {
          width: 0%;
          height: 100%;
          border-radius: inherit;
          background: ${isBusiness ? C.navy : C.coral};
        }

        .mc-card-footer {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 14px;
          padding-top: 12px;
          border-top: 1px solid #F0EEF4;
          color: ${C.inkFaint};
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
        }

        .mc-card-footer span {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mc-view-btn {
          width: 100%;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid #8D8B94;
          border-radius: 8px;
          color: ${C.ink};
          font-size: 13px;
          font-weight: 600;
          background: #fff;
        }

        @media (max-width: 1050px) {
          .mc-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .mc-content {
            padding-left: 18px;
            padding-right: 18px;
          }

          .mc-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .mc-title-row {
            flex-direction: column;
          }

          .mc-sort {
            margin-left: 0;
          }

          .mc-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="campaign-page">
        <section className="mc-content">
          <div className="mc-title-row">
            <div>
              <h1 className="mc-title">
                {isBusiness ? 'My Campaigns' : 'Discover Collabs'}
              </h1>
            </div>

            <label className="mc-sort">
              Sort by:
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as 'newest' | 'oldest')
                }
              >
                <option value="newest">Date (Newest)</option>
                <option value="oldest">Date (Oldest)</option>
              </select>
            </label>
          </div>

          <div
            className="mc-tabs"
            role="tablist"
            aria-label="Campaign status"
          >
            {TAB_ORDER.map((tab) => {
              const labels: Record<CampaignTab, string> = {
                all: 'All',
                active: 'Active',
                draft: 'Drafts',
                review: 'Review',
                completed: 'Completed',
              };

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`mc-tab ${
                    activeTab === tab ? 'active' : ''
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {labels[tab]}
                  <span className="mc-tab-count">
                    ({counts[tab]})
                  </span>
                </button>
              );
            })}

            {isBusiness && (
              <select
                className="mc-select"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setActiveTab('all');
                }}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>

                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading && (
            <div className="mc-state">
              Loading campaigns…
            </div>
          )}

          {!loading && error && (
            <div className="mc-state">
              {error}
            </div>
          )}

          {!loading && !error && visibleCampaigns.length === 0 && (
            <div className="mc-state">
              <Megaphone
                size={26}
                color={C.inkFaint}
              />

              <div className="mc-state-title">
                {search || category || activeTab !== 'all'
                  ? 'No campaigns match these filters'
                  : isBusiness
                    ? "You haven't launched a campaign yet"
                    : 'No open campaigns right now'}
              </div>

              <div>
                {isBusiness
                  ? 'Create a campaign to start receiving creator applications.'
                  : 'Check back soon for new collaborations.'}
              </div>

              {isBusiness &&
                !search &&
                !category &&
                activeTab === 'all' && (
                  <Link
                    className="app-action"
                    style={{
                      marginTop: 14,
                      display: 'inline-flex',
                    }}
                    to="/campaigns/new"
                  >
                    Create your first campaign
                  </Link>
                )}
            </div>
          )}

          {!loading &&
            !error &&
            visibleCampaigns.length > 0 && (
              <div className="mc-grid">
                {visibleCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    isBusiness={isBusiness}
                  />
                ))}
              </div>
            )}
        </section>
      </main>
    </AppLayout>
  );
}

export default CampaignBrowse;
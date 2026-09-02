import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Building2, Loader2, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCampaigns, type Campaign } from '../api/client';

const C = {
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  violet: '#6C5DD3',
  violetSoft: '#EDEAFB',
  coral: '#FF8A5B',
  coralSoft: '#FFEEE5',
};

// Same list CampaignCreate.tsx uses, so the filter options line up
// with what a business could have actually picked when creating one.
const CATEGORIES = [
  'Beauty', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness', 'Travel',
  'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor',
  'Parenting', 'Entertainment',
];

function formatDeadline(deadline?: string | null): string | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBudget(campaign: Campaign): string | null {
  if (campaign.compensation_description) return campaign.compensation_description;
  if (campaign.budget) return `Rs. ${Number(campaign.budget).toLocaleString()}`;
  return null;
}

// ------------------------------------------------------------------
// CREATOR VIEW — Discover Collaborations
// ------------------------------------------------------------------
function DiscoverView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Debounce search/category so we're not firing a request per
  // keystroke — 400ms after the user stops typing, refetch from page 1.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const timer = setTimeout(async () => {
      try {
        const data = await getCampaigns({
          search: search || undefined,
          category: category || undefined,
          page: 1,
          limit: 12,
        });
        if (cancelled) return;
        setCampaigns(data.campaigns);
        setPage(1);
        setPages(data.pages);
      } catch (err) {
        console.error('Could not load campaigns:', err);
        if (!cancelled) setError('Could not load campaigns. Try again in a moment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, category]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await getCampaigns({
        search: search || undefined,
        category: category || undefined,
        page: nextPage,
        limit: 12,
      });
      setCampaigns((prev) => [...prev, ...data.campaigns]);
      setPage(nextPage);
      setPages(data.pages);
    } catch (err) {
      console.error('Could not load more campaigns:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkFaint }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 10,
              border: `1px solid ${C.line}`,
              background: C.card,
              fontSize: 13.5,
              color: C.ink,
              outline: 'none',
            }}
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${C.line}`,
            background: C.card,
            fontSize: 13.5,
            color: C.ink,
            outline: 'none',
          }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.inkSoft }}>
          <Loader2 size={20} className="spin" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13.5 }}>Loading campaigns…</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.inkSoft, fontSize: 13.5 }}>{error}</div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.inkSoft }}>
          <Inbox size={28} style={{ marginBottom: 10, opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: C.ink, marginBottom: 4 }}>
            No campaigns found
          </div>
          <div style={{ fontSize: 13 }}>
            {search || category ? 'Try a different search or category.' : 'Check back soon for new campaigns.'}
          </div>
        </div>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {campaigns.map((c) => (
              <Link
                key={c.id}
                to={`/campaigns/${c.id}`}
                style={{
                  display: 'block',
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 14,
                  padding: 18,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 999,
                    marginBottom: 10,
                    color: c.campaign_type === 'paid' ? C.coral : C.violet,
                    background: c.campaign_type === 'paid' ? C.coralSoft : C.violetSoft,
                  }}
                >
                  {c.campaign_type === 'paid' ? '$ paid' : '🎁 gifted'}
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: C.ink, marginBottom: 6, lineHeight: 1.35 }}>
                  {c.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: C.inkSoft, marginBottom: 4 }}>
                  <Building2 size={13} />
                  {c.brand_name || 'Business'} · {c.category}
                </div>
                {c.brand_location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
                    <MapPin size={13} />
                    {c.brand_location}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  <span style={{ color: C.inkSoft }}>{formatBudget(c) || ' '}</span>
                  {formatDeadline(c.deadline) && (
                    <span style={{ color: C.inkFaint }}>Due {formatDeadline(c.deadline)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {page < pages && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: `1px solid ${C.line}`,
                  background: C.card,
                  color: C.ink,
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: loadingMore ? 'default' : 'pointer',
                }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// BUSINESS VIEW — My Campaigns (placeholder, built out in step 3)
// ------------------------------------------------------------------
function MyCampaignsView() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: C.inkSoft, fontSize: 13.5 }}>
      My Campaigns management is coming in the next step.
    </div>
  );
}

export function Campaigns() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div style={{ minHeight: '100vh', background: C.surface, padding: '32px 24px' }}>
      <style>{`
        .spin { animation: cp-spin 0.8s linear infinite; }
        @keyframes cp-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ color: C.ink, fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
          {role === 'creator' ? 'Discover Collaborations' : 'My Campaigns'}
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 13.5, marginBottom: 24 }}>
          {role === 'creator'
            ? 'Browse open campaigns from businesses looking for creators.'
            : "Manage the campaigns you've created."}
        </p>
        {role === 'creator' ? <DiscoverView /> : <MyCampaignsView />}
      </div>
    </div>
  );
}
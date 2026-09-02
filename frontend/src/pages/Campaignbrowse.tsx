import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Building2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCampaigns, type Campaign, type CampaignListParams } from '../api/client';
import { useAuth } from '../context/AuthContext';

const CORAL = '#FF8A5B';
const CORAL_DARK = '#E86B3E';
const VIOLET = '#6C5DD3';

// Same list as CampaignCreate.tsx — kept local per-file for now rather
// than shared, same reasoning noted there.
const CATEGORIES = [
  'Beauty', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness', 'Travel',
  'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor',
  'Parenting', 'Entertainment',
];

const BUSINESS_STATUSES = ['draft', 'published', 'in_progress', 'completed', 'cancelled', 'closed'];

export function CampaignBrowse() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params: CampaignListParams = { page, limit: 12 };
        if (search) params.search = search;
        if (category) params.category = category;
        if (status) params.status = status;

        const data = await getCampaigns(params);
        if (!cancelled) {
          setCampaigns(data.campaigns);
          setTotal(data.total);
          setPages(data.pages);
        }
      } catch (err) {
        console.error('Could not load campaigns:', err);
        if (!cancelled) setError('Could not load campaigns. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, search, category, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="cb">
      <style>{`
        .cb {
          --coral: ${CORAL};
          --coral-dark: ${CORAL_DARK};
          --violet: ${VIOLET};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: #fbfaff;
          color: var(--ink);
        }
        .cb * { box-sizing: border-box; }

        .cb-topbar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .cb-logo { font-weight: 700; font-size: 17px; }

        .cb-body { max-width: 1080px; margin: 0 auto; padding: 32px 24px 80px; }

        .cb-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .cb-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        .cb-sub { font-size: 13.5px; color: var(--ink-soft); margin: 0; }

        .cb-create-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          background: var(--violet);
          border: none;
          border-radius: 10px;
          padding: 11px 18px;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }

        .cb-filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .cb-search-form { position: relative; flex: 1; min-width: 220px; }
        .cb-search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--ink-soft); }
        .cb-search-input {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 13px 10px 38px;
          font-size: 13.5px;
          font-family: inherit;
          background: #fff;
        }
        .cb-search-input:focus { outline: none; border-color: var(--coral); }
        .cb-select {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 13px;
          font-size: 13.5px;
          font-family: inherit;
          background: #fff;
          color: var(--ink);
        }

        .cb-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 860px) { .cb-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .cb-grid { grid-template-columns: 1fr; } }

        .cb-card {
          display: block;
          text-decoration: none;
          color: inherit;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 18px;
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .cb-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.06); transform: translateY(-2px); }

        .cb-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .cb-card-type {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: #fff1ea;
          color: var(--coral-dark);
          border: 1px solid #ffd9c2;
        }
        .cb-card-status {
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: #f1f0f5;
          color: var(--ink-soft);
          text-transform: capitalize;
        }
        .cb-card-title { font-size: 15.5px; font-weight: 700; line-height: 1.35; margin: 0 0 8px; }
        .cb-card-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          font-size: 12px;
          color: var(--ink-soft);
          margin-bottom: 10px;
        }
        .cb-card-meta-item { display: inline-flex; align-items: center; gap: 3px; }
        .cb-card-desc {
          font-size: 12.5px;
          color: #3d3d42;
          line-height: 1.55;
          margin: 0 0 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .cb-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11.5px;
          color: var(--ink-soft);
          border-top: 1px solid var(--line);
          padding-top: 10px;
        }

        .cb-state { text-align: center; padding: 60px 20px; color: var(--ink-soft); }
        .cb-state-title { font-size: 16px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }

        .cb-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
          margin-top: 32px;
        }
        .cb-page-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink);
          cursor: pointer;
        }
        .cb-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .cb-page-label { font-size: 13px; color: var(--ink-soft); }
      `}</style>

      <div className="cb-topbar">
        <span className="cb-logo">CreatorKhoj</span>
      </div>

      <div className="cb-body">
        <div className="cb-header-row">
          <div>
            <h1 className="cb-title">{isBusiness ? 'My Campaigns' : 'Discover Collabs'}</h1>
            <p className="cb-sub">
              {isBusiness
                ? `${total} campaign${total === 1 ? '' : 's'} you've posted`
                : `${total} open campaign${total === 1 ? '' : 's'} looking for creators`}
            </p>
          </div>
          {isBusiness && (
            <Link to="/campaigns/new" className="cb-create-btn">
              <Plus size={16} /> Create Campaign
            </Link>
          )}
        </div>

        <div className="cb-filters">
          <form className="cb-search-form" onSubmit={handleSearchSubmit}>
            <Search size={15} className="cb-search-icon" />
            <input
              className="cb-search-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search campaigns…"
            />
          </form>

          <select
            className="cb-select"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {isBusiness && (
            <select
              className="cb-select"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All statuses</option>
              {BUSINESS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && <div className="cb-state">Loading campaigns…</div>}

        {!loading && error && <div className="cb-state">{error}</div>}

        {!loading && !error && campaigns.length === 0 && (
          <div className="cb-state">
            <div className="cb-state-title">
              {search || category || status
                ? 'No campaigns match those filters'
                : isBusiness
                ? "You haven't posted a campaign yet"
                : 'No open campaigns right now'}
            </div>
            {isBusiness && !search && !category && !status && (
              <Link to="/campaigns/new" className="cb-create-btn" style={{ display: 'inline-flex', marginTop: 12 }}>
                <Plus size={16} /> Create your first campaign
              </Link>
            )}
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <>
            <div className="cb-grid">
              {campaigns.map((c) => (
                <Link key={c.id} to={`/campaigns/${c.id}`} className="cb-card">
                  <div className="cb-card-top">
                    <span className="cb-card-type">
                      {c.campaign_type === 'paid' ? '$ paid' : '🎁 gifted'}
                    </span>
                    {isBusiness && <span className="cb-card-status">{c.status}</span>}
                  </div>
                  <h3 className="cb-card-title">{c.title}</h3>
                  <div className="cb-card-meta">
                    <span className="cb-card-meta-item">
                      <Building2 size={12} /> {c.brand_name || 'Business'}
                    </span>
                    <span>·</span>
                    <span>{c.category}</span>
                    {c.brand_location && (
                      <>
                        <span>·</span>
                        <span className="cb-card-meta-item">
                          <MapPin size={12} /> {c.brand_location}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="cb-card-desc">{c.description}</p>
                  <div className="cb-card-footer">
                    <span>
                      {c.application_count} applicant{c.application_count === 1 ? '' : 's'}
                    </span>
                    {c.deadline && (
                      <span>
                        Due {new Date(c.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {pages > 1 && (
              <div className="cb-pagination">
                <button
                  className="cb-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="cb-page-label">
                  Page {page} of {pages}
                </span>
                <button
                  className="cb-page-btn"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
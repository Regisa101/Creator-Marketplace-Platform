import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Users,
  BriefcaseBusiness,
} from 'lucide-react';

import {
  getCampaigns,
  getPublicCampaigns,
  type Campaign,
  type CampaignListParams,
} from '../api/client';

import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { Campaigns } from './Campaigns';

type CampaignTabKey = 'all' | 'current' | 'draft' | 'completed' | 'closed';

const TABS: { key: CampaignTabKey; label: string }[] = [
  { key: 'all', label: 'All campaigns' },
  { key: 'current', label: 'Current' },
  { key: 'draft', label: 'Drafts' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Closed' },
];

// Which tab a campaign belongs to, based on its status.
// current   = published + in_progress
// closed    = closed + cancelled
function tabOf(status?: string | null): CampaignTabKey {
  switch (status) {
    case 'published':
    case 'in_progress':
      return 'current';
    case 'draft':
      return 'draft';
    case 'completed':
      return 'completed';
    case 'closed':
    case 'cancelled':
      return 'closed';
    default:
      return 'all';
  }
}

const BUSINESS_PAGE_SIZE = 12;


function formatBudget(campaign: Campaign) {
  const min = campaign.budget_min;
  const max = campaign.budget_max;
  const budget = campaign.budget;

  if (min && max) {
    return `NPR ${min.toLocaleString()}–${max.toLocaleString()}`;
  }

  if (budget) {
    return `NPR ${budget.toLocaleString()}`;
  }

  return 'Budget negotiable';
}

function getPlatforms(campaign: Campaign & {
  required_platform?: string | null;
  required_platforms?: string[] | null;
}) {
  if (
    campaign.required_platforms &&
    campaign.required_platforms.length > 0
  ) {
    return campaign.required_platforms;
  }

  if (campaign.required_platform) {
    return [campaign.required_platform];
  }

  return [];
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function truncate(text: string, length = 150) {
  if (!text) return '';
  return text.length > length
    ? `${text.slice(0, length).trim()}…`
    : text;
}

export function CampaignBrowse() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // /campaigns?source=landing is the public/outer campaign marketplace.
  // Plain /campaigns is intentionally kept for the authenticated dashboard.
  const isLanding = searchParams.get('source') === 'landing';
  const isBusiness = user?.role === 'business';

  const [fetched, setFetched] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // searchInput drives the shared AppLayout topbar search box directly
  // (no separate submit step) — typing immediately updates `search`,
  // which the fetch effect below depends on.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [tab, setTab] = useState<CampaignTabKey>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Only creators refetch when the page changes; business paging is local.
  const creatorPage = isBusiness ? 0 : page;

  useEffect(() => {
    if (isLanding) return;

    let cancelled = false;

    const loadCampaigns = async () => {
      setLoading(true);
      setError('');

      try {
        if (isBusiness) {
          // Businesses: load ALL of their campaigns (the API allows 50 per
          // page) so the tabs can show counts and switch instantly.
          let all: Campaign[] = [];
          let pageNo = 1;
          let lastPage = 1;

          do {
            const params: CampaignListParams = { page: pageNo, limit: 50 };
            if (search) params.search = search;

            const data = await getCampaigns(params);
            all = all.concat(data.campaigns);
            lastPage = Math.max(1, data.pages ?? 1);
            pageNo += 1;
          } while (pageNo <= lastPage && pageNo <= 20);

          if (cancelled) return;
          setFetched(all);
          return;
        }

        // Creators: unchanged public marketplace flow.
        const params: CampaignListParams = { page: creatorPage, limit: 12 };
        if (search) params.search = search;

        const data = await getPublicCampaigns(params);
        if (cancelled) return;

        // Creators should never see internal states (draft, cancelled, closed).
        const visibleCampaigns = data.campaigns.filter(
          (campaign) =>
            campaign.status === 'published' ||
            campaign.status === 'in_progress'
        );

        setFetched(visibleCampaigns);
        setTotal(data.total ?? visibleCampaigns.length);
        setPages(Math.max(1, data.pages ?? 1));
      } catch {
        if (!cancelled) {
          setError('Could not load campaigns. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCampaigns();

    return () => {
      cancelled = true;
    };
    // Business list is fetched once per search; paging/tabs work locally.
  }, [isLanding, isBusiness, search, creatorPage]);

  function handleTopbarSearchChange(value: string) {
    setSearchInput(value);
    setSearch(value.trim());
    setPage(1);
  }

  // ---- Business tabs: counts, filtered list, local pagination ----
  const tabCounts: Record<CampaignTabKey, number> = {
    all: fetched.length,
    current: 0,
    draft: 0,
    completed: 0,
    closed: 0,
  };
  fetched.forEach((c) => {
    const key = tabOf(c.status);
    if (key !== 'all') tabCounts[key] += 1;
  });

  const tabCampaigns = isBusiness
    ? fetched.filter((c) => tab === 'all' || tabOf(c.status) === tab)
    : fetched;

  const pageCount = isBusiness
    ? Math.max(1, Math.ceil(tabCampaigns.length / BUSINESS_PAGE_SIZE))
    : pages;

  const campaigns = isBusiness
    ? tabCampaigns.slice(
        (page - 1) * BUSINESS_PAGE_SIZE,
        page * BUSINESS_PAGE_SIZE
      )
    : fetched;

  if (isLanding) {
    return <Campaigns />;
  }

  const subtitleText = isBusiness
    ? `${fetched.length} campaign${fetched.length === 1 ? '' : 's'} posted`
    : `${total} paid campaign${total === 1 ? '' : 's'} available for creators`;

  // Status filter (business only) now sits directly beside the
  // "Create campaign" button, both rendered together as headerActions
  // in AppLayout's topbar title row — instead of the filter living in
  // its own section above the campaign list.
  const headerActions = (
    <div className="cb-header-actions">
      {isBusiness && (
        <Link className="btn btn-primary" to="/campaigns/new">
          <Plus size={16} />
          Create campaign
        </Link>
      )}
    </div>
  );

  return (
    <AppLayout
      title={isBusiness ? 'My campaigns' : 'Find your next collaboration'}
      subtitle={subtitleText}
      headerActions={headerActions}
      showNotifications
      searchValue={searchInput}
      onSearchChange={handleTopbarSearchChange}
      searchPlaceholder={
        isBusiness
          ? 'Search your campaigns'
          : 'Search campaigns, skills or categories'
      }
    >
      <main className="cb-page">
        <div className="cb-shell">

          {/* TABS (business only) */}
          {isBusiness && !error && (
            <div className="cb-tabs" role="tablist" aria-label="Campaign status">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  className={`cb-tab ${tab === item.key ? 'active' : ''}`}
                  onClick={() => {
                    setTab(item.key);
                    setPage(1);
                  }}
                >
                  {item.label}
                  <span className="cb-tab-count">{tabCounts[item.key]}</span>
                </button>
              ))}
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="cb-state">
              <div className="cb-loader" />
              <span>Loading campaigns…</span>
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="cb-state cb-error">
              <strong>{error}</strong>
            </div>
          )}

          {/* EMPTY */}
          {!loading &&
            !error &&
            campaigns.length === 0 && (
              <div className="cb-state">
                <div className="cb-empty-icon">
                  <BriefcaseBusiness size={22} />
                </div>

                <strong>
                  {isBusiness && fetched.length > 0 && !search
                    ? `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} yet.`
                    : search
                      ? 'No campaigns match your search.'
                      : isBusiness
                        ? 'You have not posted a campaign yet.'
                        : 'No campaigns are available right now.'}
                </strong>

                <span>
                  {search
                    ? 'Try changing your search.'
                    : !isBusiness
                      ? 'Check back soon for new creator opportunities.'
                      : 'Create your first campaign to start finding creators.'}
                </span>

                {isBusiness &&
                  !search &&
                  fetched.length === 0 && (
                    <Link
                      className="btn btn-primary"
                      to="/campaigns/new"
                    >
                      <Plus size={15} />
                      Create your first campaign
                    </Link>
                  )}
              </div>
            )}

          {/* MARKETPLACE LIST */}
          {!loading &&
            !error &&
            campaigns.length > 0 && (
              <>
                <div className="cb-list">

                  {campaigns.map((campaign) => {
                    const publicCampaign =
                      campaign as Campaign & {
                        brand_name?: string | null;
                        brand_location?: string | null;
                        brand_logo?: string | null;
                        required_platform?: string | null;
                        required_platforms?: string[] | null;
                      };

                    const platforms =
                      getPlatforms(publicCampaign);

                    return (
                      <div
                        key={campaign.id}
                        className="cb-card"
                      >
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="cb-card-main"
                        >

                        {/* TOP ROW: tags + Apply now / status */}
                        <div className="cb-card-header">
                          <div className="cb-header-tags">
                            <span className="cb-tag cb-tag-main">
                              {campaign.category}
                            </span>

                            {campaign.engagement_type && (
                              <span className="cb-pill">
                                {campaign.engagement_type}
                              </span>
                            )}

                            {campaign.work_arrangement && (
                              <span className="cb-pill">
                                {campaign.work_arrangement}
                              </span>
                            )}
                          </div>

                          {isBusiness ? (
                            <span
                              className={`cb-status cb-status--${campaign.status}`}
                            >
                              {formatStatus(campaign.status)}
                            </span>
                          ) : (
                            <span className="cb-apply">Apply now</span>
                          )}
                        </div>

                        {/* TITLE */}
                        <h2 className="cb-title">
                          {campaign.title}
                        </h2>

                        {/* DESCRIPTION */}
                        <p className="cb-description">
                          {truncate(campaign.description || '')}
                        </p>

                        </Link>

                        {/* BRAND */}
                        <div className="cb-brand">
                          <div className="cb-brand-label">
                            About the business
                          </div>

                          <Link
                            to={`/brands/${campaign.business_id}`}
                            className="cb-business-profile-link"
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`View ${publicCampaign.brand_name || 'Business'} business profile`}
                          >
                            <div className="cb-business-avatar">
                              {publicCampaign.brand_logo ? (
                                <img
                                  src={publicCampaign.brand_logo}
                                  alt={`${publicCampaign.brand_name || 'Business'} logo`}
                                />
                              ) : (
                                <span>
                                  {(publicCampaign.brand_name || 'Business')
                                    .trim()
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="cb-business-copy">
                              <strong>
                                {publicCampaign.brand_name || 'Business'}
                              </strong>

                              {!isBusiness && publicCampaign.brand_location && (
                                <span className="cb-business-location">
                                  <MapPin size={11} />
                                  {publicCampaign.brand_location}
                                </span>
                              )}
                            </div>

                            <ChevronRight
                              size={15}
                              className="cb-business-arrow"
                            />
                          </Link>
                        </div>

                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="cb-card-main cb-card-lower"
                        >

                        {/* JOB META */}
                        <div className="cb-job-meta">

                          {campaign.location && (
                            <span>
                              <MapPin size={14} />
                              {campaign.location}
                            </span>
                          )}

                          {campaign.experience_level && (
                            <span>
                              <Users size={14} />
                              {campaign.experience_level}
                            </span>
                          )}

                          {campaign.engagement_type && (
                            <span>
                              <BriefcaseBusiness size={14} />
                              {campaign.engagement_type}
                            </span>
                          )}

                          {campaign.duration && (
                            <span>
                              <Clock3 size={14} />
                              {campaign.duration}
                            </span>
                          )}
                        </div>

                        {/* SKILLS */}
                        {(campaign.required_skills?.length ||
                          platforms.length > 0) && (
                          <div className="cb-tags">

                            {campaign.required_skills
                              ?.slice(0, 4)
                              .map((skill) => (
                                <span
                                  className="cb-tag"
                                  key={skill}
                                >
                                  {skill}
                                </span>
                              ))}

                            {platforms
                              .slice(0, 2)
                              .map((platform) => (
                                <span
                                  className="cb-tag"
                                  key={platform}
                                >
                                  {platform}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* BOTTOM */}
                        <div className="cb-card-footer">

                          <div className="cb-budget">
                            <span className="cb-budget-label">
                              Budget
                            </span>

                            <strong>
                              {formatBudget(campaign)}
                            </strong>
                          </div>

                          <div className="cb-footer-right">
                            <span>
                              <Users size={14} />
                              {campaign.creators_needed}{' '}
                              creator
                              {campaign.creators_needed ===
                              1
                                ? ''
                                : 's'}
                            </span>

                            {isBusiness && (
                              <span>
                                {campaign.application_count ||
                                  0}{' '}
                                applicants
                              </span>
                            )}
                          </div>
                        </div>

                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION */}
                {pageCount > 1 && (
                  <div className="cb-pagination">

                    <button
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((value) => value - 1)
                      }
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={17} />
                    </button>

                    <span>
                      Page {page} of {pageCount}
                    </span>

                    <button
                      disabled={page >= pageCount}
                      onClick={() =>
                        setPage((value) => value + 1)
                      }
                      aria-label="Next page"
                    >
                      <ChevronRight size={17} />
                    </button>

                  </div>
                )}
              </>
            )}
        </div>

        <style>{STYLE}</style>
      </main>
    </AppLayout>
  );
}

const STYLE = `
.cb-page{
  background:transparent;
  color:#111;
  font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  padding:8px 24px 60px;
}

.cb-shell{
  max-width:1080px;
  margin:0 auto;
  background:transparent;
}

/* HEADER ACTIONS — status select + Create campaign, side by side,
   rendered inside AppLayout's topbar title row via headerActions. */

.cb-header-actions{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

/* BUTTON */

.cb-primary{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  min-height:40px;
  padding:0 15px;
  background:#111;
  color:#fff;
  border:1px solid #111;
  border-radius:8px;
  text-decoration:none;
  font-size:12px;
  font-weight:600;
  white-space:nowrap;
  transition:background .15s ease;
}

/* Explicitly pin the text color on hover/focus/visited so nothing
   (browser defaults, global link styles, :visited) can turn the label
   black — only the background darkens. */
.cb-primary,
.cb-primary:link,
.cb-primary:visited,
.cb-primary:hover,
.cb-primary:focus,
.cb-primary:active{
  color:#fff !important;
}

.cb-primary:hover{
  background:#2b2b2b;
}

/* TABS */

.cb-tabs{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin:0 0 22px;
}

.cb-tab{
  display:inline-flex;
  align-items:center;
  gap:8px;
  height:34px;
  padding:0 14px;
  border:1px solid #dedede;
  border-radius:999px;
  background:#fff;
  color:#111;
  font:500 12.5px Poppins,sans-serif;
  cursor:pointer;
  transition:background-color .15s ease,border-color .15s ease,color .15s ease;
}

.cb-tab:hover{
  background:#f5f5f5;
  border-color:#c4c4c4;
}

.cb-tab.active{
  background:#111;
  color:#fff;
  border-color:#111;
}

.cb-tab-count{
  min-width:20px;
  height:18px;
  padding:0 6px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:999px;
  background:#f0f0f0;
  color:#555;
  font-size:10.5px;
  font-weight:600;
}

.cb-tab.active .cb-tab-count{
  background:rgba(255,255,255,.2);
  color:#fff;
}

/* LIST */

.cb-list{
  display:flex;
  flex-direction:column;
  gap:11px;
  background:transparent;
}

/* CARD — no white background, just a hairline separator */

.cb-card{
  display:block;
  background:transparent;
  border:0;
  border-bottom:1px solid #e6e6e6;
  border-radius:0;
  padding:20px 2px 22px;
  text-decoration:none;
  color:#111;
  transition:background .16s ease;
}

.cb-list .cb-card:first-child{
  padding-top:2px;
}

.cb-list .cb-card:last-child{
  border-bottom:0;
}

.cb-card:hover{
  background:rgba(0,0,0,.02);
}

/* CARD HEADER */

.cb-card-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:15px;
  margin-bottom:14px;
}

.cb-brand{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
}

.cb-card-main{
  display:block;
  color:inherit;
  text-decoration:none;
}

/* BUSINESS PROFILE */
.cb-brand{
  display:block;
  min-width:0;
  margin-bottom:14px;
}

.cb-brand-label{
  margin-bottom:10px;
  color:#111;
  font-size:11px;
  font-weight:600;
}

.cb-business-profile-link{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:0;
  color:#111;
  text-decoration:none;
  border-radius:8px;
  padding:2px 0;
}

.cb-business-profile-link:hover .cb-business-copy strong{
  text-decoration:underline;
}

.cb-business-profile-link:hover .cb-business-avatar{
  border-color:#bbb;
}

.cb-business-avatar{
  width:40px;
  height:40px;
  flex:0 0 40px;
  display:grid;
  place-items:center;
  overflow:hidden;
  border-radius:9px;
  background:#f3f3f3;
  border:1px solid #e8e8e8;
  color:#333;
  font-size:14px;
  font-weight:600;
}

.cb-business-avatar img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.cb-business-copy{
  min-width:0;
  flex:1;
}

.cb-business-copy strong{
  display:block;
  color:#111;
  font-size:11.5px;
  font-weight:600;
  line-height:1.35;
}

.cb-business-location{
  display:flex;
  align-items:center;
  gap:3px;
  margin-top:3px;
  color:#777;
  font-size:10px;
  line-height:1.35;
}

.cb-business-arrow{
  flex:0 0 auto;
  color:#777;
}

.cb-brand-logo{
  width:34px;
  height:34px;
  border-radius:8px;
  background:#f4f4f4;
  border:1px solid #e8e8e8;
  display:grid;
  place-items:center;
  color:#555;
  overflow:hidden;
  flex-shrink:0;
}

.cb-brand-logo img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.cb-brand-name{
  display:block;
  font-size:12px;
  font-weight:600;
  color:#333;
}

.cb-brand-location{
  display:block;
  margin-top:2px;
  color:#999;
  font-size:10.5px;
}

/* STATUS */

.cb-status{
  display:inline-flex;
  align-items:center;
  border:1px solid #ddd;
  border-radius:999px;
  padding:4px 9px;
  font-size:10px;
  font-weight:500;
  text-transform:capitalize;
  color:#666;
  white-space:nowrap;
}

.cb-status--published{
  color:#222;
  border-color:#cfcfcf;
}

.cb-status--draft{
  background:#f5f5f5;
  color:#555;
}

.cb-status--completed{
  background:#e9f6ee;
  color:#1e8a4c;
  border-color:#cfe8d9;
}

.cb-status--closed,
.cb-status--cancelled{
  background:#f3f2f4;
  color:#77717e;
}

.cb-status--in_progress{
  background:#f7f7f7;
  color:#222;
}

/* TITLE */

.cb-title{
  margin:0 0 9px;
  max-width:760px;
  font-family:"League Spartan",Poppins,sans-serif;
  font-size:20px;
  line-height:1.25;
  font-weight:500;
  letter-spacing:-.02em;
}

/* DESCRIPTION */

.cb-description{
  max-width:800px;
  margin:0 0 15px;
  color:#606060;
  font-size:12px;
  line-height:1.65;
}

/* JOB META */

.cb-job-meta{
  display:flex;
  flex-wrap:wrap;
  gap:15px;
  margin-bottom:14px;
  color:#707070;
  font-size:11px;
}

.cb-job-meta span{
  display:inline-flex;
  align-items:center;
  gap:5px;
}

.cb-job-meta svg{
  color:#888;
}

/* TAGS */

.cb-tags{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-bottom:17px;
}

.cb-tag{
  padding:5px 9px;
  border-radius:5px;
  background:#f5f5f5;
  color:#555;
  font-size:10.5px;
  font-weight:500;
}

.cb-tag-main{
  background:#111;
  color:#fff;
}

/* FOOTER */

.cb-card-footer{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:20px;
  border-top:1px solid #ededed;
  padding-top:14px;
}

.cb-budget{
  display:flex;
  flex-direction:column;
  gap:3px;
}

.cb-budget-label{
  color:#999;
  font-size:9.5px;
  text-transform:uppercase;
  letter-spacing:.08em;
}

.cb-budget strong{
  font-size:13px;
  font-weight:600;
  color:#111;
}

.cb-footer-right{
  display:flex;
  align-items:center;
  gap:13px;
  color:#888;
  font-size:10.5px;
}

.cb-footer-right span{
  display:inline-flex;
  align-items:center;
  gap:5px;
}

/* STATES */

.cb-state{
  min-height:350px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:9px;
  color:#777;
  font-size:12px;
  text-align:center;
}

.cb-state strong{
  color:#333;
  font-size:13px;
}

.cb-state span{
  color:#999;
}

.cb-empty-icon{
  width:48px;
  height:48px;
  border:1px solid #e2e2e2;
  border-radius:12px;
  display:grid;
  place-items:center;
  color:#777;
  margin-bottom:3px;
}

.cb-error{
  color:#777;
}

/* LOADER */

.cb-loader{
  width:22px;
  height:22px;
  border:2px solid #e5e5e5;
  border-top-color:#111;
  border-radius:50%;
  animation:cb-spin .7s linear infinite;
}

@keyframes cb-spin{
  to{
    transform:rotate(360deg);
  }
}

/* PAGINATION */

.cb-pagination{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:12px;
  margin-top:26px;
  color:#777;
  font-size:11px;
}

.cb-pagination button{
  width:34px;
  height:34px;
  border:1px solid #ddd;
  border-radius:7px;
  background:#fff;
  color:#333;
  display:grid;
  place-items:center;
  cursor:pointer;
}

.cb-pagination button:hover:not(:disabled){
  border-color:#aaa;
}

.cb-pagination button:disabled{
  opacity:.35;
  cursor:not-allowed;
}


/* ---- Wireframe card: tags + Apply now, title, description ---- */

.cb-card{
  background:#fff;
  border:1px solid #e4e1d9;
  border-radius:14px;
  padding:18px 20px 18px;
}

.cb-list{
  gap:14px;
}

.cb-list .cb-card:first-child{
  padding-top:18px;
}

.cb-list .cb-card:last-child{
  border-bottom:1px solid #e4e1d9;
}

.cb-card:hover{
  background:#fff;
  border-color:#cfcbc0;
}

.cb-header-tags{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
}

.cb-pill{
  padding:5px 10px;
  border:1px solid #e0e0e0;
  border-radius:999px;
  color:#666;
  font-size:10px;
  text-transform:capitalize;
}

.cb-header-tags .cb-tag-main{
  border-radius:999px;
  padding:5px 10px;
  font-size:10px;
}

.cb-apply{
  flex:none;
  padding:7px 15px;
  background:#111;
  color:#fff;
  border-radius:8px;
  font-size:11px;
  font-weight:600;
}

.cb-card:hover .cb-apply{
  background:#2b2b2b;
}

/* RESPONSIVE */

@media(max-width:700px){

  .cb-page{
    padding:10px 14px 50px;
  }

  .cb-header-actions{
    width:100%;
  }

  .cb-tabs{
    flex-wrap:nowrap;
    overflow-x:auto;
    padding-bottom:4px;
  }

  .cb-tab{
    flex:0 0 auto;
  }

  .cb-card{
    padding:16px 0 18px;
  }

  .cb-title{
    font-size:18px;
  }

  .cb-card-footer{
    align-items:flex-start;
    flex-direction:column;
  }

  .cb-footer-right{
    flex-wrap:wrap;
  }
}
`;
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Building2,
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

const STATUSES = [
  'draft',
  'published',
  'in_progress',
  'completed',
  'cancelled',
  'closed',
];

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
  if (searchParams.get('source') === 'landing') {
    return <Campaigns />;
  }
  const isBusiness = user?.role === 'business';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // searchInput drives the shared AppLayout topbar search box directly
  // (no separate submit step) — typing immediately updates `search`,
  // which the fetch effect below depends on.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [status, setStatus] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadCampaigns = async () => {
      setLoading(true);
      setError('');

      try {
        const params: CampaignListParams = {
          page,
          limit: 12,
        };

        if (search) {
          params.search = search;
        }

        if (isBusiness && status) {
          params.status = status;
        }

        const data = isBusiness
          ? await getCampaigns(params)
          : await getPublicCampaigns(params);

        if (cancelled) return;

        let visibleCampaigns = data.campaigns;

        /*
         * Creators should never see internal campaign states such as
         * draft, cancelled, or closed.
         *
         * Public campaigns are still allowed to be:
         * published
         * in_progress
         */
        if (!isBusiness) {
          visibleCampaigns = data.campaigns.filter(
            (campaign) =>
              campaign.status === 'published' ||
              campaign.status === 'in_progress'
          );
        }

        setCampaigns(visibleCampaigns);
        setTotal(data.total ?? visibleCampaigns.length);
        setPages(Math.max(1, data.pages ?? 1));
      } catch (err) {
        if (!cancelled) {
          setError(
            'Could not load campaigns. Please try again.'
          );
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
  }, [page, search, status, isBusiness]);

  function handleTopbarSearchChange(value: string) {
    setSearchInput(value);
    setSearch(value.trim());
    setPage(1);
  }

  const subtitleText = isBusiness
    ? `${total} campaign${total === 1 ? '' : 's'} posted`
    : `${total} paid campaign${total === 1 ? '' : 's'} available for creators`;

  // Status filter (business only) now sits directly beside the
  // "Create campaign" button, both rendered together as headerActions
  // in AppLayout's topbar title row — instead of the filter living in
  // its own section above the campaign list.
  const headerActions = (
    <div className="cb-header-actions">
      {isBusiness && (
        <select
          className="cb-status-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>

          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {formatStatus(item)}
            </option>
          ))}
        </select>
      )}

      {isBusiness && (
        <Link className="cb-primary" to="/campaigns/new">
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
                  {search || status
                    ? 'No campaigns match your filters.'
                    : isBusiness
                      ? 'You have not posted a campaign yet.'
                      : 'No campaigns are available right now.'}
                </strong>

                <span>
                  {search || status
                    ? 'Try changing your search or filters.'
                    : !isBusiness
                      ? 'Check back soon for new creator opportunities.'
                      : 'Create your first campaign to start finding creators.'}
                </span>

                {isBusiness &&
                  !search &&
                  !status && (
                    <Link
                      className="cb-primary"
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
                      <Link
                        key={campaign.id}
                        to={`/campaigns/${campaign.id}`}
                        className="cb-card"
                      >

                        {/* TOP ROW */}
                        <div className="cb-card-header">

                          <div className="cb-brand">
                            <div className="cb-brand-logo">
                              {publicCampaign.brand_logo ? (
                                <img
                                  src={
                                    publicCampaign.brand_logo
                                  }
                                  alt=""
                                />
                              ) : (
                                <Building2 size={17} />
                              )}
                            </div>

                            <div>
                              <span className="cb-brand-name">
                                {publicCampaign.brand_name ||
                                  'Business'}
                              </span>

                              {!isBusiness &&
                                publicCampaign.brand_location && (
                                  <span className="cb-brand-location">
                                    {publicCampaign.brand_location}
                                  </span>
                                )}
                            </div>
                          </div>

                          {isBusiness && (
                            <span
                              className={`cb-status cb-status--${campaign.status}`}
                            >
                              {formatStatus(
                                campaign.status
                              )}
                            </span>
                          )}
                        </div>

                        {/* TITLE */}
                        <h2 className="cb-title">
                          {campaign.title}
                        </h2>

                        {/* DESCRIPTION */}
                        <p className="cb-description">
                          {truncate(
                            campaign.description || ''
                          )}
                        </p>

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
                          campaign.category ||
                          platforms.length > 0) && (
                          <div className="cb-tags">

                            {campaign.category && (
                              <span className="cb-tag cb-tag-main">
                                {campaign.category}
                              </span>
                            )}

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
                    );
                  })}
                </div>

                {/* PAGINATION */}
                {pages > 1 && (
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
                      Page {page} of {pages}
                    </span>

                    <button
                      disabled={page >= pages}
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

/* STATUS SELECT */

.cb-status-select{
  height:40px;
  border:1px solid #dedede;
  border-radius:8px;
  background:#fff;
  padding:0 12px;
  font:inherit;
  font-size:12px;
  color:#222;
  outline:none;
}

.cb-status-select:focus{
  border-color:#999;
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

/* RESPONSIVE */

@media(max-width:700px){

  .cb-page{
    padding:10px 14px 50px;
  }

  .cb-header-actions{
    width:100%;
  }

  .cb-status-select{
    flex:1;
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
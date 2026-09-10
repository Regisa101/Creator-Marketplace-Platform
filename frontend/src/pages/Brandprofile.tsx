import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { getPublicBusinessProfile, type PublicBusinessProfile } from '../api/client';
import { LogoMark, BRAND_NAME } from '../components/Brand';

const CORAL = '#FF6B5A';
const CORAL_DARK = '#F0523F';
const VIOLET = '#1E2A78';

function normalizeWebsite(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function getInitial(name?: string | null): string {
  return (name?.trim()?.[0] || 'B').toUpperCase();
}

export function BrandProfile() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<PublicBusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!businessId) {
      setError('Brand profile not found.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getPublicBusinessProfile(businessId);
        if (!cancelled) setBrand(data);
      } catch (err: any) {
        console.error('Could not load brand profile:', err);
        if (!cancelled) {
          setError(
            err?.response?.data?.detail || 'This brand profile could not be loaded.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (loading) {
    return (
      <div className="bp bp-state">
        <style>{brandStyles}</style>
        <div className="bp-loader">Loading brand profile…</div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="bp bp-state">
        <style>{brandStyles}</style>
        <div className="bp-error-title">Brand profile unavailable</div>
        <div className="bp-error-text">{error || 'This brand could not be found.'}</div>
        <button className="bp-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Go back
        </button>
      </div>
    );
  }

  const categories = brand.interested_categories || [];
  const contentTypes = brand.preferred_content_types || [];
  const campaigns = brand.campaigns || [];
  const website = brand.website?.trim() ? normalizeWebsite(brand.website.trim()) : '';

  return (
    <div className="bp">
      <style>{brandStyles}</style>

      <header className="bp-topbar">
        <div className="bp-topbar-inner">
          <Link to="/campaigns" className="bp-logo" aria-label={BRAND_NAME}>
            <LogoMark size={25} />
            <span>{BRAND_NAME}</span>
          </Link>
          <nav className="bp-nav" aria-label="Brand profile navigation">
            <Link to="/campaigns" className="bp-nav-link">
              Browse Campaigns
            </Link>
          </nav>
        </div>
      </header>

      <main className="bp-wrap">
        <div className="bp-breadcrumb">
          <Link to="/campaigns">Campaigns</Link>
          <span>/</span>
          <span>{brand.company_name}</span>
        </div>

        <button className="bp-back bp-back-top" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>

        <section className="bp-hero">
          <div className="bp-hero-main">
            <div className="bp-avatar">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={`${brand.company_name} logo`} />
              ) : (
                getInitial(brand.company_name)
              )}
            </div>

            <div className="bp-hero-copy">
              <div className="bp-kicker">
                <Sparkles size={13} /> Brand Profile
              </div>
              <h1 className="bp-name">{brand.company_name}</h1>

              <div className="bp-meta">
                {brand.industry && (
                  <span>
                    <BriefcaseBusiness size={14} /> {brand.industry}
                  </span>
                )}
                {brand.business_type && (
                  <span>
                    <Building2 size={14} /> {brand.business_type}
                  </span>
                )}
                {brand.location && (
                  <span>
                    <MapPin size={14} /> {brand.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bp-actions">
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="bp-secondary"
              >
                <Globe size={14} /> Website <ExternalLink size={12} />
              </a>
            )}
          </div>
        </section>

        <div className="bp-grid">
          <div className="bp-main">
            {brand.description && (
              <section className="bp-card">
                <h2 className="bp-card-title">
                  <Building2 size={17} /> About the Brand
                </h2>
                <p className="bp-text">{brand.description}</p>
              </section>
            )}

            {(categories.length > 0 || contentTypes.length > 0) && (
              <section className="bp-card">
                <h2 className="bp-card-title">
                  <Sparkles size={17} /> Creator Collaboration
                </h2>

                {categories.length > 0 && (
                  <div className="bp-field-group">
                    <div className="bp-field-label">Interested categories</div>
                    <div className="bp-chips">
                      {categories.map((item, index) => (
                        <span className="bp-chip" key={`${item}-${index}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {contentTypes.length > 0 && (
                  <div className="bp-field-group">
                    <div className="bp-field-label">Preferred content types</div>
                    <div className="bp-chips">
                      {contentTypes.map((item, index) => (
                        <span className="bp-chip" key={`${item}-${index}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="bp-card">
              <div className="bp-section-heading-row">
                <h2 className="bp-card-title bp-card-title-no-margin">
                  <Sparkles size={17} /> Published Campaigns
                </h2>
                <span className="bp-count">{campaigns.length}</span>
              </div>

              {campaigns.length > 0 ? (
                <div className="bp-campaign-list">
                  {campaigns.map((campaign) => (
                    <Link
                      key={campaign.id}
                      to={`/campaigns/${campaign.id}`}
                      className="bp-campaign"
                    >
                      <div className="bp-campaign-main">
                        <div className="bp-campaign-title">{campaign.title}</div>
                        <div className="bp-campaign-meta">
                          {campaign.category}
                          {campaign.sub_category ? ` · ${campaign.sub_category}` : ''}
                        </div>
                      </div>
                      <div className="bp-campaign-right">
                        <span className="bp-campaign-type">
                          {campaign.campaign_type}
                        </span>
                        <ArrowUpRight size={15} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bp-empty">
                  This brand does not have any published campaigns right now.
                </div>
              )}
            </section>
          </div>

          <aside className="bp-side">
            <section className="bp-card">
              <h2 className="bp-card-title">
                <BriefcaseBusiness size={17} /> Business Details
              </h2>

              <div className="bp-details">
                <div className="bp-detail">
                  <div className="bp-detail-label">Industry</div>
                  <div className="bp-detail-value">
                    {brand.industry || 'Not specified'}
                  </div>
                </div>

                <div className="bp-detail">
                  <div className="bp-detail-label">Business type</div>
                  <div className="bp-detail-value">
                    {brand.business_type || 'Not specified'}
                  </div>
                </div>

                <div className="bp-detail">
                  <div className="bp-detail-label">Location</div>
                  <div className="bp-detail-value">
                    {brand.location || 'Not specified'}
                  </div>
                </div>

                <div className="bp-detail">
                  <div className="bp-detail-label">Team size</div>
                  <div className="bp-detail-value">
                    {brand.team_size || 'Not specified'}
                  </div>
                </div>

                <div className="bp-detail">
                  <div className="bp-detail-label">Year established</div>
                  <div className="bp-detail-value">
                    {brand.year_established || 'Not specified'}
                  </div>
                </div>

                {website && (
                  <div className="bp-detail">
                    <div className="bp-detail-label">Website</div>
                    <div className="bp-detail-value">
                      <a href={website} target="_blank" rel="noreferrer">
                        Visit website <ExternalLink size={12} style={{ verticalAlign: -1 }} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bp-card">
              <h2 className="bp-card-title">
                <Users size={17} /> Collaboration Snapshot
              </h2>

              <div className="bp-stat-grid">
                <div className="bp-stat">
                  <div className="bp-stat-number">{campaigns.length}</div>
                  <div className="bp-stat-label">Published campaigns</div>
                </div>
                <div className="bp-stat">
                  <div className="bp-stat-number">{categories.length}</div>
                  <div className="bp-stat-label">Categories</div>
                </div>
                <div className="bp-stat">
                  <div className="bp-stat-number">{contentTypes.length}</div>
                  <div className="bp-stat-label">Content types</div>
                </div>
              </div>
            </section>

            <section className="bp-card">
              <h2 className="bp-card-title"><CheckCircle2 size={17} /> Completed Collaborations</h2>
              <div className="bp-stat-grid">
                <div className="bp-stat"><div className="bp-stat-number">{brand.completed_collaborations ?? 0}</div><div className="bp-stat-label">Completed</div></div>
                <div className="bp-stat"><div className="bp-stat-number">{brand.creators_worked_with ?? 0}</div><div className="bp-stat-label">Creators worked with</div></div>
              </div>
              {Array.isArray(brand.work_history) && brand.work_history.length > 0 && (
                <div style={{display:'grid',gap:9,marginTop:16}}>
                  {brand.work_history.map((item:any)=><div key={item.application_id} style={{border:'1px solid #ececf2',borderRadius:10,padding:'10px 12px'}}><div style={{fontWeight:700,fontSize:12.5}}>{item.campaign_title}</div><div style={{fontSize:11,color:'#6b6478',marginTop:3}}>{item.creator_name || `Creator #${item.creator_id}`} · Completed</div></div>)}
                </div>
              )}
            </section>

            <section className="bp-card bp-note-card">
              <CalendarDays size={17} color={CORAL_DARK} />
              <div>
                <div className="bp-note-title">Working with {brand.company_name}</div>
                <div className="bp-note-text">
                  Review the brand profile and published campaigns before applying to understand the kind of creator collaboration they are looking for.
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

const brandStyles = `
  .bp {
    --coral: ${CORAL};
    --coral-dark: ${CORAL_DARK};
    --violet: ${VIOLET};
    --ink: #111217;
    --ink-soft: #6c6d73;
    --line: #e6e6ea;
    min-height: 100vh;
    background: #f7f7f8;
    color: var(--ink);
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .bp * { box-sizing: border-box; }
  .bp-topbar {
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    background: #fff;
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .bp-topbar-inner {
    width: 100%;
    max-width: 1240px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .bp-logo {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--ink);
    text-decoration: none;
    font-size: 18px;
    font-weight: 700;
  }
  .bp-nav { display: flex; align-items: center; gap: 16px; }
  .bp-nav-link {
    color: var(--ink-soft);
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 600;
  }
  .bp-nav-link:hover { color: var(--ink); }
  .bp-wrap {
    max-width: 1120px;
    margin: 0 auto;
    padding: 26px 24px 72px;
  }
  .bp-breadcrumb {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #8a8b92;
    font-size: 12px;
    margin-bottom: 10px;
    white-space: nowrap;
    overflow: hidden;
  }
  .bp-breadcrumb a { color: #686973; text-decoration: none; font-weight: 600; }
  .bp-breadcrumb span:last-child { overflow: hidden; text-overflow: ellipsis; }
  .bp-back {
    border: 0;
    background: transparent;
    color: var(--ink-soft);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    padding: 7px 0;
  }
  .bp-back:hover { color: var(--ink); }
  .bp-back-top { margin-bottom: 16px; }
  .bp-hero {
    background: #fff;
    border: 1px solid rgba(255,107,90,.25);
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 0 0 1px rgba(30,42,120,.03), 0 12px 30px rgba(30,42,120,.07), 0 0 34px rgba(255,107,90,.08);
  }
  .bp-hero-main { display: flex; align-items: flex-start; gap: 20px; min-width: 0; }
  .bp-avatar {
    width: 88px;
    height: 88px;
    border-radius: 20px;
    overflow: hidden;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--coral);
    color: #fff;
    font-size: 30px;
    font-weight: 800;
    border: 1px solid rgba(0,0,0,.05);
  }
  .bp-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .bp-hero-copy { min-width: 0; }
  .bp-kicker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--coral-dark);
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 7px;
  }
  .bp-name {
    font-size: 31px;
    line-height: 1.2;
    margin: 0;
    font-weight: 750;
    letter-spacing: -.35px;
  }
  .bp-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin-top: 13px;
    color: var(--ink-soft);
    font-size: 13px;
  }
  .bp-meta span { display: inline-flex; align-items: center; gap: 5px; }
  .bp-actions { margin-top: 20px; display: flex; gap: 9px; flex-wrap: wrap; }
  .bp-secondary {
    min-height: 40px;
    border-radius: 10px;
    padding: 9px 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
    color: var(--ink);
    background: #fff;
    border: 1px solid var(--line);
  }
  .bp-secondary:hover { border-color: #cfcfd5; }
  .bp-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 315px;
    gap: 18px;
    margin-top: 18px;
    align-items: start;
  }
  .bp-main, .bp-side { display: flex; flex-direction: column; gap: 18px; }
  .bp-side { position: sticky; top: 82px; }
  .bp-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 21px;
  }
  .bp-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 750;
    margin: 0 0 13px;
  }
  .bp-card-title svg { color: var(--coral-dark); flex-shrink: 0; }
  .bp-card-title-no-margin { margin-bottom: 0; }
  .bp-section-heading-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .bp-count {
    min-width: 28px;
    height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #fff1ea;
    color: var(--coral-dark);
    font-size: 11.5px;
    font-weight: 700;
  }
  .bp-text {
    margin: 0;
    color: #3d3d42;
    font-size: 14px;
    line-height: 1.78;
    white-space: pre-wrap;
  }
  .bp-field-group + .bp-field-group { margin-top: 18px; }
  .bp-field-label { color: var(--ink-soft); font-size: 12px; font-weight: 650; margin-bottom: 8px; }
  .bp-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .bp-chip {
    border: 1px solid #ffd9c2;
    background: #fff7f2;
    color: var(--coral-dark);
    border-radius: 999px;
    padding: 6px 11px;
    font-size: 12px;
    font-weight: 600;
  }
  .bp-details { display: flex; flex-direction: column; gap: 9px; }
  .bp-detail { padding: 12px 13px; border: 1px solid var(--line); border-radius: 10px; }
  .bp-detail-label { color: var(--ink-soft); font-size: 11.5px; margin-bottom: 4px; }
  .bp-detail-value { font-size: 13px; font-weight: 600; line-height: 1.45; word-break: break-word; }
  .bp-detail-value a { color: var(--violet); text-decoration: none; }
  .bp-detail-value a:hover { text-decoration: underline; }
  .bp-campaign-list { display: flex; flex-direction: column; }
  .bp-campaign {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: inherit;
    text-decoration: none;
    padding: 14px 2px;
    border-top: 1px solid var(--line);
    transition: transform .16s ease, padding .16s ease;
  }
  .bp-campaign:first-child { border-top: 0; padding-top: 2px; }
  .bp-campaign:hover { transform: translateX(2px); }
  .bp-campaign-main { min-width: 0; }
  .bp-campaign-title { font-size: 13.5px; font-weight: 700; line-height: 1.4; margin-bottom: 5px; }
  .bp-campaign-meta { color: var(--ink-soft); font-size: 12px; }
  .bp-campaign-right { display: flex; align-items: center; gap: 8px; color: var(--coral-dark); flex: 0 0 auto; }
  .bp-campaign-type {
    border: 1px solid #ffd9c2;
    background: #fff7f2;
    border-radius: 999px;
    padding: 4px 8px;
    color: var(--coral-dark);
    font-size: 10.5px;
    font-weight: 700;
    text-transform: capitalize;
  }
  .bp-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .bp-stat { text-align: center; border: 1px solid var(--line); border-radius: 11px; padding: 12px 7px; }
  .bp-stat-number { font-size: 18px; font-weight: 750; }
  .bp-stat-label { color: var(--ink-soft); font-size: 10px; line-height: 1.3; margin-top: 3px; }
  .bp-note-card { display: flex; align-items: flex-start; gap: 10px; }
  .bp-note-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
  .bp-note-text { color: var(--ink-soft); font-size: 12.5px; line-height: 1.6; }
  .bp-empty { color: var(--ink-soft); font-size: 13px; line-height: 1.6; }
  .bp-state { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--ink-soft); gap: 8px; padding: 24px; text-align: center; }
  .bp-error-title { color: var(--ink); font-size: 18px; font-weight: 700; }
  .bp-error-text { font-size: 13px; }
  .bp-loader { font-size: 14px; }
  @media (max-width: 850px) {
    .bp-grid { grid-template-columns: 1fr; }
    .bp-side { position: static; }
  }
  @media (max-width: 600px) {
    .bp-topbar { padding: 0 16px; }
    .bp-wrap { padding: 20px 16px 52px; }
    .bp-hero { padding: 20px; }
    .bp-hero-main { flex-direction: column; }
    .bp-name { font-size: 26px; }
    .bp-avatar { width: 72px; height: 72px; border-radius: 16px; font-size: 25px; }
    .bp-campaign { align-items: flex-start; }
    .bp-campaign-right { flex-direction: column; align-items: flex-end; }
  }
`;

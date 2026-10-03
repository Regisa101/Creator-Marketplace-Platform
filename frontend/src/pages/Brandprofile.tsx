import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, ExternalLink, Globe, Link2, MapPin } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPublicBusinessProfile, type PublicBusinessProfile } from '../api/client';
import { PublicNavbar } from '../components/PublicNavbar';
import {
  Lightbox,
  PublicProfileStyles,
  Section,
  externalHref,
  mediaUrl,
  type LightboxItem,
} from '../components/PublicProfileKit';

function initials(name?: string | null) {
  const parts = (name || 'Business').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0] || 'B').slice(0, 2).toUpperCase();
}

export function BrandProfile() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<LightboxItem | null>(null);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getPublicBusinessProfile(businessId)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((err: any) => {
        if (!cancelled) setError(err?.response?.data?.detail || 'Brand profile unavailable.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [businessId]);

  const logo = mediaUrl(profile?.logo_url);
  const website = externalHref(profile?.website);
  const socialLinks = Object.entries(profile?.social_links || {}).filter(([, v]) => v);
  const creators = (() => {
    const seen = new Set<number>();
    return (profile?.work_history || []).filter((w: any) => {
      if (seen.has(w.creator_id)) return false;
      seen.add(w.creator_id);
      return true;
    });
  })();

  return (
    <>
      <PublicNavbar />
      <PublicProfileStyles />

      <main className="pp-page">
        <div className="pp-wrap">
          <button type="button" className="pp-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>

          {loading && <div className="pp-state">Loading brand profile…</div>}
          {!loading && error && <div className="pp-state">{error}</div>}

          {!loading && profile && (
            <div className="pp-card">
              <div className="pp-cover" />

              <div className="pp-header">
                {logo ? (
                  <button
                    type="button"
                    className="pp-avatar is-square"
                    onClick={() => setViewer({ src: logo, alt: profile.company_name })}
                    aria-label="View logo"
                  >
                    <img src={logo} alt={profile.company_name} />
                  </button>
                ) : (
                  <div className="pp-avatar is-square">{initials(profile.company_name)}</div>
                )}

                <div className="pp-id">
                  <h1 className="pp-name">{profile.company_name}</h1>
                  {profile.business_type && <p className="pp-sub">{profile.business_type}</p>}

                  <div className="pp-meta">
                    {profile.industry && <span><Building2 size={13} />{profile.industry}</span>}
                    {profile.location && <span><MapPin size={13} />{profile.location}</span>}
                    {website && (
                      <a href={website} target="_blank" rel="noreferrer">
                        <Globe size={13} /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {profile.interested_categories?.length > 0 && (
                <div className="pp-tags">
                  {profile.interested_categories.slice(0, 10).map((c) => <span className="pp-tag" key={c}>{c}</span>)}
                </div>
              )}

              {profile.description && (
                <Section title="About the company">
                  <p className="pp-about">{profile.description}</p>
                </Section>
              )}

              {profile.interested_categories?.length > 0 && (
                <Section title="What we look for">
                  <div className="pp-chips">
                    {profile.interested_categories.map((c) => <span className="pp-chip" key={c}>{c}</span>)}
                  </div>
                </Section>
              )}

              {profile.preferred_content_types?.length > 0 && (
                <Section title="Content we commission">
                  <div className="pp-chips">
                    {profile.preferred_content_types.map((c) => <span className="pp-chip" key={c}>{c}</span>)}
                  </div>
                </Section>
              )}

              <Section title="Company Information">
                <div className="pp-grid">
                  <div className="pp-info"><small>Team size</small><p>{profile.team_size || 'Not specified'}</p></div>
                  <div className="pp-info">
                    <small>Typical campaign budget</small>
                    <p>{Number(profile.typical_budget || 0) > 0 ? `NPR ${Number(profile.typical_budget).toLocaleString()}` : 'Not specified'}</p>
                  </div>
                  <div className="pp-info"><small>Established</small><p>{profile.year_established || 'Not specified'}</p></div>
                  <div className="pp-info">
                    <small>Website</small>
                    <p>
                      {website ? (
                        <a href={website} target="_blank" rel="noreferrer">Visit website <ExternalLink size={11} /></a>
                      ) : 'Not specified'}
                    </p>
                  </div>
                </div>
              </Section>

              {socialLinks.length > 0 && (
                <Section title="Social Links">
                  <div className="pp-grid">
                    {socialLinks.map(([platform, url]) => (
                      <a key={platform} className="pp-link-card" href={externalHref(url)} target="_blank" rel="noreferrer">
                        <span className="pp-ico"><Link2 size={16} /></span>
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ textTransform: 'capitalize' }}>{platform}</strong>
                          <small>{url}</small>
                        </span>
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Recent Campaigns" sub={profile.campaigns.length > 4 ? `Latest 4 of ${profile.campaigns.length}` : `${profile.campaigns.length} published`}>
                {profile.campaigns.length === 0 ? (
                  <p className="pp-empty">No published campaigns.</p>
                ) : (
                  <div className="pp-grid">
                    {profile.campaigns.slice(0, 4).map((c) => (
                      <Link className="pp-campaign" key={c.id} to={`/campaigns/${c.id}?source=landing`}>
                        <div className="pp-campaign-body">
                          <small>{c.category || 'General'}</small>
                          <strong>{c.title}</strong>
                          <span>{c.budget ? `NPR ${Number(c.budget).toLocaleString()}` : c.campaign_type || 'Campaign'}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Section>

              <Section
                title="Creators We've Worked With"
                sub={`${profile.creators_worked_with || 0} creator${profile.creators_worked_with === 1 ? '' : 's'} · ${profile.completed_collaborations || 0} completed`}
              >
                {creators.length === 0 ? (
                  <p className="pp-empty">No collaborations yet.</p>
                ) : (
                  <div className="pp-grid">
                    {creators.slice(0, 8).map((w: any) => (
                      <Link key={w.application_id} className="pp-link-card" to={`/creators/${w.creator_id}`}>
                        <span className="pp-avatar-sm">
                          {w.creator_avatar ? <img src={mediaUrl(w.creator_avatar)} alt="" /> : (w.creator_name || 'C')[0].toUpperCase()}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <strong>{w.creator_name || `Creator #${w.creator_id}`}</strong>
                          <small>{w.status === 'completed' ? 'Completed collaboration' : 'Active collaboration'}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </main>

      <Lightbox item={viewer} onClose={() => setViewer(null)} />
    </>
  );
}

export default BrandProfile;
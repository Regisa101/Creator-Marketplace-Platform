import { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase, ExternalLink, Globe, Image as ImageIcon, Link2, Loader2, MapPin, Sparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCreatorProfile, type PublicCreatorProfile as Profile } from '../api/client';
import { PublicNavbar } from '../components/PublicNavbar';
import {
  Lightbox,
  PublicProfileStyles,
  Section,
  externalHref,
  mediaUrl,
  type LightboxItem,
} from '../components/PublicProfileKit';

function formatFollowers(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace('.0', '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}K`;
  return String(value);
}

export default function CreatorPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<LightboxItem | null>(null);

  useEffect(() => {
    if (!id) return;
    setProfile(null);
    setError('');
    getCreatorProfile(id)
      .then(setProfile)
      .catch(() => setError('This creator profile could not be found.'));
  }, [id]);

  const name = profile?.display_name || 'Creator';
  const socials = profile?.socials || [];
  const portfolio = profile?.portfolio || [];
  const history = profile?.work_history || [];
  const completed = profile?.completed_collaborations ?? history.filter((h: any) => h.status === 'completed').length;
  const avatar = mediaUrl(profile?.profile_image);

  return (
    <>
      <PublicNavbar />
      <PublicProfileStyles />

      <main className="pp-page">
        <div className="pp-wrap">
          <button type="button" className="pp-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>

          {!profile && !error && (
            <div className="pp-state"><Loader2 size={18} /></div>
          )}
          {error && <div className="pp-state">{error}</div>}

          {profile && (
            <div className="pp-card">
              <div className="pp-cover" />

              <div className="pp-header">
                {avatar ? (
                  <button
                    type="button"
                    className="pp-avatar"
                    onClick={() => setViewer({ src: avatar, alt: name })}
                    aria-label="View profile photo"
                  >
                    <img src={avatar} alt={name} />
                  </button>
                ) : (
                  <div className="pp-avatar">{name.slice(0, 1).toUpperCase()}</div>
                )}

                <div className="pp-id">
                  <h1 className="pp-name">{name}</h1>
                  {profile.username && <p className="pp-sub">@{profile.username}</p>}

                  <div className="pp-meta">
                    {profile.creator_type && (
                      <span><Sparkles size={13} />{profile.creator_type}</span>
                    )}
                    {profile.location && (
                      <span><MapPin size={13} />{profile.location}</span>
                    )}
                    {profile.languages?.length > 0 && (
                      <span><Globe size={13} />{profile.languages.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>

              {profile.categories?.length > 0 && (
                <div className="pp-tags">
                  {profile.categories.map((c) => <span className="pp-tag" key={c}>{c}</span>)}
                </div>
              )}

              {profile.bio && (
                <Section title="About">
                  <p className="pp-about">{profile.bio}</p>
                </Section>
              )}

              {profile.content_types?.length > 0 && (
                <Section title="Content & Specialties">
                  <div className="pp-chips">
                    {profile.content_types.map((c) => <span className="pp-chip" key={c}>{c}</span>)}
                  </div>
                </Section>
              )}

              {socials.length > 0 && (
                <Section title="Social Platforms" sub={`${socials.length} connected`}>
                  <div className="pp-grid">
                    {socials.map((s: any, i: number) => {
                      const href = externalHref(s.profile_url);
                      const Tag: any = href ? 'a' : 'div';
                      return (
                        <Tag
                          key={`${s.platform}-${i}`}
                          className="pp-link-card"
                          {...(href ? { href, target: '_blank', rel: 'noreferrer' } : {})}
                        >
                          <span className="pp-ico"><Link2 size={16} /></span>
                          <span style={{ minWidth: 0 }}>
                            <strong>{s.platform || 'Social'}</strong>
                            <small>@{s.username || 'profile'}</small>
                          </span>
                          {Number(s.follower_count) > 0 && <em>{formatFollowers(Number(s.follower_count))}</em>}
                        </Tag>
                      );
                    })}
                  </div>
                </Section>
              )}

              {(profile.audience_location?.length > 0 ||
                profile.audience_age_range?.length > 0 ||
                profile.interests?.length > 0) && (
                <Section title="Audience" sub="Who they reach">
                  <div className="pp-grid">
                    {profile.audience_location?.length > 0 && (
                      <div className="pp-info"><small>Top locations</small><p>{profile.audience_location.join(', ')}</p></div>
                    )}
                    {profile.audience_age_range?.length > 0 && (
                      <div className="pp-info"><small>Age range</small><p>{profile.audience_age_range.join(', ')}</p></div>
                    )}
                    {profile.interests?.length > 0 && (
                      <div className="pp-info"><small>Interests</small><p>{profile.interests.join(', ')}</p></div>
                    )}
                  </div>
                </Section>
              )}

              <Section title="Portfolio" sub={`${portfolio.length} project${portfolio.length === 1 ? '' : 's'}`}>
                {portfolio.length === 0 ? (
                  <p className="pp-empty">No portfolio work added yet.</p>
                ) : (
                  <div className="pp-grid">
                    {portfolio.map((item: any, i: number) => {
                      const src = mediaUrl(item.media_url);
                      const isVideo = String(item.type || '').toLowerCase() === 'video';
                      return (
                        <article className="pp-work" key={`${item.title}-${i}`}>
                          {src && !isVideo ? (
                            <button
                              type="button"
                              className="pp-work-media"
                              onClick={() => setViewer({ src, alt: item.title, type: 'image' })}
                              aria-label={`View ${item.title || 'project'}`}
                            >
                              <img src={src} alt={item.title || 'Portfolio project'} />
                            </button>
                          ) : (
                            <div className="pp-work-media">
                              {src ? <video src={src} controls preload="metadata" /> : <ImageIcon size={26} />}
                            </div>
                          )}
                          <div className="pp-work-body">
                            <strong>{item.title || 'Untitled project'}</strong>
                            {item.description && <p>{item.description}</p>}
                            {item.platform && <p>{item.platform}</p>}
                            {src && (
                              <a className="pp-open" href={src} target="_blank" rel="noreferrer">
                                Open project <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </Section>

              <Section title="Collaboration History" sub={`${completed} completed`}>
                {history.length === 0 ? (
                  <p className="pp-empty">No collaborations yet.</p>
                ) : (
                  <div className="pp-history">
                    {history.slice(0, 8).map((h: any) => (
                      <div className="pp-history-item" key={h.application_id}>
                        <span className="pp-ico"><Briefcase size={16} /></span>
                        <div className="pp-history-main">
                          <strong><Link to={`/campaigns/${h.campaign_id}`}>{h.campaign_title}</Link></strong>
                          <small>
                            {h.brand_name ? <Link to={`/brands/${h.brand_id}`}>{h.brand_name}</Link> : 'Brand'}
                            {h.date ? ` · ${new Date(h.date).toLocaleDateString()}` : ''}
                          </small>
                        </div>
                        <span className={`pp-status${h.status === 'completed' ? ' is-done' : ''}`}>
                          {h.status === 'completed' ? 'Completed' : 'Accepted'}
                        </span>
                      </div>
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
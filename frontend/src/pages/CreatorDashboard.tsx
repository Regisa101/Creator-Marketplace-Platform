import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Compass,
  Settings,
  UserRound,
} from 'lucide-react';
import {
  getApplications,
  getContracts,
  getCreatorProgress,
  getPublicCampaigns,
  getSavedCampaigns,
  type Application,
  type PublicCampaign,
  type SavedCampaignEntry,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PublicNavbar } from '../components/PublicNavbar';

const API_ORIGIN = 'http://localhost:8000';

function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/api/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value.replace(/^\/+/, '')}`;
}

const norm = (v?: string | null) => (v || '').trim().toLowerCase();

/* ------------------------------------------------------------
   Profile completion: share of key profile fields that are filled.
------------------------------------------------------------ */
function profileCompletion(profile: any, socials: any[]) {
  if (!profile) return 0;

  const checks = [
    profile.display_name,
    profile.username,
    profile.bio,
    profile.location,
    profile.profile_image,
    profile.creator_type,
    profile.categories?.length,
    profile.content_types?.length,
    profile.languages?.length,
    profile.audience_location?.length,
    profile.starting_price,
    profile.portfolio?.length,
    socials?.length,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/* ------------------------------------------------------------
   Recommendation basis (kept simple and explainable):
   +3  campaign category matches one of the creator's niches
   +2  campaign requires a platform the creator has connected
   +1  campaign is aimed at the creator's creator type
   Campaigns the creator already applied to, or whose application
   deadline has passed, are left out. Ties go to the newest campaign.
   If nothing matches, the newest open campaigns are shown instead.
------------------------------------------------------------ */
function scoreCampaign(c: PublicCampaign, niches: string[], platforms: string[], creatorType: string) {
  let score = 0;
  let nicheMatch = false;

  if (niches.includes(norm(c.category))) {
    score += 3;
    nicheMatch = true;
  }

  const required = [...(c.required_platforms || []), c.required_platform || '']
    .map(norm)
    .filter(Boolean);
  if (required.some((p) => platforms.includes(p))) score += 2;

  if (creatorType && (c.creator_types || []).map(norm).includes(creatorType)) score += 1;

  return { score, nicheMatch };
}

function campaignTags(c: PublicCampaign) {
  const tags: string[] = [];
  if (c.category) tags.push(c.category);
  if (c.required_platforms?.length) tags.push(...c.required_platforms.slice(0, 2));
  else if (c.required_platform) tags.push(c.required_platform);
  return Array.from(new Set(tags)).slice(0, 3);
}

function compensationLabel(c: PublicCampaign) {
  const t = norm(c.compensation_type);
  if (t.includes('gift') || t.includes('barter') || t.includes('product')) return 'Gifted';
  return 'Paid';
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Under review';
    case 'selected': return 'Contract in progress';
    case 'accepted': return 'Accepted';
    case 'rejected': return 'Not selected';
    case 'withdrawn': return 'Withdrawn';
    case 'completed': return 'Completed';
    default: return status;
  }
}

export function CreatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [saved, setSaved] = useState<SavedCampaignEntry[]>([]);
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [collabCount, setCollabCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const [p, apps, sv, camps, ctr] = await Promise.allSettled([
        getCreatorProgress(),
        getApplications(),
        getSavedCampaigns(),
        getPublicCampaigns({ limit: 30 }),
        getContracts(),
      ]);

      if (!alive) return;

      if (p.status === 'fulfilled' && p.value) {
        setProfile(p.value.profile);
        setSocials(p.value.socials || []);
      } else {
        if (p.status === 'rejected') console.error('Creator profile failed to load:', p.reason);
        // Fall back to the profile that came with the logged-in user.
        if (user?.profile) setProfile(user.profile);
      }

      // Same source as the Contract History page, so the numbers always match.
      if (ctr.status === 'fulfilled') {
        setCollabCount((ctr.value || []).filter((c) => c.status !== 'draft').length);
      }
      if (apps.status === 'fulfilled') setApplications(apps.value || []);
      if (sv.status === 'fulfilled') setSaved(sv.value || []);
      if (camps.status === 'fulfilled') setCampaigns(camps.value.campaigns || []);
      setLoading(false);
    }

    void load();
    return () => { alive = false; };
  }, [user?.id]);

  const completion = profileCompletion(profile, socials);

  const { recommended, personalised } = useMemo(() => {
    const niches = (profile?.categories || []).map(norm);
    const platforms = socials.map((s) => norm(s.platform));
    const creatorType = norm(profile?.creator_type);
    const applied = new Set(applications.map((a) => a.campaign_id));
    const now = Date.now();

    const open = campaigns.filter(
      (c) =>
        !applied.has(c.id) &&
        (!c.application_deadline || new Date(c.application_deadline).getTime() >= now),
    );

    const scored = open
      .map((c) => ({ c, ...scoreCampaign(c, niches, platforms, creatorType) }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          new Date(b.c.created_at).getTime() - new Date(a.c.created_at).getTime(),
      );

    const matched = scored.filter((s) => s.score > 0);
    const list = (matched.length > 0 ? matched : scored).slice(0, 6);

    return { recommended: list, personalised: matched.length > 0 };
  }, [campaigns, profile, socials, applications]);

  const firstName =
    (profile?.display_name || user?.full_name || 'there').split(' ')[0];
  const avatar = mediaUrl(profile?.profile_image);

  return (
    <div className="cd2-page">
      <style>{`
        .cd2-page{min-height:100vh;background:#fcfaf9;font-family:Poppins,sans-serif;color:#111}
        .cd2-wrap{max-width:1180px;margin:0 auto;padding:100px 24px 60px}
        .cd2-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px}
        .cd2-head h1{margin:0;font:600 24px 'League Spartan',Poppins,sans-serif;letter-spacing:-.02em}
        .cd2-head p{margin:4px 0 0;font-size:12px;color:#777}
        .cd2-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:0 16px;border-radius:9px;border:1px solid #111;background:#111;color:#fff;font:500 12px Poppins,sans-serif;text-decoration:none;cursor:pointer}
        .cd2-btn:hover{background:#000;color:#fff}
        .cd2-btn--ghost{background:#fff;color:#111;border-color:#ddd;width:100%}
        .cd2-btn--ghost:hover{background:#f5f5f5;color:#111}
        .cd2-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:30px}
        .cd2-stat{background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:18px 20px;min-height:84px}
        .cd2-stat-label{font-size:12px;font-weight:500;color:#666;display:flex;justify-content:space-between;align-items:center}
        .cd2-stat-value{margin-top:10px;font:600 22px Poppins,sans-serif;display:flex;align-items:center;gap:8px}
        .cd2-stat-value--status{font-size:14px;color:#555}
        .cd2-bar{height:6px;border-radius:99px;background:#eee;margin-top:12px;overflow:hidden}
        .cd2-bar span{display:block;height:100%;background:#111;border-radius:99px}
        .cd2-link{font-size:11.5px;color:#111;text-decoration:underline;text-underline-offset:3px}
        .cd2-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:28px;align-items:start}
        .cd2-section{margin-bottom:32px}
        .cd2-section-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
        .cd2-section-head h2{margin:0;font:600 17px 'League Spartan',Poppins,sans-serif;display:flex;align-items:center;gap:8px}
        .cd2-section-sub{margin:0 0 14px;font-size:11px;color:#888}
        .cd2-viewall{font-size:12px;color:#111;text-decoration:underline;text-underline-offset:3px}
        .cd2-empty{border:1.5px dashed #ddd;border-radius:16px;padding:38px 20px;text-align:center;background:#fcfaf9}
        .cd2-empty-ico{width:46px;height:46px;border-radius:50%;background:#f0f0f0;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px}
        .cd2-empty h3{margin:0 0 4px;font:600 13px Poppins,sans-serif}
        .cd2-empty p{margin:0 auto 16px;max-width:380px;font-size:11.5px;color:#777;line-height:1.55}
        .cd2-apps{display:flex;flex-direction:column;gap:10px}
        .cd2-app{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:14px 16px;text-decoration:none;color:#111}
        .cd2-app:hover{border-color:#cfcfcf}
        .cd2-app strong{font-size:13px;font-weight:500}
        .cd2-app span{font-size:11px;color:#777;white-space:nowrap}
        .cd2-reco{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .cd2-card{background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:16px;text-decoration:none;color:#111;display:flex;flex-direction:column;gap:7px;min-height:118px;transition:.18s}
        .cd2-card:hover{border-color:#cfcfcf;box-shadow:0 12px 24px -16px rgba(0,0,0,.2);transform:translateY(-2px);color:#111}
        .cd2-card-top{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:500;color:#555}
        .cd2-badge{font-size:10px;padding:3px 9px;border-radius:99px;background:#f1f1f1;color:#333}
        .cd2-card h3{margin:0;font:500 14px/1.3 Poppins,sans-serif}
        .cd2-card small{font-size:11px;color:#777}
        .cd2-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
        .cd2-tags span{font-size:10px;padding:3px 9px;border-radius:99px;background:#f3f1ef;color:#333;font-weight:500}
        .cd2-side{background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:18px;margin-bottom:18px}
        .cd2-side h3{margin:0;font:600 13px Poppins,sans-serif;display:flex;align-items:center;gap:7px}
        .cd2-side-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .cd2-side p{margin:8px 0 0;font-size:11.5px;color:#777;line-height:1.55}
        .cd2-profile{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .cd2-avatar{width:48px;height:48px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#888;flex-shrink:0}
        .cd2-avatar img{width:100%;height:100%;object-fit:cover}
        .cd2-profile strong{display:block;font-size:14px}
        .cd2-profile small{font-size:11px;color:#777}
        .cd2-bio{font-size:11.5px;color:#555;margin:10px 0 16px}
        .cd2-saved-item{display:block;font-size:12px;color:#111;text-decoration:none;padding:8px 0;border-top:1px solid #f0f0f0}
        .cd2-saved-item:first-of-type{border-top:0}
        @media(max-width:900px){.cd2-wrap{padding-top:92px}.cd2-grid{grid-template-columns:1fr}.cd2-stats{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:560px){.cd2-reco{grid-template-columns:1fr}.cd2-head{flex-direction:column}}
      `}</style>

      <PublicNavbar />

      <div className="cd2-wrap">
        <div className="cd2-head">
          <div>
            <h1>Welcome, {firstName}</h1>
            <p>Here's what's happening with your creator profile.</p>
          </div>
          <Link to="/profile" className="cd2-btn">
            <Settings size={14} />
            Edit Profile
          </Link>
        </div>

        <div className="cd2-stats">
          <div className="cd2-stat">
            <div className="cd2-stat-label">
              <span>Profile</span>
              <strong style={{ color: '#111' }}>{completion}%</strong>
            </div>
            <div className="cd2-bar"><span style={{ width: `${completion}%` }} /></div>
            {completion < 100 && (
              <Link to="/profile" className="cd2-link" style={{ display: 'inline-block', marginTop: 8 }}>
                Complete your profile
              </Link>
            )}
          </div>

          <div className="cd2-stat">
            <div className="cd2-stat-label"><span>Collab History</span></div>
            <div className="cd2-stat-value">{collabCount}</div>
            <Link to="/contracts" className="cd2-link" style={{ display: 'inline-block', marginTop: 6 }}>
              View history
            </Link>
          </div>

          <div className="cd2-stat">
            <div className="cd2-stat-label"><span>Applications</span></div>
            <div className="cd2-stat-value">{applications.length}</div>
          </div>

          <div className="cd2-stat">
            <div className="cd2-stat-label"><span>Saved Campaigns</span></div>
            <div className="cd2-stat-value">{saved.length}</div>
          </div>
        </div>

        <div className="cd2-grid">
          <div>
            {/* APPLICATIONS */}
            <section className="cd2-section">
              <div className="cd2-section-head">
                <h2>Your Applications</h2>
                <Link to="/applications" className="cd2-viewall">View all</Link>
              </div>

              {!loading && applications.length === 0 ? (
                <div className="cd2-empty">
                  <h3>No applications yet</h3>
                  <p>Pitch your first campaign. A strong intro and your best portfolio piece go a long way.</p>
                  <Link to="/campaigns" className="cd2-btn">
                    <Compass size={14} />
                    Browse campaigns
                  </Link>
                </div>
              ) : (
                <div className="cd2-apps">
                  {applications.slice(0, 4).map((a) => (
                    <Link key={a.id} to={`/campaigns/${a.campaign_id}`} className="cd2-app">
                      <strong>{a.campaign_title || 'Campaign'}</strong>
                      <span>{statusLabel(a.status)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* RECOMMENDED */}
            <section className="cd2-section">
              <div className="cd2-section-head">
                <h2>Recommended Campaigns</h2>
                <Link to="/campaigns" className="cd2-viewall">View all</Link>
              </div>
              <p className="cd2-section-sub">
                {personalised
                  ? 'Picked from your niches, connected platforms and creator type.'
                  : 'Latest open campaigns. Add niches and social accounts to your profile for better matches.'}
              </p>

              {!loading && recommended.length === 0 ? (
                <div className="cd2-empty">
                  <h3>No open campaigns right now</h3>
                  <p>New campaigns appear here as brands publish them.</p>
                </div>
              ) : (
                <div className="cd2-reco">
                  {recommended.map(({ c, nicheMatch }) => (
                    <Link key={c.id} to={`/campaigns/${c.id}?source=dashboard`} className="cd2-card">
                      <div className="cd2-card-top">
                        <span>{compensationLabel(c)}</span>
                        {nicheMatch && <span className="cd2-badge">Matches your niche</span>}
                      </div>
                      <h3>{c.title}</h3>
                      <small>
                        by{' '}
                        <span
                          role="link"
                          tabIndex={0}
                          style={{ textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/brands/${c.business_id}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/brands/${c.business_id}`);
                            }
                          }}
                        >
                          {c.brand_name || 'Brand'}
                        </span>
                      </small>
                      <div className="cd2-tags">
                        {campaignTags(c).map((t) => <span key={t}>{t}</span>)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR */}
          <aside>
            <div className="cd2-side">
              <div className="cd2-profile">
                <div className="cd2-avatar">
                  {avatar ? <img src={avatar} alt="" /> : <UserRound size={22} />}
                </div>
                <div>
                  <strong>{profile?.display_name || user?.full_name}</strong>
                  {profile?.username && <small>@{profile.username}</small>}
                </div>
              </div>

              {(profile?.categories || []).length > 0 && (
                <div className="cd2-tags" style={{ marginTop: 0 }}>
                  {(profile.categories as string[]).slice(0, 4).map((t) => <span key={t}>{t}</span>)}
                </div>
              )}

              {profile?.bio && <p className="cd2-bio">{profile.bio}</p>}

              <Link to="/profile" className="cd2-btn cd2-btn--ghost" style={{ marginTop: 12 }}>
                Edit Profile
              </Link>
            </div>

            <div className="cd2-side">
              <div className="cd2-side-row">
                <h3><Bookmark size={14} /> Saved Campaigns</h3>
                {saved.length > 0 && <Link to="/saved" className="cd2-viewall">View all</Link>}
              </div>
              {saved.length === 0 ? (
                <p>No saved campaigns yet. Browse campaigns and save the ones you like.</p>
              ) : (
                saved.slice(0, 3).map((s) => (
                  <Link key={s.id} to={`/campaigns/${s.campaign_id}`} className="cd2-saved-item">
                    {s.campaign?.title}
                  </Link>
                ))
              )}
            </div>

            <div className="cd2-side">
              <div className="cd2-side-row">
                <h3>Portfolio</h3>
                <Link to="/profile" className="cd2-viewall">Manage</Link>
              </div>
              <p>
                {(profile?.portfolio || []).length > 0
                  ? `${profile.portfolio.length} portfolio item${profile.portfolio.length === 1 ? '' : 's'} showcased to brands.`
                  : 'Add portfolio items to showcase your work to brands.'}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CreatorDashboard;
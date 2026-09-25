import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, ExternalLink, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getPublicBusinessProfile, type PublicBusinessProfile } from '../api/client';
import { PublicNavbar } from '../components/PublicNavbar';

const API_ORIGIN = 'http://localhost:8000';

function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/api/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value.replace(/^\/+/, '')}`;
}

function initials(name?: string | null) {
  const parts = (name || 'Business').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (parts[0] || 'B').slice(0, 2).toUpperCase();
}

export function BrandProfile() {
  const { businessId } = useParams<{ businessId: string }>();
  const [profile, setProfile] = useState<PublicBusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="bp-page">
      <PublicNavbar />
      <style>{`
        .bp-page{min-height:100vh;background:#fff;font-family:Poppins,sans-serif;padding-top:124px}.bp-shell{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:30px 0 70px}.bp-back{display:inline-flex;align-items:center;gap:6px;color:#666;text-decoration:none;font:500 12px Poppins;margin-bottom:22px}.bp-card{border:1px solid #e5e5e5;border-radius:18px;background:#fff;padding:28px}.bp-head{display:flex;align-items:center;gap:18px;padding-bottom:24px;border-bottom:1px solid #eee}.bp-logo{width:72px;height:72px;border-radius:16px;overflow:hidden;background:#f3f3f3;display:flex;align-items:center;justify-content:center;font:700 20px Poppins}.bp-logo img{width:100%;height:100%;object-fit:cover}.bp-name{font:700 25px 'League Spartan',sans-serif;color:#111}.bp-meta{display:flex;flex-wrap:wrap;gap:12px;margin-top:7px;color:#777;font:400 11px Poppins}.bp-meta span{display:flex;align-items:center;gap:5px}.bp-desc{margin:18px 0 0;color:#555;font:400 13px/1.7 Poppins}.bp-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;margin-top:18px}.bp-section{border:1px solid #e8e8e8;border-radius:14px;padding:20px}.bp-section h2{margin:0 0 14px;font:700 15px Poppins}.bp-tags{display:flex;flex-wrap:wrap;gap:7px}.bp-tag{padding:7px 10px;background:#f5f5f5;border-radius:999px;font:500 10px Poppins}.bp-campaign{display:block;padding:13px 0;border-top:1px solid #eee;text-decoration:none;color:#111}.bp-campaign:first-of-type{border-top:0}.bp-campaign strong{display:block;font:600 12px Poppins}.bp-campaign span{display:block;margin-top:3px;color:#888;font:400 10px Poppins}.bp-empty,.bp-error{padding:60px;text-align:center;color:#777;font:500 13px Poppins}.bp-error{color:#a33}@media(max-width:760px){.bp-grid{grid-template-columns:1fr}.bp-head{align-items:flex-start}}
      `}</style>
      <main className="bp-shell">
        <Link className="bp-back" to="/campaigns"><ArrowLeft size={14}/> Back to campaigns</Link>
        {loading && <div className="bp-card bp-empty">Loading brand profile…</div>}
        {!loading && error && <div className="bp-card bp-error">{error}</div>}
        {!loading && profile && <>
          <section className="bp-card">
            <div className="bp-head">
              <div className="bp-logo">{profile.logo_url ? <img src={mediaUrl(profile.logo_url)} alt=""/> : initials(profile.company_name)}</div>
              <div>
                <div className="bp-name">{profile.company_name}</div>
                <div className="bp-meta">
                  {profile.industry && <span><Building2 size={13}/>{profile.industry}</span>}
                  {profile.location && <span><MapPin size={13}/>{profile.location}</span>}
                  {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{color:'#555',display:'flex',gap:5,alignItems:'center'}}><ExternalLink size={13}/> Website</a>}
                </div>
              </div>
            </div>
            {profile.description && <p className="bp-desc">{profile.description}</p>}
          </section>

          <div className="bp-grid">
            <section className="bp-section">
              <h2>About the business</h2>
              <div className="bp-meta" style={{marginBottom:14}}>
                {profile.business_type && <span><Building2 size={13}/>{profile.business_type}</span>}
                {profile.team_size && <span>{profile.team_size} team</span>}
                {profile.year_established && <span>Since {profile.year_established}</span>}
              </div>
              <div className="bp-tags">
                {profile.interested_categories.map((item) => <span className="bp-tag" key={`cat-${item}`}>{item}</span>)}
                {profile.preferred_content_types.map((item) => <span className="bp-tag" key={`type-${item}`}>{item}</span>)}
              </div>
            </section>
            <section className="bp-section">
              <h2>Published campaigns</h2>
              {profile.campaigns.length === 0 ? <div className="bp-empty" style={{padding:20}}>No published campaigns.</div> : profile.campaigns.map((campaign) => (
                <Link className="bp-campaign" key={campaign.id} to={`/campaigns/${campaign.id}?source=landing`}>
                  <strong>{campaign.title}</strong><span>{campaign.category}</span>
                </Link>
              ))}
            </section>
          </div>
        </>}
      </main>
    </div>
  );
}

export default BrandProfile;

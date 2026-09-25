import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getCreatorProfile, type PublicCreatorProfile as Profile } from '../api/client';
import { PublicNavbar } from '../components/PublicNavbar';

function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value)) return value;
  if (value.startsWith('/api/')) return `http://localhost:8000${value}`;
  return `http://localhost:8000/${value.replace(/^\/+/, '')}`;
}

export default function CreatorPublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getCreatorProfile(id).then(setProfile).catch(() => setError('This creator profile could not be found.'));
  }, [id]);

  return <><PublicNavbar/><main className="cpp-page"><style>{`.cpp-page{min-height:100vh;padding:155px 24px 50px;background:#fff;font-family:Poppins,sans-serif}.cpp-shell{max-width:820px;margin:0 auto}.cpp-card{border:1px solid #e5e5e5;border-radius:18px;padding:25px;background:#fff}.cpp-head{display:flex;gap:16px;align-items:flex-start}.cpp-avatar{width:78px;height:78px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;object-fit:cover;font:700 24px Poppins,sans-serif;flex:none}.cpp-name{font:700 23px Poppins,sans-serif}.cpp-user{font:400 12px Poppins,sans-serif;color:#888;margin-top:2px}.cpp-location{display:flex;gap:5px;align-items:center;font:400 12px Poppins,sans-serif;color:#777;margin-top:8px}.cpp-bio{font:400 13px/1.6 Poppins,sans-serif;color:#444;margin-top:14px}.cpp-section{margin-top:22px;padding-top:20px;border-top:1px solid #eee}.cpp-section h3{font:700 13px Poppins,sans-serif;margin:0 0 11px}.cpp-tags{display:flex;flex-wrap:wrap;gap:7px}.cpp-tag{padding:6px 10px;border-radius:99px;background:#f3f3f3;font:500 10.5px Poppins,sans-serif}.cpp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.cpp-work{aspect-ratio:1;border-radius:9px;overflow:hidden;background:#f5f5f5}.cpp-work img{width:100%;height:100%;object-fit:cover}.cpp-state{text-align:center;padding:70px;color:#777;font:500 13px Poppins,sans-serif}@media(max-width:600px){.cpp-grid{grid-template-columns:repeat(2,1fr)}.cpp-head{flex-direction:column}}`}</style><div className="cpp-shell">{!profile&&!error?<div className="cpp-state"><Loader2 size={20}/></div>:error?<div className="cpp-state">{error}</div>:profile&&<div className="cpp-card"><div className="cpp-head">{profile.profile_image?<img className="cpp-avatar" src={mediaUrl(profile.profile_image)} alt=""/>:<div className="cpp-avatar">{(profile.display_name||'C').slice(0,1).toUpperCase()}</div>}<div><div className="cpp-name">{profile.display_name||'Creator'}</div>{profile.username&&<div className="cpp-user">@{profile.username}</div>}{profile.location&&<div className="cpp-location"><MapPin size={13}/>{profile.location}</div>}<div className="cpp-bio">{profile.bio||'Creator profile'}</div></div></div>{(profile.categories.length||profile.content_types.length)&&<section className="cpp-section"><h3>Creator focus</h3><div className="cpp-tags">{[...profile.categories,...profile.content_types].map((x,i)=><span className="cpp-tag" key={`${x}-${i}`}>{x}</span>)}</div></section>}{profile.portfolio?.length>0&&<section className="cpp-section"><h3>Portfolio</h3><div className="cpp-grid">{profile.portfolio.map((item:any,i:number)=><div className="cpp-work" key={i}>{item.media_url&&<img src={mediaUrl(item.media_url)} alt={item.title||'Work'}/>}</div>)}</div></section>}</div>}</div></main></>;
}

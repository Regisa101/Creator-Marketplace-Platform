import { useEffect, useMemo, useState } from 'react';
import { Bell, BriefcaseBusiness, FileText, Plus, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApplications, getCampaigns, getContractSummary, getNotifications, type Application, type Campaign, type Notification } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';

export function Dashboard() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [contractSummary, setContractSummary] = useState({ lifetime: 0, this_month: 0, active_contracts: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'business') return;
    Promise.all([
      getCampaigns({ limit: 100 }),
      getApplications(),
      getContractSummary(),
      getNotifications(),
    ]).then(([campaignData, apps, contractData, notes]) => {
      setCampaigns(campaignData.campaigns);
      setApplications(apps);
      setContractSummary({ lifetime: contractData.lifetime, this_month: contractData.this_month, active_contracts: contractData.active_contracts });
      setNotifications(notes);
    }).catch((err) => console.error('Could not load business dashboard:', err)).finally(() => setLoading(false));
  }, [user?.role]);

  const openCampaigns = campaigns.filter((c) => c.status === 'published' && c.is_active).length;
  const pendingApplications = applications.filter((a) => a.status === 'pending').length;
  const closedCampaigns = campaigns.filter((c) => c.status === 'closed').length;
  const recent = useMemo(() => applications.slice(0, 5), [applications]);

  if (user?.role !== 'business') return null;

  return <AppLayout title={`Welcome, ${(user.full_name || 'there').split(' ')[0]}`} subtitle="Manage campaigns, review creators and confirm selections." showSearch={false} showNotifications>
    <style>{`.bd-wrap{max-width:1120px;margin:0 auto;padding-bottom:50px}.bd-actions{display:flex;gap:9px;margin-bottom:20px}.bd-primary,.bd-secondary{height:40px;padding:0 15px;border-radius:9px;text-decoration:none;font:600 12px Poppins,sans-serif;display:flex;align-items:center;gap:7px}.bd-primary{background:#111;color:#fff}.bd-secondary{background:#fff;border:1px solid #ddd;color:#333}.bd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.bd-stat{background:#fff;border:1px solid #e5e5e5;border-radius:14px;padding:17px}.bd-stat-icon{width:30px;height:30px;border-radius:8px;background:#f3f3f3;display:flex;align-items:center;justify-content:center;margin-bottom:13px}.bd-label{font:500 10px Poppins,sans-serif;color:#888;text-transform:uppercase;letter-spacing:.07em}.bd-value{font:700 24px Poppins,sans-serif;color:#111;margin-top:3px}.bd-sub{font:400 10px Poppins,sans-serif;color:#888;margin-top:2px}.bd-grid{display:grid;grid-template-columns:1.3fr .7fr;gap:15px}.bd-card{background:#fff;border:1px solid #e5e5e5;border-radius:14px;padding:18px}.bd-card h3{margin:0 0 14px;font:700 14px Poppins,sans-serif}.bd-row{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid #eee}.bd-row:first-of-type{border-top:0}.bd-row-title{font:600 12px Poppins,sans-serif;color:#222}.bd-row-meta{font:400 10.5px Poppins,sans-serif;color:#888;margin-top:2px}.bd-link{font:600 11px Poppins,sans-serif;color:#111;text-decoration:none}.bd-note{padding:9px 10px;background:#fafafa;border-radius:8px;font:400 11px/1.5 Poppins,sans-serif;color:#777;margin-top:10px}.bd-loading{padding:60px;text-align:center;color:#777;font:500 12px Poppins,sans-serif}@media(max-width:850px){.bd-stats{grid-template-columns:repeat(2,1fr)}.bd-grid{grid-template-columns:1fr}}@media(max-width:520px){.bd-stats{grid-template-columns:1fr}.bd-actions{flex-wrap:wrap}}
    `}</style>
    <div className="bd-wrap">
      <div className="bd-actions"><Link className="bd-primary" to="/campaigns/new"><Plus size={15}/> Create campaign</Link><Link className="bd-secondary" to="/applications"><FileText size={15}/> Review applications</Link></div>
      {loading ? <div className="bd-loading">Loading your dashboard…</div> : <>
        <div className="bd-stats">
          <div className="bd-stat"><div className="bd-stat-icon"><BriefcaseBusiness size={16}/></div><div className="bd-label">Open campaigns</div><div className="bd-value">{openCampaigns}</div></div>
          <div className="bd-stat"><div className="bd-stat-icon"><FileText size={16}/></div><div className="bd-label">Pending applications</div><div className="bd-value">{pendingApplications}</div></div>
          <div className="bd-stat"><div className="bd-stat-icon"><BriefcaseBusiness size={16}/></div><div className="bd-label">Closed campaigns</div><div className="bd-value">{closedCampaigns}</div></div>
          <div className="bd-stat"><div className="bd-stat-icon"><Wallet size={16}/></div><div className="bd-label">CreatorHub service fees</div><div className="bd-value">NPR {contractSummary.lifetime.toLocaleString()}</div><div className="bd-sub">This month: NPR {contractSummary.this_month.toLocaleString()}</div></div>
        </div>
        <div className="bd-grid">
          <section className="bd-card"><h3>Recent applications</h3>{recent.length === 0 ? <div className="bd-note">No applications yet.</div> : recent.map((a) => <div className="bd-row" key={a.id}><div><div className="bd-row-title">{a.creator_name || `Creator #${a.creator_id}`}</div><div className="bd-row-meta">{a.campaign_title || 'Campaign'} · {a.status.replace('_',' ')}</div></div><Link className="bd-link" to={`/applications?campaign=${a.campaign_id}`}>View</Link></div>)}</section>
          <section className="bd-card"><h3>Recent notifications</h3>{notifications.slice(0,5).map((n)=><div className="bd-row" key={n.id}><div><div className="bd-row-title">{n.title}</div><div className="bd-row-meta">{new Date(n.created_at).toLocaleDateString()}</div></div><Bell size={14}/></div>)}{notifications.length===0 && <div className="bd-note">No notifications yet.</div>}</section>
        </div>
      </>}
    </div>
  </AppLayout>;
}

export default Dashboard;

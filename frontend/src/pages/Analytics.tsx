import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  getApplications,
  getCampaigns,
  getCollabHistory,
  getCollabs,
  getPaymentSummary,
  type Application,
  type Campaign,
  type Collab,
} from '../api/client';

const C = { card:'#FFF', ink:'#1A1625', soft:'#6B6478', faint:'#A39DB8', line:'#EAE7F2', navy:'#7661A1', coral:'#F47C78', green:'#16834A', red:'#C84642' };
const rs = (v:number) => `Rs. ${Math.round(v || 0).toLocaleString()}`;

export function Analytics() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;
  const [applications,setApplications] = useState<Application[]>([]);
  const [campaigns,setCampaigns] = useState<Campaign[]>([]);
  const [collabs,setCollabs] = useState<Collab[]>([]);
  const [history,setHistory] = useState<Collab[]>([]);
  const [payments,setPayments] = useState({this_month:0,lifetime:0,completed_payment_count:0});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [apps,camp,active,finished,pay] = await Promise.all([getApplications(),getCampaigns({limit:50}),getCollabs(),getCollabHistory(),getPaymentSummary()]);
      setApplications(apps); setCampaigns(camp.campaigns); setCollabs(active); setHistory(finished);
      setPayments({this_month:pay.this_month,lifetime:pay.lifetime,completed_payment_count:pay.completed_payment_count});
    } catch(e) { console.error(e); setError('Could not load analytics right now.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[isBusiness]);

  const campaignRows = useMemo(()=>{
    const all=[...collabs,...history];
    return campaigns.map(c=>({campaign:c,applications:applications.filter(a=>a.campaign_id===c.id).length,accepted:all.filter(x=>x.campaign_id===c.id && ['accepted','completed'].includes(x.status)).length,completed:all.filter(x=>x.campaign_id===c.id && x.status==='completed').length,deliverables:all.filter(x=>x.campaign_id===c.id).reduce((n,x)=>n+(x.total_deliverables||0),0),approved:all.filter(x=>x.campaign_id===c.id).reduce((n,x)=>n+(x.approved_deliverables||0),0)})).slice(0,10);
  },[campaigns,applications,collabs,history]);

  const businessAnalytics = useMemo(() => {
    const activeCampaigns = campaigns.filter((c) => ['published', 'in_progress'].includes(c.status)).length;
    const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length;
    const fundedCampaigns = campaigns.filter((c) => c.campaign_type === 'paid' && c.funding_status === 'funded');
    const refundedCampaigns = campaigns.filter((c) => c.campaign_type === 'paid' && c.funding_status === 'refunded');
    const totalFunded = fundedCampaigns.reduce((sum, c) => sum + (Number(c.funded_amount) || Number(c.budget) || 0), 0);
    const refunded = refundedCampaigns.reduce((sum, c) => sum + (Number(c.funded_amount) || Number(c.budget) || 0), 0);
    const paidToCreators = Math.max(0, Number(payments.lifetime) || 0);
    const held = Math.max(0, totalFunded - paidToCreators - refunded);
    const completionRate = campaigns.length ? (completedCampaigns / campaigns.length) * 100 : 0;
    return { activeCampaigns, completedCampaigns, fundedCampaigns: fundedCampaigns.length, totalFunded, paidToCreators, held, refunded, completionRate };
  }, [campaigns, payments.lifetime]);

  const creatorAnalytics = useMemo(() => {
    const accepted = applications.filter((a) => a.status === 'accepted').length;
    const completed = history.filter((c) => c.status === 'completed').length;
    const pendingPayout = collabs.reduce((sum, c) => {
      if (c.status === 'completed' || c.payment_status === 'released' || c.payment_status === 'completed') return sum;
      const rate = Number(c.agreed_rate ?? c.rate ?? 0);
      return sum + (rate > 0 ? rate * 0.9 : 0);
    }, 0);
    return { accepted, completed, pendingPayout };
  }, [applications, history, collabs]);

  return <AppLayout title="Analytics" subtitle={isBusiness ? 'Measure what each campaign delivered and decide which creators to work with again.' : 'Track your collaboration progress and earnings.'} showSearch={false} showNotifications>
    <style>{` .an-page{padding:28px 24px 48px;max-width:1180px;margin:0 auto}.an-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.an-card,.an-section{background:#fff;border:1px solid ${C.line};border-radius:16px}.an-card{padding:16px}.an-label{font-size:11px;color:${C.soft};font-weight:650}.an-value{font-size:24px;font-weight:800;color:${C.ink};margin-top:5px}.an-caption{font-size:10px;color:${C.faint};margin-top:5px}.an-section{padding:20px;margin-top:18px}.an-title{font-size:15px;font-weight:800;color:${C.ink};margin:0}.an-sub{font-size:11px;color:${C.soft};margin:4px 0 16px}.an-results{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.an-result{padding:13px;border-radius:12px;background:#F7F6FA}.an-result b{display:block;font-size:18px;color:${C.ink};margin-top:3px}.an-positive{color:${C.green}!important}.an-negative{color:${C.red}!important}.an-table{margin-top:12px;display:grid}.an-row{display:grid;grid-template-columns:1.7fr .6fr .7fr .8fr .9fr;gap:12px;padding:11px 0;border-bottom:1px solid #F0EEF4;align-items:center}.an-head{font-size:9px;text-transform:uppercase;color:${C.faint};font-weight:750}.an-cell{font-size:11px;color:${C.soft};font-weight:650}.an-name{font-size:12px;color:${C.ink};font-weight:750}.an-empty{text-align:center;padding:30px;color:${C.soft};font-size:12px}.an-error{padding:11px 12px;border-radius:9px;background:#FDECEC;color:${C.red};font-size:12px;margin-bottom:14px}@media(max-width:850px){.an-grid{grid-template-columns:repeat(2,1fr)}.an-results{grid-template-columns:1fr 1fr}.an-row{grid-template-columns:1.5fr .6fr .7fr}.an-row>:nth-child(4),.an-row>:nth-child(5){display:none}}@media(max-width:560px){.an-page{padding:20px 14px}.an-grid,.an-results{grid-template-columns:1fr}}`}</style>
    <div className="an-page">
      {error && <div className="an-error">{error}</div>}
      {loading ? <div className="an-section an-empty">Loading analytics…</div> : <>
        <div className="an-grid">
          {isBusiness ? <>
            <div className="an-card"><div className="an-label">Total campaigns</div><div className="an-value">{campaigns.length}</div><div className="an-caption">All campaigns in your account</div></div>
            <div className="an-card"><div className="an-label">Active campaigns</div><div className="an-value">{businessAnalytics.activeCampaigns}</div><div className="an-caption">Published or in progress</div></div>
            <div className="an-card"><div className="an-label">Completed campaigns</div><div className="an-value">{businessAnalytics.completedCampaigns}</div><div className="an-caption">{businessAnalytics.completionRate.toFixed(0)}% completion rate</div></div>
            <div className="an-card"><div className="an-label">Total amount funded</div><div className="an-value">{rs(businessAnalytics.totalFunded)}</div><div className="an-caption">{businessAnalytics.fundedCampaigns} funded paid campaigns</div></div>
          </> : <>
            <div className="an-card"><div className="an-label">Total applications</div><div className="an-value">{applications.length}</div><div className="an-caption">Applications you've sent</div></div>
            <div className="an-card"><div className="an-label">Accepted applications</div><div className="an-value">{creatorAnalytics.accepted}</div><div className="an-caption">Brands that selected you</div></div>
            <div className="an-card"><div className="an-label">Active collaborations</div><div className="an-value">{collabs.length}</div><div className="an-caption">Currently in progress</div></div>
            <div className="an-card"><div className="an-label">Completed campaigns</div><div className="an-value">{creatorAnalytics.completed}</div><div className="an-caption">Completed collaborations</div></div>
          </>}
        </div>

        <section className="an-section an-finance-section">
          <h3 className="an-title">{isBusiness ? 'Campaign payments' : 'Earnings & payments'}</h3>
          <p className="an-sub">{isBusiness ? 'A simple view of the money secured, released, and still held across your campaigns.' : 'Track released earnings and payouts still waiting to be released.'}</p>
          <div className="an-results">
            {isBusiness ? <>
              <div className="an-result"><span className="an-label">Total funded</span><b>{rs(businessAnalytics.totalFunded)}</b></div>
              <div className="an-result"><span className="an-label">Paid to creators</span><b>{rs(businessAnalytics.paidToCreators)}</b></div>
              <div className="an-result"><span className="an-label">Payment held</span><b>{rs(businessAnalytics.held)}</b></div>
              <div className="an-result"><span className="an-label">Refunded</span><b>{rs(businessAnalytics.refunded)}</b></div>
            </> : <>
              <div className="an-result"><span className="an-label">Total earnings</span><b>{rs(payments.lifetime)}</b></div>
              <div className="an-result"><span className="an-label">Pending payment</span><b>{rs(creatorAnalytics.pendingPayout)}</b></div>
              <div className="an-result"><span className="an-label">Released payments</span><b>{payments.completed_payment_count}</b></div>
              <div className="an-result"><span className="an-label">This month</span><b>{rs(payments.this_month)}</b></div>
            </>}
          </div>
        </section>

        <section className="an-section">
          <h3 className="an-title">Campaign delivery</h3>
          <p className="an-sub">See how work is moving from application to completion across your collaborations.</p>
          {campaignRows.length===0 ? <div className="an-empty">No campaign data yet.</div> : <div className="an-table">
            <div className="an-row an-head"><div>Campaign</div><div>Apps</div><div>Accepted</div><div>Progress</div><div>Status</div></div>
            {campaignRows.map(r=>{const progress=r.deliverables?Math.round(r.approved/r.deliverables*100):0; return <div className="an-row" key={r.campaign.id}><div><div className="an-name">{r.campaign.title}</div><div className="an-caption">{r.campaign.category}</div></div><div className="an-cell">{r.applications}</div><div className="an-cell">{r.accepted}</div><div className="an-cell">{progress}%</div><div className="an-cell">{r.campaign.status}</div></div>})}
          </div>}
        </section>
      </>}
    </div>
  </AppLayout>;
}

export default Analytics;
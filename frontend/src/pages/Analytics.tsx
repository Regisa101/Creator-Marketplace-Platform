import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  getCampaignPerformances,
  getApplications,
  getCampaigns,
  getCollabHistory,
  getCollabs,
  getPaymentSummary,
  updateCampaignPerformance,
  type Application,
  type Campaign,
  type CampaignPerformance,
  type Collab,
} from '../api/client';

const C = { card:'#FFF', ink:'#1A1625', soft:'#6B6478', faint:'#A39DB8', line:'#EAE7F2', navy:'#1E2A78', coral:'#FF6B5A', green:'#16834A', red:'#C84642' };
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
  const [performance,setPerformance] = useState<CampaignPerformance[]>([]);
  const [selectedId,setSelectedId] = useState<number | null>(null);
  const [revenue,setRevenue] = useState('');
  const [otherCosts,setOtherCosts] = useState('');
  const [sales,setSales] = useState('');
  const [reach,setReach] = useState('');
  const [engagement,setEngagement] = useState('');
  const [notes,setNotes] = useState('');
  const [saving,setSaving] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [apps,camp,active,finished,pay] = await Promise.all([getApplications(),getCampaigns({limit:50}),getCollabs(),getCollabHistory(),getPaymentSummary()]);
      setApplications(apps); setCampaigns(camp.campaigns); setCollabs(active); setHistory(finished);
      setPayments({this_month:pay.this_month,lifetime:pay.lifetime,completed_payment_count:pay.completed_payment_count});
      if (isBusiness) setPerformance(await getCampaignPerformances());
    } catch(e) { console.error(e); setError('Could not load analytics right now.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[isBusiness]);

  const selected = useMemo(()=>performance.find(p=>p.campaign_id===selectedId) || null,[performance,selectedId]);
  useEffect(()=>{
    if (!selected) return;
    setRevenue(selected.revenue ? String(selected.revenue) : '');
    setOtherCosts(selected.other_costs ? String(selected.other_costs) : '');
    setSales(selected.sales_count == null ? '' : String(selected.sales_count));
    setReach(selected.reach == null ? '' : String(selected.reach));
    setEngagement(selected.engagement == null ? '' : String(selected.engagement));
    setNotes(selected.notes || '');
  },[selectedId, selected?.updated_at, selected?.revenue, selected?.other_costs]);

  const activePerf = selected || (selectedId ? null : performance[0] || null);
  const totalCost = Number(revenue || 0) >= 0 ? (activePerf?.creator_spend || 0) + Number(otherCosts || 0) : 0;
  const estimatedProfit = Number(revenue || 0) - totalCost;
  const roi = totalCost > 0 ? (estimatedProfit / totalCost) * 100 : 0;

  const saveResults = async () => {
    if (!selectedId) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const updated = await updateCampaignPerformance(selectedId,{ revenue:Number(revenue||0), other_costs:Number(otherCosts||0), sales_count:sales ? Number(sales):undefined, reach:reach ? Number(reach):undefined, engagement:engagement ? Number(engagement):undefined, notes:notes.trim() || undefined });
      setPerformance(prev=>prev.map(p=>p.campaign_id===updated.campaign_id?updated:p));
      if (!performance.some(p=>p.campaign_id===updated.campaign_id)) setPerformance(prev=>[updated,...prev]);
      setSaved(true); setTimeout(()=>setSaved(false),2200);
    } catch(e:any) { setError(e?.response?.data?.detail || 'Could not save campaign results.'); }
    finally { setSaving(false); }
  };

  const campaignRows = useMemo(()=>{
    const all=[...collabs,...history];
    return campaigns.map(c=>({campaign:c,applications:applications.filter(a=>a.campaign_id===c.id).length,accepted:all.filter(x=>x.campaign_id===c.id && ['accepted','completed'].includes(x.status)).length,completed:all.filter(x=>x.campaign_id===c.id && x.status==='completed').length,deliverables:all.filter(x=>x.campaign_id===c.id).reduce((n,x)=>n+(x.total_deliverables||0),0),approved:all.filter(x=>x.campaign_id===c.id).reduce((n,x)=>n+(x.approved_deliverables||0),0)})).slice(0,10);
  },[campaigns,applications,collabs,history]);

  return <AppLayout title="Analytics" subtitle={isBusiness ? 'Measure what each campaign delivered and decide which creators to work with again.' : 'Track your collaboration progress and earnings.'} showSearch={false} showNotifications>
    <style>{` .an-page{padding:28px 24px 48px;max-width:1180px;margin:0 auto}.an-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.an-card,.an-section{background:#fff;border:1px solid ${C.line};border-radius:16px}.an-card{padding:16px}.an-label{font-size:11px;color:${C.soft};font-weight:650}.an-value{font-size:24px;font-weight:800;color:${C.ink};margin-top:5px}.an-caption{font-size:10px;color:${C.faint};margin-top:5px}.an-section{padding:20px;margin-top:18px}.an-title{font-size:15px;font-weight:800;color:${C.ink};margin:0}.an-sub{font-size:11px;color:${C.soft};margin:4px 0 16px}.an-select{width:100%;padding:10px 12px;border:1px solid ${C.line};border-radius:9px;background:#fff;color:${C.ink};font-size:13px}.an-results{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.an-result{padding:13px;border-radius:12px;background:#F7F6FA}.an-result b{display:block;font-size:18px;color:${C.ink};margin-top:3px}.an-positive{color:${C.green}!important}.an-negative{color:${C.red}!important}.an-form{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.an-field label{display:block;font-size:10px;font-weight:700;color:${C.soft};margin-bottom:6px}.an-field input,.an-field textarea{box-sizing:border-box;width:100%;border:1px solid ${C.line};border-radius:9px;padding:10px 11px;font:13px -apple-system,BlinkMacSystemFont,sans-serif;color:${C.ink};outline:none}.an-field textarea{min-height:74px;resize:vertical}.an-full{grid-column:1/-1}.an-save{margin-top:14px;border:0;border-radius:9px;padding:10px 16px;background:${primary};color:#fff;font-weight:750;font-size:12px;cursor:pointer}.an-save:disabled{opacity:.55}.an-saved{font-size:11px;color:${C.green};margin-left:10px;font-weight:700}.an-table{margin-top:12px;display:grid}.an-row{display:grid;grid-template-columns:1.7fr .6fr .7fr .8fr .9fr;gap:12px;padding:11px 0;border-bottom:1px solid #F0EEF4;align-items:center}.an-head{font-size:9px;text-transform:uppercase;color:${C.faint};font-weight:750}.an-cell{font-size:11px;color:${C.soft};font-weight:650}.an-name{font-size:12px;color:${C.ink};font-weight:750}.an-empty{text-align:center;padding:30px;color:${C.soft};font-size:12px}.an-error{padding:11px 12px;border-radius:9px;background:#FDECEC;color:${C.red};font-size:12px;margin-bottom:14px}@media(max-width:850px){.an-grid{grid-template-columns:repeat(2,1fr)}.an-form,.an-results{grid-template-columns:1fr 1fr}.an-row{grid-template-columns:1.5fr .6fr .7fr}.an-row>:nth-child(4),.an-row>:nth-child(5){display:none}}@media(max-width:560px){.an-page{padding:20px 14px}.an-grid,.an-form,.an-results{grid-template-columns:1fr}}`}</style>
    <div className="an-page">
      {error && <div className="an-error">{error}</div>}
      {loading ? <div className="an-section an-empty">Loading analytics…</div> : <>
        <div className="an-grid">
          <div className="an-card"><div className="an-label">{isBusiness?'Campaigns':'Active collaborations'}</div><div className="an-value">{isBusiness?campaigns.length:collabs.length}</div><div className="an-caption">{history.filter(c=>c.status==='completed').length} completed collaborations</div></div>
          <div className="an-card"><div className="an-label">{isBusiness?'Creators accepted':'Work approved'}</div><div className="an-value">{isBusiness?applications.filter(a=>a.status==='accepted').length:history.reduce((n,c)=>n+(c.approved_deliverables||0),0)}</div><div className="an-caption">{isBusiness?'Across your campaigns':'Approved deliverables'}</div></div>
          <div className="an-card"><div className="an-label">{isBusiness?'Campaign spend':'Lifetime earnings'}</div><div className="an-value">{rs(payments.lifetime)}</div><div className="an-caption">{payments.completed_payment_count} released payments this month</div></div>
          <div className="an-card"><div className="an-label">{isBusiness?'Campaign ROI':'This month'}</div><div className="an-value">{isBusiness && activePerf ? `${activePerf.roi_percent.toFixed(1)}%` : rs(payments.this_month)}</div><div className="an-caption">{isBusiness?'Selected campaign':'Released earnings'}</div></div>
        </div>

        {isBusiness && <section className="an-section">
          <h3 className="an-title">Campaign ROI & results</h3>
          <p className="an-sub">Enter the revenue you attribute to a campaign. Creator payments are pulled automatically from the payment records; ROI is calculated by the platform.</p>
          <select className="an-select" value={selectedId ?? ''} onChange={e=>setSelectedId(e.target.value ? Number(e.target.value):null)}>
            <option value="">Select a campaign</option>
            {campaigns.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {selectedId && <>
            <div className="an-results">
              <div className="an-result"><span className="an-label">Creator spend</span><b>{rs(activePerf?.creator_spend||0)}</b></div>
              <div className="an-result"><span className="an-label">Total campaign cost</span><b>{rs(totalCost)}</b></div>
              <div className="an-result"><span className="an-label">Attributed revenue</span><b>{rs(Number(revenue||0))}</b></div>
              <div className="an-result"><span className="an-label">Estimated profit</span><b className={estimatedProfit>=0?'an-positive':'an-negative'}>{rs(estimatedProfit)}</b></div>
              <div className="an-result"><span className="an-label">ROI</span><b className={roi>=0?'an-positive':'an-negative'}>{roi.toFixed(1)}%</b></div>
              <div className="an-result"><span className="an-label">Decision signal</span><b className={roi>=0?'an-positive':'an-negative'}>{roi>=50?'Strong':roi>=0?'Positive':'Review campaign'}</b></div>
            </div>
            <div className="an-form">
              <div className="an-field"><label>Revenue attributed to campaign (Rs.)</label><input type="number" min="0" value={revenue} onChange={e=>setRevenue(e.target.value)} placeholder="72000" /></div>
              <div className="an-field"><label>Other campaign costs (Rs.)</label><input type="number" min="0" value={otherCosts} onChange={e=>setOtherCosts(e.target.value)} placeholder="8000" /></div>
              <div className="an-field"><label>Sales / conversions</label><input type="number" min="0" value={sales} onChange={e=>setSales(e.target.value)} placeholder="120" /></div>
              <div className="an-field"><label>Reach / views</label><input type="number" min="0" value={reach} onChange={e=>setReach(e.target.value)} placeholder="125000" /></div>
              <div className="an-field"><label>Engagements</label><input type="number" min="0" value={engagement} onChange={e=>setEngagement(e.target.value)} placeholder="8420" /></div>
              <div className="an-field"><label>Notes</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Creator A drove most conversions" /></div>
            </div>
            <button className="an-save" disabled={saving} onClick={saveResults}>{saving?'Saving…':'Save campaign results'}</button>{saved&&<span className="an-saved">✓ Results saved</span>}
          </>}
        </section>}

        <section className="an-section">
          <h3 className="an-title">Campaign delivery</h3>
          <p className="an-sub">See whether creator work is actually moving from application to completion.</p>
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

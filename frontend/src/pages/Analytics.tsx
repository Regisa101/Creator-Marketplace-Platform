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

const C = {
  card: '#FFFFFF', ink: '#1A1625', inkSoft: '#6B6478', inkFaint: '#A39DB8', line: '#EAE7F2', navy: '#1E2A78', coral: '#FF6B5A', green: '#16834A',
};

function formatRs(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return `Rs. ${Math.round(value).toLocaleString()}`;
}
function campaignStatus(status?: string) {
  switch (status) {
    case 'completed': return { label: 'Completed', color: C.green, bg: '#EAF8F0' };
    case 'in_progress': return { label: 'In progress', color: C.navy, bg: '#EEF1FF' };
    case 'published': return { label: 'Open', color: C.coral, bg: '#FFF4F2' };
    case 'draft': return { label: 'Draft', color: C.inkFaint, bg: C.line };
    default: return { label: status || 'Active', color: C.inkSoft, bg: C.line };
  }
}

export function Analytics() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;
  const [applications, setApplications] = useState<Application[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [history, setHistory] = useState<Collab[]>([]);
  const [paymentSummary, setPaymentSummary] = useState({ this_month: 0, lifetime: 0, completed_payment_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const [apps, campaignData, active, finished, payments] = await Promise.all([
          getApplications(), getCampaigns({ limit: 50 }), getCollabs(), getCollabHistory(), getPaymentSummary(),
        ]);
        if (cancelled) return;
        setApplications(apps); setCampaigns(campaignData.campaigns); setCollabs(active); setHistory(finished);
        setPaymentSummary({ this_month: payments.this_month, lifetime: payments.lifetime, completed_payment_count: payments.completed_payment_count });
      } catch (err) {
        console.error('Could not load analytics:', err);
        if (!cancelled) setError('Could not load analytics right now.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const allCollabs = useMemo(() => [...collabs, ...history], [collabs, history]);
  const creatorStats = useMemo(() => {
    const accepted = applications.filter((a) => a.status === 'accepted').length;
    const completed = history.filter((c) => c.status === 'completed').length;
    const approved = allCollabs.reduce((sum, c) => sum + (c.approved_deliverables || 0), 0);
    const deliverables = allCollabs.reduce((sum, c) => sum + (c.total_deliverables || 0), 0);
    return { accepted, completed, approved, deliverables, approvalRate: deliverables ? Math.round((approved / deliverables) * 100) : 0, acceptanceRate: applications.length ? Math.round((accepted / applications.length) * 100) : 0 };
  }, [applications, allCollabs, history]);
  const brandStats = useMemo(() => {
    const open = campaigns.filter((c) => c.status === 'published').length;
    const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length;
    const accepted = applications.filter((a) => a.status === 'accepted').length;
    const pending = applications.filter((a) => a.status === 'pending').length;
    const approved = allCollabs.reduce((sum, c) => sum + (c.approved_deliverables || 0), 0);
    const deliverables = allCollabs.reduce((sum, c) => sum + (c.total_deliverables || 0), 0);
    return { open, completedCampaigns, accepted, pending, approved, deliverables, completionRate: deliverables ? Math.round((approved / deliverables) * 100) : 0 };
  }, [applications, allCollabs, campaigns]);
  const campaignRows = useMemo(() => {
    const grouped = new Map<number, { campaign: Campaign; applications: number; accepted: number; spend: number; completed: number; deliverables: number; approved: number }>();
    for (const campaign of campaigns) grouped.set(campaign.id, { campaign, applications: 0, accepted: 0, spend: 0, completed: 0, deliverables: 0, approved: 0 });
    for (const app of applications) { const row = grouped.get(app.campaign_id); if (row) { row.applications += 1; if (app.status === 'accepted') row.accepted += 1; } }
    for (const collab of allCollabs) { const row = grouped.get(collab.campaign_id); if (row) { row.spend += collab.amount_paid ?? (collab.payment_status === 'completed' ? collab.rate ?? 0 : 0); row.completed += collab.status === 'completed' ? 1 : 0; row.deliverables += collab.total_deliverables || 0; row.approved += collab.approved_deliverables || 0; } }
    return Array.from(grouped.values()).sort((a, b) => b.applications - a.applications || b.accepted - a.accepted).slice(0, 8);
  }, [applications, campaigns, allCollabs]);

  return (
    <AppLayout title="Analytics" subtitle={isBusiness ? 'See how your campaigns, creator work, and spend are progressing.' : 'See how your applications turn into collaborations, completed work, and earnings.'} showSearch={false} showNotifications>
      <style>{`
        .an-page{padding:28px 24px 48px;max-width:1180px;margin:0 auto}.an-heading{margin:0;font-size:23px;font-weight:800;color:${C.ink};letter-spacing:-.4px}.an-copy{margin:5px 0 18px;color:${C.inkSoft};font-size:12px;line-height:1.55;max-width:760px}
        .an-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.an-stat{background:${C.card};border:1px solid ${C.line};border-radius:15px;padding:16px}.an-label{color:${C.inkSoft};font-size:11px;font-weight:650}.an-value{margin-top:5px;color:${C.ink};font-size:24px;font-weight:800;letter-spacing:-.3px}.an-caption{margin-top:6px;color:${C.inkFaint};font-size:10px}
        .an-section{margin-top:18px;background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:20px}.an-title{margin:0;color:${C.ink};font-size:15px;font-weight:800}.an-subtitle{margin:4px 0 0;color:${C.inkSoft};font-size:11px;line-height:1.5}.an-progress-wrap{display:grid;grid-template-columns:1fr 110px;gap:18px;align-items:center;margin-top:17px}.an-progress-bar{height:10px;border-radius:999px;background:#F0EEF5;overflow:hidden}.an-progress-fill{height:100%;border-radius:inherit}.an-progress-value{text-align:right;font-size:22px;font-weight:800;color:${C.ink}}.an-progress-label{text-align:right;font-size:10px;color:${C.inkFaint};margin-top:3px}.an-legend{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.an-legend-card{padding:11px;border-radius:11px;background:#F7F6FA}.an-legend-label{color:${C.inkSoft};font-size:10px}.an-legend-value{color:${C.ink};font-size:17px;font-weight:800;margin-top:2px}
        .an-table{display:grid;gap:7px;margin-top:15px}.an-row{display:grid;grid-template-columns:minmax(0,1.7fr) .6fr .7fr .75fr .85fr;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid #F0EEF4}.an-row:last-child{border-bottom:0}.an-row-head{color:${C.inkFaint};font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.06em}.an-campaign-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${C.ink};font-size:12px;font-weight:750}.an-campaign-meta{margin-top:3px;color:${C.inkFaint};font-size:9px}.an-cell{color:${C.inkSoft};font-size:11px;font-weight:650}.an-chip{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:750}
        .an-empty{padding:34px 12px;text-align:center;color:${C.inkSoft};font-size:12px}.an-error{margin-bottom:15px;padding:11px 12px;border-radius:10px;background:#FDECEC;color:#C84642;font-size:12px}
        @media(max-width:900px){.an-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.an-row{grid-template-columns:minmax(0,1.7fr) .6fr .7fr .7fr}.an-row>:last-child{display:none}}
        @media(max-width:620px){.an-page{padding:20px 14px 36px}.an-grid{grid-template-columns:1fr}.an-progress-wrap{grid-template-columns:1fr}.an-progress-value,.an-progress-label{text-align:left}.an-legend{grid-template-columns:1fr}.an-row{grid-template-columns:minmax(0,1fr) .6fr .7fr}.an-row>:nth-child(4),.an-row>:nth-child(5){display:none}}
      `}</style>
      <div className="an-page">
        <h2 className="an-heading">{isBusiness ? 'Campaign performance' : 'Your progress'}</h2>
        <p className="an-copy">{isBusiness ? 'A clear view of campaign activity, creator work, approvals, and spend.' : 'A clear view of applications, active work, completed collaborations, and earnings.'}</p>
        {error && <div className="an-error">{error}</div>}
        {loading ? <div className="an-section"><div className="an-empty">Loading analytics…</div></div> : (
          <>
            <div className="an-grid">
              {isBusiness ? <>
                <div className="an-stat"><div className="an-label">Campaigns live</div><div className="an-value">{brandStats.open}</div><div className="an-caption">{brandStats.completedCampaigns} completed</div></div>
                <div className="an-stat"><div className="an-label">Creators accepted</div><div className="an-value">{brandStats.accepted}</div><div className="an-caption">{brandStats.pending} applications waiting</div></div>
                <div className="an-stat"><div className="an-label">Work approved</div><div className="an-value">{brandStats.approved}</div><div className="an-caption">of {brandStats.deliverables} requested</div></div>
                <div className="an-stat"><div className="an-label">Spent this month</div><div className="an-value">{formatRs(paymentSummary.this_month)}</div><div className="an-caption">{paymentSummary.completed_payment_count} completed payouts</div></div>
              </> : <>
                <div className="an-stat"><div className="an-label">Active collaborations</div><div className="an-value">{collabs.length}</div><div className="an-caption">{creatorStats.completed} completed</div></div>
                <div className="an-stat"><div className="an-label">Acceptance rate</div><div className="an-value">{creatorStats.acceptanceRate}%</div><div className="an-caption">{creatorStats.accepted} accepted applications</div></div>
                <div className="an-stat"><div className="an-label">Work approved</div><div className="an-value">{creatorStats.approved}</div><div className="an-caption">of {creatorStats.deliverables} requested</div></div>
                <div className="an-stat"><div className="an-label">Earnings this month</div><div className="an-value">{formatRs(paymentSummary.this_month)}</div><div className="an-caption">Lifetime {formatRs(paymentSummary.lifetime)}</div></div>
              </>}
            </div>
            <section className="an-section">
              <h3 className="an-title">Progress overview</h3>
              <p className="an-subtitle">{isBusiness ? 'How much requested creator work has been approved.' : 'How much requested content is already approved.'}</p>
              <div className="an-progress-wrap">
                <div>
                  <div className="an-progress-bar"><div className="an-progress-fill" style={{ width: `${isBusiness ? brandStats.completionRate : creatorStats.approvalRate}%`, background: primary }} /></div>
                  <div className="an-legend">
                    <div className="an-legend-card"><div className="an-legend-label">Approved</div><div className="an-legend-value">{isBusiness ? brandStats.approved : creatorStats.approved}</div></div>
                    <div className="an-legend-card"><div className="an-legend-label">Total work</div><div className="an-legend-value">{isBusiness ? brandStats.deliverables : creatorStats.deliverables}</div></div>
                    <div className="an-legend-card"><div className="an-legend-label">Completed collabs</div><div className="an-legend-value">{isBusiness ? history.filter(c => c.status === 'completed').length : creatorStats.completed}</div></div>
                  </div>
                </div>
                <div><div className="an-progress-value">{isBusiness ? brandStats.completionRate : creatorStats.approvalRate}%</div><div className="an-progress-label">approval progress</div></div>
              </div>
            </section>
            <section className="an-section">
              <h3 className="an-title">Campaign performance</h3>
              <p className="an-subtitle">{isBusiness ? 'A compact view of campaign activity and delivery.' : 'The opportunities you have applied to and how they are moving.'}</p>
              {campaignRows.length === 0 ? <div className="an-empty">No campaign data yet.</div> : (
                <div className="an-table">
                  <div className="an-row an-row-head"><div>Campaign</div><div>Apps</div><div>Accepted</div><div>Progress</div><div>Spend</div></div>
                  {campaignRows.map((row) => {
                    const meta = campaignStatus(row.campaign.status); const progress = row.deliverables ? Math.round((row.approved / row.deliverables) * 100) : 0;
                    return <div className="an-row" key={row.campaign.id}><div><div className="an-campaign-title">{row.campaign.title}</div><div className="an-campaign-meta">{row.campaign.category || 'Campaign'} · <span className="an-chip" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span></div></div><div className="an-cell">{row.applications}</div><div className="an-cell">{row.accepted}</div><div className="an-cell">{progress}%</div><div className="an-cell">{row.spend ? formatRs(row.spend) : '—'}</div></div>;
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Analytics;
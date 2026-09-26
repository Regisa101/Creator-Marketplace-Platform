import { useEffect, useState } from 'react';
import { Check, FileSignature, Loader2, X, ExternalLink } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApplications, selectApplication, updateApplicationStatus, finalizeContract, getContract, type Application, type Contract } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { DemoPaymentForm } from '../components/DemoPaymentForm';

function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/api/')) return `http://localhost:8000${value}`;
  return `http://localhost:8000/${value.replace(/^\/+/, '')}`;
}

export function ApplicationsInbox() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const campaignFilter = Number(params.get('campaign')) || undefined;
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [contract, setContract] = useState<Contract | null>(null);
  const [rate, setRate] = useState('');
  const [total, setTotal] = useState('');
  const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setApplications(await getApplications(campaignFilter ? { campaign_id: campaignFilter } : undefined)); }
    catch (err: any) { setError(err?.response?.data?.detail || 'Could not load applications.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [campaignFilter]);
  useEffect(() => {
    if (user?.role !== 'business') return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 12000);
    return () => window.clearInterval(timer);
  }, [user?.role, campaignFilter]);

  const reject = async (app: Application) => {
    setBusy(app.id); setError('');
    try {
      const updated = await updateApplicationStatus(app.id, 'rejected');
      setApplications(items => items.map(item => item.id === updated.id ? updated : item));
    } catch (err: any) { setError(err?.response?.data?.detail || 'Could not reject this application.'); }
    finally { setBusy(null); }
  };

  const select = async (app: Application) => {
    setBusy(app.id); setError('');
    try {
      const result = await selectApplication(app.id);
      const c = await getContract(result.contract_id);
      setContract(c);
      setRate(c.agreed_rate != null ? String(c.agreed_rate) : '');
      setTotal(c.total_value != null ? String(c.total_value) : '');
      setNote(c.terms_note || '');
      setApplications(items => items.map(item => item.id === app.id ? { ...item, status: 'accepted', agreed_rate: c.agreed_rate ?? null, rate_locked: c.status !== 'draft' } : item));
    } catch (err: any) { setError(err?.response?.data?.detail || 'Could not select this creator.'); }
    finally { setBusy(null); }
  };

  const finalize = async () => {
    if (!contract) return;
    const agreed = Number(rate);
    const totalValue = Number(total);
    if (!agreed || agreed <= 0) { setError('Enter the final agreed compensation.'); return; }
    if (!totalValue || totalValue <= 0) { setError('Enter the total contract value.'); return; }
    setBusy(contract.application_id); setError('');
    try {
      // Backend moves the contract to "pending_payment" here — it is not
      // active yet. The modal below then shows the demo payment step.
      const updated = await finalizeContract(contract.id, { agreed_rate: agreed, total_value: totalValue, terms_note: note || undefined });
      setContract(updated);
      setApplications(items => items.map(item => item.id === updated.application_id ? { ...item, status: 'accepted', agreed_rate: updated.agreed_rate, rate_locked: true } : item));
    } catch (err: any) { setError(err?.response?.data?.detail || 'Could not finalize the contract.'); }
    finally { setBusy(null); }
  };

  if (user?.role !== 'business') return null;

  return <AppLayout title="Applications" subtitle="Review creators, select one, then agree the final contract terms." showSearch={false} showNotifications actionLabel="New Campaign" actionTo="/campaigns/new">
    <style>{`
      .ab-wrap{max-width:1040px;margin:0 auto;padding-bottom:50px}.ab-note{padding:11px 13px;background:#f7f7f7;border:1px solid #e5e5e5;border-radius:10px;font:500 12px/1.5 Poppins,sans-serif;color:#666;margin-bottom:16px}.ab-error{padding:11px 13px;background:#f8eeee;color:#ad2929;border-radius:9px;font:500 12px Poppins,sans-serif;margin-bottom:14px}.ab-empty{padding:60px 20px;text-align:center;color:#777;font:500 13px Poppins,sans-serif}.ab-card{background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:20px;margin-bottom:14px}.ab-top{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.ab-person{display:flex;gap:11px;align-items:center;text-decoration:none;color:#111}.ab-avatar{width:48px;height:48px;border-radius:50%;overflow:hidden;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font:700 13px Poppins,sans-serif;flex:none}.ab-avatar img{width:100%;height:100%;object-fit:cover}.ab-name{font:700 14px Poppins,sans-serif}.ab-date{font:400 11px Poppins,sans-serif;color:#888;margin-top:2px}.ab-status{font:600 10px Poppins,sans-serif;text-transform:uppercase;letter-spacing:.06em;padding:6px 9px;border-radius:99px;background:#f3f3f3;color:#555}.ab-campaign{margin-top:15px;font:700 13px Poppins,sans-serif}.ab-budget{margin-top:4px;font:600 12px Poppins,sans-serif;color:#555}.ab-grid{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:20px;margin-top:17px}.ab-heading{font:700 11px Poppins,sans-serif;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}.ab-answer{font:400 12px/1.55 Poppins,sans-serif;color:#444;margin-bottom:12px}.ab-work{border:1px solid #e5e5e5;border-radius:10px;overflow:hidden}.ab-work img{display:block;width:100%;aspect-ratio:1;object-fit:cover}.ab-work-title{font:600 10px Poppins,sans-serif;padding:7px;color:#555}.ab-actions{display:flex;gap:8px;margin-top:18px;border-top:1px solid #eee;padding-top:15px}.ab-select,.ab-reject{height:38px;padding:0 15px;border-radius:8px;font:600 12px Poppins,sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px}.ab-select{border:0;background:#111;color:#fff}.ab-reject{border:1px solid #ddd;background:#fff;color:#555}.ab-select:disabled,.ab-reject:disabled{opacity:.5;cursor:not-allowed}.ab-spin{animation:ab-spin .8s linear infinite}@keyframes ab-spin{to{transform:rotate(360deg)}}
      .ab-modal-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)}.ab-modal{width:min(500px,100%);background:#fff;border:1px solid #e7e7e7;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22);padding:24px;position:relative;max-height:90vh;overflow:auto}.ab-close{position:absolute;right:14px;top:14px;width:32px;height:32px;border:1px solid #e6e6e6;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}.ab-icon{width:42px;height:42px;border-radius:12px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:14px}.ab-title{font:700 18px Poppins,sans-serif;color:#111}.ab-sub{font:400 11px/1.5 Poppins,sans-serif;color:#777;margin-top:4px}.ab-box{margin-top:20px;border:1px solid #e8e8e8;border-radius:13px;overflow:hidden}.ab-row{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #eee;font:500 12px Poppins,sans-serif;color:#555}.ab-row:last-child{border-bottom:0}.ab-row strong{color:#111}.ab-total{background:#f7f7f7;font-weight:700}.ab-total strong{font-size:15px}.ab-field{margin-top:14px}.ab-field label{display:block;font:600 11px Poppins,sans-serif;color:#444;margin-bottom:6px}.ab-field input,.ab-field textarea{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:9px;padding:10px 11px;outline:none;font:400 12px Poppins,sans-serif}.ab-field textarea{min-height:75px;resize:vertical}.ab-field input:focus,.ab-field textarea:focus{border-color:#111}.ab-actions-modal{display:flex;gap:8px;margin-top:18px}.ab-primary{flex:1;height:42px;border:0;border-radius:9px;background:#111;color:#fff;font:700 12px Poppins,sans-serif;cursor:pointer}.ab-secondary{height:42px;padding:0 15px;border:1px solid #ddd;border-radius:9px;background:#fff;color:#555;font:600 12px Poppins,sans-serif;cursor:pointer}.ab-foot{margin-top:12px;font:400 10px/1.5 Poppins,sans-serif;color:#888}.ab-success{padding:10px 12px;border-radius:9px;background:#f5f5f5;border:1px solid #e5e5e5;font:500 11px/1.5 Poppins,sans-serif;color:#555;margin-top:12px}
      @media(max-width:760px){.ab-grid{grid-template-columns:1fr}.ab-work{max-width:220px}.ab-top{flex-direction:column}}
    `}</style>
    <div className="ab-wrap">
      <div className="ab-note">CreatorHub does not collect the creator's compensation in this flow. Selection creates a contract; once you finalize and pay the 10% platform fee, it goes active and the business and creator handle the actual compensation directly.</div>
      {error && <div className="ab-error">{error}</div>}
      {loading && <div className="ab-empty">Loading applications…</div>}
      {!loading && applications.length === 0 && <div className="ab-empty">No applications yet.</div>}
      {!loading && applications.map(app => {
        const work = app.selected_portfolio?.[0] as any;
        return <article className="ab-card" key={app.id}>
          <div className="ab-top">
            <Link className="ab-person" to={`/creators/${app.creator_id}`}><div className="ab-avatar">{app.creator_avatar ? <img src={mediaUrl(app.creator_avatar)} alt=""/> : (app.creator_name || 'C').slice(0,1).toUpperCase()}</div><div><div className="ab-name">{app.creator_name || `Creator #${app.creator_id}`}</div><div className="ab-date">Applied {new Date(app.created_at).toLocaleDateString()}</div></div><ExternalLink size={13} color="#999"/></Link>
            <span className="ab-status">{app.status.replace('_',' ')}</span>
          </div>
          <div className="ab-campaign">{app.campaign_title || `Campaign #${app.campaign_id}`}</div>
          {app.campaign_budget != null && <div className="ab-budget">Campaign budget: NPR {Number(app.campaign_budget).toLocaleString()}</div>}
          {app.rate != null && <div className="ab-budget">Creator proposed: NPR {Number(app.rate).toLocaleString()}</div>}
          <div className="ab-grid"><div><div className="ab-heading">Screening answers</div>{(app.application_answers || []).length === 0 ? <div className="ab-answer">No screening questions were added.</div> : (app.application_answers || []).map((answer,i)=><div className="ab-answer" key={i}><strong>{answer.question}</strong><br/>{answer.answer}</div>)}</div><div><div className="ab-heading">Work sample</div>{work?.media_url ? <div className="ab-work"><img src={mediaUrl(work.media_url)} alt={work.title || 'Work sample'}/><div className="ab-work-title">{work.title || 'Work sample'}</div></div> : <div className="ab-answer">No work image attached.</div>}</div></div>
          {app.status === 'pending' && <div className="ab-actions"><button className="ab-select" disabled={busy === app.id} onClick={() => void select(app)}>{busy === app.id ? <Loader2 size={14} className="ab-spin"/> : <FileSignature size={14}/>} Select creator & create contract</button><button className="ab-reject" disabled={busy === app.id} onClick={() => void reject(app)}><X size={14}/> Reject</button></div>}
          {app.status === 'accepted' && <div className="ab-success"><Check size={13} style={{verticalAlign:'-2px',marginRight:5}}/> Creator selected. The contract is now being finalized.</div>}
        </article>;
      })}
    </div>

    {contract && <div className="ab-modal-backdrop" role="dialog" aria-modal="true">
      <div className="ab-modal">
        <button type="button" className="ab-close" onClick={() => setContract(null)}><X size={16}/></button>
        <div className="ab-icon"><FileSignature size={20}/></div>
        <div className="ab-title">
          {contract.status === 'draft' && 'Finalize contract'}
          {contract.status === 'pending_payment' && 'Pay platform fee'}
          {(contract.status === 'active' || contract.status === 'completed') && 'Contract active'}
        </div>
        <div className="ab-sub">{contract.creator_name || 'Selected creator'} · {contract.campaign_title || 'Campaign'}</div>

        <div className="ab-box">
          <div className="ab-row"><span>Engagement</span><strong>{contract.engagement_type || 'Not specified'}</strong></div>
          <div className="ab-row"><span>Duration</span><strong>{contract.duration || 'Not specified'}</strong></div>
          <div className="ab-row"><span>Compensation</span><strong>{contract.compensation_type || 'Negotiable'}</strong></div>
          {contract.status !== 'draft' && <><div className="ab-row"><span>Contract value</span><strong>NPR {Number(contract.total_value || 0).toLocaleString()}</strong></div><div className="ab-row"><span>CreatorHub service fee (10%)</span><strong>NPR {Number(contract.platform_fee_amount || 0).toLocaleString()}</strong></div></>}
        </div>

        {contract.status === 'draft' && <>
          <div className="ab-field"><label>Final agreed rate (NPR)</label><input type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 40000"/></div>
          <div className="ab-field"><label>Total contract value (NPR)</label><input type="number" min="0" step="0.01" value={total} onChange={e => setTotal(e.target.value)} placeholder="e.g. 240000"/></div>
          <div className="ab-field"><label>Terms note (optional)</label><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add any agreed terms, deliverables or payment arrangement notes..."/></div>
          <div className="ab-actions-modal"><button className="ab-secondary" onClick={() => setContract(null)}>Later</button><button className="ab-primary" disabled={busy === contract.application_id} onClick={() => void finalize()}>{busy === contract.application_id ? 'Saving…' : 'Continue to payment'}</button></div>
          <div className="ab-foot">CreatorHub calculates the 10% service fee for your records. You'll pay it on the next step.</div>
        </>}

        {contract.status === 'pending_payment' && <DemoPaymentForm
          contract={contract}
          onCancel={() => setContract(null)}
          onSuccess={(updated: Contract) => {
            setContract(updated);
            setApplications(items => items.map(item => item.id === updated.application_id ? { ...item, status: 'accepted', agreed_rate: updated.agreed_rate, rate_locked: true } : item));
          }}
        />}

        {(contract.status === 'active' || contract.status === 'completed') && <>
          <div className="ab-success"><Check size={13} style={{verticalAlign:'-2px',marginRight:5}}/> Payment received. This contract is active and the creator has been notified with the contract amount.</div>
          {contract.payment_reference && <div className="ab-foot">Receipt: {contract.payment_reference}{contract.fee_paid_at ? ` · ${new Date(contract.fee_paid_at).toLocaleDateString()}` : ''}</div>}
          <div className="ab-actions-modal"><button className="ab-primary" onClick={() => setContract(null)}>Done</button></div>
        </>}
      </div>
    </div>}
  </AppLayout>;
}

export default ApplicationsInbox;
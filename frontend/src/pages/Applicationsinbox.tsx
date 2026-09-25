import { useEffect, useState } from 'react';
import { Check, Loader2, X, ExternalLink, CreditCard } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApplications, selectApplication, updateApplicationStatus, type Application, type SelectionPaymentStart } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';

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
  const isBusiness = user?.role === 'business';
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [paymentPreview, setPaymentPreview] = useState<SelectionPaymentStart | null>(null);
  const [paymentApplication, setPaymentApplication] = useState<Application | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setApplications(await getApplications(campaignFilter ? { campaign_id: campaignFilter } : undefined));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [campaignFilter]);

  useEffect(() => {
    if (!isBusiness) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 12000);
    return () => window.clearInterval(timer);
  }, [isBusiness, campaignFilter]);

  const reject = async (app: Application) => {
    setBusy(app.id);
    try {
      const updated = await updateApplicationStatus(app.id, 'rejected');
      setApplications((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not reject this application.');
    } finally { setBusy(null); }
  };

  const select = async (app: Application) => {
    setBusy(app.id);
    setError('');
    try {
      const result = await selectApplication(app.id);
      setPaymentApplication(app);
      setPaymentPreview(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not start the payment.');
    } finally {
      setBusy(null);
    }
  };

  const continueToKhalti = () => {
    if (!paymentPreview?.payment_url) return;
    window.location.assign(paymentPreview.payment_url);
  };

  const closePaymentPreview = () => {
    setPaymentPreview(null);
    setPaymentApplication(null);
  };

  return (
    <AppLayout
      title="Applications"
      subtitle="Review creator profiles, answers and one work sample, then select one creator."
      showSearch={false}
      showNotifications
      actionLabel="New Campaign"
      actionTo="/campaigns/new"
    >
      <style>{`
        .ab-wrap{max-width:1040px;margin:0 auto;padding-bottom:50px}.ab-note{padding:11px 13px;background:#f7f7f7;border:1px solid #e5e5e5;border-radius:10px;font:500 12px/1.5 Poppins,sans-serif;color:#666;margin-bottom:16px}.ab-error{padding:11px 13px;background:#f8eeee;color:#ad2929;border-radius:9px;font:500 12px Poppins,sans-serif;margin-bottom:14px}.ab-empty{padding:60px 20px;text-align:center;color:#777;font:500 13px Poppins,sans-serif}.ab-card{background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:20px;margin-bottom:14px}.ab-top{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.ab-person{display:flex;gap:11px;align-items:center;text-decoration:none;color:#111}.ab-avatar{width:48px;height:48px;border-radius:50%;overflow:hidden;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font:700 13px Poppins,sans-serif;flex:none}.ab-avatar img{width:100%;height:100%;object-fit:cover}.ab-name{font:700 14px Poppins,sans-serif}.ab-date{font:400 11px Poppins,sans-serif;color:#888;margin-top:2px}.ab-status{font:600 10px Poppins,sans-serif;text-transform:uppercase;letter-spacing:.06em;padding:6px 9px;border-radius:99px;background:#f3f3f3;color:#555}.ab-campaign{margin-top:15px;font:700 13px Poppins,sans-serif}.ab-budget{margin-top:4px;font:600 12px Poppins,sans-serif;color:#555}.ab-grid{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:20px;margin-top:17px}.ab-heading{font:700 11px Poppins,sans-serif;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}.ab-answer{font:400 12px/1.55 Poppins,sans-serif;color:#444;margin-bottom:12px}.ab-work{border:1px solid #e5e5e5;border-radius:10px;overflow:hidden}.ab-work img{display:block;width:100%;aspect-ratio:1;object-fit:cover}.ab-work-title{font:600 10px Poppins,sans-serif;padding:7px;color:#555}.ab-actions{display:flex;gap:8px;margin-top:18px;border-top:1px solid #eee;padding-top:15px}.ab-select,.ab-reject{height:38px;padding:0 15px;border-radius:8px;font:600 12px Poppins,sans-serif;cursor:pointer;display:flex;align-items:center;gap:6px}.ab-select{border:0;background:#111;color:#fff}.ab-reject{border:1px solid #ddd;background:#fff;color:#555}.ab-select:disabled,.ab-reject:disabled{opacity:.5;cursor:not-allowed}.ab-spin{animation:ab-spin .8s linear infinite}@keyframes ab-spin{to{transform:rotate(360deg)}}
        .ab-modal-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)}
        .ab-payment-modal{width:min(430px,100%);background:#fff;border:1px solid #e7e7e7;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22);padding:24px;position:relative}
        .ab-payment-close{position:absolute;right:14px;top:14px;width:32px;height:32px;border:1px solid #e6e6e6;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555}
        .ab-payment-icon{width:42px;height:42px;border-radius:12px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
        .ab-payment-title{font:700 18px Poppins,sans-serif;color:#111}
        .ab-payment-sub{font:400 11px/1.5 Poppins,sans-serif;color:#777;margin-top:4px}
        .ab-payment-box{margin-top:20px;border:1px solid #e8e8e8;border-radius:13px;overflow:hidden}
        .ab-payment-row{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #eee;font:500 12px Poppins,sans-serif;color:#555}
        .ab-payment-row:last-child{border-bottom:0}.ab-payment-row strong{color:#111}.ab-payment-total{background:#f7f7f7;font-weight:700}.ab-payment-total strong{font-size:15px}.ab-payment-standard{margin-top:12px;padding:10px 12px;border-radius:10px;background:#f7f7f7;border:1px solid #e9e9e9;font:500 10px/1.5 Poppins,sans-serif;color:#555}.ab-payment-standard strong{color:#111}
        .ab-payment-note{margin-top:12px;font:400 10px/1.5 Poppins,sans-serif;color:#888}
        .ab-khalti-btn{width:100%;height:44px;border:0;border-radius:10px;background:#111;color:#fff;font:700 12px Poppins,sans-serif;cursor:pointer;margin-top:17px;display:flex;align-items:center;justify-content:center;gap:8px}.ab-khalti-btn:hover{background:#222}
        .ab-cancel-btn{width:100%;height:38px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#555;font:600 11px Poppins,sans-serif;cursor:pointer;margin-top:8px}
        @media(max-width:760px){.ab-grid{grid-template-columns:1fr}.ab-work{max-width:220px}.ab-top{flex-direction:column}}
      `}</style>
      <div className="ab-wrap">
        <div className="ab-note">Each application contains the creator's profile photo, required answers and exactly one work image. Select a creator to review the payment breakdown and continue to Khalti. The campaign closes only after Khalti confirms payment.</div>
        {error && <div className="ab-error">{error}</div>}
        {loading && <div className="ab-empty">Loading applications…</div>}
        {!loading && applications.length === 0 && <div className="ab-empty">No applications yet.</div>}
        {!loading && applications.map((app) => {
          const work = app.selected_portfolio?.[0] as any;
          return (
            <article className="ab-card" key={app.id}>
              <div className="ab-top">
                <Link className="ab-person" to={`/creators/${app.creator_id}`}>
                  <div className="ab-avatar">{app.creator_avatar ? <img src={mediaUrl(app.creator_avatar)} alt=""/> : (app.creator_name || 'C').slice(0,1).toUpperCase()}</div>
                  <div><div className="ab-name">{app.creator_name || `Creator #${app.creator_id}`}</div><div className="ab-date">Applied {new Date(app.created_at).toLocaleDateString()}</div></div>
                  <ExternalLink size={13} color="#999"/>
                </Link>
                <span className="ab-status">{app.status.replace('_',' ')}</span>
              </div>
              <div className="ab-campaign">{app.campaign_title || `Campaign #${app.campaign_id}`}</div>
              {app.campaign_budget != null && <div className="ab-budget">Campaign amount: NPR {Number(app.campaign_budget).toLocaleString()}</div>}
              <div className="ab-grid">
                <div>
                  <div className="ab-heading">Screening answers</div>
                  {(app.application_answers || []).length === 0 && <div className="ab-answer">No screening questions were added to this campaign.</div>}
                  {(app.application_answers || []).map((answer, i) => <div className="ab-answer" key={i}><strong>{answer.question}</strong><br/>{answer.answer}</div>)}
                </div>
                <div>
                  <div className="ab-heading">Work sample</div>
                  {work?.media_url ? <div className="ab-work"><img src={mediaUrl(work.media_url)} alt={work.title || 'Work sample'}/><div className="ab-work-title">{work.title || 'Work sample'}</div></div> : <div className="ab-answer">No work image attached.</div>}
                </div>
              </div>
              {(app.status === 'pending' || app.status === 'payment_pending') && <div className="ab-actions">
                <button className="ab-select" disabled={busy === app.id} onClick={() => void select(app)}>{busy === app.id ? <Loader2 size={14} className="ab-spin"/> : <CreditCard size={14}/>} {app.status === 'payment_pending' ? 'Continue payment' : 'Select creator & pay'}</button>
                {app.status === 'pending' && <button className="ab-reject" disabled={busy === app.id} onClick={() => void reject(app)}><X size={14}/> Reject</button>}
              </div>}
            </article>
          );
        })}
      </div>

      {paymentPreview && (
        <div className="ab-modal-backdrop" role="dialog" aria-modal="true" aria-label="Payment confirmation">
          <div className="ab-payment-modal">
            <button type="button" className="ab-payment-close" onClick={closePaymentPreview} aria-label="Close payment preview"><X size={16}/></button>
            <div className="ab-payment-icon"><CreditCard size={20}/></div>
            <div className="ab-payment-title">Confirm creator payment</div>
            <div className="ab-payment-sub">{paymentApplication?.creator_name || 'Selected creator'} · {paymentApplication?.campaign_title || 'Campaign'}</div>

            <div className="ab-payment-box">
              <div className="ab-payment-row"><span>Payment basis</span><strong>{paymentPreview.pricing_term || 'Campaign term'}</strong></div>
              <div className="ab-payment-row"><span>Campaign amount</span><strong>NPR {Number(paymentPreview.amount).toLocaleString()}</strong></div>
              <div className="ab-payment-row"><span>CreatorHub fee (10%)</span><strong>NPR {Number(paymentPreview.platform_fee).toLocaleString()}</strong></div>
              <div className="ab-payment-row"><span>Creator payout</span><strong>NPR {Number(paymentPreview.creator_payout).toLocaleString()}</strong></div>
              <div className="ab-payment-row ab-payment-total"><span>Brand pays now</span><strong>NPR {Number(paymentPreview.amount).toLocaleString()}</strong></div>
            </div>

            {paymentPreview.pricing_basis === 'creatorhub_standard_rate' && (
              <div className="ab-payment-standard"><strong>CreatorHub standard rate</strong><br/>This amount was selected automatically from the campaign term. CreatorHub keeps 10% and the creator receives 90%.</div>
            )}
            {paymentPreview.pricing_basis === 'custom_budget' && (
              <div className="ab-payment-standard"><strong>Your custom budget</strong><br/>The amount you entered is the total brand payment. CreatorHub keeps 10% and the creator receives 90%.</div>
            )}
            {paymentPreview.pricing_basis === 'budget_range_max' && (
              <div className="ab-payment-standard"><strong>Budget range</strong><br/>The maximum budget is used for this creator selection. CreatorHub keeps 10% and the creator receives 90%.</div>
            )}
            <div className="ab-payment-note">Your payment is processed securely through Khalti. The creator is officially selected only after the payment is successfully verified.</div>
            <button type="button" className="ab-khalti-btn" onClick={continueToKhalti}><CreditCard size={15}/> Continue to Khalti</button>
            <button type="button" className="ab-cancel-btn" onClick={closePaymentPreview}>Cancel</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default ApplicationsInbox;

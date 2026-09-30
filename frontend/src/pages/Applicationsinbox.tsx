import { useEffect, useState } from 'react';
import { parseSocialLink } from '../utils/social';
import { Check, ChevronDown, FileSignature, Loader2, X, ExternalLink, ZoomIn } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApplications, selectApplication, updateApplicationStatus, finalizeContract, getContract, type Application, type Contract } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { KhaltiPaymentForm } from '../components/KhaltiPaymentForm';

function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/api/')) return `http://localhost:8000${value}`;
  return `http://localhost:8000/${value.replace(/^\/+/, '')}`;
}

type AppTabKey = 'all' | 'pending' | 'accepted' | 'rejected';

const APP_TABS: { key: AppTabKey; label: string }[] = [
  { key: 'all', label: 'All applications' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

// pending  = waiting for your review (incl. the short "selected" step)
// accepted = creators you chose (working now, or already finished)
// rejected = rejected + withdrawn by the creator
function appTabOf(status?: string | null): AppTabKey {
  switch (status) {
    case 'pending':
    case 'selected':
      return 'pending';
    case 'accepted':
    case 'completed':
      return 'accepted';
    case 'rejected':
    case 'withdrawn':
      return 'rejected';
    default:
      return 'all';
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'selected': return 'Contract in progress';
    case 'accepted': return 'Accepted';
    case 'completed': return 'Completed';
    case 'rejected': return 'Rejected';
    case 'withdrawn': return 'Withdrawn';
    default: return status || '—';
  }
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
  const [tab, setTab] = useState<AppTabKey>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try { setApplications(await getApplications(campaignFilter ? { campaign_id: campaignFilter } : undefined)); }
    catch (err: any) { setError(err?.response?.data?.detail || 'Could not load applications.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [campaignFilter]);
  useEffect(() => {
    if (user?.role !== 'business') return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(true); }, 12000);
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
    setBusy(app.id);
    setError('');

    try {
      // IMPORTANT:
      // This creates ONLY a draft contract. It does not select the creator.
      // Keep the user on the Applications page and open the contract form
      // here. The creator becomes accepted only after the platform-fee payment
      // succeeds.
      const result = await selectApplication(app.id);
      const draft = await getContract(result.contract_id);

      setContract(draft);
      setRate(
        draft.agreed_rate != null ? String(draft.agreed_rate) : ''
      );
      setTotal(
        draft.total_value != null ? String(draft.total_value) : ''
      );
      setNote(draft.terms_note || '');
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Could not create the contract. Please try again.'
      );
    } finally {
      setBusy(null);
    }
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
      // active yet. The modal below then shows the secure Khalti payment step.
      const updated = await finalizeContract(contract.id, { agreed_rate: agreed, total_value: totalValue, terms_note: note || undefined });
      setContract(updated);
      // Still NOT selected. Payment is the point at which the backend changes
      // the application to "accepted".
      setApplications(items =>
        items.map(item =>
          item.id === updated.application_id
            ? {
                ...item,
                agreed_rate: updated.agreed_rate,
                rate_locked: true,
              }
            : item
        )
      );
    } catch (err: any) { setError(err?.response?.data?.detail || 'Could not finalize the contract.'); }
    finally { setBusy(null); }
  };

  if (user?.role !== 'business') return null;

  // ---- tab counts, search + filtered list ----
  const query = search.trim().toLowerCase();
  const searched = applications.filter(app => {
    if (!query) return true;
    return [app.creator_name, app.campaign_title, statusLabel(app.status)]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(query));
  });

  const tabCounts: Record<AppTabKey, number> = { all: searched.length, pending: 0, accepted: 0, rejected: 0 };
  searched.forEach(app => {
    const key = appTabOf(app.status);
    if (key !== 'all') tabCounts[key] += 1;
  });

  const visible = searched.filter(app => tab === 'all' || appTabOf(app.status) === tab);

  const toggleExpanded = (id: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return <AppLayout
    title="Applications"
    subtitle="Review creators, select one, then agree the final contract terms."
    showNotifications
    searchValue={search}
    onSearchChange={setSearch}
    searchPlaceholder="Search applications"
    actionLabel="New Campaign"
    actionTo="/campaigns/new"
  >
    <style>{`
      .ab-wrap{max-width:1040px;margin:0 auto;padding-bottom:50px}
      .ab-error{padding:11px 13px;background:#f8eeee;color:#ad2929;border-radius:9px;font:500 12px Poppins,sans-serif;margin-bottom:14px}
      .ab-empty{padding:48px 20px;text-align:center;color:#777;font:500 13px Poppins,sans-serif}
      .ab-list{display:flex;flex-direction:column;gap:8px}
      .ab-card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;transition:border-color .15s ease}
      .ab-card:hover{border-color:#cfcfcf}
      .ab-row-card{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1.25fr) auto auto;gap:16px;align-items:center;padding:12px 14px}
      .ab-person{display:flex;gap:10px;align-items:center;text-decoration:none;color:#111;min-width:0}
      .ab-avatar{width:36px;height:36px;border-radius:50%;overflow:hidden;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font:600 12px Poppins,sans-serif;flex:none}
      .ab-avatar img{width:100%;height:100%;object-fit:cover}
      .ab-person-text{min-width:0}
      .ab-name{font:600 13px Poppins,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px}
      .ab-date{font:400 11px Poppins,sans-serif;color:#888;margin-top:1px}
      .ab-info{min-width:0}
      .ab-campaign{font:500 13px Poppins,sans-serif;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ab-social{display:inline-flex;align-items:center;gap:5px;margin-top:2px;font:500 11.5px Poppins,sans-serif;color:#111;text-decoration:underline;text-underline-offset:3px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ab-social:hover{color:#000}
      .ab-amounts{margin-top:2px;font:400 11px Poppins,sans-serif;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ab-status{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font:500 11px Poppins,sans-serif;background:#f3f3f3;color:#555;white-space:nowrap}
      .ab-status--pending,.ab-status--selected{background:#fff6e5;color:#9a6a08}
      .ab-status--accepted{background:#e9f6ee;color:#1e8a4c}
      .ab-status--completed{background:#e8f0fb;color:#2a5aa5}
      .ab-status--rejected,.ab-status--withdrawn{background:#f3f2f4;color:#77717e}
      .ab-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end}
      .ab-chevron{transition:transform .15s ease}
      .ab-chevron.open{transform:rotate(180deg)}
      .ab-spin{animation:ab-spin .8s linear infinite}@keyframes ab-spin{to{transform:rotate(360deg)}}
      .ab-details{display:grid;grid-template-columns:minmax(0,1fr) minmax(160px,220px);gap:20px;padding:12px 14px 14px;border-top:1px solid #eee}
      .ab-heading{font:600 10.5px Poppins,sans-serif;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
      .ab-answer{font:400 12px/1.55 Poppins,sans-serif;color:#444;margin-bottom:10px}
      .ab-works{display:flex;flex-direction:column;gap:10px}
      .ab-work{position:relative;display:block;width:100%;padding:0;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;background:#fff;cursor:zoom-in;text-align:left}
      .ab-work:hover{border-color:#111}
      .ab-work img{display:block;width:100%;aspect-ratio:1;object-fit:cover}
      .ab-work-zoom{position:absolute;top:8px;right:8px;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:999px;background:rgba(17,17,17,.78);color:#fff;font:500 10.5px Poppins,sans-serif;opacity:0;transition:opacity .15s ease}
      .ab-work:hover .ab-work-zoom,.ab-work:focus-visible .ab-work-zoom{opacity:1}
      .ab-work-title{display:block;font:600 10px Poppins,sans-serif;padding:6px 8px;color:#555}
      .ab-lightbox{position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out}
      .ab-lightbox-inner{position:relative;max-width:min(960px,100%);max-height:100%;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:default}
      .ab-lightbox img{display:block;max-width:100%;max-height:calc(100vh - 110px);border-radius:12px;background:#fff;object-fit:contain}
      .ab-lightbox-title{color:#fff;font:500 12px Poppins,sans-serif}
      .ab-lightbox-close{position:absolute;top:-12px;right:-12px;width:34px;height:34px;border-radius:50%;border:0;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}
      .ab-selected-note{display:inline-flex;align-items:center;gap:5px;font:500 11px Poppins,sans-serif;color:#1e8a4c}
      .ab-modal-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)}.ab-modal{width:min(500px,100%);background:#fff;border:1px solid #e7e7e7;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22);padding:24px;position:relative;max-height:90vh;overflow:auto}.ab-close{position:absolute;right:14px;top:14px;width:32px;height:32px;border:1px solid #e6e6e6;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}.ab-icon{width:42px;height:42px;border-radius:12px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:14px}.ab-title{font:700 18px Poppins,sans-serif;color:#111}.ab-sub{font:400 11px/1.5 Poppins,sans-serif;color:#777;margin-top:4px}.ab-box{margin-top:20px;border:1px solid #e8e8e8;border-radius:13px;overflow:hidden}.ab-row{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #eee;font:500 12px Poppins,sans-serif;color:#555}.ab-row:last-child{border-bottom:0}.ab-row strong{color:#111}.ab-total{background:#f7f7f7;font-weight:700}.ab-total strong{font-size:15px}.ab-field{margin-top:14px}.ab-field label{display:block;font:600 11px Poppins,sans-serif;color:#444;margin-bottom:6px}.ab-field input,.ab-field textarea{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:9px;padding:10px 11px;outline:none;font:400 12px Poppins,sans-serif}.ab-field textarea{min-height:75px;resize:vertical}.ab-field input:focus,.ab-field textarea:focus{border-color:#111}.ab-actions-modal{display:flex;gap:8px;margin-top:18px}.ab-primary{flex:1;height:42px;border:0;border-radius:9px;background:#111;color:#fff;font:700 12px Poppins,sans-serif;cursor:pointer}.ab-secondary{height:42px;padding:0 15px;border:1px solid #ddd;border-radius:9px;background:#fff;color:#555;font:600 12px Poppins,sans-serif;cursor:pointer}.ab-foot{margin-top:12px;font:400 10px/1.5 Poppins,sans-serif;color:#888}.ab-success{padding:10px 12px;border-radius:9px;background:#f5f5f5;border:1px solid #e5e5e5;font:500 11px/1.5 Poppins,sans-serif;color:#555;margin-top:12px}
      @media(max-width:860px){.ab-row-card{grid-template-columns:minmax(0,1fr) auto}.ab-info{grid-column:1 / -1;order:3}.ab-actions{grid-column:1 / -1;order:4;justify-content:flex-start;flex-wrap:wrap}}
      @media(max-width:760px){.ab-details{grid-template-columns:1fr}.ab-work{max-width:140px}}
    `}</style>
    <div className="ab-wrap">
      {error && <div className="ab-error">{error}</div>}

      {!loading && applications.length > 0 && (
        <div className="tab-row" role="tablist" aria-label="Application status">
          {APP_TABS.map(item => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={`tab-pill ${tab === item.key ? 'active' : ''}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              <span className="tab-count">{tabCounts[item.key]}</span>
            </button>
          ))}
        </div>
      )}

      {loading && <div className="ab-empty">Loading applications…</div>}
      {!loading && applications.length === 0 && <div className="ab-empty">No applications yet.</div>}
      {!loading && applications.length > 0 && visible.length === 0 && (
        <div className="ab-empty">
          {query
            ? 'No applications match your search.'
            : `No ${APP_TABS.find(t => t.key === tab)?.label.toLowerCase()} yet.`}
        </div>
      )}

      <div className="ab-list">
        {!loading && visible.map(app => {
          const works = ((app.selected_portfolio || []) as any[]).filter(w => w?.media_url);
          const isOpen = expanded.has(app.id);
          const answers = app.application_answers || [];
          const social = parseSocialLink(app.social_link);
          return <article className="ab-card" key={app.id}>
            <div className="ab-row-card">
              <Link className="ab-person" to={`/creators/${app.creator_id}`}>
                <div className="ab-avatar">{app.creator_avatar ? <img src={mediaUrl(app.creator_avatar)} alt=""/> : (app.creator_name || 'C').slice(0,1).toUpperCase()}</div>
                <div className="ab-person-text">
                  <div className="ab-name">{app.creator_name || `Creator #${app.creator_id}`}<ExternalLink size={11} color="#999"/></div>
                  <div className="ab-date">Applied {new Date(app.created_at).toLocaleDateString()}</div>
                </div>
              </Link>

              <div className="ab-info">
                <div className="ab-campaign">{app.campaign_title || `Campaign #${app.campaign_id}`}</div>
                {social && (
                  <a className="ab-social" href={social.url} target="_blank" rel="noopener noreferrer nofollow" onClick={e => e.stopPropagation()}>
                    {social.platform} · {social.handle} <ExternalLink size={11}/>
                  </a>
                )}
                <div className="ab-amounts">
                  {[
                    app.campaign_budget != null ? `Budget NPR ${Number(app.campaign_budget).toLocaleString()}` : '',
                    app.rate != null ? `Proposed NPR ${Number(app.rate).toLocaleString()}` : '',
                  ].filter(Boolean).join('  ·  ') || 'No amounts added'}
                </div>
              </div>

              <span className={`ab-status ab-status--${app.status}`}>{statusLabel(app.status)}</span>

              <div className="ab-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleExpanded(app.id)} aria-expanded={isOpen}>
                  Details <ChevronDown size={14} className={`ab-chevron ${isOpen ? 'open' : ''}`}/>
                </button>
                {app.status === 'pending' && <>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy === app.id} onClick={() => void select(app)}>
                    {busy === app.id ? <Loader2 size={14} className="ab-spin"/> : <FileSignature size={14}/>} Create contract
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy === app.id} onClick={() => void reject(app)}>
                    <X size={14}/> Reject
                  </button>
                </>}
                {app.status === 'accepted' && <span className="ab-selected-note"><Check size={13}/> Creator selected</span>}
              </div>
            </div>

            {isOpen && <div className="ab-details">
              <div>
                <div className="ab-heading">Social profile</div>
                <div className="ab-answer">
                  {social
                    ? <a className="ab-social" href={social.url} target="_blank" rel="noopener noreferrer nofollow">{social.platform} · {social.handle} <ExternalLink size={11}/></a>
                    : 'No social profile was added.'}
                </div>
                <div className="ab-heading">Screening answers</div>
                {answers.length === 0
                  ? <div className="ab-answer">No screening questions were added.</div>
                  : answers.map((answer,i)=><div className="ab-answer" key={i}><strong>{answer.question}</strong><br/>{answer.answer}</div>)}
              </div>
              <div>
                <div className="ab-heading">Work sample</div>
                {works.length === 0
                  ? <div className="ab-answer">No work image attached.</div>
                  : <div className="ab-works">
                      {works.map((work, i) => (
                        <button
                          type="button"
                          key={`${work.media_url}-${i}`}
                          className="ab-work"
                          onClick={() => setPreview({ src: mediaUrl(work.media_url), title: work.title || 'Work sample' })}
                          aria-label={`View ${work.title || 'work sample'} full size`}
                        >
                          <img src={mediaUrl(work.media_url)} alt={work.title || 'Work sample'}/>
                          <span className="ab-work-zoom"><ZoomIn size={13}/> View</span>
                          <span className="ab-work-title">{work.title || 'Work sample'}</span>
                        </button>
                      ))}
                    </div>}
              </div>
            </div>}
          </article>;
        })}
      </div>
    </div>

    {preview && <div className="ab-lightbox" role="dialog" aria-modal="true" aria-label="Work sample preview" onClick={() => setPreview(null)}>
      <div className="ab-lightbox-inner" onClick={e => e.stopPropagation()}>
        <button type="button" className="ab-lightbox-close" onClick={() => setPreview(null)} aria-label="Close preview"><X size={16}/></button>
        <img src={preview.src} alt={preview.title}/>
        <div className="ab-lightbox-title">{preview.title}</div>
      </div>
    </div>}

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

        {contract.status === 'pending_payment' && <KhaltiPaymentForm
          contract={contract}
          onCancel={() => setContract(null)}
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
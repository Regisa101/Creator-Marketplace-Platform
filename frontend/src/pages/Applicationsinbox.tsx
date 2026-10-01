import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseSocialLink } from '../utils/social';
import { Check, ChevronDown, FileSignature, Loader2, X, ExternalLink, ZoomIn } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApplications, selectApplication, updateApplicationStatus, finalizeContract, getContract, getCreatorProfile, getPublicBusinessProfile, type Application, type Contract } from '../api/client';
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

function shortDate(value?: string | null) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// The campaign fixed the amount when it was created ("Custom amount"), so the
// brand cannot change it while finalizing the contract.
function isAmountLocked(contract: Contract) {
  return (
    (contract.compensation_type || '').trim().toLowerCase() === 'custom amount' &&
    contract.agreed_rate != null &&
    Number(contract.agreed_rate) > 0
  );
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
  const [creatorPic, setCreatorPic] = useState('');
  const [brandPic, setBrandPic] = useState('');

  // Load profile pictures for the checkout popup (shown when they exist).
  useEffect(() => {
    setCreatorPic('');
    setBrandPic('');
    if (!contract) return;
    let cancelled = false;

    getCreatorProfile(contract.creator_id)
      .then(p => { if (!cancelled && p.profile_image) setCreatorPic(mediaUrl(p.profile_image)); })
      .catch(() => undefined);
    getPublicBusinessProfile(contract.business_id)
      .then(p => { if (!cancelled && p.logo_url) setBrandPic(mediaUrl(p.logo_url)); })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [contract?.id]);
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
    // Amount fixed when the campaign was created -> use the contract's own
    // numbers, never what is typed into the form.
    const locked = isAmountLocked(contract);
    const agreed = locked ? Number(contract.agreed_rate) : Number(rate);
    const totalValue = locked ? Number(contract.total_value) : Number(total);
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
      .ab-lightbox{position:fixed;inset:0;z-index:20010;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:24px;cursor:zoom-out}
      .ab-lightbox-inner{position:relative;max-width:min(960px,100%);max-height:100%;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:default}
      .ab-lightbox img{display:block;max-width:100%;max-height:calc(100vh - 110px);border-radius:12px;background:#fff;object-fit:contain}
      .ab-lightbox-title{color:#fff;font:500 12px Poppins,sans-serif}
      .ab-lightbox-close{position:absolute;top:-12px;right:-12px;width:34px;height:34px;border-radius:50%;border:0;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}
      .ab-selected-note{display:inline-flex;align-items:center;gap:5px;font:500 11px Poppins,sans-serif;color:#1e8a4c}
      .ab-modal-backdrop{position:fixed;inset:0;z-index:20000;background:rgba(15,15,18,.52);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(3px)}
      .ab-modal{width:min(900px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;background:#fff;border:1px solid #e7e7e7;border-radius:20px;box-shadow:0 28px 80px rgba(0,0,0,.26);position:relative;overflow:hidden;font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .ab-modal-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 28px;border-bottom:1px solid #eee}
      .ab-title{font:600 19px Poppins,sans-serif;color:#111}
      .ab-sub{margin-top:3px;font:400 13px/1.5 Poppins,sans-serif;color:#777}
      .ab-close{flex:none;width:34px;height:34px;border:1px solid #e6e6e6;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#555}
      .ab-close:hover{background:#f5f5f5}
      .ab-checkout{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);min-height:0;overflow:auto}
      .ab-side{padding:24px 28px 28px;background:#fafafa;border-right:1px solid #eee}
      .ab-main{padding:24px 28px 28px;min-width:0}
      .ab-eyebrow{margin-bottom:10px;font:600 10.5px Poppins,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#999}
      .ab-hero{width:100%;aspect-ratio:16/8;border-radius:12px;overflow:hidden;background:#ececee;display:flex;align-items:center;justify-content:center;color:#b5b5ba}
      .ab-hero img{width:100%;height:100%;object-fit:cover;display:block}
      .ab-camp-title{margin-top:14px;font:600 16px/1.35 Poppins,sans-serif;color:#111}
      .ab-camp-sub{margin-top:3px;font:400 12.5px Poppins,sans-serif;color:#777}
      .ab-people{margin-top:16px;border:1px solid #e8e8e8;border-radius:12px;background:#fff}
      .ab-person-row{display:flex;align-items:center;gap:11px;padding:11px 14px}
      .ab-person-row+.ab-person-row{border-top:1px solid #f0f0f0}
      .ab-person-row .ab-avatar{width:34px;height:34px}
      .ab-person-name{font:600 13px Poppins,sans-serif;color:#111}
      .ab-person-role{font:400 11.5px Poppins,sans-serif;color:#888}
      .ab-facts{margin-top:14px;border:1px solid #e8e8e8;border-radius:12px;background:#fff;overflow:hidden}
      .ab-fact{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:11px 14px;border-bottom:1px solid #f0f0f0;font:400 12.5px Poppins,sans-serif;color:#777}
      .ab-fact:last-child{border-bottom:0}
      .ab-fact span{flex:none}
      .ab-fact strong{color:#111;font-weight:500;text-align:right;min-width:0;overflow-wrap:anywhere}
      .ab-section-title{font:600 15px Poppins,sans-serif;color:#111;margin:0 0 4px}
      .ab-section-sub{font:400 12.5px/1.55 Poppins,sans-serif;color:#777;margin:0 0 6px}
      .ab-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
      .ab-field{margin-top:14px}
      .ab-fields .ab-field{margin-top:0}
      .ab-field label{display:block;font:600 12px Poppins,sans-serif;color:#444;margin-bottom:6px}
      .ab-field input,.ab-field textarea{width:100%;box-sizing:border-box;border:1px solid #dcdcdc;border-radius:10px;padding:12px 13px;outline:none;font:400 14px Poppins,sans-serif;background:#fff}
      .ab-field textarea{min-height:96px;resize:vertical}
      .ab-field input:focus,.ab-field textarea:focus{border-color:#111}
      .ab-locked{display:flex;align-items:center;justify-content:space-between;gap:8px;box-sizing:border-box;width:100%;border:1px solid #e5e5e5;border-radius:10px;padding:12px 13px;background:#f5f5f5;color:#444;font:500 14px Poppins,sans-serif;cursor:not-allowed}
      .ab-actions-modal{display:flex;gap:10px;margin-top:22px}
      .ab-primary{flex:1;height:46px;border:1px solid #111;border-radius:10px;background:#111;color:#fff;font:600 13.5px Poppins,sans-serif;cursor:pointer;transition:background-color .15s ease}
      .ab-primary:hover:not(:disabled){background:#000}
      .ab-primary:disabled{opacity:.55;cursor:not-allowed}
      .ab-secondary{height:46px;padding:0 22px;border:1px solid #dcdcdc;border-radius:10px;background:#fff;color:#333;font:600 13.5px Poppins,sans-serif;cursor:pointer}
      .ab-secondary:hover{background:#f5f5f5;border-color:#c4c4c4}
      .ab-foot{margin-top:14px;font:400 12px/1.55 Poppins,sans-serif;color:#888}
      .ab-done{text-align:center;padding:10px 0 4px}
      .ab-done-icon{width:56px;height:56px;margin:0 auto 12px;border-radius:50%;background:#e9f6ee;color:#1e8a4c;display:flex;align-items:center;justify-content:center}
      .ab-done h3{margin:0;font:600 17px Poppins,sans-serif;color:#111}
      .ab-done p{margin:6px auto 0;max-width:340px;font:400 13px/1.6 Poppins,sans-serif;color:#666}
      .ab-table{margin-top:20px;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden}
      .ab-line{display:flex;justify-content:space-between;gap:16px;padding:12px 14px;border-bottom:1px solid #f0f0f0;font:400 13px Poppins,sans-serif;color:#666}
      .ab-line:last-child{border-bottom:0}
      .ab-line strong{color:#111;font-weight:500;text-align:right;overflow-wrap:anywhere}
      @media(max-width:820px){.ab-checkout{grid-template-columns:1fr}.ab-side{border-right:0;border-bottom:1px solid #eee}.ab-modal{max-height:calc(100vh - 24px)}.ab-modal-backdrop{padding:12px}}
      @media(max-width:480px){.ab-fields{grid-template-columns:1fr}.ab-actions-modal{flex-direction:column-reverse}.ab-secondary{padding:0}.ab-side,.ab-main{padding:20px}.ab-modal-head{padding:16px 20px}}
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

    {preview && createPortal(<div className="ab-lightbox" role="dialog" aria-modal="true" aria-label="Work sample preview" onClick={() => setPreview(null)}>
      <div className="ab-lightbox-inner" onClick={e => e.stopPropagation()}>
        <button type="button" className="ab-lightbox-close" onClick={() => setPreview(null)} aria-label="Close preview"><X size={16}/></button>
        <img src={preview.src} alt={preview.title}/>
        <div className="ab-lightbox-title">{preview.title}</div>
      </div>
    </div>, document.body)}

    {contract && createPortal(<div className="ab-modal-backdrop" role="dialog" aria-modal="true">
      {(() => {
        const snap: any = contract.evidence_snapshot?.campaign;
        const creatorApp = applications.find(a => a.id === contract.application_id);
        const creatorName = contract.creator_name || creatorApp?.creator_name || 'Selected creator';
        const meta = [snap?.category, snap?.location].filter(Boolean).join(' · ');
        return <div className="ab-modal">
          <div className="ab-modal-head">
            <div>
              <div className="ab-title">
                {contract.status === 'draft' && 'Finalize contract'}
                {contract.status === 'pending_payment' && 'Checkout · Pay platform fee'}
                {(contract.status === 'active' || contract.status === 'completed') && 'Contract active'}
              </div>
              <div className="ab-sub">
                {contract.status === 'draft' && 'Confirm the terms, then continue to payment.'}
                {contract.status === 'pending_payment' && 'Review the collaboration and pay the CreatorHub service fee to activate it.'}
                {(contract.status === 'active' || contract.status === 'completed') && 'Payment received. The collaboration is underway.'}
              </div>
            </div>
            <button type="button" className="ab-close" onClick={() => setContract(null)} aria-label="Close"><X size={16}/></button>
          </div>

          <div className="ab-checkout">
            {/* LEFT: which campaign / who / what */}
            <aside className="ab-side">
              <div className="ab-eyebrow">Campaign</div>
              <div className="ab-camp-title" style={{marginTop:0}}>{contract.campaign_title || snap?.title || `Campaign #${contract.campaign_id}`}</div>
              {meta && <div className="ab-camp-sub">{meta}</div>}

              <div className="ab-people">
                <div className="ab-person-row">
                  <div className="ab-avatar">{(creatorPic || creatorApp?.creator_avatar) ? <img src={creatorPic || mediaUrl(creatorApp?.creator_avatar)} alt=""/> : creatorName.slice(0,1).toUpperCase()}</div>
                  <div><div className="ab-person-name">{creatorName}</div><div className="ab-person-role">Creator</div></div>
                </div>
                <div className="ab-person-row">
                  <div className="ab-avatar">{brandPic ? <img src={brandPic} alt=""/> : (contract.business_name || 'B').slice(0,1).toUpperCase()}</div>
                  <div><div className="ab-person-name">{contract.business_name || 'Your business'}</div><div className="ab-person-role">Brand (you)</div></div>
                </div>
              </div>

              <div className="ab-eyebrow" style={{marginTop:20}}>Timeline</div>
              <div className="ab-facts" style={{marginTop:0}}>
                <div className="ab-fact"><span>Applications close</span><strong>{shortDate(snap?.application_deadline)}</strong></div>
                <div className="ab-fact"><span>Start date</span><strong>{shortDate(contract.start_date)}</strong></div>
                <div className="ab-fact"><span>End date</span><strong>{shortDate(contract.end_date)}</strong></div>
                <div className="ab-fact"><span>Duration</span><strong>{contract.duration || 'Not specified'}</strong></div>
              </div>

              <div className="ab-eyebrow" style={{marginTop:20}}>Terms</div>
              <div className="ab-facts" style={{marginTop:0}}>
                <div className="ab-fact"><span>Engagement</span><strong>{contract.engagement_type || 'Not specified'}</strong></div>
                <div className="ab-fact"><span>Compensation</span><strong>{contract.compensation_type || 'Negotiable'}</strong></div>
              </div>
            </aside>

            {/* RIGHT: the action */}
            <section className="ab-main">
              {contract.status === 'draft' && <>
                <h3 className="ab-section-title">Contract terms</h3>
                <p className="ab-section-sub">These are the final terms for {creatorName}.</p>

                {isAmountLocked(contract) ? <>
                  <div className="ab-fields">
                    <div className="ab-field"><label>Agreed rate (NPR)</label><div className="ab-locked"><span>{Number(contract.agreed_rate).toLocaleString()}</span></div></div>
                    <div className="ab-field"><label>Total contract value (NPR)</label><div className="ab-locked"><span>{Number(contract.total_value || 0).toLocaleString()}</span></div></div>
                  </div>
                  <div className="ab-foot" style={{marginTop:10}}>This amount was confirmed when you created the campaign, so it can't be changed here.</div>
                </> : <div className="ab-fields">
                  <div className="ab-field"><label>Final agreed rate (NPR)</label><input type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 40000"/></div>
                  <div className="ab-field"><label>Total contract value (NPR)</label><input type="number" min="0" step="0.01" value={total} onChange={e => setTotal(e.target.value)} placeholder="e.g. 240000"/></div>
                </div>}

                <div className="ab-field"><label>Terms note (optional)</label><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add any agreed terms, deliverables or payment arrangement notes..."/></div>

                <div className="ab-actions-modal"><button type="button" className="ab-secondary" onClick={() => setContract(null)}>Later</button><button type="button" className="ab-primary" disabled={busy === contract.application_id} onClick={() => void finalize()}>{busy === contract.application_id ? 'Saving…' : 'Continue to payment'}</button></div>
                <div className="ab-foot">CreatorHub calculates the 10% service fee for your records. You'll pay it on the next step.</div>
              </>}

              {contract.status === 'pending_payment' && <>
                <h3 className="ab-section-title">Payment</h3>
                <p className="ab-section-sub">Review the amount and pay securely with Khalti.</p>
                <KhaltiPaymentForm contract={contract} onCancel={() => setContract(null)} />
              </>}

              {(contract.status === 'active' || contract.status === 'completed') && <>
                <div className="ab-done">
                  <div className="ab-done-icon"><Check size={28}/></div>
                  <h3>Payment received</h3>
                  <p>This contract is active and the creator has been notified of the contract amount.</p>
                </div>
                <div className="ab-table">
                  <div className="ab-line"><span>Contract value</span><strong>NPR {Number(contract.total_value || 0).toLocaleString()}</strong></div>
                  <div className="ab-line"><span>CreatorHub service fee (10%)</span><strong>NPR {Number(contract.platform_fee_amount || 0).toLocaleString()}</strong></div>
                  {contract.fee_paid_at && <div className="ab-line"><span>Paid on</span><strong>{new Date(contract.fee_paid_at).toLocaleDateString()}</strong></div>}
                  {contract.payment_reference && <div className="ab-line"><span>Receipt</span><strong>{contract.payment_reference}</strong></div>}
                </div>
                <div className="ab-actions-modal"><button type="button" className="ab-primary" onClick={() => setContract(null)}>Done</button></div>
              </>}
            </section>
          </div>
        </div>;
      })()}
    </div>, document.body)}
  </AppLayout>;
}

export default ApplicationsInbox;
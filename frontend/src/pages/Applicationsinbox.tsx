import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { getApplications, updateApplicationStatus, getNegotiation, makeNegotiationOffer, acceptNegotiationOffer, rejectNegotiationOffer, type Application, type ApplicationStatus, type NegotiationOffer } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';

const C = {
  surface: '#FBF8F4',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  navy: '#7661A1',
  navySoft: '#F0EBF6',
  coral: '#F47C78',
  coralSoft: '#FDEBE9',
};

const TABS: { key: ApplicationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

type SortKey = 'match' | 'recent';

export function ApplicationsInbox() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('pending');
  const [sortBy, setSortBy] = useState<SortKey>('match');
  const [campaignFilter, setCampaignFilter] = useState<number | 'all'>('all');
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null);
  const [negotiatingApp, setNegotiatingApp] = useState<Application | null>(null);
  const [offers, setOffers] = useState<NegotiationOffer[]>([]);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [negotiationLoading, setNegotiationLoading] = useState(false);
  const [negotiationError, setNegotiationError] = useState('');
  const [matchDetailApp, setMatchDetailApp] = useState<Application | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (err) {
      console.error('Could not load applications:', err);
      if (!silent) setError('Could not load applications. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Keep the brand inbox fresh while it is open. A creator's application
    // should appear as soon as it reaches the backend; it must not wait for
    // another creator to apply or for the brand to navigate away and back.
    // The refresh is silent (no spinner/flash) and pauses while a modal is
    // open so it never interrupts something the user is in the middle of.
    if (!isBusiness) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !negotiatingApp && !matchDetailApp) {
        load({ silent: true });
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [isBusiness, negotiatingApp, matchDetailApp]);

  // Every distinct campaign the business has applications for. Used to power
  // the "which campaign" filter so a brand running several campaigns at once
  // can jump straight to one instead of scanning every grouped section.
  const campaignOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of applications) {
      if (!map.has(a.campaign_id)) {
        map.set(a.campaign_id, a.campaign_title || `Campaign #${a.campaign_id}`);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [applications]);

  // If the currently selected campaign disappears from the list (e.g. all its
  // applications got filtered out elsewhere), fall back to "All campaigns".
  useEffect(() => {
    if (campaignFilter !== 'all' && !campaignOptions.some((c) => c.id === campaignFilter)) {
      setCampaignFilter('all');
    }
  }, [campaignOptions, campaignFilter]);

  // Tab filter, then campaign filter, then free-text search over campaign
  // title / creator name (the search box lives in AppLayout's topbar, so it
  // needs to reach in here).
  const tabFiltered = useMemo(() => {
    let list = activeTab === 'all' ? applications : applications.filter((a) => a.status === activeTab);
    if (campaignFilter !== 'all') list = list.filter((a) => a.campaign_id === campaignFilter);
    return list;
  }, [applications, activeTab, campaignFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((a) => {
      const campaignTitle = (a.campaign_title || '').toLowerCase();
      const creatorName = (a.creator_name || '').toLowerCase();
      return campaignTitle.includes(q) || creatorName.includes(q);
    });
  }, [tabFiltered, search]);

  // Group by campaign so a business managing several campaigns doesn't
  // get one long undifferentiated list — each campaign gets its own section.
  const grouped = useMemo(() => {
    const map = new Map<number, { campaignId: number; campaignTitle: string; items: Application[] }>();
    for (const app of filtered) {
      const key = app.campaign_id;
      if (!map.has(key)) {
        map.set(key, { campaignId: key, campaignTitle: app.campaign_title || `Campaign #${key}`, items: [] });
      }
      map.get(key)!.items.push(app);
    }
    return Array.from(map.values()).map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return (b.match_score ?? -1) - (a.match_score ?? -1);
      }),
    }));
  }, [filtered, sortBy]);

  const handleAction = async (app: Application, status: 'accepted' | 'rejected') => {
    setActingOn(app.id);
    setActionError(null);
    try {
      const updated = await updateApplicationStatus(app.id, status);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err: any) {
      console.error('Could not update application:', err);
      setActionError({
        id: app.id,
        message: err?.response?.data?.detail || 'Could not update this application.',
      });
    } finally {
      setActingOn(null);
    }
  };

  const openNegotiation = async (app: Application) => {
    setNegotiatingApp(app);
    setNegotiationError('');
    setOfferAmount(app.agreed_rate?.toString() || app.rate?.toString() || app.campaign_budget?.toString() || '');
    setOfferMessage('');
    try {
      setNegotiationLoading(true);
      setOffers(await getNegotiation(app.id));
    } catch (err: any) {
      setNegotiationError(err?.response?.data?.detail || 'Could not load negotiation.');
    } finally {
      setNegotiationLoading(false);
    }
  };

  const refreshNegotiation = async () => {
    if (!negotiatingApp) return;
    setOffers(await getNegotiation(negotiatingApp.id));
    const apps = await getApplications();
    setApplications(apps);
    const updated = apps.find((a) => a.id === negotiatingApp.id);
    if (updated) setNegotiatingApp(updated);
  };

  const sendOffer = async () => {
    if (!negotiatingApp) return;
    const amount = Number(offerAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setNegotiationError('Enter a valid amount greater than 0.'); return; }
    try {
      setNegotiationLoading(true); setNegotiationError('');
      await makeNegotiationOffer(negotiatingApp.id, amount, offerMessage.trim() || undefined);
      setOfferMessage('');
      await refreshNegotiation();
    } catch (err: any) {
      setNegotiationError(err?.response?.data?.detail || 'Could not send the offer.');
    } finally { setNegotiationLoading(false); }
  };

  const respondToOffer = async (offer: NegotiationOffer, action: 'accept' | 'reject') => {
    if (!negotiatingApp) return;
    try {
      setNegotiationLoading(true); setNegotiationError('');
      if (action === 'accept') await acceptNegotiationOffer(negotiatingApp.id, offer.id);
      else await rejectNegotiationOffer(negotiatingApp.id, offer.id);
      await refreshNegotiation();
    } catch (err: any) {
      setNegotiationError(err?.response?.data?.detail || 'Could not respond to the offer.');
    } finally { setNegotiationLoading(false); }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: applications.length, pending: 0, accepted: 0, rejected: 0, withdrawn: 0 };
    for (const a of applications) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [applications]);

  return (
    <AppLayout
      title={isBusiness ? 'Applications' : 'My Applications'}
      subtitle={
        isBusiness
          ? "Review and respond to creators who've applied to your campaigns."
          : "Track the status of campaigns you've applied to."
      }
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={isBusiness ? 'Search by creator or campaign…' : 'Search your applications…'}
      actionLabel={isBusiness ? 'New Campaign' : undefined}
      actionTo={isBusiness ? '/campaigns/new' : undefined}
    >
      <style>{`
        .ai-content {
          padding: 28px 24px 40px;
          max-width: 900px;
          margin: 0 auto;
        }

        .ai-tabs { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
        .ai-tabs-left { display: flex; gap: 10px; flex-wrap: wrap; }
        .ai-tabs-right { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .ai-tab {
          font-size: 14.5px;
          font-weight: 600;
          padding: 12px 24px;
          border-radius: 999px;
          border: 1px solid ${C.line};
          background: ${C.card};
          color: ${C.inkSoft};
          cursor: pointer;
        }
        .ai-tab--active { background: ${primary}; border-color: ${primary}; color: #fff; }

        .ai-sort-select {
          font-size: 13px;
          font-weight: 600;
          color: ${C.ink};
          background: ${C.card};
          border: 1px solid ${C.line};
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          outline: none;
        }

        .ai-group { margin-bottom: 28px; }
        .ai-group-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid ${C.line};
          color: ${C.ink};
        }
        .ai-group-title a { color: inherit; text-decoration: none; }
        .ai-group-title a:hover { text-decoration: underline; }

        .ai-card {
          background: ${C.card};
          border: 1px solid ${C.line};
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 12px;
        }
        .ai-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
        .ai-applicant { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .ai-applicant:hover .ai-applicant-name { text-decoration: underline; }
        .ai-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: ${primary}; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px; flex-shrink: 0;
          object-fit: cover;
        }
        .ai-applicant-name { font-size: 14px; font-weight: 600; color: ${C.ink}; }
        .ai-applicant-date { font-size: 12px; color: ${C.inkSoft}; }

        .ai-status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 999px;
          text-transform: capitalize;
          flex-shrink: 0;
        }
        .ai-status-pill--pending { background: #fff4de; color: #9a6b00; }
        .ai-status-pill--accepted { background: #e6f7ec; color: #1a8a4a; }
        .ai-status-pill--rejected { background: #fdecec; color: #d64545; }
        .ai-status-pill--withdrawn { background: #f1f0f5; color: ${C.inkSoft}; }

        .ai-proposal { font-size: 13.5px; color: #3d3d42; line-height: 1.65; margin-bottom: 10px; white-space: pre-wrap; }
        .ai-rate { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.navy}; margin-bottom: 10px; }
        .ai-message { font-size: 12.5px; color: ${C.inkSoft}; background: ${C.surface}; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }

        .ai-actions { display: flex; gap: 8px; }
        .ai-accept, .ai-reject {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 16px;
          cursor: pointer;
          border: none;
        }
        .ai-accept { background: #1a8a4a; color: #fff; }
        .ai-reject { background: #fdecec; color: #d64545; }
        .ai-accept:disabled, .ai-reject:disabled { opacity: 0.6; cursor: not-allowed; }
        .ai-action-error { font-size: 12px; color: #d64545; margin-top: 8px; }

        .ai-match { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .ai-match-score {
          font-size:13px; font-weight:800; color:#16834A; background:#EAF8F0;
          border-radius:999px; padding:5px 10px; border: none; cursor: pointer;
        }
        .ai-match-score:hover { background:#DEF3E6; }
        .ai-match-label { font-size:11.5px; font-weight:700; color:${C.inkSoft}; }
        .ai-match-breakdown { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 11px; }
        .ai-match-chip { font-size:10.5px; color:${C.inkSoft}; background:${C.surface}; border:1px solid ${C.line}; border-radius:999px; padding:4px 8px; }
        .ai-match-chip--good { color:#16834A; background:#F0FAF4; border-color:#CDEEDB; }
        .ai-why { font-size:11.5px; color:${C.inkSoft}; line-height:1.5; background:#FAFAFD; border-radius:8px; padding:8px 10px; margin-bottom:11px; }

        .ai-negotiate { display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;border:1px solid ${C.navy};background:#fff;color:${C.navy};border-radius:8px;padding:8px 14px;cursor:pointer; }
        .ai-select { display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;border:0;background:#1a8a4a;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer; }
        .ai-select:disabled,.ai-negotiate:disabled { opacity:.55;cursor:not-allowed; }
        .ai-neg-summary { margin:10px 0 12px;padding:10px 12px;border:1px solid ${C.line};border-radius:10px;background:#FAFAFD;font-size:12px;color:${C.inkSoft}; }
        .ai-modal-backdrop { position:fixed;inset:0;background:rgba(26,22,37,.48);z-index:120;display:flex;align-items:center;justify-content:center;padding:20px; }
        .ai-modal { width:100%;max-width:560px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.18); }
        .ai-modal-head { display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px; }
        .ai-modal-title { font-size:17px;font-weight:800;color:${C.ink}; }
        .ai-modal-sub { font-size:11.5px;color:${C.inkSoft};margin-top:3px; }
        .ai-offers { max-height:280px;overflow:auto;border:1px solid ${C.line};border-radius:10px;padding:10px;margin-bottom:12px; }
        .ai-offer { padding:10px 4px;border-bottom:1px solid ${C.line}; }
        .ai-offer:last-child { border-bottom:0; }
        .ai-offer-row { display:flex;justify-content:space-between;gap:8px;align-items:center; }
        .ai-offer-amount { font-size:14px;font-weight:800;color:${C.navy}; }
        .ai-offer-meta { font-size:10.5px;color:${C.inkSoft}; }
        .ai-offer-message { font-size:11.5px;color:#3d3d42;margin-top:5px;white-space:pre-wrap; }
        .ai-offer-actions { display:flex;gap:6px;margin-top:8px; }
        .ai-modal-input { width:100%;height:40px;border:1px solid ${C.line};border-radius:8px;padding:0 10px;font-size:12px;outline:none;box-sizing:border-box; }
        .ai-modal-textarea { width:100%;min-height:70px;border:1px solid ${C.line};border-radius:8px;padding:9px 10px;font-size:12px;resize:vertical;box-sizing:border-box; }
        .ai-modal-label { display:block;font-size:11.5px;font-weight:700;color:${C.ink};margin:9px 0 5px; }
        .ai-modal-footer { display:flex;justify-content:flex-end;gap:8px;margin-top:12px; }
        .ai-close { border:1px solid ${C.line};background:#fff;color:${C.inkSoft};border-radius:8px;padding:8px 13px;cursor:pointer;font-size:12px;font-weight:700; }
        .ai-send { border:0;background:${C.navy};color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:700; }
        .ai-send:disabled { opacity:.55;cursor:not-allowed; }
        .ai-neg-error { margin:8px 0;padding:9px 10px;border-radius:8px;background:#fdecec;color:#d64545;font-size:11.5px; }
        .ai-state { text-align: center; padding: 60px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .ai-spin { animation: ai-spin 0.8s linear infinite; }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ai-content">
        <div className="ai-tabs">
          <div className="ai-tabs-left">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`ai-tab ${activeTab === tab.key ? 'ai-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label} ({counts[tab.key] || 0})
              </button>
            ))}
          </div>
          {isBusiness && (
            <div className="ai-tabs-right">
              {campaignOptions.length > 1 && (
                <select
                  className="ai-sort-select"
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  aria-label="Filter by campaign"
                >
                  <option value="all">All campaigns</option>
                  {campaignOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              )}
              <select
                className="ai-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sort applications"
              >
                <option value="match">Sort: Best match</option>
                <option value="recent">Sort: Most recent</option>
              </select>
            </div>
          )}
        </div>

        {loading && <div className="ai-state">Loading applications…</div>}
        {!loading && error && <div className="ai-state">{error}</div>}

        {!loading && !error && grouped.length === 0 && (
          <div className="ai-state">
            {search.trim()
              ? 'No applications match your search.'
              : `No ${activeTab !== 'all' ? activeTab : ''} applications${activeTab === 'pending' ? ' right now' : ''}.`}
          </div>
        )}

        {!loading &&
          !error &&
          grouped.map((group) => (
            <div className="ai-group" key={group.campaignId}>
              <div className="ai-group-title">
                <Link to={`/campaigns/${group.campaignId}`}>{group.campaignTitle}</Link>
                {isBusiness && (
                  <span style={{ float: 'right', fontWeight: 500, color: C.inkSoft }}>
                    {group.items.length} application{group.items.length === 1 ? '' : 's'}
                    {group.items[0]?.creators_needed ? ` · ${group.items[0].creators_needed} creator${group.items[0].creators_needed === 1 ? '' : 's'} needed` : ''}
                  </span>
                )}
              </div>

              {group.items.map((app) => (
                <div className="ai-card" key={app.id}>
                  <div className="ai-card-top">
                    {isBusiness ? (
                      <Link to={`/creators/${app.creator_id}`} className="ai-applicant">
                        {app.creator_avatar ? (
                          <img className="ai-avatar" src={app.creator_avatar} alt={app.creator_name || 'Creator'} />
                        ) : (
                          <div className="ai-avatar">{(app.creator_name || 'C')[0].toUpperCase()}</div>
                        )}
                        <div>
                          <div className="ai-applicant-name">{app.creator_name || `Creator #${app.creator_id}`}</div>
                          <div className="ai-applicant-date">
                            Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="ai-applicant-date">
                        Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <span className={`ai-status-pill ai-status-pill--${app.status}`}>{app.status}</span>
                  </div>

                  {isBusiness && app.match_score != null && (
                    <div className="ai-match">
                      <button
                        type="button"
                        className="ai-match-score"
                        onClick={() => setMatchDetailApp(app)}
                      >
                        {app.match_score}% matching
                      </button>
                      <span className="ai-match-label">{app.match_score >= 90 ? 'Recommended creator' : app.match_score >= 75 ? 'Good Match' : 'Other Applicant'}</span>
                    </div>
                  )}

                  <div className="ai-proposal">{app.proposal}</div>

                  {isBusiness && (app.completed_collaborations ?? 0) > 0 && (
                    <div style={{fontSize:11.5,color:C.inkSoft,marginTop:7}}>{app.completed_collaborations} completed collaboration{app.completed_collaborations === 1 ? '' : 's'} · <Link to={`/creators/${app.creator_id}`} style={{color:C.navy,fontWeight:700}}>View profile & history</Link></div>
                  )}

                  {isBusiness && app.selected_portfolio && app.selected_portfolio.length > 0 && (
                    <div style={{marginTop:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.inkSoft,marginBottom:6}}>Selected work</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                        {app.selected_portfolio.slice(0,4).map((item:any,i:number)=><div key={i} style={{border:'1px solid #EAE7F2',borderRadius:8,overflow:'hidden'}}>{item.media_url && <img src={item.media_url} alt={item.title || 'Work'} style={{width:'100%',aspectRatio:1,objectFit:'cover',display:'block'}} />}<div style={{fontSize:9,padding:'4px 5px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.title}</div></div>)}
                      </div>
                    </div>
                  )}

                  {isBusiness && app.application_answers && app.application_answers.length > 0 && (
                    <div style={{marginTop:10,fontSize:11.5}}>
                      {app.application_answers.map((a:any,i:number)=><div key={i} style={{marginBottom:6}}><strong>{a.question}</strong><div style={{color:C.inkSoft,marginTop:2}}>{a.answer}</div></div>)}
                    </div>
                  )}

                  {app.rate != null && (
                    <div className="ai-rate">
                      Rs. {app.rate.toLocaleString()}
                    </div>
                  )}

                  {app.message && <div className="ai-message">{app.message}</div>}

                  {app.status === 'pending' && (
                    <div className="ai-actions">
                      {app.campaign_type === 'paid' && (
                        <button className="ai-negotiate" onClick={() => openNegotiation(app)} disabled={negotiationLoading}>
                          <MessageCircle size={14} /> {app.negotiation_status === 'agreed' ? 'View agreed deal' : 'Negotiate payment'}
                        </button>
                      )}
                      {isBusiness && (
                        <button
                          className="ai-select"
                          disabled={actingOn === app.id || (app.campaign_type === 'paid' && (!app.rate_locked || app.agreed_rate == null))}
                          onClick={() => handleAction(app, 'accepted')}
                        >
                          {actingOn === app.id ? <Loader2 size={14} className="ai-spin" /> : <Check size={14} />}
                          {app.campaign_type === 'paid' && (!app.rate_locked || app.agreed_rate == null) ? 'Agree on payment first' : 'Select creator'}
                        </button>
                      )}
                      {isBusiness && (
                        <button className="ai-reject" disabled={actingOn === app.id} onClick={() => handleAction(app, 'rejected')}>
                          <X size={14} /> Reject
                        </button>
                      )}
                    </div>
                  )}

                  {actionError?.id === app.id && <div className="ai-action-error">{actionError.message}</div>}
                </div>
              ))}
            </div>
          ))}
      </div>

      {matchDetailApp && (
        <div className="ai-modal-backdrop" onClick={() => setMatchDetailApp(null)}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-head">
              <div>
                <div className="ai-modal-title">{matchDetailApp.match_score}% matching</div>
                <div className="ai-modal-sub">{matchDetailApp.creator_name || `Creator #${matchDetailApp.creator_id}`} · {matchDetailApp.campaign_title || 'Campaign'}</div>
              </div>
              <button className="ai-close" onClick={() => setMatchDetailApp(null)}>Close</button>
            </div>

            <div className="ai-match-breakdown">
              {(matchDetailApp.match_breakdown || []).map((b) => (
                <span key={b.key} className={`ai-match-chip ${b.matched ? 'ai-match-chip--good' : ''}`}>
                  {b.label} · {b.matched ? 'matched' : 'not matched'} · {b.score}/{b.max}
                </span>
              ))}
            </div>

            {matchDetailApp.match_configured_count ? (
              <div className="ai-why">
                <strong>Why we're suggesting them:</strong> Their profile matches {matchDetailApp.match_reasons?.filter((r) => r.endsWith('✓')).length ?? 0}/{matchDetailApp.match_configured_count - 1} configured campaign requirements. Experience is shown as a soft signal and never automatically rejects a creator.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {negotiatingApp && (
        <div className="ai-modal-backdrop" onClick={() => !negotiationLoading && setNegotiatingApp(null)}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-head">
              <div>
                <div className="ai-modal-title">Payment negotiation</div>
                <div className="ai-modal-sub">{negotiatingApp.creator_name || `Creator #${negotiatingApp.creator_id}`} · {negotiatingApp.campaign_title || 'Campaign'}</div>
              </div>
              <button className="ai-close" onClick={() => setNegotiatingApp(null)} disabled={negotiationLoading}>Close</button>
            </div>

            <div className="ai-neg-summary">
              <strong>Campaign budget:</strong> {negotiatingApp.campaign_budget != null ? `Rs. ${negotiatingApp.campaign_budget.toLocaleString()}` : 'Not specified'}
              {' · '}<strong>Creator request:</strong> {negotiatingApp.rate != null ? `Rs. ${negotiatingApp.rate.toLocaleString()}` : 'Not specified'}
              {negotiatingApp.agreed_rate != null && <> {' · '}<strong>Locked:</strong> Rs. {negotiatingApp.agreed_rate.toLocaleString()}</>}
            </div>

            {negotiationError && <div className="ai-neg-error">{negotiationError}</div>}
            <div className="ai-offers">
              {negotiationLoading && offers.length === 0 ? <div className="ai-state" style={{padding:20}}>Loading offers…</div> : offers.length === 0 ? <div className="ai-state" style={{padding:20}}>No offers yet.</div> : offers.map((offer) => {
                const mine = offer.sender_id === user?.id;
                const canRespond = !mine && offer.status === 'pending';
                return (
                  <div className="ai-offer" key={offer.id}>
                    <div className="ai-offer-row"><span className="ai-offer-amount">Rs. {offer.amount.toLocaleString()}</span><span className="ai-offer-meta">{mine ? 'You' : offer.sender_name || offer.sender_role || 'Other party'} · {offer.status}</span></div>
                    {offer.message && <div className="ai-offer-message">{offer.message}</div>}
                    {canRespond && (
                      <div className="ai-offer-actions">
                        <button className="ai-accept" disabled={negotiationLoading} onClick={() => respondToOffer(offer, 'accept')}><ShieldCheck size={13}/> Accept & lock</button>
                        <button className="ai-reject" disabled={negotiationLoading} onClick={() => respondToOffer(offer, 'reject')}><X size={13}/> Reject</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {negotiatingApp.negotiation_status !== 'agreed' && (
              <>
                <label className="ai-modal-label">Your counter-offer (Rs.)</label>
                <input className="ai-modal-input" type="number" min="1" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="Enter your offer" />
                <label className="ai-modal-label">Message (optional)</label>
                <textarea className="ai-modal-textarea" value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} placeholder="Explain your proposed amount…" />
                <div className="ai-modal-footer">
                  <button className="ai-send" disabled={negotiationLoading} onClick={sendOffer}>{negotiationLoading ? 'Sending…' : 'Send offer'}</button>
                </div>
              </>
            )}

            {negotiatingApp.negotiation_status === 'agreed' && (
              <div className="ai-neg-summary" style={{background:'#EAF8F0',color:'#16834A'}}>Payment amount locked at <strong>Rs. {(negotiatingApp.agreed_rate || 0).toLocaleString()}</strong>. The brand can now select the creator and later pay this exact amount.</div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
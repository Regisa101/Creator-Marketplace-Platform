import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, DollarSign, Loader2 } from 'lucide-react';
import { getApplications, updateApplicationStatus, type Application, type ApplicationStatus } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';

const C = {
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  navy: '#1E2A78',
  navySoft: '#EEF1FF',
  coral: '#FF6B5A',
  coralSoft: '#FFF4F2',
};

const TABS: { key: ApplicationStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

export function ApplicationsInbox() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('pending');
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (err) {
      console.error('Could not load applications:', err);
      setError('Could not load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Keep the brand inbox fresh while it is open. A creator's application
    // should appear as soon as it reaches the backend; it must not wait for
    // another creator to apply or for the brand to navigate away and back.
    if (!isBusiness) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isBusiness]);

  // Tab filter, then free-text search over campaign title / creator name
  // (the search box lives in AppLayout's topbar, so it needs to reach in here).
  const tabFiltered = useMemo(
    () => (activeTab === 'all' ? applications : applications.filter((a) => a.status === activeTab)),
    [applications, activeTab]
  );

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
  // get one long undifferentiated list.
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
      items: [...group.items].sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1)),
    }));
  }, [filtered]);

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

        .ai-tabs { display: flex; gap: 10px; margin-bottom: 26px; flex-wrap: wrap; }
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
        .ai-applicant { display: flex; align-items: center; gap: 10px; }
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
        .ai-match-score { font-size:13px; font-weight:800; color:#16834A; background:#EAF8F0; border-radius:999px; padding:5px 10px; }
        .ai-match-label { font-size:11.5px; font-weight:700; color:${C.inkSoft}; }
        .ai-match-breakdown { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 11px; }
        .ai-match-chip { font-size:10.5px; color:${C.inkSoft}; background:${C.surface}; border:1px solid ${C.line}; border-radius:999px; padding:4px 8px; }
        .ai-match-chip--good { color:#16834A; background:#F0FAF4; border-color:#CDEEDB; }
        .ai-why { font-size:11.5px; color:${C.inkSoft}; line-height:1.5; background:#FAFAFD; border-radius:8px; padding:8px 10px; margin-bottom:11px; }

        .ai-state { text-align: center; padding: 60px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .ai-spin { animation: ai-spin 0.8s linear infinite; }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ai-content">
        <div className="ai-tabs">
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
                    {group.items.some((a) => a.match_score != null) ? ' · sorted by match' : ''}
                  </span>
                )}
              </div>

              {group.items.map((app) => (
                <div className="ai-card" key={app.id}>
                  <div className="ai-card-top">
                    {isBusiness ? (
                      <div className="ai-applicant">
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
                      </div>
                    ) : (
                      <div className="ai-applicant-date">
                        Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <span className={`ai-status-pill ai-status-pill--${app.status}`}>{app.status}</span>
                  </div>

                  {isBusiness && app.match_score != null && (
                    <>
                      <div className="ai-match">
                        <span className="ai-match-score">⭐ {app.match_score}% Match</span>
                        <span className="ai-match-label">{app.match_score >= 90 ? 'Recommended creator' : app.match_score >= 75 ? 'Good Match' : 'Other Applicant'}</span>
                      </div>
                      <div className="ai-match-breakdown">
                        {(app.match_breakdown || []).map((b) => (
                          <span key={b.key} className={`ai-match-chip ${b.matched ? 'ai-match-chip--good' : ''}`}>
                            {b.label} {b.matched ? '✓' : '·'} {b.score}/{b.max}
                          </span>
                        ))}
                      </div>
                      {app.match_configured_count ? <div className="ai-why"><strong>Why we're suggesting them:</strong> Their profile matches {app.match_reasons?.filter((r) => r.endsWith('✓')).length ?? 0}/{app.match_configured_count - 1} configured campaign requirements. Experience is shown as a soft signal and never automatically rejects a creator.</div> : null}
                    </>
                  )}

                  <div className="ai-proposal">{app.proposal}</div>

                  {isBusiness && (app.completed_collaborations ?? 0) > 0 && (
                    <div style={{fontSize:11.5,color:C.inkSoft,marginTop:7}}>✓ {app.completed_collaborations} completed collaboration{app.completed_collaborations === 1 ? '' : 's'} · <Link to={`/creators/${app.creator_id}`} style={{color:C.navy,fontWeight:700}}>View profile & history</Link></div>
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
                      <DollarSign size={13} /> Rs. {app.rate.toLocaleString()}
                    </div>
                  )}

                  {app.message && <div className="ai-message">{app.message}</div>}

                  {isBusiness && app.status === 'pending' && (
                    <div className="ai-actions">
                      <button
                        className="ai-accept"
                        disabled={actingOn === app.id}
                        onClick={() => handleAction(app, 'accepted')}
                      >
                        {actingOn === app.id ? <Loader2 size={14} className="ai-spin" /> : <Check size={14} />}
                        Accept
                      </button>
                      <button
                        className="ai-reject"
                        disabled={actingOn === app.id}
                        onClick={() => handleAction(app, 'rejected')}
                      >
                        {actingOn === app.id ? <Loader2 size={14} className="ai-spin" /> : <X size={14} />}
                        Reject
                      </button>
                    </div>
                  )}

                  {actionError?.id === app.id && <div className="ai-action-error">{actionError.message}</div>}
                </div>
              ))}
            </div>
          ))}
      </div>
    </AppLayout>
  );
}
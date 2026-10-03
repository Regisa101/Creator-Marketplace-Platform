import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, Plus } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import {
  getBusinessAnalytics,
  type AnalyticsRange,
  type BusinessAnalytics,
} from '../api/client';

/* ============================================================
   Brand Analytics
   Every number on this page comes from GET /api/analytics/business,
   which calculates it from the brand's real campaigns, applications,
   contracts and payments. Nothing here is hardcoded or estimated.
============================================================ */

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

const RANGE_HINT: Record<AnalyticsRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

const INITIAL_ROWS = 5;

type AppFilter = 'all' | 'open' | 'closed' | 'with';

const APP_FILTERS: { key: AppFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'with', label: 'With applications' },
];

type FillFilter = 'all' | 'open' | 'filled' | 'closed';

const FILL_FILTERS: { key: FillFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'filled', label: 'Fully hired' },
  { key: 'closed', label: 'Closed' },
];

function money(value?: number | null) {
  return `NPR ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function periodLabel(period: string, granularity: 'day' | 'month') {
  if (granularity === 'day') {
    const [y, m, d] = period.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const [y, m] = period.split('-').map(Number);
  const sameYear = y === new Date().getFullYear();
  return new Date(y, m - 1, 1).toLocaleDateString(
    'en-US',
    sameYear ? { month: 'short' } : { month: 'short', year: 'numeric' }
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function closesIn(deadline: string | null) {
  if (!deadline) return 'soon';
  const days = Math.round(
    (startOfDay(new Date(deadline)).getTime() - startOfDay(new Date()).getTime()) / 86400000
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function pctNote(value: number | null, suffix: string) {
  return value === null ? '—' : `${value}% ${suffix}`;
}

function isActiveCampaign(status: string) {
  return status === 'published' || status === 'in_progress';
}

function matchesAppFilter(campaign: BusinessAnalytics['campaigns'][number], filter: AppFilter) {
  switch (filter) {
    case 'open':
      return isActiveCampaign(campaign.status);
    case 'closed':
      return campaign.status === 'closed' || campaign.status === 'completed';
    case 'with':
      return campaign.applications > 0;
    default:
      return true;
  }
}

function matchesFillFilter(campaign: BusinessAnalytics['campaigns'][number], filter: FillFilter) {
  switch (filter) {
    case 'open':
      return isActiveCampaign(campaign.status);
    case 'filled':
      return campaign.hired >= Math.max(1, campaign.creators_needed);
    case 'closed':
      return campaign.status === 'closed' || campaign.status === 'completed';
    default:
      return true;
  }
}

/* ============================================================
   Spend over time (plain CSS bars - no chart library needed)
============================================================ */

function SpendChart({ spend }: { spend: BusinessAnalytics['spend_over_time'] }) {
  const { points, granularity } = spend;
  const max = Math.max(0, ...points.map((p) => p.amount));

  if (!points.length || max === 0) {
    return <div className="an-empty">No payments in this period.</div>;
  }

  // Keep the x-axis readable: with many bars only label every few of them.
  const step = Math.max(1, Math.ceil(points.length / 7));
  const last = points.length - 1;

  return (
    <div className="an-chart" role="img" aria-label="Spend over time">
      <div className="an-chart-max">{money(max)}</div>
      <div className="an-bars">
        {points.map((point, index) => {
          const pct = (point.amount / max) * 100;
          const barHeight = point.amount > 0 ? Math.max(2, pct) : 0;
          const label = periodLabel(point.period, granularity);
          // Bars at the left/right edge align their tooltip to the edge so it
          // never gets cut off.
          const edge = points.length < 5 ? '' : index < 2 ? ' tip-left' : index > last - 2 ? ' tip-right' : '';
          return (
            <div key={point.period} className="an-bar-col">
              <div className="an-bar-track">
                <div className="an-bar" style={{ height: `${barHeight}%` }} />
                <div className={`an-tip${edge}`} style={{ bottom: `calc(${barHeight}% + 6px)` }}>
                  {label} · <strong>{money(point.amount)}</strong>
                </div>
              </div>
              <div className="an-bar-label">{index % step === 0 ? label : '\u00A0'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Hiring funnel
============================================================ */

function Funnel({ funnel }: { funnel: BusinessAnalytics['funnel'] }) {
  const base = Math.max(funnel.applications, 1);
  const stages = [
    { label: 'Applications', value: funnel.applications, note: 'Received in this period' },
    { label: 'Selected', value: funnel.selected, note: pctNote(funnel.selected_pct, 'of applications') },
    { label: 'Contract Paid', value: funnel.paid, note: pctNote(funnel.paid_pct, 'of selected') },
    { label: 'Completed', value: funnel.completed, note: pctNote(funnel.completed_pct, 'of paid') },
  ];

  return (
    <div className="an-funnel">
      {stages.map((stage) => (
        <div key={stage.label} className="an-funnel-row">
          <div className="an-funnel-head">
            <span className="an-funnel-label">{stage.label}</span>
            <span className="an-funnel-value">{stage.value.toLocaleString()}</span>
          </div>
          <div className="an-track">
            <div
              className="an-fill"
              style={{ width: `${stage.value > 0 ? Math.max(2, (stage.value / base) * 100) : 0}%` }}
            />
          </div>
          <div className="an-funnel-note">{stage.note}</div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Needs your attention
============================================================ */

function Attention({ attention }: { attention: BusinessAnalytics['attention'] }) {
  const { pending_applications: pending, unpaid_selected: unpaid, closing_soon: closing } = attention;

  if (attention.count === 0) {
    return (
      <div className="an-caught-up">
        <CheckCircle2 size={18} />
        You're all caught up.
      </div>
    );
  }

  return (
    <div className="an-attention">
      {pending.count > 0 && (
        <div className="an-att-item">
          <div className="an-att-text">
            <div className="an-att-title">
              {pending.count} {plural(pending.count, 'application has', 'applications have')} been pending for
              more than {pending.older_than_days} days.
            </div>
            {pending.oldest_days !== null && (
              <div className="an-att-sub">Oldest has been waiting {pending.oldest_days} days.</div>
            )}
          </div>
          <Link className="an-att-link" to={pending.link}>
            Review <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {unpaid.count > 0 && (
        <div className="an-att-group">
          <div className="an-att-title">
            {unpaid.count} selected {plural(unpaid.count, 'creator is', 'creators are')} waiting for payment.
          </div>
          {unpaid.items.map((item) => (
            <div key={item.contract_id} className="an-att-item an-att-nested">
              <div className="an-att-text">
                <div className="an-att-sub-strong">
                  {item.creator_name || 'A creator'}
                  {item.campaign_title ? ` · ${item.campaign_title}` : ''}
                </div>
                <div className="an-att-sub">
                  {item.status === 'pending_payment'
                    ? `Platform fee${item.fee_amount !== null ? ` ${money(item.fee_amount)}` : ''} not paid yet`
                    : 'Contract terms not finalized yet'}
                </div>
              </div>
              <Link className="an-att-link" to={item.link}>
                {item.status === 'pending_payment' ? 'Pay fee' : 'Finalize'} <ArrowRight size={13} />
              </Link>
            </div>
          ))}
          {unpaid.count > unpaid.items.length && (
            <Link className="an-att-more" to="/contracts">
              View all contracts <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}

      {closing.items.map((item) => (
        <div key={item.campaign_id} className="an-att-item">
          <div className="an-att-text">
            <div className="an-att-title">
              {item.title} closes {closesIn(item.deadline)}.
            </div>
          </div>
          <Link className="an-att-link" to={item.link}>
            View <ArrowRight size={13} />
          </Link>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Page
============================================================ */

export function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showAllApps, setShowAllApps] = useState(false);
  const [showAllFill, setShowAllFill] = useState(false);
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [fillFilter, setFillFilter] = useState<FillFilter>('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await getBusinessAnalytics(range);
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) {
          const detail = err?.response?.data?.detail;
          setError(typeof detail === 'string' ? detail : 'Analytics could not be loaded. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range, reloadKey]);

  // Applications per campaign: most applications first.
  const applicationRows = useMemo(
    () =>
      [...(data?.campaigns ?? [])].sort(
        (a, b) => b.applications - a.applications || a.title.localeCompare(b.title)
      ),
    [data]
  );

  // Fill progress: open campaigns first, then the ones with the most empty spots.
  const fillRows = useMemo(
    () =>
      (data?.campaigns ?? [])
        .filter((c) => c.status !== 'cancelled')
        .sort((a, b) => {
          const active = Number(isActiveCampaign(b.status)) - Number(isActiveCampaign(a.status));
          if (active !== 0) return active;
          const remaining = b.creators_needed - b.hired - (a.creators_needed - a.hired);
          return remaining || a.title.localeCompare(b.title);
        }),
    [data]
  );

  const appCounts = useMemo(
    () => ({
      all: applicationRows.length,
      open: applicationRows.filter((c) => matchesAppFilter(c, 'open')).length,
      closed: applicationRows.filter((c) => matchesAppFilter(c, 'closed')).length,
      with: applicationRows.filter((c) => matchesAppFilter(c, 'with')).length,
    }),
    [applicationRows]
  );
  const filteredApps = useMemo(
    () => applicationRows.filter((c) => matchesAppFilter(c, appFilter)),
    [applicationRows, appFilter]
  );
  const maxApplications = Math.max(1, ...filteredApps.map((c) => c.applications));
  const visibleApps = showAllApps ? filteredApps : filteredApps.slice(0, INITIAL_ROWS);
  const fillCounts = useMemo(
    () => ({
      all: fillRows.length,
      open: fillRows.filter((c) => matchesFillFilter(c, 'open')).length,
      filled: fillRows.filter((c) => matchesFillFilter(c, 'filled')).length,
      closed: fillRows.filter((c) => matchesFillFilter(c, 'closed')).length,
    }),
    [fillRows]
  );
  const filteredFill = useMemo(
    () => fillRows.filter((c) => matchesFillFilter(c, fillFilter)),
    [fillRows, fillFilter]
  );
  const visibleFill = showAllFill ? filteredFill : filteredFill.slice(0, INITIAL_ROWS);
  const noApplicationsInRange = applicationRows.every((c) => c.applications === 0);

  return (
    <AppLayout
      title="Analytics"
      showNotifications
    >
      <style>{`
        .an-page{max-width:1180px;margin:0;padding:18px 24px 54px;color:#17151d;background:#fff;font-family:'Poppins',sans-serif;font-weight:400}
        .an-page.an-busy{opacity:.6;transition:opacity .15s ease}
        .an-error{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:10px 12px;border:1px solid #ead7d7;background:#fff8f8;border-radius:9px;color:#9b4545;font-size:12px}
        .an-error button{border:1px solid #d9b8b8;background:#fff;color:#9b4545;border-radius:999px;padding:4px 12px;font:500 12px 'Poppins',sans-serif;cursor:pointer}
        .an-loading{padding:48px 0;text-align:center;color:#8d8792;font-size:13px}

        .an-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 16px}
        .an-toolbar-note{font-size:12px;color:#6b6b6b}
        .an-ranges{display:flex;gap:8px;flex-wrap:wrap}
        .an-range{height:32px;padding:0 14px;border:1px solid #dedede;border-radius:999px;background:#fff;color:#111;font:500 12.5px 'Poppins',sans-serif;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}
        .an-range:hover{background:#f5f5f5;border-color:#c4c4c4}
        .an-range.active{background:#111;color:#fff;border-color:#111}

        .an-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 16px}
        .an-card{padding:16px 18px;border:1px solid #e5e5e5;border-radius:12px;background:#fff}
        .an-card-value{font-family:'League Spartan',sans-serif;font-size:28px;font-weight:400;letter-spacing:-0.02em;color:#111;line-height:1.1}
        .an-card-label{font-size:12px;color:#6b6b6b;margin-top:6px}
        .an-card-hint{font-size:11px;color:#9a9a9a;margin-top:3px}

        .an-grid{display:grid;gap:16px;margin:0 0 16px}
        .an-grid.row-2{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}
        .an-grid.row-3{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}
        .an-panel{padding:18px 20px;border:1px solid #e5e5e5;border-radius:12px;background:#fff;min-width:0}
        .an-panel-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 14px}
        .an-panel h2{font-family:'League Spartan',sans-serif;font-size:19px;font-weight:400;letter-spacing:-0.02em;margin:0;color:#111}
        .an-panel-sub{font-size:11.5px;color:#8a8a8a}
        .an-empty{padding:34px 10px;text-align:center;color:#8d8792;font-size:12.5px}

        .an-chart{position:relative;padding:34px 0 24px}
        .an-chart-max{position:absolute;top:6px;left:0;font-size:11px;color:#8a8a8a}
        .an-bars{display:flex;align-items:stretch;gap:4px;height:196px;border-bottom:1px solid #e5e5e5}
        .an-bar-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;position:relative}
        .an-bar-track{flex:1;display:flex;align-items:flex-end;position:relative}
        .an-bar{width:100%;background:#111;border-radius:3px 3px 0 0;min-height:0;transition:background-color .15s ease}
        .an-bar-col:hover .an-bar{background:#444}
        .an-tip{position:absolute;left:50%;transform:translateX(-50%);padding:5px 9px;border-radius:7px;background:#111;color:#fff;font-size:11.5px;line-height:1.3;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.18);opacity:0;visibility:hidden;pointer-events:none;z-index:5;transition:opacity .12s ease}
        .an-tip strong{font-weight:600}
        .an-tip.tip-left{left:0;transform:none}
        .an-tip.tip-right{left:auto;right:0;transform:none}
        .an-bar-col:hover .an-tip{opacity:1;visibility:visible}
        .an-bar-label{position:absolute;left:50%;bottom:-20px;transform:translateX(-50%);font-size:10.5px;color:#8a8a8a;white-space:nowrap}

        .an-funnel{display:flex;flex-direction:column;gap:16px}
        .an-funnel-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
        .an-funnel-label{font-size:13px;font-weight:500;color:#111}
        .an-funnel-value{font-family:'League Spartan',sans-serif;font-size:20px;color:#111}
        .an-track{height:8px;border-radius:999px;background:#f0f0f0;overflow:hidden}
        .an-fill{height:100%;border-radius:999px;background:#111;transition:width .3s ease}
        .an-funnel-note{font-size:11.5px;color:#8a8a8a;margin-top:5px}

        .an-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
        .an-chip{height:28px;padding:0 12px;border:1px solid #dedede;border-radius:999px;background:#fff;color:#111;font:500 12px 'Poppins',sans-serif;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}
        .an-chip:hover{background:#f5f5f5;border-color:#c4c4c4}
        .an-chip.active{background:#111;color:#fff;border-color:#111}

        .an-list{display:flex;flex-direction:column}
        .an-row{display:block;padding:12px 0;border-top:1px solid #eeece6;text-decoration:none;color:inherit}
        .an-row:first-child{border-top:0;padding-top:0}
        .an-row:hover .an-row-title{text-decoration:underline}
        .an-row-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:7px}
        .an-row-title{font-size:13.5px;font-weight:500;color:#111;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .an-row-value{font-size:13px;font-weight:500;color:#111;flex-shrink:0}
        .an-row-meta{font-size:11.5px;color:#8a8a8a;margin-top:5px;display:flex;justify-content:space-between;gap:8px}
        .an-badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;background:#e9f6ee;color:#1e8a4c;font-size:10.5px;font-weight:500}
        .an-badge.muted{background:#f3f2f4;color:#77717e}
        .an-more{margin-top:10px;border:0;background:none;padding:0;color:#111;font:500 12.5px 'Poppins',sans-serif;cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-align:left}

        .an-attention{display:flex;flex-direction:column;gap:2px}
        .an-att-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #eeece6}
        .an-attention>.an-att-item:first-child{border-top:0;padding-top:0}
        .an-att-group{padding:12px 0;border-top:1px solid #eeece6}
        .an-attention>.an-att-group:first-child{border-top:0;padding-top:0}
        .an-att-nested{border-top:0;padding:8px 0 0 12px}
        .an-att-text{min-width:0}
        .an-att-title{font-size:13px;font-weight:500;color:#111;line-height:1.45}
        .an-att-sub{font-size:11.5px;color:#8a8a8a;margin-top:2px}
        .an-att-sub-strong{font-size:12.5px;color:#111}
        .an-att-link,.an-att-more{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;font-size:12px;font-weight:500;color:#111;text-decoration:none;border:1px solid #dedede;border-radius:999px;padding:5px 12px;background:#fff;transition:border-color .15s ease,background-color .15s ease}
        .an-att-link:hover,.an-att-more:hover{border-color:#111;background:#f5f5f5}
        .an-att-more{margin:10px 0 0 12px}
        .an-caught-up{display:flex;align-items:center;justify-content:center;gap:8px;padding:34px 10px;color:#1e8a4c;font-size:13px;font-weight:500}

        .an-none{max-width:440px;margin:56px auto;text-align:center}
        .an-none-icon{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;background:#f3f2f4;color:#111;margin-bottom:14px}
        .an-none h2{font-family:'League Spartan',sans-serif;font-size:24px;font-weight:400;margin:0 0 8px;color:#111}
        .an-none p{font-size:13px;color:#6b6b6b;line-height:1.6;margin:0 0 18px}

        @media(max-width:1000px){
          .an-grid.row-2,.an-grid.row-3{grid-template-columns:minmax(0,1fr)}
        }
        @media(max-width:760px){
          .an-cards{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media(max-width:560px){
          .an-page{padding:14px 16px 40px}
          .an-bars{gap:2px}
        }
      `}</style>

      <main className={`an-page${loading && data ? ' an-busy' : ''}`}>
        {error && (
          <div className="an-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </div>
        )}

        {!data && loading && <div className="an-loading">Loading analytics…</div>}

        {/* ---------- Empty state: the brand has no campaigns yet ---------- */}
        {data && !data.has_campaigns && (
          <div className="an-none">
            <div className="an-none-icon">
              <BarChart3 size={22} />
            </div>
            <h2>No analytics yet</h2>
            <p>Create your first campaign to start seeing application, hiring, and spending insights.</p>
            <Link className="btn btn-primary" to="/campaigns/new">
              <Plus size={14} />
              Create Campaign
            </Link>
          </div>
        )}

        {data && data.has_campaigns && (
          <>
            {/* ---------- Date range ---------- */}
            <div className="an-toolbar">
              <div className="an-ranges" role="tablist" aria-label="Date range">
                {RANGES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={range === item.key}
                    className={`an-range${range === item.key ? ' active' : ''}`}
                    onClick={() => setRange(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ---------- Row 1: summary cards ---------- */}
            <section className="an-cards" aria-label="Summary">
              <div className="an-card">
                <div className="an-card-value">{data.summary.total_applications.toLocaleString()}</div>
                <div className="an-card-label">Total Applications</div>
                <div className="an-card-hint">{RANGE_HINT[range]}</div>
              </div>
              <div className="an-card">
                <div className="an-card-value">{data.summary.creators_hired.toLocaleString()}</div>
                <div className="an-card-label">Creators Hired</div>
                <div className="an-card-hint">Platform fee paid</div>
              </div>
              <div className="an-card">
                <div className="an-card-value">{money(data.summary.total_spent)}</div>
                <div className="an-card-label">Total Spent</div>
                <div className="an-card-hint">
                  {data.summary.platform_fees > 0
                    ? `Incl. ${money(data.summary.platform_fees)} platform fees`
                    : RANGE_HINT[range]}
                </div>
              </div>
              <div className="an-card">
                <div className="an-card-value">{data.summary.completion_rate}%</div>
                <div className="an-card-label">Completion Rate</div>
                <div className="an-card-hint">Of paid contracts</div>
              </div>
            </section>

            {/* ---------- Row 2: spend + funnel ---------- */}
            <div className="an-grid row-2">
              <section className="an-panel" aria-label="Spend over time">
                <div className="an-panel-head">
                  <h2>Spend Over Time</h2>
                  <span className="an-panel-sub">
                    {data.spend_over_time.granularity === 'day' ? 'Per day' : 'Per month'} · NPR
                  </span>
                </div>
                <SpendChart spend={data.spend_over_time} />
              </section>

              <section className="an-panel" aria-label="Hiring funnel">
                <div className="an-panel-head">
                  <h2>Hiring Funnel</h2>
                  <span className="an-panel-sub">{RANGE_HINT[range]}</span>
                </div>
                <Funnel funnel={data.funnel} />
              </section>
            </div>

            {/* ---------- Row 3: applications per campaign + attention ---------- */}
            <div className="an-grid row-3">
              <section className="an-panel" aria-label="Applications per campaign">
                <div className="an-panel-head">
                  <h2>Applications Per Campaign</h2>
                  <span className="an-panel-sub">{RANGE_HINT[range]}</span>
                </div>

                <div className="an-chips" role="tablist" aria-label="Filter campaigns">
                  {APP_FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={appFilter === item.key}
                      className={`an-chip${appFilter === item.key ? ' active' : ''}`}
                      onClick={() => {
                        setAppFilter(item.key);
                        setShowAllApps(false);
                      }}
                    >
                      {item.label} ({appCounts[item.key]})
                    </button>
                  ))}
                </div>

                {noApplicationsInRange ? (
                  <div className="an-empty">No applications in this period.</div>
                ) : filteredApps.length === 0 ? (
                  <div className="an-empty">No campaigns match this filter.</div>
                ) : (
                  <div className="an-list">
                    {visibleApps.map((campaign) => (
                      <Link key={campaign.id} className="an-row" to={`/applications?campaign=${campaign.id}`}>
                        <div className="an-row-head">
                          <span className="an-row-title">{campaign.title}</span>
                          <span className="an-row-value">{campaign.applications.toLocaleString()}</span>
                        </div>
                        <div className="an-track">
                          <div
                            className="an-fill"
                            style={{
                              width: `${
                                campaign.applications > 0
                                  ? Math.max(2, (campaign.applications / maxApplications) * 100)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </Link>
                    ))}
                    {filteredApps.length > INITIAL_ROWS && (
                      <button type="button" className="an-more" onClick={() => setShowAllApps((v) => !v)}>
                        {showAllApps ? 'Show fewer' : `Show all ${filteredApps.length} campaigns`}
                      </button>
                    )}
                  </div>
                )}
              </section>

              <section className="an-panel" aria-label="Needs your attention">
                <div className="an-panel-head">
                  <h2>Needs Your Attention</h2>
                </div>
                <Attention attention={data.attention} />
              </section>
            </div>

            {/* ---------- Row 4: campaign fill progress ---------- */}
            <section className="an-panel" aria-label="Campaign fill progress">
              <div className="an-panel-head">
                <h2>Campaign Fill Progress</h2>
                <span className="an-panel-sub">Creators hired vs. creators needed</span>
              </div>

              <div className="an-chips" role="tablist" aria-label="Filter campaigns">
                {FILL_FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={fillFilter === item.key}
                    className={`an-chip${fillFilter === item.key ? ' active' : ''}`}
                    onClick={() => {
                      setFillFilter(item.key);
                      setShowAllFill(false);
                    }}
                  >
                    {item.label} ({fillCounts[item.key]})
                  </button>
                ))}
              </div>

              {fillRows.length === 0 ? (
                <div className="an-empty">No campaigns to show yet.</div>
              ) : filteredFill.length === 0 ? (
                <div className="an-empty">No campaigns match this filter.</div>
              ) : (
                <div className="an-list">
                  {visibleFill.map((campaign) => {
                    const needed = Math.max(1, campaign.creators_needed);
                    const pct = Math.min(100, (campaign.hired / needed) * 100);
                    return (
                      <Link key={campaign.id} className="an-row" to={`/campaigns/${campaign.id}`}>
                        <div className="an-row-head">
                          <span className="an-row-title">{campaign.title}</span>
                          <span className="an-row-value">
                            {campaign.hired} / {needed} {plural(needed, 'creator', 'creators')} hired
                          </span>
                        </div>
                        <div className="an-track">
                          <div className="an-fill" style={{ width: `${campaign.hired > 0 ? Math.max(2, pct) : 0}%` }} />
                        </div>
                        <div className="an-row-meta">
                          <span className={`an-badge${isActiveCampaign(campaign.status) ? '' : ' muted'}`}>
                            {isActiveCampaign(campaign.status)
                              ? 'Open'
                              : campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </span>
                          <span>{campaign.hired >= needed ? 'Fully hired' : `${needed - campaign.hired} to go`}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {filteredFill.length > INITIAL_ROWS && (
                    <button type="button" className="an-more" onClick={() => setShowAllFill((v) => !v)}>
                      {showAllFill ? 'Show fewer' : `Show all ${filteredFill.length} campaigns`}
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </AppLayout>
  );
}

export default Analytics;
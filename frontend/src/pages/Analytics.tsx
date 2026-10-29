import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Plus } from 'lucide-react';
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

function money(value?: number | null) {
  return `NPR ${Math.round(Number(value || 0)).toLocaleString()}`;
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

function pctNote(value: number | null, suffix: string) {
  return value === null ? '—' : `${value}% ${suffix}`;
}

/* ============================================================
   Spend over time (pie chart, plain SVG - no chart library needed)
============================================================ */

const PIE_COLORS = ['#14602a', '#197935', '#3c9a58', '#68b37e', '#9acfaa', '#c9e6d2'];

function SpendPie({ spend }: { spend: BusinessAnalytics['spend_over_time'] }) {
  const { points, granularity } = spend;
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; label: string; amount: number; pct: number } | null>(null);

  const total = points.reduce((sum, p) => sum + p.amount, 0);
  if (!points.length || total === 0) {
    return <div className="an-empty">No payments in this period.</div>;
  }

  // One slice per day/month when there are few, otherwise group neighbouring
  // periods into at most 6 slices so the pie stays readable.
  const groupSize = Math.max(1, Math.ceil(points.length / 6));
  const slices: { label: string; amount: number }[] = [];
  for (let i = 0; i < points.length; i += groupSize) {
    const chunk = points.slice(i, i + groupSize);
    const first = periodLabel(chunk[0].period, granularity);
    const last = periodLabel(chunk[chunk.length - 1].period, granularity);
    slices.push({
      label: chunk.length === 1 || first === last ? first : `${first} – ${last}`,
      amount: chunk.reduce((sum, p) => sum + p.amount, 0),
    });
  }
  const shown = slices.map((slice, index) => ({ ...slice, index })).filter((slice) => slice.amount > 0);

  const cx = 100;
  const cy = 100;
  const r = 88;
  let angle = -Math.PI / 2;
  const paths = shown.map((slice) => {
    const fraction = slice.amount / total;
    const start = angle;
    const end = angle + fraction * Math.PI * 2;
    angle = end;
    const mid = (start + end) / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const d =
      fraction >= 0.9999
        ? null
        : `M ${cx} ${cy} L ${cx + r * Math.cos(start)} ${cy + r * Math.sin(start)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(end)} ${cy + r * Math.sin(end)} Z`;
    return { ...slice, d, mid, pct: Math.round(fraction * 100) };
  });

  return (
    <div className="an-pie" onMouseLeave={() => { setActive(null); setTip(null); }}>
      <svg viewBox="0 0 200 200" className="an-pie-svg" role="img" aria-label="Spend over time">
        {paths.map((slice, i) => {
          const color = PIE_COLORS[i % PIE_COLORS.length];
          const isActive = active === slice.index;
          const shift = isActive && slice.d ? 5 : 0;
          const transform = `translate(${Math.cos(slice.mid) * shift} ${Math.sin(slice.mid) * shift})`;
          const handlers = {
            onMouseEnter: () => setActive(slice.index),
            onMouseMove: (e: MouseEvent<SVGElement>) => {
              const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement | null)?.getBoundingClientRect();
              if (box) setTip({ x: e.clientX - box.left, y: e.clientY - box.top, label: slice.label, amount: slice.amount, pct: slice.pct });
            },
          };
          return slice.d ? (
            <path key={slice.index} d={slice.d} fill={color} stroke="#fff" strokeWidth="1.5" transform={transform} style={{ transition: 'transform .12s ease' }} {...handlers} />
          ) : (
            <circle key={slice.index} cx={cx} cy={cy} r={r} fill={color} {...handlers} />
          );
        })}
      </svg>

      <ul className="an-pie-legend">
        {paths.map((slice, i) => (
          <li
            key={slice.index}
            className={active === slice.index ? 'active' : undefined}
            onMouseEnter={() => setActive(slice.index)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="an-pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="an-pie-label">{slice.label}</span>
            <strong>{money(slice.amount)}</strong>
            <em>{slice.pct}%</em>
          </li>
        ))}
      </ul>

      {tip && (
        <div className="an-sc-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <span>{tip.label}</span>
          <strong>{money(tip.amount)} · {tip.pct}%</strong>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Campaign overview: campaigns by status (same idea as the admin dashboard)
============================================================ */

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  published: 'Active',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

function niceTop(value: number) {
  if (value <= 4) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return Math.max(4, nf * exp);
}

function CampaignStatusChart({ statuses }: { statuses: BusinessAnalytics['campaign_statuses'] }) {
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; label: string; count: number } | null>(null);

  // Draw at the card's real width so text is the same size as in every other chart.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setW(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const H = 260;
  const pad = { top: 24, right: 12, bottom: 34, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceTop(Math.max(...statuses.map((s) => s.count), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  const slot = innerW / statuses.length;
  const barW = Math.min(56, slot * 0.5);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  return (
    <div className="an-sc-wrap" ref={wrapRef} onMouseLeave={() => { setActive(null); setTip(null); }}>
      <svg className="an-sc-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Campaigns by status">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="#eee" />
            <text x={pad.left - 8} y={y(t) + 3} textAnchor="end" className="an-sc-axis">{t}</text>
          </g>
        ))}
        {statuses.map((s, i) => {
          const label = STATUS_LABEL[s.status] ?? s.status;
          const x = pad.left + slot * i + (slot - barW) / 2;
          const h = (s.count / max) * innerH;
          return (
            <g key={s.status}>
              <rect
                x={x}
                y={y(s.count)}
                width={barW}
                height={Math.max(h, s.count > 0 ? 2 : 0)}
                rx="3"
                fill={active === i ? '#14602a' : '#197935'}
                opacity={active === null || active === i ? 1 : 0.55}
              />
              {s.count > 0 && (
                <text x={x + barW / 2} y={y(s.count) - 6} textAnchor="middle" className="an-sc-value">{s.count}</text>
              )}
              <text x={x + barW / 2} y={H - 12} textAnchor="middle" className="an-sc-axis">{label}</text>
              <rect
                x={pad.left + slot * i}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement | null)?.getBoundingClientRect();
                  if (box) setTip({ x: e.clientX - box.left, y: e.clientY - box.top, label, count: s.count });
                }}
              />
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="an-sc-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <span>{tip.label}</span>
          <strong>{tip.count} campaign{tip.count === 1 ? '' : 's'}</strong>
        </div>
      )}
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
   Page
============================================================ */

export function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [data, setData] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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
        .an-select{display:inline-flex;align-items:center;gap:8px;font:400 12px 'Poppins',sans-serif;color:#777}
        .an-select select{height:34px;padding:0 30px 0 12px;border:1px solid #ddd;border-radius:999px;background:#fff;color:#111;font:500 12px 'Poppins',sans-serif;cursor:pointer}
        .an-select select:hover{border-color:#bbb}
        .an-select--inline{margin:0 0 14px}
        .an-ranges{display:flex;gap:8px;flex-wrap:wrap}
        .an-range{height:32px;padding:0 14px;border:1px solid #dedede;border-radius:999px;background:#fff;color:#111;font:500 12.5px 'Poppins',sans-serif;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}
        .an-range:hover{background:#f5f5f5;border-color:#c4c4c4}
        .an-range.active{background:#197935;color:#fff;border-color:#197935}

        .an-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 16px}
        .an-card{padding:16px 18px;border:1px solid #e5e5e5;border-radius:12px;background:#fff}
        .an-card-value{font-family:'League Spartan',sans-serif;font-size:28px;font-weight:400;letter-spacing:-0.02em;color:#111;line-height:1.1}
        .an-card-label{font-size:12px;color:#6b6b6b;margin-top:6px}
        .an-card-hint{font-size:11px;color:#9a9a9a;margin-top:3px}

        .an-pie{position:relative;display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap;padding:6px 0 4px}
        .an-pie-svg{width:190px;height:190px;flex:none;overflow:visible}
        .an-pie-svg path,.an-pie-svg circle{cursor:pointer}
        .an-pie-legend{margin:0;padding:0;list-style:none;display:grid;gap:8px;min-width:190px;flex:1 1 190px;max-width:320px}
        .an-pie-legend li{display:grid;grid-template-columns:10px minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:4px 6px;margin:-4px -6px;border-radius:8px;font:500 12px 'Poppins',sans-serif;color:#444;transition:background .12s}
        .an-pie-legend li.active{background:#f4f4f4}
        .an-pie-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .an-pie-legend strong{font-weight:500;color:#111}
        .an-pie-legend em{min-width:32px;text-align:right;color:#999;font-style:normal;font-weight:400}
        .an-pie-dot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(0,0,0,.08)}
        .an-sc-wrap{position:relative;width:100%}
        .an-sc-svg{display:block;max-width:100%}
        .an-sc-axis{font:400 12px 'Poppins',sans-serif;fill:#555}
        .an-sc-value{font:500 12px 'Poppins',sans-serif;fill:#111}
        .an-sc-tip{position:absolute;z-index:5;transform:translate(12px,-110%);pointer-events:none;display:flex;flex-direction:column;gap:1px;padding:6px 10px;border-radius:8px;background:#111;color:#fff;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.25);font:400 11px 'Poppins',sans-serif}
        .an-sc-tip strong{font-weight:600;font-size:12.5px}
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
        .an-fill{height:100%;border-radius:999px;background:#197935;transition:width .3s ease}
        .an-funnel-note{font-size:11.5px;color:#8a8a8a;margin-top:5px}

        .an-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
        .an-chip{height:28px;padding:0 12px;border:1px solid #dedede;border-radius:999px;background:#fff;color:#111;font:500 12px 'Poppins',sans-serif;cursor:pointer;transition:background-color .15s ease,border-color .15s ease}
        .an-chip:hover{background:#f5f5f5;border-color:#c4c4c4}
        .an-chip.active{background:#197935;color:#fff;border-color:#197935}

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
              <label className="an-select">
                <span>Time range</span>
                <select value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
                  {RANGES.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </label>
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

            {/* ---------- Campaigns by status + spend ---------- */}
            <div className="an-grid row-2">
              <section className="an-panel" aria-label="Campaign overview">
                <div className="an-panel-head">
                  <h2>Campaigns</h2>
                  <span className="an-panel-sub">By current status</span>
                </div>
                {data.campaign_statuses.every((s) => s.count === 0) ? (
                  <div className="an-empty">No campaigns were created in this period. Try a longer range.</div>
                ) : (
                  <CampaignStatusChart statuses={data.campaign_statuses} />
                )}
              </section>

              <section className="an-panel" aria-label="Spend over time">
                <div className="an-panel-head">
                  <h2>Spending</h2>
                  <span className="an-panel-sub">
                    Share of spend by {data.spend_over_time.granularity === 'day' ? 'day' : 'month'}
                  </span>
                </div>
                <SpendPie spend={data.spend_over_time} />
              </section>
            </div>

            {/* ---------- Hiring funnel ---------- */}
            <section className="an-panel" aria-label="Hiring funnel">
              <div className="an-panel-head">
                <h2>Hiring Funnel</h2>
                <span className="an-panel-sub">From application to completed work</span>
              </div>
              <Funnel funnel={data.funnel} />
            </section>
          </>
        )}
      </main>
    </AppLayout>
  );
}

export default Analytics;
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { getRestrictionReasons } from '../../api/client';
import type { ComplaintSummary, RestrictPayload, RestrictionReason } from '../../api/client';

import { AppLayout } from '../../components/AppLayout';

/* ============================================================
   Shared building blocks for every Admin page, so filters,
   tables, dialogs and charts look and behave the same.
============================================================ */

/* ---------- formatters ---------- */

export function formatNPR(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const whole = Number.isInteger(value);
  return `NPR ${value.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
}

/* ---------- shared option lists ---------- */

export const CAMPAIGN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function campaignStatusLabel(status: string): string {
  return CAMPAIGN_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export const DATE_RANGE_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

/* ---------- hooks ---------- */

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Loads data whenever `deps` change. Keeps the previous result on screen while
 * the next one loads (no flicker on paging) and ignores stale responses.
 */
export function useAdminData<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({
    data: null,
    loading: true,
    error: '',
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    load()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: errorMessage(err, 'Could not load this page.') }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

/* ---------- page shell + styles ---------- */

export interface AdminSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Optional: Enter key handler (used on pages whose search leads to another page). */
  onSubmit?: (value: string) => void;
}

/** Every admin page: sidebar + top bar (with the search box) + content. */
export function AdminShell({
  title,
  subtitle,
  search,
  headerActions,
  children,
}: {
  title: string;
  subtitle: string;
  search?: AdminSearchProps;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppLayout
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      showSearch={Boolean(search)}
      searchValue={search?.value}
      onSearchChange={search?.onChange}
      onSearchSubmit={search?.onSubmit}
      searchPlaceholder={search?.placeholder}
      showNotifications
    >
      <style>{ADMIN_CSS}</style>
      <div className="adm-page">{children}</div>
    </AppLayout>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="adm-error" role="alert">
      {message}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return <div className="adm-loading">{label}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="adm-empty">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

/* ---------- cards ---------- */

export function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="adm-stat">
      <div className="adm-icon">{icon}</div>
      <div className="adm-label">{label}</div>
      <div className="adm-value">{value}</div>
      {sub && <div className="adm-sub">{sub}</div>}
    </div>
  );
}

export function Card({
  title,
  note,
  action,
  children,
  className = '',
}: {
  title?: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || action) && (
        <div className="adm-card-head">
          <div>
            {title && <h3>{title}</h3>}
            {note && <p>{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- filters (one component for every page) ---------- */

export interface PillOption {
  value: string;
  label: string;
  count?: number;
}

export function FilterPills({
  options,
  value,
  onChange,
  label,
}: {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="adm-pills" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`adm-pill${o.value === value ? ' active' : ''}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="adm-pill-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- badges ---------- */

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`adm-badge adm-badge-${status}`}>{label ?? campaignStatusLabel(status)}</span>;
}

export function UserStatusBadge({ status }: { status: 'active' | 'restricted' }) {
  return <StatusBadge status={status} label={status === 'active' ? 'Active' : 'Restricted'} />;
}

export function Avatar({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  return (
    <span className="adm-avatar" aria-hidden="true">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initials}
    </span>
  );
}

/* ---------- pagination ---------- */

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="adm-pager">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div>
        <button type="button" className="btn btn-secondary adm-btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span className="adm-pager-page">
          Page {page} of {totalPages}
        </span>
        <button type="button" className="btn btn-secondary adm-btn-sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

/* ---------- dialogs ---------- */

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  busy,
  error,
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEscape(open && !busy, onCancel);
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="adm-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-confirm-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="adm-confirm-title">{title}</h3>
        <p>{message}</p>
        {error && (
          <div className="adm-error" role="alert">
            {error}
          </div>
        )}
        <div className="adm-modal-actions">
          <button ref={cancelRef} type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`btn ${danger ? 'adm-btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RestrictModal({
  open,
  title,
  message,
  busy,
  error,
  complaints,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  busy?: boolean;
  error?: string;
  /** Open complaints about this account; ticked ones are marked "upheld" on restrict. */
  complaints?: ComplaintSummary['open_complaints'];
  onConfirm: (payload: RestrictPayload) => void;
  onCancel: () => void;
}) {
  const [reasons, setReasons] = useState<RestrictionReason[]>([]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [localError, setLocalError] = useState('');
  useEscape(open && !busy, onCancel);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setNote('');
    setLocalError('');
    setPicked((complaints ?? []).map((c) => c.id));
    if (!reasons.length) getRestrictionReasons().then(setReasons).catch(() => setLocalError('Could not load reasons.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!reason) return setLocalError('Please choose a reason.');
    if (reason === 'other' && !note.trim()) return setLocalError('Please add a note when the reason is Other.');
    setLocalError('');
    onConfirm({ reason, note: note.trim() || undefined, complaint_ids: picked });
  };

  return (
    <div className="adm-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-restrict-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="adm-restrict-title">{title}</h3>
        <p>{message}</p>

        <label className="adm-field-label" htmlFor="adm-restrict-reason">Reason *</label>
        <select id="adm-restrict-reason" className="adm-input" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason</option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <label className="adm-field-label" htmlFor="adm-restrict-note">Internal note{reason === 'other' ? ' *' : ' (optional)'}</label>
        <textarea id="adm-restrict-note" className="adm-input adm-textarea" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only admins see this note" />

        {complaints && complaints.length > 0 && (
          <>
            <div className="adm-field-label">Mark these complaints as acted on</div>
            <ul className="adm-check-list">
              {complaints.map((c) => (
                <li key={c.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={picked.includes(c.id)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))}
                    />
                    <span>#{c.id} · {c.category_label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        {(localError || error) && <div className="adm-error" role="alert">{localError || error}</div>}
        <div className="adm-modal-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className="btn adm-btn-danger" disabled={busy} onClick={submit}>{busy ? 'Working…' : 'Restrict'}</button>
        </div>
      </div>
    </div>
  );
}

export function ComplaintSummaryBlock({ summary }: { summary?: ComplaintSummary | null }) {
  if (!summary || summary.total === 0) return null;
  return (
    <>
      <div className="adm-section-title">Complaints</div>
      <div className={`adm-note${summary.flagged ? ' adm-note-warn' : ''}`}>
        {summary.total} complaint{summary.total === 1 ? '' : 's'} from {summary.unique_reporters} different {summary.unique_reporters === 1 ? 'person' : 'people'}
        {summary.open ? ` · ${summary.open} still open` : ''}
        {summary.top_category_label && summary.top_category_reporters >= 2
          ? ` · ${summary.top_category_reporters} people reported "${summary.top_category_label}"`
          : ''}
        {summary.flagged ? '. Repeat problem: please review.' : '.'}
      </div>
    </>
  );
}

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="adm-backdrop adm-backdrop-right" onClick={onClose}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer-head">
          <h3>{title}</h3>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="adm-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

export function DetailGrid({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="adm-detail">
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value === null || r.value === undefined || r.value === '' ? '—' : r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TagList({ items }: { items: string[] }) {
  if (!items.length) return <>—</>;
  return (
    <span className="adm-tags">
      {items.map((t) => (
        <span key={t} className="adm-tag">
          {t}
        </span>
      ))}
    </span>
  );
}

/* ---------- charts (plain SVG, no extra dependency) ---------- */

interface TooltipState {
  x: number;
  y: number;
  title: string;
  value: string;
}

/** Positions a small tooltip next to the mouse, inside a position:relative wrapper. */
function useChartTooltip() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);

  const show = (e: { clientX: number; clientY: number }, title: string, value: string) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, title, value });
  };
  const hide = () => setTip(null);

  const node = tip ? (
    <div className="adm-tooltip" style={{ left: tip.x, top: tip.y }} role="status">
      <span>{tip.title}</span>
      <strong>{tip.value}</strong>
    </div>
  ) : null;

  return { wrapRef, show, hide, node };
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const { wrapRef, show, hide, node } = useChartTooltip();
  const [active, setActive] = useState<string | null>(null);

  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const describe = (s: DonutSlice) => `${s.value.toLocaleString()} (${pct(s.value)}%)`;

  let offset = 0;
  return (
    <div className="adm-donut" ref={wrapRef}>
      <svg viewBox="0 0 120 120" role="img" aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f0f0f0" strokeWidth="16" />
        {slices
          .filter((s) => s.value > 0)
          .map((s) => {
            const length = (s.value / total) * circumference;
            const el = (
              <circle
                key={s.label}
                className="adm-slice"
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.label ? 20 : 16}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
                onMouseEnter={() => setActive(s.label)}
                onMouseMove={(e) => show(e, s.label, describe(s))}
                onMouseLeave={() => {
                  setActive(null);
                  hide();
                }}
              />
            );
            offset += length;
            return el;
          })}
        <text x="60" y="58" textAnchor="middle" className="adm-donut-total">
          {total.toLocaleString()}
        </text>
        <text x="60" y="72" textAnchor="middle" className="adm-donut-caption">
          {centerLabel}
        </text>
      </svg>
      <ul className="adm-legend">
        {slices.map((s) => (
          <li
            key={s.label}
            className={active === s.label ? 'active' : undefined}
            onMouseEnter={() => setActive(s.label)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="adm-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{s.value.toLocaleString()}</strong>
            <em>{pct(s.value)}%</em>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * exp;
}

export interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  formatValue = (v: number) => String(v),
  ariaLabel,
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
  ariaLabel: string;
}) {
  const W = 640;
  const H = 260;
  const pad = { top: 22, right: 12, bottom: 34, left: 52 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const slot = innerW / data.length;
  const barW = Math.min(44, slot * 0.6);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const { wrapRef, show, hide, node } = useChartTooltip();
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="adm-chart-wrap" ref={wrapRef}>
      <svg className="adm-bars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="#eee" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" className="adm-axis">
                {formatCompact(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = pad.left + slot * i + (slot - barW) / 2;
          const y = pad.top + innerH - h;
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, d.value > 0 ? 2 : 0)}
                rx="3"
                fill={active === i ? '#000' : '#2b2b2b'}
                opacity={active === null || active === i ? 1 : 0.55}
              />
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={H - 12} textAnchor="middle" className="adm-axis">
                  {d.label}
                </text>
              )}
              {/* Invisible full-height column so hovering anywhere over a bar's slot works, even for tiny bars. */}
              <rect
                x={pad.left + slot * i}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseMove={(e) => show(e, d.label, formatValue(d.value))}
                onMouseLeave={() => {
                  setActive(null);
                  hide();
                }}
              />
            </g>
          );
        })}
      </svg>
      {node}
    </div>
  );
}

/* ============================================================
   CSS (scoped by the adm- prefix)
============================================================ */

const ADMIN_CSS = `
.adm-page { width: 100%; box-sizing: border-box; max-width: none; margin: 0; padding: 0 24px 50px; font-family: Poppins, sans-serif; color: #111; display: flex; flex-direction: column; gap: 16px; }
.adm-page > * { min-width: 0; }
.adm-error { margin: 0; padding: 12px 14px; border-radius: 10px; background: #f8eeee; color: #a52b2b; font: 500 12px Poppins, sans-serif; }
.adm-loading { padding: 60px 20px; text-align: center; color: #777; font: 500 12px Poppins, sans-serif; }
.adm-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 38px 16px; text-align: center; color: #888; font: 400 12px Poppins, sans-serif; }
.adm-empty strong { color: #444; font-weight: 500; font-size: 13px; }

.adm-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
.adm-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
.adm-grid-3-2 { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; align-items: stretch; }

.adm-stat, .adm-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 14px; }
.adm-stat { padding: 18px; display: flex; flex-direction: column; }
.adm-icon { width: 31px; height: 31px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: #f3f3f3; margin-bottom: 12px; }
.adm-label { color: #888; font: 500 10px Poppins, sans-serif; text-transform: uppercase; letter-spacing: .07em; }
.adm-value { margin-top: 3px; color: #111; font: 500 24px Poppins, sans-serif; overflow-wrap: anywhere; }
.adm-sub { margin-top: 5px; color: #888; font: 400 11px Poppins, sans-serif; }

.adm-card { padding: 18px; margin: 0; min-width: 0; display: flex; flex-direction: column; }
.adm-card > :last-child { flex: 1 1 auto; }
.adm-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; min-height: 38px; }
.adm-card h3 { margin: 0; color: #111; font: 500 14px Poppins, sans-serif; }
.adm-card-head p { margin: 3px 0 0; color: #888; font: 400 11px Poppins, sans-serif; }

.adm-toolbar { display: flex; align-items: center; justify-content: flex-start; gap: 12px 28px; flex-wrap: wrap; }
.adm-toolbar-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.adm-pills { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0; padding: 0; }
.adm-pills .adm-pill { box-sizing: border-box; appearance: none; -webkit-appearance: none; display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; gap: 6px; width: auto; height: 34px; min-height: 34px; max-height: 34px; margin: 0; padding: 0 14px; border: 1px solid #e0e0e0; border-radius: 999px; background: #fff; color: #555; font: 500 12px/1 Poppins, sans-serif; letter-spacing: 0; text-transform: none; text-align: center; white-space: nowrap; vertical-align: middle; box-shadow: none; outline: none; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.adm-pills .adm-pill:hover { background: #fff; border-color: #bbb; color: #111; box-shadow: none; }
.adm-pills .adm-pill:focus-visible { outline: 2px solid #111; outline-offset: 2px; }
.adm-pills .adm-pill.active, .adm-pills .adm-pill.active:hover { background: #111; border-color: #111; color: #fff; }
.adm-pills .adm-pill-count { display: inline-block; font-size: 10px; line-height: 1; opacity: .65; }

.adm-table-wrap { width: 100%; overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; }
.adm-table th, .adm-table td { padding: 12px 10px; vertical-align: middle; text-align: left; border-bottom: 1px solid #eee; white-space: nowrap; font: 500 11.5px Poppins, sans-serif; color: #222; }
.adm-table th { color: #888; font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; }
.adm-table th.num, .adm-table td.num { text-align: right; }
.adm-table tbody tr:last-child td { border-bottom: 0; }
.adm-cell-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.adm-cell-main span.name { max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.adm-muted { color: #888; font-weight: 400; }
.adm-actions { display: flex; gap: 6px; }

.adm-avatar { width: 28px; height: 28px; flex: none; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: #f0f0f0; color: #555; font: 600 10px Poppins, sans-serif; overflow: hidden; }
.adm-avatar img { width: 100%; height: 100%; object-fit: cover; }

.adm-badge { display: inline-block; padding: 3px 9px; border-radius: 999px; background: #f0f0f0; color: #555; font: 500 10.5px Poppins, sans-serif; }
.adm-badge-active, .adm-badge-published { background: #e8f5ee; color: #1f7a4d; }
.adm-badge-restricted, .adm-badge-cancelled { background: #f8eeee; color: #a52b2b; }
.adm-badge-in_progress { background: #e9f0fb; color: #2456a6; }
.adm-badge-completed { background: #efeafa; color: #5a3fa0; }
.adm-badge-draft, .adm-badge-closed { background: #f0f0f0; color: #666; }
.adm-badge-paid { background: #e8f5ee; color: #1f7a4d; }

.adm-btn-sm { height: 30px; padding: 0 11px; font-size: 11.5px; }
.btn.adm-btn-danger { background: #a52b2b; border-color: #a52b2b; color: #fff; }
.btn.adm-btn-danger:hover { background: #8a2222; border-color: #8a2222; color: #fff; }
.btn.adm-btn-outline-danger { background: #fff; border-color: #e3c4c4; color: #a52b2b; }
.btn.adm-btn-outline-danger:hover { background: #f8eeee; border-color: #d4a5a5; color: #a52b2b; }

.adm-pager { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding-top: 14px; color: #888; font: 400 11.5px Poppins, sans-serif; }
.adm-pager > div { display: flex; align-items: center; gap: 8px; }
.adm-pager-page { color: #555; }

.adm-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17,17,17,.42); }
.adm-backdrop-right { justify-content: flex-end; padding: 0; }
.adm-modal { width: 100%; max-width: 420px; padding: 22px; border-radius: 16px; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
.adm-modal h3 { margin: 0 0 8px; font: 600 16px Poppins, sans-serif; }
.adm-modal p { margin: 0 0 16px; color: #555; font: 400 13px/1.55 Poppins, sans-serif; }
.adm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

.adm-drawer { width: 100%; max-width: 480px; height: 100%; display: flex; flex-direction: column; background: #fff; box-shadow: -12px 0 40px rgba(0,0,0,.15); }
.adm-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #eee; }
.adm-drawer-head h3 { margin: 0; font: 600 15px Poppins, sans-serif; }
.adm-drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
.adm-icon-btn { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: transparent; color: #555; cursor: pointer; }
.adm-icon-btn:hover { background: #f3f3f3; color: #111; }

.adm-profile-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.adm-profile-head .adm-avatar { width: 54px; height: 54px; font-size: 16px; }
.adm-profile-head h4 { margin: 0 0 3px; font: 600 15px Poppins, sans-serif; }
.adm-profile-head p { margin: 0; color: #888; font: 400 12px Poppins, sans-serif; overflow-wrap: anywhere; }
.adm-detail { margin: 0; display: grid; gap: 12px; }
.adm-detail > div { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 10px; padding-bottom: 12px; border-bottom: 1px solid #f1f1f1; }
.adm-detail dt { color: #888; font: 500 11px Poppins, sans-serif; }
.adm-detail dd { margin: 0; color: #222; font: 400 12.5px/1.5 Poppins, sans-serif; overflow-wrap: anywhere; white-space: pre-wrap; }
.adm-section-title { margin: 22px 0 10px; color: #888; font: 500 10px Poppins, sans-serif; text-transform: uppercase; letter-spacing: .07em; }
.adm-drawer-actions { display: flex; gap: 8px; margin-top: 22px; }
.adm-tags { display: inline-flex; flex-wrap: wrap; gap: 5px; }
.adm-tag { padding: 2px 8px; border-radius: 999px; background: #f3f3f3; color: #444; font: 500 11px Poppins, sans-serif; }
.adm-mini-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.adm-mini-list li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid #eee; border-radius: 9px; font: 400 12px Poppins, sans-serif; }
.adm-mini-list li span:last-child { color: #888; text-align: right; }
.adm-note { margin: 12px 0 0; padding: 10px 12px; border-radius: 9px; background: #f7f7f7; color: #666; font: 400 11.5px/1.5 Poppins, sans-serif; }
.adm-link { color: #111; text-decoration: underline; }
.adm-note-warn { background: #fdf3e7; color: #8a5a12; }
.adm-field-label { display: block; margin: 12px 0 6px; color: #555; font: 500 11.5px Poppins, sans-serif; }
.adm-input { width: 100%; box-sizing: border-box; border: 1px solid #e0e0e0; border-radius: 8px; padding: 9px 12px; background: #fff; color: #111; font: 400 12.5px Poppins, sans-serif; outline: none; }
.adm-input:focus { border-color: #111; }
.adm-textarea { resize: vertical; line-height: 1.5; }
.adm-check-list { margin: 0 0 12px; padding: 0; list-style: none; display: grid; gap: 6px; }
.adm-check-list label { display: flex; align-items: center; gap: 8px; font: 400 12px Poppins, sans-serif; color: #444; cursor: pointer; }
.adm-modal .adm-error { margin: 12px 0 0; }
.adm-modal-actions { margin-top: 16px; }

.adm-donut { position: relative; height: 100%; min-height: 220px; display: flex; align-items: center; gap: 28px; flex-wrap: wrap; justify-content: center; }
.adm-donut svg { width: 170px; height: 170px; flex: none; }
.adm-donut-total { font: 600 20px Poppins, sans-serif; fill: #111; }
.adm-donut-caption { font: 400 7px Poppins, sans-serif; fill: #888; }
.adm-legend { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; min-width: 150px; }
.adm-legend li { display: grid; grid-template-columns: 10px 1fr auto auto; align-items: center; gap: 8px; font: 500 12px Poppins, sans-serif; color: #444; }
.adm-legend em { color: #999; font-style: normal; font-weight: 400; min-width: 34px; text-align: right; }
.adm-dot { width: 10px; height: 10px; border-radius: 50%; }

.adm-chart-wrap { position: relative; width: 100%; }
.adm-bars { width: 100%; height: auto; display: block; }
.adm-bars rect { transition: opacity .12s ease, fill .12s ease; }
.adm-slice { cursor: pointer; transition: stroke-width .12s ease; }
.adm-legend li { padding: 4px 6px; margin: -4px -6px; border-radius: 8px; transition: background .12s; }
.adm-legend li.active { background: #f4f4f4; }

.adm-tooltip { position: absolute; z-index: 5; transform: translate(12px, -110%); pointer-events: none; display: flex; flex-direction: column; gap: 1px; padding: 6px 10px; border-radius: 8px; background: #111; color: #fff; white-space: nowrap; box-shadow: 0 6px 18px rgba(0,0,0,.25); font: 400 11px Poppins, sans-serif; }
.adm-tooltip strong { font-weight: 600; font-size: 12.5px; }
.adm-axis { font: 400 10px Poppins, sans-serif; fill: #999; }
.adm-axis-strong { fill: #444; font-weight: 500; }

.adm-activity { margin: 0; padding: 0; list-style: none; }
.adm-more { display: flex; justify-content: center; padding-top: 12px; border-top: 1px solid #f0f0f0; margin-top: 4px; }
.adm-more button { border: 0; background: none; color: #555; font: 500 12px Poppins, sans-serif; cursor: pointer; padding: 6px 12px; border-radius: 8px; }
.adm-more button:hover { background: #f4f4f4; color: #111; }
.adm-more button + button { margin-left: 4px; }
.adm-activity li { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 11px 0; border-top: 1px solid #f0f0f0; }
.adm-activity li:first-child { border-top: 0; padding-top: 0; }
.adm-activity strong { display: block; color: #111; font: 500 12.5px Poppins, sans-serif; }
.adm-activity span.subject { display: block; margin-top: 2px; color: #777; font: 400 11.5px Poppins, sans-serif; overflow-wrap: anywhere; }
.adm-activity time { flex: none; color: #999; font: 400 11px Poppins, sans-serif; text-align: right; }

.adm-page-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

@media (max-width: 1000px) {
  .adm-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .adm-grid-2, .adm-grid-3-2 { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .adm-grid-4 { grid-template-columns: 1fr; }
  .adm-detail > div { grid-template-columns: 1fr; gap: 3px; }
  .adm-activity li { flex-direction: column; gap: 4px; }
  .adm-activity time { text-align: left; }
}
`;
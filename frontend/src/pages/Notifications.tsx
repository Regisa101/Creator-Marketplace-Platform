import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  CreditCard,
  FileText,
  Flag,
  Inbox,
  Loader2,
  ShieldAlert,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  deleteCampaign,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateCampaign,
  type Notification as AppNotification,
} from '../api/client';
import { AppLayout } from '../components/AppLayout';

type Tone = 'neutral' | 'green' | 'amber' | 'red';
type Tab = 'all' | 'unread';

const GROUPS = ['Today', 'Yesterday', 'This week', 'Earlier'] as const;

/* Icon + colour for each kind of notification. */
function metaFor(type: string): { icon: ReactNode; tone: Tone } {
  if (type === 'campaign_deadline_expired') return { icon: <CalendarClock size={18} />, tone: 'amber' };
  if (type.startsWith('payment') || type === 'platform_fee' || type.includes('payment_completed') || type === 'collaboration_completed')
    return { icon: <CreditCard size={18} />, tone: 'green' };
  if (type.startsWith('contract')) return { icon: <FileText size={18} />, tone: 'neutral' };
  if (type === 'creator_selected') return { icon: <UserCheck size={18} />, tone: 'green' };
  if (type.includes('application')) return { icon: <Inbox size={18} />, tone: 'neutral' };
  if (type.startsWith('complaint')) return { icon: <Flag size={18} />, tone: 'amber' };
  if (type.includes('restricted')) return { icon: <ShieldAlert size={18} />, tone: 'red' };
  if (type.startsWith('account')) return { icon: <ShieldAlert size={18} />, tone: 'neutral' };
  return { icon: <Bell size={18} />, tone: 'neutral' };
}

function groupOf(iso: string): (typeof GROUPS)[number] {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(iso).getTime();
  if (t >= startToday) return 'Today';
  if (t >= startToday - 86400000) return 'Yesterday';
  if (t >= startToday - 6 * 86400000) return 'This week';
  return 'Earlier';
}

function timeAgo(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function todayInputDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  // Which "deadline expired" notification currently has its extend-date
  // picker open, keyed by notification id.
  const [extendingId, setExtendingId] = useState<number | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [actingId, setActingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getNotifications(false));
    } catch (err) {
      console.error('Could not load notifications:', err);
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openItem = async (item: AppNotification) => {
    if (!item.is_read) {
      try {
        const updated = await markNotificationRead(item.id);
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } catch (err) {
        console.error('Could not mark notification read:', err);
      }
    }
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    setWorking(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      console.error('Could not mark all notifications read:', err);
    } finally {
      setWorking(false);
    }
  };

  const startExtend = (item: AppNotification, e: MouseEvent) => {
    e.stopPropagation();
    setActionError((prev) => ({ ...prev, [item.id]: '' }));
    setExtendDate(todayInputDate());
    setExtendingId((current) => (current === item.id ? null : item.id));
  };

  const confirmExtend = async (item: AppNotification, e: MouseEvent) => {
    e.stopPropagation();
    if (!item.reference_id || !extendDate) return;

    setActingId(item.id);
    setActionError((prev) => ({ ...prev, [item.id]: '' }));
    try {
      await updateCampaign(item.reference_id, {
        application_deadline: `${extendDate}T00:00:00Z`,
      });
      await markNotificationRead(item.id).catch(() => undefined);
      setExtendingId(null);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      console.error('Could not extend the deadline:', err);
      setActionError((prev) => ({ ...prev, [item.id]: 'Could not extend the deadline. Please try again.' }));
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (item: AppNotification, e: MouseEvent) => {
    e.stopPropagation();
    if (!item.reference_id) return;
    if (!window.confirm('Delete this campaign? It will be removed from the marketplace.')) return;

    setActingId(item.id);
    setActionError((prev) => ({ ...prev, [item.id]: '' }));
    try {
      await deleteCampaign(item.reference_id);
      await markNotificationRead(item.id).catch(() => undefined);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      console.error('Could not delete the campaign:', err);
      setActionError((prev) => ({ ...prev, [item.id]: 'Could not delete the campaign. Please try again.' }));
    } finally {
      setActingId(null);
    }
  };

  const unread = items.filter((x) => !x.is_read).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((x) => (tab === 'unread' ? !x.is_read : true))
      .filter((x) => (q ? `${x.title} ${x.message}`.toLowerCase().includes(q) : true))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [items, tab, query]);

  const grouped = useMemo(
    () =>
      GROUPS.map((label) => ({
        label,
        rows: visible.filter((x) => groupOf(x.created_at) === label),
      })).filter((g) => g.rows.length > 0),
    [visible],
  );

  const emptyText = query.trim()
    ? `No notifications match “${query.trim()}”.`
    : tab === 'unread'
      ? 'You have no unread notifications.'
      : 'No notifications yet.';

  return (
    <AppLayout
      title="Notifications"
      subtitle="Updates about applications, collaborations, and payments."
      showSearch
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search notifications…"
    >
      <style>{`
        .nf-wrap{width:100%;max-width:880px;padding:4px 24px 56px;font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111}

        .nf-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
        .nf-tabs{display:inline-flex;gap:4px;padding:4px;border-radius:11px;background:#f3f3f3}
        .nf-tab{height:32px;padding:0 14px;border:0;border-radius:8px;background:transparent;color:#666;font:500 12.5px Poppins,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:background .15s ease,color .15s ease}
        .nf-tab:hover{color:#111}
        .nf-tab.active{background:#fff;color:#111;box-shadow:0 1px 3px rgba(0,0,0,.08)}
        .nf-pill{min-width:18px;height:18px;padding:0 6px;border-radius:999px;background:#111;color:#fff;font:600 10px Poppins,sans-serif;display:inline-flex;align-items:center;justify-content:center;line-height:1}
        .nf-mark{height:34px;padding:0 13px;border:1px solid #e3e3e3;border-radius:9px;background:#fff;color:#111;font:500 12.5px Poppins,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:background .15s ease}
        .nf-mark:hover:not(:disabled){background:#f5f5f5}
        .nf-mark:disabled{opacity:.55;cursor:default}

        .nf-group{margin-bottom:18px}
        .nf-group-label{margin:0 0 8px 2px;font:600 11px Poppins,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a8a8a}
        .nf-card{background:#fff;border:1px solid #e8e8e8;border-radius:14px;overflow:hidden}

        .nf-row{position:relative;display:flex;align-items:flex-start;gap:14px;padding:16px 18px;border-bottom:1px solid #f0f0f0;background:#fff;cursor:pointer;transition:background .15s ease}
        .nf-row:last-child{border-bottom:0}
        .nf-row:hover{background:#fafafa}
        .nf-row.unread{background:#f7f9ff}
        .nf-row.unread:hover{background:#f1f5ff}
        .nf-row.unread::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#111}

        .nf-icon{width:40px;height:40px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;background:#f1f1f1;color:#333}
        .nf-icon.green{background:#e8f6ee;color:#1e8a4c}
        .nf-icon.amber{background:#fff4de;color:#a56a00}
        .nf-icon.red{background:#fbeaea;color:#b3261e}

        .nf-main{flex:1;min-width:0}
        .nf-title{margin:0;font:500 13.5px/1.4 Poppins,sans-serif;color:#111}
        .nf-row.unread .nf-title{font-weight:600}
        .nf-message{margin:3px 0 0;font:400 12.5px/1.55 Poppins,sans-serif;color:#666;overflow-wrap:anywhere}
        .nf-time{margin-top:6px;font:400 11.5px Poppins,sans-serif;color:#9a9a9a}
        .nf-row.unread .nf-time{color:#3b5bdb;font-weight:500}
        .nf-dot{width:9px;height:9px;border-radius:50%;background:#3b5bdb;flex:none;margin-top:6px}

        .nf-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
        .nf-btn{height:34px;padding:0 13px;border:1px solid #e3e3e3;border-radius:8px;background:#fff;color:#111;font:500 12px Poppins,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
        .nf-btn:hover:not(:disabled){background:#f5f5f5}
        .nf-btn:disabled{opacity:.55;cursor:default}
        .nf-btn-danger{border-color:#f2c9c2;background:#fff5f3;color:#a33327}
        .nf-btn-danger:hover:not(:disabled){background:#fdebe7}
        .nf-extend{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
        .nf-extend input[type=date]{height:34px;padding:0 10px;border:1px solid #e3e3e3;border-radius:8px;font:400 12px Poppins,sans-serif;color:#111}
        .nf-error{margin-top:8px;font:500 11.5px Poppins,sans-serif;color:#a33327}

        .nf-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:64px 20px;text-align:center;background:#fff;border:1px solid #e8e8e8;border-radius:14px;color:#777;font:400 13px Poppins,sans-serif}
        .nf-empty-icon{width:56px;height:56px;border-radius:50%;background:#f3f3f3;color:#888;display:flex;align-items:center;justify-content:center}
        .nf-empty strong{color:#111;font:600 14px Poppins,sans-serif}

        .nf-skel{display:flex;gap:14px;padding:16px 18px;border-bottom:1px solid #f0f0f0}
        .nf-skel:last-child{border-bottom:0}
        .nf-skel-circle{width:40px;height:40px;border-radius:50%;background:#f0f0f0;flex:none}
        .nf-skel-lines{flex:1;display:flex;flex-direction:column;gap:8px;padding-top:4px}
        .nf-skel-line{height:10px;border-radius:6px;background:#f0f0f0}
        .nf-skel-circle,.nf-skel-line{animation:nf-pulse 1.2s ease-in-out infinite}
        @keyframes nf-pulse{50%{opacity:.5}}
        .nf-spin{animation:nf-spin .8s linear infinite}
        @keyframes nf-spin{to{transform:rotate(360deg)}}

        @media(max-width:560px){
          .nf-wrap{padding:4px 16px 40px}
          .nf-row{padding:14px;gap:12px}
          .nf-icon{width:36px;height:36px}
        }
      `}</style>

      <div className="nf-wrap">
        <div className="nf-toolbar">
          <div className="nf-tabs" role="tablist" aria-label="Filter notifications">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'all'}
              className={`nf-tab ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'unread'}
              className={`nf-tab ${tab === 'unread' ? 'active' : ''}`}
              onClick={() => setTab('unread')}
            >
              Unread
              {unread > 0 && <span className="nf-pill">{unread > 99 ? '99+' : unread}</span>}
            </button>
          </div>

          {unread > 0 && (
            <button type="button" className="nf-mark" onClick={() => void markAll()} disabled={working}>
              {working ? <Loader2 size={14} className="nf-spin" /> : <CheckCheck size={14} />}
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="nf-card" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div className="nf-skel" key={i}>
                <div className="nf-skel-circle" />
                <div className="nf-skel-lines">
                  <div className="nf-skel-line" style={{ width: '38%' }} />
                  <div className="nf-skel-line" style={{ width: '82%' }} />
                  <div className="nf-skel-line" style={{ width: '16%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="nf-empty">
            <div className="nf-empty-icon"><BellOff size={24} /></div>
            <strong>Something went wrong</strong>
            {error}
            <button type="button" className="nf-btn" onClick={() => void load()}>Try again</button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="nf-empty">
            <div className="nf-empty-icon"><Bell size={24} /></div>
            <strong>{query.trim() || tab === 'unread' ? 'Nothing to show' : 'You’re all caught up'}</strong>
            {emptyText}
          </div>
        ) : (
          grouped.map((group) => (
            <section className="nf-group" key={group.label}>
              <h2 className="nf-group-label">{group.label}</h2>
              <div className="nf-card">
                {group.rows.map((item) => {
                  const { icon, tone } = metaFor(item.type);
                  const isDeadlineAlert = item.type === 'campaign_deadline_expired' && !!item.reference_id;
                  const isExtending = extendingId === item.id;
                  const busy = actingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`nf-row ${item.is_read ? '' : 'unread'}`}
                      onClick={() => void openItem(item)}
                    >
                      <div className={`nf-icon ${tone === 'neutral' ? '' : tone}`}>{icon}</div>

                      <div className="nf-main">
                        <p className="nf-title">{item.title}</p>
                        <p className="nf-message">{item.message}</p>
                        <div className="nf-time" title={new Date(item.created_at).toLocaleString()}>
                          {timeAgo(item.created_at)}
                        </div>

                        {isDeadlineAlert && (
                          <>
                            <div className="nf-actions">
                              <button type="button" className="nf-btn" disabled={busy} onClick={(e) => startExtend(item, e)}>
                                <CalendarClock size={13} /> {isExtending ? 'Cancel' : 'Extend deadline'}
                              </button>
                              <button type="button" className="nf-btn nf-btn-danger" disabled={busy} onClick={(e) => void handleDelete(item, e)}>
                                <Trash2 size={13} /> Delete campaign
                              </button>
                            </div>

                            {isExtending && (
                              <div className="nf-extend" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="date"
                                  value={extendDate}
                                  min={todayInputDate()}
                                  onChange={(e) => setExtendDate(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="nf-btn"
                                  disabled={busy || !extendDate}
                                  onClick={(e) => void confirmExtend(item, e)}
                                >
                                  {busy ? 'Saving…' : 'Save new deadline'}
                                </button>
                              </div>
                            )}

                            {actionError[item.id] && <div className="nf-error">{actionError[item.id]}</div>}
                          </>
                        )}
                      </div>

                      {!item.is_read && <span className="nf-dot" aria-label="Unread" />}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </AppLayout>
  );
}

export default Notifications;
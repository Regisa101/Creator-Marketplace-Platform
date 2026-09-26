import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Bell, CalendarClock, CheckCheck, CreditCard, Inbox, Loader2, Trash2 } from 'lucide-react';
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

const C = { ink:'#181818', inkSoft:'#6B6478', faint:'#A39DB8', line:'#E8E8E8', coral:'#111111' };

function iconFor(type: string) {
  if (type === 'payment_received') return <CreditCard size={17} />;
  if (type === 'campaign_deadline_expired') return <CalendarClock size={17} />;
  if (type.includes('application')) return <Inbox size={17} />;
  return <Bell size={17} />;
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

  // Which "deadline expired" notification currently has its extend-date
  // picker open, keyed by notification id.
  const [extendingId, setExtendingId] = useState<number | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [actingId, setActingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try { setItems(await getNotifications(false)); }
    catch (err) { console.error('Could not load notifications:', err); setError('Could not load notifications.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const openItem = async (item: AppNotification) => {
    if (!item.is_read) {
      try {
        const updated = await markNotificationRead(item.id);
        setItems((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      } catch (err) { console.error('Could not mark notification read:', err); }
    }
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    setWorking(true);
    try { await markAllNotificationsRead(); setItems((prev) => prev.map((item) => ({ ...item, is_read: true }))); }
    catch (err) { console.error('Could not mark all notifications read:', err); }
    finally { setWorking(false); }
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

  return (
    <AppLayout title="Notifications" subtitle="Updates about applications, collaborations, and payments." showSearch={false}>
      <style>{`
        .nf-wrap{max-width:860px;margin:0 auto;padding:28px 24px 48px}.nf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.nf-count{color:${C.inkSoft};font-size:12px}.nf-mark{border:1px solid ${C.line};background:#fff;border-radius:9px;padding:8px 11px;color:${C.ink};font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.nf-list{display:grid;gap:10px}.nf-card{border:1px solid ${C.line};border-radius:15px;background:#fff;padding:15px 16px;display:flex;gap:12px;cursor:pointer;transition:.15s ease}.nf-card:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(18,19,26,.05)}.nf-card.unread{border-color:#ffd1c8;background:#fffaf8}.nf-icon{width:36px;height:36px;border-radius:11px;background:#fff0eb;color:${C.coral};display:flex;align-items:center;justify-content:center;flex:none}.nf-main{flex:1;min-width:0}.nf-title{font-size:13px;font-weight:750;color:${C.ink}}.nf-message{font-size:12.5px;color:${C.inkSoft};line-height:1.55;margin-top:3px}.nf-time{font-size:10.5px;color:${C.faint};margin-top:6px}.nf-dot{width:7px;height:7px;border-radius:50%;background:${C.coral};margin-top:6px;flex:none}.nf-state{padding:60px 20px;text-align:center;color:${C.inkSoft};font-size:13px}.nf-spin{animation:nf-spin .8s linear infinite}@keyframes nf-spin{to{transform:rotate(360deg)}}
        .nf-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.nf-btn{border-radius:8px;padding:7px 12px;font-size:11.5px;font-weight:700;cursor:pointer;border:1px solid ${C.line};background:#fff;color:${C.ink};display:inline-flex;align-items:center;gap:6px}.nf-btn:disabled{opacity:.55;cursor:default}.nf-btn-danger{border-color:#f2c9c2;color:#a33327;background:#fff5f3}.nf-extend{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}.nf-extend input[type=date]{border:1px solid ${C.line};border-radius:8px;padding:7px 9px;font-size:12px;color:${C.ink}}.nf-error{font-size:11px;color:#a33327;margin-top:6px}
      `}</style>
      <div className="nf-wrap">
        <div className="nf-head"><div className="nf-count">{unread > 0 ? `${unread} unread` : 'You’re all caught up'}</div>{unread > 0 && <button className="nf-mark" onClick={() => void markAll()} disabled={working}><CheckCheck size={14}/> Mark all read</button>}</div>
        {loading ? <div className="nf-state"><Loader2 size={20} className="nf-spin"/></div> : error ? <div className="nf-state">{error}</div> : items.length === 0 ? <div className="nf-state">No notifications yet.</div> : <div className="nf-list">{items.map((item) => {
          const isDeadlineAlert = item.type === 'campaign_deadline_expired' && !!item.reference_id;
          const isExtending = extendingId === item.id;
          const busy = actingId === item.id;

          return (
            <div key={item.id} className={`nf-card ${item.is_read ? '' : 'unread'}`} onClick={() => void openItem(item)}>
              <div className="nf-icon">{iconFor(item.type)}</div>
              <div className="nf-main">
                <div className="nf-title">{item.title}</div>
                <div className="nf-message">{item.message}</div>
                <div className="nf-time">{new Date(item.created_at).toLocaleString()}</div>

                {isDeadlineAlert && (
                  <>
                    <div className="nf-actions">
                      <button className="nf-btn" disabled={busy} onClick={(e) => startExtend(item, e)}>
                        <CalendarClock size={13} /> {isExtending ? 'Cancel' : 'Extend deadline'}
                      </button>
                      <button className="nf-btn nf-btn-danger" disabled={busy} onClick={(e) => void handleDelete(item, e)}>
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
                        <button className="nf-btn" disabled={busy || !extendDate} onClick={(e) => void confirmExtend(item, e)}>
                          {busy ? 'Saving…' : 'Save new deadline'}
                        </button>
                      </div>
                    )}

                    {actionError[item.id] && <div className="nf-error">{actionError[item.id]}</div>}
                  </>
                )}
              </div>
              {!item.is_read && <span className="nf-dot"/>}
            </div>
          );
        })}</div>}
      </div>
    </AppLayout>
  );
}

export default Notifications;
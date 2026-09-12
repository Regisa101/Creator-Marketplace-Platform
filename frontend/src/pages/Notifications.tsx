import { useEffect, useState } from 'react';
import { Bell, CheckCheck, CreditCard, Inbox, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAllNotificationsRead, markNotificationRead, type Notification as AppNotification } from '../api/client';
import { AppLayout } from '../components/AppLayout';

const C = { ink:'#1A1625', inkSoft:'#6B6478', faint:'#A39DB8', line:'#EAE7F2', coral:'#F47C78' };

function iconFor(type: string) {
  if (type === 'payment_received') return <CreditCard size={17} />;
  if (type.includes('application')) return <Inbox size={17} />;
  return <Bell size={17} />;
}

export function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

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

  const unread = items.filter((x) => !x.is_read).length;

  return (
    <AppLayout title="Notifications" subtitle="Updates about applications, collaborations, and payments." showSearch={false}>
      <style>{`
        .nf-wrap{max-width:860px;margin:0 auto;padding:28px 24px 48px}.nf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.nf-count{color:${C.inkSoft};font-size:12px}.nf-mark{border:1px solid ${C.line};background:#fff;border-radius:9px;padding:8px 11px;color:${C.ink};font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.nf-list{display:grid;gap:10px}.nf-card{border:1px solid ${C.line};border-radius:15px;background:#fff;padding:15px 16px;display:flex;gap:12px;cursor:pointer;transition:.15s ease}.nf-card:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(18,19,26,.05)}.nf-card.unread{border-color:#ffd1c8;background:#fffaf8}.nf-icon{width:36px;height:36px;border-radius:11px;background:#fff0eb;color:${C.coral};display:flex;align-items:center;justify-content:center;flex:none}.nf-main{flex:1;min-width:0}.nf-title{font-size:13px;font-weight:750;color:${C.ink}}.nf-message{font-size:12.5px;color:${C.inkSoft};line-height:1.55;margin-top:3px}.nf-time{font-size:10.5px;color:${C.faint};margin-top:6px}.nf-dot{width:7px;height:7px;border-radius:50%;background:${C.coral};margin-top:6px;flex:none}.nf-state{padding:60px 20px;text-align:center;color:${C.inkSoft};font-size:13px}.nf-spin{animation:nf-spin .8s linear infinite}@keyframes nf-spin{to{transform:rotate(360deg)}}
      `}</style>
      <div className="nf-wrap">
        <div className="nf-head"><div className="nf-count">{unread > 0 ? `${unread} unread` : 'You’re all caught up'}</div>{unread > 0 && <button className="nf-mark" onClick={() => void markAll()} disabled={working}><CheckCheck size={14}/> Mark all read</button>}</div>
        {loading ? <div className="nf-state"><Loader2 size={20} className="nf-spin"/></div> : error ? <div className="nf-state">{error}</div> : items.length === 0 ? <div className="nf-state">No notifications yet.</div> : <div className="nf-list">{items.map((item) => <div key={item.id} className={`nf-card ${item.is_read ? '' : 'unread'}`} onClick={() => void openItem(item)}><div className="nf-icon">{iconFor(item.type)}</div><div className="nf-main"><div className="nf-title">{item.title}</div><div className="nf-message">{item.message}</div><div className="nf-time">{new Date(item.created_at).toLocaleString()}</div></div>{!item.is_read && <span className="nf-dot"/>}</div>)}</div>}
      </div>
    </AppLayout>
  );
}

export default Notifications;
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUnreadMessageCount } from '../api/client';
import { MessagesPanel } from './MessagesPanel';

type Props = {
  /** "popup": Instagram-style dropdown (landing page). "link": goes to /messages (dashboards). */
  variant?: 'popup' | 'link';
  className?: string;
  size?: number;
};

/** Message icon for creators and brands, with an unread badge. */
export function MessageIconButton({ variant = 'popup', className = 'ch-nav-icon', size = 17 }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const allowed = user?.role === 'creator' || user?.role === 'business';

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    const load = () => getUnreadMessageCount().then((n) => alive && setUnread(n)).catch(() => undefined);
    load();
    const t = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [allowed, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!allowed) return null;

  const badge = unread > 0 && <span className="ch-nav-badge app-notification-badge">{unread > 99 ? '99+' : unread}</span>;

  if (variant === 'link') {
    return (
      <Link to="/messages" className={className} aria-label={unread ? `${unread} unread messages` : 'Messages'} style={{ position: 'relative' }}>
        <MessageCircle size={size} />
        {badge}
      </Link>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className={className} aria-label="Messages" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MessageCircle size={size} />
        {badge}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 1000 }}>
          <MessagesPanel
            compact
            onNavigate={() => {
              setOpen(false);
              navigate('/messages');
            }}
          />
        </div>
      )}
    </div>
  );
}
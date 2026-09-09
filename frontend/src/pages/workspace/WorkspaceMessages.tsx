import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Send } from 'lucide-react';
import { getCollabs, getMessages, sendMessage, type Collab, type WorkspaceMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/AppLayout';

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

function initials(name?: string | null) {
  if (!name) return 'C';
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export function WorkspaceMessages() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('collab');

  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(true);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCollabs()
      .then((data) => {
        setCollabs(data);
        if (!selectedId && data.length > 0) {
          setSearchParams({ collab: String(data[0].id) }, { replace: true });
        }
      })
      .catch((err) => console.error('Could not load collaborations:', err))
      .finally(() => setLoadingCollabs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCollab = useMemo(
    () => collabs.find((c) => String(c.id) === selectedId) || null,
    [collabs, selectedId]
  );

  const loadMessages = async (collabId: number) => {
    setLoadingMessages(true);
    setError('');
    try {
      const data = await getMessages(collabId);
      setMessages(data);
    } catch (err) {
      console.error('Could not load messages:', err);
      setError('Could not load this conversation.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedId) loadMessages(Number(selectedId));
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!draft.trim() || !selectedId) return;
    setSending(true);
    try {
      const message = await sendMessage(Number(selectedId), draft.trim());
      setMessages((prev) => [...prev, message]);
      setDraft('');
    } catch (err) {
      console.error('Could not send message:', err);
      setError('Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout title="Messages" subtitle="Chat with your active collaborators." showSearch={false} showNotifications={false}>
      <style>{`
        .wm-shell { display: flex; height: calc(100vh - 96px); max-width: 1100px; margin: 0 auto; border-top: 1px solid ${C.line}; }
        .wm-list { width: 280px; border-right: 1px solid ${C.line}; overflow-y: auto; flex-shrink: 0; }
        .wm-list-item { display: flex; align-items: center; gap: 10px; padding: 14px 18px; cursor: pointer; border-bottom: 1px solid ${C.line}; }
        .wm-list-item:hover { background: ${C.surface}; }
        .wm-list-item--active { background: ${isBusiness ? C.navySoft : C.coralSoft}; }
        .wm-avatar { width: 36px; height: 36px; border-radius: 50%; background: ${primary}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; object-fit: cover; }
        .wm-list-name { font-size: 13.5px; font-weight: 600; color: ${C.ink}; }
        .wm-list-sub { font-size: 11.5px; color: ${C.inkSoft}; }

        .wm-panel { flex: 1; display: flex; flex-direction: column; }
        .wm-thread { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 10px; }
        .wm-bubble-row { display: flex; }
        .wm-bubble-row--mine { justify-content: flex-end; }
        .wm-bubble { max-width: 60%; padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.5; }
        .wm-bubble--theirs { background: ${C.surface}; color: ${C.ink}; border-bottom-left-radius: 4px; }
        .wm-bubble--mine { background: ${primary}; color: #fff; border-bottom-right-radius: 4px; }
        .wm-bubble-time { font-size: 10px; color: ${C.inkFaint}; margin-top: 4px; }

        .wm-composer { display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid ${C.line}; }
        .wm-composer input { flex: 1; border: 1px solid ${C.line}; border-radius: 10px; padding: 11px 14px; font-size: 13.5px; }
        .wm-composer button { border: none; background: ${primary}; color: #fff; border-radius: 10px; padding: 0 18px; cursor: pointer; display: flex; align-items: center; }
        .wm-composer button:disabled { opacity: 0.6; cursor: not-allowed; }

        .wm-state { text-align: center; padding: 60px 20px; color: ${C.inkSoft}; font-size: 13px; margin: auto; }
        .wm-spin { animation: wm-spin 0.8s linear infinite; }
        @keyframes wm-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="wm-shell">
        <div className="wm-list">
          {loadingCollabs && <div className="wm-state"><Loader2 size={18} className="wm-spin" /></div>}
          {!loadingCollabs && collabs.length === 0 && (
            <div className="wm-state">No active collaborations yet.</div>
          )}
          {!loadingCollabs && collabs.map((collab) => {
            const name = isBusiness ? collab.creator_name : collab.business_name;
            const avatar = isBusiness ? collab.creator_avatar : collab.business_logo;
            return (
              <div
                key={collab.id}
                className={`wm-list-item ${String(collab.id) === selectedId ? 'wm-list-item--active' : ''}`}
                onClick={() => setSearchParams({ collab: String(collab.id) })}
              >
                {avatar ? <img className="wm-avatar" src={avatar} alt="" /> : <div className="wm-avatar">{initials(name)}</div>}
                <div>
                  <div className="wm-list-name">{name || 'Collaborator'}</div>
                  <div className="wm-list-sub">{collab.campaign_title}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="wm-panel">
          {!selectedCollab && !loadingCollabs && (
            <div className="wm-state">Select a collaboration to view your conversation.</div>
          )}

          {selectedCollab && (
            <>
              <div className="wm-thread">
                {loadingMessages && <div className="wm-state"><Loader2 size={18} className="wm-spin" /></div>}
                {!loadingMessages && error && <div className="wm-state">{error}</div>}
                {!loadingMessages && !error && messages.length === 0 && (
                  <div className="wm-state">No messages yet — say hello!</div>
                )}
                {!loadingMessages && !error && messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`wm-bubble-row ${mine ? 'wm-bubble-row--mine' : ''}`}>
                      <div>
                        <div className={`wm-bubble ${mine ? 'wm-bubble--mine' : 'wm-bubble--theirs'}`}>{m.body}</div>
                        <div className="wm-bubble-time" style={{ textAlign: mine ? 'right' : 'left' }}>
                          {new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="wm-composer">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button disabled={sending || !draft.trim()} onClick={handleSend}>
                  {sending ? <Loader2 size={16} className="wm-spin" /> : <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default WorkspaceMessages;

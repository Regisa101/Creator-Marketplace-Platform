import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, Send } from 'lucide-react';
import {
  acceptListedPrice,
  acceptPriceOffer,
  allowFurtherChat,
  declinePriceOffer,
  getConversation,
  getConversations,
  makePriceOffer,
  notSelectNegotiatedCreator,
  openConversationForApplication,
  selectNegotiatedCreator,
  sendChatMessage,
  type ChatMessage,
  type Conversation,
} from '../api/client';
import './MessagesPanel.css';

type Props = {
  /** compact = single-pane popup (landing navbar); otherwise two-pane inbox. */
  compact?: boolean;
  initialConversationId?: number | null;
  initialApplicationId?: number | null;
  onNavigate?: () => void;
};

const money = (n: number | null | undefined) =>
  n == null ? '' : `NPR ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const errorText = (e: any, fallback = 'Something went wrong.') =>
  e?.response?.data?.detail && typeof e.response.data.detail === 'string' ? e.response.data.detail : fallback;

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString();
}

function Avatar({ name, src, size = 44 }: { name: string; src?: string | null; size?: number }) {
  return src ? (
    <img className="dm-avatar" src={src} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="dm-avatar dm-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export function MessagesPanel({ compact = false, initialConversationId = null, initialApplicationId = null, onNavigate }: Props) {
  const [list, setList] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(initialConversationId);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async () => {
    try {
      setList(await getConversations());
    } catch {
      /* keep the previous list */
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Open (or create) the conversation for ?application=ID.
  useEffect(() => {
    if (!initialApplicationId) return;
    openConversationForApplication(initialApplicationId)
      .then((c) => setActiveId(c.id))
      .catch((e) => setError(errorText(e, 'Could not open this conversation.')));
  }, [initialApplicationId]);

  useEffect(() => {
    void refreshList();
    const t = window.setInterval(refreshList, 10000);
    return () => window.clearInterval(t);
  }, [refreshList]);

  const loadThread = useCallback(async (id: number, reset: boolean) => {
    try {
      const data = await getConversation(id, reset ? 0 : lastId.current);
      setActive(data.conversation);
      setMessages((prev) => {
        const merged = reset ? data.messages : [...prev, ...data.messages.filter((m) => !prev.some((p) => p.id === m.id))];
        lastId.current = merged.length ? merged[merged.length - 1].id : 0;
        return merged;
      });
    } catch (e) {
      setError(errorText(e, 'Could not load this conversation.'));
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      return;
    }
    lastId.current = 0;
    setMessages([]);
    setError('');
    void loadThread(activeId, true);
    const t = window.setInterval(() => void loadThread(activeId, false), 4000);
    return () => window.clearInterval(t);
  }, [activeId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const apply = (c: Conversation) => {
    setActive(c);
    void refreshList();
    void loadThread(c.id, false);
  };

  const run = async (fn: () => Promise<Conversation | { conversation: Conversation }>): Promise<boolean> => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      apply('conversation' in res ? res.conversation : res);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !active || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await sendChatMessage(active.id, body);
      setDraft('');
      setMessages((prev) => [...prev, res.message]);
      lastId.current = res.message.id;
      setActive(res.conversation);
      void refreshList();
    } catch (e) {
      setError(errorText(e, 'Message not sent.'));
      void loadThread(active.id, false);
    } finally {
      setBusy(false);
    }
  };

  const isBrand = active?.my_role === 'business';
  const showThread = activeId !== null;

  const renderBanner = () => {
    if (!active) return null;
    if (active.is_closed) {
      return (
        <div className="dm-banner dm-banner-closed">
          <Lock size={14} />
          {active.closed_reason === 'not_selected' || active.closed_reason === 'rejected'
            ? 'This application was not selected. The conversation is closed, but the history is kept.'
            : active.closed_reason === 'withdrawn'
              ? 'This application was withdrawn. The conversation is closed.'
              : 'This conversation is closed.'}
        </div>
      );
    }
    if (active.awaiting_selection) {
      return isBrand ? (
        <div className="dm-banner dm-banner-action">
          <div>
            <strong>Price agreed: {money(active.agreed_total)}</strong>
            <span>
              Total creator compensation. CreatorHub's separate {Math.round(active.platform_fee_rate * 100)}% service fee
              ({money(active.platform_fee)}) is paid by you when you hire. Choosing is up to you.
            </span>
          </div>
          <div className="dm-actions">
            <button className="dm-btn dm-btn-primary" disabled={busy} onClick={() => run(() => selectNegotiatedCreator(active.id))}>
              Select Creator
            </button>
            <button
              className="dm-btn dm-btn-ghost"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Do not select this creator? The conversation will close (history is kept).'))
                  void run(() => notSelectNegotiatedCreator(active.id));
              }}
            >
              Do Not Select
            </button>
          </div>
        </div>
      ) : (
        <div className="dm-banner">
          Price agreed ({money(active.agreed_total)}). Waiting for the brand to decide whether to select you.
        </div>
      );
    }
    if (active.brand_decision === 'selected') {
      return <div className="dm-banner dm-banner-ok">Selected. Continue the collaboration here.</div>;
    }
    if (active.price_type === 'fixed' && !active.chat_permission_granted && active.creator_messages_remaining !== null) {
      if (isBrand) {
        return (
          <div className="dm-banner dm-banner-action">
            <span>
              Fixed price. The creator has sent {active.creator_messages_used} of {active.creator_messages_limit} initial messages.
            </span>
            <button className="dm-btn dm-btn-primary" disabled={busy} onClick={() => run(() => allowFurtherChat(active.id))}>
              Allow Further Chat
            </button>
          </div>
        );
      }
      return (
        <div className="dm-banner">
          {active.creator_messages_remaining > 0
            ? `${active.creator_messages_remaining} of ${active.creator_messages_limit} messages remaining`
            : 'You have used your messages. You can chat again if the brand allows further chat.'}
        </div>
      );
    }
    return null;
  };

  const renderOfferBar = () => {
    if (!active || active.price_type !== 'negotiable' || active.is_closed || active.negotiation_status !== 'open') return null;
    const offer = active.pending_offer;
    return (
      <div className="dm-offerbar">
        {offer && (
          <div className="dm-offer-pending">
            <span>
              {offer.proposer_id === active.counterpart.id ? 'They offered' : 'You offered'} <strong>{money(offer.amount)}</strong>
            </span>
            {offer.proposer_id === active.counterpart.id && (
              <span className="dm-actions">
                <button className="dm-btn dm-btn-primary" disabled={busy} onClick={() => run(() => acceptPriceOffer(active.id, offer.id))}>
                  Accept
                </button>
                <button className="dm-btn dm-btn-ghost" disabled={busy} onClick={() => run(() => declinePriceOffer(active.id, offer.id))}>
                  Decline
                </button>
              </span>
            )}
          </div>
        )}
        {active.my_role === 'creator' && active.listed_budget != null && (
          <button className="dm-btn dm-btn-ghost" disabled={busy} onClick={() => run(() => acceptListedPrice(active.id))}>
            Accept the brand's listed price ({money(active.listed_budget)})
          </button>
        )}
        <form
          className="dm-offer-form"
          onSubmit={(e) => {
            e.preventDefault();
            const amount = Number(offerAmount);
            if (!amount || amount <= 0) return setError('Enter a valid amount.');
            void run(() => makePriceOffer(active.id, amount)).then((ok) => ok && setOfferAmount(''));
          }}
        >
          <input
            type="number"
            min="1"
            inputMode="decimal"
            placeholder={offer ? 'Counter offer (NPR)' : 'Make a price offer (NPR)'}
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
          />
          <button className="dm-btn dm-btn-ghost" type="submit" disabled={busy}>
            {offer ? 'Counter' : 'Offer'}
          </button>
        </form>
      </div>
    );
  };

  const renderMessage = (m: ChatMessage) => {
    if (m.kind === 'system') return <div key={m.id} className="dm-system">{m.body}</div>;
    if (m.kind === 'offer')
      return (
        <div key={m.id} className={`dm-offer-card ${m.mine ? 'mine' : ''}`}>
          <small>Price offer</small>
          <strong>{m.body.replace('Offered ', '')}</strong>
        </div>
      );
    return (
      <div key={m.id} className={`dm-row ${m.mine ? 'mine' : 'theirs'}`}>
        <div className="dm-bubble">{m.body}</div>
      </div>
    );
  };

  return (
    <div className={`dm-shell ${compact ? 'dm-compact' : ''} ${showThread ? 'dm-thread-open' : ''}`}>
      {/* ---------- conversation list ---------- */}
      <aside className="dm-list">
        <header className="dm-list-head">Messages</header>
        {loadingList && <p className="dm-empty">Loading...</p>}
        {!loadingList && list.length === 0 && (
          <p className="dm-empty">
            No conversations yet. Open an application and choose Message to start one.
          </p>
        )}
        {list.map((c) => (
          <button key={c.id} className={`dm-item ${c.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(c.id)}>
            <Avatar name={c.counterpart.name} src={c.counterpart.avatar} />
            <span className="dm-item-text">
              <strong className={c.unread_count ? 'unread' : ''}>{c.counterpart.name}</strong>
              <small>
                {c.campaign_title} · {c.last_message ? c.last_message.body : 'No messages yet'}
              </small>
            </span>
            <span className="dm-item-meta">
              <small>{timeAgo(c.updated_at)}</small>
              {c.unread_count > 0 && <i className="dm-dot" />}
            </span>
          </button>
        ))}
      </aside>

      {/* ---------- thread ---------- */}
      <section className="dm-thread">
        {!active ? (
          <div className="dm-placeholder">
            <div className="dm-placeholder-ring"><Send size={30} /></div>
            <h3>Your messages</h3>
            <p>Select a conversation to read and reply.</p>
            {error && <p className="dm-error">{error}</p>}
          </div>
        ) : (
          <>
            <header className="dm-thread-head">
              <button className="dm-back" onClick={() => setActiveId(null)} aria-label="Back to conversations">
                <ArrowLeft size={20} />
              </button>
              <Avatar name={active.counterpart.name} src={active.counterpart.avatar} size={36} />
              <div>
                <strong>{active.counterpart.name}</strong>
                <small>
                  {active.campaign_title} · {active.price_type === 'negotiable' ? 'Negotiable' : 'Fixed price'}
                </small>
              </div>
            </header>

            {renderBanner()}

            <div className="dm-messages">
              {messages.length === 0 && <p className="dm-empty">Say hello to start the conversation.</p>}
              {messages.map(renderMessage)}
              <div ref={endRef} />
            </div>

            {error && <p className="dm-error">{error}</p>}
            {renderOfferBar()}

            <form
              className="dm-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={draft}
                maxLength={2000}
                disabled={!active.can_send || busy}
                placeholder={
                  active.can_send
                    ? 'Message...'
                    : active.is_closed
                      ? 'This conversation is closed'
                      : 'Messaging is paused until the brand allows further chat'
                }
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" disabled={!active.can_send || busy || !draft.trim()}>
                Send
              </button>
            </form>
            {onNavigate && (
              <button className="dm-link" onClick={onNavigate}>
                Open full inbox
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
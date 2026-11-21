import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Lock, Search, Send } from 'lucide-react';
import {
  acceptListedPrice,
  acceptPriceOffer,
  allowFurtherChat,
  declinePriceOffer,
  getConversation,
  getConversations,
  makePriceOffer,
  respondToRange,
  sendQuickReply,
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
  /** When set, the page header owns the search box: the panel filters by this text and hides its own box. */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  /** Show the "Messages" title above the list (hide it when the page header already says so). */
  showTitle?: boolean;
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

type Tab = 'all' | 'unread';
type Pill = { label: string; tone: 'warn' | 'info' | 'ok' | 'mute' };

/** The other side has put a price on the table and is waiting for an answer. */
const offerWaitingForMe = (c: Conversation) =>
  !!c.pending_offer && c.counterpart.id != null && c.pending_offer.proposer_id === c.counterpart.id;

/** Something here is waiting on ME (not just unread). */
const needsMyAction = (c: Conversation) => {
  if (c.is_closed) return false;
  if (c.my_role === 'business') return c.awaiting_selection || offerWaitingForMe(c);
  return !!c.range_prompt_open || offerWaitingForMe(c);
};

/** One short status label per conversation, so a long list can be scanned at a glance. */
const statusOf = (c: Conversation): Pill | null => {
  if (c.is_closed) return { label: 'Closed', tone: 'mute' };
  const brand = c.my_role === 'business';
  if (brand && c.awaiting_selection) return { label: 'Choose creator', tone: 'warn' };
  if (!brand && c.range_prompt_open) return { label: 'Reply needed', tone: 'warn' };
  if (offerWaitingForMe(c)) return { label: brand ? 'Offer to review' : 'Counter offer', tone: 'warn' };
  if (!brand && c.awaiting_selection) return { label: 'Waiting for brand', tone: 'info' };
  if (c.brand_decision === 'selected') return { label: 'Selected', tone: 'ok' };
  if (c.negotiation_status === 'open' && c.negotiation_started) return { label: 'Negotiating', tone: 'info' };
  return null;
};

const lastActivity = (c: Conversation) =>
  new Date(c.last_message?.created_at || c.updated_at || 0).getTime();

function Avatar({ name, src, size = 44 }: { name: string; src?: string | null; size?: number }) {
  return src ? (
    <img className="dm-avatar" src={src} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="dm-avatar dm-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  );
}

export function MessagesPanel({
  compact = false,
  initialConversationId = null,
  initialApplicationId = null,
  onNavigate,
  searchQuery,
  onSearchChange,
  showTitle = true,
}: Props) {
  const [list, setList] = useState<Conversation[]>([]);
  // List filters: search text, one campaign, and a quick tab.
  const [innerQuery, setInnerQuery] = useState('');
  const headerSearch = searchQuery !== undefined;
  const query = headerSearch ? searchQuery : innerQuery;
  const setQuery = (value: string) => (headerSearch ? onSearchChange?.(value) : setInnerQuery(value));
  const [tab, setTab] = useState<Tab>('all');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<number | null>(initialConversationId);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [rangeAmount, setRangeAmount] = useState('');
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
            <strong>Price agreed: {agreedBreakdown()}</strong>
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
          Price agreed ({agreedBreakdown()}). Waiting for the brand to decide whether to select you.
        </div>
      );
    }
    if (active.brand_decision === 'selected') {
      return <div className="dm-banner dm-banner-ok">Selected. Continue the collaboration here.</div>;
    }
    if (active.free_chat === false) {
      if (isBrand && active.price_type === 'fixed') {
        return (
          <div className="dm-banner dm-banner-action">
            <span>
              Guided chat: until you select this creator, you both use quick replies. You can open free chat early if you wish.
            </span>
            <button className="dm-btn dm-btn-primary" disabled={busy} onClick={() => run(() => allowFurtherChat(active.id))}>
              Allow Further Chat
            </button>
          </div>
        );
      }
      return (
        <div className="dm-banner">
          {isBrand
            ? 'Guided chat: you and the creator use quick replies until the deal is sealed.'
            : 'Choose a quick reply below. Free chat opens once the brand selects you.'}
        </div>
      );
    }
    return null;
  };

  const renderQuickReplies = () => {
    if (!active || active.is_closed || active.free_chat !== false) return null;
    const options = active.quick_replies ?? [];
    if (!options.length) {
      // Creator has used every option and is waiting on the brand / on the price box.
      const waiting =
        !isBrand && !active.range_prompt_open && !(active.price_type === 'negotiable' && active.negotiation_started);
      return waiting ? <p className="dm-hint">Waiting for the brand to reply.</p> : null;
    }
    return (
      <div className="dm-quick">
        {options.map((q) => (
          <button
            key={q.key}
            type="button"
            className="dm-chip"
            disabled={busy}
            onClick={() => void run(() => sendQuickReply(active.id, q.key))}
          >
            {q.label}
          </button>
        ))}
      </div>
    );
  };

  const renderRangeBar = () => {
    if (!active || !active.range_prompt_open || active.my_role !== 'creator') return null;
    const lo = active.listed_budget_min ?? 0;
    const hi = active.listed_budget_max ?? 0;
    return (
      <div className="dm-offerbar dm-rangebar">
        <form
          className="dm-offer-form"
          onSubmit={(e) => {
            e.preventDefault();
            const amount = Number(rangeAmount);
            if (!amount || amount < lo || amount > hi) {
              return setError(`Enter an amount between ${money(lo)} and ${money(hi)}.`);
            }
            void run(() => respondToRange(active.id, true, amount)).then((ok) => ok && setRangeAmount(''));
          }}
        >
          <input
            type="number"
            min={lo}
            max={hi}
            inputMode="decimal"
            placeholder={`Your price (${money(lo)} – ${money(hi)})`}
            value={rangeAmount}
            onChange={(e) => setRangeAmount(e.target.value)}
          />
          <div className="dm-range-actions">
            <button className="dm-btn dm-btn-primary" type="submit" disabled={busy}>
              Yes, continue
            </button>
            <button
              className="dm-btn dm-btn-ghost"
              type="button"
              disabled={busy}
              onClick={() => void run(() => respondToRange(active.id, false))}
            >
              No thanks
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderOfferBar = () => {
    if (!active || active.price_type !== 'negotiable' || active.is_closed || active.negotiation_status !== 'open' || active.range_prompt_open) return null;
    // Typed prices open only after "Negotiate price" / "Start negotiation" was chosen.
    if (!active.negotiation_started) return null;
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

  // "NPR 21,500 per month × 3 months = NPR 64,500" when the agreed rate is monthly, else just the total.
  const agreedBreakdown = () => {
    if (!active || active.agreed_total == null) return '';
    const rate = active.agreed_amount;
    const total = active.agreed_total;
    if (rate != null && rate > 0 && Math.abs(total - rate) > 0.01) {
      const months = Math.round(total / rate);
      if (months > 1) return `${money(rate)} per month × ${months} months = ${money(total)}`;
    }
    return money(total);
  };

  // Every line (hi, a typed price, an automatic reply) is an ordinary chat bubble.
  // "Offered NPR 34,000.00" is shown the way a person would say it.
  const offerText = (body: string) => `My offer: ${body.replace(/^Offered\s+/, '').replace(/\.00$/, '')}`;

  const renderMessage = (m: ChatMessage) => {
    if (m.kind === 'system') return <div key={m.id} className="dm-system">{m.body}</div>;
    // Automatic lines are stored as sent by the brand, so the server already puts them
    // on the brand's side for both parties (right for the brand, left for the creator).
    const mine = m.mine;
    const text = m.kind === 'offer' ? offerText(m.body) : m.body;
    return (
      <div key={m.id} className={`dm-row ${mine ? 'mine' : 'theirs'}`}>
        <div className="dm-bubble">{text}</div>
      </div>
    );
  };

  // ---------- list: campaigns, filters, sorting ----------
  const listRole = list[0]?.my_role;
  // Two different campaigns can share a title (copies). When that happens, the campaign id is shown
  // as well so they can never be mistaken for each other.
  const ambiguousTitles = useMemo(() => {
    const ids = new Map<string, Set<number>>();
    list.forEach((c) => ids.set(c.campaign_title, (ids.get(c.campaign_title) ?? new Set()).add(c.campaign_id)));
    return new Set([...ids].filter(([, v]) => v.size > 1).map(([k]) => k));
  }, [list]);
  const campaignSub = (c: Conversation) =>
    `${c.price_type === 'fixed' ? 'Fixed price' : 'Negotiable'}${ambiguousTitles.has(c.campaign_title) ? ` · #${c.campaign_id}` : ''}`;

  // Search narrows the list; tab counts are taken from that narrowed set.
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (!q) return true;
      return [c.counterpart.name, c.campaign_title, c.last_message?.body ?? '']
        .some((t) => t.toLowerCase().includes(q));
    });
  }, [list, query]);
  const unreadCount = scoped.filter((c) => c.unread_count > 0).length;

  // Needs-action first, then unread, then most recent.
  const visible = useMemo(() => {
    const rows = scoped.filter((c) => (tab === 'unread' ? c.unread_count > 0 : true));
    return rows.sort(
      (a, b) =>
        Number(needsMyAction(b)) - Number(needsMyAction(a)) ||
        Number(b.unread_count > 0) - Number(a.unread_count > 0) ||
        lastActivity(b) - lastActivity(a),
    );
  }, [scoped, tab]);
  const filtering = query.trim() !== '' || tab !== 'all';
  const clearFilters = () => {
    setQuery('');
    setTab('all');
  };

  // A brand sees its inbox grouped by campaign (one header per campaign, creators underneath), so the same
  // creator in two campaigns can never be mistaken for one chat. A creator has one chat per brand/campaign,
  // so their list stays flat and each row carries the full campaign title.
  const grouped = listRole === 'business';
  const groups = useMemo(() => {
    const map = new Map<number, { id: number; title: string; sample: Conversation; items: Conversation[] }>();
    visible.forEach((c) => {
      const g = map.get(c.campaign_id) ?? { id: c.campaign_id, title: c.campaign_title, sample: c, items: [] };
      g.items.push(c);
      map.set(c.campaign_id, g);
    });
    return [...map.values()]
      .map((g) => ({
        ...g,
        action: g.items.filter(needsMyAction).length,
        unread: g.items.filter((c) => c.unread_count > 0).length,
        latest: Math.max(...g.items.map(lastActivity)),
      }))
      .sort(
        (a, b) =>
          Number(b.action > 0) - Number(a.action > 0) ||
          Number(b.unread > 0) - Number(a.unread > 0) ||
          b.latest - a.latest,
      );
  }, [visible]);

  const toggleGroup = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderRow = (c: Conversation, showCampaign: boolean) => {
    const pill = statusOf(c);
    return (
      <button
        key={c.id}
        className={`dm-item ${c.id === activeId ? 'active' : ''} ${needsMyAction(c) ? 'action' : ''}`}
        onClick={() => setActiveId(c.id)}
      >
        <Avatar name={c.counterpart.name} src={c.counterpart.avatar} />
        <span className="dm-item-text">
          <span className="dm-item-top">
            <strong className={c.unread_count ? 'unread' : ''}>{c.counterpart.name}</strong>
            {pill && <em className={`dm-pill ${pill.tone}`}>{pill.label}</em>}
            <small className="dm-time">{timeAgo(c.last_message?.created_at || c.updated_at)}</small>
          </span>
          {showCampaign && (
            <>
              <span className="dm-item-campaign-name" title={c.campaign_title}>{c.campaign_title}</span>
              <span className="dm-sub">{campaignSub(c)}</span>
            </>
          )}
          <span className="dm-item-preview">
            <small>{c.last_message ? c.last_message.body : 'No messages yet'}</small>
            {c.unread_count > 0 && <b className="dm-badge">{c.unread_count > 9 ? '9+' : c.unread_count}</b>}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className={`dm-shell ${compact ? 'dm-compact' : ''} ${showThread ? 'dm-thread-open' : ''}`}>
      {/* ---------- conversation list ---------- */}
      <aside className="dm-list">
        <header className="dm-list-head">
          {showTitle && <span className="dm-list-title">Messages</span>}
          {list.length > 0 && (
            <div className="dm-tools">
              {!headerSearch && (
              <label className="dm-search">
                <Search size={15} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={listRole === 'business' ? 'Search creator or campaign' : 'Search brand or campaign'}
                />
              </label>
              )}
              <div className="dm-tabs" role="tablist">
                {([
                  ['all', `All (${scoped.length})`],
                  ['unread', `Unread (${unreadCount})`],
                ] as [Tab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={`dm-tab ${tab === key ? 'on' : ''}`}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        <div className="dm-items">
          {loadingList && <p className="dm-empty">Loading...</p>}
          {!loadingList && list.length === 0 && (
            <p className="dm-empty">
              No conversations yet. Open an application and choose Message to start one.
            </p>
          )}
          {!loadingList && list.length > 0 && visible.length === 0 && (
            <p className="dm-empty">
              Nothing matches these filters.
              {filtering && (
                <>
                  {' '}
                  <button type="button" className="dm-link" onClick={clearFilters}>Clear filters</button>
                </>
              )}
            </p>
          )}
          {!grouped && visible.map((c) => renderRow(c, true))}
          {grouped &&
            groups.map((g) => {
              // While searching or filtering, every match stays visible, and so does the group you're reading.
              const open = filtering || !collapsed.has(g.id) || g.items.some((c) => c.id === activeId);
              return (
                <section key={g.id} className="dm-group">
                  <button
                    type="button"
                    className="dm-group-head"
                    aria-expanded={open}
                    onClick={() => toggleGroup(g.id)}
                    title={g.title}
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="dm-group-text">
                      <span className="dm-group-title">{g.title}</span>
                      <span className="dm-sub">{campaignSub(g.sample)}</span>
                    </span>
                    <span className="dm-group-meta">
                      {g.action > 0 && <em className="dm-pill warn">{g.action} to act on</em>}
                      {g.unread > 0 && <b className="dm-badge">{g.unread}</b>}
                      <small>{g.items.length}</small>
                    </span>
                  </button>
                  {open && g.items.map((c) => renderRow(c, false))}
                </section>
              );
            })}
        </div>

        {compact && onNavigate && (
          <footer className="dm-list-foot">
            <button type="button" className="dm-open-inbox" onClick={onNavigate}>
              Open full inbox
              <ChevronRight size={15} />
            </button>
          </footer>
        )}
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
              {messages.length === 0 && (
                <p className="dm-empty">
                  {isBrand ? 'No messages yet.' : 'Tap "Say hi" below to start the conversation.'}
                </p>
              )}
              {messages.map(renderMessage)}
              <div ref={endRef} />
            </div>

            {error && <p className="dm-error">{error}</p>}
            {renderRangeBar()}
            {renderOfferBar()}
            {renderQuickReplies()}

            <form
              hidden={!active.is_closed && active.free_chat === false}
              className="dm-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                value={draft}
                maxLength={2000}
                disabled={!active.can_send || busy || !!active.range_prompt_open}
                placeholder={
                  active.range_prompt_open
                    ? 'Please answer the question above'
                    : active.can_send
                    ? 'Message...'
                    : active.is_closed
                      ? 'This conversation is closed'
                      : 'Messaging is paused until the brand allows further chat'
                }
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" disabled={!active.can_send || busy || !draft.trim() || !!active.range_prompt_open}>
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MapPin, PackageCheck, Send, Truck } from 'lucide-react';
import { confirmGiftReceived, getCollabs, getGiftFulfillment, getMessages, sendMessage, updateGiftFulfillment, type Collab, type GiftFulfillment, type WorkspaceMessage } from '../../api/client';
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
  const [fulfillment, setFulfillment] = useState<GiftFulfillment | null>(null);
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftAction, setGiftAction] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
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

  const isGifted = selectedCollab?.campaign_type === 'gifted';

  useEffect(() => {
    setFulfillment(null);
    if (selectedCollab && isGifted) {
      setGiftLoading(true);
      getGiftFulfillment(selectedCollab.id)
        .then((data) => {
          setFulfillment(data);
          setShippingAddress(data.shipping_address || '');
          setRecipientName(data.recipient_name || '');
          setPhone(data.phone || '');
          setPickupLocation(data.pickup_location || '');
          setCourier(data.courier || '');
          setTrackingNumber(data.tracking_number || '');
        })
        .catch((err) => console.error('Could not load gift fulfillment:', err))
        .finally(() => setGiftLoading(false));
    }
  }, [selectedCollab?.id, isGifted]);

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

  const chooseGiftMethod = async (method: 'pickup' | 'shipping') => {
    if (!selectedId) return;
    if (method === 'shipping' && (!shippingAddress.trim() || !recipientName.trim() || !phone.trim())) {
      setError('For shipping, enter the recipient name, phone, and full delivery address.');
      return;
    }
    setGiftAction(true);
    setError('');
    try {
      const data = await updateGiftFulfillment(Number(selectedId), {
        method,
        ...(method === 'shipping' ? {
          recipient_name: recipientName.trim(),
          shipping_address: shippingAddress.trim(),
          phone: phone.trim(),
        } : {}),
      });
      setFulfillment(data);
      const text = method === 'shipping'
        ? `I would like the gifted product shipped to me. Recipient: ${recipientName.trim()}. Address: ${shippingAddress.trim()}. Phone: ${phone.trim()}.`
        : 'I would like to pick up the gifted product in store.';
      const message = await sendMessage(Number(selectedId), text);
      setMessages((prev) => [...prev, message]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save the gift delivery choice.');
    } finally {
      setGiftAction(false);
    }
  };

  const updateGiftStatus = async (status: 'ready_for_pickup' | 'shipped') => {
    if (!selectedId || !fulfillment) return;
    if (status === 'ready_for_pickup' && !pickupLocation.trim()) {
      setError('Enter the store pickup location first.');
      return;
    }
    setGiftAction(true);
    setError('');
    try {
      const data = await updateGiftFulfillment(Number(selectedId), {
        status,
        ...(status === 'ready_for_pickup'
          ? { pickup_location: pickupLocation.trim() }
          : { courier: courier.trim() || undefined, tracking_number: trackingNumber.trim() || undefined }),
      });
      setFulfillment(data);
      const text = status === 'ready_for_pickup'
        ? `Your gifted product is ready for in-store pickup at ${pickupLocation.trim()}.`
        : `Your gifted product has been shipped${trackingNumber.trim() ? ` via ${courier.trim() || 'the courier'} (tracking: ${trackingNumber.trim()})` : '.'}`;
      const message = await sendMessage(Number(selectedId), text);
      setMessages((prev) => [...prev, message]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not update the gift delivery status.');
    } finally {
      setGiftAction(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!selectedId) return;
    setGiftAction(true);
    setError('');
    try {
      const data = await confirmGiftReceived(Number(selectedId));
      setFulfillment(data);
      const message = await sendMessage(Number(selectedId), 'I received the gifted product. Thank you!');
      setMessages((prev) => [...prev, message]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not confirm product receipt.');
    } finally {
      setGiftAction(false);
    }
  };

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

        .wm-gift-gate { padding: 16px 20px; border-top: 1px solid ${C.line}; background: #fffaf3; }
        .wm-gift-head { display: flex; gap: 10px; align-items: flex-start; color: ${C.navy}; }
        .wm-gift-head div { display: flex; flex-direction: column; gap: 3px; }
        .wm-gift-head span { color: ${C.inkSoft}; font-size: 11.5px; }
        .wm-gift-choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
        .wm-gift-choice { border: 1px solid ${C.line}; background: #fff; border-radius: 11px; padding: 12px; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; color: ${C.ink}; cursor: pointer; }
        .wm-gift-choice:hover { border-color: ${C.navy}; }
        .wm-gift-choice span { font-size: 10.5px; color: ${C.inkSoft}; }
        .wm-gift-choice input, .wm-gift-choice textarea { width: 100%; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 7px; padding: 8px; font: 12px/1.4 -apple-system, sans-serif; margin-top: 3px; }
        .wm-gift-submit { border: none; background: ${C.navy}; color: #fff; border-radius: 7px; padding: 7px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
        .wm-brand-gift-panel { padding: 12px 20px; border-top: 1px solid ${C.line}; background: #f8f9ff; display: flex; flex-direction: column; gap: 6px; }
        .wm-brand-gift-panel strong { color: ${C.navy}; font-size: 12.5px; }
        .wm-brand-gift-panel span { color: ${C.inkSoft}; font-size: 10.5px; }
        .wm-brand-gift-panel input { border: 1px solid ${C.line}; border-radius: 7px; padding: 8px 9px; font-size: 11.5px; }
        .wm-brand-gift-panel button { align-self: flex-start; border: none; background: ${C.navy}; color: #fff; border-radius: 7px; padding: 8px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
        .wm-received-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 20px; border-top: 1px solid ${C.line}; background: #f7fbf8; }
        .wm-received-bar div { display: flex; flex-direction: column; gap: 2px; }
        .wm-received-bar span { color: ${C.inkSoft}; font-size: 10.5px; }
        .wm-received-bar button { display: inline-flex; align-items: center; gap: 5px; border: none; background: #16834a; color: #fff; border-radius: 8px; padding: 8px 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
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

              {isGifted && !giftLoading && fulfillment && fulfillment.status === 'pending' && user?.role === 'creator' ? (
                <div className="wm-gift-gate">
                  <div className="wm-gift-head"><PackageCheck size={18} /><div><strong>Before you start</strong><span>This is a gifted campaign. Choose how you want to receive the product before regular chat opens.</span></div></div>
                  <div className="wm-gift-choice-row">
                    <button className="wm-gift-choice" disabled={giftAction} onClick={() => chooseGiftMethod('pickup')}><MapPin size={17} /><b>Pick up in store</b><span>I'll collect it from the brand.</span></button>
                    <div className="wm-gift-choice wm-gift-choice--shipping">
                      <Truck size={17} /><b>Ship to my home</b><span>Enter your delivery details.</span>
                      <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name" />
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                      <textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Full shipping address" rows={2} />
                      <button className="wm-gift-submit" disabled={giftAction} onClick={() => chooseGiftMethod('shipping')}>{giftAction ? 'Saving…' : 'Choose shipping'}</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {isGifted && user?.role === 'business' && fulfillment && fulfillment.status === 'preparing' && (
                    <div className="wm-brand-gift-panel">
                      <strong>Gift delivery</strong>
                      <span>Creator chose <b>{fulfillment.method === 'shipping' ? 'shipping' : 'store pickup'}</b>. Coordinate the hand-off here and keep the conversation in Messages.</span>
                      {fulfillment.method === 'pickup' ? (
                        <>
                          <input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="Store pickup location" />
                          <button disabled={giftAction} onClick={() => updateGiftStatus('ready_for_pickup')}>{giftAction ? 'Saving…' : 'Mark ready for pickup'}</button>
                        </>
                      ) : (
                        <>
                          <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier (optional)" />
                          <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking number (optional)" />
                          <button disabled={giftAction} onClick={() => updateGiftStatus('shipped')}>{giftAction ? 'Saving…' : 'Mark as shipped'}</button>
                        </>
                      )}
                    </div>
                  )}

                  {isGifted && user?.role === 'creator' && fulfillment && fulfillment.status !== 'received' && (fulfillment.status === 'ready_for_pickup' || fulfillment.status === 'shipped') && (
                    <div className="wm-received-bar">
                      <div><strong>Have you received the product?</strong><span>Confirm receipt here. Your deliverables will unlock after this step.</span></div>
                      <button disabled={giftAction} onClick={handleConfirmReceived}><CheckCircle2 size={14} /> {giftAction ? 'Confirming…' : 'I received it'}</button>
                    </div>
                  )}
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
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default WorkspaceMessages;

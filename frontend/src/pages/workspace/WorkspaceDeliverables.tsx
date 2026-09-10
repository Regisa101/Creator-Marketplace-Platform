import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, CreditCard, Loader2, Plus, RefreshCw, Upload, X } from 'lucide-react';
import {
  getCollabs,
  getDeliverables,
  createDeliverable,
  submitDeliverable,
  reviewDeliverable,
  type Collab,
  type WorkspaceDeliverable,
  initiatePayment,
} from '../../api/client';
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

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Awaiting submission', bg: '#fff4de', color: '#9a6b00' },
  submitted: { label: 'Submitted — in review', bg: '#EAF8FE', color: '#0369a1' },
  approved: { label: 'Approved', bg: '#e6f7ec', color: '#1a8a4a' },
  revision_requested: { label: 'Revision requested', bg: '#fdecec', color: '#d64545' },
};

export function WorkspaceDeliverables() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('collab');

  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [deliverables, setDeliverables] = useState<WorkspaceDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    getCollabs()
      .then(setCollabs)
      .catch((err) => console.error('Could not load collaborations:', err));
  }, []);

  const loadDeliverables = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDeliverables(selectedId ? Number(selectedId) : undefined);
      setDeliverables(data);
    } catch (err) {
      console.error('Could not load deliverables:', err);
      setError('Could not load deliverables.');
    } finally {
      setLoading(false);
    }
  };


  const selectedCollab = selectedId ? collabs.find((c) => c.id === Number(selectedId)) : undefined;
  const selectedDeliverables = selectedId
    ? deliverables.filter((d) => d.application_id === Number(selectedId))
    : [];
  const selectedApprovedCount = selectedDeliverables.filter((d) => d.status === 'approved').length;
  const selectedCount = selectedDeliverables.length;
  const selectedAllApproved = Boolean(selectedCollab && (selectedCount === 0 || selectedApprovedCount === selectedCount));

  const handlePaySelected = async () => {
    if (!selectedCollab) return;
    let amount = selectedCollab.rate ?? undefined;
    if (amount == null) {
      const input = window.prompt(`Set the amount to pay for "${selectedCollab.campaign_title || 'this collab'}" (NPR):`);
      if (!input) return;
      const parsed = Number(input);
      if (!Number.isFinite(parsed) || parsed <= 0) { alert('Enter a valid amount greater than 0.'); return; }
      amount = parsed;
    }
    setPayingId(selectedCollab.id);
    setPaymentError('');
    try {
      const result = await initiatePayment(selectedCollab.id, amount);
      window.location.href = result.payment_url;
    } catch (err: any) {
      setPaymentError(err?.response?.data?.detail || 'Could not start the payment.');
    } finally {
      setPayingId(null);
    }
  };

  useEffect(() => {
    loadDeliverables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <AppLayout title="Deliverables" subtitle="Track content requests, submissions, and approvals." showSearch={false} showNotifications={false}>
      <style>{`
        .wd-content { padding: 28px 24px 40px; max-width: 900px; margin: 0 auto; }
        .wd-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .wd-tab { font-size: 12.5px; font-weight: 600; padding: 8px 16px; border-radius: 999px; border: 1px solid ${C.line}; background: ${C.card}; color: ${C.inkSoft}; cursor: pointer; }
        .wd-tab--active { background: ${primary}; border-color: ${primary}; color: #fff; }
        .wd-pay { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; padding: 9px 16px; border-radius: 8px; border: none; background: ${C.navy}; color: #fff; cursor: pointer; }
        .wd-pay:disabled { opacity: 0.55; cursor: not-allowed; }
        .wd-add { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; padding: 9px 16px; border-radius: 8px; border: none; background: ${primary}; color: #fff; cursor: pointer; }
        .wd-add:disabled { opacity: 0.5; cursor: not-allowed; }

        .wd-card { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 14px; padding: 18px 20px; margin-bottom: 12px; }
        .wd-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; }
        .wd-title { font-size: 14px; font-weight: 700; color: ${C.ink}; }
        .wd-sub { font-size: 12px; color: ${C.inkSoft}; margin-top: 2px; }
        .wd-status { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; flex-shrink: 0; }
        .wd-desc { font-size: 13px; color: #3d3d42; line-height: 1.55; margin: 10px 0; }
        .wd-meta { font-size: 12px; color: ${C.inkSoft}; margin-bottom: 8px; }
        .wd-feedback { font-size: 12.5px; color: #d64545; background: #fdecec; padding: 10px 12px; border-radius: 8px; margin: 10px 0; }
        .wd-file-link { font-size: 12.5px; color: ${C.navy}; word-break: break-all; }

        .wd-inline-form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
        .wd-inline-form input, .wd-inline-form textarea { border: 1px solid ${C.line}; border-radius: 8px; padding: 9px 12px; font: 13px/1.5 -apple-system, sans-serif; }
        .wd-inline-actions { display: flex; gap: 8px; }
        .wd-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; padding: 9px 16px; border-radius: 8px; cursor: pointer; border: none; }
        .wd-btn--primary { background: ${primary}; color: #fff; }
        .wd-btn--approve { background: #1a8a4a; color: #fff; }
        .wd-btn--revise { background: #fdecec; color: #d64545; }
        .wd-btn--ghost { background: ${C.surface}; color: ${C.ink}; }
        .wd-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .wd-payment-note { margin-bottom: 14px; padding: 10px 12px; border-radius: 9px; background: #EAF8F0; color: #16834A; font-size: 12px; font-weight: 650; }
        .wd-payment-error { margin-bottom: 14px; padding: 10px 12px; border-radius: 9px; background: #fdecec; color: #d64545; font-size: 12px; }

        .wd-state { text-align: center; padding: 40px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .wd-spin { animation: wd-spin 0.8s linear infinite; }
        @keyframes wd-spin { to { transform: rotate(360deg); } }

        .wd-modal-backdrop { position: fixed; inset: 0; background: rgba(26,22,37,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .wd-modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 420px; }
        .wd-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .wd-modal-head h3 { font-size: 16px; font-weight: 700; color: ${C.ink}; margin: 0; }
        .wd-modal-close { border: none; background: transparent; cursor: pointer; color: ${C.inkSoft}; }
        .wd-modal-label { font-size: 12.5px; font-weight: 600; color: ${C.ink}; margin: 12px 0 6px; display: block; }
        .wd-modal select, .wd-modal input, .wd-modal textarea { width: 100%; border: 1px solid ${C.line}; border-radius: 8px; padding: 10px 12px; font: 13px/1.5 -apple-system, sans-serif; color: ${C.ink}; resize: vertical; }
        .wd-modal-submit { width: 100%; margin-top: 16px; background: ${primary}; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
        .wd-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .wd-modal-error { font-size: 12px; color: #d64545; margin-top: 8px; }
      `}</style>

      <div className="wd-content">
        <div className="wd-tabs">
          <button className={`wd-tab ${!selectedId ? 'wd-tab--active' : ''}`} onClick={() => setSearchParams({})}>
            All
          </button>
          {collabs.map((c) => (
            <button
              key={c.id}
              className={`wd-tab ${selectedId === String(c.id) ? 'wd-tab--active' : ''}`}
              onClick={() => setSearchParams({ collab: String(c.id) })}
            >
              {c.campaign_title || `Campaign #${c.campaign_id}`}
            </button>
          ))}
          {isBusiness && selectedCollab && selectedCollab.campaign_type !== 'gifted' && selectedCollab.payment_status !== 'completed' && selectedAllApproved && (
            <button className="wd-pay" disabled={payingId === selectedCollab.id} onClick={handlePaySelected}>
              <CreditCard size={14} /> {payingId === selectedCollab.id ? 'Opening payment…' : 'Pay creator'}
            </button>
          )}
          {isBusiness && (
            <button className="wd-add" disabled={collabs.length === 0} onClick={() => setShowForm(true)}>
              <Plus size={14} /> Request deliverable
            </button>
          )}
        </div>

        {paymentError && <div className="wd-payment-error">{paymentError}</div>}
        {isBusiness && selectedCollab && selectedCollab.campaign_type !== 'gifted' && selectedCollab.payment_status !== 'completed' && (
          <div className="wd-payment-note">
            {selectedAllApproved
              ? selectedDeliverables.length === 0
                ? 'No deliverables were requested. This collaboration is ready for payment.'
                : `All ${selectedDeliverables.length} deliverables are approved. This collaboration is ready for payment.`
              : `Payment unlocks after all ${selectedDeliverables.length} deliverable${selectedDeliverables.length === 1 ? '' : 's'} are approved.`}
          </div>
        )}

        {loading && <div className="wd-state"><Loader2 size={18} className="wd-spin" /></div>}
        {!loading && error && <div className="wd-state">{error}</div>}
        {!loading && !error && deliverables.length === 0 && (
          <div className="wd-state">
            {isBusiness ? 'No deliverables requested yet.' : 'Nothing has been requested from you yet.'}
          </div>
        )}

        {!loading && !error && deliverables.map((d) => (
          <DeliverableCard
            key={d.id}
            deliverable={d}
            isBusiness={isBusiness}
            busy={actingId === d.id}
            setBusy={setActingId}
            onUpdate={(updated) => setDeliverables((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
          />
        ))}
      </div>

      {showForm && (
        <RequestModal
          collabs={collabs}
          defaultCollabId={selectedId || undefined}
          onClose={() => setShowForm(false)}
          onCreated={(d) => {
            setDeliverables((prev) => [d, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </AppLayout>
  );
}

function DeliverableCard({
  deliverable,
  isBusiness,
  busy,
  setBusy,
  onUpdate,
}: {
  deliverable: WorkspaceDeliverable;
  isBusiness: boolean;
  busy: boolean;
  setBusy: (id: number | null) => void;
  onUpdate: (d: WorkspaceDeliverable) => void;
}) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviseOpen, setReviseOpen] = useState(false);
  const meta = STATUS_META[deliverable.status] || STATUS_META.pending;

  const handleSubmit = async () => {
    if (!fileUrl.trim()) return;
    setBusy(deliverable.id);
    try {
      const updated = await submitDeliverable(deliverable.id, { file_url: fileUrl.trim(), submission_note: note.trim() || undefined });
      onUpdate(updated);
      setSubmitOpen(false);
      setFileUrl('');
      setNote('');
    } catch (err) {
      console.error('Could not submit deliverable:', err);
    } finally {
      setBusy(null);
    }
  };

  const handleReview = async (status: 'approved' | 'revision_requested') => {
    setBusy(deliverable.id);
    try {
      const updated = await reviewDeliverable(deliverable.id, { status, feedback: status === 'revision_requested' ? feedback.trim() || undefined : undefined });
      onUpdate(updated);
      setReviseOpen(false);
      setFeedback('');
    } catch (err) {
      console.error('Could not review deliverable:', err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="wd-card">
      <div className="wd-card-top">
        <div>
          <div className="wd-title">{deliverable.title}</div>
          <div className="wd-sub">{deliverable.campaign_title}</div>
        </div>
        <span className="wd-status" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
      </div>

      {deliverable.description && <div className="wd-desc">{deliverable.description}</div>}
      {deliverable.due_date && (
        <div className="wd-meta">Due {new Date(deliverable.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
      )}

      {deliverable.feedback && <div className="wd-feedback">Feedback: {deliverable.feedback}</div>}

      {deliverable.file_url && (
        <div className="wd-meta">
          Submitted: <a className="wd-file-link" href={deliverable.file_url} target="_blank" rel="noreferrer">{deliverable.file_url}</a>
          {deliverable.submission_note ? ` — ${deliverable.submission_note}` : ''}
        </div>
      )}

      {!isBusiness && (deliverable.status === 'pending' || deliverable.status === 'revision_requested') && (
        submitOpen ? (
          <div className="wd-inline-form">
            <input placeholder="Link to your content (drive, video, etc.)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
            <textarea rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="wd-inline-actions">
              <button className="wd-btn wd-btn--primary" disabled={busy || !fileUrl.trim()} onClick={handleSubmit}>
                {busy ? <Loader2 size={13} className="wd-spin" /> : <Upload size={13} />} Submit
              </button>
              <button className="wd-btn wd-btn--ghost" onClick={() => setSubmitOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="wd-inline-actions">
            <button className="wd-btn wd-btn--primary" onClick={() => setSubmitOpen(true)}>
              <Upload size={13} /> Submit content
            </button>
          </div>
        )
      )}

      {isBusiness && deliverable.status === 'submitted' && (
        reviseOpen ? (
          <div className="wd-inline-form">
            <textarea rows={2} placeholder="What needs to change?" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            <div className="wd-inline-actions">
              <button className="wd-btn wd-btn--revise" disabled={busy} onClick={() => handleReview('revision_requested')}>
                {busy ? <Loader2 size={13} className="wd-spin" /> : <RefreshCw size={13} />} Send request
              </button>
              <button className="wd-btn wd-btn--ghost" onClick={() => setReviseOpen(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="wd-inline-actions">
            <button className="wd-btn wd-btn--approve" disabled={busy} onClick={() => handleReview('approved')}>
              {busy ? <Loader2 size={13} className="wd-spin" /> : <Check size={13} />} Approve
            </button>
            <button className="wd-btn wd-btn--revise" onClick={() => setReviseOpen(true)}>
              <RefreshCw size={13} /> Request revision
            </button>
          </div>
        )
      )}
    </div>
  );
}

function RequestModal({
  collabs,
  defaultCollabId,
  onClose,
  onCreated,
}: {
  collabs: Collab[];
  defaultCollabId?: string;
  onClose: () => void;
  onCreated: (d: WorkspaceDeliverable) => void;
}) {
  const [collabId, setCollabId] = useState(defaultCollabId || String(collabs[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!collabId || !title.trim()) {
      setError('Please choose a collaboration and add a title.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const d = await createDeliverable({
        collab_id: Number(collabId),
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onCreated(d);
    } catch (err: any) {
      console.error('Could not create deliverable request:', err);
      setError(err?.response?.data?.detail || 'Could not create this request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wd-modal-backdrop" onClick={onClose}>
      <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wd-modal-head">
          <h3>Request a deliverable</h3>
          <button className="wd-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <label className="wd-modal-label" htmlFor="wd-collab">Collaboration</label>
        <select id="wd-collab" value={collabId} onChange={(e) => setCollabId(e.target.value)}>
          {collabs.map((c) => (
            <option key={c.id} value={c.id}>{c.campaign_title || `Campaign #${c.campaign_id}`}</option>
          ))}
        </select>

        <label className="wd-modal-label" htmlFor="wd-title">Title</label>
        <input id="wd-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Final Reel Cut" />

        <label className="wd-modal-label" htmlFor="wd-desc">Description (optional)</label>
        <textarea id="wd-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />

        <label className="wd-modal-label" htmlFor="wd-due">Due date (optional)</label>
        <input id="wd-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

        {error && <div className="wd-modal-error">{error}</div>}

        <button className="wd-modal-submit" disabled={submitting} onClick={handleSubmit}>
          {submitting ? <Loader2 size={15} className="wd-spin" /> : 'Send request'}
        </button>
      </div>
    </div>
  );
}

export default WorkspaceDeliverables;

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  confirmCollaboration,
  getCollabs,
  getDeliverables,
  releasePayment,
  reviewDeliverable,
  reviewAllDeliverables,
  submitDeliverable,
  uploadMedia,
  type Collab,
  type WorkspaceDeliverable,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/AppLayout';

// Shared palette. Role-specific accent (creator = indigo/violet, brand = navy)
// is resolved at render time and pushed into CSS as --cw-accent / --cw-accent-soft,
// so the stylesheet below never hardcodes one role's color.
const C = {
  bg: '#F5F6FC',
  card: '#FFFFFF',
  ink: '#171923',
  soft: '#6B7280',
  faint: '#9CA3AF',
  line: '#E8E9F3',
  good: '#16A34A',
  goodSoft: '#EAFBF1',
  warn: '#B45309',
  warnSoft: '#FFF4DE',
  bad: '#DC2626',
  badSoft: '#FDECEC',
  creator: '#7661A1',
  creatorSoft: '#EDEFF7',
  brand: '#7661A1',
  brandSoft: '#EDEFF7',
};

function initials(name?: string | null) {
  if (!name) return 'C';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function allApproved(c: Collab) {
  return c.total_deliverables > 0 && c.approved_deliverables === c.total_deliverables;
}

function nextState(c: Collab, isBusiness: boolean) {
  if (c.status === 'completed' || c.payment_status === 'released') {
    return {
      turn: 'COMPLETE',
      title: 'Collaboration complete',
      body: 'Everything is finished. The collaboration is ready for history.',
      action: null as null | 'confirm' | 'pay' | 'submit' | 'release',
    };
  }

  if (!c.creator_confirmed) {
    return isBusiness
      ? {
          turn: 'WAITING',
          title: 'Waiting for creator confirmation',
          body: 'The creator only needs to confirm once. Nothing else is required from you yet.',
          action: null,
        }
      : {
          turn: 'YOUR TURN',
          title: 'Confirm collaboration',
          body: 'Review the agreed campaign details and confirm once. Then the collaboration can start.',
          action: 'confirm' as const,
        };
  }

  if (isBusiness && !['funded', 'released'].includes(c.payment_status || '')) {
    return {
      turn: 'WAITING',
      title: 'Campaign funding required',
      body: 'This paid campaign must be funded before work can begin. Open the campaign to fund its budget.',
      action: null,
    };
  }

  if (!allApproved(c)) {
    if (isBusiness) {
      if (c.submitted_deliverables > 0) {
        return {
          turn: 'YOUR TURN',
          title: 'Review the work',
          body: 'Check the submitted deliverables. Approve everything together or request a revision on a specific item.',
          action: 'submit' as const,
        };
      }
      return {
        turn: 'WAITING',
        title: 'Waiting for the creator',
        body: 'The creator can work without needing to contact you at every step.',
        action: null,
      };
    }

    if (c.submitted_deliverables > c.approved_deliverables) {
      return {
        turn: 'WAITING',
        title: 'Waiting for brand review',
        body: 'Your work is submitted. You only need to act if the brand requests a revision.',
        action: null,
      };
    }

    return {
      turn: 'YOUR TURN',
      title: 'Submit your remaining deliverables',
      body: 'Upload your final content and submit it for review.',
      action: 'submit' as const,
    };
  }

  return isBusiness
    ? {
        turn: 'YOUR TURN',
        title: 'Release payment',
        body: 'All deliverables are approved. Release the secured payment to complete this collaboration.',
        action: 'release' as const,
      }
    : {
        turn: 'WAITING',
        title: 'Work approved',
        body: 'The brand approved all deliverables. Your secured payment will be released once the brand completes the release step.',
        action: null,
      };
}

export function WorkspaceActive() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const accent = isBusiness ? C.brand : C.creator;
  const accentSoft = isBusiness ? C.brandSoft : C.creatorSoft;
  const [params, setParams] = useSearchParams();
  const requestedId = Number(params.get('collab') || 0);

  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [deliverables, setDeliverables] = useState<WorkspaceDeliverable[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'deliverables'>('overview');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentModal, setPaymentModal] = useState<{ amount: number; campaign: string } | null>(null);
  const [seenCompletion, setSeenCompletion] = useState<number | null>(null);

  const selected = useMemo(() => {
    if (!collabs.length) return null;
    return collabs.find((c) => c.id === requestedId) || collabs[0];
  }, [collabs, requestedId]);

  useEffect(() => {
    let cancelled = false;

    const load = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const data = await getCollabs();
        if (cancelled) return;
        setCollabs(data);
        if (data.length && !data.some((c) => c.id === requestedId)) {
          setParams({ collab: String(data[0].id) }, { replace: true });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.detail || 'Could not load your collaborations.');
      } finally {
        if (initial && !cancelled) setLoading(false);
      }
    };

    load(true);
    const interval = window.setInterval(() => load(false), 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [requestedId, setParams]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const load = async (initial = false) => {
      if (initial) setDetailLoading(true);
      try {
        const d = await getDeliverables(selected.id);
        if (cancelled) return;
        setDeliverables(d);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.detail || 'Could not load this collaboration.');
      } finally {
        if (initial && !cancelled) setDetailLoading(false);
      }
    };

    load(true);
    const interval = window.setInterval(() => load(false), 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selected?.id]);

  useEffect(() => {
    if (!selected || isBusiness || seenCompletion === selected.id) return;
    if (selected.status === 'completed' || selected.payment_status === 'released') {
      setPaymentModal({
        amount: selected.amount_paid || selected.agreed_rate || 0,
        campaign: selected.campaign_title || 'Collaboration',
      });
      setSeenCompletion(selected.id);
    }
  }, [selected, isBusiness, seenCompletion]);

  const choose = (id: number) => {
    setParams({ collab: String(id) });
    setSelectedTab('overview');
    setError('');
  };

  const patchCollab = (updated: Collab) => {
    setCollabs((previous) => previous.map((c) => (c.id === updated.id ? updated : c)));
  };

  const doConfirm = async () => {
    if (!selected) return;
    setBusy('confirm');
    setError('');
    try {
      patchCollab(await confirmCollaboration(selected.id));
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not confirm the collaboration.');
    } finally {
      setBusy(null);
    }
  };

  const doRelease = async () => {
    if (!selected) return;
    setBusy('release');
    setError('');
    try {
      const payment = await releasePayment(selected.id);
      const updated = {
        ...selected,
        status: 'completed',
        payment_status: 'released' as const,
        amount_paid: payment.amount,
      };
      patchCollab(updated);
      setError('Payment released successfully. The collaboration is complete.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not release the payment.');
    } finally {
      setBusy(null);
    }
  };


  const updateDeliverable = (updated: WorkspaceDeliverable) => {
    setDeliverables((previous) => {
      const next = previous.map((d) => (d.id === updated.id ? updated : d));

      if (selected) {
        setCollabs((collabs) =>
          collabs.map((c) =>
            c.id === selected.id
              ? {
                  ...c,
                  approved_deliverables: next.filter((d) => d.status === 'approved').length,
                  submitted_deliverables: next.filter((d) => d.status === 'submitted').length,
                  pending_deliverables: next.filter((d) => d.status === 'pending' || d.status === 'revision_requested').length,
                }
              : c
          )
        );
      }

      return next;
    });
  };

  const updateDeliverables = (updated: WorkspaceDeliverable[]) => {
    setDeliverables(updated);

    if (!selected) return;

    const approvedCount = updated.filter((d) => d.status === 'approved').length;
    const submittedCount = updated.filter((d) => d.status === 'submitted').length;
    const pendingCount = updated.filter(
      (d) => d.status === 'pending' || d.status === 'revision_requested'
    ).length;

    setCollabs((previous) =>
      previous.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              approved_deliverables: approvedCount,
              submitted_deliverables: submittedCount,
              pending_deliverables: pendingCount,
            }
          : c
      )
    );
  };

  if (loading) {
    return (
      <AppLayout title="Active Collabs" subtitle="Your collaboration workspace.">
        <style>{styles}</style>
        <div className="cw-loading">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Active Collabs"
      subtitle={isBusiness ? 'Everything for each creator, in one place.' : 'Everything for each brand, in one place.'}
      showSearch={false}
      showNotifications
    >
      <style>{styles}</style>

      <div
        className="cw-shell"
        style={{ ['--cw-accent' as any]: accent, ['--cw-accent-soft' as any]: accentSoft }}
      >
        {collabs.length === 0 ? (
          <div className="cw-empty">
            <strong>No active collaborations yet.</strong>
            <span>
              {isBusiness
                ? 'Select a creator to start a collaboration.'
                : 'Once a brand selects you, the collaboration will appear here.'}
            </span>
          </div>
        ) : (
          <>
            <aside className="cw-list">
              <div className="cw-list-head">
                <strong>{isBusiness ? 'Creators' : 'Brands'}</strong>
                <span>{collabs.length}</span>
              </div>

              {collabs.map((c) => {
                const name = isBusiness ? c.creator_name : c.business_name;
                const avatar = isBusiness ? c.creator_avatar : c.business_logo;
                const state = nextState(c, isBusiness);

                return (
                  <button
                    key={c.id}
                    className={`cw-person ${selected?.id === c.id ? 'is-active' : ''}`}
                    onClick={() => choose(c.id)}
                  >
                    {avatar ? <img src={avatar} alt="" /> : <span className="cw-avatar">{initials(name)}</span>}
                    <span className="cw-person-main">
                      <strong>{name || 'Collaborator'}</strong>
                      <small>{c.campaign_title || `Campaign #${c.campaign_id}`}</small>
                      <em>{state.turn === 'YOUR TURN' ? 'Action needed' : state.title}</em>
                    </span>
                    <span className="cw-counts">
                      {c.pending_deliverables > 0 && <b className="work-count">{c.pending_deliverables}</b>}
                    </span>
                  </button>
                );
              })}
            </aside>

            {selected && (
              <main className="cw-main">
                <header className="cw-header">
                  <div className="cw-header-person">
                    {isBusiness && selected.creator_avatar ? (
                      <img src={selected.creator_avatar} alt="" />
                    ) : !isBusiness && selected.business_logo ? (
                      <img src={selected.business_logo} alt="" />
                    ) : (
                      <span className="cw-avatar cw-avatar-lg">
                        {initials(isBusiness ? selected.creator_name : selected.business_name)}
                      </span>
                    )}
                    <div>
                      <h2>{isBusiness ? selected.creator_name : selected.business_name}</h2>
                      <p>{selected.campaign_title}</p>
                    </div>
                  </div>
                  <span className={`cw-status ${selected.status === 'completed' ? 'good' : ''}`}>
                    {selected.status === 'completed' ? 'Completed' : 'Active'}
                  </span>
                </header>

                <div className="cw-tabs">
                  <button className={selectedTab === 'overview' ? 'is-active' : ''} onClick={() => setSelectedTab('overview')}>
                    Overview
                  </button>
                  <button className={selectedTab === 'deliverables' ? 'is-active' : ''} onClick={() => setSelectedTab('deliverables')}>
                    Deliverables
                    {selected.pending_deliverables > 0 && <b>{selected.pending_deliverables}</b>}
                  </button>
                </div>

                {error && <div className="cw-error">{error}</div>}

                {detailLoading ? (
                  <div className="cw-loading">Loading…</div>
                ) : (
                  <div className="cw-body">
                    {selectedTab === 'overview' && (
                      <Overview
                        c={selected}
                        isBusiness={isBusiness}
                        busy={busy}
                        onConfirm={doConfirm}
                        onRelease={doRelease}
                        onOpenDeliverables={() => setSelectedTab('deliverables')}
                      />
                    )}
                    {selectedTab === 'deliverables' && (
                      <Deliverables
                        c={selected}
                        deliverables={deliverables}
                        isBusiness={isBusiness}
                        onUpdate={updateDeliverable}
                        onBulkUpdate={updateDeliverables}
                      />
                    )}
                  </div>
                )}
              </main>
            )}
          </>
        )}
      </div>

      {paymentModal && (
        <div className="cw-modal-backdrop">
          <div className="cw-payment-modal" style={{ ['--cw-accent' as any]: accent }}>
            <div className="cw-payment-kicker">PAYMENT RELEASED</div>
            <div className="cw-money">Rs. {paymentModal.amount.toLocaleString()}</div>
            <h3>Your payment has been released</h3>
            <p>{paymentModal.campaign}</p>
            <div className="cw-payment-line">The brand approved your work and released the secured payment. The collaboration is now complete.</div>
            <button className="cw-primary cw-wide" onClick={() => setPaymentModal(null)}>View collaboration</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Overview({
  c,
  isBusiness,
  busy,
  onConfirm,
  onRelease,
  onOpenDeliverables,
}: {
  c: Collab;
  isBusiness: boolean;
  busy: string | null;
  onConfirm: () => void;
  onRelease: () => void;
  onOpenDeliverables: () => void;
}) {
  const state = nextState(c, isBusiness);
  const approved = c.approved_deliverables;
  const total = c.total_deliverables;
  const percent = total ? Math.round((approved / total) * 100) : 0;

  // Flags drive both the progress bar and the stepper below, so the two
  // stay in sync no matter which step the collaboration is currently on.
  const flags = [
    true,
    Boolean(c.creator_confirmed),
    Boolean(total && approved === total),
    c.status === 'completed' || c.payment_status === 'released',
  ];
  const currentIndex = flags.findIndex((f) => !f);
  const stepLabels = ['Selected', 'Confirmed', 'Work In Progress', 'Approved', 'Paid & Complete'];
  const steps = stepLabels.map((label, i) => ({
    label,
    status: (flags[i] ? 'done' : i === currentIndex ? 'current' : 'upcoming') as 'done' | 'current' | 'upcoming',
  }));

  return (
    <div className="cw-overview">
      <section className={`cw-next cw-next-${state.turn === 'YOUR TURN' ? 'action' : 'wait'}`}>
        <div className="cw-next-copy">
          <span className="cw-next-icon" aria-hidden="true">✦</span>
          <div>
            <small>{state.turn}</small>
            <h3>{state.title}</h3>
            <p>{state.body}</p>
          </div>
        </div>
        <div className="cw-next-actions">
          {state.action === 'confirm' && (
            <button className="cw-primary" onClick={onConfirm} disabled={busy === 'confirm'}>
              {busy === 'confirm' ? 'Confirming…' : 'Confirm collaboration'}
            </button>
          )}
          {state.action === 'submit' && (
            <button className="cw-primary" onClick={onOpenDeliverables}>Open Deliverables →</button>
          )}
          {state.action === 'release' && (
            <button className="cw-primary" onClick={onRelease} disabled={busy === 'release'}>
              {busy === 'release' ? 'Releasing…' : 'Release payment'}
            </button>
          )}
        </div>
      </section>

      <section className="cw-progress-card">
        <div className="cw-progress-title">
          <span>Collaboration progress</span>
          <strong>{approved}/{total} approved</strong>
        </div>
        <div className="cw-progress-line"><i style={{ width: `${percent}%` }} /></div>
        <div className="cw-steps">
          {steps.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <span className={`cw-step-line ${flags[i] ? 'done' : ''}`} />}
              <Step status={s.status} label={s.label} />
            </Fragment>
          ))}
        </div>
      </section>

      <div className="cw-grid">
        <section className="cw-card">
          <div className="cw-card-head"><strong>Agreement</strong><span>What was agreed</span></div>
          <div className="cw-detail"><span>Campaign</span><strong>{c.campaign_title}</strong></div>
          <div className="cw-detail"><span>Payment</span><strong>Rs. {(c.agreed_rate || 0).toLocaleString()}</strong></div>
          {c.payment_status === 'funded' && (
            <div className="cw-detail"><span>Campaign funding</span><strong>Rs. {(c.funded_amount || 0).toLocaleString()} secured</strong></div>
          )}
          <div className="cw-detail"><span>Deadline</span><strong>{c.deliverable_deadline ? new Date(c.deliverable_deadline).toLocaleDateString() : 'Not set'}</strong></div>
        </section>

        <section className="cw-card">
          <div className="cw-card-head"><strong>Work</strong><span>One place for all deliverables</span></div>
          <div className="cw-detail"><span>Submitted</span><strong>{c.submitted_deliverables}/{c.total_deliverables}</strong></div>
          <div className="cw-detail"><span>Approved</span><strong>{c.approved_deliverables}/{c.total_deliverables}</strong></div>
          <button className="cw-link-button" onClick={onOpenDeliverables}>Open deliverables</button>
        </section>
      </div>
    </div>
  );
}

function Step({ status, label }: { status: 'done' | 'current' | 'upcoming'; label: string }) {
  return (
    <div className={`cw-step cw-step-${status}`}>
      <span className="cw-step-dot">{status === 'done' ? '✓' : status === 'current' ? '›' : ''}</span>
      <small>{label}</small>
    </div>
  );
}

function Deliverables({
  c,
  deliverables,
  isBusiness,
  onUpdate,
  onBulkUpdate,
}: {
  c: Collab;
  deliverables: WorkspaceDeliverable[];
  isBusiness: boolean;
  onUpdate: (d: WorkspaceDeliverable) => void;
  onBulkUpdate: (deliverables: WorkspaceDeliverable[]) => void;
}) {
  const [files, setFiles] = useState<Record<number, File | null>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [working, setWorking] = useState<number | 'all' | null>(null);
  const [error, setError] = useState('');

  const readyToSubmit = deliverables.filter((d) => files[d.id]);
  const submitted = deliverables.filter((d) => d.status === 'submitted');
  const approved = deliverables.filter((d) => d.status === 'approved');

  const submitOne = async (d: WorkspaceDeliverable) => {
    const file = files[d.id];
    if (!file) return;
    setWorking(d.id);
    setError('');
    try {
      const media = await uploadMedia(file);
      const updated = await submitDeliverable(d.id, {
        file_url: media.url,
        media_type: media.media_type,
        submission_note: notes[d.id]?.trim() || undefined,
      });
      onUpdate(updated);
      setFiles((prev) => ({ ...prev, [d.id]: null }));
    } catch (e: any) {
      setError(e?.response?.data?.detail || `Could not submit ${d.title}.`);
    } finally {
      setWorking(null);
    }
  };

  const submitAll = async () => {
    if (!readyToSubmit.length) return;
    setWorking('all');
    setError('');
    try {
      for (const d of readyToSubmit) {
        const file = files[d.id];
        if (!file) continue;
        const media = await uploadMedia(file);
        const updated = await submitDeliverable(d.id, {
          file_url: media.url,
          media_type: media.media_type,
          submission_note: notes[d.id]?.trim() || undefined,
        });
        onUpdate(updated);
      }
      setFiles({});
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Some deliverables could not be submitted.');
    } finally {
      setWorking(null);
    }
  };

  const review = async (d: WorkspaceDeliverable, status: 'approved' | 'revision_requested') => {
    setWorking(d.id);
    setError('');
    try {
      const updated = await reviewDeliverable(d.id, {
        status,
        feedback: status === 'revision_requested' ? feedback[d.id]?.trim() || 'Please revise this deliverable.' : undefined,
      });
      onUpdate(updated);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not review this deliverable.');
    } finally {
      setWorking(null);
    }
  };

  const approveAll = async () => {
    if (!submitted.length) return;
    setWorking('all');
    setError('');
    try {
      const updated = await reviewAllDeliverables(c.id);
      onBulkUpdate(updated);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not approve the submitted work.');
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="cw-work">
      <div className="cw-work-head">
        <div>
          <h3>Deliverables</h3>
          <p>{isBusiness ? 'Review the creator’s work here. One approval can finish the review.' : 'Prepare your work here. Submit everything together when it is ready.'}</p>
        </div>
        {!isBusiness && readyToSubmit.length > 0 && (
          <button className="cw-primary" onClick={submitAll} disabled={working === 'all'}>
            {working === 'all' ? 'Submitting…' : `Submit ${readyToSubmit.length} ready ${readyToSubmit.length === 1 ? 'item' : 'items'}`}
          </button>
        )}
        {isBusiness && submitted.length > 0 && (
          <button className="cw-primary" onClick={approveAll} disabled={working === 'all'}>
            {working === 'all' ? 'Approving…' : `Approve all ${submitted.length}`}
          </button>
        )}
      </div>

      {error && <div className="cw-error">{error}</div>}

      {deliverables.map((d) => (
        <div className="cw-deliverable" key={d.id}>
          <div className="cw-deliverable-head">
            <div>
              <h4>{d.title}</h4>
              <p>{d.description || 'Required campaign deliverable'}</p>
            </div>
            <span className={`cw-del-status ${d.status}`}>
              {d.status === 'approved' ? 'Approved' : d.status === 'submitted' ? 'Submitted' : d.status === 'revision_requested' ? 'Revision requested' : 'Not submitted'}
            </span>
          </div>

          {d.file_url && (
            <div className="cw-file">
              <a href={d.file_url} target="_blank" rel="noreferrer">Open submitted work</a>
              {d.media_type === 'image' && <img src={d.file_url} alt="Submitted work" />}
            </div>
          )}

          {d.feedback && <div className="cw-feedback"><strong>Brand feedback:</strong> {d.feedback}</div>}

          {!isBusiness && d.status !== 'approved' && (
            <div className="cw-submit">
              <label className="cw-file-picker">
                <strong>{files[d.id]?.name || 'Choose file'}</strong>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setFiles((prev) => ({ ...prev, [d.id]: e.target.files?.[0] || null }))}
                />
              </label>
              <textarea
                value={notes[d.id] || ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                placeholder="Optional note"
              />
              <button className="cw-secondary" onClick={() => submitOne(d)} disabled={!files[d.id] || working === d.id}>
                {working === d.id ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          )}

          {isBusiness && d.status === 'submitted' && (
            <div className="cw-review">
              <textarea
                value={feedback[d.id] || ''}
                onChange={(e) => setFeedback((prev) => ({ ...prev, [d.id]: e.target.value }))}
                placeholder="Only add a note if requesting a revision"
              />
              <button className="cw-secondary" onClick={() => review(d, 'revision_requested')} disabled={working === d.id}>Request revision</button>
              <button className="cw-primary" onClick={() => review(d, 'approved')} disabled={working === d.id}>Approve</button>
            </div>
          )}
        </div>
      ))}

      {deliverables.length === 0 && (
        <div className="cw-empty"><strong>No deliverables yet.</strong><span>This collaboration has no required deliverables.</span></div>
      )}

      {isBusiness && approved.length === c.total_deliverables && c.total_deliverables > 0 && c.payment_status === 'funded' && (
        <div className="cw-ready">
          <strong>All deliverables are approved.</strong>
          <span>The secured payment is ready. Release it from the collaboration overview to complete this collaboration.</span>
        </div>
      )}
    </div>
  );
}

// All accent-dependent colors below use var(--cw-accent) / var(--cw-accent-soft),
// set inline on .cw-shell (and on each modal) from the role-based `accent` value
// computed in WorkspaceActive — indigo/violet for creators, navy for brands.
const styles = `
.cw-shell{display:grid;grid-template-columns:290px minmax(0,1fr);min-height:calc(100vh - 150px);background:${C.bg};border-top:1px solid ${C.line}}
.cw-list{background:#fff;border-right:1px solid ${C.line};padding:16px 9px}.cw-list-head{display:flex;justify-content:space-between;padding:0 10px 11px;font-size:12px;color:${C.soft}}.cw-list-head span{font-size:10px;background:${C.bg};padding:3px 7px;border-radius:99px}
.cw-person{width:100%;border:0;background:transparent;display:flex;gap:9px;align-items:center;padding:10px;border-radius:12px;text-align:left;cursor:pointer}.cw-person:hover{background:#f6f6fb}.cw-person.is-active{background:var(--cw-accent-soft)}.cw-person img,.cw-avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none}.cw-avatar{display:flex;align-items:center;justify-content:center;background:var(--cw-accent-soft);color:var(--cw-accent);font-size:11px;font-weight:800}.cw-person-main{min-width:0;display:flex;flex-direction:column;gap:2px;flex:1}.cw-person-main strong{font-size:12px;color:${C.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cw-person-main small{font-size:10px;color:${C.soft};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cw-person-main em{font-style:normal;font-size:9px;color:${C.faint};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cw-counts{display:flex;gap:4px}.cw-counts b{min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:var(--cw-accent);color:#fff;font-size:8px;display:flex;align-items:center;justify-content:center}.cw-counts .work-count{background:#e8e8ea;color:${C.ink}}
.cw-main{min-width:0;background:${C.bg}}.cw-header{background:#fff;border-bottom:1px solid ${C.line};padding:17px 24px;display:flex;align-items:center;justify-content:space-between;gap:14px}.cw-header-person{display:flex;gap:11px;align-items:center}.cw-header-person img,.cw-avatar-lg{width:44px;height:44px;box-shadow:0 0 0 3px var(--cw-accent-soft)}.cw-header h2{font-size:15px;margin:0;color:${C.ink}}.cw-header p{font-size:10.5px;margin:3px 0 0;color:${C.soft}}.cw-status{font-size:9.5px;font-weight:750;padding:5px 9px;border-radius:99px;background:${C.warnSoft};color:${C.warn}}.cw-status.good{background:${C.goodSoft};color:${C.good}}
.cw-tabs{background:#fff;border-bottom:1px solid ${C.line};display:flex;padding:0 24px;gap:20px}.cw-tabs button{border:0;background:none;padding:12px 1px 10px;color:${C.soft};font-size:11px;font-weight:750;border-bottom:2px solid transparent;cursor:pointer}.cw-tabs button.is-active{color:${C.ink};border-bottom-color:var(--cw-accent)}.cw-tabs b{font-size:8px;background:var(--cw-accent);color:#fff;border-radius:99px;padding:2px 5px;margin-left:4px}.cw-body{padding:22px;max-width:1000px}.cw-overview{display:flex;flex-direction:column;gap:14px}
.cw-next{padding:18px 20px;background:#fff;border:1px solid ${C.line};border-radius:16px;display:flex;justify-content:space-between;align-items:center;gap:20px}.cw-next-action{border-color:var(--cw-accent-soft);background:linear-gradient(180deg,#fff,var(--cw-accent-soft) 220%)}.cw-next-wait{background:#fafafa}.cw-next-copy{min-width:0;display:flex;gap:13px;align-items:flex-start}.cw-next-icon{flex:none;width:38px;height:38px;border-radius:12px;background:var(--cw-accent-soft);color:var(--cw-accent);display:flex;align-items:center;justify-content:center;font-size:15px}.cw-next small{font-size:8px;font-weight:850;letter-spacing:.1em;color:var(--cw-accent)}.cw-next-wait small{color:${C.faint}}.cw-next h3{font-size:14px;margin:4px 0;color:${C.ink}}.cw-next p{font-size:10.5px;color:${C.soft};margin:0;line-height:1.55;max-width:620px}.cw-next-actions{display:flex;flex:none}
.cw-primary,.cw-secondary{border-radius:10px;padding:9px 14px;font-size:10.5px;font-weight:750;cursor:pointer;white-space:nowrap}.cw-primary{border:1px solid var(--cw-accent);background:var(--cw-accent);color:#fff}.cw-secondary{border:1px solid ${C.line};background:#fff;color:${C.ink}}button:disabled{opacity:.55;cursor:not-allowed}
.cw-progress-card,.cw-card,.cw-deliverable{background:#fff;border:1px solid ${C.line};border-radius:16px}.cw-progress-card{padding:18px}.cw-progress-title{display:flex;justify-content:space-between;font-size:10.5px;color:${C.soft}}.cw-progress-title strong{color:${C.ink}}.cw-progress-line{height:5px;background:#ededee;border-radius:99px;margin:11px 0 18px;overflow:hidden}.cw-progress-line i{display:block;height:100%;background:var(--cw-accent);border-radius:99px;transition:width .3s ease}
.cw-steps{display:flex;align-items:flex-start}.cw-step{display:flex;flex-direction:column;align-items:center;gap:7px;flex:none;width:78px;text-align:center}.cw-step-dot{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:#fff;border:2px solid #e2e2ea;color:${C.faint}}.cw-step small{font-size:8.5px;color:${C.faint};line-height:1.3}.cw-step-done .cw-step-dot{background:${C.good};border-color:${C.good};color:#fff}.cw-step-done small{color:${C.ink}}.cw-step-current .cw-step-dot{background:var(--cw-accent);border-color:var(--cw-accent);color:#fff}.cw-step-current small{color:var(--cw-accent);font-weight:750}.cw-step-line{flex:1;height:2px;background:#e2e2ea;margin:13px -4px 0;min-width:8px}.cw-step-line.done{background:${C.good}}
.cw-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.cw-card{padding:16px}.cw-card-head{display:flex;flex-direction:column;margin-bottom:13px}.cw-card-head strong{font-size:12px;color:${C.ink}}.cw-card-head span{font-size:9.5px;color:${C.soft};margin-top:2px}.cw-detail{display:flex;justify-content:space-between;border-top:1px solid ${C.line};padding-top:9px;margin-top:9px;gap:10px}.cw-detail span{font-size:10px;color:${C.soft}}.cw-detail strong{font-size:10.5px;color:${C.ink};text-align:right}.cw-link-button{border:0;background:none;padding:10px 0 0;color:var(--cw-accent);font-size:10px;font-weight:750;cursor:pointer}
.cw-work{display:flex;flex-direction:column;gap:11px}.cw-work-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:2px}.cw-work-head h3{font-size:15px;margin:0;color:${C.ink}}.cw-work-head p{font-size:10px;color:${C.soft};margin:3px 0 0;max-width:650px}.cw-deliverable{padding:16px}.cw-deliverable-head{display:flex;justify-content:space-between;gap:12px}.cw-deliverable h4{font-size:12px;margin:0;color:${C.ink}}.cw-deliverable p{font-size:9.5px;color:${C.soft};margin:4px 0 0}.cw-del-status{font-size:8.5px;font-weight:750;padding:5px 8px;border-radius:99px;background:#eee;color:${C.soft};height:max-content}.cw-del-status.approved{background:${C.goodSoft};color:${C.good}}.cw-del-status.submitted{background:var(--cw-accent-soft);color:var(--cw-accent)}.cw-del-status.revision_requested{background:${C.badSoft};color:${C.bad}}.cw-file{margin-top:11px}.cw-file a{font-size:10px;color:var(--cw-accent)}.cw-file img{display:block;width:100%;max-height:340px;object-fit:contain;background:#f5f5f5;border-radius:9px;margin-top:8px}.cw-feedback,.cw-error,.cw-ready{padding:9px 11px;border-radius:9px;font-size:10px}.cw-feedback{background:${C.badSoft};color:${C.bad};margin-top:9px}.cw-error{background:${C.badSoft};color:${C.bad};margin-bottom:11px}.cw-ready{background:${C.goodSoft};color:${C.good};display:flex;flex-direction:column;gap:3px}.cw-ready strong{font-size:11px}
.cw-submit,.cw-review{display:flex;gap:7px;align-items:center;margin-top:12px}.cw-file-picker{flex:1;border:1px dashed #d5d5d7;border-radius:8px;padding:8px 9px;cursor:pointer;font-size:9.5px;color:${C.soft};min-width:0}.cw-file-picker strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cw-file-picker input{display:none}.cw-submit textarea,.cw-review textarea{flex:1;min-height:38px;border:1px solid ${C.line};border-radius:8px;padding:8px;font:10px/1.4 -apple-system,sans-serif;resize:vertical;outline:none}.cw-review{align-items:stretch}.cw-review textarea{min-width:0}
.cw-empty,.cw-loading{padding:65px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:${C.soft};font-size:10.5px}.cw-empty strong{font-size:13px;color:${C.ink}}
.cw-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;z-index:1000}.cw-modal,.cw-payment-modal{width:min(500px,100%);background:#fff;border-radius:18px;padding:24px;box-shadow:0 20px 70px rgba(0,0,0,.2)}.cw-modal-kicker,.cw-payment-kicker{font-size:8px;font-weight:900;letter-spacing:.12em;color:var(--cw-accent)}.cw-modal h3,.cw-payment-modal h3{font-size:17px;margin:7px 0 6px;color:${C.ink}}.cw-modal p,.cw-payment-modal p{font-size:11px;line-height:1.55;color:${C.soft};margin:0}.cw-modal-summary{display:flex;justify-content:space-between;margin-top:18px;padding:11px 12px;background:${C.bg};border-radius:10px;font-size:10px;color:${C.soft}}.cw-modal-summary strong{color:${C.ink}}.cw-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.cw-payment-modal{text-align:center;padding:30px}.cw-money{font-size:30px;font-weight:850;color:${C.good};margin:10px 0 3px}.cw-payment-line{margin:16px 0 20px;padding:11px;background:${C.goodSoft};color:${C.good};font-size:10px;line-height:1.5;border-radius:10px}.cw-wide{width:100%}
@media(max-width:850px){.cw-shell{grid-template-columns:1fr}.cw-list{border-right:0;border-bottom:1px solid ${C.line};display:flex;overflow:auto;gap:5px}.cw-list-head{display:none}.cw-person{min-width:210px}.cw-grid{grid-template-columns:1fr}.cw-next{flex-direction:column;align-items:flex-start}.cw-next-actions{width:100%}.cw-next-actions button{width:100%}.cw-steps{overflow:auto;padding-bottom:4px}.cw-body{padding:14px}.cw-header,.cw-tabs{padding-left:14px;padding-right:14px}.cw-work-head{align-items:flex-start;flex-direction:column}.cw-work-head button{width:100%}.cw-submit,.cw-review{flex-wrap:wrap}.cw-submit>*{min-width:100%}.cw-review>*{min-width:100%}}
`;

export default WorkspaceActive;
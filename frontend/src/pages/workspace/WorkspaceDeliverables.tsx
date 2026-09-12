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
  uploadMedia,
  uploadImage,
  getPublicationProofs,
  submitPublicationProof,
  reviewPublicationProof,
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
  const [proofs, setProofs] = useState<any[]>([]);
  const [proofError, setProofError] = useState('');
  const [proofBusy, setProofBusy] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ amount: number; campaign: string } | null>(null);

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

  useEffect(() => {
    setProofs([]); setProofError('');
    if (selectedId) getPublicationProofs(Number(selectedId)).then(setProofs).catch(() => setProofs([]));
  }, [selectedId]);

  const handlePaySelected = async () => {
    if (!selectedCollab) return;
    setPayingId(selectedCollab.id); setPaymentError('');
    try { const result = await initiatePayment(selectedCollab.id); window.location.href = result.payment_url; }
    catch (err: any) { setPaymentError(err?.response?.data?.detail || 'Could not start the payment.'); }
    finally { setPayingId(null); }
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

        .wd-media-preview { margin-top: 12px; border: 1px solid ${C.line}; border-radius: 12px; padding: 10px; background: #fafafd; }
        .wd-media-label { font-size: 11px; font-weight: 700; color: ${C.inkSoft}; margin-bottom: 8px; }
        .wd-media-image, .wd-media-video { display: block; width: 100%; max-height: 420px; object-fit: contain; border-radius: 9px; background: #111; }
        .wd-media-image { background: #f1eff6; }
        .wd-media-footer { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: ${C.inkSoft}; }
        .wd-upload-box { border: 1.5px dashed ${C.line}; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; cursor: pointer; color: ${C.inkSoft}; }
        .wd-upload-box strong { color: ${C.ink}; font-size: 12.5px; }
        .wd-upload-box span { font-size: 10.5px; }
        .wd-upload-box input { display: none; }
        .wd-form-error { color: #d64545; font-size: 11.5px; }
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
        .wd-payment-success-modal { text-align: center; padding: 30px 26px; }
        .wd-payment-success-icon { width: 58px; height: 58px; margin: 0 auto 12px; border-radius: 50%; background: #EAF8F0; color: #16834A; display: flex; align-items: center; justify-content: center; }
        .wd-payment-success-kicker { font-size: 10px; font-weight: 800; letter-spacing: .12em; color: #16834A; margin-bottom: 7px; }
        .wd-payment-success-modal h3 { margin: 0; font-size: 20px; color: ${C.ink}; }
        .wd-payment-success-amount { margin: 12px 0 4px; font-size: 28px; font-weight: 800; color: ${C.navy}; }
        .wd-payment-success-modal p { margin: 0; font-size: 13px; color: ${C.inkSoft}; }
        .wd-payment-success-copy { margin: 14px 0 18px; padding: 11px 12px; border-radius: 9px; background: #EAF8F0; color: #276749; font-size: 12px; line-height: 1.5; }
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
          {isBusiness && selectedCollab && !['funded','released','completed'].includes(selectedCollab.payment_status || '') && (
            <button className="wd-pay" disabled={payingId === selectedCollab.id} onClick={handlePaySelected}>
              <CreditCard size={14} /> {payingId === selectedCollab.id ? 'Opening payment…' : `Secure Rs. ${selectedCollab.agreed_rate?.toLocaleString() || '—'}`}
            </button>
          )}
          {isBusiness && (
            <button className="wd-add" disabled={collabs.length === 0} onClick={() => setShowForm(true)}>
              <Plus size={14} /> Request deliverable
            </button>
          )}
        </div>

        {paymentError && <div className="wd-payment-error">{paymentError}</div>}
        {isBusiness && selectedCollab && (
          <div className="wd-payment-note">
            {selectedCollab.payment_status === 'funded' ? `🔒 Rs. ${(selectedCollab.agreed_rate || 0).toLocaleString()} secured. It will be paid automatically when all required deliverables are submitted.` : selectedCollab.payment_status === 'released' ? '✓ Payment released.' : `Secure the locked agreed amount (Rs. ${(selectedCollab.agreed_rate || 0).toLocaleString()}) before the creator starts work.`}
          </div>
        )}

        {selectedCollab?.completion_mode === 'publication_required' && selectedId && <PublicationProofPanel collabId={Number(selectedId)} isBusiness={isBusiness} proofs={proofs} setProofs={setProofs} error={proofError} setError={setProofError} busy={proofBusy} setBusy={setProofBusy} platforms={selectedCollab.required_platforms?.length ? selectedCollab.required_platforms : (selectedCollab.required_platform ? [selectedCollab.required_platform] : undefined)} postTypes={selectedCollab.required_post_types?.length ? selectedCollab.required_post_types : (selectedCollab.required_post_type ? [selectedCollab.required_post_type] : undefined)} />}

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
            onUpdate={(updated) => {
              setDeliverables((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              if (updated.payment_released) {
                setPaymentModal({
                  amount: Number(updated.payment_amount || 0),
                  campaign: updated.campaign_title || selectedCollab?.campaign_title || 'Collaboration',
                });
                getCollabs().then(setCollabs).catch(() => {});
              }
            }}
          />
        ))}
      </div>

      {paymentModal && (
        <div className="wd-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="wd-payment-success-title">
          <div className="wd-modal wd-payment-success-modal">
            <div className="wd-payment-success-icon"><Check size={28} /></div>
            <div className="wd-payment-success-kicker">PAYMENT SUCCESSFUL</div>
            <h3 id="wd-payment-success-title">Your payment has been released</h3>
            <div className="wd-payment-success-amount">Rs. {paymentModal.amount.toLocaleString()}</div>
            <p>{paymentModal.campaign}</p>
            <div className="wd-payment-success-copy">Your final deliverable was submitted successfully and the agreed creator payment has been released automatically.</div>
            <button className="wd-modal-submit" onClick={() => setPaymentModal(null)}>Continue</button>
          </div>
        </div>
      )}

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const meta = STATUS_META[deliverable.status] || STATUS_META.pending;

  const handleSubmit = async () => {
    if (!selectedFile) {
      setSubmitError('Upload the actual image or video file before submitting.');
      return;
    }
    setBusy(deliverable.id);
    setUploading(true);
    setSubmitError('');
    try {
      const uploaded = await uploadMedia(selectedFile);
      const updated = await submitDeliverable(deliverable.id, {
        file_url: uploaded.url,
        media_type: uploaded.media_type,
        submission_note: note.trim() || undefined,
      });
      onUpdate(updated);
      setSubmitOpen(false);
      setSelectedFile(null);
      setNote('');
    } catch (err: any) {
      console.error('Could not submit deliverable:', err);
      setSubmitError(err?.response?.data?.detail || 'Could not upload or submit this deliverable.');
    } finally {
      setUploading(false);
      setBusy(null);
    }
  };

  const handleReview = async (status: 'approved' | 'revision_requested') => {
    setBusy(deliverable.id);
    setReviewError('');
    try {
      const updated = await reviewDeliverable(deliverable.id, { status, feedback: status === 'revision_requested' ? feedback.trim() || undefined : undefined });
      onUpdate(updated);
      setReviseOpen(false);
      setFeedback('');
    } catch (err: any) {
      console.error('Could not review deliverable:', err);
      setReviewError(err?.response?.data?.detail || 'Could not update the deliverable review.');
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
        <div className="wd-media-preview">
          <div className="wd-media-label">Creator submission</div>
          {deliverable.media_type === 'video' ? (
            <video className="wd-media-video" src={deliverable.file_url} controls preload="metadata" />
          ) : (
            <img className="wd-media-image" src={deliverable.file_url} alt={`${deliverable.title} submission`} />
          )}
          <div className="wd-media-footer">
            <a className="wd-file-link" href={deliverable.file_url} target="_blank" rel="noreferrer">Open full media</a>
            {deliverable.submission_note ? <span>{deliverable.submission_note}</span> : null}
          </div>
        </div>
      )}

      {!isBusiness && (deliverable.status === 'pending' || deliverable.status === 'revision_requested') && (
        submitOpen ? (
          <div className="wd-inline-form">
            <label className="wd-upload-box">
              <Upload size={18} />
              <strong>{selectedFile ? selectedFile.name : 'Upload the actual image or video'}</strong>
              <span>JPG, PNG, WebP, GIF, MP4, WebM or MOV · up to 100 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            </label>
            <textarea rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            {submitError && <div className="wd-form-error">{submitError}</div>}
            <div className="wd-inline-actions">
              <button className="wd-btn wd-btn--primary" disabled={busy || uploading || !selectedFile} onClick={handleSubmit}>
                {busy ? <Loader2 size={13} className="wd-spin" /> : <Upload size={13} />} {uploading ? 'Uploading…' : 'Submit'}
              </button>
              <button className="wd-btn wd-btn--ghost" onClick={() => { setSubmitOpen(false); setSubmitError(''); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="wd-inline-actions">
            <button className="wd-btn wd-btn--primary" onClick={() => { setSubmitOpen(true); setSubmitError(''); }}>
              <Upload size={13} /> Submit content
            </button>
          </div>
        )
      )}

      {isBusiness && deliverable.status === 'submitted' && (
        <>
        {reviewError && <div className="wd-form-error">{reviewError}</div>}
        {reviseOpen ? (
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
        )}
        </>
      )}
    </div>
  );
}

function PublicationProofPanel({ collabId, isBusiness, proofs, setProofs, error, setError, busy, setBusy, platforms, postTypes }: any) {
  const platformList: string[] = platforms?.length ? platforms : ['social'];
  const postTypeList: string[] = postTypes?.length ? postTypes : [];
  const [url,setUrl]=useState(''); const [file,setFile]=useState<File|null>(null); const [feedback,setFeedback]=useState('');
  const [selectedPlatform,setSelectedPlatform]=useState(platformList[0]);
  const platformHasPending = proofs.some((p:any)=>p.status==='pending' && p.platform===selectedPlatform);
  const submit=async()=>{ if(!url.trim()){setError('Add the public post URL.');return;} setBusy(true);setError(''); try{let screenshot_url;if(file)screenshot_url=(await uploadImage(file)).url;const p=await submitPublicationProof(collabId,{platform:selectedPlatform||'social',post_type:postTypeList.length===1?postTypeList[0]:undefined,post_url:url.trim(),screenshot_url});setProofs((x:any[])=>[p,...x]);setUrl('');setFile(null);}catch(e:any){setError(e?.response?.data?.detail||'Could not submit proof.')}finally{setBusy(false)}};
  const review=async(id:number,status:string)=>{setBusy(true);setError('');try{const p=await reviewPublicationProof(collabId,id,{status,feedback:status==='correction_requested'?feedback.trim()||'Please correct the publication proof.':undefined});setProofs((x:any[])=>x.map(a=>a.id===id?p:a));setFeedback('')}catch(e:any){setError(e?.response?.data?.detail||'Could not review proof.')}finally{setBusy(false)}};
  return <div className="wd-card" style={{border:'1px solid #d9d5ef'}}><div className="wd-title">📱 Publication verification</div><div className="wd-sub">{platformList.length?`Required platform(s): ${platformList.join(', ')}`:'Publish the approved content and submit proof.'}{postTypeList.length?` · ${postTypeList.join(', ')}`:''}</div>{!isBusiness && <div className="wd-inline-form">{platformList.length>1 && <select className="cc-input" value={selectedPlatform} onChange={e=>setSelectedPlatform(e.target.value)} style={{marginBottom:8}}>{platformList.map((pl:string)=><option key={pl} value={pl}>{pl}</option>)}</select>}{platformHasPending ? <div className="wd-sub">A proof for {selectedPlatform} is already pending review.</div> : <><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Public post URL (https://...)"/><label className="wd-upload-box"><Upload size={16}/><strong>{file?file.name:'Upload publication screenshot'}</strong><span>Optional screenshot evidence</span><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>{error&&<div className="wd-form-error">{error}</div>}<button className="wd-btn wd-btn--primary" disabled={busy} onClick={submit}>{busy?'Submitting…':`Submit proof for ${selectedPlatform}`}</button></>}</div>}{proofs.map((p:any)=><div key={p.id} style={{marginTop:12,padding:12,border:'1px solid #eeeaf5',borderRadius:10}}><div style={{fontSize:12,fontWeight:700}}>{p.platform} · {p.status}</div><a className="wd-file-link" href={p.post_url} target="_blank" rel="noreferrer">Open published post</a>{p.screenshot_url&&<img className="wd-media-image" style={{marginTop:8,maxHeight:240}} src={p.screenshot_url} alt="Publication proof"/>}{p.feedback&&<div className="wd-feedback">{p.feedback}</div>}{isBusiness&&p.status==='pending'&&<div className="wd-inline-actions" style={{marginTop:8}}><button className="wd-btn wd-btn--approve" disabled={busy} onClick={()=>review(p.id,'verified')}><Check size={13}/> Verify</button><button className="wd-btn wd-btn--revise" disabled={busy} onClick={()=>review(p.id,'correction_requested')}><RefreshCw size={13}/> Request correction</button></div>}</div>)}{!proofs.length&&<div className="wd-sub" style={{marginTop:10}}>No publication proof submitted yet.</div>}{error&&isBusiness&&<div className="wd-form-error" style={{marginTop:8}}>{error}</div>} </div>
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
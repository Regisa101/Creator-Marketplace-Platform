import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import {
  completeContract,
  getContract,
  getCampaign,
  getPublicCampaign,
  getPublicBusinessProfile,
  getCreatorProfile,
  type Contract,
} from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { PublicNavbar } from '../components/PublicNavbar';
import { KhaltiPaymentForm } from '../components/KhaltiPaymentForm';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_payment: 'Pending payment',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function statusLabel(status?: string | null) {
  if (!status) return '—';
  return (
    STATUS_LABEL[status] ||
    status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function money(value?: number | null) {
  return `NPR ${Number(value || 0).toLocaleString()}`;
}

function dateLabel(value?: string | null, withTime = false) {
  if (!value) return 'Not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not set';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/api/')) return `http://localhost:8000${value}`;
  return `http://localhost:8000/${value.replace(/^\/+/, '')}`;
}

function initials(name?: string | null, fallback = 'C') {
  const value = (name || fallback)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return value || fallback;
}

function StatusIcon({ status, size = 13 }: { status: string; size?: number }) {
  if (status === 'active') return <PlayCircle size={size} />;
  if (status === 'completed') return <CheckCircle2 size={size} />;
  if (status === 'cancelled') return <XCircle size={size} />;
  if (status === 'pending_payment') return <Clock3 size={size} />;
  return <FileText size={size} />;
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="cdt-row">
      <span>{label}</span>
      <strong>{value || 'Not specified'}</strong>
    </div>
  );
}

/* Creators use the landing page navbar; brands keep the dashboard layout. */
function DetailShell({ isCreator, children }: { isCreator: boolean; children: React.ReactNode }) {
  if (!isCreator) {
    return (
      <AppLayout
        title="Contract details"
        subtitle="Campaign, terms and payment for this collaboration."
        showNotifications
        showSearch={false}
      >
        {children}
      </AppLayout>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fcfaf9' }}>
      <PublicNavbar />
      <div style={{ maxWidth: 1088, margin: '0 auto', padding: '100px 24px 40px' }}>
        {children}
      </div>
    </div>
  );
}

export function ContractDetail() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isBusiness = user?.role === 'business';
  const isCreator = user?.role === 'creator';

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmComplete, setConfirmComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Profile pictures + live campaign details (fallback for old contracts
  // that have no saved snapshot).
  const [businessLogo, setBusinessLogo] = useState('');
  const [creatorAvatar, setCreatorAvatar] = useState('');
  const [liveCampaign, setLiveCampaign] = useState<any>(null);

  useEffect(() => {
    const numericId = Number(contractId);

    if (!contractId || Number.isNaN(numericId)) {
      setError('This contract link is not valid.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    getContract(numericId)
      .then((data) => {
        if (!cancelled) setContract(data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        const status = err?.response?.status;
        setError(
          status === 404
            ? 'We could not find this contract, or you do not have access to it.'
            : err?.response?.data?.detail ||
                'Could not load this contract. Please try again.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  useEffect(() => {
    if (!contract) return;
    let cancelled = false;

    getPublicBusinessProfile(contract.business_id)
      .then((profile) => {
        if (!cancelled && profile.logo_url) setBusinessLogo(mediaUrl(profile.logo_url));
      })
      .catch(() => undefined);

    getCreatorProfile(contract.creator_id)
      .then((profile) => {
        if (!cancelled && profile.profile_image) setCreatorAvatar(mediaUrl(profile.profile_image));
      })
      .catch(() => undefined);

    // Only needed when the contract has no saved campaign details.
    if (!contract.evidence_snapshot?.campaign) {
      const load = user?.role === 'business' ? getCampaign : getPublicCampaign;
      load(contract.campaign_id)
        .then((data) => {
          if (!cancelled) setLiveCampaign(data);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [contract?.id, contract?.evidence_snapshot?.campaign, user?.role]);

  const handleComplete = async () => {
    if (!contract) return;
    setCompleting(true);
    setActionError('');

    try {
      const updated = await completeContract(contract.id);
      setContract(updated);
      setConfirmComplete(false);
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail || 'Could not complete this collaboration.',
      );
    } finally {
      setCompleting(false);
    }
  };

  // Saved snapshot first (what was agreed), live campaign as a fallback.
  const campaign: any = contract?.evidence_snapshot?.campaign ?? liveCampaign ?? undefined;
  const application = contract?.evidence_snapshot?.application;
  const finalTerms = contract?.evidence_snapshot?.final_terms;
  const heroImage = mediaUrl(campaign?.hero_image || campaign?.image_url);

  const feeAmount =
    contract?.platform_fee_amount ??
    (contract?.total_value
      ? Number(contract.total_value) * Number(contract.platform_fee_rate || 0)
      : 0);
  const feeRatePct = Math.round(Number(contract?.platform_fee_rate || 0) * 1000) / 10;

  const canPay = isBusiness && contract?.status === 'pending_payment';
  const canComplete = isBusiness && contract?.status === 'active';

  // Timeline built only from dates the API actually returns.
  const timeline: { label: string; date?: string | null; done: boolean }[] = contract
    ? [
        { label: 'Contract created', date: contract.created_at, done: true },
        {
          label: 'Terms finalized',
          date: finalTerms?.finalized_at,
          done: Boolean(finalTerms?.finalized_at) || contract.status !== 'draft',
        },
        {
          label: isCreator ? 'Contract activated' : 'Service fee paid',
          date: contract.fee_paid_at,
          done: contract.fee_paid,
        },
        {
          label: 'Collaboration completed',
          date: contract.status === 'completed' ? contract.updated_at : null,
          done: contract.status === 'completed',
        },
      ]
    : [];

  return (
    <DetailShell isCreator={isCreator}>
      <style>{`
        .cdt-page{max-width:none;margin:0;padding:0 0 50px;color:#111;font-family:Poppins,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .cdt-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:14px;color:#555;font:500 12px Poppins,sans-serif;text-decoration:none}
        .cdt-back:hover{color:#111}
        a.cdt-avatar{text-decoration:none;color:inherit}
        .cdt-state{padding:56px 20px;text-align:center;color:#777;font:500 13px Poppins,sans-serif;background:#fff;border:1px solid #e5e5e5;border-radius:12px}
        .cdt-state h3{margin:0 0 6px;color:#111;font:600 15px Poppins,sans-serif}
        .cdt-state p{margin:0 0 16px}
        .cdt-spin{animation:cdt-spin .8s linear infinite}@keyframes cdt-spin{to{transform:rotate(360deg)}}

        .cdt-head{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:16px 18px;background:#fff;border:1px solid #e5e5e5;border-radius:12px;margin-bottom:14px}
        .cdt-head-main{display:flex;align-items:center;gap:14px;min-width:0}
        .cdt-thumb{width:56px;height:56px;border-radius:10px;overflow:hidden;background:#f3f3f3;flex:none;display:flex;align-items:center;justify-content:center;color:#aaa}
        .cdt-thumb img{width:100%;height:100%;object-fit:cover}
        .cdt-title{margin:0;font:600 16px Poppins,sans-serif;color:#111}
        .cdt-sub{margin-top:3px;font:400 12px Poppins,sans-serif;color:#777}
        .cdt-status{display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;background:#f3f3f3;color:#555;font:500 11.5px Poppins,sans-serif;white-space:nowrap}
        .cdt-status.active{background:#e9f6ee;color:#1e8a4c}
        .cdt-status.completed{background:#e8f0fb;color:#2a5aa5}
        .cdt-status.cancelled{background:#f3f2f4;color:#77717e}
        .cdt-status.pending_payment,.cdt-status.draft{background:#fff6e5;color:#9a6a08}

        .cdt-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:14px;align-items:start}
        .cdt-col{display:flex;flex-direction:column;gap:14px;min-width:0}
        .cdt-card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:16px 18px}
        .cdt-card h2{margin:0 0 12px;font:600 11px Poppins,sans-serif;color:#888;text-transform:uppercase;letter-spacing:.08em}
        .cdt-row{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #f0f0f0;font:400 12.5px Poppins,sans-serif}
        .cdt-row:last-child{border-bottom:0}
        .cdt-row span{color:#777;flex:none}
        .cdt-row strong{font-weight:500;color:#111;text-align:right;min-width:0;overflow-wrap:anywhere}
        .cdt-text{margin:0 0 10px;font:400 12.5px/1.65 Poppins,sans-serif;color:#444;white-space:pre-line}
        .cdt-list{margin:0;padding-left:18px;font:400 12.5px/1.7 Poppins,sans-serif;color:#444}
        .cdt-link{display:inline-flex;align-items:center;gap:5px;color:#111;font:500 12px Poppins,sans-serif;text-decoration:underline;text-underline-offset:3px}

        .cdt-party{display:flex;align-items:center;gap:10px;padding:8px 0}
        .cdt-party+.cdt-party{border-top:1px solid #f0f0f0}
        .cdt-avatar{width:36px;height:36px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font:600 12px Poppins,sans-serif;flex:none;overflow:hidden}
        .cdt-avatar img{width:100%;height:100%;object-fit:cover}
        .cdt-party-name{font:600 13px Poppins,sans-serif;color:#111}
        .cdt-party-role{font:400 11px Poppins,sans-serif;color:#888}
        .cdt-party a.cdt-link{margin-left:auto}

        .cdt-earn{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:10px;background:#f7f7f7;margin-bottom:10px}
        .cdt-earn span{font:500 11.5px Poppins,sans-serif;color:#777}
        .cdt-earn strong{font:600 20px Poppins,sans-serif;color:#111}
        .cdt-fee{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;font:500 12px Poppins,sans-serif;margin-bottom:10px}
        .cdt-fee.paid{background:#e9f6ee;color:#1e8a4c}
        .cdt-fee.unpaid{background:#fff6e5;color:#9a6a08}

        .cdt-timeline{list-style:none;margin:0;padding:0}
        .cdt-timeline li{display:flex;gap:10px;padding:0 0 14px 0;font:400 12.5px Poppins,sans-serif;color:#aaa}
        .cdt-timeline li:last-child{padding-bottom:0}
        .cdt-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid #ccc;display:flex;align-items:center;justify-content:center;flex:none;background:#fff;color:#fff}
        .cdt-timeline li.done{color:#111}
        .cdt-timeline li.done .cdt-dot{background:#111;border-color:#111}
        .cdt-timeline small{display:block;margin-top:1px;color:#888;font-size:11px}

        .cdt-confirm{padding:12px;border:1px solid #e5e5e5;border-radius:10px;background:#fafafa;font:400 12px/1.6 Poppins,sans-serif;color:#444}
        .cdt-confirm-actions{display:flex;gap:8px;margin-top:10px}
        .cdt-error{padding:10px 12px;border-radius:9px;background:#f8eeee;color:#ad2929;font:500 12px Poppins,sans-serif;margin-top:10px}

        @media(max-width:860px){.cdt-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="cdt-page">
        <Link className="cdt-back" to="/contracts">
          <ArrowLeft size={14} /> Back to {isCreator ? 'contract history' : 'collaboration history'}
        </Link>

        {loading && (
          <div className="cdt-state">
            <Loader2 size={22} className="cdt-spin" />
            <p style={{ marginTop: 10, marginBottom: 0 }}>Loading contract…</p>
          </div>
        )}

        {!loading && error && (
          <div className="cdt-state">
            <h3>Contract unavailable</h3>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/contracts')}
            >
              Back to history
            </button>
          </div>
        )}

        {!loading && !error && contract && (
          <>
            {/* HEADER */}
            <div className="cdt-head">
              <div className="cdt-head-main">
                <div className="cdt-thumb">
                  {heroImage ? <img src={heroImage} alt="" /> : <FileText size={22} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h1 className="cdt-title">
                    {contract.campaign_title || campaign?.title || `Contract #${contract.id}`}
                  </h1>
                  <div className="cdt-sub">
                    Contract #{contract.id} · {contract.business_name || 'Business'} ×{' '}
                    {contract.creator_name || 'Creator'}
                  </div>
                </div>
              </div>

              <span className={`cdt-status ${contract.status}`}>
                <StatusIcon status={contract.status} />
                {statusLabel(contract.status)}
              </span>
            </div>

            <div className="cdt-grid">
              {/* LEFT: campaign + agreement */}
              <div className="cdt-col">
                <section className="cdt-card">
                  <h2>Campaign</h2>

                  <Row
                    label="Campaign"
                    value={
                      <Link className="cdt-link" to={`/campaigns/${contract.campaign_id}`}>
                        {contract.campaign_title || campaign?.title || `Campaign #${contract.campaign_id}`}
                        <ExternalLink size={11} />
                      </Link>
                    }
                  />
                  <Row label="Category" value={campaign?.category} />
                  <Row
                    label="Location"
                    value={
                      [campaign?.location, campaign?.work_arrangement]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                  />
                  <Row label="Creators needed" value={campaign?.creators_needed} />

                  {campaign?.description && (
                    <div style={{ marginTop: 12 }}>
                      <p className="cdt-text">{campaign.description}</p>
                    </div>
                  )}

                  {campaign?.deliverables && campaign.deliverables.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div className="cdt-sub" style={{ marginBottom: 6 }}>Deliverables</div>
                      <ul className="cdt-list">
                        {campaign.deliverables.map((item: string, i: number) => (
                          <li key={`${item}-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                <section className="cdt-card">
                  <h2>Agreement</h2>
                  <Row label="Engagement" value={contract.engagement_type} />
                  <Row label="Duration" value={contract.duration} />
                  <Row label="Pricing model" value={contract.pricing_model} />
                  <Row label="Compensation type" value={contract.compensation_type} />
                  <Row
                    label="Collaboration period"
                    value={`${dateLabel(contract.start_date)} – ${dateLabel(contract.end_date)}`}
                  />
                  {!isCreator && (
                    <>
                      <Row label="Agreed rate" value={money(contract.agreed_rate)} />
                      <Row label="Total contract value" value={money(contract.total_value)} />
                    </>
                  )}

                  {contract.compensation_description && (
                    <p className="cdt-text" style={{ marginTop: 10 }}>
                      {contract.compensation_description}
                    </p>
                  )}
                  {contract.terms_note && (
                    <div style={{ marginTop: 10 }}>
                      <div className="cdt-sub" style={{ marginBottom: 4 }}>Terms note</div>
                      <p className="cdt-text">{contract.terms_note}</p>
                    </div>
                  )}
                </section>

                {(application?.message || (application?.application_answers?.length ?? 0) > 0) && (
                  <section className="cdt-card">
                    <h2>Creator's application</h2>
                    {application?.message && <p className="cdt-text">{application.message}</p>}
                    {application?.application_answers?.map((a, i) => (
                      <p className="cdt-text" key={i}>
                        <strong>{a.question}</strong>
                        {'\n'}
                        {a.answer}
                      </p>
                    ))}
                  </section>
                )}
              </div>

              {/* RIGHT: parties, payment, timeline */}
              <div className="cdt-col">
                <section className="cdt-card">
                  <h2>Parties</h2>
                  <div className="cdt-party">
                    <Link to={`/brands/${contract.business_id}`} className="cdt-avatar" aria-label="View business profile">
                      {businessLogo ? <img src={businessLogo} alt="" /> : initials(contract.business_name, 'B')}
                    </Link>
                    <div>
                      <div className="cdt-party-name">
                        <Link to={`/brands/${contract.business_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {contract.business_name || 'Business'}
                        </Link>
                      </div>
                      <div className="cdt-party-role">Business</div>
                    </div>
                    <Link className="cdt-link" to={`/brands/${contract.business_id}`}>
                      Profile <ExternalLink size={11} />
                    </Link>
                  </div>
                  <div className="cdt-party">
                    <Link to={`/creators/${contract.creator_id}`} className="cdt-avatar" aria-label="View creator profile">
                      {creatorAvatar ? <img src={creatorAvatar} alt="" /> : initials(contract.creator_name, 'C')}
                    </Link>
                    <div>
                      <div className="cdt-party-name">
                        <Link to={`/creators/${contract.creator_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {contract.creator_name || 'Creator'}
                        </Link>
                      </div>
                      <div className="cdt-party-role">Creator</div>
                    </div>
                    <Link className="cdt-link" to={`/creators/${contract.creator_id}`}>
                      Profile <ExternalLink size={11} />
                    </Link>
                  </div>
                </section>

                {isCreator ? (
                  <section className="cdt-card">
                    <h2>Your compensation</h2>

                    <div className="cdt-earn">
                      <span>You will receive</span>
                      <strong>
                        {contract.total_value ? money(contract.total_value) : 'Not finalized yet'}
                      </strong>
                    </div>

                    <Row
                      label="Agreed rate"
                      value={contract.agreed_rate ? money(contract.agreed_rate) : 'Not finalized yet'}
                    />

                    <p className="cdt-text" style={{ marginTop: 10, marginBottom: 0, color: '#777', fontSize: 12 }}>
                      Compensation is arranged directly between you and the business.
                    </p>
                  </section>
                ) : (
                <section className="cdt-card">
                  <h2>CreatorHub service fee</h2>

                  <div className={`cdt-fee ${contract.fee_paid ? 'paid' : 'unpaid'}`}>
                    {contract.fee_paid ? <Check size={15} /> : <Clock3 size={15} />}
                    {contract.fee_paid
                      ? `Paid on ${dateLabel(contract.fee_paid_at)}`
                      : contract.status === 'draft'
                        ? 'Not due yet. Terms are still being finalized.'
                        : contract.status === 'cancelled'
                          ? 'Not paid. This contract was cancelled.'
                          : 'Awaiting payment'}
                  </div>

                  <Row label="Fee rate" value={feeRatePct ? `${feeRatePct}%` : undefined} />
                  <Row
                    label="Fee amount"
                    value={contract.total_value ? money(feeAmount) : 'Set when finalized'}
                  />
                  <Row label="Contract value" value={money(contract.total_value)} />
                  {contract.fee_paid && (
                    <>
                      <Row
                        label="Method"
                        value={contract.payment_method ? statusLabel(contract.payment_method) : undefined}
                      />
                      <Row label="Reference" value={contract.payment_reference} />
                    </>
                  )}

                  {canPay && (
                    <div style={{ marginTop: 14 }}>
                      <KhaltiPaymentForm contract={contract} variant="inline" />
                    </div>
                  )}
                </section>
                )}

                <section className="cdt-card">
                  <h2>Timeline</h2>
                  <ul className="cdt-timeline">
                    {timeline.map((step) => (
                      <li key={step.label} className={step.done ? 'done' : ''}>
                        <span className="cdt-dot">{step.done && <Check size={11} />}</span>
                        <span>
                          {step.label}
                          {step.done && step.date && <small>{dateLabel(step.date, true)}</small>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {canComplete && (
                  <section className="cdt-card">
                    <h2>Manage</h2>
                    {!confirmComplete ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => setConfirmComplete(true)}
                      >
                        Mark as complete
                      </button>
                    ) : (
                      <div className="cdt-confirm">
                        <ShieldCheck size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Confirm that {contract.creator_name || 'the creator'} has delivered the
                        agreed work. This closes the collaboration.
                        <div className="cdt-confirm-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={completing}
                            onClick={() => void handleComplete()}
                          >
                            {completing ? <Loader2 size={14} className="cdt-spin" /> : <Check size={14} />}
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={completing}
                            onClick={() => setConfirmComplete(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {actionError && <div className="cdt-error">{actionError}</div>}
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DetailShell>
  );
}

export default ContractDetail;
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { AppLayout } from '../components/AppLayout';
import { DemoPaymentForm } from '../components/DemoPaymentForm';
import {
  finalizeContract,
  getContract,
  type Contract,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

const money = (value?: number | null) =>
  `NPR ${Number(value || 0).toLocaleString()}`;

const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Not set';

const dateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not recorded';

export default function ContractDetail() {
  const { contractId } = useParams();
  const { user } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [rate, setRate] = useState('');
  const [total, setTotal] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const isBusiness = user?.role === 'business';

  const load = async () => {
    if (!contractId) return;
    setLoading(true);
    setError('');

    try {
      const result = await getContract(Number(contractId));
      setContract(result);
      setRate(result.agreed_rate != null ? String(result.agreed_rate) : '');
      setTotal(result.total_value != null ? String(result.total_value) : '');
      setNote(result.terms_note || '');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not load this contract.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [contractId]);

  const saveTerms = async () => {
    if (!contract) return;

    const agreed = Number(rate);
    const totalValue = Number(total);

    if (!(agreed > 0) || !(totalValue > 0)) {
      setError('Enter a valid agreed rate and total contract value.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await finalizeContract(contract.id, {
        agreed_rate: agreed,
        total_value: totalValue,
        terms_note: note,
      });
      setContract(updated);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Could not save contract terms.');
    } finally {
      setSaving(false);
    }
  };

  const snapshot = contract?.evidence_snapshot;
  const campaign = snapshot?.campaign;
  const application = snapshot?.application;
  const finalTerms = snapshot?.final_terms;

  return (
    <AppLayout
      title="Contract Details"
      subtitle="A complete record of the campaign, application, contract, and payment history."
      showSearch={false}
    >
      <div style={pageStyle}>
        <Link to="/contracts" style={backLinkStyle}>
          <ArrowLeft size={15} />
          Back to Contracts
        </Link>

        {error && <div style={errorStyle}>{error}</div>}

        {loading && <div style={loadingStyle}>Loading contract…</div>}

        {!loading && contract && (
          <>
            <div style={heroStyle}>
              <div>
                <div style={eyebrowStyle}>COLLABORATION RECORD</div>
                <h1 style={titleStyle}>
                  {campaign?.title || contract.campaign_title || 'Contract'}
                </h1>
                <div style={mutedStyle}>
                  Contract #CH-{String(contract.id).padStart(4, '0')} · Created{' '}
                  {dateTime(contract.created_at)}
                </div>
              </div>

              <StatusBadge status={contract.status} />
            </div>

            <div style={identityGridStyle}>
              <IdentityCard
                icon={<FileText size={18} />}
                label="Campaign"
                value={campaign?.title || contract.campaign_title || `Campaign #${contract.campaign_id}`}
                sub={`Campaign ID #${contract.campaign_id}`}
              />
              <IdentityCard
                icon={<ShieldCheck size={18} />}
                label="Business"
                value={contract.business_name || 'Business'}
                sub="Contracting party"
              />
              <IdentityCard
                icon={<UserRound size={18} />}
                label="Creator"
                value={contract.creator_name || application?.creator_name || 'Creator'}
                sub="Selected creator"
              />
            </div>

            <div style={recordNoticeStyle}>
              <div style={recordNoticeIconStyle}>
                <ShieldCheck size={17} />
              </div>
              <div>
                <strong style={{ fontSize: 13 }}>
                  {snapshot?.historical ? 'Historical collaboration record' : 'Linked collaboration record'}
                </strong>
                <div style={{ fontSize: 11, color: '#667085', marginTop: 3 }}>
                  {snapshot?.historical
                    ? `Campaign and application information was captured when this contract was created. Snapshot recorded ${dateTime(snapshot.captured_at)}.`
                    : 'This older contract is showing the campaign/application records currently linked to it. New contracts will store an immutable snapshot.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <AccordionSection
                id="contract"
                icon={<FileText size={18} />}
                title="Contract Terms"
                subtitle="The actual collaboration agreement and final commercial terms"
                defaultOpen
              >
                <div style={detailsGridStyle}>
                  <Detail label="Engagement Type" value={contract.engagement_type || campaign?.engagement_type || 'Not specified'} />
                  <Detail label="Duration" value={contract.duration || campaign?.duration || 'Not specified'} />
                  <Detail label="Pricing Model" value={contract.pricing_model || campaign?.pricing_model || 'Not specified'} />
                  <Detail label="Compensation Type" value={contract.compensation_type || campaign?.compensation_type || 'Not specified'} />
                  <Detail label="Start Date" value={date(contract.start_date || campaign?.start_date)} />
                  <Detail label="End Date" value={date(contract.end_date || campaign?.end_date)} />
                  <Detail label="Work Location" value={campaign?.work_arrangement || campaign?.location || 'Not specified'} />
                  <Detail label="Agreed Compensation" value={contract.agreed_rate != null ? money(contract.agreed_rate) : 'Not finalized'} />
                  <Detail label="Total Contract Value" value={contract.total_value != null ? money(contract.total_value) : 'Not finalized'} />
                  <Detail label="CreatorHub Fee" value={contract.platform_fee_amount != null ? money(contract.platform_fee_amount) : 'Not calculated'} />
                </div>

                <EvidenceBlock label="Compensation Details" value={contract.compensation_description || campaign?.compensation_description} />
                <EvidenceBlock label="Agreed Terms / Notes" value={contract.terms_note || finalTerms?.terms_note} />

                {finalTerms && (
                  <div style={finalizedBoxStyle}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Finalized terms record</div>
                    <div style={detailsGridStyle}>
                      <Detail label="Final agreed rate" value={finalTerms.agreed_rate != null ? money(finalTerms.agreed_rate) : 'Not recorded'} />
                      <Detail label="Final total value" value={finalTerms.total_value != null ? money(finalTerms.total_value) : 'Not recorded'} />
                      <Detail label="Finalized on" value={dateTime(finalTerms.finalized_at)} />
                      <Detail label="Platform fee" value={finalTerms.platform_fee_amount != null ? money(finalTerms.platform_fee_amount) : 'Not recorded'} />
                    </div>
                  </div>
                )}
              </AccordionSection>

              <AccordionSection
                id="campaign"
                icon={<FileText size={18} />}
                title="Campaign Details"
                subtitle="Everything the brand originally posted for this collaboration"
              >
                {campaign ? (
                  <>
                    <div style={detailsGridStyle}>
                      <Detail label="Category" value={campaign.category || 'Not specified'} />
                      <Detail label="Creator Types" value={join(campaign.creator_types)} />
                      <Detail label="Experience Level" value={campaign.experience_level || 'Not specified'} />
                      <Detail label="Required Skills" value={join(campaign.required_skills)} />
                      <Detail label="Location" value={campaign.location || 'Not specified'} />
                      <Detail label="Work Arrangement" value={campaign.work_arrangement || 'Not specified'} />
                      <Detail label="Creators Needed" value={String(campaign.creators_needed ?? 'Not specified')} />
                      <Detail label="Application Deadline" value={date(campaign.application_deadline)} />
                      <Detail label="Campaign Start" value={date(campaign.start_date)} />
                      <Detail label="Campaign End" value={date(campaign.end_date)} />
                      <Detail label="Budget" value={campaign.budget != null ? money(campaign.budget) : campaign.budget_min != null || campaign.budget_max != null ? `${money(campaign.budget_min)} – ${money(campaign.budget_max)}` : 'Not specified'} />
                    </div>

                    <EvidenceBlock label="Campaign Description" value={campaign.description} />
                    <EvidenceBlock label="Responsibilities" value={campaign.responsibilities} />
                    <EvidenceBlock label="Requirements" value={campaign.requirements} />
                    <EvidenceList label="Deliverables" values={campaign.deliverables} />
                    <EvidenceBlock label="Compensation Description" value={campaign.compensation_description} />
                    <EvidenceList label="Screening Questions" values={campaign.application_questions} />
                  </>
                ) : (
                  <EmptyState text="No campaign snapshot is available for this contract." />
                )}
              </AccordionSection>

              <AccordionSection
                id="application"
                icon={<MessageSquareText size={18} />}
                title="Creator Application"
                subtitle="The exact proposal, message, rate, answers, and portfolio submitted by the creator"
              >
                {application ? (
                  <>
                    <div style={detailsGridStyle}>
                      <Detail label="Application ID" value={`#${application.id ?? contract.application_id}`} />
                      <Detail label="Application Status" value={application.status || 'Not specified'} />
                      <Detail label="Creator" value={application.creator_name || contract.creator_name || 'Creator'} />
                      <Detail label="Proposed Rate" value={application.rate != null ? money(application.rate) : 'Not specified'} />
                      <Detail label="Agreed Rate at Selection" value={application.agreed_rate != null ? money(application.agreed_rate) : 'Not finalized'} />
                      <Detail label="Submitted On" value={dateTime(application.created_at)} />
                      <Detail label="Deliverable Deadline" value={date(application.deliverable_deadline)} />
                    </div>

                    <EvidenceBlock label="Creator Proposal" value={application.proposal} />
                    <EvidenceBlock label="Creator Message" value={application.message} />

                    <div style={subSectionStyle}>
                      <div style={subSectionTitleStyle}>Application Questions & Answers</div>
                      {application.application_answers?.length ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                          {application.application_answers.map((item, index) => (
                            <div key={`answer-${index}`} style={answerStyle}>
                              <div style={{ fontSize: 11, color: '#697586', marginBottom: 5 }}>{item.question}</div>
                              <div style={{ fontSize: 13, color: '#202938', whiteSpace: 'pre-wrap' }}>{item.answer || 'No answer provided'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState text="No application questions were recorded." />
                      )}
                    </div>

                    <div style={subSectionStyle}>
                      <div style={subSectionTitleStyle}>Submitted Portfolio / Work Proof</div>
                      {application.selected_portfolio?.length ? (
                        <div style={portfolioGridStyle}>
                          {application.selected_portfolio.map((item: any, index: number) => {
                            const url = item?.media_url || item?.url || item?.image_url;
                            const title = item?.title || item?.name || `Submitted work ${index + 1}`;
                            return (
                              <div key={`portfolio-${index}`} style={portfolioCardStyle}>
                                {url ? (
                                  <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                    <img src={url} alt={title} style={portfolioImageStyle} />
                                  </a>
                                ) : (
                                  <div style={portfolioPlaceholderStyle}><ImageIcon size={20} /></div>
                                )}
                                <div style={{ fontSize: 11, marginTop: 7, color: '#475467' }}>{title}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState text="No portfolio item was submitted with this application." />
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyState text="No application snapshot is available for this contract." />
                )}
              </AccordionSection>

              <AccordionSection
                id="payment"
                icon={<CreditCard size={18} />}
                title="Payment & CreatorHub Fee"
                subtitle="Separate record of the platform fee payment"
              >
                <div style={detailsGridStyle}>
                  <Detail label="Service Fee Rate" value={`${((contract.platform_fee_rate || 0.1) * 100).toFixed(0)}%`} />
                  <Detail label="Service Fee Amount" value={contract.platform_fee_amount != null ? money(contract.platform_fee_amount) : 'Not calculated'} />
                  <Detail label="Payment Status" value={contract.fee_paid ? 'PAID' : 'PENDING'} />
                  <Detail label="Payment Method" value={contract.payment_method || 'Not paid'} />
                  <Detail label="Payment Reference" value={contract.payment_reference || 'Not recorded'} />
                  <Detail label="Paid On" value={dateTime(contract.fee_paid_at)} />
                </div>

                <div style={paymentNoticeStyle}>
                  <ShieldCheck size={16} />
                  <span>
                    This section records the CreatorHub platform fee only. The creator's agreed compensation is shown under Contract Terms and is a separate obligation between the business and creator.
                  </span>
                </div>

                {contract.status === 'pending_payment' && isBusiness && (
                  <button onClick={() => setPaymentOpen(true)} style={primaryButton}>
                    <CreditCard size={15} style={{ marginRight: 7, verticalAlign: '-3px' }} />
                    Pay CreatorHub Fee
                  </button>
                )}
              </AccordionSection>

              <AccordionSection
                id="timeline"
                icon={<Clock3 size={18} />}
                title="Timeline & Record History"
                subtitle="When the collaboration record was created and finalized"
              >
                <div style={detailsGridStyle}>
                  <Detail label="Contract Created" value={dateTime(contract.created_at)} />
                  <Detail label="Last Updated" value={dateTime(contract.updated_at)} />
                  <Detail label="Snapshot Captured" value={dateTime(snapshot?.captured_at)} />
                  <Detail label="Final Terms Recorded" value={dateTime(finalTerms?.finalized_at)} />
                  <Detail label="Payment Recorded" value={dateTime(contract.fee_paid_at)} />
                  <Detail label="Current Status" value={contract.status.replace('_', ' ')} />
                </div>

                <div style={timelineStyle}>
                  <TimelineItem done label="Contract created" value={dateTime(contract.created_at)} />
                  <TimelineItem done={!!finalTerms || contract.status !== 'draft'} label="Terms finalized" value={finalTerms ? dateTime(finalTerms.finalized_at) : 'Not finalized yet'} />
                  <TimelineItem done={contract.fee_paid} label="CreatorHub fee paid" value={contract.fee_paid ? dateTime(contract.fee_paid_at) : 'Pending'} />
                  <TimelineItem done={contract.status === 'active' || contract.status === 'completed'} label="Contract activated" value={contract.status === 'active' || contract.status === 'completed' ? 'Active record' : 'Waiting for payment'} />
                </div>
              </AccordionSection>
            </div>

            {contract.status === 'draft' && isBusiness && (
              <section style={editorCardStyle}>
                <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>Finalize Contract Terms</h2>
                <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 16px' }}>
                  Enter the final compensation. Once finalized, the CreatorHub service fee is calculated and the contract moves to payment.
                </p>
                <Field label="Agreed rate (NPR)" value={rate} onChange={setRate} placeholder="e.g. 40000" />
                <Field label="Total contract value (NPR)" value={total} onChange={setTotal} placeholder="e.g. 240000" />
                <label style={labelStyle}>Terms note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} rows={3} placeholder="Add any final agreed terms…" />
                <button onClick={() => void saveTerms()} disabled={saving} style={primaryButton}>
                  {saving ? 'Saving…' : 'Save terms & continue'}
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {paymentOpen && contract && (
        <div role="dialog" aria-modal="true" style={modalBackdropStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 19 }}>Pay CreatorHub Fee</h2>
                <p style={{ margin: '5px 0 0', color: '#718096', fontSize: 12 }}>
                  Contract #CH-{String(contract.id).padStart(4, '0')}
                </p>
              </div>
              <button onClick={() => setPaymentOpen(false)} aria-label="Close payment dialog" style={closeButtonStyle}>×</button>
            </div>
            <DemoPaymentForm contract={contract} onCancel={() => setPaymentOpen(false)} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function AccordionSection({
  id,
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={accordionStyle}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`accordion-${id}`}
        style={accordionButtonStyle}
      >
        <span style={accordionIconStyle}>{icon}</span>
        <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#172033' }}>{title}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#7a8492', marginTop: 3 }}>{subtitle}</span>
        </span>
        <ChevronDown
          size={18}
          style={{
            color: '#667085',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .22s ease',
          }}
        />
      </button>

      <div
        id={`accordion-${id}`}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows .25s ease',
        }}
      >
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div style={{ borderTop: '1px solid #edf0f4', padding: open ? '20px 20px 22px' : '0 20px' }}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active' || status === 'completed';
  return (
    <span style={{ ...statusBadgeStyle, background: active ? '#e9f8ef' : '#fff4d8', color: active ? '#167345' : '#8b5e10' }}>
      <Check size={13} />
      {status === 'pending_payment' ? 'Awaiting payment' : status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function IdentityCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div style={identityCardStyle}>
      <div style={identityIconStyle}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#7a8492', marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#172033', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        <div style={{ fontSize: 10, color: '#98a2b3', marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#7a8492', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#202938', lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

function EvidenceBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={subSectionStyle}>
      <div style={subSectionTitleStyle}>{label}</div>
      <div style={{ fontSize: 13, color: '#344054', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}

function EvidenceList({ label, values }: { label: string; values?: string[] | null }) {
  if (!values?.length) return null;
  return (
    <div style={subSectionStyle}>
      <div style={subSectionTitleStyle}>{label}</div>
      <ul style={{ margin: 0, paddingLeft: 19, fontSize: 13, lineHeight: 1.7, color: '#344054' }}>
        {values.map((value, index) => <li key={`${label}-${index}`}>{value}</li>)}
      </ul>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: '12px 0', fontSize: 12, color: '#98a2b3' }}>{text}</div>;
}

function TimelineItem({ done, label, value }: { done: boolean; label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10, alignItems: 'start' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? '#e8f7ef' : '#f2f4f7', color: done ? '#167345' : '#98a2b3' }}>
        {done ? <Check size={12} /> : <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#98a2b3' }} />}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#98a2b3', marginTop: 3 }}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={labelStyle}>{label}</label>
      <input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function join(values?: string[] | null) {
  return values?.length ? values.join(', ') : 'Not specified';
}

const pageStyle: CSSProperties = { maxWidth: 1180, margin: '0 auto', paddingBottom: 50, color: '#17191d' };
const backLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, color: '#5b6472', textDecoration: 'none', fontSize: 12, marginBottom: 18 };
const errorStyle: CSSProperties = { padding: 12, marginBottom: 14, borderRadius: 9, background: '#fff0f0', color: '#a52828', fontSize: 12 };
const loadingStyle: CSSProperties = { padding: 50, textAlign: 'center', color: '#777' };
const heroStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 16 };
const eyebrowStyle: CSSProperties = { color: '#7a8492', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', marginBottom: 5 };
const titleStyle: CSSProperties = { fontSize: 25, lineHeight: 1.25, margin: 0, fontWeight: 700 };
const mutedStyle: CSSProperties = { color: '#7a8492', fontSize: 11, marginTop: 6 };
const statusBadgeStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 99, padding: '7px 11px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' };
const identityGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 };
const identityCardStyle: CSSProperties = { display: 'flex', gap: 11, alignItems: 'center', border: '1px solid #e7e9ed', borderRadius: 10, background: '#fff', padding: 14, minWidth: 0 };
const identityIconStyle: CSSProperties = { width: 34, height: 34, borderRadius: 9, background: '#f5f6fa', color: '#53657f', display: 'grid', placeItems: 'center', flexShrink: 0 };
const recordNoticeStyle: CSSProperties = { display: 'flex', gap: 11, alignItems: 'center', border: '1px solid #e4e8ef', borderRadius: 10, background: '#fbfcfe', padding: 12, marginTop: 10 };
const recordNoticeIconStyle: CSSProperties = { width: 31, height: 31, borderRadius: 8, background: '#eef5ff', color: '#46648c', display: 'grid', placeItems: 'center', flexShrink: 0 };
const accordionStyle: CSSProperties = { border: '1px solid #e4e7eb', borderRadius: 11, background: '#fff', overflow: 'hidden' };
const accordionButtonStyle: CSSProperties = { width: '100%', border: 0, background: '#fff', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' };
const accordionIconStyle: CSSProperties = { width: 34, height: 34, borderRadius: 8, background: '#f5f6fa', color: '#53657f', display: 'grid', placeItems: 'center', flexShrink: 0 };
const detailsGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '18px 30px' };
const subSectionStyle: CSSProperties = { marginTop: 20, paddingTop: 16, borderTop: '1px solid #edf0f4' };
const subSectionTitleStyle: CSSProperties = { fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 8 };
const answerStyle: CSSProperties = { padding: 11, borderRadius: 8, background: '#f8fafc', border: '1px solid #edf0f4' };
const portfolioGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 };
const portfolioCardStyle: CSSProperties = { minWidth: 0 };
const portfolioImageStyle: CSSProperties = { width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 8, border: '1px solid #e6e9ee', display: 'block' };
const portfolioPlaceholderStyle: CSSProperties = { width: '100%', aspectRatio: '4 / 3', borderRadius: 8, background: '#f4f5f7', color: '#98a2b3', display: 'grid', placeItems: 'center' };
const finalizedBoxStyle: CSSProperties = { marginTop: 20, padding: 13, borderRadius: 9, background: '#f7faf8', border: '1px solid #dcefe3' };
const paymentNoticeStyle: CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-start', padding: 12, marginTop: 20, borderRadius: 8, background: '#fbfcfe', color: '#667085', fontSize: 11, lineHeight: 1.55 };
const timelineStyle: CSSProperties = { display: 'grid', gap: 17, marginTop: 20, paddingLeft: 3 };
const editorCardStyle: CSSProperties = { border: '1px solid #e4e7eb', borderRadius: 11, padding: 20, background: '#fff', marginTop: 14 };
const labelStyle: CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, margin: '12px 0 6px' };
const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #d8dee8', borderRadius: 8, padding: '10px 11px', font: '400 12px Poppins,sans-serif', background: '#fff', color: '#111' };
const primaryButton: CSSProperties = { border: 0, borderRadius: 8, background: '#111827', color: '#fff', padding: '11px 15px', font: '600 12px Poppins,sans-serif', cursor: 'pointer', marginTop: 14 };
const modalBackdropStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(15,23,42,.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, overflowY: 'auto' };
const modalStyle: CSSProperties = { width: 'min(510px,100%)', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 24px 70px rgba(0,0,0,.22)' };
const closeButtonStyle: CSSProperties = { border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, width: 34, height: 34, cursor: 'pointer' };

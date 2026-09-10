import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, CreditCard, DollarSign, Loader2, MessageSquare, PackageCheck, Star, X } from 'lucide-react';
import { getCollabs, initiatePayment, rateCreator, type Collab } from '../../api/client';
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
  green: '#22C55E',
  greenSoft: '#EAFBF1',
};

function initials(name?: string | null) {
  if (!name) return 'C';
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export function WorkspaceActive() {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';
  const primary = isBusiness ? C.navy : C.coral;

  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<number | null>(null);

  const [ratingCollab, setRatingCollab] = useState<Collab | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const openRating = (collab: Collab) => {
    setRatingCollab(collab);
    setRatingScore(5);
    setRatingReview('');
    setRatingError('');
  };

  const submitRating = async () => {
    if (!ratingCollab) return;
    setRatingSubmitting(true);
    setRatingError('');
    try {
      await rateCreator(ratingCollab.id, ratingScore, ratingReview.trim() || undefined);
      setCollabs((prev) => prev.map((c) => (c.id === ratingCollab.id ? { ...c, rated: true } : c)));
      setRatingCollab(null);
    } catch (err: any) {
      console.error('Could not submit rating:', err);
      setRatingError(err?.response?.data?.detail || 'Could not submit your rating. Please try again.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  useEffect(() => {
    getCollabs()
      .then(setCollabs)
      .catch((err) => {
        console.error('Could not load collaborations:', err);
        setError('Could not load your active collaborations.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async (collab: Collab) => {
    if (collab.agreed_rate == null || !collab.rate_locked) {
      alert('Payment is available only after the final collaboration amount is agreed and locked.');
      return;
    }
    setPayingId(collab.id);
    try {
      const { payment_url } = await initiatePayment(collab.id);
      window.location.href = payment_url;
    } catch (err: any) {
      console.error('Could not start payment:', err);
      alert(err?.response?.data?.detail || 'Could not start the payment. Please try again.');
      setPayingId(null);
    }
  };

  return (
    <AppLayout
      title="Active Collabs"
      subtitle="Campaigns you're currently working on together."
      showSearch={false}
      showNotifications={false}
    >
      <style>{`
        .wa-content { padding: 28px 24px 40px; max-width: 900px; margin: 0 auto; }
        .wa-state { text-align: center; padding: 60px 20px; color: ${C.inkSoft}; font-size: 13px; }
        .wa-spin { animation: wa-spin 0.8s linear infinite; }
        @keyframes wa-spin { to { transform: rotate(360deg); } }

        .wa-card {
          background: ${C.card}; border: 1px solid ${C.line}; border-radius: 16px;
          padding: 18px 20px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        }
        .wa-avatar { width: 44px; height: 44px; border-radius: 50%; background: ${primary}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; flex-shrink: 0; object-fit: cover; }
        .wa-main { flex: 1; min-width: 180px; }
        .wa-title { font-size: 14.5px; font-weight: 700; color: ${C.ink}; }
        .wa-sub { font-size: 12.5px; color: ${C.inkSoft}; margin-top: 2px; }
        .wa-badge { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; background: ${C.greenSoft}; color: #1a8a4a; }
        .wa-rate { font-size: 12.5px; font-weight: 600; color: ${C.ink}; display: inline-flex; align-items: center; gap: 4px; }
        .wa-pending { font-size: 11.5px; font-weight: 700; color: #9a6b00; background: #fff4de; padding: 4px 10px; border-radius: 999px; }
        .wa-progress { display: flex; flex-direction: column; gap: 2px; font-size: 10.5px; color: ${C.inkSoft}; background: ${C.surface}; border-radius: 8px; padding: 6px 9px; }
        .wa-ready { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; background: #EAF8F0; color: #16834A; }
        .wa-pending-payment { font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 999px; background: #fff4de; color: #9a6b00; display: inline-flex; align-items: center; gap: 4px; }
        .wa-free { font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 999px; background: ${C.greenSoft}; color: #1a8a4a; display: inline-flex; align-items: center; gap: 4px; }

        .wa-links { display: flex; gap: 8px; }
        .wa-link { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.ink}; text-decoration: none; border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 12px; }
        .wa-link:hover { background: ${C.surface}; }
        .wa-paid { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; background: ${C.greenSoft}; color: #1a8a4a; display: inline-flex; align-items: center; gap: 4px; }
        .wa-pay-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: #fff; background: ${C.navy}; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
        .wa-pay-btn:disabled { opacity: 0.6; cursor: default; }
        .wa-rate-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: ${C.ink}; background: #fff; border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
        .wa-rated { font-size: 11.5px; font-weight: 700; color: #9a6b00; display: inline-flex; align-items: center; gap: 4px; }

        .wa-modal-backdrop { position: fixed; inset: 0; background: rgba(26,22,37,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .wa-modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 400px; }
        .wa-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .wa-modal-head h3 { font-size: 16px; font-weight: 700; color: ${C.ink}; margin: 0; }
        .wa-modal-close { border: none; background: transparent; cursor: pointer; color: ${C.inkSoft}; }
        .wa-stars { display: flex; gap: 6px; justify-content: center; margin: 10px 0 16px; }
        .wa-star-btn { border: none; background: transparent; cursor: pointer; padding: 2px; }
        .wa-modal-label { font-size: 12.5px; font-weight: 600; color: ${C.ink}; margin: 0 0 6px; display: block; }
        .wa-modal textarea { width: 100%; border: 1px solid ${C.line}; border-radius: 8px; padding: 10px 12px; font: 13px/1.5 -apple-system, sans-serif; color: ${C.ink}; resize: vertical; min-height: 70px; }
        .wa-modal-submit { width: 100%; margin-top: 16px; background: ${C.navy}; color: #fff; border: none; border-radius: 8px; padding: 11px; font-size: 13.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .wa-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .wa-modal-error { font-size: 12px; color: #d64545; margin-top: 8px; text-align: center; }
      `}</style>

      <div className="wa-content">
        {loading && <div className="wa-state"><Loader2 size={20} className="wa-spin" /></div>}
        {!loading && error && <div className="wa-state">{error}</div>}
        {!loading && !error && collabs.length === 0 && (
          <div className="wa-state">
            No active collaborations yet. {isBusiness ? 'Accept an application to get started.' : 'Once a business accepts your application, it will show up here.'}
          </div>
        )}

        {!loading && !error && collabs.map((collab) => {
          const name = isBusiness ? collab.creator_name : collab.business_name;
          const avatar = isBusiness ? collab.creator_avatar : collab.business_logo;
          return (
            <div className="wa-card" key={collab.id}>
              {avatar ? (
                <img className="wa-avatar" src={avatar} alt={name || ''} />
              ) : (
                <div className="wa-avatar">{initials(name)}</div>
              )}

              <div className="wa-main">
                <div className="wa-title">{collab.campaign_title || `Campaign #${collab.campaign_id}`}</div>
                <div className="wa-sub">with {name || 'your collaborator'}</div>
              </div>

              {collab.campaign_type !== 'gifted' && collab.agreed_rate != null && (
                <div className="wa-rate"><DollarSign size={13} /> Agreed: Rs. {collab.agreed_rate.toLocaleString()}</div>
              )}

              {collab.total_deliverables > 0 && (
                <div className="wa-progress">
                  <span>{collab.approved_deliverables}/{collab.total_deliverables} approved</span>
                  {collab.deliverable_deadline && <span>Due {new Date(collab.deliverable_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                </div>
              )}

              {collab.payment_status === 'released' ? (
                <span className="wa-paid">
                  <CreditCard size={12} /> Paid Rs. {collab.amount_paid?.toLocaleString()}
                </span>
              ) : isBusiness && collab.campaign_type !== 'gifted' ? (
                <span className={(collab.total_deliverables === 0 || collab.approved_deliverables === collab.total_deliverables) ? 'wa-ready' : 'wa-badge'}>
                  {(collab.total_deliverables === 0 || collab.approved_deliverables === collab.total_deliverables) ? 'Ready for payment' : 'Active'}
                </span>
              ) : (
                <span className="wa-badge">Active</span>
              )}

              {isBusiness && collab.campaign_type !== 'gifted' && !['funded','released'].includes(collab.payment_status || '') && (
                <button className="wa-pay-btn" onClick={() => handlePay(collab)} disabled={payingId === collab.id}>
                  <CreditCard size={13} /> {payingId === collab.id ? 'Starting…' : 'Secure payment'}
                </button>
              )}
              {isBusiness && collab.payment_status === 'funded' && <span className="wa-ready">🔒 Payment secured</span>}

              {!isBusiness && collab.campaign_type !== 'gifted' && !['funded','released'].includes(collab.payment_status || '') && (
                <span className="wa-pending-payment"><CreditCard size={12} /> Payment pending</span>
              )}

              {isBusiness && collab.campaign_type === 'gifted' && !['funded','released'].includes(collab.payment_status || '') && (
                <span className="wa-free"><CheckCircle2 size={12} /> No payment required</span>
              )}

              {isBusiness && collab.payment_status === 'released' && (
                collab.rated ? (
                  <span className="wa-rated"><Star size={13} fill={C.inkSoft} /> Rated</span>
                ) : (
                  <button className="wa-rate-btn" onClick={() => openRating(collab)}>
                    <Star size={13} /> Rate Creator
                  </button>
                )
              )}

              <div className="wa-links">
                <Link className="wa-link" to={`/workspace/messages?collab=${collab.id}`}>
                  <MessageSquare size={13} /> Messages
                </Link>
                <Link className="wa-link" to={`/workspace/calendar?collab=${collab.id}`}>
                  <Calendar size={13} /> Calendar
                </Link>
                <Link className="wa-link" to={`/workspace/deliverables?collab=${collab.id}`}>
                  <PackageCheck size={13} /> Deliverables
                </Link>
                <Link className="wa-link" to={`/campaigns/${collab.campaign_id}`}>
                  Campaign
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {ratingCollab && (
        <div className="wa-modal-backdrop" onClick={() => !ratingSubmitting && setRatingCollab(null)}>
          <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wa-modal-head">
              <h3>Rate {ratingCollab.creator_name || 'Creator'}</h3>
              <button className="wa-modal-close" onClick={() => setRatingCollab(null)} disabled={ratingSubmitting}>
                <X size={18} />
              </button>
            </div>

            <span className="wa-modal-label" style={{ textAlign: 'center' }}>How was this collaboration?</span>
            <div className="wa-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className="wa-star-btn" onClick={() => setRatingScore(n)} type="button">
                  <Star size={28} fill={n <= ratingScore ? '#FFB020' : 'none'} color={n <= ratingScore ? '#FFB020' : C.inkFaint} />
                </button>
              ))}
            </div>

            <label className="wa-modal-label" htmlFor="wa-review">Review (optional)</label>
            <textarea
              id="wa-review"
              placeholder="How was working with this creator?"
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
            />

            {ratingError && <div className="wa-modal-error">{ratingError}</div>}

            <button className="wa-modal-submit" onClick={submitRating} disabled={ratingSubmitting}>
              {ratingSubmitting ? <Loader2 size={15} className="wa-spin" /> : <Star size={15} />}
              {ratingSubmitting ? 'Submitting…' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default WorkspaceActive;

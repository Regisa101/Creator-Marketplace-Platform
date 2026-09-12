import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { verifyPayment, type Payment } from '../../api/client';
import { AppLayout } from '../../components/AppLayout';

const C = {
  surface: '#F5F4FA',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  line: '#EAE7F2',
  navy: '#1E2A78',
  green: '#22C55E',
  greenSoft: '#EAFBF1',
  red: '#E23D3D',
  redSoft: '#FDECEC',
};

// Khalti redirects here after the user pays (or cancels) on their end.
// We never trust the query string for the outcome — it's just enough
// to know *which* payment (pidx) to re-check server-side via /verify,
// which itself calls Khalti's lookup API before updating our record.
export function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const pidx = searchParams.get('pidx');

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pidx) {
      setError('Missing payment reference.');
      setLoading(false);
      return;
    }
    verifyPayment(pidx)
      .then(setPayment)
      .catch((err) => {
        console.error('Could not verify payment:', err);
        setError('Could not verify this payment. If money was deducted, it will still show up shortly.');
      })
      .finally(() => setLoading(false));
  }, [pidx]);

  const collabHref = payment ? `/workspace/active?collab=${payment.application_id}` : '/workspace/active';

  return (
    <AppLayout title="Payment" subtitle="" showSearch={false} showNotifications={false}>
      <style>{`
        .pr-wrap { max-width: 480px; margin: 60px auto; text-align: center; }
        .pr-card { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 16px; padding: 40px 28px; }
        .pr-title { font-size: 17px; font-weight: 700; color: ${C.ink}; margin: 14px 0 6px; }
        .pr-sub { font-size: 13.5px; color: ${C.inkSoft}; line-height: 1.5; }
        .pr-amount { font-size: 26px; font-weight: 800; color: ${C.ink}; margin: 14px 0; }
        .pr-btn { display: inline-block; margin-top: 22px; background: ${C.navy}; color: #fff; text-decoration: none; font-size: 13.5px; font-weight: 700; padding: 11px 22px; border-radius: 10px; }
        .pr-spin { animation: pr-spin 0.8s linear infinite; color: ${C.inkSoft}; }
        @keyframes pr-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="pr-wrap">
        <div className="pr-card">
          {loading && (
            <>
              <Loader2 size={32} className="pr-spin" />
              <div className="pr-title">Confirming your payment…</div>
              <div className="pr-sub">This only takes a moment.</div>
            </>
          )}

          {!loading && (error || !payment) && (
            <>
              <XCircle size={36} color={C.red} />
              <div className="pr-title">Couldn't confirm payment</div>
              <div className="pr-sub">{error || 'Something went wrong.'}</div>
              <Link className="pr-btn" to="/workspace/active" style={{ background: C.red }}>
                Back to Workspace
              </Link>
            </>
          )}

          {!loading && payment && (payment.status === 'funded' || payment.status === 'released') && (
            <>
              <CheckCircle2 size={36} color={C.green} />
              <div className="pr-title">Payment secured</div>
              <div className="pr-amount">Rs. {payment.amount.toLocaleString()}</div>
              <div className="pr-sub">Funds secured via Khalti · Ref {payment.transaction_id || payment.purchase_order_id}</div>
              <Link className="pr-btn" to={collabHref}>
                Back to Collaboration
              </Link>
            </>
          )}

          {!loading && payment && payment.status !== 'funded' && payment.status !== 'released' && (
            <>
              <XCircle size={36} color={C.red} />
              <div className="pr-title">
                {payment.status === 'failed' ? 'Payment failed or was canceled' : 'Payment still pending'}
              </div>
              <div className="pr-sub">
                {payment.status === 'failed'
                  ? "No money was deducted — you can try again from the collaboration."
                  : "We haven't received confirmation yet. Check back in a minute."}
              </div>
              <Link className="pr-btn" to={collabHref} style={{ background: payment.status === 'failed' ? C.red : C.navy }}>
                Back to Collaboration
              </Link>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default PaymentReturn;
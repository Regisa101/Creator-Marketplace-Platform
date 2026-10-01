import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Printer,
  RefreshCw,
  X,
} from 'lucide-react';

import {
  getContracts,
  verifyPayment,
  type Contract,
  type Payment,
} from '../api/client';
import { LogoMark } from '../components/Logo';

const npr = (value?: number | null) =>
  `NPR ${Number(value || 0).toLocaleString()}`;

function dateTime(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pidx = params.get('pidx');
  const khaltiStatus = (params.get('status') || '').toLowerCase();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pidx) {
      setError('We could not find a payment reference in this link.');
      return;
    }

    let cancelled = false;

    verifyPayment(pidx)
      .then((data) => {
        if (!cancelled) setPayment(data);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ||
              'We could not verify this payment. If money left your account, contact support with your Khalti receipt.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pidx]);

  // Once the payment is confirmed, look up the contract it belongs to so the
  // receipt can say which campaign and creator it was for.
  useEffect(() => {
    if (!payment?.application_id) return;
    let cancelled = false;

    getContracts()
      .then((list) => {
        if (cancelled) return;
        setContract(list.find((c) => c.application_id === payment.application_id) ?? null);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [payment?.application_id]);

  const success = !!payment && ['funded', 'completed'].includes(payment.status);
  const isFee = payment?.payment_type === 'platform_fee';
  const cancelled = !success && !error && !!payment && khaltiStatus.includes('cancel');

  const copyReference = async () => {
    const value = payment?.transaction_id || payment?.purchase_order_id;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard can be blocked; ignore */
    }
  };

  const loading = !payment && !error;

  return (
    <div className="pr-page">
      <style>{`
        .pr-page { min-height: 100vh; background: #f6f6f7; font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; display: flex; flex-direction: column; }
        .pr-top { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 22px 20px 0; font-weight: 600; font-size: 17px; letter-spacing: -.01em; }
        .pr-main { flex: 1; display: flex; align-items: flex-start; justify-content: center; padding: 28px 20px 56px; }
        .pr-card { width: min(600px, 100%); background: #fff; border: 1px solid #e6e6e8; border-radius: 20px; box-shadow: 0 18px 50px rgba(0,0,0,.06); overflow: hidden; }

        .pr-hero { padding: 38px 32px 28px; text-align: center; }
        .pr-badge { width: 76px; height: 76px; margin: 0 auto 18px; border-radius: 50%; display: grid; place-items: center; position: relative; }
        .pr-badge.ok { background: #e7f6ed; color: #1e8a4c; }
        .pr-badge.ok::after { content: ''; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid #1e8a4c; opacity: 0; animation: pr-ring 1.6s ease-out .25s 1; }
        .pr-badge.ok svg { animation: pr-pop .5s cubic-bezier(.2,1.4,.4,1) both; }
        .pr-badge.bad { background: #fbeeee; color: #ad2929; }
        .pr-badge.wait { background: #f2f2f3; color: #111; }
        @keyframes pr-pop { from { transform: scale(.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes pr-ring { 0% { transform: scale(.85); opacity: .5; } 100% { transform: scale(1.25); opacity: 0; } }
        .pr-spin { animation: pr-spin .9s linear infinite; }
        @keyframes pr-spin { to { transform: rotate(360deg); } }

        .pr-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #1e8a4c; }
        .pr-eyebrow.bad { color: #ad2929; }
        .pr-title { margin: 6px 0 0; font-size: 24px; font-weight: 600; letter-spacing: -.01em; }
        .pr-amount { margin-top: 14px; font-size: 38px; font-weight: 600; letter-spacing: -.02em; line-height: 1.1; }
        .pr-text { margin: 12px auto 0; max-width: 430px; font-size: 13.5px; line-height: 1.65; color: #666; }

        .pr-campaign { display: flex; align-items: center; gap: 14px; margin: 0 28px; padding: 14px; border: 1px solid #ececee; border-radius: 14px; background: #fafafa; }
        .pr-campaign-label { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #999; }
        .pr-campaign-title { margin-top: 2px; font-size: 14.5px; font-weight: 600; }
        .pr-campaign-sub { margin-top: 2px; font-size: 12px; color: #777; }

        .pr-receipt { margin: 22px 28px 0; }
        .pr-receipt h3 { margin: 0 0 8px; font-size: 10.5px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: #999; }
        .pr-row { display: flex; justify-content: space-between; gap: 18px; padding: 11px 0; border-bottom: 1px dashed #e4e4e7; font-size: 13px; color: #777; }
        .pr-row strong { color: #111; font-weight: 500; text-align: right; overflow-wrap: anywhere; display: inline-flex; align-items: center; gap: 8px; }
        .pr-row.total { border-bottom: 0; padding-top: 14px; color: #111; font-weight: 600; font-size: 14px; }
        .pr-row.total strong { font-weight: 600; font-size: 16px; }
        .pr-copy { border: 1px solid #e0e0e3; background: #fff; border-radius: 7px; height: 24px; padding: 0 8px; display: inline-flex; align-items: center; gap: 4px; font: 500 11px Poppins, sans-serif; color: #444; cursor: pointer; }
        .pr-copy:hover { background: #f5f5f6; }

        .pr-next { margin: 22px 28px 0; padding: 16px 18px; border-radius: 14px; background: #f6f6f7; }
        .pr-next h3 { margin: 0 0 10px; font-size: 12.5px; font-weight: 600; }
        .pr-next li { display: flex; gap: 10px; align-items: flex-start; font-size: 12.5px; line-height: 1.55; color: #555; list-style: none; padding: 3px 0; }
        .pr-next ul { margin: 0; padding: 0; }
        .pr-next .dot { flex: none; width: 18px; height: 18px; margin-top: 1px; border-radius: 50%; background: #111; color: #fff; display: grid; place-items: center; font-size: 10px; font-weight: 600; }
        .pr-next .dot.done { background: #1e8a4c; }

        .pr-actions { display: flex; flex-wrap: wrap; gap: 10px; padding: 24px 28px 28px; }
        .pr-btn { height: 46px; padding: 0 20px; border-radius: 11px; font: 600 13px Poppins, sans-serif; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; text-decoration: none; transition: background-color .15s ease, border-color .15s ease; }
        .pr-btn.primary { flex: 1 1 200px; background: #111; color: #fff; border: 1px solid #111; }
        .pr-btn.primary:hover { background: #000; }
        .pr-btn.secondary { flex: 1 1 140px; background: #fff; color: #111; border: 1px solid #dcdcdf; }
        .pr-btn.secondary:hover { background: #f5f5f6; border-color: #c4c4c8; }
        .pr-foot { padding: 0 28px 24px; text-align: center; font-size: 11.5px; color: #999; }
        .pr-foot button { border: 0; background: none; color: #555; font: 500 11.5px Poppins, sans-serif; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }

        @media (max-width: 520px) {
          .pr-hero { padding: 30px 20px 22px; }
          .pr-campaign, .pr-receipt, .pr-next { margin-left: 18px; margin-right: 18px; }
          .pr-actions { padding: 20px 18px 22px; }
          .pr-amount { font-size: 32px; }
        }

        @media print {
          .pr-page { background: #fff; }
          .pr-actions, .pr-foot, .pr-next { display: none !important; }
          .pr-card { box-shadow: none; border: 0; }
        }
      `}</style>

      <div className="pr-top">
        <LogoMark size={26} />
        creatorhub
      </div>

      <div className="pr-main">
        <div className="pr-card">
          {/* VERIFYING */}
          {loading && (
            <div className="pr-hero">
              <div className="pr-badge wait">
                <Loader2 size={32} className="pr-spin" />
              </div>
              <h1 className="pr-title">Confirming your payment…</h1>
              <p className="pr-text">
                We're checking with Khalti. This only takes a moment, please
                don't close or refresh this page.
              </p>
            </div>
          )}

          {/* COULD NOT VERIFY / NOT COMPLETED */}
          {!loading && !success && (
            <>
              <div className="pr-hero">
                <div className="pr-badge bad">
                  <X size={34} strokeWidth={2.5} />
                </div>
                <div className="pr-eyebrow bad">
                  {cancelled ? 'Payment cancelled' : 'Payment not completed'}
                </div>
                <h1 className="pr-title">
                  {error
                    ? 'We could not confirm this payment'
                    : cancelled
                      ? 'You cancelled the payment'
                      : 'The payment did not go through'}
                </h1>
                <p className="pr-text">
                  {error ||
                    'No money was taken for this contract. You can try again whenever you are ready.'}
                </p>
              </div>

              <div className="pr-actions">
                <Link className="pr-btn primary" to="/applications">
                  <RefreshCw size={15} /> Try payment again
                </Link>
                <button type="button" className="pr-btn secondary" onClick={() => navigate('/dashboard')}>
                  Back to dashboard
                </button>
              </div>
            </>
          )}

          {/* SUCCESS */}
          {success && payment && (
            <>
              <div className="pr-hero">
                <div className="pr-badge ok">
                  <Check size={38} strokeWidth={3} />
                </div>
                <div className="pr-eyebrow">Payment successful</div>
                <h1 className="pr-title">
                  {isFee ? 'Your contract is now active' : 'Selection confirmed'}
                </h1>
                <div className="pr-amount">{npr(payment.amount)}</div>
                <p className="pr-text">
                  {isFee
                    ? 'Your CreatorHub service fee was verified and the creator has been notified. You can now work together on the campaign.'
                    : 'Your payment was received. The campaign is closed and the creator has been notified.'}
                </p>
              </div>

              {contract && (
                <div className="pr-campaign">
                  <div style={{ minWidth: 0 }}>
                    <div className="pr-campaign-label">Campaign</div>
                    <div className="pr-campaign-title">
                      {contract.campaign_title || `Campaign #${contract.campaign_id}`}
                    </div>
                    <div className="pr-campaign-sub">
                      {contract.business_name || 'You'} × {contract.creator_name || 'Creator'}
                    </div>
                  </div>
                </div>
              )}

              <div className="pr-receipt">
                <h3>Receipt</h3>

                {contract && (
                  <div className="pr-row">
                    <span>Contract value</span>
                    <strong>{npr(contract.total_value)}</strong>
                  </div>
                )}
                <div className="pr-row">
                  <span>{isFee ? 'CreatorHub service fee' : 'Amount paid'}</span>
                  <strong>{npr(payment.amount)}</strong>
                </div>
                <div className="pr-row">
                  <span>Payment method</span>
                  <strong>{payment.method ? payment.method.charAt(0).toUpperCase() + payment.method.slice(1) : 'Khalti'}</strong>
                </div>
                <div className="pr-row">
                  <span>Paid on</span>
                  <strong>{dateTime(payment.paid_at || payment.created_at)}</strong>
                </div>
                <div className="pr-row">
                  <span>Transaction ID</span>
                  <strong>
                    {payment.transaction_id || payment.purchase_order_id}
                    <button type="button" className="pr-copy" onClick={() => void copyReference()}>
                      <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
                    </button>
                  </strong>
                </div>
                <div className="pr-row total">
                  <span>Total paid today</span>
                  <strong>{npr(payment.amount)}</strong>
                </div>
              </div>

              {isFee && (
                <div className="pr-next">
                  <h3>What happens next</h3>
                  <ul>
                    <li>
                      <span className="dot done"><Check size={10} strokeWidth={3} /></span>
                      The creator was notified and the contract is active.
                    </li>
                    <li>
                      <span className="dot">2</span>
                      Work together and arrange the creator's compensation directly.
                    </li>
                    <li>
                      <span className="dot">3</span>
                      Mark the collaboration complete once the work is delivered.
                    </li>
                  </ul>
                </div>
              )}

              <div className="pr-actions">
                {contract ? (
                  <Link className="pr-btn primary" to={`/contracts/${contract.id}`}>
                    View contract <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link className="pr-btn primary" to="/contracts">
                    View my collaborations <ArrowRight size={15} />
                  </Link>
                )}
                <button type="button" className="pr-btn secondary" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
                <button type="button" className="pr-btn secondary" onClick={() => window.print()}>
                  <Printer size={15} /> Print receipt
                </button>
              </div>

              <div className="pr-foot">
                A copy of this payment is saved in your collaboration history.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
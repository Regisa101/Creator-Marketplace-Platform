import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { completeDemoPayment, verifyPayment, type Payment } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/AppLayout';

const C = {
  bg: '#F6F5FA',
  card: '#FFFFFF',
  ink: '#141323',
  soft: '#6F6B7F',
  faint: '#A5A0B3',
  line: '#E7E4EE',
  navy: '#1E2A78',
  coral: '#FF6B5A',
  green: '#16834A',
  greenSoft: '#EAF8F0',
  red: '#D64545',
  redSoft: '#FDECEC',
};

export function DemoPayment() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const pidx = searchParams.get('pidx');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [method, setMethod] = useState<'wallet' | 'bank'>('wallet');
  const [payerName, setPayerName] = useState(user?.full_name || '');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (!pidx) {
      setError('Missing payment reference.');
      setLoading(false);
      return;
    }
    verifyPayment(pidx)
      .then((result) => {
        setPayment(result);
        if (result.status === 'completed') setDone(true);
      })
      .catch((err: any) => {
        console.error('Could not load payment:', err);
        setError(err?.response?.data?.detail || 'Could not load this payment.');
      })
      .finally(() => setLoading(false));
  }, [pidx]);

  const formattedDate = useMemo(
    () => payment?.created_at ? new Date(payment.created_at).toLocaleString() : '',
    [payment?.created_at],
  );

  const confirmPayment = async () => {
    if (!pidx) return;
    if (!payerName.trim()) {
      setError('Enter the payer name before confirming payment.');
      return;
    }
    setPaying(true);
    setError('');
    try {
      const result = await completeDemoPayment(pidx);
      setPayment(result);
      setDone(result.status === 'completed');
    } catch (err: any) {
      console.error('Could not complete payment:', err);
      setError(err?.response?.data?.detail || 'Could not complete this payment.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <AppLayout title="Payment" subtitle="Secure demo checkout — no real money is transferred." showSearch={false} showNotifications={false}>
      <style>{`
        .dp-shell{min-height:calc(100vh - 120px);background:${C.bg};padding:32px 26px 48px}.dp-max{max-width:1040px;margin:0 auto}
        .dp-back{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:${C.soft};font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;margin-bottom:18px}
        .dp-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(330px,.82fr);gap:22px;align-items:start}
        .dp-card{background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(20,19,35,.045)}
        .dp-left-head{padding:22px 24px;border-bottom:1px solid ${C.line}}.dp-eyebrow{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:${C.faint}}
        .dp-left-title{font-size:21px;font-weight:800;color:${C.ink};margin-top:6px}.dp-left-body{padding:20px 24px}.dp-row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0;border-bottom:1px solid #EEEAF2}.dp-row:last-of-type{border-bottom:0}
        .dp-label{font-size:12px;color:${C.soft}}.dp-value{font-size:12.5px;font-weight:750;color:${C.ink};text-align:right;word-break:break-word}.dp-total{margin-top:8px;padding-top:18px;border-top:1px solid ${C.line};display:flex;align-items:end;justify-content:space-between;gap:16px}.dp-total-label{font-size:12px;color:${C.soft}}.dp-total-value{font-size:28px;font-weight:850;color:${C.navy}}
        .dp-notice{margin-top:16px;border-radius:11px;padding:12px 13px;background:#F7F6FA;color:${C.soft};font-size:11.5px;line-height:1.55;display:flex;gap:9px}.dp-notice svg{flex:none;color:${C.navy}}
        .dp-pay{padding:23px}.dp-brand{display:flex;align-items:center;gap:10px}.dp-brandmark{width:36px;height:36px;border-radius:10px;background:${C.navy};color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:850}.dp-brandname{font-size:14px;font-weight:800;color:${C.ink}}.dp-brandsub{font-size:10.5px;color:${C.soft};margin-top:2px}.dp-pay-title{font-size:21px;font-weight:800;color:${C.ink};margin-top:22px}.dp-pay-copy{font-size:12px;line-height:1.6;color:${C.soft};margin-top:5px}
        .dp-method-label{font-size:11px;font-weight:750;color:${C.ink};margin:19px 0 8px}.dp-methods{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dp-method{border:1px solid ${C.line};background:#fff;border-radius:11px;min-height:44px;padding:0 11px;display:flex;align-items:center;gap:8px;color:${C.ink};font-size:11.5px;font-weight:750;cursor:pointer}.dp-method.active{border-color:${C.navy};background:#F3F5FF;box-shadow:0 0 0 1px ${C.navy} inset}.dp-method svg{color:${C.navy}}
        .dp-field-label{font-size:11px;font-weight:750;color:${C.ink};display:block;margin:15px 0 7px}.dp-input{width:100%;height:43px;border:1px solid #DCD8E5;border-radius:10px;padding:0 12px;font-size:12px;color:${C.ink};outline:none;background:#fff}.dp-input:focus{border-color:${C.navy};box-shadow:0 0 0 3px rgba(30,42,120,.08)}.dp-paybox{margin-top:14px;border:1px solid ${C.line};border-radius:11px;background:#FBFAFD;padding:11px 12px;display:flex;justify-content:space-between;gap:14px}.dp-paybox span{font-size:10.5px;color:${C.soft}}.dp-paybox strong{font-size:12.5px;color:${C.ink}}
        .dp-primary{width:100%;height:46px;border:0;border-radius:11px;background:${C.navy};color:#fff;font-size:12.5px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;margin-top:15px;box-shadow:0 8px 20px rgba(30,42,120,.16)}.dp-primary:disabled{opacity:.58;cursor:not-allowed}.dp-cancel{display:flex;justify-content:center;margin-top:13px;color:${C.soft};font-size:11px;text-decoration:none}.dp-secure{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:13px;color:${C.faint};font-size:10px}.dp-secure svg{color:${C.green}}
        .dp-error{margin-top:15px;padding:11px 12px;border-radius:10px;background:${C.redSoft};color:${C.red};font-size:11.5px;line-height:1.5;display:flex;gap:8px}.dp-error svg{flex:none}.dp-success{margin-top:18px;padding:12px;border-radius:10px;background:${C.greenSoft};color:${C.green};font-size:11.5px;line-height:1.5;display:flex;gap:8px}.dp-success svg{flex:none}.dp-success-title{font-size:25px;font-weight:850;color:${C.ink};margin-top:12px}.dp-success-amount{font-size:30px;font-weight:850;color:${C.navy};margin-top:8px}.dp-details{margin-top:18px;border:1px solid ${C.line};border-radius:12px;overflow:hidden}.dp-detail{display:flex;justify-content:space-between;gap:15px;padding:10px 12px;border-bottom:1px solid #EEEAF2;font-size:11px}.dp-detail:last-child{border-bottom:0}.dp-detail span{color:${C.soft}}.dp-detail strong{color:${C.ink};text-align:right}.dp-success-actions{display:flex;gap:8px;margin-top:18px}.dp-link{flex:1;height:42px;border-radius:10px;border:1px solid ${C.line};display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:11.5px;font-weight:750}.dp-link.primary{background:${C.navy};border-color:${C.navy};color:#fff}.dp-link.secondary{background:#fff;color:${C.ink}}
        .dp-spin{animation:dp-spin .8s linear infinite}@keyframes dp-spin{to{transform:rotate(360deg)}}
        @media(max-width:800px){.dp-grid{grid-template-columns:1fr}.dp-pay{order:1}.dp-left{order:2}}
      `}</style>
      <div className="dp-shell">
        <div className="dp-max">
          <Link to="/workspace/active" className="dp-back"><ArrowLeft size={14}/> Back to workspace</Link>
          {loading ? (
            <div className="dp-card" style={{padding:60,textAlign:'center',color:C.soft}}><Loader2 size={25} className="dp-spin"/><div style={{marginTop:10,fontSize:13}}>Loading payment…</div></div>
          ) : error && !payment ? (
            <div className="dp-card" style={{padding:28}}><div className="dp-eyebrow">Checkout</div><div className="dp-left-title">Payment unavailable</div><div className="dp-error"><XCircle size={17}/>{error}</div></div>
          ) : done && payment ? (
            <div className="dp-card" style={{maxWidth:720,margin:'0 auto',padding:28}}>
              <div className="dp-brand"><div className="dp-brandmark">N</div><div><div className="dp-brandname">Noodle Pay</div><div className="dp-brandsub">Creator marketplace payment</div></div></div>
              <div className="dp-success" style={{marginTop:24}}><CheckCircle2 size={18}/>Payment successfully recorded. The creator has been notified and their earnings have been updated.</div>
              <div className="dp-success-title">Payment successful</div><div className="dp-success-amount">Rs. {payment.amount.toLocaleString()}</div>
              <div className="dp-details">
                <div className="dp-detail"><span>Payment ID</span><strong>{payment.pidx || payment.purchase_order_id}</strong></div>
                <div className="dp-detail"><span>Transaction ID</span><strong>{payment.transaction_id || 'Pending local reference'}</strong></div>
                <div className="dp-detail"><span>Amount paid</span><strong>Rs. {payment.amount.toLocaleString()}</strong></div>
                <div className="dp-detail"><span>Payment method</span><strong>{payment.method === 'demo' ? 'Demo ' + (method === 'wallet' ? 'Wallet' : 'Bank') : payment.method}</strong></div>
                <div className="dp-detail"><span>Date</span><strong>{formattedDate}</strong></div>
              </div>
              <div className="dp-success-actions"><Link className="dp-link primary" to="/workspace/active">Back to workspace</Link><Link className="dp-link secondary" to="/workspace/history">View collab history</Link></div>
            </div>
          ) : payment ? (
            <div className="dp-grid">
              <section className="dp-card dp-left">
                <div className="dp-left-head"><div className="dp-eyebrow">Payment details</div><div className="dp-left-title">Creator payout</div></div>
                <div className="dp-left-body">
                  <div className="dp-row"><span className="dp-label">Purchase order</span><strong className="dp-value">{payment.purchase_order_id}</strong></div>
                  <div className="dp-row"><span className="dp-label">Status</span><strong className="dp-value">Awaiting payment</strong></div>
                  <div className="dp-row"><span className="dp-label">Currency</span><strong className="dp-value">NPR</strong></div>
                  <div className="dp-row"><span className="dp-label">Payment type</span><strong className="dp-value">Creator collaboration</strong></div>
                  <div className="dp-total"><span className="dp-total-label">Total payable</span><strong className="dp-total-value">Rs. {payment.amount.toLocaleString()}</strong></div>
                  <div className="dp-notice"><ShieldCheck size={16}/> This is a development checkout for your marketplace. Confirming it updates your local payment, earnings, notification, and collaboration records.</div>
                </div>
              </section>

              <section className="dp-card dp-pay">
                <div className="dp-brand"><div className="dp-brandmark">N</div><div><div className="dp-brandname">Noodle Pay</div><div className="dp-brandsub">Marketplace payment</div></div></div>
                <div className="dp-pay-title">Pay securely</div><div className="dp-pay-copy">Choose a demo payment method and confirm the amount below.</div>
                <div className="dp-method-label">Payment method</div>
                <div className="dp-methods">
                  <button className={`dp-method ${method === 'wallet' ? 'active' : ''}`} onClick={() => setMethod('wallet')} type="button"><WalletCards size={16}/> Noodle Wallet</button>
                  <button className={`dp-method ${method === 'bank' ? 'active' : ''}`} onClick={() => setMethod('bank')} type="button"><CreditCard size={16}/> Demo Bank</button>
                </div>
                <label className="dp-field-label" htmlFor="payer-name">Payer name</label><input id="payer-name" className="dp-input" value={payerName} onChange={(e)=>setPayerName(e.target.value)} placeholder="Enter payer name"/>
                <label className="dp-field-label" htmlFor="payment-ref">Reference note (optional)</label><input id="payment-ref" className="dp-input" value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="e.g. creator payout"/>
                <div className="dp-paybox"><span>You are paying</span><strong>Rs. {payment.amount.toLocaleString()}</strong></div>
                {error && <div className="dp-error"><XCircle size={17}/>{error}</div>}
                <button className="dp-primary" onClick={confirmPayment} disabled={paying}><LockKeyhole size={15}/>{paying ? 'Processing payment…' : 'Confirm payment'}</button>
                <Link className="dp-cancel" to="/workspace/active">Cancel payment</Link>
                <div className="dp-secure"><ShieldCheck size={13}/> Secure demo checkout · no real money transferred</div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}

export default DemoPayment;

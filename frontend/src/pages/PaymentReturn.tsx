import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPayment, type Payment } from '../api/client';

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pidx = params.get('pidx');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pidx) { setError('Missing payment reference.'); return; }
    let cancelled = false;
    verifyPayment(pidx)
      .then((data) => { if (!cancelled) setPayment(data); })
      .catch((err: any) => { if (!cancelled) setError(err?.response?.data?.detail || 'Could not verify this payment.'); });
    return () => { cancelled = true; };
  }, [pidx]);

  const success = !!payment && ['funded', 'completed'].includes(payment.status);

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#fafafa',padding:20,fontFamily:'Poppins,sans-serif'}}>
      <div style={{width:'min(460px,100%)',background:'#fff',border:'1px solid #e5e5e5',borderRadius:18,padding:35,textAlign:'center'}}>
        {!payment && !error && <><Loader2 size={30} className="spin"/><h2>Confirming payment…</h2></>}
        {error && <><XCircle size={40}/><h2>Payment could not be confirmed</h2><p>{error}</p></>}
        {success && <><CheckCircle2 size={42}/><h2>Selection confirmed</h2><p>NPR {Number(payment.amount).toLocaleString()} was received by Creatorhub. The campaign is closed and the creator has been notified.</p></>}
        {payment && !success && !error && <><XCircle size={40}/><h2>Payment was not completed</h2><p>Please return to your dashboard.</p></>}
        {(error || payment) && <button onClick={() => navigate('/dashboard')} style={{marginTop:20,height:40,padding:'0 18px',border:0,borderRadius:9,background:'#111',color:'#fff',font:'600 12px Poppins'}}>Back to dashboard</button>}
      </div>
    </div>
  );
}

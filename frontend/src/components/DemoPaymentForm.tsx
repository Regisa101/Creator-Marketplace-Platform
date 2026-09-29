import { useState } from 'react';
import { Loader2, ShieldCheck, CreditCard, Info } from 'lucide-react';
import { initiateContractFeeCheckout, type Contract } from '../api/client';

type Props = {
  contract: Contract;
  onSuccess?: (updated: Contract) => void;
  onCancel: () => void;
};

/** Hosted checkout selector. Card/wallet details are collected only by Khalti. */
export function DemoPaymentForm({ contract, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fee = Number(contract.platform_fee_amount || 0);
  const total = Number(contract.total_value || 0);

  const continueToPay = async () => {
    setError('');
    setBusy(true);
    try {
      const checkout = await initiateContractFeeCheckout(contract.id);

      // Demo mode: the backend completes the local payment immediately.
      // No Khalti page, wallet, PIN, OTP, or merchant credentials are needed.
      if (checkout.demo) {
        window.location.reload();
        return;
      }

      if (!checkout.payment_url) throw new Error('The payment provider did not return a checkout link.');
      window.location.assign(checkout.payment_url);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Could not start secure checkout.');
      setBusy(false);
    }
  };

  return (
    <div className="dp-wrap">
      <style>{`
        .dp-wrap{margin-top:12px;color:#111;font-family:Poppins,sans-serif}
        .dp-summary{border:1px solid #e3e7ed;border-radius:12px;overflow:hidden;margin-bottom:15px}
        .dp-summary-title{font-size:12px;font-weight:700;padding:13px 14px;border-bottom:1px solid #edf0f3}
        .dp-row{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;font-size:12px;color:#5e6673}
        .dp-row strong{color:#111;font-weight:600}
        .dp-total{border-top:1px solid #e6e9ed;background:#f8fafc;color:#111;font-weight:700;align-items:center}
        .dp-total strong{font-size:18px}
        .dp-info{display:flex;gap:10px;background:#f3f7fc;border:1px solid #e0e9f5;border-radius:10px;padding:12px;margin-bottom:15px;font-size:11px;line-height:1.6;color:#536174}
        .dp-info strong{display:block;color:#152238;font-size:12px;margin-bottom:2px}
        .dp-method{border:1px solid #d8dee8;border-radius:10px;padding:13px;display:flex;align-items:center;gap:11px;margin:8px 0 15px;background:#fff}
        .dp-method-icon{width:40px;height:40px;display:grid;place-items:center;background:#f3f5f8;border-radius:50%;flex:none}
        .dp-method-title{font-size:12px;font-weight:700}
        .dp-method-sub{font-size:10px;color:#778091;margin-top:3px;line-height:1.4}
        .dp-error{padding:10px 12px;background:#fff1f1;color:#ad2929;border:1px solid #f3d0d0;border-radius:9px;font-size:11px;margin-bottom:12px}
        .dp-pay{width:100%;height:44px;border:0;border-radius:9px;background:#111827;color:#fff;font:700 12px Poppins,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
        .dp-pay:disabled{opacity:.6;cursor:not-allowed}
        .dp-cancel{width:100%;height:40px;margin-top:8px;border:1px solid #d9dee7;border-radius:9px;background:#fff;color:#374151;font:600 12px Poppins,sans-serif;cursor:pointer}
        .dp-note{display:flex;gap:6px;justify-content:center;margin-top:11px;font-size:10px;color:#87909e;line-height:1.5;text-align:center}
        .dp-spin{animation:dp-spin .8s linear infinite}@keyframes dp-spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="dp-summary">
        <div className="dp-summary-title">Payment Summary</div>
        <div className="dp-row"><span>Total contract value</span><strong>NPR {total.toLocaleString()}</strong></div>
        <div className="dp-row"><span>CreatorHub service fee (10%)</span><strong>NPR {fee.toLocaleString()}</strong></div>
        <div className="dp-row dp-total"><span>Total amount due</span><strong>NPR {fee.toLocaleString()}</strong></div>
      </div>

      <div className="dp-info"><Info size={17} style={{ flex: 'none', marginTop: 1 }} /><div><strong>What is this payment for?</strong>This fee covers CreatorHub's platform service. Creator compensation is paid directly to the creator and is not included in this charge.</div></div>

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 7 }}>Choose a payment method</div>
      <div className="dp-method">
        <div className="dp-method-icon"><CreditCard size={20} /></div>
        <div><div className="dp-method-title">Demo payment</div><div className="dp-method-sub">For now, this is a local test payment. No real money is charged and no Khalti account is required.</div></div>
      </div>

      {error && <div className="dp-error">{error}</div>}
      <button type="button" className="dp-pay" disabled={busy || fee <= 0} onClick={() => void continueToPay()}>
        {busy ? <Loader2 size={15} className="dp-spin" /> : null}
        {busy ? 'Processing demo payment…' : `Pay Demo Fee · NPR ${fee.toLocaleString()}`}
      </button>
      <button type="button" className="dp-cancel" disabled={busy} onClick={onCancel}>Cancel</button>
      <div className="dp-note"><ShieldCheck size={13} style={{ flex: 'none' }} /> Demo payment is completed locally. The contract activates immediately for testing.</div>
    </div>
  );
}

export default DemoPaymentForm;

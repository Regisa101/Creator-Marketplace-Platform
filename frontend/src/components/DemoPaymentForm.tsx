import { useState } from 'react';
import { Loader2, Wallet, CreditCard, ShieldCheck } from 'lucide-react';
import { payContractFee, type Contract, type ContractPayFeeData } from '../api/client';

type Props = {
  contract: Contract;
  onSuccess: (updated: Contract) => void;
  onCancel: () => void;
};

export function DemoPaymentForm({ contract, onSuccess, onCancel }: Props) {
  const [method, setMethod] = useState<'wallet' | 'card'>('wallet');
  const [walletNumber, setWalletNumber] = useState('');
  const [walletPin, setWalletPin] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fee = Number(contract.platform_fee_amount || 0);

  const submit = async () => {
    setError('');

    if (method === 'wallet') {
      if (!/^\d{7,10}$/.test(walletNumber)) { setError('Enter a valid wallet/mobile number.'); return; }
      if (!/^\d{4,6}$/.test(walletPin)) { setError('Enter your PIN.'); return; }
    } else {
      if (!/^\d{12,19}$/.test(cardNumber.replace(/\s+/g, ''))) { setError('Enter a valid card number.'); return; }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) { setError('Expiry should be MM/YY.'); return; }
      if (!/^\d{3,4}$/.test(cardCvv)) { setError('Enter the CVV.'); return; }
      if (!cardHolder.trim()) { setError('Enter the cardholder name.'); return; }
    }

    const payload: ContractPayFeeData = method === 'wallet'
      ? { payment_method: 'wallet', wallet_number: walletNumber, wallet_pin: walletPin }
      : { payment_method: 'card', card_number: cardNumber.replace(/\s+/g, ''), card_expiry: cardExpiry, card_cvv: cardCvv, card_holder: cardHolder };

    setBusy(true);
    try {
      const updated = await payContractFee(contract.id, payload);
      onSuccess(updated);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Payment could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dp-wrap">
      <style>{`
        .dp-wrap{margin-top:10px}
        .dp-amount{background:#111;color:#fff;border-radius:12px;padding:16px;text-align:center;margin-bottom:16px}
        .dp-amount span{display:block;font:500 11px Poppins,sans-serif;opacity:.7;margin-bottom:4px}
        .dp-amount strong{font:700 24px Poppins,sans-serif}
        .dp-tabs{display:flex;gap:8px;margin-bottom:14px}
        .dp-tab{flex:1;height:38px;border-radius:9px;border:1px solid #ddd;background:#fff;font:600 12px Poppins,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:#555}
        .dp-tab.active{border-color:#111;background:#111;color:#fff}
        .dp-field{margin-bottom:10px}
        .dp-field label{display:block;font:600 11px Poppins,sans-serif;color:#444;margin-bottom:5px}
        .dp-field input{width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:9px;padding:10px 11px;outline:none;font:400 12px Poppins,sans-serif}
        .dp-field input:focus{border-color:#111}
        .dp-row{display:flex;gap:10px}
        .dp-error{padding:9px 11px;background:#f8eeee;color:#ad2929;border-radius:9px;font:500 11px Poppins,sans-serif;margin-bottom:10px}
        .dp-pay{width:100%;height:44px;border:0;border-radius:9px;background:#111;color:#fff;font:700 13px Poppins,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:6px}
        .dp-pay:disabled{opacity:.6;cursor:not-allowed}
        .dp-cancel{width:100%;height:38px;margin-top:8px;border:1px solid #ddd;border-radius:9px;background:#fff;color:#555;font:600 12px Poppins,sans-serif;cursor:pointer}
        .dp-note{margin-top:10px;font:400 10px/1.5 Poppins,sans-serif;color:#888;display:flex;gap:6px;align-items:flex-start}
        .dp-spin{animation:dp-spin .8s linear infinite}
        @keyframes dp-spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="dp-amount">
        <span>Platform service fee (10%)</span>
        <strong>NPR {fee.toLocaleString()}</strong>
      </div>

      <div className="dp-tabs">
        <button type="button" className={`dp-tab ${method === 'wallet' ? 'active' : ''}`} onClick={() => setMethod('wallet')}>
          <Wallet size={14} /> Wallet
        </button>
        <button type="button" className={`dp-tab ${method === 'card' ? 'active' : ''}`} onClick={() => setMethod('card')}>
          <CreditCard size={14} /> Card
        </button>
      </div>

      {error && <div className="dp-error">{error}</div>}

      {method === 'wallet' ? (
        <>
          <div className="dp-field">
            <label>Wallet / mobile number</label>
            <input value={walletNumber} onChange={e => setWalletNumber(e.target.value.replace(/\D/g, ''))} placeholder="98XXXXXXXX" maxLength={10} />
          </div>
          <div className="dp-field">
            <label>PIN</label>
            <input type="password" value={walletPin} onChange={e => setWalletPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" maxLength={6} />
          </div>
        </>
      ) : (
        <>
          <div className="dp-field">
            <label>Card number</label>
            <input value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/[^\d\s]/g, ''))} placeholder="4242 4242 4242 4242" maxLength={19} />
          </div>
          <div className="dp-row">
            <div className="dp-field" style={{ flex: 1 }}>
              <label>Expiry (MM/YY)</label>
              <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="09/28" maxLength={5} />
            </div>
            <div className="dp-field" style={{ flex: 1 }}>
              <label>CVV</label>
              <input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))} placeholder="123" maxLength={4} />
            </div>
          </div>
          <div className="dp-field">
            <label>Cardholder name</label>
            <input value={cardHolder} onChange={e => setCardHolder(e.target.value)} placeholder="As printed on card" />
          </div>
        </>
      )}

      <button type="button" className="dp-pay" disabled={busy} onClick={() => void submit()}>
        {busy ? <Loader2 size={16} className="dp-spin" /> : null}
        {busy ? 'Processing…' : `Pay NPR ${fee.toLocaleString()}`}
      </button>
      <button type="button" className="dp-cancel" disabled={busy} onClick={onCancel}>Cancel</button>

      <div className="dp-note">
        <ShieldCheck size={13} style={{ flex: 'none', marginTop: 1 }} />
        Demo payment — no real transaction is processed and no gateway (Khalti/eSewa/card network) is contacted.
      </div>
    </div>
  );
}

export default DemoPaymentForm;
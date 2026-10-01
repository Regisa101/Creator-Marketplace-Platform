import { useState } from 'react';
import { Check, Loader2, Lock, WalletCards } from 'lucide-react';
import {
  initiateContractFeeCheckout,
  type Contract,
} from '../api/client';

type Props = {
  contract: Contract;
  /** Shown as a "Cancel" button. Leave out to hide it (e.g. on the contract page). */
  onCancel?: () => void;
  /**
   * modal  = full summary (used in the Applications popup)
   * inline = just the method + pay button (the contract page already shows the numbers)
   */
  variant?: 'modal' | 'inline';
};

const npr = (value: number) => `NPR ${Number(value || 0).toLocaleString()}`;

export function KhaltiPaymentForm({
  contract,
  onCancel,
  variant = 'modal',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // What the creator is paid (arranged directly, never collected by CreatorHub).
  const contractValue = Number(contract.total_value || contract.agreed_rate || 0);
  // The only amount charged through Khalti.
  const fee = Number(contract.platform_fee_amount || 0);

  const pay = async () => {
    setError('');
    setBusy(true);

    try {
      const checkout = await initiateContractFeeCheckout(contract.id);

      if (!checkout.payment_url) {
        throw new Error('Khalti did not return a secure checkout link.');
      }

      // Khalti hosts the checkout. CreatorHub never sees the PIN or OTP.
      window.location.assign(checkout.payment_url);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Could not start Khalti checkout. Please try again.'
      );
      setBusy(false);
    }
  };

  return (
    <div className="kp">
      <style>{`
        .kp { font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; }

        .kp-due {
          margin-top: 18px;
          padding: 18px 20px;
          border-radius: 14px;
          background: #111;
          color: #fff;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }
        .kp-due-label { font-size: 11.5px; font-weight: 500; color: rgba(255,255,255,.7); }
        .kp-due-amount { margin-top: 4px; font-size: 30px; font-weight: 600; line-height: 1.1; letter-spacing: -.01em; }
        .kp-due-tag {
          flex: none;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,.14);
          font-size: 11px;
          font-weight: 500;
        }

        .kp-section { margin-top: 20px; }
        .kp-label {
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #888;
        }

        .kp-table { border: 1px solid #e8e8e8; border-radius: 12px; overflow: hidden; }
        .kp-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 14px;
          font-size: 13.5px;
          color: #666;
          border-bottom: 1px solid #f0f0f0;
        }
        .kp-line:last-child { border-bottom: 0; }
        .kp-line strong { color: #111; font-weight: 500; white-space: nowrap; }
        .kp-line.total { background: #fafafa; color: #111; font-weight: 600; }
        .kp-line.total strong { font-weight: 600; font-size: 15px; }
        .kp-line small { display: block; margin-top: 2px; font-size: 11.5px; color: #999; font-weight: 400; }

        .kp-method {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1.5px solid #111;
          border-radius: 12px;
          background: #fff;
        }
        .kp-method-icon {
          width: 38px; height: 38px; flex: none;
          border-radius: 10px;
          background: #f3f3f3;
          display: grid; place-items: center;
        }
        .kp-method-text { flex: 1; min-width: 0; }
        .kp-method-title { font-size: 14px; font-weight: 600; }
        .kp-method-sub { margin-top: 2px; font-size: 12px; color: #777; line-height: 1.45; }
        .kp-radio {
          width: 18px; height: 18px; flex: none;
          border-radius: 50%;
          background: #111; color: #fff;
          display: grid; place-items: center;
        }

        .kp-error {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 9px;
          background: #fbeeee;
          color: #ad2929;
          font-size: 12px;
          line-height: 1.5;
        }

        .kp-actions { display: flex; gap: 10px; margin-top: 20px; }
        .kp-btn {
          height: 48px;
          border-radius: 10px;
          font: 600 14px Poppins, sans-serif;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color .15s ease, border-color .15s ease, opacity .15s ease;
        }
        .kp-btn:disabled { opacity: .55; cursor: not-allowed; }
        .kp-btn-primary { flex: 1; border: 1px solid #111; background: #111; color: #fff; }
        .kp-btn-primary:hover:not(:disabled) { background: #000; }
        .kp-btn-secondary { padding: 0 20px; border: 1px solid #dcdcdc; background: #fff; color: #333; }
        .kp-btn-secondary:hover:not(:disabled) { background: #f5f5f5; border-color: #c4c4c4; }

        .kp-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 14px;
          font-size: 12px;
          line-height: 1.55;
          color: #888;
        }
        .kp-note svg { flex: none; margin-top: 2px; }

        .kp-spin { animation: kp-spin .8s linear infinite; }
        @keyframes kp-spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .kp-due { flex-direction: column; align-items: flex-start; }
          .kp-actions { flex-direction: column-reverse; }
          .kp-btn-secondary { padding: 0; }
        }
      `}</style>

      {variant === 'modal' && (
        <>
          <div className="kp-due">
            <div>
              <div className="kp-due-label">Amount due today</div>
              <div className="kp-due-amount">{npr(fee)}</div>
            </div>
            <span className="kp-due-tag">CreatorHub service fee</span>
          </div>

          <div className="kp-section">
            <div className="kp-label">Payment summary</div>
            <div className="kp-table">
              <div className="kp-line">
                <span>
                  Contract value
                  <small>Paid to the creator directly by you</small>
                </span>
                <strong>{npr(contractValue)}</strong>
              </div>
              <div className="kp-line">
                <span>CreatorHub service fee (10%)</span>
                <strong>{npr(fee)}</strong>
              </div>
              <div className="kp-line total">
                <span>Total due now</span>
                <strong>{npr(fee)}</strong>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="kp-section" style={variant === 'inline' ? { marginTop: 0 } : undefined}>
        <div className="kp-label">Payment method</div>
        <div className="kp-method">
          <span className="kp-method-icon">
            <WalletCards size={19} />
          </span>
          <span className="kp-method-text">
            <div className="kp-method-title">Khalti</div>
            <div className="kp-method-sub">
              You'll be redirected to Khalti to complete the payment.
            </div>
          </span>
          <span className="kp-radio">
            <Check size={11} />
          </span>
        </div>
      </div>

      {error && <div className="kp-error">{error}</div>}

      <div className="kp-actions">
        {onCancel && (
          <button
            type="button"
            className="kp-btn kp-btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className="kp-btn kp-btn-primary"
          onClick={() => void pay()}
          disabled={busy || fee <= 0}
        >
          {busy ? (
            <>
              <Loader2 size={16} className="kp-spin" />
              Opening Khalti…
            </>
          ) : (
            `Pay ${npr(fee)} with Khalti`
          )}
        </button>
      </div>

      <div className="kp-note">
        <Lock size={12} />
        <span>
          Payment details are entered on Khalti's secure page. CreatorHub never
          sees or stores your PIN or OTP. Only the service fee is charged here;
          you and the creator handle their compensation directly.
        </span>
      </div>
    </div>
  );
}

export default KhaltiPaymentForm;
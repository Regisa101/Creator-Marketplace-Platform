
import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import {
  initiateContractFeeCheckout,
  type Contract,
} from '../api/client';

type Props = {
  contract: Contract;
  onCancel: () => void;
};

export function KhaltiPaymentForm({ contract, onCancel }: Props) {
  const [step, setStep] = useState<'review' | 'method' | 'redirecting'>(
    'review'
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Creator's agreed payment.
  // CreatorHub does NOT collect this amount.
  const creatorAmount = Number(
    contract.agreed_rate || contract.total_value || 0
  );

  // Only this amount is paid to CreatorHub through Khalti.
  const fee = Number(contract.platform_fee_amount || 0);

  const continueToKhalti = async () => {
    setError('');
    setBusy(true);
    setStep('redirecting');

    try {
      const checkout = await initiateContractFeeCheckout(contract.id);

      if (!checkout.payment_url) {
        throw new Error(
          'Khalti did not return a secure checkout link.'
        );
      }

      // Redirect the user to Khalti's hosted checkout.
      // CreatorHub never receives the user's Khalti PIN or OTP.
      window.location.assign(checkout.payment_url);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Could not start Khalti checkout.'
      );

      setBusy(false);
      setStep('method');
    }
  };

  return (
    <div className="kp-wrap">
      <style>{`
        .kp-wrap {
          margin-top: 12px;
          color: #111;
          font-family: Poppins, sans-serif;
        }

        .kp-steps {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 18px;
        }

        .kp-step {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 600;
          color: #9a9a9a;
        }

        .kp-step.active {
          color: #111;
        }

        .kp-step.done {
          color: #287b4b;
        }

        .kp-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid #ddd;
          font-size: 10px;
        }

        .kp-step.active .kp-dot {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .kp-step.done .kp-dot {
          background: #eaf6ee;
          color: #287b4b;
          border-color: #cfe9d9;
        }

        .kp-line {
          height: 1px;
          background: #e5e5e5;
          flex: 1;
          max-width: 45px;
        }

        .kp-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .kp-sub {
          font-size: 11px;
          color: #777;
          line-height: 1.5;
          margin-bottom: 18px;
        }

        .kp-summary {
          border: 1px solid #e3e3e3;
          border-radius: 13px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .kp-summary-title {
          font-size: 12px;
          font-weight: 700;
          padding: 13px 14px;
          border-bottom: 1px solid #eee;
        }

        .kp-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 14px;
          font-size: 12px;
          color: #666;
        }

        .kp-row strong {
          color: #111;
          font-weight: 600;
        }

        .kp-total {
          border-top: 1px solid #e6e6e6;
          background: #f7f7f7;
          color: #111;
          font-weight: 700;
        }

        .kp-total strong {
          font-size: 16px;
        }

        .kp-info {
          display: flex;
          gap: 9px;
          background: #f7f7f7;
          border: 1px solid #e7e7e7;
          border-radius: 10px;
          padding: 11px;
          margin-bottom: 16px;
          font-size: 10.5px;
          line-height: 1.55;
          color: #666;
        }

        .kp-info strong {
          display: block;
          color: #222;
          font-size: 11px;
          margin-bottom: 2px;
        }

        .kp-method {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #111;
          border-radius: 12px;
          background: #fff;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          cursor: pointer;
        }

        .kp-method-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: #f3f3f3;
          display: grid;
          place-items: center;
          flex: none;
        }

        .kp-method-title {
          display: block;
          font-size: 12px;
          font-weight: 700;
        }

        .kp-method-sub {
          display: block;
          font-size: 10.5px;
          color: #777;
          line-height: 1.45;
          margin-top: 3px;
        }

        .kp-check {
          margin-left: auto;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #111;
          color: #fff;
          display: grid;
          place-items: center;
          flex: none;
        }

        .kp-error {
          padding: 10px 12px;
          background: #fff1f1;
          color: #ad2929;
          border: 1px solid #f0d1d1;
          border-radius: 9px;
          font-size: 11px;
          line-height: 1.45;
          margin: 12px 0;
        }

        .kp-primary {
          width: 100%;
          height: 43px;
          border: 0;
          border-radius: 9px;
          background: #111;
          color: #fff;
          font: 700 12px Poppins, sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .kp-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .kp-secondary {
          width: 100%;
          height: 40px;
          margin-top: 8px;
          border: 1px solid #ddd;
          border-radius: 9px;
          background: #fff;
          color: #555;
          font: 600 12px Poppins, sans-serif;
          cursor: pointer;
        }

        .kp-back {
          border: 0;
          background: none;
          padding: 0;
          color: #666;
          font: 600 11px Poppins, sans-serif;
          cursor: pointer;
          margin-bottom: 13px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .kp-note {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-top: 11px;
          font-size: 10px;
          color: #8a8a8a;
          line-height: 1.45;
          text-align: center;
        }

        .kp-redirect {
          padding: 25px 10px;
          text-align: center;
        }

        .kp-redirect-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f2f2f2;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
        }

        .kp-spin {
          animation: kp-spin 0.8s linear infinite;
        }

        @keyframes kp-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* PAYMENT PROGRESS */}
      <div className="kp-steps" aria-label="Payment progress">
        <div
          className={`kp-step ${
            step === 'review' ? 'active' : 'done'
          }`}
        >
          <span className="kp-dot">
            {step === 'review' ? '1' : '✓'}
          </span>
          Review
        </div>

        <div className="kp-line" />

        <div
          className={`kp-step ${
            step === 'method'
              ? 'active'
              : step === 'redirecting'
              ? 'done'
              : ''
          }`}
        >
          <span className="kp-dot">
            {step === 'redirecting' ? '✓' : '2'}
          </span>
          Payment
        </div>

        <div className="kp-line" />

        <div
          className={`kp-step ${
            step === 'redirecting' ? 'active' : ''
          }`}
        >
          <span className="kp-dot">3</span>
          Khalti
        </div>
      </div>

      {/* STEP 1 */}
      {step === 'review' && (
        <>
          <div className="kp-title">Review payment</div>

          <div className="kp-sub">
            Confirm the CreatorHub service fee before choosing
            your payment method.
          </div>

          <div className="kp-summary">
            <div className="kp-summary-title">
              Payment summary
            </div>

            <div className="kp-row">
              <span>Agreed creator compensation</span>

              <strong>
                NPR {creatorAmount.toLocaleString()}
              </strong>
            </div>

            <div className="kp-row">
              <span>CreatorHub service fee (10%)</span>

              <strong>
                NPR {fee.toLocaleString()}
              </strong>
            </div>

            <div className="kp-row kp-total">
              <span>Amount charged by CreatorHub</span>

              <strong>
                NPR {fee.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="kp-info">
            <Info
              size={16}
              style={{
                flex: 'none',
                marginTop: 1,
              }}
            />

            <div>
              <strong>What happens next?</strong>

              The CreatorHub service fee is paid now.
              The creator's agreed compensation is recorded
              in the contract. CreatorHub does not hold,
              transfer, or release the creator's payment.
              The brand and creator handle that payment
              directly.
            </div>
          </div>

          <button
            className="kp-primary"
            disabled={fee <= 0}
            onClick={() => setStep('method')}
          >
            Continue to payment
          </button>

          <button
            className="kp-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </>
      )}

      {/* STEP 2 */}
      {step === 'method' && (
        <>
          <button
            className="kp-back"
            onClick={() => setStep('review')}
          >
            <ArrowLeft size={13} />
            Back
          </button>

          <div className="kp-title">
            Choose payment method
          </div>

          <div className="kp-sub">
            Select how you want to pay the CreatorHub service
            fee.
          </div>

          <button
            type="button"
            className="kp-method"
            onClick={() => void continueToKhalti()}
          >
            <span className="kp-method-icon">
              <WalletCards size={21} />
            </span>

            <span>
              <span className="kp-method-title">
                Khalti
              </span>

              <span className="kp-method-sub">
                You will be redirected to Khalti's secure
                checkout to complete the payment.
              </span>
            </span>

            <span className="kp-check">
              <CheckCircle2 size={12} />
            </span>
          </button>

          {error && (
            <div className="kp-error">
              {error}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              className="kp-primary"
              disabled={busy || fee <= 0}
              onClick={() => void continueToKhalti()}
            >
              {busy && (
                <Loader2
                  size={15}
                  className="kp-spin"
                />
              )}

              {busy
                ? 'Opening Khalti…'
                : `Continue with Khalti · NPR ${fee.toLocaleString()}`}
            </button>

            <button
              className="kp-secondary"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>

          <div className="kp-note">
            <ShieldCheck
              size={13}
              style={{ flex: 'none' }}
            />

            Payment details are entered securely on Khalti.
            CreatorHub does not store your Khalti PIN or OTP.
          </div>
        </>
      )}

      {/* STEP 3 */}
      {step === 'redirecting' && (
        <>
          <div className="kp-redirect">
            <div className="kp-redirect-icon">
              <Loader2
                size={24}
                className="kp-spin"
              />
            </div>

            <div className="kp-title">
              Opening Khalti
            </div>

            <div className="kp-sub">
              Taking you to Khalti's secure checkout.
              Please don't close this window.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default KhaltiPaymentForm;


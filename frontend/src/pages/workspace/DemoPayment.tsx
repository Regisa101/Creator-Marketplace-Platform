import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

import {
  completeDemoPayment,
  verifyPayment,
  type Payment,
} from "../../api/client";

import { useAuth } from "../../context/AuthContext";
import { AppLayout } from "../../components/AppLayout";

/* =========================================================
   CREATORHUB PAYMENT COLORS
   ========================================================= */

const C = {
  bg: "#F6F5FA",
  card: "#FFFFFF",
  ink: "#141323",
  soft: "#6F6B7F",
  faint: "#A5A0B3",
  line: "#E7E4EE",

  purple: "#7661A1",
  purpleSoft: "#F3F0F8",

  green: "#16834A",
  greenSoft: "#EAF8F0",

  red: "#D64545",
  redSoft: "#FDECEC",
};

/*
 * This is the platform funding account.
 *
 * IMPORTANT:
 * It is intentionally NOT an input.
 * The business cannot change it during campaign funding.
 */
const CREATORHUB_FUNDING_ACCOUNT = "Creatorhub";

/* =========================================================
   COMPONENT
   ========================================================= */

export function DemoPayment() {
  const { user } = useAuth();

  const [searchParams] = useSearchParams();

  const pidx = searchParams.get("pidx");

  const [payment, setPayment] = useState<Payment | null>(null);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [error, setError] = useState("");

  const [done, setDone] = useState(false);

  const [method, setMethod] = useState<"wallet" | "bank">(
    "wallet"
  );

  const [reference, setReference] = useState("");

  /*
   * The funding account is fixed to Creatorhub.
   *
   * Do NOT make this user editable.
   */
  const fundingAccountNumber =
    CREATORHUB_FUNDING_ACCOUNT;

  /* =======================================================
     LOAD PAYMENT
     ======================================================= */

  useEffect(() => {
    if (!pidx) {
      setError("Missing payment reference.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    verifyPayment(pidx)
      .then((result) => {
        if (cancelled) return;

        setPayment(result);

        if (
          result.status === "funded" ||
          result.status === "released"
        ) {
          setDone(true);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;

        console.error(
          "Could not load payment:",
          err
        );

        setError(
          err?.response?.data?.detail ||
            "Could not load this payment."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pidx]);

  /* =======================================================
     FORMATTED DATE
     ======================================================= */

  const formattedDate = useMemo(() => {
    if (!payment?.created_at) {
      return "";
    }

    return new Date(
      payment.created_at
    ).toLocaleString();
  }, [payment?.created_at]);

  /* =======================================================
     PAYMENT TYPE
     ======================================================= */

  const isCampaignFunding =
    payment?.payment_type === "campaign_funding";

  /* =======================================================
     CONFIRM PAYMENT
     ======================================================= */

  const confirmPayment = async () => {
    if (!pidx) {
      return;
    }

    /*
     * Campaign funding always uses Creatorhub's
     * fixed funding account.
     */
    if (
      isCampaignFunding &&
      !fundingAccountNumber.trim()
    ) {
      setError(
        "Creatorhub funding account is unavailable."
      );

      return;
    }

    setPaying(true);
    setError("");

    try {
      const result =
        await completeDemoPayment(
          pidx,
          isCampaignFunding
            ? {
                method: "demo_wallet",

                /*
                 * Backend receives Creatorhub as the
                 * fixed platform funding account.
                 */
                funding_account_number:
                  fundingAccountNumber,

                reference_note:
                  reference.trim(),
              }
            : undefined
        );

      setPayment(result);

      setDone(
        result.status === "funded" ||
          result.status === "released"
      );
    } catch (err: any) {
      console.error(
        "Could not complete payment:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Could not complete this payment."
      );
    } finally {
      setPaying(false);
    }
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <AppLayout
      title="Payment"
      subtitle="Secure demo checkout — no real money is transferred."
      showSearch={false}
      showNotifications={false}
    >
      <style>{`

        /* =====================================================
           PAGE
           ===================================================== */

        .dp-shell {
          min-height: calc(100vh - 120px);
          background: ${C.bg};
          padding: 32px 26px 48px;
        }

        .dp-max {
          max-width: 1040px;
          margin: 0 auto;
        }

        /* =====================================================
           BACK
           ===================================================== */

        .dp-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          border: 0;
          background: transparent;

          color: ${C.soft};

          font-size: 12px;
          font-weight: 700;

          cursor: pointer;
          text-decoration: none;

          margin-bottom: 18px;
        }

        .dp-back:hover {
          color: ${C.purple};
        }

        /* =====================================================
           GRID
           ===================================================== */

        .dp-grid {
          display: grid;

          grid-template-columns:
            minmax(0, 1.18fr)
            minmax(330px, 0.82fr);

          gap: 22px;

          align-items: start;
        }

        /* =====================================================
           CARD
           ===================================================== */

        .dp-card {
          background: ${C.card};

          border: 1px solid ${C.line};

          border-radius: 20px;

          overflow: hidden;

          box-shadow:
            0 12px 32px
            rgba(20, 19, 35, 0.045);
        }

        /* =====================================================
           LEFT PAYMENT DETAILS
           ===================================================== */

        .dp-left-head {
          padding: 22px 24px;

          border-bottom:
            1px solid ${C.line};
        }

        .dp-eyebrow {
          font-size: 10px;

          letter-spacing: 0.12em;

          text-transform: uppercase;

          font-weight: 800;

          color: ${C.faint};
        }

        .dp-left-title {
          font-size: 21px;

          font-weight: 800;

          color: ${C.ink};

          margin-top: 6px;
        }

        .dp-left-body {
          padding: 20px 24px;
        }

        .dp-row {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          padding: 14px 0;

          border-bottom:
            1px solid #EEEAF2;
        }

        .dp-row:last-of-type {
          border-bottom: 0;
        }

        .dp-label {
          font-size: 12px;

          color: ${C.soft};
        }

        .dp-value {
          font-size: 12.5px;

          font-weight: 750;

          color: ${C.ink};

          text-align: right;

          word-break: break-word;
        }

        /* =====================================================
           TOTAL
           ===================================================== */

        .dp-total {
          margin-top: 8px;

          padding-top: 18px;

          border-top:
            1px solid ${C.line};

          display: flex;

          align-items: flex-end;

          justify-content: space-between;

          gap: 16px;
        }

        .dp-total-label {
          font-size: 12px;

          color: ${C.soft};
        }

        .dp-total-value {
          font-size: 28px;

          font-weight: 850;

          color: ${C.purple};
        }

        /* =====================================================
           NOTICE
           ===================================================== */

        .dp-notice {
          margin-top: 16px;

          border-radius: 11px;

          padding: 12px 13px;

          background: #F7F6FA;

          color: ${C.soft};

          font-size: 11.5px;

          line-height: 1.55;

          display: flex;

          gap: 9px;
        }

        .dp-notice svg {
          flex: none;

          color: ${C.purple};
        }

        /* =====================================================
           PAYMENT CARD
           ===================================================== */

        .dp-pay {
          padding: 23px;
        }

        /* =====================================================
           CREATORHUB BRAND
           ===================================================== */

        .dp-brand {
          display: flex;

          align-items: center;

          gap: 10px;
        }

        .dp-brandmark {
          width: 36px;
          height: 36px;

          border-radius: 10px;

          background: ${C.purple};

          color: #FFFFFF;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 15px;

          font-weight: 850;
        }

        .dp-brandname {
          font-size: 14px;

          font-weight: 800;

          color: ${C.ink};
        }

        .dp-brandsub {
          font-size: 10.5px;

          color: ${C.soft};

          margin-top: 2px;
        }

        /* =====================================================
           TITLE
           ===================================================== */

        .dp-pay-title {
          font-size: 21px;

          font-weight: 800;

          color: ${C.ink};

          margin-top: 22px;
        }

        .dp-pay-copy {
          font-size: 12px;

          line-height: 1.6;

          color: ${C.soft};

          margin-top: 5px;
        }

        /* =====================================================
           PAYMENT METHODS
           ===================================================== */

        .dp-method-label {
          font-size: 11px;

          font-weight: 750;

          color: ${C.ink};

          margin: 19px 0 8px;
        }

        .dp-methods {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 8px;
        }

        .dp-methods-single {
          grid-template-columns: 1fr;
        }

        .dp-method {
          border:
            1px solid ${C.line};

          background: #FFFFFF;

          border-radius: 11px;

          min-height: 44px;

          padding: 0 11px;

          display: flex;

          align-items: center;

          gap: 8px;

          color: ${C.ink};

          font-size: 11.5px;

          font-weight: 750;

          cursor: pointer;
        }

        .dp-method.active {
          border-color: ${C.purple};

          background: ${C.purpleSoft};

          box-shadow:
            0 0 0 1px
            ${C.purple}
            inset;
        }

        .dp-method svg {
          color: ${C.purple};
        }

        /* =====================================================
           FIELD
           ===================================================== */

        .dp-field-label {
          font-size: 11px;

          font-weight: 750;

          color: ${C.ink};

          display: block;

          margin: 15px 0 7px;
        }

        .dp-field-help {
          font-size: 10px;

          line-height: 1.5;

          color: ${C.faint};

          margin-top: 6px;
        }

        /* =====================================================
           READ ONLY ACCOUNT
           ===================================================== */

        .dp-readonly-account {
          min-height: 43px;

          box-sizing: border-box;

          padding: 10px 11px;

          border:
            1px solid #DCD7E8;

          border-radius: 9px;

          background: #F7F6FA;

          color: ${C.ink};

          font-size: 12px;

          font-weight: 750;

          display: flex;

          align-items: center;
        }

        .dp-readonly-account.platform-account {
          color: ${C.purple};

          background: ${C.purpleSoft};

          border-color: #D8CDE7;

          letter-spacing: 0.02em;
        }

        /* =====================================================
           INPUT
           ===================================================== */

        .dp-input {
          width: 100%;

          height: 43px;

          border:
            1px solid #DCD8E5;

          border-radius: 10px;

          padding: 0 12px;

          font-size: 12px;

          color: ${C.ink};

          outline: none;

          background: #FFFFFF;
        }

        .dp-input:focus {
          border-color: ${C.purple};

          box-shadow:
            0 0 0 3px
            rgba(118, 97, 161, 0.10);
        }

        /* =====================================================
           PAY BOX
           ===================================================== */

        .dp-paybox {
          margin-top: 14px;

          border:
            1px solid ${C.line};

          border-radius: 11px;

          background: #FBFAFD;

          padding: 11px 12px;

          display: flex;

          justify-content: space-between;

          gap: 14px;
        }

        .dp-paybox span {
          font-size: 10.5px;

          color: ${C.soft};
        }

        .dp-paybox strong {
          font-size: 12.5px;

          color: ${C.ink};
        }

        /* =====================================================
           PRIMARY BUTTON
           ===================================================== */

        .dp-primary {
          width: 100%;

          height: 46px;

          border: 0;

          border-radius: 11px;

          background: ${C.purple};

          color: #FFFFFF;

          font-size: 12.5px;

          font-weight: 800;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 7px;

          cursor: pointer;

          margin-top: 15px;

          box-shadow:
            0 8px 20px
            rgba(118, 97, 161, 0.16);
        }

        .dp-primary:hover:not(:disabled) {
          background: #685391;
        }

        .dp-primary:disabled {
          opacity: 0.58;

          cursor: not-allowed;
        }

        /* =====================================================
           CANCEL
           ===================================================== */

        .dp-cancel {
          display: flex;

          justify-content: center;

          margin-top: 13px;

          color: ${C.soft};

          font-size: 11px;

          text-decoration: none;
        }

        .dp-cancel:hover {
          color: ${C.purple};
        }

        /* =====================================================
           SECURE MESSAGE
           ===================================================== */

        .dp-secure {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 6px;

          margin-top: 13px;

          color: ${C.faint};

          font-size: 10px;
        }

        .dp-secure svg {
          color: ${C.green};
        }

        /* =====================================================
           ERROR
           ===================================================== */

        .dp-error {
          margin-top: 15px;

          padding: 11px 12px;

          border-radius: 10px;

          background: ${C.redSoft};

          color: ${C.red};

          font-size: 11.5px;

          line-height: 1.5;

          display: flex;

          gap: 8px;
        }

        .dp-error svg {
          flex: none;
        }

        /* =====================================================
           SUCCESS
           ===================================================== */

        .dp-success {
          margin-top: 18px;

          padding: 12px;

          border-radius: 10px;

          background: ${C.greenSoft};

          color: ${C.green};

          font-size: 11.5px;

          line-height: 1.5;

          display: flex;

          gap: 8px;
        }

        .dp-success svg {
          flex: none;
        }

        .dp-success-title {
          font-size: 25px;

          font-weight: 850;

          color: ${C.ink};

          margin-top: 12px;
        }

        .dp-success-amount {
          font-size: 30px;

          font-weight: 850;

          color: ${C.purple};

          margin-top: 8px;
        }

        /* =====================================================
           DETAILS
           ===================================================== */

        .dp-details {
          margin-top: 18px;

          border:
            1px solid ${C.line};

          border-radius: 12px;

          overflow: hidden;
        }

        .dp-detail {
          display: flex;

          justify-content: space-between;

          gap: 15px;

          padding: 10px 12px;

          border-bottom:
            1px solid #EEEAF2;

          font-size: 11px;
        }

        .dp-detail:last-child {
          border-bottom: 0;
        }

        .dp-detail span {
          color: ${C.soft};
        }

        .dp-detail strong {
          color: ${C.ink};

          text-align: right;

          word-break: break-word;
        }

        /* =====================================================
           SUCCESS ACTIONS
           ===================================================== */

        .dp-success-actions {
          display: flex;

          gap: 8px;

          margin-top: 18px;
        }

        .dp-link {
          flex: 1;

          height: 42px;

          border-radius: 10px;

          border:
            1px solid ${C.line};

          display: flex;

          align-items: center;

          justify-content: center;

          text-decoration: none;

          font-size: 11.5px;

          font-weight: 750;
        }

        .dp-link.primary {
          background: ${C.purple};

          border-color: ${C.purple};

          color: #FFFFFF;
        }

        .dp-link.primary:hover {
          background: #685391;
        }

        .dp-link.secondary {
          background: #FFFFFF;

          color: ${C.ink};
        }

        .dp-link.secondary:hover {
          background: ${C.purpleSoft};

          color: ${C.purple};
        }

        /* =====================================================
           SPINNER
           ===================================================== */

        .dp-spin {
          animation:
            dp-spin
            0.8s
            linear
            infinite;
        }

        @keyframes dp-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           MOBILE
           ===================================================== */

        @media (max-width: 800px) {
          .dp-grid {
            grid-template-columns: 1fr;
          }

          .dp-pay {
            order: 1;
          }

          .dp-left {
            order: 2;
          }
        }

        @media (max-width: 520px) {
          .dp-shell {
            padding:
              24px
              14px
              40px;
          }

          .dp-pay {
            padding: 19px;
          }

          .dp-left-head {
            padding: 19px;
          }

          .dp-left-body {
            padding: 18px;
          }

          .dp-success-actions {
            flex-direction: column;
          }
        }

      `}</style>

      <div className="dp-shell">
        <div className="dp-max">

          {/* =================================================
              BACK
              ================================================= */}

          <Link
            to="/workspace/active"
            className="dp-back"
          >
            <ArrowLeft size={14} />

            Back to workspace
          </Link>

          {/* =================================================
              LOADING
              ================================================= */}

          {loading && (
            <div
              className="dp-card"
              style={{
                padding: 60,
                textAlign: "center",
                color: C.soft,
              }}
            >
              <Loader2
                size={25}
                className="dp-spin"
              />

              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                }}
              >
                Loading payment…
              </div>
            </div>
          )}

          {/* =================================================
              ERROR
              ================================================= */}

          {!loading &&
            error &&
            !payment && (
              <div
                className="dp-card"
                style={{
                  padding: 28,
                }}
              >
                <div className="dp-eyebrow">
                  Checkout
                </div>

                <div className="dp-left-title">
                  Payment unavailable
                </div>

                <div className="dp-error">
                  <XCircle size={17} />

                  {error}
                </div>
              </div>
            )}

          {/* =================================================
              SUCCESS
              ================================================= */}

          {!loading &&
            done &&
            payment && (
              <div
                className="dp-card"
                style={{
                  maxWidth: 720,
                  margin: "0 auto",
                  padding: 28,
                }}
              >

                {/* CREATORHUB BRAND */}

                <div className="dp-brand">

                  <div className="dp-brandmark">
                    C
                  </div>

                  <div>
                    <div className="dp-brandname">
                      Creatorhub
                    </div>

                    <div className="dp-brandsub">
                      Creator marketplace payment
                    </div>
                  </div>

                </div>

                {/* SUCCESS MESSAGE */}

                <div
                  className="dp-success"
                  style={{
                    marginTop: 24,
                  }}
                >
                  <CheckCircle2 size={18} />

                  {isCampaignFunding
                    ? "Campaign funding successfully recorded. The campaign budget is now secured."
                    : "Payment successfully recorded. The creator has been notified and their payout has been recorded."}
                </div>

                <div className="dp-success-title">
                  Payment successful
                </div>

                <div className="dp-success-amount">
                  Rs.{" "}
                  {Number(
                    payment.amount || 0
                  ).toLocaleString()}
                </div>

                {/* PAYMENT DETAILS */}

                <div className="dp-details">

                  <div className="dp-detail">
                    <span>
                      Payment ID
                    </span>

                    <strong>
                      {payment.pidx ||
                        payment.purchase_order_id ||
                        "—"}
                    </strong>
                  </div>

                  <div className="dp-detail">
                    <span>
                      Transaction ID
                    </span>

                    <strong>
                      {payment.transaction_id ||
                        "Pending local reference"}
                    </strong>
                  </div>

                  <div className="dp-detail">
                    <span>
                      Amount paid
                    </span>

                    <strong>
                      Rs.{" "}
                      {Number(
                        payment.amount || 0
                      ).toLocaleString()}
                    </strong>
                  </div>

                  <div className="dp-detail">
                    <span>
                      Payment method
                    </span>

                    <strong>
                      {isCampaignFunding
                        ? "Khalti account"
                        : payment.method ===
                          "demo"
                        ? `Demo ${
                            method === "wallet"
                              ? "Wallet"
                              : "Bank"
                          }`
                        : payment.method ||
                          "Demo payment"}
                    </strong>
                  </div>

                  <div className="dp-detail">
                    <span>
                      Date
                    </span>

                    <strong>
                      {formattedDate || "—"}
                    </strong>
                  </div>

                </div>

                {/* SUCCESS ACTIONS */}

                <div className="dp-success-actions">

                  <Link
                    className="dp-link primary"
                    to="/workspace/active"
                  >
                    Back to workspace
                  </Link>

                  <Link
                    className="dp-link secondary"
                    to="/workspace/history"
                  >
                    View collab history
                  </Link>

                </div>

              </div>
            )}

          {/* =================================================
              PAYMENT CHECKOUT
              ================================================= */}

          {!loading &&
            !done &&
            payment && (
              <div className="dp-grid">

                {/* =================================================
                    LEFT
                    ================================================= */}

                <section className="dp-card dp-left">

                  <div className="dp-left-head">

                    <div className="dp-eyebrow">
                      Payment details
                    </div>

                    <div className="dp-left-title">
                      {isCampaignFunding
                        ? "Campaign funding"
                        : "Creator payout"}
                    </div>

                  </div>

                  <div className="dp-left-body">

                    <div className="dp-row">

                      <span className="dp-label">
                        Purchase order
                      </span>

                      <strong className="dp-value">
                        {payment.purchase_order_id ||
                          "—"}
                      </strong>

                    </div>

                    <div className="dp-row">

                      <span className="dp-label">
                        Status
                      </span>

                      <strong className="dp-value">
                        Awaiting payment
                      </strong>

                    </div>

                    <div className="dp-row">

                      <span className="dp-label">
                        Currency
                      </span>

                      <strong className="dp-value">
                        NPR
                      </strong>

                    </div>

                    <div className="dp-row">

                      <span className="dp-label">
                        Payment type
                      </span>

                      <strong className="dp-value">
                        {isCampaignFunding
                          ? "Campaign funding"
                          : "Creator collaboration"}
                      </strong>

                    </div>

                    {/* =================================================
                        FUNDING ACCOUNT
                        ================================================= */}

                    {isCampaignFunding && (
                      <>

                        <div className="dp-row">

                          <span className="dp-label">
                            Funding account
                          </span>

                          <strong className="dp-value">
                            {user?.profile
                              ?.company_name ||
                              "Registered business"}

                            {" · "}

                            ••••••••
                          </strong>

                        </div>

                        <div className="dp-row">

                          <span className="dp-label">
                            Platform account
                          </span>

                          <strong
                            className="dp-value"
                            style={{
                              color: C.purple,
                            }}
                          >
                            Creatorhub
                          </strong>

                        </div>

                      </>
                    )}

                    {/* TOTAL */}

                    <div className="dp-total">

                      <span className="dp-total-label">
                        Total payable
                      </span>

                      <strong className="dp-total-value">
                        Rs.{" "}
                        {Number(
                          payment.amount || 0
                        ).toLocaleString()}
                      </strong>

                    </div>

                    {/* NOTICE */}

                    <div className="dp-notice">

                      <ShieldCheck size={16} />

                      {isCampaignFunding
                        ? "Secure the full campaign budget before creators can apply. This is a development checkout — no real money is transferred."
                        : "This is a development checkout for your marketplace. Confirming it updates your local payment, earnings, notification, and collaboration records."}

                    </div>

                  </div>

                </section>

                {/* =================================================
                    RIGHT PAYMENT PANEL
                    ================================================= */}

                <section className="dp-card dp-pay">

                  {/* CREATORHUB */}

                  <div className="dp-brand">

                    <div className="dp-brandmark">
                      C
                    </div>

                    <div>

                      <div className="dp-brandname">
                        Creatorhub
                      </div>

                      <div className="dp-brandsub">
                        Marketplace payment
                      </div>

                    </div>

                  </div>

                  {/* TITLE */}

                  <div className="dp-pay-title">
                    {isCampaignFunding
                      ? "Fund campaign"
                      : "Pay securely"}
                  </div>

                  <div className="dp-pay-copy">
                    {isCampaignFunding
                      ? "Secure the campaign budget using your Khalti account."
                      : "Choose a demo payment method and confirm the amount below."}
                  </div>

                  {/* =================================================
                      CAMPAIGN FUNDING
                      ================================================= */}

                  {isCampaignFunding ? (
                    <>

                      {/* PAYMENT METHOD */}

                      <div className="dp-method-label">
                        Payment method
                      </div>

                      <div className="dp-methods dp-methods-single">

                        <div className="dp-method active">

                          <WalletCards size={16} />

                          Khalti account

                        </div>

                      </div>

                      {/* =================================================
                          BUSINESS ACCOUNT NAME
                          ================================================= */}

                      <label className="dp-field-label">
                        Account name
                      </label>

                      <div className="dp-readonly-account">

                        {user?.profile
                          ?.company_name ||
                          "Registered business"}

                      </div>

                      <div className="dp-field-help">
                        This name comes from the registered
                        business profile and cannot be changed
                        during funding.
                      </div>

                      {/* =================================================
                          CREATORHUB FUNDING ACCOUNT
                          ================================================= */}

                      <label
                        className="dp-field-label"
                        htmlFor="creatorhub-funding-account"
                      >
                        Funding account number
                      </label>

                      <div
                        id="creatorhub-funding-account"
                        className="dp-readonly-account platform-account"
                        aria-label="Creatorhub funding account"
                      >
                        {CREATORHUB_FUNDING_ACCOUNT}
                      </div>

                      <div className="dp-field-help">
                        This is the official Creatorhub
                        platform funding account and cannot
                        be changed during campaign funding.
                      </div>

                      {/* =================================================
                          REFERENCE
                          ================================================= */}

                      <label
                        className="dp-field-label"
                        htmlFor="payment-reference"
                      >
                        Reference note (optional)
                      </label>

                      <input
                        id="payment-reference"
                        className="dp-input"
                        value={reference}
                        onChange={(event) =>
                          setReference(
                            event.target.value
                          )
                        }
                        placeholder="e.g. campaign budget"
                        autoComplete="off"
                      />

                    </>
                  ) : (

                    /* =================================================
                       NORMAL DEMO PAYMENT
                       ================================================= */

                    <>

                      <div className="dp-method-label">
                        Payment method
                      </div>

                      <div className="dp-methods">

                        <button
                          type="button"
                          className={`dp-method ${
                            method === "wallet"
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            setMethod("wallet")
                          }
                        >

                          <WalletCards size={16} />

                          Demo Wallet

                        </button>

                        <button
                          type="button"
                          className={`dp-method ${
                            method === "bank"
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            setMethod("bank")
                          }
                        >

                          <CreditCard size={16} />

                          Demo Bank

                        </button>

                      </div>

                      <label
                        className="dp-field-label"
                        htmlFor="payment-reference"
                      >
                        Reference note (optional)
                      </label>

                      <input
                        id="payment-reference"
                        className="dp-input"
                        value={reference}
                        onChange={(event) =>
                          setReference(
                            event.target.value
                          )
                        }
                        placeholder="e.g. creator payout"
                        autoComplete="off"
                      />

                    </>
                  )}

                  {/* =================================================
                      PAY AMOUNT
                      ================================================= */}

                  <div className="dp-paybox">

                    <span>
                      You are paying
                    </span>

                    <strong>
                      Rs.{" "}
                      {Number(
                        payment.amount || 0
                      ).toLocaleString()}
                    </strong>

                  </div>

                  {/* =================================================
                      ERROR
                      ================================================= */}

                  {error && (
                    <div className="dp-error">

                      <XCircle size={17} />

                      {error}

                    </div>
                  )}

                  {/* =================================================
                      CONFIRM
                      ================================================= */}

                  <button
                    type="button"
                    className="dp-primary"
                    onClick={confirmPayment}
                    disabled={paying}
                  >

                    <LockKeyhole size={15} />

                    {paying
                      ? "Processing payment…"
                      : "Confirm payment"}

                  </button>

                  {/* =================================================
                      CANCEL
                      ================================================= */}

                  <Link
                    className="dp-cancel"
                    to="/workspace/active"
                  >
                    Cancel payment
                  </Link>

                  {/* =================================================
                      SECURE
                      ================================================= */}

                  <div className="dp-secure">

                    <ShieldCheck size={13} />

                    Secure demo checkout · no real money
                    transferred

                  </div>

                </section>

              </div>
            )}

        </div>
      </div>
    </AppLayout>
  );
}

export default DemoPayment;
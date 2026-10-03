import { useEffect, useMemo, useState } from 'react';

import { parseSocialLink } from '../utils/Social';

import { Check, ImagePlus, Loader2, Upload, X } from 'lucide-react';

import {
  createApplication,
  getCreatorProgress,
  uploadImage,
  type Campaign,
  type CreatorPortfolioItemData,
} from '../api/client';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  onSuccess?: () => void | Promise<void>;
};

// Maximum number of work images a creator can send with one application.
// Keep this in sync with MAX_WORKS in backend routers/applications.py.
const MAX_WORKS = 5;

function mediaUrl(value?: string | null) {
  if (!value) return '';

  if (
    /^(https?:)?\/\//i.test(value) ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  if (value.startsWith('/api/')) {
    return `http://localhost:8000${value}`;
  }

  return `http://localhost:8000/${value.replace(/^\/+/, '')}`;
}

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.detail || fallback;
}

export function ApplyModal({
  isOpen,
  onClose,
  campaign,
  onSuccess,
}: Props) {
  const [portfolio, setPortfolio] = useState<CreatorPortfolioItemData[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [rate, setRate] = useState('');
  const [socialLink, setSocialLink] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const questions = useMemo(
    () =>
      (campaign.application_questions || [])
        .map((q) => String(q).trim())
        .filter(Boolean),
    [campaign.application_questions],
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    setPortfolio([]);
    setSelected([]);
    setAnswers({});
    setRate('');
    setSocialLink('');
    setSuccess(false);
    setError('');
    setLoading(true);

    getCreatorProgress()
      .then((result) => {
        if (cancelled) return;

        const items = Array.isArray(result?.profile?.portfolio)
          ? result.profile.portfolio.filter(
              (item: CreatorPortfolioItemData) => item?.media_url,
            )
          : [];

        setPortfolio(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            errorMessage(
              err,
              'Could not load your portfolio. You can upload images below.',
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, campaign.id]);

  useEffect(() => {
    if (!isOpen) return;

    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleWork = (index: number) => {
    setError('');

    setSelected((current) => {
      if (current.includes(index)) {
        return current.filter((i) => i !== index);
      }

      if (current.length >= MAX_WORKS) {
        setError(`You can select up to ${MAX_WORKS} images.`);
        return current;
      }

      return [...current, index];
    });
  };

  const uploadWork = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (selected.length >= MAX_WORKS) {
      setError(
        `You can select up to ${MAX_WORKS} images. Deselect one to upload another.`,
      );
      return;
    }

    setUploading(true);
    setError('');

    try {
      const { url } = await uploadImage(file);

      const newIndex = portfolio.length;

      setPortfolio((current) => [
        ...current,
        {
          title: file.name.replace(/\.[^.]+$/, ''),
          media_url: url,
          type: 'image',
        },
      ]);

      setSelected((current) => [...current, newIndex]);
    } catch (err) {
      setError(
        errorMessage(err, 'Could not upload the work image.'),
      );
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError('');

    const chosen = selected
      .slice()
      .sort((a, b) => a - b)
      .map((i) => portfolio[i])
      .filter((item) => item?.media_url);

    if (chosen.length === 0) {
      setError('Please select at least one work image.');
      return;
    }

    if (chosen.length > MAX_WORKS) {
      setError(`You can submit up to ${MAX_WORKS} work images.`);
      return;
    }

    const social = parseSocialLink(socialLink);

    if (!social) {
      setError(
        'Please add a valid Instagram, TikTok or Facebook profile link (for example instagram.com/yourname).',
      );
      return;
    }

    const missing = questions.findIndex(
      (_, index) => !answers[index]?.trim(),
    );

    if (missing !== -1) {
      setError(`Please answer question ${missing + 1}.`);
      return;
    }

    setSubmitting(true);

    try {
      await createApplication({
        campaign_id: campaign.id,
        proposal: 'Application submitted',
        rate: rate.trim() ? Number(rate) : null,
        application_answers: questions.map((question, index) => ({
          question,
          answer: answers[index].trim(),
        })),
        selected_portfolio: chosen,
        social_link: social.url,
      });

      await onSuccess?.();

      setSuccess(true);
    } catch (err) {
      setError(
        errorMessage(
          err,
          'Could not submit your application. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="apply-overlay"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <style>{`
        /* =========================================
           APPLY MODAL
           ========================================= */

        .apply-overlay {
          position: fixed;

          /*
           * IMPORTANT:
           * Keep the overlay below the navbar.
           * Change 76px only if your actual navbar
           * height is different.
           */
          top: 76px;
          left: 0;
          right: 0;
          bottom: 0;

          z-index: 900;

          background: rgba(15, 15, 18, 0.52);
          backdrop-filter: blur(5px);

          display: flex;
          align-items: flex-start;
          justify-content: center;

          padding: 24px 18px 30px;

          overflow-y: auto;
          box-sizing: border-box;
        }

        .apply-modal {
          width: min(620px, 100%);

          /*
           * Since the navbar occupies 76px,
           * keep the modal inside the remaining viewport.
           */
          max-height: calc(100vh - 120px);

          overflow-y: auto;

          background: #fff;

          border: 1px solid #e7e7e7;
          border-radius: 20px;

          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.2);

          box-sizing: border-box;
        }

        /* =========================================
           HEADER
           ========================================= */

        .apply-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          gap: 16px;

          padding: 22px 24px 18px;

          border-bottom: 1px solid #eee;

          /*
           * Sticky only inside the modal.
           * It will NOT overlap the navbar.
           */
          position: sticky;
          top: 0;

          background: rgba(255, 255, 255, 0.97);

          z-index: 2;

          box-sizing: border-box;
        }

        .apply-eyebrow {
          font: 600 10px/1.2 Poppins, sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8a8490;
        }

        .apply-title {
          margin: 5px 0 0;

          font: 700 21px/1.15 Poppins, sans-serif;

          color: #111;
        }

        .apply-sub {
          margin: 5px 0 0;

          font: 400 12px/1.5 Poppins, sans-serif;

          color: #777;
        }

        .apply-close {
          width: 34px;
          height: 34px;

          flex: none;

          border: 1px solid #e5e5e5;

          border-radius: 50%;

          background: #fff;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;

          color: #111;
        }

        .apply-close:hover {
          background: #f7f7f7;
        }

        .apply-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* =========================================
           BODY
           ========================================= */

        .apply-body {
          padding: 22px 24px 24px;

          box-sizing: border-box;
        }

        .apply-section {
          margin-bottom: 22px;
        }

        .apply-section:last-child {
          margin-bottom: 0;
        }

        .apply-section-title {
          font: 700 13px Poppins, sans-serif;
          color: #171717;

          margin-bottom: 9px;
        }

        .apply-help {
          font: 400 11.5px/1.55 Poppins, sans-serif;

          color: #85818c;

          margin: 0 0 10px;
        }

        /* =========================================
           QUESTIONS
           ========================================= */

        .apply-questions {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .apply-label {
          font: 600 12px Poppins, sans-serif;

          color: #222;

          display: block;

          margin-bottom: 6px;
        }

        .apply-label b {
          color: #111;
        }

        /* =========================================
           INPUTS
           ========================================= */

        .apply-rate {
          width: 100%;
          height: 42px;

          border: 1px solid #ddd;
          border-radius: 10px;

          padding: 0 11px;

          outline: none;

          font: 400 12.5px Poppins, sans-serif;

          box-sizing: border-box;
        }

        .apply-rate:focus {
          border-color: #111;
        }

        .apply-textarea {
          width: 100%;

          min-height: 88px;

          border: 1px solid #ddd;
          border-radius: 10px;

          padding: 10px 11px;

          resize: vertical;

          outline: none;

          font: 400 12.5px/1.5 Poppins, sans-serif;

          box-sizing: border-box;
        }

        .apply-textarea:focus {
          border-color: #111;
        }

        /* =========================================
           PORTFOLIO GRID
           ========================================= */

        .apply-grid {
          display: grid;

          grid-template-columns: repeat(3, 1fr);

          gap: 9px;
        }

        .apply-work {
          position: relative;

          border: 1px solid #e2e2e2;

          border-radius: 10px;

          overflow: hidden;

          background: #fafafa;

          cursor: pointer;

          padding: 0;

          text-align: left;
        }

        .apply-work:hover {
          border-color: #aaa;
        }

        .apply-work.selected {
          border: 2px solid #111;
        }

        .apply-work img {
          display: block;

          width: 100%;

          aspect-ratio: 1;

          object-fit: cover;
        }

        .apply-work-name {
          font: 500 9.5px Poppins, sans-serif;

          padding: 6px;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;

          color: #444;
        }

        .apply-check {
          position: absolute;

          right: 6px;
          top: 6px;

          width: 22px;
          height: 22px;

          border-radius: 50%;

          background: #111;

          color: #fff;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* =========================================
           UPLOAD
           ========================================= */

        .apply-upload {
          border: 1px dashed #cfcfcf;

          border-radius: 10px;

          min-height: 90px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          cursor: pointer;

          font: 600 11px Poppins, sans-serif;

          color: #555;

          margin-top: 10px;

          box-sizing: border-box;
        }

        .apply-upload:hover {
          border-color: #111;
          color: #111;
        }

        .apply-upload input {
          display: none;
        }

        /* =========================================
           ERROR
           ========================================= */

        .apply-error {
          padding: 10px 12px;

          border-radius: 9px;

          background: #f7eeee;

          color: #b12828;

          font: 500 11.5px/1.45 Poppins, sans-serif;

          margin-bottom: 14px;
        }

        /* =========================================
           ACTIONS
           ========================================= */

        .apply-actions {
          display: flex;

          justify-content: flex-end;

          gap: 9px;

          border-top: 1px solid #eee;

          padding-top: 17px;

          margin-top: 4px;
        }

        .apply-cancel,
        .apply-submit {
          height: 40px;

          padding: 0 16px;

          border-radius: 9px;

          font: 600 12px Poppins, sans-serif;

          cursor: pointer;
        }

        .apply-cancel {
          background: #fff;

          border: 1px solid #ddd;

          color: #555;
        }

        .apply-cancel:hover {
          border-color: #bbb;
          color: #111;
        }

        .apply-submit {
          background: #111;

          border: 1px solid #111;

          color: #fff;

          display: flex;
          align-items: center;

          gap: 7px;
        }

        .apply-submit:hover:not(:disabled) {
          background: #222;
        }

        .apply-submit:disabled {
          opacity: 0.55;

          cursor: not-allowed;
        }

        /* =========================================
           SUCCESS
           ========================================= */

        .apply-success {
          text-align: center;

          padding: 48px 30px 42px;
        }

        .apply-success-icon {
          width: 58px;
          height: 58px;

          margin: 0 auto 16px;

          border-radius: 50%;

          background: #111;

          color: #fff;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .apply-success h2 {
          font: 700 22px Poppins, sans-serif;

          margin: 0 0 8px;

          color: #111;
        }

        .apply-success p {
          max-width: 400px;

          margin: 0 auto;

          font: 400 13px/1.65 Poppins, sans-serif;

          color: #777;
        }

        .apply-success button {
          margin-top: 24px;

          height: 40px;

          padding: 0 20px;

          border: 0;

          border-radius: 9px;

          background: #111;

          color: #fff;

          font: 600 12px Poppins, sans-serif;

          cursor: pointer;
        }

        .apply-success button:hover {
          background: #222;
        }

        /* =========================================
           LOADING SPINNER
           ========================================= */

        .spin {
          animation: apply-spin 0.8s linear infinite;
        }

        @keyframes apply-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =========================================
           TABLET / MOBILE
           ========================================= */

        @media (max-width: 760px) {
          .apply-overlay {
            top: 70px;

            padding: 16px 12px 24px;
          }

          .apply-modal {
            max-height: calc(100vh - 90px);

            border-radius: 17px;
          }
        }

        @media (max-width: 560px) {
          .apply-overlay {
            top: 70px;

            padding: 10px 8px 18px;
          }

          .apply-modal {
            width: 100%;

            max-height: calc(100vh - 82px);

            border-radius: 15px;
          }

          .apply-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .apply-head,
          .apply-body {
            padding-left: 17px;
            padding-right: 17px;
          }

          .apply-title {
            font-size: 18px;
          }

          .apply-actions {
            flex-direction: column-reverse;
          }

          .apply-cancel,
          .apply-submit {
            width: 100%;

            justify-content: center;
          }
        }
      `}</style>

      <div className="apply-modal">
        {success ? (
          <div className="apply-success">
            <div className="apply-success-icon">
              <Check size={28} />
            </div>

            <h2>Application sent!</h2>

            <p>
              Your application has been sent to the brand. We’ll
              notify you when the brand makes a decision.
            </p>

            <button
              type="button"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="apply-head">
              <div>
                <div className="apply-eyebrow">
                  Apply to campaign
                </div>

                <h2 className="apply-title">
                  {campaign.title}
                </h2>

                <p className="apply-sub">
                  Answer the questions and send your most
                  relevant work.
                </p>
              </div>

              <button
                className="apply-close"
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close application"
              >
                <X size={17} />
              </button>
            </div>

            <div className="apply-body">
              {loading ? (
                <div
                  style={{
                    padding: '35px 0',
                    textAlign: 'center',
                  }}
                >
                  <Loader2
                    className="spin"
                    size={20}
                  />
                </div>
              ) : (
                <>
                  {/* WORK IMAGES */}
                  <section className="apply-section">
                    <div className="apply-section-title">
                      1. Your work images * (
                      {selected.length}/{MAX_WORKS})
                    </div>

                    <p className="apply-help">
                      Choose up to {MAX_WORKS} images that best
                      represent work relevant to this campaign.
                    </p>

                    {portfolio.length > 0 && (
                      <div className="apply-grid">
                        {portfolio.map((item, index) => (
                          <button
                            type="button"
                            key={`${item.media_url}-${index}`}
                            className={`apply-work ${
                              selected.includes(index)
                                ? 'selected'
                                : ''
                            }`}
                            onClick={() =>
                              toggleWork(index)
                            }
                          >
                            <img
                              src={mediaUrl(
                                item.media_url,
                              )}
                              alt={
                                item.title ||
                                'Work sample'
                              }
                            />

                            {selected.includes(index) && (
                              <span className="apply-check">
                                <Check size={13} />
                              </span>
                            )}

                            <div className="apply-work-name">
                              {item.title ||
                                'Work sample'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <label className="apply-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file =
                            e.target.files?.[0];

                          if (file) {
                            void uploadWork(file);
                          }

                          e.currentTarget.value = '';
                        }}
                      />

                      {uploading ? (
                        <Loader2
                          size={16}
                          className="spin"
                        />
                      ) : (
                        <ImagePlus size={17} />
                      )}

                      Upload a work image
                    </label>
                  </section>

                  {/* SOCIAL PROFILE */}
                  <section className="apply-section">
                    <div className="apply-section-title">
                      2. Social media profile *
                    </div>

                    <p className="apply-help">
                      Add your Instagram, TikTok or Facebook
                      profile so the brand can check your
                      content. This is required.
                    </p>

                    <input
                      className="apply-rate"
                      type="url"
                      inputMode="url"
                      value={socialLink}
                      onChange={(e) =>
                        setSocialLink(e.target.value)
                      }
                      placeholder="https://instagram.com/yourname"
                    />

                    {socialLink.trim() &&
                      !parseSocialLink(socialLink) && (
                        <div
                          className="apply-help"
                          style={{
                            marginTop: 6,
                            color: '#ad2929',
                          }}
                        >
                          Use a profile link from
                          instagram.com, tiktok.com or
                          facebook.com.
                        </div>
                      )}
                  </section>

                  {/* SCREENING QUESTIONS */}
                  {questions.length > 0 && (
                    <section className="apply-section">
                      <div className="apply-section-title">
                        3. Screening questions *
                      </div>

                      <div className="apply-questions">
                        {questions.map(
                          (question, index) => (
                            <label
                              key={`${question}-${index}`}
                            >
                              <span className="apply-label">
                                {question}{' '}
                                <b>*</b>
                              </span>

                              <textarea
                                className="apply-textarea"
                                value={
                                  answers[index] || ''
                                }
                                onChange={(e) =>
                                  setAnswers(
                                    (current) => ({
                                      ...current,
                                      [index]:
                                        e.target.value,
                                    }),
                                  )
                                }
                                placeholder="Your answer..."
                              />
                            </label>
                          ),
                        )}
                      </div>
                    </section>
                  )}

                  {/* PROPOSED COMPENSATION */}
                  <section className="apply-section">
                    <div className="apply-section-title">
                      {questions.length > 0 ? '4' : '3'}.
                      {' '}
                      Proposed compensation{' '}
                      <span
                        style={{
                          fontWeight: 400,
                          color: '#999',
                        }}
                      >
                        (optional)
                      </span>
                    </div>

                    <p className="apply-help">
                      If you have a preferred rate, enter it
                      here. For negotiable campaigns you can
                      leave this blank and discuss the final
                      amount with the brand after selection.
                    </p>

                    <input
                      className="apply-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={rate}
                      onChange={(e) =>
                        setRate(e.target.value)
                      }
                      placeholder="e.g. 40000"
                    />

                    <div
                      className="apply-help"
                      style={{ marginTop: 6 }}
                    >
                      Amount in NPR. This is your proposed
                      rate, not a payment to CreatorHub.
                    </div>
                  </section>

                  {/* ERROR */}
                  {error && (
                    <div className="apply-error">
                      {error}
                    </div>
                  )}

                  {/* ACTIONS */}
                  <div className="apply-actions">
                    <button
                      type="button"
                      className="apply-cancel"
                      onClick={onClose}
                      disabled={submitting}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="apply-submit"
                      onClick={() => void submit()}
                      disabled={
                        submitting || uploading
                      }
                    >
                      {submitting ? (
                        <Loader2
                          size={15}
                          className="spin"
                        />
                      ) : (
                        <Upload size={15} />
                      )}

                      {submitting
                        ? 'Sending...'
                        : 'Send application'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ApplyModal;
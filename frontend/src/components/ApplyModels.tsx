import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ImagePlus, Loader2, Send, X } from 'lucide-react';
import {
  createApplication,
  getCreatorProgress,
  uploadImage,
  type Campaign,
  type CreatorPortfolioItemData,
} from '../api/client';

interface CreatorApplyProfile {
  display_name?: string | null;
  username?: string | null;
  profile_image?: string | null;
  portfolio?: CreatorPortfolioItemData[] | null;
}

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  onSuccess?: () => void | Promise<void>;
}

function mediaUrl(value?: string | null): string {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  if (value.startsWith('/api/')) return `http://localhost:8000${value}`;
  return `http://localhost:8000/${value.replace(/^\/+/, '')}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  const maybeAxios = error as {
    response?: { data?: { detail?: string } };
  };
  return maybeAxios?.response?.data?.detail || fallback;
}

export function ApplyModal({ isOpen, onClose, campaign, onSuccess }: ApplyModalProps) {
  const [profile, setProfile] = useState<CreatorApplyProfile | null>(null);
  const [proposal, setProposal] = useState('');
  const [rate, setRate] = useState('');
  const [message, setMessage] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [portfolio, setPortfolio] = useState<CreatorPortfolioItemData[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<number[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadingWork, setUploadingWork] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const questions = useMemo(
    () => (campaign.application_questions || []).map((question) => String(question).trim()).filter(Boolean),
    [campaign.application_questions],
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setProfile(null);
    setProposal('');
    setRate('');
    setMessage('');
    setAnswers({});
    setPortfolio([]);
    setSelectedPortfolio([]);
    setError('');
    setProfileLoading(true);

    getCreatorProgress()
      .then((result) => {
        if (cancelled) return;

        const creatorProfile = (result?.profile || {}) as CreatorApplyProfile;
        const items = Array.isArray(creatorProfile.portfolio)
          ? creatorProfile.portfolio.filter((item) => item && typeof item.media_url === 'string' && item.media_url)
          : [];

        setProfile(creatorProfile);
        setPortfolio(items);

        // A single existing work sample is automatically relevant.
        // With multiple samples the creator explicitly chooses which ones to show.
        if (items.length === 1) setSelectedPortfolio([0]);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Could not load your creator profile. You can still upload a work sample below.'));
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, campaign.id]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, submitting]);

  if (!isOpen) return null;

  const togglePortfolio = (index: number) => {
    setSelectedPortfolio((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  };

  const handleWorkUpload = async (file: File) => {
    setUploadingWork(true);
    setError('');

    try {
      const { url } = await uploadImage(file);
      const newItem: CreatorPortfolioItemData = {
        title: file.name.replace(/\.[^.]+$/, ''),
        media_url: url,
        type: 'image',
      };

      setPortfolio((current) => {
        const next = [...current, newItem];
        setSelectedPortfolio((selected) => [...selected, next.length - 1]);
        return next;
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not upload this work sample.'));
    } finally {
      setUploadingWork(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!proposal.trim()) {
      setError('Please explain why you are a good fit for this campaign.');
      return;
    }

    if (portfolio.length === 0 || selectedPortfolio.length === 0) {
      setError('Please select at least one relevant work sample, or upload one below.');
      return;
    }

    const missingQuestion = questions.findIndex((_, index) => !answers[index]?.trim());
    if (missingQuestion !== -1) {
      setError(`Please answer campaign question ${missingQuestion + 1} before applying.`);
      return;
    }

    setSubmitting(true);

    try {
      await createApplication({
        campaign_id: campaign.id,
        proposal: proposal.trim(),
        rate: rate.trim() ? Number(rate) : undefined,
        message: message.trim() || undefined,
        application_answers: questions.map((question, index) => ({
          question,
          answer: answers[index].trim(),
        })),
        selected_portfolio: selectedPortfolio.map((index) => portfolio[index]).filter(Boolean),
      });

      await onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not submit your application. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const profileImage = mediaUrl(profile?.profile_image);
  const profileName = profile?.display_name || profile?.username || 'Your creator profile';
  const selectedCount = selectedPortfolio.length;

  return (
    <div className="am-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) handleClose();
    }}>
      <style>{`
        .am-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15, 17, 24, .58);
          backdrop-filter: blur(6px);
        }
        .am-modal {
          width: min(680px, 100%);
          max-height: min(92vh, 900px);
          overflow: auto;
          background: #fff;
          border: 1px solid #ececf1;
          border-radius: 22px;
          box-shadow: 0 28px 80px rgba(15,17,24,.26);
          animation: am-enter .2s ease-out;
        }
        @keyframes am-enter {
          from { opacity: 0; transform: translateY(8px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .am-top {
          position: sticky;
          top: 0;
          z-index: 4;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 22px 24px 17px;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid #eeeef2;
          backdrop-filter: blur(10px);
        }
        .am-title { margin: 0; color: #183b72; font-size: 21px; font-weight: 800; letter-spacing: -.25px; }
        .am-subtitle { margin: 4px 0 0; color: #7b7d86; font-size: 12.5px; line-height: 1.55; }
        .am-close { width: 34px; height: 34px; border: 1px solid #e5e5ea; border-radius: 10px; background: #fff; color: #6d6f77; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: 0 0 auto; }
        .am-close:hover { background: #f7f7f9; color: #20222a; }
        .am-body { padding: 20px 24px 24px; }
        .am-campaign { display: flex; align-items: center; gap: 12px; padding: 13px 14px; margin-bottom: 18px; border-radius: 14px; background: #fbfbfd; border: 1px solid #ebebf0; }
        .am-campaign-image { width: 50px; height: 50px; border-radius: 11px; object-fit: cover; background: #f1f2f5; border: 1px solid #e9e9ee; flex: 0 0 auto; }
        .am-campaign-copy { min-width: 0; }
        .am-campaign-title { margin: 0; font-size: 13.5px; font-weight: 750; color: #252631; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .am-campaign-meta { margin: 3px 0 0; color: #84858c; font-size: 11.5px; }
        .am-profile { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border: 1px solid #ececf1; border-radius: 14px; margin-bottom: 18px; }
        .am-profile-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; background: #1e2a78; color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex: 0 0 auto; overflow: hidden; }
        .am-profile-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .am-profile-label { color: #8a8b92; font-size: 10.5px; margin-bottom: 2px; }
        .am-profile-name { color: #33353e; font-size: 12.5px; font-weight: 750; }
        .am-form { display: flex; flex-direction: column; gap: 17px; }
        .am-section { padding-top: 2px; }
        .am-section + .am-section { border-top: 1px solid #efeff2; padding-top: 18px; }
        .am-section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .am-section-title { margin: 0; color: #2b2d35; font-size: 14px; font-weight: 800; }
        .am-section-help { color: #91929a; font-size: 10.5px; }
        .am-field { display: flex; flex-direction: column; gap: 6px; }
        .am-field + .am-field { margin-top: 12px; }
        .am-label { color: #555761; font-size: 11.5px; font-weight: 700; }
        .am-required { color: #f0523f; }
        .am-textarea, .am-input { width: 100%; box-sizing: border-box; border: 1px solid #dedfe5; border-radius: 10px; background: #fff; color: #181a20; font: inherit; font-size: 12.5px; outline: none; transition: border-color .15s ease, box-shadow .15s ease; }
        .am-textarea { min-height: 91px; padding: 10px 11px; resize: vertical; line-height: 1.55; }
        .am-input { height: 41px; padding: 0 11px; }
        .am-textarea:focus, .am-input:focus { border-color: #ff9c8e; box-shadow: 0 0 0 3px rgba(255,107,90,.10); }
        .am-hint { color: #90919a; font-size: 10.5px; line-height: 1.45; }
        .am-question { padding: 12px; border: 1px solid #ececf1; border-radius: 12px; background: #fcfcfd; }
        .am-question + .am-question { margin-top: 10px; }
        .am-question-number { color: #f0523f; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
        .am-question-text { margin: 0 0 7px; color: #3e4048; font-size: 12px; line-height: 1.5; font-weight: 650; }
        .am-portfolio-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
        .am-portfolio-card { position: relative; padding: 7px; border: 1px solid #e2e2e8; border-radius: 12px; background: #fff; color: #42444c; text-align: left; cursor: pointer; }
        .am-portfolio-card:hover { border-color: #f3afa5; }
        .am-portfolio-card.selected { border-color: #ff7f6f; box-shadow: 0 0 0 2px rgba(255,107,90,.12); }
        .am-portfolio-media { width: 100%; aspect-ratio: 1; border-radius: 8px; object-fit: cover; display: block; background: #f2f3f6; margin-bottom: 6px; }
        .am-portfolio-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; font-weight: 700; }
        .am-check { position: absolute; top: 11px; right: 11px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #d7d8df; background: rgba(255,255,255,.96); display: flex; align-items: center; justify-content: center; color: transparent; }
        .am-check.selected { background: #ff6b5a; border-color: #ff6b5a; color: #fff; }
        .am-upload { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 39px; margin-top: 9px; border: 1px dashed #d4d5dc; border-radius: 10px; background: #fff; color: #f0523f; font-size: 11.5px; font-weight: 750; cursor: pointer; }
        .am-upload:hover { background: #fff8f6; border-color: #ff9c8e; }
        .am-upload input { display: none; }
        .am-selection-note { margin: 8px 0 0; color: #7e8088; font-size: 10.5px; }
        .am-empty-work { padding: 12px; border: 1px dashed #dcdde3; border-radius: 11px; color: #7c7e86; font-size: 11px; line-height: 1.5; background: #fbfbfc; }
        .am-error { display: flex; align-items: flex-start; gap: 8px; padding: 10px 11px; border-radius: 10px; border: 1px solid #f1ceca; background: #fff4f2; color: #c9473f; font-size: 11.5px; line-height: 1.45; }
        .am-footer { display: grid; grid-template-columns: 1fr 1.5fr; gap: 9px; padding-top: 3px; }
        .am-btn { min-height: 42px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 12px; font-weight: 750; cursor: pointer; }
        .am-btn-cancel { border: 1px solid #dedfe5; background: #fff; color: #4b4d56; }
        .am-btn-cancel:hover { background: #f8f8fa; }
        .am-btn-submit { border: 1px solid #ff6b5a; background: #ff6b5a; color: #fff; box-shadow: 0 8px 18px rgba(255,107,90,.16); }
        .am-btn-submit:hover:not(:disabled) { background: #f0523f; border-color: #f0523f; }
        .am-btn:disabled { opacity: .62; cursor: not-allowed; box-shadow: none; }
        .am-spin { animation: am-spin .8s linear infinite; }
        @keyframes am-spin { to { transform: rotate(360deg); } }
        @media (max-width: 560px) {
          .am-overlay { padding: 0; align-items: flex-end; }
          .am-modal { max-height: 94vh; border-radius: 20px 20px 0 0; }
          .am-top, .am-body { padding-left: 17px; padding-right: 17px; }
          .am-portfolio-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="am-modal" role="dialog" aria-modal="true" aria-labelledby="am-title">
        <div className="am-top">
          <div>
            <h2 id="am-title" className="am-title">Apply to this campaign</h2>
            <p className="am-subtitle">Complete the questions below. Nothing is submitted until you press “Submit application”.</p>
          </div>
          <button type="button" className="am-close" onClick={handleClose} aria-label="Close application form">
            <X size={18} />
          </button>
        </div>

        <div className="am-body">
          <div className="am-campaign">
            {campaign.hero_image ? (
              <img className="am-campaign-image" src={mediaUrl(campaign.hero_image)} alt="" />
            ) : (
              <div className="am-campaign-image" aria-hidden="true" />
            )}
            <div className="am-campaign-copy">
              <p className="am-campaign-title">{campaign.title}</p>
              <p className="am-campaign-meta">
                {campaign.brand_name || 'Brand'} · {campaign.category}
                {campaign.campaign_type === 'paid' && campaign.budget != null ? ` · NPR ${Number(campaign.budget).toLocaleString()}` : ''}
              </p>
            </div>
          </div>

          <div className="am-profile">
            <div className="am-profile-avatar">
              {profileImage ? <img src={profileImage} alt="Your profile" /> : (profileName[0] || '?').toUpperCase()}
            </div>
            <div>
              <div className="am-profile-label">Your profile will be included with this application</div>
              <div className="am-profile-name">{profileName}</div>
            </div>
          </div>

          <form className="am-form" onSubmit={handleSubmit}>
            {error && (
              <div className="am-error" role="alert">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <section className="am-section">
              <div className="am-section-heading">
                <h3 className="am-section-title">Why are you a good fit?</h3>
                <span className="am-section-help">Required</span>
              </div>
              <div className="am-field">
                <textarea
                  className="am-textarea"
                  value={proposal}
                  onChange={(event) => setProposal(event.target.value)}
                  placeholder="Tell the brand what makes you a strong fit and how you would approach the content."
                  required
                />
              </div>
            </section>

            {questions.length > 0 && (
              <section className="am-section">
                <div className="am-section-heading">
                  <h3 className="am-section-title">Campaign questions</h3>
                  <span className="am-section-help">Answer every question</span>
                </div>
                {questions.map((question, index) => (
                  <div className="am-question" key={`${question}-${index}`}>
                    <div className="am-question-number">Question {index + 1}</div>
                    <p className="am-question-text">{question}</p>
                    <textarea
                      className="am-textarea"
                      value={answers[index] || ''}
                      onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}
                      placeholder="Write your answer..."
                      required
                    />
                  </div>
                ))}
              </section>
            )}

            <section className="am-section">
              <div className="am-section-heading">
                <h3 className="am-section-title">Relevant work</h3>
                <span className="am-section-help">At least one required</span>
              </div>

              {profileLoading ? (
                <div className="am-hint">Loading your portfolio…</div>
              ) : portfolio.length > 0 ? (
                <>
                  <div className="am-portfolio-grid">
                    {portfolio.map((item, index) => {
                      const selected = selectedPortfolio.includes(index);
                      const image = mediaUrl(item.media_url);
                      return (
                        <button
                          key={`${item.media_url}-${index}`}
                          type="button"
                          className={`am-portfolio-card${selected ? ' selected' : ''}`}
                          onClick={() => togglePortfolio(index)}
                          aria-pressed={selected}
                        >
                          <span className={`am-check${selected ? ' selected' : ''}`} aria-hidden="true">
                            {selected && <Check size={13} strokeWidth={3} />}
                          </span>
                          <img className="am-portfolio-media" src={image} alt={item.title || `Work sample ${index + 1}`} />
                          <span className="am-portfolio-name">{item.title || `Work sample ${index + 1}`}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="am-selection-note">{selectedCount} work sample{selectedCount === 1 ? '' : 's'} selected. Selected samples will be shown to the brand.</p>
                </>
              ) : (
                <div className="am-empty-work">You do not have a portfolio sample saved yet. Upload a work image below and it will be added to this application automatically.</div>
              )}

              <label className="am-upload">
                <ImagePlus size={15} />
                {uploadingWork ? 'Uploading…' : 'Upload another work sample'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingWork}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    await handleWorkUpload(file);
                  }}
                />
              </label>
            </section>

            <section className="am-section">
              <div className="am-section-heading">
                <h3 className="am-section-title">Your rate</h3>
                <span className="am-section-help">Optional</span>
              </div>
              <input
                className="am-input"
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="e.g. 5000"
              />
              <span className="am-hint">For paid campaigns, enter the rate you would like the brand to consider.</span>
            </section>

            <section className="am-section">
              <div className="am-section-heading">
                <h3 className="am-section-title">Message to the brand</h3>
                <span className="am-section-help">Optional</span>
              </div>
              <textarea
                className="am-textarea"
                style={{ minHeight: 72 }}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Anything else the brand should know?"
              />
            </section>

            <div className="am-footer">
              <button type="button" className="am-btn am-btn-cancel" onClick={handleClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="am-btn am-btn-submit" disabled={submitting || profileLoading}>
                {submitting ? <Loader2 size={16} className="am-spin" /> : <Send size={16} />}
                {submitting ? 'Submitting application…' : 'Submit application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

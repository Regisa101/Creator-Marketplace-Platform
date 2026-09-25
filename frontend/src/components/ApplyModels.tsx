import { useEffect, useMemo, useState } from 'react';
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

function mediaUrl(value?: string | null) {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  if (value.startsWith('/api/')) return `http://localhost:8000${value}`;
  return `http://localhost:8000/${value.replace(/^\/+/, '')}`;
}

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.detail || fallback;
}

export function ApplyModal({ isOpen, onClose, campaign, onSuccess }: Props) {
  const [portfolio, setPortfolio] = useState<CreatorPortfolioItemData[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const questions = useMemo(
    () => (campaign.application_questions || []).map((q) => String(q).trim()).filter(Boolean),
    [campaign.application_questions],
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setPortfolio([]);
    setSelected(null);
    setAnswers({});
    setSuccess(false);
    setError('');
    setLoading(true);

    getCreatorProgress()
      .then((result) => {
        if (cancelled) return;
        const items = Array.isArray(result?.profile?.portfolio)
          ? result.profile.portfolio.filter((item: CreatorPortfolioItemData) => item?.media_url)
          : [];
        setPortfolio(items);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load your portfolio. You can upload one image below.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, campaign.id]);

  useEffect(() => {
    if (!isOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; };
  }, [isOpen]);

  if (!isOpen) return null;

  const uploadWork = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadImage(file);
      setPortfolio((current) => {
        const next = [...current, {
          title: file.name.replace(/\.[^.]+$/, ''),
          media_url: url,
          type: 'image',
        }];
        setSelected(next.length - 1);
        return next;
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not upload the work image.'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError('');
    if (selected === null || !portfolio[selected]?.media_url) {
      setError('Please select exactly one appropriate work image.');
      return;
    }
    const missing = questions.findIndex((_, i) => !answers[i]?.trim());
    if (missing !== -1) {
      setError(`Please answer question ${missing + 1}.`);
      return;
    }

    setSubmitting(true);
    try {
      await createApplication({
        campaign_id: campaign.id,
        proposal: 'Application submitted',
        application_answers: questions.map((question, index) => ({
          question,
          answer: answers[index].trim(),
        })),
        selected_portfolio: [portfolio[selected]],
      });
      await onSuccess?.();
      setSuccess(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not submit your application. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="apply-overlay" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <style>{`
        .apply-overlay{position:fixed;inset:0;z-index:3000;background:rgba(15,15,18,.52);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:18px}
        .apply-modal{width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border:1px solid #e7e7e7;border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.2)}
        .apply-head{display:flex;justify-content:space-between;gap:16px;padding:22px 24px 18px;border-bottom:1px solid #eee;position:sticky;top:0;background:rgba(255,255,255,.97);z-index:2}
        .apply-eyebrow{font:600 10px/1.2 Poppins,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8a8490}.apply-title{margin:5px 0 0;font:700 21px/1.15 Poppins,sans-serif;color:#111}.apply-sub{margin:5px 0 0;font:400 12px/1.5 Poppins,sans-serif;color:#777}
        .apply-close{width:34px;height:34px;border:1px solid #e5e5e5;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .apply-body{padding:22px 24px 24px}.apply-section{margin-bottom:22px}.apply-section-title{font:700 13px Poppins,sans-serif;color:#171717;margin-bottom:9px}.apply-help{font:400 11.5px/1.55 Poppins,sans-serif;color:#85818c;margin:0 0 10px}
        .apply-questions{display:flex;flex-direction:column;gap:14px}.apply-label{font:600 12px Poppins,sans-serif;color:#222;display:block;margin-bottom:6px}.apply-label b{color:#111}.apply-textarea{width:100%;min-height:88px;border:1px solid #ddd;border-radius:10px;padding:10px 11px;resize:vertical;outline:none;font:400 12.5px/1.5 Poppins,sans-serif}.apply-textarea:focus{border-color:#111}
        .apply-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.apply-work{position:relative;border:1px solid #e2e2e2;border-radius:10px;overflow:hidden;background:#fafafa;cursor:pointer}.apply-work.selected{border:2px solid #111}.apply-work img{display:block;width:100%;aspect-ratio:1;object-fit:cover}.apply-work-name{font:500 9.5px Poppins,sans-serif;padding:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.apply-check{position:absolute;right:6px;top:6px;width:22px;height:22px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center}
        .apply-upload{border:1px dashed #cfcfcf;border-radius:10px;min-height:90px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font:600 11px Poppins,sans-serif;color:#555;margin-top:10px}.apply-upload:hover{border-color:#111;color:#111}.apply-upload input{display:none}
        .apply-error{padding:10px 12px;border-radius:9px;background:#f7eeee;color:#b12828;font:500 11.5px/1.45 Poppins,sans-serif;margin-bottom:14px}.apply-actions{display:flex;justify-content:flex-end;gap:9px;border-top:1px solid #eee;padding-top:17px}.apply-cancel,.apply-submit{height:40px;padding:0 16px;border-radius:9px;font:600 12px Poppins,sans-serif;cursor:pointer}.apply-cancel{background:#fff;border:1px solid #ddd;color:#555}.apply-submit{background:#111;border:1px solid #111;color:#fff;display:flex;align-items:center;gap:7px}.apply-submit:disabled{opacity:.55;cursor:not-allowed}
        .apply-success{text-align:center;padding:48px 30px 42px}.apply-success-icon{width:58px;height:58px;margin:0 auto 16px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center}.apply-success h2{font:700 22px Poppins,sans-serif;margin:0 0 8px;color:#111}.apply-success p{max-width:400px;margin:0 auto;font:400 13px/1.65 Poppins,sans-serif;color:#777}.apply-success button{margin-top:24px;height:40px;padding:0 20px;border:0;border-radius:9px;background:#111;color:#fff;font:600 12px Poppins,sans-serif;cursor:pointer}
        @media(max-width:560px){.apply-grid{grid-template-columns:repeat(2,1fr)}.apply-head,.apply-body{padding-left:17px;padding-right:17px}}
      `}</style>

      <div className="apply-modal">
        {success ? (
          <div className="apply-success">
            <div className="apply-success-icon"><Check size={28}/></div>
            <h2>Application sent!</h2>
            <p>Your application has been sent to the brand. We’ll notify you when the brand makes a decision.</p>
            <button type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="apply-head">
              <div>
                <div className="apply-eyebrow">Apply to campaign</div>
                <h2 className="apply-title">{campaign.title}</h2>
                <p className="apply-sub">Answer the questions and send one relevant piece of your work.</p>
              </div>
              <button className="apply-close" type="button" onClick={onClose} disabled={submitting}><X size={17}/></button>
            </div>

            <div className="apply-body">
              {loading ? <div style={{padding:'35px 0',textAlign:'center'}}><Loader2 className="spin" size={20}/></div> : <>
                <section className="apply-section">
                  <div className="apply-section-title">1. Your work image *</div>
                  <p className="apply-help">Choose one image that best represents work relevant to this campaign.</p>
                  {portfolio.length > 0 && (
                    <div className="apply-grid">
                      {portfolio.map((item, index) => (
                        <button type="button" key={`${item.media_url}-${index}`} className={`apply-work ${selected === index ? 'selected' : ''}`} onClick={() => setSelected(index)}>
                          <img src={mediaUrl(item.media_url)} alt={item.title || 'Work sample'} />
                          {selected === index && <span className="apply-check"><Check size={13}/></span>}
                          <div className="apply-work-name">{item.title || 'Work sample'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="apply-upload">
                    <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadWork(file); e.currentTarget.value = ''; }} />
                    {uploading ? <Loader2 size={16} className="spin"/> : <ImagePlus size={17}/>} Upload a work image
                  </label>
                </section>

                {questions.length > 0 && <section className="apply-section">
                  <div className="apply-section-title">2. Screening questions *</div>
                  <div className="apply-questions">
                    {questions.map((question, index) => (
                      <label key={`${question}-${index}`}>
                        <span className="apply-label">{question} <b>*</b></span>
                        <textarea className="apply-textarea" value={answers[index] || ''} onChange={(e) => setAnswers((current) => ({...current, [index]: e.target.value}))} placeholder="Your answer..." />
                      </label>
                    ))}
                  </div>
                </section>}

                {error && <div className="apply-error">{error}</div>}
                <div className="apply-actions">
                  <button type="button" className="apply-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
                  <button type="button" className="apply-submit" onClick={() => void submit()} disabled={submitting || uploading}>
                    {submitting ? <Loader2 size={15} className="spin"/> : <Upload size={15}/>} {submitting ? 'Sending...' : 'Send application'}
                  </button>
                </div>
              </>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

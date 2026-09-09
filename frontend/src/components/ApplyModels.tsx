import { useState } from 'react';
import { X, Loader2, Send, AlertCircle } from 'lucide-react';
import { createApplication, type Campaign } from '../api/client';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
  onSuccess?: () => void;
}

export function ApplyModal({ isOpen, onClose, campaign, onSuccess }: ApplyModalProps) {
  const [proposal, setProposal] = useState('');
  const [rate, setRate] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await createApplication({
        campaign_id: campaign.id,
        proposal: proposal.trim(),
        rate: rate || undefined,
        message: message.trim() || undefined,
      });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Application failed:', err);
      setError(err?.response?.data?.detail || 'Could not submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  return (
    <div className="am-overlay" onClick={handleClose}>
      <style>{`
        .am-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .am-modal {
          background: #fff;
          border-radius: 20px;
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          box-shadow: 0 25px 60px -16px rgba(0,0,0,0.35);
          animation: am-fade-in 0.25s ease;
        }
        @keyframes am-fade-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .am-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .am-header-left { flex: 1; }
        .am-header-title { font-size: 20px; font-weight: 700; margin: 0; }
        .am-header-sub { font-size: 13px; color: #6B7280; margin: 4px 0 0; }
        .am-close {
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .am-close:hover { background: #F3F4F6; }

        .am-campaign-preview {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }
        .am-campaign-preview-title { font-size: 14px; font-weight: 600; margin: 0; }
        .am-campaign-preview-meta { font-size: 12px; color: #6B7280; margin: 2px 0 0; }
        .am-campaign-preview-budget { font-size: 13px; font-weight: 600; color: #16A34A; margin: 4px 0 0; }

        .am-form { display: flex; flex-direction: column; gap: 16px; }
        .am-field { display: flex; flex-direction: column; gap: 5px; }
        .am-label { font-size: 13px; font-weight: 600; color: #1F2937; }
        .am-label .am-required { color: #EF4444; }
        .am-textarea {
          width: 100%;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          color: #111217;
          resize: vertical;
          min-height: 100px;
          transition: border-color 0.15s ease;
        }
        .am-textarea:focus {
          outline: none;
          border-color: #FF6B5A;
          box-shadow: 0 0 0 3px rgba(255,107,90,0.12);
        }
        .am-input {
          width: 100%;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          color: #111217;
          transition: border-color 0.15s ease;
        }
        .am-input:focus {
          outline: none;
          border-color: #FF6B5A;
          box-shadow: 0 0 0 3px rgba(255,107,90,0.12);
        }
        .am-hint { font-size: 12px; color: #6B7280; }

        .am-error {
          font-size: 13px;
          color: #EF4444;
          background: #FEE2E2;
          border-radius: 10px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .am-actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }
        .am-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 12px 20px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .am-btn-cancel {
          background: #F3F4F6;
          color: #4B5563;
        }
        .am-btn-cancel:hover { background: #E5E7EB; }
        .am-btn-submit {
          background: #FF6B5A;
          color: #fff;
          box-shadow: 0 8px 18px -8px rgba(255,107,90,0.4);
        }
        .am-btn-submit:hover { background: #F0523F; transform: translateY(-1px); }
        .am-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .am-spin { animation: am-spin 0.8s linear infinite; }
        @keyframes am-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="am-modal" onClick={(e) => e.stopPropagation()}>
        <div className="am-header">
          <div className="am-header-left">
            <h3 className="am-header-title">Apply to Campaign</h3>
            <p className="am-header-sub">Tell the brand why you're the right fit</p>
          </div>
          <button className="am-close" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="am-campaign-preview">
          <p className="am-campaign-preview-title">{campaign.title}</p>
          <p className="am-campaign-preview-meta">
            {campaign.brand_name || 'Brand'} · {campaign.category}
          </p>
          {campaign.campaign_type === 'paid' && campaign.budget && (
            <p className="am-campaign-preview-budget">💰 NPR {campaign.budget}</p>
          )}
          {campaign.campaign_type === 'gifted' && campaign.compensation_description && (
            <p className="am-campaign-preview-budget">🎁 {campaign.compensation_description}</p>
          )}
        </div>

        <form className="am-form" onSubmit={handleSubmit}>
          {error && (
            <div className="am-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="am-field">
            <label className="am-label">
              Proposal <span className="am-required">*</span>
            </label>
            <textarea
              className="am-textarea"
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              placeholder="Why are you the right creator for this campaign? What's your creative approach?"
              required
            />
          </div>

          <div className="am-field">
            <label className="am-label">Rate (NPR)</label>
            <input
              className="am-input"
              type="number"
              min="0"
              step="100"
              value={rate || ''}
              onChange={(e) => setRate(e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 5000"
            />
            <span className="am-hint">Optional — only for paid campaigns</span>
          </div>

          <div className="am-field">
            <label className="am-label">Message to Brand</label>
            <textarea
              className="am-textarea"
              style={{ minHeight: '60px' }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any additional notes for the brand..."
            />
          </div>

          <div className="am-actions">
            <button type="button" className="am-btn am-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="am-btn am-btn-submit" disabled={submitting || !proposal.trim()}>
              {submitting ? (
                <>
                  <Loader2 size={18} className="am-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
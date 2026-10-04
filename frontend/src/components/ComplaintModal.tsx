import { useState } from 'react';
import { X } from 'lucide-react';

import { fileComplaint } from '../api/client';
import type { ComplaintInput } from '../api/client';

const USER_CATEGORIES: Record<'creator' | 'business', { value: string; label: string }[]> = {
  // A creator reporting a business
  creator: [
    { value: 'non_payment', label: 'Did not pay the agreed compensation' },
    { value: 'scam', label: 'Scam or misleading campaign' },
    { value: 'harassment', label: 'Harassment or abuse' },
    { value: 'off_platform', label: 'Asked to pay or work outside CreatorHub' },
    { value: 'fake_profile', label: 'Fake business profile' },
    { value: 'other', label: 'Something else' },
  ],
  // A business reporting a creator
  business: [
    { value: 'no_delivery', label: 'Did not deliver the agreed work' },
    { value: 'plagiarism', label: 'Plagiarised or copyrighted content' },
    { value: 'harassment', label: 'Harassment or abuse' },
    { value: 'spam', label: 'Spam' },
    { value: 'off_platform', label: 'Asked to work outside CreatorHub' },
    { value: 'fake_profile', label: 'Fake creator profile' },
    { value: 'other', label: 'Something else' },
  ],
};

const PLATFORM_CATEGORIES = [
  { value: 'platform_bug', label: 'Something is not working' },
  { value: 'payment_issue', label: 'Payment or fee problem' },
  { value: 'unfair_restriction', label: 'My account or campaign was restricted unfairly' },
  { value: 'other', label: 'Something else' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Who is filing: decides which reasons are offered. */
  role: 'creator' | 'business';
  /** The person or campaign being reported. Omit for a complaint about CreatorHub. */
  against?: { type: 'user' | 'campaign'; userId?: number; campaignId?: number; name: string };
  contractId?: number;
  onFiled?: () => void;
}

export function ComplaintModal({ open, onClose, role, against, contractId, onFiled }: Props) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!open) return null;

  const categories = against ? USER_CATEGORIES[role] : PLATFORM_CATEGORIES;

  const close = () => {
    setCategory('');
    setDescription('');
    setEvidence('');
    setError('');
    setDone(false);
    onClose();
  };

  const submit = async () => {
    if (!category) return setError('Please choose what the problem is.');
    if (description.trim().length < 20) return setError('Please describe what happened in at least 20 characters.');
    setBusy(true);
    setError('');
    try {
      const payload: ComplaintInput = {
        target_type: against ? against.type : 'platform',
        target_user_id: against?.userId,
        target_campaign_id: against?.campaignId,
        contract_id: contractId,
        category,
        description: description.trim(),
        evidence_urls: evidence.split('\n').map((x) => x.trim()).filter(Boolean),
      };
      await fileComplaint(payload);
      setDone(true);
      onFiled?.();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not send your complaint. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cpl-backdrop" onClick={busy ? undefined : close}>
      <style>{CSS}</style>
      <div className="cpl-modal" role="dialog" aria-modal="true" aria-labelledby="cpl-title" onClick={(e) => e.stopPropagation()}>
        <div className="cpl-head">
          <h3 id="cpl-title">{against ? `Report ${against.name}` : 'Report a problem with CreatorHub'}</h3>
          <button type="button" className="cpl-x" onClick={close} aria-label="Close"><X size={16} /></button>
        </div>

        {done ? (
          <>
            <p className="cpl-text">Thank you. Our team will review your complaint. Only CreatorHub admins can see it, and you will get a notification when we have looked at it.</p>
            <div className="cpl-actions"><button type="button" className="btn btn-primary" onClick={close}>Close</button></div>
          </>
        ) : (
          <>
            <p className="cpl-text">Your complaint is private. {against ? `${against.name} will not be told who reported them.` : ''}</p>

            <label className="cpl-label" htmlFor="cpl-cat">What is the problem? *</label>
            <select id="cpl-cat" className="cpl-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>

            <label className="cpl-label" htmlFor="cpl-desc">What happened? *</label>
            <textarea id="cpl-desc" className="cpl-input cpl-textarea" rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what happened, with dates if you can." />

            <label className="cpl-label" htmlFor="cpl-ev">Evidence links (optional, one per line)</label>
            <textarea id="cpl-ev" className="cpl-input cpl-textarea" rows={2} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="https://…" />

            <p className="cpl-warn">Please only report real problems. False reports can lead to action on your own account.</p>
            {error && <div className="cpl-error" role="alert">{error}</div>}
            <div className="cpl-actions">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={close}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Sending…' : 'Send complaint'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.cpl-backdrop{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(17,17,17,.42)}
.cpl-modal{width:100%;max-width:460px;max-height:92vh;overflow:auto;padding:22px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2);font-family:Poppins,sans-serif;color:#111}
.cpl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.cpl-head h3{margin:0 0 6px;font:600 16px Poppins,sans-serif}
.cpl-x{border:0;background:transparent;color:#555;cursor:pointer;padding:4px;border-radius:8px}
.cpl-x:hover{background:#f3f3f3}
.cpl-text{margin:0 0 6px;color:#555;font:400 12.5px/1.55 Poppins,sans-serif}
.cpl-label{display:block;margin:12px 0 6px;color:#555;font:500 11.5px Poppins,sans-serif}
.cpl-input{width:100%;box-sizing:border-box;border:1px solid #e0e0e0;border-radius:8px;padding:9px 12px;background:#fff;color:#111;font:400 12.5px Poppins,sans-serif;outline:none}
.cpl-input:focus{border-color:#111}
.cpl-textarea{resize:vertical;line-height:1.5}
.cpl-warn{margin:12px 0 0;color:#888;font:400 11px/1.5 Poppins,sans-serif}
.cpl-error{margin-top:12px;padding:10px 12px;border-radius:9px;background:#f8eeee;color:#a52b2b;font:500 12px Poppins,sans-serif}
.cpl-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
`;
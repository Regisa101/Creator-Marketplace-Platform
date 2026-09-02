import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, X, Trash2, Camera, Info } from 'lucide-react';
import {
  createCampaign,
  publishCampaign,
  uploadImage,
  type CampaignType,
  type ChecklistItem,
  type VideoSpec,
} from '../api/client';

const VIOLET = '#6C5DD3';
const VIOLET_DARK = '#4A3BA8';

// Same category list as CreatorProfile/BusinessOnboarding's
// "interested categories" so campaign categories line up with what
// creators already filter by. Kept local here rather than shared yet
// since only this file needs it so far.
const CATEGORIES = [
  'Beauty', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness', 'Travel',
  'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor',
  'Parenting', 'Entertainment',
];

// Reusable "type text, hit Enter/Add, get a removable chip" editor —
// backs Deliverables, Required Scenes, Do's, Don'ts, and Hashtags below.
// Each of those is just a string[] on the backend, so one component
// covers all five instead of duplicating this input+chip markup five times.
function TagListField({
  label,
  placeholder,
  items,
  onChange,
  hint,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  hint?: string;
}) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft('');
  };

  return (
    <div className="cc-field">
      <label className="cc-label">{label}</label>
      <div className="cc-taglist-input-row">
        <input
          className="cc-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="cc-taglist-add" onClick={addItem}>
          <Plus size={16} />
        </button>
      </div>
      {hint && <div className="cc-hint">{hint}</div>}
      {items.length > 0 && (
        <div className="cc-taglist-chips">
          {items.map((item, i) => (
            <span className="cc-chip" key={i}>
              {item}
              <button
                type="button"
                className="cc-chip-remove"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CampaignCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroError, setHeroError] = useState('');
  const [category, setCategory] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>('gifted');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [compensationDescription, setCompensationDescription] = useState('');
  const [brandLocation, setBrandLocation] = useState('');
  const [deadline, setDeadline] = useState('');

  const [requirements, setRequirements] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [requiredScenes, setRequiredScenes] = useState<string[]>([]);
  const [dos, setDos] = useState<string[]>([]);
  const [donts, setDonts] = useState<string[]>([]);
  const [suggestedCaption, setSuggestedCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [videoSpecs, setVideoSpecs] = useState<VideoSpec[]>([]);

  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState('');

  const addVideoSpec = () => {
    setVideoSpecs([
      ...videoSpecs,
      { platform: '', duration: '', aspect_ratio: '', voiceover_required: false, subtitles_required: false },
    ]);
  };

  const updateVideoSpec = (index: number, patch: Partial<VideoSpec>) => {
    setVideoSpecs(videoSpecs.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)));
  };

  const removeVideoSpec = (index: number) => {
    setVideoSpecs(videoSpecs.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    if (title.trim().length < 3) return 'Title needs to be at least 3 characters.';
    if (!category) return 'Pick a category.';
    if (description.trim().length < 10) return 'Description needs to be at least 10 characters.';
    if (campaignType === 'paid' && budget && Number(budget) <= 0) {
      return 'Budget must be greater than 0, or left blank.';
    }
    return null;
  };

  const handleSubmit = async (mode: 'draft' | 'publish') => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(mode);
    setError('');
    try {
      const created = await createCampaign({
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        category,
        campaign_type: campaignType,
        description: description.trim(),
        budget: budget ? Number(budget) : undefined,
        compensation_description: compensationDescription.trim() || undefined,
        brand_location: brandLocation.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        requirements: requirements.trim() || undefined,
        deliverables: deliverables.length > 0 ? deliverables : undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
        required_scenes: requiredScenes.length > 0 ? requiredScenes : undefined,
        video_specs:
          videoSpecs.length > 0
            ? videoSpecs.filter((s) => s.platform.trim()) // drop rows left blank
            : undefined,
        dos: dos.length > 0 ? dos : undefined,
        donts: donts.length > 0 ? donts : undefined,
        suggested_caption: suggestedCaption.trim() || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        hero_image: heroImage || undefined,
      });

      if (mode === 'publish') {
        await publishCampaign(created.id);
      }

      navigate(`/campaigns/${created.id}`);
    } catch (err: any) {
      console.error('Could not create campaign:', err);
      setError(err?.response?.data?.detail || 'Could not save this campaign. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="cc">
      <style>{`
        .cc {
          --violet: ${VIOLET};
          --violet-dark: ${VIOLET_DARK};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: #fbfaff;
          color: var(--ink);
        }
        .cc * { box-sizing: border-box; }

        .cc-topbar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .cc-logo { font-weight: 700; font-size: 17px; }

        .cc-body { max-width: 720px; margin: 0 auto; padding: 32px 24px 80px; }

        .cc-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-soft);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 0;
          margin-bottom: 16px;
        }
        .cc-back:hover { color: var(--ink); }

        .cc-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        .cc-sub { font-size: 13.5px; color: var(--ink-soft); margin: 0 0 28px; }

        .cc-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 28px;
        }

        .cc-field { margin-bottom: 18px; }
        .cc-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; }
        .cc-input, .cc-textarea, .cc-select {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 11px 13px;
          font-size: 14px;
          font-family: inherit;
          color: var(--ink);
          background: #fff;
        }
        .cc-textarea { min-height: 100px; resize: vertical; }
        .cc-input:focus, .cc-textarea:focus, .cc-select:focus {
          outline: none;
          border-color: var(--violet);
        }
        .cc-hint { font-size: 12px; color: var(--ink-soft); margin-top: 5px; display: flex; align-items: flex-start; gap: 5px; }

        .cc-hero {
          width: 100%;
          height: 160px;
          border-radius: 12px;
          border: 1.5px dashed var(--line);
          background: #fafafd;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
          margin-bottom: 10px;
        }
        .cc-hero img { width: 100%; height: 100%; object-fit: cover; }
        .cc-hero-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: var(--ink-soft);
          font-size: 12.5px;
        }
        .cc-hero-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          color: var(--violet-dark);
          background: #f2f0fc;
          border: 1px solid #ded8f7;
          border-radius: 8px;
          padding: 9px 16px;
          cursor: pointer;
        }
        .cc-hero-remove {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(17,18,23,0.55);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .cc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 540px) { .cc-row { grid-template-columns: 1fr; } }

        .cc-type-toggle { display: flex; gap: 10px; }
        .cc-type-btn {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: #fff;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink-soft);
          cursor: pointer;
          text-align: center;
        }
        .cc-type-btn--active { border-color: var(--violet); color: var(--violet-dark); background: #f2f0fc; }

        .cc-error {
          font-size: 13px;
          color: #d64545;
          background: #fdecec;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 18px;
        }

        .cc-actions { display: flex; gap: 10px; margin-top: 8px; }
        .cc-btn-draft, .cc-btn-publish {
          flex: 1;
          padding: 13px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .cc-btn-draft { border: 1px solid var(--line); background: #fff; color: var(--ink); }
        .cc-btn-publish { border: none; background: var(--violet); color: #fff; }
        .cc-btn-draft:disabled, .cc-btn-publish:disabled { opacity: 0.6; cursor: not-allowed; }
        .cc-spin { animation: cc-spin 0.8s linear infinite; }
        @keyframes cc-spin { to { transform: rotate(360deg); } }

        .cc-section-divider {
          border: none;
          border-top: 1px solid var(--line);
          margin: 8px 0 24px;
        }
        .cc-section-heading { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
        .cc-section-sub { font-size: 12.5px; color: var(--ink-soft); margin: 0 0 16px; }

        .cc-taglist-input-row { display: flex; gap: 8px; }
        .cc-taglist-input-row .cc-input { flex: 1; }
        .cc-taglist-add {
          flex-shrink: 0;
          width: 42px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--violet-dark);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cc-taglist-add:hover { background: #f2f0fc; border-color: var(--violet); }
        .cc-taglist-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .cc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 500;
          background: #f2f0fc;
          color: var(--violet-dark);
          border-radius: 999px;
          padding: 6px 8px 6px 12px;
        }
        .cc-chip-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--violet-dark);
          cursor: pointer;
          padding: 2px;
          opacity: 0.7;
        }
        .cc-chip-remove:hover { opacity: 1; }

        .cc-spec-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          position: relative;
        }
        .cc-spec-card-remove {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          color: var(--ink-soft);
          cursor: pointer;
        }
        .cc-spec-card-remove:hover { color: #d64545; }
        .cc-spec-row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        @media (max-width: 540px) { .cc-spec-row-inputs { grid-template-columns: 1fr; } }
        .cc-spec-checks { display: flex; gap: 18px; }
        .cc-spec-check { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink); }
        .cc-add-spec-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--violet-dark);
          background: #f2f0fc;
          border: 1px dashed var(--violet);
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          width: 100%;
          justify-content: center;
        }
      `}</style>

      <div className="cc-topbar">
        <span className="cc-logo">CreatorKhoj</span>
      </div>

      <div className="cc-body">
        <button className="cc-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 className="cc-title">Create a Campaign</h1>
        <p className="cc-sub">
          Fill in the basics now — you can add requirements, checklists, and video specs after.
        </p>

        <div className="cc-card">
          {error && <div className="cc-error">{error}</div>}

          <div className="cc-field">
            <label className="cc-label">Cover Image</label>
            <div className="cc-hero">
              {heroImage ? (
                <>
                  <img src={heroImage} alt="Campaign cover" />
                  <button
                    type="button"
                    className="cc-hero-remove"
                    onClick={() => setHeroImage('')}
                    aria-label="Remove cover image"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <div className="cc-hero-placeholder">
                  <Camera size={22} />
                  No cover image yet
                </div>
              )}
            </div>
            <label
              className="cc-hero-btn"
              style={uploadingHero ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
            >
              <Camera size={14} />
              {uploadingHero ? 'Uploading…' : heroImage ? 'Replace image' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                disabled={uploadingHero}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setHeroError('');
                  setUploadingHero(true);
                  try {
                    const { url } = await uploadImage(file);
                    setHeroImage(url);
                  } catch (err: any) {
                    console.error('Cover image upload failed:', err);
                    setHeroError(err?.response?.data?.detail || 'Could not upload image. Please try again.');
                  } finally {
                    setUploadingHero(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            <div className="cc-hint">
              <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
              JPG, PNG or WebP — shown at the top of the campaign page.
            </div>
            {heroError && (
              <div className="cc-hint" style={{ color: '#d64545' }}>
                <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                {heroError}
              </div>
            )}
          </div>

          <div className="cc-field">
            <label className="cc-label">Campaign Title *</label>
            <input
              className="cc-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bring Paper Back to Life with Paper Made Paper"
            />
          </div>

          <div className="cc-field">
            <label className="cc-label">Tagline</label>
            <input
              className="cc-input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short one-liner shown under the title"
            />
          </div>

          <div className="cc-row">
            <div className="cc-field">
              <label className="cc-label">Category *</label>
              <select className="cc-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="cc-field">
              <label className="cc-label">Location</label>
              <input
                className="cc-input"
                value={brandLocation}
                onChange={(e) => setBrandLocation(e.target.value)}
                placeholder="e.g. Kathmandu Valley, Nepal"
              />
            </div>
          </div>

          <div className="cc-field">
            <label className="cc-label">Campaign Type *</label>
            <div className="cc-type-toggle">
              <button
                type="button"
                className={`cc-type-btn ${campaignType === 'gifted' ? 'cc-type-btn--active' : ''}`}
                onClick={() => setCampaignType('gifted')}
              >
                🎁 Gifted
              </button>
              <button
                type="button"
                className={`cc-type-btn ${campaignType === 'paid' ? 'cc-type-btn--active' : ''}`}
                onClick={() => setCampaignType('paid')}
              >
                $ Paid
              </button>
            </div>
          </div>

          <div className="cc-field">
            <label className="cc-label">About This Campaign *</label>
            <textarea
              className="cc-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you looking for creators to make, and why?"
            />
            <div className="cc-hint">Shown as the main description on the campaign page. Minimum 10 characters.</div>
          </div>

          {campaignType === 'paid' ? (
            <div className="cc-field">
              <label className="cc-label">Budget (Rs.)</label>
              <input
                className="cc-input"
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 2000"
              />
            </div>
          ) : (
            <div className="cc-field">
              <label className="cc-label">Compensation Details</label>
              <textarea
                className="cc-textarea"
                value={compensationDescription}
                onChange={(e) => setCompensationDescription(e.target.value)}
                placeholder="What are you gifting, and what's it worth?"
              />
            </div>
          )}

          <div className="cc-field">
            <label className="cc-label">Application Deadline</label>
            <input
              className="cc-input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <hr className="cc-section-divider" />
          <div className="cc-section-heading">Requirements &amp; Deliverables</div>
          <div className="cc-section-sub">What creators need to bring, and what they owe you.</div>

          <div className="cc-field">
            <label className="cc-label">Requirements</label>
            <textarea
              className="cc-textarea"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="What kind of content style, audience, or experience are you looking for?"
            />
          </div>

          <TagListField
            label="Deliverables"
            placeholder="e.g. 1 Instagram Reel or TikTok video"
            items={deliverables}
            onChange={setDeliverables}
          />

          <div className="cc-field">
            <label className="cc-label">Quick Checklist</label>
            <div className="cc-taglist-input-row">
              <input
                className="cc-input"
                value={checklistDraft}
                onChange={(e) => setChecklistDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = checklistDraft.trim();
                    if (!value) return;
                    setChecklist([...checklist, { text: value, checked: true }]);
                    setChecklistDraft('');
                  }
                }}
                placeholder="e.g. Format: 15 sec or longer, 9:16"
              />
              <button
                type="button"
                className="cc-taglist-add"
                onClick={() => {
                  const value = checklistDraft.trim();
                  if (!value) return;
                  setChecklist([...checklist, { text: value, checked: true }]);
                  setChecklistDraft('');
                }}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="cc-hint">Short pass/fail requirements shown as a checklist grid.</div>
            {checklist.length > 0 && (
              <div className="cc-taglist-chips">
                {checklist.map((item, i) => (
                  <span className="cc-chip" key={i}>
                    {item.text}
                    <button
                      type="button"
                      className="cc-chip-remove"
                      onClick={() => setChecklist(checklist.filter((_, idx) => idx !== i))}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <TagListField
            label="Required Scenes"
            placeholder="e.g. Show the product clearly at the beginning"
            items={requiredScenes}
            onChange={setRequiredScenes}
            hint="Shown as a numbered shot list, in the order you add them."
          />

          <hr className="cc-section-divider" />
          <div className="cc-section-heading">Do's &amp; Don'ts</div>
          <div className="cc-section-sub">Set the creative guardrails up front.</div>

          <TagListField
            label="Do"
            placeholder="e.g. Use natural lighting if possible"
            items={dos}
            onChange={setDos}
          />
          <TagListField
            label="Don't"
            placeholder="e.g. Use blurry or dark footage"
            items={donts}
            onChange={setDonts}
          />

          <hr className="cc-section-divider" />
          <div className="cc-section-heading">Caption &amp; Tags</div>
          <div className="cc-section-sub">Give creators a starting point they can tweak.</div>

          <div className="cc-field">
            <label className="cc-label">Suggested Caption</label>
            <textarea
              className="cc-textarea"
              value={suggestedCaption}
              onChange={(e) => setSuggestedCaption(e.target.value)}
              placeholder="A caption creators can use as-is or adapt to their voice."
            />
          </div>

          <TagListField
            label="Hashtags"
            placeholder="e.g. #handmadepaper"
            items={hashtags}
            onChange={setHashtags}
          />

          <hr className="cc-section-divider" />
          <div className="cc-section-heading">Video Specs</div>
          <div className="cc-section-sub">One card per platform (e.g. TikTok, Instagram Reel).</div>

          {videoSpecs.map((spec, i) => (
            <div className="cc-spec-card" key={i}>
              <button type="button" className="cc-spec-card-remove" onClick={() => removeVideoSpec(i)}>
                <Trash2 size={15} />
              </button>
              <div className="cc-spec-row-inputs">
                <div>
                  <label className="cc-label">Platform</label>
                  <input
                    className="cc-input"
                    value={spec.platform}
                    onChange={(e) => updateVideoSpec(i, { platform: e.target.value })}
                    placeholder="e.g. TikTok"
                  />
                </div>
                <div>
                  <label className="cc-label">Duration</label>
                  <input
                    className="cc-input"
                    value={spec.duration || ''}
                    onChange={(e) => updateVideoSpec(i, { duration: e.target.value })}
                    placeholder="e.g. 15-30 seconds"
                  />
                </div>
              </div>
              <div className="cc-spec-row-inputs">
                <div>
                  <label className="cc-label">Aspect Ratio</label>
                  <input
                    className="cc-input"
                    value={spec.aspect_ratio || ''}
                    onChange={(e) => updateVideoSpec(i, { aspect_ratio: e.target.value })}
                    placeholder="e.g. 9:16"
                  />
                </div>
                <div>
                  <label className="cc-label" style={{ visibility: 'hidden' }}>
                    spacer
                  </label>
                  <div className="cc-spec-checks">
                    <label className="cc-spec-check">
                      <input
                        type="checkbox"
                        checked={spec.voiceover_required}
                        onChange={(e) => updateVideoSpec(i, { voiceover_required: e.target.checked })}
                      />
                      Voiceover required
                    </label>
                    <label className="cc-spec-check">
                      <input
                        type="checkbox"
                        checked={spec.subtitles_required}
                        onChange={(e) => updateVideoSpec(i, { subtitles_required: e.target.checked })}
                      />
                      Subtitles required
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="cc-add-spec-btn" onClick={addVideoSpec}>
            <Plus size={15} /> Add a platform
          </button>

          <hr className="cc-section-divider" style={{ marginTop: 24 }} />

          <div className="cc-actions">
            <button
              className="cc-btn-draft"
              onClick={() => handleSubmit('draft')}
              disabled={saving !== null}
            >
              {saving === 'draft' && <Loader2 size={15} className="cc-spin" />}
              Save as Draft
            </button>
            <button
              className="cc-btn-publish"
              onClick={() => handleSubmit('publish')}
              disabled={saving !== null}
            >
              {saving === 'publish' && <Loader2 size={15} className="cc-spin" />}
              Publish Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
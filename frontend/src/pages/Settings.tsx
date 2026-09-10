// frontend/src/pages/Settings.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Plus, X, Trash2, Camera, Info, Settings, Sparkles, CheckCircle2, Gift, DollarSign } from 'lucide-react';
import {
  createCampaign,
  updateCampaign,
  publishCampaign,
  uploadImage,
  getCampaign,
  getBusinessProgress,
  saveBusinessProgress,
  getCampaignDefaults,
  saveCampaignDefaults,
  type Campaign,
  type CampaignType,
  type CreatorRequirements,
  type ChecklistItem,
  type VideoSpec,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LogoMark, BRAND_NAME, PAGE_GRADIENT_BG } from '../components/Brand';

const VIOLET = '#1E2A78';
const VIOLET_DARK = '#182262';

// Same category list as CreatorProfile/BusinessOnboarding's
// "interested categories" so campaign categories line up with what
// creators already filter by. Kept local here rather than shared yet
// since only this file needs it so far.
const CATEGORIES = [
  'Beauty', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness', 'Travel',
  'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor',
  'Parenting', 'Entertainment',
];

// Curated starter suggestions per category. Deliberately a plain
// lookup table, not anything smarter — easy to extend later, and the
// user can always ignore/edit what gets added. Nothing here is forced
// into the campaign automatically; each item only gets added when the
// business clicks "+ Add".
const CATEGORY_SUGGESTIONS: Record<string, { dos: string[]; deliverables: string[]; hashtags: string[] }> = {
  Beauty: {
    dos: ['Show product application step by step', 'Use good lighting on skin/face', 'Include a close-up of texture and packaging'],
    deliverables: ['1 Instagram Reel', '1 Instagram Story'],
    hashtags: ['#beauty', '#skincare'],
  },
  Fashion: {
    dos: ['Show the full outfit styled', 'Include a fit/sizing note', 'Use natural lighting'],
    deliverables: ['1 Instagram Reel or TikTok', '1 Story with try-on'],
    hashtags: ['#fashion', '#ootd'],
  },
  Lifestyle: {
    dos: ['Show it in a real, everyday setting', 'Keep the tone warm and relatable'],
    deliverables: ['1 Reel', '1 Story'],
    hashtags: ['#lifestyle'],
  },
  Food: {
    dos: ['Show the product or dish up close', 'Include a genuine taste reaction'],
    deliverables: ['1 Reel', '1 Story'],
    hashtags: ['#foodie', '#nepalifood'],
  },
  Tech: {
    dos: ['Demonstrate the key feature clearly', 'Mention specs relevant to the audience'],
    deliverables: ['1 Review Reel', '1 Unboxing Story'],
    hashtags: ['#tech', '#gadgets'],
  },
  Fitness: {
    dos: ['Show proper form during use', 'Film in good lighting with clear movement'],
    deliverables: ['1 Workout Reel', '1 Story'],
    hashtags: ['#fitness', '#workout'],
  },
  Travel: {
    dos: ['Show the location or experience clearly', 'Include a personal reaction or tip'],
    deliverables: ['1 Reel', '1 Story series'],
    hashtags: ['#travel', '#nepal'],
  },
  Gaming: {
    dos: ['Show clear gameplay footage', 'Keep energy high and authentic'],
    deliverables: ['1 Gameplay Reel/Short', '1 Story'],
    hashtags: ['#gaming'],
  },
  Education: {
    dos: ['Explain the key takeaway clearly', 'Use simple, engaging language'],
    deliverables: ['1 Educational Reel/Short', '1 Story'],
    hashtags: ['#learnontiktok', '#education'],
  },
  Finance: {
    dos: ['Keep claims accurate and simple', 'Add a clear disclaimer where relevant'],
    deliverables: ['1 Explainer Reel', '1 Story'],
    hashtags: ['#finance', '#money'],
  },
  Wellness: {
    dos: ['Keep the tone calm and genuine', 'Show the product or practice in daily use'],
    deliverables: ['1 Reel', '1 Story'],
    hashtags: ['#wellness', '#selfcare'],
  },
  Skincare: {
    dos: ['Show application step by step', 'Use natural, well-lit close-ups'],
    deliverables: ['1 Reel', '1 Story'],
    hashtags: ['#skincare', '#glowup'],
  },
  'Home Decor': {
    dos: ['Show it styled in a real room', 'Use natural daylight where possible'],
    deliverables: ['1 Reel', '1 Story'],
    hashtags: ['#homedecor', '#interiordesign'],
  },
  Parenting: {
    dos: ['Keep it honest and relatable', 'Show real day-to-day use'],
    deliverables: ['1 Reel', '1 Story'],
    hashtags: ['#parenting', '#momsoftiktok'],
  },
  Entertainment: {
    dos: ['Keep energy high and on-brand', 'Hook viewers in the first 3 seconds'],
    deliverables: ['1 Reel/Short'],
    hashtags: ['#entertainment'],
  },
};

// Common checklist requirements businesses ask for over and over.
// Clicking one just adds it to `checklist` like typing it would —
// custom typed items still work exactly the same, this is purely a
// shortcut. Easy to extend: add a string, done.
const PRESET_CHECKLIST_ITEMS = [
  'Vertical 9:16', 'Voiceover required', 'Show product packaging', 'Show product clearly',
  'Natural lighting', 'Product close-up', 'Include CTA', 'Mention brand name',
  'Demonstrate product usage', 'No copyrighted music', 'Include subtitles', 'Show before/after',
];

// Splits pasted text into multiple items on commas/newlines. Text with
// no comma or newline is treated as ONE item (matches the browser's
// normal single-paste behavior) rather than guessing word-group
// boundaries with no delimiter to key off — there's no reliable way to
// know "close-up shots" should stay together vs "close" + "up" +
// "shots" without punctuation marking the split points.
function parsePastedList(text: string): string[] {
  return text
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Case-insensitive dedupe against an existing list, preserving the
// existing items' original casing and only adding genuinely new ones.
function addUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((i) => i.toLowerCase()));
  const toAdd: string[] = [];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      toAdd.push(item);
    }
  }
  return toAdd.length > 0 ? [...existing, ...toAdd] : existing;
}

// Reusable "type text, hit Enter/Add, get a removable chip" editor —
// backs Deliverables, Required Scenes, Do's, Don'ts, and Hashtags below.
// Each of those is just a string[] on the backend, so one component
// covers all five instead of duplicating this input+chip markup five times.
// Supports pasting multiple comma/newline-separated values at once, in
// addition to the normal one-at-a-time Enter behavior. Both paths dedupe
// case-insensitively against what's already in the list.
// Exported so other pages (e.g. Settings.tsx's Campaign Defaults
// editor) can reuse the exact same chip/paste input instead of
// re-implementing it.
export function TagListField({
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
    onChange(addUnique(items, [value]));
    setDraft('');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!/[,\n]/.test(text)) return; // no delimiter -> let the browser paste it normally as one item
    e.preventDefault();
    const parts = parsePastedList(text);
    if (parts.length === 0) return;
    onChange(addUnique(items, parts));
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
          onPaste={handlePaste}
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

const STEP_LABELS = ['Basics', 'Requirements', 'Guidelines', 'Caption', 'Video Specs'];

// One-line descriptions shown under each step's title in the sidebar
// while that step hasn't been reached yet — swapped for a live status
// ("Filling in now" / "Done") once you're on it or past it.
const STEP_DESCRIPTIONS = [
  'Title, category & compensation',
  'Deliverables & checklist',
  "Do's and don'ts for creators",
  'Suggested caption & hashtags',
  'Format rules per platform',
];

// Big editorial-style heading shown above the fields for each step —
// framed as a question, same spirit as a qualification-gate wizard.
const STEP_QUESTIONS = [
  "What's this campaign about?",
  'What do creators need to deliver?',
  'What are your creative guardrails?',
  'How should creators caption it?',
  'Any platform-specific video rules?',
];

const STEP_SUBTITLES = [
  'The essentials creators see first — title, category, and what you\'re offering.',
  'Tell creators what to bring, and what they owe you.',
  'Set the creative guardrails up front.',
  'Give creators a starting point they can tweak.',
  'One card per platform (e.g. TikTok, Instagram Reel). Optional — skip if you don\'t need this yet.',
];

// Persistent left-hand sidebar replacing the old horizontal dot
// stepper — same idea (numbered progress, clickable since every step
// past Basics is optional) but laid out as a vertical "qualification
// gates" list: title + a one-line description that swaps for a live
// status once you're on or past that step.
function StepSidebar({
  step,
  onStepClick,
  mode,
}: {
  step: number;
  onStepClick: (n: number) => void;
  mode: 'create' | 'edit';
}) {
  return (
    <aside className="cc-sidebar">
      <div className="cc-sidebar-brand">
        <LogoMark size={20} /> {BRAND_NAME}
      </div>
      <div className="cc-sidebar-tagline">{mode === 'edit' ? 'Editing campaign' : 'New campaign'}</div>

      <hr className="cc-sidebar-divider" />

      <div className="cc-sidebar-eyebrow">Campaign Steps</div>
      <div className="cc-sidebar-meta">5 sections · only Basics is required</div>

      <div className="cc-sidebar-steps">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const state = number < step ? 'done' : number === step ? 'active' : 'upcoming';
          const caption =
            state === 'done' ? 'Done' : state === 'active' ? 'Filling in now' : STEP_DESCRIPTIONS[index];

          return (
            <button
              type="button"
              className="cc-sidebar-step"
              key={label}
              onClick={() => onStepClick(number)}
            >
              <span className="cc-sidebar-dotcol">
                <span className={`cc-sidebar-dot cc-sidebar-dot--${state}`}>
                  {state === 'done' && <CheckCircle2 size={12} />}
                </span>
                {number < STEP_LABELS.length && (
                  <span className={`cc-sidebar-line ${number < step ? 'cc-sidebar-line--done' : ''}`} />
                )}
              </span>
              <span className="cc-sidebar-step-text">
                <span className={`cc-sidebar-step-title cc-sidebar-step-title--${state}`}>{label}</span>
                <span className={`cc-sidebar-step-caption cc-sidebar-step-caption--${state}`}>{caption}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function CampaignForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroError, setHeroError] = useState('');
  const [brandName, setBrandName] = useState('');
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

  // Which of the 5 numbered steps is currently visible. Starts at 1
  // always — even in edit mode — since every step but Basics is
  // optional and the dots let someone jump straight to whichever one
  // they actually want to change.
  const [step, setStep] = useState(1);

  // ------------------------------------------------------------
  // Brand-level defaults panel (create mode only). Loaded from and
  // saved to BusinessProfile via the existing onboarding progress
  // endpoint — see saveDefaults() below and the autofill effect.
  // ------------------------------------------------------------
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [defaultDos, setDefaultDos] = useState<string[]>([]);
  const [defaultDonts, setDefaultDonts] = useState<string[]>([]);
  const [defaultDuration, setDefaultDuration] = useState('');
  const [defaultAspectRatio, setDefaultAspectRatio] = useState('');
  const [defaultVoiceover, setDefaultVoiceover] = useState(false);
  const [defaultSubtitles, setDefaultSubtitles] = useState(false);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultsMsg, setDefaultsMsg] = useState('');

  // Edit-mode only: load the existing campaign and populate every
  // field above. `loadingExisting` gates the form so we don't render
  // (and let someone submit) blank fields for a split second before
  // the real data arrives. `accessDenied`/`notFound` mirror the two
  // ways the backend's ownership check (business_id must match) can
  // fail — same guard the server already enforces, just surfaced
  // before the person fills out a form they can't actually save.
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<Campaign['status'] | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;

    (async () => {
      setLoadingExisting(true);
      try {
        const c = await getCampaign(id);
        if (cancelled) return;

        if (user && c.business_id !== user.id) {
          setAccessDenied(true);
          return;
        }
        if (c.status === 'completed') {
          // Backend rejects edits to completed campaigns outright —
          // catch it here too so the person sees why up front instead
          // of filling out the whole form and hitting an error on submit.
          setError('This campaign is completed and can no longer be edited.');
        }

        setOriginalStatus(c.status);
        setTitle(c.title);
        setTagline(c.tagline || '');
        setHeroImage(c.hero_image || '');
        setBrandName(c.brand_name || '');
        setCategory(c.category);
        setCampaignType(c.campaign_type);
        setDescription(c.description);
        setBudget(c.budget != null ? String(c.budget) : '');
        setCompensationDescription(c.compensation_description || '');
        setBrandLocation(c.brand_location || '');
        setDeadline(c.deadline ? c.deadline.slice(0, 10) : '');
        setRequirements(c.requirements || '');
        setDeliverables(c.deliverables || []);
        setChecklist(c.checklist || []);
        setRequiredScenes(c.required_scenes || []);
        setDos(c.dos || []);
        setDonts(c.donts || []);
        setSuggestedCaption(c.suggested_caption || '');
        setHashtags(c.hashtags || []);
        setVideoSpecs(c.video_specs || []);
      } catch (err) {
        console.error('Could not load campaign for editing:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, id, user]);

  // ------------------------------------------------------------
  // Create-mode only: prefill from the business's saved profile and
  // saved campaign defaults. Every setter here is a functional update
  // that only fills in an EMPTY value — never overwrites something the
  // user already typed, and safe even if this resolves after they've
  // started filling the form out. A missing/incomplete profile (new
  // business, skipped onboarding fields) is expected and just leaves
  // the form blank, same as today.
  // ------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'create') return;
    let cancelled = false;

    (async () => {
      try {
        const result = await getBusinessProgress();
        if (cancelled || !result?.profile) return;
        const profile = result.profile;

        setBrandName((prev) => prev || profile.company_name || '');
        setBrandLocation((prev) => prev || profile.location || '');

        const candidates: string[] = [
          ...(profile.interested_categories || []),
          ...(profile.industry ? [profile.industry] : []),
        ];
        const matched = candidates
          .map((c) => CATEGORIES.find((opt) => opt.toLowerCase() === String(c).toLowerCase()))
          .find(Boolean);
        if (matched) setCategory((prev) => prev || matched);

        // Populate both the live form fields (so a new campaign
        // actually gets these values) AND the defaults panel's own
        // state (so opening "Manage my campaign defaults" shows what's
        // currently saved instead of a blank panel).
        if (profile.default_dos?.length) {
          setDos((prev) => (prev.length > 0 ? prev : profile.default_dos));
          setDefaultDos(profile.default_dos);
        }
        if (profile.default_donts?.length) {
          setDonts((prev) => (prev.length > 0 ? prev : profile.default_donts));
          setDefaultDonts(profile.default_donts);
        }
        const spec = profile.default_video_spec;
        if (spec && (spec.duration || spec.aspect_ratio || spec.voiceover_required || spec.subtitles_required)) {
          setVideoSpecs((prev) =>
            prev.length > 0 ? prev : [{ platform: spec.platform || 'General', ...spec }]
          );
          setDefaultDuration(spec.duration || '');
          setDefaultAspectRatio(spec.aspect_ratio || '');
          setDefaultVoiceover(!!spec.voiceover_required);
          setDefaultSubtitles(!!spec.subtitles_required);
        }
      } catch (err) {
        console.warn('Could not load business profile for autofill:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const saveDefaults = async () => {
    setDefaultsSaving(true);
    setDefaultsMsg('');
    try {
      await saveBusinessProgress({
        default_dos: defaultDos.length > 0 ? defaultDos : undefined,
        default_donts: defaultDonts.length > 0 ? defaultDonts : undefined,
        default_video_spec:
          defaultDuration || defaultAspectRatio || defaultVoiceover || defaultSubtitles
            ? {
                platform: 'General',
                duration: defaultDuration || undefined,
                aspect_ratio: defaultAspectRatio || undefined,
                voiceover_required: defaultVoiceover,
                subtitles_required: defaultSubtitles,
              }
            : undefined,
      });
      setDefaultsMsg('Saved ✓');
    } catch (err) {
      console.error('Could not save campaign defaults:', err);
      setDefaultsMsg('Could not save. Try again.');
    } finally {
      setDefaultsSaving(false);
    }
  };

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

  // Gates the "Next" button on step 1 only — every later step is
  // optional content, so Next is always enabled once you're past Basics.
  const canContinueStep1 =
    title.trim().length >= 3 && !!category && description.trim().length >= 10;

  const handleSubmit = async (action: 'draft' | 'publish') => {
    const validationError = validate();
    if (validationError) {
      // Every current validation rule concerns a step-1 field (title/
      // category/description) — if someone jumped straight to a later
      // step via the dots, they can't see what's wrong without this.
      setStep(1);
      setError(validationError);
      return;
    }

    setSaving(action);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        category,
        campaign_type: campaignType,
        description: description.trim(),
        budget: budget ? Number(budget) : undefined,
        compensation_description: compensationDescription.trim() || undefined,
        brand_name: brandName.trim() || undefined,
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
        // Send `null` (not `undefined`) when cleared — see Campaignform.tsx
        // for why: the backend only clears fields that are actually present
        // in the JSON body (exclude_unset=True), and `undefined` gets
        // dropped before the request is sent.
        hero_image: heroImage || null,
      };

      let campaignId: number;
      if (mode === 'edit' && id) {
        const updated = await updateCampaign(id, payload);
        campaignId = updated.id;
        // Only hit publish if it isn't already published/further along —
        // calling it on an already-published campaign just 400s for no
        // reason, since the backend only allows draft -> published.
        if (action === 'publish' && originalStatus === 'draft') {
          await publishCampaign(campaignId);
        }
      } else {
        const created = await createCampaign(payload);
        campaignId = created.id;
        if (action === 'publish') {
          await publishCampaign(campaignId);
        }
      }

      navigate(`/campaigns/${campaignId}`);
    } catch (err: any) {
      console.error('Could not save campaign:', err);
      setError(err?.response?.data?.detail || 'Could not save this campaign. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const categorySuggestions = category ? CATEGORY_SUGGESTIONS[category] : undefined;

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
          background: ${PAGE_GRADIENT_BG};
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
        .cc-logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 17px; }

        /* --- Two-pane shell: persistent sidebar + scrolling main --- */
        .cc-shell { display: flex; min-height: 100vh; align-items: stretch; }

        .cc-sidebar {
          width: 300px;
          flex-shrink: 0;
          padding: 32px 26px;
          background: rgba(255,255,255,0.55);
          border-right: 1px solid rgba(30,42,120,0.14);
          backdrop-filter: blur(6px);
        }
        @media (max-width: 860px) {
          .cc-shell { flex-direction: column; }
          .cc-sidebar { width: 100%; border-right: none; border-bottom: 1px solid rgba(30,42,120,0.14); }
        }

        .cc-sidebar-brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 16px; }
        .cc-sidebar-tagline { font-size: 12px; color: var(--ink-soft); margin: 4px 0 0 28px; }
        .cc-sidebar-divider { border: none; border-top: 1px solid rgba(30,42,120,0.16); margin: 22px 0; }

        .cc-sidebar-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--violet-dark); margin-bottom: 4px; }
        .cc-sidebar-meta { font-size: 12px; color: var(--ink-soft); margin-bottom: 20px; }

        .cc-sidebar-steps { display: flex; flex-direction: column; }
        .cc-sidebar-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          padding: 0 0 4px;
          width: 100%;
        }
        .cc-sidebar-dotcol { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; padding-top: 2px; }
        .cc-sidebar-dot {
          width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
        }
        .cc-sidebar-dot--upcoming { background: #fff; border: 1.5px solid var(--line); }
        .cc-sidebar-dot--active { background: var(--violet); box-shadow: 0 0 0 4px rgba(30,42,120,0.18); }
        .cc-sidebar-dot--done { background: #16a34a; }
        .cc-sidebar-line { width: 1.5px; flex: 1; min-height: 26px; background: var(--line); margin: 3px 0; }
        .cc-sidebar-line--done { background: #16a34a; }

        .cc-sidebar-step-text { display: flex; flex-direction: column; padding-bottom: 18px; }
        .cc-sidebar-step-title { font-size: 13.5px; font-weight: 600; color: var(--ink-soft); }
        .cc-sidebar-step-title--active, .cc-sidebar-step-title--done { color: var(--ink); }
        .cc-sidebar-step-caption { font-size: 11.5px; color: var(--ink-soft); margin-top: 2px; }
        .cc-sidebar-step-caption--active { color: var(--violet-dark); font-weight: 600; }
        .cc-sidebar-step-caption--done { color: #16a34a; font-weight: 600; }

        .cc-main { flex: 1; max-width: 720px; padding: 40px 32px 80px; }
        @media (max-width: 560px) { .cc-main { padding: 28px 20px 60px; } }

        .cc-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--violet-dark); margin-bottom: 10px; }
        .cc-h1-serif {
          font-family: Georgia, 'Iowan Old Style', 'Palatino Linotype', serif;
          font-size: 30px;
          font-weight: 500;
          line-height: 1.25;
          margin: 0 0 8px;
          color: var(--ink);
        }
        @media (max-width: 560px) { .cc-h1-serif { font-size: 24px; } }

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
        .cc-h2 { font-size: 19px; font-weight: 700; margin: 0 0 5px; }

        .cc-steps { display: flex; align-items: center; margin-bottom: 22px; }
        .cc-step { display: flex; align-items: center; flex: 1; }
        .cc-step:last-child { flex: 0; }

        .cc-step-dot {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
          border: none; cursor: pointer; padding: 0;
        }
        .cc-step-upcoming { background: #fff; color: var(--ink-soft); border: 1.5px solid var(--line); }
        .cc-step-active { background: var(--violet); color: #fff; }
        .cc-step-done { background: #16a34a; color: #fff; }

        .cc-step-label { font-size: 11.5px; font-weight: 600; margin-left: 8px; white-space: nowrap; color: var(--ink-soft); cursor: default; }
        .cc-step-label-active, .cc-step-label-done { color: var(--ink); }

        .cc-step-line { flex: 1; height: 1.5px; background: var(--line); margin: 0 10px; }
        .cc-step-line-done { background: var(--violet); }

        @media (max-width: 560px) {
          .cc-step-label { display: none; }
        }

        .cc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; flex-wrap: wrap; gap: 12px; }
        .cc-footer-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .cc-back-step { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink-soft); background: none; border: none; cursor: pointer; padding: 8px 4px; }
        .cc-back-step:hover { color: var(--ink); }
        .cc-next-step { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #fff; background: var(--violet); border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
        .cc-next-step:disabled { background: #cabbf5; cursor: not-allowed; }
        .cc-next-step--secondary { background: #fff; color: var(--violet-dark); border: 1px solid #D6DCF5; padding: 11px 20px; }
        .cc-next-step--secondary:disabled { background: #fafafd; color: var(--ink-soft); border-color: var(--line); }

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
          background: #F2F4FC;
          border: 1px solid #D6DCF5;
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
        .cc-type-btn--active { border-color: var(--violet); color: var(--violet-dark); background: #F2F4FC; }

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
        .cc-taglist-add:hover { background: #F2F4FC; border-color: var(--violet); }
        .cc-taglist-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .cc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 500;
          background: #F2F4FC;
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
          background: #F2F4FC;
          border: 1px dashed var(--violet);
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          width: 100%;
          justify-content: center;
        }

        .cc-defaults-box {
          border: 1px solid var(--line);
          border-radius: 12px;
          margin-bottom: 18px;
          overflow: hidden;
          background: #fafafd;
        }
        .cc-defaults-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--violet-dark);
          background: none;
          border: none;
          cursor: pointer;
          padding: 13px 16px;
          text-align: left;
        }
        .cc-defaults-panel { padding: 4px 16px 18px; border-top: 1px solid var(--line); }
        .cc-defaults-save {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: var(--violet);
          border: none;
          border-radius: 8px;
          padding: 9px 16px;
          cursor: pointer;
        }
        .cc-defaults-save:disabled { opacity: 0.6; cursor: not-allowed; }

        .cc-suggest-box {
          border: 1px dashed #D6DCF5;
          background: #f8f7fd;
          border-radius: 12px;
          padding: 14px 16px;
          margin: -6px 0 18px;
        }
        .cc-suggest-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--violet-dark);
          margin-bottom: 10px;
        }
        .cc-suggest-group { margin-bottom: 8px; }
        .cc-suggest-group:last-child { margin-bottom: 0; }
        .cc-suggest-group-label { font-size: 11px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em; }
        .cc-suggest-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .cc-suggest-chip, .cc-preset-chip {
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #D6DCF5;
          background: #fff;
          color: var(--violet-dark);
          border-radius: 999px;
          padding: 5px 11px;
          cursor: pointer;
        }
        .cc-suggest-chip:hover, .cc-preset-chip:hover { background: #F2F4FC; }
        .cc-suggest-chip:disabled, .cc-preset-chip:disabled {
          opacity: 0.55;
          cursor: default;
          background: #F2F4FC;
        }
        .cc-preset-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      `}</style>

      <div className="cc-shell">
        <StepSidebar step={step} onStepClick={(n) => { setError(''); setStep(n); }} mode={mode} />

        <main className="cc-main">
          <button className="cc-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>

          {mode === 'edit' && loadingExisting && (
            <div className="cc-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-soft)' }}>
              Loading campaign…
            </div>
          )}

          {mode === 'edit' && !loadingExisting && notFound && (
            <div className="cc-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-soft)' }}>
              This campaign couldn't be found.
            </div>
          )}

          {mode === 'edit' && !loadingExisting && accessDenied && (
            <div className="cc-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-soft)' }}>
              You don't have access to edit this campaign.
            </div>
          )}

          {(mode === 'create' || (!loadingExisting && !notFound && !accessDenied)) && (
            <>
              <div className="cc-eyebrow">
                Step {step} of {STEP_LABELS.length} · {STEP_LABELS[step - 1]}
              </div>
              <h1 className="cc-h1-serif">{STEP_QUESTIONS[step - 1]}</h1>
              <p className="cc-sub" style={{ marginBottom: 20 }}>
                {STEP_SUBTITLES[step - 1]}
              </p>

              {mode === 'create' && step === 1 && (
              <div className="cc-defaults-box">
                <button
                  type="button"
                  className="cc-defaults-toggle"
                  onClick={() => setDefaultsOpen((o) => !o)}
                >
                  <Settings size={14} />
                  Manage my campaign defaults
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-soft)' }}>{defaultsOpen ? '▲' : '▼'}</span>
                </button>
                {defaultsOpen && (
                  <div className="cc-defaults-panel">
                    <div className="cc-hint" style={{ marginBottom: 12 }}>
                      <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                      These prefill new campaigns automatically. Editing them here won't change campaigns you've
                      already created. You can also manage these anytime from{' '}
                      <Link to="/settings" style={{ color: 'var(--violet-dark)', fontWeight: 600 }}>
                        Settings → Campaign Defaults
                      </Link>
                      .
                    </div>
                    <TagListField
                      label="Default Do's"
                      placeholder="e.g. Use good lighting"
                      items={defaultDos}
                      onChange={setDefaultDos}
                    />
                    <TagListField
                      label="Default Don'ts"
                      placeholder="e.g. Do not use competitor products"
                      items={defaultDonts}
                      onChange={setDefaultDonts}
                    />
                    <div className="cc-row">
                      <div className="cc-field">
                        <label className="cc-label">Default video length</label>
                        <input
                          className="cc-input"
                          value={defaultDuration}
                          onChange={(e) => setDefaultDuration(e.target.value)}
                          placeholder="e.g. Minimum 15 seconds"
                        />
                      </div>
                      <div className="cc-field">
                        <label className="cc-label">Default aspect ratio</label>
                        <input
                          className="cc-input"
                          value={defaultAspectRatio}
                          onChange={(e) => setDefaultAspectRatio(e.target.value)}
                          placeholder="e.g. 9:16"
                        />
                      </div>
                    </div>
                    <div className="cc-spec-checks" style={{ marginBottom: 16 }}>
                      <label className="cc-spec-check">
                        <input
                          type="checkbox"
                          checked={defaultVoiceover}
                          onChange={(e) => setDefaultVoiceover(e.target.checked)}
                        />
                        Voiceover required
                      </label>
                      <label className="cc-spec-check">
                        <input
                          type="checkbox"
                          checked={defaultSubtitles}
                          onChange={(e) => setDefaultSubtitles(e.target.checked)}
                        />
                        Subtitles required
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        type="button"
                        className="cc-defaults-save"
                        disabled={defaultsSaving}
                        onClick={saveDefaults}
                      >
                        {defaultsSaving ? 'Saving…' : 'Save Defaults'}
                      </button>
                      {defaultsMsg && <span className="cc-hint" style={{ margin: 0 }}>{defaultsMsg}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="cc-card">
              {error && <div className="cc-error">{error}</div>}

              {step === 1 && (
                <>
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

              <div className="cc-field">
                <label className="cc-label">Brand Name</label>
                <input
                  className="cc-input"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. PaperMadePaper"
                />
                <div className="cc-hint">
                  <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                  Prefilled from your business profile when available — feel free to edit it.
                </div>
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

              {categorySuggestions && (
                <div className="cc-suggest-box">
                  <div className="cc-suggest-title">
                    <Sparkles size={13} /> Suggested for {category}
                  </div>

                  <div className="cc-suggest-group">
                    <div className="cc-suggest-group-label">Do's</div>
                    <div className="cc-suggest-list">
                      {categorySuggestions.dos.map((item) => {
                        const already = dos.some((d) => d.toLowerCase() === item.toLowerCase());
                        return (
                          <button
                            type="button"
                            key={item}
                            className="cc-suggest-chip"
                            disabled={already}
                            onClick={() => setDos(addUnique(dos, [item]))}
                          >
                            {already ? '✓ ' : '+ '}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cc-suggest-group">
                    <div className="cc-suggest-group-label">Deliverables</div>
                    <div className="cc-suggest-list">
                      {categorySuggestions.deliverables.map((item) => {
                        const already = deliverables.some((d) => d.toLowerCase() === item.toLowerCase());
                        return (
                          <button
                            type="button"
                            key={item}
                            className="cc-suggest-chip"
                            disabled={already}
                            onClick={() => setDeliverables(addUnique(deliverables, [item]))}
                          >
                            {already ? '✓ ' : '+ '}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cc-suggest-group">
                    <div className="cc-suggest-group-label">Hashtags</div>
                    <div className="cc-suggest-list">
                      {categorySuggestions.hashtags.map((item) => {
                        const already = hashtags.some((h) => h.toLowerCase() === item.toLowerCase());
                        return (
                          <button
                            type="button"
                            key={item}
                            className="cc-suggest-chip"
                            disabled={already}
                            onClick={() => setHashtags(addUnique(hashtags, [item]))}
                          >
                            {already ? '✓ ' : '+ '}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="cc-field">
                <label className="cc-label">Campaign Type *</label>
                <div className="cc-type-toggle">
                  <button
                    type="button"
                    className={`cc-type-btn ${campaignType === 'gifted' ? 'cc-type-btn--active' : ''}`}
                    onClick={() => setCampaignType('gifted')}
                  >
                    <Gift size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                    Gifted
                  </button>
                  <button
                    type="button"
                    className={`cc-type-btn ${campaignType === 'paid' ? 'cc-type-btn--active' : ''}`}
                    onClick={() => setCampaignType('paid')}
                  >
                    <DollarSign size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                    Paid
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
                </>
              )}

              {step === 2 && (
                <>
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
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (!/[,\n]/.test(text)) return;
                      e.preventDefault();
                      const parts = parsePastedList(text);
                      if (parts.length === 0) return;
                      const existing = new Set(checklist.map((c) => c.text.toLowerCase()));
                      const additions = parts
                        .filter((p) => {
                          const key = p.toLowerCase();
                          if (existing.has(key)) return false;
                          existing.add(key);
                          return true;
                        })
                        .map((text) => ({ text, checked: true }));
                      if (additions.length > 0) setChecklist([...checklist, ...additions]);
                      setChecklistDraft('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = checklistDraft.trim();
                        if (!value) return;
                        const already = checklist.some((c) => c.text.toLowerCase() === value.toLowerCase());
                        if (!already) setChecklist([...checklist, { text: value, checked: true }]);
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
                      const already = checklist.some((c) => c.text.toLowerCase() === value.toLowerCase());
                      if (!already) setChecklist([...checklist, { text: value, checked: true }]);
                      setChecklistDraft('');
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="cc-hint">Short pass/fail requirements shown as a checklist grid.</div>

                <div className="cc-preset-row">
                  {PRESET_CHECKLIST_ITEMS.map((preset) => {
                    const already = checklist.some((c) => c.text.toLowerCase() === preset.toLowerCase());
                    return (
                      <button
                        type="button"
                        key={preset}
                        className="cc-preset-chip"
                        disabled={already}
                        onClick={() => setChecklist([...checklist, { text: preset, checked: true }])}
                      >
                        {already ? '✓ ' : '+ '}
                        {preset}
                      </button>
                    );
                  })}
                </div>

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
                </>
              )}

              {step === 3 && (
                <>
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
                </>
              )}

              {step === 4 && (
                <>
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
                </>
              )}

              {step === 5 && (
                <>
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
                </>
              )}

              <hr className="cc-section-divider" style={{ marginTop: 24 }} />

              <div className="cc-footer">
                {step > 1 ? (
                  <button type="button" className="cc-back-step" onClick={() => { setError(''); setStep(step - 1); }}>
                    <ArrowLeft size={14} /> Previous
                  </button>
                ) : <span />}

                <div className="cc-footer-right">
                  {step < 5 && (
                    <button
                      type="button"
                      className="cc-next-step cc-next-step--secondary"
                      disabled={step === 1 && !canContinueStep1}
                      onClick={() => { setError(''); setStep(step + 1); }}
                    >
                      Next <ArrowRight size={15} />
                    </button>
                  )}
                  <button
                    className="cc-btn-draft"
                    onClick={() => handleSubmit('draft')}
                    disabled={saving !== null}
                  >
                    {saving === 'draft' && <Loader2 size={15} className="cc-spin" />}
                    {mode === 'edit' ? 'Save Changes' : 'Save as Draft'}
                  </button>
                  {(mode === 'create' || originalStatus === 'draft') && (
                    <button
                      className="cc-btn-publish"
                      onClick={() => handleSubmit('publish')}
                      disabled={saving !== null}
                    >
                      {saving === 'publish' && <Loader2 size={15} className="cc-spin" />}
                      Publish Campaign
                    </button>
                  )}
                </div>
              </div>
              <div className="cc-hint" style={{ marginTop: 10, justifyContent: 'center' }}>
                <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                You don't need to fill in every step — save or publish whenever you're ready, and come back to add
                more later.
              </div>
            </div>
          </>
        )}
        </main>
      </div>
    </div>
  );
}

export function CampaignCreate() {
  return <CampaignForm mode="create" />;
}

export function CampaignEdit() {
  return <CampaignForm mode="edit" />;
}

// ============================================
// BUSINESS SETTINGS PAGE
// ============================================

const SETTINGS_CREATOR_TYPES = ['Beauty', 'Lifestyle', 'Fashion', 'Food', 'Tech', 'Fitness', 'Travel', 'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor', 'Parenting', 'Entertainment', 'UGC', 'Photographer', 'Video Creator'];
const SETTINGS_CONTENT_TYPES = ['Instagram Reel', 'Instagram Story', 'Instagram Post', 'TikTok Video', 'YouTube Short', 'YouTube Video', 'UGC Video', 'Product Photos'];
const SETTINGS_CREATOR_SIZES = ['Nano', 'Micro', 'Mid-tier', 'Macro'];
const SETTINGS_LOCATIONS = ['Nepal', 'Kathmandu Valley', 'Kathmandu', 'Pokhara', 'Any location'];
const SETTINGS_LANGUAGES = ['Nepali', 'English', 'Hindi', 'Newari', 'Maithili'];
const SETTINGS_FOLLOWERS = ['1K–10K', '10K–50K', '50K–100K', '100K+'];
const SETTINGS_AGES = ['Any', '18–24', '25–34', '35–44', '45+'];
const SETTINGS_GENDERS = ['Any', 'Female', 'Male'];
const SETTINGS_QUESTIONS = [
  'Why are you a good fit for this campaign?',
  'Have you created similar content before? Share an example.',
  'What is your content style or approach for this campaign?',
  'How would you showcase this product to your audience?',
  'Can you complete all deliverables by the campaign deadline?',
];

function SettingsMultiSelect({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (values: string[]) => void }) {
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            style={{
              border: `1px solid ${values.includes(option) ? '#1E2A78' : '#DDE2F6'}`,
              background: values.includes(option) ? '#EEF0FF' : '#fff',
              color: '#182262', borderRadius: 999, padding: '8px 12px',
              cursor: 'pointer', fontSize: 12, fontWeight: values.includes(option) ? 700 : 500,
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BusinessSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [defaultDos, setDefaultDos] = useState<string[]>([]);
  const [defaultDonts, setDefaultDonts] = useState<string[]>([]);
  const [defaultCreatorRequirements, setDefaultCreatorRequirements] = useState<CreatorRequirements>({ categories: [] });
  const [defaultQuestions, setDefaultQuestions] = useState<string[]>([]);
  const [defaultDuration, setDefaultDuration] = useState('');
  const [defaultAspectRatio, setDefaultAspectRatio] = useState('');
  const [defaultVoiceover, setDefaultVoiceover] = useState(false);
  const [defaultSubtitles, setDefaultSubtitles] = useState(false);
  const [dosDraft, setDosDraft] = useState('');
  const [dontsDraft, setDontsDraft] = useState('');
  const [questionDraftHack, setQuestionDraftHack] = useState('');

  useEffect(() => {
    if (user?.role !== 'business') { setLoading(false); return; }
    getCampaignDefaults()
      .then((defaults) => {
        if (!defaults) return;
        setDefaultDos(defaults.default_dos || []);
        setDefaultDonts(defaults.default_donts || []);
        setDefaultCreatorRequirements(defaults.default_creator_requirements || { categories: [] });
        setDefaultQuestions(defaults.default_application_questions || []);
        const spec = defaults.default_video_spec || null;
        setDefaultDuration(spec?.duration || '');
        setDefaultAspectRatio(spec?.aspect_ratio || '');
        setDefaultVoiceover(!!spec?.voiceover_required);
        setDefaultSubtitles(!!spec?.subtitles_required);
      })
      .catch((err) => console.error('Could not load campaign defaults:', err))
      .finally(() => setLoading(false));
  }, [user]);

  const addText = (draft: string, setter: (value: string) => void, setItems: (items: string[]) => void, items: string[]) => {
    const value = draft.trim();
    if (!value) return;
    if (!items.some((item) => item.toLowerCase() === value.toLowerCase())) setItems([...items, value]);
    setter('');
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveCampaignDefaults({
        default_dos: defaultDos,
        default_donts: defaultDonts,
        default_creator_requirements: defaultCreatorRequirements,
        default_application_questions: defaultQuestions,
        default_video_spec: (defaultDuration || defaultAspectRatio || defaultVoiceover || defaultSubtitles)
          ? {
              platform: 'General',
              duration: defaultDuration || undefined,
              aspect_ratio: defaultAspectRatio || undefined,
              voiceover_required: defaultVoiceover,
              subtitles_required: defaultSubtitles,
            }
          : null,
      });
      setDefaultDos(saved.default_dos || []);
      setDefaultDonts(saved.default_donts || []);
      setDefaultCreatorRequirements(saved.default_creator_requirements || { categories: [] });
      setDefaultQuestions(saved.default_application_questions || []);
      const spec = saved.default_video_spec || null;
      setDefaultDuration(spec?.duration || '');
      setDefaultAspectRatio(spec?.aspect_ratio || '');
      setDefaultVoiceover(!!spec?.voiceover_required);
      setDefaultSubtitles(!!spec?.subtitles_required);
      setMessage('Campaign defaults saved ✓');
    } catch (err) {
      console.error('Could not save campaign defaults:', err);
      setMessage('Could not save campaign defaults. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'business') {
    return <div className="cc"><main className="cc-main" style={{ maxWidth: 600, margin: '0 auto', padding: 40 }}><div className="cc-card" style={{ padding: 48, textAlign: 'center' }}><h2>Access Denied</h2><p>Only business users can access this page.</p><button className="cc-btn-draft" onClick={() => navigate('/dashboard')}>Go to Dashboard</button></div></main></div>;
  }

  return (
    <div className="cc">
      <style>{`
        .cc-settings { max-width: 820px; margin: 0 auto; padding: 36px 20px 60px; }
        .cc-settings h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
        .cc-settings .sub { color: var(--ink-soft); margin: 0 0 24px; }
        .cc-settings-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 24px; margin-bottom: 18px; }
        .cc-settings-card h3 { font-size: 16px; font-weight: 700; margin: 0 0 5px; }
        .cc-settings-card p { color: var(--ink-soft); font-size: 13px; margin: 0 0 18px; line-height: 1.5; }
        .cc-settings-row { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
        .cc-settings-row input { flex:1; }
        .cc-settings-remove { border:1px solid var(--line); background:#fff; border-radius:8px; padding:8px 10px; cursor:pointer; }
      `}</style>
      <div className="cc-shell"><main className="cc-main">
        <button className="cc-back" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back</button>
        <div className="cc-settings">
          <h1>Business Settings</h1>
          <p className="sub">Set defaults once and Noodle will prefill them whenever you create a new campaign.</p>

          {loading ? <div className="cc-settings-card">Loading your defaults…</div> : <>
            <div className="cc-settings-card">
              <h3>Creator matching defaults</h3>
              <p>These preferences are copied into new campaigns. You can always change them for an individual campaign.</p>
              <SettingsMultiSelect label="Creator type" options={SETTINGS_CREATOR_TYPES} values={defaultCreatorRequirements.categories || []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, categories: v }))} />
              <SettingsMultiSelect label="Content type" options={SETTINGS_CONTENT_TYPES} values={defaultCreatorRequirements.content_types || []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, content_types: v }))} />
              <SettingsMultiSelect label="Creator size" options={SETTINGS_CREATOR_SIZES} values={defaultCreatorRequirements.creator_sizes || []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, creator_sizes: v }))} />
              <SettingsMultiSelect label="Location" options={SETTINGS_LOCATIONS} values={defaultCreatorRequirements.locations || []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, locations: v }))} />
              <SettingsMultiSelect label="Languages" options={SETTINGS_LANGUAGES} values={defaultCreatorRequirements.languages || []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, languages: v }))} />
              <SettingsMultiSelect label="Follower range" options={SETTINGS_FOLLOWERS} values={defaultCreatorRequirements.follower_ranges || []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, follower_ranges: v }))} />
              <SettingsMultiSelect label="Age" options={SETTINGS_AGES} values={defaultCreatorRequirements.age_ranges || []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, age_ranges: v }))} />
              <SettingsMultiSelect label="Gender" options={SETTINGS_GENDERS} values={defaultCreatorRequirements.gender ? [defaultCreatorRequirements.gender] : []} onChange={(v) => setDefaultCreatorRequirements((p) => ({ ...p, gender: v[0] }))} />
            </div>

            <div className="cc-settings-card">
              <h3>Default creator application questions</h3>
              <p>Pick the questions you commonly ask creators. They will automatically appear in new campaigns. You can add your own too.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:14 }}>
                {SETTINGS_QUESTIONS.map((q) => <button key={q} type="button" className="cc-preset-chip" onClick={() => setDefaultQuestions((items) => items.some((x) => x.toLowerCase() === q.toLowerCase()) ? items : [...items, q])}>+ {q}</button>)}
              </div>
              {defaultQuestions.map((q, i) => <div className="cc-settings-row" key={`${q}-${i}`}><input className="cc-input" value={q} onChange={(e) => setDefaultQuestions((items) => items.map((x,j) => j===i ? e.target.value : x))} /><button className="cc-settings-remove" type="button" onClick={() => setDefaultQuestions((items) => items.filter((_,j)=>j!==i))}>Remove</button></div>)}
              <div className="cc-settings-row"><input className="cc-input" value={''} onChange={(e) => setQuestionDraftHack(e.target.value)} placeholder="Write your own question" /><button className="cc-btn-draft" type="button" onClick={() => { const value = questionDraftHack.trim(); if (value) { setDefaultQuestions((items)=>[...items,value]); setQuestionDraftHack(''); } }}>+ Add</button></div>
            </div>

            <div className="cc-settings-card">
              <h3>Default creative rules</h3>
              <p>These are also copied into new campaigns.</p>
              <div className="cc-settings-row"><input className="cc-input" value={dosDraft} onChange={(e)=>setDosDraft(e.target.value)} placeholder="Default Do's" /><button className="cc-btn-draft" type="button" onClick={()=>addText(dosDraft,setDosDraft,setDefaultDos,defaultDos)}>+ Add</button></div>
              {defaultDos.map((x,i)=><div className="cc-settings-row" key={`${x}-${i}`}><input className="cc-input" value={x} onChange={(e)=>setDefaultDos(defaultDos.map((v,j)=>j===i?e.target.value:v))}/><button className="cc-settings-remove" type="button" onClick={()=>setDefaultDos(defaultDos.filter((_,j)=>j!==i))}>Remove</button></div>)}
              <div className="cc-settings-row"><input className="cc-input" value={dontsDraft} onChange={(e)=>setDontsDraft(e.target.value)} placeholder="Default Don'ts" /><button className="cc-btn-draft" type="button" onClick={()=>addText(dontsDraft,setDontsDraft,setDefaultDonts,defaultDonts)}>+ Add</button></div>
              {defaultDonts.map((x,i)=><div className="cc-settings-row" key={`${x}-${i}`}><input className="cc-input" value={x} onChange={(e)=>setDefaultDonts(defaultDonts.map((v,j)=>j===i?e.target.value:v))}/><button className="cc-settings-remove" type="button" onClick={()=>setDefaultDonts(defaultDonts.filter((_,j)=>j!==i))}>Remove</button></div>)}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12}}><input className="cc-input" value={defaultDuration} onChange={(e)=>setDefaultDuration(e.target.value)} placeholder="Default video length"/><input className="cc-input" value={defaultAspectRatio} onChange={(e)=>setDefaultAspectRatio(e.target.value)} placeholder="Default aspect ratio"/></div>
              <div style={{display:'flex',gap:16,marginTop:12}}><label><input type="checkbox" checked={defaultVoiceover} onChange={(e)=>setDefaultVoiceover(e.target.checked)}/> Voiceover required</label><label><input type="checkbox" checked={defaultSubtitles} onChange={(e)=>setDefaultSubtitles(e.target.checked)}/> Subtitles required</label></div>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}><button className="cc-btn-publish" type="button" disabled={saving} onClick={save}>{saving?'Saving…':'Save Campaign Defaults'}</button>{message && <span className="cc-hint">{message}</span>}</div>
          </>}

          <div className="cc-settings-card"><h3>Business Information</h3><p>Update your company details, location, and contact information.</p><button className="cc-btn-draft" onClick={()=>navigate('/profile')}>Edit Business Profile</button></div>
          <div className="cc-settings-card"><h3>Create a campaign</h3><p>Start with your saved defaults and adjust anything that is specific to this campaign.</p><button className="cc-btn-publish" onClick={()=>navigate('/campaigns/new')}>Create New Campaign</button></div>
        </div>
      </main></div>
    </div>
  );
}


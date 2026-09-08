import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  X,
  Trash2,
  Camera,
  Info,
  Settings,
  CheckCircle2,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import {
  createCampaign,
  updateCampaign,
  publishCampaign,
  uploadImage,
  getCampaign,
  getBusinessProgress,
  saveBusinessProgress,
  type Campaign,
  type CampaignType,
  type ChecklistItem,
  type VideoSpec,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

// Same navy + coral pairing as BusinessOnboarding.tsx — this page now
// intentionally shares that page's whole visual language (centered
// card, horizontal step dots, chip selectors) instead of its own
// sidebar-wizard look.
const NAVY = '#1E2A78';
const NAVY_DARK = '#182262';
const CORAL = '#FF6B5A';

// Same category list as CreatorProfile/BusinessOnboarding's
// "interested categories" so campaign categories line up with what
// creators already filter by. Kept local here rather than shared yet
// since only this file needs it so far.
const CATEGORIES = [
  'Beauty', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness', 'Travel',
  'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor',
  'Parenting', 'Entertainment',
];

const CONTENT_TYPES = [
  'Instagram Reel', 'Instagram Story', 'Instagram Post', 'TikTok Video',
  'YouTube Short', 'YouTube Video', 'UGC Video', 'Product Photos',
];
const VIDEO_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Pinterest'];
const VIDEO_DURATIONS = ['5-10 seconds', '10-15 seconds', '15-30 seconds', '30-60 seconds', '60-90 seconds', '90+ seconds'];
const ASPECT_RATIOS = ['9:16', '1:1', '4:5', '16:9'];
const RESOLUTIONS = ['720 x 1280', '1080 x 1920', '1080 x 1350', '1080 x 1080', '1920 x 1080', '4K'];
const FRAME_RATES = ['24 FPS', '25 FPS', '30 FPS', '60 FPS'];
const FILE_TYPES = ['MP4', 'MOV', 'WebM', 'JPG', 'PNG'];

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
// backs Deliverables, Required Scenes, Do's, Don'ts, Before You Apply
// and Hashtags below. Each of those is just a string[] on the backend,
// so one component covers all six instead of duplicating this
// input+chip markup six times. Supports pasting multiple comma/
// newline-separated values at once, in addition to the normal
// one-at-a-time Enter behavior. Both paths dedupe case-insensitively
// against what's already in the list.
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

// Single-select pill picker — same visual/interaction pattern as
// BusinessOnboarding.tsx's Chip component (co-chip / co-chip-active),
// used here for Category, Campaign Type, Content Type and every
// video-spec field that has a small fixed option list. Replaces the
// native <select> dropdowns the form used to have for these fields.
function PickChips({
  label,
  hint,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="cc-field">
      <label className="cc-label">{label}{required && ' *'}</label>
      <div className="cc-pick-chips">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            className={`cc-pick-chip ${value === opt ? 'cc-pick-chip--active' : ''}`}
            onClick={() => onChange(value === opt ? '' : opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {hint && <div className="cc-hint">{hint}</div>}
    </div>
  );
}

const STEP_LABELS = ['Basics', 'Creator Requirements', 'Creative Brief', 'Caption & Tags', 'Video Specs', 'Review & Publish'];

// Big question-style heading shown above each step's fields — plain
// text now (no color-split highlight word), matching
// BusinessOnboarding's simple co-h2 treatment.
const STEP_TITLES = [
  "What's this campaign about?",
  'Who are you looking for?',
  'What should creators know before creating?',
  'How should creators caption it?',
  'What are the video rules?',
  'Ready to publish your campaign?',
];

const STEP_SUBTITLES = [
  'The essentials creators see first — title, category, offer, compensation and deadline.',
  "Define the creator profile, deliverables, checklist and application expectations.",
  "Set the creative direction, required scenes, do's, don'ts and campaign note.",
  'Give creators a starting caption and the hashtags or mentions to use.',
  'Add platform-specific duration, ratio, resolution, file and accessibility rules.',
  'Review the campaign as a creator will see it, then save or publish.',
];

// Same wordmark used across auth/onboarding pages — navy + coral
// circles — so this page reads as the same product even without the
// old sidebar's dedicated brand block.
function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="13" r="8" fill={NAVY} />
      <circle cx="17" cy="9" r="6" fill={CORAL} fillOpacity={0.9} />
    </svg>
  );
}

// Horizontal step indicator — direct port of BusinessOnboarding.tsx's
// StepHeader (numbered dot + connecting line, done/active/upcoming
// states), with one addition: each dot is clickable so you can still
// jump straight to any step to edit it, since unlike onboarding every
// step here except Basics is optional.
function StepHeader({ step, onStepClick }: { step: number; onStepClick: (n: number) => void }) {
  return (
    <div className="cc-steps">
      {STEP_LABELS.map((label, index) => {
        const number = index + 1;
        const state = number < step ? 'done' : number === step ? 'active' : 'upcoming';

        return (
          <div className="cc-step" key={label}>
            <button
              type="button"
              className={`cc-step-dot cc-step-${state}`}
              onClick={() => onStepClick(number)}
              aria-label={label}
            >
              {state === 'done' ? <CheckCircle2 size={14} /> : number}
            </button>
            <button type="button" className={`cc-step-label cc-step-label-${state}`} onClick={() => onStepClick(number)}>
              {label}
            </button>
            {number < STEP_LABELS.length && (
              <span className={`cc-step-line ${number < step ? 'cc-step-line-done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Compact account menu for the header's top-right corner — same
// avatar-or-initials chip + dropdown (Edit profile / Settings / Log
// out) the old sidebar had at its bottom, just relocated now that the
// sidebar itself is gone.
function ProfileChip() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role === 'creator' ? 'creator' : 'business';
  const primary = role === 'creator' ? CORAL : NAVY;
  const initials = user?.full_name?.[0]?.toUpperCase() ?? '?';
  const avatarUrl: string | null = user?.profile?.profile_image || user?.profile?.logo_url || null;

  return (
    <div className="cc-profile-chip">
      <button type="button" className="cc-profile-btn" onClick={() => setMenuOpen((v) => !v)}>
        <span className="cc-profile-avatar" style={{ background: primary }}>
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </span>
        <ChevronDown size={14} />
      </button>
      {menuOpen && (
        <div className="cc-profile-menu">
          <Link to="/profile" className="cc-profile-menu-item" onClick={() => setMenuOpen(false)}>
            <Settings size={13} /> Edit profile
          </Link>
          {role === 'business' && (
            <Link to="/settings" className="cc-profile-menu-item" onClick={() => setMenuOpen(false)}>
              <Settings size={13} /> Settings
            </Link>
          )}
          <button
            type="button"
            className="cc-profile-menu-item cc-profile-menu-item--btn"
            onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}
          >
            <LogOut size={13} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function CampaignForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [heroError, setHeroError] = useState('');
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>('gifted');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [compensationDescription, setCompensationDescription] = useState('');
  const [brandLocation, setBrandLocation] = useState('');
  const [deadline, setDeadline] = useState('');

  const [requirements, setRequirements] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [beforeYouApply, setBeforeYouApply] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [requiredScenes, setRequiredScenes] = useState<string[]>([]);
  const [dos, setDos] = useState<string[]>([]);
  const [donts, setDonts] = useState<string[]>([]);
  const [suggestedCaption, setSuggestedCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [guidelinesNote, setGuidelinesNote] = useState('');
  const [videoSpecs, setVideoSpecs] = useState<VideoSpec[]>([]);

  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState('');

  // Which of the 6 numbered steps is currently visible. Starts at 1
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
        setExtraPhotos(c.extra_photos || []);
        setBrandName(c.brand_name || '');
        setCategory(c.category);
        setSubCategory(c.sub_category || '');
        setCampaignType(c.campaign_type);
        setDescription(c.description);
        setBudget(c.budget != null ? String(c.budget) : '');
        setCompensationDescription(c.compensation_description || '');
        setBrandLocation(c.brand_location || '');
        setDeadline(c.deadline ? c.deadline.slice(0, 10) : '');
        setRequirements(c.requirements || '');
        setDeliverables(c.deliverables || []);
        setBeforeYouApply(c.before_you_apply || []);
        setChecklist(c.checklist || []);
        setRequiredScenes(c.required_scenes || []);
        setDos(c.dos || []);
        setDonts(c.donts || []);
        setSuggestedCaption(c.suggested_caption || '');
        setHashtags(c.hashtags || []);
        setGuidelinesNote(c.guidelines_note || '');
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
        sub_category: subCategory.trim() || undefined,
        campaign_type: campaignType,
        description: description.trim(),
        budget: budget ? Number(budget) : undefined,
        compensation_description: compensationDescription.trim() || undefined,
        brand_name: brandName.trim() || undefined,
        brand_location: brandLocation.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        requirements: requirements.trim() || undefined,
        deliverables: deliverables.length > 0 ? deliverables : undefined,
        before_you_apply: beforeYouApply.length > 0 ? beforeYouApply : undefined,
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
        guidelines_note: guidelinesNote.trim() || undefined,
        hero_image: heroImage || undefined,
        extra_photos: extraPhotos.length > 0 ? extraPhotos : undefined,
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
  @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700&display=swap');

  .cc {
    --accent: ${NAVY};
    --accent-hover: ${NAVY_DARK};
    --coral: ${CORAL};
    --ink: #111217;
    --ink-soft: #6c6d73;
    --line: #e6e6ea;
    --surface: #f7f7f9;
    --accent-soft: #EAEBF5;
    --good: #16a34a;
    font-family: Inter, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    min-height: 100vh;
    background: #fbfaff;
    color: var(--ink);
    padding: 32px 20px 80px;
    -webkit-font-smoothing: antialiased;
  }
  .cc * { box-sizing: border-box; }
  .cc button { font-family: inherit; cursor: pointer; }
  .cc a { text-decoration: none; color: inherit; }

  .cc-shell { max-width: 720px; margin: 0 auto; }

  .cc-wordmark { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 22px; }
  .cc-wordmark span { font-family: 'League Spartan', sans-serif; font-weight: 700; font-size: 24px; color: var(--ink); }

  .cc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 18px;
    margin-bottom: 22px;
    border-bottom: 1px solid var(--line);
  }
  .cc-back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-soft);
    background: none;
    border: none;
    padding: 6px 4px;
  }
  .cc-back-link:hover { color: var(--ink); }

  /* --- profile chip (top-right account menu) --- */
  .cc-profile-chip { position: relative; }
  .cc-profile-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; padding: 4px; color: var(--ink-soft); }
  .cc-profile-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 12px; font-weight: 700; overflow: hidden; flex-shrink: 0;
  }
  .cc-profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .cc-profile-menu {
    position: absolute; top: 100%; right: 0; margin-top: 8px;
    width: 168px; background: #fff; border: 1px solid var(--line); border-radius: 10px;
    padding: 5px; box-shadow: 0 10px 24px rgba(20,20,30,0.12); z-index: 20;
  }
  .cc-profile-menu-item {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 8px 9px; border-radius: 7px; font-size: 12.5px; font-weight: 500;
    color: var(--ink); background: none; border: none; text-align: left;
  }
  .cc-profile-menu-item:hover { background: var(--surface); }
  .cc-profile-menu-item--btn { cursor: pointer; }

  /* --- horizontal step dots (ported from BusinessOnboarding) --- */
  .cc-steps { display: flex; align-items: center; margin-bottom: 28px; }
  .cc-step { display: flex; align-items: center; flex: 1; }
  .cc-step:last-child { flex: 0; }
  .cc-step-dot {
    width: 26px; height: 26px; border-radius: 50%; border: none; padding: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0;
  }
  .cc-step-upcoming { background: var(--surface); color: var(--ink-soft); border: 1.5px solid var(--line); }
  .cc-step-active { background: var(--accent); color: #fff; }
  .cc-step-done { background: var(--coral); color: #fff; }
  .cc-step-label {
    font-size: 11.5px; font-weight: 600; margin-left: 8px; white-space: nowrap; color: var(--ink-soft);
    background: none; border: none; padding: 0;
  }
  .cc-step-label-active, .cc-step-label-done { color: var(--ink); }
  .cc-step-line { flex: 1; height: 1.5px; background: var(--line); margin: 0 10px; }
  .cc-step-line-done { background: var(--coral); }
  @media (max-width: 640px) { .cc-step-label { display: none; } }

  .cc-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 36px 40px 40px;
  }
  @media (max-width: 560px) { .cc-card { padding: 24px 20px 28px; } }

  .cc-h2 { font-size: 22px; font-weight: 700; margin: 0 0 5px; }
  .cc-sub { font-size: 13px; color: var(--ink-soft); margin: 0 0 26px; line-height: 1.5; }
  .cc-section-label { font-size: 12.5px; font-weight: 700; color: var(--ink); margin: 22px 0 12px; }
  .cc-section-label:first-of-type { margin-top: 0; }

  .cc-field { margin-bottom: 18px; }
  .cc-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
  .cc-label span { font-weight: 500; color: var(--ink-soft); }
  .cc-input, .cc-textarea, .cc-select {
    width: 100%; border: 1.5px solid var(--line); border-radius: 9px;
    padding: 11px 13px; font-size: 13.5px; font-family: inherit; color: var(--ink); background: #fff;
  }
  .cc-input:focus, .cc-textarea:focus, .cc-select:focus { outline: none; border-color: var(--accent); }
  .cc-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }
  .cc-hint { font-size: 11.5px; color: var(--ink-soft); margin-top: 6px; display: flex; align-items: flex-start; gap: 5px; line-height: 1.5; }

  .cc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 540px) { .cc-row { grid-template-columns: 1fr; } }

  /* --- pill/chip pickers (ported from BusinessOnboarding's Chip) --- */
  .cc-pick-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .cc-pick-chip { font-size: 12.5px; font-weight: 500; color: var(--ink); background: var(--surface); border: 1.5px solid var(--line); padding: 7px 13px; border-radius: 100px; }
  .cc-pick-chip--active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .cc-pick-chip--sm { padding: 5px 11px; font-size: 12px; }

  /* --- tag-list chips (Deliverables/Do's/Hashtags etc — has a remove button, distinct from the picker chips above) --- */
  .cc-taglist-input-row { display: flex; gap: 8px; }
  .cc-taglist-input-row .cc-input { flex: 1; }
  .cc-taglist-add {
    flex-shrink: 0; width: 42px; border-radius: 9px; border: 1.5px solid var(--line);
    background: #fff; color: var(--accent); display: flex; align-items: center; justify-content: center;
  }
  .cc-taglist-add:hover { background: var(--accent-soft); border-color: var(--accent); }
  .cc-taglist-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .cc-chip {
    display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500;
    background: var(--accent-soft); color: var(--accent); border-radius: 999px; padding: 6px 8px 6px 12px;
  }
  .cc-chip-remove { display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--accent); padding: 2px; opacity: 0.7; }
  .cc-chip-remove:hover { opacity: 1; }

  /* --- product / cover photo gallery --- */
  .cc-product-gallery { border: 1.5px solid var(--line); border-radius: 14px; padding: 12px; background: #fff; margin-bottom: 22px; }
  .cc-product-gallery-main { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(220px, 1fr); gap: 10px; align-items: stretch; }
  .cc-product-main { position: relative; min-width: 0; height: 175px; border-radius: 11px; overflow: hidden; background: var(--surface); }
  .cc-product-main img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cc-product-thumbs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-content: start; }
  .cc-product-thumb, .cc-product-add { min-width: 0; height: 72px; border-radius: 9px; overflow: hidden; border: 1.5px solid var(--line); background: #fafafd; position: relative; cursor: pointer; }
  .cc-product-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cc-product-add { border-style: dashed; color: var(--accent); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 10px; font-weight: 600; }
  .cc-product-badge { position: absolute; left: 10px; top: 10px; background: #fff; color: var(--accent); border-radius: 999px; padding: 6px 9px; font-size: 10px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,.08); z-index: 2; }
  .cc-product-remove { position: absolute; right: 9px; top: 9px; width: 26px; height: 26px; border: 0; border-radius: 50%; background: rgba(17,18,23,.55); color: #fff; display: flex; align-items: center; justify-content: center; z-index: 3; }
  .cc-product-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .cc-product-help { font-size: 11.5px; color: var(--ink-soft); margin-top: 8px; display: flex; gap: 5px; line-height: 1.5; }
  .cc-hero-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--ink-soft); font-size: 12.5px; }
  .cc-hero-btn {
    display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600;
    color: var(--accent); background: var(--accent-soft); border: 1px solid #D6DCF5; border-radius: 8px; padding: 9px 14px;
  }
  @media (max-width: 560px) { .cc-product-gallery-main { grid-template-columns: 1fr; } .cc-product-main { height: 165px; } .cc-product-thumbs { grid-template-columns: repeat(4, 1fr); } }

  .cc-error { font-size: 13px; color: #d64545; background: #fdecec; border-radius: 10px; padding: 11px 14px; margin-bottom: 18px; }

  .cc-spec-card { border: 1.5px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 14px; position: relative; }
  .cc-spec-card-remove { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--ink-soft); }
  .cc-spec-card-remove:hover { color: #d64545; }
  .cc-spec-checks { display: flex; gap: 18px; margin-top: 4px; }
  .cc-spec-check { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink); }
  .cc-add-spec-btn {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
    color: var(--accent); background: var(--accent-soft); border: 1px dashed var(--accent);
    border-radius: 10px; padding: 10px 16px; cursor: pointer; width: 100%; justify-content: center;
  }

  .cc-defaults-box { border: 1.5px solid var(--line); border-radius: 12px; margin-bottom: 18px; overflow: hidden; background: var(--surface); }
  .cc-defaults-toggle { width: 100%; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--accent); background: none; border: none; padding: 13px 16px; text-align: left; }
  .cc-defaults-panel { padding: 4px 16px 18px; border-top: 1px solid var(--line); }
  .cc-defaults-save { font-size: 13px; font-weight: 600; color: #fff; background: var(--accent); border: none; border-radius: 8px; padding: 9px 16px; }
  .cc-defaults-save:disabled { opacity: 0.6; cursor: not-allowed; }

  .cc-suggest-box { border: 1px dashed #D6DCF5; background: #f8f7fd; border-radius: 12px; padding: 14px 16px; margin: -4px 0 18px; }
  .cc-suggest-title { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--accent); margin-bottom: 10px; }
  .cc-suggest-group { margin-bottom: 8px; }
  .cc-suggest-group:last-child { margin-bottom: 0; }
  .cc-suggest-group-label { font-size: 11px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em; }
  .cc-suggest-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .cc-suggest-chip, .cc-preset-chip {
    font-size: 12px; font-weight: 500; border: 1px solid #D6DCF5; background: #fff; color: var(--accent);
    border-radius: 999px; padding: 5px 11px;
  }
  .cc-suggest-chip:hover, .cc-preset-chip:hover { background: var(--accent-soft); }
  .cc-suggest-chip:disabled, .cc-preset-chip:disabled { opacity: 0.55; cursor: default; background: var(--accent-soft); }
  .cc-preset-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

  /* --- review step --- */
  .cc-review { display: grid; gap: 14px; }
  .cc-review-intro { padding: 18px 20px; border-radius: 12px; background: var(--accent-soft); border: 1px solid #DDE2F6; }
  .cc-review-intro strong { display: block; color: var(--accent); font-size: 15px; margin-bottom: 4px; }
  .cc-review-intro span { color: var(--ink-soft); font-size: 12.5px; line-height: 1.55; }
  .cc-review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cc-review-item { border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 15px; background: #fff; }
  .cc-review-label { font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 5px; }
  .cc-review-value { font-size: 13.5px; line-height: 1.45; color: var(--ink); word-break: break-word; }
  .cc-review-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .cc-review-pill { padding: 5px 9px; border-radius: 999px; background: var(--surface); border: 1px solid #E5E5EB; font-size: 11.5px; color: var(--ink); }
  .cc-review-empty { color: #A39DB8; font-size: 12px; }
  .cc-review-section-title { font-size: 14px; font-weight: 700; color: var(--accent); margin: 4px 0 8px; }
  @media (max-width: 680px) { .cc-review-grid { grid-template-columns: 1fr; } }

  /* --- footer nav --- */
  .cc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line); flex-wrap: wrap; gap: 12px; }
  .cc-footer-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cc-back-step { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink-soft); background: none; border: none; padding: 8px 4px; }
  .cc-back-step:hover { color: var(--ink); }
  .cc-btn-draft, .cc-next-step { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--ink); background: #fff; border: 1.5px solid var(--line); padding: 11px 20px; border-radius: 8px; }
  .cc-btn-draft:hover, .cc-next-step:hover { border-color: var(--accent); color: var(--accent); }
  .cc-btn-draft:disabled, .cc-next-step:disabled { opacity: 0.6; cursor: not-allowed; }
  .cc-btn-publish, .cc-continue { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #fff; background: var(--accent); border: none; padding: 12px 24px; border-radius: 8px; }
  .cc-btn-publish:disabled, .cc-continue:disabled { background: #b9bcdd; cursor: not-allowed; }
  .cc-spin { animation: cc-spin 0.8s linear infinite; }
  @keyframes cc-spin { to { transform: rotate(360deg); } }

  .cc-loading-card { text-align: center; padding: 48px 20px; color: var(--ink-soft); }
`}</style>

      <div className="cc-shell">

        <Link to="/" className="cc-wordmark">
          <LogoMark size={34} />
          <span>creatorhub</span>
        </Link>

        <div className="cc-header">
          <button type="button" className="cc-back-link" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>
          <ProfileChip />
        </div>

        {mode === 'edit' && loadingExisting && (
          <div className="cc-card cc-loading-card">Loading campaign…</div>
        )}

        {mode === 'edit' && !loadingExisting && notFound && (
          <div className="cc-card cc-loading-card">This campaign couldn't be found.</div>
        )}

        {mode === 'edit' && !loadingExisting && accessDenied && (
          <div className="cc-card cc-loading-card">You don't have access to edit this campaign.</div>
        )}

        {(mode === 'create' || (!loadingExisting && !notFound && !accessDenied)) && (
          <>
            <StepHeader step={step} onStepClick={(n) => { setError(''); setStep(n); }} />

            {mode === 'create' && step === 1 && (
              <div className="cc-defaults-box">
                <button type="button" className="cc-defaults-toggle" onClick={() => setDefaultsOpen((v) => !v)}>
                  <Settings size={14} /> Manage my campaign defaults
                </button>
                {defaultsOpen && (
                  <div className="cc-defaults-panel">
                    <div className="cc-hint" style={{ marginBottom: 12 }}>
                      <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                      These prefill new campaigns automatically. Editing them here won't change campaigns you've
                      already created. You can also manage these anytime from{' '}
                      <Link to="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>
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
                      <button type="button" className="cc-defaults-save" disabled={defaultsSaving} onClick={saveDefaults}>
                        {defaultsSaving ? 'Saving…' : 'Save Defaults'}
                      </button>
                      {defaultsMsg && <span className="cc-hint" style={{ margin: 0 }}>{defaultsMsg}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="cc-card">
              <h2 className="cc-h2">{STEP_TITLES[step - 1]}</h2>
              <p className="cc-sub">{STEP_SUBTITLES[step - 1]}</p>

              {error && <div className="cc-error">{error}</div>}

              {step === 1 && (
                <>
                  <div className="cc-field">
                    <label className="cc-label">Products to Promote</label>
                    <div className="cc-product-gallery">
                      <div className="cc-product-gallery-main">
                        <div className="cc-product-main">
                          {heroImage ? (
                            <>
                              <span className="cc-product-badge">Main product</span>
                              <img src={heroImage} alt="Main product" />
                              <button type="button" className="cc-product-remove" onClick={() => setHeroImage('')} aria-label="Remove main product">
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <div className="cc-hero-placeholder"><Camera size={22} /><span>Add your main product</span></div>
                          )}
                        </div>
                        <div className="cc-product-thumbs">
                          {extraPhotos.map((photo, i) => (
                            <button type="button" className="cc-product-thumb" key={`${photo}-${i}`} onClick={() => { const next = [...extraPhotos]; next.splice(i, 1); setExtraPhotos(next); }}>
                              <img src={photo} alt={`Product ${i + 2}`} />
                              <span className="cc-product-badge" style={{ left: 5, top: 5, padding: '3px 6px', fontSize: 9 }}>{i + 2}</span>
                            </button>
                          ))}
                          <label className="cc-product-add">
                            <Plus size={18} />
                            <span>{uploadingPhotos ? 'Uploading…' : 'Add more'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              style={{ display: 'none' }}
                              disabled={uploadingPhotos}
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (!files.length) return;
                                setUploadingPhotos(true);
                                setHeroError('');
                                try {
                                  const uploaded = await Promise.all(files.map((file) => uploadImage(file).then((r) => r.url)));
                                  setExtraPhotos((prev) => [...prev, ...uploaded]);
                                } catch (err: any) {
                                  console.error('Product photo upload failed:', err);
                                  setHeroError(err?.response?.data?.detail || 'Could not upload product photos. Please try again.');
                                } finally {
                                  setUploadingPhotos(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="cc-product-actions">
                        <label className="cc-hero-btn" style={uploadingHero ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                          <Camera size={14} />
                          {uploadingHero ? 'Uploading…' : heroImage ? 'Replace main image' : 'Upload main product'}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            disabled={uploadingHero}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingHero(true);
                              setHeroError('');
                              try { const { url } = await uploadImage(file); setHeroImage(url); }
                              catch (err: any) { setHeroError(err?.response?.data?.detail || 'Could not upload image. Please try again.'); }
                              finally { setUploadingHero(false); e.target.value = ''; }
                            }}
                          />
                        </label>
                        <label className="cc-hero-btn">
                          <Plus size={14} /> Add product photos
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            disabled={uploadingPhotos}
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (!files.length) return;
                              setUploadingPhotos(true);
                              setHeroError('');
                              try { const uploaded = await Promise.all(files.map((file) => uploadImage(file).then((r) => r.url))); setExtraPhotos((prev) => [...prev, ...uploaded]); }
                              catch (err: any) { setHeroError(err?.response?.data?.detail || 'Could not upload product photos. Please try again.'); }
                              finally { setUploadingPhotos(false); e.target.value = ''; }
                            }}
                          />
                        </label>
                      </div>
                      <div className="cc-product-help">
                        <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                        Add the actual products creators will promote — entirely optional. The first image becomes the
                        cover; extra photos show as a small stacked overlay on the campaign page.
                      </div>
                      {heroError && (
                        <div className="cc-hint" style={{ color: '#d64545' }}>
                          <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                          {heroError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cc-field">
                    <label className="cc-label">Campaign Title *</label>
                    <input className="cc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sweet Moments with CloudBakes" />
                  </div>

                  <PickChips label="Category" required options={CATEGORIES} value={category} onChange={setCategory} />

                  {categorySuggestions && (
                    <div className="cc-suggest-box">
                      <div className="cc-suggest-title">
                        <Info size={13} /> Suggested for {category}
                      </div>
                      <div className="cc-suggest-group">
                        <div className="cc-suggest-group-label">Deliverables</div>
                        <div className="cc-suggest-list">
                          {categorySuggestions.deliverables.map((d) => (
                            <button
                              type="button"
                              key={d}
                              className="cc-suggest-chip"
                              disabled={deliverables.some((x) => x.toLowerCase() === d.toLowerCase())}
                              onClick={() => setDeliverables(addUnique(deliverables, [d]))}
                            >
                              + {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="cc-suggest-group">
                        <div className="cc-suggest-group-label">Hashtags</div>
                        <div className="cc-suggest-list">
                          {categorySuggestions.hashtags.map((h) => (
                            <button
                              type="button"
                              key={h}
                              className="cc-suggest-chip"
                              disabled={hashtags.some((x) => x.toLowerCase() === h.toLowerCase())}
                              onClick={() => setHashtags(addUnique(hashtags, [h]))}
                            >
                              + {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <PickChips label="Campaign Type" required options={['paid', 'gifted']} value={campaignType} onChange={(v) => setCampaignType((v || 'gifted') as CampaignType)} />

                  <PickChips
                    label="Content Type"
                    hint="Shown as a tag and in the campaign snapshot on the detail page."
                    options={CONTENT_TYPES}
                    value={subCategory}
                    onChange={setSubCategory}
                  />

                  <div className="cc-row">
                    <div className="cc-field">
                      <label className="cc-label">Brand Name</label>
                      <input className="cc-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. CloudBakes" />
                    </div>
                    <div className="cc-field">
                      <label className="cc-label">Location</label>
                      <input className="cc-input" value={brandLocation} onChange={(e) => setBrandLocation(e.target.value)} placeholder="e.g. Kathmandu, Nepal" />
                    </div>
                  </div>

                  <div className="cc-row">
                    <div className="cc-field">
                      <label className="cc-label">Compensation</label>
                      {campaignType === 'paid' ? (
                        <input className="cc-input" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 2000" />
                      ) : (
                        <input className="cc-input" value={compensationDescription} onChange={(e) => setCompensationDescription(e.target.value)} placeholder="e.g. Product worth Rs. 2,000" />
                      )}
                    </div>
                    <div className="cc-field">
                      <label className="cc-label">Application Deadline</label>
                      <input className="cc-input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                    </div>
                  </div>

                  <div className="cc-field">
                    <label className="cc-label">Tagline</label>
                    <input className="cc-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short one-liner shown under the title" />
                  </div>

                  <div className="cc-field" style={{ marginBottom: 4 }}>
                    <label className="cc-label">About This Campaign *</label>
                    <textarea className="cc-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell creators what to make, why it matters, and what your brand is all about..." />
                    <div className="cc-hint">Shown as the main description on the campaign page. Minimum 10 characters.</div>
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

                  <TagListField
                    label="Before You Apply"
                    placeholder="e.g. I can complete the campaign on time"
                    items={beforeYouApply}
                    onChange={setBeforeYouApply}
                    hint="Short first-person confirmations creators tick off before applying — different from your requirements above, which are the creator qualities you're looking for."
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

                  <div className="cc-field" style={{ marginBottom: 4 }}>
                    <label className="cc-label">Campaign Guidelines Note</label>
                    <textarea
                      className="cc-textarea"
                      value={guidelinesNote}
                      onChange={(e) => setGuidelinesNote(e.target.value)}
                      placeholder="A short highlighted note, e.g. Keep your content authentic, positive and aligned with the brand's values."
                    />
                    <div className="cc-hint">
                      <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                      Shown in a highlighted callout at the bottom of the campaign page.
                    </div>
                  </div>
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

                      <PickChips label="Platform" options={VIDEO_PLATFORMS} value={spec.platform} onChange={(v) => updateVideoSpec(i, { platform: v })} />
                      <PickChips label="Duration" options={VIDEO_DURATIONS} value={spec.duration || ''} onChange={(v) => updateVideoSpec(i, { duration: v })} />
                      <PickChips label="Aspect Ratio" options={ASPECT_RATIOS} value={spec.aspect_ratio || ''} onChange={(v) => updateVideoSpec(i, { aspect_ratio: v })} />
                      <PickChips label="Resolution" options={RESOLUTIONS} value={spec.resolution || ''} onChange={(v) => updateVideoSpec(i, { resolution: v })} />
                      <PickChips label="Frame Rate" options={FRAME_RATES} value={spec.frame_rate || ''} onChange={(v) => updateVideoSpec(i, { frame_rate: v })} />
                      <PickChips label="File Type" options={FILE_TYPES} value={spec.file_type || ''} onChange={(v) => updateVideoSpec(i, { file_type: v })} />

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
                  ))}
                  <button type="button" className="cc-add-spec-btn" onClick={addVideoSpec}>
                    <Plus size={15} /> Add a platform
                  </button>
                </>
              )}

              {step === 6 && (
                <div className="cc-review">
                  <div className="cc-review-intro">
                    <strong>Give it a final look before you publish.</strong>
                    <span>
                      This is the information creators will use to decide whether the campaign is a good fit.
                      You can jump back to any step from the dots above and make changes.
                    </span>
                  </div>

                  <div className="cc-review-grid">
                    <div className="cc-review-item">
                      <div className="cc-review-label">Campaign</div>
                      <div className="cc-review-value">{title || 'Not added yet'}</div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-label">Category</div>
                      <div className="cc-review-value">{category || 'Not selected'}</div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-label">Brand</div>
                      <div className="cc-review-value">{brandName || 'Not added'}</div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-label">Content type</div>
                      <div className="cc-review-value">{subCategory || 'Not specified'}</div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-label">Campaign type</div>
                      <div className="cc-review-value">{campaignType === 'paid' ? 'Paid' : 'Gifted'}</div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-label">Compensation</div>
                      <div className="cc-review-value">
                        {campaignType === 'paid'
                          ? (budget ? `Rs. ${budget}` : 'Budget not specified')
                          : (compensationDescription || 'Compensation details not specified')}
                      </div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-label">Application deadline</div>
                      <div className="cc-review-value">{deadline || 'Not specified'}</div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-label">Location</div>
                      <div className="cc-review-value">{brandLocation || 'Not specified'}</div>
                    </div>
                  </div>

                  <div className="cc-review-item">
                    <div className="cc-review-label">About the campaign</div>
                    <div className="cc-review-value">{description || 'No campaign description yet.'}</div>
                  </div>

                  <div className="cc-review-item">
                    <div className="cc-review-label">Creator requirements</div>
                    <div className="cc-review-value">{requirements || 'No creator requirements added yet.'}</div>
                  </div>

                  <div className="cc-review-item">
                    <div className="cc-review-section-title">Deliverables</div>
                    {deliverables.length > 0 ? (
                      <div className="cc-review-list">
                        {deliverables.map((item, i) => <span className="cc-review-pill" key={i}>{item}</span>)}
                      </div>
                    ) : <span className="cc-review-empty">No deliverables added.</span>}
                  </div>

                  <div className="cc-review-grid">
                    <div className="cc-review-item">
                      <div className="cc-review-section-title">Creative direction</div>
                      <div className="cc-review-value">
                        {dos.length} do&apos;s · {donts.length} don&apos;ts · {requiredScenes.length} required scenes
                      </div>
                    </div>
                    <div className="cc-review-item">
                      <div className="cc-review-section-title">Caption & tags</div>
                      <div className="cc-review-value">
                        {suggestedCaption ? 'Caption added' : 'No suggested caption'} · {hashtags.length} hashtag{hashtags.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  <div className="cc-review-item">
                    <div className="cc-review-label">Video specifications</div>
                    {videoSpecs.length > 0 ? (
                      <div className="cc-review-list">
                        {videoSpecs.filter((s) => s.platform.trim()).map((spec, i) => (
                          <span className="cc-review-pill" key={i}>
                            {spec.platform}{spec.duration ? ` · ${spec.duration}` : ''}{spec.aspect_ratio ? ` · ${spec.aspect_ratio}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : <span className="cc-review-empty">No platform-specific rules added.</span>}
                  </div>
                </div>
              )}

              <div className="cc-footer">
                {step > 1 ? (
                  <button type="button" className="cc-back-step" onClick={() => { setError(''); setStep(step - 1); }}>
                    <ArrowLeft size={14} /> Previous
                  </button>
                ) : <span />}

                <div className="cc-footer-right">
                  {step < STEP_LABELS.length && (
                    <button
                      type="button"
                      className="cc-next-step"
                      disabled={step === 1 && !canContinueStep1}
                      onClick={() => { setError(''); setStep(step + 1); }}
                    >
                      Next <ArrowRight size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="cc-btn-draft"
                    onClick={() => handleSubmit('draft')}
                    disabled={saving !== null}
                  >
                    {saving === 'draft' && <Loader2 size={15} className="cc-spin" />}
                    {mode === 'edit' ? 'Save Changes' : 'Save as Draft'}
                  </button>
                  {step === STEP_LABELS.length && (mode === 'create' || originalStatus === 'draft') && (
                    <button
                      type="button"
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

              <div className="cc-hint" style={{ marginTop: 12, justifyContent: 'center' }}>
                <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                You don't need to fill in every step — save or publish whenever you're ready, and come back to add
                more later.
              </div>
            </div>
          </>
        )}
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
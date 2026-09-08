import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Plus, X, Trash2, Camera, Info, Settings, Sparkles, CheckCircle2, Gift, DollarSign, ChevronDown, LogOut } from 'lucide-react';
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

const VIOLET = '#1E2A78';
const VIOLET_DARK = '#182262';
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

const STEP_LABELS = ['Basics', 'Creator Requirements', 'Creative Brief', 'Caption & Tags', 'Video Specs', 'Review & Publish'];

// One-line descriptions shown under each step's title in the sidebar
// while that step hasn't been reached yet — swapped for a live status
// ("Filling in now" / "Done") once you're on it or past it.
const STEP_DESCRIPTIONS = [
  'Campaign identity, offer & timeline',
  'Who you want and what they deliver',
  "Creative direction and boundaries",
  'Caption, hashtags and messaging',
  'Format rules per platform',
  'Check everything before publishing',
];

// Big editorial-style heading shown above the fields for each step —
// framed as a question, same spirit as a qualification-gate wizard.
const STEP_QUESTIONS = [
  "What's this campaign about?",
  'Who are you looking for?',
  'What should creators know before creating?',
  'How should creators caption it?',
  'What are the video rules?',
  'Ready to publish your campaign?',
];

// The word in each STEP_QUESTIONS heading that gets the coral
// highlight (matches the reference design). Must match a whole word
// in the corresponding question, case-insensitive.
const STEP_HIGHLIGHT_WORDS = ['campaign', 'looking', 'creating', 'caption', 'rules', 'publish'];

// Splits a heading into [before, highlighted, after] around one word,
// so it can be rendered with the middle word in a different color.
function splitHeading(text: string, word: string): [string, string, string] {
  const idx = text.toLowerCase().indexOf(word.toLowerCase());
  if (idx === -1) return [text, '', ''];
  return [text.slice(0, idx), text.slice(idx, idx + word.length), text.slice(idx + word.length)];
}

const STEP_SUBTITLES = [
  'The essentials creators see first — title, category, offer, compensation and deadline.',
  'Define the creator profile, deliverables, checklist and application expectations.',
  'Set the creative direction, required scenes, do\'s, don\'ts and campaign note.',
  'Give creators a starting caption and the hashtags or mentions to use.',
  'Add platform-specific duration, ratio, resolution, file and accessibility rules.',
  'Review the campaign as a creator will see it, then save or publish.',
];

// Persistent left-hand sidebar replacing the old horizontal dot
// stepper — same idea (numbered progress, clickable since every step
// past Basics is optional) but laid out as a vertical "qualification
// gates" list: title + a one-line description that swaps for a live
// status once you're on or past that step.
//
// Color logic: a step you're ACTIVELY filling in shows navy (matches
// the brand's primary color while work is in progress); a step only
// turns coral once it's genuinely DONE. Upcoming steps stay outlined
// navy. This mirrors the reference screenshots where "Basics" stayed
// navy while being filled, rather than turning coral immediately.
//
// Logo mark and the profile chip at the bottom are the exact same
// markup/behavior as Dashboard.tsx's sidebar (same SVG circles,
// "creatorhub" wordmark, avatar-or-initials chip with a menu that
// opens Edit profile / Settings / Log out) so this page's chrome
// matches Dashboard's instead of introducing a separate brand mark.
function StepSidebar({
  step,
  onStepClick,
  mode,
}: {
  step: number;
  onStepClick: (n: number) => void;
  mode: 'create' | 'edit';
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role === 'creator' ? 'creator' : 'business';
  const primary = role === 'creator' ? CORAL : VIOLET;
  const initials = user?.full_name?.[0]?.toUpperCase() ?? '?';
  const avatarUrl: string | null = user?.profile?.profile_image || user?.profile?.logo_url || null;

  const total = STEP_LABELS.length;
  const percent = Math.round((step / total) * 100);

  return (
    <aside className="cc-sidebar">
      <div className="cc-sidebar-top">
        <div className="cc-sidebar-brand">
          <svg width="28" height="28" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="10" cy="13" r="8" fill={VIOLET} />
            <circle cx="17" cy="9" r="6" fill={CORAL} fillOpacity="0.9" />
          </svg>
          <span
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.03em',
              fontSize: '1.05rem',
              color: 'var(--ink)',
            }}
          >
            creatorhub
          </span>
        </div>

        <div className="cc-sidebar-eyebrow">{mode === 'create' ? 'Create Campaign' : 'Edit Campaign'}</div>

        <div className="cc-sidebar-progress-wrap">
          <div className="cc-sidebar-progress-label">
            <span>{step} of {total} steps</span>
            <span>{percent}%</span>
          </div>
          <div className="cc-sidebar-progress-track">
            <div className="cc-sidebar-progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <hr className="cc-sidebar-divider" />

        <div className="cc-sidebar-steps">
          {STEP_LABELS.map((label, index) => {
            const number = index + 1;
            const state = number < step ? 'done' : number === step ? 'active' : 'upcoming';
            const caption =
              state === 'done' ? 'Done' : state === 'active' ? 'Filling in now' : STEP_DESCRIPTIONS[index];

            return (
              <button
                type="button"
                className={`cc-sidebar-step ${state === 'active' ? 'cc-sidebar-step--active' : ''}`}
                key={label}
                onClick={() => onStepClick(number)}
              >
                <span className="cc-sidebar-dotcol">
                  <span className={`cc-sidebar-num cc-sidebar-num--${state}`}>
                    {state === 'done' ? <CheckCircle2 size={12} /> : number}
                  </span>
                  {number < total && (
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
      </div>

      {/* Profile chip at bottom */}
      <div className="cc-sidebar-profile">
        <button onClick={() => setMenuOpen((v) => !v)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2">
          <div
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
            style={{ background: primary }}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs font-medium leading-tight" style={{ color: 'var(--ink)' }}>{user?.full_name}</div>
            <div className="text-[11px] capitalize leading-tight" style={{ color: '#A39DB8' }}>{user?.role}</div>
          </div>
          <ChevronDown size={14} style={{ color: '#A39DB8' }} />
        </button>
        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border py-1 shadow-lg" style={{ background: '#fff', borderColor: 'var(--line)' }}>
            <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>
              <Settings size={13} /> Edit profile
            </Link>
            {role === 'business' && (
              <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>
                <Settings size={13} /> Settings
              </Link>
            )}
            <button
              onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
              style={{ color: 'var(--ink)' }}
            >
              <LogOut size={13} /> Log out
            </button>
          </div>
        )}
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
        setExtraPhotos(Array.isArray((c as Campaign & { extra_photos?: string[] }).extra_photos) ? ((c as Campaign & { extra_photos?: string[] }).extra_photos || []) : []);
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
  .cc {
    --violet: ${VIOLET};
    --violet-dark: ${VIOLET_DARK};
    --coral: ${CORAL};
    --ink: #111217;
    --ink-soft: #6c6d73;
    --line: #e6e6ea;
    font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
    min-height: 100vh;
    background: #F5F4FA;
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
  .cc-shell { display: flex; min-height: 100vh; align-items: flex-start; }

  /* Sidebar stays fixed while right side scrolls */
  .cc-sidebar {
    width: 260px;
    flex-shrink: 0;
    padding: 24px 20px;
    background: #FFFFFF;
    border-right: 1px solid #EAE7F2;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  @media (max-width: 860px) {
    .cc-sidebar {
      position: static;
      height: auto;
      width: 100%;
      border-right: none;
      border-bottom: 1px solid #EAE7F2;
    }
    .cc-shell { align-items: stretch; }
  }

  .cc-sidebar-brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 16px; }
  .cc-sidebar-tagline { font-size: 12px; color: var(--ink-soft); margin: 4px 0 0 28px; }
  .cc-sidebar-divider { border: none; border-top: 1px solid #EDEBF5; margin: 14px 0; }

  .cc-sidebar-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--violet-dark); margin-bottom: 10px; }

  .cc-sidebar-progress-wrap { margin-bottom: 14px; }
  .cc-sidebar-progress-label {
    display: flex; justify-content: space-between;
    font-size: 11.5px; font-weight: 600; color: var(--ink-soft);
    margin-bottom: 6px;
  }
  .cc-sidebar-progress-track {
    height: 4px; background: #EDEBF5; border-radius: 999px; overflow: hidden;
  }
  .cc-sidebar-progress-fill {
    height: 100%; border-radius: 999px;
    background: var(--coral);
    transition: width 0.3s ease;
  }

  .cc-sidebar-steps { display: flex; flex-direction: column; }
  .cc-sidebar-step {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 6px 8px;
    margin: 0 -8px;
    width: calc(100% + 16px);
    border-radius: 10px;
    transition: background 0.15s ease;
  }
  .cc-sidebar-step--active {
    background: #F2F4FC;
  }

  .cc-sidebar-dotcol { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
  .cc-sidebar-num {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
  }
  /* Upcoming: outlined navy */
  .cc-sidebar-num--upcoming { background: #fff; border: 1.5px solid var(--violet); color: var(--violet); }
  /* Currently filling: solid navy */
  .cc-sidebar-num--active {
    background: var(--violet); color: #fff;
    box-shadow: 0 0 0 3px rgba(30,42,120,0.15);
  }
  /* Completed: solid coral */
  .cc-sidebar-num--done { background: var(--coral); color: #fff; }

  .cc-sidebar-line { width: 1.5px; flex: 1; min-height: 14px; background: var(--line); margin: 2px 0; }
  .cc-sidebar-line--done { background: var(--coral); }

  .cc-sidebar-step-text { display: flex; flex-direction: column; padding: 1px 0 6px; }
  .cc-sidebar-step-title { font-size: 13px; font-weight: 600; color: var(--ink-soft); }
  .cc-sidebar-step-title--active { color: var(--violet-dark); }
  .cc-sidebar-step-title--done { color: var(--ink); }
  .cc-sidebar-step-caption { font-size: 11px; color: var(--ink-soft); margin-top: 1px; }
  .cc-sidebar-step-caption--active { color: var(--violet-dark); font-weight: 600; }
  .cc-sidebar-step-caption--done { color: var(--coral); font-weight: 600; }

  .cc-sidebar-profile {
    position: relative;
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid #EAE7F2;
  }

  .cc-main {
    flex: 1;
    max-width: 1080px;
    padding: 40px 42px 80px;
  }
  @media (max-width: 560px) {
    .cc-main { padding: 28px 20px 60px; }
  }

  .cc-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--violet-dark); margin-bottom: 10px; }
  .cc-eyebrow-num { color: var(--coral); }
  .cc-h1-serif {
    font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
    font-size: 28px;
    font-weight: 600;
    line-height: 1.3;
    margin: 0 0 8px;
    color: var(--violet-dark);
  }
  .cc-h1-highlight { color: var(--coral); }
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
    padding: 26px 28px;
  }

  .cc-basics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
  .cc-basics-full { grid-column: 1 / -1; }
  .cc-product-gallery { border: 1px solid var(--line); border-radius: 14px; padding: 12px; background: #fff; margin-bottom: 22px; }
  .cc-product-gallery-main { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(250px, 1fr); gap: 10px; align-items: stretch; }
  .cc-product-main { position: relative; min-width: 0; height: 185px; border-radius: 11px; overflow: hidden; background: #f6f6f8; }
  .cc-product-main img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cc-product-thumbs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-content: start; }
  .cc-product-thumb, .cc-product-add { min-width: 0; height: 76px; border-radius: 9px; overflow: hidden; border: 1px solid var(--line); background: #fafafd; position: relative; cursor: pointer; }
  .cc-product-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cc-product-thumb--active { border: 2px solid var(--violet); }
  .cc-product-add { border: 1px dashed #B9C1E5; color: var(--violet-dark); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 10px; font-weight: 600; }
  .cc-product-badge { position: absolute; left: 10px; top: 10px; background: #fff; color: var(--violet-dark); border-radius: 999px; padding: 6px 9px; font-size: 10px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,.08); z-index: 2; }
  .cc-product-remove { position: absolute; right: 9px; top: 9px; width: 27px; height: 27px; border: 0; border-radius: 50%; background: rgba(17,18,23,.58); color: #fff; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:3; }
  .cc-product-actions { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
  .cc-product-help { font-size:11.5px; color:var(--ink-soft); margin-top:8px; display:flex; gap:5px; line-height:1.4; }
  @media (max-width: 760px) { .cc-basics-grid { grid-template-columns: 1fr; } .cc-basics-full { grid-column:auto; } .cc-product-gallery-main { grid-template-columns: 1fr; } .cc-product-main { height: 175px; } .cc-product-thumbs { grid-template-columns: repeat(4, 1fr); } }

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
    flex: none;
    white-space: nowrap;
    padding: 12px 22px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
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
    padding: 14px;
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

  .cc-review {
    display: grid;
    gap: 14px;
  }
  .cc-review-intro {
    padding: 18px 20px;
    border-radius: 12px;
    background: #F2F4FC;
    border: 1px solid #DDE2F6;
  }
  .cc-review-intro strong {
    display: block;
    color: var(--violet-dark);
    font-size: 15px;
    margin-bottom: 4px;
  }
  .cc-review-intro span {
    color: var(--ink-soft);
    font-size: 12.5px;
    line-height: 1.55;
  }
  .cc-review-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .cc-review-item {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 14px 15px;
    background: #fff;
  }
  .cc-review-label {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 5px;
  }
  .cc-review-value {
    font-size: 13.5px;
    line-height: 1.45;
    color: var(--ink);
    word-break: break-word;
  }
  .cc-review-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .cc-review-pill {
    padding: 5px 9px;
    border-radius: 999px;
    background: #F7F7FA;
    border: 1px solid #E5E5EB;
    font-size: 11.5px;
    color: var(--ink);
  }
  .cc-review-empty {
    color: #A39DB8;
    font-size: 12px;
  }
  .cc-review-section-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--violet-dark);
    margin: 4px 0 8px;
  }
  @media (max-width: 680px) {
    .cc-review-grid { grid-template-columns: 1fr; }
  }

  .flex { display: flex; }
  .w-full { width: 100%; }
  .items-center { align-items: center; }
  .gap-2\.5 { gap: 10px; }
  .rounded-lg { border-radius: 8px; }
  .px-2 { padding-left: 8px; padding-right: 8px; }
  .py-2 { padding-top: 8px; padding-bottom: 8px; }
  .h-8 { height: 32px; }
  .w-8 { width: 32px; }
  .text-xs { font-size: 12px; }
  .font-semibold { font-weight: 600; }
  .text-white { color: #fff; }
  .overflow-hidden { overflow: hidden; }
  .rounded-full { border-radius: 9999px; }
  .h-full { height: 100%; }
  .w-full { width: 100%; }
  .object-cover { object-fit: cover; }
  .flex-1 { flex: 1; }
  .text-left { text-align: left; }
  .font-medium { font-weight: 500; }
  .leading-tight { line-height: 1.25; }
  .capitalize { text-transform: capitalize; }
  .absolute { position: absolute; }
  .bottom-full { bottom: 100%; }
  .left-0 { left: 0; }
  .mb-2 { margin-bottom: 8px; }
  .border { border-width: 1px; }
  .py-1 { padding-top: 4px; padding-bottom: 4px; }
  .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
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
                <span>STEP </span>
                <span className="cc-eyebrow-num">{step}</span>
                <span> OF {STEP_LABELS.length} · {STEP_LABELS[step - 1].toUpperCase()}</span>
              </div>
              <h1 className="cc-h1-serif">
                {(() => {
                  const [before, highlight, after] = splitHeading(STEP_QUESTIONS[step - 1], STEP_HIGHLIGHT_WORDS[step - 1]);
                  return (
                    <>
                      {before}
                      <span className="cc-h1-highlight">{highlight}</span>
                      {after}
                    </>
                  );
                })()}
              </h1>
              <p className="cc-sub" style={{ marginBottom: 20 }}>
                {STEP_SUBTITLES[step - 1]}
              </p>

              {mode === 'create' && step === 1 && (
              <div className="cc-defaults-box">

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
                            <button type="button" className="cc-product-thumb" key={`${photo}-${i}`} onClick={() => { const next = [...extraPhotos]; next.splice(i, 1); setExtraPhotos([photo, ...next]); }}>
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
                      <div className="cc-product-help"><Info size={13} /> Add the actual products creators will promote. The first image is the main product; additional photos appear as a gallery on the campaign page.</div>
                      {heroError && <div className="cc-hint" style={{ color: '#d64545' }}>{heroError}</div>}
                    </div>
                  </div>

                  <div className="cc-basics-grid">
                    <div className="cc-field">
                      <label className="cc-label">Campaign Title *</label>
                      <input className="cc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sweet Moments with CloudBakes" />
                    </div>
                    <div className="cc-field">
                      <label className="cc-label">Category *</label>
                      <select className="cc-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Select a category</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="cc-field">
                      <label className="cc-label">Campaign Type *</label>
                      <select className="cc-select" value={campaignType} onChange={(e) => setCampaignType(e.target.value as CampaignType)}>
                        <option value="paid">Paid</option><option value="gifted">Gifted</option>
                      </select>
                    </div>
                    <div className="cc-field">
                      <label className="cc-label">Content Type</label>
                      <select className="cc-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                        <option value="">Select content type</option>{CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="cc-field">
                      <label className="cc-label">Brand Name</label>
                      <input className="cc-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. CloudBakes" />
                    </div>
                    <div className="cc-field">
                      <label className="cc-label">Location</label>
                      <input className="cc-input" value={brandLocation} onChange={(e) => setBrandLocation(e.target.value)} placeholder="e.g. Kathmandu, Nepal" />
                    </div>
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
                    <div className="cc-field cc-basics-full">
                      <label className="cc-label">Tagline</label>
                      <input className="cc-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short one-liner shown under the title" />
                    </div>
                    <div className="cc-field cc-basics-full">
                      <label className="cc-label">About This Campaign *</label>
                      <textarea className="cc-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell creators what to make, why it matters, and what your brand is all about..." />
                      <div className="cc-hint">Shown as the main description on the campaign page. Minimum 10 characters.</div>
                    </div>
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

              <div className="cc-field">
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
                  <div className="cc-spec-row-inputs">
                    <div>
                      <label className="cc-label">Platform</label>
                      <select className="cc-select" value={spec.platform} onChange={(e) => updateVideoSpec(i, { platform: e.target.value })}>
                        <option value="">Select platform</option>{VIDEO_PLATFORMS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="cc-label">Duration</label>
                      <select className="cc-select" value={spec.duration || ''} onChange={(e) => updateVideoSpec(i, { duration: e.target.value })}>
                        <option value="">Select duration</option>{VIDEO_DURATIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="cc-spec-row-inputs">
                    <div>
                      <label className="cc-label">Aspect Ratio</label>
                      <select className="cc-select" value={spec.aspect_ratio || ''} onChange={(e) => updateVideoSpec(i, { aspect_ratio: e.target.value })}>
                        <option value="">Select ratio</option>{ASPECT_RATIOS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="cc-label">Resolution</label>
                      <select className="cc-select" value={spec.resolution || ''} onChange={(e) => updateVideoSpec(i, { resolution: e.target.value })}>
                        <option value="">Select resolution</option>{RESOLUTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="cc-spec-row-inputs">
                    <div>
                      <label className="cc-label">Frame Rate</label>
                      <select className="cc-select" value={spec.frame_rate || ''} onChange={(e) => updateVideoSpec(i, { frame_rate: e.target.value })}>
                        <option value="">Select frame rate</option>{FRAME_RATES.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="cc-label">File Type</label>
                      <select className="cc-select" value={spec.file_type || ''} onChange={(e) => updateVideoSpec(i, { file_type: e.target.value })}>
                        <option value="">Select file type</option>{FILE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="cc-spec-row-inputs">
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
                      You can jump back to any step from the sidebar and make changes.
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


              <hr className="cc-section-divider" style={{ marginTop: 24 }} />

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
                  {step === STEP_LABELS.length && (mode === 'create' || originalStatus === 'draft') && (
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
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
} from 'lucide-react';
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
import { AppLayout } from '../components/AppLayout';

const NAVY = '#1E2A78';
const CORAL = '#FF6B5A';

// How many chip options show before a "+N more" toggle appears. This is the
// fix for pickers with long option lists (18 creator categories, etc.)
// wrapping into a wall of pills — see ExpandableOptions below.
const CHIP_PREVIEW_COUNT = 7;

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

// Curated starter suggestions per category. A plain lookup table on purpose —
// easy to extend, and nothing here is forced in; each item only gets added
// when the business clicks "+ Add".
const CATEGORY_SUGGESTIONS: Record<string, { dos: string[]; deliverables: string[]; hashtags: string[] }> = {
  Beauty: { dos: ['Show product application step by step', 'Use good lighting on skin/face', 'Include a close-up of texture and packaging'], deliverables: ['1 Instagram Reel', '1 Instagram Story'], hashtags: ['#beauty', '#skincare'] },
  Fashion: { dos: ['Show the full outfit styled', 'Include a fit/sizing note', 'Use natural lighting'], deliverables: ['1 Instagram Reel or TikTok', '1 Story with try-on'], hashtags: ['#fashion', '#ootd'] },
  Lifestyle: { dos: ['Show it in a real, everyday setting', 'Keep the tone warm and relatable'], deliverables: ['1 Reel', '1 Story'], hashtags: ['#lifestyle'] },
  Food: { dos: ['Show the product or dish up close', 'Include a genuine taste reaction'], deliverables: ['1 Reel', '1 Story'], hashtags: ['#foodie', '#nepalifood'] },
  Tech: { dos: ['Demonstrate the key feature clearly', 'Mention specs relevant to the audience'], deliverables: ['1 Review Reel', '1 Unboxing Story'], hashtags: ['#tech', '#gadgets'] },
  Fitness: { dos: ['Show proper form during use', 'Film in good lighting with clear movement'], deliverables: ['1 Workout Reel', '1 Story'], hashtags: ['#fitness', '#workout'] },
  Travel: { dos: ['Show the location or experience clearly', 'Include a personal reaction or tip'], deliverables: ['1 Reel', '1 Story series'], hashtags: ['#travel', '#nepal'] },
  Gaming: { dos: ['Show clear gameplay footage', 'Keep energy high and authentic'], deliverables: ['1 Gameplay Reel/Short', '1 Story'], hashtags: ['#gaming'] },
  Education: { dos: ['Explain the key takeaway clearly', 'Use simple, engaging language'], deliverables: ['1 Educational Reel/Short', '1 Story'], hashtags: ['#learnontiktok', '#education'] },
  Finance: { dos: ['Keep claims accurate and simple', 'Add a clear disclaimer where relevant'], deliverables: ['1 Explainer Reel', '1 Story'], hashtags: ['#finance', '#money'] },
  Wellness: { dos: ['Keep the tone calm and genuine', 'Show the product or practice in daily use'], deliverables: ['1 Reel', '1 Story'], hashtags: ['#wellness', '#selfcare'] },
  Skincare: { dos: ['Show application step by step', 'Use natural, well-lit close-ups'], deliverables: ['1 Reel', '1 Story'], hashtags: ['#skincare', '#glowup'] },
  'Home Decor': { dos: ['Show it styled in a real room', 'Use natural daylight where possible'], deliverables: ['1 Reel', '1 Story'], hashtags: ['#homedecor', '#interiordesign'] },
  Parenting: { dos: ['Keep it honest and relatable', 'Show real day-to-day use'], deliverables: ['1 Reel', '1 Story'], hashtags: ['#parenting', '#momsoftiktok'] },
  Entertainment: { dos: ['Keep energy high and on-brand', 'Hook viewers in the first 3 seconds'], deliverables: ['1 Reel/Short'], hashtags: ['#entertainment'] },
};

const PRESET_CHECKLIST_ITEMS = [
  'Vertical 9:16', 'Voiceover required', 'Show product packaging', 'Show product clearly',
  'Natural lighting', 'Product close-up', 'Include CTA', 'Mention brand name',
  'Demonstrate product usage', 'No copyrighted music', 'Include subtitles', 'Show before/after',
];

function parsePastedList(text: string): string[] {
  return text.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
}

function addUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((i) => i.toLowerCase()));
  const toAdd: string[] = [];
  for (const item of incoming) {
    const key = item.toLowerCase();
    if (!seen.has(key)) { seen.add(key); toAdd.push(item); }
  }
  return toAdd.length > 0 ? [...existing, ...toAdd] : existing;
}

// Reusable "type text, hit Enter/Add, get a removable chip" editor — backs
// Deliverables, Required Scenes, Do's, Don'ts, Before You Apply and
// Hashtags. Exported so other pages (Settings' Campaign Defaults editor)
// can reuse the same input+chip markup.
export function TagListField({
  label, placeholder, items, onChange, hint,
}: { label: string; placeholder: string; items: string[]; onChange: (items: string[]) => void; hint?: string }) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    onChange(addUnique(items, [value]));
    setDraft('');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!/[,\n]/.test(text)) return;
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
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
        />
        <button type="button" className="cc-taglist-add" onClick={addItem}><Plus size={16} /></button>
      </div>
      {hint && <div className="cc-hint">{hint}</div>}
      {items.length > 0 && (
        <div className="cc-taglist-chips">
          {items.map((item, i) => (
            <span className="cc-chip" key={i}>
              {item}
              <button type="button" className="cc-chip-remove" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Shared "show first N, then reveal the rest" logic for the two pickers
// below. Once a list has more than CHIP_PREVIEW_COUNT options, or any of
// them are already selected past the fold, a single "+N more" chip expands
// the row in place instead of everything wrapping into a dense grid.
function useExpandableOptions(options: string[], selected: string[]) {
  const [expanded, setExpanded] = useState(false);
  const hiddenSelectedCount = options
    .slice(CHIP_PREVIEW_COUNT)
    .filter((opt) => selected.includes(opt)).length;
  const shouldOfferToggle = options.length > CHIP_PREVIEW_COUNT;
  const visible = expanded || !shouldOfferToggle ? options : options.slice(0, CHIP_PREVIEW_COUNT);
  const hiddenCount = options.length - CHIP_PREVIEW_COUNT;
  return { visible, expanded, setExpanded, shouldOfferToggle, hiddenCount, hiddenSelectedCount };
}

function PickChips({
  label, hint, options, value, onChange, required,
}: { label: string; hint?: string; options: string[]; value: string; onChange: (value: string) => void; required?: boolean }) {
  const { visible, expanded, setExpanded, shouldOfferToggle, hiddenCount, hiddenSelectedCount } =
    useExpandableOptions(options, value ? [value] : []);
  return (
    <div className="cc-field">
      <label className="cc-label">{label}{required && ' *'}</label>
      <div className="cc-pick-chips">
        {visible.map((opt) => (
          <button type="button" key={opt} className={`cc-pick-chip ${value === opt ? 'cc-pick-chip--active' : ''}`} onClick={() => onChange(value === opt ? '' : opt)}>
            {opt}
          </button>
        ))}
        {shouldOfferToggle && (
          <button type="button" className="cc-pick-chip cc-pick-chip--more" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `+${hiddenCount} more${hiddenSelectedCount ? ` (${hiddenSelectedCount} selected)` : ''}`}
          </button>
        )}
      </div>
      {hint && <div className="cc-hint">{hint}</div>}
    </div>
  );
}

function MultiPickChips({
  label, hint, options, values, onChange, required,
}: { label: string; hint?: string; options: string[]; values: string[]; onChange: (values: string[]) => void; required?: boolean }) {
  const { visible, expanded, setExpanded, shouldOfferToggle, hiddenCount, hiddenSelectedCount } =
    useExpandableOptions(options, values);
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  return (
    <div className="cc-field">
      <label className="cc-label">{label}{required && ' *'}</label>
      <div className="cc-pick-chips">
        {visible.map((opt) => (
          <button type="button" key={opt} className={`cc-pick-chip ${values.includes(opt) ? 'cc-pick-chip--active' : ''}`} onClick={() => toggle(opt)}>
            {opt}
          </button>
        ))}
        {shouldOfferToggle && (
          <button type="button" className="cc-pick-chip cc-pick-chip--more" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `+${hiddenCount} more${hiddenSelectedCount ? ` (${hiddenSelectedCount} selected)` : ''}`}
          </button>
        )}
      </div>
      {hint && <div className="cc-hint">{hint}</div>}
    </div>
  );
}

// Simple collapsible section for the stuff most campaigns don't need on day
// one (checklist grid, shot list, pre-apply confirmations). Closed by
// default so step 2 doesn't read as a wall of fields.
function AdvancedSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cc-advanced">
      <button type="button" className="cc-advanced-toggle" onClick={() => setOpen((v) => !v)}>
        <span>
          {title} <span className="cc-optional-label">Optional</span>
        </span>
        <ChevronDown size={16} className={`cc-advanced-chevron ${open ? 'cc-advanced-chevron--open' : ''}`} />
      </button>
      {!open && <div className="cc-hint" style={{ padding: '0 16px 14px' }}>{hint}</div>}
      {open && <div className="cc-advanced-body">{children}</div>}
    </div>
  );
}

const CREATOR_REQUIREMENT_CATEGORIES = [
  'Beauty', 'Lifestyle', 'Fashion', 'Food', 'Tech', 'Fitness', 'Travel',
  'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor',
  'Parenting', 'Entertainment', 'UGC', 'Photographer', 'Video Creator',
];
const CREATOR_SIZES = ['Nano', 'Micro', 'Mid-tier', 'Macro'];
const CREATOR_LOCATIONS = ['Nepal', 'Kathmandu Valley', 'Kathmandu', 'Pokhara', 'Any location'];
const CREATOR_LANGUAGES = ['Nepali', 'English', 'Hindi', 'Newari', 'Maithili'];
const FOLLOWER_RANGES = ['1K–10K', '10K–50K', '50K–100K', '100K+'];
const GENDERS = ['Any', 'Female', 'Male'];
const AGE_RANGES = ['Any', '18–24', '25–34', '35–44', '45+'];

const SUGGESTED_APPLICATION_QUESTIONS = [
  'Why are you a good fit for this campaign?',
  'Have you created similar content before? Share an example.',
  'What is your content style or approach for this campaign?',
  'How would you showcase this product to your audience?',
  'Can you complete all deliverables by the campaign deadline?',
];

// 5 steps instead of 6 — Creative Brief and Caption & Tags are one step now,
// and Video Specs is clearly marked optional so it doesn't feel mandatory.
const STEP_LABELS = ['Basics', 'Creator Requirements', 'Creative & Caption', 'Video Specs', 'Review & Publish'];

const STEP_TITLES = [
  "What's this campaign about?",
  'Who are you looking for?',
  'How should creators approach this?',
  'Any platform-specific video rules?',
  'Ready to publish your campaign?',
];

const STEP_SUBTITLES = [
  'The essentials creators see first — title, category, offer, compensation and deadline.',
  'Define the creator profile and what they need to deliver.',
  "Application questions, do's and don'ts, a suggested caption and hashtags.",
  'Optional — only add these if specific platforms need exact specs.',
  'Review the campaign as a creator will see it, then save or publish.',
];

// Short, plain-language tips shown in the sidebar. Deliberately no icons —
// just a title and a lead word in bold, matched to whichever step is active.
const STEP_TIPS: string[][] = [
  [
    "Use a clear, specific title so creators instantly understand what you're looking for.",
    'Highlight key details — mention your product, audience, goals and deliverables.',
    'Add high-quality product photos. Better images mean more applications and better matches.',
    'Set a realistic budget or gift value to attract the right creators.',
  ],
  [
    "Leave a filter blank if it doesn't matter — it's treated as \"Any\" and won't hurt a creator's match score.",
    'Picking a broad creator size and location usually gets you more applicants, faster.',
    'List every deliverable you expect up front so there is no back-and-forth later.',
  ],
  [
    "Keep do's and don'ts short and concrete — creators skim these in seconds.",
    'A suggested caption saves creators time and keeps messaging on-brand.',
    'Pick a few hashtags people actually search, not just brand slogans.',
  ],
  [
    'Most campaigns never need this step — skip it unless a platform requires an exact spec.',
    'Extra requirements can mean fewer applicants, so only add what truly matters.',
  ],
  [
    'Double-check the application deadline, budget and deliverables before publishing.',
    "You can always edit a campaign after it's live.",
    "Not ready yet? Save as a draft and come back anytime.",
  ],
];

const TIPS_TITLE = 'Campaign Tips';

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
  const [deliverableDeadline, setDeliverableDeadline] = useState('');
  const [creatorsNeeded, setCreatorsNeeded] = useState('1');

  const [requirements, setRequirements] = useState('');
  const [creatorRequirements, setCreatorRequirements] = useState<CreatorRequirements>({ categories: [] });
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
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
  const [applicationQuestions, setApplicationQuestions] = useState<string[]>([]);
  const [questionDraft, setQuestionDraft] = useState('');

  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState('');

  const [step, setStep] = useState(1);

  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [defaultDos, setDefaultDos] = useState<string[]>([]);
  const [defaultDonts, setDefaultDonts] = useState<string[]>([]);
  const [defaultDuration, setDefaultDuration] = useState('');
  const [defaultAspectRatio, setDefaultAspectRatio] = useState('');
  const [defaultVoiceover, setDefaultVoiceover] = useState(false);
  const [defaultSubtitles, setDefaultSubtitles] = useState(false);
  const [defaultCreatorRequirements, setDefaultCreatorRequirements] = useState<CreatorRequirements>({ categories: [] });
  const [defaultApplicationQuestions, setDefaultApplicationQuestions] = useState<string[]>([]);
  const [defaultsSaving, setDefaultsSaving] = useState(false);
  const [defaultsMsg, setDefaultsMsg] = useState('');

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

        if (user && c.business_id !== user.id) { setAccessDenied(true); return; }
        if (c.status === 'completed') {
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
        setDeadline(c.application_deadline ? c.application_deadline.slice(0, 10) : (c.deadline ? c.deadline.slice(0, 10) : ''));
        setDeliverableDeadline(c.deliverable_deadline ? c.deliverable_deadline.slice(0, 10) : '');
        setCreatorsNeeded(String(c.creators_needed || 1));
        setApplicationQuestions(c.application_questions || []);
        setRequirements(c.requirements || '');
        const loadedRequirements: CreatorRequirements = c.creator_requirements || { categories: [] };
        setCreatorRequirements(loadedRequirements);
        const loadedContentTypes = loadedRequirements.content_types?.length
          ? loadedRequirements.content_types
          : (c.sub_category ? c.sub_category.split(',').map((v: string) => v.trim()).filter(Boolean) : []);
        setSelectedContentTypes(loadedContentTypes);
        setSubCategory(loadedContentTypes.join(', '));
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

    return () => { cancelled = true; };
  }, [mode, id, user]);

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

        const candidates: string[] = [...(profile.interested_categories || []), ...(profile.industry ? [profile.industry] : [])];
        const matched = candidates.map((c) => CATEGORIES.find((opt) => opt.toLowerCase() === String(c).toLowerCase())).find(Boolean);
        if (matched) setCategory((prev) => prev || matched);

        if (profile.default_dos?.length) {
          setDos((prev) => (prev.length > 0 ? prev : profile.default_dos));
          setDefaultDos(profile.default_dos);
        }
        if (profile.default_donts?.length) {
          setDonts((prev) => (prev.length > 0 ? prev : profile.default_donts));
          setDefaultDonts(profile.default_donts);
        }
        if (profile.default_creator_requirements) {
          const savedReq = profile.default_creator_requirements as CreatorRequirements;
          setDefaultCreatorRequirements(savedReq);
          setCreatorRequirements((prev) => ({
            ...savedReq,
            ...prev,
            categories: prev.categories?.length ? prev.categories : (savedReq.categories || []),
            content_types: prev.content_types?.length ? prev.content_types : (savedReq.content_types || []),
            creator_sizes: prev.creator_sizes?.length ? prev.creator_sizes : (savedReq.creator_sizes || []),
            locations: prev.locations?.length ? prev.locations : (savedReq.locations || []),
            languages: prev.languages?.length ? prev.languages : (savedReq.languages || []),
            follower_ranges: prev.follower_ranges?.length ? prev.follower_ranges : (savedReq.follower_ranges || []),
            age_ranges: prev.age_ranges?.length ? prev.age_ranges : (savedReq.age_ranges || []),
            gender: prev.gender || savedReq.gender,
          }));
          const savedContent = savedReq.content_types || [];
          if (savedContent.length) setSelectedContentTypes((prev) => prev.length ? prev : savedContent);
        }
        if (profile.default_application_questions?.length) {
          setDefaultApplicationQuestions(profile.default_application_questions);
          setApplicationQuestions((prev) => prev.length ? prev : profile.default_application_questions);
        }
        const spec = profile.default_video_spec;
        if (spec && (spec.duration || spec.aspect_ratio || spec.voiceover_required || spec.subtitles_required)) {
          setVideoSpecs((prev) => prev.length > 0 ? prev : [{ platform: spec.platform || 'General', ...spec }]);
          setDefaultDuration(spec.duration || '');
          setDefaultAspectRatio(spec.aspect_ratio || '');
          setDefaultVoiceover(!!spec.voiceover_required);
          setDefaultSubtitles(!!spec.subtitles_required);
        }
      } catch (err) {
        console.warn('Could not load business profile for autofill:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'create') return;
    let cancelled = false;
    getCampaignDefaults()
      .then((defaults) => {
        if (cancelled || !defaults) return;
        setDefaultDos(defaults.default_dos || []);
        setDefaultDonts(defaults.default_donts || []);
        setDefaultCreatorRequirements(defaults.default_creator_requirements || { categories: [] });
        setDefaultApplicationQuestions(defaults.default_application_questions || []);
        const spec = defaults.default_video_spec;
        setDefaultDuration(spec?.duration || '');
        setDefaultAspectRatio(spec?.aspect_ratio || '');
        setDefaultVoiceover(!!spec?.voiceover_required);
        setDefaultSubtitles(!!spec?.subtitles_required);
      })
      .catch((err) => console.warn('Could not load saved campaign defaults:', err));
    return () => { cancelled = true; };
  }, [mode]);

  const saveDefaults = async () => {
    setDefaultsSaving(true);
    setDefaultsMsg('');
    try {
      const saved = await saveCampaignDefaults({
        default_dos: defaultDos,
        default_donts: defaultDonts,
        default_creator_requirements: defaultCreatorRequirements,
        default_application_questions: defaultApplicationQuestions,
        default_video_spec: (defaultDuration || defaultAspectRatio || defaultVoiceover || defaultSubtitles)
          ? { platform: 'General', duration: defaultDuration || undefined, aspect_ratio: defaultAspectRatio || undefined, voiceover_required: defaultVoiceover, subtitles_required: defaultSubtitles }
          : null,
      });
      setDefaultDos(saved.default_dos || []);
      setDefaultDonts(saved.default_donts || []);
      setDefaultCreatorRequirements(saved.default_creator_requirements || { categories: [] });
      const spec = saved.default_video_spec || null;
      setDefaultDuration(spec?.duration || '');
      setDefaultAspectRatio(spec?.aspect_ratio || '');
      setDefaultVoiceover(!!spec?.voiceover_required);
      setDefaultSubtitles(!!spec?.subtitles_required);
      setDefaultsMsg('Saved ✓');
    } catch (err) {
      console.error('Could not save campaign defaults:', err);
      setDefaultsMsg('Could not save. Please try again.');
    } finally {
      setDefaultsSaving(false);
    }
  };

  const addVideoSpec = () => {
    setVideoSpecs([...videoSpecs, { platform: '', duration: '', aspect_ratio: '', voiceover_required: false, subtitles_required: false }]);
  };
  const updateVideoSpec = (index: number, patch: Partial<VideoSpec>) => {
    setVideoSpecs(videoSpecs.map((spec, i) => (i === index ? { ...spec, ...patch } : spec)));
  };
  const removeVideoSpec = (index: number) => setVideoSpecs(videoSpecs.filter((_, i) => i !== index));

  const validate = (): string | null => {
    if (title.trim().length < 3) return 'Title needs to be at least 3 characters.';
    if (!category) return 'Pick a campaign category.';
    if (!creatorRequirements.categories?.length) return 'Choose at least one creator category/type.';
    if (description.trim().length < 10) return 'Description needs to be at least 10 characters.';
    if (!deadline) return 'Add an application deadline.';
    if (deliverables.length < 1) return 'Add at least one deliverable.';
    if (campaignType === 'paid' && !budget) return 'Add a budget for a paid campaign.';
    if (campaignType === 'paid' && budget && Number(budget) <= 0) return 'Budget must be greater than 0, or left blank.';
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    if (deadline && deadline < tomorrowKey) return 'Application deadline must be tomorrow or later.';
    if (deliverableDeadline && deliverableDeadline < tomorrowKey) return 'Deliverable deadline must be tomorrow or later.';
    if (deadline && deliverableDeadline && deliverableDeadline <= deadline) return 'Deliverable deadline must be after the application deadline.';
    if (Number(creatorsNeeded) < 1) return 'Choose at least 1 creator.';
    return null;
  };

  const canContinueStep1 =
    title.trim().length >= 3 && !!category && description.trim().length >= 10 && !!deadline && deliverables.length > 0 && !!creatorRequirements.categories?.length;

  const handleSubmit = async (action: 'draft' | 'publish') => {
    const validationError = validate();
    if (validationError) {
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
        application_deadline: deadline ? new Date(deadline).toISOString() : undefined,
        deliverable_deadline: deliverableDeadline ? new Date(deliverableDeadline).toISOString() : undefined,
        creators_needed: Number(creatorsNeeded) || 1,
        application_questions: applicationQuestions.filter((q) => q.trim()),
        requirements: requirements.trim() || undefined,
        creator_requirements: {
          ...creatorRequirements,
          categories: creatorRequirements.categories?.length ? creatorRequirements.categories : undefined,
          content_types: creatorRequirements.content_types?.length ? creatorRequirements.content_types : undefined,
          creator_sizes: creatorRequirements.creator_sizes?.length ? creatorRequirements.creator_sizes : undefined,
          locations: creatorRequirements.locations?.length ? creatorRequirements.locations : undefined,
          languages: creatorRequirements.languages?.length ? creatorRequirements.languages : undefined,
          follower_ranges: creatorRequirements.follower_ranges?.length ? creatorRequirements.follower_ranges : undefined,
          age_ranges: creatorRequirements.age_ranges?.length ? creatorRequirements.age_ranges : undefined,
        },
        deliverables: deliverables.length > 0 ? deliverables : undefined,
        before_you_apply: beforeYouApply.length > 0 ? beforeYouApply : undefined,
        checklist: checklist.length > 0 ? checklist : undefined,
        required_scenes: requiredScenes.length > 0 ? requiredScenes : undefined,
        video_specs: videoSpecs.length > 0 ? videoSpecs.filter((s) => s.platform.trim()) : undefined,
        dos: dos.length > 0 ? dos : undefined,
        donts: donts.length > 0 ? donts : undefined,
        suggested_caption: suggestedCaption.trim() || undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        guidelines_note: guidelinesNote.trim() || undefined,
        hero_image: heroImage || null,
        extra_photos: extraPhotos.length > 0 ? extraPhotos : null,
      };

      let campaignId: number;
      if (mode === 'edit' && id) {
        const updated = await updateCampaign(id, payload);
        campaignId = updated.id;
        if (action === 'publish' && originalStatus === 'draft') await publishCampaign(campaignId);
      } else {
        const created = await createCampaign(payload);
        campaignId = created.id;
        if (action === 'publish') await publishCampaign(campaignId);
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
  const activeTips = STEP_TIPS[step - 1] || [];

  return (
    <AppLayout
      title={mode === 'edit' ? 'Edit Campaign' : 'Create a Campaign'}
      subtitle={STEP_SUBTITLES[step - 1]}
      showSearch={false}
    >
      <div className="cc-page">
        <style>{`
  .cc-page {
    --accent: ${NAVY};
    --coral: ${CORAL};
    --ink: #1A1625;
    --ink-soft: #6c6d73;
    --line: #e6e6ea;
    --surface: #f7f7f9;
    --accent-soft: #EAEBF5;
    --good: #16a34a;
    padding: 4px 24px 60px;
  }
  .cc-page * { box-sizing: border-box; }
  .cc-page button { font-family: inherit; cursor: pointer; }
  .cc-page a { text-decoration: none; color: inherit; }

  .cc-shell { max-width: 1060px; margin: 0 auto; }

  .cc-back-link {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
    color: var(--ink-soft); background: none; border: none; padding: 6px 4px; margin-bottom: 14px;
  }
  .cc-back-link:hover { color: var(--ink); }

  .cc-hero {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    background: linear-gradient(135deg, #EDEEF9 0%, #F8F2FA 100%);
    border: 1px solid #E4E3F2; border-radius: 16px; padding: 14px 16px 14px 26px; margin-bottom: 20px;
  }
  .cc-hero-copy { max-width: 440px; }
  .cc-hero-kicker { font-size: 10px; letter-spacing: .09em; text-transform: uppercase; font-weight: 700; color: #8B8697; }
  .cc-hero-heading { margin: 5px 0 0; font-size: 21px; line-height: 1.18; letter-spacing: -.4px; font-weight: 750; color: var(--ink); }
  .cc-hero-heading-accent { color: var(--accent); }
  .cc-hero-copy p { margin: 7px 0 0; font-size: 12.5px; color: var(--ink-soft); line-height: 1.6; }
  .cc-hero-art { width: 300px; height: 210px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .cc-hero-art img { width: 100%; height: 100%; object-fit: contain; display: block; }
  @media (max-width: 720px) { .cc-hero { flex-direction: column-reverse; text-align: center; padding: 16px; } .cc-hero-copy { max-width: none; } }

  .cc-steps { display: flex; align-items: center; margin-bottom: 26px; }
  .cc-step { display: flex; align-items: center; flex: 1; }
  .cc-step:last-child { flex: 0; }
  .cc-step-dot { width: 26px; height: 26px; border-radius: 50%; border: none; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .cc-step-upcoming { background: var(--surface); color: var(--ink-soft); border: 1.5px solid var(--line); }
  .cc-step-active { background: var(--accent); color: #fff; }
  .cc-step-done { background: var(--coral); color: #fff; }
  .cc-step-label { font-size: 11.5px; font-weight: 600; margin-left: 8px; white-space: nowrap; color: var(--ink-soft); background: none; border: none; padding: 0; }
  .cc-step-label-active, .cc-step-label-done { color: var(--ink); }
  .cc-step-line { flex: 1; height: 1.5px; background: var(--line); margin: 0 10px; }
  .cc-step-line-done { background: var(--coral); }
  @media (max-width: 640px) { .cc-step-label { display: none; } }

  .cc-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 24px; align-items: start; }
  .cc-main-col { min-width: 0; }
  .cc-tips-col { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 20px; }
  @media (max-width: 900px) { .cc-layout { grid-template-columns: 1fr; } .cc-tips-col { position: static; } }

  .cc-tips-panel { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px; }
  .cc-tips-title { font-size: 13.5px; font-weight: 700; color: var(--accent); margin-bottom: 14px; }
  .cc-tips-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 13px; }
  .cc-tips-list li { font-size: 12.5px; line-height: 1.55; color: var(--ink); padding-left: 13px; position: relative; }
  .cc-tips-list li::before { content: ''; position: absolute; left: 0; top: 6px; width: 6px; height: 6px; border-radius: 2px; background: var(--coral); }

  .cc-card { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 32px 36px 36px; }
  @media (max-width: 560px) { .cc-card { padding: 22px 18px 26px; } }

  .cc-h2 { font-size: 21px; font-weight: 700; margin: 0 0 5px; }
  .cc-sub { font-size: 13px; color: var(--ink-soft); margin: 0 0 24px; line-height: 1.5; }

  .cc-field { margin-bottom: 18px; }
  .cc-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
  .cc-optional-label { font-weight: 500; color: var(--ink-soft); font-size: 11.5px; }
  .cc-input, .cc-textarea, .cc-select { width: 100%; border: 1.5px solid var(--line); border-radius: 9px; padding: 11px 13px; font-size: 13.5px; font-family: inherit; color: var(--ink); background: #fff; }
  .cc-input:focus, .cc-textarea:focus, .cc-select:focus { outline: none; border-color: var(--accent); }
  .cc-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }
  .cc-hint { font-size: 11.5px; color: var(--ink-soft); margin-top: 6px; display: flex; align-items: flex-start; gap: 5px; line-height: 1.5; }

  .cc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 540px) { .cc-row { grid-template-columns: 1fr; } }

  .cc-pick-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .cc-pick-chip { font-size: 12.5px; font-weight: 500; color: var(--ink); background: var(--surface); border: 1.5px solid var(--line); padding: 7px 13px; border-radius: 100px; }
  .cc-pick-chip--active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .cc-pick-chip--more { background: #fff; color: var(--accent); border: 1.5px dashed var(--accent); font-weight: 700; }

  .cc-taglist-input-row { display: flex; gap: 8px; }
  .cc-taglist-input-row .cc-input { flex: 1; }
  .cc-taglist-add { flex-shrink: 0; width: 42px; border-radius: 9px; border: 1.5px solid var(--line); background: #fff; color: var(--accent); display: flex; align-items: center; justify-content: center; }
  .cc-taglist-add:hover { background: var(--accent-soft); border-color: var(--accent); }
  .cc-taglist-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .cc-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; background: var(--accent-soft); color: var(--accent); border-radius: 999px; padding: 6px 8px 6px 12px; }
  .cc-chip-remove { display: flex; align-items: center; justify-content: center; background: none; border: none; color: var(--accent); padding: 2px; opacity: 0.7; }
  .cc-chip-remove:hover { opacity: 1; }

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
  .cc-hero-btn { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--accent); background: var(--accent-soft); border: 1px solid #D6DCF5; border-radius: 8px; padding: 9px 14px; }
  @media (max-width: 560px) { .cc-product-gallery-main { grid-template-columns: 1fr; } .cc-product-main { height: 165px; } .cc-product-thumbs { grid-template-columns: repeat(4, 1fr); } }

  .cc-error { font-size: 13px; color: #d64545; background: #fdecec; border-radius: 10px; padding: 11px 14px; margin-bottom: 18px; }

  .cc-spec-card { border: 1.5px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 14px; position: relative; }
  .cc-spec-card-remove { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--ink-soft); }
  .cc-spec-card-remove:hover { color: #d64545; }
  .cc-spec-checks { display: flex; gap: 18px; margin-top: 4px; flex-wrap: wrap; }
  .cc-spec-check { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink); }
  .cc-add-spec-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--accent); background: var(--accent-soft); border: 1px dashed var(--accent); border-radius: 10px; padding: 10px 16px; cursor: pointer; width: 100%; justify-content: center; }
  .cc-video-empty { border: 1.5px dashed var(--line); border-radius: 12px; padding: 22px; text-align: center; color: var(--ink-soft); font-size: 13px; margin-bottom: 14px; }

  .cc-defaults-box { border: 1.5px solid var(--line); border-radius: 12px; margin-bottom: 18px; overflow: hidden; background: var(--surface); }
  .cc-defaults-toggle { width: 100%; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--accent); background: none; border: none; padding: 13px 16px; text-align: left; }
  .cc-defaults-panel { padding: 4px 16px 18px; border-top: 1px solid var(--line); }
  .cc-defaults-save { font-size: 13px; font-weight: 600; color: #fff; background: var(--accent); border: none; border-radius: 8px; padding: 9px 16px; }
  .cc-defaults-save:disabled { opacity: 0.6; cursor: not-allowed; }

  .cc-advanced { border: 1.5px solid var(--line); border-radius: 12px; margin: 20px 0; overflow: hidden; }
  .cc-advanced-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface); border: none; padding: 13px 16px; font-size: 13px; font-weight: 700; color: var(--ink); text-align: left; }
  .cc-advanced-chevron { transition: transform .15s ease; color: var(--ink-soft); }
  .cc-advanced-chevron--open { transform: rotate(180deg); }
  .cc-advanced-body { padding: 16px 16px 4px; }

  .cc-suggest-box { border: 1px dashed #D6DCF5; background: #f8f7fd; border-radius: 12px; padding: 14px 16px; margin: -4px 0 18px; }
  .cc-suggest-title { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--accent); margin-bottom: 10px; }
  .cc-suggest-group { margin-bottom: 8px; }
  .cc-suggest-group:last-child { margin-bottom: 0; }
  .cc-suggest-group-label { font-size: 11px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.02em; }
  .cc-suggest-list { display: flex; flex-wrap: wrap; gap: 6px; }
  .cc-suggest-chip, .cc-preset-chip { font-size: 12px; font-weight: 500; border: 1px solid #D6DCF5; background: #fff; color: var(--accent); border-radius: 999px; padding: 5px 11px; }
  .cc-suggest-chip:hover, .cc-preset-chip:hover { background: var(--accent-soft); }
  .cc-suggest-chip:disabled, .cc-preset-chip:disabled { opacity: 0.55; cursor: default; background: var(--accent-soft); }
  .cc-preset-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }

  .cc-requirement-block { border: 1.5px solid #DDE2F6; border-radius: 12px; padding: 15px 16px; background: #fafaff; margin: 18px 0; }
  .cc-requirement-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 2px; font-size: 13px; font-weight: 700; color: var(--ink); }
  .cc-required-star { color: #d64545; }
  .cc-required-label { font-size: 10.5px; font-weight: 700; color: #d64545; background: #fdecec; border-radius: 999px; padding: 4px 8px; }

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

  .cc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line); flex-wrap: wrap; gap: 12px; }
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
          <button type="button" className="cc-back-link" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>

          {mode === 'edit' && loadingExisting && <div className="cc-card cc-loading-card">Loading campaign…</div>}
          {mode === 'edit' && !loadingExisting && notFound && <div className="cc-card cc-loading-card">This campaign couldn't be found.</div>}
          {mode === 'edit' && !loadingExisting && accessDenied && <div className="cc-card cc-loading-card">You don't have access to edit this campaign.</div>}

          {(mode === 'create' || (!loadingExisting && !notFound && !accessDenied)) && (
            <>
              {step === 1 && (
                <div className="cc-hero">
                  <div className="cc-hero-copy">
                    <div className="cc-hero-kicker">{mode === 'edit' ? 'Editing your campaign' : "Let's get started"}</div>
                    <h2 className="cc-hero-heading">Great campaigns start with <span className="cc-hero-heading-accent">a clear brief.</span></h2>
                    <p>Add your product, set your ask, and we'll help you reach the right creators.</p>
                  </div>
                  <div className="cc-hero-art"><img src="/assets/hero-illustration.png" alt="" /></div>
                </div>
              )}

              <div className="cc-steps">
                {STEP_LABELS.map((label, index) => {
                  const number = index + 1;
                  const state = number < step ? 'done' : number === step ? 'active' : 'upcoming';
                  return (
                    <div className="cc-step" key={label}>
                      <button type="button" className={`cc-step-dot cc-step-${state}`} onClick={() => { setError(''); setStep(number); }} aria-label={label}>
                        {state === 'done' ? <CheckCircle2 size={14} /> : number}
                      </button>
                      <button type="button" className={`cc-step-label cc-step-label-${state}`} onClick={() => { setError(''); setStep(number); }}>
                        {label}
                      </button>
                      {number < STEP_LABELS.length && <span className={`cc-step-line ${number < step ? 'cc-step-line-done' : ''}`} />}
                    </div>
                  );
                })}
              </div>

              <div className="cc-layout">
                <div className="cc-main-col">
                  {mode === 'create' && step === 1 && (
                    <div className="cc-defaults-box">
                      <button type="button" className="cc-defaults-toggle" onClick={() => setDefaultsOpen((v) => !v)}>
                        <Settings size={14} /> Manage my campaign defaults
                      </button>
                      {defaultsOpen && (
                        <div className="cc-defaults-panel">
                          <div className="cc-hint" style={{ marginBottom: 12 }}>
                            <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                            These prefill new campaigns automatically. Editing them here won't change campaigns you've already created.
                            You can also manage these anytime from{' '}
                            <Link to="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>Settings → Campaign Defaults</Link>.
                          </div>
                          <MultiPickChips
                            label="Default creator types"
                            options={CREATOR_REQUIREMENT_CATEGORIES}
                            values={defaultCreatorRequirements.categories || []}
                            onChange={(values) => setDefaultCreatorRequirements((p) => ({ ...p, categories: values }))}
                            hint="These are copied into new campaigns automatically."
                          />
                          <MultiPickChips label="Default content types" options={CONTENT_TYPES} values={defaultCreatorRequirements.content_types || []} onChange={(values) => setDefaultCreatorRequirements((p) => ({ ...p, content_types: values }))} />
                          <MultiPickChips label="Default creator size" options={CREATOR_SIZES} values={defaultCreatorRequirements.creator_sizes || []} onChange={(values) => setDefaultCreatorRequirements((p) => ({ ...p, creator_sizes: values }))} />
                          <MultiPickChips label="Default location" options={CREATOR_LOCATIONS} values={defaultCreatorRequirements.locations || []} onChange={(values) => setDefaultCreatorRequirements((p) => ({ ...p, locations: values }))} />
                          <MultiPickChips label="Default languages" options={CREATOR_LANGUAGES} values={defaultCreatorRequirements.languages || []} onChange={(values) => setDefaultCreatorRequirements((p) => ({ ...p, languages: values }))} />
                          <MultiPickChips label="Default follower range" options={FOLLOWER_RANGES} values={defaultCreatorRequirements.follower_ranges || []} onChange={(values) => setDefaultCreatorRequirements((p) => ({ ...p, follower_ranges: values }))} />
                          <div className="cc-row">
                            <PickChips label="Default gender" options={GENDERS} value={defaultCreatorRequirements.gender || ''} onChange={(value) => setDefaultCreatorRequirements((p) => ({ ...p, gender: value || undefined }))} />
                            <MultiPickChips label="Default age" options={AGE_RANGES} values={defaultCreatorRequirements.age_ranges || []} onChange={(values) => setDefaultCreatorRequirements((p) => ({ ...p, age_ranges: values }))} />
                          </div>
                          <div className="cc-field">
                            <label className="cc-label">Default creator application questions</label>
                            <div className="cc-hint">Choose the questions you commonly ask. They will prefill new campaigns.</div>
                            <div className="cc-preset-row">
                              {SUGGESTED_APPLICATION_QUESTIONS.map((question) => (
                                <button key={question} type="button" className="cc-preset-chip" onClick={() => setDefaultApplicationQuestions((items) => addUnique(items, [question]))}>+ {question}</button>
                              ))}
                            </div>
                            {defaultApplicationQuestions.map((question, index) => (
                              <div key={`${question}-${index}`} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <input className="cc-input" value={question} onChange={(e) => setDefaultApplicationQuestions((items) => items.map((item, i) => i === index ? e.target.value : item))} />
                                <button type="button" className="cc-hero-btn" onClick={() => setDefaultApplicationQuestions((items) => items.filter((_, i) => i !== index))}>Remove</button>
                              </div>
                            ))}
                          </div>
                          <TagListField label="Default Do's" placeholder="e.g. Use good lighting" items={defaultDos} onChange={setDefaultDos} />
                          <TagListField label="Default Don'ts" placeholder="e.g. Do not use competitor products" items={defaultDonts} onChange={setDefaultDonts} />
                          <div className="cc-row">
                            <div className="cc-field">
                              <label className="cc-label">Default video length</label>
                              <input className="cc-input" value={defaultDuration} onChange={(e) => setDefaultDuration(e.target.value)} placeholder="e.g. Minimum 15 seconds" />
                            </div>
                            <div className="cc-field">
                              <label className="cc-label">Default aspect ratio</label>
                              <input className="cc-input" value={defaultAspectRatio} onChange={(e) => setDefaultAspectRatio(e.target.value)} placeholder="e.g. 9:16" />
                            </div>
                          </div>
                          <div className="cc-spec-checks" style={{ marginBottom: 16 }}>
                            <label className="cc-spec-check"><input type="checkbox" checked={defaultVoiceover} onChange={(e) => setDefaultVoiceover(e.target.checked)} /> Voiceover required</label>
                            <label className="cc-spec-check"><input type="checkbox" checked={defaultSubtitles} onChange={(e) => setDefaultSubtitles(e.target.checked)} /> Subtitles required</label>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button type="button" className="cc-defaults-save" disabled={defaultsSaving} onClick={saveDefaults}>{defaultsSaving ? 'Saving…' : 'Save Defaults'}</button>
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
                          <label className="cc-label">Products to Promote <span className="cc-optional-label">Optional</span></label>
                          <div className="cc-product-gallery">
                            <div className="cc-product-gallery-main">
                              <div className="cc-product-main">
                                {heroImage ? (
                                  <>
                                    <span className="cc-product-badge">Main product</span>
                                    <img src={heroImage} alt="Main product" />
                                    <button type="button" className="cc-product-remove" onClick={() => setHeroImage('')} aria-label="Remove main product"><X size={14} /></button>
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
                                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={uploadingPhotos} onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (!files.length) return;
                                    setUploadingPhotos(true); setHeroError('');
                                    try {
                                      const uploaded = await Promise.all(files.map((file) => uploadImage(file).then((r) => r.url)));
                                      setExtraPhotos((prev) => [...prev, ...uploaded]);
                                    } catch (err: any) {
                                      console.error('Product photo upload failed:', err);
                                      setHeroError(err?.response?.data?.detail || 'Could not upload product photos. Please try again.');
                                    } finally { setUploadingPhotos(false); e.target.value = ''; }
                                  }} />
                                </label>
                              </div>
                            </div>
                            <div className="cc-product-actions">
                              <label className="cc-hero-btn" style={uploadingHero ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                                <Camera size={14} />
                                {uploadingHero ? 'Uploading…' : heroImage ? 'Replace main image' : 'Upload main product'}
                                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingHero} onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setUploadingHero(true); setHeroError('');
                                  try { const { url } = await uploadImage(file); setHeroImage(url); }
                                  catch (err: any) { setHeroError(err?.response?.data?.detail || 'Could not upload image. Please try again.'); }
                                  finally { setUploadingHero(false); e.target.value = ''; }
                                }} />
                              </label>
                              <label className="cc-hero-btn">
                                <Plus size={14} /> Add product photos
                                <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={uploadingPhotos} onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (!files.length) return;
                                  setUploadingPhotos(true); setHeroError('');
                                  try { const uploaded = await Promise.all(files.map((file) => uploadImage(file).then((r) => r.url))); setExtraPhotos((prev) => [...prev, ...uploaded]); }
                                  catch (err: any) { setHeroError(err?.response?.data?.detail || 'Could not upload product photos. Please try again.'); }
                                  finally { setUploadingPhotos(false); e.target.value = ''; }
                                }} />
                              </label>
                            </div>
                            {heroError && <div className="cc-hint" style={{ color: '#d64545' }}><Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />{heroError}</div>}
                          </div>
                        </div>

                        <div className="cc-field">
                          <label className="cc-label">Campaign Title *</label>
                          <input className="cc-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sweet Moments with CloudBakes" />
                        </div>

                        <PickChips label="Category" required options={CATEGORIES} value={category} onChange={setCategory} />

                        {categorySuggestions && (
                          <div className="cc-suggest-box">
                            <div className="cc-suggest-title"><Info size={13} /> Suggested for {category}</div>
                            <div className="cc-suggest-group">
                              <div className="cc-suggest-group-label">Deliverables</div>
                              <div className="cc-suggest-list">
                                {categorySuggestions.deliverables.map((d) => (
                                  <button type="button" key={d} className="cc-suggest-chip" disabled={deliverables.some((x) => x.toLowerCase() === d.toLowerCase())} onClick={() => setDeliverables(addUnique(deliverables, [d]))}>+ {d}</button>
                                ))}
                              </div>
                            </div>
                            <div className="cc-suggest-group">
                              <div className="cc-suggest-group-label">Hashtags</div>
                              <div className="cc-suggest-list">
                                {categorySuggestions.hashtags.map((h) => (
                                  <button type="button" key={h} className="cc-suggest-chip" disabled={hashtags.some((x) => x.toLowerCase() === h.toLowerCase())} onClick={() => setHashtags(addUnique(hashtags, [h]))}>+ {h}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <PickChips label="Campaign Type" required options={['paid', 'gifted']} value={campaignType} onChange={(v) => setCampaignType((v || 'gifted') as CampaignType)} />

                        <div className="cc-requirement-block">
                          <div className="cc-requirement-heading">
                            <div>Who are you looking for? <span className="cc-required-star">*</span></div>
                            <span className="cc-required-label">Required</span>
                          </div>
                          <div className="cc-hint" style={{ marginBottom: 9 }}>Choose at least one creator category/type. You can select more than one.</div>
                          <MultiPickChips label="Creator category / type" required options={CREATOR_REQUIREMENT_CATEGORIES} values={creatorRequirements.categories || []} onChange={(values) => setCreatorRequirements((p) => ({ ...p, categories: values }))} />
                        </div>

                        <MultiPickChips
                          label="Content Type"
                          hint="Select all content formats you need."
                          options={CONTENT_TYPES}
                          values={selectedContentTypes}
                          onChange={(values) => { setSelectedContentTypes(values); setSubCategory(values.join(', ')); setCreatorRequirements((p) => ({ ...p, content_types: values })); }}
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
                            <label className="cc-label">Creators Needed</label>
                            <input className="cc-input" type="number" min="1" max="100" value={creatorsNeeded} onChange={(e) => setCreatorsNeeded(e.target.value)} />
                          </div>
                        </div>

                        <div className="cc-row">
                          <div className="cc-field">
                            <label className="cc-label">Application Deadline</label>
                            <input className="cc-input" type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                          </div>
                          <div className="cc-field">
                            <label className="cc-label">Deliverable Deadline <span className="cc-optional-label">Optional</span></label>
                            <input className="cc-input" type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={deliverableDeadline} onChange={(e) => setDeliverableDeadline(e.target.value)} />
                          </div>
                        </div>

                        <div className="cc-field">
                          <label className="cc-label">Tagline <span className="cc-optional-label">Optional</span></label>
                          <input className="cc-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short one-liner shown under the title" />
                        </div>

                        <div className="cc-field" style={{ marginBottom: 4 }}>
                          <label className="cc-label">About This Campaign *</label>
                          <textarea className="cc-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell creators what to make, why it matters, and what your brand is all about..." />
                          <div className="cc-hint">Minimum 10 characters.</div>
                        </div>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <MultiPickChips label="Preferred creator size" options={CREATOR_SIZES} values={creatorRequirements.creator_sizes || []} onChange={(v) => setCreatorRequirements((p) => ({ ...p, creator_sizes: v }))} />
                        <MultiPickChips label="Location" options={CREATOR_LOCATIONS} values={creatorRequirements.locations || []} onChange={(v) => setCreatorRequirements((p) => ({ ...p, locations: v }))} />
                        <MultiPickChips label="Languages" options={CREATOR_LANGUAGES} values={creatorRequirements.languages || []} onChange={(v) => setCreatorRequirements((p) => ({ ...p, languages: v }))} />
                        <MultiPickChips label="Audience / follower range" options={FOLLOWER_RANGES} values={creatorRequirements.follower_ranges || []} onChange={(v) => setCreatorRequirements((p) => ({ ...p, follower_ranges: v }))} />
                        <div className="cc-row">
                          <PickChips label="Gender" options={GENDERS} value={creatorRequirements.gender || ''} onChange={(v) => setCreatorRequirements((p) => ({ ...p, gender: v || undefined }))} />
                          <MultiPickChips label="Age" options={AGE_RANGES} values={creatorRequirements.age_ranges || []} onChange={(v) => setCreatorRequirements((p) => ({ ...p, age_ranges: v }))} />
                        </div>

                        <TagListField label="Deliverables" placeholder="e.g. 1 Instagram Reel" items={deliverables} onChange={setDeliverables} hint="At least one deliverable is required." />

                        <AdvancedSection title="More creative details" hint="Checklist, shot list and pre-apply confirmations — add these later if you need them.">
                          <div className="cc-field">
                            <label className="cc-label">Additional creator notes</label>
                            <textarea className="cc-textarea" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Anything else you want creators to know?" />
                          </div>

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
                                  const additions = parts.filter((p) => { const key = p.toLowerCase(); if (existing.has(key)) return false; existing.add(key); return true; }).map((text) => ({ text, checked: true }));
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
                              <button type="button" className="cc-taglist-add" onClick={() => {
                                const value = checklistDraft.trim();
                                if (!value) return;
                                const already = checklist.some((c) => c.text.toLowerCase() === value.toLowerCase());
                                if (!already) setChecklist([...checklist, { text: value, checked: true }]);
                                setChecklistDraft('');
                              }}><Plus size={16} /></button>
                            </div>
                            <div className="cc-preset-row">
                              {PRESET_CHECKLIST_ITEMS.map((preset) => {
                                const already = checklist.some((c) => c.text.toLowerCase() === preset.toLowerCase());
                                return (
                                  <button type="button" key={preset} className="cc-preset-chip" disabled={already} onClick={() => setChecklist([...checklist, { text: preset, checked: true }])}>
                                    {already ? '✓ ' : '+ '}{preset}
                                  </button>
                                );
                              })}
                            </div>
                            {checklist.length > 0 && (
                              <div className="cc-taglist-chips">
                                {checklist.map((item, i) => (
                                  <span className="cc-chip" key={i}>{item.text}<button type="button" className="cc-chip-remove" onClick={() => setChecklist(checklist.filter((_, idx) => idx !== i))}><X size={12} /></button></span>
                                ))}
                              </div>
                            )}
                          </div>

                          <TagListField label="Required Scenes" placeholder="e.g. Show the product clearly at the beginning" items={requiredScenes} onChange={setRequiredScenes} hint="Shown as a numbered shot list, in the order you add them." />
                          <TagListField label="Before You Apply" placeholder="e.g. I can complete the campaign on time" items={beforeYouApply} onChange={setBeforeYouApply} hint="Short first-person confirmations creators tick off before applying." />
                        </AdvancedSection>
                      </>
                    )}

                    {step === 3 && (
                      <>
                        <div className="cc-field">
                          <label className="cc-label">Application Questions <span className="cc-optional-label">Optional</span></label>
                          <div className="cc-hint">Ask only what helps you choose the right people.</div>
                          <div className="cc-preset-row" style={{ marginTop: 10 }}>
                            {SUGGESTED_APPLICATION_QUESTIONS.map((question) => (
                              <button key={question} type="button" className="cc-preset-chip" onClick={() => setApplicationQuestions((items) => addUnique(items, [question]))}>+ {question}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                            {applicationQuestions.map((q, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8 }}>
                                <input className="cc-input" value={q} onChange={(e) => setApplicationQuestions(applicationQuestions.map((x, j) => j === i ? e.target.value : x))} />
                                <button type="button" className="cc-hero-btn" onClick={() => setApplicationQuestions(applicationQuestions.filter((_, j) => j !== i))}>Remove</button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input className="cc-input" value={questionDraft} onChange={(e) => setQuestionDraft(e.target.value)} placeholder="e.g. Why are you a good fit?" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (questionDraft.trim()) { setApplicationQuestions([...applicationQuestions, questionDraft.trim()]); setQuestionDraft(''); } } }} />
                              <button type="button" className="cc-hero-btn" onClick={() => { if (questionDraft.trim()) { setApplicationQuestions([...applicationQuestions, questionDraft.trim()]); setQuestionDraft(''); } }}>+ Add</button>
                            </div>
                          </div>
                        </div>

                        <TagListField label="Do" placeholder="e.g. Use natural lighting if possible" items={dos} onChange={setDos} />
                        <TagListField label="Don't" placeholder="e.g. Use blurry or dark footage" items={donts} onChange={setDonts} />

                        <div className="cc-field">
                          <label className="cc-label">Suggested Caption <span className="cc-optional-label">Optional</span></label>
                          <textarea className="cc-textarea" value={suggestedCaption} onChange={(e) => setSuggestedCaption(e.target.value)} placeholder="A caption creators can use as-is or adapt to their voice." />
                        </div>
                        <TagListField label="Hashtags" placeholder="e.g. #handmadepaper" items={hashtags} onChange={setHashtags} />

                        <div className="cc-field" style={{ marginBottom: 4 }}>
                          <label className="cc-label">Campaign Guidelines Note <span className="cc-optional-label">Optional</span></label>
                          <textarea className="cc-textarea" value={guidelinesNote} onChange={(e) => setGuidelinesNote(e.target.value)} placeholder="A short highlighted note, e.g. Keep your content authentic, positive and aligned with the brand's values." />
                          <div className="cc-hint"><Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />Shown in a highlighted callout at the bottom of the campaign page.</div>
                        </div>
                      </>
                    )}

                    {step === 4 && (
                      <>
                        {videoSpecs.length === 0 && <div className="cc-video-empty">No platform-specific specs yet. Add one only if a platform needs exact requirements.</div>}
                        {videoSpecs.map((spec, i) => (
                          <div className="cc-spec-card" key={i}>
                            <button type="button" className="cc-spec-card-remove" onClick={() => removeVideoSpec(i)}><Trash2 size={15} /></button>
                            <PickChips label="Platform" options={VIDEO_PLATFORMS} value={spec.platform} onChange={(v) => updateVideoSpec(i, { platform: v })} />
                            <PickChips label="Duration" options={VIDEO_DURATIONS} value={spec.duration || ''} onChange={(v) => updateVideoSpec(i, { duration: v })} />
                            <PickChips label="Aspect Ratio" options={ASPECT_RATIOS} value={spec.aspect_ratio || ''} onChange={(v) => updateVideoSpec(i, { aspect_ratio: v })} />
                            <PickChips label="Resolution" options={RESOLUTIONS} value={spec.resolution || ''} onChange={(v) => updateVideoSpec(i, { resolution: v })} />
                            <PickChips label="Frame Rate" options={FRAME_RATES} value={spec.frame_rate || ''} onChange={(v) => updateVideoSpec(i, { frame_rate: v })} />
                            <PickChips label="File Type" options={FILE_TYPES} value={spec.file_type || ''} onChange={(v) => updateVideoSpec(i, { file_type: v })} />
                            <div className="cc-spec-checks">
                              <label className="cc-spec-check"><input type="checkbox" checked={spec.voiceover_required} onChange={(e) => updateVideoSpec(i, { voiceover_required: e.target.checked })} /> Voiceover required</label>
                              <label className="cc-spec-check"><input type="checkbox" checked={spec.subtitles_required} onChange={(e) => updateVideoSpec(i, { subtitles_required: e.target.checked })} /> Subtitles required</label>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="cc-add-spec-btn" onClick={addVideoSpec}><Plus size={15} /> Add a platform</button>
                      </>
                    )}

                    {step === 5 && (
                      <div className="cc-review">
                        <div className="cc-review-intro">
                          <strong>Give it a final look before you publish.</strong>
                          <span>This is the information creators will use to decide whether the campaign is a good fit. You can jump back to any step from the dots above and make changes.</span>
                        </div>

                        <div className="cc-review-grid">
                          <div className="cc-review-item"><div className="cc-review-label">Campaign</div><div className="cc-review-value">{title || 'Not added yet'}</div></div>
                          <div className="cc-review-item"><div className="cc-review-label">Category</div><div className="cc-review-value">{category || 'Not selected'}</div></div>
                          <div className="cc-review-item"><div className="cc-review-label">Brand</div><div className="cc-review-value">{brandName || 'Not added'}</div></div>
                          <div className="cc-review-item"><div className="cc-review-label">Content type</div><div className="cc-review-value">{subCategory || 'Not specified'}</div></div>
                          <div className="cc-review-item"><div className="cc-review-label">Campaign type</div><div className="cc-review-value">{campaignType === 'paid' ? 'Paid' : 'Gifted'}</div></div>
                          <div className="cc-review-item"><div className="cc-review-label">Compensation</div><div className="cc-review-value">{campaignType === 'paid' ? (budget ? `Rs. ${budget}` : 'Budget not specified') : (compensationDescription || 'Compensation details not specified')}</div></div>
                          <div className="cc-review-item"><div className="cc-review-label">Application deadline</div><div className="cc-review-value">{deadline || 'Not specified'}</div></div>
                          <div className="cc-review-item"><div className="cc-review-label">Location</div><div className="cc-review-value">{brandLocation || 'Not specified'}</div></div>
                        </div>

                        <div className="cc-review-item"><div className="cc-review-label">About the campaign</div><div className="cc-review-value">{description || 'No campaign description yet.'}</div></div>

                        <div className="cc-review-item">
                          <div className="cc-review-label">Creator requirements</div>
                          {(creatorRequirements.categories?.length || selectedContentTypes.length || creatorRequirements.creator_sizes?.length || creatorRequirements.locations?.length || creatorRequirements.languages?.length || creatorRequirements.follower_ranges?.length || creatorRequirements.age_ranges?.length || creatorRequirements.gender || requirements) ? (
                            <div className="cc-review-list">
                              {(creatorRequirements.categories || []).map((item, i) => <span className="cc-review-pill" key={`cat-${i}`}>{item}</span>)}
                              {selectedContentTypes.map((item, i) => <span className="cc-review-pill" key={`content-${i}`}>{item}</span>)}
                              {(creatorRequirements.creator_sizes || []).map((item, i) => <span className="cc-review-pill" key={`size-${i}`}>{item}</span>)}
                              {(creatorRequirements.locations || []).map((item, i) => <span className="cc-review-pill" key={`location-${i}`}>{item}</span>)}
                              {(creatorRequirements.languages || []).map((item, i) => <span className="cc-review-pill" key={`language-${i}`}>{item}</span>)}
                              {(creatorRequirements.follower_ranges || []).map((item, i) => <span className="cc-review-pill" key={`followers-${i}`}>{item}</span>)}
                              {(creatorRequirements.age_ranges || []).map((item, i) => <span className="cc-review-pill" key={`age-${i}`}>{item}</span>)}
                              {creatorRequirements.gender && <span className="cc-review-pill" key="gender">{creatorRequirements.gender}</span>}
                              {requirements && <span className="cc-review-pill" key="notes">{requirements}</span>}
                            </div>
                          ) : <span className="cc-review-empty">No additional creator preferences added.</span>}
                        </div>

                        <div className="cc-review-item">
                          <div className="cc-review-section-title">Deliverables</div>
                          {deliverables.length > 0 ? <div className="cc-review-list">{deliverables.map((item, i) => <span className="cc-review-pill" key={i}>{item}</span>)}</div> : <span className="cc-review-empty">No deliverables added.</span>}
                        </div>

                        <div className="cc-review-grid">
                          <div className="cc-review-item">
                            <div className="cc-review-section-title">Creative direction</div>
                            <div className="cc-review-value">{dos.length} do&apos;s · {donts.length} don&apos;ts · {requiredScenes.length} required scenes</div>
                          </div>
                          <div className="cc-review-item">
                            <div className="cc-review-section-title">Caption & tags</div>
                            <div className="cc-review-value">{suggestedCaption ? 'Caption added' : 'No suggested caption'} · {hashtags.length} hashtag{hashtags.length === 1 ? '' : 's'}</div>
                          </div>
                        </div>

                        <div className="cc-review-item">
                          <div className="cc-review-label">Video specifications</div>
                          {videoSpecs.length > 0 ? (
                            <div className="cc-review-list">
                              {videoSpecs.filter((s) => s.platform.trim()).map((spec, i) => (
                                <span className="cc-review-pill" key={i}>{spec.platform}{spec.duration ? ` · ${spec.duration}` : ''}{spec.aspect_ratio ? ` · ${spec.aspect_ratio}` : ''}</span>
                              ))}
                            </div>
                          ) : <span className="cc-review-empty">No platform-specific rules added.</span>}
                        </div>
                      </div>
                    )}

                    <div className="cc-footer">
                      {step > 1 ? (
                        <button type="button" className="cc-back-step" onClick={() => { setError(''); setStep(step - 1); }}><ArrowLeft size={14} /> Previous</button>
                      ) : <span />}

                      <div className="cc-footer-right">
                        {step < STEP_LABELS.length && (
                          <button type="button" className="cc-next-step" disabled={step === 1 && !canContinueStep1} onClick={() => { setError(''); setStep(step + 1); }}>
                            Next <ArrowRight size={15} />
                          </button>
                        )}
                        <button type="button" className="cc-btn-draft" onClick={() => handleSubmit('draft')} disabled={saving !== null}>
                          {saving === 'draft' && <Loader2 size={15} className="cc-spin" />}
                          {mode === 'edit' ? 'Save Changes' : 'Save as Draft'}
                        </button>
                        {step === STEP_LABELS.length && (mode === 'create' || originalStatus === 'draft') && (
                          <button type="button" className="cc-btn-publish" onClick={() => handleSubmit('publish')} disabled={saving !== null}>
                            {saving === 'publish' && <Loader2 size={15} className="cc-spin" />}
                            Publish Campaign
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="cc-hint" style={{ marginTop: 12, justifyContent: 'center' }}>
                      <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                      You don't need to fill in every step — save or publish whenever you're ready, and come back to add more later.
                    </div>
                  </div>
                </div>

                <aside className="cc-tips-col">
                  <div className="cc-tips-panel">
                    <div className="cc-tips-title">{TIPS_TITLE}</div>
                    <ul className="cc-tips-list">
                      {activeTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export function CampaignCreate() {
  return <CampaignForm mode="create" />;
}

export function CampaignEdit() {
  return <CampaignForm mode="edit" />;
}
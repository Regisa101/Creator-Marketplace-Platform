import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Camera,
  Plus,
  CheckCircle2,
  Info,
  Trash2,
  Save,
  Image as ImageIcon,
  Video,
  UploadCloud,
  MapPin,
} from 'lucide-react';

import {
  completeCreatorOnboarding,
  getCreatorProgress,
  saveCreatorProgress,
  uploadImage,
} from '../../api/client';
import type { CreatorOnboardingData } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LogoMark, BRAND_NAME, OFF_WHITE } from '../../components/Logo';

// ============================================================
// TYPES
// ============================================================

interface Social {
  platform: string;
  username: string;
  profile_url: string;
  follower_count: number;
}

interface PortfolioItem {
  title: string;
  description: string;
  media_url: string;
  platform: string;
  type: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const CORAL = '#F47C78';
const CORAL_DARK = '#E86966';

const LANGUAGES = ['English', 'Nepali', 'Hindi', 'Newari', 'Maithili'];

// NOTE: "Content niches" and "Your audience's interests" used to be
// two separate questions with the *same* option list — pure
// redundancy. Merged into one field (`categories`) and expanded with
// a few more common niches (Lifestyle, Parenting, Finance, etc).
const CATEGORIES = [
  'Beauty', 'Fashion', 'Food', 'Fitness', 'Tech',
  'Travel', 'Gaming', 'Music', 'Home', 'Wellness',
  'Lifestyle', 'Parenting', 'Finance', 'Sports', 'Art & Design',
  'Comedy', 'Education', 'Automotive', 'Pets',
];

const CONTENT_TYPES = [
  'Reels', 'Photos', 'Stories', 'YouTube Videos', 'Shorts', 'Reviews', 'UGC',
];

const CREATOR_TYPES = [
  'Influencer', 'UGC Creator', 'Content Creator', 'Model', 'Photographer', 'Videographer', 'Other',
];

const AUDIENCE_AGE_RANGES = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];

const AUDIENCE_LOCATIONS = [
  'Kathmandu', 'Pokhara', 'Lalitpur', 'Bhaktapur', 'Chitwan', 'Biratnagar', 'Nationwide', 'International',
];

const PORTFOLIO_TYPES = ['image', 'video', 'reel', 'link'];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', handleLabel: 'Followers' },
  { id: 'tiktok', label: 'TikTok', handleLabel: 'Followers' },
];

const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
const TIKTOK_USERNAME_REGEX = /^[a-zA-Z0-9._]{2,24}$/;

const LOCATION_SUGGESTIONS = [
  'Kathmandu, Nepal', 'Lalitpur, Nepal', 'Bhaktapur, Nepal', 'Pokhara, Nepal',
  'Biratnagar, Nepal', 'Birgunj, Nepal', 'Dharan, Nepal', 'Bharatpur, Nepal',
  'Butwal, Nepal', 'Hetauda, Nepal', 'Nepalgunj, Nepal', 'Itahari, Nepal',
  'Janakpur, Nepal', 'Dhangadhi, Nepal', 'Tulsipur, Nepal', 'Ghorahi, Nepal',
  'Birendranagar, Nepal', 'Kalaiya, Nepal', 'Damak, Nepal', 'Dhulikhel, Nepal',
];

function validateSocialAccount(platform: string, username: string, profileUrl: string) {
  const handle = username.trim().replace(/^@/, '');
  const url = profileUrl.trim();

  if (!handle) return 'Please enter your Instagram or TikTok username.';

  if (platform === 'instagram' && !INSTAGRAM_USERNAME_REGEX.test(handle)) {
    return 'Enter a valid Instagram username (letters, numbers, dots and underscores only).';
  }

  if (platform === 'tiktok' && !TIKTOK_USERNAME_REGEX.test(handle)) {
    return 'Enter a valid TikTok username (letters, numbers, dots and underscores only).';
  }

  const expectedHost = platform === 'instagram' ? 'instagram.com' : 'tiktok.com';
  if (!url) return `Please enter your ${platform === 'instagram' ? 'Instagram' : 'TikTok'} profile URL.`;

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== expectedHost) return `Use a valid ${platform === 'instagram' ? 'Instagram' : 'TikTok'} profile URL.`;

    const path = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/^@/, '');
    if (!path || path.includes('/')) return 'Profile URL must point to a single account.';

    const urlHandle = path.replace(/^@/, '');
    if (urlHandle.toLowerCase() !== handle.toLowerCase()) {
      return 'Username and profile URL do not match.';
    }
  } catch {
    return 'Please enter a valid profile URL.';
  }

  return '';
}

function resolveCreatorStep(
  profile: Record<string, any> | null | undefined,
  socials: any[] | null | undefined
): number {
  if (!profile) return 1;

  const step1Done =
    Boolean(profile.display_name?.trim?.()) &&
    USERNAME_REGEX.test(profile.username || '') &&
    Boolean(profile.bio?.trim?.()) &&
    Boolean(profile.location?.trim?.());
  if (!step1Done) return 1;

  const step2Done =
    Boolean(profile.creator_type) &&
    Array.isArray(profile.categories) && profile.categories.length > 0 &&
    Array.isArray(profile.content_types) && profile.content_types.length > 0 &&
    Array.isArray(profile.languages) && profile.languages.length > 0 &&
    Array.isArray(profile.audience_age_range) && profile.audience_age_range.length > 0 &&
    Array.isArray(profile.audience_location) && profile.audience_location.length > 0;
  if (!step2Done) return 2;

  const step3Done = Array.isArray(socials) && socials.length > 0;
  if (!step3Done) return 3;

  return 4;
}

// ============================================================
// CHIP + CHIP GROUP (with "show 7, then expand" behavior)
// ============================================================

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button type="button" className={`co-chip ${active ? 'co-chip-active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

interface ChipGroupProps {
  items: string[];
  isActive: (item: string) => boolean;
  onToggle: (item: string) => void;
  limit?: number;
}

function ChipGroup({ items, isActive, onToggle, limit = 7 }: ChipGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > limit;
  const visible = expanded ? items : items.slice(0, limit);

  return (
    <div className="co-chips">
      {visible.map((item) => (
        <Chip key={item} label={item} active={isActive(item)} onClick={() => onToggle(item)} />
      ))}
      {hasMore && (
        <button
          type="button"
          className="co-chip co-chip-more"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Show less' : `+${items.length - limit} more`}
        </button>
      )}
    </div>
  );
}

// ============================================================
// LOCATION AUTOCOMPLETE
// ============================================================

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

function LocationAutocomplete({ value, onChange }: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);

  const query = value.trim().toLowerCase();
  const filtered = (
    query
      ? LOCATION_SUGGESTIONS.filter((loc) => loc.toLowerCase().includes(query))
      : LOCATION_SUGGESTIONS
  ).slice(0, 6);

  return (
    <div className="co-autocomplete">
      <input
        className="co-input"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="City, Province, Country"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="co-autocomplete-list">
          {filtered.map((loc) => (
            <button
              type="button"
              key={loc}
              className="co-autocomplete-item"
              onMouseDown={() => { onChange(loc); setOpen(false); }}
            >
              <MapPin size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP HEADER
// ============================================================

const STEP_LABELS = ['Basic Info', 'Type & Niche', 'Socials', 'Portfolio', 'Payout & Publish'];

function StepHeader({ step }: { step: number }) {
  return (
    <div className="co-steps">
      {STEP_LABELS.map((label, index) => {
        const number = index + 1;
        const state = number < step ? 'done' : number === step ? 'active' : 'upcoming';

        return (
          <div className="co-step" key={label}>
            <span className={`co-step-dot co-step-${state}`}>
              {state === 'done' ? <CheckCircle2 size={14} /> : number}
            </span>
            <span className={`co-step-label co-step-label-${state}`}>{label}</span>
            {number < STEP_LABELS.length && (
              <span className={`co-step-line ${number < step ? 'co-step-line-done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CreatorOnboarding() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ----------------------------------------------------------
  // STEP 1 — Basic Info
  // ----------------------------------------------------------

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  const handleUsernameChange = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    setUsername(cleaned);
    setUsernameError(
      cleaned && !USERNAME_REGEX.test(cleaned)
        ? '3–24 characters: letters, numbers, and underscores only.'
        : ''
    );
  };

  // ----------------------------------------------------------
  // STEP 2 — Type & Niche (content classification + audience)
  // ----------------------------------------------------------

  const [creatorType, setCreatorType] = useState('');
  const [categories, setCategories] = useState<string[]>([]); // doubles as content niche + audience interest
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [audienceAgeRanges, setAudienceAgeRanges] = useState<string[]>([]);
  const [audienceLocations, setAudienceLocations] = useState<string[]>([]);

  // ----------------------------------------------------------
  // STEP 3 — Socials
  // ----------------------------------------------------------

  const [socials, setSocials] = useState<Social[]>([]);
  const [socialError, setSocialError] = useState('');
  const [socialDraft, setSocialDraft] = useState({
    platform: 'instagram',
    username: '',
    profile_url: '',
    follower_count: '0',
  });

  // ----------------------------------------------------------
  // STEP 4 — Portfolio
  // ----------------------------------------------------------

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioDraft, setPortfolioDraft] = useState({
    title: '',
    description: '',
    media_url: '',
    platform: '',
    type: 'image',
  });
  const [uploadingPortfolioImage, setUploadingPortfolioImage] = useState(false);
  const [portfolioError, setPortfolioError] = useState('');

  // ----------------------------------------------------------
  // STEP 5 — Publish
  // ----------------------------------------------------------

  const [startingPrice, setStartingPrice] = useState('');
  const [payoutAccountHolderName, setPayoutAccountHolderName] = useState('');
  const [payoutProvider, setPayoutProvider] = useState('');
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('');
  const [payoutBranch, setPayoutBranch] = useState('');
  const [payoutRouting, setPayoutRouting] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');

  // ----------------------------------------------------------
  // RESUME PROGRESS / PHOTO UPLOAD / SAVE DRAFT STATE
  // ----------------------------------------------------------

  const [loadingProgress, setLoadingProgress] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  // ==========================================================
  // RESUME WHERE YOU LEFT OFF
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      try {
        const saved = await getCreatorProgress();
        const profile = saved?.profile ?? user?.profile ?? null;
        const socialsData = saved?.socials ?? (user?.profile?.socials as any[] | undefined) ?? [];

        if (!cancelled && profile) {
          setProfileImage(profile.profile_image ?? null);
          setDisplayName(profile.display_name ?? user?.full_name ?? '');
          setUsername(profile.username ?? '');
          setBio(profile.bio ?? '');
          setLocation(profile.location ?? '');

          setCreatorType(profile.creator_type ?? '');
          // Merge legacy `interests` into `categories` too, in case
          // a draft was saved before the two fields were combined.
          setCategories(
            Array.from(new Set([
              ...(profile.categories ?? profile.niches ?? []),
              ...(profile.interests ?? profile.audience_interests ?? []),
            ]))
          );
          setContentTypes(profile.content_types ?? []);
          setLanguages(profile.languages ?? profile.content_languages ?? []);
          setAudienceAgeRanges(profile.audience_age_range ?? []);
          setAudienceLocations(profile.audience_location ?? []);

          setSocials(
            (socialsData || []).map((s: any) => ({
              platform: s.platform,
              username: s.username ?? '',
              profile_url: s.profile_url ?? '',
              follower_count: s.follower_count ?? 0,
            }))
          );

          setPortfolio(
            (profile.portfolio || []).map((p: any) => ({
              title: p.title ?? '',
              description: p.description ?? '',
              media_url: p.media_url ?? '',
              platform: p.platform ?? '',
              type: p.type ?? 'image',
            }))
          );

          setStartingPrice(
            profile.starting_price !== null && profile.starting_price !== undefined
              ? String(profile.starting_price)
              : ''
          );
          setPayoutAccountHolderName(profile.payout_account_holder_name ?? '');
          setPayoutProvider(profile.payout_provider ?? '');
          setPayoutAccountNumber(profile.payout_account_number ?? '');
          setPayoutBranch(profile.payout_branch ?? '');
          setPayoutRouting(profile.payout_routing ?? '');
          setPayoutMethod(profile.payout_method ?? '');

          setStep(resolveCreatorStep(profile, socialsData));
        }
      } catch (err) {
        console.error('Could not load onboarding progress:', err);
      } finally {
        if (!cancelled) setLoadingProgress(false);
      }
    };

    loadProgress();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // HELPERS
  // ==========================================================

  const toggle = (list: string[], setList: (value: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const toggleSingle = (current: string, setValue: (value: string) => void, value: string) => {
    setValue(current === value ? '' : value);
  };

  // ==========================================================
  // PROGRESS SAVING
  // ==========================================================

  const saveStep1Progress = () => {
    const payload = {
      display_name: displayName.trim(),
      username: username.trim(),
      bio: bio.trim(),
      location: location.trim(),
      profile_image: profileImage,
    };
    updateProfile?.(payload);
    return saveCreatorProgress(payload);
  };

  const saveStep2Progress = () => {
    // `categories` is sent as both niches and audience_interests so
    // the backend/matching logic that reads either field still works
    // — same list, no separate question for the user anymore.
    const payload = {
      creator_type: creatorType,
      niches: categories,
      content_types: contentTypes,
      content_languages: languages,
      audience_interests: categories,
      audience_age_range: audienceAgeRanges,
      audience_location: audienceLocations,
    };
    updateProfile?.(payload);
    return saveCreatorProgress(payload);
  };

  const saveStep3Progress = () => {
    updateProfile?.({ socials });
    return saveCreatorProgress({ socials });
  };

  const saveStep4Progress = () => {
    updateProfile?.({ portfolio });
    return saveCreatorProgress({ portfolio });
  };

  const saveStep5Progress = () => {
    const payload = {
      starting_price: Number(startingPrice) || 0,
      payout_account_holder_name: payoutAccountHolderName.trim(),
      payout_provider: payoutProvider.trim(),
      payout_account_number: payoutAccountNumber.trim(),
      payout_branch: payoutBranch.trim() || undefined,
      payout_routing: payoutRouting.trim() || undefined,
      payout_method: payoutMethod.trim() || undefined,
    };
    updateProfile?.(payload);
    return saveCreatorProgress(payload);
  };

  const saveCurrentStepProgress = () => {
    if (step === 1) return saveStep1Progress();
    if (step === 2) return saveStep2Progress();
    if (step === 3) return saveStep3Progress();
    if (step === 4) return saveStep4Progress();
    if (step === 5) return saveStep5Progress();
    return Promise.resolve();
  };

  const handleBackToDashboard = () => {
    saveCurrentStepProgress()?.catch((err) => {
      console.error('Could not save progress:', err);
    });
    navigate('/dashboard');
  };

  const handleSaveDraft = async () => {
    try {
      await saveCurrentStepProgress();
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2200);
    } catch (err) {
      console.error('Could not save draft:', err);
      setError('Could not save your draft. Please try again.');
    }
  };

  // ==========================================================
  // SOCIAL MEDIA
  // ==========================================================

  const addSocial = () => {
    setSocialError('');

    const handle = socialDraft.username.trim().replace(/^@/, '');
    const url = socialDraft.profile_url.trim();
    const validation = validateSocialAccount(socialDraft.platform, handle, url);

    if (validation) {
      setSocialError(validation);
      return;
    }

    if (socials.some((s) => s.platform === socialDraft.platform)) {
      setSocialError(`You can add only one ${socialDraft.platform === 'instagram' ? 'Instagram' : 'TikTok'} account.`);
      return;
    }

    setSocials([...socials, {
      platform: socialDraft.platform,
      username: handle,
      profile_url: url.startsWith('http') ? url : `https://${url}`,
      follower_count: 0,
    }]);

    setSocialDraft({ platform: 'instagram', username: '', profile_url: '', follower_count: '0' });
  };

  const removeSocial = (index: number) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  // ==========================================================
  // PORTFOLIO
  // ==========================================================

  const addPortfolioItem = () => {
    if (!portfolioDraft.title.trim() || !portfolioDraft.media_url.trim()) return;

    setPortfolio([...portfolio, {
      title: portfolioDraft.title.trim(),
      description: portfolioDraft.description.trim(),
      media_url: portfolioDraft.media_url.trim(),
      platform: portfolioDraft.platform,
      type: portfolioDraft.type,
    }]);

    setPortfolioDraft({ title: '', description: '', media_url: '', platform: '', type: 'image' });
  };

  const removePortfolioItem = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const handlePortfolioImageUpload = async (file: File) => {
    setPortfolioError('');
    setUploadingPortfolioImage(true);
    try {
      const { url } = await uploadImage(file);
      setPortfolioDraft((d) => ({ ...d, media_url: url, type: 'image' }));
    } catch (err: any) {
      console.error('Portfolio image upload failed:', err);
      setPortfolioError(err?.response?.data?.detail || 'Could not upload image. Please try again.');
    } finally {
      setUploadingPortfolioImage(false);
    }
  };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const canContinueStep1 =
    displayName.trim().length > 0 &&
    USERNAME_REGEX.test(username) &&
    bio.trim().length > 0 &&
    location.trim().length > 0;

  const canContinueStep2 =
    creatorType !== '' &&
    categories.length > 0 &&
    contentTypes.length > 0 &&
    languages.length > 0 &&
    audienceAgeRanges.length > 0 &&
    audienceLocations.length > 0;

  const canContinueStep3 = socials.length > 0 && socials.every((s) => !validateSocialAccount(s.platform, s.username, s.profile_url));

  // Portfolio is optional — always fine to move on.
  const canContinueStep4 = true;

  const canFinish =
    startingPrice !== '' &&
    Number(startingPrice) >= 0 &&
    payoutAccountHolderName.trim().length > 0 &&
    payoutProvider.trim().length > 0 &&
    payoutAccountNumber.trim().length > 0;

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError('');

    const payload: CreatorOnboardingData = {
      display_name: displayName.trim(),
      username: username.trim(),
      bio: bio.trim(),
      location: location.trim(),
      profile_image: profileImage,
      creator_type: creatorType,
      niches: categories,
      content_languages: languages,
      content_types: contentTypes,
      audience_age_range: audienceAgeRanges,
      audience_location: audienceLocations,
      audience_interests: categories,
      socials,
      portfolio,
      starting_price: Number(startingPrice) || 0,
      payout_account_holder_name: payoutAccountHolderName.trim(),
      payout_provider: payoutProvider.trim(),
      payout_account_number: payoutAccountNumber.trim(),
      payout_branch: payoutBranch.trim() || undefined,
      payout_routing: payoutRouting.trim() || undefined,
      payout_method: payoutMethod.trim() || undefined,
    };

    try {
      const response = await completeCreatorOnboarding(payload);
      console.log('Creator onboarding complete:', response);
      updateProfile?.(payload);
      setDone(true);
    } catch (err: any) {
      console.error('Creator onboarding failed:', err);
      setError(err?.response?.data?.detail || 'Failed to complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="co">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@600;700&display=swap');

        .co {
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          --surface: #f7f7f9;
          --accent: ${CORAL};
          --accent-hover: ${CORAL_DARK};
          --accent-soft: #FFEDEA;
          --coral: #F47C78;
          --good: #16a34a;

          font-family: Inter, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
          min-height: 100vh;
          background: ${OFF_WHITE};
          padding: 32px 20px 80px;
          -webkit-font-smoothing: antialiased;
        }

        .co * { box-sizing: border-box; }
        .co button { font-family: inherit; cursor: pointer; }
        .co a { text-decoration: none; color: inherit; }

        .co-shell { max-width: 620px; margin: 0 auto; }

        .co-wordmark { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 22px; }
        .co-wordmark span { font-family: 'League Spartan', sans-serif; font-weight: 700; font-size: 24px; color: var(--ink); }

        .co-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 18px;
          margin-bottom: 22px;
          border-bottom: 1px solid var(--line);
        }

        .co-back-link {
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
        .co-back-link:hover { color: var(--ink); }

        .co-header-right { display: flex; align-items: center; gap: 10px; }

        .co-savedraft-toast {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--good);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .co-savedraft-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
          background: #fff;
          border: 1.5px solid var(--line);
          padding: 9px 15px;
          border-radius: 8px;
        }
        .co-savedraft-btn:hover { border-color: var(--accent); color: var(--accent); }
        .co-savedraft-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .co-steps { display: flex; align-items: center; margin-bottom: 28px; }
        .co-step { display: flex; align-items: center; flex: 1; }
        .co-step:last-child { flex: 0; }

        .co-step-dot {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .co-step-upcoming { background: var(--surface); color: var(--ink-soft); border: 1.5px solid var(--line); }
        .co-step-active { background: var(--accent); color: #fff; }
        .co-step-done { background: var(--good); color: #fff; }

        .co-step-label { font-size: 11.5px; font-weight: 600; margin-left: 8px; white-space: nowrap; color: var(--ink-soft); }
        .co-step-label-active, .co-step-label-done { color: var(--ink); }

        .co-step-line { flex: 1; height: 1.5px; background: var(--line); margin: 0 10px; }
        .co-step-line-done { background: var(--accent); }

        .co-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 36px 40px 40px;
          box-shadow: 0 30px 60px -24px rgba(244,124,120,0.18), 0 4px 14px rgba(17,18,23,0.04);
        }

        .co-h2 { font-size: 22px; font-weight: 700; margin: 0 0 5px; }
        .co-sub { font-size: 13px; color: var(--ink-soft); margin: 0 0 28px; line-height: 1.5; }
        .co-section-label { font-size: 12.5px; font-weight: 700; color: var(--ink); margin: 26px 0 14px; }
        .co-section-label:first-of-type { margin-top: 0; }

        .co-field { margin-bottom: 20px; }
        .co-label { display: block; font-size: 12.5px; font-weight: 600; color: var(--ink); margin-bottom: 8px; }
        .co-hint { font-size: 11.5px; color: var(--ink-soft); margin-top: 6px; display: flex; align-items: flex-start; gap: 5px; line-height: 1.5; }

        .co-input, .co-textarea, .co-select {
          width: 100%; border: 1.5px solid var(--line); border-radius: 9px;
          padding: 11px 13px; font-size: 13.5px; font-family: inherit; color: var(--ink); background: #fff;
        }
        .co-input:focus, .co-textarea:focus, .co-select:focus { outline: none; border-color: var(--accent); }
        .co-textarea { resize: vertical; min-height: 76px; line-height: 1.5; }

        .co-avatar-row { display: flex; align-items: center; gap: 16px; }
        .co-avatar {
          width: 68px; height: 68px; border-radius: 50%;
          background: var(--accent-soft); color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden; font-size: 22px; font-weight: 700;
        }
        .co-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .co-avatar-btn { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--ink); background: #fff; border: 1.5px solid var(--line); padding: 9px 14px; border-radius: 8px; }

        .co-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .co-chip { font-size: 12.5px; font-weight: 500; color: var(--ink); background: var(--surface); border: 1.5px solid var(--line); padding: 7px 13px; border-radius: 100px; }
        .co-chip-active { background: var(--accent); color: #fff; border-color: var(--accent); }
        .co-chip-more { background: #fff; border-style: dashed; color: var(--accent); font-weight: 600; }

        .co-autocomplete { position: relative; }
        .co-autocomplete-list {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 20;
          background: #fff; border: 1.5px solid var(--line); border-radius: 9px;
          box-shadow: 0 8px 20px rgba(17,18,23,0.08); overflow: hidden;
          max-height: 210px; overflow-y: auto;
        }
        .co-autocomplete-item {
          width: 100%; display: flex; align-items: center; gap: 8px;
          text-align: left; font-size: 13px; color: var(--ink);
          background: #fff; border: none; padding: 10px 13px;
        }
        .co-autocomplete-item:hover { background: var(--surface); }

        .co-social-list, .co-portfolio-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .co-social-item, .co-portfolio-item { display: flex; align-items: center; gap: 11px; border: 1.5px solid var(--line); border-radius: 10px; padding: 10px 12px; }
        .co-social-icon, .co-portfolio-thumb {
          width: 34px; height: 34px; border-radius: 8px; background: var(--accent-soft); color: var(--accent);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: 700; overflow: hidden;
        }
        .co-portfolio-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .co-social-main, .co-portfolio-main { flex: 1; min-width: 0; }
        .co-social-handle, .co-portfolio-item-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .co-social-meta, .co-portfolio-item-desc { font-size: 11.5px; color: var(--ink-soft); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .co-social-remove { background: none; border: none; color: var(--ink-soft); padding: 6px; border-radius: 6px; flex-shrink: 0; }
        .co-social-remove:hover { color: #d1293d; }

        .co-social-form, .co-portfolio-form { border: 1.5px dashed var(--line); border-radius: 12px; padding: 16px; }
        .co-social-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .co-portfolio-upload-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .co-portfolio-upload-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-soft); border: none; padding: 9px 13px; border-radius: 8px; white-space: nowrap; }
        .co-portfolio-upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .co-portfolio-or { font-size: 11px; color: var(--ink-soft); }

        .co-add-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; background: var(--accent-soft); color: var(--accent); border: none; padding: 10px; border-radius: 8px; font-size: 12.5px; font-weight: 600; }
        .co-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .co-price-row { display: flex; align-items: center; border: 1.5px solid var(--line); border-radius: 9px; overflow: hidden; }
        .co-price-prefix { background: var(--surface); padding: 11px 13px; font-size: 13px; font-weight: 600; color: var(--ink-soft); border-right: 1px solid var(--line); }
        .co-price-row input { border: none; flex: 1; padding: 11px 13px; font-size: 13.5px; font-family: inherit; }
        .co-price-row input:focus { outline: none; }

        .co-recap { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
        .co-recap-card { border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 16px; }
        .co-recap-label { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-soft); margin: 0 0 8px; }
        .co-recap-row { display: flex; align-items: center; gap: 10px; }
        .co-recap-name { font-size: 14px; font-weight: 700; margin: 0; }
        .co-recap-sub { font-size: 12px; color: var(--ink-soft); margin: 1px 0 0; }
        .co-recap-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .co-recap-empty { font-size: 12.5px; color: var(--ink-soft); }

        .co-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line); }
        .co-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--ink-soft); background: none; border: none; padding: 8px 4px; }
        .co-continue { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #fff; background: var(--accent); border: none; padding: 12px 24px; border-radius: 8px; }
        .co-continue:disabled { background: #F4D0CE; cursor: not-allowed; }

        .co-done { text-align: center; padding: 20px 0 10px; }
        .co-done-icon { width: 64px; height: 64px; border-radius: 50%; background: #E1F6EA; color: #16A34A; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .co-done-title { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
        .co-done-sub { font-size: 14px; color: var(--ink-soft); margin: 0 0 28px; }
        .co-done-btn { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #fff; background: var(--accent); border: none; padding: 13px 26px; border-radius: 8px; }

        .co-error { margin-top: 16px; padding: 12px; background: #fdecee; color: #d1293d; border-radius: 8px; font-size: 13px; text-align: center; }

        @media (max-width: 480px) {
          .co { padding: 16px 12px 50px; }
          .co-card { padding: 25px 20px 30px; }
          .co-step-label { display: none; }
          .co-social-form-row { grid-template-columns: 1fr; }
          .co-header { flex-direction: column; align-items: stretch; gap: 10px; }
        }
      `}</style>

      <div className="co-shell">

        <Link to="/" className="co-wordmark">
          <LogoMark size={34} />
          <span>{BRAND_NAME}</span>
        </Link>

        <div className="co-header">
          <button type="button" className="co-back-link" onClick={handleBackToDashboard}>
            <ArrowLeft size={15} /> Back to Dashboard
          </button>

          {!done && !loadingProgress && (
            <div className="co-header-right">
              {draftSaved && (
                <span className="co-savedraft-toast">
                  <CheckCircle2 size={13} /> Draft saved
                </span>
              )}
              <button type="button" className="co-savedraft-btn" onClick={handleSaveDraft}>
                <Save size={13} /> Save Draft
              </button>
            </div>
          )}
        </div>

        {!done && !loadingProgress && <StepHeader step={step} />}

        <div className="co-card">

          {done ? (
            <div className="co-done">
              <div className="co-done-icon"><CheckCircle2 size={30} /></div>
              <p className="co-done-title">Profile complete</p>
              <p className="co-done-sub">Welcome to CreatorHub!</p>
              <button className="co-done-btn" onClick={() => navigate('/dashboard')}>
                Go to Dashboard <ArrowRight size={15} />
              </button>
            </div>
          ) : loadingProgress ? (
            <div className="co-done" style={{ color: 'var(--ink-soft)' }}>
              Loading your profile...
            </div>
          ) : (
            <>

              {/* ============================================
                  STEP 1 — BASIC INFO
              ============================================ */}

              {step === 1 && (
                <>
                  <h2 className="co-h2">Basic Info</h2>
                  <p className="co-sub">Tell us about yourself — this is what brands will see first.</p>

                  <div className="co-field">
                    <label className="co-label">Profile picture</label>
                    <div className="co-avatar-row">
                      <div className="co-avatar">
                        {profileImage ? <img src={profileImage} alt="Profile" /> : <Camera size={22} />}
                      </div>
                      <label className="co-avatar-btn" style={uploadingPhoto ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                        <Camera size={14} />
                        {uploadingPhoto ? 'Uploading...' : 'Upload photo'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploadingPhoto}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setPhotoError('');
                            setUploadingPhoto(true);
                            try {
                              const { url } = await uploadImage(file);
                              setProfileImage(url);
                            } catch (err: any) {
                              console.error('Photo upload failed:', err);
                              setPhotoError(err?.response?.data?.detail || 'Could not upload photo. Please try again.');
                            } finally {
                              setUploadingPhoto(false);
                              event.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="co-hint"><Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />JPG, PNG or WebP — up to 20 MB</p>
                    {photoError && (
                      <p className="co-hint" style={{ color: '#E8544E' }}>
                        <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />{photoError}
                      </p>
                    )}
                  </div>

                  <div className="co-field">
                    <label className="co-label">Display Name *</label>
                    <input className="co-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How brands should address you" />
                  </div>

                  <div className="co-field">
                    <label className="co-label">Username *</label>
                    <input className="co-input" value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="yourusername" />
                    {usernameError ? (
                      <p className="co-hint" style={{ color: '#E8544E' }}><Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />{usernameError}</p>
                    ) : username && USERNAME_REGEX.test(username) ? (
                      <p className="co-hint" style={{ color: '#16a34a' }}><CheckCircle2 size={13} style={{ marginTop: 1, flexShrink: 0 }} />@{username} looks good</p>
                    ) : null}
                  </div>

                  <div className="co-field">
                    <label className="co-label">Bio</label>
                    <textarea className="co-textarea" maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short intro brands will see on your profile" />
                    <p className="co-hint">{bio.length}/500</p>
                  </div>

                  <div className="co-field">
                    <label className="co-label">Location *</label>
                    <LocationAutocomplete value={location} onChange={setLocation} />
                  </div>
                </>
              )}

              {/* ============================================
                  STEP 2 — TYPE & NICHE
              ============================================ */}

              {step === 2 && (
                <>
                  <h2 className="co-h2">Type & Niche</h2>
                  <p className="co-sub">What kind of creator are you, and who's your audience?</p>

                  <p className="co-section-label">Creator type *</p>
                  <div className="co-chips" style={{ marginBottom: 22 }}>
                    {CREATOR_TYPES.map((t) => (
                      <Chip key={t} label={t} active={creatorType === t} onClick={() => toggleSingle(creatorType, setCreatorType, t)} />
                    ))}
                  </div>

                  <p className="co-section-label">Content niches *</p>
                  <div style={{ marginBottom: 22 }}>
                    <ChipGroup
                      items={CATEGORIES}
                      isActive={(item) => categories.includes(item)}
                      onToggle={(item) => toggle(categories, setCategories, item)}
                    />
                  </div>

                  <p className="co-section-label">Content types *</p>
                  <div className="co-chips" style={{ marginBottom: 22 }}>
                    {CONTENT_TYPES.map((c) => (
                      <Chip key={c} label={c} active={contentTypes.includes(c)} onClick={() => toggle(contentTypes, setContentTypes, c)} />
                    ))}
                  </div>

                  <p className="co-section-label">Languages you create in *</p>
                  <div className="co-chips" style={{ marginBottom: 22 }}>
                    {LANGUAGES.map((l) => (
                      <Chip key={l} label={l} active={languages.includes(l)} onClick={() => toggle(languages, setLanguages, l)} />
                    ))}
                  </div>

                  <p className="co-section-label">Audience age range *</p>
                  <div className="co-chips" style={{ marginBottom: 22 }}>
                    {AUDIENCE_AGE_RANGES.map((a) => (
                      <Chip key={a} label={a} active={audienceAgeRanges.includes(a)} onClick={() => toggle(audienceAgeRanges, setAudienceAgeRanges, a)} />
                    ))}
                  </div>

                  <p className="co-section-label">Audience location *</p>
                  <ChipGroup
                    items={AUDIENCE_LOCATIONS}
                    isActive={(item) => audienceLocations.includes(item)}
                    onToggle={(item) => toggle(audienceLocations, setAudienceLocations, item)}
                  />
                </>
              )}

              {/* ============================================
                  STEP 3 — SOCIALS
              ============================================ */}

              {step === 3 && (
                <>
                  <h2 className="co-h2">Socials</h2>
                  <p className="co-sub">Add at least one social account so brands can verify your reach.</p>

                  {socials.length > 0 && (
                    <div className="co-social-list">
                      {socials.map((s, i) => (
                        <div className="co-social-item" key={`${s.platform}-${i}`}>
                          <span className="co-social-icon">{s.platform.slice(0, 2).toUpperCase()}</span>
                          <span className="co-social-main">
                            <div className="co-social-handle">@{s.username}</div>
                            <div className="co-social-meta">{s.platform} · Account connected</div>
                          </span>
                          <button className="co-social-remove" onClick={() => removeSocial(i)}><Trash2 size={15} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="co-social-form">
                    <div className="co-social-form-row">
                      <select className="co-select" value={socialDraft.platform} onChange={(e) => setSocialDraft({ ...socialDraft, platform: e.target.value })}>
                        {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                      <input className="co-input" placeholder="Username" value={socialDraft.username} onChange={(e) => setSocialDraft({ ...socialDraft, username: e.target.value })} />
                    </div>
                    <div className="co-social-form-row">
                      <input
                        className="co-input"
                        placeholder={socialDraft.platform === 'instagram' ? 'https://instagram.com/username' : 'https://tiktok.com/@username'}
                        value={socialDraft.profile_url}
                        onChange={(e) => setSocialDraft({ ...socialDraft, profile_url: e.target.value })}
                      />
                    </div>
                    <p className="co-hint"><Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />Follower count is not manually entered. It should be synced from the platform when social API verification is connected.</p>
                    {socialError && <p className="co-hint" style={{ color: '#E8544E' }}>{socialError}</p>}
                    <button className="co-add-btn" onClick={addSocial} disabled={!socialDraft.username.trim() || !socialDraft.profile_url.trim()}>
                      <Plus size={14} /> Add account
                    </button>
                  </div>
                </>
              )}

              {/* ============================================
                  STEP 4 — PORTFOLIO
              ============================================ */}

              {step === 4 && (
                <>
                  <h2 className="co-h2">Portfolio</h2>
                  <p className="co-sub">Show brands your best work. Optional — you can add these later too.</p>

                  {portfolio.length > 0 && (
                    <div className="co-portfolio-list">
                      {portfolio.map((p, i) => (
                        <div className="co-portfolio-item" key={`${p.title}-${i}`}>
                          <span className="co-portfolio-thumb">
                            {p.media_url ? (
                              p.type === 'video' ? <Video size={16} /> : <img src={p.media_url} alt={p.title} />
                            ) : (
                              <ImageIcon size={16} />
                            )}
                          </span>
                          <span className="co-portfolio-main">
                            <div className="co-portfolio-item-title">{p.title}</div>
                            <div className="co-portfolio-item-desc">{p.description || p.type}</div>
                          </span>
                          <button className="co-social-remove" onClick={() => removePortfolioItem(i)}><Trash2 size={15} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="co-portfolio-form">
                    <div className="co-field" style={{ marginBottom: 10 }}>
                      <input className="co-input" placeholder="Title" value={portfolioDraft.title} onChange={(e) => setPortfolioDraft({ ...portfolioDraft, title: e.target.value })} />
                    </div>
                    <div className="co-field" style={{ marginBottom: 10 }}>
                      <textarea className="co-textarea" style={{ minHeight: 56 }} placeholder="Description (optional)" value={portfolioDraft.description} onChange={(e) => setPortfolioDraft({ ...portfolioDraft, description: e.target.value })} />
                    </div>

                    <div className="co-portfolio-upload-row">
                      <label className="co-portfolio-upload-btn" style={uploadingPortfolioImage ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                        <UploadCloud size={13} />
                        {uploadingPortfolioImage ? 'Uploading...' : 'Upload image'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploadingPortfolioImage}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePortfolioImageUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <span className="co-portfolio-or">or paste a link below</span>
                    </div>

                    <div className="co-social-form-row">
                      <input className="co-input" placeholder="Media URL" value={portfolioDraft.media_url} onChange={(e) => setPortfolioDraft({ ...portfolioDraft, media_url: e.target.value })} />
                      <select className="co-select" value={portfolioDraft.type} onChange={(e) => setPortfolioDraft({ ...portfolioDraft, type: e.target.value })}>
                        {PORTFOLIO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {portfolioError && (
                      <p className="co-hint" style={{ color: '#E8544E', marginBottom: 10 }}>
                        <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />{portfolioError}
                      </p>
                    )}

                    <button className="co-add-btn" onClick={addPortfolioItem} disabled={!portfolioDraft.title.trim() || !portfolioDraft.media_url.trim()}>
                      <Plus size={14} /> Add to portfolio
                    </button>
                  </div>
                </>
              )}

              {/* ============================================
                  STEP 5 — PUBLISH
              ============================================ */}

              {step === 5 && (
                <>
                  <h2 className="co-h2">Publish</h2>
                  <p className="co-sub">Review everything, set your starting price, and go live.</p>

                  <div className="co-recap">
                    <div className="co-recap-card">
                      <p className="co-recap-label">Basic Info</p>
                      <div className="co-recap-row">
                        <div className="co-avatar" style={{ width: 40, height: 40, fontSize: 15 }}>
                          {profileImage ? <img src={profileImage} alt="" /> : (displayName[0] || 'C').toUpperCase()}
                        </div>
                        <span>
                          <p className="co-recap-name">{displayName || 'Unnamed creator'}</p>
                          <p className="co-recap-sub">@{username || 'username'} · {location || 'No location'}</p>
                        </span>
                      </div>
                    </div>

                    <div className="co-recap-card">
                      <p className="co-recap-label">Type & Niche</p>
                      {creatorType && <p className="co-recap-sub" style={{ marginBottom: 8 }}>{creatorType}</p>}
                      <div className="co-recap-chips">
                        {[...categories, ...contentTypes].map((c) => <span className="co-chip" key={c}>{c}</span>)}
                      </div>
                    </div>

                    <div className="co-recap-card">
                      <p className="co-recap-label">Socials</p>
                      {socials.length === 0 ? (
                        <p className="co-recap-empty">None added</p>
                      ) : (
                        <p className="co-recap-sub">{socials.map((s) => `@${s.username} (${s.platform})`).join(', ')}</p>
                      )}
                    </div>

                    <div className="co-recap-card">
                      <p className="co-recap-label">Portfolio</p>
                      <p className="co-recap-empty">
                        {portfolio.length === 0 ? 'No items yet' : `${portfolio.length} item${portfolio.length > 1 ? 's' : ''} added`}
                      </p>
                    </div>
                  </div>

                  <div className="co-field">
                    <label className="co-label">Payout account *</label>
                    <p className="co-sub" style={{ marginBottom: 10 }}>
                      Add your payout account once. Approved campaign payments will be sent here automatically.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <input className="co-input" value={payoutAccountHolderName} onChange={(e) => setPayoutAccountHolderName(e.target.value)} placeholder="Account holder name" autoComplete="name" />
                      <input className="co-input" value={payoutProvider} onChange={(e) => setPayoutProvider(e.target.value)} placeholder="Bank / payment provider" />
                      <input className="co-input" value={payoutAccountNumber} onChange={(e) => setPayoutAccountNumber(e.target.value)} placeholder="Account number" inputMode="numeric" autoComplete="off" />
                      <input className="co-input" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} placeholder="Payout method (optional)" />
                      <input className="co-input" value={payoutBranch} onChange={(e) => setPayoutBranch(e.target.value)} placeholder="Branch (optional)" />
                      <input className="co-input" value={payoutRouting} onChange={(e) => setPayoutRouting(e.target.value)} placeholder="Routing information (optional)" />
                    </div>
                  </div>

                  <div className="co-field">
                    <label className="co-label">Starting price (per collab) *</label>
                    <div className="co-price-row">
                      <span className="co-price-prefix">Rs.</span>
                      <input type="number" min={0} value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} placeholder="5000" />
                    </div>
                  </div>

                  {error && <div className="co-error">{error}</div>}
                </>
              )}

              {/* ============================================
                  FOOTER NAV
              ============================================ */}

              <div className="co-footer">
                {step > 1 ? (
                  <button className="co-back" onClick={() => setStep(step - 1)}>
                    <ArrowLeft size={14} /> Previous
                  </button>
                ) : <span />}

                {step < 5 ? (
                  <button
                    className="co-continue"
                    disabled={
                      (step === 1 && !canContinueStep1) ||
                      (step === 2 && !canContinueStep2) ||
                      (step === 3 && !canContinueStep3) ||
                      (step === 4 && !canContinueStep4)
                    }
                    onClick={() => {
                      if (step === 1) saveStep1Progress()?.catch((e) => console.error(e));
                      if (step === 2) saveStep2Progress()?.catch((e) => console.error(e));
                      if (step === 3) saveStep3Progress()?.catch((e) => console.error(e));
                      if (step === 4) saveStep4Progress()?.catch((e) => console.error(e));
                      setStep(step + 1);
                    }}
                  >
                    Next <ArrowRight size={15} />
                  </button>
                ) : (
                  <button className="co-continue" disabled={!canFinish || isSubmitting} onClick={handleFinish}>
                    {isSubmitting ? 'Publishing...' : 'Publish Profile'}
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>

            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default CreatorOnboarding;
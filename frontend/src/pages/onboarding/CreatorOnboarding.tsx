import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Camera,
  Plus,
  CheckCircle2,
  Info,
  Trash2,
  Globe,
} from 'lucide-react';

import { completeCreatorOnboarding } from '../../api/client';
import type { CreatorOnboardingData } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// TYPES
// ============================================================

interface Social {
  platform: string;
  username: string;
  profile_url: string;
  follower_count: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const VIOLET = '#6C5DD3';
const CORAL = '#FF8A5B';
const CORAL_DARK = '#E86B3E';

const LANGUAGES = [
  'English',
  'Nepali',
  'Hindi',
  'Newari',
  'Maithili',
];

const INTERESTS = [
  'Travel',
  'Food',
  'Fashion',
  'Beauty',
  'Tech',
  'Fitness',
  'Gaming',
  'Music',
  'Home',
  'Wellness',
];

const CATEGORIES = [
  'Beauty',
  'Fashion',
  'Food',
  'Fitness',
  'Tech',
  'Travel',
  'Gaming',
  'Music',
  'Home',
  'Wellness',
];

const CONTENT_TYPES = [
  'Reels',
  'Photos',
  'Stories',
  'YouTube Videos',
  'Shorts',
  'Reviews',
  'UGC',
];

const CREATOR_TYPES = [
  'Influencer',
  'UGC Creator',
  'Content Creator',
  'Model',
  'Photographer',
  'Videographer',
  'Other',
];

const AUDIENCE_AGE_RANGES = [
  '13-17',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+',
];

const AUDIENCE_LOCATIONS = [
  'Kathmandu',
  'Pokhara',
  'Lalitpur',
  'Bhaktapur',
  'Chitwan',
  'Biratnagar',
  'Nationwide',
  'International',
];

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;

const PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    handleLabel: 'Followers',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    handleLabel: 'Subscribers',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    handleLabel: 'Followers',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    handleLabel: 'Followers',
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    handleLabel: 'Followers',
  },
  {
    id: 'other',
    label: 'Other',
    handleLabel: 'Followers',
  },
];

// ============================================================
// LOGO
// ============================================================

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="10" cy="13" r="8" fill={VIOLET} />
      <circle
        cx="17"
        cy="9"
        r="6"
        fill={CORAL}
        fillOpacity={0.9}
      />
    </svg>
  );
}

// ============================================================
// CHIP
// ============================================================

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      className={`co-chip ${active ? 'co-chip-active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ============================================================
// STEP HEADER
// ============================================================

function StepHeader({ step }: { step: number }) {
  const steps = [
    'About you',
    'Audience',
    'Social media',
    'Creator profile',
  ];

  return (
    <div className="co-steps">
      {steps.map((label, index) => {
        const number = index + 1;

        const state =
          number < step
            ? 'done'
            : number === step
              ? 'active'
              : 'upcoming';

        return (
          <div className="co-step" key={label}>
            <span className={`co-step-dot co-step-${state}`}>
              {state === 'done' ? (
                <CheckCircle2 size={14} />
              ) : (
                number
              )}
            </span>

            <span
              className={`co-step-label co-step-label-${state}`}
            >
              {label}
            </span>

            {number < steps.length && (
              <span
                className={`co-step-line ${
                  number < step
                    ? 'co-step-line-done'
                    : ''
                }`}
              />
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
  // STEP 1 — About you
  // ----------------------------------------------------------

  const [profileImage, setProfileImage] =
    useState<string | null>(null);

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
  // STEP 2 — Audience
  // ----------------------------------------------------------

  const [creatorType, setCreatorType] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [audienceAgeRanges, setAudienceAgeRanges] = useState<string[]>([]);
  const [audienceLocations, setAudienceLocations] = useState<string[]>([]);

  // ----------------------------------------------------------
  // STEP 3 — Social media
  // ----------------------------------------------------------

  const [socials, setSocials] = useState<Social[]>([]);

  const [socialDraft, setSocialDraft] = useState({
    platform: 'instagram',
    username: '',
    profile_url: '',
    follower_count: '',
  });

  // ----------------------------------------------------------
  // STEP 4 — Creator profile
  // ----------------------------------------------------------

  const [categories, setCategories] = useState<string[]>([]);
  const [contentTypes, setContentTypes] =
    useState<string[]>([]);

  const [startingPrice, setStartingPrice] =
    useState('');

  // ==========================================================
  // HELPERS
  // ==========================================================

  const toggle = (
    list: string[],
    setList: (value: string[]) => void,
    value: string
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  // Same chip UI as `toggle`, but single-select — picking a new value
  // replaces the old one; picking the same value again clears it.
  const toggleSingle = (
    current: string,
    setValue: (value: string) => void,
    value: string
  ) => {
    setValue(current === value ? '' : value);
  };

  // Lets a creator finish onboarding later. We don't save anything
  // yet — just drop them at the dashboard, where the "Complete Profile"
  // nudge card sends them straight back into this flow.
  const handleSkip = () => {
    navigate('/dashboard');
  };

  // Push what's been filled in so far into AuthContext, so the
  // Dashboard's profile-completion % updates immediately — even if
  // the creator abandons onboarding partway through and comes back
  // later. `updateProfile` merges (doesn't replace) into user.profile.
  // Keys match the backend's field names (see CreatorOnboardingComplete)
  // so the final payload in handleFinish and these partial saves stay
  // in sync with what Dashboard.tsx checks for completion.
  const saveStep1Progress = () => {
    updateProfile?.({
      display_name: displayName.trim(),
      username: username.trim(),
      bio: bio.trim(),
      location: location.trim(),
    });
  };

  const saveStep2Progress = () => {
    updateProfile?.({
      creator_type: creatorType,
      content_languages: languages,
      audience_interests: interests,
      audience_age_range: audienceAgeRanges,
      audience_location: audienceLocations,
    });
  };

  const saveStep3Progress = () => {
    updateProfile?.({ socials });
  };

  // ==========================================================
  // SOCIAL MEDIA
  // ==========================================================

  const addSocial = () => {
    if (!socialDraft.username.trim()) {
      return;
    }

    const newSocial: Social = {
      platform: socialDraft.platform,
      username: socialDraft.username.trim(),
      profile_url: socialDraft.profile_url.trim(),
      follower_count:
        Number(socialDraft.follower_count) || 0,
    };

    setSocials([...socials, newSocial]);

    setSocialDraft({
      platform: 'instagram',
      username: '',
      profile_url: '',
      follower_count: '',
    });
  };

  const removeSocial = (index: number) => {
    setSocials(
      socials.filter((_, i) => i !== index)
    );
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
    languages.length > 0 &&
    interests.length > 0 &&
    audienceAgeRanges.length > 0 &&
    audienceLocations.length > 0;

  const canContinueStep3 =
    socials.length > 0;

  const canFinish =
    categories.length > 0 &&
    contentTypes.length > 0 &&
    startingPrice !== '';

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
      audience_interests: interests,
      socials,
      // Portfolio isn't collected by this flow yet — backend defaults
      // to an empty list, sending it explicitly just documents intent.
      portfolio: [],
      starting_price: Number(startingPrice) || 0,
    };

    try {
      console.log(
        'Sending creator onboarding data:',
        payload
      );

      const response =
        await completeCreatorOnboarding(payload);

      console.log(
        'Creator onboarding complete:',
        response
      );

      // Final sync — mirrors the full payload into context so the
      // dashboard shows 100% (well, whatever the formula caps at)
      // without waiting on a refetch.
      updateProfile?.(payload);

      setDone(true);
    } catch (err: any) {
      console.error(
        'Creator onboarding failed:',
        err
      );

      setError(
        err?.response?.data?.detail ||
          'Failed to complete profile. Please try again.'
      );
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
          --accent-soft: #FFEEE5;
          --coral: #FF8A5B;
          --good: #16a34a;

          font-family:
            Inter,
            Poppins,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          color: var(--ink);
          min-height: 100vh;

          background: #fbfaff;

          padding: 40px 20px 80px;

          -webkit-font-smoothing: antialiased;
        }

        .co * {
          box-sizing: border-box;
        }

        .co button {
          font-family: inherit;
          cursor: pointer;
        }

        .co-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          margin: 0 auto 34px;
          font-size: 15px;
          color: var(--ink);
          background: none;
          border: none;
          padding: 6px 10px;
          border-radius: 8px;
        }

        .co-brand-clickable {
          cursor: pointer;
          transition: opacity .15s ease;
        }

        .co-brand-clickable:hover {
          opacity: .7;
        }

        .co-logo {
          font-family: 'League Spartan', sans-serif;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .co-card {
          max-width: 560px;
          margin: 0 auto;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 36px 40px 40px;
          box-shadow:
            0 30px 60px -24px rgba(232,108,62,0.16),
            0 4px 14px rgba(17,18,23,0.04);
        }

        .co-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 34px;
        }

        .co-topbar .co-steps {
          flex: 1;
          margin-bottom: 0;
        }

        .co-skip-link {
          flex-shrink: 0;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink-soft);
          padding: 4px 2px;
          margin-top: 2px;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .co-skip-link:hover {
          color: var(--accent);
        }

        .co-steps {
          display: flex;
          align-items: center;
          margin-bottom: 34px;
        }

        .co-step {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .co-step:last-child {
          flex: 0;
        }

        .co-step-dot {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .co-step-upcoming {
          background: var(--surface);
          color: var(--ink-soft);
          border: 1.5px solid var(--line);
        }

        .co-step-active {
          background: var(--accent);
          color: #fff;
        }

        .co-step-done {
          background: var(--good);
          color: #fff;
        }

        .co-step-label {
          font-size: 12.5px;
          font-weight: 600;
          margin-left: 8px;
          white-space: nowrap;
          color: var(--ink-soft);
        }

        .co-step-label-active,
        .co-step-label-done {
          color: var(--ink);
        }

        .co-step-line {
          flex: 1;
          height: 1.5px;
          background: var(--line);
          margin: 0 12px;
        }

        .co-step-line-done {
          background: var(--accent);
        }

        .co-h2 {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 5px;
        }

        .co-sub {
          font-size: 13px;
          color: var(--ink-soft);
          margin: 0 0 28px;
          line-height: 1.5;
        }

        .co-field {
          margin-bottom: 20px;
        }

        .co-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 8px;
        }

        .co-hint {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin-top: 6px;
          display: flex;
          align-items: flex-start;
          gap: 5px;
          line-height: 1.5;
        }

        .co-input,
        .co-textarea,
        .co-select {
          width: 100%;
          border: 1.5px solid var(--line);
          border-radius: 9px;
          padding: 11px 13px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--ink);
          background: #fff;
        }

        .co-input:focus,
        .co-textarea:focus,
        .co-select:focus {
          outline: none;
          border-color: var(--accent);
        }

        .co-textarea {
          resize: vertical;
          min-height: 76px;
          line-height: 1.5;
        }

        .co-avatar-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .co-avatar {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: var(--accent-soft);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          font-size: 22px;
          font-weight: 700;
        }

        .co-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .co-avatar-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink);
          background: #fff;
          border: 1.5px solid var(--line);
          padding: 9px 14px;
          border-radius: 8px;
        }

        .co-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .co-chip {
          font-size: 12.5px;
          font-weight: 500;
          color: var(--ink);
          background: var(--surface);
          border: 1.5px solid var(--line);
          padding: 7px 13px;
          border-radius: 100px;
        }

        .co-chip-active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .co-social-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }

        .co-social-item {
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 10px 12px;
        }

        .co-social-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: var(--accent-soft);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
        }

        .co-social-main {
          flex: 1;
          min-width: 0;
        }

        .co-social-handle {
          font-size: 13px;
          font-weight: 600;
        }

        .co-social-meta {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin-top: 1px;
        }

        .co-social-remove {
          background: none;
          border: none;
          color: var(--ink-soft);
          padding: 6px;
          border-radius: 6px;
        }

        .co-social-form {
          border: 1.5px dashed var(--line);
          border-radius: 12px;
          padding: 16px;
        }

        .co-social-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }

        .co-add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: var(--accent-soft);
          color: var(--accent);
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
        }

        .co-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .co-price-row {
          display: flex;
          align-items: center;
          border: 1.5px solid var(--line);
          border-radius: 9px;
          overflow: hidden;
        }

        .co-price-prefix {
          background: var(--surface);
          padding: 11px 13px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-soft);
          border-right: 1px solid var(--line);
        }

        .co-price-row input {
          border: none;
          flex: 1;
          padding: 11px 13px;
          font-size: 13.5px;
          font-family: inherit;
        }

        .co-price-row input:focus {
          outline: none;
        }

        .co-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 30px;
          padding-top: 22px;
          border-top: 1px solid var(--line);
        }

        .co-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-soft);
          background: none;
          border: none;
          padding: 8px 4px;
        }

        .co-continue {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
        }

        .co-continue:disabled {
          background: #ffd3bb;
          cursor: not-allowed;
        }

        .co-done {
          text-align: center;
          padding: 20px 0 10px;
        }

        .co-done-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #E1F6EA;
          color: #16A34A;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .co-done-title {
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .co-done-sub {
          font-size: 14px;
          color: var(--ink-soft);
          margin: 0 0 28px;
        }

        .co-done-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          background: var(--accent);
          border: none;
          padding: 13px 26px;
          border-radius: 8px;
        }

        .co-error {
          margin-top: 16px;
          padding: 12px;
          background: #fdecee;
          color: #d1293d;
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .co {
            padding: 20px 12px 50px;
          }

          .co-card {
            padding: 25px 20px 30px;
          }

          .co-step-label {
            display: none;
          }

          .co-social-form-row {
            grid-template-columns: 1fr;
          }

          .co-topbar {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .co-skip-link {
            align-self: flex-end;
          }
        }
      `}</style>

      {/* ======================================================
          BRAND — click to jump straight to the dashboard
      ====================================================== */}

      <button
        type="button"
        className="co-brand co-brand-clickable"
        onClick={() => navigate('/dashboard')}
      >
        <LogoMark size={20} />
        <span className="co-logo">
          creatorhub
        </span>
      </button>

      <div className="co-card">

        {/* ====================================================
            COMPLETED
        ==================================================== */}

        {done ? (
          <div className="co-done">

            <div className="co-done-icon">
              <CheckCircle2 size={30} />
            </div>

            <p className="co-done-title">
              Profile complete
            </p>

            <p className="co-done-sub">
              Welcome to CreatorHub!
            </p>

            <button
              className="co-done-btn"
              onClick={() =>
                navigate('/dashboard')
              }
            >
              Go to Dashboard
              <ArrowRight size={15} />
            </button>

          </div>
        ) : (
          <>
            <div className="co-topbar">
              <StepHeader step={step} />

              <button
                type="button"
                className="co-skip-link"
                onClick={handleSkip}
              >
                Skip for now
              </button>
            </div>

            {/* =================================================
                STEP 1
            ================================================= */}

            {step === 1 && (
              <>
                <h2 className="co-h2">
                  Welcome 👋
                </h2>

                <p className="co-sub">
                  Let's set up your creator profile so
                  businesses know who they're working with.
                </p>

                {/* PROFILE IMAGE */}

                <div className="co-field">

                  <label className="co-label">
                    Profile picture
                  </label>

                  <div className="co-avatar-row">

                    <div className="co-avatar">

                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Profile"
                        />
                      ) : (
                        'C'
                      )}

                    </div>

                    <label className="co-avatar-btn">

                      <Camera size={14} />

                      Upload photo

                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(event) => {

                          const file =
                            event.target.files?.[0];

                          if (!file) return;

                          const imageUrl =
                            URL.createObjectURL(file);

                          setProfileImage(imageUrl);

                        }}
                      />

                    </label>

                  </div>

                </div>

                {/* DISPLAY NAME */}

                <div className="co-field">

                  <label className="co-label">
                    Display name
                  </label>

                  <input
                    className="co-input"
                    placeholder="How businesses will see your name"
                    value={displayName}
                    onChange={(event) =>
                      setDisplayName(event.target.value)
                    }
                  />

                </div>

                {/* USERNAME */}

                <div className="co-field">

                  <label className="co-label">
                    Username
                  </label>

                  <input
                    className="co-input"
                    placeholder="yourname"
                    value={username}
                    onChange={(event) =>
                      handleUsernameChange(event.target.value)
                    }
                  />

                  <p className="co-hint">

                    <Info
                      size={13}
                      style={{
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    />

                    {usernameError
                      ? usernameError
                      : "This becomes your CreatorHub profile URL — 3–24 characters, letters, numbers, and underscores only."}

                  </p>

                </div>

                {/* BIO */}

                <div className="co-field">

                  <label className="co-label">
                    Bio
                  </label>

                  <textarea
                    className="co-textarea"
                    placeholder="Tell businesses a bit about who you are and what you create..."
                    value={bio}
                    onChange={(event) =>
                      setBio(event.target.value)
                    }
                  />

                </div>

                {/* LOCATION */}

                <div
                  className="co-field"
                  style={{ marginBottom: 4 }}
                >

                  <label className="co-label">
                    Location
                  </label>

                  <input
                    className="co-input"
                    placeholder="Kathmandu, Nepal"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value)
                    }
                  />

                </div>

                <div
                  className="co-footer"
                  style={{
                    justifyContent: 'flex-end',
                  }}
                >

                  <button
                    className="co-continue"
                    disabled={!canContinueStep1}
                    onClick={() => {
                      saveStep1Progress();
                      setStep(2);
                    }}
                  >
                    Continue
                    <ArrowRight size={15} />
                  </button>

                </div>

              </>
            )}

            {/* =================================================
                STEP 2 — AUDIENCE
            ================================================= */}

            {step === 2 && (
              <>
                <h2 className="co-h2">
                  Tell us about your audience
                </h2>

                <p className="co-sub">
                  This helps businesses understand who
                  your content reaches.
                </p>

                {/* CREATOR TYPE */}

                <div className="co-field">

                  <label className="co-label">
                    Creator type
                  </label>

                  <div className="co-chips">

                    {CREATOR_TYPES.map((type) => (

                      <Chip
                        key={type}
                        label={type}
                        active={creatorType === type}
                        onClick={() =>
                          toggleSingle(
                            creatorType,
                            setCreatorType,
                            type
                          )
                        }
                      />

                    ))}

                  </div>

                </div>

                {/* LANGUAGES */}

                <div className="co-field">

                  <label className="co-label">
                    Languages you create in
                  </label>

                  <div className="co-chips">

                    {LANGUAGES.map((language) => (

                      <Chip
                        key={language}
                        label={language}
                        active={languages.includes(
                          language
                        )}
                        onClick={() =>
                          toggle(
                            languages,
                            setLanguages,
                            language
                          )
                        }
                      />

                    ))}

                  </div>

                </div>

                {/* AUDIENCE INTERESTS */}

                <div className="co-field">

                  <label className="co-label">
                    What does your audience care about?
                  </label>

                  <div className="co-chips">

                    {INTERESTS.map((interest) => (

                      <Chip
                        key={interest}
                        label={interest}
                        active={interests.includes(
                          interest
                        )}
                        onClick={() =>
                          toggle(
                            interests,
                            setInterests,
                            interest
                          )
                        }
                      />

                    ))}

                  </div>

                </div>

                {/* AUDIENCE AGE RANGE */}

                <div className="co-field">

                  <label className="co-label">
                    Audience age range
                  </label>

                  <div className="co-chips">

                    {AUDIENCE_AGE_RANGES.map((range) => (

                      <Chip
                        key={range}
                        label={range}
                        active={audienceAgeRanges.includes(
                          range
                        )}
                        onClick={() =>
                          toggle(
                            audienceAgeRanges,
                            setAudienceAgeRanges,
                            range
                          )
                        }
                      />

                    ))}

                  </div>

                </div>

                {/* AUDIENCE LOCATION */}

                <div
                  className="co-field"
                  style={{ marginBottom: 4 }}
                >

                  <label className="co-label">
                    Where is your audience based?
                  </label>

                  <div className="co-chips">

                    {AUDIENCE_LOCATIONS.map((place) => (

                      <Chip
                        key={place}
                        label={place}
                        active={audienceLocations.includes(
                          place
                        )}
                        onClick={() =>
                          toggle(
                            audienceLocations,
                            setAudienceLocations,
                            place
                          )
                        }
                      />

                    ))}

                  </div>

                </div>

                <div className="co-footer">

                  <button
                    type="button"
                    className="co-back"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>

                  <button
                    className="co-continue"
                    disabled={!canContinueStep2}
                    onClick={() => {
                      saveStep2Progress();
                      setStep(3);
                    }}
                  >
                    Continue
                    <ArrowRight size={15} />
                  </button>

                </div>

              </>
            )}

            {/* =================================================
                STEP 3 — SOCIAL MEDIA
            ================================================= */}

            {step === 3 && (
              <>
                <h2 className="co-h2">
                  Connect your social profiles
                </h2>

                <p className="co-sub">
                  Add every platform where you post
                  content. You can add more later.
                </p>

                {/* EXISTING SOCIALS */}

                {socials.length > 0 && (

                  <div className="co-social-list">

                    {socials.map((social, index) => {

                      const platform =
                        PLATFORMS.find(
                          (item) =>
                            item.id === social.platform
                        );

                      return (
                        <div
                          className="co-social-item"
                          key={`${social.platform}-${index}`}
                        >

                          <span className="co-social-icon">

                            {social.platform
                              .substring(0, 2)
                              .toUpperCase()}

                          </span>

                          <span className="co-social-main">

                            <div className="co-social-handle">
                              {social.username}
                            </div>

                            <div className="co-social-meta">

                              {platform?.label ||
                                social.platform}

                              {' · '}

                              {social.follower_count.toLocaleString()}

                              {' '}

                              {(
                                platform?.handleLabel ||
                                'Followers'
                              ).toLowerCase()}

                            </div>

                          </span>

                          <button
                            type="button"
                            className="co-social-remove"
                            onClick={() =>
                              removeSocial(index)
                            }
                          >
                            <Trash2 size={14} />
                          </button>

                        </div>
                      );

                    })}

                  </div>

                )}

                {/* ADD SOCIAL */}

                <div className="co-social-form">

                  <div className="co-social-form-row">

                    <select
                      className="co-select"
                      value={socialDraft.platform}
                      onChange={(event) =>
                        setSocialDraft({
                          ...socialDraft,
                          platform:
                            event.target.value,
                        })
                      }
                    >

                      {PLATFORMS.map((platform) => (

                        <option
                          value={platform.id}
                          key={platform.id}
                        >
                          {platform.label}
                        </option>

                      ))}

                    </select>

                    <input
                      className="co-input"
                      placeholder="@username"
                      value={socialDraft.username}
                      onChange={(event) =>
                        setSocialDraft({
                          ...socialDraft,
                          username:
                            event.target.value,
                        })
                      }
                    />

                  </div>

                  <div
                    className="co-social-form-row"
                    style={{ marginBottom: 12 }}
                  >

                    <input
                      className="co-input"
                      placeholder="Profile URL"
                      value={socialDraft.profile_url}
                      onChange={(event) =>
                        setSocialDraft({
                          ...socialDraft,
                          profile_url:
                            event.target.value,
                        })
                      }
                    />

                    <input
                      className="co-input"
                      type="number"
                      min="0"
                      placeholder={
                        PLATFORMS.find(
                          (p) =>
                            p.id ===
                            socialDraft.platform
                        )?.handleLabel ||
                        'Followers'
                      }
                      value={
                        socialDraft.follower_count
                      }
                      onChange={(event) =>
                        setSocialDraft({
                          ...socialDraft,
                          follower_count:
                            event.target.value,
                        })
                      }
                    />

                  </div>

                  <button
                    type="button"
                    className="co-add-btn"
                    onClick={addSocial}
                    disabled={
                      !socialDraft.username.trim()
                    }
                  >
                    <Plus size={14} />
                    Add platform
                  </button>

                  <p className="co-hint">

                    <Info
                      size={13}
                      style={{
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    />

                    Follower and subscriber counts
                    are self-reported for now.

                  </p>

                </div>

                {/* FOOTER */}

                <div className="co-footer">

                  <button
                    type="button"
                    className="co-back"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>

                  <button
                    type="button"
                    className="co-continue"
                    disabled={!canContinueStep3}
                    onClick={() => {
                      saveStep3Progress();
                      setStep(4);
                    }}
                  >
                    Continue
                    <ArrowRight size={15} />
                  </button>

                </div>

              </>
            )}

            {/* =================================================
                STEP 4 — CREATOR PROFILE
            ================================================= */}

            {step === 4 && (
              <>
                <h2 className="co-h2">
                  What do you create?
                </h2>

                <p className="co-sub">
                  This helps businesses find creators
                  that fit their campaign.
                </p>

                {/* CATEGORIES */}

                <div className="co-field">

                  <label className="co-label">
                    Categories
                  </label>

                  <div className="co-chips">

                    {CATEGORIES.map((category) => (

                      <Chip
                        key={category}
                        label={category}
                        active={categories.includes(
                          category
                        )}
                        onClick={() =>
                          toggle(
                            categories,
                            setCategories,
                            category
                          )
                        }
                      />

                    ))}

                  </div>

                </div>

                {/* CONTENT TYPES */}

                <div className="co-field">

                  <label className="co-label">
                    Content types
                  </label>

                  <div className="co-chips">

                    {CONTENT_TYPES.map(
                      (contentType) => (

                        <Chip
                          key={contentType}
                          label={contentType}
                          active={contentTypes.includes(
                            contentType
                          )}
                          onClick={() =>
                            toggle(
                              contentTypes,
                              setContentTypes,
                              contentType
                            )
                          }
                        />

                      )
                    )}

                  </div>

                </div>

                {/* PRICE */}

                <div
                  className="co-field"
                  style={{ marginBottom: 4 }}
                >

                  <label className="co-label">
                    Starting price
                  </label>

                  <div className="co-price-row">

                    <span className="co-price-prefix">
                      NPR
                    </span>

                    <input
                      type="number"
                      min="0"
                      placeholder="5000"
                      value={startingPrice}
                      onChange={(event) =>
                        setStartingPrice(
                          event.target.value
                        )
                      }
                    />

                  </div>

                  <p className="co-hint">

                    <Info
                      size={13}
                      style={{
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    />

                    What you'd typically charge
                    for a single deliverable.

                  </p>

                </div>

                {/* ERROR */}

                {error && (
                  <div className="co-error">
                    ❌ {error}
                  </div>
                )}

                {/* FOOTER */}

                <div className="co-footer">

                  <button
                    type="button"
                    className="co-back"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>

                  <button
                    type="button"
                    className="co-continue"
                    disabled={
                      !canFinish ||
                      isSubmitting
                    }
                    onClick={handleFinish}
                  >

                    {isSubmitting
                      ? 'Saving...'
                      : 'Complete Profile'}

                    <ArrowRight size={15} />

                  </button>

                </div>

              </>
            )}

          </>
        )}

      </div>
    </div>
  );
}

export default CreatorOnboarding;
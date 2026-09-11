import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Info,
  Save,
  MapPin,
} from 'lucide-react';

import {
  completeBusinessOnboarding,
  getBusinessProgress,
  saveBusinessProgress,
  uploadImage,
} from '../../api/client';
import type { BusinessOnboardingData } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LogoMark, BRAND_NAME, BRAND_PURPLE, BRAND_PURPLE_DARK, BRAND_PINK_CORAL } from '../../components/Logo';

// ============================================================
// CONSTANTS
// ============================================================

const BRAND_LAVENDER = BRAND_PURPLE;
const BRAND_LAVENDER_DARK = BRAND_PURPLE_DARK;
const BRAND_CORAL = BRAND_PINK_CORAL;

// NOTE: "Business type" and "Industry" were two chip lists asking the
// same underlying question, so they've been merged into one field:
// `industry`. Anything downstream (validation, resume logic, payload,
// recap) has been updated to only reference `industry`.
const INDUSTRIES = [
  'Retail & E-commerce', 'Agency', 'SaaS', 'Food & Beverage',
  'Beauty & Wellness', 'Fashion & Apparel', 'Tech & IT',
  'Travel & Hospitality', 'Education', 'Healthcare', 'Real Estate',
  'Finance', 'Entertainment', 'Non-Profit', 'Automotive', 'Other',
];

const INTERESTED_CATEGORIES = [
  'Beauty', 'Fashion', 'Lifestyle', 'Food', 'Tech', 'Fitness', 'Travel',
  'Gaming', 'Education', 'Finance', 'Wellness', 'Skincare', 'Home Decor',
  'Parenting', 'Entertainment',
];

const CONTENT_TYPES = [
  'Reels', 'Photos', 'Stories', 'YouTube Videos', 'Shorts', 'UGC', 'Reviews',
];

const TEAM_SIZES = ['Just me', '2–10', '11–50', '51–200', '200+'];

// Static suggestion list for the location autocomplete. Swap this out
// for a real places API later if you want broader / live results —
// this keeps it dependency-free for now.
const LOCATION_SUGGESTIONS = [
  'Kathmandu, Nepal', 'Lalitpur, Nepal', 'Bhaktapur, Nepal', 'Pokhara, Nepal',
  'Biratnagar, Nepal', 'Birgunj, Nepal', 'Dharan, Nepal', 'Bharatpur, Nepal',
  'Butwal, Nepal', 'Hetauda, Nepal', 'Nepalgunj, Nepal', 'Itahari, Nepal',
  'Janakpur, Nepal', 'Dhangadhi, Nepal', 'Tulsipur, Nepal', 'Ghorahi, Nepal',
  'Birendranagar, Nepal', 'Kalaiya, Nepal', 'Damak, Nepal', 'Dhulikhel, Nepal',
];

// Figures out which step to land on when resuming.
function resolveBusinessStep(profile: Record<string, any> | null | undefined): number {
  if (!profile) return 1;

  const step1Done =
    Boolean(profile.company_name?.trim?.()) &&
    Boolean(profile.industry) &&
    Boolean(profile.location?.trim?.());
  if (!step1Done) return 1;

  const step2Done = Boolean(profile.description?.trim?.());
  if (!step2Done) return 2;

  const step3Done =
    Array.isArray(profile.interested_categories) && profile.interested_categories.length > 0 &&
    Array.isArray(profile.preferred_content_types) && profile.preferred_content_types.length > 0 &&
    Boolean(profile.team_size);
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

// Shows up to `limit` chips by default; if there are more, a
// "+N more" chip expands the full list (and can collapse back).
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
              // onMouseDown fires before the input's onBlur closes the list
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

const STEP_LABELS = ['Basic Info', 'About & Contact', 'Preferences', 'Publish'];

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

export function BusinessOnboarding() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ----------------------------------------------------------
  // STEP 1 — Basic Info
  // ----------------------------------------------------------

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(user?.profile?.company_name ?? '');
  const [industry, setIndustry] = useState(''); // replaces old businessType + industry pair
  const [location, setLocation] = useState('');

  // ----------------------------------------------------------
  // STEP 2 — About & Contact
  // ----------------------------------------------------------

  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // ----------------------------------------------------------
  // STEP 3 — Preferences
  // ----------------------------------------------------------

  const [interestedCategories, setInterestedCategories] = useState<string[]>([]);
  const [preferredContentTypes, setPreferredContentTypes] = useState<string[]>([]);
  const [typicalBudget, setTypicalBudget] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [yearEstablished, setYearEstablished] = useState('');

  // ----------------------------------------------------------
  // RESUME PROGRESS / LOGO UPLOAD / SAVE DRAFT STATE
  // ----------------------------------------------------------

  const [loadingProgress, setLoadingProgress] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  // ==========================================================
  // RESUME WHERE YOU LEFT OFF
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadProgress = async () => {
      try {
        const saved = await getBusinessProgress();
        const profile = saved?.profile ?? user?.profile ?? null;

        if (!cancelled && profile) {
          setLogoUrl(profile.logo_url ?? null);
          setCompanyName(profile.company_name ?? '');
          setIndustry(profile.industry ?? profile.business_type ?? '');
          setLocation(profile.location ?? '');

          setDescription(profile.description ?? '');
          setWebsite(profile.website ?? '');
          setContactPhone(profile.contact_phone ?? '');

          setInterestedCategories(profile.interested_categories ?? []);
          setPreferredContentTypes(profile.preferred_content_types ?? []);
          setTypicalBudget(
            profile.typical_budget !== null && profile.typical_budget !== undefined
              ? String(profile.typical_budget)
              : ''
          );
          setTeamSize(profile.team_size ?? '');
          setYearEstablished(
            profile.year_established !== null && profile.year_established !== undefined
              ? String(profile.year_established)
              : ''
          );

          setStep(resolveBusinessStep(profile));
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
      logo_url: logoUrl,
      company_name: companyName.trim(),
      industry,
      location: location.trim(),
    };
    updateProfile?.(payload);
    return saveBusinessProgress(payload);
  };

  const saveStep2Progress = () => {
    const payload = {
      description: description.trim(),
      website: website.trim(),
      contact_phone: contactPhone.trim(),
    };
    updateProfile?.(payload);
    return saveBusinessProgress(payload);
  };

  const saveStep3Progress = () => {
    const payload = {
      interested_categories: interestedCategories,
      preferred_content_types: preferredContentTypes,
      typical_budget: typicalBudget ? Number(typicalBudget) : undefined,
      team_size: teamSize,
      year_established: yearEstablished ? Number(yearEstablished) : undefined,
    };
    updateProfile?.(payload);
    return saveBusinessProgress(payload);
  };

  const saveCurrentStepProgress = () => {
    if (step === 1) return saveStep1Progress();
    if (step === 2) return saveStep2Progress();
    if (step === 3) return saveStep3Progress();
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
  // VALIDATION
  // ==========================================================

  const canContinueStep1 =
    companyName.trim().length > 0 &&
    industry !== '' &&
    location.trim().length > 0;

  const canContinueStep2 = description.trim().length > 0;

  const canContinueStep3 =
    interestedCategories.length > 0 &&
    preferredContentTypes.length > 0 &&
    teamSize !== '';

  const canFinish = true;

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError('');

    const payload: BusinessOnboardingData = {
      company_name: companyName.trim(),
      industry,
      location: location.trim(),
      website: website.trim(),
      description: description.trim(),
      logo_url: logoUrl || undefined,
      contact_phone: contactPhone.trim(),
      interested_categories: interestedCategories,
      preferred_content_types: preferredContentTypes,
      typical_budget: typicalBudget ? Number(typicalBudget) : undefined,
      team_size: teamSize,
      year_established: yearEstablished ? Number(yearEstablished) : undefined,
    };

    try {
      const response = await completeBusinessOnboarding(payload);
      console.log('Business onboarding complete:', response);
      updateProfile?.(payload);
      setDone(true);
    } catch (err: any) {
      console.error('Business onboarding failed:', err);
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
          --accent: ${BRAND_LAVENDER};
          --accent-hover: ${BRAND_LAVENDER_DARK};
          --accent-soft: #F0EBF6;
          --coral: ${BRAND_CORAL};
          --good: #16a34a;

          font-family: Inter, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
          min-height: 100vh;
          background: #fbfaff;
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
          width: 68px; height: 68px; border-radius: 16px;
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
        .co-continue:disabled { background: #b9bcdd; cursor: not-allowed; }

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
                  <p className="co-sub">Tell us about your business — this is what creators will see first.</p>

                  <div className="co-field">
                    <label className="co-label">Company logo</label>
                    <div className="co-avatar-row">
                      <div className="co-avatar">
                        {logoUrl ? <img src={logoUrl} alt="Logo" /> : <Camera size={22} />}
                      </div>
                      <label className="co-avatar-btn" style={uploadingLogo ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
                        <Camera size={14} />
                        {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploadingLogo}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setLogoError('');
                            setUploadingLogo(true);
                            try {
                              const { url } = await uploadImage(file);
                              setLogoUrl(url);
                            } catch (err: any) {
                              console.error('Logo upload failed:', err);
                              setLogoError(err?.response?.data?.detail || 'Could not upload logo. Please try again.');
                            } finally {
                              setUploadingLogo(false);
                              event.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="co-hint"><Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />JPG, PNG or WebP — up to 20 MB</p>
                    {logoError && (
                      <p className="co-hint" style={{ color: '#E8544E' }}>
                        <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />{logoError}
                      </p>
                    )}
                  </div>

                  <div className="co-field">
                    <label className="co-label">Company Name *</label>
                    <input className="co-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company's name" />
                  </div>

                  <p className="co-section-label">Industry *</p>
                  <div style={{ marginBottom: 22 }}>
                    <ChipGroup
                      items={INDUSTRIES}
                      isActive={(item) => industry === item}
                      onToggle={(item) => toggleSingle(industry, setIndustry, item)}
                    />
                  </div>

                  <div className="co-field">
                    <label className="co-label">Location *</label>
                    <LocationAutocomplete value={location} onChange={setLocation} />
                  </div>
                </>
              )}

              {/* ============================================
                  STEP 2 — ABOUT & CONTACT
              ============================================ */}

              {step === 2 && (
                <>
                  <h2 className="co-h2">About & Contact</h2>
                  <p className="co-sub">Give creators a sense of who you are and how to reach you.</p>

                  <div className="co-field">
                    <label className="co-label">Description</label>
                    <textarea className="co-textarea" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your business do, and what kind of collabs are you looking for?" />
                    <p className="co-hint">{description.length}/500</p>
                  </div>

                  <div className="co-field">
                    <label className="co-label">Website</label>
                    <input className="co-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" />
                  </div>

                  <div className="co-field" style={{ marginBottom: 4 }}>
                    <label className="co-label">Contact phone</label>
                    <input className="co-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+977 98XXXXXXXX" />
                  </div>
                </>
              )}

              {/* ============================================
                  STEP 3 — PREFERENCES
              ============================================ */}

              {step === 3 && (
                <>
                  <h2 className="co-h2">Preferences</h2>
                  <p className="co-sub">What kind of creators and content are you looking for?</p>

                  <p className="co-section-label">Interested categories *</p>
                  <div style={{ marginBottom: 22 }}>
                    <ChipGroup
                      items={INTERESTED_CATEGORIES}
                      isActive={(item) => interestedCategories.includes(item)}
                      onToggle={(item) => toggle(interestedCategories, setInterestedCategories, item)}
                    />
                  </div>

                  <p className="co-section-label">Preferred content types *</p>
                  <div style={{ marginBottom: 22 }}>
                    <ChipGroup
                      items={CONTENT_TYPES}
                      isActive={(item) => preferredContentTypes.includes(item)}
                      onToggle={(item) => toggle(preferredContentTypes, setPreferredContentTypes, item)}
                    />
                  </div>

                  <p className="co-section-label">Team size *</p>
                  <div className="co-chips" style={{ marginBottom: 22 }}>
                    {TEAM_SIZES.map((t) => (
                      <Chip key={t} label={t} active={teamSize === t} onClick={() => toggleSingle(teamSize, setTeamSize, t)} />
                    ))}
                  </div>

                  <div className="co-field">
                    <label className="co-label">Typical budget per collab</label>
                    <div className="co-price-row">
                      <span className="co-price-prefix">Rs.</span>
                      <input type="number" min={0} value={typicalBudget} onChange={(e) => setTypicalBudget(e.target.value)} placeholder="15000" />
                    </div>
                  </div>

                  <div className="co-field" style={{ marginBottom: 4 }}>
                    <label className="co-label">Year established</label>
                    <input type="number" className="co-input" value={yearEstablished} onChange={(e) => setYearEstablished(e.target.value)} placeholder="2022" />
                  </div>
                </>
              )}

              {/* ============================================
                  STEP 4 — PUBLISH
              ============================================ */}

              {step === 4 && (
                <>
                  <h2 className="co-h2">Publish</h2>
                  <p className="co-sub">Review everything and go live.</p>

                  <div className="co-recap">
                    <div className="co-recap-card">
                      <p className="co-recap-label">Basic Info</p>
                      <div className="co-recap-row">
                        <div className="co-avatar" style={{ width: 40, height: 40, fontSize: 15, borderRadius: 10 }}>
                          {logoUrl ? <img src={logoUrl} alt="" /> : (companyName[0] || 'C').toUpperCase()}
                        </div>
                        <span>
                          <p className="co-recap-name">{companyName || 'Unnamed company'}</p>
                          <p className="co-recap-sub">{industry || 'No industry'} · {location || 'No location'}</p>
                        </span>
                      </div>
                    </div>

                    <div className="co-recap-card">
                      <p className="co-recap-label">About & Contact</p>
                      <p className="co-recap-sub" style={{ marginBottom: 6 }}>{description || 'No description yet'}</p>
                      {(website || contactPhone) && (
                        <p className="co-recap-sub">{[website, contactPhone].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>

                    <div className="co-recap-card">
                      <p className="co-recap-label">Preferences</p>
                      <div className="co-recap-chips">
                        {[...interestedCategories, ...preferredContentTypes].map((c) => <span className="co-chip" key={c}>{c}</span>)}
                      </div>
                      {(teamSize || typicalBudget) && (
                        <p className="co-recap-sub" style={{ marginTop: 8 }}>
                          {[teamSize, typicalBudget ? `Rs. ${typicalBudget} typical budget` : ''].filter(Boolean).join(' · ')}
                        </p>
                      )}
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

                {step < 4 ? (
                  <button
                    className="co-continue"
                    disabled={
                      (step === 1 && !canContinueStep1) ||
                      (step === 2 && !canContinueStep2) ||
                      (step === 3 && !canContinueStep3)
                    }
                    onClick={() => {
                      if (step === 1) saveStep1Progress()?.catch((e) => console.error(e));
                      if (step === 2) saveStep2Progress()?.catch((e) => console.error(e));
                      if (step === 3) saveStep3Progress()?.catch((e) => console.error(e));
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

export default BusinessOnboarding;
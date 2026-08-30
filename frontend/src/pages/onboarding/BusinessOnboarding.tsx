import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeBusinessOnboarding } from '../../api/client';

// ============================================
// TYPES
// ============================================

interface BusinessData {
  company_name: string;
  business_type: string;
  industry: string;
  location: string;

  website: string;
  description: string;
  logo_url: string;
  contact_phone: string;
  contact_email: string;

  interested_categories: string[];
  preferred_content_types: string[];
  typical_budget: number;
  team_size: string;
  year_established: number;
}

// ============================================
// CONSTANTS
// ============================================

const VIOLET = '#6C5DD3';
const CORAL = '#FF8A5B';

const BUSINESS_TYPES = [
  'Retail',
  'E-commerce',
  'Agency',
  'SaaS',
  'Food & Beverage',
  'Beauty & Wellness',
  'Fashion & Apparel',
  'Tech & IT',
  'Travel & Hospitality',
  'Education',
  'Healthcare',
  'Real Estate',
  'Entertainment',
  'Non-Profit',
  'Other',
];

const INDUSTRIES = [
  'Fashion & Beauty',
  'Food & Beverage',
  'Health & Fitness',
  'Tech & SaaS',
  'Travel & Hospitality',
  'Retail & E-commerce',
  'Education',
  'Finance',
  'Entertainment',
  'Real Estate',
  'Healthcare',
  'Automotive',
  'Other',
];

const INTERESTED_CATEGORIES = [
  'Beauty',
  'Fashion',
  'Lifestyle',
  'Food',
  'Tech',
  'Fitness',
  'Travel',
  'Gaming',
  'Education',
  'Finance',
  'Wellness',
  'Skincare',
  'Home Decor',
  'Parenting',
  'Entertainment',
];

const CONTENT_TYPES = [
  'Reels',
  'Photos',
  'Stories',
  'YouTube Videos',
  'Shorts',
  'UGC',
  'Reviews',
];

const TEAM_SIZES = [
  'Just me',
  '2–10',
  '11–50',
  '51–200',
  '200+',
];

// ============================================
// LOGO
// ============================================

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
      <circle cx="17" cy="9" r="6" fill={CORAL} fillOpacity={0.9} />
    </svg>
  );
}

// ============================================
// STEP INDICATOR
// ============================================

interface StepIndicatorProps {
  currentStep: number;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    'Basic Info',
    'Business Info',
    'Preferences',
  ];

  return (
    <div className="step-indicator-wrapper">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const completed = currentStep > index;
        const active = currentStep === index;

        return (
          <div className="step-item" key={label}>
            <div
              className={`step-circle ${
                active
                  ? 'step-circle-active'
                  : completed
                  ? 'step-circle-completed'
                  : ''
              }`}
            >
              {completed ? '✓' : stepNumber}
            </div>

            <span
              className={`step-label ${
                active || completed ? 'step-label-active' : ''
              }`}
            >
              {label}
            </span>

            {index < steps.length - 1 && (
              <div
                className={`step-line ${
                  completed ? 'step-line-completed' : ''
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// CHIP
// ============================================

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'chip-active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ============================================
// STEP 1
// ============================================

interface StepBasicInfoProps {
  data: BusinessData;
  setData: React.Dispatch<React.SetStateAction<BusinessData>>;
  onNext: () => void;
}

function StepBasicInfo({
  data,
  setData,
  onNext,
}: StepBasicInfoProps) {
  const isValid =
    data.company_name.trim() !== '' &&
    data.business_type !== '' &&
    data.industry !== '' &&
    data.location.trim() !== '';

  return (
    <div className="step-content">
      <div className="step-heading">
        <h1>Tell us about your business</h1>
        <p>
          This information helps creators understand who they may
          collaborate with.
        </p>
      </div>

      {/* Company name */}
      <div className="form-group">
        <label>
          Company name <span>*</span>
        </label>

        <input
          type="text"
          className="input"
          placeholder="e.g. Himalayan Skincare Co."
          value={data.company_name}
          onChange={(e) =>
            setData({
              ...data,
              company_name: e.target.value,
            })
          }
        />
      </div>

      {/* Business type */}
      <div className="form-group">
        <label>
          Business type <span>*</span>
        </label>

        <div className="chips">
          {BUSINESS_TYPES.map((type) => (
            <Chip
              key={type}
              label={type}
              active={data.business_type === type}
              onClick={() =>
                setData({
                  ...data,
                  business_type: type,
                })
              }
            />
          ))}
        </div>
      </div>

      {/* Industry */}
      <div className="form-group">
        <label>
          Industry <span>*</span>
        </label>

        <div className="chips">
          {INDUSTRIES.map((industry) => (
            <Chip
              key={industry}
              label={industry}
              active={data.industry === industry}
              onClick={() =>
                setData({
                  ...data,
                  industry,
                })
              }
            />
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="form-group">
        <label>
          Location <span>*</span>
        </label>

        <input
          type="text"
          className="input"
          placeholder="Kathmandu, Nepal"
          value={data.location}
          onChange={(e) =>
            setData({
              ...data,
              location: e.target.value,
            })
          }
        />
      </div>

      <div className="actions">
        <div />

        <button
          type="button"
          className="primary-button"
          disabled={!isValid}
          onClick={onNext}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ============================================
// STEP 2
// ============================================

interface StepBusinessInfoProps {
  data: BusinessData;
  setData: React.Dispatch<React.SetStateAction<BusinessData>>;
  onNext: () => void;
  onBack: () => void;
}

function StepBusinessInfo({
  data,
  setData,
  onNext,
  onBack,
}: StepBusinessInfoProps) {
  const [logoPreview, setLogoPreview] = useState<string>(
    data.logo_url || ''
  );

  const handleLogoUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setLogoPreview(previewUrl);

    setData({
      ...data,
      logo_url: previewUrl,
    });
  };

  return (
    <div className="step-content">
      <div className="step-heading">
        <h1>Business information</h1>
        <p>
          Add some details that help creators learn more about your
          company.
        </p>
      </div>

      {/* Logo */}
      <div className="form-group">
        <label>Company logo</label>

        <div className="logo-section">
          <div className="logo-preview">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Company logo"
              />
            ) : (
              <div className="logo-placeholder">
                <span>Logo</span>
              </div>
            )}
          </div>

          <label className="upload-button">
            Upload logo

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleLogoUpload}
            />
          </label>
        </div>

        <p className="hint">
          PNG, JPG or WebP recommended.
        </p>
      </div>

      {/* Website */}
      <div className="form-group">
        <label>Website</label>

        <input
          type="text"
          className="input"
          placeholder="https://yourcompany.com"
          value={data.website}
          onChange={(e) =>
            setData({
              ...data,
              website: e.target.value,
            })
          }
        />
      </div>

      {/* Description */}
      <div className="form-group">
        <label>Business description</label>

        <textarea
          className="textarea"
          placeholder="Tell creators about your company, products, mission, and what you do..."
          value={data.description}
          maxLength={1000}
          onChange={(e) =>
            setData({
              ...data,
              description: e.target.value,
            })
          }
        />

        <div className="character-count">
          {data.description.length}/1000
        </div>
      </div>

      {/* Phone */}
      <div className="form-group">
        <label>Contact phone</label>

        <input
          type="tel"
          className="input"
          placeholder="9841234567"
          value={data.contact_phone}
          onChange={(e) =>
            setData({
              ...data,
              contact_phone: e.target.value,
            })
          }
        />
      </div>

      {/* Email */}
      <div className="form-group">
        <label>Contact email</label>

        <input
          type="email"
          className="input"
          placeholder="hello@yourcompany.com"
          value={data.contact_email}
          onChange={(e) =>
            setData({
              ...data,
              contact_email: e.target.value,
            })
          }
        />
      </div>

      <div className="actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={onNext}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ============================================
// STEP 3
// ============================================

interface StepPreferencesProps {
  data: BusinessData;
  setData: React.Dispatch<React.SetStateAction<BusinessData>>;
  onBack: () => void;
  onFinish: () => void;
  isSubmitting: boolean;
}

function StepPreferences({
  data,
  setData,
  onBack,
  onFinish,
  isSubmitting,
}: StepPreferencesProps) {
  const toggleCategory = (category: string) => {
    const exists =
      data.interested_categories.includes(category);

    setData({
      ...data,
      interested_categories: exists
        ? data.interested_categories.filter(
            (item) => item !== category
          )
        : [...data.interested_categories, category],
    });
  };

  const toggleContentType = (contentType: string) => {
    const exists =
      data.preferred_content_types.includes(contentType);

    setData({
      ...data,
      preferred_content_types: exists
        ? data.preferred_content_types.filter(
            (item) => item !== contentType
          )
        : [...data.preferred_content_types, contentType],
    });
  };

  const isValid =
    data.interested_categories.length > 0 &&
    data.typical_budget > 0 &&
    data.team_size !== '';

  return (
    <div className="step-content">
      <div className="step-heading">
        <h1>What are you looking for?</h1>
        <p>
          These preferences help you find creators who match your
          campaigns.
        </p>
      </div>

      {/* Categories */}
      <div className="form-group">
        <label>
          Creator categories <span>*</span>
        </label>

        <p className="hint">
          Select the categories you are interested in.
        </p>

        <div className="chips">
          {INTERESTED_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={category}
              active={data.interested_categories.includes(
                category
              )}
              onClick={() =>
                toggleCategory(category)
              }
            />
          ))}
        </div>
      </div>

      {/* Content types */}
      <div className="form-group">
        <label>Preferred content types</label>

        <div className="chips">
          {CONTENT_TYPES.map((contentType) => (
            <Chip
              key={contentType}
              label={contentType}
              active={data.preferred_content_types.includes(
                contentType
              )}
              onClick={() =>
                toggleContentType(contentType)
              }
            />
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="form-group">
        <label>
          Typical campaign budget <span>*</span>
        </label>

        <div className="budget-input">
          <span>NPR</span>

          <input
            type="number"
            placeholder="25000"
            value={
              data.typical_budget === 0
                ? ''
                : data.typical_budget
            }
            onChange={(e) =>
              setData({
                ...data,
                typical_budget:
                  Number(e.target.value) || 0,
              })
            }
          />
        </div>

        <p className="hint">
          Your approximate budget for one campaign.
        </p>
      </div>

      {/* Team size */}
      <div className="form-group">
        <label>
          Team size <span>*</span>
        </label>

        <div className="chips">
          {TEAM_SIZES.map((size) => (
            <Chip
              key={size}
              label={size}
              active={data.team_size === size}
              onClick={() =>
                setData({
                  ...data,
                  team_size: size,
                })
              }
            />
          ))}
        </div>
      </div>

      {/* Year */}
      <div className="form-group">
        <label>Year established</label>

        <input
          type="number"
          className="input"
          placeholder="2020"
          value={
            data.year_established === 0
              ? ''
              : data.year_established
          }
          onChange={(e) =>
            setData({
              ...data,
              year_established:
                Number(e.target.value) || 0,
            })
          }
        />
      </div>

      <div className="actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onBack}
        >
          ← Back
        </button>

        <button
          type="button"
          className="primary-button"
          disabled={!isValid || isSubmitting}
          onClick={onFinish}
        >
          {isSubmitting
            ? 'Saving...'
            : 'Complete Profile →'}
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function BusinessOnboarding() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] =
    useState<number>(0);

  const [isSubmitting, setIsSubmitting] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string>('');

  const [completed, setCompleted] =
    useState<boolean>(false);

  const [data, setData] = useState<BusinessData>({
    company_name: '',
    business_type: '',
    industry: '',
    location: '',

    website: '',
    description: '',
    logo_url: '',
    contact_phone: '',
    contact_email: '',

    interested_categories: [],
    preferred_content_types: [],
    typical_budget: 0,
    team_size: '',
    year_established: 0,
  });

  const nextStep = () => {
    setCurrentStep((previous) =>
      Math.min(previous + 1, 2)
    );
  };

  const previousStep = () => {
    setCurrentStep((previous) =>
      Math.max(previous - 1, 0)
    );
  };

  // Lets a business finish onboarding later. We don't save anything
  // yet — just drop them at the dashboard, where the "Complete Profile"
  // nudge card sends them straight back into this flow.
  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      console.log(
        'Sending business onboarding data:',
        data
      );

      await completeBusinessOnboarding({
        company_name: data.company_name,
        business_type: data.business_type,
        industry: data.industry,
        location: data.location,

        website: data.website,
        description: data.description,
        logo_url: data.logo_url,
        contact_phone: data.contact_phone,

        interested_categories:
          data.interested_categories,

        preferred_content_types:
          data.preferred_content_types,

        typical_budget: data.typical_budget,
      });

      console.log(
        'Business onboarding completed successfully'
      );

      setCompleted(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      console.error(
        'Business onboarding failed:',
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to save your business profile. Please try again.';

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // SUCCESS SCREEN
  // ============================================

  if (completed) {
    return (
      <div className="onboarding-page">
        <div className="success-card">
          <div className="success-circle">
            ✓
          </div>

          <h1>Profile complete</h1>

          <p>
            Your business profile has been saved
            successfully.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              navigate('/dashboard')
            }
          >
            Go to Dashboard →
          </button>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  // ============================================
  // MAIN SCREEN
  // ============================================

  return (
    <div className="onboarding-page">
      <div className="onboarding-wrapper">

        {/* Brand — click to jump straight to the dashboard */}
        <button
          type="button"
          className="brand brand-clickable"
          onClick={() => navigate('/dashboard')}
        >
          <LogoMark size={24} />
          <span>CreatorHub</span>
        </button>

        {/* Card */}
        <div className="onboarding-card">

          <div className="card-topbar">
            <StepIndicator
              currentStep={currentStep}
            />

            <button
              type="button"
              className="skip-link"
              onClick={handleSkip}
            >
              Skip for now
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {currentStep === 0 && (
            <StepBasicInfo
              data={data}
              setData={setData}
              onNext={nextStep}
            />
          )}

          {/* STEP 2 */}
          {currentStep === 1 && (
            <StepBusinessInfo
              data={data}
              setData={setData}
              onNext={nextStep}
              onBack={previousStep}
            />
          )}

          {/* STEP 3 */}
          {currentStep === 2 && (
            <StepPreferences
              data={data}
              setData={setData}
              onBack={previousStep}
              onFinish={handleFinish}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>

      <style>{styles}</style>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* {
  box-sizing: border-box;
}

.onboarding-page {
  min-height: 100vh;
  background: #fafafa;
  color: #171717;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 40px 20px 70px;
}

.onboarding-wrapper {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 15px;
  font-weight: 600;
  margin: 0 auto 28px;
  background: none;
  border: none;
  color: #171717;
  font-family: inherit;
  padding: 6px 10px;
  border-radius: 8px;
}

.brand-clickable {
  cursor: pointer;
  transition: opacity .15s ease;
}

.brand-clickable:hover {
  opacity: .7;
}

.onboarding-card {
  background: white;
  border: 1px solid #e7e7e7;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.04);
}

/* ============================================
   TOP BAR (steps + skip)
============================================ */

.card-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 34px;
}

.card-topbar .step-indicator-wrapper {
  flex: 1;
  margin-bottom: 0;
}

.skip-link {
  flex-shrink: 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: #888;
  padding: 4px 2px;
  margin-top: 2px;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.skip-link:hover {
  color: #6c5dd3;
}

/* ============================================
   STEPS
============================================ */

.step-indicator-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 34px;
}

.step-item {
  display: flex;
  align-items: center;
  flex: 1;
}

.step-item:last-child {
  flex: 0;
}

.step-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f1f1f1;
  border: 1px solid #dedede;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #777;
  flex-shrink: 0;
}

.step-circle-active {
  background: #6c5dd3;
  color: white;
  border-color: #6c5dd3;
}

.step-circle-completed {
  background: #16a34a;
  color: white;
  border-color: #16a34a;
}

.step-label {
  margin-left: 8px;
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}

.step-label-active {
  color: #222;
  font-weight: 600;
}

.step-line {
  height: 1px;
  background: #e5e5e5;
  flex: 1;
  margin: 0 10px;
}

.step-line-completed {
  background: #6c5dd3;
}

/* ============================================
   HEADINGS
============================================ */

.step-heading {
  margin-bottom: 28px;
}

.step-heading h1 {
  font-size: 24px;
  line-height: 1.2;
  margin: 0 0 7px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.step-heading p {
  margin: 0;
  color: #777;
  font-size: 13px;
  line-height: 1.5;
}

/* ============================================
   FORM
============================================ */

.form-group {
  margin-bottom: 22px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-group label span {
  color: #dc2626;
}

.input,
.textarea {
  width: 100%;
  border: 1px solid #dedede;
  border-radius: 9px;
  background: white;
  padding: 11px 13px;
  font-family: inherit;
  font-size: 13px;
  color: #171717;
  transition: border-color .15s ease;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: #6c5dd3;
  box-shadow: 0 0 0 3px rgba(108,93,211,.08);
}

.textarea {
  min-height: 100px;
  resize: vertical;
  line-height: 1.5;
}

.hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: #888;
}

/* ============================================
   CHIPS
============================================ */

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chip {
  border: 1px solid #dedede;
  background: white;
  color: #444;
  padding: 7px 11px;
  border-radius: 100px;
  font-size: 12px;
  cursor: pointer;
  transition: all .15s ease;
}

.chip:hover {
  border-color: #6c5dd3;
  color: #6c5dd3;
}

.chip-active {
  background: #6c5dd3;
  border-color: #6c5dd3;
  color: white;
}

/* ============================================
   LOGO
============================================ */

.logo-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-preview {
  width: 80px;
  height: 80px;
  border: 1px dashed #d7d7d7;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7f7f7;
  color: #888;
  font-size: 11px;
}

.upload-button {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  padding: 9px 14px;
  border: 1px solid #dedede;
  border-radius: 8px;
  background: white;
  color: #333;
  cursor: pointer;
  font-size: 12px !important;
  font-weight: 500 !important;
}

.upload-button:hover {
  border-color: #6c5dd3;
  color: #6c5dd3;
}

/* ============================================
   BUDGET
============================================ */

.budget-input {
  display: flex;
  align-items: center;
  border: 1px solid #dedede;
  border-radius: 9px;
  overflow: hidden;
}

.budget-input:focus-within {
  border-color: #6c5dd3;
  box-shadow: 0 0 0 3px rgba(108,93,211,.08);
}

.budget-input span {
  padding: 11px 13px;
  background: #f7f7f7;
  border-right: 1px solid #dedede;
  font-size: 12px;
  font-weight: 600;
  color: #777;
}

.budget-input input {
  border: none;
  outline: none;
  padding: 11px 13px;
  flex: 1;
  font-size: 13px;
  font-family: inherit;
}

/* ============================================
   ACTIONS
============================================ */

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 30px;
  padding-top: 22px;
  border-top: 1px solid #ededed;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  padding: 10px 18px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s ease;
}

.primary-button {
  border: none;
  background: #6c5dd3;
  color: white;
}

.primary-button:hover {
  background: #5b4cc2;
}

.primary-button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.secondary-button {
  background: white;
  border: 1px solid #dedede;
  color: #555;
}

.secondary-button:hover {
  background: #f7f7f7;
}

/* ============================================
   ERROR
============================================ */

.error-box {
  padding: 11px 13px;
  margin-bottom: 20px;
  border-radius: 8px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #be123c;
  font-size: 12px;
}

/* ============================================
   SUCCESS
============================================ */

.success-card {
  width: 100%;
  max-width: 500px;
  margin: 120px auto;
  background: white;
  border: 1px solid #e7e7e7;
  border-radius: 16px;
  padding: 50px 35px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,.04);
}

.success-circle {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: #e8f7ee;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
}

.success-card h1 {
  font-size: 24px;
  margin: 0 0 8px;
}

.success-card p {
  margin: 0 0 25px;
  color: #777;
  font-size: 13px;
}

/* ============================================
   RESPONSIVE
============================================ */

@media (max-width: 600px) {
  .onboarding-page {
    padding: 20px 12px 50px;
  }

  .onboarding-card {
    padding: 22px;
  }

  .step-label {
    display: none;
  }

  .step-heading h1 {
    font-size: 21px;
  }

  .logo-section {
    align-items: flex-start;
    flex-direction: column;
  }

  .card-topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .skip-link {
    align-self: flex-end;
  }
}
`;

export default BusinessOnboarding;
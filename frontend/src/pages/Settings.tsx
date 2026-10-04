// frontend/src/pages/Settings.tsx
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, X } from 'lucide-react';
import { getCampaignDefaults, saveCampaignDefaults } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import {
  COMPENSATION_TYPES,
  CREATOR_TYPES,
  ENGAGEMENT_TYPES,
  EXPERIENCE_LEVELS,
  LOCATION_SUGGESTIONS,
  PRICING_MODELS,
  SKILLS,
  WORK_ARRANGEMENTS,
} from './Campaignform';

/* Same option lists as the campaign form, so Settings always matches it. */

const SUGGESTED_QUESTIONS = [
  'Why are you a good fit for this campaign?',
  'Have you created similar content before? Share an example.',
  'What is your content style or approach for this campaign?',
  'How would you showcase this product to your audience?',
  'Can you complete all deliverables by the campaign deadline?',
];

type TabKey = 'business' | 'basics' | 'work' | 'engagement' | 'requirements';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'business', label: 'Business' },
  { key: 'basics', label: 'Basics' },
  { key: 'work', label: 'Work' },
  { key: 'engagement', label: 'Engagement & Budget' },
  { key: 'requirements', label: 'Requirements' },
];

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const clean = (items?: unknown): string[] =>
  Array.isArray(items) ? items.map((x) => String(x).trim()).filter(Boolean) : [];

function Chips({
  options,
  values,
  onChange,
  single = false,
}: {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  single?: boolean;
}) {
  const toggle = (value: string) => {
    if (single) return onChange(values.includes(value) ? [] : [value]);
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <div className="st-chips">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`st-chip${values.includes(option) ? ' is-on' : ''}`}
          onClick={() => toggle(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (!items.some((item) => same(item, value))) onChange([...items, value]);
    setDraft('');
  };

  return (
    <div>
      {items.map((item, i) => (
        <div className="st-row" key={i}>
          <span className="st-index">{i + 1}</span>
          <input
            className="st-input"
            value={item}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            className="st-icon-btn"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <div className="st-row">
        <input
          className="st-input"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="st-btn" onClick={add}>
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="st-field">
      <div className="st-field-label">{label}</div>
      {hint && <div className="st-field-hint">{hint}</div>}
      {children}
    </div>
  );
}

interface Section {
  id: string;
  tab: TabKey;
  title: string;
  desc: string;
  keywords: string;
  body: ReactNode;
}

export function BusinessSettings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('business');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Defaults that map to the campaign form fields.
  const [creatorTypes, setCreatorTypes] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [engagementType, setEngagementType] = useState('');
  const [workArrangement, setWorkArrangement] = useState('');
  const [pricingModel, setPricingModel] = useState('');
  const [compensationType, setCompensationType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [requirements, setRequirements] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);

  // Older saved values that are no longer edited here are kept as they are.
  const [legacy, setLegacy] = useState<any>({});

  const apply = (d: any) => {
    const r = d?.default_creator_requirements || {};
    setLegacy({
      default_dos: d?.default_dos || [],
      default_donts: d?.default_donts || [],
      default_video_spec: d?.default_video_spec || null,
      requirements: r,
    });
    setCreatorTypes(clean(r.creator_types));
    setLocation(r.location || '');
    setResponsibilities(r.responsibilities || '');
    setDeliverables(clean(r.deliverables));
    setEngagementType(r.engagement_type || '');
    setWorkArrangement(r.work_arrangement || '');
    setPricingModel(r.pricing_model || '');
    setCompensationType(r.compensation_type || '');
    setExperienceLevel(r.experience_level || '');
    setSkills(clean(r.required_skills));
    setRequirements(r.requirements || '');
    setQuestions(clean(d?.default_application_questions));
  };

  useEffect(() => {
    if (user?.role !== 'business') {
      setLoading(false);
      return;
    }
    getCampaignDefaults()
      .then((d) => d && apply(d))
      .catch((err) => console.error('Could not load campaign defaults:', err))
      .finally(() => setLoading(false));
  }, [user]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveCampaignDefaults({
        default_dos: legacy.default_dos || [],
        default_donts: legacy.default_donts || [],
        default_video_spec: legacy.default_video_spec || null,
        default_application_questions: clean(questions),
        default_creator_requirements: {
          ...(legacy.requirements || {}),
          creator_types: creatorTypes,
          location: location.trim(),
          responsibilities: responsibilities.trim(),
          deliverables: clean(deliverables),
          engagement_type: engagementType,
          work_arrangement: workArrangement,
          pricing_model: pricingModel,
          compensation_type: compensationType,
          experience_level: experienceLevel,
          required_skills: skills,
          requirements: requirements.trim(),
        } as any,
      });
      apply(saved);
      setMessage({ ok: true, text: 'Saved. New campaigns will start with these.' });
    } catch (err) {
      console.error('Could not save campaign defaults:', err);
      setMessage({ ok: false, text: 'Could not save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const sections: Section[] = [
    {
      id: 'business',
      tab: 'business',
      title: 'Business information',
      desc: 'Company name, logo, location, website and contact details.',
      keywords: 'company profile logo website contact',
      body: <Link to="/profile" className="st-btn">Edit business profile</Link>,
    },
    {
      id: 'creator-types',
      tab: 'basics',
      title: 'Creator types',
      desc: 'The kinds of creators you usually hire.',
      keywords: 'creator type ugc influencer photographer videographer',
      body: <Chips options={CREATOR_TYPES} values={creatorTypes} onChange={setCreatorTypes} />,
    },
    {
      id: 'location',
      tab: 'basics',
      title: 'Location',
      desc: 'Where campaigns usually take place.',
      keywords: 'location city remote',
      body: (
        <>
          <input
            className="st-input"
            list="st-locations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Kathmandu, Nepal"
          />
          <datalist id="st-locations">
            {LOCATION_SUGGESTIONS.map((x) => <option key={x} value={x} />)}
          </datalist>
        </>
      ),
    },
    {
      id: 'responsibilities',
      tab: 'work',
      title: 'Responsibilities',
      desc: 'What the creator is expected to do.',
      keywords: 'responsibilities work tasks',
      body: (
        <textarea
          className="st-input st-textarea"
          rows={4}
          value={responsibilities}
          onChange={(e) => setResponsibilities(e.target.value)}
          placeholder="Describe what the creator will be responsible for"
        />
      ),
    },
    {
      id: 'deliverables',
      tab: 'work',
      title: 'Deliverables',
      desc: 'What the creator hands over. Each one is added to the new campaign.',
      keywords: 'deliverables reel story post video photos',
      body: (
        <EditableList items={deliverables} onChange={setDeliverables} placeholder="e.g. 1 Instagram Reel featuring our product" />
      ),
    },
    {
      id: 'engagement',
      tab: 'engagement',
      title: 'Engagement',
      desc: 'How long you work with creators and how they work.',
      keywords: 'engagement one-time weekly monthly long-term yearly arrangement full-time part-time flexible',
      body: (
        <div className="st-stack">
          <Field label="Engagement type">
            <Chips options={ENGAGEMENT_TYPES} single values={engagementType ? [engagementType] : []} onChange={(v) => setEngagementType(v[0] || '')} />
          </Field>
          <Field label="Work arrangement">
            <Chips options={WORK_ARRANGEMENTS} single values={workArrangement ? [workArrangement] : []} onChange={(v) => setWorkArrangement(v[0] || '')} />
          </Field>
        </div>
      ),
    },
    {
      id: 'budget',
      tab: 'engagement',
      title: 'Budget',
      desc: 'How you usually pay creators.',
      keywords: 'budget pricing compensation custom amount range pay',
      body: (
        <div className="st-stack">
          <Field label="Pricing model">
            <Chips options={PRICING_MODELS} single values={pricingModel ? [pricingModel] : []} onChange={(v) => setPricingModel(v[0] || '')} />
          </Field>
          <Field label="Compensation type">
            <Chips options={COMPENSATION_TYPES} single values={compensationType ? [compensationType] : []} onChange={(v) => setCompensationType(v[0] || '')} />
          </Field>
        </div>
      ),
    },
    {
      id: 'experience',
      tab: 'requirements',
      title: 'Experience and skills',
      desc: 'What you look for in applicants.',
      keywords: 'experience level skills entry intermediate experienced',
      body: (
        <div className="st-stack">
          <Field label="Experience level">
            <Chips options={EXPERIENCE_LEVELS} single values={experienceLevel ? [experienceLevel] : []} onChange={(v) => setExperienceLevel(v[0] || '')} />
          </Field>
          <Field label="Required skills">
            <Chips options={SKILLS} values={skills} onChange={setSkills} />
          </Field>
        </div>
      ),
    },
    {
      id: 'requirements',
      tab: 'requirements',
      title: 'Additional requirements',
      desc: 'Anything else creators should know before applying.',
      keywords: 'requirements notes extra',
      body: (
        <textarea
          className="st-input st-textarea"
          rows={4}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="e.g. Must own a smartphone with a good camera"
        />
      ),
    },
    {
      id: 'questions',
      tab: 'requirements',
      title: 'Screening questions',
      desc: 'Optional questions creators answer when applying.',
      keywords: 'screening questions application apply',
      body: (
        <>
          <Field label="Suggestions">
            <div className="st-chips">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="st-chip"
                  onClick={() => setQuestions((items) => (items.some((x) => same(x, q)) ? items : [...items, q]))}
                >
                  + {q}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Your questions">
            <EditableList items={questions} onChange={setQuestions} placeholder="Write your own question" />
          </Field>
        </>
      ),
    },
  ];

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      q
        ? sections.filter((s) => `${s.title} ${s.desc} ${s.keywords}`.toLowerCase().includes(q))
        : sections.filter((s) => s.tab === tab),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, tab, creatorTypes, location, responsibilities, deliverables, engagementType, workArrangement, pricingModel, compensationType, experienceLevel, skills, requirements, questions],
  );
  const showSave = visible.some((s) => s.tab !== 'business');

  if (user && user.role !== 'business') {
    return (
      <AppLayout title="Settings" subtitle="Manage your account preferences." showSearch={false}>
        <style>{styles}</style>
        <div className="st-wrap">
          <section className="st-card">
            <div className="st-card-head">
              <h2>Access denied</h2>
              <p>Only brand accounts can change campaign settings.</p>
            </div>
            <div className="st-card-body">
              <Link to="/dashboard" className="st-btn st-btn--dark">Go to dashboard</Link>
            </div>
          </section>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Set your campaign defaults once. New campaigns start with them filled in."
      showNotifications
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search settings"
    >
      <style>{styles}</style>

      <div className="st-wrap">
        {!q && (
          <div className="st-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`st-tab${tab === t.key ? ' is-active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="st-state"><Loader2 size={16} className="st-spin" /> Loading your settings…</div>
        ) : (
          <>
            {visible.length === 0 && <div className="st-state">No settings match "{query}".</div>}

            {visible.map((s) => (
              <section className="st-card" key={s.id}>
                <div className="st-card-head">
                  <h2>{s.title}</h2>
                  <p>{s.desc}</p>
                </div>
                <div className="st-card-body">{s.body}</div>
              </section>
            ))}

            {showSave && (
              <div className="st-savebar">
                <button type="button" className="st-btn st-btn--dark" disabled={saving} onClick={() => void save()}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {message && <span className={`st-msg${message.ok ? ' ok' : ' err'}`}>{message.text}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

const styles = `
  .st-wrap{font-family:Poppins,sans-serif;color:#111;padding:0 24px 50px;width:100%;box-sizing:border-box}
  .st-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 20px}
  .st-tab{height:34px;padding:0 16px;border:1px solid #e0e0e0;background:#fff;border-radius:999px;font:400 12.5px Poppins,sans-serif;color:#444;cursor:pointer}
  .st-tab:hover{border-color:#bbb}
  .st-tab.is-active{background:#111;border-color:#111;color:#fff}
  .st-card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;margin-bottom:16px;overflow:hidden}
  .st-card-head{padding:16px 22px;border-bottom:1px solid #f0f0f0}
  .st-card-head h2{margin:0;font:500 14.5px Poppins,sans-serif}
  .st-card-head p{margin:3px 0 0;font:400 12.5px/1.5 Poppins,sans-serif;color:#777}
  .st-card-body{padding:20px 22px}
  .st-stack{display:flex;flex-direction:column;gap:20px}
  .st-field-label{font:500 12px Poppins,sans-serif;color:#555;margin-bottom:9px}
  .st-field-hint{font:400 11.5px Poppins,sans-serif;color:#999;margin:-5px 0 9px}
  .st-chips{display:flex;flex-wrap:wrap;gap:7px}
  .st-chip{border:1px solid #e0e0e0;background:#fff;color:#222;border-radius:999px;padding:7px 13px;font:400 12px Poppins,sans-serif;cursor:pointer;text-align:left}
  .st-chip:hover{border-color:#aaa}
  .st-chip.is-on{background:#111;border-color:#111;color:#fff}
  .st-row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
  .st-index{width:22px;flex:none;text-align:center;font:400 12px Poppins,sans-serif;color:#999}
  .st-input{flex:1;min-width:0;width:100%;height:38px;border:1px solid #e0e0e0;border-radius:8px;padding:0 12px;font:400 13px Poppins,sans-serif;color:#111;background:#fff;outline:none;box-sizing:border-box}
  .st-input:focus{border-color:#111}
  .st-textarea{height:auto;padding:10px 12px;line-height:1.55;resize:vertical}
  .st-icon-btn{width:38px;height:38px;flex:none;border:1px solid #e0e0e0;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#666}
  .st-icon-btn:hover{border-color:#aaa;color:#111}
  .st-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 16px;border:1px solid #d6d6d6;background:#fff;color:#111;border-radius:8px;font:400 12.5px Poppins,sans-serif;text-decoration:none;cursor:pointer;white-space:nowrap;flex:none}
  .st-btn:hover{border-color:#999}
  .st-btn:disabled{opacity:.6;cursor:default}
  .st-btn--dark{background:#111;border-color:#111;color:#fff}
  .st-btn--dark:hover{background:#000;border-color:#000;color:#fff}
  .st-savebar{display:flex;align-items:center;gap:14px;padding-top:2px}
  .st-msg{font:400 12.5px Poppins,sans-serif}
  .st-msg.ok{color:#1e8a4c}
  .st-msg.err{color:#b3261e}
  .st-state{display:flex;align-items:center;gap:8px;padding:30px 4px;font:400 13px Poppins,sans-serif;color:#777}
  .st-spin{animation:st-spin 1s linear infinite}
  @keyframes st-spin{to{transform:rotate(360deg)}}
`;
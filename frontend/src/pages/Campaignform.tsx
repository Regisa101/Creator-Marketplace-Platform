import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LogoMark } from "../components/Logo";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createCampaign,
  getCampaign,
  publishCampaign,
  updateCampaign,
} from "../api/client";

const CATEGORIES = [
  "Beauty",
  "Fashion",
  "Lifestyle",
  "Food",
  "Tech",
  "Fitness",
  "Travel",
  "Gaming",
  "Education",
  "Finance",
  "Wellness",
  "Skincare",
  "Home Decor",
  "Parenting",
  "Entertainment",
];

const CREATOR_TYPES = [
  "UGC Creator",
  "Influencer",
  "Content Creator",
  "Photographer",
  "Videographer",
  "Blogger",
  "Podcaster",
  "Designer",
  "Model",
];

const SKILLS = [
  "Short-form video",
  "Photography",
  "Video editing",
  "Storytelling",
  "Product photography",
  "Voiceover",
  "Copywriting",
  "Live content",
  "Graphic design",
  "Social media content",
  "Reviews",
  "Tutorials",
];

const LOCATION_SUGGESTIONS = [
  "Kathmandu, Nepal",
  "Kirtipur, Nepal",
  "Lalitpur, Nepal",
  "Bhaktapur, Nepal",
  "Pokhara, Nepal",
  "Biratnagar, Nepal",
  "Birgunj, Nepal",
  "Butwal, Nepal",
  "Kolkata, India",
  "Karachi, Pakistan",
  "Kuala Lumpur, Malaysia",
  "Kyiv, Ukraine",
  "London, UK",
  "New York, USA",
  "Los Angeles, USA",
  "Toronto, Canada",
  "Sydney, Australia",
  "Singapore",
  "Dubai, UAE",
  "Remote",
];

const ENGAGEMENT_TYPES = [
  "One-time",
  "Weekly",
  "Monthly",
  "Long-term",
  "Yearly",
];

const WORK_ARRANGEMENTS = [
  "Full-time",
  "Part-time",
  "Flexible",
];

const PRICING_MODELS = [
  "Custom budget",
  "CreatorHub standard rate",
];

const COMPENSATION_TYPES = [
  "Custom amount",
  "Budget range",
  "CreatorHub standard rate",
];

const CREATORHUB_TERM_RATES: Record<string, number | null> = {
  "One-time": 500,
  "Weekly": null,
  "Monthly": 2000,
  "Long-term": 5000,
  "Yearly": 5000,
};

function creatorHubRateForTerm(term: string): number | null {
  return CREATORHUB_TERM_RATES[term] ?? null;
}

const EXPERIENCE_LEVELS = [
  "Entry level",
  "Intermediate",
  "Experienced",
];

const STEPS = [
  ["Basics", "Campaign essentials"],
  ["Work", "Responsibilities & deliverables"],
  ["Engagement & Budget", "Working relationship & pay"],
  ["Requirements", "Skills & timeline"],
] as const;

type CampaignFormData = {
  title: string;
  category: string;
  description: string;
  responsibilities: string;
  creator_types: string[];
  creators_needed: number;
  deliverables: string[];
  engagement_type: string;
  duration: string;
  work_arrangement: string;
  pricing_model: string;
  compensation_type: string;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  compensation_description: string;
  experience_level: string;
  required_skills: string[];
  location: string;
  requirements: string;
  start_date: string;
  end_date: string;
  application_deadline: string;
  application_questions: string[];
  hero_image?: string | null;
};

const EMPTY: CampaignFormData = {
  title: "",
  category: "",
  description: "",
  responsibilities: "",
  creator_types: [],
  creators_needed: 1,
  deliverables: [""],
  engagement_type: "",
  duration: "",
  work_arrangement: "",
  pricing_model: "",
  compensation_type: "",
  budget: undefined,
  budget_min: undefined,
  budget_max: undefined,
  compensation_description: "",
  experience_level: "",
  required_skills: [],
  location: "",
  requirements: "",
  start_date: "",
  end_date: "",
  application_deadline: "",
  application_questions: [],
  hero_image: null,
};

function list(v?: string[] | null) {
  return (v ?? [])
    .map((x) => x.trim())
    .filter(Boolean);
}

function inputDate(v?: string | null) {
  return v ? v.slice(0, 10) : "";
}

function apiDate(v: string) {
  return v ? `${v}T00:00:00Z` : undefined;
}

function todayInputDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DATE_BASED_ENGAGEMENTS = [
  "One-time",
  "Weekly",
  "Monthly",
];

function message(e: unknown, fallback: string) {
  const x = e as {
    response?: {
      data?: {
        detail?: string;
      };
    };
    message?: string;
  };

  return (
    x?.response?.data?.detail ||
    x?.message ||
    fallback
  );
}

export function CampaignCreate() {
  return <CampaignForm mode="create" />;
}

export function CampaignEdit() {
  return <CampaignForm mode="edit" />;
}

function CampaignForm({
  mode,
}: {
  mode: "create" | "edit";
}) {
  const today = todayInputDate();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const editing = mode === "edit";

  const [step, setStep] = useState(1);

  const [form, setForm] =
    useState<CampaignFormData>(EMPTY);

  const [questions, setQuestions] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(editing);

  const [busy, setBusy] =
    useState<"draft" | "publish" | null>(null);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!editing || !id) return;

    let cancelled = false;

    (async () => {
      try {
        const c = (await getCampaign(id)) as any;

        if (cancelled) return;

        setForm({
          title: c.title || "",
          category: c.category || "",
          description: c.description || "",
          responsibilities:
            c.responsibilities || "",

          creator_types:
            c.creator_types || [],

          creators_needed:
            c.creators_needed || 1,

          deliverables:
            list(c.deliverables).length
              ? list(c.deliverables)
              : [""],

          engagement_type:
            c.engagement_type || "",

          duration:
            c.duration || "",

          work_arrangement:
            c.work_arrangement || "",

          pricing_model:
            c.pricing_model || "",

          compensation_type:
            c.compensation_type || "",

          budget:
            c.budget ?? undefined,

          budget_min:
            c.budget_min ?? undefined,

          budget_max:
            c.budget_max ?? undefined,

          compensation_description:
            c.compensation_description || "",

          experience_level:
            c.experience_level || "",

          required_skills:
            c.required_skills || [],

          location:
            c.location || "",

          requirements:
            c.requirements || "",

          start_date:
            inputDate(c.start_date),

          end_date:
            inputDate(c.end_date),

          application_deadline:
            inputDate(c.application_deadline),

          application_questions:
            c.application_questions || [],

          hero_image:
            c.hero_image || null,
        });

        setQuestions(
          c.application_questions || []
        );
      } catch (e) {
        if (!cancelled) {
          setError(
            message(
              e,
              "Could not load this campaign."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const set = <
    K extends keyof CampaignFormData
  >(
    key: K,
    value: CampaignFormData[K]
  ) => {
    setForm((v) => ({
      ...v,
      [key]: value,
    }));
    setFieldErrors((v) => {
      if (!v[key as string]) return v;
      const next = { ...v };
      delete next[key as string];
      return next;
    });
  };

  const toggle = (
    key:
      | "creator_types"
      | "required_skills",
    value: string
  ) => {
    setForm((v) => ({
      ...v,
      [key]: v[key].includes(value)
        ? v[key].filter((x) => x !== value)
        : [...v[key], value],
    }));
    setFieldErrors((v) => {
      if (!v[key]) return v;
      const next = { ...v };
      delete next[key];
      return next;
    });
  };

  const addCustomCreatorType = (value: string) => {
    const custom = value.trim();
    if (!custom) return;
    setForm((v) => ({
      ...v,
      creator_types: v.creator_types.includes(custom)
        ? v.creator_types
        : [...v.creator_types, custom],
    }));
    setFieldErrors((v) => {
      const next = { ...v };
      delete next.creator_types;
      return next;
    });
  };

  const addCustomRequiredSkill = (value: string) => {
    const custom = value.trim();
    if (!custom) return;
    setForm((v) => ({
      ...v,
      required_skills: v.required_skills.includes(custom)
        ? v.required_skills
        : [...v.required_skills, custom],
    }));
    setFieldErrors((v) => {
      const next = { ...v };
      delete next.required_skills;
      return next;
    });
  };

  const cleaned = useMemo(
    () => ({
      ...form,

      creator_types:
        list(form.creator_types),

      required_skills:
        list(form.required_skills),

      deliverables:
        list(form.deliverables),

      application_questions:
        list(questions),

      start_date:
        apiDate(form.start_date),

      end_date:
        apiDate(form.end_date),

      application_deadline:
        apiDate(
          form.application_deadline
        ),

      budget:
        form.compensation_type ===
        "Custom amount"
          ? form.budget
          : undefined,

      budget_min:
        form.compensation_type ===
        "Budget range"
          ? form.budget_min
          : undefined,

      budget_max:
        form.compensation_type ===
        "Budget range"
          ? form.budget_max
          : undefined,
    }),
    [form, questions]
  );

  function validate(s: number): string | null {
    const nextErrors: Record<string, string> = {};

    if (s === 1) {
      if (!form.title.trim()) nextErrors.title = "Campaign title is required.";
      if (!form.category) nextErrors.category = "Please select a category.";
      if (!form.creator_types.length) nextErrors.creator_types = "Select a creator type or add your own.";
      if (form.creators_needed < 1) nextErrors.creators_needed = "Enter at least 1 creator.";
      if (!form.description.trim()) nextErrors.description = "Please describe what the campaign is about.";
    }

    if (s === 2) {
      if (!form.responsibilities.trim()) nextErrors.responsibilities = "Please describe the creator's responsibilities.";
      if (!list(form.deliverables).length) nextErrors.deliverables = "Add at least one deliverable.";
      else if (form.deliverables.some((x) => !x.trim())) nextErrors.deliverables = "Please complete every deliverable before continuing.";
    }

    if (s === 3) {
      if (!form.engagement_type) nextErrors.engagement_type = "Please choose an engagement type.";
      if (!form.work_arrangement) nextErrors.work_arrangement = "Please select a work arrangement.";
      if (!form.pricing_model) nextErrors.pricing_model = "Please select a pricing model.";
      if (!form.compensation_type) nextErrors.compensation_type = "Please select how the creator will be paid.";
      if (form.compensation_type === "Custom amount" && (!form.budget || form.budget <= 0)) nextErrors.budget = "Enter a valid custom amount.";
      if (form.compensation_type === "Budget range") {
        if (!form.budget_min || form.budget_min <= 0) nextErrors.budget_min = "Enter the minimum budget.";
        if (!form.budget_max || form.budget_max <= 0) nextErrors.budget_max = "Enter the maximum budget.";
        if (form.budget_min && form.budget_max && form.budget_max < form.budget_min) nextErrors.budget_max = "Maximum budget must be greater than minimum budget.";
      }
      if (
        (form.pricing_model === "CreatorHub standard rate" ||
          form.compensation_type === "CreatorHub standard rate") &&
        creatorHubRateForTerm(form.engagement_type) == null
      ) {
        nextErrors.compensation_type = "Choose a custom amount for Weekly campaigns because CreatorHub does not have a standard weekly rate.";
      }
    }

    if (s === 4) {
      if (!form.experience_level) nextErrors.experience_level = "Please select the experience level you need.";
      if (!form.required_skills.length) nextErrors.required_skills = "Select at least one required skill.";
      if (DATE_BASED_ENGAGEMENTS.includes(form.engagement_type)) {
        if (form.start_date && form.start_date < today) nextErrors.start_date = "Start date cannot be before today.";
        if (form.end_date && form.end_date < today) nextErrors.end_date = "End date cannot be before today.";
        if (form.start_date && form.end_date && form.end_date < form.start_date) nextErrors.end_date = "End date cannot be before the start date.";
        if (form.application_deadline && form.start_date && form.application_deadline > form.start_date) nextErrors.application_deadline = "Deadline should be on or before the start date.";
      }
      if (form.application_deadline && form.application_deadline < today) nextErrors.application_deadline = "Application deadline cannot be before today.";
    }

    setFieldErrors(nextErrors);
    return Object.values(nextErrors)[0] || null;
  }

  function next() {
    const e = validate(step);

    if (e) {
      setError(e);
      return;
    }

    setError("");

    setStep((s) =>
      Math.min(4, s + 1)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function back() {
    setError("");

    if (step === 1) {
      navigate(
        editing && id
          ? `/campaigns/${id}`
          : "/campaigns"
      );

      return;
    }

    setStep((s) =>
      Math.max(1, s - 1)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function save(
    publish: boolean
  ) {
    if (publish) {
      for (let s = 1; s <= 4; s++) {
        const e = validate(s);

        if (e) {
          setStep(s);
          setError(e);
          return;
        }
      }
    } else {
      const e = validate(1);

      if (e) {
        setError(e);
        return;
      }
    }

    setError("");

    setBusy(
      publish
        ? "publish"
        : "draft"
    );

    try {
      let saved: any;

      if (editing && id) {
        saved = await updateCampaign(
          id,
          cleaned as any
        );
      } else {
        saved = await createCampaign(
          cleaned as any
        );
      }

      if (publish) {
        saved =
          await publishCampaign(
            saved.id
          );
      }

      navigate(
        `/campaigns/${saved.id}`
      );
    } catch (e) {
      setError(
        message(
          e,
          publish
            ? "Could not publish the campaign."
            : "Could not save the campaign."
        )
      );
    } finally {
      setBusy(null);
    }
  }

  function submit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    void save(true);
  }

  if (loading) {
    return (
      <div className="cf-page cf-loading">
        <Loader2
          size={19}
          className="cf-spin"
        />
        Loading campaign…
        <style>{CSS}</style>
      </div>
    );
  }

  return (
    <div className="cf-page">
      <style>{CSS}</style>

      <div className="cf-shell">

        {/* TOP BAR */}
        <div className="cf-topbar">

          <Link
            to={
              editing && id
                ? `/campaigns/${id}`
                : "/campaigns"
            }
            className="cf-back"
          >
            <ArrowLeft size={15} />
            Back to campaigns
          </Link>

          {/* CENTERED LOGO */}
          <button
            type="button"
            className="cf-logo"
            onClick={() =>
              navigate("/dashboard")
            }
            aria-label="Go to dashboard"
          >
            <LogoMark size={27} />
            <span>creatorhub</span>
          </button>

          <button
            type="button"
            className="cf-preview-trigger"
            onClick={() => setShowPreview(true)}
          >
            Preview as creator
          </button>

        </div>

        {/* PROGRESS */}
        <div className="cf-progress">

          <div className="cf-progress-head">

            <div>
              <p className="cf-kicker">
                CAMPAIGN SETUP
              </p>

              <h2>
                {editing
                  ? "Update your campaign"
                  : "Create your campaign"}
              </h2>

              <p className="cf-muted">
                Set the basics first. The rest
                can be completed step by step.
              </p>
            </div>

            <span>
              {step} / 4
            </span>

          </div>

          <div className="cf-steps">

            {STEPS.map(
              (item, index) => {
                const number =
                  index + 1;

                return (
                  <div
                    key={item[0]}
                    className={`cf-step ${
                      number === step
                        ? "active"
                        : ""
                    } ${
                      number < step
                        ? "done"
                        : ""
                    }`}
                  >

                    <div className="cf-step-dot">
                      {number < step ? (
                        <Check size={13} />
                      ) : (
                        number
                      )}
                    </div>

                    <span>
                      {item[0]} ·{" "}
                      {number === 1
                        ? "Required"
                        : "Optional"}
                    </span>

                  </div>
                );
              }
            )}

          </div>
        </div>

        <main className="cf-main">

          {error && (
            <div
              className="cf-error"
              role="alert"
            >
              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <form onSubmit={submit}>

            {/* =========================
                STEP 1
            ========================== */}

            {step === 1 && (
              <Card
                number="01"
                title="Basics"
                description="Start with the information creators need to understand the opportunity."
              >

                <Field
                  label="Campaign title"
                  required
                  hint="Example: Summer product launch campaign"
                  error={fieldErrors.title}
                >
                  <input
                    value={form.title}
                    onChange={(e) =>
                      set(
                        "title",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Summer product launch campaign"
                  />
                </Field>

                <div className="cf-grid-2">

                  <Field
                    label="Category"
                    required
                    hint="Example: Beauty, Fashion, or Food"
                    error={fieldErrors.category}
                  >
                    <select
                      value={form.category}
                      onChange={(e) =>
                        set(
                          "category",
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select category
                      </option>

                      {CATEGORIES.map(
                        (x) => (
                          <option
                            key={x}
                            value={x}
                          >
                            {x}
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                  <Field
                    label="Number of creators"
                    required
                    hint="Example: 3 creators"
                    error={fieldErrors.creators_needed}
                  >
                    <input
                      type="number"
                      min="1"
                      value={
                        form.creators_needed
                      }
                      onChange={(e) =>
                        set(
                          "creators_needed",
                          Math.max(
                            1,
                            Number(
                              e.target.value
                            ) || 1
                          )
                        )
                      }
                    />
                  </Field>

                </div>

                <Field
                  label="Creator type needed"
                  required
                  hint="Select every suitable type, or add your own. Example: Travel Creator."
                >
                  <Options
                    values={CREATOR_TYPES}
                    selected={form.creator_types}
                    multi
                    onToggle={(x) =>
                      toggle("creator_types", x)
                    }
                  />

                  <CustomCreatorType
                    onAdd={addCustomCreatorType}
                  />

                  {fieldErrors.creator_types && (
                    <span className="cf-field-error cf-option-error">
                      {fieldErrors.creator_types}
                    </span>
                  )}
                </Field>

                <Field
                  label="Campaign description"
                  required
                  hint="Example: Explain the goal, audience, product, and what success should look like."
                  error={fieldErrors.description}
                >
                  <textarea
                    rows={6}
                    value={
                      form.description
                    }
                    onChange={(e) =>
                      set(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Launch our summer collection with authentic short-form videos that introduce the new products."
                  />
                </Field>

              </Card>
            )}

            {/* =========================
                STEP 2
            ========================== */}

            {step === 2 && (
              <Card
                number="02"
                title="Work"
                description="Tell creators exactly what they will be responsible for delivering."
              >

                <Field
                  label="Responsibilities"
                  required
                  hint="Example: Create 3 reels, follow the brief, and submit drafts for review."
                  error={fieldErrors.responsibilities}
                >
                  <textarea
                    rows={6}
                    value={
                      form.responsibilities
                    }
                    onChange={(e) =>
                      set(
                        "responsibilities",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Create and publish 3 Instagram reels showcasing the product and its key features."
                  />
                </Field>

                <Field
                  label="Deliverables"
                  required
                  hint="Add each deliverable separately. Example: 1 Instagram reel, 3 stories, or 5 product photos."
                  error={fieldErrors.deliverables}
                >

                  <div className="cf-list">

                    {form.deliverables.map(
                      (x, i) => (
                        <div
                          className="cf-row"
                          key={i}
                        >

                          <span className="cf-index">
                            {i + 1}
                          </span>

                          <input
                            value={x}
                            onChange={(e) => {
                              const value = e.target.value;
                              setForm((v) => ({
                                ...v,
                                deliverables:
                                  v.deliverables.map(
                                    (d, j) =>
                                      j === i
                                        ? value
                                        : d
                                  ),
                              }));
                              setFieldErrors((v) => {
                                if (!v.deliverables) return v;
                                const next = { ...v };
                                delete next.deliverables;
                                return next;
                              });
                            }}
                            placeholder="e.g. 1 Instagram reel, 3 stories, or 5 product photos"
                          />

                          <button
                            type="button"
                            className="cf-remove"
                            onClick={() =>
                              setForm((v) => {
                                const updated =
                                  v.deliverables.filter(
                                    (_, j) =>
                                      j !== i
                                  );

                                return {
                                  ...v,
                                  deliverables:
                                    updated.length
                                      ? updated
                                      : [""],
                                };
                              })
                            }
                            aria-label="Remove"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>

                        </div>
                      )
                    )}

                  </div>

                  <button
                    type="button"
                    className="cf-add"
                    disabled={!form.deliverables[form.deliverables.length - 1]?.trim()}
                    onClick={() =>
                      setForm((v) => ({
                        ...v,
                        deliverables: [
                          ...v.deliverables,
                          "",
                        ],
                      }))
                    }
                  >
                    <Plus size={15} />
                    <span className="cf-add-label">Add deliverable</span>
                  </button>

                </Field>

              </Card>
            )}

            {/* =========================
                STEP 3
            ========================== */}

            {step === 3 && (
              <Card
                number="03"
                title="Engagement & budget"
                description="Set the working relationship and how compensation will be structured."
              >

                <Field
                  label="Engagement type"
                  required
                  error={fieldErrors.engagement_type}
                >
                  <Options
                    values={
                      ENGAGEMENT_TYPES
                    }
                    selected={
                      form.engagement_type
                    }
                    onSelect={(x) => {
                      set("engagement_type", x);
                      if (!DATE_BASED_ENGAGEMENTS.includes(x)) {
                        setForm((v) => ({
                          ...v,
                          engagement_type: x,
                          start_date: "",
                          end_date: "",
                        }));
                        setFieldErrors((v) => {
                          const next = { ...v };
                          delete next.start_date;
                          delete next.end_date;
                          return next;
                        });
                      }
                    }}
                  />
                </Field>

                <div className="cf-grid-2">

                  <Field
                    label="Duration"
                    hint="Example: 4 weeks or 10 days. Leave blank if not needed."
                  >
                    <input
                      value={
                        form.duration
                      }
                      onChange={(e) =>
                        set(
                          "duration",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 4 weeks"
                    />
                  </Field>

                  <Field
                    label="Work arrangement"
                    required
                    error={fieldErrors.work_arrangement}
                  >
                    <Options
                      values={
                        WORK_ARRANGEMENTS
                      }
                      selected={
                        form.work_arrangement
                      }
                      onSelect={(x) =>
                        set(
                          "work_arrangement",
                          x
                        )
                      }
                    />
                  </Field>

                </div>

                <div className="cf-divider" />

                <Field
                  label="Pricing model"
                  required
                  error={fieldErrors.pricing_model}
                >
                  <Options
                    values={
                      PRICING_MODELS
                    }
                    selected={
                      form.pricing_model
                    }
                    onSelect={(x) =>
                      set(
                        "pricing_model",
                        x
                      )
                    }
                  />
                </Field>

                <Field
                  label="Compensation"
                  required
                  error={fieldErrors.compensation_type}
                  hint="Choose a custom amount, a budget range, or let CreatorHub apply the standard rate for the selected term."
                >
                  <Options
                    values={
                      COMPENSATION_TYPES
                    }
                    selected={
                      form.compensation_type
                    }
                    onSelect={(x) =>
                      set(
                        "compensation_type",
                        x
                      )
                    }
                  />
                </Field>

                <div className="cf-payment-policy">
                  <div className="cf-payment-policy-head">
                    <div>
                      <strong>CreatorHub payment policy</strong>
                      <span>Brands see the exact payment breakdown before paying.</span>
                    </div>
                    <span className="cf-payment-policy-badge">10% platform fee</span>
                  </div>

                  <div className="cf-payment-policy-table">
                    <div><span>One-time</span><strong>NPR 500</strong></div>
                    <div><span>Monthly</span><strong>NPR 2,000</strong></div>
                    <div><span>Long-term</span><strong>NPR 5,000</strong></div>
                    <div><span>Yearly</span><strong>NPR 5,000</strong></div>
                  </div>

                  <div className="cf-payment-policy-copy">
                    If you enter a custom budget, that amount is the total the brand pays. CreatorHub keeps 10% and the creator receives 90%. If you choose the CreatorHub standard rate, the amount above is used automatically for the selected engagement term.
                  </div>

                  {form.pricing_model === "CreatorHub standard rate" && form.engagement_type && (
                    <div className="cf-payment-policy-selected">
                      {creatorHubRateForTerm(form.engagement_type) != null
                        ? `Selected: ${form.engagement_type} — NPR ${creatorHubRateForTerm(form.engagement_type)!.toLocaleString()}`
                        : `${form.engagement_type} does not have a CreatorHub standard rate yet. Enter a custom amount.`}
                    </div>
                  )}
                </div>

                {form.compensation_type ===
                  "Custom amount" && (
                  <Field
                    label="Custom amount"
                    required
                    error={fieldErrors.budget}
                  >
                    <Money
                      value={form.budget}
                      onChange={(x) =>
                        set(
                          "budget",
                          x
                        )
                      }
                    />
                  </Field>
                )}

                {form.compensation_type ===
                  "Budget range" && (
                  <div className="cf-grid-2">

                    <Field
                      label="Minimum budget"
                      required
                      error={fieldErrors.budget_min}
                    >
                      <Money
                        value={
                          form.budget_min
                        }
                        onChange={(x) =>
                          set(
                            "budget_min",
                            x
                          )
                        }
                      />
                    </Field>

                    <Field
                      label="Maximum budget"
                      required
                      error={fieldErrors.budget_max}
                      hint="If a creator is selected, the maximum budget is the amount used for payment."
                    >
                      <Money
                        value={
                          form.budget_max
                        }
                        onChange={(x) =>
                          set(
                            "budget_max",
                            x
                          )
                        }
                      />
                    </Field>

                  </div>
                )}

                <Field
                  label="Compensation description"
                  hint="Example: Includes content creation, editing, revisions, and usage rights."
                >
                  <textarea
                    rows={4}
                    value={
                      form.compensation_description
                    }
                    onChange={(e) =>
                      set(
                        "compensation_description",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Includes content creation, editing, revisions, and agreed usage rights."
                  />
                </Field>

              </Card>
            )}

            {/* =========================
                STEP 4
            ========================== */}

            {step === 4 && (
              <Card
                number="04"
                title="Requirements"
                description="Define who can apply and add any practical timeline or screening details."
              >

                <Field
                  label="Experience level"
                  required
                  error={fieldErrors.experience_level}
                >
                  <Options
                    values={
                      EXPERIENCE_LEVELS
                    }
                    selected={
                      form.experience_level
                    }
                    onSelect={(x) =>
                      set(
                        "experience_level",
                        x
                      )
                    }
                  />
                </Field>

                <Field
                  label="Required skills"
                  required
                  error={fieldErrors.required_skills}
                  hint="Select all skills that are genuinely required."
                >
                  <Options
                    values={SKILLS}
                    selected={
                      form.required_skills
                    }
                    multi
                    onToggle={(x) =>
                      toggle(
                        "required_skills",
                        x
                      )
                    }
                  />

                  <CustomSkill
                    onAdd={addCustomRequiredSkill}
                  />
                </Field>

                <div className="cf-grid-2">

                  <Field
                    label="Location"
                    hint="Type a location and choose a suggestion, or enter your own. Example: Kathmandu, Nepal or Remote."
                  >
                    <LocationInput
                      value={form.location}
                      onChange={(value) =>
                        set("location", value)
                      }
                    />
                  </Field>

                  <Field
                    label="Additional requirements"
                    hint="Example: Own camera equipment, fluent English, or available on weekends."
                  >
                    <input
                      value={
                        form.requirements
                      }
                      onChange={(e) =>
                        set(
                          "requirements",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Own camera equipment"
                    />
                  </Field>

                </div>

                <div className="cf-divider" />

                <div className="cf-subheading">
                  <h3>Timeline</h3>
                  <p>
                    {DATE_BASED_ENGAGEMENTS.includes(form.engagement_type)
                      ? "Set the campaign dates for this engagement."
                      : "Long-term campaigns do not need fixed start or end dates."}
                  </p>
                </div>

                {DATE_BASED_ENGAGEMENTS.includes(form.engagement_type) && (
                  <div className="cf-grid-2">
                    <Field
                      label="Start date"
                      hint="Example: choose the date the creator should begin."
                      error={fieldErrors.start_date}
                    >
                      <input
                        type="date"
                        min={today}
                        value={form.start_date}
                        onChange={(e) => set("start_date", e.target.value)}
                      />
                    </Field>

                    <Field
                      label="End date"
                      hint="Example: choose the final delivery date."
                      error={fieldErrors.end_date}
                    >
                      <input
                        type="date"
                        min={form.start_date || today}
                        value={form.end_date}
                        onChange={(e) => set("end_date", e.target.value)}
                      />
                    </Field>
                  </div>
                )}

                <Field
                  label="Application deadline"
                  hint="Example: the last day creators can apply. It cannot be before today."
                  error={fieldErrors.application_deadline}
                >
                  <input
                    type="date"
                    min={today}
                    value={form.application_deadline}
                    onChange={(e) => set("application_deadline", e.target.value)}
                  />
                </Field>

                <div className="cf-divider" />

                <div className="cf-question-head">

                  <div className="cf-subheading">
                    <h3>
                      Screening questions
                    </h3>

                    <p>
                      Optional questions creators
                      answer when applying.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="cf-add"
                    onClick={() =>
                      setQuestions((q) => [
                        ...q,
                        "",
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add question
                  </button>

                </div>

                {questions.length > 0 && (
                  <div className="cf-list">

                    {questions.map(
                      (q, i) => (
                        <div
                          className="cf-row"
                          key={i}
                        >

                          <span className="cf-index">
                            {i + 1}
                          </span>

                          <input
                            value={q}
                            onChange={(e) =>
                              setQuestions(
                                (v) =>
                                  v.map(
                                    (x, j) =>
                                      j === i
                                        ? e
                                            .target
                                            .value
                                        : x
                                  )
                              )
                            }
                            placeholder="e.g. What makes you a good fit for this campaign?"
                          />

                          <button
                            type="button"
                            className="cf-remove"
                            onClick={() =>
                              setQuestions(
                                (v) =>
                                  v.filter(
                                    (_, j) =>
                                      j !== i
                                  )
                              )
                            }
                            aria-label="Remove"
                          >
                            <Trash2
                              size={15}
                            />
                          </button>

                        </div>
                      )
                    )}

                  </div>
                )}

              </Card>
            )}

            {/* =========================
                FOOTER
            ========================== */}

            <footer className="cf-footer">

              <button
                type="button"
                className="cf-btn light"
                disabled={!!busy}
                onClick={back}
              >
                <ArrowLeft size={15} />

                {step === 1
                  ? "Cancel"
                  : "Back"}
              </button>

              <div className="cf-footer-right">

                <button
                  type="button"
                  className="cf-btn outline"
                  disabled={!!busy}
                  onClick={() =>
                    void save(false)
                  }
                >
                  {busy === "draft" && (
                    <Loader2
                      size={15}
                      className="cf-spin"
                    />
                  )}

                  Save draft
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    className="cf-btn black"
                    disabled={!!busy}
                    onClick={next}
                  >
                    Continue

                    <ArrowRight
                      size={15}
                    />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="cf-btn black"
                    disabled={!!busy}
                  >
                    {busy === "publish" && (
                      <Loader2
                        size={15}
                        className="cf-spin"
                      />
                    )}

                    {editing
                      ? "Save & publish"
                      : "Publish campaign"}

                    {busy !== "publish" && (
                      <ArrowRight
                        size={15}
                      />
                    )}
                  </button>
                )}

              </div>

            </footer>

          </form>

        </main>
      </div>

      {showPreview && (
        <CreatorPreview
          form={form}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

/* =========================================
   CREATOR PREVIEW
========================================= */

function CreatorPreview({
  form,
  questions,
  onClose,
}: {
  form: CampaignFormData;
  questions: string[];
  onClose: () => void;
}) {
  const dateLabel = (value: string) => {
    if (!value) return "Not specified";
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const standardRate = creatorHubRateForTerm(form.engagement_type);
  const budgetLabel =
    form.compensation_type === "Custom amount" && form.budget
      ? `Rs. ${form.budget.toLocaleString()}`
      : form.compensation_type === "Budget range" && form.budget_min && form.budget_max
        ? `Rs. ${form.budget_min.toLocaleString()} – Rs. ${form.budget_max.toLocaleString()}`
        : form.compensation_type === "CreatorHub standard rate" && standardRate != null
          ? `NPR ${standardRate.toLocaleString()}`
          : form.compensation_type || "Compensation not specified";

  const deliverables = list(form.deliverables);
  const skills = list(form.required_skills);
  const creatorTypes = list(form.creator_types);
  const applicationQuestions = list(questions);

  return (
    <div className="cf-preview-overlay" role="dialog" aria-modal="true" aria-label="Creator campaign preview">
      <div className="cf-preview-modal">
        <div className="cf-preview-toolbar">
          <div>
            <p className="cf-preview-kicker">CREATOR VIEW</p>
            <h2>Campaign preview</h2>
            <p>See how this opportunity will look to creators.</p>
          </div>
          <button type="button" className="cf-preview-close" onClick={onClose} aria-label="Close preview">
            <X size={18} />
          </button>
        </div>

        <div className="cf-creator-page">
          <div className="cf-creator-hero">
            <div>
              <div className="cf-preview-tags">
                {form.category && <span>{form.category}</span>}
                {form.engagement_type && <span>{form.engagement_type}</span>}
                {form.work_arrangement && <span>{form.work_arrangement}</span>}
              </div>
              <h1>{form.title.trim() || "Your campaign title"}</h1>
              <p>{form.description.trim() || "Your campaign description will appear here."}</p>
            </div>
            <button type="button" className="cf-preview-apply" disabled>Apply now</button>
          </div>

          <div className="cf-creator-layout">
            <div className="cf-creator-main">
              <section className="cf-creator-section">
                <h3>About the campaign</h3>
                <p>{form.description.trim() || "Campaign details will appear here."}</p>
              </section>

              <section className="cf-creator-section">
                <h3>What you'll do</h3>
                <p>{form.responsibilities.trim() || "Responsibilities will appear here."}</p>
              </section>

              <section className="cf-creator-section">
                <h3>Deliverables</h3>
                {deliverables.length ? (
                  <ul className="cf-preview-list">
                    {deliverables.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="cf-preview-muted">No deliverables added yet.</p>
                )}
              </section>

              {form.requirements.trim() && (
                <section className="cf-creator-section">
                  <h3>Requirements</h3>
                  <p>{form.requirements}</p>
                </section>
              )}

              {applicationQuestions.length > 0 && (
                <section className="cf-creator-section">
                  <h3>Application questions</h3>
                  <ol className="cf-preview-list ordered">
                    {applicationQuestions.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
                  </ol>
                </section>
              )}
            </div>

            <aside className="cf-creator-side">
              <div className="cf-preview-info-card">
                <h3>Campaign details</h3>
                <div className="cf-preview-detail"><span>Compensation</span><strong>{budgetLabel}</strong></div>
                {form.compensation_type === "CreatorHub standard rate" && form.engagement_type && (
                  <div className="cf-preview-detail"><span>CreatorHub standard rate</span><strong>{creatorHubRateForTerm(form.engagement_type) != null ? `NPR ${creatorHubRateForTerm(form.engagement_type)!.toLocaleString()}` : "Custom amount required"}</strong></div>
                )}
                {form.pricing_model && <div className="cf-preview-detail"><span>Pricing</span><strong>{form.pricing_model}</strong></div>}
                {form.duration && <div className="cf-preview-detail"><span>Duration</span><strong>{form.duration}</strong></div>}
                {form.location && <div className="cf-preview-detail"><span>Location</span><strong>{form.location}</strong></div>}
                {form.experience_level && <div className="cf-preview-detail"><span>Experience</span><strong>{form.experience_level}</strong></div>}
                {form.creators_needed > 0 && <div className="cf-preview-detail"><span>Creators needed</span><strong>{form.creators_needed}</strong></div>}
                {form.application_deadline && <div className="cf-preview-detail"><span>Apply by</span><strong>{dateLabel(form.application_deadline)}</strong></div>}
              </div>

              {creatorTypes.length > 0 && (
                <div className="cf-preview-info-card">
                  <h3>Creator type</h3>
                  <div className="cf-preview-chip-list">
                    {creatorTypes.map((x) => <span key={x}>{x}</span>)}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div className="cf-preview-info-card">
                  <h3>Skills</h3>
                  <div className="cf-preview-chip-list">
                    {skills.map((x) => <span key={x}>{x}</span>)}
                  </div>
                </div>
              )}

              {(form.start_date || form.end_date) && (
                <div className="cf-preview-info-card">
                  <h3>Timeline</h3>
                  <p className="cf-preview-timeline">
                    {dateLabel(form.start_date)} {form.end_date ? `– ${dateLabel(form.end_date)}` : ""}
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   CARD
========================================= */

function Card({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="cf-card">

      <div className="cf-card-head">

        <p className="cf-card-number">
          STEP {number}
        </p>

        <h2>{title}</h2>

        <p>
          {description}
        </p>

      </div>

      <div className="cf-body">
        {children}
      </div>

    </section>
  );
}

/* =========================================
   FIELD
========================================= */

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={`cf-field ${error ? "has-error" : ""}`}>
      <label>
        {label}
        {required && <b> *</b>}
        {hint && <small>{hint}</small>}
      </label>
      {children}
      {error && <span className="cf-field-error">{error}</span>}
    </div>
  );
}

/* =========================================
   CUSTOM CREATOR TYPE
========================================= */

function CustomCreatorType({
  onAdd,
}: {
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  const add = () => {
    const next = value.trim();
    if (!next) return;
    onAdd(next);
    setValue("");
  };

  return (
    <div className="cf-custom-type">
      <div className="cf-custom-type-input">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Travel Creator, Food Stylist, Makeup Artist"
          aria-label="Custom creator type"
        />
        <button
          type="button"
          className="cf-add cf-custom-type-button"
          onClick={add}
          disabled={!value.trim()}
        >
          <Plus size={15} />
          Add your own
        </button>
      </div>
      <small>Can't find the right type? Write your own and add it above.</small>
    </div>
  );
}

/* =========================================
   CUSTOM REQUIRED SKILL
========================================= */

function CustomSkill({
  onAdd,
}: {
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  const add = () => {
    const next = value.trim();
    if (!next) return;
    onAdd(next);
    setValue("");
  };

  return (
    <div className="cf-custom-type">
      <div className="cf-custom-type-input">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Drone videography, Nepali copywriting, SEO"
          aria-label="Custom required skill"
        />
        <button
          type="button"
          className="cf-add cf-custom-type-button"
          onClick={add}
          disabled={!value.trim()}
        >
          <Plus size={15} />
          <span className="cf-add-label">Add skill</span>
        </button>
      </div>
      <small>Can't find the skill you need? Write your own and add it above.</small>
    </div>
  );
}

/* =========================================
   LOCATION SUGGESTIONS
========================================= */

function LocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  const query = value.trim().toLowerCase();
  const suggestions = LOCATION_SUGGESTIONS
    .filter((location) =>
      !query || location.toLowerCase().includes(query)
    )
    .slice(0, 6);

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <div className="cf-location-wrap">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setFocused(false), 120);
        }}
        placeholder="e.g. Kathmandu, Nepal or Remote"
        autoComplete="off"
      />

      {showSuggestions && (
        <div className="cf-location-suggestions">
          {suggestions.map((location) => (
            <button
              key={location}
              type="button"
              className="cf-location-suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(location);
                setFocused(false);
              }}
            >
              {location}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================
   OPTIONS
========================================= */

function Options({
  values,
  selected,
  multi,
  onSelect,
  onToggle,
}: {
  values: string[];
  selected: string | string[];
  multi?: boolean;
  onSelect?: (v: string) => void;
  onToggle?: (v: string) => void;
}) {
  const selectedValues =
    Array.isArray(selected)
      ? selected
      : selected
        ? [selected]
        : [];

  const displayValues = [
    ...values,
    ...selectedValues.filter(
      (v) => !values.includes(v)
    ),
  ];

  return (
    <div
      className={`cf-options ${
        multi
          ? "multi"
          : "single"
      }`}
    >
      {displayValues.map((v) => {
        const active =
          selectedValues.includes(v);

        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            className={`cf-option ${
              active
                ? "selected"
                : ""
            }`}
            onClick={() =>
              multi
                ? onToggle?.(v)
                : onSelect?.(v)
            }
          >
            <span
              className="cf-option-indicator"
              aria-hidden="true"
            >
              {active && (
                <Check
                  size={11}
                  strokeWidth={2.5}
                />
              )}
            </span>

            <span className="cf-option-text">
              {v}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================================
   MONEY
========================================= */

function Money({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v?: number) => void;
}) {
  return (
    <div className="cf-money">

      <span>Rs.</span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={
          value ?? ""
        }
        onChange={(e) =>
          onChange(
            e.target.value === ""
              ? undefined
              : Number(
                  e.target.value
                )
          )
        }
        placeholder="e.g. 2000"
      />

    </div>
  );
}

/* =========================================
   CSS
========================================= */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600&family=Poppins:wght@300;400;500&display=swap');

*{
  box-sizing:border-box;
}

.cf-page{
  min-height:100vh;

  background:#fff;

  color:#111;

  font-family:Poppins,Arial,sans-serif;

  padding:28px 22px 70px;
}

.cf-shell{
  max-width:920px;

  margin:auto;
}

/* =========================================
   CREATOR PREVIEW
========================================= */

.cf-preview-trigger{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:38px;
  padding:9px 14px;
  border:1px solid #d8d8d8 !important;
  border-radius:8px;
  background:#fff !important;
  color:#111 !important;
  font:400 12px Poppins,Arial,sans-serif !important;
  cursor:pointer;
  box-shadow:none !important;
  outline:none !important;
}

.cf-preview-trigger:hover{
  background:#f5f5f5 !important;
  border-color:#cfcfcf !important;
}

.cf-preview-overlay{
  position:fixed;
  inset:0;
  z-index:1000;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  background:rgba(17,17,17,.38);
}

.cf-preview-modal{
  width:min(1080px,100%);
  max-height:92vh;
  overflow:auto;
  background:#fff;
  border:1px solid #ddd;
  border-radius:16px;
  box-shadow:0 24px 70px rgba(0,0,0,.18);
}

.cf-preview-toolbar{
  position:sticky;
  top:0;
  z-index:2;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:20px;
  padding:20px 24px;
  background:rgba(255,255,255,.96);
  border-bottom:1px solid #eee;
}

.cf-preview-toolbar h2{
  margin:2px 0 2px;
  font:500 23px 'League Spartan',Arial,sans-serif;
}

.cf-preview-toolbar p{
  margin:0;
  color:#777;
  font-size:11px;
}

.cf-preview-kicker{
  font-size:9px !important;
  letter-spacing:.12em;
  color:#777 !important;
}

.cf-preview-close{
  width:36px;
  height:36px;
  display:grid;
  place-items:center;
  border:1px solid #ddd !important;
  border-radius:8px;
  background:#fff !important;
  color:#555 !important;
  cursor:pointer;
  box-shadow:none !important;
}

.cf-preview-close:hover{
  background:#f5f5f5 !important;
  color:#111 !important;
}

.cf-creator-page{
  padding:28px;
  background:#fafafa;
}

.cf-creator-hero{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:24px;
  padding:28px;
  background:#fff;
  border:1px solid #e5e5e5;
  border-radius:12px;
}

.cf-creator-hero h1{
  margin:10px 0 8px;
  font:500 34px 'League Spartan',Arial,sans-serif;
  letter-spacing:-.4px;
}

.cf-creator-hero p{
  max-width:700px;
  margin:0;
  color:#666;
  font-size:12px;
  line-height:1.75;
}

.cf-preview-tags{
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}

.cf-preview-tags span,
.cf-preview-chip-list span{
  display:inline-flex;
  align-items:center;
  padding:6px 9px;
  border:1px solid #ddd;
  border-radius:999px;
  background:#f7f7f7;
  color:#444;
  font-size:10px;
}

.cf-preview-apply{
  flex:0 0 auto;
  min-width:115px;
  padding:11px 16px;
  border:1px solid #111 !important;
  border-radius:8px;
  background:#111 !important;
  color:#fff !important;
  font:500 12px Poppins,Arial,sans-serif !important;
}

.cf-creator-layout{
  display:grid;
  grid-template-columns:minmax(0,1fr) 300px;
  gap:18px;
  margin-top:18px;
}

.cf-creator-main,
.cf-creator-side{
  min-width:0;
}

.cf-creator-section,
.cf-preview-info-card{
  margin-bottom:18px;
  padding:22px;
  background:#fff;
  border:1px solid #e5e5e5;
  border-radius:12px;
}

.cf-creator-section h3,
.cf-preview-info-card h3{
  margin:0 0 10px;
  font:500 16px 'League Spartan',Arial,sans-serif;
}

.cf-creator-section p{
  margin:0;
  color:#555;
  font-size:12px;
  line-height:1.8;
  white-space:pre-line;
}

.cf-preview-list{
  margin:0;
  padding-left:19px;
  color:#444;
  font-size:12px;
  line-height:1.8;
}

.cf-preview-list.ordered{
  padding-left:22px;
}

.cf-preview-list li + li{
  margin-top:7px;
}

.cf-preview-muted{
  color:#999 !important;
}

.cf-preview-detail{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:15px;
  padding:10px 0;
  border-bottom:1px solid #eee;
  font-size:10px;
}

.cf-preview-detail:last-child{
  border-bottom:0;
  padding-bottom:0;
}

.cf-preview-detail span{
  color:#888;
}

.cf-preview-detail strong{
  max-width:165px;
  color:#222;
  font-weight:500;
  text-align:right;
}

.cf-preview-chip-list{
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}

.cf-preview-timeline{
  margin:0;
  color:#444;
  font-size:11px;
}

/* =========================================
   TOP BAR
========================================= */

.cf-topbar{
  position:relative;

  display:flex;

  align-items:center;

  justify-content:space-between;

  min-height:32px;

  margin-bottom:35px;
}

/* Back */

.cf-back{
  display:inline-flex;

  align-items:center;

  gap:6px;

  border:0!important;

  outline:0!important;

  background:transparent!important;

  color:#666;

  text-decoration:none;

  font:400 12px Poppins;

  cursor:pointer;

  padding:0!important;

  margin:0;

  box-shadow:none!important;

  appearance:none;
}

.cf-back:hover,
.cf-back:focus,
.cf-back:focus-visible,
.cf-back:active{
  border:0!important;

  outline:0!important;

  background:transparent!important;

  color:#111;

  box-shadow:none!important;
}

/* =========================================
   CENTER LOGO
========================================= */

.cf-logo{
  position:absolute;

  left:50%;

  top:50%;

  transform:translate(-50%,-50%);

  display:flex;

  align-items:center;

  justify-content:center;

  gap:8px;

  margin:0;

  padding:0!important;

  border:0!important;

  outline:none!important;

  background:transparent!important;

  color:#111!important;

  box-shadow:none!important;

  cursor:pointer;

  appearance:none;
}

.cf-logo:hover,
.cf-logo:focus,
.cf-logo:focus-visible,
.cf-logo:active{
  border:0!important;

  outline:0!important;

  background:transparent!important;

  color:#111!important;

  box-shadow:none!important;

  transform:translate(-50%,-50%);
}

.cf-logo span{
  font-family:'League Spartan',Arial,sans-serif;

  font-size:23px;

  line-height:1;

  font-weight:500;

  letter-spacing:0;
}

.cf-topbar-spacer{
  width:140px;

  height:1px;
}

/* =========================================
   PROGRESS
========================================= */

.cf-progress{
  margin:0 0 28px;
}

.cf-progress-head{
  display:flex;

  justify-content:space-between;

  align-items:flex-end;
}

.cf-kicker{
  font-size:10px;

  letter-spacing:.12em;

  color:#777;

  margin:0 0 5px;
}

.cf-progress-head h2{
  font:400 34px 'League Spartan';

  margin:0 0 5px;

  letter-spacing:-.4px;
}

.cf-muted{
  font-size:12px;

  color:#777;

  margin:0;
}

.cf-progress-head>span{
  font-size:11px;

  color:#777;
}

/* =========================================
   STEPS
========================================= */

.cf-steps{
  display:grid;

  grid-template-columns:
    repeat(4,1fr);

  gap:7px;

  margin-top:25px;
}

.cf-step{
  border-top:1px solid #ddd;

  padding-top:10px;

  color:#999;

  font-size:10px;
}

.cf-step.active,
.cf-step.done{
  border-color:#111;

  color:#111;
}

.cf-step-dot{
  width:22px;

  height:22px;

  border:1px solid #d5d5d5;

  border-radius:50%;

  display:grid;

  place-items:center;

  font-size:10px;

  margin-bottom:7px;
}

.cf-step.active .cf-step-dot,
.cf-step.done .cf-step-dot{
  background:#111;

  color:#fff;

  border-color:#111;
}

/* =========================================
   MAIN
========================================= */

.cf-main{
  min-width:0;
}

/* =========================================
   ERROR
========================================= */

.cf-error{
  display:flex;

  align-items:center;

  justify-content:space-between;

  gap:12px;

  margin:0 0 16px;

  padding:10px 12px;

  background:#f5f5f5;

  border:1px solid #ddd;

  border-radius:8px;

  color:#333;

  font-size:11px;
}

.cf-error button{
  border:0!important;

  outline:0!important;

  background:none!important;

  color:#555;

  display:grid;

  place-items:center;

  cursor:pointer;

  box-shadow:none!important;
}

.cf-error button:hover,
.cf-error button:focus,
.cf-error button:focus-visible,
.cf-error button:active{
  border:0!important;

  outline:0!important;

  background:none!important;

  color:#111;

  box-shadow:none!important;
}

/* =========================================
   CARD
========================================= */

.cf-card{
  border:1px solid #e2e2e2;

  border-radius:15px;

  padding:34px 38px;

  background:#fff;

  box-shadow:
    0 18px 50px rgba(0,0,0,.045);
}

.cf-card-head{
  border:0;

  padding:0;

  margin:0 0 28px;
}

.cf-card-number{
  font-size:10px;

  letter-spacing:.12em;

  color:#777;

  margin:0 0 5px;
}

.cf-card-head h2{
  font:400 25px 'League Spartan';

  margin:0 0 5px;
}

.cf-card-head p:last-child{
  font-size:12px;

  color:#777;

  margin:0;

  line-height:1.6;
}

.cf-body{
  display:flex;

  flex-direction:column;

  gap:21px;

  padding:0;
}

/* =========================================
   FIELD VALIDATION + CUSTOM INPUT
========================================= */

.cf-field-error{
  display:block;
  color:#8b5555;
  font-size:10px;
  line-height:1.45;
  margin-top:-2px;
}

.cf-option-error{
  margin-top:0;
}

.cf-custom-type{
  display:flex;
  flex-direction:column;
  gap:5px;
}

.cf-custom-type-input{
  display:flex;
  align-items:center;
  gap:8px;
}

.cf-custom-type-input input{
  flex:1;
}

.cf-custom-type small{
  color:#888;
  font-size:10px;
}

.cf-custom-type-button{
  margin-top:0 !important;
  white-space:nowrap;
}

.cf-custom-type-button:disabled{
  opacity:.5;
  cursor:not-allowed;
}

/* =========================================
   LOCATION SUGGESTIONS
========================================= */

.cf-location-wrap{
  position:relative;
  width:100%;
}

.cf-location-suggestions{
  position:absolute;
  z-index:30;
  left:0;
  right:0;
  top:calc(100% + 4px);
  max-height:220px;
  overflow:auto;
  padding:5px;
  border:1px solid #d8d8d8;
  border-radius:8px;
  background:#fff;
  box-shadow:0 10px 25px rgba(0,0,0,.08);
}

.cf-location-suggestion{
  width:100%;
  display:block;
  padding:9px 10px;
  border:0;
  border-radius:6px;
  background:#fff;
  color:#333;
  font:400 11px Poppins,Arial,sans-serif;
  text-align:left;
  cursor:pointer;
}

.cf-location-suggestion:hover,
.cf-location-suggestion:focus{
  background:#f1f1f1;
  color:#111;
  outline:none;
}

/* =========================================
   FORM FIELDS
========================================= */

.cf-field{
  display:flex;

  flex-direction:column;

  gap:8px;
}

.cf-field label{
  display:block;

  color:#222;

  font-size:11px;

  font-weight:500;
}

.cf-field label b{
  font-weight:500;
}

.cf-field label small{
  display:block;

  color:#777;

  font-size:10px;

  line-height:1.45;

  font-weight:400;

  margin-top:4px;
}

.cf-field.has-error input,
.cf-field.has-error textarea,
.cf-field.has-error select{
  border-color:#c9aaaa !important;
}

.cf-field input,
.cf-field textarea,
.cf-field select{
  width:100%;

  box-sizing:border-box;

  border:1px solid #d8d8d8;

  border-radius:8px;

  background:#fff;

  color:#111;

  outline:none;

  padding:10px 12px;

  font:400 12px Poppins;
}

.cf-field input,
.cf-field select{
  min-height:43px;
}

.cf-field textarea{
  resize:vertical;

  line-height:1.55;
}

.cf-field input::placeholder,
.cf-field textarea::placeholder{
  color:#aaa;
}

.cf-field input:focus,
.cf-field textarea:focus,
.cf-field select:focus{
  border-color:#111;

  box-shadow:none;

  outline:none;
}

/* =========================================
   GRIDS
========================================= */

.cf-grid-2{
  display:grid;

  grid-template-columns:
    1fr 1fr;

  gap:13px;
}

.cf-grid-3{
  display:grid;

  grid-template-columns:
    repeat(3,1fr);

  gap:13px;
}

/* =========================================
   CLEAN OPTION GRID
========================================= */

.cf-options{
  display:grid;

  grid-template-columns:
    repeat(3,minmax(0,1fr));

  gap:9px;
}

.cf-options.single,
.cf-options.multi{
  display:grid;

  grid-template-columns:
    repeat(3,minmax(0,1fr));

  gap:9px;
}

.cf-option{
  width:100%;
  display:flex;
  align-items:center;
  gap:9px;
  min-height:43px;
  padding:10px 12px;
  border:1px solid #d8d8d8 !important;
  border-radius:8px;
  background:#fff !important;
  color:#333 !important;
  font:400 11px Poppins;
  text-align:left;
  cursor:pointer;
  outline:none !important;
  box-shadow:none !important;
  transition:background .15s ease, border-color .15s ease, color .15s ease;
}

/* Unselected card stays white. */
.cf-option:hover,
.cf-option:focus,
.cf-option:focus-visible,
.cf-option:active{
  border:1px solid #d8d8d8 !important;
  background:#fff !important;
  color:#333 !important;
  outline:none !important;
  box-shadow:none !important;
}

/* CLICKED CARD = LIGHT GREY */
.cf-option.selected,
.cf-option.selected:hover,
.cf-option.selected:focus,
.cf-option.selected:focus-visible,
.cf-option.selected:active{
  border:1px solid #d8d8d8 !important;
  background:#eeeeee !important;
  color:#111 !important;
  outline:none !important;
  box-shadow:none !important;
}

.cf-option-indicator{
  width:16px;
  height:16px;
  flex:0 0 16px;
  display:grid;
  place-items:center;
  border:1px solid #cfcfcf;
  border-radius:4px;
  background:#fff;
  color:transparent;
  transition:background .15s ease, border-color .15s ease, color .15s ease;
}

/* UNSELECTED CHECKBOX = WHITE */
.cf-option:hover .cf-option-indicator,
.cf-option:focus .cf-option-indicator,
.cf-option:focus-visible .cf-option-indicator{
  background:#fff;
  border-color:#cfcfcf;
  color:transparent;
}

/* SELECTED CHECKBOX = BLACK + WHITE TICK */
.cf-option.selected .cf-option-indicator,
.cf-option.selected:hover .cf-option-indicator,
.cf-option.selected:focus .cf-option-indicator,
.cf-option.selected:focus-visible .cf-option-indicator{
  background:#111;
  border-color:#111;
  color:#fff;
}

.cf-option.selected .cf-option-indicator svg{
  width:11px;
  height:11px;
  stroke:#fff !important;
  color:#fff !important;
}

.cf-option-text{
  line-height:1.25;

  white-space:normal;
}

/* =========================================
   LISTS
========================================= */

.cf-list{
  display:flex;

  flex-direction:column;

  gap:7px;
}

.cf-row{
  display:flex;

  align-items:center;

  gap:8px;
}

.cf-row input{
  flex:1;
}

.cf-index{
  width:28px;

  height:28px;

  flex:0 0 28px;

  display:grid;

  place-items:center;

  border:1px solid #ddd;

  border-radius:50%;

  color:#777;

  font-size:10px;
}

.cf-remove{
  width:38px;
  height:38px;
  flex:0 0 38px;
  display:grid;
  place-items:center;
  border:1px solid #d8d8d8 !important;
  border-radius:8px;
  background:#fff !important;
  color:#555 !important;
  cursor:pointer;
  outline:none !important;
  box-shadow:none !important;
}

.cf-remove svg{
  width:15px;
  height:15px;
  stroke:#555 !important;
  color:#555 !important;
  opacity:1 !important;
  visibility:visible !important;
}

.cf-remove:hover,
.cf-remove:focus,
.cf-remove:focus-visible,
.cf-remove:active{
  border:1px solid #d8d8d8 !important;
  background:#f5f5f5 !important;
  color:#111 !important;
  outline:none !important;
  box-shadow:none !important;
}

.cf-remove:hover svg,
.cf-remove:focus svg,
.cf-remove:focus-visible svg{
  stroke:#111 !important;
  color:#111 !important;
}

.cf-add{
  display:inline-flex;

  align-items:center;

  gap:6px;

  border:1px solid #d8d8d8!important;

  background:#fff!important;

  border-radius:8px;

  padding:9px 12px;

  font:400 11px Poppins;

  color:#222;

  cursor:pointer;

  margin-top:2px;

  outline:none!important;

  box-shadow:none!important;
}

.cf-add:hover:not(:disabled),
.cf-add:focus:not(:disabled),
.cf-add:focus-visible:not(:disabled),
.cf-add:active:not(:disabled){
  border:1px solid #d8d8d8!important;
  background:#f7f7f7!important;
  color:#111;
  outline:none!important;
  box-shadow:none!important;
}

.cf-add:disabled{
  opacity:.5;
  cursor:not-allowed;
  border-color:#d8d8d8!important;
  background:#fff!important;
  color:#777!important;
}

/* =========================================
   MONEY
========================================= */

.cf-money{
  display:flex;

  min-height:43px;

  overflow:hidden;

  border:1px solid #d8d8d8;

  border-radius:8px;
}

.cf-money>span{
  display:grid;

  place-items:center;

  padding:0 12px;

  border-right:1px solid #ddd;

  background:#fafafa;

  color:#666;

  font-size:11px;
}

.cf-money input{
  flex:1;

  min-height:0!important;

  border:0!important;

  border-radius:0!important;

  box-shadow:none!important;

  outline:none!important;
}

/* =========================================
   DIVIDERS
========================================= */

.cf-payment-policy{margin-top:16px;border:1px solid #e6e6e6;border-radius:14px;background:#fafafa;padding:16px}.cf-payment-policy-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.cf-payment-policy-head strong{display:block;font:700 13px Poppins,sans-serif;color:#111}.cf-payment-policy-head span{display:block;margin-top:3px;font:400 10px/1.45 Poppins,sans-serif;color:#777}.cf-payment-policy-badge{white-space:nowrap;padding:5px 8px;border-radius:999px;background:#111;color:#fff!important;font:600 9px Poppins,sans-serif!important}.cf-payment-policy-table{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:13px}.cf-payment-policy-table>div{background:#fff;border:1px solid #e9e9e9;border-radius:10px;padding:10px}.cf-payment-policy-table span{display:block;font:500 10px Poppins,sans-serif;color:#777}.cf-payment-policy-table strong{display:block;margin-top:3px;font:700 12px Poppins,sans-serif;color:#111}.cf-payment-policy-copy{margin-top:11px;font:400 10px/1.55 Poppins,sans-serif;color:#777}.cf-payment-policy-selected{margin-top:11px;padding:9px 10px;border-radius:9px;background:#f0f0f0;font:600 10px Poppins,sans-serif;color:#222}.cf-divider{
  height:1px;

  background:#eee;
}

.cf-subheading h3{
  margin:0;

  color:#222;

  font-size:13px;

  font-weight:500;
}

.cf-subheading p{
  margin:3px 0 0;

  color:#777;

  font-size:10px;
}

.cf-question-head{
  display:flex;

  align-items:center;

  justify-content:space-between;

  gap:20px;
}

/* =========================================
   FOOTER
========================================= */

.cf-footer{
  display:flex;

  align-items:center;

  justify-content:space-between;

  margin-top:30px;

  padding-top:20px;

  border-top:1px solid #eee;
}

.cf-footer-right{
  display:flex;

  align-items:center;

  gap:17px;
}

/* =========================================
   BUTTONS
========================================= */

.cf-btn{
  display:inline-flex;

  align-items:center;

  justify-content:center;

  gap:7px;

  font:400 12px Poppins;

  cursor:pointer;

  outline:none!important;

  box-shadow:none!important;
}

.cf-btn:disabled{
  opacity:.55;

  cursor:not-allowed;
}

/* Cancel / Back */

.cf-btn.light{
  border:0!important;

  outline:0!important;

  background:transparent!important;

  color:#666;

  padding:0;

  box-shadow:none!important;
}

.cf-btn.light:hover,
.cf-btn.light:focus,
.cf-btn.light:focus-visible,
.cf-btn.light:active{
  border:0!important;

  outline:0!important;

  background:transparent!important;

  color:#111;

  box-shadow:none!important;
}

/* Save draft */

.cf-btn.outline{
  border:1px solid #d8d8d8!important;

  background:#fff!important;

  color:#222;

  border-radius:8px;

  padding:9px 12px;

  outline:none!important;

  box-shadow:none!important;
}

.cf-btn.outline:hover,
.cf-btn.outline:focus,
.cf-btn.outline:focus-visible,
.cf-btn.outline:active{
  border:1px solid #d8d8d8!important;

  background:#fafafa!important;

  color:#222;

  outline:none!important;

  box-shadow:none!important;

  transform:none!important;
}

/* Primary */

.cf-btn.black{
  appearance:none!important;
  -webkit-appearance:none!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:7px!important;
  min-height:40px;
  border:1px solid #111!important;
  background:#111!important;
  color:#fff!important;
  border-radius:8px;
  padding:11px 18px;
  font-family:Poppins,Arial,sans-serif!important;
  font-size:12px!important;
  font-weight:500!important;
  line-height:1!important;
  text-align:center!important;
  text-decoration:none!important;
  outline:none!important;
  box-shadow:none!important;
}

/* Force the label and arrow to stay visible on the black button. */
.cf-btn.black,
.cf-btn.black span,
.cf-btn.black svg{
  color:#fff!important;
}

.cf-btn.black svg{
  width:15px!important;
  height:15px!important;
  stroke:#fff!important;
  color:#fff!important;
  flex-shrink:0;
}

.cf-btn.black:hover:not(:disabled){
  border-color:#111!important;
  background:#111!important;
  color:#fff!important;
  transform:translateY(-1px);
  box-shadow:none!important;
}

.cf-btn.black:hover:not(:disabled),
.cf-btn.black:hover:not(:disabled) span,
.cf-btn.black:hover:not(:disabled) svg{
  color:#fff!important;
}

.cf-btn.black:hover:not(:disabled) svg{
  stroke:#fff!important;
}

.cf-btn.black:focus,
.cf-btn.black:focus-visible,
.cf-btn.black:active{
  border-color:#111!important;
  background:#111!important;
  color:#fff!important;
  outline:none!important;
  box-shadow:none!important;
}

.cf-btn.black:focus svg,
.cf-btn.black:focus-visible svg,
.cf-btn.black:active svg{
  stroke:#fff!important;
}

/* =========================================
   LOADING
========================================= */

.cf-loading{
  min-height:100vh;

  display:grid;

  place-items:center;

  color:#777;
}

.cf-spin{
  animation:
    cfspin 1s linear infinite;
}

@keyframes cfspin{
  to{
    transform:rotate(360deg);
  }
}

/* =========================================
   RESPONSIVE
========================================= */

@media (max-width: 760px){
  .cf-preview-trigger{
    padding:8px 10px;
    font-size:10px !important;
  }
  .cf-preview-overlay{
    padding:10px;
  }
  .cf-creator-page{
    padding:14px;
  }
  .cf-creator-hero{
    flex-direction:column;
    align-items:stretch;
  }
  .cf-creator-layout{
    grid-template-columns:1fr;
  }
}

@media(max-width:650px){

  .cf-page{
    padding:20px 15px 50px;
  }

  .cf-topbar{
    margin-bottom:30px;
  }

  .cf-progress-head h2{
    font-size:29px;
  }

  .cf-steps{
    grid-template-columns:
      1fr 1fr;

    row-gap:14px;
  }

  .cf-card{
    padding:26px 20px;
  }

  .cf-grid-2,
  .cf-grid-3{
    grid-template-columns:1fr;
  }

  .cf-options,
  .cf-options.single,
  .cf-options.multi{
    grid-template-columns:
      1fr 1fr;
  }

  .cf-footer{
    align-items:flex-start;

    gap:12px;
  }

  .cf-footer-right{
    flex-wrap:wrap;

    justify-content:flex-end;
  }

  .cf-question-head{
    align-items:flex-start;

    flex-direction:column;
  }
}

@media(max-width:480px){

  .cf-shell{
    width:100%;
  }

  .cf-topbar{
    gap:12px;
  }

  .cf-logo span{
    font-size:20px;
  }

  .cf-options,
  .cf-options.single,
  .cf-options.multi{
    grid-template-columns:1fr;
  }

  .cf-footer{
    flex-direction:column;
  }

  .cf-footer-right{
    width:100%;

    justify-content:space-between;
  }

  .cf-footer-right .cf-btn.black{
    flex:1;
  }

  .cf-footer-right .cf-btn.outline{
    flex:1;
  }
}

.cf-add-label{
  display:inline-block !important;
  visibility:visible !important;
  opacity:1 !important;
  color:inherit !important;
  white-space:nowrap !important;
}

/* FINAL ADD-DELIVERABLE BUTTON OVERRIDE
   Keep the button visible and readable even when disabled. */
.cf-add{
  width:max-content !important;
  min-width:0 !important;
  min-height:38px !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:6px !important;
  padding:9px 12px !important;
  border:1px solid #d8d8d8 !important;
  border-radius:8px !important;
  background:#fff !important;
  color:#222 !important;
  font-family:Poppins, Arial, sans-serif !important;
  font-size:11px !important;
  font-weight:400 !important;
  line-height:1 !important;
  text-align:center !important;
  visibility:visible !important;
  box-shadow:none !important;
  outline:none !important;
}

.cf-add span,
.cf-add svg{
  color:#222 !important;
  stroke:#222 !important;
  opacity:1 !important;
  visibility:visible !important;
}

.cf-add svg{
  width:15px !important;
  height:15px !important;
  flex:0 0 15px !important;
}

.cf-add:hover:not(:disabled){
  background:#f7f7f7 !important;
  border-color:#d8d8d8 !important;
  color:#111 !important;
}

.cf-add:disabled{
  width:max-content !important;
  min-width:0 !important;
  opacity:1 !important;
  background:#fff !important;
  border-color:#d8d8d8 !important;
  color:#999 !important;
  cursor:not-allowed !important;
}

.cf-add:disabled span,
.cf-add:disabled svg{
  color:#999 !important;
  stroke:#999 !important;
  opacity:1 !important;
}

`;
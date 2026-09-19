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

const ENGAGEMENT_TYPES = [
  "One-time",
  "Short-term",
  "Long-term",
];

const WORK_ARRANGEMENTS = [
  "Full-time",
  "Part-time",
  "Flexible",
];

const PRICING_MODELS = [
  "Fixed Price",
  "Hourly",
  "Monthly",
];

const COMPENSATION_TYPES = [
  "Fixed amount",
  "Budget range",
  "Negotiable",
];

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
        "Fixed amount"
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
    if (s === 1) {
      if (!form.title.trim()) {
        return "Campaign title is required.";
      }

      if (!form.category) {
        return "Select a category.";
      }

      if (!form.creator_types.length) {
        return "Select at least one creator type.";
      }

      if (form.creators_needed < 1) {
        return "Number of creators must be at least 1.";
      }

      if (!form.description.trim()) {
        return "Campaign description is required.";
      }
    }

    if (s === 2) {
      if (!form.responsibilities.trim()) {
        return "Responsibilities are required.";
      }

      if (!list(form.deliverables).length) {
        return "Add at least one deliverable.";
      }
    }

    if (s === 3) {
      if (!form.engagement_type) {
        return "Select an engagement type.";
      }

      if (!form.work_arrangement) {
        return "Select a work arrangement.";
      }

      if (!form.pricing_model) {
        return "Select a pricing model.";
      }

      if (!form.compensation_type) {
        return "Select a compensation type.";
      }

      if (
        form.compensation_type ===
          "Fixed amount" &&
        (!form.budget ||
          form.budget <= 0)
      ) {
        return "Enter a valid fixed compensation amount.";
      }

      if (
        form.compensation_type ===
        "Budget range"
      ) {
        if (
          !form.budget_min ||
          !form.budget_max ||
          form.budget_min <= 0 ||
          form.budget_max <= 0
        ) {
          return "Enter both budget values.";
        }

        if (
          form.budget_max <
          form.budget_min
        ) {
          return "Maximum budget must be greater than minimum budget.";
        }
      }
    }

    if (s === 4) {
      if (!form.experience_level) {
        return "Select an experience level.";
      }

      if (!form.required_skills.length) {
        return "Select at least one required skill.";
      }

      if (
        form.start_date &&
        form.end_date &&
        form.end_date < form.start_date
      ) {
        return "End date cannot be before start date.";
      }

      if (
        form.application_deadline &&
        form.start_date &&
        form.application_deadline >
          form.start_date
      ) {
        return "Application deadline should be on or before the start date.";
      }
    }

    return null;
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

          <div
            className="cf-topbar-spacer"
            aria-hidden="true"
          />

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
                  hint="Select every creator type that can do the work."
                >
                  <Options
                    values={CREATOR_TYPES}
                    selected={
                      form.creator_types
                    }
                    multi
                    onToggle={(x) =>
                      toggle(
                        "creator_types",
                        x
                      )
                    }
                  />
                </Field>

                <Field
                  label="Campaign description"
                  required
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
                    placeholder="Explain the campaign, its goal, context, and what success should look like."
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
                    placeholder="Describe what the selected creator will be responsible for."
                  />
                </Field>

                <Field
                  label="Deliverables"
                  required
                  hint="Add each deliverable separately."
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
                            onChange={(e) =>
                              setForm((v) => ({
                                ...v,
                                deliverables:
                                  v.deliverables.map(
                                    (d, j) =>
                                      j === i
                                        ? e
                                            .target
                                            .value
                                        : d
                                  ),
                              }))
                            }
                            placeholder={`Deliverable ${
                              i + 1
                            }`}
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
                    Add deliverable
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
                >
                  <Options
                    values={
                      ENGAGEMENT_TYPES
                    }
                    selected={
                      form.engagement_type
                    }
                    onSelect={(x) =>
                      set(
                        "engagement_type",
                        x
                      )
                    }
                  />
                </Field>

                <div className="cf-grid-2">

                  <Field
                    label="Duration"
                    hint="Optional, e.g. 4 weeks."
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
                  hint="Creators can still propose their rate when applying."
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

                {form.compensation_type ===
                  "Fixed amount" && (
                  <Field
                    label="Fixed amount"
                    required
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
                  hint="Optional payment details or negotiation notes."
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
                    placeholder="Optional details about what the budget covers."
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
                </Field>

                <div className="cf-grid-2">

                  <Field
                    label="Location"
                    hint="Optional if fully remote."
                  >
                    <input
                      value={
                        form.location
                      }
                      onChange={(e) =>
                        set(
                          "location",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Kathmandu, Nepal"
                    />
                  </Field>

                  <Field
                    label="Additional requirements"
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
                    Optional, but useful for
                    fixed schedules.
                  </p>
                </div>

                <div className="cf-grid-3">

                  <Field label="Start date">
                    <input
                      type="date"
                      value={
                        form.start_date
                      }
                      onChange={(e) =>
                        set(
                          "start_date",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field label="End date">
                    <input
                      type="date"
                      value={
                        form.end_date
                      }
                      onChange={(e) =>
                        set(
                          "end_date",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Application deadline"
                  >
                    <input
                      type="date"
                      value={
                        form.application_deadline
                      }
                      onChange={(e) =>
                        set(
                          "application_deadline",
                          e.target.value
                        )
                      }
                    />
                  </Field>

                </div>

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
                            placeholder={`Question ${
                              i + 1
                            }`}
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
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="cf-field">

      <label>
        {label}

        {required && <b> *</b>}

        {hint && (
          <small>{hint}</small>
        )}
      </label>

      {children}

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

  return (
    <div
      className={`cf-options ${
        multi
          ? "multi"
          : "single"
      }`}
    >
      {values.map((v) => {
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
        placeholder="0"
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

  border:1px solid #dedede;

  border-radius:8px;

  background:#fff;

  color:#333;

  font:400 11px Poppins;

  text-align:left;

  cursor:pointer;

  transition:
    border-color .15s ease,
    background .15s ease,
    color .15s ease;
}

.cf-option:hover{
  border-color:#bcbcbc;

  background:#fafafa;

  color:#111;
}

.cf-option:focus,
.cf-option:focus-visible{
  outline:none;

  box-shadow:none;
}

.cf-option.selected{
  border-color:#b8b8b8;

  background:#f5f5f5;

  color:#111;
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

  color:#fff;

  transition:
    background .15s ease,
    border-color .15s ease;
}

.cf-option.selected
.cf-option-indicator{
  border-color:#111;

  background:#111;

  color:#fff;
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

  border:1px solid #d8d8d8!important;

  border-radius:8px;

  background:#fff!important;

  color:#777;

  cursor:pointer;

  outline:none!important;

  box-shadow:none!important;
}

.cf-remove:hover,
.cf-remove:focus,
.cf-remove:focus-visible,
.cf-remove:active{
  border:1px solid #aaa!important;

  background:#fff!important;

  color:#111;

  outline:none!important;

  box-shadow:none!important;
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

.cf-add:hover,
.cf-add:focus,
.cf-add:focus-visible,
.cf-add:active{
  border:1px solid #111!important;

  background:#fff!important;

  color:#111;

  outline:none!important;

  box-shadow:none!important;
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

.cf-divider{
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
  border:1px solid #111!important;

  background:#111!important;

  color:#fff;

  border-radius:8px;

  padding:11px 18px;

  outline:none!important;

  box-shadow:none!important;
}

.cf-btn.black:hover:not(:disabled){
  border-color:#000!important;

  background:#000!important;

  color:#fff;

  transform:translateY(-1px);

  box-shadow:none!important;
}

.cf-btn.black:focus,
.cf-btn.black:focus-visible,
.cf-btn.black:active{
  outline:none!important;

  box-shadow:none!important;
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
`;
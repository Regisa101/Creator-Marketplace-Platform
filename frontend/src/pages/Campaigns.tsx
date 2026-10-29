import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChevronDown,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { LogoMark } from "../components/Logo";
import { demoLast } from "../api/demoCampaigns";
import { categoryImage } from "../utils/categoryArt";
import { PublicNavbar } from "../components/PublicNavbar";
import { brandDisplayName, isCreatorHub } from "../utils/brand";
import { useAuth } from "../context/AuthContext";

import { buildSuggestions } from "../utils/recommend";

import {
  getApplications,
  getCreatorProgress,
  getPublicCampaigns,
  getSavedCampaigns,
  saveCampaign,
  unsaveCampaign,
  type PublicCampaign,
  type SavedCampaignEntry,
} from "../api/client";

const API_ORIGIN = "http://localhost:8000";
const CAMPAIGNS_PER_PAGE = 15;

// Budget filter limits (NPR)
const BUDGET_MIN = 1000;
const BUDGET_MAX = 100000;

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/* ============================================================
   HELPERS
============================================================ */

function mediaUrl(value?: string | null) {
  if (!value) return "";

  if (
    /^(https?:)?\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  if (value.startsWith("/api/")) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/${value.replace(/^\/+/, "")}`;
}

function postedAgo(value?: string | null) {
  if (!value) return "Recently posted";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently posted";
  }

  const diff = Math.max(0, Date.now() - date.getTime());

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return "Posted just now";
  if (minutes < 60) return `Posted ${minutes} min ago`;
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 7) return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  if (weeks < 5) return `Posted ${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  return `Posted ${months} month${months === 1 ? "" : "s"} ago`;
}

function getLocation(campaign: PublicCampaign) {
  return campaign.brand_location || campaign.location || "Remote / flexible";
}

function getMinPrice(campaign: PublicCampaign) {
  if (campaign.budget_min != null) return Number(campaign.budget_min);
  if (campaign.budget != null) return Number(campaign.budget);
  return null;
}

function getMaxPrice(campaign: PublicCampaign) {
  if (campaign.budget_max != null) return Number(campaign.budget_max);
  if (campaign.budget != null) return Number(campaign.budget);
  return null;
}

function budgetLabel(campaign: PublicCampaign) {
  const min = getMinPrice(campaign);
  const max = getMaxPrice(campaign);

  if (min == null && max == null) {
    return "Budget not specified";
  }

  if (min != null && max != null && min !== max) {
    return `NPR ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }

  return `NPR ${(min ?? max ?? 0).toLocaleString()}`;
}

function deadlinePassed(campaign: PublicCampaign) {
  if (!campaign.application_deadline) return false;

  const deadline = new Date(campaign.application_deadline);
  if (Number.isNaN(deadline.getTime())) return false;

  return new Date() >= deadline;
}

function hasNoApplications(campaign: PublicCampaign) {
  return Number(campaign.application_count || 0) === 0;
}

function isExpiredWithoutApplications(campaign: PublicCampaign) {
  return deadlinePassed(campaign) && hasNoApplications(campaign);
}

function tagsFor(campaign: PublicCampaign) {
  const tags: string[] = [];

  if (campaign.category) {
    tags.push(campaign.category);
  }

  if (campaign.required_platforms?.length) {
    tags.push(...campaign.required_platforms.slice(0, 2));
  } else if (campaign.required_platform) {
    tags.push(campaign.required_platform);
  }

  return [...new Set(tags)].slice(0, 3);
}

/*
  Filter text match: if the text is exactly one of the dropdown options
  (picked from the list) it must match exactly; otherwise whatever the
  creator typed is treated as "contains", so typing "kath" finds Kathmandu.
*/
function textMatches(
  field: string | null | undefined,
  query: string,
  options: string[]
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const value = (field || "").trim().toLowerCase();
  const exact = options.some((option) => option.trim().toLowerCase() === q);

  return exact ? value === q : value.includes(q);
}

/* ============================================================
   CAMPAIGN CARD
============================================================ */

function CampaignCard({
  campaign,
  isCreator,
  isAuthenticated,
  isSaved,
  onToggleSave,
}: {
  campaign: PublicCampaign;
  isCreator: boolean;
  isAuthenticated: boolean;
  isSaved: boolean;
  onToggleSave: (id: number) => void;
}) {
  const expired = isExpiredWithoutApplications(campaign);
  const passedDeadline = deadlinePassed(campaign);

  const tags = tagsFor(campaign);
  const navigate = useNavigate();
  const detailUrl = `/campaigns/${campaign.id}?source=${
    isAuthenticated && !isCreator ? "dashboard" : "landing"
  }`;

  return (
    <article
      className={`campaign-card ${expired ? "campaign-card-expired" : ""}`}
      style={{ cursor: "pointer" }}
      role="link"
      tabIndex={0}
      onClick={() => navigate(detailUrl)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) {
          navigate(detailUrl);
        }
      }}
    >
      <div className="campaign-card-inner">
        {/* BRAND */}

        <div className="campaign-card-top">
          <Link
            to={`/brands/${campaign.business_id}`}
            className="campaign-brand"
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              className="campaign-avatar"
              style={
                isCreatorHub(campaign.brand_name)
                  ? { background: "#fff", border: "1px solid #e5e5e5", boxSizing: "border-box" }
                  : { background: "#fff" }
              }
            >
              {isCreatorHub(campaign.brand_name) ? (
                <LogoMark size={20} />
              ) : (
                <img
                  src={
                    campaign.brand_logo
                      ? mediaUrl(campaign.brand_logo)
                      : categoryImage(campaign.category, campaign.brand_name)
                  }
                  alt=""
                />
              )}
            </div>

            <span>{brandDisplayName(campaign.brand_name)}</span>
          </Link>

          {isCreator && !expired && (
            <button
              type="button"
              className={isSaved ? "campaign-heart saved" : "campaign-heart"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(campaign.id);
              }}
              aria-label={isSaved ? "Remove from wishlist" : "Save campaign"}
            >
              <Bookmark size={17} fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {/* TITLE */}

        <h2 className="campaign-title">{campaign.title}</h2>

        {/* LOCATION */}

        <div className="campaign-meta">
          <span>
            <MapPin size={13} />
            {getLocation(campaign)}
          </span>

          <span>{campaign.engagement_type || "Short-term"}</span>
        </div>

        {/* BUDGET */}

        <div className="campaign-budget-row">
          <div>
            <small>Budget</small>
            <strong>{budgetLabel(campaign)}</strong>
          </div>

          {campaign.duration && (
            <div className="campaign-duration">
              <small>Duration</small>
              <span>{campaign.duration}</span>
            </div>
          )}
        </div>

        {/* TAGS */}

        {tags.length > 0 && (
          <div className="campaign-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        {/* DESCRIPTION */}

        <p className="campaign-description">
          {campaign.description || "View the campaign details to learn more."}
        </p>

        {/* DEADLINE MESSAGE */}

        {expired && (
          <div className="campaign-expired-message">
            Application deadline passed
          </div>
        )}

        {!expired && passedDeadline && (
          <div className="campaign-deadline-message">
            Application deadline passed
          </div>
        )}

        {/* FOOTER */}

        <div className="campaign-footer">
          <span>{postedAgo(campaign.created_at)}</span>

          {!expired && campaign.application_count > 0 && (
            <span>
              {campaign.application_count} application
              {campaign.application_count === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* ACTION */}

        {!(isAuthenticated && !isCreator) && (
          <div className="campaign-actions">
            {expired ? (
              <span className="campaign-disabled campaign-full">
                Application deadline passed
              </span>
            ) : !passedDeadline ? (
              <Link
                to={`/campaigns/${campaign.id}?apply=true&source=landing`}
                className="campaign-primary campaign-full"
                onClick={(e) => e.stopPropagation()}
              >
                Apply Campaign
                <ArrowRight size={14} />
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

/* ============================================================
   MAIN
============================================================ */

export function Campaigns() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isCreator = user?.role === "creator";
  const isAuthenticated = Boolean(user);

  // /campaigns?suggested=true  →  only campaigns suggested for this creator
  const suggestedMode =
    isCreator && searchParams.get("suggested") === "true";

  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [saved, setSaved] = useState<SavedCampaignEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [engagement, setEngagement] = useState("");
  const [experience, setExperience] = useState("");
  const [creatorType, setCreatorType] = useState("");
  // "default" = Best match in suggested mode, Newest otherwise
  const [sort, setSort] = useState("default");
  const [showFilters, setShowFilters] = useState(false);

  // Creator profile data, used only to work out suggested campaigns
  const [profile, setProfile] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /* ==========================================================
     LOAD
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    getPublicCampaigns({ page: 1, limit: 100 })
      .then((response) => {
        if (!cancelled) {
          setCampaigns(response.campaigns || []);
        }
      })
      .catch((err) => {
        console.error(err);

        if (!cancelled) {
          setError("Campaigns could not be loaded right now.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     SAVED
  ========================================================== */

  useEffect(() => {
    if (!isCreator) {
      setSaved([]);
      return;
    }

    getSavedCampaigns()
      .then((items) => {
        setSaved(items || []);
      })
      .catch((err) => {
        console.error("Could not load saved campaigns", err);
      });
  }, [isCreator]);

  useEffect(() => {
    if (!isCreator) {
      setProfileLoaded(true);
      return;
    }

    let cancelled = false;

    Promise.allSettled([getCreatorProgress(), getApplications()]).then(
      ([progress, apps]) => {
        if (cancelled) return;

        if (progress.status === "fulfilled" && progress.value) {
          setProfile(progress.value.profile);
          setSocials(progress.value.socials || []);
        } else if (user?.profile) {
          setProfile(user.profile);
        }

        if (apps.status === "fulfilled") {
          setAppliedIds(new Set((apps.value || []).map((a) => a.campaign_id)));
        }

        setProfileLoaded(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isCreator, user?.id]);

  const suggestions = useMemo(
    () =>
      isCreator
        ? buildSuggestions(campaigns, profile, socials, appliedIds)
        : { list: [], personalised: false },
    [isCreator, campaigns, profile, socials, appliedIds]
  );

  const suggestedScores = useMemo(
    () =>
      new Map(
        // Only real matches count. No fallback to "all campaigns".
        (suggestions.personalised ? suggestions.list : []).map((entry) => [
          entry.c.id,
          entry,
        ])
      ),
    [suggestions]
  );

  const setSuggestedMode = (on: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (on) next.set("suggested", "true");
    else next.delete("suggested");
    setSearchParams(next, { replace: true });
    setSort("default");
    setCurrentPage(1);
  };

  const savedIds = useMemo(
    () => new Set(saved.map((item) => item.campaign_id)),
    [saved]
  );

  /* ==========================================================
     SAVE
  ========================================================== */

  const toggleSave = async (id: number) => {
    if (!isCreator) return;

    try {
      if (savedIds.has(id)) {
        await unsaveCampaign(id);
        setSaved((items) => items.filter((item) => item.campaign_id !== id));
      } else {
        const item = await saveCampaign(id);
        setSaved((items) => [...items, item]);
      }
    } catch (err) {
      console.error("Could not update wishlist", err);
    }
  };

  /* ==========================================================
     OPTIONS
  ========================================================== */

  const categories = useMemo(
    () =>
      [
        ...new Set(
          campaigns
            .map((item) => item.category?.trim())
            .filter(Boolean) as string[]
        ),
      ].sort(),
    [campaigns]
  );

  const locations = useMemo(
    () => [...new Set(campaigns.map(getLocation).filter(Boolean))].sort(),
    [campaigns]
  );

  const engagements = useMemo(
    () =>
      [
        ...new Set(
          campaigns
            .map((item) => item.engagement_type?.trim())
            .filter(Boolean) as string[]
        ),
      ].sort(),
    [campaigns]
  );

  const experiences = useMemo(
    () =>
      [
        ...new Set(
          campaigns
            .map((item) => item.experience_level?.trim())
            .filter(Boolean) as string[]
        ),
      ].sort(),
    [campaigns]
  );

  const creatorTypes = useMemo(
    () =>
      [
        ...new Set(campaigns.flatMap((item) => item.creator_types || [])),
      ].sort(),
    [campaigns]
  );

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredCampaigns = useMemo(() => {
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    // A budget below NPR 1,000 is not valid, so it is ignored until the
    // creator finishes typing a valid amount.
    const minimum =
      minPrice && Number(minPrice) >= BUDGET_MIN ? Number(minPrice) : null;
    const maximum =
      maxPrice && Number(maxPrice) >= BUDGET_MIN ? Number(maxPrice) : null;

    const result = campaigns.filter((campaign) => {
      /*
        A campaign with a passed deadline and ZERO applications is
        expired and should disappear from the public marketplace.
      */
      if (isExpiredWithoutApplications(campaign)) return false;

      if (suggestedMode && !suggestedScores.has(campaign.id)) return false;

      if (search) {
        const text = [
          campaign.title,
          campaign.description,
          campaign.category,
          campaign.brand_name,
          campaign.brand_location,
          campaign.location,
          ...(campaign.required_skills || []),
          ...(campaign.creator_types || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!text.includes(search)) return false;
      }

      if (!textMatches(campaign.category, category, categories)) return false;
      if (!textMatches(getLocation(campaign), location, locations)) return false;
      if (!textMatches(campaign.engagement_type, engagement, engagements)) return false;
      if (!textMatches(campaign.experience_level, experience, experiences)) return false;

      if (
        creatorType.trim() &&
        !(campaign.creator_types || []).some((type) =>
          textMatches(type, creatorType, creatorTypes)
        )
      ) {
        return false;
      }

      const campaignMin = getMinPrice(campaign);
      const campaignMax = getMaxPrice(campaign);

      if (minimum != null && (campaignMax == null || campaignMax < minimum)) {
        return false;
      }

      if (maximum != null && (campaignMin == null || campaignMin > maximum)) {
        return false;
      }

      return true;
    });

    const byNewest = (a: PublicCampaign, b: PublicCampaign) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    result.sort((a, b) => {
      if (sort === "default" && suggestedMode) {
        return (
          (suggestedScores.get(b.id)?.score ?? 0) -
            (suggestedScores.get(a.id)?.score ?? 0) || byNewest(a, b)
        );
      }

      if (sort === "oldest") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      if (sort === "price-low") {
        return (getMinPrice(a) ?? Infinity) - (getMinPrice(b) ?? Infinity);
      }

      if (sort === "price-high") {
        return (getMaxPrice(b) ?? 0) - (getMaxPrice(a) ?? 0);
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return demoLast(result);
  }, [
    campaigns,
    searchParams,
    category,
    location,
    minPrice,
    maxPrice,
    engagement,
    experience,
    creatorType,
    sort,
    suggestedMode,
    suggestedScores,
    categories,
    locations,
    engagements,
    experiences,
    creatorTypes,
  ]);

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCampaigns.length / CAMPAIGNS_PER_PAGE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * CAMPAIGNS_PER_PAGE,
    currentPage * CAMPAIGNS_PER_PAGE
  );

  const first =
    filteredCampaigns.length === 0
      ? 0
      : (currentPage - 1) * CAMPAIGNS_PER_PAGE + 1;

  const last = Math.min(
    currentPage * CAMPAIGNS_PER_PAGE,
    filteredCampaigns.length
  );

  /* ==========================================================
     CLEAR
  ========================================================== */

  const clearFilters = () => {
    setCategory("");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setEngagement("");
    setExperience("");
    setCreatorType("");
    setSort("default");
    setCurrentPage(1);
  };

  const hasFilters = Boolean(
    category ||
      location ||
      minPrice ||
      maxPrice ||
      engagement ||
      experience ||
      creatorType
  );

  /* Budget inputs: digits only, never above 100,000 while typing, and
     never below 1,000 once the field is left. */
  const onMinPriceChange = (raw: string) => {
    let value = digitsOnly(raw);
    if (value && Number(value) > BUDGET_MAX) value = String(BUDGET_MAX);
    setMinPrice(value);
  };

  const onMaxPriceChange = (raw: string) => {
    let value = digitsOnly(raw);
    if (value && Number(value) > BUDGET_MAX) value = String(BUDGET_MAX);
    setMaxPrice(value);
  };

  const commitMinPrice = () => {
    if (!minPrice) return;
    const value = Math.max(BUDGET_MIN, Number(minPrice));
    if (maxPrice && value > Number(maxPrice)) {
      setMaxPrice(String(value));
    }
    setMinPrice(String(value));
  };

  const commitMaxPrice = () => {
    if (!maxPrice) return;
    let value = Math.max(BUDGET_MIN, Number(maxPrice));
    if (minPrice && value < Number(minPrice)) value = Number(minPrice);
    setMaxPrice(String(value));
  };

  const minError = Boolean(minPrice) && Number(minPrice) < BUDGET_MIN;
  const maxError = Boolean(maxPrice) && Number(maxPrice) < BUDGET_MIN;

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (category) chips.push({ key: "category", label: category, clear: () => setCategory("") });
  if (location) chips.push({ key: "location", label: location, clear: () => setLocation("") });
  if ((minPrice && !minError) || (maxPrice && !maxError)) {
    chips.push({
      key: "price",
      label: `NPR ${minPrice && !minError ? minPrice : "1000"} – ${maxPrice && !maxError ? maxPrice : "any"}`,
      clear: () => {
        setMinPrice("");
        setMaxPrice("");
      },
    });
  }
  if (engagement) chips.push({ key: "engagement", label: engagement, clear: () => setEngagement("") });
  if (experience) chips.push({ key: "experience", label: experience, clear: () => setExperience("") });
  if (creatorType) chips.push({ key: "creatorType", label: creatorType, clear: () => setCreatorType("") });

  const sortOptions = [
    ...(suggestedMode ? [{ value: "default", label: "Best match" }] : []),
    { value: suggestedMode ? "newest" : "default", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "price-low", label: "Price: low to high" },
    { value: "price-high", label: "Price: high to low" },
  ];

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="campaigns-page">
      <PublicNavbar sticky />

      <main className="campaigns-main">
        <div className="campaigns-container">
          <div className="campaigns-layout">
            <div className="campaigns-grid">
              <div className="campaign-left">
                {/* VIEW TABS (creators only) */}

                {isCreator && (
                  <div className="campaign-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!suggestedMode}
                      className={!suggestedMode ? "active" : ""}
                      onClick={() => setSuggestedMode(false)}
                    >
                      All campaigns
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={suggestedMode}
                      className={suggestedMode ? "active" : ""}
                      onClick={() => setSuggestedMode(true)}
                    >
                      Suggested for you
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="filters-toggle"
                  onClick={() => setShowFilters((open) => !open)}
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal size={14} />
                  {showFilters ? "Hide filters" : "Show filters"}
                  {chips.length > 0 && <b>{chips.length}</b>}
                </button>

                  {/* FILTERS (left) */}

                  <aside
                    className={
                      showFilters ? "campaign-sidebar open" : "campaign-sidebar"
                    }
                  >
                    <div className="sidebar-title">
                      <SlidersHorizontal size={14} />
                      Filters
                      {hasFilters && (
                        <button
                          type="button"
                          className="sidebar-clear"
                          onClick={clearFilters}
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <ComboFilter
                      label="Category"
                      value={category}
                      onChange={setCategory}
                      placeholder="Search or select"
                      options={categories}
                    />

                    <ComboFilter
                      label="Location"
                      value={location}
                      onChange={setLocation}
                      placeholder="Search or select"
                      options={locations}
                    />

                    <div className="tb-field">
                      <span>Budget (NPR)</span>
                      <div className="price-inputs">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={minPrice}
                          onChange={(e) => onMinPriceChange(e.target.value)}
                          onBlur={commitMinPrice}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitMinPrice();
                          }}
                          placeholder="1000"
                          className={minError ? "price-error" : ""}
                          aria-label="Minimum budget"
                        />
                        <span>to</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={maxPrice}
                          onChange={(e) => onMaxPriceChange(e.target.value)}
                          onBlur={commitMaxPrice}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitMaxPrice();
                          }}
                          placeholder="100000"
                          className={maxError ? "price-error" : ""}
                          aria-label="Maximum budget"
                        />
                      </div>
                      <small
                        className={
                          minError || maxError
                            ? "price-hint price-hint-error"
                            : "price-hint"
                        }
                      >
                        {minError || maxError
                          ? "Budget must be at least NPR 1,000"
                          : "Between NPR 1,000 and 1,00,000"}
                      </small>
                    </div>

                    <DropdownFilter
                      label="Engagement"
                      value={engagement}
                      onChange={setEngagement}
                      options={engagements}
                    />

                    <DropdownFilter
                      label="Experience"
                      value={experience}
                      onChange={setExperience}
                      options={experiences}
                    />

                    <ComboFilter
                      label="Creator type"
                      value={creatorType}
                      onChange={setCreatorType}
                      placeholder="Search or select"
                      options={creatorTypes}
                    />
                  </aside>
              </div>

            {/* RESULTS */}

            <section className="campaign-results">
              <div className="results-bar">
                <div className="results-heading">
                  {loading || (suggestedMode && !profileLoaded)
                    ? "Loading campaigns..."
                    : `Showing ${first}–${last} of ${filteredCampaigns.length} ${
                        suggestedMode ? "suggested " : ""
                      }campaigns`}
                </div>

                {/* SORT (right) */}

                <label className="results-sort">
                  <span>Sort by</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {chips.length > 0 && (
                <div className="filter-chips">
                  {chips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.clear}
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      {chip.label}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="campaign-state">Loading campaigns...</div>
              )}

              {!loading && error && (
                <div className="campaign-state">{error}</div>
              )}

              {!loading && !error && visibleCampaigns.length === 0 && (
                <div className="campaign-empty">
                  <Search size={22} />

                  <h2>
                    {suggestedMode && !suggestions.personalised
                      ? "No suggestions yet"
                      : suggestedMode && !hasFilters
                      ? "No suggestions right now"
                      : "No campaigns found"}
                  </h2>

                  <p>
                    {suggestedMode && !suggestions.personalised
                      ? "Add your niches and connect social accounts in your profile so we can match campaigns to you."
                      : suggestedMode && !hasFilters
                      ? "New campaigns that fit your profile will show up here."
                      : "Try changing your filters."}
                  </p>

                  {suggestedMode && !suggestions.personalised && (
                    <Link to="/profile" className="campaign-empty-link">
                      Update my profile
                    </Link>
                  )}

                  {suggestedMode && (
                    <button type="button" onClick={() => setSuggestedMode(false)}>
                      Browse all campaigns
                    </button>
                  )}

                  {hasFilters && (
                    <button type="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {!loading && !error && visibleCampaigns.length > 0 && (
                <div className="campaign-grid">
                  {visibleCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      isCreator={isCreator}
                      isAuthenticated={isAuthenticated}
                      isSaved={savedIds.has(campaign.id)}
                      onToggleSave={toggleSave}
                    />
                  ))}
                </div>
              )}

              {/* PAGINATION */}

              {!loading && !error && totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    aria-label="Previous page"
                  >
                    <ArrowLeft size={15} />
                  </button>

                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        className={currentPage === page ? "active" : ""}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    aria-label="Next page"
                  >
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </section>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .campaigns-page {
          min-height: 100vh;
          background: #fff;
          color: #111;
          font-family: Poppins, sans-serif;
        }

        .campaigns-main {
          padding: 110px 0 70px;
        }

        .campaigns-container {
          width: min(1450px, calc(100% - 55px));
          margin: 0 auto;
        }

        .campaigns-layout {
          display: block;
        }

        /* TABS */

        /* Fully rounded pill. Its outer edge (border included) is exactly
           the same width as the filter fields below, so left and right
           edges line up. */
        .campaign-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          width: 100%;
          height: 40px;
          margin: 0 0 18px;
          padding: 3px;
          border: 1px solid #cfe3d5;
          border-radius: 999px;
          background: #eef5f0;
        }

        .campaign-tabs button {
          min-width: 0;
          height: 100%;
          padding: 0 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #3f5a47;
          font: 500 11px Poppins, sans-serif;
          cursor: pointer;
          transition: background .15s ease, color .15s ease;
        }

        .campaign-tabs button:hover:not(.active) {
          color: #15672d;
        }

        .campaign-tabs button.active {
          background: #15672d;
          color: #fff;
        }

        .suggested-note {
          margin: 0 0 14px;
          color: #666;
          font-size: 12px;
          line-height: 1.5;
        }

        /* FILTERS (left) */

        .campaigns-grid {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: 30px;
          align-items: start;
        }

        .campaign-left {
          padding-right: 24px;
          border-right: 1px solid #e9e9e9;
        }

        .campaign-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
        }

        .sidebar-clear {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: #15672d;
          font: 500 11px Poppins, sans-serif;
          text-decoration: underline;
          cursor: pointer;
        }

        .filters-toggle {
          display: none;
        }

        .tb-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .tb-field > span {
          font-size: 11px;
          font-weight: 500;
          color: #666;
        }

        .combo {
          position: relative;
        }

        .combo-box {
          height: 40px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
        }

        .combo-box:focus-within,
        .combo-box.combo-active {
          border-color: #111;
        }

        /* the global input:focus ring would draw a second grey box
           inside the field, so switch it off here */
        .combo-box input,
        .combo-box input:focus {
          border: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }

        .combo-box input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #111;
          font: 500 12px Poppins, sans-serif;
        }

        .combo-button {
          width: 100%;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
        }

        .combo-value,
        .combo-placeholder {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font: 500 12px Poppins, sans-serif;
        }

        .combo-value {
          color: #111;
        }

        .combo-placeholder {
          color: #9a9a9a;
        }

        .price-inputs input.price-error,
        .price-inputs input.price-error:focus {
          border-color: #c62828 !important;
          box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.12) !important;
        }

        .price-hint-error {
          color: #c62828 !important;
        }

        .price-hint {
          color: #999;
          font-size: 10px;
        }

        .combo-chevron {
          flex: 0 0 auto;
          color: #777;
        }

        .combo-clear {
          flex: 0 0 auto;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #f0f0f0;
          color: #444;
          cursor: pointer;
        }

        .combo-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 30;
          margin-top: 4px;
          max-height: 220px;
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
        }

        .combo-option {
          width: 100%;
          padding: 9px 12px;
          border: 0;
          border-bottom: 1px solid #f3f3f3;
          background: #fff;
          color: #444;
          text-align: left;
          font: 400 12px Poppins, sans-serif;
          cursor: pointer;
        }

        .combo-option:last-child {
          border-bottom: 0;
        }

        .combo-option:hover,
        .combo-option.selected {
          background: #f7f7f7;
          color: #111;
        }

        .combo-empty {
          padding: 10px 12px;
          color: #888;
          font-size: 12px;
        }

        /* RESULTS BAR: count on the left, sort on the right */

        .results-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .results-bar .results-heading {
          margin: 0;
        }

        .results-sort {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #666;
        }

        .results-sort select {
          height: 38px;
          padding: 0 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #fff;
          color: #111;
          font: 500 12px Poppins, sans-serif;
          cursor: pointer;
        }

        .campaign-empty-link {
          display: inline-block;
          margin: 4px 8px 0 0;
          padding: 9px 16px;
          border-radius: 8px;
          background: #111;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          text-decoration: none;
        }

        .price-inputs {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 6px;
        }

        .price-inputs input {
          width: 100%;
          min-width: 0;
          height: 40px;
          padding: 0 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          outline: 0;
          font: 400 12px Poppins, sans-serif;
        }

        .price-inputs span {
          font-size: 11px;
          color: #777;
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .filter-chips button {
          height: 30px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #ddd;
          border-radius: 999px;
          background: #fff;
          color: #111;
          font: 500 11px Poppins, sans-serif;
          cursor: pointer;
        }

        .filter-chips button:hover {
          border-color: #111;
        }

        .filter-chips .chips-clear {
          border: 0;
          background: transparent;
          color: #15672d;
          text-decoration: underline;
        }

        .campaign-match-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
          padding: 3px 9px;
          border-radius: 999px;
          background: #e8f5ec;
          color: #15672d;
          font-size: 10px;
          font-weight: 600;
        }

        .results-heading {
          height: 20px;
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          line-height: 1;
        }

        /* RESULTS */

        .campaign-results {
          min-width: 0;
        }

        .campaign-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          align-items: stretch;
        }

        /* CARD */

        .campaign-card {
          min-width: 0;
          display: flex;
          border: 1px solid #e0e0e0;
          border-radius: 14px;
          background: #fff;
          transition: .18s ease;
        }

        .campaign-card:hover {
          transform: translateY(-2px);
          border-color: #d0d0d0;
          box-shadow: 0 15px 30px rgba(0,0,0,.07);
        }

        .campaign-card-inner {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          padding: 18px 20px;
        }

        .campaign-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 32px;
          margin-bottom: 13px;
        }

        .campaign-brand {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .campaign-avatar {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: 8px;
          background: #111;
          color: #fff;
          font-size: 9px;
        }

        .campaign-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .campaign-brand > span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10.5px;
          color: #555;
        }

        .campaign-heart {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ddd;
          border-radius: 50%;
          background: #fff;
          color: #666;
          cursor: pointer;
        }

        .campaign-heart.saved {
          color: #111;
          border-color: #111;
        }

        .campaign-title {
          margin: 0 0 9px;
          font: 500 19px/1.15 "League Spartan", sans-serif;
          letter-spacing: -.02em;
        }

        .campaign-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 12px;
          margin-bottom: 13px;
          color: #6d6d6d;
          font-size: 9.5px;
        }

        .campaign-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* budget text starts at the same left edge as the title */
        .campaign-budget-row {
          display: grid;
          grid-template-columns: 1fr auto;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
        }

        .campaign-budget-row > div {
          min-height: 58px;
          padding: 10px 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .campaign-duration {
          min-width: 140px;
          padding-left: 20px !important;
          border-left: 1px solid #eee;
        }

        .campaign-budget-row small {
          margin-bottom: 4px;
          color: #999;
          font-size: 8px;
          text-transform: uppercase;
        }

        .campaign-budget-row strong {
          font-size: 12px;
          font-weight: 500;
        }

        .campaign-duration span {
          font-size: 10px;
          color: #444;
        }

        .campaign-tags {
          margin: 12px 0 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .campaign-tags span {
          display: inline-flex;
          align-items: center;
          height: 22px;
          padding: 0 10px;
          border-radius: 99px;
          background: #f4f4f4;
          color: #555;
          font-size: 9px;
          line-height: 1;
        }

        .campaign-description {
          margin: 8px 0 14px;
          color: #666;
          font-size: 10px;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        /* DEADLINE */

        .campaign-deadline-message,
        .campaign-expired-message {
          margin: 5px 0 11px;
          padding: 8px 10px;
          border-radius: 6px;
          background: #f5f5f5;
          color: #666;
          font-size: 9px;
        }

        .campaign-expired-message {
          color: #777;
        }

        /* footer and button sit at the bottom so cards in a row line up */
        .campaign-footer {
          margin-top: auto;
          padding-top: 4px;
          min-height: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #888;
          font-size: 8.5px;
        }

        .campaign-actions {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1.35fr .85fr;
          gap: 7px;
        }

        .campaign-primary,
        .campaign-secondary,
        .campaign-disabled {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 10px;
          border-radius: 7px;
          text-decoration: none;
          font-size: 9px;
          font-weight: 500;
          white-space: nowrap;
        }

        .campaign-primary {
          border: 1px solid #197935;
          background: #197935;
          color: #fff;
        }

        .campaign-secondary {
          border: 1px solid #ddd;
          background: #fff;
          color: #111;
        }

        .campaign-disabled {
          border: 1px solid #e3e3e3;
          background: #eee;
          color: #777;
        }

        .campaign-full {
          grid-column: 1 / -1;
        }

        /* PAGINATION */

        .pagination {
          margin-top: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .pagination button {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #ddd;
          border-radius: 7px;
          background: #fff;
          color: #333;
          font: 400 10px Poppins, sans-serif;
          cursor: pointer;
        }

        .pagination button:hover:not(:disabled),
        .pagination button.active {
          border-color: #15672d;
        }

        .pagination button.active {
          background: #197935;
          color: #fff;
        }

        .pagination button:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        /* STATES */

        .campaign-state {
          min-height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #777;
          font-size: 12px;
        }

        .campaign-empty {
          min-height: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #777;
        }

        .campaign-empty h2 {
          margin: 12px 0 4px;
          font: 400 23px "League Spartan", sans-serif;
          color: #111;
        }

        .campaign-empty p {
          margin: 0 0 15px;
          font-size: 10px;
        }

        .campaign-empty button {
          height: 35px;
          padding: 0 14px;
          border: 1px solid #197935;
          border-radius: 7px;
          background: #197935;
          color: #fff;
          font: 500 10px Poppins, sans-serif;
          cursor: pointer;
        }

        /* RESPONSIVE */

        @media (max-width: 950px) {
          .campaign-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 750px) {
          .campaigns-main {
            padding-top: 100px;
          }

          .campaigns-container {
            width: calc(100% - 30px);
          }

          .campaigns-layout {
            display: block;
          }

          .campaigns-grid {
            display: block;
          }

          .filters-toggle {
            width: 100%;
            height: 42px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #fff;
            font: 500 12px Poppins, sans-serif;
            cursor: pointer;
          }

          .filters-toggle b {
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: #111;
            color: #fff;
            font-size: 10px;
          }

          .campaign-left {
            padding-right: 0;
            border-right: 0;
          }

          .campaign-sidebar {
            display: none;
            margin-bottom: 18px;
            padding: 0 0 18px;
            border-bottom: 1px solid #e9e9e9;
          }

          .campaign-sidebar.open {
            display: flex;
          }

          .campaign-card-inner {
            padding: 16px;
          }
        }

        @media (max-width: 500px) {
          .campaign-budget-row {
            grid-template-columns: 1fr;
          }

          .campaign-duration {
            padding-left: 0 !important;
            border-left: 0;
            border-top: 1px solid #eee;
          }

          .campaign-actions {
            grid-template-columns: 1fr;
          }

          .campaign-full {
            grid-column: 1;
          }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function ComboFilter({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  const [open, setOpen] = useState(false);

  const q = value.trim().toLowerCase();
  const shown = options.filter(
    (option) => !q || option.toLowerCase().includes(q)
  );

  return (
    <div className="tb-field combo">
      <span>{label}</span>

      <div className={value ? "combo-box combo-active" : "combo-box"}>
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          autoComplete="off"
        />

        {value ? (
          <button
            type="button"
            className="combo-clear"
            aria-label={`Clear ${label}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
            }}
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={14} className="combo-chevron" />
        )}
      </div>

      {open && (
        <div className="combo-menu" role="listbox">
          {shown.length === 0 ? (
            <div className="combo-empty">No match</div>
          ) : (
            shown.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className={option === value ? "combo-option selected" : "combo-option"}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* Dropdown only (no typing): used for short fixed lists */
function DropdownFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="tb-field combo">
      <span>{label}</span>

      <button
        type="button"
        className={
          value ? "combo-box combo-button combo-active" : "combo-box combo-button"
        }
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "combo-value" : "combo-placeholder"}>
          {value || "Select"}
        </span>
        <ChevronDown size={14} className="combo-chevron" />
      </button>

      {open && (
        <div className="combo-menu" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={!value ? "combo-option selected" : "combo-option"}
            onMouseDown={(e) => {
              e.preventDefault();
              onChange("");
              setOpen(false);
            }}
          >
            Any
          </button>

          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              className={option === value ? "combo-option selected" : "combo-option"}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
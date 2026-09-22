// frontend/src/pages/Campaigns.tsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowRight,
  ChevronDown,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { PublicNavbar } from "../components/PublicNavbar";

import { useAuth } from "../context/AuthContext";

import {
  getPublicCampaigns,
  getSavedCampaigns,
  saveCampaign,
  unsaveCampaign,
  type PublicCampaign,
  type SavedCampaignEntry,
} from "../api/client";


// ============================================================
// API
// ============================================================

const API_ORIGIN = "http://localhost:8000";


// ============================================================
// HELPERS
// ============================================================

function mediaUrl(url?: string | null): string {
  if (!url) return "";

  if (
    /^(https?:)?\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  if (url.startsWith("/api/")) {
    return `${API_ORIGIN}${url}`;
  }

  return `${API_ORIGIN}/${url.replace(/^\/+/, "")}`;
}


function getInitials(name?: string | null): string {
  const value = (name || "Brand").trim();

  if (!value) return "B";

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return parts[0]
    .slice(0, 2)
    .toUpperCase();
}


function postedAgo(value?: string | null): string {
  if (!value) return "Recently posted";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently posted";
  }

  const diff = Math.max(
    0,
    Date.now() - date.getTime()
  );

  const minutes = Math.floor(
    diff / 60000
  );

  const hours = Math.floor(
    minutes / 60
  );

  const days = Math.floor(
    hours / 24
  );

  const weeks = Math.floor(
    days / 7
  );

  const months = Math.floor(
    days / 30
  );

  if (minutes < 1) {
    return "Posted just now";
  }

  if (minutes < 60) {
    return `Posted ${minutes} min${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  if (hours < 24) {
    return `Posted ${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  if (days < 7) {
    return `Posted ${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  if (weeks < 5) {
    return `Posted ${weeks} week${
      weeks === 1 ? "" : "s"
    } ago`;
  }

  return `Posted ${months} month${
    months === 1 ? "" : "s"
  } ago`;
}


function getCampaignLocation(
  campaign: PublicCampaign
): string {
  return (
    campaign.brand_location ||
    campaign.location ||
    "Remote / flexible"
  );
}


function getCampaignPriceMin(
  campaign: PublicCampaign
): number | null {
  if (campaign.budget_min != null) {
    return Number(campaign.budget_min);
  }

  if (campaign.budget != null) {
    return Number(campaign.budget);
  }

  return null;
}


function getCampaignPriceMax(
  campaign: PublicCampaign
): number | null {
  if (campaign.budget_max != null) {
    return Number(campaign.budget_max);
  }

  if (campaign.budget != null) {
    return Number(campaign.budget);
  }

  return null;
}


function formatBudget(
  campaign: PublicCampaign
): string {
  const min = getCampaignPriceMin(campaign);
  const max = getCampaignPriceMax(campaign);

  if (min == null && max == null) {
    return "Budget not specified";
  }

  if (
    min != null &&
    max != null &&
    min !== max
  ) {
    return `NPR ${min.toLocaleString()} – ${max.toLocaleString()}`;
  }

  return `NPR ${(min ?? max ?? 0).toLocaleString()}`;
}


function campaignTags(
  campaign: PublicCampaign
): string[] {
  const tags: string[] = [];

  if (campaign.category) {
    tags.push(campaign.category);
  }

  if (
    campaign.required_platforms &&
    campaign.required_platforms.length > 0
  ) {
    tags.push(
      ...campaign.required_platforms.slice(0, 2)
    );
  } else if (
    campaign.required_platform
  ) {
    tags.push(
      campaign.required_platform
    );
  }

  return Array.from(
    new Set(tags)
  ).slice(0, 3);
}


function isBooked(
  campaign: PublicCampaign
): boolean {
  return (
    String(campaign.status).toLowerCase() ===
    "in_progress"
  );
}


function isUnavailable(
  campaign: PublicCampaign
): boolean {
  const status = String(
    campaign.status
  ).toLowerCase();

  return [
    "in_progress",
    "completed",
    "closed",
    "cancelled",
  ].includes(status);
}


// ============================================================
// DROPDOWN
// ============================================================

type FilterDropdownProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};


function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: FilterDropdownProps) {
  const [
    open,
    setOpen,
  ] = useState(false);

  return (
    <div className="campaign-filter-dropdown">
      <button
        type="button"
        className={`campaign-filter-button ${
          open ? "is-open" : ""
        }`}
        onClick={() =>
          setOpen((current) => !current)
        }
      >
        <span>
          {value || label}
        </span>

        <ChevronDown
          size={14}
          className={
            open
              ? "campaign-chevron-open"
              : ""
          }
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="campaign-dropdown-backdrop"
            aria-label="Close filter"
            onClick={() => setOpen(false)}
          />

          <div className="campaign-filter-menu">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={`campaign-filter-option ${
                  value === option
                    ? "selected"
                    : ""
                }`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// ============================================================
// CAMPAIGN CARD
// SAME STYLE AS LANDING PAGE
// ============================================================

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
  onToggleSave: (
    campaignId: number
  ) => void;
}) {
  const booked =
    isBooked(campaign);

  const unavailable =
    isUnavailable(campaign);

  const tags =
    campaignTags(campaign);

  const location =
    getCampaignLocation(campaign);

  return (
    <article
      className={`campaign-card ${
        booked
          ? "campaign-card-booked"
          : ""
      }`}
    >
      <div className="campaign-card-body">

        {/* BRAND */}
        <div className="campaign-card-topline">
          <div className="campaign-card-brand">

            <span
              className="campaign-card-avatar"
              style={{
                background:
                  campaign.brand_logo
                    ? "#ffffff"
                    : "#111111",
              }}
            >
              {campaign.brand_logo ? (
                <img
                  src={mediaUrl(
                    campaign.brand_logo
                  )}
                  alt=""
                />
              ) : (
                getInitials(
                  campaign.brand_name
                )
              )}
            </span>

            <span className="campaign-card-brand-name">
              {campaign.brand_name ||
                "Brand"}
            </span>
          </div>

          {/* WISHLIST */}
          {isCreator &&
            !unavailable && (
              <button
                type="button"
                className={`campaign-save ${
                  isSaved
                    ? "is-saved"
                    : ""
                }`}
                onClick={() =>
                  onToggleSave(
                    campaign.id
                  )
                }
                aria-label={
                  isSaved
                    ? "Remove from wishlist"
                    : "Save to wishlist"
                }
              >
                <Heart
                  size={17}
                  fill={
                    isSaved
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            )}
        </div>

        {/* TITLE */}
        <h2 className="campaign-card-title">
          {campaign.title}
        </h2>

        {/* LOCATION / ENGAGEMENT */}
        <div className="campaign-card-location">
          <span>
            <MapPin size={13} />
            {location}
          </span>

          <span>
            {campaign.engagement_type ||
              "Short-term"}
          </span>
        </div>

        {/* PRICE */}
        <div className="campaign-card-budget">
          <strong>
            {formatBudget(campaign)}
          </strong>

          {campaign.duration && (
            <span>
              {campaign.duration}
            </span>
          )}
        </div>

        {/* TAGS */}
        {tags.length > 0 && (
          <div className="campaign-card-tags">
            {tags.map((tag) => (
              <span key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* DESCRIPTION */}
        <p className="campaign-card-description">
          {campaign.description ||
            "View the campaign brief to see the full collaboration details."}
        </p>

        {/* POSTED */}
        <div className="campaign-card-posted">
          <span>
            {postedAgo(
              campaign.created_at
            )}
          </span>

          {booked && (
            <span>
              Booked
            </span>
          )}
        </div>

        {/* ACTIONS */}
        <div className="campaign-card-actions">

          {booked ? (
            <span className="campaign-action campaign-action-disabled">
              Booked
            </span>
          ) : unavailable ? (
            <span className="campaign-action campaign-action-disabled">
              Not accepting applications
            </span>
          ) : isCreator ? (
            <Link
              to={`/campaigns/${campaign.id}?apply=true&source=landing`}
              className="campaign-action campaign-action-primary"
            >
              Apply Campaign
              <ArrowRight
                size={14}
              />
            </Link>
          ) : !isAuthenticated ? (
            <Link
              to={`/campaigns/${campaign.id}?apply=true&source=landing`}
              className="campaign-action campaign-action-primary"
            >
              Apply Now
              <ArrowRight
                size={14}
              />
            </Link>
          ) : (
            <Link
              to={`/campaigns/${campaign.id}?source=landing`}
              className="campaign-action campaign-action-primary"
            >
              View Campaign
              <ArrowRight
                size={14}
              />
            </Link>
          )}

          <Link
            to={`/campaigns/${campaign.id}?source=landing`}
            className="campaign-action campaign-action-secondary"
          >
            View details
          </Link>

        </div>
      </div>
    </article>
  );
}


// ============================================================
// MAIN PAGE
// ============================================================

export function Campaigns() {
  const {
    user,
  } = useAuth();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const isCreator =
    user?.role === "creator";

  const isAuthenticated =
    Boolean(user);

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [
    campaigns,
    setCampaigns,
  ] = useState<PublicCampaign[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState(
    searchParams.get("search") || ""
  );

  const [
    category,
    setCategory,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    minPrice,
    setMinPrice,
  ] = useState("");

  const [
    maxPrice,
    setMaxPrice,
  ] = useState("");

  const [
    sort,
    setSort,
  ] = useState<
    "newest" | "oldest" | "price-low" | "price-high"
  >("newest");

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [
    saved,
    setSaved,
  ] = useState<SavedCampaignEntry[]>(
    []
  );


  // ----------------------------------------------------------
  // LOAD CAMPAIGNS
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    getPublicCampaigns({
      limit: 100,
    })
      .then((response) => {
        if (cancelled) return;

        setCampaigns(
          response.campaigns || []
        );
      })
      .catch((err) => {
        console.error(
          "Could not load public campaigns:",
          err
        );

        if (!cancelled) {
          setError(
            "Campaigns could not be loaded right now."
          );
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


  // ----------------------------------------------------------
  // LOAD WISHLIST
  // ----------------------------------------------------------

  useEffect(() => {
    if (!isCreator) {
      setSaved([]);
      return;
    }

    let cancelled = false;

    getSavedCampaigns()
      .then((items) => {
        if (!cancelled) {
          setSaved(items);
        }
      })
      .catch((err) => {
        console.error(
          "Could not load wishlist:",
          err
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isCreator]);


  // ----------------------------------------------------------
  // URL SEARCH
  // ----------------------------------------------------------

  useEffect(() => {
    const urlSearch =
      searchParams.get("search") || "";

    setSearch(urlSearch);
  }, [searchParams]);


  // ----------------------------------------------------------
  // SAVED IDS
  // ----------------------------------------------------------

  const savedIds = useMemo(
    () =>
      new Set(
        saved.map(
          (item) =>
            item.campaign_id
        )
      ),
    [saved]
  );


  // ----------------------------------------------------------
  // TOGGLE WISHLIST
  // ----------------------------------------------------------

  const handleToggleSave = async (
    campaignId: number
  ) => {
    if (!isCreator) return;

    try {
      if (
        savedIds.has(campaignId)
      ) {
        await unsaveCampaign(
          campaignId
        );

        setSaved((items) =>
          items.filter(
            (item) =>
              item.campaign_id !==
              campaignId
          )
        );
      } else {
        const entry =
          await saveCampaign(
            campaignId
          );

        setSaved((items) => [
          ...items,
          entry,
        ]);
      }

      window.dispatchEvent(
        new Event(
          "ch:wishlist-changed"
        )
      );
    } catch (err) {
      console.error(
        "Could not update wishlist:",
        err
      );
    }
  };


  // ----------------------------------------------------------
  // CATEGORIES
  // ----------------------------------------------------------

  const categories = useMemo(() => {
    const values =
      campaigns
        .map((campaign) =>
          String(
            campaign.category || ""
          ).trim()
        )
        .filter(Boolean);

    return [
      ...new Set(values),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [campaigns]);


  // ----------------------------------------------------------
  // LOCATIONS
  // ----------------------------------------------------------

  const locations = useMemo(() => {
    const values =
      campaigns
        .map(
          getCampaignLocation
        )
        .filter(
          (value) =>
            value &&
            value !==
              "Remote / flexible"
        );

    return [
      ...new Set(values),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [campaigns]);


  // ----------------------------------------------------------
  // FILTER CAMPAIGNS
  // ----------------------------------------------------------

  const filteredCampaigns =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const minimum =
        minPrice.trim()
          ? Number(minPrice)
          : null;

      const maximum =
        maxPrice.trim()
          ? Number(maxPrice)
          : null;

      const filtered =
        campaigns.filter(
          (campaign) => {

            // Only public/live campaigns.
            const status =
              String(
                campaign.status
              ).toLowerCase();

            if (
              ![
                "published",
                "in_progress",
              ].includes(status)
            ) {
              return false;
            }


            // SEARCH
            if (query) {
              const searchable = [
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

              if (
                !searchable.includes(
                  query
                )
              ) {
                return false;
              }
            }


            // CATEGORY
            if (
              category &&
              campaign.category !==
                category
            ) {
              return false;
            }


            // LOCATION
            if (
              location &&
              getCampaignLocation(
                campaign
              ) !== location
            ) {
              return false;
            }


            // PRICE RANGE
            //
            // Campaign matches if its
            // price range overlaps
            // with user's entered range.
            const campaignMin =
              getCampaignPriceMin(
                campaign
              );

            const campaignMax =
              getCampaignPriceMax(
                campaign
              );

            if (
              minimum != null
            ) {
              if (
                campaignMax == null ||
                campaignMax < minimum
              ) {
                return false;
              }
            }

            if (
              maximum != null
            ) {
              if (
                campaignMin == null ||
                campaignMin > maximum
              ) {
                return false;
              }
            }

            return true;
          }
        );


      // SORT
      return filtered.sort(
        (a, b) => {
          if (
            sort === "oldest"
          ) {
            return (
              new Date(
                a.created_at
              ).getTime() -
              new Date(
                b.created_at
              ).getTime()
            );
          }

          if (
            sort === "price-low"
          ) {
            return (
              (getCampaignPriceMin(
                a
              ) ?? Infinity) -
              (getCampaignPriceMin(
                b
              ) ?? Infinity)
            );
          }

          if (
            sort === "price-high"
          ) {
            return (
              (getCampaignPriceMax(
                b
              ) ?? 0) -
              (getCampaignPriceMax(
                a
              ) ?? 0)
            );
          }

          return (
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
          );
        }
      );
    }, [
      campaigns,
      search,
      category,
      location,
      minPrice,
      maxPrice,
      sort,
    ]);


  // ----------------------------------------------------------
  // CLEAR FILTERS
  // ----------------------------------------------------------

  const hasFilters =
    Boolean(
      search.trim() ||
      category ||
      location ||
      minPrice ||
      maxPrice
    );

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setLocation("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");

    const next =
      new URLSearchParams(
        searchParams
      );

    next.delete("search");

    setSearchParams(
      next,
      { replace: true }
    );
  };


  // ----------------------------------------------------------
  // SEARCH
  // ----------------------------------------------------------

  const handleSearchChange = (
    value: string
  ) => {
    setSearch(value);

    const next =
      new URLSearchParams(
        searchParams
      );

    if (value.trim()) {
      next.set(
        "search",
        value
      );
    } else {
      next.delete("search");
    }

    setSearchParams(
      next,
      { replace: true }
    );
  };


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="campaigns-page">

      {/* ======================================================
          PUBLIC NAVBAR
      ====================================================== */}

      <PublicNavbar sticky />


      {/* ======================================================
          PAGE CONTENT
      ====================================================== */}

      <main className="campaigns-main">

        <section className="campaigns-container">

          {/* HEADER */}

          <div className="campaigns-heading">
            <div>
              <div className="campaigns-eyebrow">
                CREATOR MARKETPLACE
              </div>

              <h1>
                Find your next collaboration
              </h1>

              <p>
                {loading
                  ? "Finding campaigns for creators…"
                  : `${filteredCampaigns.length} ${
                      filteredCampaigns.length ===
                      1
                        ? "campaign"
                        : "campaigns"
                    } available for creators`}
              </p>
            </div>
          </div>


          {/* ==================================================
              SEARCH + FILTERS
          ================================================== */}

          <section className="campaigns-filter-area">

            {/* SEARCH */}

            <div className="campaigns-search">
              <Search
                size={17}
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  handleSearchChange(
                    event.target.value
                  )
                }
                placeholder="Search campaigns, skills or categories"
              />

              {search && (
                <button
                  type="button"
                  className="campaign-search-clear"
                  onClick={() =>
                    handleSearchChange("")
                  }
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>


            {/* DESKTOP FILTER ROW */}

            <div className="campaign-filter-row">

              <FilterDropdown
                label="All categories"
                value={category}
                options={[
                  "",
                  ...categories,
                ]}
                onChange={
                  setCategory
                }
              />


              <FilterDropdown
                label="All locations"
                value={location}
                options={[
                  "",
                  ...locations,
                ]}
                onChange={
                  setLocation
                }
              />


              {/* PRICE RANGE */}

              <div className="campaign-price-filter">

                <span className="campaign-price-label">
                  NPR
                </span>

                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(event) =>
                    setMinPrice(
                      event.target.value
                    )
                  }
                  placeholder="Min"
                />

                <span className="campaign-price-dash">
                  –
                </span>

                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(event) =>
                    setMaxPrice(
                      event.target.value
                    )
                  }
                  placeholder="Max"
                />
              </div>


              {/* SORT */}

              <FilterDropdown
                label="Newest"
                value={
                  sort === "newest"
                    ? ""
                    : sort ===
                      "oldest"
                      ? "Oldest"
                      : sort ===
                        "price-low"
                        ? "Price: low"
                        : "Price: high"
                }
                options={[
                  "",
                  "Oldest",
                  "Price: low",
                  "Price: high",
                ]}
                onChange={(value) => {
                  if (!value) {
                    setSort(
                      "newest"
                    );
                  } else if (
                    value ===
                    "Oldest"
                  ) {
                    setSort(
                      "oldest"
                    );
                  } else if (
                    value ===
                    "Price: low"
                  ) {
                    setSort(
                      "price-low"
                    );
                  } else {
                    setSort(
                      "price-high"
                    );
                  }
                }}
              />


              {hasFilters && (
                <button
                  type="button"
                  className="campaign-clear-filters"
                  onClick={
                    clearFilters
                  }
                >
                  Clear
                </button>
              )}
            </div>


            {/* MOBILE FILTER BUTTON */}

            <button
              type="button"
              className="campaign-mobile-filter-button"
              onClick={() =>
                setFiltersOpen(
                  (value) =>
                    !value
                )
              }
            >
              <SlidersHorizontal
                size={16}
              />

              Filters

              {hasFilters && (
                <span>
                  active
                </span>
              )}
            </button>


            {/* MOBILE FILTER PANEL */}

            {filtersOpen && (
              <div className="campaign-mobile-filters">

                <div className="campaign-mobile-filter-header">
                  <strong>
                    Filters
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setFiltersOpen(
                        false
                      )
                    }
                  >
                    <X size={17} />
                  </button>
                </div>


                <FilterDropdown
                  label="All categories"
                  value={
                    category
                  }
                  options={[
                    "",
                    ...categories,
                  ]}
                  onChange={
                    setCategory
                  }
                />


                <FilterDropdown
                  label="All locations"
                  value={
                    location
                  }
                  options={[
                    "",
                    ...locations,
                  ]}
                  onChange={
                    setLocation
                  }
                />


                <div className="campaign-mobile-price">
                  <label>
                    Price range
                  </label>

                  <div>
                    <input
                      type="number"
                      min="0"
                      value={
                        minPrice
                      }
                      onChange={(
                        event
                      ) =>
                        setMinPrice(
                          event.target
                            .value
                        )
                      }
                      placeholder="Minimum NPR"
                    />

                    <input
                      type="number"
                      min="0"
                      value={
                        maxPrice
                      }
                      onChange={(
                        event
                      ) =>
                        setMaxPrice(
                          event.target
                            .value
                        )
                      }
                      placeholder="Maximum NPR"
                    />
                  </div>
                </div>


                <button
                  type="button"
                  className="campaign-mobile-apply"
                  onClick={() =>
                    setFiltersOpen(
                      false
                    )
                  }
                >
                  Show{" "}
                  {
                    filteredCampaigns.length
                  }{" "}
                  campaigns
                </button>

              </div>
            )}
          </section>


          {/* ==================================================
              RESULTS
          ================================================== */}

          {loading ? (
            <div className="campaigns-state">
              <div className="campaigns-spinner" />
              <p>
                Loading campaigns…
              </p>
            </div>
          ) : error ? (
            <div className="campaigns-state">
              <p>
                {error}
              </p>
            </div>
          ) : filteredCampaigns.length ===
            0 ? (
            <div className="campaigns-empty">

              <div className="campaigns-empty-icon">
                <Search size={21} />
              </div>

              <h2>
                No campaigns found
              </h2>

              <p>
                Try changing your
                category, location,
                search or price range.
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="campaigns-grid">

              {filteredCampaigns.map(
                (campaign) => (
                  <CampaignCard
                    key={
                      campaign.id
                    }
                    campaign={
                      campaign
                    }
                    isCreator={
                      isCreator
                    }
                    isAuthenticated={
                      isAuthenticated
                    }
                    isSaved={savedIds.has(
                      campaign.id
                    )}
                    onToggleSave={
                      handleToggleSave
                    }
                  />
                )
              )}

            </div>
          )}

        </section>
      </main>


      {/* ======================================================
          STYLES
      ====================================================== */}

      <style>{`

        @import url(
          'https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap'
        );

        * {
          box-sizing: border-box;
        }

        .campaigns-page {
          min-height: 100vh;
          background: #ffffff;
          color: #111111;
          font-family: 'Poppins', sans-serif;
        }


        /* ====================================================
           MAIN
        ==================================================== */

        .campaigns-main {
          padding-top: 142px;
          padding-bottom: 70px;
        }

        .campaigns-container {
          width: 100%;
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 38px;
        }


        /* ====================================================
           HEADER
        ==================================================== */

        .campaigns-heading {
          margin-bottom: 28px;
        }

        .campaigns-eyebrow {
          margin-bottom: 8px;
          color: #7b7484;
          font-family: 'Poppins', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.7px;
        }

        .campaigns-heading h1 {
          margin: 0;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 38px;
          line-height: 1.05;
          font-weight: 400;
          letter-spacing: -.035em;
        }

        .campaigns-heading p {
          margin: 12px 0 0;
          color: #777777;
          font-size: 13px;
          line-height: 1.5;
        }


        /* ====================================================
           FILTER AREA
        ==================================================== */

        .campaigns-filter-area {
          margin-bottom: 28px;
        }

        .campaigns-search {
          height: 44px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 14px;
          border: 1px solid #dedede;
          border-radius: 9px;
          background: #ffffff;
          color: #8b8790;
        }

        .campaigns-search:focus-within {
          border-color: #bdbdbd;
          box-shadow: 0 0 0 3px rgba(17,17,17,.035);
        }

        .campaigns-search input {
          width: 100%;
          height: 100%;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          background: transparent;
          color: #111111;
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
        }

        .campaigns-search input::placeholder {
          color: #aaa5ae;
        }

        .campaign-search-clear {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #f3f3f3;
          color: #666666;
          cursor: pointer;
        }


        .campaign-filter-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }


        /* ====================================================
           DROPDOWNS
        ==================================================== */

        .campaign-filter-dropdown {
          position: relative;
        }

        .campaign-filter-button {
          height: 38px;
          min-width: 150px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 12px;
          border: 1px solid #dedede;
          border-radius: 8px;
          background: #ffffff;
          color: #555555;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          cursor: pointer;
        }

        .campaign-filter-button:hover,
        .campaign-filter-button.is-open {
          border-color: #bdbdbd;
          color: #111111;
        }

        .campaign-filter-button svg {
          transition: transform .16s ease;
        }

        .campaign-chevron-open {
          transform: rotate(180deg);
        }

        .campaign-filter-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          z-index: 100;
          min-width: 190px;
          max-height: 280px;
          overflow-y: auto;
          padding: 5px;
          border: 1px solid #e2e2e2;
          border-radius: 9px;
          background: #ffffff;
          box-shadow: 0 15px 35px rgba(0,0,0,.10);
        }

        .campaign-filter-option {
          width: 100%;
          padding: 9px 10px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #555555;
          text-align: left;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          cursor: pointer;
        }

        .campaign-filter-option:hover {
          background: #f5f5f5;
          color: #111111;
        }

        .campaign-filter-option.selected {
          background: #111111;
          color: #ffffff;
        }

        .campaign-dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 90;
          border: 0;
          background: transparent;
          cursor: default;
        }


        /* ====================================================
           PRICE RANGE
        ==================================================== */

        .campaign-price-filter {
          height: 38px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 9px;
          border: 1px solid #dedede;
          border-radius: 8px;
          background: #ffffff;
        }

        .campaign-price-label {
          color: #777777;
          font-size: 10px;
          font-weight: 500;
        }

        .campaign-price-filter input {
          width: 72px;
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          background: transparent;
          color: #111111;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
        }

        .campaign-price-filter input::placeholder {
          color: #aaa5ae;
        }

        .campaign-price-dash {
          color: #999999;
          font-size: 11px;
        }


        .campaign-clear-filters {
          height: 38px;
          padding: 0 12px;
          border: 0;
          background: transparent;
          color: #666666;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          cursor: pointer;
        }

        .campaign-clear-filters:hover {
          color: #111111;
        }


        /* ====================================================
           MOBILE FILTERS
        ==================================================== */

        .campaign-mobile-filter-button {
          display: none;
        }

        .campaign-mobile-filters {
          display: none;
        }


        /* ====================================================
           GRID
        ==================================================== */

        .campaigns-grid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 20px;
          align-items: stretch;
        }


        /* ====================================================
           CAMPAIGN CARD
           MATCHES LANDING CARD STYLE
        ==================================================== */

        .campaign-card {
          min-width: 0;
          height: 100%;
          min-height: 448px;
          overflow: hidden;
          border: 1px solid #e4e4e4;
          border-radius: 14px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;
        }

        .campaign-card:hover {
          transform: translateY(-3px);
          border-color: #d5d5d5;
          box-shadow:
            0 16px 30px -18px
            rgba(0,0,0,.24);
        }

        .campaign-card-body {
          padding: 18px 18px 17px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }


        /* BRAND */

        .campaign-card-topline {
          height: 32px;
          min-height: 32px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .campaign-card-brand {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .campaign-card-avatar {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #ffffff;
          font-size: 10px;
          font-weight: 500;
        }

        .campaign-card-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .campaign-card-brand-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #555555;
          font-size: 11.5px;
          font-weight: 500;
        }


        /* WISHLIST */

        .campaign-save {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid #e1e1e1;
          border-radius: 50%;
          background: #ffffff;
          color: #666666;
          cursor: pointer;
        }

        .campaign-save:hover,
        .campaign-save.is-saved {
          border-color: #bdbdbd;
          color: #111111;
        }


        /* TITLE */

        .campaign-card-title {
          min-height: 46px;
          margin: 0 0 11px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 19px;
          font-weight: 500;
          line-height: 1.28;
          letter-spacing: -.02em;
        }


        /* LOCATION */

        .campaign-card-location {
          min-height: 16px;
          margin-bottom: 11px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px 12px;
          color: #686868;
          font-size: 10.5px;
          line-height: 1.45;
        }

        .campaign-card-location span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .campaign-card-location span + span::before {
          content: "•";
          margin-right: 5px;
          color: #aaaaaa;
        }


        /* BUDGET */

        .campaign-card-budget {
          min-height: 45px;
          padding: 11px 0;
          border-top: 1px solid #eeeeee;
          border-bottom: 1px solid #eeeeee;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .campaign-card-budget strong {
          color: #111111;
          font-size: 13px;
          font-weight: 500;
        }

        .campaign-card-budget span {
          color: #777777;
          font-size: 10.5px;
          white-space: nowrap;
        }


        /* TAGS */

        .campaign-card-tags {
          min-height: 28px;
          margin: 12px 0 9px;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 6px;
        }

        .campaign-card-tags span {
          min-height: 22px;
          padding: 3px 8px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: #f5f5f5;
          color: #555555;
          font-size: 9.5px;
          line-height: 1;
        }


        /* DESCRIPTION */

        .campaign-card-description {
          min-height: 50px;
          margin: 3px 0 13px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          color: #666666;
          font-size: 10.5px;
          line-height: 1.6;
        }


        /* POSTED */

        .campaign-card-posted {
          min-height: 16px;
          margin-top: auto;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #888888;
          font-size: 9.5px;
        }


        /* ACTIONS */

        .campaign-card-actions {
          min-height: 36px;
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            minmax(0, .85fr);
          gap: 7px;
        }

        .campaign-action {
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 9px;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
          transition: all .18s ease;
        }

        .campaign-action-primary {
          border: 1px solid #111111;
          background: #111111;
          color: #ffffff;
        }

        .campaign-action-primary:hover {
          border-color: #000000;
          background: #000000;
          color: #ffffff;
        }

        .campaign-action-secondary {
          border: 1px solid #dedede;
          background: #ffffff;
          color: #111111;
        }

        .campaign-action-secondary:hover {
          border-color: #cfcfcf;
          background: #f5f5f5;
          color: #111111;
        }

        .campaign-action-disabled {
          border: 1px solid #ececec;
          background: #ececec;
          color: #777777;
          cursor: not-allowed;
        }


        /* ====================================================
           EMPTY / LOADING
        ==================================================== */

        .campaigns-state {
          min-height: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #777777;
          font-size: 13px;
        }

        .campaigns-spinner {
          width: 24px;
          height: 24px;
          margin-bottom: 12px;
          border: 2px solid #e8e8e8;
          border-top-color: #111111;
          border-radius: 50%;
          animation:
            campaign-spin .7s linear infinite;
        }

        @keyframes campaign-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .campaigns-empty {
          min-height: 320px;
          padding: 50px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .campaigns-empty-icon {
          width: 46px;
          height: 46px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f4f4f4;
          color: #666666;
        }

        .campaigns-empty h2 {
          margin: 0;
          color: #111111;
          font-family: 'League Spartan', sans-serif;
          font-size: 24px;
          font-weight: 400;
        }

        .campaigns-empty p {
          margin: 8px 0 18px;
          color: #777777;
          font-size: 12px;
        }

        .campaigns-empty button {
          height: 36px;
          padding: 0 15px;
          border: 1px solid #111111;
          border-radius: 7px;
          background: #111111;
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          cursor: pointer;
        }


        /* ====================================================
           RESPONSIVE
        ==================================================== */

        @media (max-width: 1050px) {
          .campaigns-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }


        @media (max-width: 760px) {

          .campaigns-main {
            padding-top: 96px;
          }

          .campaigns-container {
            padding: 0 18px;
          }

          .campaigns-heading h1 {
            font-size: 32px;
          }

          .campaign-filter-row {
            display: none;
          }

          .campaign-mobile-filter-button {
            width: 100%;
            height: 42px;
            margin-top: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            border: 1px solid #dedede;
            border-radius: 8px;
            background: #ffffff;
            color: #333333;
            font-family: 'Poppins', sans-serif;
            font-size: 11px;
            cursor: pointer;
          }

          .campaign-mobile-filter-button span {
            padding: 2px 6px;
            border-radius: 999px;
            background: #111111;
            color: #ffffff;
            font-size: 8px;
          }

          .campaign-mobile-filters {
            margin-top: 9px;
            padding: 13px;
            display: flex;
            flex-direction: column;
            gap: 9px;
            border: 1px solid #e2e2e2;
            border-radius: 10px;
            background: #ffffff;
          }

          .campaign-mobile-filter-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 3px;
          }

          .campaign-mobile-filter-header strong {
            font-family: 'League Spartan', sans-serif;
            font-size: 18px;
            font-weight: 400;
          }

          .campaign-mobile-filter-header button {
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 0;
            border-radius: 50%;
            background: #f3f3f3;
            color: #333333;
            cursor: pointer;
          }

          .campaign-mobile-filters .campaign-filter-dropdown {
            width: 100%;
          }

          .campaign-mobile-filters .campaign-filter-button {
            width: 100%;
          }

          .campaign-mobile-filters .campaign-filter-menu {
            width: 100%;
          }

          .campaign-mobile-price label {
            display: block;
            margin-bottom: 6px;
            color: #666666;
            font-size: 10px;
          }

          .campaign-mobile-price > div {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 7px;
          }

          .campaign-mobile-price input {
            height: 38px;
            padding: 0 10px;
            border: 1px solid #dedede;
            border-radius: 8px;
            outline: 0;
            font-family: 'Poppins', sans-serif;
            font-size: 11px;
          }

          .campaign-mobile-apply {
            height: 40px;
            margin-top: 3px;
            border: 1px solid #111111;
            border-radius: 8px;
            background: #111111;
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            font-size: 11px;
            cursor: pointer;
          }

          .campaigns-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .campaign-card {
            min-height: 0;
          }
        }

      `}</style>
    </div>
  );
}


export default Campaigns;
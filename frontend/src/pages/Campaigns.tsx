import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Heart,
  MapPin,
  Search,
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

const API_ORIGIN = "http://localhost:8000";
const CAMPAIGNS_PER_PAGE = 15;

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

function initials(value?: string | null) {
  const text = (value || "Brand").trim();

  if (!text) return "B";

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return parts[0].slice(0, 2).toUpperCase();
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

  return `Posted ${Math.floor(days / 30)} month${
    Math.floor(days / 30) === 1 ? "" : "s"
  } ago`;
}

function getLocation(campaign: PublicCampaign) {
  return campaign.brand_location || campaign.location || "Remote / flexible";
}

function getMinPrice(campaign: PublicCampaign) {
  if (campaign.budget_min != null) {
    return Number(campaign.budget_min);
  }

  if (campaign.budget != null) {
    return Number(campaign.budget);
  }

  return null;
}

function getMaxPrice(campaign: PublicCampaign) {
  if (campaign.budget_max != null) {
    return Number(campaign.budget_max);
  }

  if (campaign.budget != null) {
    return Number(campaign.budget);
  }

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
  if (!campaign.application_deadline) {
    return false;
  }

  const deadline = new Date(campaign.application_deadline);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  return new Date() >= deadline;
}

function hasNoApplications(campaign: PublicCampaign) {
  return Number(campaign.application_count || 0) === 0;
}

function isExpiredWithoutApplications(
  campaign: PublicCampaign
) {
  return (
    deadlinePassed(campaign) &&
    hasNoApplications(campaign)
  );
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

/* ============================================================
   SORT DROPDOWN
============================================================ */

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const options = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "price-low", label: "Price: low" },
    { value: "price-high", label: "Price: high" },
  ];

  const selected =
    options.find((item) => item.value === value)?.label || "Newest";

  return (
    <div className="campaign-sort">
      <button
        type="button"
        className="campaign-sort-button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected}</span>
        <ChevronDown
          size={14}
          className={open ? "sort-open" : ""}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="sort-backdrop"
            onClick={() => setOpen(false)}
            aria-label="Close sort menu"
          />

          <div className="campaign-sort-menu">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  value === option.value
                    ? "sort-option selected"
                    : "sort-option"
                }
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
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
  const expired =
    isExpiredWithoutApplications(campaign);

  const passedDeadline =
    deadlinePassed(campaign);

  const tags = tagsFor(campaign);

  return (
    <article
      className={`campaign-card ${
        expired ? "campaign-card-expired" : ""
      }`}
    >
      <div className="campaign-card-inner">

        {/* BRAND */}

        <div className="campaign-card-top">
          <div className="campaign-brand">
            <div className="campaign-avatar">
              {campaign.brand_logo ? (
                <img
                  src={mediaUrl(campaign.brand_logo)}
                  alt=""
                />
              ) : (
                initials(campaign.brand_name)
              )}
            </div>

            <span>
              {campaign.brand_name || "Brand"}
            </span>
          </div>

          {isCreator && !expired && (
            <button
              type="button"
              className={
                isSaved
                  ? "campaign-heart saved"
                  : "campaign-heart"
              }
              onClick={() =>
                onToggleSave(campaign.id)
              }
              aria-label={
                isSaved
                  ? "Remove from wishlist"
                  : "Save campaign"
              }
            >
              <Heart
                size={17}
                fill={isSaved ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>

        {/* TITLE */}

        <h2 className="campaign-title">
          {campaign.title}
        </h2>

        {/* LOCATION */}

        <div className="campaign-meta">
          <span>
            <MapPin size={13} />
            {getLocation(campaign)}
          </span>

          <span>
            {campaign.engagement_type || "Short-term"}
          </span>
        </div>

        {/* BUDGET */}

        <div className="campaign-budget-row">
          <div>
            <small>Budget</small>
            <strong>
              {budgetLabel(campaign)}
            </strong>
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
          {campaign.description ||
            "View the campaign details to learn more."}
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
          <span>
            {postedAgo(campaign.created_at)}
          </span>

          {!expired &&
            campaign.application_count > 0 && (
              <span>
                {campaign.application_count} application
                {campaign.application_count === 1
                  ? ""
                  : "s"}
              </span>
            )}
        </div>

        {/* ACTION */}

        <div className="campaign-actions">

          {/* BRAND */}

          {isAuthenticated && !isCreator ? (
            <Link
              to={`/campaigns/${campaign.id}?source=dashboard`}
              className="campaign-primary campaign-full"
            >
              View campaign detail
              <ArrowRight size={14} />
            </Link>
          ) : expired ? (
            /* EXPIRED PUBLIC CAMPAIGN */
            <span className="campaign-disabled campaign-full">
              Application deadline passed
            </span>
          ) : passedDeadline ? (
            /* DEADLINE PASSED BUT APPLICATIONS EXIST */
            <Link
              to={`/campaigns/${campaign.id}?source=landing`}
              className="campaign-primary campaign-full"
            >
              View campaign detail
              <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                to={`/campaigns/${campaign.id}?apply=true&source=landing`}
                className="campaign-primary"
              >
                Apply Campaign
                <ArrowRight size={14} />
              </Link>

              <Link
                to={`/campaigns/${campaign.id}?source=landing`}
                className="campaign-secondary"
              >
                View details
              </Link>
            </>
          )}

        </div>
      </div>
    </article>
  );
}

/* ============================================================
   MAIN
============================================================ */

export function Campaigns() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const isCreator =
    user?.role === "creator";

  const isAuthenticated =
    Boolean(user);

  const [campaigns, setCampaigns] =
    useState<PublicCampaign[]>([]);

  const [saved, setSaved] =
    useState<SavedCampaignEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [minPrice, setMinPrice] =
    useState("");

  const [maxPrice, setMaxPrice] =
    useState("");

  const [engagement, setEngagement] =
    useState("");

  const [experience, setExperience] =
    useState("");

  const [creatorType, setCreatorType] =
    useState("");

  const [sort, setSort] =
    useState("newest");

  const [currentPage, setCurrentPage] =
    useState(1);

  /* ==========================================================
     LOAD
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");

    getPublicCampaigns({
      page: 1,
      limit: 100,
    })
      .then((response) => {
        if (!cancelled) {
          setCampaigns(response.campaigns || []);
        }
      })
      .catch((err) => {
        console.error(err);

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
        console.error(
          "Could not load saved campaigns",
          err
        );
      });
  }, [isCreator]);

  const savedIds = useMemo(
    () =>
      new Set(
        saved.map(
          (item) => item.campaign_id
        )
      ),
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

        setSaved((items) =>
          items.filter(
            (item) =>
              item.campaign_id !== id
          )
        );
      } else {
        const item =
          await saveCampaign(id);

        setSaved((items) => [
          ...items,
          item,
        ]);
      }
    } catch (err) {
      console.error(
        "Could not update wishlist",
        err
      );
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
            .map(
              (item) =>
                item.category?.trim()
            )
            .filter(Boolean) as string[]
        ),
      ].sort(),
    [campaigns]
  );

  const locations = useMemo(
    () =>
      [
        ...new Set(
          campaigns
            .map(getLocation)
            .filter(Boolean)
        ),
      ].sort(),
    [campaigns]
  );

  const engagements = useMemo(
    () =>
      [
        ...new Set(
          campaigns
            .map(
              (item) =>
                item.engagement_type?.trim()
            )
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
            .map(
              (item) =>
                item.experience_level?.trim()
            )
            .filter(Boolean) as string[]
        ),
      ].sort(),
    [campaigns]
  );

  const creatorTypes = useMemo(
    () =>
      [
        ...new Set(
          campaigns.flatMap(
            (item) =>
              item.creator_types || []
          )
        ),
      ].sort(),
    [campaigns]
  );

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredCampaigns =
    useMemo(() => {
      const search =
        searchParams
          .get("search")
          ?.trim()
          .toLowerCase() || "";

      const minimum =
        minPrice
          ? Number(minPrice)
          : null;

      const maximum =
        maxPrice
          ? Number(maxPrice)
          : null;

      const result =
        campaigns.filter(
          (campaign) => {

            /*
              A campaign with a passed deadline and ZERO
              applications is expired and should disappear
              from the public marketplace.
            */
            if (
              isExpiredWithoutApplications(
                campaign
              )
            ) {
              return false;
            }

            if (
              search
            ) {
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

              if (
                !text.includes(search)
              ) {
                return false;
              }
            }

            if (
              category &&
              campaign.category !==
                category
            ) {
              return false;
            }

            if (
              location &&
              getLocation(campaign) !==
                location
            ) {
              return false;
            }

            if (
              engagement &&
              campaign.engagement_type !==
                engagement
            ) {
              return false;
            }

            if (
              experience &&
              campaign.experience_level !==
                experience
            ) {
              return false;
            }

            if (
              creatorType &&
              !(
                campaign.creator_types ||
                []
              ).includes(
                creatorType
              )
            ) {
              return false;
            }

            const campaignMin =
              getMinPrice(
                campaign
              );

            const campaignMax =
              getMaxPrice(
                campaign
              );

            if (
              minimum != null &&
              (
                campaignMax == null ||
                campaignMax <
                  minimum
              )
            ) {
              return false;
            }

            if (
              maximum != null &&
              (
                campaignMin == null ||
                campaignMin >
                  maximum
              )
            ) {
              return false;
            }

            return true;
          }
        );

      result.sort(
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
              (getMinPrice(a) ?? Infinity) -
              (getMinPrice(b) ?? Infinity)
            );
          }

          if (
            sort === "price-high"
          ) {
            return (
              (getMaxPrice(b) ?? 0) -
              (getMaxPrice(a) ?? 0)
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

      return result;
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
    ]);

  /* ==========================================================
     PAGINATION
  ========================================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCampaigns.length /
          CAMPAIGNS_PER_PAGE
      )
    );

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const visibleCampaigns =
    filteredCampaigns.slice(
      (currentPage - 1) *
        CAMPAIGNS_PER_PAGE,
      currentPage *
        CAMPAIGNS_PER_PAGE
    );

  const first =
    filteredCampaigns.length === 0
      ? 0
      : (currentPage - 1) *
          CAMPAIGNS_PER_PAGE +
        1;

  const last =
    Math.min(
      currentPage *
        CAMPAIGNS_PER_PAGE,
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
    setSort("newest");
    setCurrentPage(1);
  };

  const hasFilters =
    Boolean(
      category ||
      location ||
      minPrice ||
      maxPrice ||
      engagement ||
      experience ||
      creatorType
    );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="campaigns-page">

      <PublicNavbar sticky />

      <main className="campaigns-main">
        <div className="campaigns-container">

          <div className="campaigns-layout">

            {/* SIDEBAR */}

            <aside className="campaign-sidebar">

              <div className="sidebar-sort-label">
                Sort by:
              </div>

              <SortDropdown
                value={sort}
                onChange={setSort}
              />

              <FilterSection
                title="Category"
              >
                <RadioRow
                  label="All categories"
                  checked={!category}
                  onClick={() =>
                    setCategory("")
                  }
                />

                {categories.map(
                  (item) => (
                    <RadioRow
                      key={item}
                      label={item}
                      checked={
                        category ===
                        item
                      }
                      onClick={() =>
                        setCategory(
                          item
                        )
                      }
                    />
                  )
                )}
              </FilterSection>

              <FilterSection
                title="Location"
              >
                <div className="location-input">
                  <MapPin size={13} />

                  <input
                    value={location}
                    onChange={(e) =>
                      setLocation(
                        e.target.value
                      )
                    }
                    placeholder="e.g. Kathmandu"
                  />
                </div>

                {locations.map(
                  (item) => (
                    <RadioRow
                      key={item}
                      label={item}
                      checked={
                        location ===
                        item
                      }
                      onClick={() =>
                        setLocation(
                          item
                        )
                      }
                    />
                  )
                )}
              </FilterSection>

              <FilterSection title="Price">
                <div className="price-inputs">

                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) =>
                      setMinPrice(
                        e.target.value
                      )
                    }
                    placeholder="NPR 0"
                  />

                  <span>to</span>

                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) =>
                      setMaxPrice(
                        e.target.value
                      )
                    }
                    placeholder="NPR 50000"
                  />

                </div>
              </FilterSection>

              <FilterSection
                title="Engagement"
              >
                <RadioRow
                  label="All engagement types"
                  checked={!engagement}
                  onClick={() =>
                    setEngagement("")
                  }
                />

                {engagements.map(
                  (item) => (
                    <RadioRow
                      key={item}
                      label={item}
                      checked={
                        engagement ===
                        item
                      }
                      onClick={() =>
                        setEngagement(
                          item
                        )
                      }
                    />
                  )
                )}
              </FilterSection>

              <FilterSection
                title="Experience"
              >
                <RadioRow
                  label="All experience levels"
                  checked={!experience}
                  onClick={() =>
                    setExperience("")
                  }
                />

                {experiences.map(
                  (item) => (
                    <RadioRow
                      key={item}
                      label={item}
                      checked={
                        experience ===
                        item
                      }
                      onClick={() =>
                        setExperience(
                          item
                        )
                      }
                    />
                  )
                )}
              </FilterSection>

              <FilterSection
                title="Creator type"
              >
                <RadioRow
                  label="All creator types"
                  checked={!creatorType}
                  onClick={() =>
                    setCreatorType("")
                  }
                />

                {creatorTypes.map(
                  (item) => (
                    <RadioRow
                      key={item}
                      label={item}
                      checked={
                        creatorType ===
                        item
                      }
                      onClick={() =>
                        setCreatorType(
                          item
                        )
                      }
                    />
                  )
                )}
              </FilterSection>

              {hasFilters && (
                <button
                  type="button"
                  className="clear-filters"
                  onClick={
                    clearFilters
                  }
                >
                  Clear all filters
                </button>
              )}

            </aside>

            {/* RESULTS */}

            <section className="campaign-results">

              <div className="results-heading">
                {loading
                  ? "Loading campaigns..."
                  : `Showing ${first}–${last} of ${filteredCampaigns.length} campaigns`}
              </div>

              {loading && (
                <div className="campaign-state">
                  Loading campaigns...
                </div>
              )}

              {!loading &&
                error && (
                  <div className="campaign-state">
                    {error}
                  </div>
                )}

              {!loading &&
                !error &&
                visibleCampaigns.length ===
                  0 && (
                  <div className="campaign-empty">
                    <Search size={22} />

                    <h2>
                      No campaigns found
                    </h2>

                    <p>
                      Try changing your filters.
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
                )}

              {!loading &&
                !error &&
                visibleCampaigns.length >
                  0 && (
                  <div className="campaign-grid">

                    {visibleCampaigns.map(
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
                            toggleSave
                          }
                        />
                      )
                    )}

                  </div>
                )}

              {/* PAGINATION */}

              {!loading &&
                !error &&
                totalPages > 1 && (
                  <div className="pagination">

                    <button
                      type="button"
                      disabled={
                        currentPage ===
                        1
                      }
                      onClick={() =>
                        setCurrentPage(
                          (page) =>
                            Math.max(
                              1,
                              page - 1
                            )
                        )
                      }
                    >
                      <ArrowLeft
                        size={15}
                      />
                    </button>

                    {Array.from(
                      {
                        length:
                          totalPages,
                      },
                      (_, index) =>
                        index + 1
                    ).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          className={
                            currentPage ===
                            page
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setCurrentPage(
                              page
                            )
                          }
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={
                        currentPage ===
                        totalPages
                      }
                      onClick={() =>
                        setCurrentPage(
                          (page) =>
                            Math.min(
                              totalPages,
                              page + 1
                            )
                        )
                      }
                    >
                      <ArrowRight
                        size={15}
                      />
                    </button>

                  </div>
                )}

            </section>
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
          padding: 150px 0 70px;
        }

        .campaigns-container {
          width: min(1450px, calc(100% - 55px));
          margin: 0 auto;
        }

        .campaigns-layout {
          display: grid;
          grid-template-columns: 245px minmax(0, 1fr);
          gap: 30px;
        }

        /* SIDEBAR */

        .campaign-sidebar {
          padding-right: 24px;
          border-right: 1px solid #e9e9e9;
        }

        .sidebar-sort-label {
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: 500;
        }

        .campaign-sort {
          position: relative;
          margin-bottom: 30px;
        }

        .campaign-sort-button {
          width: 100%;
          height: 45px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 0;
          border-radius: 6px;
          background: #111;
          color: #fff;
          font: 500 11px Poppins, sans-serif;
          cursor: pointer;
        }

        .sort-open {
          transform: rotate(180deg);
        }

        .sort-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10;
          border: 0;
          background: transparent;
        }

        .campaign-sort-menu {
          position: absolute;
          top: 51px;
          left: 0;
          right: 0;
          z-index: 20;
          overflow: hidden;
          border: 1px solid #ddd;
          border-radius: 7px;
          background: #fff;
          box-shadow: 0 12px 28px rgba(0,0,0,.1);
        }

        .sort-option {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border: 0;
          border-bottom: 1px solid #eee;
          background: #fff;
          text-align: left;
          font: 400 10px Poppins, sans-serif;
          color: #555;
          cursor: pointer;
        }

        .sort-option:hover,
        .sort-option.selected {
          background: #f5f5f5;
          color: #111;
        }

        .campaign-filter-section {
          margin-bottom: 28px;
        }

        .campaign-filter-section h3 {
          margin: 0 0 11px;
          font-size: 12px;
          font-weight: 500;
        }

        .radio-row {
          min-height: 28px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #555;
          font-size: 10.5px;
          cursor: pointer;
        }

        .radio-row input {
          width: 14px;
          height: 14px;
          margin: 0;
          accent-color: #111;
        }

        .location-input {
          height: 37px;
          margin-bottom: 6px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #ddd;
          border-radius: 5px;
          color: #999;
        }

        .location-input input {
          width: 100%;
          border: 0;
          outline: 0;
          font: 400 10px Poppins, sans-serif;
          color: #222;
        }

        .price-inputs {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 6px;
        }

        .price-inputs input {
          width: 100%;
          height: 37px;
          padding: 0 7px;
          border: 1px solid #ddd;
          outline: 0;
          font: 400 9px Poppins, sans-serif;
        }

        .price-inputs span {
          font-size: 9px;
          color: #777;
        }

        .clear-filters {
          width: 100%;
          height: 36px;
          border: 1px solid #111;
          background: #fff;
          color: #111;
          font: 500 10px Poppins, sans-serif;
          cursor: pointer;
        }

        .clear-filters:hover {
          background: #111;
          color: #fff;
        }

        /* RESULTS */

        .campaign-results {
          min-width: 0;
        }

        .results-heading {
          margin-bottom: 17px;
          font-size: 12px;
          font-weight: 500;
        }

        /*
          IMPORTANT:
          Two cards per row.
          This makes each card wider and more rectangular.
        */

        .campaign-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        /* CARD */

        .campaign-card {
          min-width: 0;
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
          padding: 18px;
        }

        .campaign-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
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
          font: 500 21px/1.15 "League Spartan", sans-serif;
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

        .campaign-budget-row {
          display: grid;
          grid-template-columns: 1fr 150px;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
        }

        .campaign-budget-row > div {
          min-height: 58px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .campaign-duration {
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
          min-height: 24px;
          margin: 11px 0 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .campaign-tags span {
          padding: 4px 8px;
          border-radius: 99px;
          background: #f4f4f4;
          color: #555;
          font-size: 8px;
        }

        .campaign-description {
          min-height: 31px;
          margin: 4px 0 12px;
          color: #666;
          font-size: 9.5px;
          line-height: 1.55;
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

        .campaign-footer {
          min-height: 20px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: #888;
          font-size: 8.5px;
        }

        .campaign-actions {
          display: grid;
          grid-template-columns: 1.35fr .85fr;
          gap: 7px;
        }

        .campaign-primary,
        .campaign-secondary,
        .campaign-disabled {
          min-height: 37px;
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
          border: 1px solid #111;
          background: #111;
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
          border-color: #111;
        }

        .pagination button.active {
          background: #111;
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
          border: 1px solid #111;
          border-radius: 7px;
          background: #111;
          color: #fff;
          font: 500 10px Poppins, sans-serif;
          cursor: pointer;
        }

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

          .campaign-sidebar {
            display: none;
          }

          .campaign-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 500px) {
          .campaign-budget-row {
            grid-template-columns: 1fr;
          }

          .campaign-duration {
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

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="campaign-filter-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function RadioRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <label className="radio-row">
      <input
        type="radio"
        checked={checked}
        onChange={onClick}
      />
      <span>{label}</span>
    </label>
  );
}

export default Campaigns;
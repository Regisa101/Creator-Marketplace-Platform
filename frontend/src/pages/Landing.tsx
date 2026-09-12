// frontend/src/pages/Landing.tsx

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogoMark, OFF_WHITE } from "../components/Logo";
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

import {
  Search,
  ChevronDown,
  Calendar,
  ArrowRight,
  MapPin,
  Users,
  Target,
  BarChart3,
  Handshake,
  Heart,
} from "lucide-react";

// ============================================
// BRAND COLORS
// ============================================

const NAVY = "#7661A1";
const CORAL = "#F47C78";

const NAV_BG = OFF_WHITE;
const HERO_BG = OFF_WHITE;
const PAGE_BG = OFF_WHITE;

// ============================================
// FILTER DATA
// ============================================

const DEADLINE_FILTERS = [
  "All Deadlines",
  "Due this week",
  "Due this month",
  "Later",
];

const AVAILABILITY_FILTERS = [
  "All Campaigns",
  "Available",
  "Booked",
];

const PRICE_RANGE_FILTERS = [
  "All Prices",
  "Under NPR 5,000",
  "NPR 5,000–10,000",
  "NPR 10,000–25,000",
  "NPR 25,000–50,000",
  "NPR 50,000–100,000",
  "NPR 100,000+",
];

const CREATOR_TYPE_FILTERS = [
  {
    label: "Creator Audience Size",
    value: "All Creator Types",
  },
  {
    label: "Under 10K followers",
    value: "Under 10K followers",
  },
  {
    label: "10K–50K followers",
    value: "10K–50K followers",
  },
  {
    label: "50K–250K followers",
    value: "50K–250K followers",
  },
  {
    label: "250K–1M followers",
    value: "250K–1M followers",
  },
  {
    label: "1M+ followers",
    value: "1M+ followers",
  },
];

const ALL_CAMPAIGN_CATEGORIES = [
  "All Categories",
  "Food",
  "Beauty",
  "Fashion",
  "Travel",
  "Technology",
  "Fitness",
  "Education",
  "Lifestyle",
  "Finance",
  "Gaming",
  "Health",
  "Home & Living",
  "Sports",
  "Entertainment",
  "Business",
  "Automotive",
  "Pets",
  "Photography",
  "Music",
  "Parenting",
];

// ============================================
// API / MEDIA HELPERS
// ============================================

const API_ORIGIN = "http://localhost:8000";

function mediaUrl(url?: string | null) {
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

// ============================================
// CAMPAIGN HELPERS
// ============================================

function campaignImage(c: PublicCampaign) {
  return mediaUrl(
    c.hero_image || c.extra_photos?.[0]
  );
}

function campaignPlatform(c: PublicCampaign) {
  return (
    c.required_platforms?.[0] ||
    c.required_platform ||
    ""
  );
}

function creatorAudienceLabel(c: PublicCampaign) {
  const ranges =
    c.creator_requirements?.follower_ranges || [];

  return ranges[0] || "";
}

function isBooked(c: PublicCampaign) {
  return c.status === "in_progress";
}

function isUnavailable(c: PublicCampaign) {
  return (
    c.status === "in_progress" ||
    c.status === "completed" ||
    c.status === "closed"
  );
}

function matchesPriceRange(
  budget: number,
  range: string
) {
  const price = Number(budget || 0);

  switch (range) {
    case "Under NPR 5,000":
      return price < 5000;

    case "NPR 5,000–10,000":
      return price >= 5000 && price <= 10000;

    case "NPR 10,000–25,000":
      return price > 10000 && price <= 25000;

    case "NPR 25,000–50,000":
      return price > 25000 && price <= 50000;

    case "NPR 50,000–100,000":
      return price > 50000 && price <= 100000;

    case "NPR 100,000+":
      return price > 100000;

    default:
      return true;
  }
}

// ============================================
// FILTER DROPDOWN
// ============================================

type FilterDropdownProps = {
  label: string;
  value: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
};

function FilterDropdown({
  label,
  value,
  options,
  open,
  onToggle,
  onChange,
}: FilterDropdownProps) {
  const displayValue =
    value === options[0] ? label : value;

  return (
    <div
      className={`lp-filter-dropdown${
        open ? " is-open" : ""
      }`}
    >
      <button
        type="button"
        className="lp-filter-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{displayValue}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="lp-filter-menu"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={value === option}
              key={option}
              className={`lp-filter-option${
                value === option ? " selected" : ""
              }`}
              onClick={() => onChange(option)}
            >
              <span>{option}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// BRAND FEATURES
// ============================================

const BRAND_FEATURES = [
  {
    icon: Users,
    title: "Access Genuine",
    subtitle: "Creators",
  },
  {
    icon: Target,
    title: "Targeted",
    subtitle: "Campaigns",
  },
  {
    icon: BarChart3,
    title: "Track Results",
    subtitle: "& Performance",
  },
  {
    icon: Handshake,
    title: "Build Long-Term",
    subtitle: "Partnerships",
  },
];

// ============================================
// CAMPAIGN CARD
// ============================================

function CampaignCard({
  c,
  isCreator,
  isAuthenticated,
  isSaved,
  onToggleSave,
}: {
  c: PublicCampaign;
  isCreator: boolean;
  isAuthenticated: boolean;
  isSaved: boolean;
  onToggleSave: (campaignId: number) => void;
}) {
  const image = campaignImage(c);
  const booked = isBooked(c);
  const unavailable = isUnavailable(c);
  const platform = campaignPlatform(c);

  const deadline =
    c.application_deadline || c.deadline;

  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      )
    : "—";

  return (
    <div
      className={`lp-card${
        booked ? " lp-card-booked" : ""
      }`}
    >
      {/* IMAGE */}
      <div className="lp-card-media">
        {image ? (
          <img
            src={image}
            alt={c.title}
            loading="lazy"
          />
        ) : (
          <div className="lp-card-image-placeholder">
            Campaign image
          </div>
        )}

        <span
          className={`lp-badge ${
            booked
              ? "lp-badge-booked"
              : "lp-badge-paid"
          }`}
        >
          {booked ? "Booked" : "Paid"}
        </span>

        {isCreator &&
          !unavailable && (
            <button
              type="button"
              className={`lp-campaign-save ${
                isSaved ? "is-saved" : ""
              }`}
              onClick={(event) => {
                event.preventDefault();
                onToggleSave(c.id);
              }}
              aria-label={
                isSaved
                  ? "Remove from wishlist"
                  : "Save to wishlist"
              }
              title={
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

      {/* BODY */}
      <div className="lp-card-body">
        {/* BRAND */}
        <div className="lp-card-brand">
          <span
            className="lp-card-avatar"
            style={{
              background: c.brand_logo
                ? "#fff"
                : NAVY,
            }}
          >
            {c.brand_logo ? (
              <img
                src={mediaUrl(c.brand_logo)}
                alt=""
              />
            ) : (
              initials(
                c.brand_name || "Brand"
              )
            )}
          </span>

          <span className="lp-card-brand-name">
            {c.brand_name || "Brand"}
          </span>
        </div>

        {/* TITLE */}
        <h3 className="lp-card-title">
          {c.title}
        </h3>

        {/* DESCRIPTION */}
        <p className="lp-card-description">
          {c.tagline ||
            c.description ||
            "View the brief to see the full campaign details."}
        </p>

        {/* CATEGORY */}
        {c.category && (
          <span className="lp-card-category">
            {c.category}
          </span>
        )}

        {/* PRICE + LOCATION */}
        <div className="lp-card-meta">
          <span className="lp-card-comp">
            NRs{" "}
            {Number(
              c.budget || 0
            ).toLocaleString()}
          </span>

          {c.brand_location && (
            <span>
              <MapPin size={13} />
              {c.brand_location}
            </span>
          )}
        </div>

        {/* DEADLINE + PLATFORM */}
        <div className="lp-card-secondary-meta">
          <span>
            <Calendar size={12} />
            Apply by {formattedDeadline}
          </span>

          <span>
            {platform ||
              creatorAudienceLabel(c) ||
              `${
                c.creators_needed || 1
              } creator${
                (c.creators_needed || 1) ===
                1
                  ? ""
                  : "s"
              }`}
          </span>
        </div>

        {/* ACTIONS */}
        <div className="lp-card-actions">
          {/* Left action: creators/visitors can apply; brands only see details. */}
          {booked ? (
            <span
              className="lp-card-apply lp-card-apply-disabled"
              aria-disabled="true"
            >
              Booked
            </span>
          ) : unavailable ? (
            <span
              className="lp-card-apply lp-card-apply-disabled"
              aria-disabled="true"
            >
              Not accepting applications
            </span>
          ) : isCreator || !isAuthenticated ? (
            <Link
              to={`/campaigns/${c.id}?apply=true&source=landing`}
              className="lp-card-apply"
            >
              Apply Now
              <ArrowRight
                size={14}
                style={{ flexShrink: 0 }}
              />
            </Link>
          ) : null}

          {/* Everyone can open the campaign details from Landing. */}
          <Link
            to={`/campaigns/${c.id}?source=landing`}
            className="lp-card-view"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LANDING PAGE
// ============================================

export function Landing() {
  const { user } = useAuth();

  const isCreator =
    user?.role === "creator";

  const routerLocation = useLocation();

  // ==========================================
  // STATE
  // ==========================================

  const [saved, setSaved] = useState<
    SavedCampaignEntry[]
  >([]);

  const [search, setSearch] =
    useState("");

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [category, setCategory] =
    useState("All Categories");

  const [location, setLocation] =
    useState("Location");

  const [platform, setPlatform] =
    useState("Platform");

  const [priceRange, setPriceRange] =
    useState("All Prices");

  const [deadlineFilter, setDeadlineFilter] =
    useState("All Deadlines");

  const [creatorType, setCreatorType] =
    useState("All Creator Types");

  const [availability, setAvailability] =
    useState("All Campaigns");

  const [openFilter, setOpenFilter] =
    useState<string | null>(null);

  const [campaigns, setCampaigns] =
    useState<PublicCampaign[]>([]);

  const [
    campaignLoading,
    setCampaignLoading,
  ] = useState(true);

  const [campaignError, setCampaignError] =
    useState("");

  const [visibleCount, setVisibleCount] =
    useState(7);

  // ==========================================
  // HASH SCROLLING
  // ==========================================

  useEffect(() => {
    const hash =
      routerLocation.hash?.replace(
        "#",
        ""
      );

    if (!hash) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);

    return () =>
      window.clearTimeout(timer);
  }, [
    routerLocation.pathname,
    routerLocation.hash,
  ]);

  // ==========================================
  // LOAD PUBLIC CAMPAIGNS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    setCampaignLoading(true);
    setCampaignError("");

    getPublicCampaigns({
      limit: 100,
    })
      .then(
        (response: {
          campaigns: PublicCampaign[];
        }) => {
          if (!cancelled) {
            setCampaigns(
              response.campaigns || []
            );
          }
        }
      )
      .catch((error: unknown) => {
        console.error(
          "Could not load public campaigns:",
          error
        );

        if (!cancelled) {
          setCampaignError(
            "Campaigns could not be loaded right now."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCampaignLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================
  // LOAD SAVED CAMPAIGNS
  // ==========================================

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
      .catch((error) => {
        console.error(
          "Could not load wishlist:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isCreator]);

  // ==========================================
  // SAVED IDS
  // ==========================================

  const savedIds = useMemo(
    () =>
      new Set(
        saved.map(
          (item) => item.campaign_id
        )
      ),
    [saved]
  );

  // ==========================================
  // TOGGLE SAVE
  // ==========================================

  const handleToggleSave = async (
    campaignId: number
  ) => {
    if (!isCreator) return;

    try {
      if (savedIds.has(campaignId)) {
        await unsaveCampaign(campaignId);

        setSaved((items) =>
          items.filter(
            (item) =>
              item.campaign_id !==
              campaignId
          )
        );
      } else {
        const entry =
          await saveCampaign(campaignId);

        setSaved((items) => [
          ...items,
          entry,
        ]);
      }

      window.dispatchEvent(
        new Event("ch:wishlist-changed")
      );
    } catch (error) {
      console.error(
        "Could not update wishlist:",
        error
      );
    }
  };

  // ==========================================
  // SEARCH SUGGESTIONS
  // ==========================================

  const searchSuggestions = useMemo(() => {
    const q =
      search.trim().toLowerCase();

    const suggestions: Array<{
      label: string;
      type: string;
      campaignId?: number;
    }> = [];

    campaigns.forEach((c) => {
      const brand =
        c.brand_name || "Brand";

      if (
        !q ||
        c.title
          .toLowerCase()
          .includes(q)
      ) {
        suggestions.push({
          label: c.title,
          type: "Campaign",
          campaignId: c.id,
        });
      }

      if (
        q &&
        brand
          .toLowerCase()
          .includes(q) &&
        !suggestions.some(
          (item) =>
            item.label === brand
        )
      ) {
        suggestions.push({
          label: brand,
          type: "Brand",
        });
      }
    });

    const categories = Array.from(
      new Set(
        campaigns
          .map((c) => c.category)
          .filter(Boolean) as string[]
      )
    );

    categories.forEach((item) => {
      if (
        q &&
        item
          .toLowerCase()
          .includes(q) &&
        !suggestions.some(
          (s) => s.label === item
        )
      ) {
        suggestions.push({
          label: item,
          type: "Category",
        });
      }
    });

    const locations = Array.from(
      new Set(
        campaigns
          .map(
            (c) => c.brand_location
          )
          .filter(Boolean) as string[]
      )
    );

    locations.forEach((item) => {
      if (
        q &&
        item
          .toLowerCase()
          .includes(q) &&
        !suggestions.some(
          (s) => s.label === item
        )
      ) {
        suggestions.push({
          label: item,
          type: "Location",
        });
      }
    });

    const platforms = Array.from(
      new Set(
        campaigns
          .map(campaignPlatform)
          .filter(Boolean) as string[]
      )
    );

    platforms.forEach((item) => {
      if (
        q &&
        item
          .toLowerCase()
          .includes(q) &&
        !suggestions.some(
          (s) => s.label === item
        )
      ) {
        suggestions.push({
          label: item,
          type: "Platform",
        });
      }
    });

    return suggestions.slice(0, 7);
  }, [search, campaigns]);

  // ==========================================
  // CATEGORY OPTIONS
  // ==========================================

  const categories = useMemo(() => {
    const backendCategories =
      Array.from(
        new Set(
          campaigns
            .map((c) =>
              String(
                c.category || ""
              ).trim()
            )
            .filter(Boolean)
        )
      );

    const extras =
      backendCategories.filter(
        (item) =>
          !ALL_CAMPAIGN_CATEGORIES.includes(
            item
          )
      );

    return [
      ...ALL_CAMPAIGN_CATEGORIES,
      ...extras,
    ];
  }, [campaigns]);

  // ==========================================
  // LOCATION OPTIONS
  // ==========================================

  const locations = useMemo(
    () => [
      "Location",
      ...Array.from(
        new Set(
          campaigns
            .map(
              (c) =>
                c.brand_location
            )
            .filter(Boolean) as string[]
        )
      ),
    ],
    [campaigns]
  );

  // ==========================================
  // PLATFORM OPTIONS
  // ==========================================

  const platforms = useMemo(
    () => [
      "Platform",
      ...Array.from(
        new Set(
          campaigns
            .map(campaignPlatform)
            .filter(Boolean) as string[]
        )
      ),
    ],
    [campaigns]
  );

  // ==========================================
  // FILTER CAMPAIGNS
  // ==========================================

  const filtered = useMemo(() => {
    const matches =
      campaigns.filter((c) => {
        /*
         * ONLY LIVE CAMPAIGNS
         *
         * Public landing page only displays
         * published or in-progress campaigns
         * that have been fully funded.
         */

        const status = String(
          c.status || ""
        ).toLowerCase();

        const fundingStatus = String(
          c.funding_status || ""
        ).toLowerCase();

        const isLive =
          [
            "published",
            "in_progress",
          ].includes(status) &&
          fundingStatus === "funded";

        if (!isLive) {
          return false;
        }

        // ------------------------------------
        // SEARCH
        // ------------------------------------

        const query =
          search.trim().toLowerCase();

        const matchesSearch =
          !query ||
          c.title
            .toLowerCase()
            .includes(query) ||
          (c.brand_name || "")
            .toLowerCase()
            .includes(query) ||
          (c.category || "")
            .toLowerCase()
            .includes(query) ||
          (c.description || "")
            .toLowerCase()
            .includes(query);

        // ------------------------------------
        // CATEGORY
        // ------------------------------------

        const matchesCategory =
          category ===
            "All Categories" ||
          c.category === category;

        // ------------------------------------
        // LOCATION
        // ------------------------------------

        const matchesLocation =
          location === "Location" ||
          c.brand_location ===
            location;

        // ------------------------------------
        // PLATFORM
        // ------------------------------------

        const matchesPlatform =
          platform === "Platform" ||
          campaignPlatform(c) ===
            platform;

        // ------------------------------------
        // PRICE
        // ------------------------------------

        const matchesPrice =
          priceRange ===
            "All Prices" ||
          matchesPriceRange(
            Number(c.budget || 0),
            priceRange
          );

        // ------------------------------------
        // DEADLINE
        // ------------------------------------

        const deadlineValue =
          c.application_deadline ||
          c.deadline ||
          "";

        const deadlineDate =
          deadlineValue
            ? new Date(deadlineValue)
            : null;

        const today = new Date();

        const weekEnd = new Date(
          today
        );

        weekEnd.setDate(
          today.getDate() + 7
        );

        const monthEnd = new Date(
          today
        );

        monthEnd.setMonth(
          today.getMonth() + 1
        );

        let matchesDeadline = true;

        if (
          deadlineFilter !==
          "All Deadlines"
        ) {
          if (
            !deadlineDate ||
            Number.isNaN(
              deadlineDate.getTime()
            )
          ) {
            matchesDeadline = false;
          } else if (
            deadlineFilter ===
            "Due this week"
          ) {
            matchesDeadline =
              deadlineDate >= today &&
              deadlineDate <= weekEnd;
          } else if (
            deadlineFilter ===
            "Due this month"
          ) {
            matchesDeadline =
              deadlineDate >= today &&
              deadlineDate <= monthEnd;
          } else if (
            deadlineFilter ===
            "Later"
          ) {
            matchesDeadline =
              deadlineDate >
              monthEnd;
          }
        }

        // ------------------------------------
        // CREATOR AUDIENCE
        // ------------------------------------

        const audience =
          creatorAudienceLabel(c);

        const matchesCreatorType =
          creatorType ===
            "All Creator Types" ||
          audience === creatorType;

        // ------------------------------------
        // AVAILABILITY
        // ------------------------------------

        const booked = isBooked(c);

        const matchesAvailability =
          availability ===
            "All Campaigns" ||
          (availability ===
            "Booked" &&
            booked) ||
          (availability ===
            "Available" &&
            !booked);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesLocation &&
          matchesPlatform &&
          matchesPrice &&
          matchesDeadline &&
          matchesCreatorType &&
          matchesAvailability
        );
      });

    /*
     * AVAILABLE FIRST
     * BOOKED LAST
     * NEWEST FIRST
     */

    return [...matches].sort(
      (a, b) => {
        const bookedA =
          a.status ===
          "in_progress"
            ? 1
            : 0;

        const bookedB =
          b.status ===
          "in_progress"
            ? 1
            : 0;

        if (
          bookedA !== bookedB
        ) {
          return (
            bookedA - bookedB
          );
        }

        const dateA =
          new Date(
            a.created_at ||
              a.updated_at ||
              0
          ).getTime() || 0;

        const dateB =
          new Date(
            b.created_at ||
              b.updated_at ||
              0
          ).getTime() || 0;

        return dateB - dateA;
      }
    );
  }, [
    campaigns,
    search,
    category,
    location,
    platform,
    priceRange,
    deadlineFilter,
    creatorType,
    availability,
  ]);

  // ==========================================
  // DISPLAY CAMPAIGNS
  // ==========================================

  const displayCampaigns =
    useMemo(() => {
      return [...filtered].sort(
        (a, b) => {
          const bookedA =
            a.status ===
            "in_progress"
              ? 1
              : 0;

          const bookedB =
            b.status ===
            "in_progress"
              ? 1
              : 0;

          if (
            bookedA !== bookedB
          ) {
            return (
              bookedA - bookedB
            );
          }

          const dateA =
            new Date(
              a.created_at ||
                a.updated_at ||
                0
            ).getTime() || 0;

          const dateB =
            new Date(
              b.created_at ||
                b.updated_at ||
                0
            ).getTime() || 0;

          return dateB - dateA;
        }
      );
    }, [filtered]);

  // ==========================================
  // RESET SHOW MORE
  // ==========================================

  useEffect(() => {
    setVisibleCount(7);
  }, [
    search,
    category,
    location,
    platform,
    priceRange,
    deadlineFilter,
    creatorType,
    availability,
  ]);

  // ==========================================
  // SCROLL TO CAMPAIGNS
  // ==========================================

  const scrollToCampaigns = () => {
    document
      .getElementById("campaigns")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="lp">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

        .lp {
          --navy: ${NAVY};
          --navy-soft: #F0EBF6;
          --coral: ${CORAL};
          --coral-soft: #FDEDEC;
          --nav-bg: ${NAV_BG};
          --hero-bg: ${HERO_BG};
          --page-bg: ${PAGE_BG};
          --green: #22C55E;
          --green-soft: #E9FBF0;
          --ink: #241F2E;
          --ink-soft: #6F6A7C;
          --line: #E7E0F3;

          font-family: 'Poppins', sans-serif;
          color: var(--ink);
          background: var(--page-bg);
          min-height: 100vh;
        }

        .lp h1,
        .lp h2,
        .lp h3 {
          font-family: 'League Spartan', sans-serif;
        }

        .lp a {
          text-decoration: none;
        }

        .lp button {
          font-family: inherit;
          cursor: pointer;
        }

        .lp-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 32px;
        }

        /* ========================================
           NAVBAR
        ======================================== */

        .lp-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--nav-bg);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #EEE8E2;
        }

        .lp-nav-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .lp-logo {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .lp-logo-text {
          color: #17171A !important;
          font-family: 'League Spartan', sans-serif;
          font-weight: 700;
          font-size: 21px;
        }

        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .lp-nav-link {
          font-size: 14.5px;
          font-weight: 500;
          color: var(--ink-soft);
          position: relative;
          padding-bottom: 4px;
          transition: color .15s;
        }

        .lp-nav-link:hover {
          color: var(--navy);
        }

        .lp-nav-link.active {
          color: var(--navy);
          font-weight: 600;
        }

        .lp-nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          right: 100%;
          bottom: -3px;
          height: 2px;
          background: var(--navy);
          border-radius: 2px;
          transition: right .2s ease;
        }

        .lp-nav-link:hover::after,
        .lp-nav-link.active::after {
          right: 0;
        }

        .lp-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lp-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: var(--ink-soft);
          transition: all .15s;
        }

        .lp-icon-btn:hover {
          border-color: var(--navy);
          color: var(--navy);
        }

        .lp-avatar-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--line);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--navy-soft);
          color: var(--navy);
          font-size: 12px;
          font-weight: 700;
        }

        .lp-avatar-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .lp-btn-outline,
        .lp-btn-solid {
          min-width: 68px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          transition: all .18s ease;
        }

        .lp-btn-outline {
          border: 1px solid var(--navy);
          background: var(--navy);
          color: #fff;
          box-shadow: 0 6px 14px -8px rgba(92,70,135,.35);
        }

        .lp-btn-outline:hover {
          background: #66518F;
          border-color: #66518F;
          transform: translateY(-1px);
        }

        .lp-btn-solid {
          border: 1px solid var(--navy);
          background: var(--navy);
          color: #fff;
          box-shadow: 0 6px 14px -8px rgba(92,70,135,.35);
        }

        .lp-btn-solid:hover {
          background: #66518F;
          border-color: #66518F;
          transform: translateY(-1px);
        }

        .lp-burger {
          display: none;
          background: none;
          border: none;
          color: var(--navy);
        }

        .lp-mobile-panel {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 32px 20px;
          background: var(--nav-bg);
          border-top: 1px solid #EEE8E2;
        }

        .lp-mobile-panel a,
        .lp-mobile-panel button {
          padding: 12px 4px;
          font-size: 15px;
          font-weight: 500;
          text-align: left;
          border: none;
          background: none;
          color: var(--ink);
        }

        /* ========================================
           HERO
        ======================================== */

        .lp-hero {
          background: var(--hero-bg);
          padding: 56px 0 44px;
        }

        .lp-hero-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 32px;
          display: grid;
          grid-template-columns: 1.05fr 0.85fr;
          gap: 48px;
          align-items: center;
        }

        .lp-eyebrow {
          display: inline-block;
          font-style: italic;
          font-weight: 600;
          font-size: 15px;
          color: var(--coral);
          margin-bottom: 14px;
        }

        .lp-h1 {
          font-size: 44px;
          line-height: 1.12;
          font-weight: 700;
          color: var(--navy);
          margin: 0 0 16px;
        }

        .lp-h1-accent {
          color: var(--coral);
        }

        .lp-hero-sub {
          font-size: 16px;
          color: var(--ink-soft);
          max-width: 460px;
          margin: 0 0 26px;
          line-height: 1.6;
        }

        /* ========================================
           SEARCH
        ======================================== */

        .lp-search-wrap {
          position: relative;
          max-width: 480px;
          margin-bottom: 16px;
        }

        .lp-search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border-radius: 999px;
          padding: 6px 6px 6px 20px;
          box-shadow: 0 14px 34px -18px rgba(30,42,120,0.28);
          max-width: 480px;
          position: relative;
          z-index: 3;
        }

        .lp-search-bar input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14.5px;
          background: transparent;
          color: var(--ink);
          font-family: inherit;
        }

        .lp-search-bar input::placeholder {
          color: #B7B2C4;
        }

        .lp-search-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: var(--navy);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .lp-search-suggestions {
          position: absolute;
          top: calc(100% - 8px);
          left: 0;
          right: 0;
          z-index: 5;
          background: #fff;
          border: 1px solid #E7E0F3;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 18px 36px -18px rgba(70,48,95,.28);
          overflow: hidden;
        }

        .lp-search-suggestion {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 11px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: var(--ink);
          text-align: left;
          transition: background .15s ease, transform .15s ease;
        }

        .lp-search-suggestion:hover {
          background: #F7F3FA;
          transform: translateX(2px);
        }

        .lp-search-suggestion-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--navy);
          background: var(--navy-soft);
          flex-shrink: 0;
        }

        .lp-search-suggestion-copy {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .lp-search-suggestion-copy strong {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lp-search-suggestion-copy small {
          font-size: 10.5px;
          color: var(--ink-soft);
        }

        .lp-search-suggestion > svg {
          color: #B7B2C4;
          flex-shrink: 0;
        }

        .lp-search-empty {
          padding: 14px 12px;
          font-size: 12.5px;
          color: var(--ink-soft);
          text-align: center;
        }

        /* ========================================
           HERO VISUAL
        ======================================== */

        .lp-hero-visual {
          position: relative;
          height: 380px;
        }

        .lp-poly {
          position: absolute;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
          padding: 10px 10px 34px;
          box-shadow: 0 24px 50px -20px rgba(30,20,60,0.28);
        }

        .lp-poly img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }

        .lp-poly-main {
          width: 250px;
          height: 300px;
          top: 20px;
          left: 90px;
          transform: rotate(-2deg);
          z-index: 3;
        }

        .lp-poly-a {
          width: 150px;
          height: 130px;
          bottom: 20px;
          left: 0;
          transform: rotate(-8deg);
          z-index: 2;
        }

        .lp-poly-b {
          width: 140px;
          height: 130px;
          bottom: 0;
          right: 10px;
          transform: rotate(7deg);
          z-index: 2;
        }

        .lp-sticky {
          position: absolute;
          top: 0;
          right: 20px;
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 4px;
          padding: 10px 14px;
          font-size: 12.5px;
          font-style: italic;
          color: var(--navy);
          box-shadow: 0 8px 20px -10px rgba(0,0,0,0.15);
          transform: rotate(3deg);
          z-index: 4;
        }

        .lp-heart {
          position: absolute;
          color: var(--coral);
          opacity: 0.6;
        }

        /* ========================================
           SECTION
        ======================================== */

        .lp-section {
          padding: 64px 0;
        }

        .lp-section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .lp-h2 {
          font-size: 28px;
          font-weight: 700;
          color: var(--navy);
          margin: 0;
        }

        .lp-view-all {
          font-size: 14px;
          font-weight: 600;
          color: var(--coral);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .lp-view-all-button {
          border: none;
          background: transparent;
          font-family: inherit;
          cursor: pointer;
          padding: 0;
        }

        /* ========================================
           FILTERS
        ======================================== */

        .lp-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          max-width: 100%;
          position: relative;
          z-index: 20;
        }

        .lp-filters-section {
          max-width: none;
          margin-bottom: 28px;
        }

        .lp-filter-dropdown {
          position: relative;
          display: inline-flex;
        }

        .lp-filter-trigger {
          appearance: none;
          font-family: inherit;
          min-height: 38px;
          padding: 9px 13px 9px 14px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #fff;
          font-size: 13px;
          color: var(--ink-soft);
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          white-space: nowrap;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }

        .lp-filter-trigger:hover,
        .lp-filter-dropdown.is-open .lp-filter-trigger {
          border-color: #B8A7D1;
          background: #fff;
          box-shadow: 0 5px 14px -10px rgba(118,97,161,.55);
        }

        .lp-filter-trigger svg {
          transition: transform .18s ease;
          color: var(--ink-soft);
          flex-shrink: 0;
        }

        .lp-filter-dropdown.is-open .lp-filter-trigger svg {
          transform: rotate(180deg);
        }

        .lp-filter-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          min-width: 100%;
          width: max-content;
          max-width: 280px;
          max-height: 300px;
          overflow-y: auto;
          padding: 6px;
          background: #fff;
          border: 1px solid #DED6E9;
          border-radius: 12px;
          box-shadow: 0 16px 32px -16px rgba(62,43,83,.28);
          z-index: 1000;
          animation: lpFilterDrop .14s ease-out;
          transform-origin: top left;
        }

        .lp-filter-option {
          width: 100%;
          border: 0;
          background: transparent;
          border-radius: 8px;
          padding: 9px 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          text-align: left;
          font-family: inherit;
          font-size: 12.5px;
          color: var(--ink-soft);
          cursor: pointer;
          white-space: nowrap;
          transition: background .12s ease, color .12s ease;
        }

        .lp-filter-option:hover {
          background: #F4EFF8;
          color: var(--navy);
        }

        .lp-filter-option.selected {
          background: #F0EBF6;
          color: var(--navy);
          font-weight: 600;
        }

        @keyframes lpFilterDrop {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ========================================
           CAMPAIGN GRID
        ======================================== */

        .lp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
        }

        .lp-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-width: 0;
          transition: transform .18s, box-shadow .18s;
        }

        .lp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 34px -16px rgba(30,20,60,0.22);
        }

        .lp-card-media {
          position: relative;
          height: 150px;
        }

        .lp-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .lp-card-image-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #9a93a4;
          font-size: 11px;
          background: #f1ece7;
        }

        .lp-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .lp-badge-paid {
          background: var(--coral-soft);
          color: var(--coral);
        }

        .lp-badge-booked {
          background: #F0EBF6;
          color: #66518F;
        }

        .lp-campaign-save {
          position: absolute;
          top: 12px;
          left: 12px;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 50%;
          background: rgba(255,255,255,.96);
          color: #77727F;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(30,25,40,.12);
          z-index: 2;
          transition: all .15s ease;
        }

        .lp-campaign-save:hover {
          color: var(--coral);
          transform: translateY(-1px);
        }

        .lp-campaign-save.is-saved {
          color: var(--coral);
          border-color: #F6C9C6;
        }

        /* ========================================
           CAMPAIGN BODY
        ======================================== */

        .lp-card-body {
          padding: 16px 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .lp-card-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 24px;
        }

        .lp-card-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .lp-card-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          display: block;
        }

        .lp-card-brand-name {
          font-size: 12.5px;
          color: var(--ink-soft);
          font-weight: 500;
        }

        .lp-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--ink);
          margin: 0;
          line-height: 1.3;
          min-height: 42px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .lp-card-description {
          font-size: 11.5px;
          line-height: 1.55;
          color: var(--ink-soft);
          margin: -2px 0 1px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
          max-height: 35px;
        }

        .lp-card-category {
          align-self: flex-start;
          height: 22px;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--navy);
          background: var(--navy-soft);
          padding: 3px 10px;
          border-radius: 999px;
        }

        .lp-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 10px;
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 2px 0 1px;
          min-height: 18px;
          align-items: center;
        }

        .lp-card-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .lp-card-comp {
          color: var(--navy);
          font-weight: 700;
        }

        .lp-card-secondary-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 10.5px;
          color: var(--ink-soft);
          margin-bottom: 6px;
          min-height: 18px;
        }

        .lp-card-secondary-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }

        .lp-card-secondary-meta span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ========================================
           CARD ACTIONS
        ======================================== */

        .lp-card-actions {
          margin-top: auto;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 8px;
          padding-top: 4px;
        }

        .lp-card-apply,
        .lp-card-view {
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          white-space: nowrap;
          transition: all .18s ease;
        }

        .lp-card-apply {
          background: #7661A1;
          border: 1px solid #7661A1;
          color: #fff;
          box-shadow: 0 6px 14px -9px rgba(118,97,161,.55);
        }

        .lp-card-apply:hover {
          background: #F47C78;
          border-color: #F47C78;
          color: #fff;
          transform: translateY(-1px);
        }

        .lp-card-view {
          background: #F7F3FA;
          border: 1px solid #D9CFE8;
          color: #7661A1;
        }

        .lp-card-view:hover {
          background: #66518F;
          border-color: #66518F;
          color: #fff;
          transform: translateY(-1px);
        }

        .lp-card-apply-disabled {
          background: #ECE9EF;
          border-color: #ECE9EF;
          color: #8B8593;
          cursor: not-allowed;
          box-shadow: none;
        }

        .lp-card-apply-disabled:hover {
          transform: none;
          background: #ECE9EF;
          border-color: #ECE9EF;
          color: #8B8593;
        }

        /* ========================================
           SHOW MORE
        ======================================== */

        .lp-show-more-wrap {
          display: flex;
          justify-content: center;
          margin-top: 30px;
        }

        .lp-show-more {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 42px;
          padding: 0 18px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: #fff;
          color: var(--navy);
          font-size: 12.5px;
          font-weight: 600;
          box-shadow: 0 6px 18px -14px rgba(50,35,70,.35);
          transition: all .16s ease;
        }

        .lp-show-more:hover {
          border-color: #B8A7D1;
          transform: translateY(-1px);
          box-shadow: 0 10px 20px -15px rgba(50,35,70,.35);
        }

        /* ========================================
           BRAND CTA
        ======================================== */

        .lp-brand-cta {
          width: 100%;
          background: #F7F3FA;
          border-top: 1px solid #EEE7F2;
          border-bottom: 1px solid #EEE7F2;
          overflow: hidden;
        }

        .lp-brand-cta-inner {
          max-width: 1240px;
          min-height: 248px;
          margin: 0 auto;
          padding: 28px 32px;
          display: grid;
          grid-template-columns: 290px minmax(320px, 1fr) 1.05fr;
          gap: 36px;
          align-items: center;
        }

        .lp-brand-visual {
          position: relative;
          height: 205px;
        }

        .lp-brand-photo {
          position: absolute;
          left: 24px;
          top: 5px;
          width: 174px;
          height: 145px;
          padding: 9px 9px 25px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(70, 48, 95, .15);
          transform: rotate(-8deg);
        }

        .lp-brand-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .lp-brand-note {
          position: absolute;
          left: 132px;
          top: 105px;
          z-index: 2;
          background: #fff;
          border: 1px solid #DCCFE9;
          border-radius: 9px;
          padding: 10px 14px;
          font-family: 'League Spartan', sans-serif;
          font-size: 14px;
          line-height: 1.08;
          color: var(--navy);
          box-shadow: 0 9px 18px rgba(70, 48, 95, .12);
          transform: rotate(-4deg);
        }

        .lp-brand-doodle {
          position: absolute;
          color: var(--navy);
          opacity: .75;
        }

        .lp-brand-doodle-heart {
          left: 4px;
          bottom: 25px;
          font-size: 28px;
          transform: rotate(-18deg);
        }

        .lp-brand-doodle-text {
          left: 0;
          top: 12px;
          font-size: 13px;
          font-style: italic;
          transform: rotate(-8deg);
        }

        .lp-brand-doodle-arrow {
          right: 2px;
          top: -2px;
          transform: rotate(-18deg);
        }

        .lp-brand-copy {
          min-width: 0;
          padding-left: 4px;
        }

        .lp-brand-copy h2 {
          margin: 0 0 8px;
          font-size: 32px;
          line-height: 1.05;
          color: var(--navy);
        }

        .lp-brand-copy h2 span {
          color: var(--navy);
        }

        .lp-brand-copy p {
          margin: 0 0 18px;
          max-width: 430px;
          color: var(--ink-soft);
          font-size: 14px;
          line-height: 1.5;
        }

        .lp-brand-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 11px 18px;
          border-radius: 8px;
          background: var(--navy);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 8px 16px -8px rgba(118,97,161,.55);
          transition: transform .18s ease, background .18s ease;
        }

        .lp-brand-btn:hover {
          background: #66518F;
          transform: translateY(-1px);
        }

        .lp-brand-features {
          border-left: 1px solid #E4DAED;
          padding-left: 34px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 34px;
          row-gap: 24px;
        }

        .lp-brand-feature {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: 10px;
          align-items: center;
        }

        .lp-brand-feature-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--navy);
        }

        .lp-brand-feature-title {
          display: block;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 600;
          color: var(--navy);
        }

        .lp-brand-feature-subtitle {
          display: block;
          font-size: 10.5px;
          line-height: 1.25;
          color: var(--ink-soft);
        }

        /* ========================================
           FOOTER
        ======================================== */

        .lp-footer {
          background: var(--page-bg);
          color: var(--ink);
          padding: 52px 0 22px;
          margin-top: 20px;
          border-top: 1px solid #EAE3DD;
        }

        .lp-footer-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 32px;
        }

        .lp-footer-top {
          display: flex;
          justify-content: space-between;
          gap: 40px;
          flex-wrap: wrap;
          padding-bottom: 32px;
          border-bottom: 1px solid #E7E0DA;
        }

        .lp-footer-brand-row {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 10px;
        }

        .lp-footer-brand-row span {
          font-family: 'League Spartan', sans-serif;
          font-weight: 700;
          font-size: 19px;
          color: var(--navy);
        }

        .lp-footer-tag {
          font-size: 13.5px;
          color: var(--ink-soft);
          max-width: 280px;
          line-height: 1.6;
        }

        .lp-footer-cols {
          display: flex;
          gap: 56px;
        }

        .lp-footer-col h4 {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--navy);
          margin: 0 0 14px;
        }

        .lp-footer-col a {
          display: block;
          font-size: 13.5px;
          color: var(--ink-soft);
          margin-bottom: 10px;
        }

        .lp-footer-col a:hover {
          color: var(--coral);
        }

        .lp-footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          font-size: 12.5px;
          color: var(--ink-soft);
          flex-wrap: wrap;
          gap: 10px;
        }

        .lp-footer-social {
          display: flex;
          gap: 12px;
        }

        .lp-footer-social a {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid #DCD4CC;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .lp-footer-social a:hover {
          background: var(--coral);
          border-color: var(--coral);
          color: #fff;
        }

        /* ========================================
           RESPONSIVE
        ======================================== */

        @media (max-width: 1080px) {
          .lp-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .lp-hero-inner {
            grid-template-columns: 1fr;
          }

          .lp-hero-visual {
            display: none;
          }

          .lp-brand-cta-inner {
            grid-template-columns: 240px 1fr;
            min-height: 300px;
            padding: 32px;
          }

          .lp-brand-visual {
            height: 210px;
          }

          .lp-brand-photo {
            width: 160px;
            height: 134px;
          }

          .lp-brand-note {
            left: 120px;
            top: 100px;
          }

          .lp-brand-features {
            grid-column: 1 / -1;
            border-left: none;
            border-top: 1px solid #E4DAED;
            padding: 24px 0 0;
          }
        }

        @media (max-width: 760px) {
          .lp-nav-links {
            display: none;
          }

          .lp-burger {
            display: block;
          }

          .lp-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }

          .lp-h1 {
            font-size: 32px;
          }

          .lp-container,
          .lp-hero-inner,
          .lp-footer-inner {
            padding: 0 18px;
          }

          .lp-brand-cta-inner {
            grid-template-columns: 1fr;
            min-height: 0;
            padding: 34px 18px;
            gap: 26px;
          }

          .lp-brand-visual {
            display: block;
            height: 190px;
            max-width: 260px;
            margin: 0 auto;
            width: 100%;
          }

          .lp-brand-photo {
            left: 24px;
            width: 155px;
            height: 130px;
          }

          .lp-brand-note {
            left: 116px;
            top: 94px;
          }

          .lp-brand-copy {
            padding-left: 0;
          }

          .lp-brand-copy h2 {
            font-size: 28px;
          }

          .lp-brand-copy p {
            font-size: 13px;
          }

          .lp-brand-features {
            grid-column: auto;
            border-top: 1px solid #E4DAED;
            padding: 22px 0 0;
          }

          .lp-footer-cols {
            gap: 32px;
          }
        }

        @media (max-width: 480px) {
          .lp-grid {
            grid-template-columns: 1fr;
          }

          .lp-card-actions {
            grid-template-columns: 1.2fr 0.8fr;
          }

          .lp-card-apply,
          .lp-card-view {
            font-size: 12px;
            padding-left: 8px;
            padding-right: 8px;
          }
        }
      `}</style>

      {/* ========================================
          NAVBAR
      ======================================== */}

      <PublicNavbar />

      {/* ========================================
          HERO
      ======================================== */}

      <section
        className="lp-hero"
        id="home"
      >
        <div className="lp-hero-inner">
          <div>
            <span className="lp-eyebrow">
              Create • Collaborate • Grow
            </span>

            <h1 className="lp-h1">
              Find Your Next
              <br />
              <span className="lp-h1-accent">
                Brand Collaboration
              </span>
            </h1>

            <p className="lp-hero-sub">
              Discover paid campaigns from
              your favourite brands and turn
              your creativity into opportunities.
            </p>

            {/* SEARCH */}
            <div className="lp-search-wrap">
              <form
                className="lp-search-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchOpen(false);
                  scrollToCampaigns();
                }}
              >
                <Search
                  size={17}
                  color="#B7B2C4"
                />

                <input
                  type="text"
                  placeholder="Search campaigns, brands, or keywords…"
                  value={search}
                  onFocus={() =>
                    setSearchOpen(true)
                  }
                  onChange={(e) => {
                    setSearch(
                      e.target.value
                    );
                    setSearchOpen(true);
                  }}
                  onBlur={() =>
                    window.setTimeout(
                      () =>
                        setSearchOpen(
                          false
                        ),
                      150
                    )
                  }
                  aria-label="Search campaigns, brands, or keywords"
                />

                <button
                  type="submit"
                  className="lp-search-btn"
                  aria-label="Search"
                >
                  <Search size={16} />
                </button>
              </form>

              {searchOpen &&
                (search.trim() ||
                  searchSuggestions.length >
                    0) && (
                  <div className="lp-search-suggestions">
                    {searchSuggestions.length >
                    0 ? (
                      searchSuggestions.map(
                        (
                          item,
                          index
                        ) => (
                          <button
                            type="button"
                            className="lp-search-suggestion"
                            key={`${item.type}-${item.label}-${index}`}
                            onMouseDown={(
                              e
                            ) =>
                              e.preventDefault()
                            }
                            onClick={() => {
                              setSearch(
                                item.label
                              );
                              setSearchOpen(
                                false
                              );
                              scrollToCampaigns();
                            }}
                          >
                            <span className="lp-search-suggestion-icon">
                              <Search
                                size={14}
                              />
                            </span>

                            <span className="lp-search-suggestion-copy">
                              <strong>
                                {
                                  item.label
                                }
                              </strong>

                              <small>
                                {
                                  item.type
                                }
                              </small>
                            </span>

                            <ArrowRight
                              size={14}
                            />
                          </button>
                        )
                      )
                    ) : (
                      <div className="lp-search-empty">
                        No matching
                        campaigns or
                        brands
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* HERO IMAGE */}
          <div className="lp-hero-visual">
            <span className="lp-sticky">
              Real brands.
              <br />
              Real opportunities.
            </span>

            <div className="lp-poly lp-poly-main">
              <img
                src="https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=500&auto=format&fit=crop"
                alt="Creator filming content"
              />
            </div>

            <div className="lp-poly lp-poly-a">
              <img
                src="https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=400&auto=format&fit=crop"
                alt="Skincare products"
              />
            </div>

            <div className="lp-poly lp-poly-b">
              <img
                src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=400&auto=format&fit=crop"
                alt="Travel scenery"
              />
            </div>

            <Heart
              className="lp-heart"
              size={20}
              style={{
                top: 60,
                left: 40,
              }}
              fill={CORAL}
            />

            <Heart
              className="lp-heart"
              size={14}
              style={{
                bottom: 130,
                right: 40,
              }}
              fill={CORAL}
            />
          </div>
        </div>
      </section>

      {/* ========================================
          EXPLORE CAMPAIGNS
      ======================================== */}

      <section
        className="lp-section lp-container"
        id="campaigns"
      >
        <div className="lp-section-head">
          <h2 className="lp-h2">
            Explore Campaigns
          </h2>

          {/* NO REDIRECT */}
          <button
            type="button"
            className="lp-view-all lp-view-all-button"
            onClick={scrollToCampaigns}
          >
            View All Campaigns
            <ArrowRight size={14} />
          </button>
        </div>

        {/* FILTERS */}
        <div className="lp-filters lp-filters-section">
          {/* CATEGORY */}
          <FilterDropdown
            label="All Categories"
            value={category}
            options={categories}
            open={
              openFilter ===
              "category"
            }
            onToggle={() =>
              setOpenFilter(
                openFilter ===
                  "category"
                  ? null
                  : "category"
              )
            }
            onChange={(value) => {
              setCategory(value);
              setOpenFilter(null);
            }}
          />

          {/* LOCATION */}
          <FilterDropdown
            label="Location"
            value={location}
            options={locations}
            open={
              openFilter ===
              "location"
            }
            onToggle={() =>
              setOpenFilter(
                openFilter ===
                  "location"
                  ? null
                  : "location"
              )
            }
            onChange={(value) => {
              setLocation(value);
              setOpenFilter(null);
            }}
          />

          {/* PLATFORM */}
          <FilterDropdown
            label="Platform"
            value={platform}
            options={platforms}
            open={
              openFilter ===
              "platform"
            }
            onToggle={() =>
              setOpenFilter(
                openFilter ===
                  "platform"
                  ? null
                  : "platform"
              )
            }
            onChange={(value) => {
              setPlatform(value);
              setOpenFilter(null);
            }}
          />

          {/* PRICE RANGE */}
          <FilterDropdown
            label="Price Range"
            value={priceRange}
            options={
              PRICE_RANGE_FILTERS
            }
            open={
              openFilter === "price"
            }
            onToggle={() =>
              setOpenFilter(
                openFilter ===
                  "price"
                  ? null
                  : "price"
              )
            }
            onChange={(value) => {
              setPriceRange(value);
              setOpenFilter(null);
            }}
          />

          {/* DEADLINE */}
          <FilterDropdown
            label="All Deadlines"
            value={deadlineFilter}
            options={
              DEADLINE_FILTERS
            }
            open={
              openFilter ===
              "deadline"
            }
            onToggle={() =>
              setOpenFilter(
                openFilter ===
                  "deadline"
                  ? null
                  : "deadline"
              )
            }
            onChange={(value) => {
              setDeadlineFilter(
                value
              );
              setOpenFilter(null);
            }}
          />

          {/* CREATOR AUDIENCE */}
          <FilterDropdown
            label="Creator Audience Size"
            value={creatorType}
            options={CREATOR_TYPE_FILTERS.map(
              (item) => item.value
            )}
            open={
              openFilter ===
              "creator"
            }
            onToggle={() =>
              setOpenFilter(
                openFilter ===
                  "creator"
                  ? null
                  : "creator"
              )
            }
            onChange={(value) => {
              setCreatorType(
                value
              );
              setOpenFilter(null);
            }}
          />

          {/* AVAILABILITY */}
          <FilterDropdown
            label="All Campaigns"
            value={availability}
            options={
              AVAILABILITY_FILTERS
            }
            open={
              openFilter ===
              "availability"
            }
            onToggle={() =>
              setOpenFilter(
                openFilter ===
                  "availability"
                  ? null
                  : "availability"
              )
            }
            onChange={(value) => {
              setAvailability(
                value
              );
              setOpenFilter(null);
            }}
          />
        </div>

        {/* ======================================
            CAMPAIGN RESULTS
        ====================================== */}

        {campaignLoading ? (
          <p
            style={{
              color:
                "var(--ink-soft)",
              fontSize: 14.5,
            }}
          >
            Loading campaigns…
          </p>
        ) : campaignError ? (
          <p
            style={{
              color:
                "var(--ink-soft)",
              fontSize: 14.5,
            }}
          >
            {campaignError}
          </p>
        ) : displayCampaigns.length >
          0 ? (
          <>
            <div className="lp-grid">
              {displayCampaigns
                .slice(
                  0,
                  visibleCount
                )
                .map((c) => (
                  <CampaignCard
                    c={c}
                    key={c.id}
                    isCreator={
                      isCreator
                    }
                    isAuthenticated={
                      !!user
                    }
                    isSaved={savedIds.has(
                      c.id
                    )}
                    onToggleSave={
                      handleToggleSave
                    }
                  />
                ))}
            </div>

            {displayCampaigns.length >
              visibleCount && (
              <div className="lp-show-more-wrap">
                <button
                  type="button"
                  className="lp-show-more"
                  onClick={() =>
                    setVisibleCount(
                      (count) =>
                        count + 8
                    )
                  }
                >
                  Show more
                  <ChevronDown
                    size={15}
                  />
                </button>
              </div>
            )}
          </>
        ) : (
          <p
            style={{
              color:
                "var(--ink-soft)",
              fontSize: 14.5,
            }}
          >
            No funded campaigns
            match those filters
            yet — try a different
            category, price range,
            or search term.
          </p>
        )}
      </section>

      {/* ========================================
          JOIN AS A BRAND
      ======================================== */}

      <section
        className="lp-brand-cta"
        id="for-brands"
      >
        <div className="lp-brand-cta-inner">
          <div
            className="lp-brand-visual"
            aria-hidden="true"
          >
            <div className="lp-brand-doodle lp-brand-doodle-text">
              Write with
              <br />
              your own style ♡
            </div>

            <span className="lp-brand-doodle lp-brand-doodle-heart">
              ♡
            </span>

            <span className="lp-brand-doodle lp-brand-doodle-arrow">
              <ArrowRight size={26} />
            </span>

            <div className="lp-brand-photo">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=500&auto=format&fit=crop"
                alt="Brand workspace"
              />
            </div>

            <div className="lp-brand-note">
              Your brand
              <br />
              Our creators
              <br />
              Real results
            </div>
          </div>

          <div className="lp-brand-copy">
            <h2>
              Join as a{" "}
              <span>Brand</span>
            </h2>

            <p>
              Reach authentic creators,
              run impactful campaigns,
              <br />
              and grow your brand's
              presence.
            </p>

            <Link
              to="/register/business"
              className="lp-brand-btn"
            >
              Become a Brand
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="lp-brand-features">
            {BRAND_FEATURES.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <div
                    className="lp-brand-feature"
                    key={
                      item.title
                    }
                  >
                    <span className="lp-brand-feature-icon">
                      <Icon
                        size={23}
                        strokeWidth={
                          1.7
                        }
                      />
                    </span>

                    <span>
                      <span className="lp-brand-feature-title">
                        {
                          item.title
                        }
                      </span>

                      <span className="lp-brand-feature-subtitle">
                        {
                          item.subtitle
                        }
                      </span>
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          FOOTER
      ======================================== */}

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div>
              <div className="lp-footer-brand-row">
                <LogoMark size={22} />
                <span>
                  creatorhub
                </span>
              </div>

              <p className="lp-footer-tag">
                Real campaigns.
                Real people. Real
                opportunities.
              </p>
            </div>

            <div className="lp-footer-cols">
              <div className="lp-footer-col">
                <h4>
                  Platform
                </h4>

                <a href="#home">
                  Home
                </a>

                <a href="#campaigns">
                  Campaigns
                </a>

                <a href="#for-brands">
                  For Brands
                </a>

                <a href="#for-brands">
                  About
                </a>
              </div>

              <div className="lp-footer-col">
                <h4>
                  Account
                </h4>

                <Link to="/login">
                  Login
                </Link>

                <Link to="/register">
                  Register
                </Link>
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>
              © 2026 creatorhub. All
              rights reserved.
            </span>

            <div className="lp-footer-social">
              <a
                href="#"
                aria-label="Instagram"
              >
                IG
              </a>

              <a
                href="#"
                aria-label="TikTok"
              >
                TT
              </a>

              <a
                href="#"
                aria-label="YouTube"
              >
                YT
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
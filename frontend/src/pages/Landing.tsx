// frontend/src/pages/Landing.tsx

// Public landing page — redesigned as a campaign marketplace.
// Anyone (logged out or in) can land here, browse live campaigns,
// and discover creator opportunities.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogoMark } from "../components/Logo";
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
  ArrowRight,
  MapPin,
  Bookmark,
  Check,
} from "lucide-react";

// ============================================
// BRAND COLORS
// ============================================

const NAVY = "#111111";

const NAV_BG = "#FFFFFF";
const HERO_BG = "#FFFFFF";
const PAGE_BG = "#FFFFFF";

// ============================================
// HELPERS
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
// CAMPAIGN CATEGORY TILES
// ============================================

type CategoryTile = {
  label: string;
  category: string;
  image: string;
};

const CAMPAIGN_CATEGORY_TILES: CategoryTile[] = [
  { label: "Food", category: "Food", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80" },
  { label: "Beauty", category: "Beauty", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80" },
  { label: "Fashion", category: "Fashion", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80" },
  { label: "Travel", category: "Travel", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80" },
  { label: "Technology", category: "Technology", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80" },
  { label: "Fitness", category: "Fitness", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80" },
  { label: "Lifestyle", category: "Lifestyle", image: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=900&q=80" },
  { label: "Education", category: "Education", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80" },
  { label: "Finance", category: "Finance", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80" },
  { label: "Gaming", category: "Gaming", image: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80" },
  { label: "Health", category: "Health", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80" },
  { label: "Home & Living", category: "Home & Living", image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80" },
  { label: "Sports", category: "Sports", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80" },
  { label: "Entertainment", category: "Entertainment", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80" },
  { label: "Business", category: "Business", image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80" },
  { label: "Automotive", category: "Automotive", image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80" },
  { label: "Pets", category: "Pets", image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80" },
  { label: "Photography", category: "Photography", image: "https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=900&q=80" },
  { label: "Music", category: "Music", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80" },
  { label: "Parenting", category: "Parenting", image: "https://images.unsplash.com/photo-1491013516836-7db643ee125a?auto=format&fit=crop&w=900&q=80" },
];

// Some tile names differ from the category names businesses pick when they
// create a campaign (Campaignform). This maps a tile to every campaign
// category value that belongs to it.
const CATEGORY_ALIASES: Record<string, string[]> = {
  Technology: ["Technology", "Tech"],
  "Home & Living": ["Home & Living", "Home Decor"],
  Health: ["Health", "Wellness"],
};

function campaignMatchesTile(campaignCategory: string | undefined | null, tileCategory: string) {
  if (!campaignCategory) return false;
  const value = campaignCategory.trim().toLowerCase();
  const accepted = CATEGORY_ALIASES[tileCategory] ?? [tileCategory];
  return accepted.some((name) => name.toLowerCase() === value);
}

const CATEGORY_PREVIEW_COUNT = 4;

// Show 4 category tiles at a time. Pages advance by 3 so they overlap:
// 1–4, 4–7, 7–10, and so on.
const CAT_PAGE_SIZE = 4;
const CAT_PAGE_STEP = 3;

// ============================================
// WHY CREATORHUB ITEMS
// ============================================

const WHY_ITEMS = [
  {
    number: "01",
    title: "Discover Opportunities",
    text: "Explore relevant campaigns and creator opportunities that match your skills, interests, and goals.",
  },
  {
    number: "02",
    title: "Build Meaningful Connections",
    text: "Creators and businesses can connect around real campaign needs, not just through social media.",
  },
  {
    number: "03",
    title: "Manage Collaborations with Ease",
    text: "From applications to approvals and payments, keep your collaborations organized — all in one place.",
  },
];

// ============================================
// PRICING
// ============================================

const PRICING_FEATURES = [
  { title: "Create campaigns", text: "Set your budget, requirements and deliverables." },
  { title: "Find creators", text: "Browse creator profiles and portfolios." },
  { title: "Review applications", text: "Compare creators before making your selection." },
  { title: "Manage collaborations", text: "Keep campaign work and communication organized." },
  { title: "Track progress", text: "From application to completion." },
  { title: "Secure payments", text: "Pay for approved creator work." },
];

// ============================================
// CAMPAIGN HELPERS
// ============================================

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

// ============================================
// CAMPAIGN CARD
// ============================================

function postedAgo(value?: string | null) {
  if (!value) return "Recently posted";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently posted";

  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return "Posted just now";
  if (minutes < 60) return `Posted ${minutes} min${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 7) return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
  if (weeks < 5) return `Posted ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return `Posted ${months} month${months === 1 ? "" : "s"} ago`;
}

function campaignTags(c: PublicCampaign) {
  const tags: string[] = [];

  if (c.category) tags.push(c.category);
  if (c.required_platforms?.length) {
    tags.push(...c.required_platforms.slice(0, 2));
  } else if (c.required_platform) {
    tags.push(c.required_platform);
  }

  return Array.from(new Set(tags)).slice(0, 3);
}

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
  const navigate = useNavigate();
  const booked = isBooked(c);
  const unavailable = isUnavailable(c);
  const tags = campaignTags(c);

  return (
    <div
      className={`lp-card${booked ? " lp-card-booked" : ""}`}
      style={{ cursor: "pointer" }}
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/campaigns/${c.id}?source=landing`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) {
          navigate(`/campaigns/${c.id}?source=landing`);
        }
      }}
    >
      <div className="lp-card-body">
        <div className="lp-card-topline">
          <Link
            to={`/brands/${c.business_id}`}
            className="lp-card-brand"
            onClick={(e) => e.stopPropagation()}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span
              className="lp-card-avatar"
              style={{
                background: c.brand_logo ? "#fff" : "#111111",
              }}
            >
              {c.brand_logo ? (
                <img src={mediaUrl(c.brand_logo)} alt="" />
              ) : (
                initials(c.brand_name || "Brand")
              )}
            </span>

            <span className="lp-card-brand-name">
              {c.brand_name || "Brand"}
            </span>
          </Link>

          {isCreator && !unavailable && (
            <button
              type="button"
              className={`lp-campaign-save ${
                isSaved ? "is-saved" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(c.id);
              }}
              aria-label={
                isSaved ? "Remove from wishlist" : "Save to wishlist"
              }
              title={
                isSaved ? "Remove from wishlist" : "Save to wishlist"
              }
            >
              <Bookmark
                size={17}
                fill={isSaved ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>

        <h3 className="lp-card-title">{c.title}</h3>

        <div className="lp-card-location-row">
          <span>
            <MapPin size={13} />
            {c.brand_location || "Remote / flexible"}
          </span>

          <span>{c.engagement_type || "Short-term"}</span>
        </div>

        <div className="lp-card-budget-row">
          <strong>
            {c.budget_min != null && c.budget_max != null
              ? `NPR ${c.budget_min.toLocaleString()} – ${c.budget_max.toLocaleString()}`
              : c.budget != null
                ? `NPR ${c.budget.toLocaleString()}`
                : "Budget not specified"}
          </strong>

          {c.duration && <span>{c.duration}</span>}
        </div>

        {tags.length > 0 && (
          <div className="lp-card-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}

        <p className="lp-card-description">
          {c.description || "View the brief to see the full campaign details."}
        </p>

        <div className="lp-card-posted">
          <span>{postedAgo(c.created_at)}</span>

          {booked && <span className="lp-card-booked-label">Booked</span>}
        </div>

        <div className="lp-card-actions">
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
          ) : isCreator ? (
            <Link
              to={`/campaigns/${c.id}?apply=true&source=landing`}
              className="lp-card-apply"
              onClick={(e) => e.stopPropagation()}
            >
              Apply Campaign
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </Link>
          ) : !isAuthenticated ? (
            <Link
              to={`/campaigns/${c.id}?apply=true&source=landing`}
              className="lp-card-apply"
              onClick={(e) => e.stopPropagation()}
            >
              Apply Now
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HERO CARDS (floating campaigns)
// ============================================

type HeroCard = {
  brand: string;
  title: string;
  category: string;
  budget: string;
  filter?: string; // category filter used by the Apply link
  pos: "p1" | "p2" | "p3" | "p4" | "p5" | "p6";
  depth: "back" | "front";
  rot: string; // resting rotation
  dy: string; // float distance
  dr: string; // extra rotation at the float peak
  dur: string; // float duration
  delay: string; // negative so cards start out of phase
  enter: string; // entrance delay
  feature?: boolean; // the card the arrow points to
};

const HERO_CARDS: HeroCard[] = [
  { brand: "Lune", title: "Lifestyle Creator", category: "Lifestyle", budget: "NPR 12,000", filter: "Lifestyle", pos: "p1", depth: "back", rot: "-6deg", dy: "-9px", dr: "1deg", dur: "8.2s", delay: "-1s", enter: ".10s" },
  { brand: "Bakery", title: "Food Creator", category: "Food", budget: "NPR 6,500", filter: "Food", pos: "p2", depth: "front", rot: "4deg", dy: "-12px", dr: "-1.2deg", dur: "6.8s", delay: "-3s", enter: ".30s" },
  { brand: "Lune", title: "Beauty Content Creator", category: "Beauty", budget: "NPR 15,000", filter: "Beauty", pos: "p3", depth: "back", rot: "-3deg", dy: "-8px", dr: "1.2deg", dur: "9s", delay: "-5s", enter: ".50s" },
  { brand: "CreatorHub", title: "UGC Creator", category: "UGC", budget: "NPR 8,000", pos: "p4", depth: "front", rot: "5deg", dy: "-11px", dr: "-1deg", dur: "7.4s", delay: "-2s", enter: ".20s" },
  { brand: "Skincare Brand", title: "Beauty Creator", category: "Beauty", budget: "NPR 10,000", filter: "Beauty", pos: "p5", depth: "back", rot: "-4deg", dy: "-8px", dr: "1deg", dur: "8.6s", delay: "-4s", enter: ".40s" },
  { brand: "Fashion Brand", title: "Fashion Creator", category: "Fashion", budget: "NPR 18,000", filter: "Fashion", pos: "p6", depth: "front", rot: "3deg", dy: "-10px", dr: "-1deg", dur: "7.8s", delay: "-1.5s", enter: ".60s", feature: true },
];

function heroApplyHref(c: HeroCard) {
  return c.filter
    ? `/campaigns?source=landing&category=${encodeURIComponent(c.filter)}`
    : "/campaigns?source=landing";
}

// ============================================
// LANDING PAGE
// ============================================

export function Landing() {
  const { user } = useAuth();

  const isCreator = user?.role === "creator";

  const [saved, setSaved] = useState<SavedCampaignEntry[]>([]);

  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [latestPage, setLatestPage] = useState(0);

  // Category pagination.
  const [catPage, setCatPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pointing, setPointing] = useState(false);
  const [howWorksRole, setHowWorksRole] = useState<"creator" | "business">(
    "creator"
  );

  // ============================================
  // SCROLL TO SECTION WHEN ARRIVING FROM ANOTHER PAGE
  // (e.g. clicking "For Brands" in the navbar while on /pricing)
  // ============================================

  useEffect(() => {
    const target =
      sessionStorage.getItem("ch-scroll-target") ||
      window.location.hash.replace("#", "");

    sessionStorage.removeItem("ch-scroll-target");

    if (!target) {
      window.scrollTo(0, 0);
      return;
    }

    const timer = window.setTimeout(() => {
      document
        .getElementById(target)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    return () => window.clearTimeout(timer);
  }, []);

  // ============================================
  // LOAD PUBLIC CAMPAIGNS
  // ============================================

  useEffect(() => {
    let cancelled = false;

    setCampaignLoading(true);
    setCampaignError("");

    getPublicCampaigns({ limit: 100 })
      .then((response: { campaigns: PublicCampaign[] }) => {
        if (!cancelled) {
          setCampaigns(response.campaigns);
        }
      })
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

  // ============================================
  // LOAD SAVED CAMPAIGNS
  // ============================================

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
      .catch((error) =>
        console.error("Could not load wishlist:", error)
      );

    return () => {
      cancelled = true;
    };
  }, [isCreator]);

  const savedIds = useMemo(
    () => new Set(saved.map((item) => item.campaign_id)),
    [saved]
  );

  // ============================================
  // SAVE / UNSAVE
  // ============================================

  const handleToggleSave = async (campaignId: number) => {
    if (!isCreator) return;

    try {
      if (savedIds.has(campaignId)) {
        await unsaveCampaign(campaignId);

        setSaved((items) =>
          items.filter(
            (item) => item.campaign_id !== campaignId
          )
        );
      } else {
        const entry = await saveCampaign(campaignId);

        setSaved((items) => [...items, entry]);
      }
    } catch (error) {
      console.error("Could not update wishlist:", error);
    }
  };

  // ============================================
  // CATEGORY TILE CLICK
  // ============================================

  const handleCategoryTileClick = (categoryValue: string) => {
    setSelectedCategory((current) =>
      current === categoryValue ? null : categoryValue
    );
  };

  const selectedTile = useMemo(
    () => CAMPAIGN_CATEGORY_TILES.find((tile) => tile.category === selectedCategory) ?? null,
    [selectedCategory]
  );

  // Every live campaign in the chosen category; the page shows the first 4.
  const categoryMatches = useMemo(
    () =>
      selectedTile
        ? campaigns.filter((c) => campaignMatchesTile(c.category, selectedTile.category))
        : [],
    [campaigns, selectedTile]
  );

  const categoryPreview = categoryMatches.slice(0, CATEGORY_PREVIEW_COUNT);

  // "Show more" opens the campaigns page already filtered. It uses the real
  // category value stored on the campaigns (e.g. "Tech" for the Technology tile).
  const categoryShowMoreHref = selectedTile
    ? `/campaigns?source=landing&category=${encodeURIComponent(
        categoryMatches[0]?.category?.trim() || selectedTile.category
      )}`
    : "/campaigns?source=landing";

  // Bring the results into view when a category is picked.
  useEffect(() => {
    if (!selectedCategory) return;
    document
      .getElementById("category-results")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedCategory]);

  // ============================================
  // CATEGORY PAGINATION
  // ============================================

  const categoryPageCount = Math.max(
    1,
    Math.ceil((CAMPAIGN_CATEGORY_TILES.length - CAT_PAGE_SIZE) / CAT_PAGE_STEP) + 1
  );

  const visibleCategoryTiles = useMemo(() => {
    const start = catPage * CAT_PAGE_STEP;
    return CAMPAIGN_CATEGORY_TILES.slice(start, start + CAT_PAGE_SIZE);
  }, [catPage]);

  const handleCategoryPageChange = (page: number) => {
    setCatPage(page);
  };

  // ============================================
  // LATEST CAMPAIGNS
  // ============================================

  // Keep exactly the 7 newest live campaigns.
  // Publishing is independent of campaign funding, so a published campaign
  // must appear here even when it has no funding_status/funding record.
  const latestCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((c) => {
        return ["published", "in_progress"].includes(
          String(c.status).toLowerCase()
        );
      })
      .sort((a, b) => {
        const dateA =
          new Date(a.created_at || a.updated_at || 0).getTime() || 0;
        const dateB =
          new Date(b.created_at || b.updated_at || 0).getTime() || 0;

        return dateB - dateA;
      })
      .slice(0, 7);
  }, [campaigns]);

  // First view: 1 2 3 4
  // Second view: 4 5 6 7
  const visibleLatestCampaigns = useMemo(() => {
    if (latestPage === 0) {
      return latestCampaigns.slice(0, 4);
    }

    return latestCampaigns.slice(3, 7);
  }, [latestCampaigns, latestPage]);

  useEffect(() => {
    setLatestPage(0);
  }, [campaigns]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="lp">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&family=Caveat:wght@600&display=swap');

        .lp {
          --content-width: 1304px;
          --content-padding: 32px;
          --section-space: 64px;
          --content-left-space: 32px;
          --heading-size: 34px;
          --navy: ${NAVY};
          --navy-soft: #F3F3F3;
          --coral: #111111;
          --coral-soft: #F5F5F5;
          --nav-bg: ${NAV_BG};
          --hero-bg: ${HERO_BG};
          --page-bg: ${PAGE_BG};
          --ink: #212121;
          --ink-soft: #6B6B6B;
          --line: #E5E5E5;

          font-family: 'Poppins', sans-serif;
          font-weight: 400;
          color: var(--ink);
          background: var(--page-bg);
          overflow-x: hidden;
        }

        .lp h1,
        .lp h2,
        .lp h3 {
          font-family: 'League Spartan', sans-serif;
          font-weight: 400;
        }

        .lp a {
          text-decoration: none;
        }

        .lp button {
          font-family: inherit;
          cursor: pointer;
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

        .lp-card-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          display: block;
        }

        .lp-badge-booked {
          background: #F3F3F3;
          color: #000000;
        }

        .lp-card-apply-disabled {
          background: #ECE9EF;
          border-color: #ECE9EF;
          color: #777777;
          cursor: not-allowed;
          box-shadow: none;
        }

        .lp-card-apply-disabled:hover {
          transform: none;
          background: #ECE9EF;
          border-color: #ECE9EF;
          color: #777777;
        }

        .lp-campaign-save {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 50%;
          background: rgba(255,255,255,.96);
          color: #666666;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(30,25,40,.12);
          z-index: 2;
        }

        .lp-campaign-save:hover {
          color: var(--coral);
          transform: translateY(-1px);
        }

        .lp-campaign-save.is-saved {
          color: var(--coral);
          border-color: #F6C9C6;
        }

        /* ============================================
           HERO
        ============================================ */

        .hx {
          --hx-ink: #111111;
          --hx-muted: #6d6d68;
          --hx-line: #e3e1db;
          --hx-paper: #ffffff;
          --cw: 252px;
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 24px 88px;
          background: var(--hx-paper);
          color: var(--hx-ink);
          overflow: hidden;
        }

        .hx-copy {
          position: relative;
          z-index: 3;
          max-width: 720px;
          text-align: center;
        }

        .hx .hx-h1 {
          margin: 0 0 24px;
          font-size: clamp(46px, 6.4vw, 92px);
          font-weight: 500;
          line-height: .96;
          letter-spacing: -0.04em;
          color: var(--hx-ink);
        }

        .hx-sub {
          margin: 0 auto 34px;
          max-width: 460px;
          font-size: 16.5px;
          line-height: 1.65;
          color: var(--hx-muted);
        }

        .hx-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .hx-btn {
          min-height: 48px;
          padding: 0 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid var(--hx-ink);
          transition: transform .18s ease, background .18s ease;
        }

        .hx-btn:hover { transform: translateY(-1px); }
        .hx-btn-primary { background: var(--hx-ink); color: #fff; }
        .hx-btn-primary:hover { background: #000; color: #fff; }
        .hx-btn-secondary { background: transparent; color: var(--hx-ink); }
        .hx-btn-secondary:hover { background: #fff; color: var(--hx-ink); }

        /* floating field */
        .hx-field {
          position: absolute;
          inset: 0;
          width: 100%;
          max-width: 1480px;
          margin: 0 auto;
          pointer-events: none;
        }

        .hx-slot {
          position: absolute;
          width: var(--cw);
          pointer-events: auto;
          animation: hx-in .8s cubic-bezier(.2,.7,.2,1) both;
          animation-delay: var(--in, 0s);
        }

        .hx-back { z-index: 1; }
        .hx-front { z-index: 5; }
        .hx-feature { z-index: 6; }

        .hx-p1 { left: 5%;  top: 17%; }
        .hx-p2 { left: 11%; top: 47%; }
        .hx-p3 { left: 2%;  top: 61%; }
        .hx-p4 { right: 6%; top: 15%; }
        .hx-p5 { right: 2%; top: 36%; }
        .hx-p6 { right: 11%; top: 51%; }

        .hx-card {
          position: relative;
          box-sizing: border-box;
          padding: 14px 14px 13px;
          background: #fff;
          border: 1px solid var(--hx-line);
          border-radius: 14px;
          box-shadow: 0 1px 0 rgba(17,17,17,.03), 0 16px 30px -20px rgba(17,17,17,.3);
          transform: rotate(var(--rot)) scale(var(--s, 1));
          animation: hx-float var(--dur) ease-in-out var(--delay) infinite;
          transition: box-shadow .25s ease, border-color .25s ease;
        }

        .hx-back .hx-card {
          --s: .94;
          box-shadow: 0 1px 0 rgba(17,17,17,.02), 0 10px 22px -18px rgba(17,17,17,.22);
        }

        .hx-card:hover {
          animation-play-state: paused;
          border-color: #cfccc4;
          box-shadow: 0 22px 36px -20px rgba(17,17,17,.38);
        }

        .hx-feature .hx-card {
          border-color: var(--hx-ink);
          box-shadow: 0 24px 42px -22px rgba(17,17,17,.42);
        }

        .hx-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }

        .hx-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          font-size: 11.5px;
          font-weight: 500;
          color: var(--hx-muted);
        }

        .hx-brand span:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hx-av {
          flex: 0 0 22px;
          width: 22px;
          height: 22px;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: var(--hx-ink);
          color: #fff;
          font-size: 9px;
          font-weight: 500;
        }

        .hx-tag {
          flex-shrink: 0;
          padding: 3px 8px;
          border-radius: 999px;
          background: #f1f0ec;
          color: #55554f;
          font-size: 10px;
          line-height: 1.2;
        }

        .hx .hx-title {
          margin: 0 0 13px;
          font-size: 18px;
          font-weight: 500;
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: var(--hx-ink);
        }

        .hx-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .hx-budget { font-size: 12px; font-weight: 500; color: var(--hx-ink); }

        .hx-apply {
          min-height: 30px;
          padding: 0 15px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          background: var(--hx-ink);
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          transition: transform .18s ease, background .18s ease;
        }

        .hx-apply:hover,
        .hx-apply:focus-visible {
          background: #000;
          color: #fff;
          transform: translateY(-1px) scale(1.06);
        }

        .hx-apply:focus-visible { outline: 2px solid var(--hx-ink); outline-offset: 3px; }
        .hx-feature .hx-apply { animation: hx-ring 3.2s ease-out 4s infinite; }

        /* hand-drawn pointer */
        .hx-pointer {
          position: absolute;
          right: 25px;
          top: calc(100% - 22px);
          width: 190px;
          height: 130px;
          pointer-events: none;
          z-index: 2;
        }

        .hx-pointer svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
          transition: transform .3s cubic-bezier(.2,.8,.2,1);
        }

        .hx-pointer.is-pointing svg { transform: translate(4px, -8px); }
        .hx-pointer.is-pointing .hx-arrow-g { animation-play-state: paused; }
        .hx-arrow-g { animation: hx-nudge 2.8s ease-in-out 3.8s infinite alternate; }

        .hx-draw {
          fill: none;
          stroke: var(--hx-ink);
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          opacity: 0;
          animation: hx-draw 1.2s cubic-bezier(.5,0,.2,1) 2s forwards;
        }

        .hx-draw-head { animation-duration: .4s; animation-delay: 3.15s; }

        .hx-note {
          position: absolute;
          left: -40px;
          top: 98px;
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          color: var(--hx-ink);
          transform: rotate(-5deg);
          clip-path: inset(-6px 100% -6px 0);
          animation: hx-write 1s cubic-bezier(.4,0,.2,1) 1.2s forwards;
        }

        @keyframes hx-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }

        @keyframes hx-float {
          0%, 100% { transform: translate3d(0,0,0) rotate(var(--rot)) scale(var(--s, 1)); }
          50%      { transform: translate3d(0,var(--dy),0) rotate(calc(var(--rot) + var(--dr))) scale(var(--s, 1)); }
        }

        @keyframes hx-draw {
          from { opacity: 1; stroke-dashoffset: 1; }
          to   { opacity: 1; stroke-dashoffset: 0; }
        }

        @keyframes hx-write {
          to { clip-path: inset(-6px -6px -6px -6px); }
        }

        @keyframes hx-nudge {
          from { transform: translate(0, 0); }
          to   { transform: translate(3px, -5px); }
        }

        @keyframes hx-ring {
          0%   { box-shadow: 0 0 0 0 rgba(17,17,17,.28); }
          60%, 100% { box-shadow: 0 0 0 10px rgba(17,17,17,0); }
        }

        @media (max-width: 1200px) {
          .hx { --cw: 222px; }
          .hx-p3, .hx-p5 { display: none; }
          .hx-p1 { left: 3%; }
          .hx-p2 { left: 4%; top: 50%; }
          .hx-p4 { right: 3%; }
          .hx-p6 { right: 4%; }
        }

        @media (max-width: 900px) {
          .hx {
            --cw: 200px;
            display: block;
            min-height: 0;
            padding: 104px 20px 56px;
          }

          .hx-field {
            position: relative;
            inset: auto;
            height: 540px;
            max-width: 560px;
            margin-top: 40px;
          }

          .hx-p1 { left: 0; top: 0; }
          .hx-p4 { right: 0; top: 36px; }
          .hx-p2 { left: 4%; top: 130px; }
          .hx-p6 { right: 2%; top: 250px; }
          .hx-pointer { transform: scale(.85); transform-origin: 100% 0; }
        }

        @media (max-width: 480px) {
          .hx { --cw: 176px; }
          .hx .hx-h1 { font-size: 42px; }
          .hx-sub { font-size: 15px; }
          .hx .hx-title { font-size: 16px; }
          .hx-tag { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hx-slot, .hx-card, .hx-arrow-g, .hx-feature .hx-apply { animation: none; }
          .hx-draw { animation: none; opacity: 1; stroke-dashoffset: 0; }
          .hx-note { animation: none; clip-path: none; }
        }

        /* ============================================
           SHARED CONTENT ALIGNMENT
        ============================================ */
        .lp-container,
        .lp-cat-section,
        .lp-how-inner,
        .lp-footer-inner {
          width: 100%;
          max-width: var(--content-width);
          margin-left: auto;
          margin-right: auto;
          padding-left: var(--content-left-space);
          padding-right: var(--content-padding);
          box-sizing: border-box;
        }

        /* ============================================
           SHARED SECTION HEADINGS
        ============================================ */
        .lp-h2,
        .lp-cat-title,
        .lp-how-title,
        .lp-why-heading,
        .lp-price-card-title,
        .lp-brand-copy h2 {
          font-family: 'League Spartan', sans-serif;
          font-size: var(--heading-size);
          line-height: 1.1;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: #111111;
          margin: 0;
        }

        /* ============================================
           CAMPAIGN CATEGORIES
        ============================================ */

        .lp-cat-section {
          padding-top: var(--section-space);
          padding-bottom: var(--section-space);
        }

        .lp-cat-title {
          margin: 0 0 32px;
        }

        .lp-cat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
          max-width: 100%;
        }

        .lp-cat-card {
          position: relative;
          display: flex;
          align-items: flex-end;
          width: 100%;
          min-width: 0;
          height: 220px;
          padding: 0;
          overflow: hidden;
          text-align: left;
          background: #f3f3f3;
          color: #111111;
          border: 0;
          border-radius: 16px;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          box-shadow: none;
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .lp-cat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px -18px rgba(17,17,17,.18);
        }

        .lp-cat-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform .35s ease;
        }

        .lp-cat-card:hover .lp-cat-image {
          transform: scale(1.04);
        }

        .lp-cat-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0) 32%, rgba(0,0,0,.62) 100%);
        }

        .lp-cat-card-content {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 16px;
          box-sizing: border-box;
        }

        .lp-cat-label {
          font-size: 14px;
          font-weight: 400;
          line-height: 1.3;
          color: #ffffff;
          text-shadow: 0 1px 8px rgba(0,0,0,.22);
        }

        .lp-cat-card.is-selected {
          outline: 2px solid #111111;
          outline-offset: 3px;
        }

        .lp-cat-results {
          margin-top: 34px;
          padding-top: 28px;
          border-top: 1px solid #ececec;
        }

        .lp-cat-results .lp-section-head {
          margin-bottom: 22px;
        }

        .lp-cat-results-title {
          margin: 0;
          font-size: 22px;
          font-weight: 500;
          color: #111111;
        }

        .lp-cat-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 22px;
        }

        .lp-cat-page-btn {
          width: 40px;
          height: 4px;
          min-width: 40px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: #DCDCDC !important;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          transition: background .18s ease, transform .18s ease, opacity .18s ease;
        }

        .lp-cat-page-btn:hover {
          transform: scaleX(1.04);
          background: #DCDCDC !important;
        }

        .lp-cat-page-btn.is-active,
        .lp-cat-page-btn.is-active:hover {
          background: #111111 !important;
        }

        .lp-cat-page-btn:focus-visible {
          outline: 2px solid #111111;
          outline-offset: 3px;
        }

        /* ============================================
           CAMPAIGN SECTION
        ============================================ */

        .lp-section {
          padding: 64px 0;
        }

        .lp-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .lp-view-all {
          font-size: 14px;
          font-weight: 400;
          color: var(--coral);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          border: none;
          background: none;
        }

        .lp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
        }

        /* ============================================
           LATEST CAMPAIGNS
        ============================================ */

        .lp-latest-section {
          padding: var(--section-space) 0;
          background: #FFFFFF;
        }

        .lp-latest-view-all {
          color: #111111;
          transition: transform .16s ease, opacity .16s ease;
        }

        .lp-latest-view-all:hover {
          color: #111111;
          transform: translateX(3px);
          opacity: .7;
        }

        .lp-latest-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          align-items: stretch;
        }

        .lp-latest-navigation {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 24px;
        }

        .lp-latest-nav-btn {
          width: 40px;
          height: 4px;
          min-width: 40px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: #e8e8e8;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          transition: background .18s ease, transform .18s ease, opacity .18s ease;
        }

        .lp-latest-nav-btn:hover {
          transform: scaleX(1.04);
        }

        .lp-latest-nav-btn:focus-visible {
          outline: 2px solid #111111;
          outline-offset: 3px;
        }

        /* ============================================
           CAMPAIGN CARD
        ============================================ */

        .lp-card {
          background: #fff;
          border: 1px solid #e4e4e4;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 400px;
          min-width: 0;
          box-sizing: border-box;
          transition: transform .18s, box-shadow .18s, border-color .18s;
        }

        .lp-card:hover {
          transform: translateY(-3px);
          border-color: #d5d5d5;
          box-shadow: 0 16px 30px -18px rgba(0,0,0,.24);
        }

        .lp-card-body {
          padding: 15px 15px 14px;
          display: flex;
          flex-direction: column;
          gap: 0;
          flex: 1;
          min-width: 0;
          box-sizing: border-box;
        }

        .lp-card-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          height: 32px;
          min-height: 32px;
          margin-bottom: 15px;
        }

        .lp-card-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .lp-card-avatar {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          color: #fff;
          font-size: 10px;
          font-weight: 500;
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
          border-radius: 8px;
          display: block;
        }

        .lp-card-brand-name {
          font-size: 11.5px;
          color: #555;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .lp-campaign-save {
          position: static;
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          border: 1px solid #e1e1e1;
          border-radius: 50%;
          background: #fff;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .lp-campaign-save:hover,
        .lp-campaign-save.is-saved {
          color: #111;
          border-color: #bdbdbd;
        }

        .lp-card-title {
          font-size: 16px;
          font-weight: 500;
          color: #111;
          margin: 0 0 11px;
          line-height: 1.28;
          letter-spacing: -.02em;
          min-height: 41px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .lp-card-location-row,
        .lp-card-budget-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px 12px;
          color: #686868;
          font-size: 10.5px;
          line-height: 1.45;
        }

        .lp-card-location-row {
          margin-bottom: 11px;
          min-height: 16px;
        }

        .lp-card-location-row span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .lp-card-location-row span + span::before {
          content: "•";
          margin-right: 5px;
          color: #aaa;
        }

        .lp-card-budget-row {
          justify-content: space-between;
          min-height: 45px;
          box-sizing: border-box;
          padding: 11px 0;
          border-top: 1px solid #eeeeee;
          border-bottom: 1px solid #eeeeee;
        }

        .lp-card-budget-row strong {
          color: #111;
          font-size: 13px;
          font-weight: 500;
        }

        .lp-card-budget-row span {
          color: #777;
          white-space: nowrap;
        }

        .lp-card-tags {
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 6px;
          min-height: 28px;
          margin: 12px 0 9px;
        }

        .lp-card-tags span {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          padding: 3px 8px;
          border-radius: 999px;
          background: #f5f5f5;
          color: #555;
          font-size: 9.5px;
          line-height: 1;
        }

        .lp-card-description {
          font-size: 10.5px;
          line-height: 1.6;
          color: #666;
          margin: 3px 0 13px;
          min-height: 50px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .lp-card-posted {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: auto;
          margin-bottom: 12px;
          color: #888;
          font-size: 9.5px;
        }

        .lp-card-booked-label {
          color: #555;
          font-weight: 500;
        }

        .lp-card-apply-disabled {
          background: #ececec;
          border-color: #ececec;
          color: #777;
          cursor: not-allowed;
          box-shadow: none;
        }

        .lp-card-apply-disabled:hover {
          transform: none;
          background: #ececec;
          border-color: #ececec;
          color: #777;
        }

        .lp-card-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 7px;
          min-height: 36px;
        }

        .lp-card-apply,
        .lp-card-view {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 9px;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 500;
          white-space: nowrap;
          transition: all .18s ease;
        }

        .lp-card-apply {
          background: #111;
          border: 1px solid #111;
          color: #fff;
        }

        .lp-card-apply:hover {
          background: #000;
          border-color: #000;
          color: #fff;
        }

        .lp-card-view {
          background: #fff;
          border: 1px solid #dedede;
          color: #111;
        }

        .lp-card-view:hover {
          background: #f5f5f5;
          border-color: #cfcfcf;
          color: #111;
        }

        /* ============================================
           HOW IT WORKS
        ============================================ */

        .lp-how-section {
          width: 100%;
          background: #ffffff;
          padding: var(--section-space) 0;
        }

        .lp-how-inner {
          box-sizing: border-box;
        }

        .lp-how-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 32px;
        }

        .lp-how-toggle {
          display: inline-flex;
          align-items: center;
          width: 350px;
          height: 40px;
          padding: 0;
          border: 1px solid #BDBDBD;
          border-radius: 999px;
          background: #FFFFFF;
          overflow: hidden;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        .lp-how-toggle-btn {
          position: relative;
          flex: 1 1 50%;
          width: 50%;
          height: 40px;
          padding: 0 18px;
          border: 0;
          background: #FFFFFF;
          color: #333333;
          font-size: 13px;
          font-weight: 400;
          line-height: 1;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color .18s ease, box-shadow .18s ease;
        }

        .lp-how-toggle-btn.is-active {
          background: #FFFFFF;
          color: #111111;
          box-shadow: inset 0 0 0 2px #111111;
          border-radius: 999px;
          z-index: 2;
        }

        .lp-how-toggle-btn:not(.is-active) {
          background: #FFFFFF;
          box-shadow: none;
          color: #333333;
        }

        .lp-how-toggle-btn:hover {
          background: #FFFFFF !important;
          color: #333333 !important;
          box-shadow: none !important;
          transform: none !important;
        }

        .lp-how-toggle-btn.is-active:hover {
          background: #FFFFFF !important;
          color: #111111 !important;
          box-shadow: inset 0 0 0 2px #111111 !important;
          transform: none !important;
        }

        .lp-how-toggle-btn:focus-visible {
          outline: 2px solid #111111;
          outline-offset: -4px;
        }

        .lp-how-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 32px;
        }

        .lp-how-card {
          min-width: 0;
        }

        .lp-how-media {
          width: 100%;
          height: 260px;
          border-radius: 16px;
          overflow: hidden;
          background: #F2F2F2;
          border: 1px solid #E8E8E8;
        }

        .lp-how-media img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .lp-how-card-title {
          margin: 20px 8px 0;
          font-family: 'League Spartan', sans-serif;
          font-size: 24px;
          line-height: 1.12;
          font-weight: 400;
          color: #111111;
        }

        .lp-how-card-text {
          margin: 8px 8px 0;
          max-width: 380px;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--ink-soft);
          opacity: 0;
          visibility: hidden;
          max-height: 0;
          overflow: hidden;
          transform: translateY(-4px);
          transition: opacity .18s ease, transform .18s ease, max-height .18s ease, visibility .18s ease;
        }

        .lp-how-card:hover .lp-how-card-text,
        .lp-how-card:focus-within .lp-how-card-text {
          opacity: 1;
          visibility: visible;
          max-height: 120px;
          transform: translateY(0);
        }

        /* ============================================
           WHY CREATORHUB
        ============================================ */

        .lp-why-section {
          width: 100%;
          background: #ffffff;
          padding: var(--section-space) 0;
        }

        .lp-why-inner {
          width: 100%;
        }

        .lp-why-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
        }

        .lp-why-heading {
          margin: 0;
          font-family: 'League Spartan', sans-serif;
          font-size: var(--heading-size);
          line-height: 1.1;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: #111111;
        }

        .lp-why-view-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #111111;
          font-size: 14px;
          font-weight: 400;
          white-space: nowrap;
          transition: transform .16s ease, opacity .16s ease;
        }

        .lp-why-view-all:hover {
          background: transparent;
          color: #111111 !important;
          transform: translateX(3px);
          opacity: .7;
        }

        .lp-why-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          width: 100%;
          border-top: 1px solid #E5E5E5;
          border-bottom: 1px solid #E5E5E5;
        }

        .lp-why-item {
          min-width: 0;
          padding: 30px 34px 32px 0;
        }

        .lp-why-item + .lp-why-item {
          padding-left: 34px;
          border-left: 1px solid #E5E5E5;
        }

        .lp-why-number {
          display: block;
          margin-bottom: 22px;
          font-size: 24px;
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: #999999;
        }

        .lp-why-item-content {
          min-width: 0;
        }

        .lp-why-item-title {
          margin: 0 0 10px;
          font-family: 'League Spartan', sans-serif;
          font-size: 24px;
          line-height: 1.12;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: #111111;
        }

        .lp-why-item-text {
          margin: 0;
          max-width: 360px;
          font-size: 13px;
          line-height: 1.65;
          color: var(--ink-soft);
        }

        /* ============================================
           PRICING
        ============================================ */

        .lp-price-section {
          width: 100%;
          background: #ffffff;
          padding: var(--section-space) 0;
        }

        .lp-price-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
        }

        .lp-price-card-title {
          margin: 0;
          font-family: 'League Spartan', sans-serif;
          font-size: var(--heading-size);
          line-height: 1.1;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: #111111;
        }

        .lp-price-view-all {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #111111;
          font-size: 14px;
          font-weight: 400;
          white-space: nowrap;
          transition: transform .16s ease, opacity .16s ease;
        }

        .lp-price-view-all:hover {
          color: #111111 !important;
          background: transparent;
          transform: translateX(3px);
          opacity: .7;
        }

        .lp-price-content {
          display: grid;
          grid-template-columns: minmax(220px, .75fr) minmax(0, 1.15fr) minmax(260px, .8fr);
          gap: 0;
          width: 100%;
          border-top: 1px solid #E5E5E5;
          border-bottom: 1px solid #E5E5E5;
        }

        .lp-price-fee {
          padding: 30px 34px 32px 0;
        }

        .lp-price-big {
          font-family: 'League Spartan', sans-serif;
          font-size: 68px;
          line-height: .9;
          font-weight: 300;
          letter-spacing: -0.045em;
          color: #111111;
        }

        .lp-price-big-label {
          margin-top: 8px;
          font-family: 'League Spartan', sans-serif;
          font-size: 22px;
          line-height: 1.1;
          font-weight: 300;
          color: #111111;
        }

        .lp-price-note {
          margin: 18px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-soft);
        }

        .lp-price-benefits {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-content: center;
          gap: 24px 30px;
          padding: 30px 34px;
          border-left: 1px solid #E5E5E5;
          border-right: 1px solid #E5E5E5;
        }

        .lp-price-benefit {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          min-width: 0;
        }

        .lp-price-benefit svg {
          flex-shrink: 0;
          margin-top: 2px;
          color: #111111;
        }

        .lp-price-benefit strong {
          display: block;
          font-size: 13px;
          line-height: 1.4;
          font-weight: 500;
          color: #111111;
        }

        .lp-price-benefit span {
          display: block;
          margin-top: 4px;
          font-size: 11.5px;
          line-height: 1.5;
          color: #777777;
        }

        .lp-price-example {
          align-self: center;
          padding: 26px 0 26px 34px;
        }

        .lp-price-eyebrow {
          margin: 0 0 13px;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #777777;
        }

        .lp-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 8px 0;
          font-size: 13px;
          color: #777777;
        }

        .lp-price-row strong {
          color: #111111;
          font-weight: 500;
        }

        .lp-price-total {
          margin-top: 8px;
          padding-top: 14px;
          border-top: 1px solid #E2E2E4;
          color: #111111;
        }

        @media (max-width: 900px) {
          .lp-price-content {
            grid-template-columns: 1fr 1fr;
          }

          .lp-price-example {
            grid-column: 1 / -1;
            border-top: 1px solid #E5E5E5;
            padding: 24px 0;
          }
        }

        @media (max-width: 760px) {
          .lp-price-big {
            font-size: 64px;
          }
        }

        /* ============================================
           BRAND CTA
        ============================================ */

        .lp-brand-cta {
          width: calc(100% - 2 * var(--content-padding));
          max-width: calc(var(--content-width) - 2 * var(--content-padding));
          margin: var(--section-space) auto;
          background:
            linear-gradient(
              110deg,
              #f3f3f3 0%,
              #fafafa 42%,
              #ffffff 72%,
              #f2f2f2 100%
            );
          border: 1px solid #e7e7e7;
          border-radius: 16px;
          overflow: hidden;
          box-sizing: border-box;
        }

        .lp-brand-cta-inner {
          min-height: 206px;
          padding: 30px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          text-align: center;
          box-sizing: border-box;
        }

        .lp-brand-copy {
          min-width: 0;
          width: 100%;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .lp-brand-copy h2 {
          margin: 0 0 10px;
        }

        .lp-brand-copy p {
          margin: 0 0 20px;
          max-width: 680px;
          color: #6b6b6b;
          font-size: 14px;
          line-height: 1.6;
        }

        .lp-brand-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 42px;
          padding: 0 20px;
          border: 1px solid #111111;
          border-radius: 8px;
          background: #111111;
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
          transition: transform .18s ease, background .18s ease;
        }

        .lp-brand-btn:hover {
          background: #000000;
          border-color: #000000;
          color: #ffffff !important;
          transform: translateY(-1px);
        }

        /* ============================================
           FOOTER
        ============================================ */

        .lp-footer {
          background: var(--page-bg);
          color: var(--ink);
          padding: var(--section-space) 0 22px;
          margin-top: 0;
          border-top: 0;
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
          font-weight: 400;
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
          font-weight: 400;
          letter-spacing: 0.3px;
        }

        .lp-footer-social a:hover {
          background: var(--coral);
          border-color: var(--coral);
        }

        /* All section content spans the same width. */
        .lp-cat-title,
        .lp-section-head,
        .lp-latest-grid,
        .lp-how-head,
        .lp-how-grid {
          width: 100%;
          box-sizing: border-box;
        }

        /* ============================================
           SECTION DIVIDERS
        ============================================ */
        .lp-section-divider {
          width: 100%;
          height: 1px;
          margin: 0;
          padding: 0;
          border: 0;
          border-top: 1px solid #D6D6D6;
          box-sizing: border-box;
        }

        /* ============================================
           RESPONSIVE
        ============================================ */

        @media (max-width: 1080px) {
          .lp-cat-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .lp-cat-card {
            height: 200px;
          }

          .lp-how-grid {
            gap: 20px;
          }

          .lp-how-media {
            height: 220px;
          }

          .lp-how-card-title {
            font-size: 21px;
          }

          .lp-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .lp-price-head {
            margin-bottom: 24px;
          }

          .lp-price-content {
            grid-template-columns: 1fr;
          }

          .lp-price-fee {
            padding: 26px 0;
          }

          .lp-price-big {
            font-size: 58px;
          }

          .lp-price-big-label {
            font-size: 20px;
          }

          .lp-price-benefits {
            grid-template-columns: 1fr;
            gap: 18px;
            padding: 24px 0;
            border-left: 0;
            border-right: 0;
            border-top: 1px solid #E5E5E5;
            border-bottom: 1px solid #E5E5E5;
          }

          .lp-price-example {
            grid-column: auto;
            padding: 24px 0;
            border-top: 0;
          }

          .lp-why-head {
            margin-bottom: 24px;
          }

          .lp-why-grid {
            grid-template-columns: 1fr;
          }

          .lp-why-item,
          .lp-why-item + .lp-why-item,
          .lp-why-item:nth-child(3) {
            padding: 24px 0;
            border-left: 0;
          }

          .lp-why-item + .lp-why-item {
            border-top: 1px solid #E5E5E5;
          }

          .lp-why-item:nth-child(3) {
            grid-column: auto;
          }

          .lp-why-number {
            font-size: 22px;
          }

          .lp-why-item-title {
            font-size: 21px;
          }

          .lp-why-item-text {
            max-width: none;
          }

          .lp-why-left {
            padding-right: 36px;
          }

          .lp-why-right {
            padding-left: 36px;
          }
        }

        @media (max-width: 760px) {
          .lp {
            --content-padding: 18px;
            --content-left-space: 18px;
            --heading-size: 28px;
          }

          .lp-how-toggle {
            width: 300px;
            max-width: 100%;
          }

          .lp-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }

          .lp-latest-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .lp-cat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .lp-cat-card {
            height: 190px;
          }

          .lp-how-section {
            padding: 46px 0 52px;
          }

          .lp-how-head {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 28px;
          }

          .lp-how-toggle {
            width: 100%;
          }

          .lp-how-toggle-btn {
            flex: 1;
            min-width: 0;
          }

          .lp-how-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .lp-how-media {
            height: 230px;
          }

          .lp-how-card-text {
            max-width: none;
          }

          .lp-why-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .lp-why-item {
            padding: 24px 24px 26px 0;
          }

          .lp-why-item + .lp-why-item {
            padding-left: 24px;
          }

          .lp-why-item:nth-child(3) {
            grid-column: 1 / -1;
            border-left: 0;
            border-top: 1px solid #E5E5E5;
            padding-left: 0;
          }

          .lp-brand-cta-inner {
            min-height: 0;
            padding: 34px 18px;
            gap: 26px;
          }

          .lp-brand-copy p {
            font-size: 13px;
          }

          .lp-footer-cols {
            gap: 32px;
          }
        }

        @media (max-width: 480px) {
          .lp {
            --heading-size: 26px;
          }

          .lp-grid {
            grid-template-columns: 1fr;
          }

          .lp-latest-grid {
            grid-template-columns: 1fr;
          }

          .lp-card {
            min-height: 0;
          }

          .lp-how-toggle-btn {
            height: 38px;
            padding: 0 12px;
            font-size: 12px;
          }

          .lp-how-media {
            height: 205px;
            border-radius: 14px;
          }

          .lp-how-card-title {
            margin-left: 2px;
            margin-right: 2px;
            font-size: 20px;
          }

          .lp-how-card-text {
            margin-left: 2px;
            margin-right: 2px;
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

        @media (max-width: 768px) {
          .lp { --section-space: 48px; }

          .lp-brand-cta {
            margin: var(--section-space) auto;
            border-radius: 14px;
          }

          .lp-brand-cta-inner {
            min-height: 210px;
            padding: 30px 20px;
          }

          .lp-brand-copy p {
            max-width: 520px;
            font-size: 13px;
            line-height: 1.55;
            margin-bottom: 18px;
          }
        }
      `}</style>

      <PublicNavbar />

      {/* ============================================
          HERO
      ============================================ */}

      <section className="hx" id="home">
        <div className="hx-field" role="group" aria-label="Featured campaigns">
          {HERO_CARDS.map((c) => (
            <div
              key={`${c.brand}-${c.title}`}
              className={`hx-slot hx-${c.pos} ${c.depth === "back" ? "hx-back" : "hx-front"}${
                c.feature ? " hx-feature" : ""
              }`}
              style={{ "--in": c.enter } as CSSProperties}
            >
              <article
                className="hx-card"
                style={
                  {
                    "--rot": c.rot,
                    "--dy": c.dy,
                    "--dr": c.dr,
                    "--dur": c.dur,
                    "--delay": c.delay,
                  } as CSSProperties
                }
              >
                <div className="hx-top">
                  <div className="hx-brand">
                    <span className="hx-av">{initials(c.brand)}</span>
                    <span>{c.brand}</span>
                  </div>
                  <span className="hx-tag">{c.category}</span>
                </div>

                <h3 className="hx-title">{c.title}</h3>

                <div className="hx-foot">
                  <span className="hx-budget">{c.budget}</span>
                  <Link
                    to={heroApplyHref(c)}
                    className="hx-apply"
                    aria-label={`Apply to ${c.brand} ${c.title} campaigns`}
                    {...(c.feature
                      ? {
                          onMouseEnter: () => setPointing(true),
                          onMouseLeave: () => setPointing(false),
                          onFocus: () => setPointing(true),
                          onBlur: () => setPointing(false),
                        }
                      : {})}
                  >
                    Apply
                  </Link>
                </div>

                {c.feature && (
                  <div
                    className={`hx-pointer${pointing ? " is-pointing" : ""}`}
                    aria-hidden="true"
                  >
                    <span className="hx-note">Found one? Apply.</span>
                    <svg viewBox="0 0 190 130">
                      <g className="hx-arrow-g">
                        <path
                          className="hx-draw"
                          pathLength={1}
                          d="M 92 114 C 112 128, 150 120, 156 80 C 160 58, 166 40, 170 22"
                        />
                        <path
                          className="hx-draw hx-draw-head"
                          pathLength={1}
                          d="M 156 39 C 162 33, 167 27, 170 20 C 172 27, 174 36, 173 44"
                        />
                      </g>
                    </svg>
                  </div>
                )}
              </article>
            </div>
          ))}
        </div>

        <div className="hx-copy">
          <h1 className="hx-h1">
            Where Brands
            <br />
            Meet Creators
          </h1>

          <p className="hx-sub">
            Discover paid creator campaigns from businesses and turn your content
            skills into real collaboration opportunities.
          </p>

          <div className="hx-actions">
            <Link to="/campaigns?source=landing" className="hx-btn hx-btn-primary">
              Explore Campaigns
            </Link>

            <Link to="/register/business" className="hx-btn hx-btn-secondary">
              Post a Campaign
            </Link>
          </div>
        </div>
      </section>

      <div className="lp-section-divider" aria-hidden="true" />

      {/* ============================================
          LATEST CAMPAIGNS
      ============================================ */}
      <section className="lp-latest-section" id="latest-campaigns">
        <div className="lp-container">
          <div className="lp-section-head">
            <h2 className="lp-h2">Latest Campaigns</h2>

            <Link to="/campaigns?source=landing" className="lp-view-all lp-latest-view-all">
              Show more
              <ArrowRight size={14} />
            </Link>
          </div>

          {campaignLoading ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
              Loading campaigns…
            </p>
          ) : campaignError ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
              {campaignError}
            </p>
          ) : latestCampaigns.length > 0 ? (
            <>
              <div className="lp-grid lp-latest-grid">
                {visibleLatestCampaigns.map((c) => (
                  <CampaignCard
                    c={c}
                    key={c.id}
                    isCreator={isCreator}
                    isAuthenticated={!!user}
                    isSaved={savedIds.has(c.id)}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>

              {latestCampaigns.length > 4 && (
                <div className="lp-latest-navigation" aria-label="Latest campaigns pages">
                  <button
                    type="button"
                    className="lp-latest-nav-btn"
                    style={{
                      backgroundColor: latestPage === 0 ? "#111111" : "#e8e8e8",
                    }}
                    onClick={() => setLatestPage(0)}
                    aria-label="Show campaigns 1 through 4"
                    aria-pressed={latestPage === 0}
                    title="Show campaigns 1–4"
                  />

                  <button
                    type="button"
                    className="lp-latest-nav-btn"
                    style={{
                      backgroundColor: latestPage === 1 ? "#111111" : "#e8e8e8",
                    }}
                    onClick={() => setLatestPage(1)}
                    aria-label="Show campaigns 4 through 7"
                    aria-pressed={latestPage === 1}
                    title="Show campaigns 4–7"
                  />
                </div>
              )}
            </>
          ) : (
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
              No campaigns available right now.
            </p>
          )}
        </div>
      </section>

      <div className="lp-section-divider" aria-hidden="true" />

      {/* ============================================
          CAMPAIGN CATEGORIES
      ============================================ */}

      <section className="lp-cat-section lp-container">
        <h2 className="lp-cat-title">
          Find campaigns that match your creativity
        </h2>

        <div className="lp-cat-grid">
          {visibleCategoryTiles.map((tile) => {
            return (
              <button
                type="button"
                className={`lp-cat-card${
                  selectedCategory === tile.category ? " is-selected" : ""
                }`}
                aria-pressed={selectedCategory === tile.category}
                key={tile.category}
                onClick={() =>
                  handleCategoryTileClick(tile.category)
                }
              >
                <img
                  className="lp-cat-image"
                  src={tile.image}
                  alt=""
                  loading="lazy"
                />
                <span className="lp-cat-image-overlay" aria-hidden="true" />

                <span className="lp-cat-card-content">
                  <span className="lp-cat-label">{tile.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {categoryPageCount > 1 && (
          <div className="lp-cat-pagination" aria-label="Campaign categories pagination">
            {Array.from({ length: categoryPageCount }, (_, page) => (
              <button
                key={page}
                type="button"
                className={`lp-cat-page-btn${
                  catPage === page ? " is-active" : ""
                }`}
                onClick={() => handleCategoryPageChange(page)}
                aria-label={`Show categories ${page * CAT_PAGE_STEP + 1}–${Math.min(
                  page * CAT_PAGE_STEP + CAT_PAGE_SIZE,
                  CAMPAIGN_CATEGORY_TILES.length
                )}`}
                aria-current={catPage === page ? "page" : undefined}
              />
            ))}
          </div>
        )}

        {selectedTile && (
          <div className="lp-cat-results" id="category-results">
            <div className="lp-section-head">
              <h3 className="lp-cat-results-title">
                {selectedTile.label} campaigns
              </h3>

              {categoryMatches.length > 0 && (
                <Link to={categoryShowMoreHref} className="lp-view-all lp-latest-view-all">
                  Show more
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {campaignLoading ? (
              <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
                Loading campaigns…
              </p>
            ) : categoryPreview.length > 0 ? (
              <div className="lp-grid lp-latest-grid">
                {categoryPreview.map((c) => (
                  <CampaignCard
                    c={c}
                    key={c.id}
                    isCreator={isCreator}
                    isAuthenticated={!!user}
                    isSaved={savedIds.has(c.id)}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
                No {selectedTile.label} campaigns are live right now.
              </p>
            )}
          </div>
        )}
      </section>

      <div className="lp-section-divider" aria-hidden="true" />

      {/* ============================================
          HOW IT WORKS
      ============================================ */}

      <section className="lp-how-section" id="how-it-works">
        <div className="lp-how-inner">
          <div className="lp-how-head">
            <h2 className="lp-how-title">How it works</h2>

            <div className="lp-how-toggle" role="tablist" aria-label="How it works for creators or businesses">
              <button
                type="button"
                role="tab"
                aria-selected={howWorksRole === "creator"}
                className={`lp-how-toggle-btn ${howWorksRole === "creator" ? "is-active" : ""}`}
                onClick={() => setHowWorksRole("creator")}
              >
                For Creators
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={howWorksRole === "business"}
                className={`lp-how-toggle-btn ${howWorksRole === "business" ? "is-active" : ""}`}
                onClick={() => setHowWorksRole("business")}
              >
                For Businesses
              </button>
            </div>
          </div>

          {howWorksRole === "creator" ? (
            <div className="lp-how-grid" role="tabpanel" aria-label="How it works for creators">
              <article className="lp-how-card">
                <div className="lp-how-media">
                  <img
                    src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1000&auto=format&fit=crop"
                    alt="Creators building their professional profile"
                  />
                </div>
                <h3 className="lp-how-card-title">Build your profile</h3>
                <p className="lp-how-card-text">
                  Create a professional profile with your portfolio, skills, experience and social presence.
                </p>
              </article>

              <article className="lp-how-card">
                <div className="lp-how-media">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1000&auto=format&fit=crop"
                    alt="Creator discovering campaign opportunities"
                  />
                </div>
                <h3 className="lp-how-card-title">Find your next opportunity</h3>
                <p className="lp-how-card-text">
                  Explore paid campaigns and apply to opportunities that fit your content and interests.
                </p>
              </article>

              <article className="lp-how-card">
                <div className="lp-how-media">
                  <img
                    src="https://images.unsplash.com/photo-1523726491678-bf852e717f6a?q=80&w=1000&auto=format&fit=crop"
                    alt="Creator collaborating with a brand"
                  />
                </div>
                <h3 className="lp-how-card-title">Collaborate &amp; grow</h3>
                <p className="lp-how-card-text">
                  Get selected by brands, complete your deliverables and build your collaboration history.
                </p>
              </article>
            </div>
          ) : (
            <div className="lp-how-grid" role="tabpanel" aria-label="How it works for businesses">
              <article className="lp-how-card">
                <div className="lp-how-media">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1000&auto=format&fit=crop"
                    alt="Business team planning a campaign"
                  />
                </div>
                <h3 className="lp-how-card-title">Post a campaign</h3>
                <p className="lp-how-card-text">
                  Tell creators what you need, including campaign requirements, deliverables, budget and deadline.
                </p>
              </article>

              <article className="lp-how-card">
                <div className="lp-how-media">
                  <img
                    src="https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1000&auto=format&fit=crop"
                    alt="Business reviewing creator applications"
                  />
                </div>
                <h3 className="lp-how-card-title">Review applications</h3>
                <p className="lp-how-card-text">
                  Receive applications from creators and explore their profiles, portfolios, skills and experience.
                </p>
              </article>

              <article className="lp-how-card">
                <div className="lp-how-media">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1000&auto=format&fit=crop"
                    alt="Business and creator collaborating"
                  />
                </div>
                <h3 className="lp-how-card-title">Select &amp; collaborate</h3>
                <p className="lp-how-card-text">
                  Choose the right creator, start the collaboration and manage deliverables until completion.
                </p>
              </article>
            </div>
          )}
        </div>
      </section>

      <div className="lp-section-divider" aria-hidden="true" />

      {/* ============================================
          WHY CREATORHUB
      ============================================ */}

      <section className="lp-why-section" id="why-creatorhub">
        <div className="lp-container lp-why-inner">
          <div className="lp-why-head">
            <h2 className="lp-why-heading">Why CreatorHub?</h2>

            <Link to="/about" className="lp-why-view-all">
              Show More
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="lp-why-grid">
            {WHY_ITEMS.map((item) => (
              <article className="lp-why-item" key={item.number}>
                <span className="lp-why-number">{item.number}</span>

                <div className="lp-why-item-content">
                  <h3 className="lp-why-item-title">{item.title}</h3>
                  <p className="lp-why-item-text">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="lp-section-divider" aria-hidden="true" />

      {/* ============================================
          PRICING
      ============================================ */}

      <section className="lp-price-section" id="pricing">
        <div className="lp-container">
          <div className="lp-price-head">
            <h2 className="lp-price-card-title">Pricing</h2>

            <Link to="/pricing" className="lp-price-view-all">
              View pricing
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="lp-price-content">
            <div className="lp-price-fee">
              <div className="lp-price-big">10%</div>
              <div className="lp-price-big-label">platform fee</div>
              <p className="lp-price-note">
                Pay only the 10% service fee when you hire a creator.
              </p>
            </div>

            <div className="lp-price-benefits">
              {PRICING_FEATURES.slice(0, 4).map((f) => (
                <div className="lp-price-benefit" key={f.title}>
                  <Check size={15} strokeWidth={1.8} />
                  <div>
                    <strong>{f.title}</strong>
                    <span>{f.text}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lp-price-example">
              <p className="lp-price-eyebrow">EXAMPLE</p>

              <div className="lp-price-row">
                <span>Creator payment</span>
                <strong>NPR 10,000</strong>
              </div>

              <div className="lp-price-row">
                <span>Platform fee (10%)</span>
                <strong>NPR 1,000</strong>
              </div>

              <div className="lp-price-row lp-price-total">
                <span>Paid to CreatorHub</span>
                <strong>NPR 1,000</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-section-divider" aria-hidden="true" />

      {/* ============================================
          JOIN AS A BRAND
      ============================================ */}

      <section className="lp-brand-cta" id="for-brands">
        <div className="lp-brand-cta-inner">
          <div className="lp-brand-copy">
            <h2>Find creators who can bring your campaign to life</h2>

            <p>
              Post your campaign, discover talented creators, and collaborate
              to create content that connects with your audience.
            </p>

            <Link
              to="/register/business"
              className="lp-brand-btn"
            >
              Join as a Brand
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <div className="lp-section-divider" aria-hidden="true" />

      {/* ============================================
          FOOTER
      ============================================ */}

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div>
              <div className="lp-footer-brand-row">
                <LogoMark size={22} />

                <span>Creator Marketplace</span>
              </div>

              <p className="lp-footer-tag">
                Real campaigns. Real people. Real opportunities.
              </p>
            </div>

            <div className="lp-footer-cols">
              <div className="lp-footer-col">
                <h4>Platform</h4>

                <a href="#home">Home</a>
                <Link to="/campaigns?source=landing">Campaigns</Link>
                <Link to="/pricing">Pricing</Link>
                <a href="#for-brands">For Brands</a>
                <Link to="/about">About</Link>
              </div>

              <div className="lp-footer-col">
                <h4>Account</h4>

                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </div>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>
              © 2026 Creator Marketplace. All rights reserved.
            </span>

            <div className="lp-footer-social">
              <a href="#" aria-label="Instagram">
                IG
              </a>

              <a href="#" aria-label="TikTok">
                TT
              </a>

              <a href="#" aria-label="YouTube">
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
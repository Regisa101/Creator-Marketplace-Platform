// frontend/src/pages/Landing.tsx

// Public landing page — redesigned as a campaign marketplace.
// Anyone (logged out or in) can land here, browse live campaigns,
// and discover creator opportunities.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Calendar,
  ArrowRight,
  MapPin,
  Heart,
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

// Show 4 category tiles at a time. Pages advance by 3 so they overlap:
// 1–4, 4–7, 7–10, and so on.
const CAT_PAGE_SIZE = 4;
const CAT_PAGE_STEP = 3;

// ============================================
// CAMPAIGN HELPERS
// ============================================

function campaignImage(c: PublicCampaign) {
  return mediaUrl(c.hero_image || c.extra_photos?.[0]);
}

function campaignPlatform(c: PublicCampaign) {
  return c.required_platforms?.[0] || c.required_platform || "";
}

function creatorAudienceLabel(c: PublicCampaign) {
  const ranges = c.creator_requirements?.follower_ranges || [];
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

  return (
    <div
      className={`lp-card${booked ? " lp-card-booked" : ""}`}
    >
      <div className="lp-card-media">
        {image ? (
          <img src={image} alt={c.title} loading="lazy" />
        ) : (
          <div className="lp-card-image-placeholder">
            Campaign image
          </div>
        )}

        <span
          className={`lp-badge ${
            booked ? "lp-badge-booked" : "lp-badge-paid"
          }`}
        >
          {booked ? "Booked" : "Paid"}
        </span>

        {isCreator && !unavailable && (
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
              isSaved ? "Remove from wishlist" : "Save to wishlist"
            }
            title={
              isSaved ? "Remove from wishlist" : "Save to wishlist"
            }
          >
            <Heart
              size={17}
              fill={isSaved ? "currentColor" : "none"}
            />
          </button>
        )}
      </div>

      <div className="lp-card-body">
        <div className="lp-card-brand">
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
        </div>

        <h3 className="lp-card-title">{c.title}</h3>

        <p className="lp-card-description">
          {c.tagline ||
            c.description ||
            "View the brief to see the full campaign details."}
        </p>

        <span className="lp-card-category">{c.category}</span>

        <div className="lp-card-meta">
          <span className="lp-card-comp">
            NRs {(c.budget || 0).toLocaleString()}
          </span>

          <span>
            {c.brand_location ? (
              <>
                <MapPin size={13} />
                {c.brand_location}
              </>
            ) : null}
          </span>
        </div>

        <div className="lp-card-secondary-meta">
          <span>
            <Calendar size={12} />
            Apply by{" "}
            {c.application_deadline || c.deadline
              ? new Date(
                  c.application_deadline || (c.deadline as string)
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>

          <span>
            {platform ||
              creatorAudienceLabel(c) ||
              `${c.creators_needed || 1} creator${
                (c.creators_needed || 1) === 1 ? "" : "s"
              }`}
          </span>
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
            >
              Apply Campaign
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </Link>
          ) : !isAuthenticated ? (
            <Link
              to={`/campaigns/${c.id}?apply=true&source=landing`}
              className="lp-card-apply"
            >
              Apply Now
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </Link>
          ) : (
            <Link
              to={`/campaigns/${c.id}?source=landing`}
              className="lp-card-apply"
            >
              View Campaign
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </Link>
          )}

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
// ============================================
// HERO SLIDES
// ============================================

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=90",
    photoOne: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=500&q=85",
    photoTwo: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=500&q=85",
    alt: "Travel creator creating destination campaign content",
    creator: "Travelwithsara",
    followers: "248K followers",
    creatorImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
    brand: "Mountain Gear Co.",
    category: "Travel Campaign",
    campaignTitle: "Explore Pokhara",
    budget: "$300",
    location: "Pokhara, Nepal",
    deadline: "Apply by May 20",
  },
  {
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=90",
    photoOne: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=500&q=85",
    photoTwo: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=500&q=85",
    alt: "Beauty creator creating product campaign content",
    creator: "MayaCreates",
    followers: "126K followers",
    creatorImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
    brand: "Glow Studio",
    category: "Beauty Campaign",
    campaignTitle: "Everyday Glow",
    budget: "$200",
    location: "Kathmandu, Nepal",
    deadline: "Apply by May 28",
  },
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=90",
    photoOne: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=500&q=85",
    photoTwo: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=500&q=85",
    alt: "Fashion creator making branded campaign content",
    creator: "StylebyAri",
    followers: "89K followers",
    creatorImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85",
    brand: "Urban Thread",
    category: "Fashion Campaign",
    campaignTitle: "Weekend Edit",
    budget: "$250",
    location: "Lalitpur, Nepal",
    deadline: "Apply by June 3",
  },
  {
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=90",
    photoOne: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=500&q=85",
    photoTwo: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=500&q=85",
    alt: "Travel creator creating destination campaign content",
    creator: "WanderwithNia",
    followers: "172K followers",
    creatorImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=85",
    brand: "Explore Nepal",
    category: "Travel Campaign",
    campaignTitle: "Discover Nepal",
    budget: "$300",
    location: "Kathmandu, Nepal",
    deadline: "Apply by June 10",
  },
];

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
  const [heroSlide, setHeroSlide] = useState(0);
  const [howWorksRole, setHowWorksRole] = useState<"creator" | "business">(
    "creator"
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5500);

    return () => window.clearInterval(timer);
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

  const handleCategoryTileClick = (_categoryValue: string) => {
    document
      .getElementById("latest-campaigns")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
  // CATEGORIES
  // ============================================

    // ============================================
  // LATEST CAMPAIGNS
  // ============================================

  // Keep exactly the 7 newest live + funded campaigns.
  const latestCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((c) => {
        return (
          ["published", "in_progress"].includes(String(c.status)) &&
          String(c.funding_status || "").toLowerCase() === "funded"
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
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');

        .lp {
          --content-width: 1304px;
          --content-padding: 32px;
          --section-space: 64px;
          --content-left-space: 56px;
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
          color: var(--ink);
          background: var(--page-bg);
          overflow-x: hidden;
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

        /* ============================================
           NAV
        ============================================ */








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
           FULL PAGE HERO
        ============================================ */

        .lp-hero {
          background: var(--hero-bg);
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 60px 0;
          box-sizing: border-box;
        }

        .lp-hero-inner > div:first-child {
          width: 100%;
          max-width: 760px;
          margin-top: 64px;
        }


        .lp-h1 {
          font-size: 64px;
          line-height: 1.02;
          font-weight: 700;
          color: #111111;
          margin: 0 0 22px;
          letter-spacing: -0.035em;
          max-width: 760px;
        }

        .lp-hero-sub {
          font-size: 17px;
          color: var(--ink-soft);
          max-width: 590px;
          margin: 0 0 30px;
          line-height: 1.65;
        }

        .lp-hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          flex-wrap: wrap;
        }

        .lp-hero-btn {
          min-height: 46px;
          padding: 0 20px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all .18s ease;
        }

        .lp-hero-btn-primary {
          background: #111111;
          border: 1px solid #111111;
          color: #ffffff;
        }

        .lp-hero-btn-primary:hover {
          background: #000000;
          border-color: #000000;
          color: #ffffff !important;
          transform: translateY(-1px);
        }

        .lp-hero-btn-secondary {
          background: #ffffff;
          border: 1px solid #111111;
          color: #111111;
        }

        .lp-hero-btn-secondary:hover {
          background: #f5f5f5;
          transform: translateY(-1px);
        }

        /* ============================================
           HERO VISUAL / SLIDER
        ============================================ */

        .lp-hero-inner {
          display: grid;
          grid-template-columns: minmax(0, .92fr) minmax(500px, 1.08fr);
          align-items: center;
          gap: 62px;
        }

        .lp-hero-copy {
          min-width: 0;
          max-width: 650px;
        }

        .lp-hero-visual {
          position: relative;
          width: 100%;
          max-width: 650px;
          height: 520px;
          margin-left: auto;
          margin-top: 42px;
          padding-bottom: 34px;
          box-sizing: border-box;
        }

        .lp-hero-art {
          position: absolute;
          top: 42px;
          right: 0;
          bottom: 34px;
          left: 0;
        }

        .lp-hero-art::before {
          content: "";
          position: absolute;
          width: 220px;
          height: 220px;
          right: -42px;
          top: 44px;
          border-radius: 50%;
          background: #f1f1f1;
          z-index: 0;
        }

        .lp-hero-image-frame {
          position: absolute;
          inset: 8px 44px 0 8px;
          overflow: hidden;
          border-radius: 30px;
          background: #f1f1f1;
          transform: rotate(-2deg);
          box-shadow: 0 22px 48px -32px rgba(17,17,17,.35);
          z-index: 1;
        }

        .lp-hero-slide-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: opacity .4s ease, transform .55s ease;
        }

        .lp-hero-slide-image.is-hidden {
          opacity: 0;
          transform: scale(1.035);
          pointer-events: none;
        }

        .lp-hero-slide-image.is-visible {
          opacity: 1;
          transform: scale(1);
        }

        .lp-hero-image-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0) 48%, rgba(0,0,0,.22) 100%);
          pointer-events: none;
        }

        .lp-hero-creator-chip {
          position: absolute;
          top: 0;
          left: 28px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px 8px 8px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 12px 30px -20px rgba(17,17,17,.35);
        }

        .lp-hero-creator-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }

        .lp-hero-creator-name {
          font-size: 12px;
          font-weight: 600;
          color: #111111;
          line-height: 1.25;
        }

        .lp-hero-creator-followers {
          margin-top: 2px;
          font-size: 10px;
          color: #777777;
        }

        .lp-hero-polaroid {
          position: absolute;
          z-index: 4;
          width: 128px;
          padding: 7px 7px 16px;
          background: #ffffff;
          box-shadow: 0 18px 34px -24px rgba(17,17,17,.42);
        }

        .lp-hero-polaroid img {
          width: 100%;
          height: 126px;
          object-fit: cover;
          display: block;
        }

        .lp-hero-polaroid-one {
          right: -2px;
          top: 122px;
          transform: rotate(-9deg);
        }

        .lp-hero-polaroid-two {
          right: 12px;
          bottom: 32px;
          transform: rotate(8deg);
        }

        .lp-hero-campaign-card {
          position: absolute;
          left: 18px;
          bottom: 18px;
          width: min(410px, calc(100% - 90px));
          padding: 20px 22px;
          border-radius: 20px;
          background: rgba(255,255,255,.98);
          box-shadow: 0 20px 44px -22px rgba(17,17,17,.32);
          z-index: 6;
          box-sizing: border-box;
        }

        .lp-hero-campaign-brand {
          font-size: 11.5px;
          font-weight: 600;
          color: #666666;
          margin-bottom: 5px;
        }

        .lp-hero-campaign-title {
          font-family: 'League Spartan', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #111111;
          margin: 0 0 12px;
        }

        .lp-hero-campaign-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 11px;
          color: #666666;
        }

        .lp-hero-campaign-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }

        .lp-hero-campaign-meta-item svg {
          flex-shrink: 0;
          color: #555555;
        }

        .lp-hero-campaign-budget {
          font-weight: 700;
          color: #111111;
        }

        .lp-hero-dots {
          position: absolute;
          left: 50%;
          bottom: -2px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 8;
        }

        .lp-hero-dot {
          width: 40px;
          height: 4px;
          min-width: 40px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: #dedede !important;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          transition: background .18s ease, transform .18s ease;
        }

        .lp-hero-dot:hover {
          background: #dedede !important;
          transform: scaleX(1.04);
        }

        .lp-hero-dot.is-active,
        .lp-hero-dot.is-active:hover {
          background: #111111 !important;
        }

        .lp-hero-dot:focus-visible {
          outline: 2px solid #111111;
          outline-offset: 4px;
        }

        /* ============================================
           SHARED CONTENT ALIGNMENT
           Every major section uses the exact same
           max-width + horizontal padding so headings,
           cards, grids and footer content line up.
        ============================================ */
        .lp-container,
        .lp-hero-inner,
        .lp-cat-section,
        .lp-how-inner,
        .lp-brand-cta-inner,
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
           CAMPAIGN CATEGORIES
        ============================================ */

        .lp-cat-section {
          padding-top: var(--section-space);
          padding-bottom: var(--section-space);
        }

        .lp-cat-title {
          font-size: 32px;
          font-weight: 500;
          color: var(--navy);
          margin: 0 0 28px;
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
          font-weight: 600;
          line-height: 1.3;
          color: #ffffff;
          text-shadow: 0 1px 8px rgba(0,0,0,.22);
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
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .lp-h2 {
          font-size: 28px;
          font-weight: 500;
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

        .lp-latest-section .lp-section-head {
          margin-bottom: 22px;
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
          grid-template-columns: repeat(4, 1fr);
          gap: 22px;
        }

        /* Latest campaigns pagination */
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
        }

        .lp-card-actions {
          margin-top: auto;
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.85fr);
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
          background: #111111;
          border: 1px solid #111111;
          color: #fff;
        }

        .lp-card-apply:hover {
          background: #111111;
          border-color: #111111;
          color: #fff;
          transform: translateY(-1px);
        }

        .lp-card-view {
          background: #F5F5F5;
          border: 1px solid #DEDEDE;
          color: #111111;
        }

        .lp-card-view:hover {
          background: #000000;
          border-color: #000000;
          color: #fff;
          transform: translateY(-1px);
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
          margin-bottom: 42px;
        }

        .lp-how-title {
          margin: 0;
          font-family: 'League Spartan', sans-serif;
          font-size: 34px;
          line-height: 1;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: #111111;
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
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color .18s ease, box-shadow .18s ease;
        }

        /* Selected side: white background with black 2px outline only. */
        .lp-how-toggle-btn.is-active {
          background: #FFFFFF;
          color: #111111;
          box-shadow: inset 0 0 0 2px #111111;
          border-radius: 999px;
          z-index: 2;
        }

        /* Unselected side remains completely white with no divider/fill. */
        .lp-how-toggle-btn:not(.is-active) {
          background: #FFFFFF;
          box-shadow: none;
          color: #333333;
        }

        /* Hover must never turn either side black. */
        .lp-how-toggle-btn:hover {
          background: #FFFFFF !important;
          color: #333333 !important;
          box-shadow: none !important;
          transform: none !important;
        }

        /* Keep the selected outline visible while hovering. */
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
          font-weight: 500;
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
           BRAND CTA
        ============================================ */

        .lp-brand-cta {
          width: calc(100% - 40px);
          max-width: 1400px;
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
          font-family: 'League Spartan', sans-serif;
          font-size: 34px;
          line-height: 1.08;
          font-weight: 600;
          letter-spacing: -0.025em;
          color: #111111;
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
          font-weight: 600;
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
          border-top: 1px solid #EAE3DD;
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
        }

        /* ============================================
           FINAL ALIGNMENT SAFETY
        ============================================ */
        .lp-hero-inner,
        .lp-cat-section,
        .lp-latest-section > .lp-container,
        .lp-how-inner,
        .lp-brand-cta-inner,
        .lp-footer-inner {
          width: 100%;
          max-width: var(--content-width);
          margin-left: auto;
          margin-right: auto;
          padding-left: var(--content-left-space);
          padding-right: var(--content-padding);
          box-sizing: border-box;
        }

        /* All section content starts on the same x-coordinate. */
        .lp-cat-title,
        .lp-section-head,
        .lp-latest-grid,
        .lp-how-head,
        .lp-how-grid {
          width: 100%;
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

          .lp-hero {
            min-height: 100vh;
            padding: 56px 0;
          }

          .lp-hero-inner {
            grid-template-columns: minmax(0, .9fr) minmax(390px, 1.1fr);
            gap: 42px;
          }

          .lp-hero-copy {
            max-width: 600px;
          }

          .lp-hero-visual {
            height: 430px;
          }

          .lp-h1 {
            font-size: 54px;
          }

        }

        @media (max-width: 760px) {
          .lp-how-toggle {
            width: 300px;
            max-width: 100%;
          }


          .lp-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }

          .lp-latest-grid {
            grid-template-columns: repeat(2, 1fr);
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

          .lp-cat-title {
            font-size: 26px;
          }

          .lp-hero {
            min-height: 100vh;
            padding: 48px 0;
          }

          .lp-hero-inner {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 46px;
            padding: 0 18px;
          }

          .lp-hero-inner > div:first-child {
            margin-top: 32px;
          }

          .lp-hero-copy {
            max-width: none;
          }

          .lp-hero-visual {
            height: 430px;
            max-width: none;
            margin: 0;
          }

          .lp-hero-image-frame {
            inset: 8px 38px 0 4px;
          }

          .lp-hero-campaign-card {
            left: 12px;
            bottom: 14px;
            width: min(350px, calc(100% - 70px));
            padding: 17px 18px;
          }

          .lp-hero-polaroid {
            width: 96px;
            padding: 5px 5px 11px;
          }

          .lp-hero-polaroid img {
            height: 94px;
          }

          .lp-hero-polaroid-one {
            right: 0;
            top: 92px;
          }

          .lp-hero-polaroid-two {
            right: 12px;
            bottom: 24px;
          }

          .lp-hero-creator-chip {
            left: 16px;
          }

          .lp-hero-dots {
            bottom: -2px;
          }

          .lp-h1 {
            font-size: 42px;
            line-height: 1.05;
          }

          .lp-hero-sub {
            font-size: 15px;
          }

          .lp-hero-actions {
            gap: 10px;
          }

          .lp-hero-btn {
            min-height: 42px;
            padding: 0 15px;
          }

          .lp-container,
          .lp-hero-inner,
          .lp-cat-section,
          .lp-how-inner,
          .lp-brand-cta-inner,
          .lp-footer-inner {
            --content-padding: 18px;
            --content-left-space: 18px;
            padding-left: 18px;
            padding-right: 18px;
          }

          .lp-brand-cta-inner {
            min-height: 0;
            padding: 34px 18px;
            gap: 26px;
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

          .lp-footer-cols {
            gap: 32px;
          }
        }

        @media (max-width: 480px) {
          .lp-hero-visual {
            height: 330px;
          }

          .lp-hero-campaign-card {
            padding: 15px 16px;
          }

          .lp-hero-campaign-title {
            font-size: 19px;
          }

          .lp-hero-dot {
            width: 30px;
            min-width: 30px;
          }

          .lp-grid {
            grid-template-columns: 1fr;
          }

          .lp-latest-grid {
            grid-template-columns: 1fr;
          }

          .lp-h1 {
            font-size: 36px;
          }

          .lp-how-title {
            font-size: 29px;
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
            width: calc(100% - 24px);
            margin: 18px auto 24px;
            border-radius: 14px;
          }

          .lp-brand-cta-inner {
            min-height: 210px;
            padding: 30px 20px;
          }

          .lp-brand-copy h2 {
            font-size: 27px;
            line-height: 1.1;
          }

          .lp-brand-copy p {
            max-width: 520px;
            font-size: 13px;
            line-height: 1.55;
            margin-bottom: 18px;
          }
        }

        /* ============================================
           SECTION DIVIDERS
           Full-width, straight separators between sections.
        ============================================ */
        .lp-section-divider {
          width: 100%;
          height: 1px;
          margin: 0;
          padding: 0;
          border: 0;
          border-top: 1px solid #E3E3E3;
          box-sizing: border-box;
        }
      `}

</style>

      <PublicNavbar />

      {/* ============================================
          HERO
      ============================================ */}

      <section className="lp-hero" id="home">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <h1 className="lp-h1">
              Where Brands Meet Creators
            </h1>

            <p className="lp-hero-sub">
              Discover paid creator campaigns from businesses and turn your content skills into real collaboration opportunities.
            </p>

            <div className="lp-hero-actions">
              <Link
                to="/campaigns"
                className="lp-hero-btn lp-hero-btn-primary"
              >
                Explore Campaigns
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/register/business"
                className="lp-hero-btn lp-hero-btn-secondary"
              >
                Post a Campaign
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="lp-hero-visual" aria-label="Featured creator campaigns">
            <div className="lp-hero-art">
              <div className="lp-hero-image-frame">
                {HERO_SLIDES.map((slide, index) => (
                  <img
                    key={slide.category}
                    className={`lp-hero-slide-image ${index === heroSlide ? "is-visible" : "is-hidden"}`}
                    src={slide.image}
                    alt={slide.alt}
                  />
                ))}
                <span className="lp-hero-image-shade" aria-hidden="true" />
              </div>

              <div className="lp-hero-creator-chip">
                <img
                  className="lp-hero-creator-avatar"
                  src={HERO_SLIDES[heroSlide].creatorImage}
                  alt=""
                />
                <div>
                  <div className="lp-hero-creator-name">{HERO_SLIDES[heroSlide].creator}</div>
                  <div className="lp-hero-creator-followers">{HERO_SLIDES[heroSlide].followers}</div>
                </div>
              </div>

              <div className="lp-hero-polaroid lp-hero-polaroid-one" aria-hidden="true">
                <img src={HERO_SLIDES[heroSlide].photoOne} alt="" />
              </div>

              <div className="lp-hero-polaroid lp-hero-polaroid-two" aria-hidden="true">
                <img src={HERO_SLIDES[heroSlide].photoTwo} alt="" />
              </div>

              <div className="lp-hero-campaign-card">
                <div className="lp-hero-campaign-brand">{HERO_SLIDES[heroSlide].brand}</div>
                <h2 className="lp-hero-campaign-title">{HERO_SLIDES[heroSlide].campaignTitle}</h2>
                <div className="lp-hero-campaign-meta">
                  <span className="lp-hero-campaign-meta-item lp-hero-campaign-budget">
                    {HERO_SLIDES[heroSlide].budget}
                  </span>
                  <span className="lp-hero-campaign-meta-item">
                    <MapPin size={13} />
                    {HERO_SLIDES[heroSlide].location}
                  </span>
                  <span className="lp-hero-campaign-meta-item">
                    <Calendar size={13} />
                    {HERO_SLIDES[heroSlide].deadline}
                  </span>
                </div>
              </div>
            </div>

            <div className="lp-hero-dots" aria-label="Featured campaign slides">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.category}
                  type="button"
                  className={`lp-hero-dot ${index === heroSlide ? "is-active" : ""}`}
                  onClick={() => setHeroSlide(index)}
                  aria-label={`Show ${slide.category}`}
                  aria-current={index === heroSlide ? "true" : undefined}
                />
              ))}
            </div>
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

            <Link to="/campaigns" className="lp-view-all lp-latest-view-all">
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
                className="lp-cat-card"
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
                <a href="#campaigns">Campaigns</a>
                <a href="#for-brands">For Brands</a>
                <a href="#for-brands">About</a>
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
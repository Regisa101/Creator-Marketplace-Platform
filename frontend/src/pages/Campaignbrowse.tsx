import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Search,
  ChevronDown,
  Minus,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';

import { getCampaigns, type Campaign } from '../api/client';
import PublicNavbar from '../components/PublicNavbar';

const C = {
  surface: '#FBF8F4',
  card: '#FFFFFF',
  ink: '#1A1625',
  inkSoft: '#6B6478',
  inkFaint: '#A39DB8',
  line: '#EAE7F2',
  navy: '#7661A1',
  navySoft: '#F0EBF6',
  coral: '#F47C78',
  green: '#22C55E',
  greenSoft: '#EAFBF1',
};

const CATEGORIES = [
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

type SortOption =
  | 'newest'
  | 'oldest'
  | 'price-high'
  | 'price-low';

/* =========================================================
   HELPERS
========================================================= */

function getCampaignPrice(campaign: Campaign): number {
  const possibleValues = [
    (campaign as any).compensation,
    (campaign as any).budget,
    (campaign as any).price,
    (campaign as any).amount,
  ];

  for (const value of possibleValues) {
    if (
      typeof value === 'number' &&
      !Number.isNaN(value)
    ) {
      return value;
    }

    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      const parsed = Number(cleaned);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getCampaignCategory(
  campaign: Campaign
): string {
  return String(
    (campaign as any).category || ''
  ).trim();
}

/*
 * Only paid campaigns should appear.
 */
function isPaidCampaign(
  campaign: Campaign
): boolean {
  const type = String(
    (campaign as any).campaign_type ||
      (campaign as any).campaignType ||
      (campaign as any).type ||
      ''
  ).toLowerCase();

  /*
   * If backend does not return campaign type,
   * allow the campaign.
   */
  if (!type) return true;

  return type === 'paid';
}

/*
 * IMPORTANT:
 * Only LIVE/ACTIVE campaigns are shown.
 *
 * Accepted values:
 * active
 * live
 * published
 *
 * Draft, completed, rejected, closed etc.
 * will not appear.
 */
function isLiveCampaign(
  campaign: Campaign
): boolean {
  const status = String(
    (campaign as any).status || ''
  )
    .trim()
    .toLowerCase();

  return (
    status === 'active' ||
    status === 'live' ||
    status === 'published'
  );
}

/* =========================================================
   CAMPAIGN CARD
========================================================= */

function CampaignCard({
  campaign,
}: {
  campaign: Campaign;
}) {
  const description =
    campaign.description?.trim() ||
    campaign.tagline?.trim() ||
    'No campaign description yet.';

  const category =
    getCampaignCategory(campaign);

  const price =
    getCampaignPrice(campaign);

  const coverImage =
    (campaign as any).cover_image ||
    (campaign as any).coverImage ||
    (campaign as any).image_url;

  const businessName =
    (campaign as any).business_name ||
    (campaign as any).brand_name ||
    'Business';

  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="public-campaign-card"
    >
      {/* IMAGE */}
      <div className="campaign-image-wrapper">
        {coverImage ? (
          <img
            src={coverImage}
            alt={campaign.title}
            className="campaign-image"
          />
        ) : (
          <div className="campaign-image-placeholder">
            <Megaphone size={28} />
          </div>
        )}

        {/* LIVE BADGE */}
        <span className="live-badge">
          <span className="live-dot" />
          Live
        </span>

        {/* PAID BADGE */}
        <span className="paid-badge">
          Paid
        </span>
      </div>

      {/* CONTENT */}
      <div className="campaign-card-body">
        <div className="campaign-brand">
          {businessName}
        </div>

        <h3 className="campaign-card-title">
          {campaign.title}
        </h3>

        <p className="campaign-card-description">
          {description}
        </p>

        <div className="campaign-card-meta">
          {category && (
            <span className="category-pill">
              {category}
            </span>
          )}

          {price > 0 && (
            <span className="price-text">
              NPR {price.toLocaleString()}
            </span>
          )}
        </div>

        <div className="view-campaign-button">
          View Campaign
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export function CampaignBrowse() {
  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [category, setCategory] =
    useState('');

  const [sort, setSort] =
    useState<SortOption>('newest');

  const [minPrice, setMinPrice] =
    useState(0);

  const [maxPrice, setMaxPrice] =
    useState(50000);

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  /* =====================================================
     LOAD CAMPAIGNS
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    const timer =
      window.setTimeout(async () => {
        try {
          const data =
            await getCampaigns({
              search:
                search.trim() || undefined,

              category:
                category || undefined,

              page: 1,
              limit: 50,
            });

          if (!cancelled) {
            setCampaigns(
              data.campaigns ?? []
            );
          }
        } catch (err) {
          console.error(
            'Could not load campaigns:',
            err
          );

          if (!cancelled) {
            setError(
              'Could not load campaigns. Please try again.'
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, category]);

  /* =====================================================
     FILTER + SORT
  ===================================================== */

  const visibleCampaigns =
    useMemo(() => {
      return campaigns

        /*
         * ONLY LIVE CAMPAIGNS
         */
        .filter((campaign) =>
          isLiveCampaign(campaign)
        )

        /*
         * ONLY PAID CAMPAIGNS
         */
        .filter((campaign) =>
          isPaidCampaign(campaign)
        )

        /*
         * PRICE FILTER
         */
        .filter((campaign) => {
          const price =
            getCampaignPrice(campaign);

          /*
           * If no price is available,
           * keep campaign visible.
           */
          if (price === 0) {
            return true;
          }

          return (
            price >= minPrice &&
            price <= maxPrice
          );
        })

        /*
         * SORT
         */
        .sort((a, b) => {
          if (sort === 'price-high') {
            return (
              getCampaignPrice(b) -
              getCampaignPrice(a)
            );
          }

          if (sort === 'price-low') {
            return (
              getCampaignPrice(a) -
              getCampaignPrice(b)
            );
          }

          const aTime = new Date(
            a.created_at
          ).getTime();

          const bTime = new Date(
            b.created_at
          ).getTime();

          return sort === 'newest'
            ? bTime - aTime
            : aTime - bTime;
        });
    }, [
      campaigns,
      minPrice,
      maxPrice,
      sort,
    ]);

  /* =====================================================
     FILTER ACTIONS
  ===================================================== */

  const clearFilters = () => {
    setCategory('');
    setMinPrice(0);
    setMaxPrice(50000);
    setSort('newest');
  };

  const increaseMinPrice = () => {
    setMinPrice((current) =>
      Math.min(
        current + 1000,
        maxPrice
      )
    );
  };

  const decreaseMinPrice = () => {
    setMinPrice((current) =>
      Math.max(
        current - 1000,
        0
      )
    );
  };

  const increaseMaxPrice = () => {
    setMaxPrice((current) =>
      Math.min(
        current + 1000,
        100000
      )
    );
  };

  const decreaseMaxPrice = () => {
    setMaxPrice((current) =>
      Math.max(
        current - 1000,
        minPrice
      )
    );
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      {/* PUBLIC NAVBAR */}
      <PublicNavbar />

      <div className="public-campaign-page">
        <style>{`

          * {
            box-sizing: border-box;
          }

          .public-campaign-page {
            min-height: 100vh;
            background: ${C.surface};
            color: ${C.ink};
            font-family:
              Poppins,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          /* =========================
             HEADER
          ========================= */

          .campaign-market-header {
            max-width: 1280px;
            margin: 0 auto;
            padding: 44px 32px 24px;
          }

          .campaign-market-title {
            margin: 0;
            font-family:
              'League Spartan',
              sans-serif;
            font-size: 36px;
            line-height: 1.1;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: ${C.ink};
          }

          .campaign-market-subtitle {
            margin: 9px 0 0;
            max-width: 650px;
            color: ${C.inkSoft};
            font-size: 14px;
            line-height: 1.7;
          }

          /* =========================
             SEARCH
          ========================= */

          .campaign-search-wrapper {
            max-width: 1280px;
            margin: 0 auto;
            padding: 0 32px 28px;
          }

          .campaign-search {
            position: relative;
            width: 100%;
          }

          .campaign-search-icon {
            position: absolute;
            left: 18px;
            top: 50%;
            transform:
              translateY(-50%);
            color: ${C.inkFaint};
            pointer-events: none;
          }

          .campaign-search input {
            width: 100%;
            height: 52px;
            padding:
              0 18px 0 50px;
            border:
              1px solid ${C.line};
            border-radius: 10px;
            background: #fff;
            color: ${C.ink};
            font-family:
              Poppins,
              sans-serif;
            font-size: 13px;
            outline: none;
            transition:
              border .18s ease,
              box-shadow .18s ease;
          }

          .campaign-search input:focus {
            border-color: ${C.navy};
            box-shadow:
              0 0 0 3px
              rgba(118, 97, 161, .08);
          }

          .campaign-search input::placeholder {
            color: ${C.inkFaint};
          }

          /* =========================
             MAIN LAYOUT
          ========================= */

          .campaign-market-layout {
            max-width: 1280px;
            margin: 0 auto;
            padding:
              0 32px 60px;

            display: grid;

            grid-template-columns:
              250px
              minmax(0, 1fr);

            gap: 28px;

            align-items: start;
          }

          /* =========================
             SIDEBAR
          ========================= */

          .campaign-filter-sidebar {
            position: sticky;
            top: 90px;

            border:
              1px solid ${C.line};

            border-radius: 14px;

            background: #fff;

            overflow: hidden;
          }

          .filter-header {
            display: flex;
            align-items: center;
            justify-content: space-between;

            padding: 18px;

            border-bottom:
              1px solid ${C.line};
          }

          .filter-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: ${C.ink};
          }

          .clear-filter-button {
            border: none;
            background: transparent;

            color: ${C.navy};

            font-family:
              Poppins,
              sans-serif;

            font-size: 11px;
            font-weight: 600;

            cursor: pointer;
            padding: 0;
          }

          .filter-section {
            padding: 18px;

            border-bottom:
              1px solid ${C.line};
          }

          .filter-section:last-child {
            border-bottom: none;
          }

          .filter-label {
            display: block;

            margin-bottom: 9px;

            color: ${C.ink};

            font-size: 12px;
            font-weight: 600;
          }

          .category-select-wrapper {
            position: relative;
          }

          .category-select {
            width: 100%;
            height: 40px;

            appearance: none;

            padding:
              0 35px 0 12px;

            border:
              1px solid ${C.line};

            border-radius: 8px;

            background: #fff;

            color: ${C.inkSoft};

            font-family:
              Poppins,
              sans-serif;

            font-size: 12px;

            outline: none;

            cursor: pointer;
          }

          .category-select:focus {
            border-color: ${C.navy};
          }

          .category-select-wrapper svg {
            position: absolute;

            right: 11px;
            top: 50%;

            transform:
              translateY(-50%);

            color: ${C.inkFaint};

            pointer-events: none;
          }

          /* =========================
             PRICE
          ========================= */

          .price-box {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .price-control {
            display: grid;

            grid-template-columns:
              34px
              minmax(0, 1fr)
              34px;

            height: 38px;

            border:
              1px solid ${C.line};

            border-radius: 8px;

            overflow: hidden;

            background: #fff;
          }

          .price-control button {
            display: grid;
            place-items: center;

            border: none;

            background:
              ${C.navySoft};

            color:
              ${C.navy};

            cursor: pointer;
          }

          .price-control button:hover {
            background: #E6DFF0;
          }

          .price-control span {
            display: flex;
            align-items: center;
            justify-content: center;

            color: ${C.ink};

            font-size: 11px;
            font-weight: 600;
          }

          .price-helper {
            margin: 0;

            color:
              ${C.inkFaint};

            font-size: 10px;
            line-height: 1.5;
          }

          /* =========================
             MOBILE FILTER
          ========================= */

          .mobile-filter-button {
            display: none;
          }

          /* =========================
             RESULTS
          ========================= */

          .campaign-results {
            min-width: 0;
          }

          .results-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 15px;

            margin-bottom: 18px;
          }

          .results-count {
            margin: 0;

            color:
              ${C.inkSoft};

            font-size: 12px;
          }

          .results-count strong {
            color:
              ${C.ink};

            font-weight: 700;
          }

          .sort-wrapper {
            display: flex;
            align-items: center;

            gap: 8px;
          }

          .sort-label {
            color:
              ${C.inkSoft};

            font-size: 11px;
          }

          .sort-select {
            height: 38px;

            padding:
              0 32px 0 11px;

            border:
              1px solid ${C.line};

            border-radius: 8px;

            background: #fff;

            color:
              ${C.ink};

            font-family:
              Poppins,
              sans-serif;

            font-size: 11px;

            outline: none;

            cursor: pointer;
          }

          /* =========================
             CAMPAIGN GRID
          ========================= */

          .campaign-grid {
            display: grid;

            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );

            gap: 18px;
          }

          /* =========================
             CARD
          ========================= */

          .public-campaign-card {
            min-width: 0;

            display: block;

            border:
              1px solid ${C.line};

            border-radius: 14px;

            background:
              ${C.card};

            color: inherit;

            text-decoration: none;

            overflow: hidden;

            transition:
              transform .18s ease,
              box-shadow .18s ease,
              border-color .18s ease;
          }

          .public-campaign-card:hover {
            transform:
              translateY(-3px);

            border-color:
              #DDD6EA;

            box-shadow:
              0 10px 28px
              rgba(
                35,
                29,
                58,
                .09
              );
          }

          /* =========================
             IMAGE
          ========================= */

          .campaign-image-wrapper {
            position: relative;

            width: 100%;
            height: 190px;

            overflow: hidden;

            background:
              ${C.navySoft};
          }

          .campaign-image {
            width: 100%;
            height: 100%;

            object-fit: cover;

            display: block;

            transition:
              transform .3s ease;
          }

          .public-campaign-card:hover
          .campaign-image {
            transform: scale(1.03);
          }

          .campaign-image-placeholder {
            width: 100%;
            height: 100%;

            display: flex;

            align-items: center;
            justify-content: center;

            color:
              ${C.navy};

            background:
              ${C.navySoft};
          }

          /* =========================
             LIVE BADGE
          ========================= */

          .live-badge {
            position: absolute;

            top: 12px;
            left: 12px;

            display: inline-flex;

            align-items: center;

            gap: 6px;

            padding:
              5px 9px;

            border-radius: 999px;

            background:
              rgba(255,255,255,.95);

            color:
              #168542;

            font-size: 10px;
            font-weight: 700;

            box-shadow:
              0 2px 8px
              rgba(0,0,0,.06);
          }

          .live-dot {
            width: 6px;
            height: 6px;

            border-radius: 50%;

            background:
              ${C.green};
          }

          /* =========================
             PAID BADGE
          ========================= */

          .paid-badge {
            position: absolute;

            top: 12px;
            right: 12px;

            padding:
              5px 9px;

            border-radius: 999px;

            background:
              ${C.greenSoft};

            color:
              #168542;

            font-size: 10px;
            font-weight: 700;

            box-shadow:
              0 2px 8px
              rgba(0,0,0,.05);
          }

          /* =========================
             CARD CONTENT
          ========================= */

          .campaign-card-body {
            padding: 17px;
          }

          .campaign-brand {
            margin-bottom: 5px;

            color:
              ${C.navy};

            font-size: 10px;
            font-weight: 600;

            text-transform: uppercase;

            letter-spacing: .4px;
          }

          .campaign-card-title {
            margin:
              0 0 8px;

            color:
              ${C.ink};

            font-family:
              'League Spartan',
              sans-serif;

            font-size: 19px;

            line-height: 1.25;

            font-weight: 700;
          }

          .campaign-card-description {
            margin:
              0 0 13px;

            color:
              ${C.inkSoft};

            font-size: 11.5px;

            line-height: 1.6;

            display:
              -webkit-box;

            -webkit-line-clamp: 2;

            -webkit-box-orient:
              vertical;

            overflow: hidden;
          }

          .campaign-card-meta {
            min-height: 27px;

            display: flex;

            align-items: center;

            justify-content:
              space-between;

            gap: 8px;

            margin-bottom: 14px;
          }

          .category-pill {
            display: inline-flex;

            align-items: center;

            max-width: 55%;

            padding:
              5px 8px;

            border-radius: 6px;

            background:
              ${C.navySoft};

            color:
              ${C.navy};

            font-size: 9.5px;

            font-weight: 600;

            white-space: nowrap;

            overflow: hidden;

            text-overflow:
              ellipsis;
          }

          .price-text {
            color:
              ${C.ink};

            font-size: 11px;

            font-weight: 700;

            white-space: nowrap;
          }

          .view-campaign-button {
            width: 100%;
            height: 38px;

            display: grid;
            place-items: center;

            border:
              1px solid #8D8B94;

            border-radius: 8px;

            background: #fff;

            color:
              ${C.ink};

            font-size: 11.5px;

            font-weight: 600;

            transition:
              all .18s ease;
          }

          .public-campaign-card:hover
          .view-campaign-button {
            border-color:
              ${C.navy};

            color:
              ${C.navy};

            background:
              ${C.navySoft};
          }

          /* =========================
             STATES
          ========================= */

          .campaign-state {
            min-height: 360px;

            display: flex;

            flex-direction: column;

            align-items: center;

            justify-content: center;

            padding:
              50px 20px;

            text-align: center;

            color:
              ${C.inkSoft};

            font-size: 12px;
          }

          .campaign-state-title {
            margin:
              10px 0 4px;

            color:
              ${C.ink};

            font-size: 15px;

            font-weight: 700;
          }

          .campaign-state-description {
            max-width: 400px;

            line-height: 1.6;
          }

          /* =========================
             RESPONSIVE
          ========================= */

          @media (max-width: 1100px) {

            .campaign-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0, 1fr)
                );
            }

          }

          @media (max-width: 850px) {

            .campaign-market-header {
              padding-left: 20px;
              padding-right: 20px;
            }

            .campaign-search-wrapper {
              padding-left: 20px;
              padding-right: 20px;
            }

            .campaign-market-layout {
              display: block;

              padding-left: 20px;
              padding-right: 20px;
            }

            .mobile-filter-button {
              display: flex;

              align-items: center;
              justify-content: center;

              gap: 7px;

              width: 100%;
              height: 42px;

              margin-bottom: 14px;

              border:
                1px solid ${C.line};

              border-radius: 8px;

              background: #fff;

              color:
                ${C.ink};

              font-family:
                Poppins,
                sans-serif;

              font-size: 12px;

              font-weight: 600;

              cursor: pointer;
            }

            .campaign-filter-sidebar {
              position: static;

              display: none;

              margin-bottom: 18px;
            }

            .campaign-filter-sidebar.open {
              display: block;
            }

          }

          @media (max-width: 560px) {

            .campaign-market-title {
              font-size: 30px;
            }

            .campaign-market-subtitle {
              font-size: 12px;
            }

            .results-topbar {
              align-items: flex-start;

              flex-direction: column;
            }

            .sort-wrapper {
              width: 100%;

              justify-content:
                space-between;
            }

            .sort-select {
              flex: 1;
            }

            .campaign-grid {
              grid-template-columns: 1fr;
            }

            .campaign-image-wrapper {
              height: 210px;
            }

          }

        `}</style>

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <header className="campaign-market-header">
          <h1 className="campaign-market-title">
            Explore Campaigns
          </h1>

          <p className="campaign-market-subtitle">
            Discover live paid collaboration
            opportunities from businesses looking
            for content creators.
          </p>
        </header>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="campaign-search-wrapper">
          <div className="campaign-search">

            <Search
              size={19}
              className="campaign-search-icon"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search campaigns, brands, or categories..."
              aria-label="Search campaigns"
            />

          </div>
        </div>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="campaign-market-layout">

          {/* MOBILE FILTER */}

          <button
            type="button"
            className="mobile-filter-button"
            onClick={() =>
              setFiltersOpen(
                (current) => !current
              )
            }
          >
            <SlidersHorizontal size={16} />

            {filtersOpen
              ? 'Hide Filters'
              : 'Show Filters'}
          </button>

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside
            className={`
              campaign-filter-sidebar
              ${filtersOpen ? 'open' : ''}
            `}
          >

            <div className="filter-header">

              <h2 className="filter-title">
                Filters
              </h2>

              <button
                type="button"
                className="clear-filter-button"
                onClick={clearFilters}
              >
                Clear all
              </button>

            </div>

            {/* CATEGORY */}

            <div className="filter-section">

              <label className="filter-label">
                Category
              </label>

              <div className="category-select-wrapper">

                <select
                  className="category-select"
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                >

                  <option value="">
                    All Categories
                  </option>

                  {CATEGORIES.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}

                </select>

                <ChevronDown size={15} />

              </div>

            </div>

            {/* COMPENSATION */}

            <div className="filter-section">

              <label className="filter-label">
                Compensation
              </label>

              <div className="price-box">

                {/* MINIMUM */}

                <div>

                  <p
                    className="price-helper"
                    style={{
                      marginBottom: 5,
                    }}
                  >
                    Minimum price
                  </p>

                  <div className="price-control">

                    <button
                      type="button"
                      onClick={
                        decreaseMinPrice
                      }
                      aria-label="Decrease minimum price"
                    >
                      <Minus size={14} />
                    </button>

                    <span>
                      NPR{' '}
                      {minPrice.toLocaleString()}
                    </span>

                    <button
                      type="button"
                      onClick={
                        increaseMinPrice
                      }
                      aria-label="Increase minimum price"
                    >
                      <Plus size={14} />
                    </button>

                  </div>

                </div>

                {/* MAXIMUM */}

                <div>

                  <p
                    className="price-helper"
                    style={{
                      marginBottom: 5,
                    }}
                  >
                    Maximum price
                  </p>

                  <div className="price-control">

                    <button
                      type="button"
                      onClick={
                        decreaseMaxPrice
                      }
                      aria-label="Decrease maximum price"
                    >
                      <Minus size={14} />
                    </button>

                    <span>
                      NPR{' '}
                      {maxPrice.toLocaleString()}
                    </span>

                    <button
                      type="button"
                      onClick={
                        increaseMaxPrice
                      }
                      aria-label="Increase maximum price"
                    >
                      <Plus size={14} />
                    </button>

                  </div>

                </div>

                <p className="price-helper">
                  Showing live campaigns between
                  NPR{' '}
                  {minPrice.toLocaleString()}
                  {' '}and{' '}
                  {maxPrice.toLocaleString()}.
                </p>

              </div>

            </div>

          </aside>

          {/* =================================================
              RESULTS
          ================================================= */}

          <section className="campaign-results">

            <div className="results-topbar">

              <p className="results-count">
                <strong>
                  {visibleCampaigns.length}
                </strong>{' '}
                live campaigns available
              </p>

              <div className="sort-wrapper">

                <span className="sort-label">
                  Sort by:
                </span>

                <select
                  className="sort-select"
                  value={sort}
                  onChange={(event) =>
                    setSort(
                      event.target.value as SortOption
                    )
                  }
                >

                  <option value="newest">
                    Newest
                  </option>

                  <option value="oldest">
                    Oldest
                  </option>

                  <option value="price-high">
                    Price: High to Low
                  </option>

                  <option value="price-low">
                    Price: Low to High
                  </option>

                </select>

              </div>

            </div>

            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (
              <div className="campaign-state">

                <Megaphone
                  size={30}
                  color={C.inkFaint}
                />

                <div className="campaign-state-title">
                  Loading campaigns...
                </div>

              </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {!loading && error && (
              <div className="campaign-state">

                <Megaphone
                  size={30}
                  color={C.inkFaint}
                />

                <div className="campaign-state-title">
                  Something went wrong
                </div>

                <div className="campaign-state-description">
                  {error}
                </div>

              </div>
            )}

            {/* =================================================
                EMPTY
            ================================================= */}

            {!loading &&
              !error &&
              visibleCampaigns.length === 0 && (
                <div className="campaign-state">

                  <Megaphone
                    size={30}
                    color={C.inkFaint}
                  />

                  <div className="campaign-state-title">
                    No live campaigns found
                  </div>

                  <div className="campaign-state-description">

                    {search ||
                    category ||
                    minPrice > 0 ||
                    maxPrice < 50000
                      ? 'Try changing your search or filters to find more live campaigns.'
                      : 'There are no live paid campaigns available right now. Check back soon for new opportunities.'}

                  </div>

                </div>
              )}

            {/* =================================================
                CAMPAIGNS
            ================================================= */}

            {!loading &&
              !error &&
              visibleCampaigns.length > 0 && (

                <div className="campaign-grid">

                  {visibleCampaigns.map(
                    (campaign) => (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                      />
                    )
                  )}

                </div>

              )}

          </section>

        </main>

      </div>
    </>
  );
}

export default CampaignBrowse;
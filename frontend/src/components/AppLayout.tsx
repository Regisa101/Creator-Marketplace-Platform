// frontend/src/components/AppLayout.tsx

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Megaphone,
  Compass,
  Inbox,
  Briefcase,
  BarChart3,
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Calendar,
  PackageCheck,
  Bookmark,
  X,
  Search,
  Bell,
  Plus,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { LogoMark } from "./Logo";
import { getUnreadNotificationCount } from "../api/client";

const C = {
  sidebar: "#FFFFFF",
  sidebarBorder: "#EAE7F2",
  surface: "#F5F4FA",
  card: "#FFFFFF",
  ink: "#1A1625",
  inkSoft: "#6B6478",
  inkFaint: "#A39DB8",
  line: "#EAE7F2",
  navy: "#1E2A78",
  navySoft: "#F2F4FC",
  coral: "#FF6B5A",
  coralSoft: "#FFF4F2",
};

const WORKSPACE_CHILDREN = [
  {
    label: "Active Collab",
    icon: CheckCircle2,
    to: "/workspace/active",
  },
  {
    label: "Messages",
    icon: MessageSquare,
    to: "/workspace/messages",
  },
  {
    label: "Calendar",
    icon: Calendar,
    to: "/workspace/calendar",
  },
  {
    label: "Deliverables",
    icon: PackageCheck,
    to: "/workspace/deliverables",
  },
  {
    label: "Collab History",
    icon: Briefcase,
    to: "/workspace/history",
  },
];

const CREATOR_PROFILE_FIELDS: Array<string | string[]> = [
  "display_name",
  "username",
  "bio",
  "location",
  "creator_type",
  ["niches", "categories"],
  "content_types",
  ["content_languages", "languages"],
  ["audience_interests", "interests"],
  "audience_age_range",
  "audience_location",
  "socials",
  "starting_price",
];

const BUSINESS_PROFILE_FIELDS: Array<string | string[]> = [
  "company_name",
  "business_type",
  "industry",
  "location",
  "website",
  "description",
  "logo_url",
  "contact_phone",
  "interested_categories",
  "preferred_content_types",
  "typical_budget",
];

const BASE_COMPLETION = 22;

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
}

function isAnyAliasFilled(
  profile: Record<string, any>,
  key: string | string[]
) {
  const aliases = Array.isArray(key) ? key : [key];

  return aliases.some((alias) =>
    isFieldFilled(profile[alias])
  );
}

function calculateProfileCompletion(
  profile: Record<string, any> | undefined,
  role: "creator" | "business"
) {
  const fields =
    role === "creator"
      ? CREATOR_PROFILE_FIELDS
      : BUSINESS_PROFILE_FIELDS;

  if (!profile) {
    return BASE_COMPLETION;
  }

  const filled = fields.filter((key) =>
    isAnyAliasFilled(profile, key)
  ).length;

  return Math.min(
    100,
    Math.round(
      BASE_COMPLETION +
        (filled / fields.length) *
          (100 - BASE_COMPLETION)
    )
  );
}

function isRouteActive(
  pathname: string,
  to: string
) {
  if (to === "/dashboard") {
    return pathname === "/dashboard";
  }

  return (
    pathname === to ||
    pathname.startsWith(`${to}/`)
  );
}

type AppLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actionLabel?: string;
  actionTo?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
};

export function AppLayout({
  children,
  title,
  subtitle,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  actionLabel,
  actionTo,
  showSearch = true,
  showNotifications = true,
}: AppLayoutProps) {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const role =
    user?.role === "creator"
      ? "creator"
      : "business";

  const primary =
    role === "creator"
      ? C.coral
      : C.navy;

  const primarySoft =
    role === "creator"
      ? C.coralSoft
      : C.navySoft;

  const primaryDark =
    role === "creator"
      ? "#E85440"
      : "#141B52";

  const profileCompletion =
    calculateProfileCompletion(
      user?.profile,
      role
    );

  const profileEditRoute =
    `/onboarding/${role}`;

  const avatarUrl =
    user?.profile?.profile_image ||
    user?.profile?.logo_url ||
    null;

  const initials = (
    user?.full_name || "User"
  )
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [workspaceOpen, setWorkspaceOpen] =
    useState(() =>
      location.pathname.startsWith(
        "/workspace"
      )
    );

  const [defaultsHintDismissed, setDefaultsHintDismissed] =
    useState(
      () =>
        localStorage.getItem(
          "ck_defaults_hint_dismissed"
        ) === "1"
    );

  /*
   * =====================================================
   * NOTIFICATION COUNT
   * =====================================================
   */

  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  useEffect(() => {
    let mounted = true;

    const loadUnreadNotifications =
      async () => {
        try {
          const response =
            await getUnreadNotificationCount();

          let count = 0;

          if (
            typeof response === "number"
          ) {
            count = response;
          } else if (
            typeof response === "object" &&
            response !== null
          ) {
            const data =
              response as Record<
                string,
                any
              >;

            count = Number(
              data.count ??
                data.unread_count ??
                data.data?.count ??
                data.data?.unread_count ??
                0
            );
          }

          if (
            mounted &&
            Number.isFinite(count)
          ) {
            setUnreadNotifications(
              Math.max(0, count)
            );
          }
        } catch (error) {
          console.error(
            "Failed to load notification count:",
            error
          );
        }
      };

    loadUnreadNotifications();

    /*
     * Refresh notification count every
     * 30 seconds.
     */
    const interval =
      window.setInterval(
        loadUnreadNotifications,
        30000
      );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  /*
   * =====================================================
   * ROUTE CHANGE
   * =====================================================
   */

  useEffect(() => {
    setMenuOpen(false);

    if (
      location.pathname.startsWith(
        "/workspace"
      )
    ) {
      setWorkspaceOpen(true);
    }
  }, [location.pathname]);

  /*
   * =====================================================
   * NAVIGATION
   * =====================================================
   */

  const nav =
    role === "creator"
      ? [
          {
            label: "Home",
            icon: LayoutDashboard,
            to: "/dashboard",
          },
          {
            label: "Discover Collabs",
            icon: Compass,
            to: "/campaigns",
          },
          {
            label: "My Applications",
            icon: Inbox,
            to: "/applications",
          },
          {
            label: "Saved Campaigns",
            icon: Bookmark,
            to: "/saved",
          },
          {
            label: "Analytics",
            icon: BarChart3,
            to: "/analytics",
          },
        ]
      : [
          {
            label: "Home",
            icon: LayoutDashboard,
            to: "/dashboard",
          },
          {
            label: "My Campaigns",
            icon: Megaphone,
            to: "/campaigns",
          },
          {
            label: "Discover Creators",
            icon: Compass,
            to: "/creators",
          },
          {
            label: "Applications",
            icon: Inbox,
            to: "/applications",
          },
          {
            label: "Analytics",
            icon: BarChart3,
            to: "/analytics",
          },
        ];

  const defaultSearchPlaceholder =
    role === "creator"
      ? "Search campaigns…"
      : "Search campaigns, creators…";

  /*
   * =====================================================
   * NOTIFICATION BADGE
   * =====================================================
   *
   * Examples:
   *
   * 1 notification  -> 1
   * 5 notifications -> 5
   * 9 notifications -> 9
   * 10 notifications -> 9+
   *
   * The badge is positioned at the
   * TOP-RIGHT SIDE of the bell.
   */

  const notificationBadge =
    unreadNotifications > 9
      ? "9+"
      : String(unreadNotifications);

  return (
    <div className="app-layout">

      <style>{`

        /* =================================================
           MAIN LAYOUT
           ================================================= */

        .app-layout {
          min-height: 100vh;
          background: ${C.surface};
          color: ${C.ink};
        }

        .app-layout * {
          box-sizing: border-box;
        }

        /* =================================================
           SIDEBAR
           ================================================= */

        .app-sidebar {
          position: fixed;
          inset: 0 auto 0 0;

          width: 240px;

          display: flex;
          flex-direction: column;

          overflow-y: auto;

          padding: 24px 16px;

          background: ${C.sidebar};

          border-right: 1px solid
            ${C.sidebarBorder};

          z-index: 50;
        }

        .app-brand {
          display: flex;
          align-items: center;

          gap: 10px;

          padding: 0 8px;
        }

        .app-brand-name {
          font-family:
            'League Spartan',
            sans-serif;

          font-weight: 600;

          letter-spacing: .03em;

          font-size: 17px;
        }

        .app-nav {
          margin-top: 30px;

          display: flex;
          flex-direction: column;

          gap: 6px;
        }

        .app-nav-link,
        .app-nav-button {
          display: flex;
          align-items: center;

          gap: 12px;

          width: 100%;
          min-height: 40px;

          padding: 10px 12px;

          border: 0;
          border-radius: 8px;

          background: transparent;

          color: ${C.inkSoft};

          text-decoration: none;

          font:
            500 13px/1.2
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          cursor: pointer;

          text-align: left;
        }

        .app-nav-link:hover,
        .app-nav-button:hover {
          background: #F7F6FA;
          color: ${C.ink};
        }

        .app-nav-link.active {
          background: ${primarySoft};
          color: ${primary};
          font-weight: 600;
        }

        .app-nav-button span {
          flex: 1;
        }

        .app-nav-child {
          font-size: 13px;
        }

        /* =================================================
           SIDEBAR BOTTOM
           ================================================= */

        .app-sidebar-bottom {
          margin-top: 24px;

          display: flex;
          flex-direction: column;

          justify-content: flex-end;

          gap: 14px;

          flex: 1;
        }

        .app-completion {
          padding: 14px;

          border-radius: 12px;

          background: #1F1A2E;
        }

        .app-completion-title {
          color: #fff;

          font-size: 12px;
          font-weight: 700;
        }

        .app-completion-copy {
          margin-top: 4px;

          color: #9992AD;

          font-size: 10px;
          line-height: 1.45;
        }

        .app-completion-track {
          height: 6px;

          margin-top: 12px;

          border-radius: 99px;

          background: #332C48;

          overflow: hidden;
        }

        .app-completion-fill {
          height: 100%;

          border-radius: inherit;

          transition:
            width .3s ease;
        }

        .app-completion-percent {
          margin-top: 4px;

          text-align: right;

          color: #9992AD;

          font-size: 10px;
        }

        .app-completion-link {
          display: flex;

          justify-content: center;
          align-items: center;

          gap: 5px;

          margin-top: 8px;

          padding: 8px;

          border-radius: 7px;

          color: #fff;

          text-decoration: none;

          font-size: 10px;
          font-weight: 700;
        }

        /* =================================================
           DEFAULTS
           ================================================= */

        .app-defaults {
          position: relative;

          padding: 13px;

          border-radius: 10px;

          background: ${C.navySoft};

          border: 1px solid #D7DDF5;
        }

        .app-defaults-close {
          position: absolute;

          top: 8px;
          right: 8px;

          border: 0;

          background: transparent;

          color: ${C.inkFaint};

          cursor: pointer;
        }

        .app-defaults-title {
          padding-right: 14px;

          color: ${C.navy};

          font-size: 10.5px;
          line-height: 1.35;
          font-weight: 700;
        }

        .app-defaults-copy {
          margin: 5px 0 8px;

          color: ${C.inkSoft};

          font-size: 9.5px;
          line-height: 1.45;
        }

        .app-defaults-link {
          display: flex;
          align-items: center;

          gap: 4px;

          color: ${C.navy};

          text-decoration: none;

          font-size: 9.5px;
          font-weight: 700;
        }

        /* =================================================
           USER
           ================================================= */

        .app-user-wrap {
          position: relative;
        }

        .app-user {
          display: flex;
          align-items: center;

          gap: 9px;

          width: 100%;

          padding: 7px 4px;

          border: 0;

          background: transparent;

          cursor: pointer;

          text-align: left;
        }

        .app-avatar {
          width: 32px;
          height: 32px;

          flex: 0 0 32px;

          display: grid;
          place-items: center;

          overflow: hidden;

          border-radius: 50%;

          background: ${primary};

          color: #fff;

          font-size: 10px;
          font-weight: 700;
        }

        .app-avatar img {
          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        .app-user-info {
          min-width: 0;

          flex: 1;
        }

        .app-user-name {
          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          color: ${C.ink};

          font-size: 11px;
          font-weight: 600;
        }

        .app-user-role {
          color: ${C.inkFaint};

          font-size: 9.5px;

          text-transform: capitalize;
        }

        .app-user-menu {
          position: absolute;

          left: 0;
          bottom: 48px;

          width: 200px;

          padding: 6px;

          border: 1px solid ${C.line};

          border-radius: 10px;

          background: #fff;

          box-shadow:
            0 12px 30px
            rgba(20,17,40,.12);
        }

        .app-user-menu a,
        .app-user-menu button {
          display: flex;
          align-items: center;

          gap: 10px;

          width: 100%;

          padding: 10px;

          border: 0;
          border-radius: 7px;

          background: transparent;

          color: ${C.ink};

          text-decoration: none;

          font-size: 13px;

          cursor: pointer;

          text-align: left;
        }

        .app-user-menu a:hover,
        .app-user-menu button:hover {
          background: #F7F6FA;
        }

        /* =================================================
           MAIN
           ================================================= */

        .app-main {
          min-height: 100vh;

          margin-left: 240px;
        }

        /* =================================================
           TOP BAR
           ================================================= */

        .app-topbar {
          position: sticky;

          top: 0;

          z-index: 40;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          padding: 16px 24px;

          background: ${C.surface};
        }

        .app-topbar-title {
          min-width: 0;
        }

        .app-topbar-title h1 {
          margin: 0;

          color: ${C.ink};

          font-size: 20px;
          line-height: 1.25;
          font-weight: 700;
        }

        .app-topbar-title p {
          margin: 2px 0 0;

          color: ${C.inkSoft};

          font-size: 14px;
          line-height: 1.4;
        }

        .app-topbar-actions {
          display: flex;

          align-items: center;

          justify-content: flex-end;

          gap: 16px;

          flex: 1;

          min-width: 0;
        }

        /* =================================================
           SEARCH
           ================================================= */

        .app-search {
          display: flex;

          align-items: center;

          gap: 8px;

          padding: 8px 12px;

          border: 1px solid ${C.line};

          border-radius: 8px;

          background: ${C.card};

          color: ${C.inkFaint};

          flex: 1;

          min-width: 0;
        }

        .app-search input {
          width: 100%;
          min-width: 0;

          border: 0;

          outline: 0;

          background: transparent;

          color: ${C.ink};

          font-size: 14px;
        }

        .app-search input::placeholder {
          color: ${C.inkFaint};
        }

        /* =================================================
           NOTIFICATION
           ================================================= */

        .app-notification {
          position: relative;

          width: 38px;
          height: 38px;

          display: flex;

          align-items: center;
          justify-content: center;

          flex: 0 0 38px;

          padding: 0;

          border: 0;

          border-radius: 9px;

          background: transparent;

          color: ${C.inkSoft};

          cursor: pointer;

          text-decoration: none;
        }

        .app-notification:hover {
          background: #F5F5F7;
          color: ${C.ink};
        }

        /*
         * THIS IS THE IMPORTANT PART.
         *
         * Badge is NOT centered above the bell.
         *
         * It sits on the UPPER-RIGHT SIDE
         * and slightly overlaps the bell.
         */

        .app-notification-badge {
          position: absolute;

          top: -4px;
          right: -5px;

          min-width: 21px;
          height: 18px;

          padding: 0 5px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 999px;

          background: #E51E4B;

          color: #FFFFFF;

          border: 2px solid ${C.surface};

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          font-size: 9px;

          font-weight: 800;

          line-height: 1;

          white-space: nowrap;

          z-index: 5;

          box-shadow:
            0 1px 4px
            rgba(229,30,75,.22);
        }

        /* =================================================
           ACTION BUTTON
           ================================================= */

        .app-action {
          display: inline-flex;

          align-items: center;

          gap: 6px;

          padding: 8px 14px;

          border-radius: 8px;

          background: ${primary};

          color: #fff;

          text-decoration: none;

          font-size: 14px;

          font-weight: 600;

          white-space: nowrap;

          transition:
            background .15s ease;
        }

        .app-action:hover {
          background: ${primaryDark};
        }

        .app-page-content {
          width: 100%;
        }

        /* =================================================
           RESPONSIVE
           ================================================= */

        @media (max-width: 820px) {

          .app-sidebar {
            width: 68px;

            padding: 18px 8px;
          }

          .app-brand {
            justify-content: center;

            padding: 0;
          }

          .app-brand-name,
          .app-nav-link span,
          .app-nav-button span,
          .app-sidebar-bottom {
            display: none;
          }

          .app-nav-link,
          .app-nav-button {
            justify-content: center;

            padding: 10px;
          }

          .app-main {
            margin-left: 68px;
          }

          .app-topbar {
            padding: 14px 18px;
          }

          .app-topbar-title p {
            display: none;
          }
        }

        @media (max-width: 620px) {

          .app-topbar-title h1 {
            font-size: 17px;
          }

          .app-topbar-actions {
            gap: 8px;
          }

          .app-search {
            width: 160px;
          }

          .app-action {
            padding: 0 10px;
          }

          .app-notification {
            width: 34px;
            height: 34px;
          }

          .app-notification-badge {
            top: -5px;
            right: -6px;
          }
        }

      `}</style>

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <aside className="app-sidebar">

        <div className="app-brand">
          <LogoMark size={28} />

          <span className="app-brand-name">
            creatorhub
          </span>
        </div>

        <nav
          className="app-nav"
          aria-label="Main navigation"
        >
          {nav.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`app-nav-link ${
                  isRouteActive(
                    location.pathname,
                    item.to
                  )
                    ? "active"
                    : ""
                }`}
              >
                <Icon
                  size={17}
                  className="shrink-0"
                />

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* WORKSPACE */}

          <div>

            <button
              type="button"
              className="app-nav-button"
              onClick={() =>
                setWorkspaceOpen(
                  (value) => !value
                )
              }
              aria-expanded={
                workspaceOpen
              }
            >
              <Briefcase
                size={17}
                className="shrink-0"
              />

              <span>
                Workspace
              </span>

              {workspaceOpen ? (
                <ChevronDown size={15} />
              ) : (
                <ChevronRight size={15} />
              )}
            </button>

            {workspaceOpen && (
              <div>
                {WORKSPACE_CHILDREN.map(
                  (child) => {
                    const ChildIcon =
                      child.icon;

                    return (
                      <Link
                        key={child.to}
                        to={child.to}
                        className={`app-nav-link app-nav-child ${
                          isRouteActive(
                            location.pathname,
                            child.to
                          )
                            ? "active"
                            : ""
                        }`}
                      >
                        <ChildIcon
                          size={15}
                        />

                        <span>
                          {child.label}
                        </span>
                      </Link>
                    );
                  }
                )}
              </div>
            )}

          </div>
        </nav>

        {/* =================================================
            SIDEBAR BOTTOM
            ================================================= */}

        <div className="app-sidebar-bottom">

          {profileCompletion < 100 && (
            <div className="app-completion">

              <div className="app-completion-title">
                Complete your profile
              </div>

              <div className="app-completion-copy">
                {role === "creator"
                  ? "A complete profile gets seen by more brands."
                  : "A complete profile builds trust with creators."}
              </div>

              <div className="app-completion-track">

                <div
                  className="app-completion-fill"
                  style={{
                    width: `${profileCompletion}%`,
                    background: primary,
                  }}
                />

              </div>

              <div className="app-completion-percent">
                {profileCompletion}%
              </div>

              <Link
                className="app-completion-link"
                style={{
                  background: primary,
                }}
                to={profileEditRoute}
              >
                Complete Profile
                <ArrowRight size={11} />
              </Link>

            </div>
          )}

          {role === "business" &&
            !defaultsHintDismissed && (
              <div className="app-defaults">

                <button
                  type="button"
                  className="app-defaults-close"
                  onClick={() => {
                    localStorage.setItem(
                      "ck_defaults_hint_dismissed",
                      "1"
                    );

                    setDefaultsHintDismissed(
                      true
                    );
                  }}
                  aria-label="Dismiss"
                >
                  <X size={11} />
                </button>

                <div className="app-defaults-title">
                  Save time on your next campaign
                </div>

                <p className="app-defaults-copy">
                  Set your usual Do's, Don'ts &
                  video specs once — they'll
                  auto-fill every new campaign.
                </p>

                <Link
                  className="app-defaults-link"
                  to="/settings"
                >
                  Set up Campaign Defaults
                  <ArrowRight size={10} />
                </Link>

              </div>
            )}

          {/* USER */}

          <div className="app-user-wrap">

            {menuOpen && (
              <div className="app-user-menu">

                <Link
                  to="/profile"
                  onClick={() =>
                    setMenuOpen(false)
                  }
                >
                  <Settings size={15} />
                  Edit profile
                </Link>

                {role === "business" && (
                  <Link
                    to="/settings"
                    onClick={() =>
                      setMenuOpen(false)
                    }
                  >
                    <Settings size={15} />
                    Settings
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);

                    logout();

                    navigate("/login");
                  }}
                >
                  <LogOut size={15} />
                  Log out
                </button>

              </div>
            )}

            <button
              type="button"
              className="app-user"
              onClick={() =>
                setMenuOpen(
                  (value) => !value
                )
              }
            >

              <div className="app-avatar">

                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                  />
                ) : (
                  initials
                )}

              </div>

              <div className="app-user-info">

                <div className="app-user-name">
                  {user?.full_name ||
                    "User"}
                </div>

                <div className="app-user-role">
                  {user?.role || role}
                </div>

              </div>

              <ChevronDown
                size={14}
                color={C.inkFaint}
              />

            </button>

          </div>

        </div>

      </aside>

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <div className="app-main">

        <header className="app-topbar">

          <div className="app-topbar-title">

            {title && (
              <h1>{title}</h1>
            )}

            {subtitle && (
              <p>{subtitle}</p>
            )}

          </div>

          <div className="app-topbar-actions">

            {/* SEARCH */}

            {showSearch && (
              <label className="app-search">

                <Search size={14} />

                <input
                  value={searchValue}
                  onChange={(event) =>
                    onSearchChange?.(
                      event.target.value
                    )
                  }
                  placeholder={
                    searchPlaceholder ||
                    defaultSearchPlaceholder
                  }
                  aria-label="Search"
                />

              </label>
            )}

            {/* =================================================
                NOTIFICATION BELL
                ================================================= */}

            {showNotifications && (
              <Link
                to="/notifications"
                className="app-notification"
                aria-label={
                  unreadNotifications > 0
                    ? `${unreadNotifications} unread notifications`
                    : "Notifications"
                }
              >

                <Bell size={20} />

                {unreadNotifications > 0 && (
                  <span className="app-notification-badge">
                    {notificationBadge}
                  </span>
                )}

              </Link>
            )}

            {/* ACTION */}

            {actionLabel &&
              actionTo && (
                <Link
                  className="app-action"
                  to={actionTo}
                >
                  <Plus size={15} />

                  {actionLabel}
                </Link>
              )}

          </div>

        </header>

        <div className="app-page-content">
          {children}
        </div>

      </div>

    </div>
  );
}

export default AppLayout;
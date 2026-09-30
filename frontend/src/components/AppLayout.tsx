// frontend/src/components/AppLayout.tsx

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Megaphone,
  Inbox,
  Briefcase,
  BarChart3,
  ChevronDown,
  LogOut,
  Settings,
  ArrowRight,
  CheckCircle2,
  X,
  Search,
  Bell,
  Plus,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { LogoMark } from "./Logo";
import { getApplications, getNotifications, getUnreadNotificationCount, markNotificationRead } from "../api/client";

const C = {
  sidebar: "#FFFFFF",
  sidebarBorder: "#e4e1d9",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  ink: "#181818",
  inkSoft: "#6B6478",
  inkFaint: "#A39DB8",
  line: "#e4e1d9",
  navy: "#111111",
  navySoft: "#F3F3F3",
  coral: "#111111",
  coralSoft: "#F5F5F5",
};

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
  "socials",
  "portfolio",
  "availability",
];

const BUSINESS_PROFILE_FIELDS: Array<string | string[]> = [
  "company_name",
  "industry",
  "location",
  "description",
  "logo_url",
  "contact_phone",
  "contact_person_name",
  "website",
  "social_links",
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
  // Rendered to the right of the title/subtitle, on the same row, so
  // page-level actions (e.g. "Create campaign") line up with the welcome
  // heading instead of floating in the page body below it.
  headerActions?: ReactNode;
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
  headerActions,
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
      ? "#000000"
      : "#000000";

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

  // If the stored avatar/logo URL is broken or fails to load, fall back
  // to initials instead of showing a bare broken-image icon on a black
  // circle.
  const [avatarError, setAvatarError] =
    useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

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
  const [paymentSuccessNotice, setPaymentSuccessNotice] =
    useState<{ id: number; title: string; message: string; link?: string | null } | null>(null);

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
            const data = response as Record<string, any>;

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
   * APPLICATIONS BADGE (nav sidebar)
   * =====================================================
   *
   * Businesses see the count of applications still waiting on a
   * decision (status "pending") as a small badge next to the
   * "Applications" nav link — 5 pending shows "5", 10 pending shows
   * "10", etc. Creators don't have anything "received" to review here
   * (their applications page is their own outgoing applications), so
   * this only fetches/shows for the business role.
   */

  const [pendingApplicationsCount, setPendingApplicationsCount] =
    useState(0);

  useEffect(() => {
    if (role !== "business") {
      setPendingApplicationsCount(0);
      return;
    }

    let mounted = true;

    const loadPendingApplications = async () => {
      try {
        const applications = await getApplications({ status: "pending" });
        if (!mounted) return;
        setPendingApplicationsCount(
          Array.isArray(applications) ? applications.length : 0
        );
      } catch (error) {
        console.error(
          "Failed to load pending applications count:",
          error
        );
      }
    };

    loadPendingApplications();

    // Refresh alongside the notification count so both badges stay
    // roughly in sync without hammering the API.
    const interval = window.setInterval(loadPendingApplications, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [role]);

  const applicationsBadge =
    pendingApplicationsCount > 99
      ? "99+"
      : String(pendingApplicationsCount);


  /*
   * PAYMENT SUCCESS POPUP
   *
   * Show payment-success notifications as a popup for both sides.
   * The brand receives collaboration_completed; the creator receives
   * payment_released after the brand approves all deliverables.
   */
  useEffect(() => {
    if (!role) return;

    let mounted = true;

    const loadPaymentNotice = async () => {
      try {
        const notifications = await getNotifications(true);
        if (!mounted) return;

        const notice = notifications.find(
          (item) => item.type === (role === "business" ? "collaboration_completed" : "payment_released")
        );
        if (!notice) return;

        const seenKey = `payment-success-popup:${notice.id}`;
        if (sessionStorage.getItem(seenKey) === "1") return;

        sessionStorage.setItem(seenKey, "1");
        setPaymentSuccessNotice({
          id: notice.id,
          title: notice.title || "Payment successful",
          message: notice.message,
          link: notice.link,
        });
      } catch (error) {
        console.error("Failed to load payment success notification:", error);
      }
    };

    loadPaymentNotice();
    const interval = window.setInterval(loadPaymentNotice, 5000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [role]);

  /*
   * =====================================================
   * ROUTE CHANGE
   * =====================================================
   */

  useEffect(() => {
    setMenuOpen(false);
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
            label: "My Applications",
            icon: Inbox,
            to: "/applications",
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
        @import url('https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap');


        /* =================================================
           MAIN LAYOUT
           ================================================= */

        html, body, #root {
          background: ${C.surface};
        }

        .app-layout {
          min-height: 100vh;
          background: ${C.surface};
          color: ${C.ink};
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
        }

        .app-layout * {
          box-sizing: border-box;
        }

        /* Only strip the native OS look. Colors, borders and backgrounds
           are NOT forced here any more (the old rule used !important and
           turned every real button into plain text). :where() keeps this
           at zero specificity so each button's own class controls its look. */
        :where(.app-layout) button {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          margin: 0;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }

        .app-layout a {
          -webkit-tap-highlight-color: transparent;
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

          letter-spacing: -0.03em;

          font-size: 20px;
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

          font: 400 13px/1.2 'Poppins', sans-serif;

          cursor: pointer;

          text-align: left;
        }

        .app-nav-link:hover,
        .app-nav-button:hover {
          background: #F5F5F5;
          color: ${C.ink};
        }

        .app-nav-link.active {
          background: ${primarySoft};
          color: ${primary};
          font-weight: 500;
        }

        .app-nav-button span {
          flex: 1;
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

          background: #1D1D1D;
        }

        .app-completion-title {
          color: #fff;

          font-size: 12px;
          font-weight: 500;
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

          background: #303030;

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
          font-weight: 500;
        }

        /* =================================================
           DEFAULTS
           ================================================= */

        .app-defaults {
          position: relative;

          padding: 13px;

          border-radius: 10px;

          background: #FFFFFF;

          border: 1px solid #DDDDDD;
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
          font-weight: 500;
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
          font-weight: 500;
        }

        /* =================================================
           TOPBAR USER / PROFILE MENU
           (avatar lives in the top bar, far right)
           ================================================= */

        .app-user-wrap {
          position: relative;

          display: inline-flex;
        }

        .app-topbar-user {
          display: flex;
          align-items: center;

          gap: 6px;

          height: 38px;

          padding: 0 8px 0 4px;

          border: 0;
          border-radius: 999px;

          background: transparent;

          cursor: pointer;
        }

        .app-topbar-user:hover {
          background: #F5F5F7;
        }

        .app-avatar {
          width: 32px;
          height: 32px;

          flex: 0 0 32px;

          display: grid;
          place-items: center;

          overflow: hidden;

          border-radius: 50%;

          background: ${primarySoft};

          color: ${primary};

          font-size: 10px;
          font-weight: 500;
        }

        .app-avatar img {
          display: block;

          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        .app-user-menu {
          position: absolute;

          top: calc(100% + 14px);
          right: 0;

          width: 210px;

          padding: 6px;

          border: 1px solid ${C.line};

          border-radius: 10px;

          background: #fff;

          box-shadow:
            0 12px 30px
            rgba(20,17,40,.12);

          z-index: 60;
        }

        /* Small caret so the menu visually connects back to the
           avatar button it opened from, instead of floating loose. */
        .app-user-menu::before {
          content: "";

          position: absolute;

          top: -6px;
          right: 18px;

          width: 12px;
          height: 12px;

          background: #fff;

          border-left: 1px solid ${C.line};
          border-top: 1px solid ${C.line};

          border-radius: 2px 0 0 0;

          transform: rotate(45deg);
        }

        .app-user-menu-header {
          padding: 8px 10px 10px;
          margin-bottom: 4px;
          border-bottom: 1px solid ${C.line};
        }

        .app-user-menu-name {
          color: ${C.ink};
          font-size: 12.5px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .app-user-menu-role {
          margin-top: 2px;
          color: ${C.inkFaint};
          font-size: 10px;
          text-transform: capitalize;
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
          background: #F5F5F5;
        }

        .app-nav-badge {
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: ${C.coral};
          color: #fff;
          font-size: 9px;
          line-height: 1;
          font-weight: 600;
          margin-left: auto;
        }

        /* =================================================
           MAIN
           ================================================= */

        .app-main {
          min-height: 100vh;

          margin-left: 240px;

          background: ${C.surface};
        }

        /* =================================================
           TOP BAR
           Row 1: full-width search + icons/actions/avatar,
           with a grey divider underneath it.
           Row 2: welcome title/subtitle on the left, and any
           page-level header actions (e.g. "Create campaign")
           on the right of the same row.
           ================================================= */

        .app-topbar {
          position: sticky;

          top: 0;

          z-index: 40;

          display: flex;
          flex-direction: column;

          padding: 16px 24px;

          background: ${C.surface};
        }

        .app-topbar-row {
          display: flex;

          align-items: center;

          gap: 16px;

          width: 100%;

          padding-bottom: 14px;

          margin-bottom: 14px;

          border-bottom: 1px solid ${C.sidebarBorder};
        }

        .app-topbar-title {
          width: 100%;

          display: flex;

          align-items: flex-start;
          justify-content: space-between;

          gap: 16px;

          flex-wrap: wrap;
        }

        .app-topbar-title h1 {
          margin: 0;

          color: ${C.ink};

          font-family: 'League Spartan', sans-serif;
          font-size: 28px;
          letter-spacing: -0.02em;
          line-height: 1.15;
          font-weight: 400;
        }

        .app-topbar-title p {
          margin: 2px 0 0;

          color: ${C.inkSoft};

          font-size: 13px;
          line-height: 1.4;
          font-weight: 400;
        }

        .app-topbar-title-actions {
          display: flex;

          align-items: center;

          gap: 9px;

          flex: 0 0 auto;
          flex-wrap: wrap;
        }

        .app-topbar-search {
          flex: 1;
          min-width: 0;
        }

        .app-topbar-actions {
          display: flex;

          align-items: center;

          justify-content: flex-end;

          gap: 14px;

          flex: 0 0 auto;
        }

        /* =================================================
           SEARCH
           ================================================= */

        .app-search {
          display: flex;

          align-items: center;

          gap: 8px;

          height: 38px;

          padding: 0 12px;

          border: 1px solid ${C.line};

          border-radius: 10px;

          background: #ffffff;

          color: ${C.inkFaint};

          width: 100%;
        }

        .app-search input {
          width: 100%;
          min-width: 0;

          border: 0;
          outline: 0;
          box-shadow: none;

          background: transparent;

          color: ${C.ink};

          font-size: 13px;
        }

        .app-search input::placeholder {
          color: ${C.inkFaint};
        }

        .app-search input:focus {
          outline: none;
          box-shadow: none;
        }

        .app-search:focus-within {
          border-color: #B9B4C4;
        }

        /* =================================================
           NOTIFICATION / ICON BUTTONS
           (used for both the settings gear and the bell)
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

          background: #4C4C4C;

          color: #FFFFFF;

          border: 2px solid ${C.surface};

          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          font-size: 9px;

          font-weight: 600;

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

          height: 38px;

          padding: 0 14px;

          border-radius: 8px;

          background: ${primary};

          color: #fff;

          text-decoration: none;

          font-size: 13px;

          font-weight: 500;

          white-space: nowrap;

          transition:
            background .15s ease;
        }

        .app-action:hover {
          background: ${primaryDark};
        }

        .app-page-content {
          width: 100%;
          background: ${C.surface};
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

          /* On the collapsed rail, the badge no longer has a label
             next to it to sit "after" — so it becomes a small dot
             pinned to the top-right corner of the icon itself,
             matching how the bell's badge behaves when collapsed. */
          .app-nav-link {
            position: relative;
          }

          .app-nav-link .app-nav-badge {
            position: absolute;
            top: 4px;
            right: 4px;
            margin-left: 0;
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

          .app-topbar-title {
            flex-direction: column;

            align-items: flex-start;
          }

          .app-topbar-title-actions {
            width: 100%;
          }

          .app-topbar-title h1 {
            font-size: 24px;
          }

          .app-topbar-actions {
            gap: 8px;
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
        .app-payment-modal-backdrop { position: fixed; inset: 0; z-index: 9999; background: rgba(20, 18, 30, .48); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .app-payment-modal { position: relative; width: min(430px, 100%); background: #fff; border-radius: 18px; padding: 30px 28px 26px; text-align: center; box-shadow: 0 24px 70px rgba(25, 20, 40, .22); }
        .app-payment-modal-close { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; border: 0; border-radius: 50%; background: #F5F5F5; color: #6B6478; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .app-payment-success-icon { width: 62px; height: 62px; margin: 0 auto 12px; border-radius: 50%; background: #F5F5F5; color: #16834A; display: flex; align-items: center; justify-content: center; }
        .app-payment-success-kicker { color: #16834A; font-size: 10px; font-weight: 600; letter-spacing: .12em; margin-bottom: 7px; }
        .app-payment-modal h2 { margin: 0 0 9px; color: #181818; font-family: 'League Spartan', sans-serif; font-size: 26px; font-weight: 400; letter-spacing: -0.02em; }
        .app-payment-modal p { margin: 0; color: #6B6478; font-size: 13px; line-height: 1.55; }
        .app-payment-success-button { width: 100%; margin-top: 19px; border: 0; border-radius: 9px; padding: 11px 14px; background: #111111; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
      `}</style>

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <aside className="app-sidebar">

        <Link to="/" className="app-brand" aria-label="Go to creatorhub home">
          <LogoMark size={28} />

          <span className="app-brand-name">
            creatorhub
          </span>
        </Link>

        <nav
          className="app-nav"
          aria-label="Main navigation"
        >
          {nav.map((item) => {
            const Icon = item.icon;

            // Only the business "Applications" link gets a live count
            // badge — creators use this same route for their own
            // outgoing applications, which isn't a "received" count.
            const showApplicationsBadge =
              role === "business" &&
              item.to === "/applications" &&
              pendingApplicationsCount > 0;

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

                {showApplicationsBadge && (
                  <span
                    className="app-nav-badge"
                    aria-label={`${pendingApplicationsCount} application${
                      pendingApplicationsCount === 1 ? "" : "s"
                    } to review`}
                  >
                    {applicationsBadge}
                  </span>
                )}
              </Link>
            );
          })}

          <Link
            to={role === "creator" ? "/contracts" : "/collab-history"}
            className={`app-nav-link ${
              isRouteActive(location.pathname, "/contracts") ||
              isRouteActive(location.pathname, "/collab-history")
                ? "active"
                : ""
            }`}
          >
            <Briefcase size={17} className="shrink-0" />
            <span>{role === "creator" ? "Contract History" : "Collab History"}</span>
          </Link>
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

        </div>

      </aside>

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <div className="app-main">

        <header className="app-topbar">

          {/* ROW 1 — big search bar + settings, bell, avatar, with a grey divider under it */}
          <div className="app-topbar-row">

            <div className="app-topbar-search">
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
            </div>

            <div className="app-topbar-actions">

              {/* SETTINGS ICON */}

              <Link
                to="/settings"
                className="app-notification"
                aria-label="Settings"
              >
                <Settings size={20} />
              </Link>

              {/* NOTIFICATION BELL */}

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
                    className="btn btn-primary"
                    to={actionTo}
                  >
                    <Plus size={15} />

                    {actionLabel}
                  </Link>
                )}

              {/* PROFILE / ACCOUNT MENU */}

              <div className="app-user-wrap">

                {menuOpen && (
                  <div className="app-user-menu">

                    <div className="app-user-menu-header">
                      <div className="app-user-menu-name">
                        {user?.full_name || "User"}
                      </div>
                      <div className="app-user-menu-role">
                        {user?.role || role}
                      </div>
                    </div>

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
                  className="app-topbar-user"
                  onClick={() =>
                    setMenuOpen(
                      (value) => !value
                    )
                  }
                  aria-label="Account menu"
                >

                  <div className="app-avatar">

                    {avatarUrl && !avatarError ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      initials
                    )}

                  </div>

                  <ChevronDown
                    size={14}
                    color={C.inkFaint}
                  />

                </button>

              </div>

            </div>

          </div>

          {/* ROW 2 — welcome title/subtitle on the left, headerActions
              (page-level buttons) on the right, underneath the grey
              divider. Wraps to a second line on narrow screens. */}

          <div className="app-topbar-title">

            <div>
              {title && (
                <h1>{title}</h1>
              )}

              {subtitle && (
                <p>{subtitle}</p>
              )}
            </div>

            {headerActions && (
              <div className="app-topbar-title-actions">
                {headerActions}
              </div>
            )}

          </div>

        </header>

        <div className="app-page-content">
          {children}
        </div>

      </div>

      {paymentSuccessNotice && (
        <div className="app-payment-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="app-payment-success-title">
          <div className="app-payment-modal">
            <button
              type="button"
              className="app-payment-modal-close"
              aria-label="Close"
              onClick={async () => {
                const id = paymentSuccessNotice.id;
                setPaymentSuccessNotice(null);
                try {
                  await markNotificationRead(id);
                } catch (error) {
                  console.error("Could not mark payment notification as read:", error);
                }
              }}
            >
              <X size={18} />
            </button>
            <div className="app-payment-success-icon">
              <CheckCircle2 size={30} />
            </div>
            <div className="app-payment-success-kicker">PAYMENT SUCCESSFUL</div>
            <h2 id="app-payment-success-title">{paymentSuccessNotice.title}</h2>
            <p>{paymentSuccessNotice.message}</p>
            <button
              type="button"
              className="app-payment-success-button"
              onClick={async () => {
                const notice = paymentSuccessNotice;
                setPaymentSuccessNotice(null);
                try {
                  await markNotificationRead(notice.id);
                } catch (error) {
                  console.error("Could not mark payment notification as read:", error);
                }
                if (notice.link) navigate(notice.link);
              }}
            >
              View collaboration
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default AppLayout;
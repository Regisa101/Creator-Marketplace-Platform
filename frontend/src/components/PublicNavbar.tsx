import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import {
  Bell,
  FileSignature,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { LogoMark } from './Logo';
import { useAuth } from '../context/AuthContext';

import {
  getNotifications,
  getSavedCampaigns,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  unsaveCampaign,
  type Notification,
  type SavedCampaignEntry,
} from '../api/client';


type Props = {
  sticky?: boolean;
};

type Section =
  | 'home'
  | 'campaigns'
  | 'for-brands';


const API_ORIGIN = 'http://localhost:8000';


/* ============================================================
   HELPERS
============================================================ */

function mediaUrl(value?: string | null) {
  if (!value) {
    return '';
  }

  if (
    /^(https?:)?\/\//i.test(value) ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value;
  }

  if (value.startsWith('/api/')) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/${value.replace(/^\/+/, '')}`;
}


function initials(name?: string | null) {
  const parts = (name || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (parts[0] || 'U')
    .slice(0, 2)
    .toUpperCase();
}


function avatarFor(user: any) {
  return mediaUrl(
    user?.profile?.profile_image ||
      user?.profile?.profile_image_url ||
      user?.profile?.avatar_url ||
      user?.profile?.logo_url ||
      null
  );
}


/* ============================================================
   PUBLIC NAVBAR
============================================================ */

export function PublicNavbar({
  sticky = true,
}: Props) {

  const location = useLocation();
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const {
    user,
    loading,
    isAuthenticated,
    logout,
  } = useAuth();


  /* ==========================================================
     STATE
  ========================================================== */

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    wishlistOpen,
    setWishlistOpen,
  ] = useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    saved,
    setSaved,
  ] = useState<SavedCampaignEntry[]>([]);

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([]);

  const [
    unread,
    setUnread,
  ] = useState(0);

  const [
    search,
    setSearch,
  ] = useState(
    searchParams.get('search') || ''
  );


  const profileRef =
    useRef<HTMLDivElement>(null);


  /* ==========================================================
     CONTEXT
  ========================================================== */

  const isCreator =
    user?.role === 'creator';

  const isLanding =
    location.pathname === '/';

  const isCampaigns =
    location.pathname === '/campaigns';

  const isPublicHome =
    isLanding ||
    searchParams.get('source') === 'landing';

  const showWishlist =
    !loading &&
    isAuthenticated &&
    isCreator &&
    isPublicHome;


  /* ==========================================================
     WISHLIST
  ========================================================== */

  const refreshWishlist =
    async () => {

      if (!showWishlist) {
        setSaved([]);
        return;
      }

      try {

        const result =
          await getSavedCampaigns();

        setSaved(
          Array.isArray(result)
            ? result
            : []
        );

      } catch {

        setSaved([]);

      }
    };


  useEffect(() => {

    void refreshWishlist();

  }, [showWishlist]);


  useEffect(() => {

    const handler = () => {
      void refreshWishlist();
    };

    window.addEventListener(
      'ch:wishlist-changed',
      handler
    );

    return () => {

      window.removeEventListener(
        'ch:wishlist-changed',
        handler
      );

    };

  }, [showWishlist]);


  /* ==========================================================
     NOTIFICATIONS
  ========================================================== */

  const refreshNotifications =
    async () => {

      if (!isAuthenticated) {
        return;
      }

      try {

        const [
          items,
          count,
        ] = await Promise.all([
          getNotifications(false),
          getUnreadNotificationCount(),
        ]);

        setNotifications(
          Array.isArray(items)
            ? items
            : []
        );

        setUnread(
          Number(count) || 0
        );

      } catch {

        setNotifications([]);
        setUnread(0);

      }
    };


  useEffect(() => {

    if (!isAuthenticated) {

      setNotifications([]);
      setUnread(0);
      setNotificationOpen(false);

      return;
    }

    void refreshNotifications();

    const timer =
      window.setInterval(
        () => {
          void refreshNotifications();
        },
        15000
      );

    return () => {
      window.clearInterval(timer);
    };

  }, [isAuthenticated]);


  /* ==========================================================
     CLOSE PROFILE WHEN CLICKING OUTSIDE
  ========================================================== */

  useEffect(() => {

    const close =
      (event: globalThis.PointerEvent) => {

        if (
          profileRef.current &&
          !profileRef.current.contains(
            event.target as Node
          )
        ) {

          setProfileOpen(false);

        }

      };


    document.addEventListener(
      'pointerdown',
      close
    );

    return () => {

      document.removeEventListener(
        'pointerdown',
        close
      );

    };

  }, []);


  /* ==========================================================
     LOCK PAGE WHEN PANEL IS OPEN
  ========================================================== */

  useEffect(() => {

    if (
      !wishlistOpen &&
      !notificationOpen
    ) {
      return;
    }

    const old =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    return () => {

      document.body.style.overflow =
        old;

    };

  }, [
    wishlistOpen,
    notificationOpen,
  ]);


  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const goCampaigns = () => {

    setMobileOpen(false);
    setProfileOpen(false);
    setWishlistOpen(false);
    setNotificationOpen(false);

    navigate('/campaigns');

  };


  const goSection = (
    section: Section
  ) => {

    setMobileOpen(false);
    setProfileOpen(false);

    if (
      section === 'campaigns'
    ) {

      goCampaigns();
      return;

    }


    if (!isPublicHome) {

      sessionStorage.setItem(
        'ch-scroll-target',
        section === 'for-brands'
          ? 'for-brands'
          : 'home'
      );

      navigate('/');

      return;

    }


    const targetId =
      section === 'for-brands'
        ? 'for-brands'
        : 'home';


    const element =
      document.getElementById(
        targetId
      );


    if (element) {

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

    }


    window.history.replaceState(
      null,
      '',
      section === 'for-brands'
        ? '/#for-brands'
        : '/#home'
    );

  };


  /* ==========================================================
     SEARCH
  ========================================================== */

  const submitSearch =
    (event: FormEvent) => {

      event.preventDefault();

      setMobileOpen(false);

      const value =
        search.trim();

      navigate(
        value
          ? `/campaigns?search=${encodeURIComponent(value)}`
          : '/campaigns'
      );

    };


  /* ==========================================================
     LOGOUT
  ========================================================== */

  const handleLogout =
    () => {

      setProfileOpen(false);
      setMobileOpen(false);

      logout();

      navigate('/');

    };


  /* ==========================================================
     NOTIFICATION ACTIONS
  ========================================================== */

  const markOneRead =
    async (
      notification: Notification
    ) => {

      try {

        if (!notification.is_read) {

          await markNotificationRead(
            notification.id
          );

        }


        setNotifications(
          items =>
            items.map(
              item =>
                item.id === notification.id
                  ? {
                      ...item,
                      is_read: true,
                    }
                  : item
            )
        );


        setUnread(
          value =>
            Math.max(
              0,
              value -
                (
                  notification.is_read
                    ? 0
                    : 1
                )
            )
        );


        setNotificationOpen(false);


        if (notification.link) {

          navigate(
            notification.link
          );

        }

      } catch {

        // Keep notification visible.

      }

    };


  const markEverythingRead =
    async () => {

      try {

        await markAllNotificationsRead();

        setNotifications(
          items =>
            items.map(
              item => ({
                ...item,
                is_read: true,
              })
            )
        );

        setUnread(0);

      } catch {

        // No-op.

      }

    };


  /* ==========================================================
     REMOVE SAVED CAMPAIGN
  ========================================================== */

  const removeSaved =
    async (
      campaignId: number
    ) => {

      try {

        await unsaveCampaign(
          campaignId
        );

        setSaved(
          items =>
            items.filter(
              item =>
                item.campaign_id !==
                campaignId
            )
        );

      } catch {

        // No-op.

      }

    };


  const avatar =
    avatarFor(user);


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>

      <style>{`

        /* ======================================================
           MAIN NAVBAR
        ====================================================== */

        .ch-nav {
          position: ${sticky ? 'fixed' : 'relative'};
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;

          background: #ffffff;

          border-bottom:
            1px solid #e7e7e7;

          font-family:
            Poppins,
            sans-serif;
        }


        /* ======================================================
           TOP ROW
        ====================================================== */

        .ch-nav-top {
          height: 76px;

          max-width: 1240px;

          margin: 0 auto;

          padding:
            0 36px;

          display: grid;

          grid-template-columns:
            1fr auto 1fr;

          align-items: center;

          gap: 20px;
        }


        /* ======================================================
           SEARCH
        ====================================================== */

        .ch-nav-search {
          width: 280px;
          height: 40px;

          border-radius: 22px;

          background: #fafafa;

          display: flex;
          align-items: center;

          overflow: hidden;
        }


        .ch-nav-search input {
          width: 100%;
          height: 100%;

          border: 0 !important;
          outline: 0 !important;

          background:
            transparent !important;

          padding:
            0 14px 0 8px;

          font:
            400 13px
            Poppins,
            sans-serif;

          color: #222;
        }


        .ch-nav-search input::placeholder {
          color: #918b99;
          opacity: 1;
        }


        .ch-nav-search svg {
          margin-left: 14px;
          color: #8d8793;
          flex: none;
        }


        /* ======================================================
           LOGO
        ====================================================== */

        .ch-nav-logo {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 11px;

          color: #111 !important;

          text-decoration: none !important;

          white-space: nowrap;

          background:
            transparent !important;

          border: 0 !important;

          box-shadow: none !important;
        }


        .ch-nav-logo:hover {
          background:
            transparent !important;

          color: #111 !important;
        }


        .ch-nav-logo span {
          font:
            600 21px
            'League Spartan',
            sans-serif;

          letter-spacing:
            -0.8px;
        }


        /* ======================================================
           RIGHT ACTIONS
        ====================================================== */

        .ch-nav-actions {
          display: flex;

          justify-content: flex-end;

          align-items: center;

          gap: 9px;
        }


        /* ======================================================
           LOGIN / REGISTER
        ====================================================== */

        .ch-nav-btn {
          height: 38px;

          padding:
            0 15px;

          border-radius: 8px;

          text-decoration: none !important;

          font:
            500 12px
            Poppins,
            sans-serif;

          display: inline-flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;
        }


        .ch-nav-login {
          background:
            #111 !important;

          color:
            #fff !important;

          border:
            1px solid #111 !important;
        }


        .ch-nav-register {
          background:
            #fff !important;

          color:
            #111 !important;

          border:
            1px solid #111 !important;
        }


        .ch-nav-login:hover {
          background:
            #111 !important;

          color:
            #fff !important;
        }


        .ch-nav-register:hover {
          background:
            #f5f5f5 !important;

          color:
            #111 !important;
        }


        /* ======================================================
           ICON BUTTONS
        ====================================================== */

        .ch-nav-icon {
          position: relative;

          width: 38px;
          height: 38px;

          min-width: 38px;

          padding: 0 !important;

          border:
            1px solid #e2e2e2 !important;

          border-radius: 50% !important;

          background:
            #fff !important;

          color:
            #111 !important;

          display: flex;

          align-items: center;

          justify-content: center;

          cursor: pointer;

          appearance: none;

          box-shadow: none !important;
        }


        .ch-nav-icon:hover {
          background:
            #f5f5f5 !important;

          color:
            #111 !important;
        }


        /* ======================================================
           NOTIFICATION BADGE
        ====================================================== */

        .ch-nav-badge {
          position: absolute;

          right: -2px;
          top: -3px;

          min-width: 16px;
          height: 16px;

          border-radius: 20px;

          background:
            #111 !important;

          color:
            #fff !important;

          font:
            700 9px/16px
            Poppins,
            sans-serif;

          text-align: center;

          padding:
            0 3px;
        }


        /* ======================================================
           AVATAR
        ====================================================== */

        .ch-nav-avatar {
          width: 38px;
          height: 38px;

          min-width: 38px;

          padding: 0 !important;

          border-radius: 50% !important;

          overflow: hidden;

          border:
            1px solid #ddd !important;

          background:
            #f3f3f3 !important;

          color:
            #111 !important;

          display: flex;

          align-items: center;

          justify-content: center;

          font:
            700 12px
            Poppins,
            sans-serif;

          cursor: pointer;

          appearance: none;

          box-shadow: none !important;
        }


        .ch-nav-avatar:hover {
          background:
            #f3f3f3 !important;
        }


        .ch-nav-avatar img {
          width: 100%;
          height: 100%;

          object-fit: cover;
        }


        /* ======================================================
           DESKTOP NAV LINKS
        ====================================================== */

        .ch-nav-menu {
          height: 48px;

          display: flex;

          justify-content: center;

          align-items: center;

          gap: 48px;

          background:
            #fff !important;
        }


        /*
         IMPORTANT:
         The !important values below prevent any global
         button styles from turning these links black.
        */

        .ch-nav-link {
          height: 48px;

          min-width: auto;

          padding:
            0 !important;

          margin: 0 !important;

          display: flex;

          align-items: center;

          justify-content: center;

          position: relative;

          border:
            0 !important;

          outline: none !important;

          background:
            transparent !important;

          background-color:
            transparent !important;

          color:
            #716b7c !important;

          text-decoration: none !important;

          font:
            500 14px
            Poppins,
            sans-serif;

          cursor: pointer;

          appearance: none;

          box-shadow: none !important;

          border-radius: 0 !important;
        }


        .ch-nav-link:hover {
          background:
            transparent !important;

          background-color:
            transparent !important;

          color:
            #111 !important;

          box-shadow:
            none !important;
        }


        .ch-nav-link.active {
          background:
            transparent !important;

          background-color:
            transparent !important;

          color:
            #111 !important;

          font-weight: 600;
        }


        .ch-nav-link.active::after {
          content: '';

          position: absolute;

          left: 0;
          right: 0;

          bottom: 6px;

          height: 2px;

          background:
            #111 !important;

          border-radius: 2px;
        }


        /* ======================================================
           PROFILE DROPDOWN
        ====================================================== */

        .ch-profile {
          position: relative;
        }


        .ch-profile-menu {
          position: absolute;

          right: 0;

          top: 48px;

          width: 190px;

          padding: 7px;

          background:
            #fff !important;

          border:
            1px solid #e5e5e5;

          border-radius: 12px;

          box-shadow:
            0 14px 35px
            rgba(0, 0, 0, 0.12);

          z-index: 10001;
        }


        .ch-profile-menu a,
        .ch-profile-menu button {
          width: 100%;

          box-sizing: border-box;

          border: 0 !important;

          background:
            transparent !important;

          border-radius: 8px;

          padding:
            10px 11px;

          display: flex;

          gap: 9px;

          align-items: center;

          color:
            #333 !important;

          text-decoration: none !important;

          font:
            500 12px
            Poppins,
            sans-serif;

          cursor: pointer;

          text-align: left;

          appearance: none;
        }


        .ch-profile-menu a:hover,
        .ch-profile-menu button:hover {
          background:
            #f5f5f5 !important;

          color:
            #111 !important;
        }


        /* ======================================================
           PANELS
        ====================================================== */

        .ch-panel {
          position: fixed;

          right: 18px;

          top: 140px;

          width:
            min(
              390px,
              calc(100vw - 36px)
            );

          max-height: 70vh;

          overflow: auto;

          background:
            #fff !important;

          border:
            1px solid #e5e5e5;

          border-radius: 14px;

          box-shadow:
            0 18px 45px
            rgba(0, 0, 0, 0.15);

          z-index: 10000;
        }


        .ch-panel-head {
          min-height: 58px;

          padding:
            0 16px;

          border-bottom:
            1px solid #eee;

          display: flex;

          align-items: center;

          justify-content: space-between;
        }


        .ch-panel-head h3 {
          margin: 0;

          font:
            700 15px
            Poppins,
            sans-serif;
        }


        .ch-panel-head button {
          border: 0 !important;

          background:
            transparent !important;

          color:
            #333 !important;

          cursor: pointer;

          appearance: none;
        }


        .ch-panel-row {
          padding:
            12px 15px;

          border-bottom:
            1px solid #eee;

          display: flex;

          gap: 10px;

          cursor: pointer;

          background:
            #fff !important;
        }


        .ch-panel-row:hover {
          background:
            #fafafa !important;
        }


        .ch-panel-row.unread {
          background:
            #fafafa !important;
        }


        .ch-panel-row strong {
          display: block;

          font:
            600 12px
            Poppins,
            sans-serif;
        }


        .ch-panel-row p {
          margin:
            3px 0 0;

          color:
            #777;

          font:
            400 11px/1.45
            Poppins,
            sans-serif;
        }


        .ch-empty {
          padding:
            35px 18px;

          text-align: center;

          color:
            #888;

          font:
            400 12px
            Poppins,
            sans-serif;
        }


        /* ======================================================
           WISHLIST
        ====================================================== */

        .ch-wish-work {
          width: 48px;
          height: 48px;

          border-radius: 8px;

          background:
            #f3f3f3 !important;

          object-fit: cover;

          flex: none;
        }


        .ch-wish-remove {
          margin-left: auto;

          border: 0 !important;

          background:
            transparent !important;

          color:
            #888 !important;

          cursor: pointer;

          padding: 4px !important;

          appearance: none;
        }


        .ch-wish-remove:hover {
          background:
            transparent !important;

          color:
            #111 !important;
        }


        /* ======================================================
           MOBILE MENU
        ====================================================== */

        .ch-mobile {
          display: none;
        }


        /*
         DESKTOP:
         Hamburger is completely hidden.
        */

        .ch-desktop-menu-button {
          display: none !important;
        }


        /* ======================================================
           MOBILE
        ====================================================== */

        @media (max-width: 760px) {

          .ch-nav-top {
            height: 64px;

            padding:
              0 16px;

            grid-template-columns:
              auto 1fr auto;
          }


          .ch-nav-search {
            display: none;
          }


          .ch-nav-logo {
            justify-self: center;
          }


          .ch-nav-logo span {
            display: none;
          }


          /*
           Desktop navigation disappears.
          */

          .ch-nav-menu {
            display: none !important;
          }


          /*
           Desktop Login/Register disappear.
          */

          .ch-nav-actions
          .ch-nav-btn {
            display: none;
          }


          /*
           Hamburger appears ONLY on mobile.
          */

          .ch-desktop-menu-button {
            display: flex !important;
          }


          .ch-mobile {
            display: flex;

            justify-content: center;

            align-items: center;

            border-top:
              1px solid #eee;

            padding:
              8px 14px;

            gap: 20px;

            background:
              #fff !important;
          }


          .ch-mobile .ch-nav-link {
            height: 40px;

            font-size: 13px;
          }


          .ch-panel {
            top: 78px;

            right: 10px;
          }

        }


        /* ======================================================
           SMALL MOBILE
        ====================================================== */

        @media (max-width: 430px) {

          .ch-nav-top {
            padding:
              0 12px;
          }


          .ch-nav-actions {
            gap: 6px;
          }


          .ch-nav-icon,
          .ch-nav-avatar {
            width: 36px;
            height: 36px;

            min-width: 36px;
          }


          .ch-mobile {
            gap: 14px;
          }

        }

      `}</style>


      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="ch-nav">

        {/* ====================================================
            TOP ROW
        ==================================================== */}

        <div className="ch-nav-top">

          {/* SEARCH */}

          <form
            className="ch-nav-search"
            onSubmit={submitSearch}
          >

            <Search size={17} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search campaigns..."
            />

          </form>


          {/* LOGO */}

          <Link
            className="ch-nav-logo"
            to="/"
            onClick={() => {
              setMobileOpen(false);
              setProfileOpen(false);
            }}
          >

            <LogoMark />

            <span>
              creatorhub
            </span>

          </Link>


          {/* RIGHT SIDE */}

          <div className="ch-nav-actions">

            {isAuthenticated ? (
              <>

                {/* WISHLIST */}

                {isCreator &&
                  showWishlist && (

                    <button
                      type="button"
                      className="ch-nav-icon"
                      onClick={() => {
                        setWishlistOpen(
                          value => !value
                        );

                        setNotificationOpen(
                          false
                        );
                      }}
                      aria-label="Wishlist"
                    >

                      <Heart size={17} />

                      {saved.length > 0 && (
                        <span className="ch-nav-badge">
                          {saved.length}
                        </span>
                      )}

                    </button>

                  )}


                {/* NOTIFICATIONS */}

                <button
                  type="button"
                  className="ch-nav-icon"
                  onClick={() => {

                    setNotificationOpen(
                      value => !value
                    );

                    setWishlistOpen(
                      false
                    );

                  }}
                  aria-label="Notifications"
                >

                  <Bell size={17} />

                  {unread > 0 && (
                    <span className="ch-nav-badge">
                      {unread}
                    </span>
                  )}

                </button>


                {/* PROFILE */}

                <div
                  className="ch-profile"
                  ref={profileRef}
                >

                  <button
                    type="button"
                    className="ch-nav-avatar"
                    onClick={() =>
                      setProfileOpen(
                        value => !value
                      )
                    }
                    aria-label="Profile"
                  >

                    {avatar ? (

                      <img
                        src={avatar}
                        alt=""
                      />

                    ) : (

                      initials(
                        user?.full_name
                      )

                    )}

                  </button>


                  {profileOpen && (

                    <div className="ch-profile-menu">

                      <Link
                        to="/profile"
                        onClick={() =>
                          setProfileOpen(false)
                        }
                      >

                        <UserRound
                          size={14}
                        />

                        Profile

                      </Link>


                      <Link
                        to={
                          user?.role === 'admin'
                            ? '/admin'
                            : '/dashboard'
                        }
                        onClick={() =>
                          setProfileOpen(false)
                        }
                      >

                        <LayoutDashboard
                          size={14}
                        />

                        Dashboard

                      </Link>


                      {user?.role === 'creator' && (

                        <Link
                          to="/contracts"
                          onClick={() =>
                            setProfileOpen(false)
                          }
                        >

                          <FileSignature
                            size={14}
                          />

                          Contract History

                        </Link>

                      )}


                      {user?.role === 'business' && (

                        <Link
                          to="/collab-history"
                          onClick={() =>
                            setProfileOpen(false)
                          }
                        >

                          <FileSignature
                            size={14}
                          />

                          Collab History

                        </Link>

                      )}


                      <button
                        type="button"
                        onClick={handleLogout}
                      >

                        <LogOut
                          size={14}
                        />

                        Logout

                      </button>

                    </div>

                  )}

                </div>

              </>

            ) : (

              <>

                <Link
                  className="ch-nav-btn ch-nav-login"
                  to="/login"
                >
                  Login
                </Link>


                <Link
                  className="ch-nav-btn ch-nav-register"
                  to="/register"
                >
                  Register
                </Link>

              </>

            )}


            {/* =================================================
                HAMBURGER

                Hidden on desktop.
                Visible ONLY under 760px.
            ================================================= */}

            <button
              type="button"
              className="ch-nav-icon ch-desktop-menu-button"
              onClick={() =>
                setMobileOpen(
                  value => !value
                )
              }
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >

              {mobileOpen ? (
                <X size={18} />
              ) : (
                <Menu size={18} />
              )}

            </button>

          </div>

        </div>


        {/* ====================================================
            DESKTOP NAV
        ==================================================== */}

        <nav className="ch-nav-menu">

          <button
            type="button"
            className={`ch-nav-link ${
              isLanding &&
              !location.hash
                ? 'active'
                : ''
            }`}
            onClick={() =>
              goSection('home')
            }
          >
            Home
          </button>


          <button
            type="button"
            className={`ch-nav-link ${
              isCampaigns
                ? 'active'
                : ''
            }`}
            onClick={() =>
              goSection('campaigns')
            }
          >
            Campaigns
          </button>


          <button
            type="button"
            className={`ch-nav-link ${
              isPublicHome &&
              location.hash ===
                '#for-brands'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              goSection('for-brands')
            }
          >
            For Brands
          </button>

        </nav>


        {/* ====================================================
            MOBILE NAV
        ==================================================== */}

        {mobileOpen && (

          <div className="ch-mobile">

            <button
              type="button"
              className="ch-nav-link"
              onClick={() =>
                goSection('home')
              }
            >
              Home
            </button>


            <button
              type="button"
              className="ch-nav-link"
              onClick={() =>
                goSection('campaigns')
              }
            >
              Campaigns
            </button>


            <button
              type="button"
              className="ch-nav-link"
              onClick={() =>
                goSection('for-brands')
              }
            >
              For Brands
            </button>

          </div>

        )}

      </header>


      {/* ======================================================
          WISHLIST PANEL
      ====================================================== */}

      {wishlistOpen &&
        showWishlist && (

          <div className="ch-panel">

            <div className="ch-panel-head">

              <h3>
                Saved campaigns
              </h3>

              <button
                type="button"
                onClick={() =>
                  setWishlistOpen(false)
                }
                aria-label="Close wishlist"
              >
                <X size={17} />
              </button>

            </div>


            {saved.length === 0 ? (

              <div className="ch-empty">
                No saved campaigns yet.
              </div>

            ) : (

              saved.map(item => (

                <div
                  className="ch-panel-row"
                  key={item.id}
                  onClick={() => {

                    setWishlistOpen(
                      false
                    );

                    navigate(
                      `/campaigns/${item.campaign_id}?source=landing`
                    );

                  }}
                >

                  <div className="ch-wish-work" />


                  <div>

                    <strong>
                      {item.campaign.title}
                    </strong>

                    <p>
                      {item.campaign.category}
                    </p>

                  </div>


                  <button
                    type="button"
                    className="ch-wish-remove"
                    onClick={event => {

                      event.stopPropagation();

                      void removeSaved(
                        item.campaign_id
                      );

                    }}
                    aria-label="Remove saved campaign"
                  >

                    <Trash2 size={15} />

                  </button>

                </div>

              ))

            )}

          </div>

        )}


      {/* ======================================================
          NOTIFICATION PANEL
      ====================================================== */}

      {notificationOpen &&
        isAuthenticated && (

          <div className="ch-panel">

            <div className="ch-panel-head">

              <h3>
                Notifications
              </h3>


              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >

                <button
                  type="button"
                  onClick={() =>
                    void markEverythingRead()
                  }
                  title="Mark all notifications as read"
                  style={{
                    font:
                      '500 11px Poppins, sans-serif',
                    padding:
                      '5px 7px',
                  }}
                >
                  Mark all
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setNotificationOpen(false)
                  }
                  aria-label="Close notifications"
                >
                  <X size={17} />
                </button>

              </div>

            </div>


            {notifications.length === 0 ? (

              <div className="ch-empty">
                No notifications yet.
              </div>

            ) : (

              notifications
                .slice(0, 20)
                .map(item => (

                  <div
                    className={`ch-panel-row ${
                      item.is_read
                        ? ''
                        : 'unread'
                    }`}
                    key={item.id}
                    onClick={() =>
                      void markOneRead(
                        item
                      )
                    }
                  >

                    <Bell size={15} />


                    <div>

                      <strong>
                        {item.title}
                      </strong>

                      <p>
                        {item.message}
                      </p>

                    </div>

                  </div>

                ))

            )}

          </div>

        )}

    </>
  );
}


export default PublicNavbar;
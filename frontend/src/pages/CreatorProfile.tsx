import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Globe,
  Pencil,
  Music2,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  X,
  Briefcase,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getCreatorProgress, getApplications, saveCreatorProgress, uploadImage } from '../api/client';
import { OFF_WHITE } from '../components/Brand';
import { CONTENT, LOCATIONS, TYPES, parseTypes } from './onboarding/CreatorOnboarding';
import { PublicNavbar } from '../components/PublicNavbar';
import { Lightbox, type LightboxItem } from '../components/PublicProfileKit';
import { PublicProfileStyles } from '../components/PublicProfileKit';

const CORAL = '#111111';
const CORAL_DARK = '#000000';
const VIOLET = '#111111';

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <polygon points="10,9 15,12 10,15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 4 2 20M2 4l20 16" />
    </svg>
  );
}

const PLATFORM_ICON: Record<string, any> = {
  instagram: InstagramIcon,
  tiktok: Music2,
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  twitter: TwitterIcon,
};

function formatFollowers(value: number) {
  if (!value) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace('.0', '')}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}K`;
  return value.toLocaleString();
}

/* Location input with auto-suggestions (same list as onboarding); own text is allowed. */
function LocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  const q = value.trim().toLowerCase();
  const suggestions = LOCATIONS.filter((x) => x.toLowerCase().includes(q)).slice(0, 40);

  return (
    <div className="cp-sugg-wrap" ref={ref}>
      <input
        className="cp-inline-input"
        value={value}
        autoComplete="off"
        placeholder="Start typing your city"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div className="cp-sugg-menu">
          {suggestions.length > 0 ? (
            suggestions.map((x) => (
              <button
                type="button"
                key={x}
                className={`cp-sugg-item${x === value ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(x);
                  setOpen(false);
                }}
              >
                {x}
              </button>
            ))
          ) : (
            <div className="cp-sugg-empty">No match. You can keep your own location.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* A custom creator type must look like a real role, not random characters. */
function customTypeError(raw: string, existing: string[]): string {
  const v = raw.trim().replace(/\s+/g, ' ');
  if (v.length < 3) return 'Creator type must be at least 3 characters.';
  if (v.length > 30) return 'Creator type must be 30 characters or fewer.';
  if (!/^[A-Za-z][A-Za-z0-9 &/'-]*$/.test(v)) {
    return 'Use letters, numbers, spaces, & / - only, starting with a letter.';
  }
  if (!/[AEIOUaeiou]/.test(v)) return 'Please enter a real creator type.';
  if (/(.)\1{3,}/.test(v)) return 'Please enter a real creator type.';
  if (existing.some((x) => x.toLowerCase() === v.toLowerCase())) return 'You already added that type.';
  return '';
}

export function CreatorProfile() {
  const { user, deleteAccount, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [socials, setSocials] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit profile (done here on the profile page, not in onboarding)
  const [viewer, setViewer] = useState<LightboxItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [editError, setEditError] = useState('');
  const [ePhoto, setEPhoto] = useState('');
  const [eName, setEName] = useState('');
  const [eUsername, setEUsername] = useState('');
  const [eLocation, setELocation] = useState('');
  const [eBio, setEBio] = useState('');
  const [eTypes, setETypes] = useState<string[]>([]);
  const [eTypeOtherOpen, setETypeOtherOpen] = useState(false);
  const [eTypeOther, setETypeOther] = useState('');
  const [eContent, setEContent] = useState<string[]>([]);
  const [eContentOther, setEContentOther] = useState('');
  const [eNiches, setENiches] = useState('');
  const [eSocials, setESocials] = useState<any[]>([]);
  const [eSocPlatform, setESocPlatform] = useState('Instagram');
  const [eSocUsername, setESocUsername] = useState('');
  const [eSocUrl, setESocUrl] = useState('');
  const [eSocFollowers, setESocFollowers] = useState('');
  const [ePortfolio, setEPortfolio] = useState<any[]>([]);
  const [ePortfolioTitle, setEPortfolioTitle] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [profileData, applicationData] = await Promise.all([
          getCreatorProgress(),
          getApplications(),
        ]);

        if (!cancelled) {
          setProfile(profileData?.profile ?? null);
          setSocials(profileData?.socials ?? []);
          setApplications(applicationData ?? []);
        }
      } catch (err) {
        console.error('Could not load profile:', err);
        if (!cancelled) setError('Could not load your profile right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword.trim()) {
      setDeleteError('Please enter your current password.');
      return;
    }

    setDeleting(true);

    try {
      await deleteAccount(deletePassword);
      navigate('/');
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.detail ||
        'Could not delete your account. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const displayName = profile?.display_name || user?.full_name || 'Creator';
  const initial = displayName[0]?.toUpperCase() ?? 'C';

  const acceptedApps = applications.filter(
    (app) => app.status === 'accepted' || app.status === 'completed'
  );

  const completedApps = applications.filter(
    (app) => app.status === 'completed'
  );

  const portfolio = Array.isArray(profile?.portfolio)
    ? profile.portfolio
    : [];

  const categories = Array.isArray(profile?.categories)
    ? profile.categories
    : Array.isArray(profile?.niches)
      ? profile.niches
      : [];

  const contentTypes = Array.isArray(profile?.content_types)
    ? profile.content_types
    : [];

  const languages = Array.isArray(profile?.languages)
    ? profile.languages
    : Array.isArray(profile?.content_languages)
      ? profile.content_languages
      : [];


  const openEdit = () => {
    setEPhoto(profile?.profile_image || '');
    setEName(profile?.display_name || '');
    setEUsername(profile?.username || '');
    setELocation(profile?.location || '');
    setEBio(profile?.bio || '');
    setETypes(parseTypes(profile?.creator_type));
    setETypeOtherOpen(false);
    setETypeOther('');
    setEContent([...contentTypes]);
    setEContentOther('');
    setENiches((categories as string[]).join(', '));
    setESocials(socials.map((x: any) => ({ ...x })));
    setEPortfolio(portfolio.map((x: any) => ({ ...x })));
    setEditError('');
    setEditOpen(true);
  };

  const editUpload = async (file: File, kind: 'photo' | 'portfolio') => {
    setEditError('');
    setEditUploading(true);
    try {
      const { url } = await uploadImage(file);
      if (kind === 'photo') {
        setEPhoto(url);
      } else {
        setEPortfolio((cur) => [
          ...cur,
          {
            title: ePortfolioTitle.trim() || 'Portfolio work',
            media_url: url,
            type: file.type.startsWith('video/') ? 'video' : 'image',
          },
        ]);
        setEPortfolioTitle('');
      }
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setEditUploading(false);
    }
  };

  const addEditSocial = () => {
    const u = eSocUsername.trim().replace(/^@/, '');
    if (!u || !eSocUrl.trim()) {
      setEditError('Add a social username and profile URL.');
      return;
    }
    setESocials([
      ...eSocials,
      {
        platform: eSocPlatform,
        username: u,
        profile_url: eSocUrl.trim(),
        follower_count: Number(eSocFollowers) || 0,
      },
    ]);
    setESocUsername('');
    setESocUrl('');
    setESocFollowers('');
    setEditError('');
  };

  const addCustomType = () => {
    const msg = customTypeError(eTypeOther, eTypes);
    if (msg) {
      setEditError(msg);
      return;
    }
    setETypes([...eTypes, eTypeOther.trim().replace(/\s+/g, ' ')]);
    setETypeOther('');
    setETypeOtherOpen(false);
    setEditError('');
  };

  const toggleContent = (item: string) =>
    setEContent((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));

  const addCustomContent = () => {
    const msg = customTypeError(eContentOther, eContent).replace('creator type', 'content type');
    if (msg) {
      setEditError(msg);
      return;
    }
    setEContent([...eContent, eContentOther.trim().replace(/\s+/g, ' ')]);
    setEContentOther('');
    setEditError('');
  };

  const saveEdit = async () => {
    if (!eName.trim() || eUsername.trim().length < 3 || !eLocation.trim()) {
      setEditError('Name, location and a username of at least 3 characters are required.');
      return;
    }
    if (eTypes.length === 0) {
      setEditError('Choose at least one creator type.');
      return;
    }
    if (eSocials.length === 0) {
      setEditError('Keep at least one social account.');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      const saved: any = await saveCreatorProgress({
        display_name: eName.trim(),
        username: eUsername.trim(),
        location: eLocation.trim(),
        creator_type: eTypes.join(', '),
        content_types: eContent,
        bio: eBio.trim(),
        niches: eNiches.split(',').map((x) => x.trim()).filter(Boolean),
        socials: eSocials.map((x) => ({
          platform: x.platform,
          username: x.username,
          profile_url: x.profile_url,
          follower_count: Number(x.follower_count) || 0,
        })),
        portfolio: ePortfolio,
        ...(ePhoto ? { profile_image: ePhoto } : {}),
      } as any);

      if (saved?.profile) setProfile(saved.profile);
      if (saved?.socials) setSocials(saved.socials);
      updateProfile({
        display_name: eName.trim(),
        ...(ePhoto ? { profile_image: ePhoto } : {}),
      });
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Could not save your profile.');
    } finally {
      setEditSaving(false);
    }
  };

  const audienceLocations = Array.isArray(profile?.audience_location)
    ? profile.audience_location
    : [];

  const audienceAge = Array.isArray(profile?.audience_age_range)
    ? profile.audience_age_range
    : [];

  const audienceInterests = Array.isArray(profile?.audience_interests)
    ? profile.audience_interests
    : [];

  return (
    <div className="cp">
      <style>{`
        .cp {
          --coral: ${CORAL};
          --coral-dark: ${CORAL_DARK};
          --violet: ${VIOLET};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --ink-faint: #9b9ba3;
          --line: #e6e6ea;
          --surface: ${OFF_WHITE};
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          min-height: 100vh;
          background: var(--surface);
          color: var(--ink);
        }

        .cp * { box-sizing: border-box; }

        .cp-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }

        .cp-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-soft);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 4px;
        }

        .cp-back:hover { color: var(--ink); }

        .cp-body {
          max-width: 980px;
          margin: 0 auto;
          padding: 30px 24px 70px;
        }

        .cp-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(30, 42, 120, .035);
        }

        .cp-cover {
          height: 170px;
          background:
            radial-gradient(circle at 80% 20%, rgba(255,255,255,.22), transparent 28%),
            linear-gradient(120deg, var(--coral) 0%, var(--coral-dark) 54%, var(--violet) 125%);
        }

        .cp-header {
          padding: 0 34px 26px;
          position: relative;
        }

        .cp-avatar {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          border: 5px solid #fff;
          margin-top: -56px;
          background: var(--coral);
          color: #fff;
          font-size: 36px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 5px 18px rgba(0,0,0,.08);
        }

        .cp-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cp-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .cp-name {
          font-size: 27px;
          font-weight: 750;
          margin: 0;
          letter-spacing: -.02em;
        }

        .cp-username {
          font-size: 13.5px;
          color: var(--ink-soft);
          margin: 3px 0 11px;
        }

        .cp-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 20px;
          font-size: 13px;
          color: var(--ink-soft);
        }

        .cp-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .cp-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 650;
          color: #fff;
          background: var(--coral);
          border: none;
          padding: 10px 17px;
          border-radius: 10px;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
        }

        .cp-edit-btn:hover { background: var(--coral-dark); }

        .cp-tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 17px;
        }

        .cp-tag {
          font-size: 11.5px;
          font-weight: 650;
          padding: 6px 11px;
          border-radius: 999px;
          background: #F5F5F5;
          color: var(--coral-dark);
        }

        .cp-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 0 34px 26px;
        }

        .cp-stat {
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 15px;
          background: #fff;
        }

        .cp-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .cp-stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #F5F5F5;
          color: var(--coral-dark);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cp-stat-value {
          font-size: 20px;
          font-weight: 750;
          margin: 10px 0 2px;
        }

        .cp-stat-label {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 0;
        }

        .cp-section {
          padding: 26px 34px;
          border-top: 1px solid var(--line);
        }

        .cp-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .cp-section-title {
          font-size: 11.5px;
          font-weight: 750;
          letter-spacing: .07em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0;
        }

        .cp-section-sub {
          font-size: 12px;
          color: var(--ink-faint);
          margin: 0;
        }

        .cp-about {
          font-size: 14px;
          line-height: 1.75;
          color: var(--ink);
          background: #F7F7F7;
          border-radius: 13px;
          padding: 17px 18px;
          margin: 0;
        }

        .cp-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .cp-chip {
          font-size: 12px;
          font-weight: 400;
          padding: 7px 12px;
          border-radius: 999px;
          background: #F3F3F3;
          color: var(--violet);
        }

        .cp-social-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 11px;
        }

        .cp-social-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 13px 14px;
          text-decoration: none;
          color: inherit;
          transition: .15s ease;
        }

        .cp-social-card:hover {
          border-color: var(--coral);
          transform: translateY(-1px);
        }

        .cp-social-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #F5F5F5;
          color: var(--coral-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cp-social-platform {
          font-size: 12.5px;
          font-weight: 700;
          text-transform: capitalize;
          margin: 0;
        }

        .cp-social-handle {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 2px 0 0;
        }

        .cp-social-followers {
          margin-left: auto;
          font-size: 12px;
          font-weight: 750;
          white-space: nowrap;
        }

        .cp-audience-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 11px;
        }

        .cp-audience-card {
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 15px;
        }

        .cp-audience-label {
          font-size: 11px;
          color: var(--ink-soft);
          margin: 0 0 7px;
        }

        .cp-audience-value {
          font-size: 13px;
          line-height: 1.55;
          font-weight: 650;
          margin: 0;
        }

        .cp-portfolio-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(225px, 1fr));
          gap: 15px;
        }

        .cp-portfolio-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
        }

        .cp-portfolio-media {
          height: 165px;
          background: linear-gradient(135deg, #F2F2F2, #F5F5F5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-soft);
          position: relative;
        }

        .cp-portfolio-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cp-portfolio-media video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cp-portfolio-type {
          position: absolute;
          left: 10px;
          top: 10px;
          padding: 5px 8px;
          border-radius: 7px;
          background: rgba(255,255,255,.92);
          font-size: 10px;
          font-weight: 700;
          color: var(--violet);
        }

        .cp-portfolio-body {
          padding: 14px;
        }

        .cp-portfolio-title {
          font-size: 13.5px;
          font-weight: 700;
          margin: 0 0 4px;
        }

        .cp-portfolio-desc {
          font-size: 12px;
          color: var(--ink-soft);
          margin: 0;
          line-height: 1.55;
        }

        .cp-portfolio-platform {
          font-size: 10.5px;
          font-weight: 650;
          color: var(--coral-dark);
          margin: 8px 0 0;
        }

        .cp-history {
          display: grid;
          gap: 9px;
        }

        .cp-history-item {
          display: flex;
          align-items: center;
          gap: 13px;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 13px 15px;
        }

        .cp-history-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #F3F3F3;
          color: var(--violet);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cp-history-title {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
        }

        .cp-history-meta {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 3px 0 0;
        }

        .cp-history-status {
          margin-left: auto;
          font-size: 10.5px;
          font-weight: 700;
          padding: 5px 9px;
          border-radius: 999px;
          background: #eafbf1;
          color: #168544;
        }

        .cp-empty {
          border: 1px dashed #d9d8df;
          background: #FAFAFA;
          border-radius: 13px;
          padding: 22px;
          text-align: center;
          color: var(--ink-soft);
          font-size: 13px;
        }

        .cp-empty strong {
          display: block;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .cp-empty-link {
          display: inline-flex;
          margin-top: 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--coral-dark);
          text-decoration: none;
        }

        .cp-payment-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          background: #fff;
          padding: 18px;
        }
        .cp-payment-copy { margin-bottom: 13px; }
        .cp-payment-title { margin: 0; font-size: 14px; font-weight: 800; color: var(--ink); }
        .cp-payment-desc { margin: 4px 0 0; color: var(--ink-soft); font-size: 11.5px; line-height: 1.55; max-width: 620px; }
        .cp-payment-form { display: flex; gap: 9px; max-width: 620px; }
        .cp-payment-input { flex: 1; min-width: 0; height: 42px; border: 1px solid #DBDBDB; border-radius: 10px; padding: 0 12px; background: #fff; color: var(--ink); font: inherit; font-size: 12px; outline: none; }
        .cp-payment-input:focus { border-color: var(--violet); box-shadow: 0 0 0 3px rgba(17,17,17,.09); }
        .cp-payment-save { min-width: 78px; height: 42px; border: 0; border-radius: 10px; background: var(--violet); color: #fff; font-size: 11.5px; font-weight: 750; cursor: pointer; }
        .cp-payment-save:hover { background: #000000; }
        .cp-payment-note { margin: 9px 0 0; color: var(--ink-faint); font-size: 10px; line-height: 1.5; }

        .cp-danger-zone {
          border: 1px solid #f3caca;
          background: #F7F7F7;
          border-radius: 13px;
          padding: 17px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .cp-danger-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #b3261e;
          margin: 0;
        }

        .cp-danger-desc {
          font-size: 12.5px;
          color: var(--ink-soft);
          margin: 3px 0 0;
          max-width: 540px;
          line-height: 1.5;
        }

        .cp-danger-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 650;
          color: #b3261e;
          background: #fff;
          border: 1.5px solid #f0b4b4;
          border-radius: 9px;
          padding: 9px 16px;
          cursor: pointer;
        }

        .cp-danger-btn:hover {
          background: #fdecec;
        }

        .cp-inline-input {
          width: 100%;
          height: 36px;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 0 11px;
          font-size: 13px;
          font-weight: 400;
          font-family: inherit;
          color: var(--ink);
          outline: none;
          background: #fff;
        }
        textarea.cp-inline-input { height: auto; padding: 9px 11px; line-height: 1.55; resize: vertical; }
        .cp-inline-input::placeholder { color: var(--ink-faint); font-weight: 400; }
        .cp-inline-input:focus { border-color: #111; }
        .cp-edit-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 14px;
          width: min(580px, 100%);
          align-items: start;
        }
        .cp-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .cp-field-label { font-size: 11px; font-weight: 400; color: var(--ink-soft); }
        .cp-inline-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; max-width: 580px; }
        .cp-inline-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          height: 32px; padding: 0 13px;
          border: 1px solid var(--line); background: #fff; color: var(--ink);
          border-radius: 8px; font-size: 12px; font-weight: 400; font-family: inherit; line-height: 1; cursor: pointer;
          white-space: nowrap;
        }
        .cp-inline-btn:hover { border-color: #bbb; }
        .cp-inline-btn:disabled { opacity: .6; cursor: default; }
        .cp-inline-btn--dark { background: #111; border-color: #111; color: #fff; }
        .cp-inline-btn--dark:hover { background: #000; border-color: #000; }
        .cp-inline-list-row {
          display: flex; justify-content: space-between; align-items: center;
          height: 36px; padding: 0 12px; border: 1px solid var(--line); border-radius: 8px;
          margin-bottom: 8px; font-size: 13px; font-weight: 400; background: #fff; max-width: 580px;
        }
        .cp-inline-list-row button { background: none; border: 0; cursor: pointer; color: var(--ink-soft); display: flex; padding: 0; }
        .cp-edit-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
        button.cp-edit-btn { height: 32px; padding: 0 13px; font-size: 12px; font-weight: 400; border: 0; cursor: pointer; font-family: inherit; }
        button.cp-empty-link { background: none; border: 0; padding: 0; cursor: pointer; font: inherit; text-align: left; }
        .cp-edit-error { margin: 12px 22px 0; padding: 9px 13px; border-radius: 8px; background: #fdecea; color: #b3261e; font-size: 12.5px; font-weight: 400; }

        .cp-sugg-wrap { position: relative; }
        .cp-sugg-menu {
          position: absolute; z-index: 60; left: 0; right: 0; top: calc(100% + 4px);
          max-height: 200px; overflow-y: auto; padding: 5px; background: #fff;
          border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 14px 30px rgba(0,0,0,.08);
        }
        .cp-sugg-item {
          display: block; width: 100%; text-align: left; background: #fff; border: 0; border-radius: 6px;
          padding: 8px 10px; font-size: 12.5px; font-weight: 400; font-family: inherit; color: var(--ink); cursor: pointer;
        }
        .cp-sugg-item:hover, .cp-sugg-item.is-selected { background: #f4f4f5; }
        .cp-sugg-empty { padding: 9px 10px; font-size: 11.5px; color: var(--ink-soft); }

        .cp-type-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .cp-type-tags:empty { display: none; }
        .cp-type-tag {
          display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px;
          border: 1px solid var(--line); border-radius: 99px; background: #f6f6f7;
          font-size: 12px; font-weight: 400; font-family: inherit; color: var(--ink); cursor: pointer;
        }
        .cp-type-tag span { color: var(--ink-soft); }
        .cp-chip-toggle {
          height: 30px; padding: 0 13px; border: 1px solid var(--line); border-radius: 99px; background: #fff;
          font-size: 12px; font-weight: 400; font-family: inherit; color: var(--ink); cursor: pointer;
        }
        .cp-chip-toggle:hover { border-color: #bbb; }
        .cp-chip-toggle.is-on { background: #111; border-color: #111; color: #fff; }
        .cp-type-add { max-width: 280px; }
        .cp-type-other { display: flex; gap: 8px; max-width: 280px; }
        .cp-type-other .cp-inline-btn { flex: none; }

        @media (max-width: 640px) { .cp-edit-grid, .cp-inline-row { grid-template-columns: 1fr; } }

        .cp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(17,18,23,.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
        }

        .cp-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 410px;
          padding: 24px;
          position: relative;
        }

        .cp-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          color: var(--ink-soft);
          cursor: pointer;
          padding: 4px;
          display: flex;
        }

        .cp-modal-title {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .cp-modal-desc {
          font-size: 13px;
          color: var(--ink-soft);
          line-height: 1.55;
          margin: 0 0 16px;
        }

        .cp-modal-input {
          width: 100%;
          border: 1.5px solid var(--line);
          border-radius: 9px;
          padding: 11px 13px;
          font-size: 14px;
          outline: none;
        }

        .cp-modal-input:focus {
          border-color: #b3261e;
        }

        .cp-modal-error {
          font-size: 12px;
          color: #b3261e;
          margin: 6px 0 0;
        }

        .cp-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .cp-modal-cancel,
        .cp-modal-confirm {
          flex: 1;
          padding: 10px;
          border-radius: 9px;
          font-size: 13.5px;
          font-weight: 650;
          cursor: pointer;
        }

        .cp-modal-cancel {
          border: 1.5px solid var(--line);
          background: #fff;
          color: var(--ink);
        }

        .cp-modal-confirm {
          border: none;
          background: #b3261e;
          color: #fff;
        }

        .cp-modal-confirm:disabled {
          opacity: .6;
          cursor: default;
        }

        .cp-loading,
        .cp-error {
          text-align: center;
          padding: 90px 20px;
          color: var(--ink-soft);
          font-size: 14px;
        }

        @media (max-width: 760px) {
          .cp-topbar { padding: 14px 18px; }
          .cp-body { padding: 20px 12px 50px; }
          .cp-header, .cp-section { padding-left: 20px; padding-right: 20px; }
          .cp-stats { grid-template-columns: repeat(2, 1fr); padding-left: 20px; padding-right: 20px; }
          .cp-audience-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <PublicNavbar />

      <div className="cp-body">
        {loading ? (
          <div className="cp-loading">Loading your profile...</div>
        ) : error ? (
          <div className="cp-error">{error}</div>
        ) : (
          <div className="cp-card">
            <div className="cp-cover" />

            <div className="cp-header">
              <div
                className="cp-avatar"
                style={!editOpen && profile?.profile_image ? { cursor: 'zoom-in' } : undefined}
                onClick={() => {
                  if (!editOpen && profile?.profile_image) {
                    setViewer({ src: profile.profile_image, alt: displayName });
                  }
                }}
              >
                {(editOpen ? ePhoto : profile?.profile_image) ? (
                  <img src={editOpen ? ePhoto : profile.profile_image} alt={displayName} />
                ) : (
                  initial
                )}
              </div>

              <div className="cp-header-row">
                <div>
                  {editOpen ? (
                    <div className="cp-edit-grid">
                      <label className="cp-inline-btn cp-photo-btn" style={{ gridColumn: '1 / -1', justifySelf: 'start', cursor: 'pointer' }}>
                        {editUploading ? 'Uploading…' : ePhoto ? 'Change photo' : 'Add photo (optional)'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={editUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void editUpload(f, 'photo');
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>

                      <div className="cp-field">
                        <span className="cp-field-label">Creator name</span>
                        <input className="cp-inline-input" value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Creator name" />
                      </div>

                      <div className="cp-field">
                        <span className="cp-field-label">Username</span>
                        <input className="cp-inline-input" value={eUsername} onChange={(e) => setEUsername(e.target.value)} placeholder="Username" />
                      </div>

                      <div className="cp-field">
                        <span className="cp-field-label">Location</span>
                        <LocationInput value={eLocation} onChange={setELocation} />
                      </div>

                      <div className="cp-field">
                        <span className="cp-field-label">Niches</span>
                        <input
                          className="cp-inline-input"
                          value={eNiches}
                          onChange={(e) => setENiches(e.target.value)}
                          placeholder="Fashion, Food"
                        />
                      </div>

                      <div className="cp-field" style={{ gridColumn: '1 / -1' }}>
                        <span className="cp-field-label">Creator type</span>
                        <div className="cp-type-tags">
                          {eTypes.map((t) => (
                            <button
                              type="button"
                              key={t}
                              className="cp-type-tag"
                              onClick={() => setETypes(eTypes.filter((x) => x !== t))}
                              aria-label={`Remove ${t}`}
                            >
                              {t} <span>×</span>
                            </button>
                          ))}
                        </div>

                        <div className="cp-type-add">
                          <select
                            className="cp-inline-input"
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '__other') {
                                setETypeOtherOpen(true);
                              } else if (v) {
                                setETypes([...eTypes, v]);
                              }
                            }}
                          >
                            <option value="">Add a creator type…</option>
                            {TYPES.filter((t) => t !== 'Other' && !eTypes.includes(t)).map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                            <option value="__other">Other (type your own)</option>
                          </select>
                        </div>

                        {eTypeOtherOpen && (
                          <div className="cp-type-other">
                            <input
                              className="cp-inline-input"
                              value={eTypeOther}
                              maxLength={30}
                              onChange={(e) => setETypeOther(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addCustomType();
                                }
                              }}
                              placeholder="e.g. Food Reviewer"
                            />
                            <button type="button" className="cp-inline-btn cp-inline-btn--dark" onClick={addCustomType}>Add</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="cp-name">{displayName}</h1>

                      {profile?.username && (
                        <p className="cp-username">@{profile.username}</p>
                      )}
                    </>
                  )}

                  <div className="cp-meta">
                    {!editOpen && profile?.creator_type && (
                      <span>
                        <Sparkles size={13} />
                        {profile.creator_type}
                      </span>
                    )}

                    {!editOpen && profile?.location && (
                      <span>
                        <MapPin size={13} />
                        {profile.location}
                      </span>
                    )}

                    {!editOpen && languages.length > 0 && (
                      <span>
                        <Globe size={13} />
                        {languages.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {editOpen ? (
                  <div className="cp-edit-actions">
                    <button type="button" className="cp-inline-btn" onClick={() => setEditOpen(false)} disabled={editSaving}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cp-inline-btn cp-inline-btn--dark"
                      onClick={() => void saveEdit()}
                      disabled={editSaving || editUploading}
                    >
                      {editSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                ) : (
                  <button type="button" className="cp-edit-btn" onClick={openEdit}>
                    <Pencil size={13} />
                    Edit Profile
                  </button>
                )}
              </div>

              {editOpen ? null : categories.length > 0 && (
                <div className="cp-tag-row">
                  {categories.slice(0, 10).map((category: string) => (
                    <span className="cp-tag" key={category}>
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {editOpen && editError && <div className="cp-edit-error">{editError}</div>}

            {(editOpen || profile?.bio) && (
              <section className="cp-section">
                <div className="cp-section-heading">
                  <p className="cp-section-title">About</p>
                </div>
                {editOpen ? (
                  <textarea
                    className="cp-inline-input"
                    rows={4}
                    value={eBio}
                    onChange={(e) => setEBio(e.target.value)}
                    placeholder="Tell brands about yourself"
                  />
                ) : (
                  <p className="cp-about">{profile.bio}</p>
                )}
              </section>
            )}

            {(editOpen || contentTypes.length > 0) && (
              <section className="cp-section">
                <div className="cp-section-heading">
                  <p className="cp-section-title">Content & Specialties</p>
                </div>

                {editOpen ? (
                  <div>
                    <div className="cp-chip-row">
                      {[...CONTENT, ...eContent.filter((x) => !CONTENT.includes(x))].map((item) => (
                        <button
                          type="button"
                          key={item}
                          className={`cp-chip-toggle${eContent.includes(item) ? ' is-on' : ''}`}
                          onClick={() => toggleContent(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <div className="cp-type-other" style={{ marginTop: 10 }}>
                      <input
                        className="cp-inline-input"
                        value={eContentOther}
                        maxLength={30}
                        placeholder="Other content type"
                        onChange={(e) => setEContentOther(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomContent();
                          }
                        }}
                      />
                      <button type="button" className="cp-inline-btn cp-inline-btn--dark" onClick={addCustomContent}>Add</button>
                    </div>
                  </div>
                ) : (
                  <div className="cp-chip-row">
                    {contentTypes.map((item: string) => (
                      <span className="cp-chip" key={item}>{item}</span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="cp-section">
              <div className="cp-section-heading">
                <p className="cp-section-title">Social Platforms</p>
                <p className="cp-section-sub">
                  {socials.length} connected
                </p>
              </div>

              {editOpen ? (
                <div>
                  {eSocials.map((x, i) => (
                    <div className="cp-inline-list-row" key={`${x.platform}-${i}`}>
                      <span>{x.platform} · @{x.username}</span>
                      <button type="button" aria-label="Remove" onClick={() => setESocials(eSocials.filter((_, n) => n !== i))}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="cp-inline-row">
                    <select className="cp-inline-input" value={eSocPlatform} onChange={(e) => setESocPlatform(e.target.value)}>
                      {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Other'].map((p) => <option key={p}>{p}</option>)}
                    </select>
                    <input className="cp-inline-input" value={eSocUsername} onChange={(e) => setESocUsername(e.target.value)} placeholder="@username" />
                    <input className="cp-inline-input" value={eSocUrl} onChange={(e) => setESocUrl(e.target.value)} placeholder="Profile URL" />
                    <input className="cp-inline-input" type="number" min="0" value={eSocFollowers} onChange={(e) => setESocFollowers(e.target.value)} placeholder="Followers" />
                  </div>
                  <button type="button" className="cp-inline-btn" style={{ marginTop: 8 }} onClick={addEditSocial}>
                    Add social account
                  </button>
                </div>
              ) : socials.length === 0 ? (
                <div className="cp-empty">
                  <strong>Build trust with your social presence</strong>
                  Add your social platforms and audience size to help brands understand your reach.
                  <button type="button" className="cp-empty-link" onClick={openEdit}>
                    Add social accounts →
                  </button>
                </div>
              ) : (
                <div className="cp-social-grid">
                  {socials.map((social: any) => {
                    const platform = String(social.platform || '').toLowerCase();
                    const Icon = PLATFORM_ICON[platform] || Link2;

                    return (
                      <a
                        key={`${platform}-${social.username}`}
                        className="cp-social-card"
                        href={social.profile_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="cp-social-icon">
                          <Icon size={17} />
                        </span>

                        <span>
                          <p className="cp-social-platform">
                            {social.platform || 'Social'}
                          </p>
                          <p className="cp-social-handle">
                            @{social.username || 'profile'}
                          </p>
                        </span>

                        {Number(social.follower_count || 0) > 0 && (
                          <span className="cp-social-followers">
                            {formatFollowers(Number(social.follower_count))}
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </section>

            {(audienceLocations.length > 0 ||
              audienceAge.length > 0 ||
              audienceInterests.length > 0) && (
              <section className="cp-section">
                <div className="cp-section-heading">
                  <p className="cp-section-title">Audience</p>
                  <p className="cp-section-sub">Who you reach</p>
                </div>

                <div className="cp-audience-grid">
                  {audienceLocations.length > 0 && (
                    <div className="cp-audience-card">
                      <p className="cp-audience-label">Top locations</p>
                      <p className="cp-audience-value">
                        {audienceLocations.join(', ')}
                      </p>
                    </div>
                  )}

                  {audienceAge.length > 0 && (
                    <div className="cp-audience-card">
                      <p className="cp-audience-label">Age range</p>
                      <p className="cp-audience-value">
                        {audienceAge.join(', ')}
                      </p>
                    </div>
                  )}

                  {audienceInterests.length > 0 && (
                    <div className="cp-audience-card">
                      <p className="cp-audience-label">Interests</p>
                      <p className="cp-audience-value">
                        {audienceInterests.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="cp-section">
              <div className="cp-section-heading">
                <p className="cp-section-title">Portfolio</p>
                <p className="cp-section-sub">
                  {portfolio.length} project{portfolio.length === 1 ? '' : 's'}
                </p>
              </div>

              {editOpen ? (
                <div>
                  {ePortfolio.map((x, i) => (
                    <div className="cp-inline-list-row" key={`${x.media_url}-${i}`}>
                      <span>{x.title}</span>
                      <button type="button" aria-label="Remove" onClick={() => setEPortfolio(ePortfolio.filter((_, n) => n !== i))}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, maxWidth: 580 }}>
                    <input className="cp-inline-input" value={ePortfolioTitle} onChange={(e) => setEPortfolioTitle(e.target.value)} placeholder="Work title (optional)" />
                    <label className="cp-inline-btn" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      {editUploading ? 'Uploading…' : 'Add work'}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        hidden
                        disabled={editUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void editUpload(f, 'portfolio');
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : portfolio.length === 0 ? (
                <div className="cp-empty">
                  <strong>Your portfolio is your strongest selling point</strong>
                  Add examples of your best content, UGC, reels, photos or campaign work.
                  <button type="button" className="cp-empty-link" onClick={openEdit}>
                    Add portfolio work →
                  </button>
                </div>
              ) : (
                <div className="cp-portfolio-grid">
                  {portfolio.map((item: any, index: number) => {
                    const isVideo =
                      String(item.type || '').toLowerCase() === 'video';

                    return (
                      <article className="cp-portfolio-card" key={`${item.title}-${index}`}>
                        <div className="cp-portfolio-media">
                          {item.media_url ? (
                            isVideo ? (
                              <video
                                src={item.media_url}
                                controls
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={item.media_url}
                                alt={item.title || 'Portfolio project'}
                                style={{ cursor: 'zoom-in' }}
                                onClick={() => setViewer({ src: item.media_url, alt: item.title, type: 'image' })}
                              />
                            )
                          ) : (
                            <ImageIcon size={28} />
                          )}

                          {item.type && (
                            <span className="cp-portfolio-type">
                              {item.type}
                            </span>
                          )}
                        </div>

                        <div className="cp-portfolio-body">
                          <p className="cp-portfolio-title">
                            {item.title || 'Untitled project'}
                          </p>

                          {item.description && (
                            <p className="cp-portfolio-desc">
                              {item.description}
                            </p>
                          )}

                          {item.platform && (
                            <p className="cp-portfolio-platform">
                              {item.platform}
                            </p>
                          )}

                          {item.media_url && (
                            <a
                              href={item.media_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                marginTop: 8,
                                fontSize: 11.5,
                                color: CORAL_DARK,
                                fontWeight: 650,
                                textDecoration: 'none',
                              }}
                            >
                              Open project
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="cp-section">
              <div className="cp-section-heading">
                <p className="cp-section-title">Collaboration History</p>
                <p className="cp-section-sub">
                  {completedApps.length} completed
                </p>
              </div>

              {acceptedApps.length === 0 ? (
                <div className="cp-empty">
                  <strong>Your collaboration history will appear here</strong>
                  Accepted and completed campaigns will automatically build this section.
                  <Link className="cp-empty-link" to="/campaigns">
                    Browse campaigns →
                  </Link>
                </div>
              ) : (
                <div className="cp-history">
                  {acceptedApps.slice(0, 6).map((app: any) => (
                    <div className="cp-history-item" key={app.id}>
                      <span className="cp-history-icon">
                        <Briefcase size={17} />
                      </span>

                      <span>
                        <p className="cp-history-title">
                          {app.campaign_title || `Campaign #${app.campaign_id}`}
                        </p>
                        <p className="cp-history-meta">
                          Applied {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </span>

                      <span className="cp-history-status">
                        {app.status === 'completed' ? 'Completed' : 'Accepted'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="cp-section">
              <p className="cp-section-title">Account</p>

              <div className="cp-danger-zone">
                <div>
                  <p className="cp-danger-title">Delete account</p>
                  <p className="cp-danger-desc">
                    Permanently deletes your creator account and associated profile data.
                    This action cannot be undone.
                  </p>
                </div>

                <button
                  type="button"
                  className="cp-danger-btn"
                  onClick={() => {
                    setDeletePassword('');
                    setDeleteError('');
                    setShowDeleteModal(true);
                  }}
                >
                  <Trash2 size={14} />
                  Delete Account
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <PublicProfileStyles />
      <Lightbox item={viewer} onClose={() => setViewer(null)} />

      {showDeleteModal && (
        <div
          className="cp-modal-overlay"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cp-modal-close"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h2 className="cp-modal-title">Delete your account?</h2>

            <p className="cp-modal-desc">
              This permanently deletes your account and everything tied to it.
              Enter your current password to continue.
            </p>

            <form onSubmit={handleDeleteAccount}>
              <input
                type="password"
                className="cp-modal-input"
                placeholder="Current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />

              {deleteError && (
                <div className="cp-modal-error">{deleteError}</div>
              )}

              <div className="cp-modal-actions">
                <button
                  type="button"
                  className="cp-modal-cancel"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cp-modal-confirm"
                  disabled={deleting || !deletePassword.trim()}
                >
                  {deleting ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatorProfile;
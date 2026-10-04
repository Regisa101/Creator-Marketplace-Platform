import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Globe,
  Pencil,
  Phone,
  Building2,
  Users,
  Trash2,
  X,
  Briefcase,
  ArrowUpRight,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import {
  getBusinessProgress,
  getCampaigns,
  saveBusinessProgress,
  uploadImage,
} from '../api/client';
import { LocationInput } from '../components/LocationInput';
import { INDUSTRIES, LOCATIONS } from './onboarding/BusinessOnboarding';
import { OFF_WHITE } from '../components/Brand';
import { PublicNavbar } from '../components/PublicNavbar';
import { Lightbox, PublicProfileStyles, type LightboxItem } from '../components/PublicProfileKit';

const VIOLET = '#111111';
const VIOLET_DARK = '#000000';
const CORAL = '#111111';

export function BusinessProfile() {
  const { user, deleteAccount, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [viewer, setViewer] = useState<LightboxItem | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit profile (done here on the profile page, not in onboarding)
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [editError, setEditError] = useState('');
  const [eLogo, setELogo] = useState('');
  const [eName, setEName] = useState('');
  const [eIndustry, setEIndustry] = useState('');
  const [eLocation, setELocation] = useState('');
  const [eWebsite, setEWebsite] = useState('');
  const [eDescription, setEDescription] = useState('');
  const [eContactPhone, setEContactPhone] = useState('');
  const [eTeam, setETeam] = useState('');
  const [eYear, setEYear] = useState('');
  const [eBudget, setEBudget] = useState('');
  const [eCategories, setECategories] = useState('');
  const [eContentTypes, setEContentTypes] = useState('');
  const [eSocial, setESocial] = useState({ company: '', instagram: '', facebook: '', other: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [profileData, campaignData] =
          await Promise.all([
            getBusinessProgress(),
            getCampaigns({ limit: 50 }),
          ]);

        if (!cancelled) {
          setProfile(profileData?.profile ?? null);
          setCampaigns(campaignData?.campaigns ?? []);
        }
      } catch (err) {
        console.error('Could not load profile:', err);
        if (!cancelled) {
          setError('Could not load your profile right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const openEdit = () => {
    setELogo(profile?.logo_url || '');
    setEName(profile?.company_name || '');
    setEIndustry(profile?.industry || '');
    setELocation(profile?.location || '');
    setEWebsite(profile?.website || '');
    setEDescription(profile?.description || '');
    setEContactPhone(profile?.contact_phone || '');
    setETeam(profile?.team_size || '');
    setEYear(profile?.year_established ? String(profile.year_established) : '');
    setEBudget(Number(profile?.typical_budget || 0) > 0 ? String(profile.typical_budget) : '');
    setECategories(categories.join(', '));
    setEContentTypes(contentTypes.join(', '));
    setESocial({
      company: profile?.social_links?.company || '',
      instagram: profile?.social_links?.instagram || '',
      facebook: profile?.social_links?.facebook || '',
      other: profile?.social_links?.other || '',
    });
    setEditError('');
    setEditOpen(true);
  };

  const uploadLogo = async (file: File) => {
    setEditError('');
    setEditUploading(true);
    try {
      const { url } = await uploadImage(file);
      setELogo(url);
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setEditUploading(false);
    }
  };

  const splitList = (value: string) =>
    Array.from(new Set(value.split(',').map((x) => x.trim()).filter(Boolean)));

  const saveEdit = async () => {
    if (!eName.trim()) {
      setEditError('Company name is required.');
      return;
    }
    const year = eYear.trim() ? Number(eYear) : undefined;
    if (year !== undefined && (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear())) {
      setEditError('Enter a valid year of establishment.');
      return;
    }
    const budget = eBudget.trim() ? Number(eBudget) : undefined;
    if (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) {
      setEditError('Typical campaign budget must be a positive number.');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      const saved: any = await saveBusinessProgress({
        company_name: eName.trim(),
        industry: eIndustry || undefined,
        location: eLocation.trim() || undefined,
        website: eWebsite.trim() || undefined,
        description: eDescription.trim() || undefined,
        contact_phone: eContactPhone.trim() || undefined,
        team_size: eTeam.trim() || undefined,
        year_established: year,
        typical_budget: budget,
        interested_categories: splitList(eCategories),
        preferred_content_types: splitList(eContentTypes),
        social_links: {
          company: eSocial.company.trim() || undefined,
          instagram: eSocial.instagram.trim() || undefined,
          facebook: eSocial.facebook.trim() || undefined,
          other: eSocial.other.trim() || undefined,
        },
        ...(eLogo ? { logo_url: eLogo } : {}),
      });

      if (saved?.profile) setProfile(saved.profile);
      updateProfile({
        company_name: eName.trim(),
        ...(eLogo ? { logo_url: eLogo } : {}),
      });
      setEditOpen(false);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setEditError(typeof detail === 'string' ? detail : 'Could not save your profile.');
    } finally {
      setEditSaving(false);
    }
  };

  const companyName =
    profile?.company_name ||
    user?.full_name ||
    'Business';

  const initial =
    companyName[0]?.toUpperCase() ?? 'B';


  const categories = Array.isArray(profile?.interested_categories)
    ? profile.interested_categories
    : [];

  const contentTypes = Array.isArray(
    profile?.preferred_content_types
  )
    ? profile.preferred_content_types
    : [];

  return (
    <div className="bp">
      <style>{`
        .bp {
          --violet: ${VIOLET};
          --violet-dark: ${VIOLET_DARK};
          --coral: ${CORAL};
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

        .bp * { box-sizing: border-box; }

        .bp-topbar {
          display: flex;
          align-items: center;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }

        .bp-back {
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

        .bp-back:hover { color: var(--ink); }

        .bp-body {
          max-width: 980px;
          margin: 0 auto;
          padding: 30px 24px 70px;
        }

        .bp-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(17,17,17,.035);
        }

        .bp-cover {
          height: 170px;
          background:
            radial-gradient(circle at 18% 22%, rgba(255,255,255,.18), transparent 28%),
            linear-gradient(120deg, var(--violet) 0%, var(--violet-dark) 56%, var(--coral) 130%);
        }

        .bp-header {
          padding: 0 34px 26px;
          position: relative;
        }

        .bp-avatar {
          width: 112px;
          height: 112px;
          border-radius: 25px;
          border: 5px solid #fff;
          margin-top: -56px;
          background: var(--violet);
          color: #fff;
          font-size: 36px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 5px 18px rgba(0,0,0,.08);
        }

        .bp-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bp-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .bp-name {
          font-size: 27px;
          font-weight: 750;
          margin: 0;
          letter-spacing: -.02em;
        }

        .bp-type {
          font-size: 13.5px;
          color: var(--ink-soft);
          margin: 3px 0 11px;
        }

        .bp-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 20px;
          font-size: 13px;
          color: var(--ink-soft);
        }

        .bp-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .bp-meta a {
          color: inherit;
          text-decoration: none;
        }

        .bp-meta a:hover {
          color: var(--violet);
        }

        .bp-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 650;
          color: #fff;
          background: var(--violet);
          border: none;
          padding: 10px 17px;
          border-radius: 10px;
          text-decoration: none;
          white-space: nowrap;
        }

        .bp-edit-btn:hover { background: var(--violet-dark); }

        .bp-tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 17px;
        }

        .bp-tag {
          font-size: 11.5px;
          font-weight: 650;
          padding: 6px 11px;
          border-radius: 999px;
          background: #F3F3F3;
          color: var(--violet-dark);
        }

        .bp-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 0 34px 26px;
        }

        .bp-stat {
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 15px;
        }

        .bp-stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #F3F3F3;
          color: var(--violet);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bp-stat-value {
          font-size: 20px;
          font-weight: 750;
          margin: 10px 0 2px;
        }

        .bp-stat-label {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 0;
        }

        .bp-section {
          padding: 26px 34px;
          border-top: 1px solid var(--line);
        }

        .bp-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .bp-section-title {
          font-size: 11.5px;
          font-weight: 750;
          letter-spacing: .07em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0;
        }

        .bp-section-sub {
          font-size: 12px;
          color: var(--ink-faint);
          margin: 0;
        }

        .bp-about {
          font-size: 14px;
          line-height: 1.75;
          color: var(--ink);
          background: #F7F7F7;
          border-radius: 13px;
          padding: 17px 18px;
          margin: 0;
          white-space: pre-wrap;
        }

        .bp-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .bp-chip {
          font-size: 12px;
          font-weight: 600;
          padding: 7px 12px;
          border-radius: 999px;
          background: #F3F3F3;
          color: var(--violet);
        }

        .bp-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 11px;
        }

        .bp-info-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 14px;
          min-width: 0;
        }

        .bp-info-icon {
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

        .bp-info-label {
          font-size: 11px;
          color: var(--ink-soft);
          margin: 0;
        }

        .bp-info-value {
          font-size: 13px;
          font-weight: 650;
          margin: 2px 0 0;
          overflow-wrap: anywhere;
        }

        .bp-info-value a {
          color: inherit;
          text-decoration: none;
        }

        .bp-campaign-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 14px;
        }

        .bp-campaign-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          background: #fff;
          text-decoration: none;
          color: inherit;
        }

        .bp-campaign-card:hover {
          border-color: #C5C5C5;
          transform: translateY(-1px);
        }

        .bp-campaign-image {
          height: 125px;
          background: linear-gradient(135deg, #F3F3F3, #F5F5F5);
          overflow: hidden;
        }

        .bp-campaign-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bp-campaign-body {
          padding: 13px 14px;
        }

        .bp-campaign-status {
          font-size: 10px;
          font-weight: 700;
          color: var(--violet);
          text-transform: uppercase;
          letter-spacing: .04em;
          margin: 0 0 5px;
        }

        .bp-campaign-title {
          font-size: 13.5px;
          font-weight: 700;
          margin: 0;
          line-height: 1.4;
        }

        .bp-campaign-meta {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 11px;
          color: var(--ink-soft);
          margin-top: 8px;
        }

        .bp-creators {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 10px;
        }

        .bp-creator-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 13px;
          padding: 13px 14px;
        }

        .bp-creator-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #F3F3F3;
          color: var(--violet);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 750;
          flex-shrink: 0;
          overflow: hidden;
        }

        .bp-creator-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bp-creator-name {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
        }

        .bp-creator-meta {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 3px 0 0;
        }

        .bp-empty {
          border: 1px dashed #d9d8df;
          background: #FAFAFA;
          border-radius: 13px;
          padding: 22px;
          text-align: center;
          color: var(--ink-soft);
          font-size: 13px;
        }

        .bp-empty strong {
          display: block;
          color: var(--ink);
          margin-bottom: 4px;
        }

        .bp-empty-link {
          display: inline-flex;
          margin-top: 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--violet);
          text-decoration: none;
        }

        .bp-danger-zone {
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

        .bp-danger-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #b3261e;
          margin: 0;
        }

        .bp-danger-desc {
          font-size: 12.5px;
          color: var(--ink-soft);
          margin: 3px 0 0;
          max-width: 540px;
          line-height: 1.5;
        }

        .bp-danger-btn {
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

        .bp-danger-btn:hover {
          background: #fdecec;
        }

        .bp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(17,18,23,.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
        }

        .bp-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 410px;
          padding: 24px;
          position: relative;
        }

        .bp-modal-close {
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

        .bp-modal-title {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .bp-modal-desc {
          font-size: 13px;
          color: var(--ink-soft);
          line-height: 1.55;
          margin: 0 0 16px;
        }

        .bp-modal-input {
          width: 100%;
          border: 1.5px solid var(--line);
          border-radius: 9px;
          padding: 11px 13px;
          font-size: 14px;
          outline: none;
        }

        .bp-modal-input:focus {
          border-color: #b3261e;
        }

        .bp-modal-error {
          font-size: 12px;
          color: #b3261e;
          margin: 6px 0 0;
        }

        .bp-modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        .bp-modal-cancel,
        .bp-modal-confirm {
          flex: 1;
          padding: 10px;
          border-radius: 9px;
          font-size: 13.5px;
          font-weight: 650;
          cursor: pointer;
        }

        .bp-modal-cancel {
          border: 1.5px solid var(--line);
          background: #fff;
          color: var(--ink);
        }

        .bp-modal-confirm {
          border: none;
          background: #b3261e;
          color: #fff;
        }

        .bp-modal-confirm:disabled {
          opacity: .6;
          cursor: default;
        }

        .bp-inline-input {
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
        textarea.bp-inline-input { height: auto; padding: 9px 11px; line-height: 1.55; resize: vertical; }
        .bp-inline-input::placeholder { color: var(--ink-faint); }
        .bp-inline-input:focus { border-color: #111; }
        .bp-edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px; width: min(620px, 100%); align-items: start; }
        .bp-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .bp-field-label { font-size: 11px; font-weight: 400; color: var(--ink-soft); }
        .bp-inline-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          height: 32px; padding: 0 13px; border: 1px solid var(--line); background: #fff; color: var(--ink);
          border-radius: 8px; font-size: 12px; font-weight: 400; font-family: inherit; line-height: 1; cursor: pointer; white-space: nowrap;
        }
        .bp-inline-btn:hover { border-color: #bbb; }
        .bp-inline-btn:disabled { opacity: .6; cursor: default; }
        .bp-inline-btn--dark { background: #111; border-color: #111; color: #fff; }
        .bp-inline-btn--dark:hover { background: #000; border-color: #000; }
        .bp-edit-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
        button.bp-edit-btn { height: 32px; padding: 0 13px; font-size: 12px; font-weight: 400; border: 0; cursor: pointer; font-family: inherit; }
        .bp-edit-error { margin: 12px 28px 0; padding: 9px 13px; border-radius: 8px; background: #fdecea; color: #b3261e; font-size: 12.5px; }
        @media (max-width: 640px) { .bp-edit-grid { grid-template-columns: 1fr; } }

        .bp-loading,
        .bp-error {
          text-align: center;
          padding: 90px 20px;
          color: var(--ink-soft);
          font-size: 14px;
        }

        @media (max-width: 760px) {
          .bp-topbar { padding: 14px 18px; }
          .bp-body { padding: 20px 12px 50px; }
          .bp-header, .bp-section { padding-left: 20px; padding-right: 20px; }
          .bp-stats { grid-template-columns: repeat(2, 1fr); padding-left: 20px; padding-right: 20px; }
          .bp-info-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <PublicNavbar />

      <div className="bp-body">
        {loading ? (
          <div className="bp-loading">Loading your profile...</div>
        ) : error ? (
          <div className="bp-error">{error}</div>
        ) : (
          <div className="bp-card">
            <div className="bp-cover" />

            <div className="bp-header">
              <div
                className="bp-avatar"
                style={!editOpen && profile?.logo_url ? { cursor: 'zoom-in' } : undefined}
                onClick={() => !editOpen && profile?.logo_url && setViewer({ src: profile.logo_url, alt: companyName })}
              >
                {(editOpen ? eLogo : profile?.logo_url) ? (
                  <img src={editOpen ? eLogo : profile.logo_url} alt={companyName} />
                ) : (
                  initial
                )}
              </div>

              <div className="bp-header-row">
                {editOpen ? (
                  <div className="bp-edit-grid">
                    <label className="bp-inline-btn" style={{ gridColumn: '1 / -1', justifySelf: 'start', cursor: 'pointer' }}>
                      {editUploading ? 'Uploading…' : eLogo ? 'Change logo' : 'Add logo'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        disabled={editUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadLogo(f);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>

                    <div className="bp-field">
                      <span className="bp-field-label">Company name</span>
                      <input className="bp-inline-input" value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Company name" />
                    </div>

                    <div className="bp-field">
                      <span className="bp-field-label">Industry</span>
                      <select className="bp-inline-input" value={eIndustry} onChange={(e) => setEIndustry(e.target.value)}>
                        <option value="">Select industry</option>
                        {INDUSTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>

                    <div className="bp-field">
                      <span className="bp-field-label">Location</span>
                      <LocationInput value={eLocation} onChange={setELocation} options={LOCATIONS} />
                    </div>

                    <div className="bp-field">
                      <span className="bp-field-label">Website</span>
                      <input className="bp-inline-input" value={eWebsite} onChange={(e) => setEWebsite(e.target.value)} placeholder="https://yourbrand.com" />
                    </div>
                  </div>
                ) : (
                <div>
                  <h1 className="bp-name">{companyName}</h1>

                  {profile?.business_type && (
                    <p className="bp-type">{profile.business_type}</p>
                  )}

                  <div className="bp-meta">
                    {profile?.industry && (
                      <span>
                        <Building2 size={13} />
                        {profile.industry}
                      </span>
                    )}

                    {profile?.location && (
                      <span>
                        <MapPin size={13} />
                        {profile.location}
                      </span>
                    )}

                    {profile?.website && (
                      <span>
                        <Globe size={13} />
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Website
                        </a>
                      </span>
                    )}
                  </div>
                </div>
                )}

                {editOpen ? (
                  <div className="bp-edit-actions">
                    <button type="button" className="bp-inline-btn" onClick={() => setEditOpen(false)} disabled={editSaving}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="bp-inline-btn bp-inline-btn--dark"
                      onClick={() => void saveEdit()}
                      disabled={editSaving || editUploading}
                    >
                      {editSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                ) : (
                  <button type="button" className="bp-edit-btn" onClick={openEdit}>
                    <Pencil size={13} />
                    Edit Profile
                  </button>
                )}
              </div>

              {!editOpen && categories.length > 0 && (
                <div className="bp-tag-row">
                  {categories.slice(0, 10).map((category: string) => (
                    <span className="bp-tag" key={category}>
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {editOpen && editError && <div className="bp-edit-error">{editError}</div>}

            {(editOpen || profile?.description) && (
              <section className="bp-section">
                <div className="bp-section-heading">
                  <p className="bp-section-title">About the company</p>
                </div>
                {editOpen ? (
                  <textarea
                    className="bp-inline-input"
                    rows={4}
                    value={eDescription}
                    onChange={(e) => setEDescription(e.target.value)}
                    placeholder="Tell creators about your company"
                  />
                ) : (
                  <p className="bp-about">{profile.description}</p>
                )}
              </section>
            )}

            {(editOpen || categories.length > 0) && (
              <section className="bp-section">
                <div className="bp-section-heading">
                  <p className="bp-section-title">What we look for</p>
                </div>

                {editOpen ? (
                  <input
                    className="bp-inline-input"
                    value={eCategories}
                    onChange={(e) => setECategories(e.target.value)}
                    placeholder="Niches, separated by commas (e.g. Food, Fashion)"
                  />
                ) : (
                  <div className="bp-chip-row">
                    {categories.map((item: string) => (
                      <span className="bp-chip" key={item}>{item}</span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {(editOpen || contentTypes.length > 0) && (
              <section className="bp-section">
                <div className="bp-section-heading">
                  <p className="bp-section-title">Content we commission</p>
                </div>

                {editOpen ? (
                  <input
                    className="bp-inline-input"
                    value={eContentTypes}
                    onChange={(e) => setEContentTypes(e.target.value)}
                    placeholder="Content types, separated by commas (e.g. Reels, Photos)"
                  />
                ) : (
                  <div className="bp-chip-row">
                    {contentTypes.map((item: string) => (
                      <span className="bp-chip" key={item}>{item}</span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="bp-section">
              <div className="bp-section-heading">
                <p className="bp-section-title">Company Information</p>
              </div>

              {editOpen ? (
                <div className="bp-edit-grid" style={{ width: '100%' }}>
                  <div className="bp-field">
                    <span className="bp-field-label">Team size</span>
                    <input className="bp-inline-input" value={eTeam} onChange={(e) => setETeam(e.target.value)} placeholder="e.g. 11 to 50" />
                  </div>
                  <div className="bp-field">
                    <span className="bp-field-label">Established (year)</span>
                    <input className="bp-inline-input" inputMode="numeric" value={eYear} onChange={(e) => setEYear(e.target.value)} placeholder="e.g. 2018" />
                  </div>
                  <div className="bp-field">
                    <span className="bp-field-label">Contact phone</span>
                    <input className="bp-inline-input" value={eContactPhone} onChange={(e) => setEContactPhone(e.target.value)} placeholder="+977 98XXXXXXXX" />
                  </div>
                  <div className="bp-field">
                    <span className="bp-field-label">Typical campaign budget (NPR)</span>
                    <input className="bp-inline-input" inputMode="numeric" value={eBudget} onChange={(e) => setEBudget(e.target.value)} placeholder="e.g. 20000" />
                  </div>
                  <div className="bp-field">
                    <span className="bp-field-label">Company page</span>
                    <input className="bp-inline-input" value={eSocial.company} onChange={(e) => setESocial({ ...eSocial, company: e.target.value })} placeholder="Facebook or LinkedIn page" />
                  </div>
                  <div className="bp-field">
                    <span className="bp-field-label">Instagram</span>
                    <input className="bp-inline-input" value={eSocial.instagram} onChange={(e) => setESocial({ ...eSocial, instagram: e.target.value })} placeholder="Instagram link" />
                  </div>
                  <div className="bp-field">
                    <span className="bp-field-label">Facebook</span>
                    <input className="bp-inline-input" value={eSocial.facebook} onChange={(e) => setESocial({ ...eSocial, facebook: e.target.value })} placeholder="Facebook link" />
                  </div>
                  <div className="bp-field" style={{ gridColumn: '1 / -1' }}>
                    <span className="bp-field-label">Other link</span>
                    <input className="bp-inline-input" value={eSocial.other} onChange={(e) => setESocial({ ...eSocial, other: e.target.value })} placeholder="Any other link" />
                  </div>
                </div>
              ) : (
              <div className="bp-info-grid">
                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Users size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Team size</p>
                    <p className="bp-info-value">
                      {profile?.team_size || 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Phone size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Contact</p>
                    <p className="bp-info-value">
                      {profile?.contact_phone || 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Briefcase size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Typical campaign budget</p>
                    <p className="bp-info-value">
                      {Number(profile?.typical_budget || 0) > 0
                        ? `NPR ${Number(profile.typical_budget).toLocaleString()}`
                        : 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Building2 size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Established</p>
                    <p className="bp-info-value">
                      {profile?.year_established || 'Not specified'}
                    </p>
                  </span>
                </div>

                <div className="bp-info-card">
                  <span className="bp-info-icon">
                    <Globe size={17} />
                  </span>
                  <span>
                    <p className="bp-info-label">Website</p>
                    <p className="bp-info-value">
                      {profile?.website ? (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visit website <ArrowUpRight size={12} style={{ verticalAlign: 'middle' }} />
                        </a>
                      ) : (
                        'Not specified'
                      )}
                    </p>
                  </span>
                </div>
              </div>
              )}
            </section>

            <section className="bp-section">
              <div className="bp-section-heading">
                <p className="bp-section-title">Recent Campaigns</p>
                <p className="bp-section-sub">
                  {campaigns.length} total
                </p>
              </div>

              {campaigns.length === 0 ? (
                <div className="bp-empty">
                  <strong>Your campaign history will appear here</strong>
                  Create campaigns to show creators what your brand works on.
                  <Link className="bp-empty-link" to="/campaigns/new">
                    Create your first campaign →
                  </Link>
                </div>
              ) : (
                <div className="bp-campaign-grid">
                  {campaigns.slice(0, 6).map((campaign: any) => (
                    <Link
                      key={campaign.id}
                      to={`/campaigns/${campaign.id}`}
                      className="bp-campaign-card"
                    >
                      <div className="bp-campaign-image">
                        {campaign.hero_image ? (
                          <img
                            src={campaign.hero_image}
                            alt={campaign.title}
                          />
                        ) : null}
                      </div>

                      <div className="bp-campaign-body">
                        <p className="bp-campaign-status">
                          {campaign.status?.replace('_', ' ') || 'Campaign'}
                        </p>

                        <p className="bp-campaign-title">
                          {campaign.title}
                        </p>

                        <div className="bp-campaign-meta">
                          <span>
                            {campaign.category || 'General'}
                          </span>

                          <span>
                            {campaign.budget
                              ? `NPR ${Number(campaign.budget).toLocaleString()}`
                              : campaign.campaign_type || 'Campaign'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="bp-section">
              <p className="bp-section-title">Account</p>

              <div className="bp-danger-zone">
                <div>
                  <p className="bp-danger-title">Delete account</p>
                  <p className="bp-danger-desc">
                    Permanently deletes your business account and associated profile data.
                    This action cannot be undone.
                  </p>
                </div>

                <button
                  type="button"
                  className="bp-danger-btn"
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
          className="bp-modal-overlay"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="bp-modal-close"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <h2 className="bp-modal-title">Delete your account?</h2>

            <p className="bp-modal-desc">
              This permanently deletes your account and everything tied to it.
              Enter your current password to continue.
            </p>

            <form onSubmit={handleDeleteAccount}>
              <input
                type="password"
                className="bp-modal-input"
                placeholder="Current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />

              {deleteError && (
                <div className="bp-modal-error">{deleteError}</div>
              )}

              <div className="bp-modal-actions">
                <button
                  type="button"
                  className="bp-modal-cancel"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bp-modal-confirm"
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

export default BusinessProfile;
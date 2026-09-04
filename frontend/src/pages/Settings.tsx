// frontend/src/pages/Settings.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Settings as SettingsIcon } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getBusinessProgress, saveBusinessProgress } from '../api/client';
import { TagListField } from './Campaignform';

const VIOLET = '#6C5DD3';
const VIOLET_DARK = '#4A3BA8';

export function BusinessSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [defaultDos, setDefaultDos] = useState<string[]>([]);
  const [defaultDonts, setDefaultDonts] = useState<string[]>([]);
  const [defaultDuration, setDefaultDuration] = useState('');
  const [defaultAspectRatio, setDefaultAspectRatio] = useState('');
  const [defaultVoiceover, setDefaultVoiceover] = useState(false);
  const [defaultSubtitles, setDefaultSubtitles] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (user && user.role !== 'business') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'business') return;
    let cancelled = false;

    (async () => {
      try {
        const result = await getBusinessProgress();
        if (cancelled) return;
        const profile = result?.profile;
        if (profile) {
          setDefaultDos(profile.default_dos || []);
          setDefaultDonts(profile.default_donts || []);
          const spec = profile.default_video_spec;
          if (spec) {
            setDefaultDuration(spec.duration || '');
            setDefaultAspectRatio(spec.aspect_ratio || '');
            setDefaultVoiceover(!!spec.voiceover_required);
            setDefaultSubtitles(!!spec.subtitles_required);
          }
        }
      } catch (err) {
        console.error('Could not load campaign defaults:', err);
        if (!cancelled) setLoadError('Could not load your settings right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveDefaults = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await saveBusinessProgress({
        default_dos: defaultDos.length > 0 ? defaultDos : undefined,
        default_donts: defaultDonts.length > 0 ? defaultDonts : undefined,
        default_video_spec:
          defaultDuration || defaultAspectRatio || defaultVoiceover || defaultSubtitles
            ? {
                platform: 'General',
                duration: defaultDuration || undefined,
                aspect_ratio: defaultAspectRatio || undefined,
                voiceover_required: defaultVoiceover,
                subtitles_required: defaultSubtitles,
              }
            : undefined,
      });
      setSaveMsg('Saved ✓');
    } catch (err) {
      console.error('Could not save campaign defaults:', err);
      setSaveMsg('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (user && user.role !== 'business') return null;

  return (
    <div className="st">
      <style>{`
        .st {
          --violet: ${VIOLET};
          --violet-dark: ${VIOLET_DARK};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: #fbfaff;
          color: var(--ink);
        }
        .st * { box-sizing: border-box; }
        .st-topbar {
          padding: 16px 24px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .st-logo { font-family: 'League Spartan', sans-serif; font-weight: 600; font-size: 18px; color: var(--violet-dark); }
        .st-body { max-width: 640px; margin: 0 auto; padding: 32px 20px 80px; }
        .st-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 500; color: var(--ink-soft);
          background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 18px;
        }
        .st-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
        .st-sub { font-size: 13.5px; color: var(--ink-soft); margin: 0 0 28px; }

        .st-section {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 20px;
        }
        .st-section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .st-section-title { font-size: 15px; font-weight: 700; margin: 0; }
        .st-section-sub { font-size: 12.5px; color: var(--ink-soft); margin: 4px 0 18px; }

        .cc-field { margin-bottom: 18px; }
        .cc-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; }
        .cc-input {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 11px 13px;
          font-size: 14px;
          font-family: inherit;
          color: var(--ink);
          background: #fff;
        }
        .cc-input:focus { outline: none; border-color: var(--violet); }
        .cc-hint { font-size: 12px; color: var(--ink-soft); margin-top: 5px; display: flex; align-items: flex-start; gap: 5px; }

        .cc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 540px) { .cc-row { grid-template-columns: 1fr; } }

        .cc-taglist-input-row { display: flex; gap: 8px; }
        .cc-taglist-input-row .cc-input { flex: 1; }
        .cc-taglist-add {
          flex-shrink: 0;
          width: 42px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--violet-dark);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cc-taglist-add:hover { background: #f2f0fc; border-color: var(--violet); }
        .cc-taglist-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .cc-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 500;
          background: #f2f0fc;
          color: var(--violet-dark);
          border-radius: 999px;
          padding: 6px 8px 6px 12px;
        }
        .cc-chip-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--violet-dark);
          cursor: pointer;
          padding: 2px;
          opacity: 0.7;
        }
        .cc-chip-remove:hover { opacity: 1; }

        .cc-spec-checks { display: flex; gap: 18px; margin-bottom: 4px; }
        .cc-spec-check { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--ink); }

        .st-save-row { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
        .st-save-btn {
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          background: var(--violet);
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          cursor: pointer;
        }
        .st-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .st-save-msg { font-size: 12.5px; color: var(--ink-soft); }
      `}</style>

      <div className="st-topbar">
        <span className="st-logo">CreatorKhoj</span>
      </div>

      <div className="st-body">
        <button className="st-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 className="st-title">Settings</h1>
        <p className="st-sub">Configure how new campaigns behave — nothing here changes campaigns you've already created.</p>

        <div className="st-section">
          <div className="st-section-head">
            <SettingsIcon size={16} color={VIOLET_DARK} />
            <h2 className="st-section-title">Campaign Defaults</h2>
          </div>
          <p className="st-section-sub">
            These are the Do's, Don'ts, and video specs you use on almost every campaign. Set them once here and
            they'll automatically fill in when you start a new campaign — you can still edit or remove them per
            campaign.
          </p>

          {loading ? (
            <div className="cc-hint">Loading…</div>
          ) : loadError ? (
            <div className="cc-hint">{loadError}</div>
          ) : (
            <>
              <TagListField
                label="Default Do's"
                placeholder="e.g. Use good lighting"
                items={defaultDos}
                onChange={setDefaultDos}
              />
              <TagListField
                label="Default Don'ts"
                placeholder="e.g. Do not use competitor products"
                items={defaultDonts}
                onChange={setDefaultDonts}
              />
              <div className="cc-row">
                <div className="cc-field">
                  <label className="cc-label">Default video length</label>
                  <input
                    className="cc-input"
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(e.target.value)}
                    placeholder="e.g. Minimum 15 seconds"
                  />
                </div>
                <div className="cc-field">
                  <label className="cc-label">Default aspect ratio</label>
                  <input
                    className="cc-input"
                    value={defaultAspectRatio}
                    onChange={(e) => setDefaultAspectRatio(e.target.value)}
                    placeholder="e.g. 9:16"
                  />
                </div>
              </div>
              <div className="cc-spec-checks" style={{ marginBottom: 20 }}>
                <label className="cc-spec-check">
                  <input
                    type="checkbox"
                    checked={defaultVoiceover}
                    onChange={(e) => setDefaultVoiceover(e.target.checked)}
                  />
                  Voiceover required
                </label>
                <label className="cc-spec-check">
                  <input
                    type="checkbox"
                    checked={defaultSubtitles}
                    onChange={(e) => setDefaultSubtitles(e.target.checked)}
                  />
                  Subtitles required
                </label>
              </div>
              <div className="st-save-row">
                <button className="st-save-btn" disabled={saving} onClick={saveDefaults}>
                  {saving ? 'Saving…' : 'Save Defaults'}
                </button>
                {saveMsg && <span className="st-save-msg">{saveMsg}</span>}
              </div>
            </>
          )}
        </div>

        <div className="cc-hint" style={{ marginTop: 4 }}>
          <Info size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          Want to manage these while creating a campaign instead? They're also editable from the "Manage my
          campaign defaults" panel on the{' '}
          <Link to="/campaigns/new" style={{ color: 'var(--violet-dark)', fontWeight: 600 }}>
            new campaign
          </Link>{' '}
          form.
        </div>
      </div>
    </div>
  );
}
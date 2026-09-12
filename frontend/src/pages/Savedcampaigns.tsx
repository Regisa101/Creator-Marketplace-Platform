import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Building2, BookmarkX, DollarSign } from 'lucide-react';
import { getSavedCampaigns, unsaveCampaign, type SavedCampaignEntry } from '../api/client';
import { LogoMark, BRAND_NAME, PAGE_GRADIENT_BG } from '../components/Brand';

const CORAL = '#FF6B5A';
const CORAL_DARK = '#F0523F';

export function SavedCampaigns() {
  const [saved, setSaved] = useState<SavedCampaignEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getSavedCampaigns();
        if (!cancelled) setSaved(data);
      } catch (err) {
        console.error('Could not load saved campaigns:', err);
        if (!cancelled) setError('Could not load your saved campaigns. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = async (entry: SavedCampaignEntry) => {
    setRemovingId(entry.id);
    // Optimistic removal, same reasoning as the toggle on the detail
    // page — roll back only if the request actually fails.
    const previous = saved;
    setSaved(saved.filter((s) => s.id !== entry.id));
    try {
      await unsaveCampaign(entry.campaign_id);
    } catch (err) {
      console.error('Could not remove saved campaign:', err);
      setSaved(previous);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="sc">
      <style>{`
        .sc {
          --coral: ${CORAL};
          --coral-dark: ${CORAL_DARK};
          --ink: #111217;
          --ink-soft: #6c6d73;
          --line: #e6e6ea;
          font-family: 'Poppins', -apple-system, Helvetica, Arial, sans-serif;
          min-height: 100vh;
          background: ${PAGE_GRADIENT_BG};
          color: var(--ink);
        }
        .sc * { box-sizing: border-box; }

        .sc-topbar {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 32px;
          border-bottom: 1px solid var(--line);
          background: #fff;
        }
        .sc-logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 17px; }

        .sc-body { max-width: 1080px; margin: 0 auto; padding: 32px 24px 80px; }

        .sc-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink-soft);
          text-decoration: none;
          padding: 6px 0;
          margin-bottom: 16px;
        }
        .sc-back:hover { color: var(--ink); }

        .sc-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
        .sc-sub { font-size: 13.5px; color: var(--ink-soft); margin: 0 0 24px; }

        .sc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 860px) { .sc-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .sc-grid { grid-template-columns: 1fr; } }

        .sc-card {
          position: relative;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 18px;
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .sc-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.06); }
        .sc-card-link { display: block; text-decoration: none; color: inherit; }

        .sc-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .sc-card-type {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: #fff1ea;
          color: var(--coral-dark);
          border: 1px solid #ffd9c2;
        }
        .sc-unsave {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: #fff;
          color: var(--ink-soft);
          cursor: pointer;
          flex-shrink: 0;
        }
        .sc-unsave:hover { background: #fdecec; border-color: #f6c8c8; color: #d64545; }
        .sc-unsave:disabled { opacity: 0.5; cursor: not-allowed; }

        .sc-card-title { font-size: 15.5px; font-weight: 700; line-height: 1.35; margin: 0 0 8px; }
        .sc-card-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          font-size: 12px;
          color: var(--ink-soft);
          margin-bottom: 10px;
        }
        .sc-card-meta-item { display: inline-flex; align-items: center; gap: 3px; }
        .sc-card-desc {
          font-size: 12.5px;
          color: #3d3d42;
          line-height: 1.55;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .sc-state { text-align: center; padding: 60px 20px; color: var(--ink-soft); }
        .sc-state-title { font-size: 16px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
      `}</style>

      <div className="sc-topbar">
        <span className="sc-logo"><LogoMark size={20} /> {BRAND_NAME}</span>
      </div>

      <div className="sc-body">
        <Link to="/campaigns" className="sc-back">
          <ArrowLeft size={15} /> Back to Campaigns
        </Link>

        <h1 className="sc-title">Saved Campaigns</h1>
        <p className="sc-sub">
          {saved.length} campaign{saved.length === 1 ? '' : 's'} you've bookmarked
        </p>

        {loading && <div className="sc-state">Loading your saved campaigns…</div>}
        {!loading && error && <div className="sc-state">{error}</div>}

        {!loading && !error && saved.length === 0 && (
          <div className="sc-state">
            <div className="sc-state-title">Nothing saved yet</div>
            Tap "Save Campaign" on any campaign page to bookmark it here.
          </div>
        )}

        {!loading && !error && saved.length > 0 && (
          <div className="sc-grid">
            {saved.map((entry) => {
              const c = entry.campaign;
              return (
                <div className="sc-card" key={entry.id}>
                  <button
                    className="sc-unsave"
                    style={{ position: 'absolute', top: 14, right: 14 }}
                    disabled={removingId === entry.id}
                    onClick={() => handleRemove(entry)}
                    aria-label="Remove from saved"
                  >
                    <BookmarkX size={14} />
                  </button>
                  <Link to={`/campaigns/${c.id}`} className="sc-card-link">
                    <div className="sc-card-top">
                      <span className="sc-card-type">
                        <DollarSign size={11} style={{ verticalAlign: -2 }} /> paid
                      </span>
                    </div>
                    <h3 className="sc-card-title">{c.title}</h3>
                    <div className="sc-card-meta">
                      <span className="sc-card-meta-item">
                        <Building2 size={12} /> {c.brand_name || 'Business'}
                      </span>
                      <span>·</span>
                      <span>{c.category}</span>
                      {c.brand_location && (
                        <>
                          <span>·</span>
                          <span className="sc-card-meta-item">
                            <MapPin size={12} /> {c.brand_location}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="sc-card-desc">{c.description}</p>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
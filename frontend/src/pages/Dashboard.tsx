import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';
import {
  getApplications,
  getCampaigns,
  getNotifications,
  getPaymentSummary,
  type Application,
  type Campaign,
  type Notification,
} from '../api/client';

function money(value?: number | null) {
  return `NPR ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function timeAgo(raw?: string | null) {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function applicationLabel(status?: string) {
  switch (status) {
    case 'accepted': return 'Accepted';
    case 'rejected': return 'Rejected';
    case 'withdrawn': return 'Withdrawn';
    default: return 'Pending';
  }
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Creator accounts no longer have a dashboard. If an old bookmark,
  // login flow, or onboarding flow sends a creator here, take them back to
  // the public marketplace instead of rendering a creator dashboard.
  if (!user) return null;
  if (user.role !== 'business') {
    return <Navigate to="/" replace />;
  }

  const firstName = user.full_name?.split(' ')[0] || 'there';
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [serviceFees, setServiceFees] = useState(0);
  const [thisMonthFees, setThisMonthFees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrors([]);

      // Do NOT use one Promise.all here. A failure in collaborations,
      // notifications, or payments must not wipe the entire homepage.
      const results = await Promise.allSettled([
        getCampaigns({ limit: 50 }),
        getApplications(),
        getNotifications(false),
        getPaymentSummary(),
      ]);

      if (cancelled) return;

      const nextErrors: string[] = [];

      if (results[0].status === 'fulfilled') {
        setCampaigns(results[0].value.campaigns || []);
      } else {
        setCampaigns([]);
        nextErrors.push('Campaigns could not be loaded.');
      }

      if (results[1].status === 'fulfilled') {
        setApplications(results[1].value || []);
      } else {
        setApplications([]);
        nextErrors.push('Applications could not be loaded.');
      }

      if (results[2].status === 'fulfilled') {
        setNotifications(results[2].value || []);
      } else {
        setNotifications([]);
        nextErrors.push('Notifications could not be loaded.');
      }

      if (results[3].status === 'fulfilled') {
        const payment = results[3].value;
        // The existing payment summary is the source of truth for completed
        // business payments. Keep the card working even if the backend does
        // not expose a separate fee total yet.
        const lifetimePayout = Number(payment.lifetime || 0);
        const monthPayout = Number(payment.this_month || 0);
        // Released creator payouts are net of the platform's 10% fee.
        // Convert the net payout back to the corresponding CreatorHub fee
        // for this dashboard card.
        setServiceFees(lifetimePayout > 0 ? (lifetimePayout / 0.9) * 0.1 : 0);
        setThisMonthFees(monthPayout > 0 ? (monthPayout / 0.9) * 0.1 : 0);
      } else {
        setServiceFees(0);
        setThisMonthFees(0);
        nextErrors.push('Payment totals could not be loaded.');
      }

      setErrors(nextErrors);
      setLoading(false);
    }

    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const openCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'published'),
    [campaigns]
  );

  const closedCampaigns = useMemo(
    () => campaigns.filter((c) => ['closed', 'completed', 'cancelled'].includes(String(c.status))),
    [campaigns]
  );

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === 'pending'),
    [applications]
  );

  const recentApplications = useMemo(
    () => [...applications]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5),
    [applications]
  );

  const recentNotifications = useMemo(
    () => [...notifications]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5),
    [notifications]
  );

  const campaignById = useMemo(() => {
    const map = new Map<number, Campaign>();
    campaigns.forEach((campaign) => map.set(campaign.id, campaign));
    return map;
  }, [campaigns]);

  const goToNotification = (notification: Notification) => {
    if (notification.type === 'campaign_deadline_expired' && notification.reference_id) {
      navigate(`/campaigns/${notification.reference_id}?source=dashboard`);
      return;
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <AppLayout
      title={`Welcome, ${firstName}`}
      subtitle="Manage campaigns, review creators and confirm selections."
      showSearch={false}
      showNotifications
    >
      <style>{`
        .brand-home{max-width:1180px;margin:0 auto;padding:18px 4px 54px;color:#17151d}
        .brand-actions{display:flex;gap:9px;flex-wrap:wrap;margin:0 0 20px}
        .brand-btn{height:40px;padding:0 15px;border-radius:9px;border:1px solid #ddd9e3;background:#fff;color:#27232f;font-size:12px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:7px;cursor:pointer}
        .brand-btn.primary{background:#111;color:#fff;border-color:#111}
        .brand-error{margin:0 0 14px;padding:10px 12px;border:1px solid #ead7d7;background:#fff8f8;border-radius:9px;color:#9b4545;font-size:11px}
        .brand-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
        .brand-stat{min-height:122px;border:1px solid #e4e1e7;border-radius:15px;background:#fff;padding:16px 17px}
        .brand-stat-icon{width:29px;height:29px;border-radius:8px;background:#f3f2f4;display:grid;place-items:center;margin-bottom:14px;color:#292632;font-size:14px}
        .brand-stat-label{font-size:9.5px;letter-spacing:.04em;text-transform:uppercase;color:#77717e;font-weight:700}
        .brand-stat-value{font-size:25px;line-height:1.1;font-weight:800;margin-top:6px;color:#08070b}
        .brand-stat-note{font-size:9px;color:#938d99;margin-top:5px}
        .brand-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(310px,.7fr);gap:14px}
        .brand-card{border:1px solid #e4e1e7;border-radius:15px;background:#fff;padding:18px;min-width:0}
        .brand-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
        .brand-card-title{font-size:14px;font-weight:800;margin:0}
        .brand-card-link{font-size:10px;color:#5f5684;font-weight:800;text-decoration:none;white-space:nowrap}
        .brand-list{display:flex;flex-direction:column;gap:7px}
        .brand-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;background:#fafafa;border-radius:9px;text-decoration:none;color:inherit}
        .brand-row-title{font-size:11px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .brand-row-meta{font-size:9px;color:#8d8792;margin-top:4px}
        .brand-row-right{text-align:right}
        .brand-pill{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;background:#f1eef7;color:#62577f;font-size:8.5px;font-weight:800}
        .brand-empty{padding:28px 14px;text-align:center;background:#fafafa;border-radius:9px;color:#8d8792;font-size:10.5px}
        .brand-notice{display:flex;gap:10px;align-items:flex-start;width:100%;border:0;background:#fafafa;border-radius:9px;padding:12px;text-align:left;cursor:pointer;color:inherit}
        .brand-notice + .brand-notice{margin-top:7px}
        .brand-notice-dot{width:7px;height:7px;border-radius:50%;background:#7661a1;flex:0 0 auto;margin-top:4px}
        .brand-notice-title{font-size:10.5px;font-weight:750;line-height:1.4}
        .brand-notice-copy{font-size:9px;color:#8d8792;line-height:1.45;margin-top:3px}
        .brand-notice-time{font-size:8.5px;color:#aaa4ae;margin-top:4px}
        @media(max-width:950px){.brand-stats{grid-template-columns:repeat(2,1fr)}.brand-grid{grid-template-columns:1fr}}
        @media(max-width:560px){.brand-home{padding:14px 0 40px}.brand-stats{grid-template-columns:1fr}.brand-stat{min-height:105px}}
      `}</style>

      <main className="brand-home">
        <div className="brand-actions">
          <Link className="brand-btn primary" to="/campaigns/new">＋ Create campaign</Link>
          <Link className="brand-btn" to="/applications">▣ Review applications</Link>
        </div>

        {errors.length > 0 && (
          <div className="brand-error">
            {errors.join(' ')} The rest of the dashboard is still available.
          </div>
        )}

        <section className="brand-stats" aria-label="Campaign overview">
          <div className="brand-stat">
            <div className="brand-stat-icon">▣</div>
            <div className="brand-stat-label">Open campaigns</div>
            <div className="brand-stat-value">{loading ? '—' : openCampaigns.length}</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-icon">▤</div>
            <div className="brand-stat-label">Pending applications</div>
            <div className="brand-stat-value">{loading ? '—' : pendingApplications.length}</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-icon">▣</div>
            <div className="brand-stat-label">Closed campaigns</div>
            <div className="brand-stat-value">{loading ? '—' : closedCampaigns.length}</div>
          </div>
          <div className="brand-stat">
            <div className="brand-stat-icon">▤</div>
            <div className="brand-stat-label">CreatorHub service fees</div>
            <div className="brand-stat-value">{loading ? '—' : money(serviceFees)}</div>
            <div className="brand-stat-note">This month: {loading ? '—' : money(thisMonthFees)}</div>
          </div>
        </section>

        <section className="brand-grid">
          <div className="brand-card">
            <div className="brand-card-head">
              <h2 className="brand-card-title">Recent applications</h2>
              <Link className="brand-card-link" to="/applications">View all →</Link>
            </div>

            <div className="brand-list">
              {recentApplications.length === 0 && !loading ? (
                <div className="brand-empty">No applications yet.</div>
              ) : (
                recentApplications.map((application) => {
                  const campaign = campaignById.get(application.campaign_id);
                  return (
                    <Link
                      key={application.id}
                      className="brand-row"
                      to={`/applications?campaign=${application.campaign_id}`}
                    >
                      <div>
                        <div className="brand-row-title">
                          {application.creator_name || 'Creator'} applied to {campaign?.title || application.campaign_title || `Campaign #${application.campaign_id}`}
                        </div>
                        <div className="brand-row-meta">{timeAgo(application.created_at)}</div>
                      </div>
                      <div className="brand-row-right">
                        <span className="brand-pill">{applicationLabel(application.status)}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="brand-card">
            <div className="brand-card-head">
              <h2 className="brand-card-title">Recent notifications</h2>
              <Link className="brand-card-link" to="/notifications">View all →</Link>
            </div>

            <div className="brand-list">
              {recentNotifications.length === 0 && !loading ? (
                <div className="brand-empty">No notifications yet.</div>
              ) : (
                recentNotifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    className="brand-notice"
                    onClick={() => goToNotification(notification)}
                  >
                    <span className="brand-notice-dot" />
                    <span>
                      <span className="brand-notice-title">{notification.title}</span>
                      <span className="brand-notice-copy">{notification.message}</span>
                      <span className="brand-notice-time">{timeAgo(notification.created_at)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

export default Dashboard;

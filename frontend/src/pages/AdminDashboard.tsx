import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeDollarSign, Building2, Megaphone, Users } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getAdminOverview } from '../api/client';
import type { AdminRange } from '../api/client';
import {
  AdminShell,
  BarChart,
  Card,
  DATE_RANGE_OPTIONS,
  DonutChart,
  EmptyState,
  ErrorBanner,
  FilterPills,
  LoadingBlock,
  StatCard,
  campaignStatusLabel,
  formatDateTime,
  formatNPR,
  useAdminData,
} from './admin/adminUi';

const ACTIVITY_STEP = 5;

const RANGE_TEXT: Record<AdminRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

/** Admin landing page: platform health at a glance. All numbers come from /api/admin/overview. */
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<AdminRange>('30d');
  const [searchText, setSearchText] = useState('');
  const [visibleActivity, setVisibleActivity] = useState(ACTIVITY_STEP);

  const { data, loading, error } = useAdminData(() => getAdminOverview(range), [range]);

  if (user?.role !== 'admin') return null;

  const cards = data?.cards;
  const rangeText = RANGE_TEXT[range];
  const campaignTotal = data?.campaign_statuses.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const revenuePoints = data?.revenue_trend.points ?? [];
  const hasRevenue = revenuePoints.some((p) => p.revenue > 0);
  const userTotal = (data?.users.creators ?? 0) + (data?.users.businesses ?? 0);

  return (
    <AdminShell
      title="Admin overview"
      subtitle="Monitor creators, businesses, campaigns and CreatorHub revenue."
      search={{
        value: searchText,
        onChange: setSearchText,
        placeholder: 'Search campaigns… (press Enter)',
        onSubmit: (v) => {
          const q = v.trim();
          navigate(q ? `/admin/campaigns?search=${encodeURIComponent(q)}` : '/admin/campaigns');
        },
      }}
    >
      <div className="adm-page-actions">
        <span className="adm-muted" style={{ fontSize: 12 }}>
          Showing: {rangeText}
        </span>
        <FilterPills
          label="Time range"
          options={DATE_RANGE_OPTIONS}
          value={range}
          onChange={(v) => {
            setRange(v as AdminRange);
            setVisibleActivity(ACTIVITY_STEP);
          }}
        />
      </div>

      <ErrorBanner message={error} />
      {!data && loading && <LoadingBlock label="Loading overview…" />}

      {data && cards && (
        <>
          <div className="adm-grid-4">
            <StatCard
              icon={<Users size={16} />}
              label="Total Creators"
              value={cards.total_creators.toLocaleString()}
              sub={`+${cards.new_creators} new · ${rangeText.toLowerCase()}`}
            />
            <StatCard
              icon={<Building2 size={16} />}
              label="Total Businesses"
              value={cards.total_businesses.toLocaleString()}
              sub={`+${cards.new_businesses} new · ${rangeText.toLowerCase()}`}
            />
            <StatCard
              icon={<Megaphone size={16} />}
              label="Active Campaigns"
              value={cards.active_campaigns.toLocaleString()}
              sub="Published or in progress"
            />
            <StatCard
              icon={<BadgeDollarSign size={16} />}
              label="Platform Revenue"
              value={formatNPR(cards.platform_revenue)}
              sub={`${rangeText.toLowerCase()} · ${cards.paid_contracts} paid contract${cards.paid_contracts === 1 ? '' : 's'}`}
            />
          </div>

          <div className="adm-grid-2">
            <Card title="Campaign Overview" note={`Campaigns created · ${rangeText.toLowerCase()}, by current status`}>
              {campaignTotal === 0 ? (
                <EmptyState title="No campaigns found" hint="Try a longer time range." />
              ) : (
                <BarChart
                  ariaLabel="Campaigns by status"
                  data={data.campaign_statuses.map((s) => ({ label: campaignStatusLabel(s.status), value: s.count }))}
                />
              )}
            </Card>

            <Card
              title="Platform Revenue"
              note={`CreatorHub platform fees only · ${rangeText.toLowerCase()} · ${data.revenue_trend.granularity === 'day' ? 'daily' : 'monthly'}`}
            >
              {!hasRevenue ? (
                <EmptyState title="No platform revenue yet" hint="Fees appear here once a business pays for a contract." />
              ) : (
                <BarChart
                  ariaLabel="Platform revenue over time in NPR"
                  data={revenuePoints.map((p) => ({ label: p.label, value: p.revenue }))}
                  formatValue={formatNPR}
                />
              )}
            </Card>
          </div>

          <div className="adm-grid-2">
            <Card title="Platform Users" note="All registered accounts">
              {userTotal === 0 ? (
                <EmptyState title="No creators yet" />
              ) : (
                <DonutChart
                  centerLabel="users"
                  slices={[
                    { label: 'Creators', value: data.users.creators, color: '#111111' },
                    { label: 'Businesses', value: data.users.businesses, color: '#b5b5b5' },
                  ]}
                />
              )}
            </Card>

            <Card title="Recent Activity" note={rangeText}>
              {data.recent_activity.length === 0 ? (
                <EmptyState title="No recent activity" />
              ) : (
                <>
                  <ul className="adm-activity">
                    {data.recent_activity.slice(0, visibleActivity).map((a, i) => (
                      <li key={`${a.type}-${a.at}-${i}`}>
                        <div>
                          <strong>{a.title}</strong>
                          {a.subject && <span className="subject">{a.subject}</span>}
                        </div>
                        <time dateTime={a.at}>{formatDateTime(a.at)}</time>
                      </li>
                    ))}
                  </ul>
                  {data.recent_activity.length > ACTIVITY_STEP && (
                    <div className="adm-more">
                      {visibleActivity < data.recent_activity.length && (
                        <button type="button" onClick={() => setVisibleActivity((n) => n + ACTIVITY_STEP)}>
                          Show more
                        </button>
                      )}
                      {visibleActivity > ACTIVITY_STEP && (
                        <button type="button" onClick={() => setVisibleActivity(ACTIVITY_STEP)}>
                          Show less
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </AdminShell>
  );
}
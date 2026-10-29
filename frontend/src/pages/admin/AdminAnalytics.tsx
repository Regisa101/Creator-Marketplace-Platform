import { useState } from 'react';

import { getAdminOverview, type AdminRange } from '../../api/client';
import {
  AdminShell, BarChart, Card, DonutChart, EmptyState, ErrorBanner, FilterSelect, LoadingBlock,
  campaignStatusLabel, formatNPR, useAdminData,
} from './adminUi';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

/** Three simple charts: money, campaigns, people. */
export default function AdminAnalytics() {
  const [range, setRange] = useState<AdminRange>('30d');
  const { data, loading, error } = useAdminData(() => getAdminOverview(range), [range]);

  const points = data?.revenue_trend.points ?? [];
  const hasRevenue = points.some((p) => p.revenue > 0);
  const campaignTotal = data?.campaign_statuses.reduce((sum, s) => sum + s.count, 0) ?? 0;
  const userTotal = (data?.users.creators ?? 0) + (data?.users.businesses ?? 0);

  return (
    <AdminShell title="Analytics" subtitle="How CreatorHub is growing.">
      <div className="adm-toolbar">
        <div className="adm-filters-end" style={{ marginLeft: 0 }}>
          <FilterSelect label="Time range" value={range} onChange={(v) => setRange(v as AdminRange)} options={RANGE_OPTIONS} />
        </div>
      </div>

      <ErrorBanner message={error} />
      {!data && loading && <LoadingBlock />}

      {data && (
        <>
          <Card
            title="Revenue"
            note={`CreatorHub fees earned · ${data.revenue_trend.granularity === 'day' ? 'per day' : 'per month'} · ${formatNPR(data.cards.platform_revenue)} in total for this range`}
          >
            {!hasRevenue ? (
              <EmptyState title="No revenue yet" hint="Fees appear here once a business hires a creator." />
            ) : (
              <BarChart
                ariaLabel="Platform revenue over time in NPR"
                data={points.map((p) => ({ label: p.label, value: p.revenue }))}
                formatValue={formatNPR}
              />
            )}
          </Card>

          <div className="adm-grid-2">
            <Card title="Campaigns" note="Campaigns created in this range, by current status">
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
              title="Users"
              note={`${data.cards.new_creators} new creators and ${data.cards.new_businesses} new businesses in this range`}
            >
              {userTotal === 0 ? (
                <EmptyState title="No users yet" />
              ) : (
                <DonutChart
                  centerLabel="users"
                  slices={[
                    { label: 'Creators', value: data.users.creators, color: '#197935' },
                    { label: 'Businesses', value: data.users.businesses, color: '#b5b5b5' },
                  ]}
                />
              )}
            </Card>
          </div>
        </>
      )}
    </AdminShell>
  );
}
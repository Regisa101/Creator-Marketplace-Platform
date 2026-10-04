import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeDollarSign, CalendarDays, CalendarRange, FileCheck2 } from 'lucide-react';

import { getAdminRevenue } from '../../api/client';
import type { AdminRevenueRange } from '../../api/client';
import {
  AdminShell, BarChart, Card, EmptyState, ErrorBanner, FilterPills, LoadingBlock, Pagination, StatCard, StatusBadge, formatDate, formatNPR, useAdminData,
} from './adminUi';

const PAGE_SIZE = 20;
const RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

export default function AdminRevenue() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [range, setRange] = useState<AdminRevenueRange>('30d');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAdminData(() => getAdminRevenue({ range, page, page_size: PAGE_SIZE }), [range, page]);

  const s = data?.summary;
  const points = data?.chart.points ?? [];
  const hasRevenue = points.some((p) => p.revenue > 0);

  return (
    <AdminShell
      title="Revenue"
      subtitle="CreatorHub platform fees collected from paid contracts."
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
      <div className="adm-toolbar">
        <FilterPills label="Time range" options={RANGES} value={range} onChange={(v) => { setRange(v as AdminRevenueRange); setPage(1); }} />
      </div>

      <ErrorBanner message={error} />
      {!data && loading && <LoadingBlock />}

      {data && s && (
        <>
          <div className="adm-grid-4">
            <StatCard icon={<BadgeDollarSign size={16} />} label="Total Revenue" value={formatNPR(s.total_revenue)} sub="All platform fees collected" />
            <StatCard icon={<CalendarDays size={16} />} label="Revenue This Month" value={formatNPR(s.revenue_this_month)} />
            <StatCard icon={<CalendarRange size={16} />} label="Revenue This Year" value={formatNPR(s.revenue_this_year)} />
            <StatCard icon={<FileCheck2 size={16} />} label="Paid Contracts" value={s.paid_contracts.toLocaleString()} sub="Successful fee payments" />
          </div>

          <Card title="Platform Revenue" note={`${formatNPR(s.range_revenue)} in selected range · ${s.range_paid_contracts} payment${s.range_paid_contracts === 1 ? '' : 's'}`}>
            {!hasRevenue ? (
              <EmptyState title="No platform revenue yet" />
            ) : (
              <BarChart ariaLabel="Platform revenue over time in NPR" data={points.map((p) => ({ label: p.label, value: p.revenue }))} formatValue={formatNPR} />
            )}
          </Card>

          <Card title="Revenue Breakdown" note="Only platform fees are CreatorHub revenue. Creator compensation is paid directly between business and creator and is never processed here.">
            {data.breakdown.length === 0 ? (
              <EmptyState title="No platform revenue yet" />
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Type</th><th className="num">Payments</th><th className="num">Revenue</th></tr></thead>
                  <tbody>
                    {data.breakdown.map((b) => (
                      <tr key={b.type}><td>{b.label}</td><td className="num">{b.count}</td><td className="num">{formatNPR(b.amount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Revenue Transactions">
            {data.transactions.length === 0 ? (
              <EmptyState title="No platform revenue yet" hint="Paid platform-fee transactions appear here." />
            ) : (
              <>
                <div className="adm-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
                  <table className="adm-table">
                    <thead>
                      <tr><th>Date</th><th>Campaign</th><th>Business</th><th className="num">Contract Value</th><th className="num">Platform Fee</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{formatDate(t.date)}</td>
                          <td>{t.campaign || '—'}</td>
                          <td>{t.business || '—'}</td>
                          <td className="num">{formatNPR(t.contract_value)}</td>
                          <td className="num">{formatNPR(t.platform_fee)}</td>
                          <td><StatusBadge status="paid" label="Paid" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={data.page} pageSize={PAGE_SIZE} total={data.total} totalPages={data.total_pages} onPage={setPage} />
              </>
            )}
          </Card>
        </>
      )}
    </AdminShell>
  );
}
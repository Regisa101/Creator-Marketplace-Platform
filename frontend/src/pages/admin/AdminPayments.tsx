import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getAdminRevenue, getPlatformPayments } from '../../api/client';
import {
  AdminShell, Card, EmptyState, ErrorBanner, FilterPills, LoadingBlock, Pagination, StatCard, StatusBadge,
  formatDate, formatNPR, useAdminData,
} from './adminUi';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  active: 'To be paid',
  completed: 'Completed',
};

export default function AdminPayments() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAdminData(
    () => getPlatformPayments({ status, page, page_size: PAGE_SIZE }),
    [status, page],
  );

  const revenue = useAdminData(() => getAdminRevenue({ range: 'all', page: 1, page_size: 1 }), []);
  const rv = revenue.data?.summary;
  const s = data?.summary;
  const counts = data?.counts;
  const rows = data?.items ?? [];

  return (
    <AdminShell
      title="Payments"
      subtitle="What CreatorHub owes the creators it selected for its own campaigns."
    >
      <div className="adm-toolbar">
        <FilterPills
          label="Payment status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All', count: counts?.all },
            { value: 'active', label: 'To be paid', count: counts?.active },
            { value: 'completed', label: 'Completed', count: counts?.completed },
          ]}
        />
      </div>

      <ErrorBanner message={error} />
      {!data && loading && <LoadingBlock />}

      {data && s && (
        <>
          <div className="adm-section-title">Platform revenue (money in)</div>
          <div className="adm-grid-4">
            <StatCard icon={null} label="Total revenue" value={rv ? formatNPR(rv.total_revenue) : '—'} sub="CreatorHub fees collected" />
            <StatCard icon={null} label="This month" value={rv ? formatNPR(rv.revenue_this_month) : '—'} sub={<Link to="/admin/revenue">View full revenue</Link>} />
          </div>

          <div className="adm-section-title">Owed to creators (money out)</div>
          <div className="adm-grid-4">
            <StatCard icon={null} label="Total committed" value={formatNPR(s.total_committed)} sub="All creator contracts" />
            <StatCard icon={null} label="To be paid" value={formatNPR(s.active)} sub="Contracts still running" />
            <StatCard icon={null} label="Completed" value={formatNPR(s.completed)} sub="Finished contracts" />
            <StatCard icon={null} label="Contracts" value={s.contracts.toLocaleString()} sub="Creators selected" />
          </div>

          <Card note="CreatorHub pays these creators directly. No platform fee applies to its own campaigns, so none of this counts as revenue.">
            {rows.length === 0 ? (
              <EmptyState title="No payments yet" hint="When you select a creator for a CreatorHub campaign, their payment shows up here." />
            ) : (
              <>
                <div className="adm-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Creator</th><th>Campaign</th><th className="num">Amount</th><th>Status</th><th>Start</th><th>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => (
                        <tr key={p.id}>
                          <td><Link to={`/creators/${p.creator_id}`} className="adm-cell-main"><span className="name">{p.creator || '—'}</span></Link></td>
                          <td>{p.campaign}</td>
                          <td className="num">{formatNPR(p.amount)}</td>
                          <td><StatusBadge status={p.status} label={STATUS_LABEL[p.status] ?? p.status} /></td>
                          <td>{formatDate(p.start_date)}</td>
                          <td>{formatDate(p.end_date)}</td>
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
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getAdminRevenue, getPlatformPayments } from '../../api/client';
import {
  AdminShell, Card, EmptyState, ErrorBanner, FilterPills, FilterSelect, LoadingBlock, Pagination, StatCard, StatusBadge,
  formatDate, formatNPR, useAdminData,
} from './adminUi';

const PAGE_SIZE = 15;

/** One page for all money: what CreatorHub earned, and what it owes creators. */
export default function AdminMoney() {
  const [tab, setTab] = useState<'earned' | 'owed'>('earned');

  return (
    <AdminShell title="Money" subtitle="What CreatorHub earns, and what it owes creators.">
      <div className="adm-toolbar">
        <FilterPills
          label="Money view"
          value={tab}
          onChange={(v) => setTab(v as 'earned' | 'owed')}
          options={[
            { value: 'earned', label: 'Earned' },
            { value: 'owed', label: 'Owed to creators' },
          ]}
        />
      </div>
      {tab === 'earned' ? <Earned /> : <Owed />}
    </AdminShell>
  );
}

function Earned() {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAdminData(
    () => getAdminRevenue({ range: 'all', page, page_size: PAGE_SIZE }),
    [page],
  );
  const s = data?.summary;

  return (
    <>
      <ErrorBanner message={error} />
      {!data && loading && <LoadingBlock />}
      {data && s && (
        <>
          <div className="adm-grid-4">
            <StatCard icon={null} label="Total earned" value={formatNPR(s.total_revenue)} sub="10% fees from businesses" />
            <StatCard icon={null} label="This month" value={formatNPR(s.revenue_this_month)} />
          </div>

          <Card note="Only the CreatorHub fee counts. Creator pay goes straight from business to creator.">
            {data.transactions.length === 0 ? (
              <EmptyState title="No fees yet" hint="A fee shows up here when a business hires a creator." />
            ) : (
              <>
                <div className="adm-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
                  <table className="adm-table">
                    <thead>
                      <tr><th>Date</th><th>Campaign</th><th>Business</th><th className="num">Fee</th></tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{formatDate(t.date)}</td>
                          <td>{t.campaign || '—'}</td>
                          <td>{t.business || '—'}</td>
                          <td className="num">{formatNPR(t.platform_fee)}</td>
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
    </>
  );
}

function Owed() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAdminData(
    () => getPlatformPayments({ status, page, page_size: PAGE_SIZE }),
    [status, page],
  );
  const s = data?.summary;
  const rows = data?.items ?? [];

  return (
    <>
      <ErrorBanner message={error} />
      {!data && loading && <LoadingBlock />}
      {data && s && (
        <>
          <div className="adm-grid-4">
            <StatCard icon={null} label="To be paid" value={formatNPR(s.active)} sub="Contracts still running" />
            <StatCard icon={null} label="Already finished" value={formatNPR(s.completed)} sub="Completed contracts" />
          </div>

          <div className="adm-toolbar">
            <FilterSelect
              label="Show"
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All', count: data.counts.all },
                { value: 'active', label: 'To be paid', count: data.counts.active },
                { value: 'completed', label: 'Completed', count: data.counts.completed },
              ]}
            />
          </div>

          <Card note="From CreatorHub's own campaigns. You pay these creators directly, so none of it counts as revenue.">
            {rows.length === 0 ? (
              <EmptyState title="Nothing owed yet" hint="When you select a creator for a CreatorHub campaign, they appear here." />
            ) : (
              <>
                <div className="adm-table-wrap" style={{ opacity: loading ? 0.6 : 1 }}>
                  <table className="adm-table">
                    <thead>
                      <tr><th>Creator</th><th>Campaign</th><th className="num">Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => (
                        <tr key={p.id}>
                          <td><Link to={`/creators/${p.creator_id}`} className="adm-cell-main"><span className="name">{p.creator || '—'}</span></Link></td>
                          <td>{p.campaign}</td>
                          <td className="num">{formatNPR(p.amount)}</td>
                          <td><StatusBadge status={p.status} label={p.status === 'active' ? 'To be paid' : 'Completed'} /></td>
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
    </>
  );
}
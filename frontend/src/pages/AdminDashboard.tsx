import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import {
  getAdminComplaints,
  getAdminRevenue,
  getPlatformApplications,
  getPlatformPayments,
} from '../api/client';
import { AdminShell, Card, ErrorBanner, LoadingBlock, StatCard, formatNPR, useAdminData } from './admin/adminUi';

/** Admin landing page: three numbers and a short list of things to do. */
export default function AdminDashboard() {
  const { user } = useAuth();

  const { data, loading, error } = useAdminData(async () => {
    const [revenue, owed, applications, complaints] = await Promise.all([
      getAdminRevenue({ range: 'all', page: 1, page_size: 1 }),
      getPlatformPayments({ status: 'all', page: 1, page_size: 1 }),
      getPlatformApplications({ status: 'pending', page: 1, page_size: 1 }),
      getAdminComplaints({ status: 'new', page: 1, page_size: 1 }),
    ]);
    return {
      earnedThisMonth: revenue.summary.revenue_this_month,
      owedAmount: owed.summary.active,
      owedCount: owed.counts.active ?? 0,
      newComplaints: complaints.total,
      pendingApplications: applications.counts.pending ?? 0,
    };
  }, []);

  if (user?.role !== 'admin') return null;

  const todo = data
    ? [
        { count: data.pendingApplications, text: `creator${data.pendingApplications === 1 ? '' : 's'} applied to CreatorHub campaigns`, to: '/admin/campaigns', action: 'Review' },
        { count: data.owedCount, text: `creator${data.owedCount === 1 ? '' : 's'} waiting to be paid`, to: '/admin/money', action: 'Open Money' },
        { count: data.newComplaints, text: `new complaint${data.newComplaints === 1 ? '' : 's'}`, to: '/admin/complaints', action: 'Review' },
      ].filter((t) => t.count > 0)
    : [];

  return (
    <AdminShell title="Overview" subtitle="What's happening on CreatorHub right now.">
      <ErrorBanner message={error} />
      {!data && loading && <LoadingBlock />}

      {data && (
        <>
          <div className="adm-grid-4">
            <StatCard icon={null} label="Earned this month" value={formatNPR(data.earnedThisMonth)} sub="10% fees from businesses" />
            <StatCard icon={null} label="Owed to creators" value={formatNPR(data.owedAmount)} sub="Contracts still running" />
            <StatCard icon={null} label="New complaints" value={data.newComplaints.toLocaleString()} sub="Not reviewed yet" />
          </div>

          <Card title="Needs your attention">
            {todo.length === 0 ? (
              <p className="adm-muted" style={{ margin: 0, fontSize: 13 }}>You're all caught up.</p>
            ) : (
              <ul className="adm-mini-list">
                {todo.map((t) => (
                  <li key={t.to}>
                    <span><strong>{t.count}</strong> {t.text}</span>
                    <Link to={t.to}>{t.action}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </AdminShell>
  );
}
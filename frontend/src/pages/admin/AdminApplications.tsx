import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getPlatformApplications, selectAdminCampaignCreator } from '../../api/client';
import {
  AdminShell, Card, ConfirmModal, EmptyState, ErrorBanner, FilterPills, LoadingBlock, Pagination, StatusBadge,
  errorMessage, formatDate, formatNPR, useAdminData, useDebounced,
} from './adminUi';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Selected',
  rejected: 'Rejected',
};

export default function AdminApplications() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const list = useAdminData(
    () => getPlatformApplications({ search: q || undefined, status, page, page_size: PAGE_SIZE }),
    [q, status, page],
  );

  const [pick, setPick] = useState<{ campaignId: number; applicationId: number; creator: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState('');

  const confirmSelect = async () => {
    if (!pick) return;
    setBusy(true);
    setPickError('');
    try {
      await selectAdminCampaignCreator(pick.campaignId, pick.applicationId);
      setPick(null);
      list.reload();
    } catch (err) {
      setPickError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const counts = list.data?.counts;
  const rows = list.data?.items ?? [];

  return (
    <AdminShell
      title="Applications"
      subtitle="Creators who applied to the campaigns CreatorHub posts."
      search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search by creator or campaign' }}
    >
      <div className="adm-toolbar">
        <FilterPills
          label="Application status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All', count: counts?.all },
            { value: 'pending', label: 'Pending', count: counts?.pending },
            { value: 'accepted', label: 'Selected', count: counts?.accepted },
            { value: 'rejected', label: 'Rejected', count: counts?.rejected },
          ]}
        />
      </div>

      <ErrorBanner message={list.error} />

      <Card>
        {!list.data && list.loading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title="No applications yet" hint="Applications to CreatorHub campaigns will appear here." />
        ) : (
          <>
            <div className="adm-table-wrap" style={{ opacity: list.loading ? 0.6 : 1 }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Creator</th><th>Campaign</th><th className="num">Rate</th><th>Status</th><th>Applied</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td><Link to={`/creators/${a.creator_id}`} className="adm-cell-main"><span className="name">{a.creator || '—'}</span></Link></td>
                      <td>{a.campaign}</td>
                      <td className="num">{a.rate !== null ? formatNPR(a.rate) : '—'}</td>
                      <td><StatusBadge status={a.status === 'accepted' ? 'active' : a.status} label={STATUS_LABEL[a.status] ?? a.status} /></td>
                      <td>{formatDate(a.applied_at)}</td>
                      <td>
                        <div className="adm-actions">
                          <Link to={`/admin/campaigns?search=${encodeURIComponent(a.campaign)}`} className="btn btn-secondary adm-btn-sm">Campaign</Link>
                          {a.can_select && (
                            <button
                              type="button"
                              className="btn btn-primary adm-btn-sm"
                              onClick={() => { setPickError(''); setPick({ campaignId: a.campaign_id, applicationId: a.id, creator: a.creator || 'this creator' }); }}
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data?.page ?? page} pageSize={PAGE_SIZE} total={list.data?.total ?? 0} totalPages={list.data?.total_pages ?? 1} onPage={setPage} />
          </>
        )}
      </Card>

      <ConfirmModal
        open={pick !== null}
        title="Select this creator?"
        message={`Select ${pick?.creator ?? 'this creator'}? Their contract becomes active immediately and other pending applicants are rejected once all spots are filled.`}
        confirmLabel="Select creator"
        danger={false}
        busy={busy}
        error={pickError}
        onConfirm={() => void confirmSelect()}
        onCancel={() => setPick(null)}
      />
    </AdminShell>
  );
}
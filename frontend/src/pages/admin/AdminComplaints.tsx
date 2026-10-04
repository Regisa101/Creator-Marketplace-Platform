import { useState } from 'react';

import {
  getAdminComplaint,
  getAdminComplaints,
  restrictAdminCampaign,
  setAdminBusinessRestricted,
  setAdminCreatorRestricted,
  updateAdminComplaint,
} from '../../api/client';
import type { ComplaintStatus, RestrictPayload } from '../../api/client';
import {
  AdminShell, Card, DetailGrid, Drawer, EmptyState, ErrorBanner, FilterPills, LoadingBlock, Pagination, RestrictModal,
  errorMessage, formatDate, formatDateTime, useAdminData, useDebounced,
} from './adminUi';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  under_review: 'Under review',
  upheld: 'Action taken',
  dismissed: 'Dismissed',
};

function ComplaintBadge({ status }: { status: string }) {
  const cls = status === 'upheld' ? 'published' : status === 'under_review' ? 'in_progress' : status === 'new' ? 'cancelled' : 'draft';
  return <span className={`adm-badge adm-badge-${cls}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export default function AdminComplaints() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [targetType, setTargetType] = useState('all');
  const [flagged, setFlagged] = useState(false);
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const list = useAdminData(
    () => getAdminComplaints({ search: q || undefined, status, target_type: targetType, flagged, page, page_size: PAGE_SIZE }),
    [q, status, targetType, flagged, page],
  );
  const rows = list.data?.items ?? [];
  const counts = list.data?.counts;

  const [viewId, setViewId] = useState<number | null>(null);
  const detail = useAdminData(() => (viewId === null ? Promise.resolve(null) : getAdminComplaint(viewId)), [viewId]);
  const shown = detail.data && detail.data.id === viewId ? detail.data : null;

  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [restrictOpen, setRestrictOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const open = (id: number) => {
    setViewId(id);
    setNote('');
    setActionError('');
  };

  const setComplaintStatus = async (next: ComplaintStatus) => {
    if (!shown) return;
    setActionError('');
    try {
      await updateAdminComplaint(shown.id, { status: next, admin_note: note.trim() || shown.admin_note || undefined });
      list.reload();
      detail.reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const saveNote = async () => {
    if (!shown) return;
    setActionError('');
    try {
      await updateAdminComplaint(shown.id, { admin_note: note });
      detail.reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const restrict = async (payload: RestrictPayload) => {
    if (!shown) return;
    setBusy(true);
    setDialogError('');
    try {
      const withThis = { ...payload, complaint_ids: Array.from(new Set([shown.id, ...(payload.complaint_ids ?? [])])) };
      if (shown.target.type === 'campaign' && shown.target.campaign_id) {
        await restrictAdminCampaign(shown.target.campaign_id, withThis);
      } else if (shown.target.user_id && shown.target.role === 'creator') {
        await setAdminCreatorRestricted(shown.target.user_id, true, withThis);
      } else if (shown.target.user_id) {
        await setAdminBusinessRestricted(shown.target.user_id, true, withThis);
      }
      setRestrictOpen(false);
      list.reload();
      detail.reload();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canRestrict = shown && shown.target.type !== 'platform' && shown.target.status === 'active';
  const sameTargetOpen = shown
    ? shown.related.filter((r) => r.status === 'new' || r.status === 'under_review')
    : [];

  return (
    <AdminShell
      title="Complaints"
      subtitle="Reports from creators and businesses. Look for repeat problems before restricting anyone."
      search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search by person or campaign' }}
    >
      <div className="adm-toolbar">
        <FilterPills
          label="Complaint status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { value: 'all', label: 'All', count: counts?.all },
            { value: 'new', label: 'New', count: counts?.new },
            { value: 'under_review', label: 'Under review', count: counts?.under_review },
            { value: 'upheld', label: 'Action taken', count: counts?.upheld },
            { value: 'dismissed', label: 'Dismissed', count: counts?.dismissed },
          ]}
        />
        <FilterPills
          label="Complaint about"
          value={targetType}
          onChange={(v) => { setTargetType(v); setPage(1); }}
          options={[
            { value: 'all', label: 'Everything' },
            { value: 'user', label: 'People' },
            { value: 'campaign', label: 'Campaigns' },
            { value: 'platform', label: 'Platform' },
          ]}
        />
        <FilterPills
          label="Repeat problems"
          value={flagged ? 'flagged' : 'all'}
          onChange={(v) => { setFlagged(v === 'flagged'); setPage(1); }}
          options={[{ value: 'all', label: 'All' }, { value: 'flagged', label: 'Repeat problems only' }]}
        />
      </div>

      <ErrorBanner message={list.error} />

      <Card>
        {!list.data && list.loading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title="No complaints found" hint="Complaints filed by creators and businesses appear here." />
        ) : (
          <>
            <div className="adm-table-wrap" style={{ opacity: list.loading ? 0.6 : 1 }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Filed</th><th>Reported by</th><th>Against</th><th>Reason</th><th>Status</th><th>Repeat</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.created_at)}</td>
                      <td>{c.reporter.name}</td>
                      <td>
                        <span className="adm-cell-main"><span className="name">{c.target.name}</span></span>
                        {c.target.type === 'campaign' && <span className="adm-muted" style={{ fontSize: 10.5 }}> campaign</span>}
                      </td>
                      <td>{c.category_label}</td>
                      <td><ComplaintBadge status={c.status} /></td>
                      <td>
                        {c.repeat?.flagged ? (
                          <span className="adm-badge adm-badge-cancelled">{c.repeat.unique_reporters} people</span>
                        ) : (
                          <span className="adm-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="adm-actions">
                          <button type="button" className="btn btn-secondary adm-btn-sm" onClick={() => open(c.id)}>Review</button>
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

      <Drawer open={viewId !== null} title="Complaint" onClose={() => setViewId(null)}>
        <ErrorBanner message={detail.error || actionError} />
        {!shown && detail.loading && <LoadingBlock />}
        {shown && (
          <>
            <DetailGrid
              rows={[
                { label: 'Status', value: <ComplaintBadge status={shown.status} /> },
                { label: 'Reason', value: shown.category_label },
                { label: 'Reported by', value: `${shown.reporter.name}${shown.reporter.role ? ` (${shown.reporter.role})` : ''}` },
                { label: 'Against', value: shown.target.name },
                { label: 'Filed', value: formatDateTime(shown.created_at) },
                { label: 'Contract', value: shown.contract_id ? `#${shown.contract_id}` : null },
                { label: 'What happened', value: shown.description },
                {
                  label: 'Evidence',
                  value: shown.evidence_urls.length ? (
                    <span style={{ display: 'grid', gap: 4 }}>
                      {shown.evidence_urls.map((u) => (
                        <a key={u} className="adm-link" href={u} target="_blank" rel="noopener noreferrer">{u}</a>
                      ))}
                    </span>
                  ) : null,
                },
              ]}
            />

            {shown.repeat && shown.repeat.unique_reporters > 0 && (
              <p className={`adm-note${shown.repeat.flagged ? ' adm-note-warn' : ''}`}>
                {shown.repeat.unique_reporters} different {shown.repeat.unique_reporters === 1 ? 'person has' : 'people have'} reported this account
                {shown.repeat.top_category_reporters >= 2 ? `; ${shown.repeat.top_category_reporters} of them for the same reason.` : '.'}
              </p>
            )}

            {shown.related.length > 0 && (
              <>
                <div className="adm-section-title">Other complaints about this account ({shown.related.length})</div>
                <ul className="adm-mini-list">
                  {shown.related.map((r) => (
                    <li key={r.id}>
                      <span>{r.category_label} · {r.reporter}</span>
                      <span>{STATUS_LABEL[r.status] ?? r.status}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="adm-section-title">Admin note (private)</div>
            <textarea
              className="adm-input adm-textarea"
              rows={3}
              maxLength={2000}
              value={note || shown.admin_note || ''}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What you checked and decided"
            />
            <div className="adm-drawer-actions" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary adm-btn-sm" onClick={() => void saveNote()}>Save note</button>
              {shown.status === 'new' && (
                <button type="button" className="btn btn-secondary adm-btn-sm" onClick={() => void setComplaintStatus('under_review')}>Start review</button>
              )}
              {(shown.status === 'new' || shown.status === 'under_review') && (
                <button type="button" className="btn btn-secondary adm-btn-sm" onClick={() => void setComplaintStatus('dismissed')}>Dismiss</button>
              )}
              {shown.target.type === 'platform' && (shown.status === 'new' || shown.status === 'under_review') && (
                <button type="button" className="btn btn-primary adm-btn-sm" onClick={() => void setComplaintStatus('upheld')}>Mark as resolved</button>
              )}
              {canRestrict && (
                <button type="button" className="btn adm-btn-outline-danger adm-btn-sm" onClick={() => { setDialogError(''); setRestrictOpen(true); }}>
                  Restrict {shown.target.type === 'campaign' ? 'campaign' : 'account'}
                </button>
              )}
            </div>
            {shown.target.status === 'restricted' && <p className="adm-note">This {shown.target.type === 'campaign' ? 'campaign' : 'account'} is already restricted.</p>}
          </>
        )}
      </Drawer>

      <RestrictModal
        open={restrictOpen}
        title={shown?.target.type === 'campaign' ? 'Restrict campaign?' : 'Restrict account?'}
        message={`${shown?.target.name ?? ''} will be restricted. This complaint is marked as acted on, and the person who filed it is thanked. The restricted side is told the reason you choose.`}
        busy={busy}
        error={dialogError}
        complaints={sameTargetOpen.map((r) => ({ id: r.id, category_label: r.category_label, created_at: r.created_at }))}
        onConfirm={(payload) => void restrict(payload)}
        onCancel={() => setRestrictOpen(false)}
      />
    </AdminShell>
  );
}
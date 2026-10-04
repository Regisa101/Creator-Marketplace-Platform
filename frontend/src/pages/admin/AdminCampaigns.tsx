import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';

import type { RestrictPayload } from '../../api/client';
import { getAdminCampaign, getAdminCampaigns, restrictAdminCampaign, selectAdminCampaignCreator } from '../../api/client';
import {
  AdminShell, Card, CAMPAIGN_STATUS_OPTIONS, ConfirmModal, RestrictModal, DATE_RANGE_OPTIONS, DetailGrid, Drawer, EmptyState, ErrorBanner,
  FilterPills, LoadingBlock, Pagination, StatusBadge, TagList, errorMessage, formatDate, formatNPR, useAdminData, useDebounced,
} from './adminUi';

const PAGE_SIZE = 20;

export default function AdminCampaigns() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());

  const list = useAdminData(
    () => getAdminCampaigns({ search: q || undefined, status, range, page, page_size: PAGE_SIZE }),
    [q, status, range, page],
  );

  const [viewId, setViewId] = useState<number | null>(null);
  const detail = useAdminData(() => (viewId === null ? Promise.resolve(null) : getAdminCampaign(viewId)), [viewId]);
  const shown = detail.data && detail.data.id === viewId ? detail.data : null;

  // Restrict confirmation
  const [target, setTarget] = useState<{ id: number; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  // Select-creator confirmation (CreatorHub-owned campaigns only)
  const [pick, setPick] = useState<{ applicationId: number; creator: string } | null>(null);
  const [pickBusy, setPickBusy] = useState(false);
  const [pickError, setPickError] = useState('');

  const confirmRestrict = async (payload: RestrictPayload) => {
    if (!target) return;
    setBusy(true);
    setDialogError('');
    try {
      await restrictAdminCampaign(target.id, payload);
      setTarget(null);
      list.reload();
      if (viewId === target.id) detail.reload();
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmSelect = async () => {
    if (!pick || !shown) return;
    setPickBusy(true);
    setPickError('');
    try {
      await selectAdminCampaignCreator(shown.id, pick.applicationId);
      setPick(null);
      list.reload();
      detail.reload();
    } catch (err) {
      setPickError(errorMessage(err));
    } finally {
      setPickBusy(false);
    }
  };

  const counts = list.data?.counts;
  const rows = list.data?.items ?? [];
  const filtered = Boolean(q) || status !== 'all' || range !== 'all';

  const restrictBtn = (id: number, title: string, restricted: boolean) =>
    restricted ? (
      <span className="adm-muted" style={{ fontSize: 11 }}>Restricted</span>
    ) : (
      <button type="button" className="btn adm-btn-outline-danger adm-btn-sm" onClick={() => { setDialogError(''); setTarget({ id, title }); }}>
        Restrict / Close
      </button>
    );

  // Edit is offered for CreatorHub's own campaigns while they can still change.
  const canEdit = (c: { is_platform_owned: boolean; is_restricted: boolean; status: string }) =>
    c.is_platform_owned && !c.is_restricted && (c.status === 'draft' || c.status === 'published');

  return (
    <AdminShell
      title="Campaigns"
      subtitle="Review and moderate campaigns, or run your own as CreatorHub."
      search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search by campaign or business' }}
      headerActions={
        <Link to="/admin/campaigns/new" className="btn btn-primary">
          <Plus size={15} /> Create campaign
        </Link>
      }
    >
      <div className="adm-toolbar">
        <FilterPills
          label="Campaign status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ value: 'all', label: 'All', count: counts?.all }, ...CAMPAIGN_STATUS_OPTIONS.map((o) => ({ ...o, count: counts?.[o.value] }))]}
        />
        <FilterPills label="Created within" value={range} onChange={(v) => { setRange(v); setPage(1); }} options={DATE_RANGE_OPTIONS} />
      </div>

      <ErrorBanner message={list.error} />

      <Card>
        {!list.data && list.loading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState title="No campaigns found" hint={filtered ? 'Try a different search or filter.' : 'Use “Create campaign” to publish one as CreatorHub.'} />
        ) : (
          <>
            <div className="adm-table-wrap" style={{ opacity: list.loading ? 0.6 : 1 }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Campaign</th><th>Business</th><th>Status</th>
                    <th className="num">Applications</th><th className="num">Creators Needed</th><th>Created</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td><span className="adm-cell-main"><span className="name">{c.title}</span></span></td>
                      <td>{c.business || '—'}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="num">{c.applications}</td>
                      <td className="num">{c.creators_needed}</td>
                      <td>{formatDate(c.created_at)}</td>
                      <td>
                        <div className="adm-actions">
                          <button type="button" className="btn btn-secondary adm-btn-sm" onClick={() => setViewId(c.id)}>View</button>
                          {canEdit(c) && (
                            <Link to={`/admin/campaigns/${c.id}/edit`} className="btn btn-secondary adm-btn-sm">Edit</Link>
                          )}
                          {restrictBtn(c.id, c.title, c.is_restricted)}
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

      <Drawer open={viewId !== null} title="Campaign details" onClose={() => setViewId(null)}>
        <ErrorBanner message={detail.error} />
        {!shown && detail.loading && <LoadingBlock />}
        {shown && (
          <>
            <div className="adm-profile-head"><div><h4>{shown.title}</h4><p>{shown.business || '—'}</p></div></div>
            <DetailGrid
              rows={[
                { label: 'Status', value: <StatusBadge status={shown.status} /> },
                ...(shown.is_restricted ? [{ label: 'Restricted on', value: formatDate(shown.restricted_at) }, { label: 'Reason', value: (shown as any).restriction_reason_label }] : []),
                { label: 'Category', value: shown.category },
                { label: 'Engagement', value: [shown.engagement_type, shown.duration].filter(Boolean).join(' · ') },
                {
                  label: 'Budget',
                  value:
                    shown.budget !== null ? formatNPR(shown.budget)
                    : shown.budget_min !== null || shown.budget_max !== null ? `${formatNPR(shown.budget_min)} – ${formatNPR(shown.budget_max)}`
                    : null,
                },
                { label: 'Creators needed', value: `${shown.creators_selected} of ${shown.creators_needed} selected` },
                { label: 'Creator types', value: <TagList items={shown.creator_types} /> },
                { label: 'Deliverables', value: <TagList items={shown.deliverables} /> },
                { label: 'Description', value: shown.description },
                { label: 'Requirements', value: shown.requirements },
                { label: 'Application deadline', value: formatDate(shown.application_deadline) },
                { label: 'Start – end', value: shown.start_date || shown.end_date ? `${formatDate(shown.start_date)} – ${formatDate(shown.end_date)}` : null },
                { label: 'Created', value: formatDate(shown.created_at) },
              ]}
            />
            <div className="adm-section-title">Applications ({shown.total_applications})</div>
            {shown.applications.length === 0 ? (
              <span className="adm-muted" style={{ fontSize: 12 }}>No applications yet.</span>
            ) : (
              <ul className="adm-mini-list">
                {shown.applications.map((a) => {
                  const canSelect =
                    shown.is_platform_owned && !shown.is_restricted && a.status === 'pending' && shown.creators_selected < shown.creators_needed;
                  return (
                    <li key={a.id}>
                      <span>{a.creator}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {a.status === 'accepted' ? 'Selected' : a.status}
                        {canSelect && (
                          <button
                            type="button"
                            className="btn btn-primary adm-btn-sm"
                            onClick={() => { setPickError(''); setPick({ applicationId: a.id, creator: a.creator }); }}
                          >
                            Select
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {shown.is_platform_owned && (
              <p className="adm-note">
                This is a CreatorHub campaign. Selecting a creator activates their contract immediately; no platform fee applies and it is not counted as revenue.
              </p>
            )}
            <div className="adm-section-title">Selected creators ({shown.selected_creators.length})</div>
            {shown.selected_creators.length === 0 ? (
              <span className="adm-muted" style={{ fontSize: 12 }}>None selected.</span>
            ) : (
              <ul className="adm-mini-list">
                {shown.selected_creators.map((a) => (
                  <li key={a.id}><span>{a.creator}</span><span>{a.rate !== null ? formatNPR(a.rate) : ''}</span></li>
                ))}
              </ul>
            )}
            <div className="adm-drawer-actions">
              {canEdit(shown) && <Link to={`/admin/campaigns/${shown.id}/edit`} className="btn btn-secondary">Edit campaign</Link>}
              {!shown.is_restricted && restrictBtn(shown.id, shown.title, false)}
            </div>
          </>
        )}
      </Drawer>

      <RestrictModal
        open={target !== null}
        title="Restrict campaign?"
        message={`"${target?.title ?? ''}" will be closed to new applications and cannot be re-published by its owner. Applications, contracts and payments stay intact. The owner is told the reason you choose.`}
        busy={busy}
        error={dialogError}
        onConfirm={(payload) => void confirmRestrict(payload)}
        onCancel={() => setTarget(null)}
      />

      <ConfirmModal
        open={pick !== null}
        title="Select this creator?"
        message={`Select ${pick?.creator ?? 'this creator'} for this campaign? Their contract becomes active immediately and other pending applicants are rejected once all spots are filled.`}
        confirmLabel="Select creator"
        danger={false}
        busy={pickBusy}
        error={pickError}
        onConfirm={() => void confirmSelect()}
        onCancel={() => setPick(null)}
      />
    </AdminShell>
  );
}
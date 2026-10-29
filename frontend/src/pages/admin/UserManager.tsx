import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import type { AdminListParams, AdminUserList, AdminUserStatus, ComplaintSummary, RestrictPayload } from '../../api/client';
import {
  AdminShell,
  Card,
  ComplaintSummaryBlock,
  RestrictModal,
  Drawer,
  EmptyState,
  ErrorBanner,
  FilterPills,
  FilterSelect,
  LoadingBlock,
  Pagination,
  errorMessage,
  useAdminData,
  useDebounced,
} from './adminUi';

const PAGE_SIZE = 20;

export interface ManagedUser {
  id: number;
  name: string;
  status: AdminUserStatus;
  restriction_reason_label?: string | null;
  restriction_note?: string | null;
  complaints?: ComplaintSummary;
}

export interface UserColumn<R> {
  header: string;
  numeric?: boolean;
  render: (row: R) => ReactNode;
}

interface UserManagerProps<R extends ManagedUser, D extends ManagedUser> {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  /** "creator" / "business" - used in dialog copy. */
  noun: string;
  /** "creators" / "businesses" - used in empty states. */
  nounPlural: string;
  /** What a restricted account can no longer do, shown in the confirmation. */
  restrictNote: string;
  columns: UserColumn<R>[];
  fetchList: (params: AdminListParams) => Promise<AdminUserList<R>>;
  fetchDetail: (id: number) => Promise<D>;
  setRestricted: (id: number, restricted: boolean, payload?: RestrictPayload) => Promise<unknown>;
  renderDetail: (detail: D) => ReactNode;
}

export default function UserManager<R extends ManagedUser, D extends ManagedUser>({
  title,
  subtitle,
  searchPlaceholder,
  noun,
  nounPlural,
  restrictNote,
  columns,
  fetchList,
  fetchDetail,
  setRestricted,
  renderDetail,
}: UserManagerProps<R, D>) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search.trim());

  const list = useAdminData(
    () =>
      fetchList({
        search: debouncedSearch || undefined,
        status,
        sort,
        page,
        page_size: PAGE_SIZE,
      }),
    [debouncedSearch, status, sort, page],
  );

  // Detail drawer
  const [viewId, setViewId] = useState<number | null>(null);
  const detail = useAdminData<D | null>(() => (viewId === null ? Promise.resolve(null) : fetchDetail(viewId)), [viewId]);

  // Restrict confirmation
  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [actionError, setActionError] = useState('');

  const shownDetail = detail.data && detail.data.id === viewId ? detail.data : null;
  const counts = list.data?.counts;
  const rows = list.data?.items ?? [];
  const isFiltered = Boolean(debouncedSearch) || status !== 'all';

  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const apply = async (id: number, restricted: boolean, payload?: RestrictPayload) => {
    await setRestricted(id, restricted, payload);
    list.reload();
    if (viewId === id) detail.reload();
  };

  const confirmRestrict = async (payload: RestrictPayload) => {
    if (!target) return;
    setBusy(true);
    setDialogError('');
    try {
      await apply(target.id, true, payload);
      setTarget(null);
    } catch (err) {
      setDialogError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async (id: number) => {
    setActionError('');
    try {
      await apply(id, false);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const actionButton = (user: ManagedUser) =>
    user.status === 'restricted' ? (
      <button type="button" className="btn btn-secondary adm-btn-sm" onClick={() => void reactivate(user.id)}>
        Reactivate
      </button>
    ) : (
      <button
        type="button"
        className="btn adm-btn-outline-danger adm-btn-sm"
        onClick={() => {
          setDialogError('');
          setTarget(user);
        }}
      >
        Restrict
      </button>
    );

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      search={{
        value: search,
        onChange: (v) => {
          setSearch(v);
          setPage(1);
        },
        placeholder: searchPlaceholder,
      }}
    >
      <div className="adm-toolbar">
        <FilterPills
          label="People"
          value={nounPlural}
          onChange={(v) => navigate(v === 'creators' ? '/admin/creators' : '/admin/businesses')}
          options={[
            { value: 'creators', label: 'Creators' },
            { value: 'businesses', label: 'Businesses' },
          ]}
        />
        <div className="adm-filters-end">
          <FilterSelect
            label="Status"
            value={status}
            onChange={changeStatus}
            options={[
              { value: 'all', label: 'All', count: counts?.all },
              { value: 'active', label: 'Active', count: counts?.active },
              { value: 'restricted', label: 'Restricted', count: counts?.restricted },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sort}
            onChange={(v) => {
              setSort(v as 'newest' | 'oldest');
              setPage(1);
            }}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
            ]}
          />
        </div>
      </div>

      <ErrorBanner message={list.error || actionError} />

      <Card>
        {!list.data && list.loading ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            title={isFiltered ? `No ${nounPlural} found` : `No ${nounPlural} yet`}
            hint={isFiltered ? 'Try a different search or filter.' : undefined}
          />
        ) : (
          <>
            <div className="adm-table-wrap" style={{ opacity: list.loading ? 0.6 : 1 }}>
              <table className="adm-table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c.header} className={c.numeric ? 'num' : undefined}>
                        {c.header}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {columns.map((c) => (
                        <td key={c.header} className={c.numeric ? 'num' : undefined}>
                          {c.render(row)}
                        </td>
                      ))}
                      <td>
                        <div className="adm-actions">
                          <button type="button" className="btn btn-secondary adm-btn-sm" onClick={() => setViewId(row.id)}>
                            View
                          </button>
                          {actionButton(row)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data?.page ?? page}
              pageSize={PAGE_SIZE}
              total={list.data?.total ?? 0}
              totalPages={list.data?.total_pages ?? 1}
              onPage={setPage}
            />
          </>
        )}
      </Card>

      <Drawer open={viewId !== null} title={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} details`} onClose={() => setViewId(null)}>
        <ErrorBanner message={detail.error} />
        {/* The hook keeps the previous result while loading, so only show a match for the open row. */}
        {!shownDetail && detail.loading && <LoadingBlock />}
        {shownDetail && (
          <>
            {renderDetail(shownDetail)}
            {shownDetail.status === 'restricted' && shownDetail.restriction_reason_label && (
              <p className="adm-note">
                Restricted for: {shownDetail.restriction_reason_label}
                {shownDetail.restriction_note ? `. Note: ${shownDetail.restriction_note}` : ''}
              </p>
            )}
            <ComplaintSummaryBlock summary={shownDetail.complaints} />
            <div className="adm-drawer-actions">{actionButton(shownDetail)}</div>
          </>
        )}
      </Drawer>

      <RestrictModal
        open={target !== null}
        title={`Restrict ${noun}?`}
        message={`${restrictNote} All of ${target?.name ?? `this ${noun}`}'s existing records stay intact, and you can reactivate the account at any time. The ${noun} is told the reason you choose.`}
        busy={busy}
        error={dialogError}
        complaints={target && shownDetail && shownDetail.id === target.id ? shownDetail.complaints?.open_complaints : undefined}
        onConfirm={(payload) => void confirmRestrict(payload)}
        onCancel={() => setTarget(null)}
      />
    </AdminShell>
  );
}
import { getAdminBusiness, getAdminBusinesses, setAdminBusinessRestricted } from '../../api/client';
import type { AdminBusinessDetail, AdminBusinessRow } from '../../api/client';
import { Avatar, DetailGrid, UserStatusBadge, formatDate, formatNPR } from './adminUi';
import UserManager from './UserManager';

export default function AdminBusinesses() {
  return (
    <UserManager<AdminBusinessRow, AdminBusinessDetail>
      title="Businesses"
      subtitle="Manage business accounts on CreatorHub."
      searchPlaceholder="Search by business name or email"
      noun="business"
      nounPlural="businesses"
      restrictNote="They will no longer be able to create or publish campaigns, select creators, or start new contracts."
      fetchList={getAdminBusinesses}
      fetchDetail={getAdminBusiness}
      setRestricted={setAdminBusinessRestricted}
      columns={[
        {
          header: 'Business',
          render: (r) => (
            <div className="adm-cell-main">
              <Avatar src={r.logo_url} name={r.name} />
              <span className="name">{r.name}</span>
            </div>
          ),
        },
        { header: 'Email', render: (r) => r.email },
        { header: 'Status', render: (r) => <UserStatusBadge status={r.status} /> },
        { header: 'Campaigns', numeric: true, render: (r) => r.campaigns },
        { header: 'Joined', render: (r) => formatDate(r.joined_at) },
      ]}
      renderDetail={(b) => (
        <>
          <div className="adm-profile-head">
            <Avatar src={b.logo_url} name={b.name} />
            <div>
              <h4>{b.name}</h4>
              <p>{b.email}</p>
            </div>
          </div>
          <DetailGrid
            rows={[
              { label: 'Status', value: <UserStatusBadge status={b.status} /> },
              { label: 'Location', value: b.location },
              { label: 'Industry', value: b.industry },
              {
                label: 'Website',
                value: b.website ? (
                  <a className="adm-link" href={/^https?:\/\//i.test(b.website) ? b.website : `https://${b.website}`} target="_blank" rel="noopener noreferrer">
                    {b.website}
                  </a>
                ) : null,
              },
              { label: 'Description', value: b.description },
              { label: 'Joined', value: formatDate(b.joined_at) },
              ...(b.status === 'restricted' ? [{ label: 'Restricted on', value: formatDate(b.restricted_at) }] : []),
            ]}
          />

          <div className="adm-section-title">Activity</div>
          <DetailGrid
            rows={[
              { label: 'Campaigns', value: b.stats.campaigns },
              { label: 'Completed campaigns', value: b.stats.completed_campaigns },
              { label: 'Contracts', value: b.stats.contracts },
              { label: 'Platform fees paid', value: formatNPR(b.stats.platform_fees_paid) },
              { label: 'Contract value', value: formatNPR(b.stats.contract_value) },
            ]}
          />
          <p className="adm-note">
            Platform fees are paid to CreatorHub. Contract value is the creator compensation agreed in active and completed contracts; it is settled directly between the
            business and creator and is not CreatorHub revenue. Campaign counts exclude drafts.
          </p>
        </>
      )}
    />
  );
}
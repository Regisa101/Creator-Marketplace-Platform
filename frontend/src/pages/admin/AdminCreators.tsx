import { getAdminCreator, getAdminCreators, setAdminCreatorRestricted } from '../../api/client';
import type { AdminCreatorDetail, AdminCreatorRow } from '../../api/client';
import { Avatar, DetailGrid, TagList, UserStatusBadge, formatDate } from './adminUi';
import UserManager from './UserManager';

export default function AdminCreators() {
  return (
    <UserManager<AdminCreatorRow, AdminCreatorDetail>
      title="Creators"
      subtitle="Manage creator accounts on CreatorHub."
      searchPlaceholder="Search by name or email"
      noun="creator"
      nounPlural="creators"
      restrictNote="They will no longer be able to apply to campaigns or be selected for new work."
      fetchList={getAdminCreators}
      fetchDetail={getAdminCreator}
      setRestricted={setAdminCreatorRestricted}
      columns={[
        {
          header: 'Creator',
          render: (r) => (
            <div className="adm-cell-main">
              <Avatar src={r.profile_image} name={r.name} />
              <span className="name">{r.name}</span>
            </div>
          ),
        },
        { header: 'Email', render: (r) => r.email },
        { header: 'Status', render: (r) => <UserStatusBadge status={r.status} /> },
        { header: 'Location', render: (r) => r.location || <span className="adm-muted">—</span> },
        { header: 'Joined', render: (r) => formatDate(r.joined_at) },
      ]}
      renderDetail={(c) => (
        <>
          <div className="adm-profile-head">
            <Avatar src={c.profile_image} name={c.name} />
            <div>
              <h4>{c.name}</h4>
              <p>{c.email}</p>
            </div>
          </div>
          <DetailGrid
            rows={[
              { label: 'Status', value: <UserStatusBadge status={c.status} /> },
              { label: 'Username', value: c.username },
              { label: 'Location', value: c.location },
              { label: 'Creator type', value: c.creator_type },
              { label: 'Niche', value: <TagList items={c.niches} /> },
              { label: 'Skills', value: <TagList items={c.skills} /> },
              { label: 'Languages', value: <TagList items={c.languages} /> },
              { label: 'Bio', value: c.bio },
              { label: 'Joined', value: formatDate(c.joined_at) },
              ...(c.status === 'restricted' ? [{ label: 'Restricted on', value: formatDate(c.restricted_at) }] : []),
            ]}
          />

          <div className="adm-section-title">Social links</div>
          {c.socials.length === 0 ? (
            <span className="adm-muted" style={{ fontSize: 12 }}>
              No social accounts added.
            </span>
          ) : (
            <ul className="adm-mini-list">
              {c.socials.map((s) => (
                <li key={`${s.platform}-${s.username ?? ''}`}>
                  <span>
                    {s.profile_url ? (
                      <a className="adm-link" href={s.profile_url} target="_blank" rel="noopener noreferrer">
                        {s.platform}
                        {s.username ? ` · @${s.username.replace(/^@/, '')}` : ''}
                      </a>
                    ) : (
                      <>
                        {s.platform}
                        {s.username ? ` · @${s.username.replace(/^@/, '')}` : ''}
                      </>
                    )}
                  </span>
                  <span>{s.follower_count ? `${s.follower_count.toLocaleString()} followers` : ''}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="adm-section-title">Activity</div>
          <DetailGrid
            rows={[
              { label: 'Applications', value: c.stats.applications },
              { label: 'Selected campaigns', value: c.stats.selected_campaigns },
              { label: 'Completed contracts', value: c.stats.completed_contracts },
            ]}
          />
        </>
      )}
    />
  );
}
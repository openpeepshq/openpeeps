import { useParams } from 'react-router-dom';
import { groupName } from '@openpeeps/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Avatar } from '@openpeeps/react/components';
import { routeHandleParam } from '../../lib/routeHandles';

export function AdminGroupMembers() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const membersQuery = openpeepsApi.useGroupMembers(groupQuery.data?.id ?? '');

  const group = groupQuery.data;
  const headerTitle = group
    ? `${groupName(group)} · ${t('admin.members.title', { defaultValue: 'Members' })}`
    : t('admin.members.title', { defaultValue: 'Members' });
  useSetPageHeader(headerTitle);

  if (groupQuery.isLoading || membersQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('groups.notFound', { defaultValue: 'Group not found' })}
      </div>
    );
  }

  const members = membersQuery.data ?? [];

  return (
    <div className="p-4">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface-100">
            <tr>
              <th className="p-2 text-left">Profile</th>
              <th className="p-2 text-left">Handle</th>
              <th className="p-2 text-left">Roles</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.profile.id} className="border-t">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <Avatar profile={m.profile} size={2} />
                    <span>
                      {m.profile.displayName || `@${m.profile.handle}`}
                    </span>
                  </div>
                </td>
                <td className="text-muted-foreground p-2">
                  @{m.profile.handle}
                </td>
                <td className="p-2 text-xs">
                  {(m.roles ?? []).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

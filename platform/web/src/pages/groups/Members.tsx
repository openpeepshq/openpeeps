import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import {
  Avatar,
  GroupHeader,
} from '@openpeeps/react/components';

export function GroupMembers() {
  const t = useT();
  const { handle = '' } = useParams<{ handle: string }>();
  const { openpeepsApi } = useOpenpeeps();

  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const group = groupQuery.data;

  const membersQuery = openpeepsApi.useGroupMembers(group?.id ?? '');
  const members = membersQuery.data ?? [];

  if (groupQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-2xl font-bold">
          {t('groups.notFound', { defaultValue: 'Group not found' })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <GroupHeader group={group} />
      <h2 className="border-b p-4 text-lg font-semibold">
        {t('groups.members.title', { defaultValue: 'Members' })} (
        {members.length})
      </h2>
      <div className="flex flex-col">
        {members.map((m) => (
          <a
            key={m.profile.id}
            href={`/@${m.profile.handle}`}
            className="flex items-center gap-3 border-b p-4 hover:bg-surface-100"
          >
            <Avatar profile={m.profile} size={3} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {m.profile.displayName || `@${m.profile.handle}`}
              </span>
              <span className="text-xs text-muted-foreground">
                @{m.profile.handle}
              </span>
              {m.roles?.length ? (
                <span className="mt-0.5 text-xs uppercase text-primary">
                  {m.roles.join(', ')}
                </span>
              ) : null}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

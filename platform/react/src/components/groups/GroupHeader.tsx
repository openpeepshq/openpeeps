import type { GroupWithMeta } from '@openpeeps/common/types';
import { groupName } from '@openpeeps/common/lib';

import { useCurrentProfile } from '../layout/IdentityContext';
import { JoinGroupButton } from './JoinGroupButton';

export interface GroupHeaderProps {
  group: GroupWithMeta;
}

export function GroupHeader({ group }: GroupHeaderProps) {
  const me = useCurrentProfile();
  const isMember = me?.memberships?.some((m) => m.group.id === group.id);

  return (
    <div className="relative">
      <div className="bg-surface-200 relative h-44 bg-cover bg-center">
        {group.header && (
          <img
            src={group.header}
            alt="banner"
            className="absolute left-0 top-0 h-full w-full object-cover"
          />
        )}
        <div
          className="absolute -bottom-12 left-4 inline-flex items-center justify-center overflow-hidden rounded-md bg-surface-100 text-lg font-medium"
          style={{ width: '6rem', height: '6rem' }}
        >
          {group.avatar ? (
            <img
              src={group.avatar}
              alt={group.displayName ?? group.handle}
              className="h-full w-full object-cover"
            />
          ) : (
            (group.displayName ?? group.handle ?? '?').charAt(0).toUpperCase()
          )}
        </div>
      </div>
      {!isMember ? (
        <div className="flex justify-end space-x-2 p-2">
          <JoinGroupButton group={group} />
        </div>
      ) : null}
      <div className="mb-8 p-2 pt-14">
        <h1 className="text-xl font-semibold">{groupName(group)}</h1>
        <p className="text-surface-500 text-sm">@{group.handle}</p>
        <a
          href={`/groups/@${group.handle}/members`}
          className="text-sm text-muted-foreground hover:underline"
        >
          {group.membersCount} member{group.membersCount === 1 ? '' : 's'}
        </a>
      </div>
    </div>
  );
}

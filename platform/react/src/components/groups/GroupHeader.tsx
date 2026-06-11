import type { GroupWithMeta } from '@openpeeps/common/types';
import { groupName } from '@openpeeps/common/lib';

import { useCurrentProfile } from '../layout/IdentityContext';
import { JoinGroupButton } from './JoinGroupButton';
import { GroupOptionsMenu } from './GroupOptionsMenu';
import { GroupShareMenu } from './GroupShareMenu';
import { GroupAvatar } from './GroupAvatar';

export interface GroupHeaderProps {
  group: GroupWithMeta;
}

export function GroupHeader({ group }: GroupHeaderProps) {
  const me = useCurrentProfile();
  const isMember = me?.memberships?.some((m) => m.group.id === group.id);

  return (
    <div className="relative">
      <div className="relative aspect-[3/1] w-full">
        <div className="bg-surface-200 absolute inset-0 overflow-hidden">
          {group.header && (
            <img
              src={group.header}
              alt="banner"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <GroupAvatar
          group={group}
          size={6}
          borderless
          containerClassName="absolute -bottom-12 left-4"
        />
      </div>
      {!isMember ? (
        <div className="flex justify-end space-x-2 p-2">
          <JoinGroupButton group={group} />
        </div>
      ) : (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
          <GroupShareMenu group={group} />
          <GroupOptionsMenu group={group} />
        </div>
      )}
      <div className="mb-8 p-2 pt-14">
        <h1 className="text-xl font-semibold" data-testid="groups-header-title">
          {groupName(group)}
        </h1>
        <p className="text-surface-500 text-sm">@{group.handle}</p>
        <a
          href={`/groups/@${group.handle}/members`}
          className="text-muted-foreground text-sm hover:underline"
        >
          {group.membersCount} member{group.membersCount === 1 ? '' : 's'}
        </a>
      </div>
    </div>
  );
}

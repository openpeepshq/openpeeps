import type { GroupWithMeta } from '@openpeeps/common/types';
import { groupName } from '@openpeeps/common/lib';
import { GroupAvatar } from './GroupAvatar';
import { JoinGroupButton } from './JoinGroupButton';

export interface GroupCardProps {
  group: GroupWithMeta;
  avatarSize?: number;
  noPadding?: boolean;
  showAction?: boolean;
}

/**
 * Translation of `core/groups/GroupCard.svelte`. Renders the group avatar
 * + name + member count, with the join/leave action button.
 */
export function GroupCard({
  group,
  avatarSize = 3.5,
  noPadding = false,
  showAction = true,
}: GroupCardProps) {
  return (
    <div className={`flex w-full justify-between ${noPadding ? '' : 'p-4'}`}>
      <a
        href={`/groups/@${group.handle}`}
        className="flex min-w-0 flex-1 items-center gap-x-2 hover:bg-surface-100"
      >
        <GroupAvatar
          group={group}
          size={avatarSize}
          borderless
          containerClassName="flex-shrink-0"
        />
        <span className="flex min-w-0 flex-1 flex-col items-start overflow-hidden text-left">
          <span className="w-32 truncate text-lg font-semibold md:w-full">
            {groupName(group)}
          </span>
          <span className="truncate text-sm">
            {group.membersCount} member{group.membersCount === 1 ? '' : 's'}
          </span>
        </span>
      </a>
      {showAction && (
        <div className="ml-2 flex flex-shrink-0 items-center">
          <JoinGroupButton group={group} />
        </div>
      )}
    </div>
  );
}

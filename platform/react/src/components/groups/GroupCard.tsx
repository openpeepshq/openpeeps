import type { GroupWithMeta } from '@openpeeps/common/types';
import { groupName } from '@openpeeps/common/lib';

export interface GroupCardProps {
  group: GroupWithMeta;
  avatarSize?: number;
  noPadding?: boolean;
}

/**
 * Translation of `core/groups/GroupCard.svelte`. Renders the group avatar
 * + name + member count. The Svelte version embeds `<GroupActionButton>`
 * (join/leave); we leave that off until the action component lands.
 */
export function GroupCard({
  group,
  avatarSize = 3.5,
  noPadding = false,
}: GroupCardProps) {
  return (
    <a
      href={`/groups/@${group.handle}`}
      className={`flex w-full justify-between ${noPadding ? '' : 'p-4'} hover:bg-surface-100`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-x-2">
        <span
          className="bg-surface-200 inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-medium"
          style={{ width: `${avatarSize}rem`, height: `${avatarSize}rem` }}
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
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start overflow-hidden text-left">
          <span className="w-32 truncate text-lg font-semibold md:w-full">
            {groupName(group)}
          </span>
          <span className="truncate text-sm">
            {group.membersCount} member{group.membersCount === 1 ? '' : 's'}
          </span>
        </span>
      </span>
    </a>
  );
}

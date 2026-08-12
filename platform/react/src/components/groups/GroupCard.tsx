import type { GroupWithMeta } from '@openpeepshq/common/types';
import { groupName } from '@openpeepshq/common/lib';
import { GroupAvatar } from './GroupAvatar';
import { JoinGroupButton } from './JoinGroupButton';

export interface GroupCardProps {
  group: GroupWithMeta;
  avatarSize?: number;
  noPadding?: boolean;
  showAction?: boolean;
  unreadCount?: number;
  /**
   * When provided, the card acts as a selection control: clicking it calls
   * `onSelect` instead of navigating to the group page. Used in selection
   * contexts such as choosing post audience.
   */
  onSelect?: (group: GroupWithMeta) => void;
}

/**
 * Translation of `core/groups/GroupCard.svelte`. Renders the group avatar
 * + name + member count, with the join/leave action button.
 */
export function GroupCard({
  group,
  avatarSize = 3,
  noPadding = false,
  showAction = true,
  unreadCount = 0,
  onSelect,
}: GroupCardProps) {
  const details = (
    <>
      <GroupAvatar
        group={group}
        size={avatarSize}
        borderless
        containerClassName="flex-shrink-0"
      />
      <span className="flex min-w-0 flex-1 flex-col items-start overflow-hidden text-left">
        <span className="flex w-full min-w-0 items-center gap-2">
          <span
            className={`truncate font-semibold md:w-full ${avatarSize < 2 ? 'text-sm' : 'text-lg'}`}
          >
            {groupName(group)}
          </span>
          {unreadCount > 0 ? (
            <span
              className="bg-destructive text-destructive-foreground flex size-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold"
              aria-label={`${unreadCount} unread posts`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </span>
        <span
          className={`text-muted-foreground truncate ${avatarSize < 2 ? 'text-xs' : 'text-sm'}`}
        >
          {group.membersCount} member{group.membersCount === 1 ? '' : 's'}
        </span>
      </span>
    </>
  );

  return (
    <article
      className={`flex w-full justify-between ${noPadding ? '' : 'p-4'}`}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(group)}
          className="hover:bg-surface flex min-w-0 flex-1 items-center gap-x-2 text-left"
        >
          {details}
        </button>
      ) : (
        <a
          href={`/groups/@${group.handle}`}
          className="hover:bg-surface flex min-w-0 flex-1 items-center gap-x-2"
        >
          {details}
        </a>
      )}
      {showAction && (
        <div className="ml-2 flex flex-shrink-0 items-center">
          <JoinGroupButton group={group} />
        </div>
      )}
    </article>
  );
}

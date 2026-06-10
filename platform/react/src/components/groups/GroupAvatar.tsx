import type { GroupData, GroupWithMeta } from '@openpeeps/common/types';
import { getTheme } from '@openpeeps/common';

import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from '../layout/IdentityContext';

export interface GroupAvatarProps {
  group?: GroupData | GroupWithMeta;
  /** rem-equivalent unit (matches Svelte version: 3.5 → 3.5rem). */
  size?: number;
  borderless?: boolean;
  containerClassName?: string;
}

const initials = (group?: GroupData | GroupWithMeta): string => {
  const name = group?.displayName || group?.handle || '?';
  const parts = name.split(' ');
  return [parts.at(0), parts.at(-1)]
    .filter(Boolean)
    .map((part) => part?.substring(0, 1).toUpperCase())
    .join('');
};

/**
 * Translation of `@openpeeps/svelte/components/core/groups/GroupAvatar.svelte`.
 * Renders a circular group avatar with the group picture, falling back to the
 * community's `defaultGroupAvatar` and finally to letter initials.
 */
export function GroupAvatar({
  group,
  size = 3.5,
  borderless = false,
  containerClassName,
}: GroupAvatarProps) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const defaultAvatar = getTheme(serverInfo.communityConfig, profileSettings)
    .defaultGroupAvatar;

  const src = group?.avatar || defaultAvatar;

  const borderClass = borderless
    ? ''
    : 'border-4 border-surface-300 hover:border-neutral-500';

  return (
    <div
      className={containerClassName}
      style={{
        width: `${size}rem`,
        height: `${size}rem`,
        minWidth: `${size}rem`,
      }}
    >
      <div
        className={`relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface-200 ${borderClass}`}
      >
        {src ? (
          <img
            src={src}
            alt={group?.displayName || group?.handle || 'group avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium text-foreground/80">
            {initials(group)}
          </span>
        )}
      </div>
    </div>
  );
}

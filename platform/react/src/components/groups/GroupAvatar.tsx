import type { GroupData, GroupWithMeta } from '@openpeepshq/common/types';
import { getTheme } from '@openpeepshq/common';

import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from '../layout/IdentityContext';
import {
  getInitials,
  hueFromHandle,
  initialsBackground,
} from '../../lib/initialsAvatar';
import { svgCoverSrc } from '../../lib/svgCover';

export interface GroupAvatarProps {
  group?: GroupData | GroupWithMeta;
  /** rem-equivalent unit (matches Svelte version: 3.5 → 3.5rem). */
  size?: number;
  borderless?: boolean;
  containerClassName?: string;
}

/**
 * Translation of `@openpeepshq/svelte/components/core/groups/GroupAvatar.svelte`.
 * Renders a circular group avatar with the group picture, falling back to the
 * community's `defaultGroupAvatar` and finally to letter initials on a
 * handle-hashed background.
 */
export function GroupAvatar({
  group,
  size = 3.5,
  borderless = false,
  containerClassName,
}: GroupAvatarProps) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const theme = getTheme(serverInfo.communityConfig, profileSettings);
  const defaultAvatar = theme.defaultGroupAvatar;

  const src = group?.avatar || defaultAvatar;

  const borderClass = borderless
    ? ''
    : 'border-4 border-border hover:border-border-2';

  const hue = hueFromHandle(group?.handle ?? '');
  const backgroundColor = src ? undefined : initialsBackground(hue, theme.dark);

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
        className={`bg-surface-2 relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full ${borderClass}`}
        style={{ backgroundColor }}
      >
        {src ? (
          <img
            src={svgCoverSrc(src)}
            alt={group?.displayName || group?.handle || 'group avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="text-primary font-medium"
            style={{ fontSize: `${size / 4}rem` }}
          >
            {getInitials(group?.displayName, group?.handle)}
          </span>
        )}
      </div>
    </div>
  );
}

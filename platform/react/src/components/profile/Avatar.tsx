import type { PublicProfile } from '@openpeepshq/common/types';
import { getTheme, isDeletedProfile } from '@openpeepshq/common';
import { UserX } from 'lucide-react';

import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from '../layout/IdentityContext';
import {
  getInitials,
  hueFromHandle,
  initialsBackground,
} from '../../lib/initialsAvatar';
import { svgCoverSrc } from '../../lib/svgCover';

export interface AvatarProps {
  profile?: PublicProfile;
  /** rem-equivalent unit (matches Svelte version: 3.5 → 3.5rem). */
  size?: number;
  borderless?: boolean;
  containerClassName?: string;
  /** When true, wraps the avatar in an anchor to the profile page. */
  navigate?: boolean;
}

/**
 * Translation of `@openpeepshq/svelte/components/core/profile/Avatar.svelte`.
 * Renders a circular avatar with the profile picture, falling back to
 * letter initials on a handle-hashed background. Soft-deleted profiles use a
 * dedicated glyph and never link to a profile page.
 */
export function Avatar({
  profile,
  size = 3.5,
  borderless = false,
  containerClassName,
  navigate = false,
}: AvatarProps) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const theme = getTheme(serverInfo.communityConfig, profileSettings);
  const deleted = isDeletedProfile(profile);

  // Use initials when no avatar is set, regardless of community config.
  const src = deleted ? null : profile?.avatar;
  const iconSize = Math.max(12, size * 8);

  const borderClass = borderless
    ? ''
    : 'border-4 border-border hover:border-border-2';

  const hue = hueFromHandle(profile?.handle ?? '');
  const backgroundColor =
    src || deleted ? undefined : initialsBackground(hue, theme.dark);

  const inner = (
    <div
      className={`bg-surface-2 relative inline-flex items-center justify-center overflow-hidden rounded-full ${borderClass}`}
      style={{
        width: `${size}rem`,
        height: `${size}rem`,
        backgroundColor,
      }}
    >
      {deleted ? (
        <UserX
          aria-label={profile?.displayName || 'Deleted author'}
          className="text-muted-foreground"
          size={iconSize}
        />
      ) : src ? (
        <img
          src={svgCoverSrc(src)}
          alt={profile?.displayName || profile?.handle || 'avatar'}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className="text-primary font-medium"
          style={{ fontSize: `${size / 4}rem` }}
        >
          {getInitials(profile?.displayName, profile?.handle)}
        </span>
      )}
    </div>
  );

  return (
    <div
      className={containerClassName}
      style={{
        width: `${size}rem`,
        height: `${size}rem`,
        minWidth: `${size}rem`,
      }}
    >
      {navigate && profile && !deleted ? (
        <a href={`/@${profile.handle}`}>{inner}</a>
      ) : (
        inner
      )}
    </div>
  );
}

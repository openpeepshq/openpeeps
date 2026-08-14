import type { PublicProfile } from '@openpeepshq/common/types';
import { getTheme, isDeletedProfile } from '@openpeepshq/common';
import { UserX } from 'lucide-react';

import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from '../layout/IdentityContext';
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

const initials = (profile?: PublicProfile): string => {
  const name = profile?.displayName || profile?.handle || '?';
  const parts = name.split(' ');
  return [parts.at(0), parts.at(-1)]
    .filter(Boolean)
    .map((part) => part?.substring(0, 1).toUpperCase())
    .join('');
};

/**
 * Translation of `@openpeepshq/svelte/components/core/profile/Avatar.svelte`.
 * Renders a circular avatar with the profile picture, falling back to the
 * community's `defaultProfileAvatar` and finally to letter initials.
 * Soft-deleted profiles use a dedicated glyph and never link to a profile page.
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
  const defaultAvatar = getTheme(
    serverInfo.communityConfig,
    profileSettings,
  ).defaultProfileAvatar;
  const deleted = isDeletedProfile(profile);

  const src = deleted ? null : profile?.avatar || defaultAvatar;
  const iconSize = Math.max(12, size * 8);

  const borderClass = borderless
    ? ''
    : 'border-4 border-border hover:border-neutral-500';

  const inner = (
    <div
      className={`bg-surface-2 relative inline-flex items-center justify-center overflow-hidden rounded-full ${borderClass}`}
      style={{ width: `${size}rem`, height: `${size}rem` }}
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
        <span className="text-foreground/80 text-sm font-medium">
          {initials(profile)}
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

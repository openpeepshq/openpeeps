import type { PublicProfile } from '@openpeeps/common/types';
import { getTheme } from '@openpeeps/common';

import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from '../layout/IdentityContext';

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
 * Translation of `@openpeeps/svelte/components/core/profile/Avatar.svelte`.
 * Renders a circular avatar with the profile picture, falling back to the
 * community's `defaultProfileAvatar` and finally to letter initials.
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
  const defaultAvatar = getTheme(serverInfo.communityConfig, profileSettings)
    .defaultProfileAvatar;

  const src = profile?.avatar || defaultAvatar;

  const borderClass = borderless
    ? ''
    : 'border-4 border-surface-300 hover:border-neutral-500';

  const inner = (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-surface-200 ${borderClass}`}
      style={{ width: `${size}rem`, height: `${size}rem` }}
    >
      {src ? (
        <img
          src={src}
          alt={profile?.displayName || profile?.handle || 'avatar'}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="text-sm font-medium text-foreground/80">
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
      {navigate && profile ? (
        <a href={`/@${profile.handle}`}>{inner}</a>
      ) : (
        inner
      )}
    </div>
  );
}

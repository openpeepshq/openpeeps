import type { PublicProfile } from '@openpeeps/common/types';
import { Avatar } from './Avatar';

export interface ProfileCardProps {
  profile: PublicProfile;
}

/**
 * Compact card listing one profile (used by search results / member lists).
 * Translation of `core/profile/ProfileCard.svelte` (the Svelte version also
 * embeds a Follow/Unfollow button — port that as a follow-up).
 */
export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <a
      href={`/@${profile.handle}`}
      className="flex items-center gap-3 border-b p-4 hover:bg-surface-100"
    >
      <Avatar profile={profile} size={3} />
      <div className="flex flex-col">
        <span className="text-sm font-semibold">
          {profile.displayName || `@${profile.handle}`}
        </span>
        <span className="text-xs text-muted-foreground">
          @{profile.handle}
        </span>
        {profile.bio && (
          <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {profile.bio}
          </span>
        )}
      </div>
    </a>
  );
}

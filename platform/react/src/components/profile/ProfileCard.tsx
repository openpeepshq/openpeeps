import type { PublicProfile } from '@openpeeps/common/types';
import { Avatar } from './Avatar';
import { FollowUnfollowButton } from './FollowUnfollowButton';

export interface ProfileCardProps {
  profile: PublicProfile;
  /**
   * When provided, the card acts as a selection control: clicking it calls
   * `onSelect` instead of navigating to the profile page. Used in selection
   * contexts such as starting a new conversation.
   */
  onSelect?: (profile: PublicProfile) => void;
  showAction?: boolean;
}

/**
 * Compact card listing one profile (used by search results / member lists).
 * Translation of `core/profile/ProfileCard.svelte`, including the
 * Follow/Unfollow action button.
 */
export function ProfileCard({ profile, onSelect, showAction = true }: ProfileCardProps) {
  const details = (
    <>
      <Avatar profile={profile} size={3} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">
          {profile.displayName || `@${profile.handle}`}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          @{profile.handle}
        </span>
        {profile.bio && (
          <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {profile.bio}
          </span>
        )}
      </div>
    </>
  );

  return (
    <div className="flex items-center justify-between gap-3 border-b p-4 hover:bg-surface-100">
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(profile)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {details}
        </button>
      ) : (
        <a
          href={`/@${profile.handle}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {details}
        </a>
      )}
      {showAction && (
        <div className="flex-shrink-0">
          <FollowUnfollowButton profile={profile} compact />
        </div>
      )}
    </div>
  );
}

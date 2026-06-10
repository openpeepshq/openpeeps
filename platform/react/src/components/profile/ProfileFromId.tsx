import { useOpenpeeps } from '../../contexts/openpeeps';
import { Avatar } from './Avatar';
import { FollowUnfollowButton } from './FollowUnfollowButton';

export interface ProfileFromIdProps {
  profileId: string;
  avatarSize?: number;
  action?: React.ReactNode;
}

export function ProfileFromId({
  profileId,
  avatarSize = 2,
  action,
}: ProfileFromIdProps) {
  const { openpeepsApi } = useOpenpeeps();
  const profileQuery = openpeepsApi.useProfile(profileId);
  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <div className="text-muted-foreground py-2 text-sm">
        Loading…
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex items-center justify-between py-2">
      <a href={`/@${profile.handle}`} className="flex items-center gap-2">
        <Avatar profile={profile} size={avatarSize} />
        <div>
          <p className="text-sm font-semibold">
            {profile.displayName || profile.handle}
          </p>
          <span className="text-muted-foreground text-xs">
            @{profile.handle}
          </span>
        </div>
      </a>
      {action ?? <FollowUnfollowButton profile={profile} compact />}
    </div>
  );
}

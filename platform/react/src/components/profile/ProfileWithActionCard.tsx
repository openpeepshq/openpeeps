import type { PublicProfile } from '@openpeepshq/common/types';
import { Avatar } from './Avatar';
import { FollowUnfollowButton } from './FollowUnfollowButton';

export interface ProfileWithActionCardProps {
  profile: PublicProfile;
}

export function ProfileWithActionCard({ profile }: ProfileWithActionCardProps) {
  return (
    <div className="mb-4 flex w-full items-center justify-between">
      <a href={`/@${profile.handle}`} className="flex items-center gap-2">
        <Avatar profile={profile} />
        <div>
          <p className="font-bold">
            {profile.displayName || profile.handle}
          </p>
          <span className="text-muted-foreground text-sm">
            @{profile.handle}
          </span>
        </div>
      </a>
      <FollowUnfollowButton profile={profile} compact />
    </div>
  );
}

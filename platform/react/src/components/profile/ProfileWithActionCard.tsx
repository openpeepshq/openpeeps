import type { ReactNode } from 'react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { Avatar } from './Avatar';
import { FollowUnfollowButton } from './FollowUnfollowButton';

export interface ProfileWithActionCardProps {
  profile: PublicProfile;
  leading?: ReactNode;
}

export function ProfileWithActionCard({
  profile,
  leading,
}: ProfileWithActionCardProps) {
  return (
    <div className="mb-4 flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        {leading}
        <a href={`/@${profile.handle}`} className="flex items-center gap-2">
          <Avatar profile={profile} />
          <div>
            <p className="font-bold">{profile.displayName || profile.handle}</p>
            <span className="text-muted-foreground text-sm">
              @{profile.handle}
            </span>
          </div>
        </a>
      </div>
      <FollowUnfollowButton profile={profile} compact />
    </div>
  );
}

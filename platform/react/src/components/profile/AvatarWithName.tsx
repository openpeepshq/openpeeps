import type { PublicProfile } from '@openpeepshq/common/types';
import { Avatar } from './Avatar';

export interface AvatarWithNameProps {
  profile?: PublicProfile;
}

export function AvatarWithName({ profile }: AvatarWithNameProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Avatar profile={profile} size={1.5} borderless />
      {profile?.displayName || profile?.handle}
    </div>
  );
}

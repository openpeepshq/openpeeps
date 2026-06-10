import type { PublicProfile } from '@openpeeps/common/types';
import { useT } from '../../i18n';

export interface ProfileStatsProps {
  profile: PublicProfile;
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const t = useT();

  return (
    <div className="mt-2 flex items-center gap-x-4 px-2">
      <a
        href={`/@${profile.handle}/followers`}
        className="text-sm hover:underline"
      >
        <span className="font-semibold">
          {profile.profileStats?.followersCount ?? 0}
        </span>{' '}
        {t('profile.followers.title', { defaultValue: 'Followers' })}
      </a>
      <a
        href={`/@${profile.handle}/following`}
        className="text-sm hover:underline"
      >
        <span className="font-semibold">
          {profile.profileStats?.followingCount ?? 0}
        </span>{' '}
        {t('profile.following.title', { defaultValue: 'Following' })}
      </a>
    </div>
  );
}

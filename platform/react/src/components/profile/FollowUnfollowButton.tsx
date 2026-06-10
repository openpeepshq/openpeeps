import type { PublicProfile } from '@openpeeps/common/types';
import { Button } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';

export interface FollowUnfollowButtonProps {
  profile: PublicProfile;
  compact?: boolean;
}

export function FollowUnfollowButton({
  profile,
  compact = false,
}: FollowUnfollowButtonProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const followProfile = openpeepsApi.followProfileAction({ id: profile.id });
  const unfollowProfile = openpeepsApi.unfollowProfileAction({ id: profile.id });

  if (!me || me.id === profile.id) return null;

  const isFollowing = me.following?.some((f) => f.id === profile.id);

  if (isFollowing) {
    return (
      <Button
        compact={compact}
        variant="variant-ringed-secondary"
        action={() => unfollowProfile(undefined)}
      >
        {t('profile.actions.unfollow', { defaultValue: 'Unfollow' })}
      </Button>
    );
  }

  return (
    <Button
      compact={compact}
      variant="variant-filled-primary"
      action={() => followProfile({ reblogs: true, notify: true })}
    >
      {t('profile.actions.follow', { defaultValue: 'Follow' })}
    </Button>
  );
}

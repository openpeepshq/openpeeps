import type { PublicProfile } from '@openpeepshq/common/types';
import { Button, PopupMenuButton } from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';

export interface FollowUnfollowButtonProps {
  profile: PublicProfile;
  compact?: boolean;
  /** Render as a PopupMenuButton (for use inside a PopupMenu) instead of a Button. */
  popup?: boolean;
  onSuccess?: () => void;
}

export function FollowUnfollowButton({
  profile,
  compact = false,
  popup = false,
  onSuccess,
}: FollowUnfollowButtonProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const followProfile = openpeepsApi.followProfileAction({ id: profile.id });
  const unfollowProfile = openpeepsApi.unfollowProfileAction({
    id: profile.id,
  });

  const follow = async () => {
    await followProfile({ reblogs: true, notify: true });
    onSuccess?.();
  };
  const unfollow = async () => {
    await unfollowProfile(undefined);
    onSuccess?.();
  };

  if (!me || me.id === profile.id) return null;

  const isFollowing = me.following?.some((f) => f.id === profile.id);

  if (popup) {
    if (isFollowing) {
      return (
        <PopupMenuButton
          title={t('profile.actions.unfollow', { defaultValue: 'Unfollow' })}
          text={t('profile.actions.unfollow', { defaultValue: 'Unfollow' })}
          action={unfollow}
        />
      );
    }
    return (
      <PopupMenuButton
        title={t('profile.actions.follow', { defaultValue: 'Follow' })}
        text={t('profile.actions.follow', { defaultValue: 'Follow' })}
        action={follow}
      />
    );
  }

  if (isFollowing) {
    return (
      <Button compact={compact} variant="outline" action={unfollow}>
        {t('profile.actions.unfollow', { defaultValue: 'Unfollow' })}
      </Button>
    );
  }

  return (
    <Button compact={compact} variant="default" action={follow}>
      {t('profile.actions.follow', { defaultValue: 'Follow' })}
    </Button>
  );
}

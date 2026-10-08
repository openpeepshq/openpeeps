import type { PublicProfile } from '@openpeepshq/common/types';
import { Button, PopupMenuButton } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useFollowProfile } from '../../hooks/profile/useFollowProfile';

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
  const { isSelf, isFollowing, follow, unfollow } = useFollowProfile(
    profile,
    onSuccess,
  );

  if (isSelf) return null;

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

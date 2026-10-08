import type { PublicProfile } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export const useFollowProfile = (
  profile: PublicProfile,
  onSuccess?: () => void,
) => {
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const followProfile = openpeepsApi.followProfileAction({ id: profile.id });
  const unfollowProfile = openpeepsApi.unfollowProfileAction({
    id: profile.id,
  });

  const isSelf = !me || me.id === profile.id;
  const isFollowing = !!me?.following?.some(
    (followed) => followed.id === profile.id,
  );

  const follow = async () => {
    await followProfile({ reblogs: true, notify: true });
    onSuccess?.();
  };

  const unfollow = async () => {
    await unfollowProfile(undefined);
    onSuccess?.();
  };

  return { me, isSelf, isFollowing, follow, unfollow };
};

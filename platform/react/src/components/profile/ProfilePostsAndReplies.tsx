import type { PublicProfile } from '@openpeeps/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { Feed } from '../post/Feed';

export interface ProfilePostsAndRepliesProps {
  profile: PublicProfile;
}

/**
 * Translation of `profilePage/ProfilePostsAndReplies.svelte`. Renders the
 * profile's posts via `usePostsByProfile`. The Svelte version has a tab for
 * "common groups"; we leave that for a future port when `<GroupCard>` lands.
 */
export function ProfilePostsAndReplies({
  profile,
}: ProfilePostsAndRepliesProps) {
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.usePostsByProfile(profile.id, { limit: 15 });
  return <Feed query={query} />;
}

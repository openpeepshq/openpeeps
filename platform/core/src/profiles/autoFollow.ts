import { communityConfig } from '../config';
import { hub } from '../events';
import { getProfile } from './cache';
import { followDesignatedProfiles } from './mutations';

const handleProfileCreated = async (profileArg: unknown) => {
  const profile = profileArg as { id?: string } | undefined;
  if (!profile?.id) return;
  // Event payload predates applyCommunityRoleChanges; re-read for final
  // roles (and to skip profiles deleted before the job runs)
  const fresh = await getProfile(profile.id);
  if (!fresh) return;
  const autoFollow = (await communityConfig()).content.autoFollow;
  if (!autoFollow?.length) return;
  await followDesignatedProfiles(fresh, autoFollow);
};

let registered = false;
/** Subscribes the designated-account follows to profileCreated (once queue). */
export const registerAutoFollowHandler = () => {
  if (registered) return;
  registered = true;
  hub.once('profileCreated', handleProfileCreated);
};

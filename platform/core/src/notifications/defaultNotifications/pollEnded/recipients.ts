import { collectVotes } from '@openpeepshq/common/lib';
import type {
  PostWithMeta,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';

const addProfile = (
  byId: Map<string, PublicProfile>,
  profile?: PublicProfile | null,
) => {
  if (profile?.id) {
    byId.set(profile.id, profile);
  }
};

/** Poll author, voters, and parent post author when the poll is a reply. */
export const pollEndedRecipientProfiles = (
  post: PostWithMeta,
): PublicProfile[] => {
  const byId = new Map<string, PublicProfile>();
  addProfile(byId, post.profile as PublicProfile);
  addProfile(byId, post.replyTo?.profile as PublicProfile | undefined);

  const { votes } = collectVotes(post as unknown as PublicPost);
  for (const vote of votes) {
    addProfile(byId, vote.profile);
  }

  return [...byId.values()];
};

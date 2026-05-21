import {
  ExpandedNotification,
  PostWithMeta,
  NotificationHandler,
  PublicProfile,
  notificationAll,
} from '@openpeeps/common/types';
import { extractMentionHandles } from '@openpeeps/core/posts/helpers';
import { findPost } from '@openpeeps/core/posts';
import { findProfile, findProfileByHandle } from '@openpeeps/core/profiles';
import {
  maybeCreateNotification,
} from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';

const getMentionedProfiles = async (post: PostWithMeta): Promise<PublicProfile[]> => {
  const byId = new Map<string, PublicProfile>();

  for (const mention of post.mentions ?? []) {
    const profile = mention.profile;

    if (profile?.id) {
      byId.set(profile.id, profile as PublicProfile);
    }
  }

  if (byId.size === 0) {
    for (const handle of extractMentionHandles(post.data?.content)) {
      const profile = await findProfileByHandle(handle);

      if (profile) {
        byId.set(profile.id, profile);
      }
    }
  }

  return [...byId.values()];
};

export default {
  type: 'mention',
  event: 'postCreated',
  defaultSettings: notificationAll,
  eventHandler: async (data: unknown) => {
    const post = data as PostWithMeta;

    if (post.data?.type === 'event') {
      return;
    }

    if (post.visibility === 'direct') {
      return;
    }

    const mentionedProfiles = await getMentionedProfiles(post);

    if (!mentionedProfiles.length) {
      return;
    }

    let replyTargetProfileId: string | undefined;
    if (post.inReplyToId) {
      const repliedPost = await findPost(post.inReplyToId);
      replyTargetProfileId = (repliedPost?.profile as PublicProfile | undefined)?.id;
    }

    const notified = new Set<string>();

    for (const mentionedProfile of mentionedProfiles) {
      if (mentionedProfile.id === post.profile.id) {
        continue;
      }

      if (mentionedProfile.id === replyTargetProfileId) {
        continue;
      }

      if (notified.has(mentionedProfile.id)) {
        continue;
      }

      notified.add(mentionedProfile.id);

      const targetProfile = await findProfile(mentionedProfile.id);

      if (targetProfile) {
        await maybeCreateNotification(targetProfile, {
          type: 'mention',
          postId: post.id,
          fromProfileId: post.profile.id,
        });
      }
    }
  },
  pushRenderer: async (notification: ExpandedNotification) => ({
    title: `${profileName(notification.senderProfile!)} mentioned you`,
    options: {
      body: notification.post?.data?.content,
      icon: getProfileAvatar(notification.senderProfile, await communityConfig()),
      actions: [
        {
          action: `goto:/posts/${notification.post?.id}`,
          title: 'Go to post',
        },
      ],
    },
  }),
} satisfies NotificationHandler;

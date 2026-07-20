import type {
  GroupWithMeta,
  NotificationHandler,
  ProfileWithMeta,
} from '@openpeeps/common/types';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import {
  getProfileAvatar,
  groupName,
  profileName,
} from '@openpeeps/common/lib';
import { listGroupMembers } from '@openpeeps/core/profiles';
import { communityConfig } from '../../../config';

export default {
  type: 'groupMemberJoined',
  event: 'groupMemberJoined',
  eventHandler: async (...args) => {
    const [group, profile] = args as [GroupWithMeta, ProfileWithMeta];

    for (const groupAdmin of await listGroupMembers(group).then((members) =>
      members.filter((m) => m.roles?.includes('admin')).map((m) => m.profile),
    )) {
      await maybeCreateNotification(groupAdmin, {
        type: 'groupMemberJoined',
        fromProfileId: profile.id,
        groupId: group.id,
      });
    }
  },
  pushRenderer: async (notification) => ({
    title: `New member ${profileName(notification.senderProfile!)} joined ${groupName(notification.group as GroupWithMeta)}`,
    options: {
      body: "Let's welcome them!",
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:/@${notification.senderProfile?.handle}`,
          title: 'View Profile',
        },
      ],
    },
  }),
} satisfies NotificationHandler;

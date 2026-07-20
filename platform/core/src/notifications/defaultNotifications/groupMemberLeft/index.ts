import type {
  GroupWithMeta,
  NotificationHandler,
  Profile,
} from '@openpeeps/common/types';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import {
  checkCapabilities,
  getProfileAvatar,
  groupName,
  profileName,
} from '@openpeeps/common/lib';
import { listGroupMembers } from '@openpeeps/core/profiles';
import { communityConfig } from '../../../config';

export default {
  type: 'groupMemberLeft',
  event: 'groupMemberLeft',
  eventHandler: async (...args) => {
    const [group, profile] = args as [GroupWithMeta, Profile];

    for (const groupAdmin of await listGroupMembers(group).then((members) =>
      members.filter((m) => m.roles?.includes('admin')).map((m) => m.profile),
    )) {
      await maybeCreateNotification(groupAdmin, {
        type: 'groupMemberLeft',
        fromProfileId: profile.id,
        groupId: group.id,
      });
    }
  },
  pushRenderer: async (notification) => ({
    title: `Group member ${profileName(notification.senderProfile!)} exited ${groupName(notification.group as GroupWithMeta)}`,
    options: {
      body: "They're no longer a member of the group.",
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:/groups/@${notification.group?.handle}`,
          title: 'View Group',
        },
      ],
    },
  }),
} satisfies NotificationHandler;

import type {
  GroupWithMeta,
  NotificationHandler,
  Profile,
  PublicProfile,
} from '@openpeepshq/common/types';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { getProfileAvatar, groupName } from '@openpeepshq/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

export default {
  type: 'groupAdded',
  event: 'groupMemberAdded',
  eventHandler: async (...args) => {
    const [group, profile, adder] = args as [
      GroupWithMeta,
      PublicProfile,
      Profile,
    ];
    await maybeCreateNotification(profile, {
      type: 'groupAdded',
      fromProfileId: adder.id,
      groupId: group.id,
    });
  },
  pushRenderer: async (notification) => ({
    title: `You've been added to ${groupName(notification.group as GroupWithMeta)}`,
    options: {
      body: 'Welcome to the group!',
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
    invalidateQueries: [PUSH_INVALIDATE.groups],
  }),
} satisfies NotificationHandler;

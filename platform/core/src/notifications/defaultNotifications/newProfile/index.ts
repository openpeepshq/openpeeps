import {
  NotificationHandler,
  Profile,
  notificationAll,
} from '@openpeeps/common/types';
import { listProfilesWithCapabilities } from '@openpeeps/core/profiles';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

export default {
  type: 'newProfile',
  event: 'profileCreated',
  requiredCapabilities: ['core-profiles-roles-update'],
  defaultSettings: notificationAll,
  eventHandler: async (data: unknown) => {
    const profile = data as Profile;
    for (const recipientProfile of await listProfilesWithCapabilities([
      'allpeep-core-member-management',
    ])) {
      await maybeCreateNotification(recipientProfile, {
        type: 'newProfile',
        fromProfileId: profile.id,
      });
    }
  },
  pushRenderer: async (notification) => ({
    title: `New user ${profileName(notification.senderProfile!)} joined`,
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
    invalidateQueries: [PUSH_INVALIDATE.profiles],
  }),
} satisfies NotificationHandler;

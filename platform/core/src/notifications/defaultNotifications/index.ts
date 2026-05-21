import { pick } from '@openpeeps/common/lib';
import { registerNotificationHandler } from '../handlers';
import { default as announcement } from './announcement';
import { default as directMessage } from './directMessage';
import { default as follow } from './follow';
import { default as jamModerator } from './jamModerator';
import { default as jamSpeaker } from './jamSpeaker';
import { default as jamStarted } from './jamStarted';
import { default as newProfile } from './newProfile';
import { default as reaction } from './reaction';
import { default as reply } from './reply';
import { default as mention } from './mention';
import { default as repost } from './repost';
import { default as groupAdded } from './groupAdded';
import { default as groupMemberJoined } from './groupMemberJoined';
import { default as groupMemberLeft } from './groupMemberLeft';
import { default as pollVote } from './pollVote';
import { default as newGroupPost } from './newGroupPost';
import { default as rsvp } from './rsvp';
import type { NotificationHandler, NotificationType } from '@openpeeps/common/types';

const defaultNotificationsHandlers: NotificationHandler[] = [
  announcement,
  directMessage,
  follow,
  jamModerator,
  // jamSpeaker,
  jamStarted,
  newProfile,
  reaction,
  repost,
  reply,
  mention,
  groupAdded,
  groupMemberJoined,
  groupMemberLeft,
  pollVote,
  newGroupPost,
  rsvp,
];

export const defaultNotificationTypes: NotificationType[] =
  defaultNotificationsHandlers.map((handler) => pick(handler, 'type', 'requiredCapabilities', 'defaultSettings'));

export const registerDefaultNotifications = async () => {
  for (const handler of defaultNotificationsHandlers) {
    registerNotificationHandler(handler);
  }
};

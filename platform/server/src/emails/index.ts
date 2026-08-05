import { registerEmailRenderer } from '@openpeeps/core/email';

import { reactEmailRenderer } from './renderer';
import type { ReactEmailTemplate } from './types';

import welcomeTemplate from './defaultTemplates/welcome';
import testTemplate from './defaultTemplates/test';
import validateEmailTemplate from './defaultTemplates/validate-email';
import resetPasswordTemplate from './defaultTemplates/reset-password';
import eventRsvpConfirmationTemplate from './defaultTemplates/event-rsvp-confirmation';
import analyticsMonthlyReportTemplate from './defaultTemplates/analytics-monthly-report';

import announcementTemplate from './notifications/announcement';
import directMessageTemplate from './notifications/direct-message';
import followTemplate from './notifications/follow';
import jamModeratorTemplate from './notifications/jam-moderator';
import jamSpeakerTemplate from './notifications/jam-speaker';
import jamStartedTemplate from './notifications/jam-started';
import newProfileTemplate from './notifications/new-profile';
import reactionTemplate from './notifications/reaction';
import replyTemplate from './notifications/reply';
import repostTemplate from './notifications/repost';
import mentionTemplate from './notifications/mention';
import groupMemberJoinedTemplate from './notifications/groupMemberJoined';
import groupMemberLeftTemplate from './notifications/groupMemberLeft';
import groupAddedTemplate from './notifications/groupAdded';
import newGroupPostTemplate from './notifications/new-group-post';

export { reactEmailRenderer } from './renderer';
export type { ReactEmailTemplate } from './types';

const register = <Locals>(
  templateId: string,
  template: ReactEmailTemplate<Locals>,
) => {
  registerEmailRenderer(templateId, reactEmailRenderer(template));
};

export const registerDefaultEmailTemplates = () => {
  register('welcome', welcomeTemplate);
  register('test', testTemplate);
  register('validateEmail', validateEmailTemplate);
  register('resetPassword', resetPasswordTemplate);
  register('eventRsvpConfirmation', eventRsvpConfirmationTemplate);
  register('analyticsMonthlyReport', analyticsMonthlyReportTemplate);

  register('notification-announcement', announcementTemplate);
  register('notification-directMessage', directMessageTemplate);
  register('notification-follow', followTemplate);
  register('notification-jamModerator', jamModeratorTemplate);
  register('notification-jamSpeaker', jamSpeakerTemplate);
  register('notification-jamStarted', jamStartedTemplate);
  register('notification-newProfile', newProfileTemplate);
  register('notification-reaction', reactionTemplate);
  register('notification-reply', replyTemplate);
  register('notification-repost', repostTemplate);
  register('notification-mention', mentionTemplate);
  register('notification-groupMemberJoined', groupMemberJoinedTemplate);
  register('notification-groupMemberLeft', groupMemberLeftTemplate);
  register('notification-groupAdded', groupAddedTemplate);
  register('notification-newGroupPost', newGroupPostTemplate);
};

import { registerEmailRenderer } from '@openpeeps/core/email';

import { svelteEmailRenderer } from '@openpeeps/svelte/components';
import type { SvelteEmailTemplate } from '@openpeeps/svelte';

const registerNotificationEmailRenderer = async (notificationType: string) => {
  const allPeepSvelte = await import('@openpeeps/svelte/components');

  const template = allPeepSvelte[
    `${notificationType}Email` as keyof typeof allPeepSvelte
  ] as SvelteEmailTemplate;

  registerEmailRenderer(
    `notification-${notificationType}`,
    svelteEmailRenderer(template),
  );
};
const registerDefaultEmailRenderer = async (emailType: string) => {
  const allPeepSvelte = await import('@openpeeps/svelte/components');

  const template = allPeepSvelte[
    `${emailType}Email` as keyof typeof allPeepSvelte
  ] as SvelteEmailTemplate;
  registerEmailRenderer(emailType, svelteEmailRenderer(template));
};

export const registerDefaultEmailTemplates = async () => {
  await registerDefaultEmailRenderer('welcome');
  await registerDefaultEmailRenderer('test');
  await registerDefaultEmailRenderer('validateEmail');
  await registerDefaultEmailRenderer('resetPassword');

  await registerNotificationEmailRenderer('announcement');
  await registerNotificationEmailRenderer('directMessage');
  await registerNotificationEmailRenderer('follow');
  await registerNotificationEmailRenderer('jamModerator');
  await registerNotificationEmailRenderer('jamSpeaker');
  await registerNotificationEmailRenderer('jamStarted');
  await registerNotificationEmailRenderer('newProfile');
  await registerNotificationEmailRenderer('reaction');
  await registerNotificationEmailRenderer('reply');
  await registerNotificationEmailRenderer('mention');
  await registerNotificationEmailRenderer('repost');
  await registerNotificationEmailRenderer('groupMemberJoined');
  await registerNotificationEmailRenderer('groupMemberLeft');
  await registerNotificationEmailRenderer('groupAdded');
  await registerNotificationEmailRenderer('newGroupPost');
};

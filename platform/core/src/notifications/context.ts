import {
  notificationContextSchema,
  pluginSettingsEnvelopeSchema,
  type ExpandedNotification,
  type NotificationContext,
} from '@openpeepshq/common/types';

import { findStoredProfileSettings } from '../profileSettings';
import { getEnabledPluginKeys } from '../plugins';

export type NotificationContextBuilder = () => Promise<
  NotificationContext | undefined
>;

const conversationIdFor = (
  notification: ExpandedNotification,
): string | undefined => {
  const data = notification.data;
  if (data && typeof data === 'object' && 'conversationStart' in data) {
    const conversationStart = data.conversationStart;
    if (
      conversationStart &&
      typeof conversationStart === 'object' &&
      'id' in conversationStart &&
      typeof conversationStart.id === 'string'
    ) {
      return conversationStart.id;
    }
  }
  return notification.post?.id;
};

const notificationContextFor = (
  notification: ExpandedNotification,
): NotificationContext | undefined => {
  const triggerPostId = notification.post?.id;
  const senderProfileId = notification.senderProfile?.id;
  const recipientProfileId = notification.recipientProfile.id;
  const conversationId = conversationIdFor(notification);
  if (
    !triggerPostId ||
    !senderProfileId ||
    !recipientProfileId ||
    !conversationId
  ) {
    return undefined;
  }
  return notificationContextSchema.parse({
    schema: 'openpeeps.direct-message/v1',
    triggerPostId,
    senderProfileId,
    recipientProfileId,
    conversationId,
    activePluginContexts: [],
  });
};

export const buildNotificationContext = async (
  notification: ExpandedNotification,
): Promise<NotificationContext | undefined> => {
  if (notification.type !== 'directMessage') return undefined;
  const context = notificationContextFor(notification);
  if (!context) return undefined;

  try {
    const [enabledKeys, senderSettings] = await Promise.all([
      getEnabledPluginKeys(),
      notification.senderProfile?.id
        ? findStoredProfileSettings(notification.senderProfile.id)
        : Promise.resolve(undefined),
    ]);
    const enabled = new Set(enabledKeys);
    const activePluginContexts = Object.entries(
      senderSettings?.pluginSettings ?? {},
    )
      .filter(([key, value]) => {
        if (!enabled.has(key)) return false;
        const parsed = pluginSettingsEnvelopeSchema.safeParse(value);
        return parsed.success && parsed.data.contexts.directMessage;
      })
      .map(([key]) => key)
      .sort();

    return notificationContextSchema.parse({
      ...context,
      activePluginContexts: Array.from(new Set(activePluginContexts)),
    });
  } catch {
    return context;
  }
};

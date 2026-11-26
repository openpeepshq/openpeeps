import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  truncateText,
  type JamEvent,
  type PublicProfile,
} from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { UpdatingDate } from '../custom/date/updating-date';
import { OpenpeepsMarkdown } from '../markdown/index';
import { ThemedText } from '../ui/themed-text';
import { ProfileAvatar } from '../profile/Avatar';

const attendance = ['join', 'leave', 'start', 'close'] as const;

const attendanceMap = {
  join: 'joined',
  leave: 'left',
  start: 'started',
  close: 'closed',
} as const;

export interface JamChatMessageProps {
  message: JamEvent;
  mentionProfiles?: PublicProfile[];
  /**
   * Set when the viewer may delete this message (host / moderator / author).
   * Long-pressing the bubble then fires it so the drawer can confirm and
   * delete; when omitted the message renders exactly as before.
   */
  onDelete?: () => void;
}

export const JamChatMessage = ({
  message,
  mentionProfiles = [],
  onDelete,
}: JamChatMessageProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const profileQuery = openpeepsApi.useProfile(message.profileId || 'unknown');
  const profile = profileQuery.data;
  const mentions = useMemo(() => {
    const items = mentionProfiles.map((item) => ({ profile: item }));
    if (!profile) return items;
    if (items.some((item) => item.profile.id === profile.id)) return items;
    return [{ profile }, ...items];
  }, [mentionProfiles, profile]);

  if (!message.profileId || profileQuery.isLoading || !profile) {
    return null;
  }

  const name = profile.displayName || `@${profile.handle}`;

  if (message.type === 'message') {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={onDelete}
        accessibilityRole={onDelete ? 'button' : undefined}
        accessibilityLabel={onDelete ? t('jams.chat.deleteTitle') : undefined}
        className="w-full flex-row gap-x-1"
      >
        <View className="w-1/5 items-center">
          <ProfileAvatar profile={profile} className="size-8" />
        </View>
        <View className="w-4/5">
          <View className="w-full flex-row items-center gap-x-1">
            <ThemedText className="font-semibold">
              {truncateText(name, 10)}
            </ThemedText>
            <ThemedText className="text-sm text-muted-foreground">
              <UpdatingDate date={message.createdAt} />
            </ThemedText>
          </View>
          <OpenpeepsMarkdown
            source={message.content ?? ''}
            mentions={mentions}
            linkPreviewMode="none"
          />
        </View>
      </TouchableOpacity>
    );
  }

  if (attendance.includes(message.type as (typeof attendance)[number])) {
    const label =
      attendanceMap[message.type as keyof typeof attendanceMap] ?? message.type;
    return (
      <View className="items-center justify-center">
        <ThemedText className="text-center text-sm text-muted-foreground">
          {name} {label} the jam <UpdatingDate date={message.createdAt} />
        </ThemedText>
      </View>
    );
  }

  if (message.type === 'kicked') {
    return (
      <View className="items-center justify-center">
        <ThemedText className="text-center text-sm text-muted-foreground">
          {name} {t('jams.chat.wasRemoved')}{' '}
          <UpdatingDate date={message.createdAt} />
        </ThemedText>
      </View>
    );
  }

  return null;
};

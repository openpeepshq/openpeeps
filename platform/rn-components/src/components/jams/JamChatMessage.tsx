import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  truncateText,
  type JamEvent,
  type PublicProfile,
} from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { UpdatingDate } from '~/components/custom/date/updating-date';
import { OpenpeepsMarkdown } from '~/components/markdown';
import { ThemedText } from '~/components/ui/themed-text';
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
}

export const JamChatMessage = ({
  message,
  mentionProfiles = [],
}: JamChatMessageProps) => {
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
      <View className="w-full flex-row gap-x-1">
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
      </View>
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

  return null;
};

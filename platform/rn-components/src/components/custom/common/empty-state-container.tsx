import { View } from 'react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../ui/themed-text';
import {
  BellOffIcon,
  MessageSquareOffIcon,
  CalendarXIcon,
  PhoneOffIcon,
  RssIcon,
  UserRoundXIcon,
} from '../../icons/index';
import { EmptyStateContainerType } from '../../../types';

interface EmptyStateContainerProps {
  type: EmptyStateContainerType;
  copyKey: string;
  defaultValue?: string;
}

export const EmptyStateContainer = ({
  type,
  copyKey,
  defaultValue,
}: EmptyStateContainerProps) => {
  const { t } = useTranslation();
  const iconClass = 'text-muted-foreground';
  const icon =
    type === 'events' ? (
      <CalendarXIcon size={80} className={iconClass} />
    ) : type === 'messages' ? (
      <MessageSquareOffIcon size={80} className={iconClass} />
    ) : type === 'notifications' ? (
      <BellOffIcon size={80} className={iconClass} />
    ) : type === 'live-jams' ||
      type === 'upcoming-jams' ||
      type === 'my-jams' ||
      type === 'recorded-jams' ? (
      <PhoneOffIcon size={80} className={iconClass} />
    ) : type === 'groups' ||
      type === 'profiles' ||
      type === 'followers' ||
      type === 'following' ||
      type === 'event-attendees' ? (
      <UserRoundXIcon size={80} className={iconClass} />
    ) : (
      <RssIcon size={80} className={iconClass} />
    );

  return (
    <View className="h-96 w-full flex-col items-center justify-center gap-y-4 bg-surface">
      {icon}
      <ThemedText className="text-xl">
        {t(copyKey, defaultValue ? { defaultValue } : undefined)}
      </ThemedText>
    </View>
  );
};

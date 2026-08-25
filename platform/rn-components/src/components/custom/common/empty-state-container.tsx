import {View} from 'react-native';
import React from 'react';
import {ThemedText} from '~/components/ui/themed-text';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import {
  BellOffIcon,
  MessageSquareOffIcon,
  CalendarXIcon,
  PhoneOffIcon,
  RssIcon,
  UserRoundXIcon,
} from '~/components/icons';
import { EmptyStateContainerType } from '~/types';
interface EmptyStateContainerProps {
  type: EmptyStateContainerType;
  inviteLabel?: string;
  onInvite?: () => void;
}
export const EmptyStateContainer = ({
  type,
  inviteLabel,
  onInvite,
}: EmptyStateContainerProps) => {
  switch (type) {
    case 'posts':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <RssIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No posts yet</ThemedText>
          {inviteLabel && onInvite ? (
            <Button className="mt-4" onPress={onInvite}>
              <Text>{inviteLabel}</Text>
            </Button>
          ) : null}
        </View>
      );
    case 'reply':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <RssIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No replies yet</ThemedText>
        </View>
      );
    case 'events':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <CalendarXIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No events yet</ThemedText>
        </View>
      );
    case 'groups':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <UserRoundXIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No Groups Found</ThemedText>
          {inviteLabel && onInvite ? (
            <Button className="mt-4" onPress={onInvite}>
              <Text>{inviteLabel}</Text>
            </Button>
          ) : null}
        </View>
      );
    case 'profiles':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <UserRoundXIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No Profile Found</ThemedText>
        </View>
      );
    case 'followers':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <UserRoundXIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No followers yet</ThemedText>
        </View>
      );
    case 'following':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <UserRoundXIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No followings yet</ThemedText>
        </View>
      );
    case 'messages':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <MessageSquareOffIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No conversations here</ThemedText>
        </View>
      );
    case 'notifications':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <BellOffIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No Notifications yet</ThemedText>
        </View>
      );
    case 'live-jams':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <PhoneOffIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No live jam to join yet</ThemedText>
        </View>
      );
    case 'upcoming-jams':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <PhoneOffIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No upcoming jams yet</ThemedText>
        </View>
      );
    case 'my-jams':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <PhoneOffIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No jams yet</ThemedText>
        </View>
      );
    case 'recorded-jams':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <PhoneOffIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No jams yet</ThemedText>
        </View>
      );
    case 'event-attendees':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <UserRoundXIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No attendees yet</ThemedText>
        </View>
      );
    case 'event-description':
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <RssIcon size={64} className="text-foreground" />
          <ThemedText className="mt-6">No description added</ThemedText>
        </View>
      );
    default:
      return (
        <View className="flex flex-1 h-64 items-center justify-center">
          <ThemedText className="mt-6">Empty State Container</ThemedText>
        </View>
      );
  }
};

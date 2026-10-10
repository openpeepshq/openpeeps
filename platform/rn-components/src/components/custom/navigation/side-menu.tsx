import React from 'react';
import { ScrollView } from 'react-native';
import { Separator } from '../../ui/separator';
import { Image, TouchableOpacity, View } from 'react-native';
import { Button } from '../../ui/button';
import {
  BellIcon,
  BookCheckIcon,
  BookmarkIcon,
  BookUserIcon,
  CalendarDaysIcon,
  HomeIcon,
  LogOutIcon,
  MessageSquareTextIcon,
  NewspaperIcon,
  PhoneCallIcon,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  SquarePenIcon,
  UsersIcon,
  XIcon,
} from '../../icons/index';
import { ThemedText } from '../../ui/themed-text';
import { useWindowSize } from '../../../hooks/helper';
import { useAppImagesStore } from '../../../stores/useAppImagesStore';
import { formatBadgeCount } from '@openpeepshq/common';
import { buildMainNavItems, useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from '../../profile/Avatar';
import type { GotoHandlerParams } from '../../../types/goto';
import type { LucideProps } from 'lucide-react-native';

const menuIcons: Record<string, React.ComponentType<LucideProps>> = {
  community: HomeIcon,
  welcome: BookCheckIcon,
  explore: SearchIcon,
  myFeed: NewspaperIcon,
  jams: PhoneCallIcon,
  groups: UsersIcon,
  events: CalendarDaysIcon,
  articles: ScrollTextIcon,
  messages: MessageSquareTextIcon,
  members: BookUserIcon,
  bookmarks: BookmarkIcon,
  settings: SettingsIcon,
};

interface SideMenuProps {
  handleNavigation: ({
    target,
    params,
  }: {
    target: string;
    params?: GotoHandlerParams;
  }) => void;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  close?: () => void;
  handleNewPost: () => void;
}

export const SideMenu = ({
  handleNavigation,
  onNotificationPress,
  close,
  handleNewPost,
  onProfilePress,
}: SideMenuProps) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { isMediumScreenOrLarger } = useWindowSize();
  const { logoSmall } = useAppImagesStore();
  const logout = openpeepsApi.logoutAction();
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const unseenCounts = openpeepsApi.useUnseenPostCounts();

  const unreadGroupPosts = Object.values(
    unseenCounts.data?.groups ?? {}
  ).reduce((sum, count) => sum + count, 0);
  const unreadConversationThreads = Object.keys(
    unseenCounts.data?.direct ?? {}
  ).length;

  const menuUnreadCounts: Record<string, number> = {
    groups: unreadGroupPosts,
    messages: unreadConversationThreads,
  };

  const menuItems = buildMainNavItems({
    jamsEnabled: !!serverInfo?.jams.livekit.enabled,
    showAdmin: false,
  });

  const { t } = useTranslation();

  const [currentRoute, setCurrentRoute] = React.useState<string | undefined>(
    'community'
  );

  return (
    (currentProfile && (
      <View className="sm:w-56 md:w-80 bg-background flex-1">
        <TouchableOpacity onPress={onProfilePress} className="mt-12 mb-6 px-4">
          <View className="w-full flex-row items-center justify-between">
            <Image
              source={{ uri: logoSmall! }}
              className="-mt-2"
              resizeMode="cover"
            />
            {!isMediumScreenOrLarger && (
              <View className="md:hidden">
                <Button onPress={close} variant={'outline'} size={'icon'}>
                  <XIcon className="text-muted-foreground" />
                </Button>
              </View>
            )}
          </View>

          <View className="flex gap-3 space-x-3 mt-5">
            <View className="flex flex-row justify-between items-center">
              <ProfileAvatar profile={currentProfile} className="w-16 h-16" />
              {isMediumScreenOrLarger && (
                <Button
                  variant={'outline'}
                  size={'icon'}
                  onPress={onNotificationPress}
                >
                  <BellIcon className="text-foreground" size={20} />
                </Button>
              )}
            </View>
            <View>
              <ThemedText className="text-foreground text-base font-medium">
                {currentProfile?.displayName}
              </ThemedText>
              <ThemedText className="text-muted-foreground">
                @{currentProfile?.handle}
              </ThemedText>
            </View>
          </View>
        </TouchableOpacity>

        {isMediumScreenOrLarger && (
          <Button
            onPress={handleNewPost}
            className="flex-row gap-4 items-center text-black  mb-4 justify-center px-4 w-full"
          >
            <SquarePenIcon size={20} />
            <ThemedText>{t('posts.form.title')}</ThemedText>
          </Button>
        )}

        <Separator />

        <View className="flex-1">
          <ScrollView contentContainerClassName="grow" className="mt-5 px-4">
            {menuItems.map((item) => {
              const isActive = currentRoute === item.id;
              const Icon = menuIcons[item.id];
              if (!Icon) {
                return null;
              }
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="flex-row items-center w-full mb-4 justify-start p-4"
                  onPress={() => {
                    setCurrentRoute(item.id);
                    handleNavigation({ target: item.id });
                  }}
                >
                  <View className="flex-row items-center flex-1 justify-between">
                    <View className="flex-row items-center">
                      <Icon
                        size={20}
                        className={`
                    ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    } mr-5`}
                      />
                      <ThemedText
                        className={`
                    ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {t(item.labelKey)}
                      </ThemedText>
                    </View>
                    {(menuUnreadCounts[item.id] ?? 0) > 0 ? (
                      <View className="bg-destructive size-5 min-w-5 items-center justify-center rounded-full px-1">
                        <ThemedText className="text-xs font-semibold text-destructive-foreground">
                          {formatBadgeCount(menuUnreadCounts[item.id] ?? 0)}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </Button>
              );
            })}
            <Button
              variant="ghost"
              className="flex-row items-center space-x-3 w-full mb-4 justify-start"
              onPress={() => {
                logout();
                close?.();
              }}
            >
              <LogOutIcon size={20} className="mr-5 text-destructive" />
              <ThemedText className="-mt-1 tracking-wider text-destructive native:text-lg">
                {t('navigation.logOut')}
              </ThemedText>
            </Button>
          </ScrollView>
        </View>

        <Separator />
        <View className="pl-6 pr-4 pt-4 pb-12">
          <ThemedText className="text-muted-foreground text-base tracking-wider">
            {t('navigation.poweredBy')}
          </ThemedText>
        </View>
      </View>
    )) ||
    null
  );
};

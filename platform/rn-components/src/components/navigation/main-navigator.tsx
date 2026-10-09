import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './tab-navigator';
import {
  NewJam,
  PublicProfileSettings,
  JamEvent,
  Profile,
  Followers,
  Following,
  MyJams,
  ConversationShow,
  ConversationInfo,
  NewConversation,
  DraftMessage,
  NewGroup,
  GroupShow,
  GroupMembers,
  GroupInfo,
  EditGroup,
  NewEvent,
  EditEvent,
  PostDetail,
  ReplyPost,
  EditPost,
  NotificationPreferences,
  AccountSettings,
  ThemeSettings,
  AccessTokensSettings,
  FeedSettings,
  BlockedSettings,
  VideoPlayer,
  LanguageSettings,
  TimezoneSettings,
  NotificationSettings,
  PushEnabledDevices,
  EditGroupInfo,
  EditGroupRoles,
  NewArticle,
  EditArticle,
  EventsMy,
  About,
  CodeOfConduct,
} from '../../pages';
import { MenuWrapper } from './side-menu-wrapper';
import { SideMenuDrawer } from './side-menu-drawer';

import { MainStackParamList } from './types';
import { useWindowSize } from '../../hooks/index';
import { initializePushNotifications } from '../../lib/push-notifications';
import { useOpenpeeps } from '@openpeepshq/react';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator = () => {
  const { openpeepsApi, queryClient } = useOpenpeeps();
  queryClient.setDefaultOptions({
    queries: {
      experimental_prefetchInRender: true,
    },
  });
  const createPushSubscription = openpeepsApi.createPushSubscriptionAction();
  const pushSubscriptionsQuery = openpeepsApi.usePushSubscriptions();

  // Register once per mount. Running this in render created a new FCM
  // subscription on every re-render, and each row gets its own push.
  React.useEffect(() => {
    let cancelled = false;

    void pushSubscriptionsQuery.promise
      .then((data) => initializePushNotifications(data))
      .then((newPushSubscription) => {
        if (cancelled || !newPushSubscription) {
          return;
        }
        return createPushSubscription(newPushSubscription);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isMediumScreenOrLarger } = useWindowSize();

  const Wrapper = isMediumScreenOrLarger ? MenuWrapper : SideMenuDrawer;

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      screenLayout={({ children }) => <Wrapper>{children}</Wrapper>}
    >
      <Stack.Screen name="TabNavigator" component={TabNavigator} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="ProfileFollowers" component={Followers} />
      <Stack.Screen name="ProfileFollowing" component={Following} />
      <Stack.Screen name="EditProfile" component={PublicProfileSettings} />
      <Stack.Screen name="JamSession" component={JamEvent} />
      <Stack.Screen name="CreateNewJam" component={NewJam} />
      <Stack.Screen name="MyJams" component={MyJams} />
      <Stack.Screen name="Conversation" component={ConversationShow} />
      <Stack.Screen name="ConversationInfo" component={ConversationInfo} />
      <Stack.Screen
        name="SelectPrivateMessageMembers"
        component={NewConversation}
      />
      <Stack.Screen name="DraftMessage" component={DraftMessage} />
      <Stack.Screen name="CreateGroup" component={NewGroup} />
      <Stack.Screen name="Group" component={GroupShow} />
      <Stack.Screen name="GroupMembers" component={GroupMembers} />
      <Stack.Screen name="GroupInfo" component={GroupInfo} />
      <Stack.Screen name="EditGroupDetails" component={EditGroup} />
      <Stack.Screen name="NewEvent" component={NewEvent} />
      <Stack.Screen name="EditEvent" component={EditEvent} />
      <Stack.Screen name="Post" component={PostDetail} />
      <Stack.Screen name="ReplyPost" component={ReplyPost} />
      <Stack.Screen name="EditPost" component={EditPost} />
      <Stack.Screen
        name="NotificationsSettings"
        component={NotificationPreferences}
      />
      <Stack.Screen name="AccountSettings" component={AccountSettings} />
      <Stack.Screen name="ThemeSettings" component={ThemeSettings} />
      <Stack.Screen name="FeedSettings" component={FeedSettings} />
      <Stack.Screen
        name="AccessTokensSettings"
        component={AccessTokensSettings}
      />
      <Stack.Screen name="BlockedSettings" component={BlockedSettings} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettings} />
      <Stack.Screen name="TimezoneSettings" component={TimezoneSettings} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
      />
      <Stack.Screen name="PushEnabledDevices" component={PushEnabledDevices} />
      <Stack.Screen name="EditGroupInfo" component={EditGroupInfo} />
      <Stack.Screen name="EditGroupRoles" component={EditGroupRoles} />
      <Stack.Screen name="NewArticle" component={NewArticle} />
      <Stack.Screen name="EditArticle" component={EditArticle} />
      <Stack.Screen name="MyEvents" component={EventsMy} />
      <Stack.Screen name="About" component={About} />
      <Stack.Screen name="CodeOfConduct" component={CodeOfConduct} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
    </Stack.Navigator>
  );
};

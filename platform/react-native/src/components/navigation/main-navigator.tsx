import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './tab-navigator';
import {
  CreateNewJam,
  EditProfile,
  JamSession,
  Profile,
  ProfileFollowers,
  ProfileFollowing,
  UpcomingJams,
  MyJams,
  Conversation,
  ConversationInfo,
  SelectPrivateMessageMembers,
  DraftMessage,
  CreateGroup,
  Group,
  GroupMembers,
  GroupInfo,
  EditGroupDetails,
  NewEvent,
  EditEvent,
  Post,
  ReplyPost,
  JamDetails,
  JamHostControls,
  InJamChat,
  EditPost,
  NotificationsSettings,
  AccountSettings,
  ThemeSettings,
  VideoPlayer,
} from '../../screens';
import { MenuWrapper } from '~/components/navigation/side-menu-wrapper';
import { SideMenuDrawer } from './side-menu-drawer';

import { MainStackParamList } from './types';
import { useWindowSize } from '~/hooks';
import { initializePushNotifications } from '~/lib/push-notifications';
import { useOpenpeeps } from '@openpeepshq/react';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator = () => {
  const { openpeepsApi, queryClient } = useOpenpeeps();
  queryClient.setDefaultOptions({
    queries: {
      experimental_prefetchInRender: true,
    },
  },
  );
  const createPushSubscription = openpeepsApi.createPushSubscriptionAction();
  const pushSubscriptionsQuery = openpeepsApi.usePushSubscriptions();


  pushSubscriptionsQuery.promise.then((data) => initializePushNotifications(data)).then((newPushSubscription) => {
    if (newPushSubscription) {
      createPushSubscription(newPushSubscription);
    }
  }).catch(console.error);

  const { isMediumScreenOrLarger } = useWindowSize();

  const Wrapper = isMediumScreenOrLarger ? MenuWrapper : SideMenuDrawer;


  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
      screenLayout={({ children }) => <Wrapper>{children}</Wrapper>}>
      <Stack.Screen name="TabNavigator" component={TabNavigator} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="ProfileFollowers" component={ProfileFollowers} />
      <Stack.Screen name="ProfileFollowing" component={ProfileFollowing} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="JamSession" component={JamSession} />
      <Stack.Screen name="InJamChat" component={InJamChat} />
      <Stack.Screen name="JamHostControls" component={JamHostControls} />
      <Stack.Screen name="JamDetails" component={JamDetails} />
      <Stack.Screen name="CreateNewJam" component={CreateNewJam} />
      <Stack.Screen name="UpcomingJams" component={UpcomingJams} />
      <Stack.Screen name="MyJams" component={MyJams} />
      <Stack.Screen name="Conversation" component={Conversation} />
      <Stack.Screen name="ConversationInfo" component={ConversationInfo} />
      <Stack.Screen
        name="SelectPrivateMessageMembers"
        component={SelectPrivateMessageMembers}
      />
      <Stack.Screen name="DraftMessage" component={DraftMessage} />
      <Stack.Screen name="CreateGroup" component={CreateGroup} />
      <Stack.Screen name="Group" component={Group} />
      <Stack.Screen name="GroupMembers" component={GroupMembers} />
      <Stack.Screen name="GroupInfo" component={GroupInfo} />
      <Stack.Screen name="EditGroupDetails" component={EditGroupDetails} />
      <Stack.Screen name="NewEvent" component={NewEvent} />
      <Stack.Screen name="EditEvent" component={EditEvent} />
      <Stack.Screen name="Post" component={Post} />
      <Stack.Screen name="ReplyPost" component={ReplyPost} />
      <Stack.Screen name="EditPost" component={EditPost} />
      <Stack.Screen
        name="NotificationsSettings"
        component={NotificationsSettings}
      />
      <Stack.Screen name="AccountSettings" component={AccountSettings} />
      <Stack.Screen name="ThemeSettings" component={ThemeSettings} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayer} />
    </Stack.Navigator>
  );
};

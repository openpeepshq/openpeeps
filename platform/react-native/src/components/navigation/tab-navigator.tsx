import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabStackParamList } from './types';
import { TAB_ROUTES } from './types';
import {
  Home,
  Jam,
  MyFeed,
  NewPost,
  Messages,
  Events,
  Directory,
  Settings,
  Groups,
  Onboarding,
  Notifications,
  HashtagPosts,
  Explore,
  BookmarksFeed,
  Articles,
} from '../../screens';
import {
  HomeIcon,
  NewspaperIcon,
  SquarePlusIcon,
  MessageSquareTextIcon,
  UsersIcon,
  ScrollTextIcon,
} from '../icons';
import { cn } from '../../lib/utils';
import { useWindowSize } from '../../hooks';
import { useOpenpeeps } from '@openpeeps/react';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';

const Tab = createBottomTabNavigator<TabStackParamList>();

const TabBarIcon = ({
  route,
  focused,
}: {
  route: { name: keyof TabStackParamList };
  focused: boolean;
}) => {
  const iconClass = cn(focused ? 'text-foreground' : 'text-muted-foreground');
  const iconSize = 22;
  switch (route.name) {
    case TAB_ROUTES.HOME:
      return <HomeIcon className={iconClass} size={iconSize} />;
    case TAB_ROUTES.FEED:
      return <NewspaperIcon className={iconClass} size={iconSize} />;
    case TAB_ROUTES.NEW_POST:
      return <SquarePlusIcon className={iconClass} size={iconSize} />;
    case TAB_ROUTES.GROUPS:
      return <UsersIcon className={iconClass} size={iconSize} />;
    case TAB_ROUTES.MESSAGES:
      return <MessageSquareTextIcon className={iconClass} size={iconSize} />;
    case TAB_ROUTES.NOTIFICATIONS:
      return <MessageSquareTextIcon className={iconClass} size={iconSize} />;
    case TAB_ROUTES.ARTICLES:
      return <ScrollTextIcon className={iconClass} size={iconSize} />;
    default:
      return null;
  }
};

export const TabNavigator = () => {
  const { openpeepsApi } = useOpenpeeps();
  const { colors: { background } } = useOpenPeepsTheme();
  const { isMediumScreenOrLarger } = useWindowSize();
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const unseenCounts = openpeepsApi.useUnseenPostCounts();

  const unreadGroupPosts = Object.values(
    unseenCounts.data?.groups ?? {},
  ).reduce((sum, count) => sum + count, 0);
  const unreadConversationThreads = Object.keys(
    unseenCounts.data?.direct ?? {},
  ).length;

  const display = isMediumScreenOrLarger ? 'none' : 'flex';
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => TabBarIcon({ route, focused }),
        tabBarItemStyle: {
          display,
        },
        tabBarStyle: {
          backgroundColor: background,
          borderTopWidth: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
          elevation: 0,
          display,
        },
      })}
      initialRouteName={TAB_ROUTES.HOME}>
      <Tab.Screen name={TAB_ROUTES.HOME} component={Home} />
      <Tab.Screen name={TAB_ROUTES.FEED} component={MyFeed} />
      <Tab.Screen
        name={TAB_ROUTES.NEW_POST}
        component={NewPost}
        options={{
          tabBarStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.GROUPS}
        component={Groups}
        options={{
          tabBarBadge: unreadGroupPosts > 0 ? unreadGroupPosts : undefined,
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.MESSAGES}
        component={Messages}
        options={{
          tabBarBadge:
            unreadConversationThreads > 0
              ? unreadConversationThreads
              : undefined,
        }}
      />
      {serverInfo?.jams.livekit.enabled && (
        <Tab.Screen
          name={TAB_ROUTES.JAM}
          component={Jam}
          options={{
            tabBarItemStyle: {
              display: 'none',
            },
          }}
        />
      )}
      <Tab.Screen
        name={TAB_ROUTES.EVENTS}
        component={Events}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.ARTICLES}
        component={Articles}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.DIRECTORY}
        component={Directory}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.SETTINGS}
        component={Settings}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />

      <Tab.Screen
        name={TAB_ROUTES.ONBOARDING}
        component={Onboarding}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.NOTIFICATIONS}
        component={Notifications}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.HASHTAG_POSTS}
        component={HashtagPosts}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.EXPLORE}
        component={Explore}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen 
      name={TAB_ROUTES.BOOKMARKS} 
      component={BookmarksFeed} 
      options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />

    </Tab.Navigator>
  );
};

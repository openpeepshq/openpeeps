import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabStackParamList } from './types';
import { TAB_ROUTES } from './types';
import {
  FeedsLocal,
  JamsIndex,
  FeedsMy,
  NewPost,
  ConversationsIndex,
  EventsIndex,
  Members,
  Settings,
  GroupsIndex,
  Welcome,
  Notifications,
  Tags,
  Explore,
  FeedsBookmarks,
  ArticlesIndex,
  ResourcesIndex,
} from '../../pages';
import {
  HomeIcon,
  NewspaperIcon,
  SquarePlusIcon,
  MessageSquareTextIcon,
  UsersIcon,
  ScrollTextIcon,
  LibraryIcon,
} from '../icons';
import { cn } from '../../lib/utils';
import { useWindowSize } from '../../hooks';
import { formatBadgeCount } from '@openpeepshq/common';
import {
  buildMainNavItems,
  useOpenpeeps,
  useServerInfo,
} from '@openpeepshq/react';
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
    case TAB_ROUTES.RESOURCES:
      return <LibraryIcon className={iconClass} size={iconSize} />;
    default:
      return null;
  }
};

export const TabNavigator = () => {
  const { openpeepsApi } = useOpenpeeps();
  const {
    colors: { background },
  } = useOpenPeepsTheme();
  const { isMediumScreenOrLarger } = useWindowSize();
  const serverInfo = useServerInfo();
  const jamsEnabled = buildMainNavItems({
    jamsEnabled: !!serverInfo.jams.livekit.enabled,
    showAdmin: false,
  }).some((item) => item.id === 'jams');
  const unseenCounts = openpeepsApi.useUnseenPostCounts();

  const unreadGroupPosts = Object.values(
    unseenCounts.data?.groups ?? {}
  ).reduce((sum, count) => sum + count, 0);
  const unreadConversationThreads = Object.keys(
    unseenCounts.data?.direct ?? {}
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
      initialRouteName={TAB_ROUTES.HOME}
    >
      <Tab.Screen name={TAB_ROUTES.HOME} component={FeedsLocal} />
      <Tab.Screen name={TAB_ROUTES.FEED} component={FeedsMy} />
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
        component={GroupsIndex}
        options={{
          tabBarBadge:
            unreadGroupPosts > 0
              ? formatBadgeCount(unreadGroupPosts)
              : undefined,
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.MESSAGES}
        component={ConversationsIndex}
        options={{
          tabBarBadge:
            unreadConversationThreads > 0
              ? formatBadgeCount(unreadConversationThreads)
              : undefined,
        }}
      />
      {jamsEnabled && (
        <Tab.Screen
          name={TAB_ROUTES.JAM}
          component={JamsIndex}
          options={{
            tabBarItemStyle: {
              display: 'none',
            },
          }}
        />
      )}
      <Tab.Screen
        name={TAB_ROUTES.EVENTS}
        component={EventsIndex}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.ARTICLES}
        component={ArticlesIndex}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.RESOURCES}
        component={ResourcesIndex}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.DIRECTORY}
        component={Members}
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
        component={Welcome}
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
        component={Tags}
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
        component={FeedsBookmarks}
        options={{
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
    </Tab.Navigator>
  );
};

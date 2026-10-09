import { useMemo } from 'react';
import {
  CommonActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import type { NavTarget, RouterAdapter } from '@openpeepshq/react';
import type { MainStackParamList, RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Web `/settings/<section>` paths → native settings screens. */
const SETTINGS_SCREENS: Record<string, keyof MainStackParamList | undefined> = {
  'account': 'AccountSettings',
  'access-tokens': 'AccessTokensSettings',
  'blocked': 'BlockedSettings',
  'notifications': 'NotificationSettings',
  'notifications/preferences': 'NotificationsSettings',
  'notifications/push-enabled-devices': 'PushEnabledDevices',
  'theme': 'ThemeSettings',
  'language': 'LanguageSettings',
  'timezone': 'TimezoneSettings',
  'feed': 'FeedSettings',
};

const go = (name: string, params?: object) => {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.navigate({ name, params }));
};

export const navigateToTarget = (target: NavTarget) => {
  switch (target.type) {
    case 'home':
    case 'feed':
      if (target.type === 'feed' && target.feed === 'my') {
        go('Main', { screen: 'TabNavigator', params: { screen: 'Feed' } });
      } else if (target.type === 'feed' && target.feed === 'bookmarks') {
        go('Main', {
          screen: 'TabNavigator',
          params: { screen: 'Bookmarks' },
        });
      } else {
        go('Main', { screen: 'TabNavigator', params: { screen: 'Home' } });
      }
      break;
    case 'welcome':
      go('Main', { screen: 'TabNavigator', params: { screen: 'Onboarding' } });
      break;
    case 'explore':
      go('Main', { screen: 'TabNavigator', params: { screen: 'Explore' } });
      break;
    case 'post':
      go('Main', {
        screen: 'Post',
        params: { id: target.id, occurrence: target.occurrence },
      });
      break;
    case 'postNew':
      go('Main', { screen: 'TabNavigator', params: { screen: 'NewPost' } });
      break;
    case 'profile':
      if (target.tab === 'followers') {
        go('Main', {
          screen: 'ProfileFollowers',
          params: { id: target.handle },
        });
      } else if (target.tab === 'following') {
        go('Main', {
          screen: 'ProfileFollowing',
          params: { id: target.handle },
        });
      } else {
        go('Main', { screen: 'Profile', params: { handle: target.handle } });
      }
      break;
    case 'groups':
      if (target.view === 'new') go('Main', { screen: 'CreateGroup' });
      else go('Main', { screen: 'TabNavigator', params: { screen: 'Groups' } });
      break;
    case 'group':
      if (target.view === 'members' && target.handle) {
        go('Main', { screen: 'GroupMembers', params: { id: target.handle } });
      } else if (target.view === 'info' && target.handle) {
        go('Main', { screen: 'GroupInfo', params: { id: target.handle } });
      } else if (target.view === 'edit' && target.handle) {
        go('Main', {
          screen: 'EditGroupDetails',
          params: { handle: target.handle },
        });
      } else if (target.view === 'edit-info' && target.handle) {
        go('Main', {
          screen: 'EditGroupInfo',
          params: { handle: target.handle },
        });
      } else if (target.view === 'edit-roles' && target.handle) {
        go('Main', {
          screen: 'EditGroupRoles',
          params: { handle: target.handle },
        });
      } else {
        go('Main', { screen: 'Group', params: { handle: target.handle } });
      }
      break;
    case 'conversation':
      if (target.view === 'new' || !target.id) {
        if (target.view === 'new') {
          go('Main', { screen: 'SelectPrivateMessageMembers' });
        } else {
          go('Main', {
            screen: 'TabNavigator',
            params: { screen: 'Messages' },
          });
        }
      } else if (target.view === 'info') {
        go('Main', { screen: 'ConversationInfo', params: { id: target.id } });
      } else {
        go('Main', { screen: 'Conversation', params: { id: target.id } });
      }
      break;
    case 'jams':
      if (target.view === 'my') go('Main', { screen: 'MyJams' });
      else go('Main', { screen: 'TabNavigator', params: { screen: 'Jam' } });
      break;
    case 'jam':
      if (target.id) {
        go('Main', { screen: 'JamSession', params: { jamId: target.id } });
      } else {
        go('Main', { screen: 'TabNavigator', params: { screen: 'Jam' } });
      }
      break;
    case 'events':
      if (target.view === 'new') go('Main', { screen: 'NewEvent' });
      else if (target.view === 'my') go('Main', { screen: 'MyEvents' });
      else if (target.eventId) {
        go('Main', { screen: 'EditEvent', params: { id: target.eventId } });
      } else {
        go('Main', { screen: 'TabNavigator', params: { screen: 'Events' } });
      }
      break;
    case 'articles':
      if (target.view === 'new') go('Main', { screen: 'NewArticle' });
      else if (target.articleId) {
        go('Main', { screen: 'EditArticle', params: { id: target.articleId } });
      } else {
        go('Main', { screen: 'TabNavigator', params: { screen: 'Articles' } });
      }
      break;
    case 'resources':
      if (target.view === 'new') go('Main', { screen: 'NewResource' });
      else if (target.resourceId) {
        go('Main', {
          screen: 'EditResource',
          params: { id: target.resourceId },
        });
      } else {
        go('Main', { screen: 'TabNavigator', params: { screen: 'Resources' } });
      }
      break;
    case 'about':
      go('Main', { screen: 'About' });
      break;
    case 'codeOfConduct':
      go('Main', { screen: 'CodeOfConduct' });
      break;
    case 'members':
      go('Main', { screen: 'TabNavigator', params: { screen: 'Directory' } });
      break;
    case 'notifications':
      go('Main', {
        screen: 'TabNavigator',
        params: { screen: 'Notifications' },
      });
      break;
    case 'tags':
      go('Main', {
        screen: 'TabNavigator',
        params: {
          screen: 'HashtagPosts',
          params: { tag: target.hashtag },
        },
      });
      break;
    case 'settings': {
      const screen = SETTINGS_SCREENS[target.section ?? ''];
      if (screen) go('Main', { screen });
      else
        go('Main', { screen: 'TabNavigator', params: { screen: 'Settings' } });
      break;
    }
    case 'auth':
      if (target.mode === 'register') {
        go('Auth', { screen: 'Signup' });
      } else if (target.mode === 'request-reset-password') {
        go('Auth', { screen: 'ForgotPassword' });
      } else if (target.mode === 'reset-password') {
        go('Auth', { screen: 'ResetPassword' });
      } else if (target.mode === 'validate-email') {
        go('Auth', { screen: 'ValidateEmail' });
      } else {
        go('Auth', { screen: 'Login' });
      }
      break;
    default:
      break;
  }
};

export const useNativeRouterAdapter = (): RouterAdapter =>
  useMemo(
    () => ({
      pathname: '',
      searchParams: new URLSearchParams(),
      hrefOf: () => '',
      match: () => null,
      navigate: (target) => {
        if (typeof target === 'string') return;
        navigateToTarget(target);
      },
      back: () => {
        if (navigationRef.isReady() && navigationRef.canGoBack()) {
          navigationRef.goBack();
        }
      },
    }),
    []
  );

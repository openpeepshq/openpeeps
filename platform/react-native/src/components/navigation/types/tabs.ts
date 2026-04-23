import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PostBoxTriggeredFrom } from '~/lib/constants';

export const TAB_ROUTES = {
  HOME: 'Home',
  FEED: 'Feed',
  NEW_POST: 'NewPost',
  JAM: 'Jam',
  MESSAGES: 'Messages',
  EVENTS: 'Events',
  DIRECTORY: 'Directory',
  SETTINGS: 'Settings',
  GROUPS: 'Groups',
  ONBOARDING: 'Onboarding',
  NOTIFICATIONS: 'Notifications',
  HASHTAG_POSTS: 'HashtagPosts',
  EXPLORE: 'Explore',
  ARTICLES: 'Articles',
  BOOKMARKS: 'Bookmarks',
} as const;

export type TabStackParamList = {
  [TAB_ROUTES.HOME]: undefined;
  [TAB_ROUTES.FEED]: undefined;
  [TAB_ROUTES.NEW_POST]:
  | {
    originatorId?: string | undefined;
    triggeredFrom?: PostBoxTriggeredFrom | undefined;
    withContent?: boolean | undefined;
  }
  | undefined;
  [TAB_ROUTES.JAM]: undefined;
  [TAB_ROUTES.MESSAGES]: undefined;
  [TAB_ROUTES.EVENTS]: undefined;
  [TAB_ROUTES.ARTICLES]: undefined;
  [TAB_ROUTES.DIRECTORY]: undefined;
  [TAB_ROUTES.SETTINGS]: undefined;
  [TAB_ROUTES.GROUPS]: undefined;
  [TAB_ROUTES.ONBOARDING]: undefined;
  [TAB_ROUTES.NOTIFICATIONS]: undefined;
  [TAB_ROUTES.HASHTAG_POSTS]: {
    tag: string;
  };
  [TAB_ROUTES.EXPLORE]: undefined;
  [TAB_ROUTES.BOOKMARKS]: undefined;
};

export type TabScreenProps<T extends keyof TabStackParamList> =
  NativeStackScreenProps<TabStackParamList, T>;

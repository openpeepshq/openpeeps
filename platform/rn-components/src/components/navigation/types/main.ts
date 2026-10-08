import { NavigatorScreenParams } from '@react-navigation/native';
import { TabStackParamList } from './tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainStackParamList = {
  TabNavigator: NavigatorScreenParams<TabStackParamList>;
  Profile: {
    handle: string;
  };
  EditProfile: {
    handle: string;
  };
  ProfileFollowing: {
    id: string;
  };
  ProfileFollowers: {
    id: string;
  };
  Jam: undefined;
  JamSession: {
    jamId: string;
    occurrence?: string;
    observer?: boolean;
  };
  CreateNewJam: undefined;
  Messages: undefined;
  RecordedJams: undefined;
  MyJams: undefined;
  Conversation: {
    id: string;
  };
  ConversationInfo: {
    id: string;
  };
  SelectPrivateMessageMembers: undefined;
  DraftMessage: undefined;
  CreateGroup: undefined;
  Group: {
    id?: string;
    handle?: string;
  };
  GroupMembers: {
    id: string;
  };
  GroupInfo: {
    id: string;
  };
  EditGroupDetails: {
    handle: string;
  };
  NewEvent: undefined;
  EditEvent: {
    id: string;
    occurrence?: string;
  };
  EventPage: {
    id: string;
    occurrence?: string;
  };
  Post: {
    id: string;
    occurrence?: string;
  };
  ReplyPost: {
    id: string;
  };
  EditPost: {
    id: string;
  };
  NotificationSettings: undefined;
  NotificationsSettings: undefined;
  PushEnabledDevices: undefined;
  AccountSettings: undefined;
  AccessTokensSettings: undefined;
  ThemeSettings: undefined;
  FeedSettings: undefined;
  BlockedSettings: undefined;
  LanguageSettings: undefined;
  TimezoneSettings: undefined;
  EditGroupInfo: {
    handle: string;
  };
  EditGroupRoles: {
    handle: string;
  };
  NewArticle: undefined;
  EditArticle: {
    id: string;
  };
  MyEvents: undefined;
  About: undefined;
  CodeOfConduct: undefined;
  Events: undefined;
  VideoPlayer: {
    url: string;
    title?: string;
  };
};

export const MAIN_ROUTES = {
  TABS: 'TabNavigator',
  PROFILE: 'Profile',
  PROFILE_FOLLOWING: 'ProfileFollowing',
  PROFILE_FOLLOWERS: 'ProfileFollowers',
  EDIT_PROFILE: 'EditProfile',
  JAM: 'Jam',
  JAM_SESSION: 'JamSession',
  CREATE_NEW_JAM: 'CreateNewJam',
  MESSAGES: 'Messages',
  RECORDED_JAMS: 'RecordedJams',
  MY_JAMS: 'MyJams',
  CONVERSATION: 'Conversation',
  CONVERSATION_INFO: 'ConversationInfo',
  SELECT_PRIVATE_MESSAGE_MEMBERS: 'SelectPrivateMessageMembers',
  DRAFT_MESSAGE: 'DraftMessage',
  CREATE_GROUP: 'CreateGroup',
  GROUP: 'Group',
  GROUP_MEMBERS: 'GroupMembers',
  GROUP_INFO: 'GroupInfo',
  EDIT_GROUP_DETAILS: 'EditGroupDetails',
  NEW_EVENT: 'NewEvent',
  EDIT_EVENT: 'EditEvent',
  POST: 'Post',
  REPLY_POST: 'ReplyPost',
  EDIT_POST: 'EditPost',
  NOTIFICATION_SETTINGS: 'NotificationSettings',
  NOTIFICATIONS_SETTINGS: 'NotificationsSettings',
  PUSH_ENABLED_DEVICES: 'PushEnabledDevices',
  ACCOUNT_SETTINGS: 'AccountSettings',
  ACCESS_TOKENS_SETTINGS: 'AccessTokensSettings',
  THEME_SETTINGS: 'ThemeSettings',
  FEED_SETTINGS: 'FeedSettings',
  BLOCKED_SETTINGS: 'BlockedSettings',
  LANGUAGE_SETTINGS: 'LanguageSettings',
  TIMEZONE_SETTINGS: 'TimezoneSettings',
  EDIT_GROUP_INFO: 'EditGroupInfo',
  EDIT_GROUP_ROLES: 'EditGroupRoles',
  NEW_ARTICLE: 'NewArticle',
  EDIT_ARTICLE: 'EditArticle',
  MY_EVENTS: 'MyEvents',
  ABOUT: 'About',
  CODE_OF_CONDUCT: 'CodeOfConduct',
  EVENT_PAGE: 'EventPage',
  VIDEO_PLAYER: 'VideoPlayer',
} as const;

export type MainScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;

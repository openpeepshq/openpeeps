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
  };
  JamHostControls: {
    id: string;
  };
  InJamChat: {
    id: string;
  };
  JamDetails: {
    id: string;
    tabOption: 'people' | 'info';
  };
  CreateNewJam: undefined;
  Messages: undefined;
  UpcomingJams: undefined;
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
    id: string;
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
  NotificationsSettings: undefined;
  AccountSettings: undefined;
  ThemeSettings: undefined;
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
  JAM_HOST_CONTROLS: 'JamHostControls',
  IN_JAM_CHAT: 'InJamChat',
  JAM_DETAILS: 'JamDetails',
  CREATE_NEW_JAM: 'CreateNewJam',
  MESSAGES: 'Messages',
  UPCOMING_JAMS: 'UpcomingJams',
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
  NOTIFICATIONS_SETTINGS: 'NotificationsSettings',
  ACCOUNT_SETTINGS: 'AccountSettings',
  THEME_SETTINGS: 'ThemeSettings',
  EVENT_PAGE: 'EventPage',
  VIDEO_PLAYER: 'VideoPlayer',
} as const;

export type MainScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;

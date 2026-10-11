import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PublicPost } from '@openpeepshq/common/types';
import { MainStackParamList, TabStackParamList } from './types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const tabs = <S extends keyof TabStackParamList>(
  navigation: Nav,
  screen: S,
  params?: TabStackParamList[S]
) =>
  navigation.navigate('TabNavigator', {
    screen,
    params,
  } as NavigatorScreenParams<TabStackParamList>);

/** Semantic parent when the stack has no in-app history (deep links). */
export const applySemanticParent = ({
  navigation,
  routeName,
  params,
  post,
  profileHandle,
}: {
  navigation: Nav;
  routeName: string;
  params?: Record<string, unknown>;
  post?: PublicPost;
  profileHandle?: string;
}) => {
  switch (routeName) {
    case 'Post':
    case 'EventPage':
      if (post?.replyTo?.type === 'event' && post.inReplyToId) {
        navigation.navigate('Post', { id: post.inReplyToId });
        return;
      }
      if (post?.groupId) {
        navigation.navigate('Group', {
          id: post.groupId,
          handle: post.group?.handle,
        });
        return;
      }
      if (post?.type === 'event') {
        tabs(navigation, 'Events');
        return;
      }
      tabs(navigation, 'Home');
      return;
    case 'Profile':
      tabs(navigation, 'Directory');
      return;
    case 'EditProfile':
      if (typeof params?.handle === 'string') {
        navigation.navigate('Profile', { handle: params.handle });
      } else if (profileHandle) {
        navigation.navigate('Profile', { handle: profileHandle });
      } else {
        tabs(navigation, 'Directory');
      }
      return;
    case 'ProfileFollowers':
    case 'ProfileFollowing':
      tabs(navigation, 'Directory');
      return;
    case 'Conversation':
      tabs(navigation, 'Messages');
      return;
    case 'ConversationInfo':
      if (typeof params?.id === 'string') {
        navigation.navigate('Conversation', { id: params.id });
      } else {
        tabs(navigation, 'Messages');
      }
      return;
    case 'Group':
      tabs(navigation, 'Groups');
      return;
    case 'GroupMembers':
    case 'GroupInfo':
      if (typeof params?.id === 'string') {
        navigation.navigate('Group', { id: params.id });
      } else {
        tabs(navigation, 'Groups');
      }
      return;
    case 'MyEvents':
    case 'NewEvent':
    case 'EditEvent':
      tabs(navigation, 'Events');
      return;
    case 'MyJams':
    case 'JamSession':
    case 'CreateNewJam':
      tabs(navigation, 'Jam');
      return;
    case 'NotificationSettings':
    case 'NotificationsSettings':
    case 'PushEnabledDevices':
    case 'AccountSettings':
    case 'AccessTokensSettings':
    case 'ThemeSettings':
    case 'FeedSettings':
    case 'BlockedSettings':
    case 'LanguageSettings':
    case 'TimezoneSettings':
      tabs(navigation, 'Settings');
      return;
    case 'Settings':
      if (profileHandle) {
        navigation.navigate('Profile', { handle: profileHandle });
      } else {
        tabs(navigation, 'Home');
      }
      return;
    case 'Onboarding':
    case 'HashtagPosts':
    case 'About':
    case 'CodeOfConduct':
    default:
      tabs(navigation, 'Home');
  }
};

export const goToParentOrBack = (args: {
  navigation: Nav;
  routeName: string;
  params?: Record<string, unknown>;
  post?: PublicPost;
  profileHandle?: string;
}) => {
  if (args.navigation.canGoBack()) {
    args.navigation.goBack();
    return;
  }
  applySemanticParent(args);
};

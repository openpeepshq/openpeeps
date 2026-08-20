import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList, TabStackParamList } from './types';
import { NavigatorScreenParams } from '@react-navigation/native';
import type { GotoHandlerParams } from '~/types/goto';

export const buildGoto = (navigation: NativeStackNavigationProp<MainStackParamList>) => ({
  target,
  params,
}: {
  target: string;
  params?: GotoHandlerParams;
}) => {
  const tabs = <S extends keyof TabStackParamList>(
    screen: S,
    tabParams?: TabStackParamList[S],
  ) =>
    navigation.navigate('TabNavigator', {
      screen,
      params: tabParams,
    } as NavigatorScreenParams<TabStackParamList>);


    switch (target) {
        case 'jams':
            params?.jamId ? navigation.navigate('JamSession', { jamId: params.jamId }) : tabs('Jam');
            break;
        case 'event':
            if (params?.id) {
            navigation.navigate('Post', { id: params.id });
            }
            break;
        case 'events':
            tabs('Events');
            break;
        case 'articles':
            tabs('Articles');
            break;
        case 'explore':
            tabs('Explore');
            break;
        case 'groups':
            tabs('Groups');
            break;
        case 'group':
            navigation.navigate('Group', { id: params?.id, handle: params?.handle });
            break;
        case 'messages':
            tabs('Messages');
            break;
        case 'members':
            tabs('Directory');
            break;
        case 'settings':
            tabs('Settings');
            break;
        case 'community':
            tabs('Home');
            break;
        case 'welcome':
            tabs('Onboarding');
            break;
        case 'myFeed':
            tabs('Feed');
            break;
        case 'newPost':
            tabs('NewPost');
            break;
        case 'notifications':
            tabs('Notifications');
            break;
        case 'HashtagPosts':
            if (params?.tag) {
            tabs('HashtagPosts', { tag: params.tag });
            }
            break;
        case 'profile':
            if (params?.handle) {
            navigation.navigate('Profile', { handle: params.handle });
            }
            break;
        case 'conversations':
            if (params?.id) {
            navigation.navigate('Conversation', { id: params.id });
            }
            break;
        case 'posts':
            if (params?.id) {
            navigation.navigate('Post', { id: params.id });
            }
            break;
        case 'bookmarks':
            tabs('Bookmarks');
            break;
        default:
            tabs('Home');
    }
};

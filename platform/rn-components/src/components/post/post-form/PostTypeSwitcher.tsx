import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PostType, VisibilityType } from '@openpeepshq/common/types';
import { getNewPostStores, useCurrentProfile } from '@openpeepshq/react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CalendarDaysIcon,
  ChartColumnBigIcon,
  NotebookIcon,
  ScrollTextIcon,
} from '../../icons/index';
import { MainStackParamList } from '../../navigation/types/index';
import { Button } from '../../ui/button';

export interface PostTypeSwitcherProps {
  type: PostType;
  onSelect: (type: 'note' | 'question') => void;
  onClose: () => void;
  showEventType?: boolean;
  showArticleType?: boolean;
  visibility?: VisibilityType;
  groupId?: string;
}

export const PostTypeSwitcher = ({
  type,
  onSelect,
  onClose,
  showEventType = true,
  showArticleType = true,
  visibility,
  groupId,
}: PostTypeSwitcherProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const me = useCurrentProfile();
  const isOwner = Boolean(me?.roles?.some((role) => role.key === 'owner'));

  const goto = (route: 'NewArticle' | 'NewEvent') => {
    const stores = getNewPostStores();
    if (route === 'NewArticle') {
      stores.article = {
        ...stores.article,
        type: 'article',
        visibility: visibility ?? stores.article.visibility,
        groupId,
      };
    } else {
      stores.event = {
        ...stores.event,
        type: 'event',
        visibility: visibility ?? stores.event.visibility,
        groupId,
      };
    }
    onClose();
    navigation.navigate(route);
  };

  return (
    <View className="flex-row items-center gap-1">
      {type !== 'note' ? (
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel={t('posts.switcher.note')}
          onPress={() => onSelect('note')}
        >
          <NotebookIcon className="text-foreground" size={20} />
        </Button>
      ) : null}
      {type !== 'question' ? (
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel={t('posts.switcher.poll')}
          onPress={() => onSelect('question')}
        >
          <ChartColumnBigIcon className="text-foreground" size={20} />
        </Button>
      ) : null}
      {showEventType && isOwner ? (
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel={t('posts.switcher.event')}
          onPress={() => goto('NewEvent')}
        >
          <CalendarDaysIcon className="text-foreground" size={20} />
        </Button>
      ) : null}
      {showArticleType ? (
        <Button
          size="icon"
          variant="ghost"
          accessibilityLabel={t('posts.switcher.article')}
          onPress={() => goto('NewArticle')}
        >
          <ScrollTextIcon className="text-foreground" size={20} />
        </Button>
      ) : null}
    </View>
  );
};

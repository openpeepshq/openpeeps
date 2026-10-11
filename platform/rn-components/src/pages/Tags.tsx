import React, { useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { normalizeHashtagTag } from '@openpeepshq/common/types';
import {
  useCurrentProfile,
  useDefaultVisibility,
  useFeedListParams,
  useOpenpeeps,
} from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { useSetPageHeader } from '../components/layout';
import { Feed, NewNoteButton } from '../components/post/index';
import {
  MainStackParamList,
  TabStackParamList,
} from '../components/navigation/types/index';
import { Button } from '../components/ui/button';
import { ThemedText } from '../components/ui/themed-text';

type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<TabStackParamList, 'HashtagPosts'>,
  NativeStackScreenProps<MainStackParamList>
>;

export const Tags: React.FC<HomeScreenProps> = ({ route }) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const { tag } = route.params;
  const visibility = useDefaultVisibility();
  const [toggling, setToggling] = useState(false);

  const query = openpeepsApi.usePostsByHashtag(
    tag,
    useFeedListParams({ limit: 15, format: 'linear' })
  );
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([query.refetch()]);
    setRefreshing(false);
  }, [query]);

  const followHashtag = openpeepsApi.followHashtagAction({
    tag,
  } as never);
  const unfollowHashtag = openpeepsApi.unfollowHashtagAction({
    tag,
  } as never);
  const followHashtagRef = useRef(followHashtag);
  const unfollowHashtagRef = useRef(unfollowHashtag);
  followHashtagRef.current = followHashtag;
  unfollowHashtagRef.current = unfollowHashtag;

  const normalizedTag = normalizeHashtagTag(tag);
  const isFollowing = !!me?.followedHashtags?.some(
    (h) => h.tag === normalizedTag
  );

  const headerActions = useMemo(() => {
    if (!me) return undefined;
    const toggleFollow = async () => {
      setToggling(true);
      try {
        if (isFollowing) {
          await unfollowHashtagRef.current();
        } else {
          await followHashtagRef.current();
        }
      } finally {
        setToggling(false);
      }
    };
    return (
      <Button
        variant={isFollowing ? 'outline' : 'default'}
        disabled={toggling}
        onPress={() => void toggleFollow()}
      >
        <ThemedText
          className={
            isFollowing ? 'text-foreground' : 'text-primary-foreground'
          }
        >
          {isFollowing
            ? t('tags.following', { defaultValue: 'Following' })
            : t('tags.follow', { defaultValue: 'Follow hashtag' })}
        </ThemedText>
      </Button>
    );
  }, [isFollowing, me, t, toggling]);

  useSetPageHeader(
    t('tags.title', { defaultValue: '#{{hashtag}}', hashtag: tag }),
    headerActions
  );

  return (
    <>
      <ScrollView
        className="bg-background"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Feed query={query} formatSwitch={false} />
      </ScrollView>
      <NewNoteButton visibility={visibility} />
    </>
  );
};

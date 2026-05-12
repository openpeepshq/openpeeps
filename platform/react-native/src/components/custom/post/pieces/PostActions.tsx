import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import {
  Repeat2Icon,
  MessageSquareIcon,
  ThumbsUpIcon,
} from '~/components/icons';
import { Separator } from '~/components/ui/separator';
import { type PublicPost } from '@openpeeps/common';
import { getReactionCount } from '@openpeeps/common';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { useOpenpeeps } from '@openpeeps/react';

interface PostActionsProps {
  post: PublicPost;
  previewMode?: boolean;
  onPostPress?: () => void;
}

export const PostActions = ({
  post,
  onPostPress,
  previewMode = false,
}: PostActionsProps) => {
  const { t } = useTranslation();
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const [isReacting, setIsReacting] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [repostId, setRepostId] = useState('');
  const [repostCount, setRepostCount] = useState<number | null>(null);
  const [hasReacted, setHasReacted] = useState(
    post.reactions?.some(r => r.profile.id === currentProfile?.id) ?? false,
  );

  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const { data: myReposts } =
    openpeepsApi.useCurrentProfileReposts();

  const reactToPost = openpeepsApi.reactToPostAction({
    id: post.id,
  });

  const retractReaction = openpeepsApi.retractPostReactionAction({ id: post.id });

  const retractRepost = openpeepsApi.deletePostAction({ id: repostId });
  const repostPost = openpeepsApi.repostPostAction({
    id: post.id,
  });

  const reactionCount = getReactionCount(post);

  const hasReposted = useMemo(() => {
    if (!myReposts) {return false;}
    const data = myReposts
      .map((p: PublicPost) => p?.repost?.id)
      .includes(post?.id as string);
    const repostData = myReposts.find(
      (p: PublicPost) => p?.repost?.id === post?.id,
    );

    setRepostId(repostData?.id ?? '');
    return data;
  }, [myReposts, post?.id]);

  const handleReplyPress = () => {
    navigation.navigate('ReplyPost', {
      id: post.id,
    });
  };

  const handleRepost = async () => {
    if (hasReposted) {
      setIsReposting(true);
      setRepostCount(post.repostCount - 1);
      retractRepost().finally(() => setIsReposting(false));
    } else {
      setIsReposting(true);
      setRepostCount(post.repostCount + 1);
      repostPost().finally(() => setIsReposting(false));
    }
  };

  const handleFavorite = async () => {
    const profileId = currentProfile?.id;
    if (!profileId) {return;}

    setHasReacted(!hasReacted);
    setIsReacting(true);
    if (hasReacted) {
      try {
        post.reactions = post.reactions?.filter(
          r => r.profile.id !== profileId,
        );
        await retractReaction();
        setIsReacting(false);
      } catch (e) {
        setHasReacted(true);
        setIsReacting(false);
        console.error(e);
      }
    } else {
      try {
        post.reactions = [
          ...(post.reactions ?? []),
          { profile: currentProfile, reaction: '👍' },
        ];
        await reactToPost({ reaction: '👍' });
        setIsReacting(false);
      } catch (e) {
        setHasReacted(false);
        setIsReacting(false);
        console.error(e);
      }
    }
  };


  const handleSeeThread = () => {
    onPostPress ? onPostPress() : navigation.navigate('Post', { id: post.id });
  };
  useEffect(() => {
    setHasReacted(
      post.reactions?.some(r => r.profile.id === currentProfile?.id) ?? false,
    );
    setRepostCount(post.repostCount);
  }, [post, currentProfile]);

  return (
    <View className="px-5">
      <Separator className="my-3" />
      <View className="flex-row justify-between">
        <Button
          disabled={previewMode}
          onPress={handleSeeThread}
          variant="ghost"
          className="flex-row items-center native:p-0 gap-2">
          <ThemedText>{post.data?.type === 'event' ? t('posts.actions.seeEvent') : t('posts.actions.seeThread')}</ThemedText>
        </Button>
        <Button
          disabled={previewMode}
          onPress={handleReplyPress}
          variant="ghost"
          className="flex-row items-center native:p-0 gap-2">
          <MessageSquareIcon size={18} className="text-foreground" />
          <ThemedText className="text-xl font-semibold">
            {post.replyCount}
          </ThemedText>
        </Button>

        <Button
          disabled={isReacting || previewMode}
          onPress={handleFavorite}
          variant="ghost"
          className="flex-row items-center native:p-0 gap-2">
          <ThumbsUpIcon
            size={18}
            className={hasReacted ? 'text-destructive' : 'text-foreground'}
            fill={hasReacted ? 'red' : 'none'}
          />
          {isReacting ? (
            <ActivityIndicator size="small" />
          ) : (
            <ThemedText className={hasReacted ? 'text-destructive' : ''}>
              {reactionCount['👍']}
            </ThemedText>
          )}
        </Button>

        <Button
          onPress={handleRepost}
          variant="ghost"
          disabled={isReposting || previewMode}
          className="flex-row items-center native:p-0 gap-2">
          {hasReposted ? (
            <>
              <Repeat2Icon size={18} className="text-foreground" fill="green" />
              {isReposting && <ActivityIndicator size="small" />}
              {!isReposting && (
                <ThemedText className="text-xl text-green-500 font-semibold">
                  {repostCount}
                </ThemedText>
              )}
            </>
          ) : (
            <>
              <Repeat2Icon size={18} className="text-foreground" />
              {isReposting && <ActivityIndicator size="small" />}
              {!isReposting && (
                <ThemedText className="text-xl font-semibold">
                  {repostCount}
                </ThemedText>
              )}
            </>
          )}
        </Button>
      </View>
    </View>
  );
};

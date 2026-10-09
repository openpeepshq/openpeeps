import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Button } from '../../ui/button';
import { ThemedText } from '../../ui/themed-text';
import {
  Repeat2Icon,
  MessageSquareIcon,
  ThumbsUpIcon,
} from '../../icons/index';
import { Separator } from '../../ui/separator';
import { type PublicPost } from '@openpeepshq/common';
import { getReactionCount } from '@openpeepshq/common';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types/index';
import { useFeedPostActions } from '@openpeepshq/react';

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
  const [isReacting, setIsReacting] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    myRepost,
    iReacted,
    canReply,
    canRepost,
    canReact,
    reply,
    toggleRepost,
    toggleReaction,
  } = useFeedPostActions(post);
  const hasReposted = !!myRepost;

  const reactionCount = getReactionCount(post);

  const handleReplyPress = () => {
    reply();
  };

  const handleRepost = async () => {
    setIsReposting(true);
    try {
      await toggleRepost();
    } finally {
      setIsReposting(false);
    }
  };

  const handleFavorite = async () => {
    setIsReacting(true);
    try {
      await toggleReaction();
    } finally {
      setIsReacting(false);
    }
  };

  const handleSeeThread = () => {
    onPostPress ? onPostPress() : navigation.navigate('Post', { id: post.id });
  };

  return (
    <View className="px-5">
      <Separator className="my-3" />
      <View className="flex-row justify-between">
        <Button
          disabled={previewMode}
          onPress={handleSeeThread}
          variant="ghost"
          className="flex-row items-center native:p-0 gap-2"
        >
          <ThemedText>
            {post.data?.type === 'event'
              ? t('posts.actions.seeEvent')
              : t('posts.actions.seeThread')}
          </ThemedText>
        </Button>
        <Button
          disabled={previewMode || !canReply}
          onPress={handleReplyPress}
          variant="ghost"
          className="flex-row items-center native:p-0 gap-2"
        >
          <MessageSquareIcon size={18} className="text-foreground" />
          <ThemedText className="text-xl font-semibold">
            {post.replyCount}
          </ThemedText>
        </Button>

        <Button
          disabled={isReacting || previewMode || !canReact}
          onPress={handleFavorite}
          variant="ghost"
          className="flex-row items-center native:p-0 gap-2"
        >
          <ThumbsUpIcon
            size={18}
            className={iReacted ? 'text-destructive' : 'text-foreground'}
            fill={iReacted ? 'red' : 'none'}
          />
          {isReacting ? (
            <ActivityIndicator size="small" />
          ) : (
            <ThemedText className={iReacted ? 'text-destructive' : ''}>
              {reactionCount['👍']}
            </ThemedText>
          )}
        </Button>

        <Button
          onPress={handleRepost}
          variant="ghost"
          disabled={isReposting || previewMode || !canRepost}
          className="flex-row items-center native:p-0 gap-2"
        >
          {hasReposted ? (
            <>
              <Repeat2Icon size={18} className="text-foreground" fill="green" />
              {isReposting && <ActivityIndicator size="small" />}
              {!isReposting && (
                <ThemedText className="text-xl text-green-500 font-semibold">
                  {post.repostCount}
                </ThemedText>
              )}
            </>
          ) : (
            <>
              <Repeat2Icon size={18} className="text-foreground" />
              {isReposting && <ActivityIndicator size="small" />}
              {!isReposting && (
                <ThemedText className="text-xl font-semibold">
                  {post.repostCount}
                </ThemedText>
              )}
            </>
          )}
        </Button>
      </View>
    </View>
  );
};

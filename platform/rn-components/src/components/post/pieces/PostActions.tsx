import React from 'react';
import { View } from 'react-native';
import { Button } from '../../ui/button';
import { ThemedText } from '../../ui/themed-text';
import { Repeat2Icon, ReplyIcon, ThumbsUpIcon } from '../../icons/index';
import { type PublicPost } from '@openpeepshq/common';
import { useTranslation } from 'react-i18next';
import { useFeedPostActions } from '@openpeepshq/react';

interface PostActionsProps {
  post: PublicPost;
  previewMode?: boolean;
}

export const PostActions = ({
  post,
  previewMode = false,
}: PostActionsProps) => {
  const { t } = useTranslation();
  const {
    me,
    myRepost,
    iReacted,
    canReply,
    canRepost,
    canReact,
    reply,
    toggleRepost,
    toggleReaction,
  } = useFeedPostActions(post);

  if (!me) {
    return null;
  }

  const actionClass = 'flex-1 flex-row items-center gap-2 native:p-2';

  return (
    <View className="w-full flex-row items-center py-2">
      <Button
        variant="ghost"
        disabled={previewMode || !canReply}
        onPress={() => reply()}
        className={`${actionClass} justify-start`}
      >
        <ReplyIcon size={16} className="text-foreground" />
        <ThemedText className="text-sm">{t('posts.footer.reply')}</ThemedText>
      </Button>
      <Button
        variant="ghost"
        disabled={previewMode || !canRepost}
        onPress={() => void toggleRepost()}
        className={`${actionClass} justify-center`}
      >
        <Repeat2Icon
          size={16}
          className={myRepost ? 'text-primary' : 'text-foreground'}
        />
        <ThemedText className={`text-sm ${myRepost ? 'text-primary' : ''}`}>
          {t('posts.footer.repost')}
        </ThemedText>
      </Button>
      <Button
        variant="ghost"
        disabled={previewMode || !canReact}
        onPress={() => void toggleReaction()}
        className={`${actionClass} justify-end`}
      >
        <ThumbsUpIcon
          size={16}
          className={iReacted ? 'text-primary' : 'text-foreground'}
        />
        <ThemedText className={`text-sm ${iReacted ? 'text-primary' : ''}`}>
          {t('posts.footer.like')}
        </ThemedText>
      </Button>
    </View>
  );
};

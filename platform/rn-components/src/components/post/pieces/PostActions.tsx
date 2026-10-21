import React from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { ThemedText } from '../../ui/themed-text';
import {
  Repeat2Icon,
  ReplyIcon,
  ShareIcon,
  ThumbsUpIcon,
} from '../../icons/index';
import { type PublicPost } from '@openpeepshq/common';
import { useTranslation } from 'react-i18next';
import { useFeedPostActions } from '@openpeepshq/react';
import { ShareMenu } from './ShareMenu';

interface PostActionsProps {
  post: PublicPost;
  previewMode?: boolean;
  compact?: boolean;
}

export const PostActions = ({
  post,
  previewMode = false,
  compact: _compact = false,
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

  const replyActive = !previewMode && canReply;
  const repostActive = !previewMode && canRepost;
  const reactActive = !previewMode && canReact;
  const shareActive = !previewMode;

  const actionClass = 'flex-1 flex-row items-center gap-2 native:p-2';
  const shareClass = 'flex-row items-center gap-2 native:p-2';
  const shareLabel = t('posts.footer.share');

  // Button fades every disabled control. These should read as plain text.
  const idleClass =
    'opacity-100 web:hover:bg-transparent active:bg-transparent';

  const iconClass = (active: boolean, highlighted: boolean) =>
    !active
      ? 'text-muted-foreground'
      : highlighted
        ? 'text-primary'
        : 'text-foreground';

  const labelClass = (active: boolean, highlighted: boolean) =>
    cn(
      'text-sm',
      !active && 'text-muted-foreground',
      active && highlighted && 'text-primary'
    );

  const shareIconClass = iconClass(shareActive, false);
  const shareTextClass = labelClass(shareActive, false);

  const shareButton = shareActive ? (
    <ShareMenu
      post={post}
      menuButton={
        <Button variant="ghost" className={shareClass}>
          <ShareIcon size={16} className={shareIconClass} />
          <ThemedText className={shareTextClass}>{shareLabel}</ThemedText>
        </Button>
      }
    />
  ) : (
    <Button variant="ghost" disabled className={cn(shareClass, idleClass)}>
      <ShareIcon size={16} className={shareIconClass} />
      <ThemedText className={shareTextClass}>{shareLabel}</ThemedText>
    </Button>
  );

  if (!me) {
    return (
      <View className="w-full flex-row items-center justify-end py-2">
        {shareButton}
      </View>
    );
  }

  return (
    // A disabled control does not take the touch, so the feed card would open
    // the post. This row absorbs that tap and still yields to scrolling.
    <Pressable
      accessible={false}
      onPress={() => {}}
      className="w-full flex-row items-center py-2"
    >
      <Button
        variant="ghost"
        disabled={!replyActive}
        onPress={() => reply()}
        className={cn(actionClass, 'justify-start', !replyActive && idleClass)}
      >
        <ReplyIcon size={16} className={iconClass(replyActive, false)} />
        <ThemedText className={labelClass(replyActive, false)}>
          {t('posts.footer.reply')}
        </ThemedText>
      </Button>
      <Button
        variant="ghost"
        disabled={!repostActive}
        onPress={() => void toggleRepost()}
        className={cn(
          actionClass,
          'justify-center',
          !repostActive && idleClass
        )}
      >
        <Repeat2Icon
          size={16}
          className={iconClass(repostActive, !!myRepost)}
        />
        <ThemedText className={labelClass(repostActive, !!myRepost)}>
          {t('posts.footer.repost')}
        </ThemedText>
      </Button>
      <Button
        variant="ghost"
        disabled={!reactActive}
        onPress={() => void toggleReaction()}
        className={cn(actionClass, 'justify-end', !reactActive && idleClass)}
      >
        <ThumbsUpIcon size={16} className={iconClass(reactActive, iReacted)} />
        <ThemedText className={labelClass(reactActive, iReacted)}>
          {t('posts.footer.like')}
        </ThemedText>
      </Button>
      <View className="flex-1 items-end">{shareButton}</View>
    </Pressable>
  );
};

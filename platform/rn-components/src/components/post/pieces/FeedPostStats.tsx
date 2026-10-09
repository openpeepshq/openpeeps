import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common';
import { postReactionStats } from '@openpeepshq/react';
import { MessageCircleIcon } from '../../icons/index';
import { ThemedText } from '../../ui/themed-text';
import { ReactionsModal } from './modals/ReactionsModal';
import { RepostModal } from './modals/RepostModal';

export interface FeedPostStatsProps {
  post: PublicPost;
}

export const FeedPostStats = ({ post }: FeedPostStatsProps) => {
  const { t } = useTranslation();
  const stats = post ? postReactionStats(post) : '';
  const [modal, setModal] = useState<'reactions' | 'reposts' | null>(null);

  return (
    <>
      <View className="flex-row justify-between pb-2">
        <View>
          {post?.reactions?.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('posts.stats.viewReactions')}
              onPress={() => setModal('reactions')}
            >
              <ThemedText className="text-xs text-muted-foreground">
                {stats}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          {post?.replyCount ? (
            <View className="flex-row items-center gap-1">
              <MessageCircleIcon size={14} className="text-primary" />
              <ThemedText className="text-xs font-medium text-primary">
                {t('posts.stats.repliesCount', { count: post.replyCount })}
              </ThemedText>
            </View>
          ) : null}
          {post?.replyCount && post?.repostCount ? (
            <ThemedText className="text-xs text-muted-foreground">·</ThemedText>
          ) : null}
          {post?.repostCount ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('posts.stats.viewReposts')}
              onPress={() => setModal('reposts')}
            >
              <ThemedText className="text-xs text-muted-foreground">
                {t('posts.stats.repostsCount', { count: post.repostCount })}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ReactionsModal
        reactions={post.reactions ?? []}
        open={modal === 'reactions'}
        onClose={() => setModal(null)}
      />
      <RepostModal
        reposts={post.reposts ?? []}
        repostCount={post.repostCount ?? 0}
        open={modal === 'reposts'}
        onClose={() => setModal(null)}
      />
    </>
  );
};

import { type PublicPost, type PublicReplyPost } from '@openpeepshq/common';
import { firstNWords, useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { ThemedView } from '~/components/ui/themed-view';
import { ThemedText } from '~/components/ui/themed-text';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { UpdatingDate } from '../../date/updating-date';

const previewText = (reply: PublicReplyPost): string => {
  const data = reply.data;
  if ('name' in data && typeof data.name === 'string' && data.name.trim()) {
    return data.name;
  }
  if ('title' in data && typeof data.title === 'string' && data.title.trim()) {
    return data.title;
  }
  if ('content' in data && typeof data.content === 'string') {
    return firstNWords(data.content, 28);
  }
  return '';
};

export const FeedThreadPreview = ({ post }: { post: PublicPost }) => {
  const { t } = useTranslation();
  const { currentProfile } = useOpenpeeps();
  const replies = [...(post.latestReplies ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const hiddenCount = Math.max(0, (post.replyCount ?? 0) - replies.length);
  const hasNew = replies.some(
    (reply) => reply.seen === false && reply.profile.id !== currentProfile?.id,
  );

  if (!replies.length && !post.replyCount) {
    return null;
  }

  return (
    <ThemedView className="mt-3 px-5">
      <ThemedView className="flex-row items-center gap-2 mb-2">
        <ThemedText className="text-primary font-medium text-sm">
          {hasNew
            ? t('posts.stats.newReplies')
            : t('posts.stats.viewConversation')}
        </ThemedText>
        {hiddenCount > 0 ? (
          <ThemedText className="text-muted-foreground text-sm">
            {t('posts.stats.moreReplies', { count: hiddenCount })}
          </ThemedText>
        ) : null}
      </ThemedView>
      {replies.map((reply) => {
        const text = previewText(reply);
        return (
          <ThemedView key={reply.id} className="flex-row gap-2 mb-2 ml-2 border-l-2 border-border pl-3">
            <ProfileAvatar profile={reply.profile} className="size-8" />
            <ThemedView className="flex-1">
              <ThemedView className="flex-row items-baseline gap-2">
                <ThemedText className="font-semibold text-sm" numberOfLines={1}>
                  {reply.profile.displayName || `@${reply.profile.handle}`}
                </ThemedText>
                <UpdatingDate date={reply.createdAt} />
              </ThemedView>
              {text ? (
                <ThemedText className="text-muted-foreground text-sm" numberOfLines={2}>
                  {text}
                </ThemedText>
              ) : null}
            </ThemedView>
          </ThemedView>
        );
      })}
    </ThemedView>
  );
};

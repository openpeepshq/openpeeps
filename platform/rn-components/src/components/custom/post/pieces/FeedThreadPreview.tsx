import { type PublicPost, type PublicReplyPost } from '@openpeepshq/common';
import { buildThreadPreview } from '@openpeepshq/common/lib';
import { firstNWords, useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { ThemedView } from '~/components/ui/themed-view';
import { ThemedText } from '~/components/ui/themed-text';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { UpdatingDate } from '../../date/updating-date';

const previewText = (reply: PublicReplyPost, words = 28): string => {
  const data = reply.data;
  if ('name' in data && typeof data.name === 'string' && data.name.trim()) {
    return data.name;
  }
  if ('title' in data && typeof data.title === 'string' && data.title.trim()) {
    return data.title;
  }
  if ('content' in data && typeof data.content === 'string') {
    return firstNWords(data.content, words);
  }
  return '';
};

const ThreadReplyRow = ({
  reply,
  indent,
  muted,
}: {
  reply: PublicReplyPost;
  indent: number;
  muted?: boolean;
}) => {
  const text = previewText(reply, muted ? 12 : 28);
  return (
    <ThemedView
      className="flex-row gap-2 mb-2"
      style={{ paddingLeft: Math.min(indent, 3) * 12 }}
    >
      <ProfileAvatar
        profile={reply.profile}
        className={muted ? 'size-6' : 'size-8'}
      />
      <ThemedView className="flex-1">
        <ThemedView className="flex-row items-baseline gap-2">
          <ThemedText
            className={
              muted ? 'font-semibold text-xs' : 'font-semibold text-sm'
            }
            numberOfLines={1}
          >
            {reply.profile.displayName || `@${reply.profile.handle}`}
          </ThemedText>
          <UpdatingDate date={reply.createdAt} />
        </ThemedView>
        {text ? (
          <ThemedText
            className="text-muted-foreground text-sm"
            numberOfLines={muted ? 1 : 2}
          >
            {text}
          </ThemedText>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
};

export const FeedThreadPreview = ({ post }: { post: PublicPost }) => {
  const { t } = useTranslation();
  const { currentProfile } = useOpenpeeps();
  const replies = post.latestReplies ?? [];
  const groups = buildThreadPreview(post.id, replies);
  const hasNew = replies.some(
    (reply) => reply.seen === false && reply.profile.id !== currentProfile?.id
  );

  if (!replies.length && !post.replyCount && !post.latestRepliesHasMore) {
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
      </ThemedView>
      {groups.length > 0 ? (
        <ThemedView className="ml-2 border-l-2 border-border pl-3">
          {groups.map((group, groupIndex) => (
            <ThemedView key={group.posts[0]?.id ?? groupIndex}>
              {group.skippedAncestor ? (
                <ThemedText
                  className="text-muted-foreground text-xs mb-2 tracking-widest"
                  accessibilityLabel={t('posts.stats.earlierInThread')}
                >
                  · · ·
                </ThemedText>
              ) : null}
              {group.ancestor ? (
                <ThreadReplyRow
                  reply={group.ancestor as PublicReplyPost}
                  indent={0}
                  muted
                />
              ) : null}
              {group.posts.map((reply, index) => (
                <ThreadReplyRow
                  key={reply.id}
                  reply={reply as PublicReplyPost}
                  indent={group.ancestor ? Math.min(index + 1, 3) : index}
                />
              ))}
            </ThemedView>
          ))}
        </ThemedView>
      ) : null}
      {post.latestRepliesHasMore ? (
        <ThemedText className="text-muted-foreground text-xs ml-2 pl-3">
          {t('posts.stats.moreInConversation')}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
};

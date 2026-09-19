import { type PublicPost, type PublicReplyPost } from '@openpeepshq/common';
import { buildThreadPreview } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { ThemedView } from '~/components/ui/themed-view';
import { ThemedText } from '~/components/ui/themed-text';
import { CompactReplyParent } from '../feed/chronological/CompactReplyParent';

const ThreadReplyRow = ({
  reply,
  indent,
  muted,
}: {
  reply: PublicReplyPost;
  indent: number;
  muted?: boolean;
}) => (
  <ThemedView
    className="mb-2"
    style={{ paddingLeft: Math.min(indent, 3) * 12 }}
  >
    <CompactReplyParent
      post={reply}
      className={`mx-0 mb-0${muted ? ' opacity-70' : ''}`}
    />
  </ThemedView>
);

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
      <ThemedView className="mb-2 flex-row items-center gap-2">
        <ThemedText className="text-primary text-sm font-medium">
          {hasNew
            ? t('posts.stats.newReplies')
            : t('posts.stats.viewConversation')}
        </ThemedText>
      </ThemedView>
      {groups.length > 0 ? (
        <ThemedView className="border-border ml-2 border-l-2 pl-3">
          {groups.map((group, groupIndex) => (
            <ThemedView key={group.posts[0]?.id ?? groupIndex}>
              {group.skippedAncestor ? (
                <ThemedText
                  className="text-muted-foreground mb-2 text-xs tracking-widest"
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
        <ThemedText className="text-muted-foreground ml-2 pl-3 text-xs">
          {t('posts.stats.moreInConversation')}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
};

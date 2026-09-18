import type { PublicPost, PublicReplyPost } from '@openpeepshq/common/types';
import { buildThreadPreview } from '@openpeepshq/common/lib';
import { UpdatingDate, cn } from '@openpeepshq/react-ui';
import { MessageCircle } from 'lucide-react';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { Avatar } from '../../profile';
import { firstNWords } from '../helpers';
import { UnreadPostIndicator } from './UnreadPostIndicator';

export interface FeedThreadPreviewProps {
  post: PublicPost;
}

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

const indentClass = ['', 'pl-3', 'pl-6', 'pl-9'] as const;

const ThreadReplyRow = ({
  reply,
  indent,
  muted,
  isUnread,
}: {
  reply: PublicReplyPost;
  indent: number;
  muted?: boolean;
  isUnread?: boolean;
}) => {
  const text = previewText(reply, muted ? 12 : 28);
  return (
    <div
      className={cn(
        'relative flex min-w-0 gap-2',
        indentClass[Math.min(indent, indentClass.length - 1)],
      )}
    >
      <UnreadPostIndicator show={!!isUnread} className="-left-3.5 top-3" />
      <Avatar profile={reply.profile} size={muted ? 1.5 : 2} borderless />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={cn(
              'truncate font-semibold',
              muted ? 'text-muted-foreground text-xs' : 'text-sm',
            )}
          >
            {reply.profile.displayName || `@${reply.profile.handle}`}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">
            <UpdatingDate date={reply.createdAt} />
          </span>
        </div>
        {text ? (
          <p
            className={cn(
              'text-muted-foreground text-sm',
              muted ? 'line-clamp-1' : 'line-clamp-2',
            )}
          >
            {text}
          </p>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Nested conversation under a timeline original: newest descendants stay in
 * the thread instead of becoming their own feed items.
 */
export const FeedThreadPreview = ({ post }: FeedThreadPreviewProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const replies = post.latestReplies ?? [];
  const groups = buildThreadPreview(post.id, replies);
  const hasNew = replies.some(
    (reply) => reply.seen === false && reply.profile.id !== me?.id,
  );

  if (!replies.length && !post.replyCount && !post.latestRepliesHasMore) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <MessageCircle className="text-primary size-4 shrink-0" />
        {hasNew ? (
          <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
            {t('posts.stats.newReplies', { defaultValue: 'New replies' })}
          </span>
        ) : (
          <span className="text-primary font-medium">
            {t('posts.stats.viewConversation', {
              defaultValue: 'View conversation',
            })}
          </span>
        )}
      </div>
      {groups.length > 0 ? (
        <div className="border-border ml-2 space-y-2.5 border-l-2 pl-3">
          {groups.map((group, groupIndex) => (
            <div key={group.posts[0]?.id ?? groupIndex} className="space-y-2.5">
              {group.skippedAncestor ? (
                <div
                  className="text-muted-foreground px-1 text-xs tracking-widest"
                  aria-label={t('posts.stats.earlierInThread', {
                    defaultValue: 'Earlier in thread',
                  })}
                >
                  · · ·
                </div>
              ) : null}
              {group.ancestor ? (
                <ThreadReplyRow
                  reply={group.ancestor as PublicReplyPost}
                  indent={0}
                  muted
                />
              ) : null}
              {group.posts.map((reply, index) => {
                const postReply = reply as PublicReplyPost;
                const isUnread =
                  postReply.seen === false &&
                  !!me?.id &&
                  postReply.profile.id !== me.id;
                return (
                  <ThreadReplyRow
                    key={reply.id}
                    reply={postReply}
                    indent={group.ancestor ? Math.min(index + 1, 3) : index}
                    isUnread={isUnread}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
      {post.latestRepliesHasMore ? (
        <div className="text-muted-foreground ml-2 mt-2 pl-3 text-xs">
          {t('posts.stats.moreInConversation', {
            defaultValue: 'More in conversation',
          })}
        </div>
      ) : null}
    </div>
  );
};

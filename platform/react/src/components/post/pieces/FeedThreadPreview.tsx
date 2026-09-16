import type { PublicPost, PublicReplyPost } from '@openpeepshq/common/types';
import { UpdatingDate } from '@openpeepshq/react-ui';
import { MessageCircle } from 'lucide-react';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { Avatar } from '../../profile';
import { firstNWords } from '../helpers';
import { UnreadPostIndicator } from './UnreadPostIndicator';

export interface FeedThreadPreviewProps {
  post: PublicPost;
}

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

/**
 * Nested conversation under a timeline original: newest replies stay in the
 * thread instead of becoming their own feed items.
 */
export const FeedThreadPreview = ({ post }: FeedThreadPreviewProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const replies = [...(post.latestReplies ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const hiddenCount = Math.max(0, (post.replyCount ?? 0) - replies.length);
  const hasNew = replies.some(
    (reply) => reply.seen === false && reply.profile.id !== me?.id,
  );

  if (!replies.length && !post.replyCount) return null;

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
      {replies.length > 0 ? (
        <div className="border-border ml-2 space-y-2.5 border-l-2 pl-3">
          {replies.map((reply) => {
            const text = previewText(reply);
            const isUnread =
              reply.seen === false && !!me?.id && reply.profile.id !== me.id;
            return (
              <div key={reply.id} className="relative flex min-w-0 gap-2">
                <UnreadPostIndicator
                  show={isUnread}
                  className="-left-3.5 top-3"
                />
                <Avatar profile={reply.profile} size={2} borderless />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {reply.profile.displayName || `@${reply.profile.handle}`}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      <UpdatingDate date={reply.createdAt} />
                    </span>
                  </div>
                  {text ? (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {text}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {hiddenCount > 0 ? (
        <div className="text-muted-foreground ml-2 mt-2 pl-3 text-xs">
          {t('posts.stats.moreReplies', {
            defaultValue: `${hiddenCount} more replies`,
            count: hiddenCount,
          })}
        </div>
      ) : null}
    </div>
  );
};

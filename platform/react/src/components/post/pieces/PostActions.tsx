import { Reply, Repeat2, Share, ThumbsUp } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { Button, cn } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useFeedPostActions } from '../../../hooks/posts/useFeedPostActions';
import { postReactionStats } from '../helpers';
import { ShareMenu } from './ShareMenu';

export interface PostActionsProps {
  post: PublicPost;
  compact?: boolean;
  /** When true, disables interactive actions (used in previews). */
  previewMode?: boolean;
}

export function PostActions({
  post,
  compact = false,
  previewMode = false,
}: PostActionsProps) {
  const t = useT();
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

  const actionClass =
    'hover:bg-surface rounded-button flex gap-2 p-2 text-sm disabled:opacity-60';

  const replyLabel = t('posts.footer.reply', { defaultValue: 'Reply' });
  const repostLabel = t('posts.footer.repost', { defaultValue: 'Repost' });
  const likeLabel = t('posts.footer.like', { defaultValue: 'Like' });
  const shareLabel = t('posts.footer.share', { defaultValue: 'Share' });

  return (
    <div
      className={`mx-auto flex w-full items-center p-2 ${me ? 'justify-between' : 'justify-end'}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      {me ? (
        <>
          <Button
            variant="unstyled"
            className={actionClass}
            title={t('posts.actions.reply', { defaultValue: 'Reply' })}
            action={reply}
            disabled={previewMode || !canReply}
          >
            <Reply className="h-4 w-4" />
            {compact ? post.replyCount || null : replyLabel}
          </Button>
          <Button
            variant="unstyled"
            className={`${actionClass} ${myRepost ? 'text-primary' : ''}`}
            title={t('posts.actions.repost', { defaultValue: 'Repost' })}
            action={toggleRepost}
            disabled={previewMode || !canRepost}
            spinnerOnlyOnLoading
            data-testid="posts-repost-button"
          >
            <Repeat2 className="h-4 w-4" />
            {compact ? post.repostCount || null : repostLabel}
          </Button>
          <Button
            variant="unstyled"
            className={`${actionClass} ${iReacted ? 'text-primary' : ''}`}
            title={t('posts.actions.react', { defaultValue: 'React' })}
            action={toggleReaction}
            disabled={previewMode || !canReact}
            spinnerOnlyOnLoading
          >
            <ThumbsUp className="h-4 w-4" />
            {compact
              ? post.reactions?.length
                ? ` · ${postReactionStats(post)}`
                : null
              : likeLabel}
          </Button>
        </>
      ) : null}
      <ShareMenu
        post={post}
        variant="unstyled"
        className={cn(
          actionClass,
          previewMode && 'pointer-events-none opacity-60',
        )}
        text={compact ? undefined : shareLabel}
        menuButton={<Share className="h-4 w-4" />}
      />
    </div>
  );
}

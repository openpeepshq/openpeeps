import { Reply, Repeat2, ThumbsUp } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { Button, cn } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useFeedPostActions } from '../../../hooks/posts/useFeedPostActions';
import { postReactionStats } from '../helpers';

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

  if (!me) return null;

  const replyActive = !previewMode && canReply;
  const repostActive = !previewMode && canRepost;
  const reactActive = !previewMode && canReact;

  // Unstyled buttons skip the shared disabled treatment. Mute them, and let
  // presses fall through to this row so a feed link does not open the post.
  const actionClass = (active: boolean) =>
    cn(
      'rounded-button flex gap-2 p-2 text-sm',
      active
        ? 'cursor-pointer hover:bg-surface'
        : 'pointer-events-none cursor-default text-muted-foreground disabled:text-muted-foreground',
    );

  const replyLabel = t('posts.footer.reply', { defaultValue: 'Reply' });
  const repostLabel = t('posts.footer.repost', { defaultValue: 'Repost' });
  const likeLabel = t('posts.footer.like', { defaultValue: 'Like' });

  return (
    <div
      className="mx-auto grid w-full cursor-default grid-cols-3 items-center p-2"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <Button
        variant="unstyled"
        className={cn(actionClass(replyActive), 'justify-self-start')}
        title={t('posts.actions.reply', { defaultValue: 'Reply' })}
        action={reply}
        disabled={!replyActive}
      >
        <Reply className="h-4 w-4" />
        {compact ? post.replyCount || null : replyLabel}
      </Button>
      <Button
        variant="unstyled"
        className={cn(
          actionClass(repostActive),
          'justify-self-center',
          myRepost && repostActive && 'text-primary',
        )}
        title={t('posts.actions.repost', { defaultValue: 'Repost' })}
        action={toggleRepost}
        disabled={!repostActive}
        spinnerOnlyOnLoading
        data-testid="posts-repost-button"
      >
        <Repeat2 className="h-4 w-4" />
        {compact ? post.repostCount || null : repostLabel}
      </Button>
      <Button
        variant="unstyled"
        className={cn(
          actionClass(reactActive),
          'justify-self-end',
          iReacted && reactActive && 'text-primary',
        )}
        title={t('posts.actions.react', { defaultValue: 'React' })}
        action={toggleReaction}
        disabled={!reactActive}
        spinnerOnlyOnLoading
      >
        <ThumbsUp className="h-4 w-4" />
        {compact
          ? post.reactions?.length
            ? ` · ${postReactionStats(post)}`
            : null
          : likeLabel}
      </Button>
    </div>
  );
}

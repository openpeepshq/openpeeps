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

  const replyActive = !previewMode && canReply;
  const repostActive = !previewMode && canRepost;
  const reactActive = !previewMode && canReact;
  const shareActive = !previewMode;

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
  const shareLabel = t('posts.footer.share', { defaultValue: 'Share' });

  return (
    <div
      className={`mx-auto flex w-full cursor-default items-center p-2 ${
        me ? 'justify-between' : 'justify-end'
      }`}
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
            className={actionClass(replyActive)}
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
        </>
      ) : null}
      <ShareMenu
        post={post}
        variant="unstyled"
        className={actionClass(shareActive)}
        text={compact ? undefined : shareLabel}
        menuButton={<Share className="h-4 w-4" />}
      />
    </div>
  );
}

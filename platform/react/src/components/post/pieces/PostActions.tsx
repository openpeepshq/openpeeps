import { Reply, Repeat2, ThumbsUp } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useFeedPostActions } from '../../../hooks/posts/useFeedPostActions';
import { postReactionStats } from '../helpers';

export interface PostActionsProps {
  post: PublicPost;
  compact?: boolean;
}

export function PostActions({ post, compact = false }: PostActionsProps) {
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

  const actionClass =
    'hover:bg-surface rounded-button flex gap-2 p-2 text-sm disabled:opacity-60';

  const replyLabel = t('posts.footer.reply', { defaultValue: 'Reply' });
  const repostLabel = t('posts.footer.repost', { defaultValue: 'Repost' });
  const likeLabel = t('posts.footer.like', { defaultValue: 'Like' });

  return (
    <div
      className="mx-auto grid w-full grid-cols-3 items-center p-2"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <Button
        variant="unstyled"
        className={`${actionClass} justify-self-start`}
        title={t('posts.actions.reply', { defaultValue: 'Reply' })}
        action={reply}
        disabled={!canReply}
      >
        <Reply className="h-4 w-4" />
        {compact ? post.replyCount || null : replyLabel}
      </Button>
      <Button
        variant="unstyled"
        className={`${actionClass} justify-self-center ${myRepost ? 'text-primary' : ''}`}
        title={t('posts.actions.repost', { defaultValue: 'Repost' })}
        action={toggleRepost}
        disabled={!canRepost}
        spinnerOnlyOnLoading
        data-testid="posts-repost-button"
      >
        <Repeat2 className="h-4 w-4" />
        {compact ? post.repostCount || null : repostLabel}
      </Button>
      <Button
        variant="unstyled"
        className={`${actionClass} justify-self-end ${iReacted ? 'text-primary' : ''}`}
        title={t('posts.actions.react', { defaultValue: 'React' })}
        action={toggleReaction}
        disabled={!canReact}
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

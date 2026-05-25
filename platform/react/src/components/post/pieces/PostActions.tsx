import { useMemo, useState } from 'react';
import { MessageCircle, Repeat2, ThumbsUp } from 'lucide-react';
import type { PublicPost } from '@openpeeps/common/types';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { postReactionStats } from '../helpers';
import { useReplyModal } from '../post-form/ReplyModalContext';

export interface PostActionsProps {
  post: PublicPost;
  compact?: boolean;
}

export function PostActions({ post, compact = false }: PostActionsProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const { openReply } = useReplyModal();
  const repostsQuery = openpeepsApi.useCurrentProfileReposts();

  const reactToPost = openpeepsApi.reactToPostAction({ id: post.id });
  const retractReaction = openpeepsApi.retractPostReactionAction({ id: post.id });
  const repostPost = openpeepsApi.repostPostAction({ id: post.id });
  const deletePost = openpeepsApi.deletePostAction({ id: post.id });

  const [busy, setBusy] = useState(false);

  const myRepost = useMemo(
    () => repostsQuery.data?.find((p) => p.repost?.id === post.id),
    [repostsQuery.data, post.id],
  );
  const iReacted = useMemo(
    () => !!post.reactions?.some((r) => r.profile.id === me?.id),
    [post.reactions, me?.id],
  );

  if (!me) return null;

  const stop =
    (handler: () => void | Promise<void>) =>
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void handler();
    };

  const handleReply = () => openReply(post);

  const handleRepost = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (myRepost) {
        await deletePost({ id: myRepost.id });
      } else {
        await repostPost(undefined);
      }
      await repostsQuery.refetch();
    } finally {
      setBusy(false);
    }
  };

  const handleReaction = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (iReacted) {
        await retractReaction(undefined);
      } else {
        await reactToPost({ reaction: '👍' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`mx-auto grid w-full grid-cols-3 items-center p-2 ${
        compact ? '' : 'border-t'
      }`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <button
        type="button"
        className="hover:bg-surface-200 flex justify-self-start gap-2 rounded-md p-2 text-sm"
        title={t('posts.actions.reply', { defaultValue: 'Reply' })}
        onClick={stop(handleReply)}
      >
        <MessageCircle className="h-4 w-4" />
        {post.replyCount || null}
      </button>
      <button
        type="button"
        className={`hover:bg-surface-200 flex justify-self-center gap-2 rounded-md p-2 text-sm ${myRepost ? 'text-primary' : ''}`}
        title={t('posts.actions.repost', { defaultValue: 'Repost' })}
        onClick={stop(handleRepost)}
        disabled={busy}
        data-testid="posts-repost-button"
      >
        <Repeat2 className="h-4 w-4" />
        {compact ? post.repostCount || null : t('posts.footer.repost', { defaultValue: 'Repost' })}
      </button>
      <button
        type="button"
        className={`hover:bg-surface-200 flex justify-self-end gap-2 rounded-md p-2 text-sm ${iReacted ? 'text-primary' : ''}`}
        title={t('posts.actions.react', { defaultValue: 'React' })}
        onClick={stop(handleReaction)}
        disabled={busy}
      >
        <ThumbsUp className="h-4 w-4" />
        {compact
          ? post.reactions?.length
            ? ` · ${postReactionStats(post)}`
            : null
          : t('posts.footer.like', { defaultValue: 'Like' })}
      </button>
    </div>
  );
}

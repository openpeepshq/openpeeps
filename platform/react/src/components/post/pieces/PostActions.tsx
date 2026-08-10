import { useMemo } from 'react';
import { MessageCircle, Repeat2, ThumbsUp } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { Button } from '@openpeepshq/react-ui';
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
  const retractReaction = openpeepsApi.retractPostReactionAction({
    id: post.id,
  });
  const repostPost = openpeepsApi.repostPostAction({ id: post.id });
  const deletePost = openpeepsApi.deletePostAction({ id: post.id });

  const myRepost = useMemo(
    () => repostsQuery.data?.find((p) => p.repost?.id === post.id),
    [repostsQuery.data, post.id],
  );
  const iReacted = useMemo(
    () => !!post.reactions?.some((r) => r.profile.id === me?.id),
    [post.reactions, me?.id],
  );

  if (!me) return null;

  const isGroupPost = !!post.groupId;
  const membershipExists = !!me.memberships?.some(
    (m) => m.group.id === post.group?.id,
  );
  const disabledForGroup = isGroupPost && !membershipExists;

  const stop = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };

  const handleReply = () => openReply(post);

  const handleRepost = async () => {
    if (myRepost) {
      await deletePost({ id: myRepost.id });
    } else {
      await repostPost(undefined);
    }
    await repostsQuery.refetch();
  };

  const handleReaction = async () => {
    if (iReacted) {
      await retractReaction(undefined);
    } else {
      await reactToPost({ reaction: '👍' });
    }
  };

  const replyLabel = t('posts.footer.reply', { defaultValue: 'Reply' });
  const repostLabel = t('posts.footer.repost', { defaultValue: 'Repost' });
  const likeLabel = t('posts.footer.like', { defaultValue: 'Like' });

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
        className="hover:bg-surface-200 flex gap-2 justify-self-start rounded-md p-2 text-sm disabled:opacity-60"
        title={t('posts.actions.reply', { defaultValue: 'Reply' })}
        onClick={stop(handleReply)}
        disabled={disabledForGroup}
      >
        <MessageCircle className="h-4 w-4" />
        {compact ? post.replyCount || null : replyLabel}
      </button>
      <Button
        type="button"
        className={`hover:bg-surface-200 flex gap-2 justify-self-center rounded-md p-2 text-sm disabled:opacity-60 ${myRepost ? 'text-primary' : ''}`}
        title={t('posts.actions.repost', { defaultValue: 'Repost' })}
        action={handleRepost}
        disabled={disabledForGroup}
        spinnerOnlyOnLoading
        data-testid="posts-repost-button"
      >
        <Repeat2 className="h-4 w-4" />
        {compact ? post.repostCount || null : repostLabel}
      </Button>
      <Button
        type="button"
        className={`hover:bg-surface-200 flex gap-2 justify-self-end rounded-md p-2 text-sm disabled:opacity-60 ${iReacted ? 'text-primary' : ''}`}
        title={t('posts.actions.react', { defaultValue: 'React' })}
        action={handleReaction}
        disabled={disabledForGroup}
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

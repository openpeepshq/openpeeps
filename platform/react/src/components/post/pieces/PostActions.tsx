import { MessageCircle, Repeat2, SmilePlus } from 'lucide-react';
import type { PublicPost } from '@openpeeps/common/types';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';

export interface PostActionsProps {
  post: PublicPost;
  compact?: boolean;
}

/**
 * Reply / repost / react buttons. Translates `PostActions.svelte`.
 *
 * Minimal: the buttons currently navigate to the post detail page for reply
 * and repost, and surface a non-functional react picker. Hook real mutations
 * to `openpeepsApi.reactToPostAction` / `repostPostAction` once the
 * reaction-picker and repost dialogs are ported.
 */
export function PostActions({ post, compact = false }: PostActionsProps) {
  const t = useT();
  const me = useCurrentProfile();

  if (!me) return null;

  const stop = (handler: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };

  return (
    <div
      className={`mx-auto grid w-full grid-cols-3 items-center p-2 ${
        compact ? '' : 'border-t'
      }`}
    >
      <a
        href={`/posts/${post.id}#reply`}
        className="hover:bg-surface-200 flex justify-self-start gap-2 rounded-md p-2 text-sm"
        title={t('posts.actions.reply', { defaultValue: 'Reply' })}
        onClick={(e) => e.stopPropagation()}
      >
        <MessageCircle className="h-4 w-4" />
        {post.replyCount ? post.replyCount : null}
      </a>
      <button
        type="button"
        className="hover:bg-surface-200 flex justify-self-center gap-2 rounded-md p-2 text-sm"
        title={t('posts.actions.repost', { defaultValue: 'Repost' })}
        onClick={stop(() => {
          // TODO: open repost dialog when ported. For now navigate to the post.
          window.location.assign(`/posts/${post.id}`);
        })}
      >
        <Repeat2 className="h-4 w-4" />
        {post.repostCount ? post.repostCount : null}
      </button>
      <button
        type="button"
        className="hover:bg-surface-200 flex justify-self-end gap-2 rounded-md p-2 text-sm"
        title={t('posts.actions.react', { defaultValue: 'React' })}
        onClick={stop(() => {
          // TODO: open reaction picker when ported.
        })}
      >
        <SmilePlus className="h-4 w-4" />
        {post.reactions?.length ? post.reactions.length : null}
      </button>
    </div>
  );
}

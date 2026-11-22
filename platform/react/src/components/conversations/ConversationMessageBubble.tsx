import type { PublicPost } from '@openpeepshq/common/types';
import { useT } from '../../i18n';
import { usePostReactionToggle } from '../../hooks/posts/usePostReactionToggle';
import { useCurrentProfile } from '../layout/IdentityContext';
import { FeedPostContent } from '../post/FeedPostContent';
import { ReactionPicker } from '../post/pieces/ReactionPicker';
import { UnreadPostIndicator } from '../post/pieces/UnreadPostIndicator';

export function ConversationMessageBubble({
  message,
  unread = false,
}: {
  message: PublicPost;
  unread?: boolean;
}) {
  const me = useCurrentProfile();
  const t = useT();
  const mine = message.profile.id === me?.id;
  const { iLiked, myReactions, canReact, toggleReaction } =
    usePostReactionToggle(message);

  return (
    <div
      className={`mt-4 flex w-full items-center gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`w-[80%] rounded-t-xl p-3 ${
          mine ? 'bg-primary/10 rounded-bl-xl' : 'bg-surface-2 rounded-br-xl'
        }`}
      >
        <FeedPostContent post={message} />
        {me && canReact ? (
          <div
            className={mine ? 'mt-2 flex justify-end' : 'mt-2 flex'}
            title={t('posts.actions.react', { defaultValue: 'React' })}
          >
            <ReactionPicker
              post={message}
              compact
              myReactions={myReactions}
              canReact={canReact}
              iLiked={iLiked}
              onToggleReaction={(reaction) => void toggleReaction(reaction)}
            />
          </div>
        ) : null}
      </div>
      {!mine ? (
        <UnreadPostIndicator
          show={unread}
          className="relative inset-auto shrink-0 translate-y-0"
        />
      ) : null}
    </div>
  );
}

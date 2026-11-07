import { ThumbsUp } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { usePostReactionToggle } from '../../hooks/posts/usePostReactionToggle';
import { useCurrentProfile } from '../layout/IdentityContext';
import { FeedPostContent } from '../post/FeedPostContent';
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
  const { iReacted, canReact, toggleReaction } = usePostReactionToggle(message);
  const reactionCount = message.reactions?.length ?? 0;

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
          <div className={mine ? 'mt-2 flex justify-end' : 'mt-2 flex'}>
            <Button
              variant="unstyled"
              className={`items-center gap-1 rounded-button p-1 text-xs ${
                iReacted ? 'text-primary' : 'text-muted-foreground'
              }`}
              title={t('posts.actions.react', { defaultValue: 'React' })}
              aria-label={t('posts.actions.react')}
              action={toggleReaction}
              spinnerOnlyOnLoading
            >
              <ThumbsUp className="h-4 w-4" />
              {reactionCount > 0 ? reactionCount : null}
            </Button>
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

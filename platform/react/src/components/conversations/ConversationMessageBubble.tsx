import type { PublicPost } from '@openpeepshq/common/types';
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
  const mine = message.profile.id === me?.id;

  return (
    <div
      className={`mt-4 flex w-full items-center gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`w-[80%] rounded-t-xl p-3 md:w-[60%] ${
          mine ? 'bg-primary/10 rounded-bl-xl' : 'bg-surface-2 rounded-br-xl'
        }`}
      >
        <FeedPostContent post={message} />
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

import type { PublicPost } from '@openpeeps/common/types';
import { useCurrentProfile } from '../layout/IdentityContext';
import { FeedPostContent } from '../post/FeedPostContent';

export function ConversationMessageBubble({ message }: { message: PublicPost }) {
  const me = useCurrentProfile();
  const mine = message.profile.id === me?.id;

  return (
    <div
      className={`mt-2 flex w-full ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`mt-2 w-[80%] rounded-t-xl p-3 md:w-[60%] ${
          mine
            ? 'variant-soft-primary rounded-bl-xl bg-primary/10'
            : 'bg-surface-200 rounded-br-xl'
        }`}
      >
        <FeedPostContent post={message} />
      </div>
    </div>
  );
}

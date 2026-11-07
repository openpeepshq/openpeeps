import type { PublicPost } from '@openpeepshq/common/types';
import { isConversationLeavePost, profileName } from '@openpeepshq/common';
import { useT } from '../../i18n';
import { usePostViewRef } from '../../lib/postViewCounter';
import { isUnreadPostForViewer } from '../../lib/postUnread';
import { UpdatingDate } from '@openpeepshq/react-ui';
import { Avatar } from '../profile';
import { useCurrentProfile } from '../layout/IdentityContext';
import { ConversationMessageBubble } from './ConversationMessageBubble';

const audienceDiff = (
  previous: PublicPost | undefined,
  message: PublicPost,
) => {
  const before = previous?.audience ?? [];
  const after = message.audience ?? [];
  return {
    added: after.filter((p) => !before.some((b) => b.id === p.id)),
    removed: before.filter((p) => !after.some((a) => a.id === p.id)),
  };
};

export interface MessageInThreadProps {
  previous: PublicPost | undefined;
  message: PublicPost;
  multipleParticipants?: boolean;
  conversationRootId?: string;
  highlighted?: boolean;
}

/**
 * Translation of `@openpeepshq/svelte` `MessageInThread.svelte`: renders a single
 * thread message together with the participant system messages (started/added/
 * left/removed) derived from how the audience changed between posts.
 */
export function MessageInThread({
  previous,
  message,
  multipleParticipants = true,
  conversationRootId,
  highlighted = false,
}: MessageInThreadProps) {
  const t = useT();
  const me = useCurrentProfile();
  const isUnread = isUnreadPostForViewer(message, me?.id);
  const postViewRef = usePostViewRef(message.id, {
    conversationRootId,
    adjustUnread: isUnread,
  });
  const { added, removed } = audienceDiff(previous, message);
  // The author leaving their own conversation is shown via the "left" label
  // below, so exclude them from the "removedBy" avatars to avoid redundancy.
  const removedOthers = removed.filter((p) => p.id !== message.profile.id);
  // A leave post (isConversationLeavePost) renders only the "left" label
  // (no message bubble); the view-ref moves to that label so the post is
  // still marked seen. It holds even when the leave is the first loaded
  // post, so no comparison against the previous post is needed.
  const isLeave = isConversationLeavePost(message);
  const name = profileName(message.profile);
  const isMe = message.profile.id === me?.id;

  return (
    <div
      data-message-id={message.id}
      className={
        highlighted ? 'bg-muted ring-ring rounded-md ring-2' : undefined
      }
    >
      {!previous && !isLeave && (
        <div className="mt-2 w-full text-center text-sm">
          {message.inReplyToId
            ? t('conversations.messageInThread.addedBy', { name })
            : t('conversations.messageInThread.startedBy', { name })}
        </div>
      )}

      {isLeave && (
        <article ref={postViewRef} className="flex items-center gap-2">
          <Avatar profile={message.profile} size={2.5} borderless navigate />
          {t('conversations.messageInThread.left', { name })}
        </article>
      )}

      {!isLeave && (
        <>
          {previous && added.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {added.map((p) => (
                  <Avatar
                    key={p.id}
                    profile={p}
                    size={2.5}
                    borderless
                    navigate
                  />
                ))}
              </div>
              {t('conversations.messageInThread.addedBy', { name })}
            </div>
          )}

          {removedOthers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {removedOthers.map((p) => (
                  <Avatar
                    key={p.id}
                    profile={p}
                    size={2.5}
                    borderless
                    navigate
                  />
                ))}
              </div>
              {t('conversations.messageInThread.removedBy', { name })}
            </div>
          )}

          <article ref={postViewRef} className="flex">
            {!isMe && multipleParticipants && (
              <Avatar
                containerClassName="mt-6 mr-2"
                profile={message.profile}
                size={2.5}
                borderless
                navigate
              />
            )}
            <div className="min-w-0 flex-1">
              <ConversationMessageBubble message={message} unread={isUnread} />
            </div>
          </article>

          <div
            className={`mt-2 w-full text-sm ${isMe ? 'text-right' : 'text-left'}`}
          >
            {multipleParticipants && !isMe && <span>{name} &middot; </span>}
            <UpdatingDate date={message.createdAt} />
          </div>
        </>
      )}
    </div>
  );
}

import type { PublicPost, PublicProfile } from '@openpeeps/common/types';
import { profileName } from '@openpeeps/common';
import { useT } from '../../i18n';
import { usePostViewRef } from '../../lib/postViewCounter';
import { UpdatingDate } from '@openpeeps/react-ui';
import { Avatar } from '../profile';
import { useCurrentProfile } from '../layout/IdentityContext';
import { ConversationMessageBubble } from './ConversationMessageBubble';

const inAudience = (post: PublicPost, profile: PublicProfile) =>
  !!post.audience?.some((p) => p.id === profile.id);

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
}

/**
 * Translation of `@openpeeps/svelte` `MessageInThread.svelte`: renders a single
 * thread message together with the participant system messages (started/added/
 * left/removed) derived from how the audience changed between posts.
 */
export function MessageInThread({
  previous,
  message,
  multipleParticipants = true,
}: MessageInThreadProps) {
  const t = useT();
  const me = useCurrentProfile();
  const postViewRef = usePostViewRef(message.id);
  const { added, removed } = audienceDiff(previous, message);
  const name = profileName(message.profile);
  const isMe = message.profile.id === me?.id;

  return (
    <>
      {!previous && (
        <div className="mt-2 w-full text-center text-sm">
          {message.inReplyToId
            ? t('conversations.messageInThread.addedBy', { name })
            : t('conversations.messageInThread.startedBy', { name })}
        </div>
      )}

      {previous &&
        inAudience(previous, message.profile) &&
        !inAudience(message, message.profile) && (
          <div className="flex items-center gap-2">
            <Avatar profile={message.profile} size={2.5} borderless navigate />
            {t('conversations.messageInThread.left', { name })}
          </div>
        )}

      {previous && added.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {added.map((p) => (
              <Avatar key={p.id} profile={p} size={2.5} borderless navigate />
            ))}
          </div>
          {t('conversations.messageInThread.addedBy', { name })}
        </div>
      )}

      {removed.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {removed.map((p) => (
              <Avatar key={p.id} profile={p} size={2.5} borderless navigate />
            ))}
          </div>
          {t('conversations.messageInThread.removedBy', { name })}
        </div>
      )}

      <div ref={postViewRef} className="flex">
        {!isMe && multipleParticipants && (
          <Avatar
            containerClassName="mt-6 mr-2"
            profile={message.profile}
            navigate
          />
        )}
        <ConversationMessageBubble message={message} />
      </div>

      <div
        className={`mt-2 w-full text-sm ${isMe ? 'text-right' : 'text-left'}`}
      >
        {multipleParticipants && !isMe && <span>{name} &middot; </span>}
        <UpdatingDate date={message.createdAt} />
      </div>
    </>
  );
}

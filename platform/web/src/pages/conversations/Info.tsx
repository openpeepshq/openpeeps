import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Avatar, useCurrentProfile } from '@openpeeps/react/components';

export function ConversationInfo() {
  const t = useT();
  const { id = '' } = useParams<{ id: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();

  const conversationQuery = openpeepsApi.useConversation(id);
  const messages = conversationQuery.data ?? [];
  const lastMessage = messages[messages.length - 1];
  const participants =
    lastMessage?.audience?.filter((a) => a.id !== me?.id) ?? [];

  if (conversationQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex w-full items-center justify-between border-b p-5">
        <h1 className="text-lg font-medium">
          {t('conversations.info.title', {
            defaultValue: 'Conversation info',
          })}
        </h1>
      </div>

      <section className="border-b p-5">
        <h2 className="mb-3 text-sm font-semibold">
          {t('conversations.info.participants', {
            defaultValue: 'Participants',
          })}
        </h2>
        <ul className="space-y-2">
          {participants.map((profile) => (
            <li key={profile.id} className="flex items-center gap-3">
              <Avatar profile={profile} size={2.25} />
              <a
                className="hover:underline"
                href={`/@${profile.handle}`}
              >
                <p className="font-medium">
                  {profile.displayName || `@${profile.handle}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{profile.handle}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-b p-5 text-sm text-muted-foreground">
        <p>
          {t('conversations.info.messageCount', {
            defaultValue: `${messages.length} messages in this conversation.`,
            count: messages.length,
          })}
        </p>
      </section>
    </div>
  );
}

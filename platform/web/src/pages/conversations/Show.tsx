import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type {
  PostCreationData,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  useT,
  useOpenpeeps,
  usePostViewRef,
  useSetPageHeader,
} from '@openpeeps/react';
import {
  Avatar,
  FeedPostContent,
  UpdatingDate,
  useCurrentProfile,
} from '@openpeeps/react/components';
import { Button, Input, Toast } from '@openpeeps/react-ui';

const MAX_LENGTH = 500;

function Message({ message, me }: { message: PublicPost; me?: PublicProfile }) {
  const isMe = me?.id === message.profile.id;
  const postViewRef = usePostViewRef(message.id);
  return (
    <div
      ref={postViewRef}
      className={`flex gap-2 p-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <Avatar profile={message.profile} size={2.25} />
      <div
        className={`mt-2 w-[80%] rounded-t-xl p-3 text-sm md:w-[60%] ${
          isMe
            ? 'variant-soft-primary bg-primary/10 rounded-bl-xl'
            : 'bg-surface-200 rounded-br-xl'
        }`}
      >
        <FeedPostContent post={message} />
        <span className="block pt-1 text-[10px] opacity-70">
          <UpdatingDate date={message.createdAt} />
        </span>
      </div>
    </div>
  );
}

export function ConversationShow() {
  const t = useT();
  const { id = '' } = useParams<{ id: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversationQuery = openpeepsApi.useConversation(id);
  const createMessage = openpeepsApi.createConversationPostAction({ id });

  const messages = conversationQuery.data ?? [];
  const lastMessage = messages[messages.length - 1];
  const participants =
    lastMessage?.audience?.filter((a) => a.id !== me?.id) ?? [];

  const title =
    participants.length > 0
      ? participants.map((p) => p.displayName || `@${p.handle}`).join(', ')
      : t('conversations.title', { defaultValue: 'Conversation' });
  useSetPageHeader(title);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!text.trim() || text.length > MAX_LENGTH) return;
    setError(null);
    setSending(true);
    try {
      const payload: PostCreationData = {
        visibility: 'direct',
        audience: lastMessage?.audience ?? participants,
        type: 'note',
        data: { type: 'note', content: text },
      };
      await createMessage(payload);
      setText('');
      await conversationQuery.refetch();
    } catch (err) {
      setError((err as Error).message ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (conversationQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  const overLimit = text.length > MAX_LENGTH;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="flex items-center gap-2 border-b p-3">
        <div className="flex -space-x-2">
          {participants.slice(0, 4).map((p) => (
            <Avatar key={p.id} profile={p} size={2.25} borderless />
          ))}
        </div>
        <div className="text-sm font-medium">
          {participants.map((p) => p.displayName || `@${p.handle}`).join(', ')}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {messages.map((m) => (
          <Message key={m.id} message={m} me={me} />
        ))}
        <div ref={endRef} />
      </div>

      <footer className="space-y-2 border-t p-3">
        {error && (
          <Toast variant="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={t('conversations.placeholder', {
                defaultValue: 'Write a message…',
              })}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button
              title="Send"
              variant="variant-filled-primary"
              action={send}
              disabled={sending || !text.trim() || overLimit}
            >
              {sending
                ? t('common.sending', { defaultValue: 'Sending…' })
                : t('common.send', { defaultValue: 'Send' })}
            </Button>
          </div>
          <span
            className={`pt-1 text-right text-[10px] ${overLimit ? 'text-error' : 'text-muted-foreground'}`}
          >
            {text.length} / {MAX_LENGTH}
          </span>
        </div>
      </footer>
    </div>
  );
}

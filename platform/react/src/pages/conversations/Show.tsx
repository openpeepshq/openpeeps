import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PostCreationData } from '@openpeepshq/common/types';
import {
  useT,
  useOpenpeeps,
  useSetPageHeader,
  usePostViewFlush,
  adjustUnseenCounts,
} from '../../index';
import { canCreatePost } from '@openpeepshq/common';
import {
  Avatar,
  MessageInThread,
  ProfileCard,
  useAuthData,
  useCurrentProfile,
  useToast,
} from '../../components';
import { Button, Input, LoadingSpinner } from '@openpeepshq/react-ui';

const MAX_LENGTH = 500;

export function ConversationShow() {
  const t = useT();
  const { id = '' } = useParams<{ id: string }>();
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const toast = useToast();
  const canCreate = canCreatePost(authData, 'note', 'direct');
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversationQuery = openpeepsApi.useConversation(id);
  const createMessage = openpeepsApi.createConversationPostAction({ id });
  const markPostsSeen = openpeepsApi.markPostsSeenAction();
  const flushPostViews = usePostViewFlush();

  const messages = conversationQuery.data ?? [];
  const lastMessage = messages[messages.length - 1];
  const participants =
    lastMessage?.audience?.filter((a) => a.id !== me?.id) ?? [];

  const multipleParticipants = participants.length > 1;

  const title =
    participants.length > 0
      ? participants.map((p) => p.displayName || `@${p.handle}`).join(', ')
      : t('conversations.title', { defaultValue: 'Conversation' });
  useSetPageHeader(title);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim() || text.length > MAX_LENGTH) return;
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
      await queryClient.invalidateQueries({
        queryKey: client.conversations.list.queryKey({}),
        refetchType: 'all',
      });
    } catch {
      toast.error(
        t('conversations.sendError', {
          defaultValue: 'Failed to send message',
        }),
      );
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!id) return;
    adjustUnseenCounts(queryClient, client, { clearConversation: id });
    void flushPostViews();
    return () => {
      void flushPostViews();
    };
  }, [id, client, queryClient, flushPostViews]);

  useEffect(() => {
    if (!id || !me || conversationQuery.isLoading) return;
    const unseenIds = messages
      .filter((m) => m.seen === false && m.profile.id !== me.id)
      .map((m) => m.id);
    if (unseenIds.length === 0) return;
    void markPostsSeen({ postIds: unseenIds });
  }, [id, me, messages, conversationQuery.isLoading, markPostsSeen]);

  if (conversationQuery.isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const overLimit = text.length > MAX_LENGTH;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="border-b">
        {participants.length === 1 && participants[0] ? (
          <ProfileCard profile={participants[0]} showAction={false} />
        ) : (
          <div className="flex items-center gap-2 p-3">
            <div className="flex -space-x-2">
              {participants.slice(0, 4).map((p) => (
                <Avatar key={p.id} profile={p} size={2.25} borderless />
              ))}
            </div>
            <div className="text-sm font-medium">
              {participants
                .map((p) => p.displayName || `@${p.handle}`)
                .join(', ')}
            </div>
          </div>
        )}
      </header>

      <div
        role="log"
        aria-live="polite"
        aria-label={t('conversations.messageLog', {
          defaultValue: 'Messages',
        })}
        className="flex-1 overflow-y-auto px-3"
      >
        {messages.map((m, index) => (
          <MessageInThread
            key={m.id}
            previous={messages[index - 1]}
            message={m}
            multipleParticipants={multipleParticipants}
            conversationRootId={id}
          />
        ))}
        <div ref={endRef} />
      </div>

      {canCreate && (
        <footer className="space-y-2 border-t p-3">
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
                variant="default"
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
      )}
    </div>
  );
}

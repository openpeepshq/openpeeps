import { useEffect, useRef } from 'react';
import { Loader, SendHorizontal, X } from 'lucide-react';
import { useParticipants } from '@livekit/components-react';
import { useT } from '../../i18n';
import { useJamChat } from '../../hooks/jams/useJamChat';
import { JamChatMessage } from './JamChatMessage';

export interface JamChatDrawerProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export function JamChatDrawer({
  open,
  onClose,
  readOnly = false,
}: JamChatDrawerProps) {
  const t = useT();
  const participants = useParticipants();
  const {
    messages,
    mentionProfiles,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadOlder,
    newMessage,
    setNewMessage,
    isSending,
    send,
  } = useJamChat({ participants, readOnly });
  const endRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [open, messages.length]);

  useEffect(() => {
    const el = topSentinelRef.current;
    if (!el || !open) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadOlder();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadOlder, hasNextPage, isFetchingNextPage, open]);

  const handleSendMessage = async () => {
    if (!(await send())) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => textareaRef.current?.focus(), 25);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className={
        'bg-surface text-foreground absolute right-0 top-0 z-30 flex h-full w-full flex-col gap-3 overflow-hidden rounded md:relative md:z-auto md:w-80'
      }
    >
      <div className="bg-surface relative z-20 flex w-full flex-none items-center justify-between gap-2 border-b pb-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))]">
        <h3 className="text-lg">
          {t('jams.drawer.chatTitle', { defaultValue: 'Chat' })}
        </h3>
        <button
          type="button"
          title={t('jams.drawer.close', { defaultValue: 'Close' })}
          aria-label={t('jams.drawer.close', { defaultValue: 'Close' })}
          className="text-foreground flex size-10 shrink-0 items-center justify-center"
          onClick={onClose}
        >
          <X className="size-5" aria-hidden="true" />
          <span className="sr-only">
            {t('jams.drawer.close', { defaultValue: 'Close' })}
          </span>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="z-10 box-content flex w-full flex-1 flex-col overflow-y-scroll"
      >
        <div className="mb-0 flex-grow space-y-4 px-2 pb-4 md:mb-6">
          <div ref={topSentinelRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader className="size-4 animate-spin" />
            </div>
          )}
          {messages.length === 0 && !isLoading ? (
            <p className="text-muted-foreground mt-4 text-center">
              {t('jams.chat.noMessages', { defaultValue: 'No messages yet' })}
            </p>
          ) : (
            messages.map((message) => (
              <JamChatMessage
                key={message.id}
                message={message}
                mentionProfiles={mentionProfiles}
              />
            ))
          )}
        </div>
        <div ref={endRef} className="pb-4" />
      </div>

      {!readOnly && (
        <div className="bg-background sticky bottom-0 flex w-full items-center gap-x-2 p-2">
          <textarea
            ref={textareaRef}
            disabled={isSending}
            value={newMessage}
            rows={1}
            onChange={(event) => setNewMessage(event.target.value)}
            onKeyDown={(event) => {
              if (
                !(event.shiftKey || event.ctrlKey || event.altKey) &&
                event.key === 'Enter'
              ) {
                event.preventDefault();
                void handleSendMessage();
              }
            }}
            className="bg-background w-full resize-none border-none outline-none"
            placeholder={t('jams.chat.messagePlaceholder', {
              defaultValue: 'Send a message…',
            })}
          />
          <button
            type="button"
            title={t('jams.chat.sendTitle', { defaultValue: 'Send message' })}
            disabled={isSending}
            onClick={() => void handleSendMessage()}
          >
            {isSending ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              <SendHorizontal />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

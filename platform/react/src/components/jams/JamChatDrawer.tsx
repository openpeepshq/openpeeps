import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader, SendHorizontal, X } from 'lucide-react';
import { dateSorter, type JamEvent } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useJamContext } from './JamContext';
import { useJamEventsContext } from './JamEventsContext';
import { JamChatMessage } from './JamChatMessage';

export interface JamChatDrawerProps {
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

function mergeJamEvents(
  persisted: JamEvent[],
  sessionEvents: JamEvent[],
): JamEvent[] {
  const seen = new Set<string>();
  const merged: JamEvent[] = [];
  for (const event of [...persisted, ...sessionEvents]) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    merged.push(event);
  }
  return merged
    .filter((event) => event.type !== 'reaction')
    .sort(dateSorter<JamEvent>());
}

export function JamChatDrawer({
  open,
  onClose,
  readOnly = false,
}: JamChatDrawerProps) {
  const t = useT();
  const { jamPost } = useJamContext();
  const { sessionEvents, sendMessage } = useJamEventsContext();
  const { openpeepsApi } = useOpenpeeps();
  const eventsQuery = openpeepsApi.useInfiniteJamEvents(jamPost.id, 100);

  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const persisted = (eventsQuery.data?.pages ?? []).flat();
    return mergeJamEvents(persisted, sessionEvents);
  }, [eventsQuery.data, sessionEvents]);

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
      const entry = entries[0];
      if (
        entry?.isIntersecting &&
        eventsQuery.hasNextPage &&
        !eventsQuery.isFetchingNextPage
      ) {
        void eventsQuery.fetchNextPage();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [eventsQuery, open]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || readOnly) return;
    setIsSending(true);
    try {
      await sendMessage(newMessage);
      setNewMessage('');
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => textareaRef.current?.focus(), 25);
    } finally {
      setIsSending(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className={
        'bg-surface-100 text-foreground absolute right-0 top-0 flex h-full w-full flex-col gap-3 overflow-hidden rounded md:relative md:w-80'
      }
    >
      <div className="flex w-full flex-none items-center justify-between border-b p-2">
        <h3 className="text-lg">
          {t('jams.drawer.chatTitle', { defaultValue: 'Chat' })}
        </h3>
        <button
          type="button"
          title={t('jams.drawer.close', { defaultValue: 'Close' })}
          className="text-neutral-400"
          onClick={onClose}
        >
          <X />
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="z-10 box-content flex w-full flex-1 flex-col overflow-y-scroll"
      >
        <div className="mb-0 flex-grow space-y-4 px-2 pb-4 md:mb-6">
          <div ref={topSentinelRef} className="h-1" />
          {eventsQuery.isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader className="size-4 animate-spin" />
            </div>
          )}
          {messages.length === 0 && !eventsQuery.isLoading ? (
            <p className="mt-4 text-center text-neutral-400">
              {t('jams.chat.noMessages', { defaultValue: 'No messages yet' })}
            </p>
          ) : (
            messages.map((message) => (
              <JamChatMessage key={message.id} message={message} />
            ))
          )}
        </div>
        <div ref={endRef} className="pb-4" />
      </div>

      {!readOnly && (
        <div className="bg-surface-50 sticky bottom-0 flex w-full items-center gap-x-2 p-2">
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
            className="bg-surface-50 w-full resize-none border-none outline-none"
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

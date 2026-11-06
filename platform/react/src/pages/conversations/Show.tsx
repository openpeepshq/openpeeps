import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { PostCreationData, PublicPost } from '@openpeepshq/common/types';
import { Info, Search } from 'lucide-react';
import {
  useT,
  useOpenpeeps,
  useSetPageHeader,
  usePostViewFlush,
  adjustUnseenCounts,
  useNavigate,
} from '../../index';
import { canCreatePost, markdownPlainText } from '@openpeepshq/common';
import {
  Avatar,
  ConversationParticipantsModal,
  DirectMessageSearch,
  MessageInThread,
  OpenpeepsMarkdownInput,
  ProfileCard,
  useAuthData,
  useCurrentProfile,
  useToast,
} from '../../components';
import { Button, LoadingSpinner } from '@openpeepshq/react-ui';

const MAX_LENGTH = 500;

const isMessageId = (value: string | null): value is string =>
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function ConversationShow() {
  const t = useT();
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const messageParam = searchParams.get('message');
  const focusId = isMessageId(messageParam) ? messageParam : undefined;
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const toast = useToast();
  const endRef = useRef<HTMLDivElement | null>(null);

  const conversationQuery = openpeepsApi.useConversation(id, focusId);
  const createMessage = openpeepsApi.createConversationPostAction({ id });
  const markPostsSeen = openpeepsApi.markPostsSeenAction();
  const flushPostViews = usePostViewFlush();

  // Keep the open thread visible while a search hit refetches an older
  // message. Switching conversations clears it so the previous thread
  // does not linger.
  const [shownMessages, setShownMessages] = useState<PublicPost[]>([]);
  const [shownFor, setShownFor] = useState(id);
  const [searchOpen, setSearchOpen] = useState(false);
  if (shownFor !== id) {
    setShownFor(id);
    setShownMessages([]);
    setSearchOpen(false);
  }
  useEffect(() => {
    if (conversationQuery.data) setShownMessages(conversationQuery.data);
  }, [conversationQuery.data]);

  const messages = shownMessages;
  const lastMessage = messages[messages.length - 1];
  const participants =
    lastMessage?.audience?.filter((a) => a.id !== me?.id) ?? [];

  const hasLeft =
    lastMessage?.profile?.id === me?.id &&
    !lastMessage?.audience?.some((p) => p.id === me?.id);
  const canCreate = canCreatePost(authData, 'note', 'direct') && !hasLeft;
  const multipleParticipants = participants.length > 1;
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const participantNames =
    participants.length > 0
      ? participants.map((p) => p.displayName || `@${p.handle}`).join(', ')
      : t('conversations.title', { defaultValue: 'Conversation' });
  const openParticipantsLabel = t('conversations.participants.openList', {
    defaultValue: 'View participants',
  });

  const headerTitle = useMemo(() => {
    if (!multipleParticipants) return participantNames;
    return (
      <button
        type="button"
        className="min-w-0 truncate text-left text-xl font-semibold"
        onClick={() => setParticipantsOpen(true)}
        title={openParticipantsLabel}
        aria-haspopup="dialog"
        data-testid="conversation-participants-open"
      >
        {participantNames}
      </button>
    );
  }, [multipleParticipants, participantNames, openParticipantsLabel]);

  const navigate = useNavigate();

  const searchLabel = searchOpen
    ? t('common.close', { defaultValue: 'Close' })
    : t('conversations.search.toggle', {
        defaultValue: 'Search this conversation',
      });

  const headerActions = useMemo(
    () => (
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          title={searchLabel}
          aria-label={searchLabel}
          aria-expanded={searchOpen}
          aria-controls={searchOpen ? 'conversation-message-search' : undefined}
          data-testid="conversation-search-toggle"
          className={`rounded-md p-1.5 ${
            searchOpen
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search size={18} />
        </button>
        <button
          type="button"
          onClick={() => navigate({ type: 'conversation', id, view: 'info' })}
          title={t('conversations.info.title', {
            defaultValue: 'Conversation info',
          })}
          className="text-muted-foreground hover:text-foreground rounded-md p-1.5"
        >
          <Info size={18} />
        </button>
      </div>
    ),
    [id, navigate, searchLabel, searchOpen, t],
  );

  useSetPageHeader(headerTitle, headerActions);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim() || markdownPlainText(text).length > MAX_LENGTH) return;
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
    if (focusId) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, focusId]);

  // The ?message= param sticks around after focusing, so scroll only the
  // first time the message renders — re-scrolling on every messages change
  // would fight the user while they read.
  const scrolledToMessageRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId) {
      scrolledToMessageRef.current = null;
      return;
    }
    if (scrolledToMessageRef.current === focusId) return;
    const element = document.querySelector(`[data-message-id="${focusId}"]`);
    if (!element) return;
    scrolledToMessageRef.current = focusId;
    element.scrollIntoView({ block: 'center' });
  }, [focusId, messages]);

  useEffect(() => {
    if (!id) return;
    adjustUnseenCounts(queryClient, client, { clearConversation: id });
    void flushPostViews();
    return () => {
      void flushPostViews();
    };
  }, [id, client, queryClient, flushPostViews]);

  // The URL may point at any root of a merged 1:1 conversation (e.g.
  // notification links); unseen counts are merged under the pair's oldest
  // root, so clear that key once the conversation's first message is known.
  const firstMessageId = messages[0]?.id;
  useEffect(() => {
    if (!id || !firstMessageId || firstMessageId === id) return;
    adjustUnseenCounts(queryClient, client, {
      clearConversation: firstMessageId,
    });
  }, [id, firstMessageId, client, queryClient]);

  useEffect(() => {
    if (!id || !me || conversationQuery.isLoading) return;
    const unseenIds = messages
      .filter((m) => m.seen === false && m.profile.id !== me.id)
      .map((m) => m.id);
    if (unseenIds.length === 0) return;
    void markPostsSeen({ postIds: unseenIds });
  }, [id, me, messages, conversationQuery.isLoading, markPostsSeen]);

  if (conversationQuery.isLoading && messages.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const overLimit = markdownPlainText(text).length > MAX_LENGTH;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="border-b">
        {participants.length === 1 && participants[0] ? (
          <ProfileCard profile={participants[0]} showAction={false} />
        ) : multipleParticipants ? (
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-2 p-3 text-left"
            onClick={() => setParticipantsOpen(true)}
            title={openParticipantsLabel}
            aria-haspopup="dialog"
          >
            <div className="flex shrink-0 -space-x-2">
              {participants.slice(0, 4).map((p) => (
                <Avatar key={p.id} profile={p} size={2.25} borderless />
              ))}
            </div>
            <div className="min-w-0 truncate text-sm font-medium">
              {participantNames}
            </div>
          </button>
        ) : null}
      </header>
      <ConversationParticipantsModal
        open={participantsOpen}
        onOpenChange={setParticipantsOpen}
        participants={participants}
      />
      {searchOpen ? (
        <div id="conversation-message-search">
          <DirectMessageSearch
            conversationId={id}
            autoFocus
            onSelect={(hit) => {
              const next = new URLSearchParams(searchParams);
              next.set('message', hit.message.id);
              setSearchParams(next);
              setSearchOpen(false);
            }}
          />
        </div>
      ) : null}

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
            highlighted={m.id === focusId}
          />
        ))}
        <div ref={endRef} />
      </div>

      {canCreate && (
        <footer className="space-y-2 border-t p-3">
          <OpenpeepsMarkdownInput
            rows={3}
            blockOverflow={false}
            value={text}
            onChange={setText}
            maxLength={MAX_LENGTH}
            placeholder={t('conversations.placeholder', {
              defaultValue: 'Write a message…',
            })}
          />
          <div className="flex justify-end">
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
        </footer>
      )}
    </div>
  );
}

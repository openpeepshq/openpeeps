import { useMemo } from 'react';
import { MessageCircleOff, Calendar, MessageSquarePlus } from 'lucide-react';
import type { PublicPost } from '@openpeeps/common/types';
import { truncateText } from '@openpeeps/common';
import {
  useT,
  useOpenpeeps,
  useSetPlusButtonActions,
  useSetPageHeader,
} from '@openpeeps/react';
import {
  Avatar,
  PostMarkdown,
  UpdatingDate,
  useCurrentProfile,
  useCreateNewConversation,
} from '@openpeeps/react/components';

function ChatPreview({ conversation }: { conversation: PublicPost[] }) {
  const me = useCurrentProfile();
  const lastMessage = conversation[conversation.length - 1];
  if (!lastMessage) return null;
  const participants = lastMessage.audience ?? [];

  return (
    <div className="flex w-full flex-col gap-x-1 border-b p-3 text-left sm:p-4">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {participants.slice(0, 3).map((p) => (
            <Avatar key={p.id} profile={p} size={2.5} borderless />
          ))}
        </div>
        <div className="flex items-center text-sm">
          {participants
            .map((p) => p.displayName || `@${p.handle}`)
            .join(', ')}
        </div>
      </div>
      <span className="text-surface-500 text-xs">
        <UpdatingDate date={lastMessage.createdAt} />
      </span>

      <div className="mt-2 flex flex-row items-start gap-x-2 overflow-hidden text-sm">
        <div className="flex flex-row items-center">
          <span>~</span>
          {me?.id === lastMessage.profile.id ? (
            <span className="ml-1">Me</span>
          ) : (
            <span className="ml-1">
              @{truncateText(lastMessage.profile.handle, 8)}
            </span>
          )}
          <span className="mx-1">:</span>
        </div>
        {lastMessage.data?.type === 'event' ? (
          <>
            <Calendar className="size-4" />
            {(lastMessage.data as { name?: string }).name}
          </>
        ) : (
          <PostMarkdown
            source={(lastMessage.data as { content?: string }).content || ''}
          />
        )}
      </div>
    </div>
  );
}

export function ConversationsIndex() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { openCreateConversation } = useCreateNewConversation();
  const query = openpeepsApi.useConversations();

  const plusButton = useMemo(
    () => ({
      title: t('conversations.newMessage', { defaultValue: 'New message' }),
      icon: MessageSquarePlus,
      action: () => openCreateConversation(),
    }),
    [t, openCreateConversation],
  );
  useSetPlusButtonActions(plusButton);

  useSetPageHeader(
    t('navigation.messages', { defaultValue: 'Messages' }),
    undefined,
    'conversations-page-heading',
  );

  const conversations = query.data ?? [];

  if (query.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-[80vh] items-center justify-center gap-2">
        <MessageCircleOff size={40} />
        <p className="text-gray-500">
          {t('conversations.empty', {
            defaultValue: 'No direct messages here',
          })}
        </p>
      </div>
    );
  }

  return (
    <div>
      {conversations.map((conversation) => {
        const first = conversation[0];
        if (!first) return null;
        return (
          <a
            key={first.id}
            href={`/conversations/${first.id}`}
            className="hover:bg-surface-300 block text-left transition-all"
            title={t('conversations.open', {
              defaultValue: 'Open conversation',
            })}
          >
            <ChatPreview conversation={conversation} />
          </a>
        );
      })}
    </div>
  );
}

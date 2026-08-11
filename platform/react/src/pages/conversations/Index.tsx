import { useMemo } from 'react';
import { MessageCircleOff, Calendar, MessageSquarePlus } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { canCreatePost, truncateText } from '@openpeepshq/common';
import {
  useT,
  useOpenpeeps,
  useSetPlusButtonActions,
  useSetPageHeader,
} from '../../index';
import {
  Avatar,
  PostMarkdown,
  useAuthData,
  useCurrentProfile,
  useCreateNewConversation,
  AccessDeniedLoader,
} from '../../components';
import { UpdatingDate } from '@openpeepshq/react-ui';

function ChatPreview({
  conversation,
  unreadCount = 0,
}: {
  conversation: PublicPost[];
  unreadCount?: number;
}) {
  const t = useT();
  const me = useCurrentProfile();
  const lastMessage = conversation[conversation.length - 1];
  if (!lastMessage) return null;
  const participants = lastMessage.audience ?? [];

  const otherNames = participants
    .filter((p) => p.id !== me?.id)
    .map((p) => p.displayName || `@${p.handle}`)
    .join(', ');
  const title = otherNames
    ? t('conversations.titleWithYou', {
        defaultValue: '{{names}} and You',
        names: otherNames,
      })
    : t('common.you', { defaultValue: 'You' });

  return (
    <div className="flex w-full flex-col gap-x-1 border-b p-3 text-left sm:p-4">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {participants.slice(0, 3).map((p) => (
            <Avatar key={p.id} profile={p} size={2.5} borderless />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-bold">{truncateText(title, 20)}</span>
          {unreadCount > 0 ? (
            <span
              className="bg-destructive text-destructive-foreground flex size-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold"
              aria-label={`${unreadCount} unread messages`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </div>
      </div>
      <span className="text-muted-foreground text-sm">
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
  const authData = useAuthData();
  const query = openpeepsApi.useConversations();
  const unseenCountsQuery = openpeepsApi.useUnseenPostCounts();
  const unseenByConversation = unseenCountsQuery.data?.direct ?? {};

  const canCreate = canCreatePost(authData, 'note', 'direct');
  const plusButton = useMemo(
    () =>
      canCreate
        ? {
            title: t('conversations.newMessage', {
              defaultValue: 'New message',
            }),
            icon: MessageSquarePlus,
            action: () => openCreateConversation(),
          }
        : undefined,
    [canCreate, t, openCreateConversation],
  );
  useSetPlusButtonActions(plusButton);

  useSetPageHeader(
    t('navigation.messages', { defaultValue: 'Messages' }),
    undefined,
    'conversations-page-heading',
  );

  const conversations = query.data ?? [];

  return (
    <AccessDeniedLoader queries={[query]}>
      {conversations.length === 0 ? (
        <div className="flex h-[80vh] items-center justify-center gap-2">
          <MessageCircleOff size={40} />
          <p className="text-gray-500">
            {t('conversations.empty', {
              defaultValue: 'No direct messages here',
            })}
          </p>
        </div>
      ) : (
        <div>
          {conversations.map((conversation) => {
            const first = conversation[0];
            if (!first) return null;
            return (
              <a
                key={first.id}
                href={`/conversations/${first.id}`}
                className="hover:bg-surface block text-left transition-all"
                title={t('conversations.open', {
                  defaultValue: 'Open conversation',
                })}
              >
                <ChatPreview
                  conversation={conversation}
                  unreadCount={unseenByConversation[first.id] ?? 0}
                />
              </a>
            );
          })}
        </div>
      )}
    </AccessDeniedLoader>
  );
}

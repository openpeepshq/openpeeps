import { useMemo } from 'react';
import { MessageCircleOff, Calendar, MessageSquarePlus } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  audienceIncludesHandle,
  canCreatePost,
  DEFAULT_CHATBOT_HANDLE,
  truncateText,
} from '@openpeepshq/common';
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
import { useOnboardingGuide } from '../../onboarding';

function ChatPreview({
  conversation,
  unreadCount = 0,
  isGuide = false,
}: {
  conversation: PublicPost[];
  unreadCount?: number;
  isGuide?: boolean;
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
    <article className="flex w-full flex-col gap-x-1 border-b p-3 text-left sm:p-4">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {participants.slice(0, 3).map((p) => (
            <Avatar key={p.id} profile={p} size={2.5} borderless />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-bold">{truncateText(title, 20)}</span>
          {isGuide ? (
            <span className="bg-primary/15 text-primary shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold">
              {t('onboardingGuide.conversations.badge', {
                defaultValue: 'Guide',
              })}
            </span>
          ) : null}
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
        {isGuide
          ? t('onboardingGuide.conversations.subtitle', {
              defaultValue: 'Your community guide',
            })
          : null}
        {isGuide ? ' · ' : null}
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
    </article>
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
  const guide = useOnboardingGuide();

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

  const conversations = useMemo(() => {
    const list = [...(query.data ?? [])];
    if (!guide.enabled) return list;
    return list.sort((a, b) => {
      const lastA = a[a.length - 1] ?? a[0];
      const lastB = b[b.length - 1] ?? b[0];
      const aGuide = audienceIncludesHandle(
        lastA?.audience,
        DEFAULT_CHATBOT_HANDLE,
      );
      const bGuide = audienceIncludesHandle(
        lastB?.audience,
        DEFAULT_CHATBOT_HANDLE,
      );
      if (aGuide === bGuide) return 0;
      return aGuide ? -1 : 1;
    });
  }, [query.data, guide.enabled]);

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
            const last = conversation[conversation.length - 1] ?? first;
            const isGuide = audienceIncludesHandle(
              last.audience,
              DEFAULT_CHATBOT_HANDLE,
            );
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
                  isGuide={isGuide}
                />
              </a>
            );
          })}
        </div>
      )}
    </AccessDeniedLoader>
  );
}

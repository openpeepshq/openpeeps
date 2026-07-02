import type { openpeepsClient } from '@openpeeps/client';
import type { UnseenPostCounts } from '@openpeeps/common/types';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

export type UnseenCountsAdjustment = {
  groupId?: string;
  conversationRootId?: string;
  clearGroup?: string;
  clearConversation?: string;
};

export const applyUnseenCountsAdjustment = (
  current: UnseenPostCounts | undefined,
  adjustment: UnseenCountsAdjustment,
): UnseenPostCounts => {
  const groups = { ...(current?.groups ?? {}) };
  const direct = { ...(current?.direct ?? {}) };

  if (adjustment.clearGroup) {
    groups[adjustment.clearGroup] = 0;
  } else if (adjustment.groupId) {
    const previous = groups[adjustment.groupId] ?? 0;
    groups[adjustment.groupId] = Math.max(0, previous - 1);
  }

  if (adjustment.clearConversation) {
    delete direct[adjustment.clearConversation];
  } else if (adjustment.conversationRootId) {
    const previous = direct[adjustment.conversationRootId] ?? 0;
    const next = Math.max(0, previous - 1);
    if (next === 0) {
      delete direct[adjustment.conversationRootId];
    } else {
      direct[adjustment.conversationRootId] = next;
    }
  }

  return { groups, direct };
};

export const unseenCountsQueryKey = (
  client: ReturnType<typeof openpeepsClient>,
): QueryKey => client.posts.unseenCounts.queryKey({});

export const isUnseenCountsQueryKey = (queryKey: readonly unknown[]): boolean =>
  queryKey[0] === 'posts' &&
  queryKey[1] === 'unseen' &&
  queryKey[2] === 'counts';

export const adjustUnseenCounts = (
  queryClient: QueryClient,
  client: ReturnType<typeof openpeepsClient>,
  adjustment: UnseenCountsAdjustment,
): void => {
  queryClient.setQueryData<UnseenPostCounts>(
    unseenCountsQueryKey(client),
    (current) => applyUnseenCountsAdjustment(current, adjustment),
  );
};

export const invalidateUnseenCounts = async (
  queryClient: QueryClient,
  client: ReturnType<typeof openpeepsClient>,
): Promise<void> => {
  await queryClient.invalidateQueries({
    queryKey: unseenCountsQueryKey(client),
  });
};

export const invalidatePostsExceptUnseenCounts = async (
  queryClient: QueryClient,
): Promise<void> => {
  await queryClient.invalidateQueries({
    queryKey: ['posts'],
    predicate: (query) => !isUnseenCountsQueryKey(query.queryKey),
  });
};

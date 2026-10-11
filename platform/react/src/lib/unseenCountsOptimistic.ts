import type { openpeepsClient } from '@openpeepshq/client';
import type { UnseenPostCounts } from '@openpeepshq/common/types';
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

export const isUnseenCountsQueryKey = (
  queryKey: readonly unknown[],
): boolean => {
  const parts = queryKey.filter(
    (part): part is string => typeof part === 'string' && part.length > 0,
  );
  const posts = parts.indexOf('posts');
  return (
    posts !== -1 &&
    parts[posts + 1] === 'unseen' &&
    parts[posts + 2] === 'counts'
  );
};

const unseenCountsQueryFilter = {
  predicate: (query: { queryKey: readonly unknown[] }) =>
    isUnseenCountsQueryKey(query.queryKey),
};

export const adjustUnseenCounts = (
  queryClient: QueryClient,
  client: ReturnType<typeof openpeepsClient>,
  adjustment: UnseenCountsAdjustment,
): void => {
  const next = (current: UnseenPostCounts | undefined) =>
    applyUnseenCountsAdjustment(current, adjustment);

  // Menu pills subscribe to whatever key apiHook built; update every match.
  queryClient.setQueriesData<UnseenPostCounts>(unseenCountsQueryFilter, next);
  const key = unseenCountsQueryKey(client);
  if (queryClient.getQueryData(key) === undefined) {
    queryClient.setQueryData<UnseenPostCounts>(key, next(undefined));
  }
};

export const invalidateUnseenCounts = async (
  queryClient: QueryClient,
  _client: ReturnType<typeof openpeepsClient>,
): Promise<void> => {
  await queryClient.invalidateQueries(unseenCountsQueryFilter);
};

export const markGroupPostsRead = async (
  queryClient: QueryClient,
  client: ReturnType<typeof openpeepsClient>,
  groupId: string,
  markGroupPostsSeen: (params: { groupId: string }) => Promise<unknown>,
): Promise<void> => {
  await queryClient.cancelQueries(unseenCountsQueryFilter);
  adjustUnseenCounts(queryClient, client, { clearGroup: groupId });
  try {
    await markGroupPostsSeen({ groupId });
    // Re-apply in case a late refetch won the race during the request.
    adjustUnseenCounts(queryClient, client, { clearGroup: groupId });
  } catch (error) {
    await invalidateUnseenCounts(queryClient, client);
    throw error;
  }
};

export const invalidatePostsExceptUnseenCounts = async (
  queryClient: QueryClient,
): Promise<void> => {
  await queryClient.invalidateQueries({
    queryKey: ['posts'],
    predicate: (query) => !isUnseenCountsQueryKey(query.queryKey),
  });
};

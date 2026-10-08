import { useMemo } from 'react';
import { buildThreads } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';

/** Ancestor thread and reply threads around a post, for the detail view. */
export const usePostThreads = (postId: string) => {
  const { openpeepsApi } = useOpenpeeps();
  const contextQuery = openpeepsApi.usePostContext(postId);

  const ancestryThread = useMemo(
    () =>
      contextQuery.data
        ? buildThreads(contextQuery.data.ancestors)[0]
        : undefined,
    [contextQuery.data],
  );
  const descendentThreads = useMemo(
    () =>
      (contextQuery.data && buildThreads(contextQuery.data.descendants)) || [],
    [contextQuery.data],
  );

  return {
    ancestryThread,
    descendentThreads,
    isLoading: contextQuery.isLoading,
  };
};

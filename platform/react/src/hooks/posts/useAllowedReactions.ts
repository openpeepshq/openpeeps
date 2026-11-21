import { useMemo } from 'react';
import { resolveAllowedReactions } from '@openpeepshq/common/types';
import { useServerInfo } from '../../components/server-data';

/**
 * The reactions a member can attach to posts in this community.
 *
 * Both web and native render pickers from this single hook, fed by
 * `serverInfo.communityConfig.content.allowedReactions`, so the two platforms
 * can never drift apart. Absent/empty config falls back to the curated
 * default set.
 */
export const useAllowedReactions = (): readonly string[] => {
  const serverInfo = useServerInfo();
  return useMemo(
    () => resolveAllowedReactions(serverInfo?.communityConfig),
    [serverInfo?.communityConfig],
  );
};

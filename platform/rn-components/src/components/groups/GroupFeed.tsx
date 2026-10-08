import React from 'react';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import { Feed } from '~/components/post/Feed';

export interface GroupFeedProps {
  group: GroupWithMeta;
}

export const GroupFeed = ({ group }: GroupFeedProps) => {
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.usePostsByGroup(
    group.id,
    useFeedListParams({ limit: 15 })
  );

  return (
    <Feed
      query={query}
      inGroup
      pinnedPostId={group.pinnedPostId}
      isPostFeed={false}
    />
  );
};

import type { GroupWithMeta } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNewNotePlusButton } from '../post/NewNoteButton';
import { Feed } from '../post/Feed';

export interface GroupFeedProps {
  group: GroupWithMeta;
}

/**
 * Posts list scoped to a single group. Translation of
 * `core/groups/GroupFeed.svelte`.
 */
export function GroupFeed({ group }: GroupFeedProps) {
  const { openpeepsApi } = useOpenpeeps();

  useNewNotePlusButton({ visibility: 'group', group });

  const query = openpeepsApi.usePostsByGroup(group.id);

  return <Feed query={query} inGroup pinnedPostId={group.pinnedPostId} />;
}

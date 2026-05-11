import type { GroupWithMeta } from '@openpeeps/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { Feed } from '../post/Feed';
import { NewNoteButton } from '../post/NewNoteButton';
import { useDefaultVisibility } from '../post/visibility';
import { useCurrentProfile } from '../layout/IdentityContext';

export interface GroupFeedProps {
  group: GroupWithMeta;
}

/**
 * Posts list scoped to a single group + a compose box. Translation of
 * `core/groups/GroupFeed.svelte`.
 */
export function GroupFeed({ group }: GroupFeedProps) {
  const { openpeepsApi } = useOpenpeeps();
  const currentProfile = useCurrentProfile();
  const visibility = useDefaultVisibility();

  const query = openpeepsApi.usePostsByGroup(group.id, { limit: 15 });

  return (
    <div>
      <NewNoteButton
        currentProfile={currentProfile}
        group={group}
        visibility={visibility}
      />
      <Feed query={query} inGroup />
    </div>
  );
}

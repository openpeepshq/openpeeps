<script lang="ts">
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { Feed } from '$lib/components/core/post';
  import { infiniteGroupFeedStore } from '$lib/api';
  import { getCurrentProfile } from '$lib/auth';
  import { NewNoteButton } from '$lib/components/navigation';

  const currentProfile = getCurrentProfile();

  interface Props {
    group: GroupWithMeta;
  }

  let { group }: Props = $props();

  let query = infiniteGroupFeedStore(group.id, { limit: 15 });
</script>

<NewNoteButton visibility="group" {currentProfile} {group} />
<Feed {query} inGroup pinnedPostId={group.pinnedPostId} />

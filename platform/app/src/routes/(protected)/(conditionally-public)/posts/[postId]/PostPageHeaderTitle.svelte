<script lang="ts">
  import type { GroupWithMeta, PostType } from '@openpeeps/common/types';
  import { groupName } from '@openpeeps/common/lib';
  import { Button } from '@openpeeps/ui';

  interface Props {
    postType?: PostType;
    group?: GroupWithMeta;
  }

  let { postType, group }: Props = $props();
</script>

<h5 class="h5">
  {postType === 'event' ? 'Event' : 'Post'}
  {#if group}
    {' in '}
    <Button
      action={`/groups/@${group.handle}`}
      class="inline p-0 hover:underline"
    >
      {groupName(group)}
    </Button>
  {/if}
</h5>

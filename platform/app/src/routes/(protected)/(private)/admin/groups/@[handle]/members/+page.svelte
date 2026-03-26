<script lang="ts">
  import { page } from '$app/state';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { groupByHandleStore } from '@openpeeps/svelte/api';
  import { groupName } from '@openpeeps/common/lib';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { GroupMembersList } from '@openpeeps/svelte/components';
  let handle = page.params.handle;

  let groupQuery = groupByHandleStore(handle);
  const pageHeaderStore = getPageHeaderStore();

  let group: GroupWithMeta | undefined = $derived($groupQuery.data);
  $effect(() => {
    pageHeaderStore.set({
      title: `${groupName(group)} - Members`,
    });
  });
</script>

{#if group}
  <GroupMembersList {group} />
{/if}

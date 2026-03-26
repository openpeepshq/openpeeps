<script lang="ts">
  import { page } from '$app/stores';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { groupByHandleStore } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader, GroupEditPage } from '@openpeeps/svelte/components';

  let handle = $page.params.handle;
  let groupQuery = groupByHandleStore(handle);
  let group: GroupWithMeta | undefined = $derived($groupQuery.data);
</script>

<AccessDeniedLoader queries={[$groupQuery]}>
  {#if group}
    <GroupEditPage {group} />
  {/if}
</AccessDeniedLoader>

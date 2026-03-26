<script lang="ts">
  import { page } from '$app/state';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { AccessDeniedLoader, OpenpeepsMarkdown } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { groupByHandleStore } from '@openpeeps/svelte/api';
  import { groupName } from '@openpeeps/common/lib';

  let handle = page.params.handle;

  let groupQuery = groupByHandleStore(handle);
  const pageHeaderStore = getPageHeaderStore();

  let group: GroupWithMeta | undefined = $derived($groupQuery.data);
  $effect(() => {
    pageHeaderStore.set({ title: `${groupName(group)} - About` });
  });
</script>

<AccessDeniedLoader queries={[$groupQuery]}>
  {#if group}
    <div class="p-4 space-y-2">
      <div class="border-b py-2">
        <h3 class="text-lg font-semibold">Description</h3>
        <OpenpeepsMarkdown
          source={group?.description || 'No description yet'}
          linkPreviewMode="none"
        />
      </div>
      <div class="border-b py-2 space-y-2">
        <h3 class="text-lg font-semibold">Details</h3>
        {#if group?.discoverable}
          <h3>Public</h3>
          <p>
            Anyone on this community can see posts in the group. Group members
            can add comments and create posts
          </p>
          <h3 class="font-semibold">Created</h3>
          <p>
            {new Date(group?.createdAt).toLocaleDateString()}
          </p>
        {:else}
          <h3>Private</h3>
          <p>
            Only group members can see posts in the group. Group members can add
            comments and create posts
          </p>
          <h3 class="font-semibold">Created</h3>
          <p>
            {new Date(group?.createdAt).toLocaleDateString()}
          </p>
        {/if}
      </div>
      <div class="border-b py-2">
        <h3 class="text-lg font-semibold">Rules</h3>
        <OpenpeepsMarkdown
          source={group?.rules || 'No rules yet'}
          linkPreviewMode="none"
        />
      </div>
    </div>
  {/if}
</AccessDeniedLoader>

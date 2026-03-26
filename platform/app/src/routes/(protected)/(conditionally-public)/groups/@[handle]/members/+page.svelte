<script lang="ts">
  import { page } from '$app/state';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { groupByHandleStore, me } from '@openpeeps/svelte/api';
  import { checkGroupCapabilities, groupName } from '@openpeeps/common/lib';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import {
    GroupMembersList,
    AddMembersButton,
  } from '@openpeeps/svelte/components';
  import { presetProps } from '@openpeeps/svelte/utils';
  let handle = page.params.handle;

  let groupQuery = groupByHandleStore(handle);
  const pageHeaderStore = getPageHeaderStore();

  let group: GroupWithMeta | undefined = $derived($groupQuery.data);
  $effect(() => {
    pageHeaderStore.set({
      title: `${groupName(group)} - Members`,
      actions:
        group &&
        checkGroupCapabilities(['core-groups-addMember'], $me, group).success
          ? presetProps(AddMembersButton, { group })
          : undefined,
    });
  });
</script>

{#if group}
  <GroupMembersList {group} />
{/if}

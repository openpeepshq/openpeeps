<script lang="ts">
  import { page } from '$app/state';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { groupByHandleStore } from '@openpeeps/svelte/api';
  import { getCurrentAuthData } from '@openpeeps/svelte/auth';
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
  const authData = getCurrentAuthData();
  $effect(() => {
    pageHeaderStore.set({
      title: `${groupName(group)} - Members`,
      actions:
        group &&
        checkGroupCapabilities(authData, ['core-groups-addMember'], group)
          .success
          ? presetProps(AddMembersButton, { group })
          : undefined,
    });
  });
</script>

{#if group}
  <GroupMembersList {group} />
{/if}

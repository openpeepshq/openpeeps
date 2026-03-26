<script lang="ts">
  import { matchesQuery } from '@openpeeps/common/lib';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { adminGroupsStore } from '@openpeeps/svelte/api';
  import {
    AccessDeniedLoader,
    AdminGroupCard,
    NewGroupButton,
  } from '@openpeeps/svelte/components';
  import { SearchAndFilterBar } from '@openpeeps/ui';
  import { Users } from 'lucide-svelte';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components';

  const { t } = i18nContext();

  setPageHeader({ title: t('navigation.groups') });
  const groupsQuery = adminGroupsStore();
  let search = $state('');

  let groups = $state<GroupWithMeta[] | []>([]);

  $effect(() => {
    groups =
      $groupsQuery.data?.filter(
        (group: GroupWithMeta) => !search || matchesQuery(group, search),
      ) || [];
  });
</script>

<NewGroupButton />
<div class="relative">
  <SearchAndFilterBar
    className="sticky top-4 "
    bind:search
    placeholder="Search by group name"
  />
  <AccessDeniedLoader queries={[$groupsQuery]}>
    <div class="space-y-2 py-4">
      {#each groups || [] as group (group.id)}
        <AdminGroupCard {group} deleteCallback={() => $groupsQuery.refetch()} />
      {/each}
    </div>
    {#if !groups?.length}
      <div
        class="flex h-[60vh] w-full flex-col items-center justify-center gap-y-6"
      >
        <Users size={60} />
        {#if search === ''}
          <p>You have no groups yet</p>
        {/if}
        {#if search !== ''}
          <p>No groups found</p>
        {/if}
      </div>
    {/if}
  </AccessDeniedLoader>
</div>

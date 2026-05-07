<script lang="ts">
  import { matchesQuery } from '@openpeeps/common/lib';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { groupsStore } from '@openpeeps/svelte/api';
  import {
    AccessDeniedLoader,
    GroupCard,
    NewGroupButton,
  } from '@openpeeps/svelte/components';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  import {
    preventDefault,
    SearchAndFilterBar,
    stopPropagation,
  } from '@openpeeps/ui';
  import { Users } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { i18nContext } from '@openpeeps/svelte/components';

  const { t } = i18nContext();

  setPageHeader({
    title: t('navigation.groups'),
  });

  const groupsQuery = groupsStore();
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
    placeholder={t('groups.searchPlaceholder')}
  />
  <AccessDeniedLoader queries={[$groupsQuery]}>
    <div class="space-y-2 py-4">
      {#each groups || [] as group (group.id)}
        <button
          title={t('groups.openGroup')}
          class="w-full"
          onclick={stopPropagation(
            preventDefault(() => goto(`/groups/@${group.handle}`)),
          )}
        >
          <GroupCard {group} />
        </button>
      {/each}
    </div>
    {#if !groups?.length}
      <div
        class="flex h-[60vh] w-full flex-col items-center justify-center gap-y-6"
      >
        <Users size={60} />
        {#if search === ''}
          <p>{t('groups.noGroupsYet')}</p>
        {/if}
        {#if search !== ''}
          <p>{t('groups.noGroupsFound')}</p>
        {/if}
      </div>
    {/if}
  </AccessDeniedLoader>
</div>

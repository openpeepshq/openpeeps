<script lang="ts">
  import {
    ProfileCard,
    ProfileTablePopup,
    MembersHeaderActions,
    AccessDeniedLoader,
  } from '@openpeeps/svelte/components';
import { SearchAndFilterBar, Badges, Table } from '@openpeeps/ui';
  // import SortModal from '@openpeeps/svelte/components';
  // import FilterModal from '@openpeeps/svelte/components';
  // import { type ModalSettings } from '@skeletonlabs/skeleton';
  import { type ColumnDefinition } from '@openpeeps/ui';
  import type { ProfileWithMeta } from '@openpeeps/common/types';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { adminProfilesStore } from '@openpeeps/svelte/api';
  import { matchesQuery } from '@openpeeps/common/lib';

  getPageHeaderStore().set({ title: 'Members', actions: MembersHeaderActions });
  let search: string = $state('');

  const profilesQuery = adminProfilesStore();

  let allProfiles: ProfileWithMeta[] | undefined = $derived(
    $profilesQuery.data,
  );

  const columnDefinitions: ColumnDefinition<ProfileWithMeta>[] = [
    {
      id: 'profile',
      header: 'Profile',
      type: 'component',
      render: (profile) => ({
        component: ProfileCard,
        props: {
          profile,
          showAction: false,
        },
      }),
    },
    {
      id: 'roles',
      header: 'Roles',
      type: 'component',
      render: (profile) => ({
        component: Badges,
        props: {
          data: profile.roles?.map((r) => ({
            status: r.displayName,
          })),
        },
      }),
    },

    {
      id: 'action',
      header: ' ',
      type: 'component',
      render: (profile) => ({
        component: ProfileTablePopup,
        props: {
          profile,
        },
      }),
    },
  ];
</script>

<AccessDeniedLoader queries={[$profilesQuery]}>
  {#if $profilesQuery.data?.length}
    <div class="pt-4">
      <SearchAndFilterBar
        placeholder="Search member by name or email"
        bind:search
      />
      <Table
        data={allProfiles}
        {columnDefinitions}
        filter={(row: ProfileWithMeta) => !search || matchesQuery(row, search)}
      />
    </div>
  {:else}
    <div class="w-full flex justify-center items-center p-4">
      <h2 class="text-lg">No users found</h2>
    </div>
  {/if}
</AccessDeniedLoader>

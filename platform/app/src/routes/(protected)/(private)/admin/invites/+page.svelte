<script lang="ts">
  import {
    getModalStore,
    type ModalComponent,
    type ModalSettings,
  } from '@skeletonlabs/skeleton';
  import { page } from '$app/state';
  import {
    SearchAndFilterBar,
    Badge,
    Table,
    UpdatingDate,
  } from '@openpeeps/ui';
  import {
    SortModal,
    FilterModal,
    InvitesTablePopup,
    InviteLinksHeaderActions,
    AccessDeniedLoader,
  } from '@openpeeps/svelte/components';
  import { type ColumnDefinition } from '@openpeeps/ui';
  import { getInvitesListStore } from '@openpeeps/svelte/api';
  import type { InviteLinkWithMeta } from '@openpeeps/common/types';
  //import { matchesQuery } from '@openpeeps/common/lib';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { inviteLinkMatchesQuery } from '@openpeeps/common/lib';

  const inviteListQuery = getInvitesListStore();

  const modalStore = getModalStore();

  const pageHeaderStore = getPageHeaderStore();

  const sortComponent: ModalComponent = { ref: SortModal };
  const filterComponent: ModalComponent = { ref: FilterModal };

  let tabSet: number = $state(0);
  let search = $state('');

  export const sortModal: ModalSettings = {
    type: 'component',
    component: sortComponent,
  };

  export const filterModal: ModalSettings = {
    type: 'component',
    component: filterComponent,
  };

  const inviteListColumns: ColumnDefinition<InviteLinkWithMeta>[] = [
    {
      type: 'property',
      header: 'Link',
      id: 'slug',
    },
    {
      id: 'creator',
      type: 'text',
      header: 'Created By',
      render: (inviteLink) => '@' + inviteLink.profile.handle,
    },
    {
      id: 'dateCreated',
      header: 'Expiration Date',
      type: 'component',
      render: (inviteLink) => ({
        component: UpdatingDate,
        props: { date: inviteLink.expiresAt },
      }),
    },
    {
      id: 'uses',
      header: 'Uses',
      type: 'text',
      render: (invite) => `${invite.redemptions.length}/${invite.maxUses}`,
    },
    {
      id: 'status',
      header: 'Status',
      type: 'component',
      render: (invite) => {
        const active = invite.active && new Date(invite.expiresAt) > new Date();
        return {
          component: Badge,
          props: {
            status: active ? 'active' : 'inactive',
            variant: active ? 'variant-filled-success' : 'variant-filled-error',
          },
        };
      },
    },
    {
      id: 'action',
      type: 'component',
      header: ' ',
      render: (inviteLink) => ({
        component: InvitesTablePopup,
        props: {
          inviteLink,
        },
      }),
    },
  ];

  // const emailInviteColumns: ColumnDef<InviteEmailRow>[] = [
  //   {
  //     accessorKey: 'profile',
  //     header: 'Profile',
  //     cell: ({ cell }) =>
  //       flexRender(ProfileCard, {
  //         profile: cell.getValue(),
  //         showAction: false,
  //       }),
  //   },
  //   {
  //     accessorKey: 'invitedEmail',
  //     header: 'Invited Email',
  //   },
  //   {
  //     accessorKey: 'dateSent',
  //     header: 'Date Sent',
  //     cell: ({ cell }) =>
  //       new Date(cell.getValue() as string).toLocaleDateString(),
  //   },
  //   {
  //     accessorKey: 'dateAccepted',
  //     header: 'Date Accepted',
  //     cell: ({ cell }) =>
  //       new Date(cell.getValue() as string).toLocaleDateString(),
  //   },
  //   {
  //     accessorKey: 'status',
  //     header: 'Status',
  //     cell: ({ cell }) =>
  //       flexRender(Badge, {
  //         variant: cell.getValue() === 'accepted' ? 'variant-filled-success' : 'variant-filled-error',
  //         status: cell.getValue(),
  //       }),
  //   },
  //   {
  //     accessorKey: 'profileCreated',
  //     header: 'Profiles Created',
  //     cell: ({ cell }) =>
  //       cell.getValue() === null
  //         ? '-'
  //         : flexRender(ProfileCard, {
  //             profile: cell.getValue(),
  //             showAction: false,
  //           }),
  //   },
  // ];

  $effect(() => {
    if (page.url.hash.includes('link')) {
      tabSet = 1;
      pageHeaderStore.set({
        title: 'Invites',
        actions: InviteLinksHeaderActions,
      });
    } else {
      tabSet = 0;
      pageHeaderStore.set({ title: 'Invites' });
    }
  });
</script>

<!-- <div class="relative">
  <TabGroup class="relative">
    <div class="z-10 w-full border-b pt-5 px-5 sticky top-0">
      <div class="sticky top-2 flex justify-between w-full">
        <div class="flex gap-4">
          <Tab
            bind:group={tabSet}
            name="tab1"
            value={0}
            on:click={async () =>
              await goto('#email', {
                replaceState: true,
              })}
            class="flex items-center">Email</Tab
          >
          <Tab
            bind:group={tabSet}
            name="tab3"
            value={0}
            on:click={async () =>
              await goto('#link', {
                replaceState: true,
              })}
            class="flex items-center">Link</Tab
          >
        </div>
      </div>
    </div>

    <svelte:fragment slot="panel">
      {#if tabSet === 0}
        <Loader queries={[$inviteListQuery]}>
          <div slot="error">
            <div class="w-full flex justify-center items-center p-4">
              <h2 class="text-lg text-error-500">
                Error: {$inviteListQuery?.error?.message}
              </h2>
            </div>
          </div>
          {#if $inviteListQuery?.data?.length === 0}
            <div class="w-full flex justify-center items-center p-4">
              <h2 class="text-lg">No invites found</h2>
            </div>
          {:else}
            <div>
              <SearchAndFilterBar
                bind:search={search}
                placeholder="Search by name or email"
                handleOnSortButtonClicked={() => modalStore.trigger(sortModal)}
                handleOnFilterButtonClicked={() =>
                  modalStore.trigger(filterModal)}
              />

              <Table
                data={emailInviteListData}
                columnDefinitions={emailInviteColumns}
              />
            </div>
          {/if}
        </Loader>
      {:else if tabSet === 1}
        <Loader queries={[$inviteListQuery]}>
          <div slot="error">
            <div class="w-full flex justify-center items-center p-4">
              <h2 class="text-lg text-error-500">
                Error: {$inviteListQuery?.error?.message}
              </h2>
            </div>
          </div>
          {#if $inviteListQuery?.data?.length === 0}
            <div class="w-full flex justify-center items-center p-4">
              <h2 class="text-lg">No invites found</h2>
            </div>
          {:else}
            <div>
              <SearchAndFilterBar
                bind:search={search}
                placeholder="Search by name or email"
                handleOnSortButtonClicked={() => modalStore.trigger(sortModal)}
                handleOnFilterButtonClicked={() =>
                  modalStore.trigger(filterModal)}
              />

              <Table
                data={inviteListData}
                columnDefinitions={inviteListColumns}
              />
            </div>
          {/if}
        </Loader>
      {/if}
    </svelte:fragment>
  </TabGroup>
</div> -->

<div class="relative">
  <div
    class="z-10 w-full border-b flex justify-between items-center px-5 py-2 sticky top-14"
  >
    <h4>Link</h4>
    <InviteLinksHeaderActions />
  </div>
  <div class="relative">
    <AccessDeniedLoader queries={[$inviteListQuery]}>
      {#snippet error()}
        <div>
          <div class="w-full flex justify-center items-center p-4">
            <h2 class="text-lg text-error-500">
              Error: {$inviteListQuery?.error?.message}
            </h2>
          </div>
        </div>
      {/snippet}
      {#if $inviteListQuery?.data?.length === 0}
        <div class="w-full flex justify-center items-center p-4">
          <h2 class="text-lg">No invites found</h2>
        </div>
      {:else}
        <div class="relative">
          <SearchAndFilterBar
            className="sticky top-28"
            bind:search
            placeholder="Search by name or email"
            handleOnSortButtonClicked={() => modalStore.trigger(sortModal)}
            handleOnFilterButtonClicked={() => modalStore.trigger(filterModal)}
          />

          <Table
            data={$inviteListQuery.data}
            columnDefinitions={inviteListColumns}
            filter={(row) => !search || inviteLinkMatchesQuery(row, search)}
          />
        </div>
      {/if}
    </AccessDeniedLoader>
  </div>
</div>

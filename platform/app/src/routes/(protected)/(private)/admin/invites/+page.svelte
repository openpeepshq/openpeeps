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
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { inviteLinkMatchesQuery } from '@openpeeps/common/lib';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();

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
      header: t('admin.invites.linkColumn'),
      id: 'slug',
    },
    {
      id: 'creator',
      type: 'text',
      header: t('admin.invites.createdByColumn'),
      render: (inviteLink) => '@' + inviteLink.profile.handle,
    },
    {
      id: 'dateCreated',
      header: t('admin.invites.expirationDateColumn'),
      type: 'component',
      render: (inviteLink) => ({
        component: UpdatingDate,
        props: { date: inviteLink.expiresAt },
      }),
    },
    {
      id: 'uses',
      header: t('admin.invites.usesColumn'),
      type: 'text',
      render: (invite) => `${invite.redemptions.length}/${invite.maxUses}`,
    },
    {
      id: 'status',
      header: t('admin.invites.statusColumn'),
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

  $effect(() => {
    if (page.url.hash.includes('link')) {
      tabSet = 1;
      pageHeaderStore.set({
        title: t('admin.invites.title'),
        actions: InviteLinksHeaderActions,
      });
    } else {
      tabSet = 0;
      pageHeaderStore.set({ title: t('admin.invites.title') });
    }
  });
</script>

<div class="relative">
  <div
    class="z-10 w-full border-b flex justify-between items-center px-5 py-2 sticky top-14"
  >
    <h4>{t('admin.invites.linkHeading')}</h4>
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
          <h2 class="text-lg">{t('admin.invites.noInvitesFound')}</h2>
        </div>
      {:else}
        <div class="relative">
          <SearchAndFilterBar
            className="sticky top-28"
            bind:search
            placeholder={t('admin.invites.searchPlaceholder')}
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

<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { User2Icon } from 'lucide-svelte';
  import { page } from '$app/stores';

  import {
    SlideToggle,
    getModalStore,
    type ModalComponent,
    type ModalSettings,
  } from '@skeletonlabs/skeleton';
  import {
    BlockAccountConfirmation,
    LeaveConversationConfirmation,
    ReportAccountConfirmation,
  } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';

  let isSnoozedChecked = $state(false);
  let isMentionedChecked = $state(false);

  getPageHeaderStore().set({ title: 'Messages' });
  const modalStore = getModalStore();

  const leaveConversationComponent: ModalComponent = {
    ref: LeaveConversationConfirmation,
  };
  export const leaveConversationModal: ModalSettings = {
    type: 'component',
    component: leaveConversationComponent,
  };

  const blockAccountComponent: ModalComponent = {
    ref: BlockAccountConfirmation,
  };
  export const blockAccountModal: ModalSettings = $state({
    type: 'component',
    component: blockAccountComponent,
  });

  const reportAccountComponent: ModalComponent = {
    ref: ReportAccountConfirmation,
  };

  export const reportAccountModal: ModalSettings = $state({
    type: 'component',
    component: reportAccountComponent,
  });
</script>

<div class="relative">
  <div class="z-10 w-full border-b flex justify-between items-center p-5">
    <div class="flex items-center gap-2">
      <h1 class="font-medium text-lg">
        {$page.url.search.includes('group') ? 'Group' : 'Conversation'}{' '}
        info
      </h1>
    </div>
  </div>
  <div class=" w-full border-b flex flex-col space-y-5 p-5">
    {#if !$page.url.search.includes('group')}
      <div class="flex justify-between items-center">
        <div class="flex gap-x-2">
          <img
            src="https://via.placeholder.com/50"
            alt="profile"
            class="rounded-full w-[50px] h-[50px]"
          />
          <div>
            <h4 class="font-semibold">Alex Oja</h4>
            <h5>@alexo</h5>
            <span class="flex gap-x-1 items-center">
              <User2Icon size={12} />
              <span>Follows you</span>
            </span>
          </div>
        </div>
        <Button title="Unfollow">Unfollow</Button>
      </div>
    {/if}
  </div>
  <div class="w-full border-b p-5">
    <h4 class="font-semibold">Notifications</h4>

    <div class="mt-5 flex justify-between items-center">
      <p>Snooze notifications from Alex Oja</p>
      <SlideToggle
        name="slide"
        bind:checked={isSnoozedChecked}
        background="bg-gray-300"
        active="bg-primary-500"
      />
    </div>
    {#if $page.url.search.includes('group')}
      <div class="mt-5 flex justify-between items-center">
        <p>Snooze mentions</p>
        <SlideToggle
          name="slide"
          bind:checked={isMentionedChecked}
          background="bg-gray-300"
          active="bg-primary-500"
        />
      </div>
    {/if}
  </div>

  <div class="flex flex-col space-y-6 justify-center mt-4 items-center">
    <Button
      title="Block"
      action={() => {
        blockAccountModal.meta = {
          handle: '@alexo',
        };
        modalStore.trigger(blockAccountModal);
      }}>Block @alexo</Button
    >
    <Button
      title="Report"
      action={() => {
        reportAccountModal.meta = {
          handle: '@alexo',
        };
        modalStore.trigger(reportAccountModal);
      }}>Report @alexo</Button
    >
    <Button
      title="Leave Conversation"
      variant="variant-filled-error"
      action={() => modalStore.trigger(leaveConversationModal)}
      >Leave Conversation</Button
    >
  </div>
</div>

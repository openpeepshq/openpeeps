<script lang="ts">
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';
  import { InfiniteScrollContainer, Loader } from '@openpeeps/ui';
  import {
    infiniteCurrentProfileNotificationsStore,
    markAllNotificationsAsSeenMutation,
  } from '@openpeeps/svelte/api';
  import {
    Notification,
    NotificationHeaderActions,
  } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';

  const markAllNotificationsAsSeen = markAllNotificationsAsSeenMutation();

  getPageHeaderStore().set({
    title: 'Notifications',
    actions: NotificationHeaderActions,
  });

  let tabSet: number = $state(0);
  const query = infiniteCurrentProfileNotificationsStore({
    limit: '15',
  });

  onMount(async () => {
    await markAllNotificationsAsSeen();
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge();
    }
  });
</script>

<div class="relative overflow-hidden">
  <TabGroup>
    <div class="sticky top-28 w-full flex z-10">
      <Tab bind:group={tabSet} name="tab1" value={0}>
        <span>All</span>
      </Tab>
      <!-- <Tab bind:group={tabSet} name="tab3" value={1}>Mentions</Tab> -->
    </div>

    {#snippet panel()}
      {#if tabSet === 0}
        <InfiniteScrollContainer
          {query}
          uniqueBy={(notification) => notification.id}
        >
          {#snippet children({ list })}
            {#each list as notification (notification.id)}
              <Notification {notification} />
            {/each}
          {/snippet}
          {#snippet empty()}
            <p class="px-5">No notifications</p>
          {/snippet}
        </InfiniteScrollContainer>
      {:else if tabSet === 1}
        <InfiniteScrollContainer
          {query}
          uniqueBy={(notification) => notification.id}
        >
          {#snippet children({ list })}
            {#each list as notification (notification.id)}
              <Notification {notification} />
            {/each}
          {/snippet}
          {#snippet empty()}
            <p class="px-5">No mentions</p>
          {/snippet}
        </InfiniteScrollContainer>
      {/if}
    {/snippet}
  </TabGroup>
</div>

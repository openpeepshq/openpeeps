<script lang="ts">
  import {
  AccessDeniedLoader,
    MembersHeaderActions,
    ResolvedTab,
    SummaryTab,
  } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { adminReportsStore } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';

  getPageHeaderStore().set({
    title: 'Moderation',
    actions: MembersHeaderActions,
  });
  let tabSet: number = $state(0);

  const reportsQuery = adminReportsStore();

  $effect(() => {
    if (page.url.hash.includes('summary')) {
      tabSet = 0;
    } else if (page.url.hash.includes('resolved')) {
      tabSet = 1;
    } else {
      tabSet = 0;
    }
  });
</script>

<AccessDeniedLoader queries={[$reportsQuery]}>
  <TabGroup>
    <Tab
      bind:group={tabSet}
      name="tab1"
      on:click={async () =>
        await goto('#summary', {
          replaceState: true,
        })}
      value={0}
    >
      <span class="text-sm">Summary</span>
    </Tab>
    <Tab
      bind:group={tabSet}
      name="tab2"
      on:click={async () =>
        await goto('#resolved', {
          replaceState: true,
        })}
      value={1}
    >
      <span class="text-sm">Resolved</span>
    </Tab>
    <!-- Tab Panels --->
    {#snippet panel()}
      {#if tabSet === 0}
        <SummaryTab reports={$reportsQuery.data ?? []} />
      {:else if tabSet === 1}
        <ResolvedTab reports={$reportsQuery.data ?? []}/>
      {/if}
    {/snippet}
  </TabGroup>
</AccessDeniedLoader>

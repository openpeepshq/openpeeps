<script lang="ts">
  import { Hash, UsersRound } from 'lucide-svelte';
  import { adminServerStatsStore } from '@openpeeps/svelte/api';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import {
    SignupChart,
    CommunityOverview,
    getServerDataContext,
    AccessDeniedLoader,
  } from '@openpeeps/svelte/components';

  let { serverInfo } = getServerDataContext();
  const statsQuery = adminServerStatsStore();
  const pageHeaderStore = getPageHeaderStore();
  $effect(() => {
    pageHeaderStore.set({
      title: 'Administration',
    });
  });
</script>

<div class="p-4">
  <div class="mt-0 w-full grid grid-cols-2 gap-4">
    <div class="card">
      <header class="card-header flex gap-2">
        <UsersRound size={24} />
        <h3 class="h3">Community Name</h3>
      </header>
      <section class="p-4">
        {serverInfo?.communityConfig.info.name ?? ''}
      </section>
    </div>
    <div class="card">
      <header class="card-header flex gap-2">
        <Hash size={24} />
        <h3 class="h3">Server Version</h3>
      </header>
      <section class="p-4">
        {serverInfo?.version ?? ''}
      </section>
    </div>
  </div>
  <div class="w-full space-y-4 mx-auto align-center mt-4">
    <AccessDeniedLoader queries={[$statsQuery]}>
      <h2 class="text-lg">Community overview</h2>
      <CommunityOverview statsData={$statsQuery.data!} />

      <h2 class="text-lg">New signups</h2>
      <SignupChart serverStats={$statsQuery.data!} />
    </AccessDeniedLoader>
  </div>
</div>

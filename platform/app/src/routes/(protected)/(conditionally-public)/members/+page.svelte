<script lang="ts">
  import { profilesStore } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader, ProfileCard } from '@openpeeps/svelte/components';
  import { SearchAndFilterBar } from '@openpeeps/ui';
  import { matchesQuery, sortProfiles } from '@openpeeps/common/lib';

  const profilesQuery = profilesStore();

  let filteredProfiles = $derived(
    sortProfiles($profilesQuery.data ?? []).filter(
      (p) => !search || matchesQuery(p, search),
    ),
  );
  let search: string = $state('');
</script>

<AccessDeniedLoader queries={[$profilesQuery]}>
  <SearchAndFilterBar
    placeholder="Search member by name or handle"
    bind:search
  />
  <div class="my-4 pb-10">
    {#each filteredProfiles as profile}
      <ProfileCard {profile} />
    {/each}
    {#if filteredProfiles.length === 0}
      <div class="w-full flex justify-center items-center p-4">
        <h2 class="text-lg">No profiles found</h2>
      </div>
    {/if}
  </div>
  {#if $profilesQuery.error}
    <div class="text-center w-full">
      Failed to fetch accounts. Please try again later.
    </div>
  {/if}
</AccessDeniedLoader>

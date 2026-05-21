<script lang="ts">
  // @ts-nocheck
  import { Tab, TabGroup } from '@skeletonlabs/skeleton';
  import { goto } from '$app/navigation';
  import { Badge, InfiniteScrollContainer } from '@openpeeps/ui';
  import { Loader2 } from 'lucide-svelte';
  import {
    ProfileCard,
    FeedPost,
    GroupCard,
    CardEvent,
    i18nContext,
  } from '@openpeeps/svelte/components';
  import {
    searchProfilesStore,
    searchPostsStore,
    searchJamsStore,
    searchEventsStore,
    searchGroupsStore,
    searchCountsStore,
  } from '@openpeeps/svelte/api';

  const { t } = i18nContext();

  type Props = {
    search: string;
    tabSet: number;
  };

  let { search, tabSet = $bindable(0) }: Props = $props();

  let searchProfilesQuery = $derived(
    searchProfilesStore({
      q: search,
    }),
  );
  let searchPostsQuery = $derived(
    searchPostsStore({
      q: search,
    }),
  );
  let searchJamsQuery = $derived(
    searchJamsStore({
      q: search,
    }),
  );
  let searchEventQuery = $derived(
    searchEventsStore({
      q: search,
    }),
  );
  let searchGroupsQuery = $derived(
    searchGroupsStore({
      q: search,
    }),
  );
  let searchCountsQuery = $derived(
    searchCountsStore({
      q: search,
    }),
  );

  $effect(() => {
    console.log('search', search);
  });
</script>

{#snippet count(value: number | undefined)}
  {#if $searchCountsQuery.isLoading || $searchCountsQuery.isFetching}
    <span class="text-sm">
      <Loader2 class="inline-block h-3 w-3 animate-spin" />
    </span>
  {:else if value !== undefined}
    {@const text = value > 99 ? '99+' : value.toString()}
    <span class="text-sm">
      <Badge status={text} />
    </span>
  {/if}
{/snippet}

<TabGroup>
  <Tab
    bind:group={tabSet}
    name="tab0"
    on:click={async () => {
      await goto('#members', {
        replaceState: true,
      });
    }}
    value={0}
  >
    <span class="text-sm">
      {t('explore.tabs.members')}
      {@render count($searchCountsQuery.data?.profiles)}
    </span>
  </Tab>
  <Tab
    bind:group={tabSet}
    name="tab1"
    on:click={async () => {
      await goto('#posts', {
        replaceState: true,
      });
    }}
    value={1}
  >
    <span class="text-sm">
      {t('explore.tabs.posts')}
      {@render count($searchCountsQuery.data?.posts)}
    </span>
  </Tab>
  <Tab
    bind:group={tabSet}
    name="tab2"
    on:click={async () => {
      await goto('#jams', {
        replaceState: true,
      });
    }}
    value={2}
  >
    <span class="text-sm">
      {t('explore.tabs.jams')}
      {@render count($searchCountsQuery.data?.jams)}
    </span>
  </Tab>
  <Tab
    bind:group={tabSet}
    name="tab3"
    on:click={async () => {
      await goto('#events', {
        replaceState: true,
      });
    }}
    value={3}
  >
    <span class="text-sm">
      {t('explore.tabs.events')}
      {@render count($searchCountsQuery.data?.events)}
    </span>
  </Tab>
  <Tab
    bind:group={tabSet}
    name="tab5"
    on:click={async () => {
      await goto('#groups', {
        replaceState: true,
      });
    }}
    value={5}
  >
    <span class="text-sm">
      {t('explore.tabs.groups')}
      {@render count($searchCountsQuery.data?.groups)}
    </span>
  </Tab>
  {#snippet panel()}
    {#if search && search.length > 2}
      {#key `${tabSet}-${search}`}
        {#if tabSet === 0}
          <InfiniteScrollContainer
            query={searchProfilesQuery}
            uniqueBy={(sri) => sri.data.id}
          >
            {#snippet children({ list })}
              {#each list as { data: profile } (profile.id)}
                <ProfileCard {profile} />
              {/each}
            {/snippet}
            {#snippet empty()}
              <div class="flex w-full items-center justify-center p-4">
                <h2 class="text-lg">{t('explore.noProfilesFound')}</h2>
              </div>
            {/snippet}
          </InfiniteScrollContainer>
        {:else if tabSet === 1}
          <InfiniteScrollContainer
            query={searchPostsQuery}
            uniqueBy={(sri) => sri.data.id}
          >
            {#snippet children({ list })}
              {#each list as { data: post } (post.id)}
                <a href={`/posts/${post.id}`}>
                  <FeedPost {post} />
                </a>
              {/each}
            {/snippet}
            {#snippet empty()}
              <div class="flex w-full items-center justify-center p-4">
                <h2 class="text-lg">{t('explore.noPostsFound')}</h2>
              </div>
            {/snippet}
          </InfiniteScrollContainer>
        {:else if tabSet === 2}
          <InfiniteScrollContainer
            query={searchJamsQuery}
            uniqueBy={(sri) => sri.data.id}
          >
            {#snippet children({ list })}
              {#each list as { data: post } (post.id)}
                <CardEvent {post} />
              {/each}
            {/snippet}
            {#snippet empty()}
              <div class="flex w-full items-center justify-center p-4">
                <h2 class="text-lg">{t('explore.noJamsFound')}</h2>
              </div>
            {/snippet}
          </InfiniteScrollContainer>
        {:else if tabSet === 3}
          <InfiniteScrollContainer
            query={searchEventQuery}
            uniqueBy={(sri) => sri.data.id}
          >
            {#snippet children({ list })}
              {#each list as { data: post } (post.id)}
                <CardEvent {post} />
              {/each}
            {/snippet}
            {#snippet empty()}
              <div class="flex w-full items-center justify-center p-4">
                <h2 class="text-lg">{t('explore.noEventsFound')}</h2>
              </div>
            {/snippet}
          </InfiniteScrollContainer>
        {:else if tabSet === 5}
          <InfiniteScrollContainer
            query={searchGroupsQuery}
            uniqueBy={(sri) => sri.data.id}
          >
            {#snippet children({ list })}
              {#each list as { data: group } (group.id)}
                <GroupCard {group} />
              {/each}
            {/snippet}
            {#snippet empty()}
              <div class="flex w-full items-center justify-center p-4">
                <h2 class="text-lg">{t('explore.noGroupsFound')}</h2>
              </div>
            {/snippet}
          </InfiniteScrollContainer>
        {/if}
      {/key}
    {/if}
  {/snippet}
</TabGroup>

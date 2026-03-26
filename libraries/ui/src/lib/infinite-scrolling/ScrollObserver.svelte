<script lang="ts" generics="D">
  import { buildInfiniteScroll } from '$lib/utils';
  import type {
    CreateInfiniteQueryResult,
    InfiniteData,
  } from '@tanstack/svelte-query';

  interface Props {
    query: CreateInfiniteQueryResult<InfiniteData<D[], unknown>, unknown>;
  }

  let { query }: Props = $props();

  const infiniteScroll = buildInfiniteScroll(() => {
    if ($query?.hasNextPage && !$query?.isFetchingNextPage) {
      $query.fetchNextPage();
    }
  });
</script>

{#if $query.hasNextPage}
  <div use:infiniteScroll class="h-4 w-full"></div>
{/if}

{#if $query.isFetchingNextPage}
  <div class="flex items-center justify-center py-6">
    <div class="text-surface-500 flex items-center gap-2">
      <div
        class="border-t-primary border-surface-300 h-4 w-4 animate-spin rounded-full border-2"
      ></div>
    </div>
  </div>
{/if}

<script lang="ts" generics="D">
  import type {
    CreateInfiniteQueryResult,
    InfiniteData,
  } from '@tanstack/svelte-query';
  import { Loader } from '$lib';
  import type { Snippet } from 'svelte';
  import { getUniqueBy } from '$lib/utils';
  import ScrollObserver from './ScrollObserver.svelte';
  interface Props {
    query: CreateInfiniteQueryResult<InfiniteData<D[], unknown>, unknown>;
    children: Snippet<[{ list: D[] }]>;
    empty?: Snippet;
    uniqueBy: (item: D) => string;
    scrollTop?: boolean;
    additionalItems?: D[];
  }

  let {
    query,
    children,
    empty,
    uniqueBy,
    scrollTop = false,
    additionalItems = [],
  }: Props = $props();

  let list = $derived(
    getUniqueBy(
      [...($query?.data?.pages?.flat() || []), ...additionalItems],
      uniqueBy,
    ),
  );
</script>

{#if $query}
  <Loader queries={[$query]}>
    {#if list.length}
      {#if scrollTop}
        <ScrollObserver {query} />
      {/if}
      {@render children({ list })}

      {#if !scrollTop}
        <ScrollObserver {query} />
      {/if}
    {:else}
      {@render empty?.()}
    {/if}
  </Loader>
{/if}

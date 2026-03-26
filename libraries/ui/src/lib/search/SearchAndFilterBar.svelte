<script lang="ts">
  import { Search, ArrowUpNarrowWide, Filter } from 'lucide-svelte';
  import { Input } from '$lib';

  interface Props {
    search?: string;
    placeholder?: string;
    handleOnSortButtonClicked?: any;
    handleOnFilterButtonClicked?: any;
    className?: string;
    debounceTimeMs?: number;
    hideIcon?: boolean;
  }

  let {
    search = $bindable(''),
    placeholder = 'Search',
    handleOnSortButtonClicked = () => {},
    handleOnFilterButtonClicked = () => {},
    className = '',
    debounceTimeMs = 800,
    hideIcon = false,
  }: Props = $props();

  let searchInput = $state(search);
  let ready = $state(true);

  const updateSearch = () => {
    if (searchInput.length < 3) {
      search = '';
    } else {
      search = searchInput;
      ready = false;
      setTimeout(() => {
        ready = true;
      }, debounceTimeMs);
    }
  };

  $effect(() => {
    if (ready) {
      updateSearch();
    }
  });
</script>

<div class={className}>
  <div class="border-surface-400 flex items-center rounded-md border-[1px]">
    {#if !hideIcon}
      <button class="flex-0 items-center justify-center rounded-l-md px-2 py-1">
        <Search />
      </button>
    {/if}
    <Input
      {placeholder}
      bind:value={searchInput}
      class="h-10 flex-grow bg-inherit px-2  py-1 outline-none focus:border-none focus:outline-none active:border-none active:outline-none "
    />
  </div>
</div>

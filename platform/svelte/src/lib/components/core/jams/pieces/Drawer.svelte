<script lang="ts">
  import { X } from 'lucide-svelte';
  import { getDrawerContext } from '$lib/components/core/jams/context';

  interface Props {
    title: string;
    children?: import('svelte').Snippet;
  }

  let { title, children }: Props = $props();

  const drawerContext = getDrawerContext();

  const containerClass =
    'w-full h-full ' +
    'flex flex-col ' +
    'absolute md:relative top-0 right-0 ' +
    'gap-3 md:w-80 ' +
    'rounded bg-surface-100 ' +
    'overflow-hidden';
</script>

<div class={containerClass}>
  <div class="flex w-full flex-none items-center justify-between border-b p-2">
    <h3 class="text-lg">{title}</h3>
    <button
      title="Close Drawer"
      class="text-neutral-400"
      onclick={() => drawerContext.set(undefined)}
    >
      <X />
    </button>
  </div>
  {@render children?.()}
</div>

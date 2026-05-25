<script lang="ts">
  import { getDrawerStore } from '@skeletonlabs/skeleton';
  import {
    preventDefault,
    stopPropagation,
    type IconType,
  } from '@openpeeps/ui';
  import type { Snippet } from 'svelte';

  const drawerStore = getDrawerStore();

  interface Props {
    name: string;
    icon: IconType;
    open?: boolean | undefined;
    children?: Snippet;
    action?: string | (() => unknown | Promise<unknown>);
    danger?: boolean;
  }

  let {
    name,
    icon: Icon,
    open = undefined,
    children,
    action,
    danger = false,
  }: Props = $props();

  let active: boolean = $derived(
    typeof action === 'string' && location.pathname === action,
  );

  const handleAction =
    (action?: () => unknown | Promise<unknown>) => async () => {
      try {
        await action?.();
      } finally {
        drawerStore.close();
      }
    };
</script>

<span class="block pl-4">
  {#if typeof action === 'string'}
    <a
      href={action}
      onclick={() => drawerStore.close()}
      class="hover:bg-surface-100 flex items-center gap-x-2 py-2 pl-2"
      class:text-base-200={!active}
      class:text-primary-500={active}
      class:font-bold={active}
      class:text-error-600={danger}
    >
      <span class:opacity-60={!active}>
        <Icon class="mr-1 h-5 w-5" strokeWidth={active ? 3 : 2} />
      </span>
      <span class:opacity-60={!active}>{name}</span>
    </a>
  {:else}
    <button
      onclick={stopPropagation(preventDefault(handleAction(action)))}
      class="hover:bg-surface-100 flex items-center gap-x-2 py-2 pl-2"
      class:text-base-200={!active}
      class:text-primary-500={active}
      class:font-bold={active}
      class:text-error-600={danger}
    >
      <span class:opacity-60={!active}>
        <Icon class="mr-1 h-5 w-5" strokeWidth={active ? 3 : 2} />
      </span>
      <span class:opacity-60={!active}>{name}</span>
    </button>
  {/if}
  {#if open}
    {@render children?.()}
  {/if}
</span>

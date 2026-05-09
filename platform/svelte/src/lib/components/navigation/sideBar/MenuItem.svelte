<script lang="ts">
  import { getDrawerStore } from '@skeletonlabs/skeleton';
  import { page } from '$app/state';
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
    count?: number | undefined;
    /** When true, `action` string is matched with pathname prefix (e.g. /groups/123). */
    prefixMatch?: boolean | undefined;
  }

  let {
    name,
    icon: Icon,
    open = undefined,
    children,
    action,
    danger = false,
    count = undefined,
    prefixMatch = false,
  }: Props = $props();

  let active: boolean = $derived(
    typeof action === 'string'
      ? prefixMatch
        ? page.url.pathname.startsWith(action)
        : page.url.pathname === action
      : false,
  );

  let visibleCount = $derived(count && count > 0 ? count : undefined);

  const handleAction =
    (fn?: () => unknown | Promise<unknown>) => async () => {
      try {
        await fn?.();
      } finally {
        drawerStore.close();
      }
    };
</script>

<span class="block pl-4">
  {#if typeof action === 'string'}
    <a
      href={action}
      onclick={(e) => {
        drawerStore.close();
        if (page.url.pathname === action) {
          e.preventDefault();
        }
      }}
      class="hover:bg-surface-100 flex w-full min-w-0 items-center gap-x-2 py-2 pl-2"
      class:text-base-200={!active}
      class:text-primary-500={active}
      class:font-bold={active}
      class:text-error-600={danger}
    >
      <span class:opacity-60={!active}>
        <Icon class="mr-1 h-5 w-5" strokeWidth={active ? 3 : 2} />
      </span>
      <span class="min-w-0 flex-1 truncate" class:opacity-60={!active}>{name}</span>
      {#if visibleCount}
        <span
          class="bg-primary-500 mr-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
        >
          {visibleCount}
        </span>
      {/if}
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

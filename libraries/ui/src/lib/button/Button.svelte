<script lang="ts">
  import { Loader2 } from 'lucide-svelte';
  import type { Variant } from '$lib';
  import { preventDefault, stopPropagation } from '$lib';
  import { type Snippet } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  interface Props {
    loading?: boolean;
    variant?: Variant;
    class?: string;
    disabled?: boolean;
    action?: string | (() => unknown | Promise<unknown>);
    title?: string;
    children?: Snippet;
    loadingContent?: Snippet;
    compact?: boolean;
  }

  let {
    loading = $bindable(false),
    variant = undefined,
    class: additionalClasses = '',
    disabled = false,
    action = () => {},
    title = '',
    children,
    loadingContent,
    compact = false,
  }: Props = $props();

  let buttonClasses = $derived(
    variant
      ? `btn ${compact ? 'btn-sm' : ''} ${variant} ${additionalClasses}`
      : additionalClasses,
  );

  const handleAction =
    (action: () => unknown | Promise<unknown>) => async () => {
      loading = true;
      try {
        await action();
      } finally {
        loading = false;
      }
    };

  const handleLinkClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      e.preventDefault();
    }
  };
</script>

{#snippet content()}
  {#if loading}
    <Loader2 class="mr-2 h-4 w-4 animate-spin" />
    {#if loadingContent}
      {@render loadingContent()}
    {:else}
      {@render children?.()}
    {/if}
  {:else}
    {@render children?.()}
  {/if}
{/snippet}

{#if typeof action === 'string'}
  <a {title} onclick={handleLinkClick} class={buttonClasses} href={action}>
    {@render content()}
  </a>
{:else}
  <button
    {title}
    onclick={stopPropagation(preventDefault(handleAction(action)))}
    disabled={loading || disabled}
    class={buttonClasses}
  >
    {@render content()}
  </button>
{/if}

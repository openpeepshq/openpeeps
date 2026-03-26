<script lang="ts">
  import type { Variant } from '@openpeeps/ui';
  import type { Snippet } from 'svelte';
  import { Info } from 'lucide-svelte';

  interface Props {
    title?: string;
    text?: string;
    type?: 'error' | 'warning' | 'info' | 'success';
    actions?: Snippet;
  }

  let { title, text, type = 'info', actions }: Props = $props();

  let variant: Variant = $derived(
    type === 'error'
      ? 'variant-ghost-error'
      : type === 'warning'
        ? 'variant-ghost-warning'
        : type === 'info'
          ? 'variant-ghost-surface'
          : 'variant-ghost-success',
  );
</script>

<div class="{variant} m-4 gap-3 rounded-lg p-2">
  <div class="flex flex-row items-start justify-start gap-2">
    <Info size={32} class="variant-filled-error mt-1 rounded-xl p-1" />
    <div class="flex flex-col gap-1">
      {#if title}
        <h3 class="h3">{title}</h3>
      {/if}
      {#if text}
        <p class="p">{text}</p>
      {/if}
    </div>
  </div>
  {#if actions}
    <div class="flex flex-row justify-end">
      {@render actions()}
    </div>
  {/if}
</div>

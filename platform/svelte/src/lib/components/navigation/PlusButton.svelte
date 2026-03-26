<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { Plus } from 'lucide-svelte';
  import { getPlusButtonStore } from '$lib/stores';

  const plusButtonStore = getPlusButtonStore();
</script>

{#if $plusButtonStore}
  <div class="sticky bottom-1 flex w-full justify-end sm:bottom-4">
    {#if Array.isArray($plusButtonStore)}{:else}
      {@const Icon = $plusButtonStore.icon || Plus}
      <Button
        compact
        title={$plusButtonStore.title}
        variant="variant-filled-primary"
        action={$plusButtonStore.action}
        class=" z-10 mr-4 size-16 rounded-full sm:mb-4"
      >
        <Icon size={24} />
      </Button>
    {/if}
  </div>
{/if}

<script lang="ts">
  import { onMount } from 'svelte';
  import { authenticateGeneric } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';

  let error: string | undefined = $state(undefined);

  onMount(async () => {
    const params = {
      data: {
        ...Object.fromEntries(new URLSearchParams(location.search).entries()),
        ...Object.fromEntries(
          new URLSearchParams(location.hash.substring(1)).entries(),
        ),
      },
    };

    const result = await authenticateGeneric(params);

    if (result.success) {
      await goto('/feeds/local');
    } else {
      error = result.error;
    }
  });
</script>

{#if error}
  <h1 class="h1">Error: {error}</h1>
{:else}
  <h1 class="h1">Loading...</h1>
{/if}

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  import { setCredentials } from '@openpeeps/svelte/auth';

  let error: string | undefined = $state(undefined);

  onMount(async () => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      error = errorParam;
      return;
    }

    if (token) {
      setCredentials({ token });
      await goto('/feeds/local');
      return;
    }

    error = 'No token or error received from authentication provider.';
  });
</script>

{#if error}
  <h1 class="h1">Error: {error}</h1>
{:else}
  <h1 class="h1">Logging in...</h1>
{/if}

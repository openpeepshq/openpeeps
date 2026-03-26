<script lang="ts">
  import { getServerInfo } from '@openpeeps/svelte/server';

  const serverInfo = getServerInfo();

  if (!serverInfo.jams.livekit.enabled) {
    history.back();
  }
</script>

{#if serverInfo.jams.livekit.enabled}
  <slot />
{:else}
  <div class="flex flex-col items-center justify-center h-screen">
    <h1 class="text-2xl font-bold mb-4">Jams are not configured</h1>
    <p class="text-gray-600">
      Please configure Jams in the server settings to use this feature.
    </p>
  </div>
{/if}

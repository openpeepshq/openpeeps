<script lang="ts">
  import { WifiLow, WifiOff } from 'lucide-svelte';
  import { connectionQualityStore } from '../stores';
  import { getLivekitRoom } from '../context';
  import { ConnectionQuality } from 'livekit-client';
  import { Button } from '@openpeeps/ui';

  const room = getLivekitRoom();

  const connectionQuality = connectionQualityStore(room);

  let dismissed = $state(false);

  const dismiss = () => {
    dismissed = true;
    setTimeout(
      () => {
        dismissed = false;
      },
      1000 * 60 * 5,
    );
  };

  let poorConnection = $derived(
    $connectionQuality === ConnectionQuality.Poor ||
      $connectionQuality === ConnectionQuality.Lost,
  );
</script>

{#if poorConnection && !dismissed}
  <div
    class="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center gap-3 rounded-lg border border-yellow-500 bg-yellow-500/20 px-4 py-3 backdrop-blur-sm"
  >
    <div>
      {#if $connectionQuality === ConnectionQuality.Poor}
        <WifiLow />
      {:else}
        <WifiOff />
      {/if}
    </div>
    <div class="flex flex-col">
      <h3 class="w-full text-center font-medium">Connection Status</h3>
      <p class="w-full text-center text-sm">
        Your internet connection is {$connectionQuality}.
      </p>
    </div>
    <Button variant="variant-ghost-surface" action={dismiss} compact>
      Dismiss
    </Button>
  </div>
{/if}

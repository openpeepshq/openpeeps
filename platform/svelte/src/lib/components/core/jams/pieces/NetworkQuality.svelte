<script lang="ts">
  import { WifiLow, WifiOff } from 'lucide-svelte';
  import { connectionQualityStore } from '../stores';
  import { getLivekitRoom } from '../context';
  import { ConnectionQuality } from 'livekit-client';
  import { Button } from '@openpeeps/ui';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
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
      <h3 class="w-full text-center font-medium">{t('jams.network.connectionStatus')}</h3>
      <p class="w-full text-center text-sm">
        {t('jams.network.connectionDetail', { quality: $connectionQuality })}
      </p>
    </div>
    <Button variant="variant-ghost-surface" action={dismiss} compact>
      {t('jams.network.dismiss')}
    </Button>
  </div>
{/if}

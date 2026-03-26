<script lang="ts">
  import { jamSettingsStore } from '../stores';

  interface Props {
    stream: MediaStream | undefined;
  }

  let { stream }: Props = $props();
  let audioElement: HTMLAudioElement | undefined = $state();

  const srcObject = (node: HTMLAudioElement, stream: MediaStream) => {
    node.srcObject = stream;
    return {
      update(newStream: MediaStream) {
        if (node.srcObject != newStream) {
          node.srcObject = newStream;
        }
      },
    };
  };

  const applySinkId = async (el: HTMLAudioElement, deviceId: string) => {
    if (!deviceId || typeof HTMLMediaElement === 'undefined' || !('setSinkId' in HTMLMediaElement.prototype)) return;
    try {
      await el.setSinkId(deviceId);
    } catch (e) {
      console.warn('Failed to set audio sink ID (e.g. unsupported in this browser)', e);
    }
  };

  $effect(() => {
    if (audioElement && $jamSettingsStore.deviceIds.speaker) {
      applySinkId(audioElement, $jamSettingsStore.deviceIds.speaker);
    }
  });
</script>

{#if stream}
  <audio
    bind:this={audioElement}
    use:srcObject={stream}
    class="hidden"
    autoplay
  >
  </audio>
{/if}

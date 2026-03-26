<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { Disc, SquareStop } from 'lucide-svelte';
  import { startRecordingMutation, stopRecordingMutation } from '$lib/api/jam';
  import { getChatContext, getJamContext, getLivekitRoom } from '../context';
  import { toaster } from '$lib/utils';
  import { calculateRecordingState } from '../helpers';
  import { getServerInfo } from '$lib/server';
  import MobileMenuButton from './MobileMenuButton.svelte';

  interface Props {
    closeMenu?: () => void;
  }

  const { closeMenu }: Props = $props();

  const startRecording = startRecordingMutation();
  const stopRecording = stopRecordingMutation();
  const toast = toaster();

  const { jam, jamPost } = getJamContext();
  const room = getLivekitRoom();
  const iAmModerator = $derived(
    jam.moderators.includes(room.localParticipant.identity),
  );

  const { query, sessionEvents } = getChatContext();
  const serverInfo = getServerInfo();

  let { isRecording } = $derived(
    calculateRecordingState($query, $sessionEvents),
  );
</script>

{#if iAmModerator && serverInfo.jams.livekit.recordingEnabled}
  {#if isRecording}
    <Button
      title="Stop recording"
      class="bg-error-500 text-on-primary-token hidden items-center justify-center rounded-full p-2 md:flex"
      action={() =>
        stopRecording({ id: jamPost.id })
          .then((recording) =>
            toast({ message: `Recording stopped: ${recording.id}` }),
          )
          .catch(() =>
            toast({ message: 'Failed to stop recording', type: 'error' }),
          )}
    >
      <SquareStop />
    </Button>
    <MobileMenuButton
      icon={SquareStop}
      label={'Stop recording'}
      action={() =>
        stopRecording({ id: jamPost.id })
          .then((recording) => {
            toast({ message: `Recording stopped: ${recording.id}` });
            closeMenu?.();
          })
          .catch(() =>
            toast({ message: 'Failed to stop recording', type: 'error' }),
          )}
    />
  {:else}
    <Button
      title="Record this jam"
      class="bg-error-500 text-on-primary-token hidden items-center justify-center rounded-full p-2 md:flex"
      action={() =>
        startRecording({ id: jamPost.id })
          .then((recording) => {
            toast({ message: `Recording started: ${recording.id}` }),
              closeMenu?.();
          })
          .catch(() =>
            toast({ message: 'Failed to start recording', type: 'error' }),
          )}
    >
      <Disc />
    </Button>
    <MobileMenuButton
      icon={Disc}
      label={'Record this jam'}
      action={() =>
        startRecording({ id: jamPost.id })
          .then((recording) => {
            toast({ message: `Recording started: ${recording.id}` }),
              closeMenu?.();
          })
          .catch(() =>
            toast({ message: 'Failed to start recording', type: 'error' }),
          )}
    />
  {/if}
{/if}

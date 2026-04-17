<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { Disc, SquareStop } from 'lucide-svelte';
  import { startRecordingMutation, stopRecordingMutation } from '$lib/api/jam';
  import { getChatContext, getJamContext, getLivekitRoom } from '../context';
  import { toaster } from '$lib/utils';
  import { calculateRecordingState } from '../helpers';
  import { getServerInfo } from '$lib/server';
  import MobileMenuButton from './MobileMenuButton.svelte';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();

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
      title={t('jams.recording.stopTitle')}
      class="bg-error-500 text-on-primary-token hidden items-center justify-center rounded-full p-2 md:flex"
      action={() =>
        stopRecording({ id: jamPost.id })
          .then((recording) =>
            toast({ message: t('jams.recording.stopped', { id: recording.id }) }),
          )
          .catch(() =>
            toast({ message: t('jams.recording.stopError'), type: 'error' }),
          )}
    >
      <SquareStop />
    </Button>
    <MobileMenuButton
      icon={SquareStop}
      label={t('jams.recording.stopTitle')}
      action={() =>
        stopRecording({ id: jamPost.id })
          .then((recording) => {
            toast({ message: t('jams.recording.stopped', { id: recording.id }) });
            closeMenu?.();
          })
          .catch(() =>
            toast({ message: t('jams.recording.stopError'), type: 'error' }),
          )}
    />
  {:else}
    <Button
      title={t('jams.recording.recordTitle')}
      class="bg-error-500 text-on-primary-token hidden items-center justify-center rounded-full p-2 md:flex"
      action={() =>
        startRecording({ id: jamPost.id })
          .then((recording) => {
            toast({ message: t('jams.recording.started', { id: recording.id }) }),
              closeMenu?.();
          })
          .catch(() =>
            toast({ message: t('jams.recording.startError'), type: 'error' }),
          )}
    >
      <Disc />
    </Button>
    <MobileMenuButton
      icon={Disc}
      label={t('jams.recording.recordTitle')}
      action={() =>
        startRecording({ id: jamPost.id })
          .then((recording) => {
            toast({ message: t('jams.recording.started', { id: recording.id }) }),
              closeMenu?.();
          })
          .catch(() =>
            toast({ message: t('jams.recording.startError'), type: 'error' }),
          )}
    />
  {/if}
{/if}

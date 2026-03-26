<script lang="ts">
  import { CircleStop } from 'lucide-svelte';
  import { getChatContext } from '../context';
  import { getUniqueBy } from '@openpeeps/common';
  import { calculateRecordingState } from '../helpers';
  import { StopWatch } from '@openpeeps/ui';
  const { query, sessionEvents } = getChatContext();

  let { isRecording, recordingStart } = $derived(
    calculateRecordingState($query, $sessionEvents),
  );
</script>

{#if isRecording && recordingStart}
  <div
    class="variant-filled-error fixed left-4 top-4 z-50 flex w-40 items-center justify-center gap-2 rounded-full p-4"
  >
    <CircleStop />
    <StopWatch start={recordingStart} />
  </div>
{/if}

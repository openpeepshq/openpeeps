<script>
  import CallParticipant from '../CallParticipant.svelte';
  import { participantListStore } from '../../../stores';
  import { getLivekitRoom, observerContext } from '../../../context';

  const room = getLivekitRoom();
  const participantList = participantListStore(room);

  const isObserver = observerContext();
</script>

<div class="size-full p-2">
  {#if !isObserver}
    <CallParticipant participant={$participantList[0]} size="size-full" />
  {/if}
</div>

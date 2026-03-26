<script>
	import CallParticipant from '../CallParticipant.svelte';
	import { participantListStore } from '../../../stores';
	import { getLivekitRoom } from '../../../context';

	const room = getLivekitRoom();
	const participantList = participantListStore(room);
</script>

<div class="relative size-full p-2">
	<CallParticipant participant={$participantList.filter((p) => !p.isLocal)[0]} size="size-full" />
	<div class="absolute bottom-12 mb-8 right-12 size-32 md:size-56">
		<CallParticipant participant={$participantList.filter((p) => p.isLocal)[0]} size="size-full" />
	</div>
</div>

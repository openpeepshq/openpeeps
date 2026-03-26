<script>
	import CallParticipant from '../CallParticipant.svelte';
	import { participantListStore } from '../../../stores';
	import { getLivekitRoom } from '../../../context';

	const room = getLivekitRoom();
	const participantList = participantListStore(room);
</script>

<div
	class="mb-16 grid h-full w-full auto-rows-min grid-cols-2 place-items-center content-start justify-items-center gap-2 overflow-auto p-2 md:mb-32 md:flex md:flex-grow md:flex-wrap md:content-center md:items-center md:justify-center"
>
	{#each $participantList as participant (participant.identity)}
		<CallParticipant {participant} size="size-40 md:size-52" />
	{/each}
</div>

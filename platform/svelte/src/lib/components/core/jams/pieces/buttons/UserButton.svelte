<script lang="ts">
	import {
		getDrawerContext,
		getLivekitRoom,
		getWaitingRoom
	} from '$lib/components/core/jams/context';
	import { participantListStore } from '$lib/components/core/jams/stores';
	import { UsersRound } from 'lucide-svelte';
	import { toast } from '@openpeeps/svelte/utils';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { onDestroy } from 'svelte';
	const song = '/audio/notification.wav';
	
	const notification = new Audio(song);
	notification.volume = 0.3;

	const room = getLivekitRoom();
	const drawerMenuContext = getDrawerContext();
	const participantList = participantListStore(room);
	const toastStore = getToastStore();

	const waitingRoom = getWaitingRoom();

	let previousWaitingRoomCount = $state(0)

	const unsubscribe = waitingRoom?.subscribe(($waitingRoom) => {
	if (!$waitingRoom) return;

	const currentCount = Object.keys($waitingRoom).length;

	if (currentCount > previousWaitingRoomCount) {
		const newJoiners = currentCount - previousWaitingRoomCount;
		toastStore.trigger(
			toast({
				message: `${newJoiners} person${newJoiners > 1 ? 's' : ''} joined the waiting room!`,
				background: 'variant-filled-success'
			})
			
		);
		notification.play();
	}

	previousWaitingRoomCount = currentCount;
});

onDestroy(() => {
	unsubscribe?.();
});

</script>

<button
	title="Show Everyone"
	class="relative"
	onclick={() =>
		$drawerMenuContext === 'people'
			? drawerMenuContext.set(undefined)
			: drawerMenuContext.set('people')}
>
	<span class="absolute -right-4 -top-4 size-6 rounded-full bg-surface-400 p-1 px-2 text-xs">
		{$participantList.length}
	</span>
	{#if waitingRoom && $waitingRoom}
		<span class="absolute -bottom-4 -right-4 size-6 rounded-full bg-surface-400 p-1 px-2 text-xs">
			{Object.keys($waitingRoom).length}
		</span>
	{/if}
	<UsersRound />
</button>

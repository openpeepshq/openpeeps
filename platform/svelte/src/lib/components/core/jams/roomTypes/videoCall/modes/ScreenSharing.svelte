<script lang="ts">
	// @ts-nocheck
	import { participantListStore, participantTracksStore } from '$lib/components/core/jams/stores';
	import { getLivekitRoom } from '$lib/components/core/jams/context';
	import ScreenShareVideo from '$lib/components/core/jams/pieces/ScreenShareVideo.svelte';
	import CallParticipant from '$lib/components/core/jams/roomTypes/videoCall/CallParticipant.svelte';
	import type { LocalParticipant, RemoteParticipant } from 'livekit-client';
	import { derived, get } from 'svelte/store';
	import { Track } from 'livekit-client';

	const room = getLivekitRoom();
	const participantList = participantListStore(room);

	const participantScreenShareList = derived<
		typeof participantList,
		(LocalParticipant | RemoteParticipant)[]
	>(
		participantList,
		($participants, set) => {
			const unsubscribers: (() => void)[] = [];

			function update() {
				const screenSharers = $participants.filter((participant) => {
					const tracks = get(participantTracksStore(participant));
					return tracks.some(
						(track) =>
							track.kind === Track.Kind.Video &&
							track.source === Track.Source.ScreenShare &&
							!track.isMuted
					);
				});
				set(screenSharers);
			}

			for (const participant of $participants) {
				const unsub = participantTracksStore(participant).subscribe(() => {
					update();
				});
				unsubscribers.push(unsub);
			}

			update();

			return () => {
				unsubscribers.forEach((unsub) => unsub());
			};
		},
		[]
	);

	let selectedScreenShareIndex: number = 0;
</script>

<div class="flex h-auto w-full flex-col justify-center gap-2 p-2 md:h-full md:flex-row">
	<div class="flex-1">
		<ScreenShareVideo participant={$participantScreenShareList[selectedScreenShareIndex]} />
	</div>
	<div
		class:md:w-56={$participantList.length > 7}
		class:md:w-28={$participantList.length <= 7}
		class="flex-0 mb-16 flex w-full flex-row flex-wrap content-start justify-center gap-1 overflow-y-auto md:my-4 md:h-full"
	>
		{#each $participantList as participant (participant.identity)}
			<CallParticipant {participant} size="size-24 flex-shrink-0" compact />
		{/each}
	</div>
</div>

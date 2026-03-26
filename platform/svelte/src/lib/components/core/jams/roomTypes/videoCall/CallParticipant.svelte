<script lang="ts">
	import { Participant } from 'livekit-client';
	import {
		participantCameraTrackStore,
		participantMicrophoneTrackStore
	} from '$lib/components/core/jams/stores';
	import Audio from '$lib/components/core/jams/pieces/Audio.svelte';
	import Reactions from '$lib/components/core/jams/pieces/Reactions.svelte';
	import OwnReactions from '../../pieces/OwnReactions.svelte';
	import ParticipantDisplay from '$lib/components/core/jams/pieces/ParticipantDisplay.svelte';
	import ParticipantOverlay from '$lib/components/core/jams/pieces/ParticipantOverlay.svelte';
	import { metadataSchema } from '$lib/types';

	interface Props {
		participant: Participant;
		size: string;
		compact?: boolean;
	}

	let { participant, size, compact = false }: Props = $props();

	const participantMetadata = metadataSchema.parse(JSON.parse(participant?.metadata || '{}'));

	const cameraTrack = participantCameraTrackStore(participant);
	const microphoneTrack = participantMicrophoneTrackStore(participant);
	const profile = participantMetadata.profile;
</script>

<div class={`${size} relative rounded-xl border bg-surface-50`}>
	<ParticipantDisplay track={$cameraTrack} {profile} />
	<ParticipantOverlay {profile} {participant} {compact} />
	{#if !participant.isLocal}
		<Audio stream={$microphoneTrack?.mediaStream} />
		<Reactions participantId={participant.identity} />
	{:else}
		<OwnReactions />
	{/if}
</div>

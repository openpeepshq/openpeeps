<script lang="ts">
	import { Participant } from 'livekit-client';
	import { Avatar } from '../../profile';
	import { Hand } from 'lucide-svelte';
	import { participantHandRaisedStore } from '../stores';
	import { metadataSchema } from '$lib/types';

	interface Props {
		participant: Participant;
	}

	let { participant }: Props = $props();

	const profile = metadataSchema.parse(JSON.parse(participant?.metadata || '{}')).profile;

	const handStore = participantHandRaisedStore(participant);
</script>

<div class="flex items-center justify-between">
	<div class="flex items-center gap-x-1">
		<Avatar {profile} size={3} />
		<!-- <p>Just test to see if this overlays</p> -->
		{#if profile}<p>{profile.displayName || `@${profile.handle}`}</p>{/if}
	</div>
	<div class="flex items-center">
		{#if $handStore}
			<Hand />
		{/if}
	</div>
</div>

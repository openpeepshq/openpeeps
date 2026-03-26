<script lang="ts">
	import { AudioLines, Hand, Mic, MicOff } from 'lucide-svelte';
	import type { PublicProfile } from '@openpeeps/common/types';
	import type { Participant } from 'livekit-client';
	import {
		microphoneStateStore,
		participantAudioLevelStore,
		participantHandRaisedStore
	} from '$lib/components/core/jams/stores';
	import { getJamContext, getLivekitRoom } from '$lib/components/core/jams/context';
	import ParticipantMenu from '$lib/components/core/jams/pieces/ParticipantMenu.svelte';

	const { jam } = getJamContext();
	const room = getLivekitRoom();

	const song = '/audio/click-notification.wav';
	const notification = new Audio(song);
	notification.volume = 0.5;

	interface Props {
		profile: PublicProfile | undefined;
		participant: Participant;
		compact?: boolean;
	}

	let { profile, participant, compact = false }: Props = $props();

	const handStore = participantHandRaisedStore(participant);
	const microphoneState = microphoneStateStore(participant);
	const participantAudioLevel = participantAudioLevelStore(participant);

	const you = participant.isLocal;
	const id = participant.identity;

	const iconDesktopSize = compact ? '' : 'md:size-4';

	const handState = $derived($handStore);

	$effect(() => {
		if (handState) {
			notification.play();
		}
	});
</script>

<div
	class="absolute right-0 top-0 flex h-full w-full flex-col justify-between"
	class:md:p-3={!compact}
>
	<!-- pin and audio indicator -->
	<div class="flex w-full items-start justify-between">
		<!-- hand indicator -->
		<div class="">
			{#if $handStore}
				<div class="bg-surface-50/70 rounded-full p-2">
					<Hand class="size-3 {iconDesktopSize}" />
				</div>
			{/if}
		</div>
		<!-- audio indicator -->

		<div
			class="bg-surface-50/70 rounded-full p-2"
			class:text-primary-500={$microphoneState && $participantAudioLevel}
		>
			{#if !$microphoneState}
				<MicOff class="size-3 {iconDesktopSize}" />
			{:else if $microphoneState && $participantAudioLevel === 0}
				<Mic class="size-3 {iconDesktopSize}" />
			{:else}
				<AudioLines class="size-3 {iconDesktopSize}" />
			{/if}
		</div>
	</div>
	<!--  participant details and menu-->
	<div class="flex w-full items-end justify-between">
		<!-- participant details -->
		<div
			class:max-w-[65%]={jam.moderators.includes(room.localParticipant.identity)}
			class:max-w-full={!jam.moderators.includes(room.localParticipant.identity)}
			class="bg-surface-50/70 block truncate rounded-lg p-1"
			class:text-xs={compact}
			class:text-sm={!compact}
		>
			{#if profile}
				{(jam.moderators.includes(id) ? '* ' : '') + (profile.displayName || `@${profile.handle}`)}
			{/if}
		</div>
		<!-- menu button -->
		{#if jam.moderators.includes(room.localParticipant.identity)}
			<div class="bg-surface-50/70 rounded-full">
				<ParticipantMenu {participant} {compact} />
			</div>
		{/if}
	</div>
</div>

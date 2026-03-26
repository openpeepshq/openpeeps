<script lang="ts">
	import type { Participant } from 'livekit-client';
	import { getJamContext, getLivekitRoom } from '../context';
	import { MicOff, MoreVertical } from 'lucide-svelte';
	import { PopupMenuButton, PopupMenu } from '@openpeeps/ui';
	import { muteJamParticipantMutation } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		participant: Participant;
		compact?: boolean;
		iconSize?: number;
	}

	let { participant, compact = false, iconSize = compact ? 16 : 10 }: Props = $props();
	const { t } = i18nContext();
	const { jamPost, jam } = getJamContext();
	const room = getLivekitRoom();
	const muteParticipant = muteJamParticipantMutation({ id: jamPost.id });

	const handleMuteParticipant = () => {
		const audioTrackPublication = participant
			.getTrackPublications()
			.find(
				(trackPublication) => trackPublication.track && trackPublication.track.kind === 'audio'
			);

		if (!audioTrackPublication) {
			return;
		}

		muteParticipant({
			identity: participant.identity,
			trackSid: audioTrackPublication.trackSid
		});
	};
</script>

<PopupMenu icon={MoreVertical} {iconSize} placement="left-end" {compact} class="p-2">
	{#if jam.moderators.includes(room.localParticipant.identity)}
		<PopupMenuButton
			title={t('jams.participants.muteParticipant')}
			icon={MicOff}
			action={handleMuteParticipant}
			text={t('jams.participants.muteParticipant')}
			{compact}
		/>
	{/if}
	<!-- <button class="mb-4 flex gap-x-2 items-center">
          <MessageCircleDashedIcon />
          <p>Mute In Chat</p>
        </button>
        <button
          on:click={() => {
            isMenuOpened = false;
          }}
          class="mb-4 flex gap-x-2 items-center"
        >
          <VideoOffIcon />
          <p>Turn Off Camera</p>
        </button>
        <button
          on:click={() => {
            isMenuOpened = false;
          }}
          class=" flex gap-x-2 items-center text-red-400"
        >
          <AccountMinus2Icon />
          <p>Remove from Jam</p>
        </button> -->
</PopupMenu>

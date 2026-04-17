<script lang="ts">
	import { jamActivityStore } from '$lib/api';
	import { participantAudioLevelStore } from '$lib/components/core/jams/stores';
	import { getLivekitRoom } from '../context';
	import HandSwitch from './HandSwitch.svelte';
	import MicrophoneSelectorAndSwitch from './MicrophoneSelectorAndSwitch.svelte';
	import CameraSelectorAndSwitch from './CameraSelectorAndSwitch.svelte';
	import Drawer from './Drawer.svelte';
	import { UpdatingDate } from '@openpeeps/ui';
  import AudioOutputSelector from './AudioOutputSelector.svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const room = getLivekitRoom();
	let participantAudioLevel = participantAudioLevelStore(room.localParticipant);
</script>

<Drawer title={t('jams.drawer.debugTitle')}>
	<div class="mt-1 w-full p-2">
		<h3 class="mb-2 text-lg font-bold">{t('jams.drawer.jamControls')}</h3>
		<div class="flex items-center justify-evenly">
			<MicrophoneSelectorAndSwitch />
			<CameraSelectorAndSwitch />
			<AudioOutputSelector />
			<HandSwitch />
		</div>
	</div>

	<div class=" w-full border-b border-neutral-300"></div>
	<div class="my-2 w-full py-2">
		<div class="my-4">
			<h3 class="text-lg font-bold">{t('jams.drawer.audioLevel')}</h3>
			<div class="bg-surface-200 h-4 w-full rounded">
				<div class="h-4 rounded bg-green-500" style="width: {$participantAudioLevel * 10}%"></div>
			</div>
			<div class="text-surface-500 mt-2 text-sm">
				{t('jams.debug.currentAudioLevel')} {$participantAudioLevel}
			</div>
		</div>
	</div>

	<h2 class="text-lg font-bold">{t('jams.drawer.activityHistory')}</h2>
	{#if $jamActivityStore.length > 0}
		{#each $jamActivityStore as jamActivity}
			<div class="flex gap-2">
				<div class="text-surface-500 text-sm">{jamActivity.activity}</div>
				<div class="text-surface-500 text-sm">
					<UpdatingDate date={jamActivity.timestamp} />
				</div>
			</div>
		{/each}
	{:else}
		<div class="text-surface-500 text-sm">{t('jams.debug.noActivity')}</div>
	{/if}
</Drawer>

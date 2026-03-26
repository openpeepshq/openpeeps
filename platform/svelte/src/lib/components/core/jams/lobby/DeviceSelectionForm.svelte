<script lang="ts">
	import MicrophoneSelectorAndSwitch from '$lib/components/core/jams/pieces/MicrophoneSelectorAndSwitch.svelte';
	import CameraSelectorAndSwitch from '$lib/components/core/jams/pieces/CameraSelectorAndSwitch.svelte';
	import BlurSwitch from '$lib/components/core/jams/pieces/BlurSwitch.svelte';
	import { LocalVideoTrack } from 'livekit-client';
	import { getJamContext } from '$lib/components/core/jams/context';
	import { Bug } from 'lucide-svelte';
	import AudioOutputSelector from '../pieces/AudioOutputSelector.svelte';

	const { jamEvent } = getJamContext();

	interface Props {
		showDebugPanel: boolean;
	}

	let { showDebugPanel = $bindable() }: Props = $props();

	let localVideoTrack: LocalVideoTrack | undefined = $state();

	let videoRef: HTMLVideoElement | undefined = $state();

	$effect(() => {
		if (localVideoTrack && videoRef) {
			localVideoTrack.attach(videoRef);
		}
	});
</script>

<div class="relative inline-block h-auto w-full overflow-hidden p-5">
	<div class="relative flex flex-col items-center overflow-hidden">
		<h2 class="my-1 text-center text-lg">{jamEvent.name || 'Jam'}</h2>
		<video
			bind:this={videoRef}
			class="left-0 size-64 overflow-hidden rounded-xl object-cover"
			class:hidden={!(localVideoTrack?.mediaStreamTrack?.readyState === 'live')}
		>
		</video>
		<div
			class="bg-surface-100 left-0 top-0 size-64 items-center justify-center rounded-xl"
			class:flex={!localVideoTrack}
			class:hidden={!!localVideoTrack}
		>
			<p class="text-lg">Camera is off</p>
		</div>
		<div class="relative mt-4 flex w-full justify-center gap-2">
			<MicrophoneSelectorAndSwitch type="lobby" />
			<AudioOutputSelector type="lobby" />
			<CameraSelectorAndSwitch type="lobby" bind:localVideoTrack />
			<BlurSwitch type="lobby" bind:localVideoTrack />
			{#if location.hash.includes('#debug')}
				<button
					title="Toggle Debug Panel"
					class="flex items-center justify-center rounded-full border p-2"
					onclick={() => (showDebugPanel = !showDebugPanel)}
				>
					<Bug />
				</button>
			{/if}
		</div>
	</div>
</div>

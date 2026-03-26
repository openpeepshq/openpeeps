<script lang="ts">
	import Video from '$lib/components/core/jams/pieces/Video.svelte';
	import type { Track } from 'livekit-client';
	import { Avatar } from '$lib/components/core/profile';
	import type { PublicProfile } from '@openpeeps/common/types';

	interface Props {
		track: Track | undefined;
		profile: PublicProfile | undefined;
	}

	let { track, profile }: Props = $props();
</script>

<div class="size-full overflow-hidden rounded-xl">
	{#if track && track.mediaStream && !track.isMuted}
		<Video stream={track.mediaStream} />
	{:else}
		<div class="relative flex size-full items-center justify-center">
			<Avatar {profile} size={5} borderless />
		</div>
	{/if}
</div>

<script lang="ts">
	import type { JamState } from '@openpeeps/common/types';
	import AvatarFromId from '../../profile/AvatarFromId.svelte';

	interface Props {
		jamState: JamState;
		size?: number;
	}

	let { jamState, size = 1.5 }: Props = $props();
</script>

<div class="flex w-full justify-between gap-4 p-5">
	<div class="flex items-center">
		{#if jamState.participants.length > 2}
			{#each jamState.participants.slice(0, 2) as participant (participant)}
				<AvatarFromId containerClass="-mr-2" id={participant} borderless={true} {size} />
			{/each}
		{:else}
			{#each jamState.participants as participant (participant)}
				<AvatarFromId containerClass="-mr-2" id={participant} borderless={true} {size} />
			{/each}
		{/if}
	</div>
</div>

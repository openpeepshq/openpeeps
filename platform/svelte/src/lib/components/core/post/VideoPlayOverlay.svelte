<script lang="ts">
	import { CirclePlay } from 'lucide-svelte';

	interface Props {
		video: boolean;
	}

	const { video }: Props = $props();
</script>

{#if video}
	<div class="absolute inset-0 flex items-center justify-center">
		<div class="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">
			<CirclePlay />
		</div>
	</div>
{/if}

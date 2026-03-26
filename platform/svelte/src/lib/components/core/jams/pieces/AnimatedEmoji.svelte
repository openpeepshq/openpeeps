<script lang="ts">
	import animateEmoji from '../animate-emoji';
	import { onMount } from 'svelte';

	interface Props {
		emoji: string;
	}

	let { emoji }: Props = $props();
	let element: HTMLElement | undefined = $state();
	onMount(() => {
		if (element) {
			animateEmoji(element);
		}
	});
</script>

<div
	bind:this={element}
	class="absolute bottom-0 right-1/3 size-16 bg-transparent pt-3 text-center text-4xl md:size-24 md:pt-4 md:text-6xl"
	style="align-self: center;"
>
	{emoji}
</div>

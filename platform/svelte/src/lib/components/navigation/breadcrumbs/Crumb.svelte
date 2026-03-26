<script lang="ts">
	import type { Crumb } from '$lib/types';

	interface Props {
		crumb: Crumb;
	}

	let { crumb }: Props = $props();
</script>

<li class="crumb">
	{#if crumb.link}
		<a class="anchor" href={crumb.link}>{crumb.text}</a>
	{:else}
		{crumb.text}
	{/if}
</li>

<script lang="ts">
	import { PreviewLink } from '$lib/components';

	interface Props {
		content: string | undefined;
	}

	let { content }: Props = $props();

	let urls: string[] = $derived(content?.match(/\bhttps?:\/\/\S+/gi) ?? []);
</script>

<div class="my-2">
	{#each urls as url (url)}
		<PreviewLink {url} />
	{/each}
</div>

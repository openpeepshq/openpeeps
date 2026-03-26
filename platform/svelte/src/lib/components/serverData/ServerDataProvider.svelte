<script lang="ts">
	import { type Snippet } from 'svelte';
	import ServerDataContext from './ServerDataContext.svelte';
	import { client, throwError } from '$lib/api';

	let { children }: { children?: Snippet } = $props();

	let capabilitiesPromise = client.server.config.capabilities().then(throwError());
	let serverInfoPromise = client.server.info().then(throwError());
</script>

{#await capabilitiesPromise then capabilities}
	{#await serverInfoPromise then serverInfo}
		<ServerDataContext {capabilities} {serverInfo}>
			{@render children?.()}
		</ServerDataContext>
	{/await}
{/await}

<script lang="ts">
	import { type Snippet } from 'svelte';
	import ServerDataContext from './ServerDataContext.svelte';
	import { client, throwError } from '$lib/api';
	import { authHeaders } from '$lib/api/base';

	let { children }: { children?: Snippet } = $props();

	let capabilitiesPromise = client.server.config.capabilities({
		headers: authHeaders()
	}).then((r) => 'data' in r ? r.data : undefined).catch(() => undefined);

	let serverInfoPromise = client.server.info({
		headers: authHeaders()
	}).then((r) => 'data' in r ? r.data : undefined).catch(() => undefined);
</script>

{#await capabilitiesPromise then capabilities}
	{#await serverInfoPromise then serverInfo}
		<ServerDataContext {capabilities} {serverInfo}>
			{@render children?.()}
		</ServerDataContext>
	{/await}
{/await}

<script lang="ts">
	import { joinRequest } from '$lib/api';
	import { getJamContext, getLivekitRoom } from '$lib/components/core/jams/context';
	import { Button } from '@openpeeps/ui';
	import { onDestroy } from 'svelte';
	import type { JamTokenResponse } from '@openpeeps/common/types';
	import type { Readable } from 'svelte/store';

	const { jamPost } = getJamContext();
	const room = getLivekitRoom();

	let jamTokenRequestStore:
		| (Readable<JamTokenResponse | undefined> & { stop: () => void })
		| undefined = undefined;

	const requestToJoin = async () => {
		jamTokenRequestStore = joinRequest(jamPost.id);
		await new Promise<void>((resolve) => {
			jamTokenRequestStore?.subscribe(async (data) => {
				if (data) {
					const { token, livekitUrl } = data;
					await room.connect(livekitUrl, token);
					jamTokenRequestStore?.stop();
					resolve();
				}
			});
		});
	};
	onDestroy(() => {
		jamTokenRequestStore?.stop();
	});
</script>

<Button title="Request to join" variant="variant-filled-primary" action={requestToJoin}>
	{#snippet loadingContent()}
		Waiting for a moderator to let you in
	{/snippet}
	Request to join
</Button>

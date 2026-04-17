<script lang="ts">
	import { joinRequest } from '$lib/api';
	import { getJamContext, getLivekitRoom } from '$lib/components/core/jams/context';
	import { Button } from '@openpeeps/ui';
	import { onDestroy } from 'svelte';
	import type { JamTokenResponse } from '@openpeeps/common/types';
	import type { Readable } from 'svelte/store';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
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

<Button title={t('jams.join.requestToJoin')} variant="variant-filled-primary" action={requestToJoin}>
	{#snippet loadingContent()}
		{t('jams.join.waitingForModerator')}
	{/snippet}
	{t('jams.join.requestToJoin')}
</Button>

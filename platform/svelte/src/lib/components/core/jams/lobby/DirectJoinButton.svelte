<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { joinJamMutation, jamStateStore } from '$lib/api';
	import { getJamContext, getLivekitRoom } from '$lib/components/core/jams/context';
	import { AccessDeniedLoader } from '$lib/components/layout';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const joinJam = joinJamMutation();

	const { jamPost } = getJamContext();
	const room = getLivekitRoom();

	const jamStateQuery = jamStateStore(jamPost.id);

	let loading = $state(false);

	const connect = async () => {
		loading = true;

		const { token, livekitUrl } = await joinJam({ id: jamPost.id });
		await room.connect(livekitUrl, token);
		loading = false;
	};
</script>

<AccessDeniedLoader queries={[$jamStateQuery]}>
	<Button title={t('jams.join.submit')} variant="variant-filled-primary" {loading} action={connect}>
		{$jamStateQuery.data?.active ? t('jams.join.ctaJoin') : t('jams.join.ctaStart')}
	</Button>
</AccessDeniedLoader>

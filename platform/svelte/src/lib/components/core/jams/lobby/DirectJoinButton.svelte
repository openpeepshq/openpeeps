<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { joinJamMutation, jamStateStore } from '$lib/api';
	import { getJamContext, getLivekitRoom } from '$lib/components/core/jams/context';
  import { AccessDeniedLoader } from '$lib/components/layout';

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
	<Button title="Join Jam" variant="variant-filled-primary" {loading} action={connect}>
		{$jamStateQuery.data?.active ? 'Join' : 'Start'}
	</Button>
</AccessDeniedLoader>

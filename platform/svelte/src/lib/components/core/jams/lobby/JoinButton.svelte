<script lang="ts">
	import { getJamContext } from '$lib/components/core/jams/context';
	import type { PublicProfile } from '@openpeeps/common/types';
	import DirectJoinButton from '$lib/components/core/jams/lobby/DirectJoinButton.svelte';
	import RequestJoinButton from '$lib/components/core/jams/lobby/RequestJoinButton.svelte';
	import { jamStateStore } from '$lib/api';
	import { Loader } from '@openpeeps/ui';
  import { AccessDeniedLoader } from '$lib/components/layout';
	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();

	const { jamPost, jam } = getJamContext();

	const jamStateQuery = jamStateStore(jamPost.id);
</script>

<div class="flex w-full items-center justify-center pb-4">
	<AccessDeniedLoader queries={[$jamStateQuery]}>
		{#if ($jamStateQuery.data?.active && !jam.waitingRoom) || jam.moderators.includes(profile?.id)}
			<DirectJoinButton />
		{:else if jam.waitingRoom}
			<RequestJoinButton />
		{/if}
	</AccessDeniedLoader>
</div>

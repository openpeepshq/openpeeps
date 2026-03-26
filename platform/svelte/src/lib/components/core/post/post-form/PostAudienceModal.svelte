<script lang="ts">
	import { ProfileWithActionCard } from '$lib/components/core/profile';
	import { ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { PublicPost, PublicProfile } from '@openpeeps/common/types';
	import { getPostRepostsStore } from '$lib/api';
	import { Loader } from '@openpeeps/ui';
	interface Props {
		audience: PublicProfile[];
	}

	let { audience }: Props = $props();
</script>

<ModalWrapper>
	<ModalHeader title={'Invited Profiles'} />
	<article class=" overflow-h-scroll m-4 max-h-[65vh] pb-3">
		{#if audience?.length}
			{#each audience as profile (profile.id)}
				<ProfileWithActionCard {profile} />
			{/each}
		{:else}
			<p class="p-5 text-center">No profiles yet</p>
		{/if}
	</article>
</ModalWrapper>

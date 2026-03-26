<script lang="ts">
	import { ProfileWithActionCard } from '$lib/components/core/profile';
	import { ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { PublicPost } from '@openpeeps/common/types';
	import { getPostRepostsStore } from '$lib/api';
	import { AccessDeniedLoader } from '$lib/components/layout';
	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
	let reposts = getPostRepostsStore(post);
</script>

<ModalWrapper>
	<ModalHeader title={'Reposters'} />
	<AccessDeniedLoader queries={[$reposts]}>
		<article class=" overflow-h-scroll m-4 max-h-[65vh] pb-3">
			{#if $reposts.data?.length}
				{#each $reposts.data as { profile } (profile.id)}
					<ProfileWithActionCard {profile} />
				{/each}
			{:else}
				<p class="p-5 text-center">No reposters yet</p>
			{/if}
		</article>
	</AccessDeniedLoader>
</ModalWrapper>

<script lang="ts">
	import { Avatar, FollowUnfollowButton } from '../../../profile';
	import { ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { ReactionWithPublicProfile } from '@openpeeps/common/types';

	interface Props {
		reactions: ReactionWithPublicProfile[];
	}

	let { reactions }: Props = $props();
</script>

<ModalWrapper>
	<ModalHeader title={'Reactions'} />
	<article class=" overflow-h-scroll m-4 max-h-[65vh] pb-3">
		{#each reactions as { reaction, profile } (profile.id)}
			<div class="mb-4 flex w-full items-center justify-between">
				<div class="flex items-center gap-2">
					<div>{reaction}</div>
					<Avatar {profile} />
					<div class="">
						<p class="font-bold">
							{profile.displayName || profile.handle}
						</p>
						<span>@{profile.handle}</span>
					</div>
				</div>
				<FollowUnfollowButton {profile} />
			</div>
		{/each}

		{#if reactions.length === 0}
			<p class="p-5 text-center">No reactions yet</p>
		{/if}
	</article>
</ModalWrapper>

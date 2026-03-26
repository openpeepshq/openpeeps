<script lang="ts">
	import { currentProfileReposts, me } from '$lib/api';
	import {
		reactToPostMutation,
		repostMutation,
		retractReactionMutation,
		retractRepostMutation
	} from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import type { PublicPost } from '@openpeeps/common/types';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { Heart, Repeat, Reply, Share } from 'lucide-svelte';
	import { ReplyModal } from '..';
	import { getModalManager, preventDefault, stopPropagation } from '@openpeeps/ui';
	import { getReactionCount } from '@openpeeps/common/lib';

	interface Props {
		displayedPost: PublicPost;
		isReposted: boolean;
		showAsParent?: boolean;
		preview?: boolean;
	}

	let {
		displayedPost = $bindable(),
		isReposted = $bindable(),
		showAsParent = false,
		preview = false
	}: Props = $props();

	const modalManager = getModalManager();
	const toastStore = getToastStore();
	let myRepostsStore = currentProfileReposts();
	let isFavorited: boolean = $state(displayedPost.reactions?.some((r) => r.profile.id === $me?.id));

	const handleTriggerReply = () => {
		modalManager.show(ReplyModal, {
			inReplyTo: displayedPost
		});
	};

	let reactToPost = reactToPostMutation({ id: displayedPost.id });
	let retractReaction = retractReactionMutation({ id: displayedPost.id });
	let retractRepost = retractRepostMutation();
	let repost = repostMutation({ id: displayedPost.id });

	let myRepost: PublicPost | undefined = $derived(
		$myRepostsStore.data?.find((p) => p.repost?.id === displayedPost.id)
	);

	const handleFavorite = () => {
		if (isFavorited) {
			displayedPost.reactions = displayedPost.reactions.filter((r) => r.profile.id !== $me?.id);
			isFavorited = displayedPost.reactions?.some((r) => r.profile.id === $me?.id);
			retractReaction();
		} else {
			displayedPost.reactions = [...displayedPost.reactions, { profile: $me, reaction: '👍' }];
			isFavorited = displayedPost.reactions?.some((r) => r.profile.id === $me?.id);
			reactToPost({ reaction: '👍' });
		}
	};

	const handleRepost = async () => {
		if (myRepost) {
			displayedPost.repostCount = displayedPost.repostCount - 1;
			isReposted = false;
			await retractRepost({ id: myRepost.id });
			toastStore.trigger(
				toast({
					message: 'Repost retracted',
					background: 'variant-filled-success'
				})
			);
		} else {
			displayedPost.repostCount = displayedPost.repostCount + 1;
			isReposted = true;
			await repost(displayedPost);
			toastStore.trigger(
				toast({
					message: 'Reposted successfully!',
					background: 'variant-filled-success'
				})
			);
		}
	};
</script>

{#if !preview}
	<!-- Full Post Footer -->
	<div
		class={`mx-auto flex w-full items-center justify-between px-7 pb-8 pt-4 ${showAsParent ? 'pl-20' : ''} `}
		onclick={stopPropagation(preventDefault())}
		onkeydown={stopPropagation(preventDefault())}
		role="none"
	>
		<!-- reply  -->
		<button
			title="Reply"
			class="hover:bg-surface-200 group flex items-center gap-1 rounded-full p-2 transition-all"
			onclick={stopPropagation(preventDefault(handleTriggerReply))}
		>
			<Reply size={16} class="cursor-pointer group-hover:scale-105" />
			<span class="text-sm md:text-base">Reply</span>
		</button>

		<!-- repost -->
		<button
			title="Repost"
			class={`hover:bg-surface-200 group flex items-center gap-1 rounded-full p-2 transition-all ${isReposted ? 'bg-surface-200' : ''}`}
			onclick={stopPropagation(preventDefault(handleRepost))}
		>
			<Repeat size={16} class="cursor-pointer group-hover:scale-105" />
			<span class="text-sm md:text-base">Repost</span>
		</button>

		<!-- like -->
		<button
			title="Like"
			class="hover:bg-surface-200 group flex items-center gap-1 rounded-full p-2 transition-all"
			onclick={stopPropagation(preventDefault(handleFavorite))}
		>
			<Heart
				fill={isFavorited ? 'currentColor' : 'none'}
				size={16}
				class="cursor-pointer group-hover:scale-105"
			/>
			<span class="text-sm md:text-base">Like</span>
		</button>

		<!-- share -->
		<button
			title="Share"
			class="hover:bg-surface-200 group flex items-center gap-1 rounded-full p-2 transition-all"
			onclick={stopPropagation(preventDefault(() => {}))}
		>
			<Share fill={'none'} size={16} class="cursor-pointer group-hover:scale-105" />
		</button>
	</div>
{:else}
	<!-- Preview Post Footer -->
	<div
		class="mx-auto flex w-[95%] items-center justify-between px-7 pb-[0.15rem] pt-[0.1rem]"
		onclick={stopPropagation(preventDefault(() => {}))}
		role="none"
	>
		<!-- reply  -->
		<div class="flex items-center gap-1 rounded-full p-4">
			<button title="Reply" onclick={stopPropagation(preventDefault(handleTriggerReply))}>
				<Reply size={16} class="cursor-pointer hover:scale-105" />
			</button>
			<p class="text-surface-500 text-xs">{displayedPost?.replyCount}</p>
		</div>

		<!-- repost -->
		<div class="flex items-center gap-1">
			<button
				title="Repost"
				class={isReposted ? 'bg-surface-200 rounded p-1' : 'rounded p-1'}
				onclick={stopPropagation(preventDefault(handleRepost))}
			>
				<Repeat size={16} class="cursor-pointer hover:scale-105" />
			</button>
			<p class="text-surface-500 text-xs">{displayedPost.repostCount ?? 0}</p>
		</div>

		<!-- like -->
		<div class="flex items-center gap-1">
			<button title="Like" onclick={stopPropagation(preventDefault(handleFavorite))}>
				<Heart
					fill={isFavorited ? 'currentColor' : 'none'}
					size={16}
					class="cursor-pointer hover:scale-105"
				/>
			</button>
			<p class="text-surface-500 text-xs">
				{getReactionCount(displayedPost)['👍'] ?? 0}
			</p>
		</div>

		<!-- share -->
		<div class="flex items-center gap-1">
			<button title="Share" onclick={stopPropagation(preventDefault())}>
				<Share fill={'none'} size={16} class="cursor-pointer hover:scale-105" />
			</button>
		</div>
	</div>
{/if}

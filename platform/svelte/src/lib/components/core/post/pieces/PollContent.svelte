<script lang="ts">
	import { Avatar } from '../../profile';
	import { Button } from '@openpeeps/ui';
	import type { PublicPost } from '@openpeeps/common/types';
	import { formatDistanceToNow, isPast } from 'date-fns';
	import { votePollMutation } from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import { getToastStore, ProgressBar } from '@skeletonlabs/skeleton';
	import { preventDefault, stopPropagation } from '@openpeeps/ui';
	import { checkPostCapabilities, collectVotes, groupName, hasValue } from '@openpeeps/common/lib';
	import { getServerDataContext } from '$lib/components/serverData';
	import { getCurrentAuthData, getCurrentProfile } from '$lib/auth';
	import { i18nContext } from '$lib/components/i18n';
  import { goto } from '$app/navigation';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
	const me = getCurrentProfile();
	const authData = getCurrentAuthData();

	const { capabilities } = getServerDataContext();
	const { t } = i18nContext();

	const toastStore = getToastStore();
	const votePoll = votePollMutation({ id: post.id });

	const { votes, voteCounts } = $derived(collectVotes(post));

	let hasPollEnded: boolean = $derived(
		!!(post?.data?.type === 'question' && post.data.expiresAt && isPast(post.data.expiresAt))
	);
	let hasVoted: boolean = $derived(
		!!(me && !!((votes.find((v) => v?.profile?.id === me?.id)?.selection?.length ?? 0) > 0))
	);
	let canVote: boolean = $derived(!!(me && !hasPollEnded && !hasVoted));

	let selectedPollOption: number | undefined = $state();
	let selectedPollOptions: number[] | undefined = $state();

	const handleVote = async () => {
		if (post.data?.type !== 'question') {
			return;
		}
		const hasCapabilities = checkPostCapabilities(
			authData,
			['core-posts-vote'],
			post,
			capabilities,
		);

		if (!hasCapabilities.success) {
			toastStore.trigger(
				toast({
					message: post?.group
						? t('posts.vote.lackPermission', {
								groupName: groupName(post.group),
							})
						: t('posts.vote.lackPermissionNoGroup'),
					action: post?.group
						? {
						label: t('groups.goto'),
						response() {
							if(post?.group){
							goto(`/group/@${post.group.handle}`)
							}
						},
					} : undefined,
					background: 'variant-filled-error'
				})
			);
			return;
		}

		const selection = (
			post?.data.multiple
				? selectedPollOptions
				: hasValue(selectedPollOption)
					? [selectedPollOption]
					: undefined
		) as number[];

		if (selection && selection.length > 0) {
			await votePoll({ selection });
			toastStore.trigger(
				toast({
					message: t('posts.vote.successToast'),
					background: 'variant-filled-success'
				})
			);
		} else {
			toastStore.trigger(
				toast({
					message: t('posts.vote.selectOption'),
					background: 'variant-filled-error'
				})
			);
		}
	};
	const handleClearVote = async () => {
		if (post.data?.type !== 'question') {
			return;
		}
		let selection: number[] = [];
		await votePoll({ selection });
		toastStore.trigger(
			toast({
				message: t('posts.vote.cleared'),
				background: 'variant-filled-success'
			})
		);
	};
</script>

{#if post?.data?.type === 'question'}
	<div class="rounded-md p-4">
		{#each post?.data?.options as option, i (i)}
			<div class="mt-4 flex items-center gap-x-2 rounded-md px-4 py-2" role="none">
				{#if canVote}
					{#if post?.data?.multiple}
						<input
							type="checkbox"
							class="h-4 w-4"
							bind:group={selectedPollOptions}
							onclick={stopPropagation()}
							value={i}
						/>
					{:else}
						<input
							type="radio"
							class="h-4 w-4"
							bind:group={selectedPollOption}
							onclick={stopPropagation()}
							value={i}
						/>
					{/if}
				{/if}
				<div class="w-full">
					<div class="flex justify-between align-middle">
						<span style="line-height: 2.5rem; vertical-align: middle">{option.content}</span>
						<span class="flex align-middle">
							{#if post?.data.votersVisible}
								{#each votes
									.filter((v) => v.selection.includes(i))
									.slice(0, 2) as vote (vote.profile.id)}
									<span class="-ml-4 inline-block">
										<Avatar borderless profile={vote.profile} size={2.5} />
									</span>
								{/each}
							{/if}
							<span style="line-height: 2.5rem; vertical-align: middle">
								{voteCounts[i] ?? 0}
							</span>
						</span>
					</div>
					<ProgressBar
						meter="rounded bg-primary-500"
						value={voteCounts[i] ?? 0}
						max={votes.length || 1}
					/>
				</div>
			</div>
		{/each}

		{#if canVote}
			<Button title={t('posts.poll.vote')} variant="variant-ringed-surface" class="mt-4" action={handleVote}>
				{t('posts.form.poll.submit')}
			</Button>
		{/if}
		<div class="mt-4 flex items-center gap-x-3 text-sm">
			<p>
				{t('posts.vote.votesCount', { count: votes.length || 0 })}
			</p>
			{#if post?.data.expiresAt}
				<p>
					{#if hasPollEnded}
						{t('posts.poll.ended')}
					{:else}
						{formatDistanceToNow(post?.data.expiresAt)} {t('posts.poll.timeLeft')}
					{/if}
				</p>
			{/if}
			{#if hasVoted && !hasPollEnded}
				<button
					title={t('posts.poll.undoVoteTitle')}
					class="text-primary-500 mt-[-2px] text-base font-semibold"
					onclick={stopPropagation(preventDefault(handleClearVote))}>{t('posts.poll.undo')}</button
				>
			{/if}
		</div>
	</div>
{/if}

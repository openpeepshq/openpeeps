<script lang="ts">
	import { Button, PopupMenuButton } from '@openpeeps/ui';
	import { me, unFollowProfileMutation, followProfileMutation } from '$lib/api';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import type { PublicProfile, SuccessResponse } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const toastStore = getToastStore();

	interface Props {
		profile: PublicProfile;
		btnType?: 'primary' | 'popup';
	}

	let { profile, btnType = 'primary' }: Props = $props();

	let followed = $derived($me?.following.map((f) => f.id).includes(profile.id));

	const followProfile = followProfileMutation({
		id: profile.id
	});
	const unFollowProfile = unFollowProfileMutation({
		id: profile.id
	});

	const handleFollow = async () => {
		const response: SuccessResponse = await followProfile({
			reblogs: true,
			notify: true
		});
		toastStore.trigger(
			toast({
				message: response.success
					? t('profile.follow.followedSuccess')
					: t('profile.follow.followedFailed'),
				background: 'variant-filled-success',
				autohide: true
			})
		);
	};

	const handleUnfollow = async () => {
		const response: SuccessResponse = await unFollowProfile();
		toastStore.trigger(
			toast({
				message: response.success
					? t('profile.follow.unfollowedSuccess')
					: t('profile.follow.unfollowedFailed'),
				background: 'variant-filled-success',
				autohide: true
			})
		);
	};
</script>

{#if btnType === 'popup'}
	{#if !($me?.id === profile.id)}
		{#if followed}
			<PopupMenuButton
				title={t('profile.follow.unfollow')}
				text={t('profile.follow.unfollow')}
				action={handleUnfollow}
			/>
		{:else}
			<PopupMenuButton
				title={t('profile.follow.follow')}
				action={handleFollow}
				text={t('profile.follow.follow')}
			/>
		{/if}
	{/if}
{:else}
	<div>
		{#if !($me?.id === profile.id)}
			{#if followed}
				<Button
					title={t('profile.follow.unfollow')}
					variant="variant-ringed-surface"
					action={handleUnfollow}
				>
					{t('profile.follow.unfollow')}
				</Button>
			{:else}
				<Button
					title={t('profile.follow.follow')}
					variant="variant-filled-primary"
					action={handleFollow}
				>
					{t('profile.follow.follow')}
				</Button>
			{/if}
		{/if}
	</div>
{/if}

<script lang="ts">
	import { FeedPost } from '$lib/components/core/post';
	import type { ExpandedNotification, Reaction } from '@openpeeps/common/types';
	import { profileName } from '@openpeeps/common/lib';
	import NotificationWrapper from '../NotificationWrapper.svelte';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();
	const { t } = i18nContext();

	const profile = notification.senderProfile!;
	const { reaction } = notification.data as { reaction: Reaction };
</script>

<NotificationWrapper {profile} seen={notification.seen} showProfile={false}>
	<a class="w-full px-4 py-2" href="/posts/{notification.post?.id}">
		<div class="flex w-full items-center justify-between">
			<p class="mb-2 flex items-center gap-2 text-sm font-semibold">
				{reaction}{' '}
				{t('notification.reaction.text', {
					profileName: profileName(profile)
				})}{' '}
			</p>
		</div>

		{#if notification.post}
			<FeedPost post={notification.post} />
		{/if}
	</a>
</NotificationWrapper>
